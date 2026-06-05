import { useRef, useState, useCallback, useEffect } from 'react'
import type { Material, Object3D } from 'three'
import { MeshStandardMaterial } from 'three'
import { SceneManager } from '../core/SceneManager'
import { ModelLoader } from '../core/ModelLoader'
import { CameraController } from '../core/CameraController'
import { MaterialManager } from '../core/MaterialManager'
import {
  saveFile, loadStoredFile, clearStoredFile,
  saveOverrides, loadOverrides, clearOverrides,
  type MaterialOverride,
} from '../core/FileStorage'
import { useTheme } from '../context/useTheme'
import type { ViewerState, ModelInfo, SceneNode, MaterialData } from '../core/types'

const DEFAULT_STATE: ViewerState = {
  isLoading: false,
  hasModel: false,
  error: null,
  modelInfo: null,
  wireframe: false,
  showGrid: true,
}

export function useModelViewer(containerRef: React.RefObject<HTMLDivElement | null>) {
  // Three.js refs
  const sceneRef = useRef<SceneManager | null>(null)
  const controllerRef = useRef<CameraController | null>(null)
  const loaderRef = useRef<ModelLoader | null>(null)
  const materialManagerRef = useRef<MaterialManager | null>(null)
  const currentModelRef = useRef<Object3D | null>(null)
  const objectMapRef = useRef<Map<string, Object3D>>(new Map())
  const materialObjectMapRef = useRef<Map<string, Material>>(new Map())
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  // React state
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE)
  const [sceneNodes, setSceneNodes] = useState<SceneNode[]>([])
  const [materialMap, setMaterialMap] = useState<Map<string, MaterialData>>(new Map())
  const [selectedNodeUuid, setSelectedNodeUuid] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [autosave, setAutosave] = useState<boolean>(() => {
    const stored = localStorage.getItem('glb-viewer:autosave')
    return stored === null ? true : stored === 'true'
  })
  const autosaveRef = useRef(autosave)
  const currentFileNameRef = useRef('')

  const { theme } = useTheme()
  const themeRef = useRef(theme)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  // Keep autosaveRef in sync and persist preference
  useEffect(() => {
    autosaveRef.current = autosave
    localStorage.setItem('glb-viewer:autosave', String(autosave))
  }, [autosave])

  const toggleAutosave = useCallback(() => setAutosave((v) => !v), [])

  // ── Mount / Unmount Three.js ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new SceneManager()
    const controller = new CameraController(scene.camera, scene.renderer)
    const loader = new ModelLoader()
    const manager = new MaterialManager()

    scene.setTheme(themeRef.current)
    scene.mount(container)
    scene.startLoop(() => controller.update())

    sceneRef.current = scene
    controllerRef.current = controller
    loaderRef.current = loader
    materialManagerRef.current = manager
    setIsReady(true)

    return () => {
      setIsReady(false)
      controller.dispose()
      scene.unmount()
      sceneRef.current = null
      controllerRef.current = null
      loaderRef.current = null
      materialManagerRef.current = null
    }
  }, [containerRef])

  // ── Sync theme to viewport background ────────────────────────────
  useEffect(() => {
    sceneRef.current?.setTheme(theme)
  }, [theme])

  // ── Auto-restore last model on mount ─────────────────────────────
  // loadFileRef keeps the latest loadFile fn without adding it as a dep
  const loadFileRef = useRef<((file: File) => Promise<void>) | null>(null)

  useEffect(() => {
    if (!isReady) return
    loadStoredFile().then((file) => {
      if (file && loadFileRef.current) {
        loadFileRef.current(file)
      }
    })
  }, [isReady])

  // ── Load a .glb / .gltf file ─────────────────────────────────────
  const loadFile = useCallback(async (file: File) => {
    const loader = loaderRef.current
    const scene = sceneRef.current
    const controller = controllerRef.current
    const manager = materialManagerRef.current

    if (!loader || !scene || !controller || !manager) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'glb' && ext !== 'gltf') {
      setState((prev) => ({ ...prev, error: 'Only .glb and .gltf files are supported.' }))
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Remove previous model
      if (currentModelRef.current) {
        scene.scene.remove(currentModelRef.current)
        currentModelRef.current = null
      }

      const { object, info } = await loader.loadFromFile(file)
      scene.scene.add(object)
      currentModelRef.current = object

      // Tell controller which file we're viewing (needed for auto-save key)
      controller.setFileName(file.name)
      currentFileNameRef.current = file.name

      // Try restoring saved camera pose for this file; fall back to auto-fit
      const restored = controller.restoreCameraState(file.name)
      if (!restored) {
        controller.fitToObject(object, scene.camera)
      }

      // Build scene tree + material data
      const nodes = manager.extractSceneTree(object)
      const matMap = manager.extractMaterials(object)
      const meshInventory = manager.getMeshInventory(object)
      objectMapRef.current = manager.buildObjectMap(object)
      materialObjectMapRef.current = manager.buildMaterialObjectMap(object)

      console.groupCollapsed(`[GLB Viewer] Mesh list: ${file.name}`)
      console.table(
        meshInventory.map((mesh) => ({
          category: mesh.category,
          name: mesh.name,
          uuid: mesh.uuid,
          materials: mesh.materialNames.join(', '),
          triangles: mesh.triangleCount,
          sizeX: mesh.dimensions.x,
          sizeY: mesh.dimensions.y,
          sizeZ: mesh.dimensions.z,
        }))
      )
      console.groupEnd()

      setSceneNodes(nodes)
      setMaterialMap(matMap)
      setSelectedNodeUuid(null)
      scene.clearSelection()

      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasModel: true,
        modelInfo: info,
        wireframe: prev.wireframe,
      }))

      // Reapply wireframe if it was on
      if (state.wireframe) loader.setWireframe(object, true)

      // Persist to IndexedDB for auto-restore after refresh
      saveFile(file)

      // Restore material overrides (autosave must be ON at time of saving)
      const overrides = loadOverrides(file.name)
      if (overrides && autosaveRef.current) {
        const matMap = materialObjectMapRef.current
        matMap.forEach((mat) => {
          const key = mat.name
          if (!key) return
          const o = overrides[key]
          if (!o) return
          if (o.color && mat instanceof MeshStandardMaterial) mat.color.set(o.color)
          if (o.roughness !== undefined && mat instanceof MeshStandardMaterial) mat.roughness = o.roughness
          if (o.metalness !== undefined && mat instanceof MeshStandardMaterial) mat.metalness = o.metalness
          if (o.emissive && mat instanceof MeshStandardMaterial) mat.emissive.set(o.emissive)
          if (o.opacity !== undefined) { mat.opacity = o.opacity; mat.transparent = o.opacity < 1 }
          mat.needsUpdate = true
        })
        // Rebuild UI state to reflect restored overrides
        if (object) {
          setSceneNodes(manager.extractSceneTree(object))
          setMaterialMap(manager.extractMaterials(object))
        }
      }
    } catch (err) {
      console.error('Failed to load model:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load model. Please check the file format.',
      }))
    }
  }, [state.wireframe])

  // Keep ref in sync so auto-restore always calls the latest version
  loadFileRef.current = loadFile

  // ── Scene controls ────────────────────────────────────────────────
  const toggleWireframe = useCallback(() => {
    const model = currentModelRef.current
    const loader = loaderRef.current
    if (!model || !loader) return
    setState((prev) => {
      const next = !prev.wireframe
      loader.setWireframe(model, next)
      return { ...prev, wireframe: next }
    })
  }, [])

  const toggleGrid = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return
    setState((prev) => {
      const next = !prev.showGrid
      scene.setGridVisible(next)
      return { ...prev, showGrid: next }
    })
  }, [])

  const resetCamera = useCallback(() => {
    const controller = controllerRef.current
    const model = currentModelRef.current
    const scene = sceneRef.current
    if (!controller || !scene) return
    if (model) controller.fitToObject(model, scene.camera)
    else controller.reset()
  }, [])

  const clearModel = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (currentModelRef.current) {
      scene.scene.remove(currentModelRef.current)
      currentModelRef.current = null
    }
    objectMapRef.current = new Map()
    materialObjectMapRef.current = new Map()
    setSceneNodes([])
    setMaterialMap(new Map())
    setSelectedNodeUuid(null)
    scene.clearSelection()
    clearStoredFile()
    clearOverrides()
    currentFileNameRef.current = ''
    controllerRef.current?.clearCameraState()
    setState((prev) => ({
      ...prev,
      hasModel: false,
      modelInfo: null,
      wireframe: false,
    }))
  }, [])

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // ── Scene Panel actions ───────────────────────────────────────────
  const selectNode = useCallback((uuid: string | null) => {
    setSelectedNodeUuid(uuid)
    sceneRef.current?.setSelectedObject(uuid ? objectMapRef.current.get(uuid) ?? null : null)
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    const canvas = scene?.renderer.domElement
    if (!scene || !canvas) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      pointerDownRef.current = { x: event.clientX, y: event.clientY }
    }

    const handlePointerUp = (event: PointerEvent) => {
      const start = pointerDownRef.current
      pointerDownRef.current = null
      if (!start || event.button !== 0) return

      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.hypot(dx, dy) > 5) return

      const model = currentModelRef.current
      if (!model) return

      const picked = scene.pickObjectAt(event.clientX, event.clientY, model)
      selectNode(picked?.uuid ?? null)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerup', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
    }
  }, [selectNode])

  const toggleObjectVisibility = useCallback((uuid: string, visible: boolean) => {
    const manager = materialManagerRef.current
    if (!manager) return
    manager.setVisibility(uuid, visible, objectMapRef.current)
    if (uuid === selectedNodeUuid) {
      sceneRef.current?.setSelectedObject(visible ? objectMapRef.current.get(uuid) ?? null : null)
    }
    setSceneNodes((prev) => manager.updateNodeVisibility(prev, uuid, visible))
  }, [selectedNodeUuid])

  // ── Material Panel actions ────────────────────────────────────────
  const updateMaterial = useCallback(
    (uuid: string, patch: Partial<MaterialData>) => {
      const manager = materialManagerRef.current
      const model = currentModelRef.current
      const selectedObject = selectedNodeUuid
        ? objectMapRef.current.get(selectedNodeUuid) ?? null
        : null
      const mat =
        model && selectedObject
          ? manager?.isolateMaterialToObject(model, selectedObject, uuid)
          : materialObjectMapRef.current.get(uuid)
      if (!mat || !manager) return

      if (patch.color !== undefined) manager.applyColor(mat, patch.color)
      if (patch.roughness !== undefined) manager.applyRoughness(mat, patch.roughness)
      if (patch.metalness !== undefined) manager.applyMetalness(mat, patch.metalness)
      if (patch.emissive !== undefined) manager.applyEmissive(mat, patch.emissive)
      if (patch.opacity !== undefined) manager.applyOpacity(mat, patch.opacity)

      if (model) {
        materialObjectMapRef.current = manager.buildMaterialObjectMap(model)
        setSceneNodes(manager.extractSceneTree(model))
        setMaterialMap(manager.extractMaterials(model))
      }

      // Autosave material overrides
      if (autosaveRef.current && currentFileNameRef.current) {
        const overrides: Record<string, MaterialOverride> = {}
        materialObjectMapRef.current.forEach((m) => {
          if (!m.name || !(m instanceof MeshStandardMaterial)) return
          overrides[m.name] = {
            color: '#' + m.color.getHexString(),
            roughness: m.roughness,
            metalness: m.metalness,
            emissive: '#' + m.emissive.getHexString(),
            opacity: m.opacity,
          }
        })
        saveOverrides(currentFileNameRef.current, overrides)
      }
    },
    [selectedNodeUuid]
  )

  const swapTexture = useCallback(async (matUuid: string, file: File) => {
    const manager = materialManagerRef.current
    const model = currentModelRef.current
    const selectedObject = selectedNodeUuid
      ? objectMapRef.current.get(selectedNodeUuid) ?? null
      : null
    const mat =
      model && selectedObject
        ? manager?.isolateMaterialToObject(model, selectedObject, matUuid)
        : materialObjectMapRef.current.get(matUuid)
    if (!mat || !manager) return

    try {
      const previewUrl = await manager.swapTexture(mat, file)
      if (model) {
        materialObjectMapRef.current = manager.buildMaterialObjectMap(model)
        setSceneNodes(manager.extractSceneTree(model))
      }
      setMaterialMap((prev) => {
        const next = model ? manager.extractMaterials(model) : new Map(prev)
        const existing = next.get(mat.uuid)
        if (existing) {
          // Revoke old preview URL if any
          if (existing.mapPreviewUrl) URL.revokeObjectURL(existing.mapPreviewUrl)
          next.set(mat.uuid, { ...existing, hasMap: true, mapPreviewUrl: previewUrl })
        }
        return next
      })
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to load texture.' }))
    }
  }, [selectedNodeUuid])

  return {
    state,
    sceneNodes,
    materialMap,
    selectedNodeUuid,
    autosave,
    loadFile,
    toggleWireframe,
    toggleGrid,
    resetCamera,
    clearModel,
    dismissError,
    selectNode,
    toggleObjectVisibility,
    updateMaterial,
    swapTexture,
    toggleAutosave,
  }
}

export type { ModelInfo, ViewerState, SceneNode, MaterialData }

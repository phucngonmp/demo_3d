import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Material,
  type Object3D,
  MeshStandardMaterial,
  Mesh,
  Box3,
} from 'three'
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
import type { ViewerState, SceneNode, MaterialData, EnvMode, WeatherMode } from '../core/types'

const DEFAULT_STATE: ViewerState = {
  isLoading: false,
  hasModel: false,
  error: null,
  modelInfo: null,
  wireframe: false,
  showGrid: true,
  exposure: 1.0,
  cameraMode: 'orbit',
  envMode: 'room',
  weatherMode: 'clear',
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
  // Undo stack: each entry is a snapshot of cloned materials for the model
  const [undoStack, setUndoStack] = useState<Array<Record<string, Material>>>([])
  const undoStackRef = useRef(undoStack)
  const [autosave, setAutosave] = useState<boolean>(() => {
    const stored = localStorage.getItem('glb-viewer:autosave')
    return stored === null ? true : stored === 'true'
  })
  const autosaveRef = useRef(autosave)
  const currentFileNameRef = useRef('')

  // Keep undoStackRef in sync
  useEffect(() => { undoStackRef.current = undoStack }, [undoStack])

  // Helper: build a stable mesh path key (ancestor chain) for override storage
  const getMeshPath = (obj: Object3D): string => {
    let path = obj.name || (obj.parent ? obj.parent.children.indexOf(obj).toString() : '')
    let curr = obj.parent
    while (curr && curr.type !== 'Scene' && curr.type !== 'Group') {
      path = (curr.name || (curr.parent ? curr.parent.children.indexOf(curr).toString() : '')) + '/' + path
      curr = curr.parent
    }
    return path
  }

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

  // ── Auto-restore last model or load default model on mount ──────────
  // loadModelRef keeps the latest loadModel fn without adding it as a dep
  const loadModelRef = useRef<((source: File | { url: string; name: string }) => Promise<void>) | null>(null)

  useEffect(() => {
    if (!isReady) return
    loadStoredFile().then((file) => {
      if (file && loadModelRef.current) {
        loadModelRef.current(file)
      } else if (loadModelRef.current) {
        const defaultName = 'italian_kitchen.glb'
        const defaultUrl = `${import.meta.env.BASE_URL}${defaultName}`
        loadModelRef.current({ url: defaultUrl, name: defaultName })
      }
    })
  }, [isReady])

  // ── Core Load Model Function ──────────────────────────────────────
  const loadModel = useCallback(async (source: File | { url: string; name: string }) => {
    const loader = loaderRef.current
    const scene = sceneRef.current
    const controller = controllerRef.current
    const manager = materialManagerRef.current

    if (!loader || !scene || !controller || !manager) return

    const isFile = source instanceof File
    const name = source instanceof File ? source.name : source.name

    const ext = name.split('.').pop()?.toLowerCase()
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

      const { object, info } = isFile
        ? await loader.loadFromFile(source)
        : await loader.loadFromUrl(source.url, source.name)

      scene.scene.add(object)
      currentModelRef.current = object

      const initialBox = new Box3().setFromObject(object)
      scene.fitShadowToBox(initialBox)

      // Try restoring saved camera pose for this file; fall back to auto-fit
      controller.fitToObject(object, scene.camera)

      // Build scene tree + material data
      const nodes = manager.extractSceneTree(object)
      const matMap = manager.extractMaterials(object)
      const meshInventory = manager.getMeshInventory(object)
      objectMapRef.current = manager.buildObjectMap(object)
      materialObjectMapRef.current = manager.buildMaterialObjectMap(object)

      console.groupCollapsed(`[GLB Viewer] Mesh list: ${name}`)
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

      // Only persist to IndexedDB if it was loaded from a user-uploaded file
      if (isFile) {
        saveFile(source)
      }

      // Restore material overrides (autosave must be ON at time of saving)
      const overrides = loadOverrides(name)
      if (overrides && autosaveRef.current && object) {
        object.traverse((child) => {
          if (child instanceof Mesh && child.material) {
            const path = getMeshPath(child)
            const o = overrides[path]
            if (o) {
              // Clone material để đảm bảo không dính líu tới tường khác
              child.material = Array.isArray(child.material) ? child.material.map((m: any) => m.clone()) : child.material.clone()
              const mat = Array.isArray(child.material) ? child.material[0] : child.material
              if (mat instanceof MeshStandardMaterial) {
                mat.userData = mat.userData || {}
                mat.userData.isModified = true
                if (o.color) mat.color.set(o.color)
                if (o.roughness !== undefined) mat.roughness = o.roughness
                if (o.metalness !== undefined) mat.metalness = o.metalness
                if (o.emissive) mat.emissive.set(o.emissive)
                if (o.opacity !== undefined) { mat.opacity = o.opacity; mat.transparent = o.opacity < 1 }
                if (o.textureScale !== undefined) manager.applyTextureScale(mat, o.textureScale)
                if (o.textureUrl) manager.applyTextureFromUrl(mat, o.textureUrl)
                mat.needsUpdate = true
              }
            }
          }
        })

        // Rebuild UI state to reflect restored overrides
        setSceneNodes(manager.extractSceneTree(object))
        setMaterialMap(manager.extractMaterials(object))
        materialObjectMapRef.current = manager.buildMaterialObjectMap(object)
      }
    } catch (err) {
      console.error('Failed to load model:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: isFile
          ? 'Failed to load model. Please check the file format.'
          : 'Failed to load default model.',
      }))
    }
  }, [state.wireframe])

  const loadFile = useCallback(
    (file: File) => loadModel(file),
    [loadModel]
  )

  // Keep ref in sync so auto-restore always calls the latest version
  loadModelRef.current = loadModel

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

  const changeExposure = useCallback((value: number) => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setExposure(value)
    setState((prev) => ({ ...prev, exposure: value }))
  }, [])

  const toggleCameraMode = useCallback(() => {
    setState((prev) => {
      const nextMode = prev.cameraMode === 'interior' ? 'orbit' : 'interior'
      if (controllerRef.current && sceneRef.current) {
        controllerRef.current.setMode(nextMode, currentModelRef.current || undefined, sceneRef.current.camera)
      }
      return { ...prev, cameraMode: nextMode }
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

    const handleDoubleClick = (event: MouseEvent) => {
      if (controllerRef.current?.mode !== 'interior') return
      const model = currentModelRef.current
      if (!model) return

      const hitPoint = scene.raycastPoint(event.clientX, event.clientY, model)
      if (hitPoint) {
        controllerRef.current.teleportTo(hitPoint.x, hitPoint.z)
      }
    }
    canvas.addEventListener('dblclick', handleDoubleClick)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('dblclick', handleDoubleClick)
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

  /** Snapshot current material state into the undo stack */
  const pushUndo = useCallback(() => {
    const model = currentModelRef.current
    if (!model) return
    const snapshot: Record<string, Material> = {}
    model.traverse((child) => {
      if (child instanceof Mesh) {
        const m = Array.isArray(child.material) ? child.material[0] : child.material
        if (m instanceof Material) {
          const path = getMeshPath(child)
          snapshot[path] = m.clone()
        }
      }
    })
    setUndoStack((prev) => [...prev.slice(-19), snapshot]) // keep last 20
  }, [])

  const updateMaterial = useCallback(
    (uuid: string, patch: Partial<MaterialData>, skipUndo: boolean = false) => {
      if (!skipUndo) pushUndo()
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

      if (mat) {
        if (patch.color) manager.applyColor(mat, patch.color)
        if (patch.roughness !== undefined) manager.applyRoughness(mat, patch.roughness)
        if (patch.metalness !== undefined) manager.applyMetalness(mat, patch.metalness)
        if (patch.emissive) manager.applyEmissive(mat, patch.emissive)
        if (patch.opacity !== undefined) manager.applyOpacity(mat, patch.opacity)
        if (patch.textureScale !== undefined) manager.applyTextureScale(mat, patch.textureScale)

        mat.userData = mat.userData || {}
        mat.userData.isModified = true
      }

      if (model) {
        materialObjectMapRef.current = manager.buildMaterialObjectMap(model)
        setSceneNodes(manager.extractSceneTree(model))
        setMaterialMap(manager.extractMaterials(model))
      }

      // Autosave
      if (autosaveRef.current && currentFileNameRef.current && model) {
        const overrides: Record<string, MaterialOverride> = {}
        model.traverse((child) => {
          if (child instanceof Mesh) {
            const mat = Array.isArray(child.material) ? child.material[0] : child.material
            if (mat && mat.userData?.isModified && mat instanceof MeshStandardMaterial) {
              const path = getMeshPath(child)
              overrides[path] = {
                color: '#' + mat.color.getHexString(),
                roughness: mat.roughness,
                metalness: mat.metalness,
                emissive: '#' + mat.emissive.getHexString(),
                opacity: mat.opacity,
              }
              if (mat.userData?.textureUrl) overrides[path].textureUrl = mat.userData.textureUrl
              if (mat.userData?.textureScale !== undefined) overrides[path].textureScale = mat.userData.textureScale
            }
          }
        })
        saveOverrides(currentFileNameRef.current, overrides)
      }
    },
    [selectedNodeUuid, pushUndo]
  )

  const applyTextureUrl = useCallback(async (matUuid: string, url: string) => {
    pushUndo()
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
      await manager.applyTextureFromUrl(mat, url)
      mat.userData = mat.userData || {}
      mat.userData.isModified = true

      if (model) {
        materialObjectMapRef.current = manager.buildMaterialObjectMap(model)
        setSceneNodes(manager.extractSceneTree(model))
        setMaterialMap(manager.extractMaterials(model))
      }

      // Autosave
      if (autosaveRef.current && currentFileNameRef.current && model) {
        const overrides: Record<string, MaterialOverride> = {}
        model.traverse((child) => {
          if (child instanceof Mesh) {
            const m = Array.isArray(child.material) ? child.material[0] : child.material
            if (m && m.userData?.isModified && m instanceof MeshStandardMaterial) {
              const path = getMeshPath(child)
              overrides[path] = {
                color: '#' + m.color.getHexString(),
                roughness: m.roughness,
                metalness: m.metalness,
                emissive: '#' + m.emissive.getHexString(),
                opacity: m.opacity,
              }
              if (m.userData?.textureUrl) overrides[path].textureUrl = m.userData.textureUrl
              if (m.userData?.textureScale !== undefined) overrides[path].textureScale = m.userData.textureScale
            }
          }
        })
        saveOverrides(currentFileNameRef.current, overrides)
      }
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to load texture.' }))
    }
  }, [selectedNodeUuid, pushUndo])

  /** Remove texture from a material and restore its color to white */
  const resetTexture = useCallback((matUuid: string) => {
    pushUndo()
    const manager = materialManagerRef.current
    const model = currentModelRef.current
    const selectedObject = selectedNodeUuid
      ? objectMapRef.current.get(selectedNodeUuid) ?? null
      : null
    const mat =
      model && selectedObject
        ? manager?.isolateMaterialToObject(model, selectedObject, matUuid)
        : materialObjectMapRef.current.get(matUuid)
    if (!mat || !(mat instanceof MeshStandardMaterial)) return

    if (mat.map) { mat.map.dispose(); mat.map = null }
    mat.color.set('#ffffff')
    mat.userData = mat.userData || {}
    delete mat.userData.textureUrl
    delete mat.userData.textureScale
    mat.userData.isModified = true
    mat.needsUpdate = true

    if (model) {
      materialObjectMapRef.current = manager!.buildMaterialObjectMap(model)
      setSceneNodes(manager!.extractSceneTree(model))
      setMaterialMap(manager!.extractMaterials(model))
    }
  }, [selectedNodeUuid, pushUndo])

  /** Restore the previous snapshot from the undo stack */
  const undoMaterial = useCallback(() => {
    const model = currentModelRef.current
    const manager = materialManagerRef.current
    const stack = undoStackRef.current
    if (!model || !manager || stack.length === 0) return

    const prev = stack[stack.length - 1]
    setUndoStack((s) => s.slice(0, -1))

    model.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const path = getMeshPath(child)
      const o = prev[path]
      if (!o) return

      // Khôi phục lại material y nguyên như snapshot bằng cách clone()
      const newMat = o.clone()
      if (Array.isArray(child.material)) {
        child.material = [newMat, ...child.material.slice(1)]
      } else {
        child.material = newMat
      }
    })

    materialObjectMapRef.current = manager.buildMaterialObjectMap(model)
    setSceneNodes(manager.extractSceneTree(model))
    setMaterialMap(manager.extractMaterials(model))

    // Lưu lại LocalStorage ngay lập tức sau khi Undo
    if (autosaveRef.current && currentFileNameRef.current) {
      const overrides: Record<string, MaterialOverride> = {}
      model.traverse((child) => {
        if (child instanceof Mesh) {
          const m = Array.isArray(child.material) ? child.material[0] : child.material
          if (m && m.userData?.isModified && m instanceof MeshStandardMaterial) {
            const path = getMeshPath(child)
            overrides[path] = {
              color: '#' + m.color.getHexString(),
              roughness: m.roughness,
              metalness: m.metalness,
              emissive: '#' + m.emissive.getHexString(),
              opacity: m.opacity,
            }
            if (m.userData?.textureUrl) overrides[path].textureUrl = m.userData.textureUrl
            if (m.userData?.textureScale !== undefined) overrides[path].textureScale = m.userData.textureScale
          }
        }
      })
      saveOverrides(currentFileNameRef.current, overrides)
    }
  }, [])

  // ── Keyboard Shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support Ctrl+Z (Windows) and Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault() // prevent browser native undo if any
        undoMaterial()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoMaterial])
  const changeEnvMode = useCallback((envMode: EnvMode) => {
    setState(prev => ({ ...prev, envMode }))
    sceneRef.current?.setEnvironmentMode(envMode)
  }, [])

  const changeWeatherMode = useCallback((weatherMode: WeatherMode) => {
    setState(prev => ({ ...prev, weatherMode }))
    sceneRef.current?.setWeatherMode(weatherMode)
  }, [])

  const uploadBackground = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    sceneRef.current?.setBackgroundImage(url)
  }, [])

  return {
    state,
    sceneNodes,
    materialMap,
    selectedNodeUuid,
    autosave,
    undoStack,
    loadFile,
    toggleWireframe,
    resetCamera,
    clearModel,
    dismissError,
    selectNode,
    toggleObjectVisibility,
    pushUndo,
    updateMaterial,
    applyTextureUrl,
    resetTexture,
    undoMaterial,
    toggleAutosave,
    changeExposure,
    toggleCameraMode,
    changeEnvMode,
    changeWeatherMode,
    uploadBackground,
  }
}

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Object3D } from 'three'
import { SceneManager } from '../core/SceneManager'
import { ModelLoader } from '../core/ModelLoader'
import { CameraController } from '../core/CameraController'
import { MaterialManager } from '../core/MaterialManager'
import { useTheme } from '../context/ThemeContext'
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
  const materialObjectMapRef = useRef<Map<string, any>>(new Map())

  // React state
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE)
  const [sceneNodes, setSceneNodes] = useState<SceneNode[]>([])
  const [materialMap, setMaterialMap] = useState<Map<string, MaterialData>>(new Map())
  const [selectedNodeUuid, setSelectedNodeUuid] = useState<string | null>(null)

  // Always-current theme ref to avoid stale closures in mount effect
  const { theme } = useTheme()
  const themeRef = useRef(theme)
  themeRef.current = theme

  // ── Mount / Unmount Three.js ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new SceneManager()
    const controller = new CameraController(scene.camera, scene.renderer)
    const loader = new ModelLoader()
    const manager = new MaterialManager()

    scene.setTheme(themeRef.current) // Set initial theme without creating a dep
    scene.mount(container)
    scene.startLoop(() => controller.update())

    sceneRef.current = scene
    controllerRef.current = controller
    loaderRef.current = loader
    materialManagerRef.current = manager

    return () => {
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
      controller.fitToObject(object, scene.camera)

      // Build scene tree + material data
      const nodes = manager.extractSceneTree(object)
      const matMap = manager.extractMaterials(object)
      objectMapRef.current = manager.buildObjectMap(object)
      materialObjectMapRef.current = manager.buildMaterialObjectMap(object)

      setSceneNodes(nodes)
      setMaterialMap(matMap)
      setSelectedNodeUuid(null)

      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasModel: true,
        modelInfo: info,
        wireframe: prev.wireframe,
      }))

      // Reapply wireframe if it was on
      if (state.wireframe) loader.setWireframe(object, true)
    } catch (err) {
      console.error('Failed to load model:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load model. Please check the file format.',
      }))
    }
  }, [state.wireframe])

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
    if (uuid) {
      materialManagerRef.current?.highlightObject(uuid, objectMapRef.current)
    }
  }, [])

  const toggleObjectVisibility = useCallback((uuid: string, visible: boolean) => {
    const manager = materialManagerRef.current
    if (!manager) return
    manager.setVisibility(uuid, visible, objectMapRef.current)
    setSceneNodes((prev) => manager.updateNodeVisibility(prev, uuid, visible))
  }, [])

  // ── Material Panel actions ────────────────────────────────────────
  const updateMaterial = useCallback(
    (uuid: string, patch: Partial<MaterialData>) => {
      const mat = materialObjectMapRef.current.get(uuid)
      const manager = materialManagerRef.current
      if (!mat || !manager) return

      if (patch.color !== undefined) manager.applyColor(mat, patch.color)
      if (patch.roughness !== undefined) manager.applyRoughness(mat, patch.roughness)
      if (patch.metalness !== undefined) manager.applyMetalness(mat, patch.metalness)
      if (patch.emissive !== undefined) manager.applyEmissive(mat, patch.emissive)
      if (patch.opacity !== undefined) manager.applyOpacity(mat, patch.opacity)

      setMaterialMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(uuid)
        if (existing) next.set(uuid, { ...existing, ...patch })
        return next
      })
    },
    []
  )

  const swapTexture = useCallback(async (matUuid: string, file: File) => {
    const mat = materialObjectMapRef.current.get(matUuid)
    const manager = materialManagerRef.current
    if (!mat || !manager) return

    try {
      const previewUrl = await manager.swapTexture(mat, file)
      setMaterialMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(matUuid)
        if (existing) {
          // Revoke old preview URL if any
          if (existing.mapPreviewUrl) URL.revokeObjectURL(existing.mapPreviewUrl)
          next.set(matUuid, { ...existing, hasMap: true, mapPreviewUrl: previewUrl })
        }
        return next
      })
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to load texture.' }))
    }
  }, [])

  return {
    state,
    sceneNodes,
    materialMap,
    selectedNodeUuid,
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
  }
}

export type { ModelInfo, ViewerState, SceneNode, MaterialData }

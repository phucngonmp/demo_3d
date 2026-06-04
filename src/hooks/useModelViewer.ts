import { useRef, useState, useCallback, useEffect } from 'react'
import type { Object3D } from 'three'
import { SceneManager } from '../core/SceneManager'
import { ModelLoader } from '../core/ModelLoader'
import { CameraController } from '../core/CameraController'
import type { ViewerState, ModelInfo } from '../core/types'

const DEFAULT_STATE: ViewerState = {
  isLoading: false,
  hasModel: false,
  error: null,
  modelInfo: null,
  wireframe: false,
  showGrid: true,
}

export function useModelViewer(containerRef: React.RefObject<HTMLDivElement | null>) {
  const sceneRef = useRef<SceneManager | null>(null)
  const controllerRef = useRef<CameraController | null>(null)
  const loaderRef = useRef<ModelLoader | null>(null)
  const currentModelRef = useRef<Object3D | null>(null)

  const [state, setState] = useState<ViewerState>(DEFAULT_STATE)

  // Mount Three.js into the container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new SceneManager()
    const controller = new CameraController(scene.camera, scene.renderer)
    const loader = new ModelLoader()

    sceneRef.current = scene
    controllerRef.current = controller
    loaderRef.current = loader

    scene.mount(container)
    scene.startLoop(() => controller.update())

    return () => {
      controller.dispose()
      scene.unmount()
      sceneRef.current = null
      controllerRef.current = null
      loaderRef.current = null
    }
  }, [containerRef])

  // Load a .glb / .gltf file
  const loadFile = useCallback(async (file: File) => {
    const loader = loaderRef.current
    const scene = sceneRef.current
    const controller = controllerRef.current

    if (!loader || !scene || !controller) return

    // Validate extension
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

      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasModel: true,
        modelInfo: info,
        // Keep wireframe state if already enabled
        wireframe: prev.wireframe,
      }))

      // Apply wireframe if it was on before
      if (state.wireframe) {
        loader.setWireframe(object, true)
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

    if (model) {
      controller.fitToObject(model, scene.camera)
    } else {
      controller.reset()
    }
  }, [])

  const clearModel = useCallback(() => {
    const scene = sceneRef.current
    const loader = loaderRef.current
    if (!scene || !loader) return

    if (currentModelRef.current) {
      scene.scene.remove(currentModelRef.current)
      currentModelRef.current = null
    }
    setState((prev) => ({ ...prev, hasModel: false, modelInfo: null, wireframe: false }))
  }, [])

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    state,
    loadFile,
    toggleWireframe,
    toggleGrid,
    resetCamera,
    clearModel,
    dismissError,
  }
}

export type { ModelInfo, ViewerState }

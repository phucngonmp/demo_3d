import type { Object3D } from 'three'

export interface ModelInfo {
  fileName: string
  triangleCount: number
  vertexCount: number
  materialCount: number
  objectCount: number
  dimensions: {
    x: number
    y: number
    z: number
  }
}

export interface LoadResult {
  object: Object3D
  info: ModelInfo
}

export interface ViewerState {
  isLoading: boolean
  hasModel: boolean
  error: string | null
  modelInfo: ModelInfo | null
  wireframe: boolean
  showGrid: boolean
}

import type { Object3D } from 'three'

export type MeshCategory = 'floor' | 'wall' | 'tile' | 'brick' | 'other'

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
  fileHash?: string
}

export interface LoadResult {
  object: Object3D
  info: ModelInfo
}

export interface GroupConfig {
  id: string
  name: string
  keywords: string[]
  materialUuids: string[]
  textureCategories?: string[]
}

export interface ViewerState {
  isLoading: boolean
  hasModel: boolean
  error: string | null
  modelInfo: ModelInfo | null
  wireframe: boolean
  showGrid: boolean
  exposure: number
  cameraMode: 'orbit' | 'interior'
  envMode: EnvMode
  configGroups?: GroupConfig[]
}

export type EnvMode = 'room' | 'neutral' | 'sunset' | 'city'

/** One node in the scene object hierarchy tree */
export interface SceneNode {
  uuid: string
  name: string
  type: string          // 'Mesh' | 'Group' | 'Object3D' | 'SkinnedMesh' ...
  visible: boolean
  children: SceneNode[]
  materialIds: string[] // uuids of attached materials (for Mesh nodes)
  depth: number
  meshCategory?: MeshCategory
}

export interface MeshInventoryItem {
  uuid: string
  name: string
  category: MeshCategory
  materialNames: string[]
  triangleCount: number
  dimensions: {
    x: number
    y: number
    z: number
  }
}

export interface PBRTextureSet {
  id: string
  category: string
  diffuse: string
  normal?: string
  roughness?: string
  ao?: string
}

/** Editable snapshot of a Three.js material */
export interface MaterialData {
  uuid: string
  name: string
  displayName?: string
  type: string
  color: string         // hex e.g. '#ffffff'
  roughness: number     // 0–1
  metalness: number     // 0–1
  emissive: string      // hex
  opacity: number       // 0–1
  transparent: boolean
  hasMap: boolean
  mapPreviewUrl?: string
  textureSet?: PBRTextureSet // PBR maps
  textureScale?: number // Texture tiling multiplier
}


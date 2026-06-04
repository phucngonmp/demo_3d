import {
  MeshStandardMaterial,
  Mesh,
  TextureLoader,
  Color,
  type Object3D,
} from 'three'
import type { SceneNode, MaterialData } from './types'

type AnyMaterial = MeshStandardMaterial & { needsUpdate: boolean }

export class MaterialManager {
  /** Build a recursive SceneNode tree from an Object3D root */
  extractSceneTree(root: Object3D): SceneNode[] {
    const buildNode = (obj: Object3D, depth: number): SceneNode => {
      const materialIds: string[] = []
      if (obj instanceof Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => materialIds.push(m.uuid))
      }
      return {
        uuid: obj.uuid,
        name: obj.name || `[${obj.type}]`,
        type: obj.type,
        visible: obj.visible,
        children: obj.children.map((c) => buildNode(c, depth + 1)),
        materialIds,
        depth,
      }
    }
    return [buildNode(root, 0)]
  }

  /** Build a flat uuid → Object3D map for fast lookup */
  buildObjectMap(root: Object3D): Map<string, Object3D> {
    const map = new Map<string, Object3D>()
    root.traverse((obj) => map.set(obj.uuid, obj))
    return map
  }

  /** Extract all unique materials as MaterialData */
  extractMaterials(root: Object3D): Map<string, MaterialData> {
    const map = new Map<string, MaterialData>()
    root.traverse((child) => {
      if (child instanceof Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material]
        mats.forEach((mat) => {
          if (!map.has(mat.uuid)) {
            map.set(mat.uuid, this.materialToData(mat))
          }
        })
      }
    })
    return map
  }

  /** Build uuid → raw Three.js material map for direct manipulation */
  buildMaterialObjectMap(root: Object3D): Map<string, AnyMaterial> {
    const map = new Map<string, AnyMaterial>()
    root.traverse((child) => {
      if (child instanceof Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material]
        mats.forEach((mat) => {
          if (!map.has(mat.uuid)) map.set(mat.uuid, mat as AnyMaterial)
        })
      }
    })
    return map
  }

  private materialToData(mat: AnyMaterial): MaterialData {
    const isStd = mat instanceof MeshStandardMaterial
    return {
      uuid: mat.uuid,
      name: mat.name || 'Material',
      type: mat.type,
      color: isStd ? '#' + (mat as MeshStandardMaterial).color.getHexString() : '#ffffff',
      roughness: isStd ? (mat as MeshStandardMaterial).roughness : 1,
      metalness: isStd ? (mat as MeshStandardMaterial).metalness : 0,
      emissive: isStd ? '#' + (mat as MeshStandardMaterial).emissive.getHexString() : '#000000',
      opacity: mat.opacity ?? 1,
      transparent: mat.transparent ?? false,
      hasMap: isStd && !!(mat as MeshStandardMaterial).map,
      mapPreviewUrl: undefined,
    }
  }

  // ── Mutators ─────────────────────────────────────────────────────

  applyColor(mat: AnyMaterial, hex: string): void {
    if ('color' in mat) (mat as MeshStandardMaterial).color.set(hex)
    mat.needsUpdate = true
  }

  applyRoughness(mat: AnyMaterial, value: number): void {
    if (mat instanceof MeshStandardMaterial) mat.roughness = value
    mat.needsUpdate = true
  }

  applyMetalness(mat: AnyMaterial, value: number): void {
    if (mat instanceof MeshStandardMaterial) mat.metalness = value
    mat.needsUpdate = true
  }

  applyEmissive(mat: AnyMaterial, hex: string): void {
    if (mat instanceof MeshStandardMaterial) mat.emissive.set(hex)
    mat.needsUpdate = true
  }

  applyOpacity(mat: AnyMaterial, value: number): void {
    mat.opacity = value
    mat.transparent = value < 1
    mat.needsUpdate = true
  }

  /** Load an image file as a texture and apply it as the base color map */
  async swapTexture(mat: AnyMaterial, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const loader = new TextureLoader()
      loader.load(
        url,
        (texture) => {
          if (mat instanceof MeshStandardMaterial) {
            if (mat.map) mat.map.dispose()
            mat.map = texture
            mat.needsUpdate = true
          }
          resolve(url)
        },
        undefined,
        () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load texture'))
        }
      )
    })
  }

  setVisibility(uuid: string, visible: boolean, objectMap: Map<string, Object3D>): void {
    const obj = objectMap.get(uuid)
    if (obj) obj.visible = visible
  }

  /** Brief emissive flash to indicate which object is selected */
  highlightObject(uuid: string, objectMap: Map<string, Object3D>): void {
    const obj = objectMap.get(uuid)
    if (!obj) return

    const meshes: Mesh[] = []
    if (obj instanceof Mesh) meshes.push(obj)
    obj.traverse((child) => {
      if (child instanceof Mesh) meshes.push(child)
    })

    meshes.forEach((mesh) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat instanceof MeshStandardMaterial) {
          const orig = mat.emissive.clone()
          mat.emissive.set('#4433cc')
          mat.needsUpdate = true
          setTimeout(() => {
            mat.emissive.copy(orig)
            mat.needsUpdate = true
          }, 350)
        }
      })
    })
  }

  /** Update sceneNode visibility state recursively */
  updateNodeVisibility(
    nodes: SceneNode[],
    uuid: string,
    visible: boolean
  ): SceneNode[] {
    return nodes.map((n) =>
      n.uuid === uuid
        ? { ...n, visible }
        : { ...n, children: this.updateNodeVisibility(n.children, uuid, visible) }
    )
  }
}

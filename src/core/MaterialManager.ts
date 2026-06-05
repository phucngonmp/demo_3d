import {
  MeshStandardMaterial,
  Material,
  Mesh,
  TextureLoader,
  Box3,
  Vector3,
  type Object3D,
} from 'three'
import type { SceneNode, MaterialData, MeshCategory, MeshInventoryItem } from './types'

type AnyMaterial = Material

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
        meshCategory: obj instanceof Mesh ? this.getMeshCategory(obj) : undefined,
      }
    }
    return [buildNode(root, 0)]
  }

  getMeshInventory(root: Object3D): MeshInventoryItem[] {
    const items: MeshInventoryItem[] = []

    root.traverse((child) => {
      if (!(child instanceof Mesh)) return

      const size = this.getObjectSize(child)
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]

      items.push({
        uuid: child.uuid,
        name: child.name || '[Mesh]',
        category: this.getMeshCategory(child),
        materialNames: materials.map((mat) => mat.name || mat.type),
        triangleCount: this.getTriangleCount(child),
        dimensions: {
          x: parseFloat(size.x.toFixed(3)),
          y: parseFloat(size.y.toFixed(3)),
          z: parseFloat(size.z.toFixed(3)),
        },
      })
    })

    return items
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

  isolateMaterialToObject(
    root: Object3D,
    selectedObject: Object3D,
    materialUuid: string
  ): AnyMaterial | null {
    const selectedObjects = new Set<Object3D>()
    selectedObject.traverse((obj) => selectedObjects.add(obj))

    let selectedMaterial: AnyMaterial | null = null
    let outsideMaterialClone: AnyMaterial | null = null

    root.traverse((child) => {
      if (!(child instanceof Mesh)) return

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      let changed = false

      const nextMaterials = materials.map((mat) => {
        if (mat.uuid !== materialUuid) return mat

        if (selectedObjects.has(child)) {
          selectedMaterial = mat
          return mat
        }

        outsideMaterialClone ??= mat.clone()
        changed = true
        return outsideMaterialClone
      })

      if (changed) {
        child.material = Array.isArray(child.material)
          ? nextMaterials
          : nextMaterials[0]
      }
    })

    return selectedMaterial
  }

  getMeshCategory(mesh: Mesh): MeshCategory {
    const text = this.getSearchText(mesh)
    if (/\b(brick|bricks|masonry)\b/.test(text)) return 'brick'
    if (/\b(tile|tiles|tiling|ceramic|porcelain|gach|gạch)\b/.test(text)) return 'tile'
    if (/\b(floor|flooring|ground|san|sàn|parquet|woodfloor)\b/.test(text)) return 'floor'
    if (/\b(wall|walls|tuong|tường|partition)\b/.test(text)) return 'wall'

    const size = this.getObjectSize(mesh)
    const maxHorizontal = Math.max(size.x, size.z)
    const minHorizontal = Math.min(size.x, size.z)
    const isWide = maxHorizontal > 0.5
    const isVeryThinY = size.y < Math.max(size.x, size.z) * 0.08
    const isVerticalSheet = size.y > 0.5 && minHorizontal < Math.max(size.y, maxHorizontal) * 0.12

    if (isWide && isVeryThinY) return 'floor'
    if (isVerticalSheet) return 'wall'

    return 'other'
  }

  private getSearchText(mesh: Mesh): string {
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    return [
      mesh.name,
      mesh.type,
      mesh.parent?.name,
      ...materials.map((mat) => mat.name),
      ...materials.map((mat) => mat.type),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  private getObjectSize(object: Object3D): Vector3 {
    const box = new Box3().setFromObject(object)
    const size = new Vector3()
    box.getSize(size)
    return size
  }

  private getTriangleCount(mesh: Mesh): number {
    const geo = mesh.geometry
    if (geo.index) return Math.round(geo.index.count / 3)
    if (geo.attributes.position) return Math.round(geo.attributes.position.count / 3)
    return 0
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
      textureUrl: mat.userData?.textureUrl,
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

  /** Load an image from URL as a texture and apply it as the base color map */
  async applyTextureFromUrl(mat: AnyMaterial, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new TextureLoader()
      loader.load(
        url,
        (texture) => {
          if (mat instanceof MeshStandardMaterial) {
            if (mat.map) mat.map.dispose()
            mat.map = texture
            mat.needsUpdate = true
            mat.userData = mat.userData || {}
            mat.userData.textureUrl = url
          }
          resolve()
        },
        undefined,
        () => reject(new Error('Failed to load texture from url'))
      )
    })
  }

  setVisibility(uuid: string, visible: boolean, objectMap: Map<string, Object3D>): void {
    const obj = objectMap.get(uuid)
    if (obj) obj.visible = visible
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

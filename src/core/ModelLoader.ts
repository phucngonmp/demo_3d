import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {
  Box3,
  DoubleSide,
  Material,
  Vector3,
  MeshStandardMaterial,
  Mesh,
  type Object3D,
} from 'three'
import type { LoadResult, ModelInfo } from './types'

export class ModelLoader {
  private loader: GLTFLoader

  constructor() {
    this.loader = new GLTFLoader()

    // Enable Draco compression support
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    )
    this.loader.setDRACOLoader(dracoLoader)
  }

  loadFromFile(file: File): Promise<LoadResult> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)

      this.loader.load(
        url,
        (gltf) => {
          URL.revokeObjectURL(url)
          const object = gltf.scene
          this.prepareForStableRendering(object)
          const info = this.collectInfo(file.name, object)
          resolve({ object, info })
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url)
          reject(error)
        }
      )
    })
  }

  loadFromUrl(url: string, fileName: string): Promise<LoadResult> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const object = gltf.scene
          this.prepareForStableRendering(object)
          const info = this.collectInfo(fileName, object)
          resolve({ object, info })
        },
        undefined,
        (error) => {
          reject(error)
        }
      )
    })
  }

  private prepareForStableRendering(object: Object3D): void {
    object.updateWorldMatrix(true, true)
    const meshes: Mesh[] = []

    object.traverse((child) => {
      if (!(child instanceof Mesh)) return
      meshes.push(child)

      this.getMaterials(child).forEach((mat) => {
        mat.depthTest = true
        if (!mat.transparent) mat.depthWrite = true
        if (mat.transparent && mat.side === DoubleSide) {
          mat.forceSinglePass = true
        }
      })
    })

    const byBounds = new Map<string, Mesh[]>()
    meshes.forEach((mesh) => {
      const key = this.getRoundedBoundsKey(mesh)
      const group = byBounds.get(key)
      if (group) group.push(mesh)
      else byBounds.set(key, [mesh])
    })

    byBounds.forEach((group) => {
      if (group.length < 2) return

      const sorted = [...group].sort(
        (a, b) => this.getSurfacePriority(a) - this.getSurfacePriority(b)
      )

      sorted.forEach((mesh, index) => {
        mesh.renderOrder = index
        const offset = sorted.length - 1 - index
        this.cloneMaterials(mesh).forEach((mat) => {
          mat.polygonOffset = true
          mat.polygonOffsetFactor = offset
          mat.polygonOffsetUnits = offset
          mat.needsUpdate = true
        })
      })
    })
  }

  private getMaterials(mesh: Mesh): Material[] {
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  }

  private cloneMaterials(mesh: Mesh): Material[] {
    const next = this.getMaterials(mesh).map((mat) => mat.clone())
    mesh.material = Array.isArray(mesh.material) ? next : next[0]
    return next
  }

  private getRoundedBoundsKey(mesh: Mesh): string {
    const box = new Box3().setFromObject(mesh)
    return [
      box.min.x,
      box.min.y,
      box.min.z,
      box.max.x,
      box.max.y,
      box.max.z,
    ]
      .map((value) => Math.round(value * 100) / 100)
      .join('|')
  }

  private getSurfacePriority(mesh: Mesh): number {
    const text = [
      mesh.name,
      ...this.getMaterials(mesh).map((mat) => mat.name),
    ]
      .join(' ')
      .toLowerCase()

    let priority = 1
    if (/\b(black|backing|back|nero|noir)\b|黒/.test(text)) priority -= 2
    if (this.getMaterials(mesh).some((mat) => mat instanceof MeshStandardMaterial && mat.map)) {
      priority += 1
    }
    if (this.getMaterials(mesh).some((mat) => mat.transparent)) priority -= 1
    return priority
  }

  private collectInfo(fileName: string, object: Object3D): ModelInfo {
    let triangleCount = 0
    let vertexCount = 0
    const materials = new Set<string>()
    let objectCount = 0

    object.traverse((child) => {
      objectCount++
      if (child instanceof Mesh) {
        const geo = child.geometry
        if (geo.index) {
          triangleCount += geo.index.count / 3
        } else if (geo.attributes.position) {
          triangleCount += geo.attributes.position.count / 3
        }
        if (geo.attributes.position) {
          vertexCount += geo.attributes.position.count
        }
        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material]
          mats.forEach((m) => materials.add(m.uuid))
        }
      }
    })

    const box = new Box3().setFromObject(object)
    const size = new Vector3()
    box.getSize(size)

    return {
      fileName,
      triangleCount: Math.round(triangleCount),
      vertexCount,
      materialCount: materials.size,
      objectCount,
      dimensions: {
        x: parseFloat(size.x.toFixed(3)),
        y: parseFloat(size.y.toFixed(3)),
        z: parseFloat(size.z.toFixed(3)),
      },
    }
  }

  setWireframe(object: Object3D, enabled: boolean): void {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material]
        mats.forEach((mat) => {
          if (mat instanceof MeshStandardMaterial) {
            mat.wireframe = enabled
          }
        })
      }
    })
  }
}

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {
  Box3,
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

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box3, Vector3, type PerspectiveCamera } from 'three'
import type { Object3D } from 'three'
import type { WebGLRenderer } from 'three'

export class CameraController {
  controls: OrbitControls

  constructor(camera: PerspectiveCamera, renderer: WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 0.1
    this.controls.maxDistance = 500
    this.controls.maxPolarAngle = Math.PI / 1.9
  }

  /** Call this each frame in the animation loop */
  update(): void {
    this.controls.update()
  }

  /** Frame the camera to fully contain the object */
  fitToObject(object: Object3D, camera: PerspectiveCamera): void {
    const box = new Box3().setFromObject(object)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
    cameraDistance *= 1.8 // padding

    const direction = camera.position.clone().sub(this.controls.target).normalize()
    camera.position.copy(center).addScaledVector(direction, cameraDistance)

    this.controls.target.copy(center)
    this.controls.update()

    camera.near = maxDim * 0.001
    camera.far = maxDim * 100
    camera.updateProjectionMatrix()
  }

  reset(): void {
    this.controls.reset()
  }

  enable(): void {
    this.controls.enabled = true
  }

  disable(): void {
    this.controls.enabled = false
  }

  dispose(): void {
    this.controls.dispose()
  }
}

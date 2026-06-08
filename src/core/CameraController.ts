import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box3, Vector3, type PerspectiveCamera } from 'three'
import type { Object3D } from 'three'
import type { WebGLRenderer } from 'three'

export type CameraMode = 'orbit' | 'interior'

export class CameraController {
  controls: OrbitControls
  mode: CameraMode = 'orbit'
  private boundingBox: Box3 | null = null
  private keys = { forward: false, backward: false, left: false, right: false }
  private cleanupListeners: (() => void) | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private lastTime = performance.now()

  constructor(camera: PerspectiveCamera, renderer: WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.screenSpacePanning = false
    this.controls.enableZoom = true
    this.controls.enablePan = true

    this.controls.minDistance = 0.001
    this.controls.maxDistance = Infinity
    this.controls.maxPolarAngle = Math.PI // Cho phép xoay nhìn từ dưới lên (180 độ)

    // Keyboard movement listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (this.mode !== 'interior') return
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = true; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; e.preventDefault(); break;
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.mode !== 'interior') return
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = false; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; e.preventDefault(); break;
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }

  /** Call this each frame in the animation loop */
  update(): void {
    const now = performance.now()
    const delta = Math.min((now - this.lastTime) / 1000, 0.1) // seconds, max 100ms
    this.lastTime = now

    if (this.mode === 'interior' && this.boundingBox) {
      this.handleMovement(delta)
    }
    this.controls.update()
  }

  private handleMovement(delta: number): void {
    if (!this.boundingBox) return

    let moveX = 0
    let moveZ = 0
    if (this.keys.forward) moveZ += 1
    if (this.keys.backward) moveZ -= 1
    if (this.keys.left) moveX -= 1
    if (this.keys.right) moveX += 1

    if (moveX === 0 && moveZ === 0) return

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    moveX /= len
    moveZ /= len

    const cam = this.controls.object as PerspectiveCamera

    const forward = new Vector3()
    cam.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() < 0.0001) {
      forward.subVectors(this.controls.target, cam.position)
      forward.y = 0
    }
    forward.normalize()

    const right = new Vector3()
    right.crossVectors(forward, new Vector3(0, 1, 0)).normalize()

    const size = new Vector3()
    this.boundingBox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z) || 2
    const speed = Math.max(0.5, maxDim * 0.2)
    const dist = speed * delta

    const nextPos = cam.position.clone()
    nextPos.addScaledVector(forward, moveZ * dist)
    nextPos.addScaledVector(right, moveX * dist)

    const paddingX = (this.boundingBox.max.x - this.boundingBox.min.x) * 2
    const paddingZ = (this.boundingBox.max.z - this.boundingBox.min.z) * 2

    const clampedX = Math.max(this.boundingBox.min.x - paddingX, Math.min(this.boundingBox.max.x + paddingX, nextPos.x))
    const clampedZ = Math.max(this.boundingBox.min.z - paddingZ, Math.min(this.boundingBox.max.z + paddingZ, nextPos.z))

    const actualDX = clampedX - cam.position.x
    const actualDZ = clampedZ - cam.position.z

    cam.position.x += actualDX
    cam.position.z += actualDZ
    this.controls.target.x += actualDX
    this.controls.target.z += actualDZ
  }

  setMode(mode: CameraMode, object?: Object3D, camera?: PerspectiveCamera): void {
    this.mode = mode
    if (mode === 'interior') {
      this.controls.enableZoom = false
      this.controls.enablePan = false
    } else {
      this.controls.enableZoom = true
      this.controls.enablePan = true
    }
    if (object && camera) {
      this.fitToObject(object, camera)
    }
  }

  /** Frame or stand inside the object based on current mode */
  fitToObject(object: Object3D, camera: PerspectiveCamera): void {
    const box = new Box3().setFromObject(object)
    this.boundingBox = box
    const center = new Vector3()
    box.getCenter(center)

    if (this.mode === 'interior') {
      const size = new Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z) || 1

      // Auto-detect unit (m or mm) to make 1.7m realistic
      const eyeHeight = maxDim > 500 ? 1700 : 1.7
      const eyeLevelY = box.min.y + eyeHeight

      // Đặt camera ở trung tâm và cao 1.7m
      camera.position.set(center.x, eyeLevelY, center.z + (maxDim * 0.4)) // Lùi lại chút để dễ thấy phòng

      // Ép hướng nhìn ngang hoàn hảo (không bị chúc xuống đất hay ngóc lên trời)
      this.controls.target.set(center.x, eyeLevelY, center.z)
      this.controls.update()

      camera.near = this.getInteriorNearPlane(maxDim)
      camera.far = Math.max(100, maxDim * 5)
    } else {
      const size = new Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const fov = camera.fov * (Math.PI / 180)
      let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
      cameraDistance *= 1.8 // padding

      const direction = camera.position.clone().sub(this.controls.target).normalize()
      if (direction.lengthSq() < 0.001) direction.set(0, 0, 1)

      const near = this.getOrbitNearPlane(maxDim)
      this.controls.minDistance = Math.max(near * 2, maxDim * 0.005)
      this.controls.maxDistance = maxDim * 20

      camera.position.copy(center).addScaledVector(direction, cameraDistance)
      this.controls.target.copy(center)
      this.controls.update()

      camera.near = near
      camera.far = Math.max(1000, maxDim * 30)
      camera.updateProjectionMatrix()
    }
    camera.updateProjectionMatrix()
  }

  private getOrbitNearPlane(maxDim: number): number {
    if (maxDim > 500) return Math.max(1, Math.min(10, maxDim * 0.005))
    return Math.max(0.01, Math.min(0.1, maxDim * 0.002))
  }

  private getInteriorNearPlane(maxDim: number): number {
    if (maxDim > 500) return Math.max(0.5, Math.min(5, maxDim * 0.002))
    return Math.max(0.01, Math.min(0.05, maxDim * 0.001))
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

  teleportTo(x: number, z: number): void {
    if (this.mode !== 'interior' || !this.boundingBox) return

    const paddingX = (this.boundingBox.max.x - this.boundingBox.min.x) * 2
    const paddingZ = (this.boundingBox.max.z - this.boundingBox.min.z) * 2

    const minX = this.boundingBox.min.x - paddingX
    const maxX = this.boundingBox.max.x + paddingX
    const minZ = this.boundingBox.min.z - paddingZ
    const maxZ = this.boundingBox.max.z + paddingZ

    const finalPx = Math.max(minX, Math.min(maxX, x))
    const finalPz = Math.max(minZ, Math.min(maxZ, z))

    const cam = this.controls.object as PerspectiveCamera
    const actualDX = finalPx - cam.position.x
    const actualDZ = finalPz - cam.position.z

    cam.position.x += actualDX
    cam.position.z += actualDZ
    this.controls.target.x += actualDX
    this.controls.target.z += actualDZ

    this.controls.update()
  }

  dispose(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    if (this.cleanupListeners) this.cleanupListeners()
    this.controls.dispose()
  }
}

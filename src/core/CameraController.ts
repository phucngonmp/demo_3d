import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box3, Vector3, type PerspectiveCamera } from 'three'
import type { Object3D } from 'three'
import type { WebGLRenderer } from 'three'

export type CameraMode = 'orbit' | 'interior'

export class CameraController {
  controls: OrbitControls
  mode: CameraMode = 'orbit'
  private boundingBox: Box3 | null = null
  private keys = { forward: false, backward: false, left: false, right: false, up: false, down: false }
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
    this.controls.maxPolarAngle = Math.PI

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.mode !== 'interior') return
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = true; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; e.preventDefault(); break;
        case 'KeyQ': case 'Space': this.keys.up = true; e.preventDefault(); break;
        case 'KeyE': case 'ShiftLeft': case 'ShiftRight': this.keys.down = true; e.preventDefault(); break;
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.mode !== 'interior') return
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = false; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; e.preventDefault(); break;
        case 'KeyQ': case 'Space': this.keys.up = false; e.preventDefault(); break;
        case 'KeyE': case 'ShiftLeft': case 'ShiftRight': this.keys.down = false; e.preventDefault(); break;
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }

  update(): void {
    const now = performance.now()
    const delta = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now

    if (this.mode === 'interior' && this.boundingBox) {
      this.handleMovement(delta)
    }
    this.controls.update()
  }

  private handleMovement(delta: number): void {
    if (!this.boundingBox) return

    let moveX = 0
    let moveY = 0
    let moveZ = 0
    if (this.keys.forward) moveZ += 1
    if (this.keys.backward) moveZ -= 1
    if (this.keys.left) moveX -= 1
    if (this.keys.right) moveX += 1
    if (this.keys.up) moveY += 1
    if (this.keys.down) moveY -= 1

    if (moveX === 0 && moveY === 0 && moveZ === 0) return

    const len = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ)
    moveX /= len
    moveY /= len
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
    nextPos.y += moveY * dist

    // Khong cho di xuyen tuong, padding giu nguoi ben trong
    const paddingX = Math.min(-0.2, -(this.boundingBox.max.x - this.boundingBox.min.x) * 0.05)
    const paddingY = Math.min(-0.2, -(this.boundingBox.max.y - this.boundingBox.min.y) * 0.05)
    const paddingZ = Math.min(-0.2, -(this.boundingBox.max.z - this.boundingBox.min.z) * 0.05)

    const clampedX = Math.max(this.boundingBox.min.x - paddingX, Math.min(this.boundingBox.max.x + paddingX, nextPos.x))
    const clampedY = Math.max(this.boundingBox.min.y - paddingY, Math.min(this.boundingBox.max.y + paddingY, nextPos.y))
    const clampedZ = Math.max(this.boundingBox.min.z - paddingZ, Math.min(this.boundingBox.max.z + paddingZ, nextPos.z))

    const actualDX = clampedX - cam.position.x
    const actualDY = clampedY - cam.position.y
    const actualDZ = clampedZ - cam.position.z

    cam.position.x += actualDX
    cam.position.y += actualDY
    cam.position.z += actualDZ
    
    this.controls.target.x += actualDX
    this.controls.target.y += actualDY
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

  fitToObject(object: Object3D, camera: PerspectiveCamera): void {
    object.updateMatrixWorld(true)
    const box = new Box3().setFromObject(object)
    this.boundingBox = box
    const center = new Vector3()
    box.getCenter(center)

    if (this.mode === 'interior') {
      const size = new Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z) || 1

      const eyeHeight = maxDim > 500 ? 1700 : 1.7
      const eyeLevelY = box.min.y + eyeHeight

      // Đặt vị trí xuất phát ở chính giữa phòng (tâm Bounding Box)
      camera.position.set(center.x, eyeLevelY, center.z)

      // MẸO GIẢ LẬP FPS VỚI ORBITCONTROLS: 
      // Đặt target cực kỳ gần với camera (cách 0.01 đơn vị) phía trước mặt.
      // Nhờ đó khi kéo chuột, camera không bị "dịch chuyển 1 đoạn" quay quanh trung tâm nhà, 
      // mà nó sẽ xoay tại chỗ (xoay quanh cái target sát mặt).
      const lookDist = maxDim > 500 ? 10 : 0.01
      this.controls.target.set(center.x, eyeLevelY, center.z - lookDist)
      this.controls.update()

      camera.near = this.getInteriorNearPlane(maxDim)
      camera.far = Math.max(100, maxDim * 5)
    } else {
      const size = new Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const fov = camera.fov * (Math.PI / 180)
      let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
      cameraDistance *= 1.8

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
    }
    camera.updateProjectionMatrix()
  }

  private getOrbitNearPlane(maxDim: number): number {
    if (maxDim > 500) return Math.max(1, Math.min(10, maxDim * 0.005))
    return Math.max(0.01, Math.min(0.1, maxDim * 0.002))
  }

  private getInteriorNearPlane(maxDim: number): number {
    if (maxDim > 500) return Math.max(1, Math.min(10, maxDim * 0.001))
    return Math.max(0.01, Math.min(0.1, maxDim * 0.001))
  }

  saveState(): void {
    const cam = this.controls.object as PerspectiveCamera
    const state = {
      position: cam.position.toArray(),
      target: this.controls.target.toArray(),
      zoom: cam.zoom,
      mode: this.mode
    }
    localStorage.setItem('viewer_camera_state', JSON.stringify(state))
  }

  loadState(): boolean {
    const stateStr = localStorage.getItem('viewer_camera_state')
    if (!stateStr) return false
    try {
      const state = JSON.parse(stateStr)
      if (state.mode && state.mode !== this.mode) return false

      const cam = this.controls.object as PerspectiveCamera
      cam.position.fromArray(state.position)
      this.controls.target.fromArray(state.target)
      cam.zoom = state.zoom || 1
      cam.updateProjectionMatrix()
      this.controls.update()
      return true
    } catch {
      return false
    }
  }

  dispose(): void {
    if (this.cleanupListeners) this.cleanupListeners()
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.controls.dispose()
  }

  reset(): void {
    const cam = this.controls.object as PerspectiveCamera
    cam.position.set(3, 2, 5)
    this.controls.target.set(0, 0, 0)
    cam.zoom = 1
    cam.updateProjectionMatrix()
    this.controls.update()
  }

  teleportTo(x: number, z: number): void {
    if (this.mode !== 'interior') return
    const cam = this.controls.object as PerspectiveCamera

    // Tính toán độ dời
    const dx = x - cam.position.x
    const dz = z - cam.position.z

    cam.position.x += dx
    cam.position.z += dz
    this.controls.target.x += dx
    this.controls.target.z += dz
    this.controls.update()
  }
}

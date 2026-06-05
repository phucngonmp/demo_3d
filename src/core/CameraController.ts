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
    this.controls.enableZoom = true // Mặc định Orbit
    this.controls.enablePan = true

    this.controls.minDistance = 0.001
    this.controls.maxDistance = Infinity
    this.controls.maxPolarAngle = Math.PI / 1.9

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
    // Lên = đi tới, Xuống = lùi, Trái = sang trái, Phải = sang phải
    if (this.keys.forward) moveZ += 1
    if (this.keys.backward) moveZ -= 1
    if (this.keys.left) moveX -= 1
    if (this.keys.right) moveX += 1

    if (moveX === 0 && moveZ === 0) return

    // Chuẩn hóa vector di chuyển chéo
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    moveX /= len
    moveZ /= len

    const cam = this.controls.object as PerspectiveCamera

    // Lấy hướng nhìn hiện tại của Camera (vector Z của FPS)
    const forward = new Vector3()
    cam.getWorldDirection(forward)
    forward.y = 0 // Chỉ đi trên mặt phẳng ngang
    if (forward.lengthSq() < 0.0001) {
      // Đề phòng trường hợp nhìn cắm thẳng xuống đất
      forward.subVectors(this.controls.target, cam.position)
      forward.y = 0
    }
    forward.normalize()

    // Lấy hướng sang phải (vector X của FPS)
    const right = new Vector3()
    right.crossVectors(forward, new Vector3(0, 1, 0)).normalize()

    // Tốc độ di chuyển tỉ lệ thuận với kích thước phòng (đi ngang phòng mất khoảng 5 giây)
    const size = new Vector3()
    this.boundingBox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z) || 2
    const speed = Math.max(0.5, maxDim * 0.2)
    const dist = speed * delta

    // Tính tọa độ mới
    const nextPos = cam.position.clone()
    nextPos.addScaledVector(forward, moveZ * dist)
    nextPos.addScaledVector(right, moveX * dist)

    // Chặn tường KHÔNG dùng padding tỷ lệ nữa (cho padding = 0 luôn)
    const clampedX = Math.max(this.boundingBox.min.x, Math.min(this.boundingBox.max.x, nextPos.x))
    const clampedZ = Math.max(this.boundingBox.min.z, Math.min(this.boundingBox.max.z, nextPos.z))

    // Tịnh tiến toàn bộ Camera và Target đi 1 đoạn y chang nhau
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
      // Thay vì cộng cứng 1.6 (có thể văng nóc nếu model scale nhỏ),
      // ta đặt camera ở khoảng 40% - 50% chiều cao tính từ mặt sàn (trung tâm phòng)
      const height = box.max.y - box.min.y
      const eyeLevelY = box.min.y + height * 0.45
      camera.position.set(center.x, eyeLevelY, center.z)
      // BÍ QUYẾT FPS: Đặt target sát camera
      const lookDir = new Vector3()
      camera.getWorldDirection(lookDir)
      this.controls.target.copy(camera.position).addScaledVector(lookDir, 0.01)
      this.controls.update()

      // Hạ siêu nhỏ mặt phẳng cắt (Near Clipping Plane) để không bị tàng hình sàn nhà
      camera.near = 0.01
      camera.far = 100000
    } else {
      // Orbit (bao quát bên ngoài)
      const size = new Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const fov = camera.fov * (Math.PI / 180)
      let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
      cameraDistance *= 1.8 // padding

      const direction = camera.position.clone().sub(this.controls.target).normalize()
      if (direction.lengthSq() < 0.001) direction.set(0, 0, 1)

      // Update limits based on actual scale so we can zoom properly on huge/tiny objects
      this.controls.minDistance = maxDim * 0.001
      this.controls.maxDistance = maxDim * 20

      camera.position.copy(center).addScaledVector(direction, cameraDistance)
      this.controls.target.copy(center)
      this.controls.update()

      camera.near = Math.min(0.1, maxDim * 0.005)
      camera.far = Math.max(100000, maxDim * 10000)
      camera.updateProjectionMatrix()
    }
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

  teleportTo(x: number, z: number): void {
    if (this.mode !== 'interior' || !this.boundingBox) return

    // KHÔNG dùng đệm tường (padding = 0)
    const minX = this.boundingBox.min.x
    const maxX = this.boundingBox.max.x
    const minZ = this.boundingBox.min.z
    const maxZ = this.boundingBox.max.z

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

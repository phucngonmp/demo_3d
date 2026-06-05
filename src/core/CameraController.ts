import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box3, Vector3, type PerspectiveCamera } from 'three'
import type { Object3D } from 'three'
import type { WebGLRenderer } from 'three'

const STORAGE_KEY = 'glb-viewer:camera'

interface CameraState {
  px: number; py: number; pz: number  // camera position
  tx: number; ty: number; tz: number  // orbit target
  fileName: string                    // guard: only restore for same file
}

export type CameraMode = 'orbit' | 'interior'

export class CameraController {
  controls: OrbitControls
  mode: CameraMode = 'orbit'
  private boundingBox: Box3 | null = null
  private keys = { forward: false, backward: false, left: false, right: false }
  private cleanupListeners: (() => void) | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private currentFileName = ''
  private lastTime = performance.now()

  constructor(camera: PerspectiveCamera, renderer: WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.screenSpacePanning = false
    this.controls.enableZoom = true // Mặc định Orbit
    this.controls.enablePan = true

    this.controls.minDistance = 0.01
    this.controls.maxDistance = 500
    this.controls.maxPolarAngle = Math.PI / 1.9

    // Auto-save on camera change (debounced 800 ms)
    this.controls.addEventListener('change', () => {
      if (!this.currentFileName) return
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => this.saveCameraState(), 800)
    })

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

    // Tốc độ cố định vĩnh viễn (0.5 đơn vị mỗi giây)
    const speed = 0.5 
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
      camera.near = 0.001
      camera.far = 1000
    } else {
      // Orbit (bao quát bên ngoài)
      const size = new Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
      cameraDistance *= 1.8 // padding

      const direction = camera.position.clone().sub(this.controls.target).normalize()
      // Nếu direction bị [0,0,0], fallback về Z
      if (direction.lengthSq() < 0.001) direction.set(0, 0, 1)

      camera.position.copy(center).addScaledVector(direction, cameraDistance)
      this.controls.target.copy(center)
      this.controls.update()

      camera.near = maxDim * 0.001
      camera.far = maxDim * 100
      camera.updateProjectionMatrix()
    }
    camera.updateProjectionMatrix()
  }

  reset(): void {
    this.controls.reset()
  }

  /** Set the current file context so auto-save knows which file this camera belongs to */
  setFileName(name: string): void {
    this.currentFileName = name
  }

  /** Save current camera pose to localStorage */
  saveCameraState(): void {
    if (!this.currentFileName) return
    const cam = this.controls.object as PerspectiveCamera
    const state: CameraState = {
      px: cam.position.x, py: cam.position.y, pz: cam.position.z,
      tx: this.controls.target.x, ty: this.controls.target.y, tz: this.controls.target.z,
      fileName: this.currentFileName,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch { /* storage quota exceeded - ignore */ }
  }

  /**
   * Restore camera pose from localStorage.
   * Only applies if the stored state matches the given fileName.
   * Returns true if restored.
   */
  restoreCameraState(fileName: string): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const state: CameraState = JSON.parse(raw)
      if (state.fileName !== fileName) return false

      const cam = this.controls.object as PerspectiveCamera
      cam.position.set(state.px, state.py, state.pz)
      this.controls.target.set(state.tx, state.ty, state.tz)
      this.controls.update()
      return true
    } catch {
      return false
    }
  }

  /** Remove stored camera state (e.g. when model is cleared) */
  clearCameraState(): void {
    localStorage.removeItem(STORAGE_KEY)
    this.currentFileName = ''
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

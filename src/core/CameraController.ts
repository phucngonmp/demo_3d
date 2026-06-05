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

export class CameraController {
  controls: OrbitControls
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private currentFileName = ''

  constructor(camera: PerspectiveCamera, renderer: WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 0.1
    this.controls.maxDistance = 500
    this.controls.maxPolarAngle = Math.PI / 1.9

    // Auto-save on camera change (debounced 800 ms)
    this.controls.addEventListener('change', () => {
      if (!this.currentFileName) return
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => this.saveCameraState(), 800)
    })
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

  dispose(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.controls.dispose()
  }
}

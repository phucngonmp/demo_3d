import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Group,
  Mesh,
  LineBasicMaterial,
  LineSegments,
  EdgesGeometry,
  BoxHelper,
  Color,
  PCFSoftShadowMap,
  Raycaster,
  Vector2,
  Vector3,
  PMREMGenerator,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  type Object3D,
  Box3,
  Material,
  TextureLoader,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import type { EnvMode } from './types'

export class SceneManager {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  private animationId: number | null = null
  private selectionGroup: Group | null = null
  private selectionLineMaterial: LineBasicMaterial | null = null
  public keyLight: DirectionalLight | null = null
  private selectionEdgeGeometries: EdgesGeometry[] = []
  private selectionBoxes: BoxHelper[] = []
  private raycaster = new Raycaster()
  private pointer = new Vector2()
  private theme: 'dark' | 'light' = 'dark'
  private currentEnv: string = ''
  private resizeObserver: ResizeObserver | null = null
  private resizeFrameId: number | null = null
  private mountedContainer: HTMLElement | null = null
  private readonly resizingClass = 'is-resizing-sidebars'
  private readonly commitResizeEvent = 'glb-viewer:commit-resize'
  private readonly commitResize = () => {
    if (this.resizeFrameId !== null) {
      cancelAnimationFrame(this.resizeFrameId)
      this.resizeFrameId = null
    }
    if (this.mountedContainer) this.updateSize(this.mountedContainer)
  }

  constructor() {
    // Renderer
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(new Color('#0d0d14'))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0 // Chuẩn PBR mặc định

    // Scene
    this.scene = new Scene()
    this.scene.background = new Color('#0d0d14')

    // Camera
    this.camera = new PerspectiveCamera(50, 1, 0.01, 1000)
    this.camera.position.set(3, 2, 5)

    // Environment Map
    this.setEnvironmentMode('city')

    // Ambient light as base
    const ambient = new AmbientLight(0xffffff, 0.3)
    this.scene.add(ambient)
    // Hemisphere Light: Cung cấp ánh sáng môi trường đa hướng, giúp các vùng tối có chi tiết rõ ràng hơn
    const hemiLight = new HemisphereLight(0xffffff, 0x444444, 0.6)
    hemiLight.position.set(0, 20, 0)
    this.scene.add(hemiLight)

    // Key Light for casting shadows
    this.keyLight = new DirectionalLight(0xffffff, 1.0)
    this.keyLight.position.set(5, 8, 5)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.width = 2048
    this.keyLight.shadow.mapSize.height = 2048
    this.keyLight.shadow.bias = -0.0005
    this.keyLight.shadow.normalBias = 0.02
    this.scene.add(this.keyLight)
    this.scene.add(this.keyLight.target)
  }

  fitShadowToBox(box: Box3): void {
    if (!this.keyLight) return
    const size = new Vector3()
    box.getSize(size)
    const center = new Vector3()
    box.getCenter(center)

    const maxDim = Math.max(size.x, size.y, size.z) || 10

    // Đặt vị trí đèn tương thích với trung tâm mô hình
    this.keyLight.position.set(center.x + maxDim * 0.5, center.y + maxDim, center.z + maxDim * 0.5)
    this.keyLight.target.position.copy(center)
    this.keyLight.target.updateMatrixWorld()

    // Kéo giãn lăng kính bóng đổ (Shadow Frustum) bao trọn toàn bộ không gian mô hình khổng lồ
    const cam = this.keyLight.shadow.camera
    cam.left = -maxDim
    cam.right = maxDim
    cam.top = maxDim
    cam.bottom = -maxDim
    cam.near = maxDim * 0.01 // Sửa near/far tỷ lệ chuẩn để không phá huỷ depth buffer của bóng
    cam.far = maxDim * 5
    cam.updateProjectionMatrix()

    // SIÊU QUAN TRỌNG: Scale shadow bias theo kích thước khổng lồ của mô hình để triệt tiêu lỗi Z-Fighting/Acne ở gầm nhà
    this.keyLight.shadow.bias = -0.0001 * maxDim
    this.keyLight.shadow.normalBias = 0.01 * maxDim
  }

  mount(container: HTMLElement): void {
    const canvas = this.renderer.domElement
    this.mountedContainer = container
    container.appendChild(canvas)
    this.updateSize(container)

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleResize()
    })
    this.resizeObserver.observe(container)
    window.addEventListener(this.commitResizeEvent, this.commitResize)
  }

  unmount(): void {
    this.stopLoop()
    window.removeEventListener(this.commitResizeEvent, this.commitResize)
    this.resizeObserver?.disconnect()
    if (this.resizeFrameId !== null) {
      cancelAnimationFrame(this.resizeFrameId)
      this.resizeFrameId = null
    }
    this.mountedContainer = null
    this.clearSelection()
    this.renderer.domElement.remove()
    this.renderer.dispose()
  }

  private scheduleResize(): void {
    if (document.body.classList.contains(this.resizingClass)) {
      return
    }
    if (this.resizeFrameId !== null) return

    this.resizeFrameId = requestAnimationFrame(() => {
      this.resizeFrameId = null
      if (!this.mountedContainer) return
      if (document.body.classList.contains(this.resizingClass)) {
        return
      }
      this.updateSize(this.mountedContainer)
    })
  }

  private updateSize(container: HTMLElement): void {
    const w = Math.max(1, Math.round(container.clientWidth))
    const h = Math.max(1, Math.round(container.clientHeight))
    const currentSize = this.renderer.getSize(new Vector2())
    if (currentSize.x === w && currentSize.y === h) return

    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setExposure(value: number): void {
    this.renderer.toneMappingExposure = value
  }


  startLoop(onFrame?: () => void): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      onFrame?.()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  stopLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  pickObjectAt(clientX: number, clientY: number, root: Object3D): Object3D | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const pickTargets: Mesh[] = []
    root.traverse((child) => {
      if (child instanceof Mesh && child.visible) pickTargets.push(child)
    })

    const [hit] = this.raycaster.intersectObjects(pickTargets, false)
    return hit?.object ?? null
  }

  raycastPoint(clientX: number, clientY: number, root: Object3D): Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const pickTargets: Mesh[] = []
    root.traverse((child) => {
      if (child instanceof Mesh && child.visible) pickTargets.push(child)
    })

    const [hit] = this.raycaster.intersectObjects(pickTargets, false)
    return hit ? hit.point : null
  }

  setSelectedObject(object: Object3D | null): void {
    this.clearSelection()
    if (!object || !object.visible) return

    const color = this.getSelectionColor()
    const group = new Group()
    const lineMaterial = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    })
    this.selectionLineMaterial = lineMaterial

    object.updateWorldMatrix(true, true)
    object.traverse((child) => {
      if (!(child instanceof Mesh) || !child.visible) return

      const edgesGeometry = new EdgesGeometry(child.geometry, 25)
      this.selectionEdgeGeometries.push(edgesGeometry)
      const outline = new LineSegments(edgesGeometry, lineMaterial)
      outline.matrixAutoUpdate = false
      outline.matrix.copy(child.matrixWorld)
      outline.renderOrder = 999
      group.add(outline)
    })

    if (group.children.length === 0) return
    const box = new BoxHelper(object, color)
    box.renderOrder = 1000
    box.material.depthTest = false
    box.material.transparent = true
    this.selectionBoxes.push(box)
    group.add(box)

    this.selectionGroup = group
    this.scene.add(group)
  }

  setSelectedMaterial(materialUuid: string | null): void {
    this.clearSelection()
    if (!materialUuid) return

    const color = this.getSelectionColor()
    const group = new Group()
    const lineMaterial = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    })
    this.selectionLineMaterial = lineMaterial

    let hasSelection = false

    this.scene.traverse((child) => {
      if (!(child instanceof Mesh) || !child.visible) return

      let hasMat = false
      if (Array.isArray(child.material)) {
        if (child.material.some((m) => m.uuid === materialUuid)) hasMat = true
      } else if (child.material && child.material.uuid === materialUuid) {
        hasMat = true
      }

      if (hasMat) {
        hasSelection = true
        const edgesGeometry = new EdgesGeometry(child.geometry, 25)
        this.selectionEdgeGeometries.push(edgesGeometry)
        const outline = new LineSegments(edgesGeometry, lineMaterial)
        outline.matrixAutoUpdate = false
        outline.matrix.copy(child.matrixWorld)
        outline.renderOrder = 999
        group.add(outline)

        const box = new BoxHelper(child, color)
        box.renderOrder = 1000
        box.material.depthTest = false
        box.material.transparent = true
        this.selectionBoxes.push(box)
        group.add(box)
      }
    })

    if (!hasSelection) return

    this.selectionGroup = group
    this.scene.add(group)
  }

  setSelectedMaterialsByName(materialNames: string[]): void {
    this.clearSelection()
    if (!materialNames || materialNames.length === 0) return

    const color = this.getSelectionColor()
    const group = new Group()
    const lineMaterial = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    })
    this.selectionLineMaterial = lineMaterial

    let hasSelection = false

    this.scene.traverse((child) => {
      if (!(child instanceof Mesh) || !child.visible) return

      let hasMat = false
      if (Array.isArray(child.material)) {
        if (child.material.some((m) => materialNames.some(k => m.name.toLowerCase().includes(k.toLowerCase())))) hasMat = true
      } else if (child.material && materialNames.some(k => child.material.name.toLowerCase().includes(k.toLowerCase()))) {
        hasMat = true
      }

      if (hasMat) {
        hasSelection = true
        const edgesGeometry = new EdgesGeometry(child.geometry, 25)
        this.selectionEdgeGeometries.push(edgesGeometry)
        const outline = new LineSegments(edgesGeometry, lineMaterial)
        outline.matrixAutoUpdate = false
        outline.matrix.copy(child.matrixWorld)
        outline.renderOrder = 999
        group.add(outline)

        const box = new BoxHelper(child, color)
        box.renderOrder = 1000
        box.material.depthTest = false
        box.material.transparent = true
        this.selectionBoxes.push(box)
        group.add(box)
      }
    })

    if (!hasSelection) return

    this.selectionGroup = group
    this.scene.add(group)
  }

  clearSelection(): void {
    if (this.selectionGroup) {
      this.scene.remove(this.selectionGroup)
      this.selectionGroup.clear()
      this.selectionGroup = null
    }
    this.selectionEdgeGeometries.forEach((geometry) => geometry.dispose())
    this.selectionEdgeGeometries = []
    this.selectionBoxes.forEach((box) => {
      box.geometry.dispose()
      box.material.dispose()
    })
    this.selectionBoxes = []
    this.selectionLineMaterial?.dispose()
    this.selectionLineMaterial = null
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.theme = theme
    const bg = theme === 'dark' ? '#0d0d14' : '#c5cad8'
    this.scene.background = new Color(bg)
    this.renderer.setClearColor(new Color(bg))

    this.updateSelectionColor()
  }

  private getSelectionColor(): number {
    return this.theme === 'light' ? 0xd97706 : 0xffd166
  }

  private updateSelectionColor(): void {
    const color = this.getSelectionColor()
    this.selectionLineMaterial?.color.set(color)
    this.selectionBoxes.forEach((box) => box.material.color.set(color))
  }

  setEnvironmentMode(mode: EnvMode): void {
    if (this.currentEnv === mode) return
    this.currentEnv = mode

    // Dọn dẹp bầu trời cũ nếu có
    const oldSky = this.scene.getObjectByName('ProceduralSky')
    if (oldSky) {
      this.scene.remove(oldSky)
      ;(oldSky as Mesh).geometry.dispose()
      ;((oldSky as Mesh).material as Material).dispose()
    }

    const pmremGenerator = new PMREMGenerator(this.renderer)
    pmremGenerator.compileEquirectangularShader()

    if (mode === 'room') {
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture
      this.scene.background = null
      if (this.keyLight) this.keyLight.intensity = 1.0
    } else if (mode === 'neutral') {
      this.scene.environment = null
      this.scene.background = new Color('#aaaaaa')
      if (this.keyLight) this.keyLight.intensity = 0.5
    } else if (mode === 'sunset' || mode === 'city') {
      // Load HDRI for realistic reflections
      const url = mode === 'city'
        ? './city.hdr' // Hình Thành Phố Buổi Sáng (Polyhaven Urban Alley)
        : 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/equirectangular/venice_sunset_1k.hdr'
      
      new RGBELoader().load(url, (texture) => {
        if (this.currentEnv === mode) {
          const envMap = pmremGenerator.fromEquirectangular(texture).texture
          this.scene.environment = envMap
          this.scene.background = null // Giữ nền trong suốt, chỉ lấy ánh sáng phản chiếu
        }
        texture.dispose()
        pmremGenerator.dispose()
      })
      if (this.keyLight) {
        this.keyLight.intensity = 1.5 // Ánh sáng rực rỡ hơn
        this.keyLight.color.setHex(0xffffff)
      }
    }
  }

  setBackgroundImage(url: string): void {
    new TextureLoader().load(url, (texture) => {
      this.scene.background = texture
      this.currentEnv = 'custom'
    })
  }

}

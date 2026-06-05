import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  GridHelper,
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
  type Object3D,
} from 'three'

export class SceneManager {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  private animationId: number | null = null
  private grid: GridHelper
  private selectionGroup: Group | null = null
  private selectionLineMaterial: LineBasicMaterial | null = null
  private selectionEdgeGeometries: EdgesGeometry[] = []
  private selectionBoxes: BoxHelper[] = []
  private raycaster = new Raycaster()
  private pointer = new Vector2()
  private theme: 'dark' | 'light' = 'dark'
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
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(new Color('#0d0d14'))
    this.renderer.toneMapping = 2 // ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    // Scene
    this.scene = new Scene()
    this.scene.background = new Color('#0d0d14')

    // Camera
    this.camera = new PerspectiveCamera(50, 1, 0.01, 1000)
    this.camera.position.set(3, 2, 5)

    // Lighting — 3-point setup
    const ambient = new AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const keyLight = new DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(5, 8, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    this.scene.add(keyLight)

    const fillLight = new DirectionalLight(0x8888ff, 0.4)
    fillLight.position.set(-5, 2, -3)
    this.scene.add(fillLight)

    const rimLight = new DirectionalLight(0xffffff, 0.3)
    rimLight.position.set(0, -5, -5)
    this.scene.add(rimLight)

    // Grid (dark mode default)
    this.grid = this.createGrid('dark')
    this.scene.add(this.grid)
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

  setGridVisible(visible: boolean): void {
    this.grid.visible = visible
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

  private createGrid(theme: 'dark' | 'light'): GridHelper {
    // dark: deep indigo lines on dark bg
    // light: medium slate lines on light gray bg — visible but not jarring
    const [center, lines] =
      theme === 'dark'
        ? [0x444466, 0x222233]
        : [0x7a80a0, 0xadb3c8]
    const grid = new GridHelper(20, 40, center, lines)
    grid.position.y = 0
    return grid
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.theme = theme
    const bg = theme === 'dark' ? '#0d0d14' : '#c5cad8'
    this.scene.background = new Color(bg)
    this.renderer.setClearColor(new Color(bg))

    // Recreate grid with correct colors for this theme
    const wasVisible = this.grid.visible
    this.scene.remove(this.grid)
    this.grid.geometry.dispose()
    this.grid = this.createGrid(theme)
    this.grid.visible = wasVisible
    this.scene.add(this.grid)

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
}

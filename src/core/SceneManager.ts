import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  Color,
  PCFSoftShadowMap,
} from 'three'

export class SceneManager {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  private animationId: number | null = null
  private grid: GridHelper
  private resizeObserver: ResizeObserver | null = null

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

    // Grid
    this.grid = new GridHelper(20, 40, 0x444466, 0x222233)
    this.grid.position.y = 0
    this.scene.add(this.grid)
  }

  mount(container: HTMLElement): void {
    const canvas = this.renderer.domElement
    container.appendChild(canvas)
    this.updateSize(container)

    this.resizeObserver = new ResizeObserver(() => {
      this.updateSize(container)
    })
    this.resizeObserver.observe(container)
  }

  unmount(): void {
    this.stopLoop()
    this.resizeObserver?.disconnect()
    this.renderer.domElement.remove()
    this.renderer.dispose()
  }

  private updateSize(container: HTMLElement): void {
    const w = container.clientWidth
    const h = container.clientHeight
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
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
}

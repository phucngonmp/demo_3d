import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {
  Box3,
  DoubleSide,
  Material,
  Vector3,
  MeshStandardMaterial,
  Mesh,
  type Object3D,
} from 'three'
import type { LoadResult, ModelInfo } from './types'

// CLASS MODEL LOADER: Ông "Thợ Khuân Vác" chuyên trách việc đọc file 3D.
export class ModelLoader {
  private loader: GLTFLoader

  constructor() {
    // Khởi tạo máy đọc file .glb
    this.loader = new GLTFLoader()

    // Có nhiều file 3D bị nén siêu nhỏ bằng thuật toán DRACO của Google.
    // Nếu không có DRACOLoader, máy sẽ không thể đọc được các file nén này.
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/' // Tải thư viện giải nén từ Google
    )
    this.loader.setDRACOLoader(dracoLoader)
  }

  // 1. TẢI MÔ HÌNH TỪ Ổ CỨNG (Sếp kéo thả file vào web)
  loadFromFile(file: File): Promise<LoadResult> {
    return new Promise((resolve, reject) => {
      // Biến file ổ cứng thành 1 đường dẫn URL ảo trong RAM trình duyệt
      const url = URL.createObjectURL(file)

      this.loader.load(
        url,
        (gltf) => {
          // Xóa URL ảo đi cho đỡ tốn RAM
          URL.revokeObjectURL(url)
          
          const object = gltf.scene // Đây chính là "Căn Nhà 3D"
          
          // Chạy một đống thuật toán để chống lỗi "Z-Fighting" (Nhấp nháy mặt phẳng)
          this.prepareForStableRendering(object)
          
          // Đếm số lượng tam giác, đếm số đỉnh để hiển thị cho sếp biết nhà nặng hay nhẹ
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

  // 2. TẢI MÔ HÌNH TỪ INTERNET (Bằng Link)
  loadFromUrl(url: string, fileName: string): Promise<LoadResult> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const object = gltf.scene
          this.prepareForStableRendering(object)
          const info = this.collectInfo(fileName, object)
          resolve({ object, info })
        },
        undefined,
        (error) => {
          reject(error)
        }
      )
    })
  }

  // ====================================================================
  // PHẦN DƯỚI ĐÂY LÀ "MA THUẬT" CHỐNG LỖI NHẤP NHÁY (Z-FIGHTING)
  // Trong 3D, nếu 2 mặt phẳng nằm trùng khít lên nhau (Ví dụ: tờ giấy dán chặt lên mặt bàn)
  // Máy tính sẽ không biết vẽ tờ giấy trước hay vẽ mặt bàn trước, dẫn đến hiện tượng
  // nhấp nháy đen trắng rất đau mắt. Hàm này xử lý triệt để việc đó.
  // ====================================================================
  private prepareForStableRendering(object: Object3D): void {
    // Cập nhật tọa độ thực tế của căn nhà
    object.updateWorldMatrix(true, true)
    const meshes: Mesh[] = []

    // Lặn lội vào từng ngóc ngách của căn nhà để gom tất cả các mặt lưới (Mesh) lại
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return
      meshes.push(child)

      // Cài đặt một vài thông số vật liệu đặc thù để fix lỗi mặt trong/mặt ngoài
      this.getMaterials(child).forEach((mat) => {
        mat.depthTest = true
        if (!mat.transparent) mat.depthWrite = true
        if (mat.transparent && mat.side === DoubleSide) {
          mat.forceSinglePass = true
        }
      })
    })

    // Nhóm các lưới có "Cùng Tọa Độ Không Gian" lại với nhau (Đó chính là những thằng đang bị chồng lấn)
    const byBounds = new Map<string, Mesh[]>()
    meshes.forEach((mesh) => {
      const key = this.getRoundedBoundsKey(mesh)
      const group = byBounds.get(key)
      if (group) group.push(mesh)
      else byBounds.set(key, [mesh])
    })

    // Bắt đầu sắp xếp lại thứ tự ưu tiên của những thằng bị chồng lấn
    byBounds.forEach((group) => {
      if (group.length < 2) return // Đứng 1 mình thì không ai tranh giành, bỏ qua.

      // Nếu có 2 thằng trùng nhau, ưu tiên thằng có từ khóa quan trọng (ví dụ chữ: "Color", "Map") nổi lên trên
      const sorted = [...group].sort(
        (a, b) => this.getSurfacePriority(a) - this.getSurfacePriority(b)
      )

      sorted.forEach((mesh, index) => {
        mesh.renderOrder = index // Thằng nào priority cao thì vẽ sau (vẽ sau = đè lên trên)
        const offset = sorted.length - 1 - index
        
        // polygonOffset là một lệnh ép Card Đồ Họa lùi thằng ở dưới ra xa một tí cỡ 0.0001mm để không bị nháy.
        this.cloneMaterials(mesh).forEach((mat) => {
          mat.polygonOffset = true
          mat.polygonOffsetFactor = offset
          mat.polygonOffsetUnits = offset
          mat.needsUpdate = true
        })
      })
    })
  }

  // Hàm lấy mảng Vật liệu của một Lưới
  private getMaterials(mesh: Mesh): Material[] {
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  }

  // Hàm "nhân bản" vật liệu. Khi dùng chung 1 vật liệu mà ta đổi màu 1 thằng, thằng kia sẽ bị đổi theo.
  // Nên ta phải nhân bản nó ra làm 2 bản riêng biệt.
  private cloneMaterials(mesh: Mesh): Material[] {
    const next = this.getMaterials(mesh).map((mat) => mat.clone())
    mesh.material = Array.isArray(mesh.material) ? next : next[0]
    return next
  }

  // Hàm tính "Hộp ranh giới" (Bounding Box). Cứ hiểu là cái Thùng Carton bọc lấy cái ghế.
  // Nếu 2 cái ghế có tọa độ thùng carton y hệt nhau, nghĩa là nó đang bị chồng lấn.
  private getRoundedBoundsKey(mesh: Mesh): string {
    const box = new Box3().setFromObject(mesh)
    return [
      box.min.x, box.min.y, box.min.z,
      box.max.x, box.max.y, box.max.z,
    ]
      .map((value) => Math.round(value * 100) / 100)
      .join('|')
  }

  // Hàm chấm điểm xem nên ưu tiên cho mặt phẳng nào nổi lên trên.
  // Mặt có màu Đen/Mặt sau (Black/Backing) thường bị trừ điểm -> bị đè xuống dưới.
  private getSurfacePriority(mesh: Mesh): number {
    const text = [
      mesh.name,
      ...this.getMaterials(mesh).map((mat) => mat.name),
    ].join(' ').toLowerCase()

    let priority = 1
    if (/\b(black|backing|back|nero|noir)\b|黒/.test(text)) priority -= 2
    if (this.getMaterials(mesh).some((mat) => mat instanceof MeshStandardMaterial && mat.map)) {
      priority += 1
    }
    if (this.getMaterials(mesh).some((mat) => mat.transparent)) priority -= 1
    return priority
  }

  // ====================================================================
  // PHẦN LẤY THÔNG TIN THỐNG KÊ MÔ HÌNH (ĐỂ HIỂN THỊ DƯỚI GÓC MÀN HÌNH)
  // ====================================================================
  private collectInfo(fileName: string, object: Object3D): ModelInfo {
    let triangleCount = 0 // Đếm số hình tam giác
    let vertexCount = 0   // Đếm số đỉnh tọa độ
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
    box.getSize(size) // Đo kích thước chiều dài x rộng x cao của ngôi nhà

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

  // Hàm chuyển đổi bật/tắt chế độ nhìn xuyên thấu Khung Dây (Wireframe)
  setWireframe(object: Object3D, enabled: boolean): void {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material]
        mats.forEach((mat) => {
          if (mat instanceof MeshStandardMaterial) {
            mat.wireframe = enabled // Biến một mặt phẳng kín thành dạng khung lưới kẽm.
          }
        })
      }
    })
  }
}

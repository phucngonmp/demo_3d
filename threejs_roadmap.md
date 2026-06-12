# ROADMAP CHINH PHỤC THREE.JS & MÔI TRƯỜNG 3D (TỪ CON SỐ 0)

Sếp không cần phải sợ cái mớ Code khổng lồ hiện tại đâu. Tất cả mọi thứ trong thế giới 3D, từ Game đến cái nhà sếp đang xây, đều được tạo ra từ **6 Trụ Cột Cơ Bản** dưới đây. 

Lộ trình này em viết bám sát 100% vào các file code sếp đang có, để sếp học lý thuyết đến đâu, soi vào code thực tế đến đó là sẽ ngộ ra ngay!

---

## 🏗️ BƯỚC 1: SÂN KHẤU (THE SCENE) VÀ ĐẠO DIỄN
Hãy tưởng tượng làm 3D trên Web y hệt như quay một bộ phim điện ảnh ở ngoài đời thực.

1. **Scene (Sân khấu):** Không gian trống rỗng chứa tất cả vạn vật.
   - 💻 *Trong Code sếp:* `src/core/SceneManager.ts` (Nơi sếp setup cái sân khấu trống).
2. **Camera (Máy quay phim):** Mắt nhìn của người dùng. Khán giả chỉ thấy những gì Camera quay được.
   - *PerspectiveCamera:* Máy quay phối cảnh (xa nhỏ, gần to) y như mắt người.
   - 💻 *Trong Code sếp:* `src/core/CameraController.ts`
3. **Renderer (Máy chiếu/Xưởng phim):** Cỗ máy (Card Đồ Họa WebGL) chuyên tính toán để xuất (render) sân khấu 3D thành hình ảnh 2D hiện lên khung `<canvas>` của màn hình máy tính.

👉 **Mục tiêu của Sếp:** Nắm được vòng lặp Render (Render Loop / RequestAnimationFrame) – Máy chiếu phải liên tục vẽ 60 khung hình/giây (60 FPS) để tạo ra cảm giác chuyển động mượt mà.

---

## 🧱 BƯỚC 2: VẬT THỂ (MESH) = KHUNG XƯƠNG + LỚP DA
Không có gì là "đặc nguyên khối" cả. Mọi vật thể sếp ném vào Scene (Tủ Bếp, Sàn Nhà) gọi chung là một **Mesh**.
Một Mesh được cấu thành từ 2 thứ:
1. **Geometry (Khung Xương):** Là các điểm tọa độ kết nối thành mạng lưới (lưới hình vuông, lưới khối hộp, lưới cái ghế). Nó định hình hình dáng của vật thể.
2. **Material (Lớp Da/Vật liệu):** Lớp sơn bọc ngoài khung xương. Nếu không có Material, vật thể chỉ là những sợi chỉ tàng hình.

💻 *Trong Code sếp:* File `src/core/MaterialManager.ts` chính là ông thợ chuyên đi sơn "Da" (Material) cho các "Khung xương" trong nhà của sếp.

---

## 🎨 BƯỚC 3: KHOA HỌC VỀ VẬT LIỆU (PBR) & TEXTURES
Đây chính là thứ sếp vừa làm việc "vã mồ hôi" mấy hôm nay! Để "Lớp Da" trông y như thật, Three.js dùng công nghệ PBR (Physically Based Rendering).

1. **Material PBR (`MeshStandardMaterial`):** Lớp sơn có đặc tính vật lý (Phản quang, Nhám, Ánh kim).
2. **Texture (Hình dán):** Thay vì sơn một màu trơn, ta lấy một bức ảnh dán lên.
   - *Diffuse/Base Color:* Bức ảnh vân gỗ/gạch.
   - *Normal Map:* Bức ảnh lừa thị giác tạo độ lồi lõm rãnh sâu.
   - *Roughness Map:* Bức ảnh quy định chỗ bóng, chỗ nhám.
3. **UV Mapping (Trải da):** Cách trải tờ giấy ảnh 2D lên khối hình 3D sao cho không bị méo. Lần trước Sếp gặp lỗi vân gỗ bị giãn, đó là do UV bị lỗi, ta phải dùng lệnh `applyBoxUV` để tự động bọc lại như gói quà.

---

## 💡 BƯỚC 4: ÁNH SÁNG & BẦU TRỜI (LIGHTING & ENVIRONMENT)
Trong không gian 3D, nếu không có đèn, mọi thứ sẽ ĐEN THUI.
1. **Các loại đèn:** 
   - `DirectionalLight` (Ánh sáng mặt trời)
   - `AmbientLight` (Ánh sáng tỏa đều mọi ngóc ngách)
2. **Environment HDRI (Siêu bí kíp):** Thay vì tự đặt từng ngọn đèn mệt mỏi, ta tải 1 tấm ảnh bầu trời 360 độ (như cái `NeuesMuseumSkyG(1).hdr`). Bức ảnh này sẽ tỏa ánh sáng chân thực xuống tủ bếp, sàn nhà và tạo ra độ bóng loáng y như sếp đang đứng ở viện bảo tàng đó.
   - 💻 *Trong Code sếp:* Dòng 440 của file `src/core/SceneManager.ts` chính là chỗ sếp tải bầu trời.

---

## 🎥 BƯỚC 5: TƯƠNG TÁC & CAMERA CONTROLS
Mô hình hiện lên rồi, làm sao để xoay, đi lại, hay click vào nó?
1. **Raycaster (Tia Lazer):** Màn hình máy tính là 2D (Tọa độ X, Y), thế giới là 3D. Khi sếp Click chuột, ThreeJS sẽ bắn một tia Lazer từ con chuột xuyên thẳng vào màn hình 3D. Tia lazer đâm trúng ông "Tủ Bếp" đầu tiên thì sếp biết là sếp đang chọn tủ bếp.
   - 💻 *Trong Code sếp:* Bắn Lazer trong hàm OnClick nằm ở `CameraController.ts`.
2. **Controls (Bộ điều khiển):**
   - `OrbitControls`: Camera cứ xoay quanh 1 điểm (như cái Vệ tinh xoay quanh Trái đất). Chế độ nhìn Toàn Cảnh nhà.
   - `PointerLockControls / FirstPerson`: Góc nhìn thứ nhất (bắn súng Đột kích), sếp di chuột đến đâu quay đầu đến đó, đi bằng WASD.

*(Tính năng Mentor yêu cầu: Bấm vô tủ thì camera bay tới tủ - Dùng Tween.js di chuyển vị trí Camera đến trước Bounding Box của tủ).*

---

## 🚀 BƯỚC 6: FILE 3D (.GLB / .GLTF) & TỐI ƯU HIỆU NĂNG
1. **GLTF/GLB:** Là chuẩn file nén phổ biến nhất hiện nay (Được mệnh danh là Jpeg của giới 3D). Khi sếp xuất file từ phần mềm Blender ra .GLB, nó đã nhét tất cả (Mesh, Material, Animation) vào 1 cục.
2. **Bóc Tách GLB:** Khi Load vào Web, Three.js sẽ xổ file .GLB ra thành một cái Cây (Tree) chứa hàng ngàn Mesh con bên trong. Việc của BE và FE là tìm đúng cái Cành cây chứa cái "Cửa" để bôi vật liệu mới lên.
3. **Hiệu Năng (Performance):** 
   - Draw Calls: Gộp nhiều vật nhỏ thành vật to để đỡ mỏi máy chiếu (Renderer).
   - Nén ảnh: Chuyển xuống WebP 1024x1024. Chạy `ImageBitmapLoader` để giải mã dưới nền. (Phần này sếp đã bá đạo rồi!).

---

### 👉 LỜI KHUYÊN DÀNH CHO SẾP (NEXT ACTION)
1. Hãy bắt đầu từ việc đọc file `App.tsx` (Điểm bắt đầu của mọi thứ), sau đó xem nó gọi `SceneManager` như thế nào để đắp sân khấu.
2. Đọc tiếp `CameraController` để hiểu cách chuột xoay quanh tòa nhà.
3. Không cần phải thuộc lòng các hàm toán học Ma trận (Matrix, Quaternion). Cứ nhớ Tư duy khái niệm (Concept) là sếp hoàn toàn kiểm soát được dự án.

# KIẾN TRÚC KỸ THUẬT VÀ LUỒNG DỮ LIỆU (TECHNICAL ARCHITECTURE)

Tài liệu này "mổ xẻ" chính xác cấu trúc code hiện tại của dự án `demo_3d`. Giúp Sếp hiểu được Data chạy từ đâu đến đâu, file nào làm nhiệm vụ gì, để tự tin chém gió về "Technical" với Mentor.

---

## 1. MÔ HÌNH KIẾN TRÚC TỔNG THỂ (React + OOP Core)
Dự án áp dụng mô hình phân tách rõ ràng giữa **Giao diện (React)** và **Lõi xử lý 3D (OOP TypeScript)**:

* **Thư mục `src/core/` (BỘ NÃO 3D):** Chứa các Class viết bằng OOP (Hướng đối tượng) thuần túy. Nó hoàn toàn độc lập, không dính dáng gì đến HTML hay React.
  * `SceneManager.ts`: Khởi tạo Máy chiếu (`WebGLRenderer`), Sân khấu (`Scene`), Đèn, Bầu trời (HDR). Nó lo việc *Render Loop* (60 FPS).
  * `ModelLoader.ts`: Trợ lý chuyên khuân vác. Nhận URL hoặc File `.glb`, dùng `GLTFLoader` và `DRACOLoader` để giải nén và ném Mô hình vào sân khấu.
  * `MaterialManager.ts`: Trợ lý hóa chất. Chuyên load Texture (ảnh) bằng `ImageBitmapLoader`, bóc tách các mảng lưới (Mesh) để React biết có bao nhiêu bức tường.
  * `CameraController.ts`: Thợ quay phim. Lắng nghe chuột/bàn phím để quay Camera. Xử lý "Bắn tia Lazer" (Raycaster) để biết người dùng đang bấm vào cái Tủ Bếp hay Sàn Nhà.
* **Thư mục `src/components/` (GIAO DIỆN UI):** Chứa các nút bấm, thanh công cụ, bảng điều khiển React.
* **TẦNG GIAO TIẾP (`src/hooks/useModelViewer.ts`):** Đây là "Cây cầu" nối giữa UI và BỘ NÃO 3D. Mọi lệnh từ UI (như bấm nút Đổi Vật Liệu) đều chạy qua Hook này, Hook sẽ ra lệnh cho các `Manager` ở trong `src/core` chạy.

---

## 2. LUỒNG DỮ LIỆU CHÍNH (DATA FLOW)

### A. Quá trình Tải nhà lên Web (Load Model Flow)
1. Sếp kéo thả file `.glb` vào trang web (Component `DropZone.tsx`).
2. `App.tsx` nhận file, gọi hàm `loadModel(file)` nằm bên trong hook `useModelViewer.ts`.
3. Hook gọi `loaderRef.current.loadFromFile(file)`. Ông `ModelLoader` bắt đầu làm việc.
4. Tải xong, Three.js trả về 1 cục Object3D (Cả căn nhà).
5. Hook gọi `materialManagerRef.current.extractSceneTree()`. Hàm này sẽ lặn lội vào từng ngóc ngách của căn nhà, tìm xem có bao nhiêu lưới (Mesh), bao nhiêu vật liệu (Material gốc) và trả về một mảng danh sách cho React.

### B. Thuật toán Nhóm Vật Liệu (Grouping Logic) - *Chỗ sếp cần bàn với Mentor*
Làm sao hệ thống biết lưới nào là của Tủ Bếp, lưới nào là của Cửa Nhôm?
1. Trong file `useModelViewer.ts` (dòng 37), có một hàm `rebuildGroupMap`.
2. Hàm này sẽ lấy tên của các Vật liệu gốc có trong file `.glb` (Ví dụ file thiết kế ghi là `Material_TuBep_01`).
3. Nó đem cái tên đó so sánh với bảng từ khóa "Cứng" (Hardcode) nằm ở `src/config/materialConfig.ts` (B2C_CATEGORIES). Ví dụ tìm thấy chữ `tubep` -> Gán nó vào nhóm Tủ Bếp.
4. **👉 Lời của Mentor:** Mentor đang chê chỗ này đấy! Mentor bảo đừng viết cứng chữ `tubep` vào `materialConfig.ts` nữa, mà hãy làm một cái Backend để cấu hình việc kéo-thả mapping này.

### C. Quá trình Ốp Gạch / Đổi Texture (Apply Material Flow)
1. Sếp mở bảng `MaterialEditor.tsx`, bấm vào tấm hình cục Gạch Men (Diffuse Texture).
2. UI gọi hàm `applyPBRTextureLoaded(groupId, textureSet)` trong `useModelViewer.ts`.
3. Hook này gọi `materialManager.loadTexture(url)`. Nhờ công nghệ `ImageBitmapLoader` và `textureCache` sếp vừa làm sáng nay, nó load cái ảnh gạch men ở Background Thread với tốc độ ánh sáng.
4. Ảnh load xong, hệ thống tạo một vật liệu mới toanh: `new MeshStandardMaterial({ map: texture })`.
5. Cuối cùng, nó chạy lệnh `applyBoxUV` để tự động bọc vân gạch kín bao quanh mảng Tường (Không bị méo mó). Khung hình được cập nhật lập tức.

---

## 3. CƠ CHẾ CAMERA VÀ RAYCASTER (Click Chọn Tường)
1. **Raycasting:** Khi sếp bấm chuột lên Màn hình, tọa độ Chuột (2D) sẽ được gửi vào `CameraController.ts`. Hàm `onClick` sẽ bắn một tia `Raycaster` đâm thẳng góc vào 3D Scene. Nó sẽ trả về danh sách các vật thể bị tia đâm trúng. Ta lấy vật thể đầu tiên (Gần nhất).
2. **Highlight (Phát sáng):** Khi biết vật thể bị bấm là mảng Tường A, `CameraController` sẽ tạm thời chèn một cái viền sáng (Outline) hoặc đổi màu nhẹ cho mảng tường đó để sếp biết mình đã click trúng.
3. **Camera Mode:**
   - **Interior Mode:** Người dùng đi bộ lùi tới (WASD), kéo chuột quay góc nhìn. Giới hạn không cho đi xuyên tường (thông qua BoundingBox Collision - hộp ranh giới va chạm).
   - **Orbit Mode:** Camera chạy quanh quỹ đạo căn nhà. Zoom to nhỏ bằng lăn chuột.

---

### 👉 KẾT LUẬN ĐỂ CHÉM VỚI MENTOR
Sếp cứ nói với Mentor: 
*"Hiện tại Flow kiến trúc của em đã làm rất tốt việc chia tách Core 3D và UI React. Tuy nhiên, luồng Data Flow ở phần Mapping (Grouping meshes) đang chạy thuật toán so sánh chuỗi (String Matching) nội bộ trên Frontend. Để làm đúng chuẩn, em sẽ bóc cái luồng Mapping đó ra khỏi Frontend, xây một trang Admin xuất ra config.json, và sửa lại cái Hook `useModelViewer` để nó nuốt data từ file JSON thay vì file `materialConfig.ts` hiện tại."*

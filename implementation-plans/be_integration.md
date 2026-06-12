# KẾ HOẠCH TRIỂN KHAI GIAI ĐOẠN 2 (BE INTEGRATION & SMART CAMERA)

Dựa trên chỉ đạo của sếp, dự án sẽ được nâng cấp lên chuẩn Fullstack (Sử dụng **Supabase** làm Backend-as-a-Service) thay vì chỉ chạy Frontend tĩnh như trước.

## 🎯 Mục Tiêu (Objectives)
1. **Dựng Backend đơn giản bằng Supabase:** Quản lý User (Auth), File 3D (Storage), và Dữ liệu Cấu hình (Database).
2. **Routing:** Tách biệt 2 màn hình `localhost:5173/admin` và `localhost:5173/viewer`.
3. **Camera UX:** Nhấp vào vật thể ➡️ Camera bay tới. Có nút "Quay lại toàn cảnh".

---

## 🏗 Kế Hoạch Thực Thi (Proposed Changes)

### GIAI ĐOẠN 1: CÀI ĐẶT HẠ TẦNG CƠ BẢN
*Tạo khung sườn Backend và Router cho dự án.*

1. **Cài đặt thư viện:**
   - `npm install @supabase/supabase-js` (Kết nối Database, Auth, Storage).
   - `npm install react-router-dom` (Chia đường dẫn Web).
   - `npm install @tweenjs/tween.js` (Thư viện tạo hiệu ứng di chuyển mượt mà cho Camera).
2. **Cấu hình Supabase:**
   - Tạo Project trên Supabase.com.
   - Lấy URL và ANON_KEY lưu vào `.env`.
   - Tạo file `src/core/supabaseClient.ts` để khởi tạo kết nối.
3. **Setup React Router (`App.tsx`):**
   - Bọc toàn bộ App trong `<BrowserRouter>`.
   - Định nghĩa các Route:
     - `/` ➡️ Redirect sang `/viewer`.
     - `/viewer` ➡️ Trang Khách hàng.
     - `/admin` ➡️ Trang Quản trị (Có bọc lớp bảo vệ cần Đăng nhập).

### GIAI ĐOẠN 2: XÂY DỰNG TRANG ADMIN (`/admin`)
*Thay thế việc cấu hình JSON thủ công bằng thao tác trên Database.*

1. **Chức năng Authentication (Auth):**
   - Làm một màn hình Đăng nhập siêu đơn giản. Nếu chưa login thì không cho vào `/admin`.
2. **Chức năng Quản lý Mô hình (CMS):**
   - Bảng danh sách các Mô hình 3D đang có trong Database.
   - Nút "Tải mô hình mới": Cho phép Admin upload file `.glb` thẳng lên **Supabase Storage**.
3. **Giao diện Cấu hình (Configurator):**
   - Khi Admin bấm vào 1 mô hình, code sẽ tải file `.glb` đó từ Storage về, bóc tách ra danh sách các Material (Vật liệu gốc).
   - Cung cấp giao diện cho phép Admin tạo các Group (VD: Sàn Nhà, Tủ Bếp).
   - Admin kéo thả/gắn các Material gốc vào các Group vừa tạo.
   - Bấm nút **"Lưu Cấu Hình"** ➡️ Toàn bộ cục Data này sẽ được nén thành dạng `jsonb` và lưu thẳng vào Bảng `models` trên Database Supabase.

### GIAI ĐOẠN 3: NÂNG CẤP TRANG VIEWER (`/viewer`)
*Thay đổi luồng truyền Dữ liệu: Không đọc từ ổ cứng cứng, đọc từ Internet.*

1. **Lấy dữ liệu từ Database:**
   - Mở link `/viewer`, hệ thống tự động `fetch` danh sách Mô hình từ Supabase.
   - Nhấn "Xem", nó sẽ tải file `.glb` từ Supabase Storage + tải file `Config JSON` từ Database.
2. **Đập bỏ Hardcode:**
   - Xóa bỏ file `src/config/materialConfig.ts` chứa danh sách nhóm `B2C_CATEGORIES`.
   - Viết lại hàm `rebuildGroupMap` trong `useModelViewer.ts` để nó tuân lệnh 100% theo file Config lấy từ Backend về.

### GIAI ĐOẠN 4: TÍNH NĂNG TỰ ĐỘNG LIA CAMERA (SMART FOCUS)
*Làm thỏa mãn yêu cầu UX từ Mentor.*

1. **Hiệu ứng bay (Tweening):**
   - Tích hợp vòng lặp cập nhật `TWEEN.update()` vào vòng lặp Render của `SceneManager.ts`.
   - Trong `CameraController.ts`, viết hàm `focusOnBoundingBox(box)`. Khi gọi hàm này, Camera sẽ mượt mà trượt (Lerp) tọa độ `.position` và `.target` đến trước mặt cái Tủ Bếp.
2. **Nút "Quay Lại Toàn Cảnh" (Reset View):**
   - Khi Sếp nhấp chọn 1 Group Vật Liệu ở menu phải, giao diện sẽ hiện thêm một nút nhỏ `[🔙 Thu Phóng Toàn Cảnh]` ở ngay phía trên Material Editor.
   - Khi bấm vào nút này, Camera sẽ gọi hàm `resetToObject` để lùi xa ra, lấy khung hình bao quát toàn bộ ngôi nhà như lúc mới Load file xong.

---

## 🚀 Các Bước Chuẩn Bị (Pre-requisites)
> [!IMPORTANT]
> **Yêu cầu Sếp hỗ trợ:** Để làm Backend bằng Supabase, sếp cần đăng nhập vào [Supabase.com](https://supabase.com), tạo một Project miễn phí. Sau đó lấy cho em 2 thông số:
> 1. `Project URL`
> 2. `Project API Key (anon/public)`
> 
> Sếp ném 2 thông số đó qua đây, em sẽ tự động tạo cấu trúc Bảng (Tables) và cài đặt kết nối cho dự án!

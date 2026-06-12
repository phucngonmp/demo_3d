# Kế Hoạch Chuyển Đổi: Decouple Model & Config (Dùng Hash File)

Sếp có ý tưởng rất hay! Bằng cách trích xuất 1 mã **Unique** (Mã băm - Hash) từ cấu trúc của file 3D, chúng ta có thể tách biệt hoàn toàn việc "Lưu Trữ File 3D" và "Lưu Trữ Cấu Hình (Config)". 

## Cơ Chế Hoạt Động Mới (File Hash SHA-256)
Mỗi file `.glb`, khi được đọc vào trình duyệt, hệ thống sẽ chạy qua thuật toán mã hóa SHA-256 (Mất khoảng 50 mili-giây) để sinh ra một chuỗi chữ số duy nhất đại diện cho file đó (Ví dụ: `e3b0c44298fc1c14...`). 
- Dù đổi tên file, đoạn Hash này vẫn **không đổi**.
- Chỉ khi nào sếp thay đổi dù chỉ 1 vertex hay 1 pixel trong file 3D, Hash sẽ thay đổi (Trở thành 1 file hoàn toàn mới).

Dựa vào mã Hash này làm "Căn cước công dân" của Model, chúng ta sẽ lưu Config lên Server.

---

> [!IMPORTANT]
> ## Câu Hỏi Chờ Sếp Chốt (Open Questions)
> Nếu chúng ta áp dụng mô hình này và KHÔNG lưu file `.glb` lên Server (Supabase Storage) nữa, thì ở **Trang Khách (Viewer)**, giao diện sẽ hoạt động thế nào?
> 
> **Lựa chọn 1:** Màn hình Viewer chỉ hiện 1 chỗ "Kéo Thả File Vào Đây". Khách truy cập web bắt buộc phải có sẵn file `.glb` trong máy tính, họ kéo vào, và web tự động lấy Hash để móc Config trên Server về áp dụng. (Không lưu file trên mạng, cực kỳ an toàn, nhẹ tiền Server).
> 
> **Lựa chọn 2:** Sếp VẪN MUỐN trang Viewer có "Danh sách các nhà" để Khách bấm vào xem thẳng luôn (Khách không cần có file trong máy). Nhưng Config thì lưu riêng biệt. -> Với cách này, ta **vẫn phải Upload file `.glb` lên Storage** ở mục Admin để lấy Link URL public cho Khách xem (Chỉ là Config sẽ lưu độc lập dựa theo Hash).
> 
> *Sếp nghiêng về Lựa chọn 1 hay Lựa chọn 2 ạ?*

---

## Proposed Changes (Các Thay Đổi Kỹ Thuật)

### 1. Database Schema (Supabase)
Tạo bảng mới `model_configs` và lấy `file_hash` làm Khóa chính (Primary Key).

#### [MODIFY] [schema.sql](file:///d:/Intern%20CodLuck/company-projects/aViet/demo/src/supabase/schema.sql)
- Xóa code bảng `models` cũ, tạo script SQL cho `model_configs`.
- Cấu trúc: `file_hash` (PK, text), `name` (text), `config_data` (jsonb).

### 2. File Hashing Utility
Tạo một thư viện mã hóa nội bộ ở Frontend để lấy ra chữ ký số của mọi file tải lên.

#### [NEW] [hash.ts](file:///d:/Intern%20CodLuck/company-projects/aViet/demo/src/utils/hash.ts)
- Hàm `calculateFileHash(file: File): Promise<string>` sử dụng `crypto.subtle.digest('SHA-256')`.

### 3. Component Admin
Admin sẽ đọc Hash thay vì upload toàn bộ file.

#### [MODIFY] [Admin.tsx](file:///d:/Intern%20CodLuck/company-projects/aViet/demo/src/components/Admin/Admin.tsx)
- Gỡ bỏ logic `supabase.storage.upload`.
- Khi sếp Kéo thả file 3D, hệ thống sẽ chạy hàm lấy Hash, rồi query DB `model_configs`. Chuyển sếp qua màn hình Configurator với cái mã Hash này.

#### [MODIFY] [AdminConfigurator.tsx](file:///d:/Intern%20CodLuck/company-projects/aViet/demo/src/components/Admin/AdminConfigurator.tsx)
- Nhận biến `fileHash` (thay vì `modelId`).
- Lưu/Cập nhật JSON của `config_data` xuống bản ghi có ID là Hash đó.

### 4. Component Viewer & Hook
Tích hợp Logic tìm kiếm Config tự động.

#### [MODIFY] [useModelViewer.ts](file:///d:/Intern%20CodLuck/company-projects/aViet/demo/src/hooks/useModelViewer.ts)
- Sửa hàm `loadModel` để nó tính toán Hash của file truyền vào (nếu là File local).
- Dùng mã Hash đó để Request lên Database: `select config_data where file_hash = hash`.
- Nếu tìm thấy, lấy `config_data` để Rebuild GroupMap.

#### [MODIFY] [Viewer.tsx](file:///d:/Intern%20CodLuck/company-projects/aViet/demo/src/components/Viewer/Viewer.tsx)
- Đợi Sếp chốt (Lựa chọn 1 hay Lựa chọn 2) để thiết kế lại UI hiển thị.

## Verification Plan
1. **Kiểm tra Mã Hóa:** Drop file "A", log ra Hash 1. Đổi tên file thành "B", drop lại, vẫn ra Hash 1. 
2. **Kiểm tra Config Nhóm:** Ở màn Admin, làm Config cho Hash 1. Ra màn Viewer, drop Hash 1 vào, hệ thống tự load Config Tủ Bếp, Sàn Gỗ chính xác.
3. **Sửa đổi file 3D:** Nếu dùng Blender đổi chất liệu rồi xuất `.glb` mới, Hash 2 sẽ xuất hiện và Viewer sẽ báo "Chưa có cấu hình".

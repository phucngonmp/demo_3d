# Phase 6 — Tăng sáng & Chế độ xem Nội thất (Interior Camera Mode)

Mục tiêu: Đáp ứng yêu cầu của mentor về việc điều chỉnh ánh sáng và thay đổi góc nhìn từ "xoay quanh vật thể ngoài không gian" sang "người đứng trong nhà nhìn xung quanh".

## Ý kiến cần xác nhận (User Review Required)

> [!IMPORTANT]
> **Về chức năng Camera "Người đứng xem":**
> Theo gợi ý của mentor (tạm thời fix camera ở 1 chỗ), tôi đề xuất giải pháp như sau:
> 1. Khi load file GLB, thay vì tự động zoom ra ngoài để bao quát toàn bộ ngôi nhà (kiểu nhìn vệ tinh), hệ thống sẽ tính toán **đặt camera ngay giữa trung tâm căn nhà**, ở độ cao khoảng `1.6m` (ngang tầm mắt người thật).
> 2. **Khóa chức năng Zoom (lăn chuột) và Pan (chuột phải)**: Bạn không thể bay ra ngoài hay kéo lê camera đi chỗ khác.
> 3. **Chỉ cho phép xoay (chuột trái)**: Bạn kéo chuột để quay đầu nhìn 360 độ quanh căn phòng (giống tính năng xem ảnh Panorama 360).
> 
> Giải pháp này giải quyết được ngay bài toán "không cho đi ra ngoài" cực kỳ nhanh, mượt và rất hợp lý cho ứng dụng Web xem nội thất. *(Làm tính năng đi lại WASD thì sau này nếu thực sự cần thiết ta nâng cấp sau vì nó khá nặng máy và tốn thời gian).*
> 
> *Bạn đồng ý với hướng giải quyết này chứ?*

## Proposed Changes

### 1. Tăng độ sáng mặc định
#### [MODIFY] `src/hooks/useModelViewer.ts`
- Sửa giá trị `exposure` mặc định từ `1.2` lên `1.8` hoặc `2.0` để khi tải trang mọi thứ tự động sáng bừng lên.

### 2. Sửa cơ chế Camera
#### [MODIFY] `src/core/CameraController.ts`
- Cập nhật hàm `fitToObject`: Tính toán tâm của mô hình (center của BoundingBox), sau đó đặt `camera.position` tại đúng tâm đó nhưng `y = 1.6` (chiều cao mắt người). Đặt `target` của OrbitControls lệch lên phía trước 1 xíu để làm điểm nhìn.
- Cấu hình `controls`: Tắt tính năng Zoom (`enableZoom = false`) và tắt tính năng Pan (`enablePan = false`) để nhốt camera vào một chỗ cố định.
- Cho phép xoay 360 độ tự do.

## Verification Plan
1. Tải ứng dụng lên, ánh sáng không gian sẽ sáng rực hơn hẳn lúc trước.
2. Load một căn nhà mẫu, camera sẽ tự chui vào giữa nhà ở tầm nhìn người đứng. Lăn chuột không bị văng ra ngoài, kéo chuột chỉ để "quay đầu" ngó nghiêng.

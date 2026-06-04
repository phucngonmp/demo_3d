# Phase 3 — Direct Viewport Selection + Scoped Material Editing

Hoàn thiện trải nghiệm chọn object và chỉnh material trong **GLB Viewer Editor**.

Phase này tập trung vào 3 vấn đề chính phát sinh khi dùng model GLB thực tế:
1. Chọn object trực tiếp trong viewport thay vì chỉ chọn trong Scene Panel
2. Selection highlight phải rõ ràng nhưng không làm đổi màu bề mặt model
3. Chỉnh material chỉ ảnh hưởng vùng/object đang chọn, không lan sang vùng khác dùng chung material

> Phase 2 plan: `phase2-theme-scene-material.md`

---

## Những gì đã có trong dự án

### Selection / Viewport
- Click trực tiếp lên viewport để chọn mesh dưới con trỏ bằng raycast.
- Click-drag để orbit camera không bị hiểu nhầm là chọn object.
- Click vùng trống trong viewport để clear selection.
- Object đang chọn hiển thị bằng viền vàng và bounding box vàng.
- Selection không dùng emissive flash và không phủ màu lên bề mặt model.
- Scene Panel vẫn hỗ trợ chọn object bằng cây hierarchy như Phase 2.

### Material Editing
- Material Editor có sẵn các control:
  - Base Color
  - Roughness
  - Metalness
  - Emissive
  - Opacity
  - Texture Swap
- Có button `Swap` để chọn ảnh texture từ máy.
- Khi có selected object, việc đổi màu/texture sẽ ưu tiên object đang chọn.
- Nếu material đang được nhiều mesh dùng chung, app clone material cho các mesh không được chọn để tránh đổi màu lan.
- Nếu không có selected object, Material Editor vẫn hoạt động theo kiểu chỉnh material toàn cục.

### Mesh Inventory / Classification
- Sau khi load model, app in danh sách mesh ra DevTools Console bằng `console.table`.
- Bảng console gồm:
  - category
  - name
  - uuid
  - materials
  - triangles
  - sizeX / sizeY / sizeZ
- App tự nhận diện mesh theo nhóm:
  - `floor`
  - `wall`
  - `tile`
  - `brick`
  - `other`
- Scene Panel hiển thị badge tiếng Việt cho các nhóm nhận diện được:
  - `sàn`
  - `tường`
  - `gạch`
  - `brick`
- Nhóm `other` không hiển thị badge để tránh làm panel quá rối, nhưng vẫn có trong console.

### Layout / Resize
- Scene Panel bên trái có thể kéo rộng/thu hẹp.
- Properties/Materials sidebar bên phải có thể kéo rộng/thu hẹp.
- Resize có min/max width để viewport không bị vỡ layout.
- Trong lúc kéo sidebar, app throttle React state update bằng `requestAnimationFrame`.
- Canvas Three.js không resize drawing buffer liên tục khi đang kéo, tránh nhấp nháy khung hình.
- Khi thả chuột, app commit resize canvas đúng một lần bằng event `glb-viewer:commit-resize`.

### Light Mode / Shell UI
- Light Mode đã áp dụng cho toolbar, sidebars, status bar và overlay.
- Theme được sync lên `<html>` qua `data-theme` và `color-scheme`.
- Theme context đã tách provider/hook/type để pass Fast Refresh rule.

---

## Tính năng chi tiết

### 1. Hoàn thiện Light Mode UI
- Bổ sung token riêng cho toolbar, sidebar, status bar và overlay:
  - `--bg-toolbar`
  - `--bg-sidebar`
  - `--bg-status`
  - `--overlay-scrim`
- `ThemeProvider` cập nhật `data-theme` và `color-scheme` trên `<html>` bằng `useLayoutEffect`.
- Toàn bộ shell UI dùng CSS variables thay vì giữ màu hard-code theo dark mode.

### 2. Persistent Selection Outline
- Bỏ cơ chế emissive flash cũ vì nó sửa material gốc và dễ làm object khác bị đổi màu nếu dùng chung material.
- Selection trong viewport chỉ hiển thị bằng viền vàng:
  - `EdgesGeometry` cho cạnh mesh
  - `BoxHelper` cho bounding box của object/group được chọn
- Không dùng overlay fill bán trong suốt, để bề mặt model không bị ám màu.
- Khi đổi theme, màu outline được cập nhật theo theme hiện tại.

### 3. Direct Viewport Picking
- Thêm raycast picking trong `SceneManager`:
  - Chuyển tọa độ pointer từ viewport sang normalized device coordinates
  - Raycast từ camera vào danh sách mesh trong model hiện tại
  - Trả về mesh đầu tiên dưới con trỏ
- `useModelViewer` gắn listener `pointerdown` / `pointerup` trực tiếp vào canvas.
- Chỉ chọn object nếu pointer di chuyển dưới ngưỡng nhỏ, tránh chọn nhầm khi người dùng kéo orbit camera.
- Click vào vùng trống sẽ clear selection.

### 4. Scoped Material Editing
- GLB thường reuse một material cho nhiều mesh. Nếu sửa material gốc trực tiếp, các vùng không chọn cũng đổi màu.
- Khi đang có selected object:
  - Material Editor tách material dùng chung trước khi apply patch
  - Object đang chọn giữ material được chỉnh
  - Các object khác đang dùng chung material được clone material riêng để không bị ảnh hưởng
- Nếu không có selected object, Material Editor vẫn hoạt động ở chế độ chỉnh material toàn cục.
- Áp dụng cho:
  - Base Color
  - Roughness
  - Metalness
  - Emissive
  - Opacity
  - Texture Swap

### 5. Scene Panel Readability
- Object name dài hiển thị tối đa 2 dòng thay vì bị cắt quá sớm.
- Thêm dòng metadata nhỏ dưới tên:
  - object type
  - số children
  - số material liên quan
- Hiển thị badge category cho mesh được nhận diện là sàn/tường/gạch/brick.

### 6. Mesh Inventory Logging
- Sau khi load model thành công, in danh sách mesh ra console bằng `console.table`.
- Mục tiêu là giúp debug model GLB có nhiều mesh/material khó phân biệt.
- Các cột chính:
  - `category`
  - `name`
  - `uuid`
  - `materials`
  - `triangles`
  - `sizeX`
  - `sizeY`
  - `sizeZ`

### 7. Mesh Classification
- Tự nhận diện mesh theo keyword trong tên mesh, tên parent và tên material.
- Fallback bằng bounding box:
  - Mesh rộng và rất mỏng theo trục Y → `floor`
  - Mesh dạng tấm đứng, mỏng theo một trục ngang → `wall`
- Các nhóm hỗ trợ:
  - `floor`
  - `wall`
  - `tile`
  - `brick`
  - `other`

### 8. Resizable Sidebars
- Cho phép kéo rộng/thu hẹp Scene Panel bên trái.
- Cho phép kéo rộng/thu hẹp Properties/Materials sidebar bên phải.
- Trong lúc kéo:
  - Tắt transition width để tránh cảm giác lag
  - Throttle state update bằng `requestAnimationFrame`
  - Tạm không resize drawing buffer của canvas Three.js
- Khi thả chuột:
  - Commit width cuối cùng
  - Phát event `glb-viewer:commit-resize`
  - Three.js resize renderer đúng một lần

---

## Architecture Changes

### Cấu trúc file thay đổi

```
src/
├── styles/
│   └── globals.css              ← [MODIFY] Light theme shell tokens
│
├── context/
│   ├── ThemeContext.tsx          ← [MODIFY] Provider only, sync theme before paint
│   ├── theme.ts                  ← [NEW] ThemeContext + types
│   └── useTheme.ts               ← [NEW] Hook tách riêng để pass Fast Refresh rule
│
├── core/
│   ├── types.ts                  ← [MODIFY] MeshCategory + MeshInventoryItem
│   ├── SceneManager.ts           ← [MODIFY] Selection outline + raycast picking + resize commit
│   └── MaterialManager.ts        ← [MODIFY] material isolation + mesh inventory/classification
│
├── hooks/
│   └── useModelViewer.ts         ← [MODIFY] Canvas picking + scoped material updates + console mesh table
│
└── components/
    ├── App.tsx                   ← [MODIFY] Resizable sidebars
    ├── App.module.css            ← [MODIFY] Resize handles + drag state styles
    ├── Viewport/
    │   └── Viewport.module.css   ← [MODIFY] Pointer cursor for direct picking
    └── ScenePanel/
        ├── ScenePanel.tsx        ← [MODIFY] Width prop for resizing
        ├── ScenePanel.module.css ← [MODIFY] Resizable panel constraints
        ├── ObjectNode.tsx        ← [MODIFY] Name metadata + category badge
        └── ObjectNode.module.css ← [MODIFY] Two-line names + badge styling
```

---

## Key Implementation Details

### Raycast Picking
`SceneManager.pickObjectAt(clientX, clientY, root)`:
- Lấy bounds của canvas bằng `renderer.domElement.getBoundingClientRect()`
- Convert pointer sang NDC:

```ts
pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
```

- `Raycaster.setFromCamera(pointer, camera)`
- Intersect với các `Mesh` visible trong model
- Trả về mesh đầu tiên hoặc `null`

### Avoid Picking While Orbiting
`useModelViewer` lưu vị trí `pointerdown`, sau đó chỉ chọn khi `pointerup` cách điểm bắt đầu không quá 5px.

Điều này giữ workflow orbit/zoom/pan tự nhiên:
- Click ngắn → chọn object
- Left drag → orbit camera, không chọn nhầm

### Selection Outline Không Đổi Material
Selection outline dùng object render phụ:
- `LineSegments + EdgesGeometry` cho cạnh mesh
- `BoxHelper` cho bounding box
- `LineBasicMaterial` riêng cho selection

Không sửa:
- `mesh.material`
- `material.color`
- `material.emissive`

### Scoped Material Editing
`MaterialManager.isolateMaterialToObject(root, selectedObject, materialUuid)`:
- Duyệt toàn model
- Tìm mesh dùng material đang chỉnh
- Nếu mesh thuộc selected object → giữ material gốc để chỉnh
- Nếu mesh không thuộc selected object → clone material ra riêng

Sau khi isolate:
- Apply patch lên material của selected object
- Rebuild `materialObjectMap`
- Re-extract scene tree/material list để UI cập nhật đúng material mới

### Mesh Classification
`MaterialManager.getMeshCategory(mesh)`:
- Ưu tiên keyword trong `mesh.name`, `mesh.parent.name`, material name và material type.
- Nhận diện keyword tiếng Anh và một số keyword tiếng Việt không dấu/có dấu.
- Fallback bằng kích thước bounding box để đoán floor/wall khi model không đặt tên rõ.

`MaterialManager.getMeshInventory(root)`:
- Duyệt toàn bộ `Mesh` trong model.
- Trả về danh sách dùng cho console table và debug.

### Resize Không Nhấp Nháy Canvas
`App.tsx`:
- Quản lý width của left/right sidebar.
- Khi pointer move, cập nhật width tối đa 1 lần mỗi animation frame.
- Thêm class global `is-resizing-sidebars` trong lúc kéo.
- Khi thả chuột, phát event `glb-viewer:commit-resize`.

`SceneManager.ts`:
- Nếu body đang có class `is-resizing-sidebars`, `ResizeObserver` không gọi `renderer.setSize()`.
- Khi nhận event `glb-viewer:commit-resize`, renderer resize đúng một lần.
- Tránh việc canvas clear/repaint liên tục gây nhấp nháy.

---

## Decisions Made

| Câu hỏi | Quyết định |
|---|---|
| Click trực tiếp chọn gì? | Chọn mesh gần nhất dưới con trỏ |
| Click group trong Scene Panel xử lý ra sao? | Highlight tất cả mesh con thuộc group |
| Selection có tô màu bề mặt không? | Không. Chỉ dùng viền vàng + bounding box |
| Material editor mặc định sửa toàn cục hay cục bộ? | Có selected object thì sửa cục bộ; không selected thì sửa toàn cục |
| Có chọn khi đang orbit không? | Không, dùng threshold pointer movement |
| Mesh category hiển thị ở đâu? | Badge trong Scene Panel, console table đầy đủ |
| Resize sidebar xử lý canvas thế nào? | Không resize drawing buffer khi đang kéo, chỉ commit khi thả |

---

## Verification Plan

### Automated
- `npm run build` — TypeScript build pass
- `npm run lint` — ESLint pass

### Manual
1. Toggle Light Mode → toolbar, sidebars, status bar và viewport đều đổi theme đồng bộ.
2. Load model GLB → Scene Panel hiển thị cây object.
3. Click object trong Scene Panel → object có viền vàng, không bị phủ màu.
4. Click trực tiếp object trong viewport → object được chọn và Scene Panel cập nhật selected row.
5. Kéo orbit camera → camera xoay, không chọn nhầm object.
6. Click vùng trống trong viewport → clear selection.
7. Chọn một mesh có material dùng chung → đổi Base Color → chỉ mesh đã chọn đổi màu.
8. Không chọn object nào → đổi material trong Material Panel → material được chỉnh toàn cục như Phase 2.
9. Chọn object rồi upload texture → texture chỉ áp dụng cho object/vùng đang chọn.
10. Mở DevTools Console sau khi load model → thấy bảng mesh inventory.
11. Kiểm tra Scene Panel → mesh được nhận diện có badge `sàn`, `tường`, `gạch`, `brick`.
12. Kéo rộng Scene Panel bên trái → panel resize mượt, viewport không nhấp nháy.
13. Kéo rộng sidebar bên phải → panel resize mượt, viewport không nhấp nháy.

---

## Known Follow-ups

- Thêm breadcrumb hoặc auto-scroll trong Scene Panel khi chọn trực tiếp trong viewport.
- Thêm chế độ chọn parent group từ mesh đang pick.
- Thêm hover preview nhẹ trước khi click chọn.
- Thêm Undo/Redo cho material edits.

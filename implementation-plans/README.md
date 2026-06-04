# Implementation Plans

Tài liệu thiết kế và kế hoạch triển khai cho dự án **GLB Viewer Editor**.

---

## Danh sách

| File | Phase | Mô tả |
|---|---|---|
| [`phase1-glb-viewer.md`](./phase1-glb-viewer.md) | Phase 1 ✅ | GLB viewer cơ bản — load, xem model 3D, orbit camera |
| [`phase2-theme-scene-material.md`](./phase2-theme-scene-material.md) | Phase 2 ✅ | Light/Dark mode + Scene Panel + Material Editor |
| [`phase3-direct-selection-material-scope.md`](./phase3-direct-selection-material-scope.md) | Phase 3 ✅ | Chọn trực tiếp trên viewport + scoped material editing |

---

## Tech Stack

- **Framework**: React + TypeScript + Vite
- **3D Engine**: Three.js
- **Styling**: CSS Modules + `globals.css` (CSS variables)
- **Architecture**: Core (Three.js) / Hooks (React state) / Components (UI)

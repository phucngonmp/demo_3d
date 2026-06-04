# GLB Model Viewer Editor — Implementation Plan

Xây dựng một trang **3D Editor** cơ bản cho phép load và xem file `.glb` bằng **Three.js**, trên nền **React + TypeScript + Vite** đang có sẵn.

---

## Quyết định về Styling: CSS Modules (không Bootstrap, không SCSS global)

> [!IMPORTANT]
> **Recommendation: CSS Modules (`.module.css`)** — không dùng Bootstrap, không dùng SCSS global.

| Lựa chọn | Ưu | Nhược |
|---|---|---|
| **Bootstrap** | Rapid prototyping, có sẵn component | Bundle nặng, style bị cứng, khó custom cho UI 3D dark-theme |
| **SCSS global** | Powerful variables/mixins | Dễ bị name conflict khi scale, cần cài thêm dep |
| ✅ **CSS Modules** | Scoped per component, zero-conflict, tree-shakeable, không cần thêm dep vì Vite hỗ trợ sẵn | Hơi verbose hơn |

**Lý do chọn CSS Modules**: Project này sẽ mở rộng thành editor với nhiều panel (viewport, toolbar, properties…), CSS Modules đảm bảo mỗi component tự quản lý style của mình → dễ maintain khi thêm tính năng sau. Không cần install thêm gì.

> [!NOTE]
> Sẽ có thêm 1 file `src/styles/globals.css` cho CSS variables (color tokens, font), apply vào `main.tsx` — kiểu design system nhẹ.

---

## Architecture — Kiến trúc Module

```
src/
├── styles/
│   └── globals.css              # CSS variables, reset, fonts
│
├── core/                        # Three.js logic — pure TS, không dính React
│   ├── SceneManager.ts          # Setup renderer, scene, camera, lights
│   ├── ModelLoader.ts           # Load .glb bằng GLTFLoader
│   ├── CameraController.ts      # OrbitControls wrapper
│   └── types.ts                 # Shared TS types
│
├── components/
│   ├── Viewport/
│   │   ├── Viewport.tsx         # Canvas container, mount Three.js vào đây
│   │   └── Viewport.module.css
│   ├── Toolbar/
│   │   ├── Toolbar.tsx          # Upload button, view controls (wireframe, reset cam...)
│   │   └── Toolbar.module.css
│   ├── InfoPanel/
│   │   ├── InfoPanel.tsx        # Hiển thị model info (triangles, materials, size...)
│   │   └── InfoPanel.module.css
│   └── DropZone/
│       ├── DropZone.tsx         # Drag & Drop .glb file
│       └── DropZone.module.css
│
├── hooks/
│   └── useModelViewer.ts        # Custom hook kết nối React state ↔ Three.js core
│
├── App.tsx                      # Layout chính: Editor layout
├── App.module.css
└── main.tsx
```

---

## Các tính năng Phase 1 (MVP)

| Feature | Mô tả |
|---|---|
| **Viewport 3D** | Canvas full-area, dark background, ambient + directional light |
| **Load GLB** | Drag & Drop **hoặc** click để chọn file `.glb` từ máy |
| **Camera Orbit** | Dùng `OrbitControls` — xoay, zoom, pan bằng chuột |
| **Auto-fit camera** | Sau khi load model, camera tự zoom về vừa khung hình |
| **Wireframe toggle** | Bật/tắt chế độ wireframe |
| **Model info** | Hiển thị số triangles, số materials, bounding box size |
| **Lighting** | 3-point lighting mặc định (ambient + 2 directional) |
| **Grid helper** | Ground grid để dễ nhìn orientation |

---

## Proposed Changes

### 1. Dependencies cần cài

```bash
npm install three
npm install -D @types/three
```

### 2. Core Three.js Layer

#### [NEW] `src/core/types.ts`
Shared interfaces: `ModelInfo`, `ViewerOptions`, `LoadResult`

#### [NEW] `src/core/SceneManager.ts`
- Khởi tạo `WebGLRenderer`, `Scene`, `PerspectiveCamera`
- Manage resize, animation loop (`requestAnimationFrame`)
- Setup lighting và grid helper
- Export method: `mount(canvas)`, `unmount()`, `startLoop()`, `stopLoop()`

#### [NEW] `src/core/ModelLoader.ts`
- Wrap `GLTFLoader` từ `three/examples/jsm`
- Parse file từ `FileReader` → `ArrayBuffer` → loader
- Collect model stats (triangle count, materials)
- Export: `loadFromFile(file: File): Promise<LoadResult>`

#### [NEW] `src/core/CameraController.ts`
- Wrap `OrbitControls`
- Method `fitToObject(object3D)` — auto-frame camera về model
- Export: `enable()`, `disable()`, `reset()`, `fitToObject()`

### 3. React Layer

#### [NEW] `src/hooks/useModelViewer.ts`
Custom hook quản lý:
- Ref tới canvas element
- Instance của `SceneManager`, `ModelLoader`, `CameraController`
- State: `isLoading`, `modelInfo`, `error`
- Cleanup khi unmount

#### [NEW] `src/components/Viewport/`
- Mount canvas, gọi `SceneManager.mount(canvasRef)`
- Handle resize với `ResizeObserver`

#### [NEW] `src/components/Toolbar/`
- Nút **Open File** (trigger file input ẩn)
- Toggle: **Wireframe**, **Grid**, **Reset Camera**
- Stats display mini

#### [NEW] `src/components/DropZone/`
- Overlay xuất hiện khi drag file vào cửa sổ
- Validate chỉ nhận `.glb` hoặc `.gltf`

#### [NEW] `src/components/InfoPanel/`
- Hiển thị: tên file, triangle count, material count, dimensions

#### [MODIFY] `src/App.tsx`
- Thay toàn bộ bằng Editor layout
- Layout: Toolbar (top) + Viewport (center) + InfoPanel (right sidebar)

### 4. Styling

#### [NEW] `src/styles/globals.css`
CSS custom properties:
```css
--bg-primary: #0d0d0f
--bg-surface: #1a1a1f
--bg-panel: #141418
--accent: #6c63ff
--accent-glow: rgba(108,99,255,0.3)
--text-primary: #e8e8f0
--text-muted: #5a5a70
```
Font: **Inter** từ Google Fonts

---

## Layout Design

```
┌─────────────────────────────────────────────────────┐
│  🔷 GLB Viewer    [Open File] [Wireframe] [Reset]   │  ← Toolbar
├─────────────────────────────────────────┬───────────┤
│                                         │  Model    │
│                                         │  Info     │
│          3D VIEWPORT                    │  ─────    │
│        (three.js canvas)                │  Verts:   │
│                                         │  Tris:    │
│                                         │  Mats:    │
│                                         │  Size:    │
├─────────────────────────────────────────┴───────────┤
│  Drag & Drop .glb file anywhere...  (status bar)    │
└─────────────────────────────────────────────────────┘
```

---

## Verification Plan

### Automated
- `npm run dev` — kiểm tra không có lỗi TypeScript / Vite compile error

### Manual
1. Mở browser, thấy editor dark-theme layout
2. Drag một file `.glb` vào → model xuất hiện trong viewport
3. Click "Open File" → chọn `.glb` → model load
4. Xoay/zoom/pan bằng chuột hoạt động
5. Toggle Wireframe → model chuyển wireframe mode
6. InfoPanel hiển thị đúng thông tin model

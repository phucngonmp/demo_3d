# Phase 2 — Theme Toggle + Scene/Material Panel

Mở rộng GLB Viewer với 2 tính năng mới:
1. **Light / Dark mode** toggle
2. **Scene Panel** — danh sách objects trong model + **Material Panel** — xem và chỉnh sửa material/texture

> Phase 1 plan: `phase1-glb-viewer.md`

---

## Tính năng chi tiết

### 1. Light / Dark Mode
- Toggle button trên Toolbar (icon mặt trăng/mặt trời)
- State lưu ở `localStorage` (nhớ preference)
- CSS hoạt động bằng `data-theme="light"` trên `<html>` — không cần JS trong style
- SceneManager đổi background color theo theme
- Grid helper tự recreate với màu phù hợp theo từng theme

### 2. Scene Panel (left sidebar, collapsible)

**Object Tree:**
- Duyệt toàn bộ `Object3D` hierarchy của model đang load
- Hiển thị dạng cây có thụt đầu dòng (indent)
- Icon phân biệt: Mesh (◈) / Group (⊞) / Bone (⊹) / Light (✦)
- Click object → **highlight** (emissive flash) trong viewport
- Toggle visibility (ẩn/hiện) từng object (eye icon, show on hover)
- Thu gọn được → viewport rộng hơn

**Material List:**
- Tab "Materials" trên right sidebar
- Toàn bộ unique materials trong model
- Thông tin mỗi material: color swatch, tên, type badge

### 3. Material Editor (accordion trong Material Panel)

Khi click vào 1 material:
- **Base Color**: color picker (live update)
- **Roughness**: slider 0–1
- **Metalness**: slider 0–1
- **Emissive Color**: color picker
- **Opacity**: slider 0–1 (transparent auto-enable)
- **Texture Swap**: nút upload ảnh → thay `map` (baseColorTexture)
- Texture preview thumbnail sau khi upload

---

## Architecture Changes

### Cấu trúc file mới / thay đổi

```
src/
├── styles/
│   └── globals.css              ← [MODIFY] Thêm [data-theme="light"] token block
│
├── core/
│   ├── types.ts                 ← [MODIFY] Thêm SceneNode, MaterialData interfaces
│   ├── SceneManager.ts          ← [MODIFY] Thêm setTheme(), createGrid() private method
│   └── MaterialManager.ts       ← [NEW] Extract material list, apply edits, texture swap
│
├── context/
│   └── ThemeContext.tsx          ← [NEW] React context cho theme state + toggle
│
├── hooks/
│   └── useModelViewer.ts        ← [MODIFY] Expose sceneNodes, materialMap, selectedNode,
│                                            selectNode, updateMaterial, swapTexture,
│                                            toggleObjectVisibility
│
├── components/
│   ├── Toolbar/
│   │   └── Toolbar.tsx          ← [MODIFY] Thêm ThemeToggle button (sun/moon icon)
│   │
│   ├── ScenePanel/              ← [NEW] Left sidebar
│   │   ├── ScenePanel.tsx       ← Object tree, collapsible header
│   │   ├── ScenePanel.module.css
│   │   ├── ObjectNode.tsx       ← Single tree node (recursive), expand/collapse children
│   │   └── ObjectNode.module.css
│   │
│   └── MaterialPanel/           ← [NEW] Accordion material list
│       ├── MaterialPanel.tsx    ← Material list với color swatch + type badge
│       ├── MaterialPanel.module.css
│       ├── MaterialEditor.tsx   ← Inline editor: color pickers, sliders, texture upload
│       └── MaterialEditor.module.css
│
├── App.tsx                      ← [MODIFY] 3-column layout + tab switcher right sidebar
└── App.module.css               ← [MODIFY] New layout styles
```

---

## Layout mới

```
┌─────────────────────────────────────────────────────────────┐
│  ◈ GLB Viewer  [Open] [Wire] [Grid] [Reset]    [☀/🌙]      │  ← Toolbar
├────────────┬──────────────────────────────────┬─────────────┤
│  SCENE [←] │                                  │ Prop | Mat  │  ← Tab bar
│  ─────     │                                  │─────────────│
│  ▾ Scene   │         3D VIEWPORT              │  (content)  │
│    ▾ Mesh0 │                                  │             │
│    ▸ Mesh1 │                                  │             │
│    ▸ Group │                                  │             │
├────────────┴──────────────────────────────────┴─────────────┤
│  ● model.glb · 12,345 triangles              Three.js Viewer│
└─────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### Theme-aware Grid
`SceneManager.setTheme()` gọi `createGrid(theme)` private method để recreate `GridHelper` với màu phù hợp:
- **Dark**: center `0x444466`, lines `0x222233` (indigo tối)
- **Light**: center `0x7a80a0`, lines `0xadb3c8` (slate-blue nhạt)

### MaterialManager
Pure class, không phụ thuộc React:
- `extractSceneTree(root)` → `SceneNode[]` (recursive tree)
- `buildObjectMap(root)` → `Map<uuid, Object3D>` (fast lookup)
- `extractMaterials(root)` → `Map<uuid, MaterialData>`
- `buildMaterialObjectMap(root)` → raw Three.js material refs
- `applyColor / applyRoughness / applyMetalness / applyEmissive / applyOpacity`
- `swapTexture(mat, file)` → `Promise<previewUrl>`
- `highlightObject(uuid, objectMap)` → brief emissive pulse animation
- `updateNodeVisibility(nodes, uuid, visible)` → immutable tree update

### useModelViewer Hook — refs pattern
```ts
// Three.js objects as refs (not state) — no re-render on Three.js mutations
const objectMapRef    = useRef<Map<string, Object3D>>(new Map())
const materialObjectMapRef = useRef<Map<string, any>>(new Map())

// Theme ref để dùng trong mount effect mà không tạo dependency
const themeRef = useRef(theme)
themeRef.current = theme  // always up-to-date
```

---

## Decisions Made

| Câu hỏi | Quyết định |
|---|---|
| Scene Panel placement | Left sidebar, collapsible |
| Right sidebar layout | Tab switcher: **Properties** \| **Materials** |
| Texture preview | Hiển thị thumbnail sau khi upload |
| Material selection scope | Tất cả unique materials trong model (không phải per-object) |

---

## Verification Plan

### Automated
- `npm run dev` — không có lỗi TypeScript

### Manual
1. Toggle theme → UI và viewport background chuyển đúng, grid màu thay đổi
2. Load model → Scene Panel hiển thị object tree
3. Click object trong tree → emissive flash + selection highlight
4. Toggle eye icon → object ẩn/hiện trong viewport
5. Click `←` collapse ScenePanel → viewport rộng hơn, label "SCENE" dọc
6. Tab Materials → danh sách material với swatch
7. Click material → accordion expand, chỉnh color → realtime update
8. Upload texture → model texture thay đổi + thumbnail preview

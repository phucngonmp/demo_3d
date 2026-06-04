import { useRef } from 'react'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  wireframe: boolean
  showGrid: boolean
  hasModel: boolean
  onOpenFile: (file: File) => void
  onToggleWireframe: () => void
  onToggleGrid: () => void
  onResetCamera: () => void
  onClearModel: () => void
}

export function Toolbar({
  wireframe,
  showGrid,
  hasModel,
  onOpenFile,
  onToggleWireframe,
  onToggleGrid,
  onResetCamera,
  onClearModel,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onOpenFile(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <header className={styles.toolbar} role="toolbar" aria-label="Editor toolbar">
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.brandIcon}>◈</span>
        <span className={styles.brandName}>GLB Viewer</span>
      </div>

      <div className={styles.divider} />

      {/* Primary action */}
      <button
        id="btn-open-file"
        className={styles.btnPrimary}
        onClick={() => fileInputRef.current?.click()}
        title="Open a .glb or .gltf file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Open File
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        id="file-input-hidden"
      />

      <div className={styles.divider} />

      {/* View toggles */}
      <div className={styles.group} role="group" aria-label="View options">
        <button
          id="btn-wireframe"
          className={`${styles.btnToggle} ${wireframe ? styles.active : ''}`}
          onClick={onToggleWireframe}
          title="Toggle wireframe"
          disabled={!hasModel}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 20 2 20"/>
            <line x1="12" y1="2" x2="2" y2="20"/>
            <line x1="12" y1="2" x2="22" y2="20"/>
            <line x1="2" y1="14" x2="22" y2="14"/>
          </svg>
          Wireframe
        </button>

        <button
          id="btn-grid"
          className={`${styles.btnToggle} ${showGrid ? styles.active : ''}`}
          onClick={onToggleGrid}
          title="Toggle grid"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          Grid
        </button>

        <button
          id="btn-reset-cam"
          className={styles.btnToggle}
          onClick={onResetCamera}
          title="Reset camera"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset Cam
        </button>
      </div>

      <div className={styles.spacer} />

      {/* Clear */}
      {hasModel && (
        <button
          id="btn-clear-model"
          className={styles.btnDanger}
          onClick={onClearModel}
          title="Remove loaded model"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          Clear
        </button>
      )}
    </header>
  )
}

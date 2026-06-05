import { useRef } from 'react'
import { useTheme } from '../../context/useTheme'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  wireframe: boolean
  showGrid: boolean
  hasModel: boolean
  autosave: boolean
  exposure: number
  cameraMode: 'orbit' | 'interior'
  onOpenFile: (file: File) => void
  onToggleWireframe: () => void
  onToggleGrid: () => void
  onResetCamera: () => void
  onClearModel: () => void
  onToggleAutosave: () => void
  onChangeExposure: (val: number) => void
  onToggleCameraMode: () => void
}

export function Toolbar({
  wireframe,
  showGrid,
  hasModel,
  autosave,
  exposure,
  cameraMode,
  onOpenFile,
  onToggleWireframe,
  onToggleGrid,
  onResetCamera,
  onClearModel,
  onToggleAutosave,
  onChangeExposure,
  onToggleCameraMode,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, toggleTheme } = useTheme()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onOpenFile(file)
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

      {/* Open File */}
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

      {/* Clear model */}
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
          </svg>
          Clear
        </button>
      )}

      <div className={styles.divider} />

      {/* Camera Mode Toggle */}
      <button
        id="btn-camera-mode"
        className={styles.btnToggle}
        onClick={onToggleCameraMode}
        title={cameraMode === 'interior' ? "Switch to Orbit Mode" : "Switch to Interior Mode"}
        disabled={!hasModel}
      >
        {cameraMode === 'interior' ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Interior Mode
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              <path d="M2 12h20"/>
            </svg>
            Orbit Mode
          </>
        )}
      </button>

      <div className={styles.divider} />

      {/* Brightness slider */}
      <div className={styles.sliderGroup} title="Adjust Brightness">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <input 
          type="range" 
          min="0.1" max="3" step="0.1" 
          value={exposure} 
          onChange={(e) => onChangeExposure(parseFloat(e.target.value))}
          className={styles.slider}
        />
      </div>

      <div className={styles.divider} />

      {/* Autosave toggle */}
      <button
        id="btn-autosave"
        className={`${styles.btnIcon} ${autosave ? styles.btnIconActive : ''}`}
        onClick={onToggleAutosave}
        title={autosave ? 'Autosave ON — click to disable' : 'Autosave OFF — click to enable'}
        aria-label="Toggle autosave"
        aria-pressed={autosave}
      >
        {/* Save / floppy icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
      </button>

      {/* Theme toggle */}
      <button
        id="btn-theme-toggle"
        className={styles.btnIcon}
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          /* Sun icon */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          /* Moon icon */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>
    </header>
  )
}

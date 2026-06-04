import { useRef, useState, useCallback } from 'react'
import { Viewport } from './components/Viewport/Viewport'
import { Toolbar } from './components/Toolbar/Toolbar'
import { InfoPanel } from './components/InfoPanel/InfoPanel'
import { DropZone } from './components/DropZone/DropZone'
import { useModelViewer } from './hooks/useModelViewer'
import styles from './App.module.css'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const {
    state,
    loadFile,
    toggleWireframe,
    toggleGrid,
    resetCamera,
    clearModel,
    dismissError,
  } = useModelViewer(containerRef)

  const handleDragStateChange = useCallback((dragging: boolean) => {
    setIsDragOver(dragging)
  }, [])

  return (
    <div className={styles.app}>
      {/* Top toolbar */}
      <Toolbar
        wireframe={state.wireframe}
        showGrid={state.showGrid}
        hasModel={state.hasModel}
        onOpenFile={loadFile}
        onToggleWireframe={toggleWireframe}
        onToggleGrid={toggleGrid}
        onResetCamera={resetCamera}
        onClearModel={clearModel}
      />

      {/* Main work area */}
      <div className={styles.workArea}>
        {/* 3D Viewport */}
        <div className={styles.viewportWrapper}>
          <Viewport containerRef={containerRef} isDragOver={isDragOver} />

          {/* Empty state hint — only when no model */}
          {!state.hasModel && !state.isLoading && (
            <div className={styles.emptyHint}>
              <div className={styles.emptyIcon}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <p className={styles.emptyTitle}>No model loaded</p>
              <p className={styles.emptySubtitle}>
                Drag &amp; drop a <code>.glb</code> file or click{' '}
                <strong>Open File</strong> in the toolbar
              </p>
              <div className={styles.controls}>
                <span>🖱 Orbit: Left drag</span>
                <span>⟳ Zoom: Scroll</span>
                <span>✥ Pan: Right drag</span>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {state.isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
              <p>Loading model…</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <InfoPanel modelInfo={state.modelInfo} isLoading={state.isLoading} />
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>
          <span className={`${styles.dot} ${state.hasModel ? styles.dotGreen : styles.dotGray}`} />
          {state.hasModel ? state.modelInfo?.fileName : 'No model'}
        </span>
        {state.hasModel && (
          <>
            <span className={styles.statusSep}>·</span>
            <span className={styles.statusItem}>
              {state.modelInfo?.triangleCount.toLocaleString()} triangles
            </span>
          </>
        )}
        <span className={styles.statusSpacer} />
        <span className={styles.statusItem} style={{ color: 'var(--text-muted)' }}>
          Three.js GLB Viewer
        </span>
      </div>

      {/* Drag overlay */}
      <DropZone onDrop={loadFile} onDragStateChange={handleDragStateChange} />

      {/* Error toast */}
      {state.error && (
        <div className={styles.errorToast} role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{state.error}</span>
          <button id="btn-dismiss-error" onClick={dismissError} className={styles.dismissBtn}>✕</button>
        </div>
      )}
    </div>
  )
}

export default App

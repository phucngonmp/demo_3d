import { useRef, useState, useCallback, useEffect } from 'react'
import { Viewport } from './components/Viewport/Viewport'
import { Toolbar } from './components/Toolbar/Toolbar'
import { DropZone } from './components/DropZone/DropZone'
import { MaterialPanel } from './components/MaterialPanel/MaterialPanel'
import { MaterialListPanel } from './components/MaterialPanel/MaterialListPanel'
import { useModelViewer } from './hooks/useModelViewer'
import styles from './App.module.css'

const RIGHT_MIN_WIDTH = 220
const RIGHT_MAX_WIDTH = 520
const RESIZING_CLASS = 'is-resizing-sidebars'
const COMMIT_RESIZE_EVENT = 'glb-viewer:commit-resize'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeMaterialUuid, setActiveMaterialUuid] = useState<string | null>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300)
  const rightSidebarWidthRef = useRef(rightSidebarWidth)
  const resizeFrameRef = useRef<number | null>(null)

  const {
    state,
    materialMap,
    selectedNodeUuid,
    autosave,
    undoStack,
    loadFile,
    toggleWireframe,
    resetCamera,
    clearModel,
    dismissError,
    selectNode,
    selectMaterial,
    updateMaterial,
    applyTextureUrl,
    resetTexture,
    undoMaterial,
    pushUndo,
    toggleAutosave,
    changeExposure,
    toggleCameraMode,
    changeEnvMode,
  } = useModelViewer(containerRef)

  // Selected group logic handled via UI now

  // Sync 3D selection highlight when a material is active
  useEffect(() => {
    if (activeMaterialUuid) {
      selectMaterial(activeMaterialUuid)
    } else {
      selectNode(selectedNodeUuid)
    }
  }, [activeMaterialUuid, selectMaterial, selectNode, selectedNodeUuid])

  const handleDragStateChange = useCallback((dragging: boolean) => {
    setIsDragOver(dragging)
  }, [])

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }
      document.body.classList.remove(RESIZING_CLASS)
    }
  }, [])

  const scheduleResizeFrame = useCallback(() => {
    if (resizeFrameRef.current !== null) return

    resizeFrameRef.current = requestAnimationFrame(() => {
      setRightSidebarWidth(rightSidebarWidthRef.current)
      resizeFrameRef.current = null
    })
  }, [])

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const startX = event.clientX
    const initialRightWidth = rightSidebarWidthRef.current

    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.classList.add(RESIZING_CLASS)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX
      rightSidebarWidthRef.current = clamp(initialRightWidth - delta, RIGHT_MIN_WIDTH, RIGHT_MAX_WIDTH)
      scheduleResizeFrame()
    }

    const handlePointerUp = () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      setRightSidebarWidth(rightSidebarWidthRef.current)
      document.body.classList.remove(RESIZING_CLASS)
      window.dispatchEvent(new Event(COMMIT_RESIZE_EVENT))
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }, [scheduleResizeFrame])

  return (
    <div className={styles.app}>
      {/* ── Toolbar ── */}
      <Toolbar
        wireframe={state.wireframe}
        hasModel={state.hasModel}
        autosave={autosave}
        exposure={state.exposure}
        cameraMode={state.cameraMode}
        onOpenFile={loadFile}
        onToggleWireframe={toggleWireframe}
        onResetCamera={resetCamera}
        onClearModel={clearModel}
        onToggleAutosave={toggleAutosave}
        onChangeExposure={changeExposure}
        onToggleCameraMode={toggleCameraMode}
        envMode={state.envMode}
        onChangeEnvMode={changeEnvMode}
      />

      {/* ── Work area: center | right ── */}
      <div className={styles.workArea}>

        {/* Center: 3D Viewport */}
        <div 
          className={styles.viewportWrapper}
          onPointerDown={(e) => { pointerDownPos.current = { x: e.clientX, y: e.clientY } }}
          onPointerUp={(e) => {
            const dx = e.clientX - pointerDownPos.current.x
            const dy = e.clientY - pointerDownPos.current.y
            if (Math.hypot(dx, dy) < 5 && e.button === 0) {
              setActiveMaterialUuid(null)
            }
          }}
        >
          <Viewport containerRef={containerRef} isDragOver={isDragOver} />

          {/* Empty state */}
          {!state.hasModel && !state.isLoading && (
            <div className={styles.emptyHint}>
              <div className={styles.emptyIcon}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
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

        {/* Right: Materials panel */}
        <div
          className={`${styles.resizeHandle} ${styles.rightResizeHandle}`}
          onPointerDown={(event) => startResize(event)}
          role="separator"
          aria-label="Resize right sidebar"
          aria-orientation="vertical"
        />
        <div
          className={styles.rightSidebar}
          style={{ width: `${rightSidebarWidth}px` }}
        >
          {/* Header */}
          <div className={styles.tabBar}>
            <div className={`${styles.tab} ${styles.tabActive}`} style={{ pointerEvents: 'none' }}>
              Materials
              {materialMap.size > 0 && (
                <span className={styles.tabBadge}>{materialMap.size}</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className={styles.tabContent}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: activeMaterialUuid ? '0 0 30%' : 1, minHeight: 0, overflowY: 'auto' }}>
                  <MaterialListPanel
                    materials={materialMap}
                    activeMaterialUuid={activeMaterialUuid}
                    onSelect={(uuid) => setActiveMaterialUuid(prev => prev === uuid ? null : uuid)}
                  />
                </div>
                {activeMaterialUuid && materialMap.has(activeMaterialUuid) && (
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderTop: '2px solid var(--border-color)' }}>
                    <MaterialPanel
                      material={materialMap.get(activeMaterialUuid)!}
                      canUndo={undoStack.length > 0}
                      onUpdateMaterial={updateMaterial}
                      onApplyTextureUrl={applyTextureUrl}
                      onResetTexture={resetTexture}
                      onUndo={undoMaterial}
                      onPushUndo={pushUndo}
                    />
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className={styles.statusBar} style={{ display: 'none' }}>
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
            {selectedNodeUuid && (
              <>
                <span className={styles.statusSep}>·</span>
                <span className={styles.statusItem} style={{ color: 'var(--accent)' }}>
                  1 object selected
                </span>
              </>
            )}
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{state.error}</span>
          <button id="btn-dismiss-error" onClick={dismissError} className={styles.dismissBtn}>✕</button>
        </div>
      )}
    </div>
  )
}

export default App

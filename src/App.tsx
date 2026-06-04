import { useRef, useState, useCallback } from 'react'
import { Viewport } from './components/Viewport/Viewport'
import { Toolbar } from './components/Toolbar/Toolbar'
import { InfoPanel } from './components/InfoPanel/InfoPanel'
import { DropZone } from './components/DropZone/DropZone'
import { ScenePanel } from './components/ScenePanel/ScenePanel'
import { MaterialPanel } from './components/MaterialPanel/MaterialPanel'
import { useModelViewer } from './hooks/useModelViewer'
import styles from './App.module.css'

type RightTab = 'properties' | 'materials'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [scenePanelCollapsed, setScenePanelCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<RightTab>('properties')

  const {
    state,
    sceneNodes,
    materialMap,
    selectedNodeUuid,
    loadFile,
    toggleWireframe,
    toggleGrid,
    resetCamera,
    clearModel,
    dismissError,
    selectNode,
    toggleObjectVisibility,
    updateMaterial,
    swapTexture,
  } = useModelViewer(containerRef)

  const handleDragStateChange = useCallback((dragging: boolean) => {
    setIsDragOver(dragging)
  }, [])

  return (
    <div className={styles.app}>
      {/* ── Toolbar ── */}
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

      {/* ── Work area: left | center | right ── */}
      <div className={styles.workArea}>

        {/* Left: collapsible Scene Panel */}
        <ScenePanel
          nodes={sceneNodes}
          selectedUuid={selectedNodeUuid}
          isCollapsed={scenePanelCollapsed}
          onToggleCollapse={() => setScenePanelCollapsed((v) => !v)}
          onSelectNode={selectNode}
          onToggleVisibility={toggleObjectVisibility}
        />

        {/* Center: 3D Viewport */}
        <div className={styles.viewportWrapper}>
          <Viewport containerRef={containerRef} isDragOver={isDragOver} />

          {/* Empty state */}
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

        {/* Right: tab switcher (Properties | Materials) */}
        <div className={styles.rightSidebar}>
          {/* Tab bar */}
          <div className={styles.tabBar}>
            <button
              id="tab-properties"
              className={`${styles.tab} ${activeTab === 'properties' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties
            </button>
            <button
              id="tab-materials"
              className={`${styles.tab} ${activeTab === 'materials' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              Materials
              {materialMap.size > 0 && (
                <span className={styles.tabBadge}>{materialMap.size}</span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className={styles.tabContent}>
            {activeTab === 'properties' ? (
              <InfoPanel
                modelInfo={state.modelInfo}
                isLoading={state.isLoading}
              />
            ) : (
              <MaterialPanel
                materials={materialMap}
                onUpdateMaterial={updateMaterial}
                onSwapTexture={swapTexture}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
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

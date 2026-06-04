import type { ModelInfo } from '../../core/types'
import styles from './InfoPanel.module.css'

interface InfoPanelProps {
  modelInfo: ModelInfo | null
  isLoading: boolean
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

function formatDim(v: number): string {
  return v < 0.01 ? v.toExponential(2) : v.toFixed(3)
}

export function InfoPanel({ modelInfo, isLoading }: InfoPanelProps) {
  return (
    <aside className={styles.panel} aria-label="Model information">
      <div className={styles.header}>
        <span className={styles.headerIcon}>◎</span>
        <span className={styles.headerTitle}>Properties</span>
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading model…</span>
        </div>
      )}

      {!isLoading && !modelInfo && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <p>No model loaded</p>
          <p className={styles.emptyHint}>Open or drag a .glb file</p>
        </div>
      )}

      {!isLoading && modelInfo && (
        <div className={styles.content}>
          {/* File */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>File</div>
            <div className={styles.fileName} title={modelInfo.fileName}>
              {modelInfo.fileName}
            </div>
          </section>

          {/* Geometry */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Geometry</div>
            <StatRow
              label="Triangles"
              value={modelInfo.triangleCount.toLocaleString()}
            />
            <StatRow
              label="Vertices"
              value={modelInfo.vertexCount.toLocaleString()}
            />
            <StatRow label="Objects" value={modelInfo.objectCount} />
          </section>

          {/* Materials */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Materials</div>
            <StatRow label="Count" value={modelInfo.materialCount} />
          </section>

          {/* Dimensions */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Bounding Box</div>
            <StatRow label="Width (X)" value={`${formatDim(modelInfo.dimensions.x)} m`} />
            <StatRow label="Height (Y)" value={`${formatDim(modelInfo.dimensions.y)} m`} />
            <StatRow label="Depth (Z)" value={`${formatDim(modelInfo.dimensions.z)} m`} />
          </section>
        </div>
      )}
    </aside>
  )
}

import type { SceneNode } from '../../core/types'
import { ObjectNode } from './ObjectNode'
import styles from './ScenePanel.module.css'

interface ScenePanelProps {
  nodes: SceneNode[]
  selectedUuid: string | null
  isCollapsed: boolean
  width: number
  onToggleCollapse: () => void
  onSelectNode: (uuid: string | null) => void
  onToggleVisibility: (uuid: string, visible: boolean) => void
}

export function ScenePanel({
  nodes,
  selectedUuid,
  isCollapsed,
  width,
  onToggleCollapse,
  onSelectNode,
  onToggleVisibility,
}: ScenePanelProps) {
  return (
    <aside
      className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''}`}
      style={{ width: isCollapsed ? undefined : `${width}px` }}
      aria-label="Scene hierarchy"
    >
      {/* Header */}
      <div className={styles.header}>
        {!isCollapsed && (
          <>
            <span className={styles.headerIcon}>⊞</span>
            <span className={styles.headerTitle}>Scene</span>
          </>
        )}
        <button
          id="btn-toggle-scene-panel"
          className={styles.collapseBtn}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand scene panel' : 'Collapse scene panel'}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Tree (hidden when collapsed) */}
      {!isCollapsed && (
        <div className={styles.tree}>
          {nodes.length === 0 ? (
            <div className={styles.empty}>
              <p>No model loaded</p>
            </div>
          ) : (
            nodes.map((node) => (
              <ObjectNode
                key={node.uuid}
                node={node}
                selectedUuid={selectedUuid}
                onSelect={onSelectNode}
                onToggleVisibility={onToggleVisibility}
              />
            ))
          )}
        </div>
      )}

      {/* Collapsed label */}
      {isCollapsed && (
        <div className={styles.collapsedLabel}>
          <span>S C E N E</span>
        </div>
      )}
    </aside>
  )
}

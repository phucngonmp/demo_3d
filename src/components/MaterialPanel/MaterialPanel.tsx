import { useState } from 'react'
import type { MaterialData } from '../../core/types'
import { MaterialEditor } from './MaterialEditor'
import styles from './MaterialPanel.module.css'

interface MaterialPanelProps {
  materials: Map<string, MaterialData>
  hasSelection: boolean
  onUpdateMaterial: (uuid: string, patch: Partial<MaterialData>) => void
  onSwapTexture: (matUuid: string, file: File) => Promise<void>
}

export function MaterialPanel({
  materials,
  hasSelection,
  onUpdateMaterial,
  onSwapTexture,
}: MaterialPanelProps) {
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null)
  const matArray = Array.from(materials.values())

  const toggleExpand = (uuid: string) => {
    setExpandedUuid((prev) => (prev === uuid ? null : uuid))
  }

  if (!hasSelection) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <p>No object selected</p>
        <p className={styles.emptyHint}>
          Click an object in the <strong>Scene</strong> panel or click directly in the viewport
        </p>
      </div>
    )
  }

  if (matArray.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <p>No materials</p>
        <p className={styles.emptyHint}>This object has no editable materials</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {matArray.map((mat) => {
        const isExpanded = expandedUuid === mat.uuid
        return (
          <div key={mat.uuid} className={`${styles.item} ${isExpanded ? styles.itemExpanded : ''}`}>
            {/* Material row */}
            <button
              className={styles.matRow}
              onClick={() => toggleExpand(mat.uuid)}
              aria-expanded={isExpanded}
            >
              {/* Color swatch */}
              <span
                className={styles.swatch}
                style={{ background: mat.color }}
                title={mat.color}
              />
              {/* Name */}
              <span className={styles.matName} title={mat.name}>
                {mat.name || 'Material'}
              </span>
              {/* Type badge */}
              <span className={styles.typeBadge}>
                {mat.type.replace('Material', '')}
              </span>
              {/* Texture indicator */}
              {mat.hasMap && (
                <span className={styles.texIndicator} title="Has texture">
                  ▦
                </span>
              )}
              {/* Chevron */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={styles.chevron}
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Editor — shown when expanded */}
            {isExpanded && (
              <MaterialEditor
                mat={mat}
                onUpdate={(patch) => onUpdateMaterial(mat.uuid, patch)}
                onSwapTexture={(file) => onSwapTexture(mat.uuid, file)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

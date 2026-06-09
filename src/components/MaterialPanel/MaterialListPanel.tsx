import { useEffect } from 'react'
import type { MaterialData } from '../../core/types'
import styles from './MaterialPanel.module.css'

interface MaterialListPanelProps {
  materials: Map<string, MaterialData>
  activeMaterialUuid?: string | null
  onSelect: (uuid: string) => void
}

export function MaterialListPanel({ materials, activeMaterialUuid, onSelect }: MaterialListPanelProps) {
  const matArray = Array.from(materials.values())

  useEffect(() => {
    if (activeMaterialUuid) {
      const el = document.getElementById(`mat-${activeMaterialUuid}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [activeMaterialUuid])

  if (matArray.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <p>No materials found</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {matArray.map((mat) => {
        return (
          <div key={mat.uuid} className={styles.item}>
            <button
              id={`mat-${mat.uuid}`}
              className={styles.matRow}
              onClick={() => onSelect(mat.uuid)}
              title="Click to select, double-click name to edit"
              style={{
                backgroundColor: mat.uuid === activeMaterialUuid ? 'var(--accent)' : 'transparent',
                color: mat.uuid === activeMaterialUuid ? '#ffffff' : 'inherit',
                borderLeft: mat.uuid === activeMaterialUuid ? '4px solid #ffffff' : '4px solid transparent'
              }}
            >
              <span
                className={styles.swatch}
                style={{ background: mat.color }}
              />
              <span className={styles.matName}>
                {mat.displayName || mat.name || 'Material'}
              </span>
              <span className={styles.typeBadge} style={{ marginLeft: 'auto' }}>
                {mat.type.replace('Material', '')}
              </span>
              {mat.hasMap && (
                <span className={styles.texIndicator} title="Has texture">
                  ▦
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

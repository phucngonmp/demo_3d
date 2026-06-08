import type { MaterialData } from '../../core/types'
import { MaterialEditor } from './MaterialEditor'
import styles from './MaterialPanel.module.css'

interface MaterialPanelProps {
  material: MaterialData
  canUndo: boolean
  onUpdateMaterial: (uuid: string, patch: Partial<MaterialData>, skipUndo?: boolean) => void
  onApplyTextureUrl: (matUuid: string, url: string) => Promise<void>
  onResetTexture: (matUuid: string) => void
  onUndo: () => void
  onPushUndo: () => void
}

export function MaterialPanel({
  material,
  canUndo,
  onUpdateMaterial,
  onApplyTextureUrl,
  onResetTexture,
  onUndo,
  onPushUndo,
}: MaterialPanelProps) {
  if (!material) return null

  return (
    <div className={styles.list}>
      {/* ─── Global Material Actions ─── */}
      <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          className={styles.undoBtn}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last material change"
        >
          ↺ Undo Change
        </button>
      </div>

      <div className={styles.itemExpanded} style={{ marginTop: '12px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--text-color)', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', textAlign: 'center' }}>
          {material.name || 'Unnamed Material'}
        </h3>
        {/* Editor */}
        <MaterialEditor
          mat={material}
          onUpdate={(patch, skipUndo) => onUpdateMaterial(material.uuid, patch, skipUndo)}
          onApplyTextureUrl={(url) => onApplyTextureUrl(material.uuid, url)}
          onResetTexture={() => onResetTexture(material.uuid)}
          onPushUndo={onPushUndo}
        />
      </div>
    </div>
  )
}

import type { MaterialData, PBRTextureSet, GroupConfig } from '../../core/types'
import { MaterialEditor } from './MaterialEditor'
import styles from './MaterialPanel.module.css'

interface MaterialPanelProps {
  material: MaterialData
  canUndo: boolean
  activeGroupId: string | null
  onUpdateMaterial: (uuid: string, patch: Partial<MaterialData>, skipUndo?: boolean) => void
  onApplyTextureSet: (matUuid: string, texSet: PBRTextureSet) => Promise<void>
  onResetTexture: (matUuid: string) => void
  onUndo: () => void
  onPushUndo: () => void
  configGroups?: GroupConfig[]
}

export function MaterialPanel({
  material,
  canUndo,
  activeGroupId,
  onUpdateMaterial,
  onApplyTextureSet,
  onResetTexture,
  onUndo,
  onPushUndo,
  configGroups,
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
          activeGroupId={activeGroupId}
          onUpdate={(patch, skipUndo) => onUpdateMaterial(material.uuid, patch, skipUndo)}
          onApplyTextureSet={(texSet) => onApplyTextureSet(material.uuid, texSet)}
          onResetTexture={() => onResetTexture(material.uuid)}
          onPushUndo={onPushUndo}
          configGroups={configGroups}
        />
      </div>
    </div>
  )
}

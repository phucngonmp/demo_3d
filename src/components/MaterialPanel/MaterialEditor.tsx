import type { MaterialData, PBRTextureSet, GroupConfig } from '../../core/types'
import { useMemo } from 'react'
import styles from './MaterialEditor.module.css'

import { ALL_TEXTURE_SETS } from '../../utils/textureScanner'

const KITCHEN_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Matte Black', hex: '#222222' },
  { name: 'Warm Cream', hex: '#FDFBF7' },
  { name: 'Dove Gray', hex: '#E0E0E0' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Navy Blue', hex: '#1C2841' },
  { name: 'Sage Green', hex: '#8A9A86' },
  { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Wood Light', hex: '#D1BFAE' },
  { name: 'Wood Dark', hex: '#5C4033' },
]

interface MaterialEditorProps {
  mat: MaterialData
  activeGroupId?: string | null
  onUpdate: (patch: Partial<MaterialData>, skipUndo?: boolean) => void
  onApplyTextureSet: (tex: PBRTextureSet) => void
  onResetTexture: () => void
  onPushUndo: () => void
  configGroups?: GroupConfig[]
}

export function MaterialEditor({ mat, activeGroupId, onUpdate, onApplyTextureSet, onResetTexture, onPushUndo, configGroups }: MaterialEditorProps) {
  const availableTextures = useMemo(() => {
    if (!activeGroupId || !configGroups) return ALL_TEXTURE_SETS
    const group = configGroups.find(g => g.id === activeGroupId)
    if (!group || !group.textureCategories || group.textureCategories.length === 0) {
      return ALL_TEXTURE_SETS
    }
    return ALL_TEXTURE_SETS.filter(t => group.textureCategories!.includes(t.category))
  }, [activeGroupId, configGroups])
  return (
    <div className={styles.editor}>
      {/* ─── Base Color (Preset Swatches) ─── */}
      <div className={styles.fieldRow} style={{ alignItems: 'flex-start' }}>
        <label className={styles.fieldLabel} style={{ marginTop: '6px' }}>Colors</label>
        <div className={styles.swatchGrid}>
          {KITCHEN_COLORS.map((c) => {
            const isActive = mat.color.toUpperCase() === c.hex.toUpperCase()
            return (
              <button
                key={c.hex}
                className={`${styles.colorSwatch} ${isActive ? styles.activeSwatch : ''}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
                onClick={() => onUpdate({ color: c.hex })}
                aria-label={`Select color ${c.name}`}
              />
            )
          })}
        </div>
      </div>

      {/* ─── Texture Gallery ─── */}
      <div className={styles.gallery}>
        <div className={styles.galleryHeader}>
          <label className={styles.fieldLabel}>Textures</label>
          {mat.textureSet && (
            <button className={styles.clearTexBtn} onClick={onResetTexture}>
              ✕ Clear Texture
            </button>
          )}
        </div>
        <div className={styles.grid}>
          {availableTextures.map((tex) => (
            <img
              key={tex.id}
              src={tex.diffuse}
              alt={`Texture ${tex.id}`}
              title={tex.id}
              className={`${styles.thumbnail} ${mat.textureSet?.id === tex.id ? styles.active : ''}`}
              onClick={() => onApplyTextureSet(tex)}
            />
          ))}
        </div>
      </div>

      {/* ─── Texture Scale ─── */}
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>Tex Scale</label>
        <div className={styles.sliderWrap}>
          <input
            type="range"
            min="0.25"
            max="10"
            step="0.25"
            value={mat.textureScale ?? 2}
            onPointerDown={onPushUndo}
            onChange={(e) => onUpdate({ textureScale: parseFloat(e.target.value) }, true)}
            className={styles.slider}
            title="Texture Tiling Scale"
          />
          <span className={styles.sliderValue}>x{mat.textureScale ?? 4}</span>
        </div>
      </div>
    </div>
  )
}

import type { MaterialData } from '../../core/types'
import styles from './MaterialEditor.module.css'

// Scan all textures in the assets folder at build time
const textureFiles = import.meta.glob('../../assets/textures/*.{jpg,png,webp,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const textureUrls = Object.values(textureFiles)

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
  onUpdate: (patch: Partial<MaterialData>, skipUndo?: boolean) => void
  onApplyTextureUrl: (url: string) => void
  onResetTexture: () => void
  onPushUndo: () => void
}

export function MaterialEditor({ mat, onUpdate, onApplyTextureUrl, onResetTexture, onPushUndo }: MaterialEditorProps) {
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
          {mat.textureUrl && (
            <button className={styles.clearTexBtn} onClick={onResetTexture}>
              ✕ Clear Texture
            </button>
          )}
        </div>
        <div className={styles.grid}>
          {textureUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Texture ${i}`}
              className={`${styles.thumbnail} ${mat.textureUrl === url ? styles.active : ''}`}
              onClick={() => onApplyTextureUrl(url)}
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

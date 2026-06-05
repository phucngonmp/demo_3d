import type { MaterialData } from '../../core/types'
import styles from './MaterialEditor.module.css'

// Scan all textures in the assets folder at build time
const textureFiles = import.meta.glob('../../assets/textures/*.{jpg,png,webp,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const textureUrls = Object.values(textureFiles)

interface MaterialEditorProps {
  mat: MaterialData
  onUpdate: (patch: Partial<MaterialData>) => void
  onApplyTextureUrl: (url: string) => void
}

export function MaterialEditor({ mat, onUpdate, onApplyTextureUrl }: MaterialEditorProps) {
  return (
    <div className={styles.editor}>
      {/* ─── Base Color ─── */}
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>Base Color</label>
        <div className={styles.colorWrap}>
          <input
            type="color"
            value={mat.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className={styles.colorInput}
            title="Base color"
          />
          <span className={styles.hexVal}>{mat.color}</span>
        </div>
      </div>

      {/* ─── Texture Gallery ─── */}
      <div className={styles.gallery}>
        <label className={styles.fieldLabel}>Textures</label>
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
    </div>
  )
}


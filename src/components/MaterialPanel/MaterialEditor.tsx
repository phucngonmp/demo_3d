import { useRef } from 'react'
import type { MaterialData } from '../../core/types'
import styles from './MaterialEditor.module.css'

interface MaterialEditorProps {
  mat: MaterialData
  onUpdate: (patch: Partial<MaterialData>) => void
  onSwapTexture: (file: File) => Promise<void>
}

interface SliderRowProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}

function SliderRow({ label, value, min = 0, max = 1, step = 0.01, onChange }: SliderRowProps) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.sliderValue}>{value.toFixed(2)}</span>
      </div>
    </div>
  )
}

export function MaterialEditor({ mat, onUpdate, onSwapTexture }: MaterialEditorProps) {
  const texInputRef = useRef<HTMLInputElement>(null)

  const handleTexChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await onSwapTexture(file)
    e.target.value = ''
  }

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

      {/* ─── Roughness ─── */}
      <SliderRow
        label="Roughness"
        value={mat.roughness}
        onChange={(v) => onUpdate({ roughness: v })}
      />

      {/* ─── Metalness ─── */}
      <SliderRow
        label="Metalness"
        value={mat.metalness}
        onChange={(v) => onUpdate({ metalness: v })}
      />

      {/* ─── Emissive ─── */}
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>Emissive</label>
        <div className={styles.colorWrap}>
          <input
            type="color"
            value={mat.emissive}
            onChange={(e) => onUpdate({ emissive: e.target.value })}
            className={styles.colorInput}
            title="Emissive color"
          />
          <span className={styles.hexVal}>{mat.emissive}</span>
        </div>
      </div>

      {/* ─── Opacity ─── */}
      <SliderRow
        label="Opacity"
        value={mat.opacity}
        onChange={(v) => onUpdate({ opacity: v, transparent: v < 1 })}
      />

      {/* ─── Texture ─── */}
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>Texture</label>
        <div className={styles.textureWrap}>
          {mat.mapPreviewUrl ? (
            <img
              src={mat.mapPreviewUrl}
              alt="Texture preview"
              className={styles.texPreview}
            />
          ) : mat.hasMap ? (
            <span className={styles.texBadge}>✓ Has texture</span>
          ) : (
            <span className={styles.texBadge} style={{ color: 'var(--text-muted)' }}>None</span>
          )}
          <button
            className={styles.texBtn}
            onClick={() => texInputRef.current?.click()}
            title="Upload texture image"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Swap
          </button>
          <input
            ref={texInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleTexChange}
          />
        </div>
      </div>
    </div>
  )
}

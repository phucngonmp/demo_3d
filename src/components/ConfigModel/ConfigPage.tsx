import { useRef, useState, useCallback, useEffect } from 'react'
import { Viewport } from '../Viewport/Viewport'
import { DropZone } from '../DropZone/DropZone'
import { useModelViewer } from '../../hooks/useModelViewer'
import { calculateFileHash } from '../../utils/hash'
import { supabase } from '../../core/supabaseClient'
import type { MaterialData } from '../../core/types'
import styles from './ConfigPage.module.css'

// ── Types ──────────────────────────────────────────────────────────────────
type GroupConfig = {
  id: string
  name: string
  keywords: string[]
  materialUuids: string[] // uuids of materials manually assigned
}

// ── ConfigPage ───────────────────────────────────────────────────────────────
export function ConfigPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)

  // -- Config state --
  const [groups, setGroups] = useState<GroupConfig[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // -- UI state --
  const [selectedMatUuid, setSelectedMatUuid] = useState<string | null>(null)
  const [rawMaterials, setRawMaterials] = useState<MaterialData[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [isAddingGroup, setIsAddingGroup] = useState(false)

  // Re-use the viewer hook for Three.js + loadFile + loadModel + camera
  const {
    state,
    loadFile,
    focusCameraOnGroup,
    selectMaterial,
    pickMaterialAt,
  } = useModelViewer(containerRef)

  const fileHash = state.modelInfo?.fileHash || null
  const fileName = state.modelInfo?.fileName || ''

  // Intercept file loading to load model via existing hook
  const handleFileDrop = useCallback(async (file: File) => {
    // Load model into viewport via existing hook
    // The hook will compute the hash, set it in modelInfo, and trigger the useEffect below
    loadFile(file)
  }, [loadFile])

  // When a model is loaded and its hash is known, load its config from DB or LocalStorage
  useEffect(() => {
    let isMounted = true

    const loadConfig = async () => {
      if (!fileHash) {
        setGroups([])
        return
      }

      const { data } = await supabase
        .from('model_configs')
        .select('config_data')
        .eq('file_hash', fileHash)
        .single()

      if (!isMounted) return

      if (data?.config_data?.groups) {
        setGroups(data.config_data.groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          keywords: g.keywords || [],
          materialUuids: g.materialUuids || [],
        })))
      } else {
        setGroups([])
      }
    }

    loadConfig()

    return () => { isMounted = false }
  }, [fileHash])

  // ── Save helper: gọi trực tiếp khi có thao tác thay đổi ──────────────────
  const saveToDb = async (updatedGroups: GroupConfig[]) => {
    if (!fileHash) {
      console.warn('[saveToDb] Skipped: fileHash is null')
      return
    }
    setSaving(true)
    const configData = { groups: updatedGroups.map(g => ({ id: g.id, name: g.name, keywords: g.keywords })) }
    console.log('[saveToDb] Sending to Supabase:', { fileHash, configData })
    const { error, data } = await supabase
      .from('model_configs')
      .upsert({ file_hash: fileHash, name: fileName, config_data: configData }, { onConflict: 'file_hash' })
      .select()
    if (error) {
      console.error('[saveToDb] Error:', error)
    } else {
      console.log('[saveToDb] Success:', data)
    }
    setSaving(false)
  }

  // When model loads, extract raw material list from the scene
  // We re-derive from state.modelInfo once hasModel becomes true
  useEffect(() => {
    if (!state.hasModel) {
      setRawMaterials([])
    }
  }, [state.hasModel])

  // The hook's materialMap is built with grouping. For config page we need raw materials.
  // We'll use a separate listener on the scene to get raw names.
  // Re-using hook's materialMap but showing in "ungrouped" (raw) mode.
  // Actually we can reuse the existing hook's materialMap BUT the ConfigPage
  // will call a special callback to expose rawMaterials from the hook.
  // For now, we expose raw materials via a new exported ref from the hook via window event.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as MaterialData[]
      setRawMaterials(detail)
    }
    window.addEventListener('glb-config:rawMaterials', handler)
    return () => window.removeEventListener('glb-config:rawMaterials', handler)
  }, [])

  // ── Group operations ────────────────────────────────────────────────────
  const handleAddGroupSubmit = () => {
    const name = newGroupName.trim()
    if (!name) {
      setIsAddingGroup(false)
      return
    }
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')
    const newGroup = { id, name, keywords: [], materialUuids: [] }
    const updated = [...groups, newGroup]
    setGroups(updated)
    setNewGroupName('')
    setIsAddingGroup(false)
    saveToDb(updated)
  }

  const removeGroup = (gId: string) => {
    const updated = groups.filter(g => g.id !== gId)
    setGroups(updated)
    saveToDb(updated)
  }

  const removeKeyword = (gId: string, kw: string) => {
    const updated = groups.map(g =>
      g.id === gId ? { ...g, keywords: g.keywords.filter(k => k !== kw) } : g
    )
    setGroups(updated)
    saveToDb(updated)
  }

  const addKeyword = (gId: string, keyword: string) => {
    const kw = keyword.trim()
    if (!kw) return
    const updated = groups.map(g =>
      g.id === gId && !g.keywords.includes(kw)
        ? { ...g, keywords: [...g.keywords, kw] }
        : g
    )
    setGroups(updated)
    saveToDb(updated)
  }

  const assignMaterialToGroup = (gId: string) => {
    if (!selectedMatUuid) return
    const mat = rawMaterials.find(m => m.uuid === selectedMatUuid)
    if (!mat) return

    // Dùng tên đầy đủ của mesh, không rút gọn
    const matName = mat.name
    addKeyword(gId, matName)
    setSaveMsg(`✅ Đã gán "${matName}" vào nhóm!`)
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const handleSelectMat = (uuid: string) => {
    if (selectedMatUuid === uuid) {
      setSelectedMatUuid(null)
      selectMaterial(null)
    } else {
      setSelectedMatUuid(uuid)
      selectMaterial(uuid)
      focusCameraOnGroup(uuid)
    }
  }

  // Cuộn danh sách đến material đang được chọn
  useEffect(() => {
    if (selectedMatUuid) {
      const el = document.getElementById(`mat-${selectedMatUuid}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedMatUuid])

  const selectedMat = rawMaterials.find(m => m.uuid === selectedMatUuid)

  return (
    <div className={styles.root}>
      {/* ══ LEFT PANEL ══ */}
      <div className={styles.leftPanel}>
        {/* Viewport */}
        <div 
          className={styles.viewportWrap}
          onPointerDown={(e) => { pointerDownPos.current = { x: e.clientX, y: e.clientY } }}
          onPointerUp={(e) => {
            const dx = e.clientX - pointerDownPos.current.x
            const dy = e.clientY - pointerDownPos.current.y
            if (Math.hypot(dx, dy) < 5 && e.button === 0) {
              const matUuid = pickMaterialAt(e.clientX, e.clientY)
              if (matUuid) {
                handleSelectMat(matUuid)
              } else {
                setSelectedMatUuid(null)
              }
            }
          }}
        >
          <Viewport containerRef={containerRef} isDragOver={isDragOver} />
          {!state.hasModel && !state.isLoading && (
            <div className={styles.dropHint}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p>Kéo file .glb vào đây</p>
              <label className={styles.fileBtn}>
                Hoặc chọn file
                <input type="file" accept=".glb,.gltf" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleFileDrop(e.target.files[0]); e.target.value = '' }}
                />
              </label>
            </div>
          )}
          {state.isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <p>Đang tải model...</p>
            </div>
          )}
        </div>

        {/* Material list */}
        <div className={styles.matListWrap}>
          <div className={styles.matListHeader}>
            <span>📦 Danh sách Vật liệu ({rawMaterials.length})</span>
            {selectedMat && (
              <span className={styles.selectedLabel}>▶ {selectedMat.name}</span>
            )}
          </div>

          {rawMaterials.length === 0 ? (
            <p className={styles.emptyMsg}>
              {state.hasModel ? 'Không tìm thấy vật liệu.' : 'Chưa có model.'}
            </p>
          ) : (
            <div className={styles.matList}>
              {rawMaterials.map(mat => (
                <button
                  key={mat.uuid}
                  id={`mat-${mat.uuid}`}
                  className={`${styles.matItem} ${mat.uuid === selectedMatUuid ? styles.matItemActive : ''}`}
                  onClick={() => handleSelectMat(mat.uuid)}
                  title={mat.name}
                >
                  <span className={styles.matSwatch} style={{ background: mat.color }} />
                  <span className={styles.matName}>{mat.name || '(unnamed)'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Assign bar when material is selected */}
          {selectedMat && (
            <div className={styles.assignBar}>
              <span>Gán "<strong>{selectedMat.name}</strong>" vào nhóm:</span>
              <div className={styles.assignBtns}>
                {groups.map(g => (
                  <button key={g.id} className={styles.assignBtn} onClick={() => assignMaterialToGroup(g.id)}>
                    {g.name}
                  </button>
                ))}
                {groups.length === 0 && <em>Chưa có nhóm nào</em>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className={styles.rightPanel}>
        <div className={styles.rightHeader}>
          <div>
            <h2 className={styles.rightTitle}>⚙️ Cấu hình Nhóm Vật Liệu</h2>
            {fileHash ? (
              <p className={styles.hashLabel}>
                {fileName} &nbsp;·&nbsp; <code>{fileHash.substring(0, 12)}…</code>
              </p>
            ) : (
              <p className={styles.hashLabel}>Chưa có file</p>
            )}
          </div>
          <div style={{ fontSize: '13px', color: saving ? '#d97706' : '#15803d', fontWeight: 600 }}>
            {saving ? '⏳ Đang tự động lưu...' : fileHash ? '✅ Đã lưu tự động' : ''}
          </div>
        </div>

        {saveMsg && <div className={styles.saveMsg}>{saveMsg}</div>}

        {isAddingGroup ? (
          <div style={{ display: 'flex', gap: '8px', margin: '14px 20px 4px' }}>
            <input 
              autoFocus
              value={newGroupName} 
              onChange={e => setNewGroupName(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') handleAddGroupSubmit() }}
              placeholder="Tên nhóm (VD: Tủ Bếp)"
              className={styles.kwInput}
              style={{ flex: 1 }}
            />
            <button className={styles.saveBtn} style={{ padding: '6px 12px' }} onClick={handleAddGroupSubmit}>Thêm</button>
            <button className={styles.deleteBtn} style={{ padding: '6px 12px', background: '#fee2e2' }} onClick={() => { setIsAddingGroup(false); setNewGroupName('') }}>Hủy</button>
          </div>
        ) : (
          <button className={styles.addGroupBtn} onClick={() => setIsAddingGroup(true)}>+ Thêm Nhóm</button>
        )}

        <div className={styles.groupList}>
          {groups.length === 0 ? (
            <div className={styles.emptyGroup}>
              <p>Chưa có nhóm nào. Tạo nhóm đầu tiên!</p>
            </div>
          ) : (
            groups.map(g => (
              <div key={g.id} className={styles.groupCard}>
                <div className={styles.groupCardHeader}>
                  <div>
                    <strong>{g.name}</strong>
                    <code className={styles.groupId}>#{g.id}</code>
                  </div>
                  <button className={styles.deleteBtn} onClick={() => removeGroup(g.id)}>✕</button>
                </div>

                {/* Keywords */}
                <div className={styles.kwSection}>
                  <label className={styles.kwLabel}>Từ khoá nhận diện:</label>
                  <div className={styles.kwList}>
                    {g.keywords.map(kw => (
                      <span key={kw} className={styles.kwChip}>
                        {kw}
                        <button onClick={() => removeKeyword(g.id, kw)}>×</button>
                      </span>
                    ))}
                    {g.keywords.length === 0 && <em className={styles.emptyKw}>Chưa có từ khoá</em>}
                  </div>

                  {/* Manual keyword input */}
                  <AddKeywordInput onAdd={(kw) => addKeyword(g.id, kw)} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.tips}>
          <p>💡 <strong>Cách dùng:</strong> Chọn vật liệu ở bên trái → Nhấn vào tên nhóm trong ô "Gán vào nhóm" để thêm từ khoá tự động. Hoặc nhập tay từ khoá vào từng nhóm.</p>
        </div>
      </div>

      <DropZone onDrop={handleFileDrop} onDragStateChange={setIsDragOver} />
    </div>
  )
}

// ── Small helper component ───────────────────────────────────────────────────
function AddKeywordInput({ onAdd }: { onAdd: (kw: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') }}}
        placeholder="Nhập từ khoá rồi Enter..."
        className={styles.kwInput}
      />
      <button className={styles.kwAddBtn} onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') }}}>+</button>
    </div>
  )
}

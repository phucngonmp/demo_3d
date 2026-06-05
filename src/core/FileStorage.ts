/**
 * FileStorage — persist the last loaded GLB/GLTF file in IndexedDB
 * so it can be auto-restored after a page refresh.
 */

const DB_NAME = 'glb-viewer-db'
const DB_VERSION = 1
const STORE_NAME = 'files'
const FILE_KEY = 'last-model'

interface StoredFile {
  name: string
  data: ArrayBuffer
  type: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/** Persist the File to IndexedDB (overwrites previous entry) */
export async function saveFile(file: File): Promise<void> {
  try {
    const data = await file.arrayBuffer()
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const record: StoredFile = { name: file.name, data, type: file.type }
      store.put(record, FILE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (err) {
    console.warn('[FileStorage] Failed to save file:', err)
  }
}

/** Retrieve the last saved File from IndexedDB, or null if none */
export async function loadStoredFile(): Promise<File | null> {
  try {
    const db = await openDB()
    const record = await new Promise<StoredFile | undefined>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(FILE_KEY)
      req.onsuccess = () => resolve(req.result as StoredFile | undefined)
      req.onerror = () => resolve(undefined)
    })
    db.close()
    if (!record) return null
    return new File([record.data], record.name, {
      type: record.type || 'application/octet-stream',
    })
  } catch (err) {
    console.warn('[FileStorage] Failed to load stored file:', err)
    return null
  }
}

/** Remove the stored file (e.g. when user clears the model) */
export async function clearStoredFile(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(FILE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    // silently ignore
  }
}

// ── Material overrides (localStorage) ──────────────────────────────────────
// Small data (hex colors + numbers) so localStorage is fine here.

const OVERRIDES_KEY = 'glb-viewer:overrides'

export interface MaterialOverride {
  color?: string
  roughness?: number
  metalness?: number
  emissive?: string
  opacity?: number
  textureUrl?: string
  textureScale?: number
}


interface OverridesRecord {
  fileName: string
  materials: Record<string, MaterialOverride>  // keyed by material.name
}

/** Save material property overrides for a given file to localStorage */
export function saveOverrides(
  fileName: string,
  materials: Record<string, MaterialOverride>
): void {
  try {
    const record: OverridesRecord = { fileName, materials }
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(record))
  } catch { /* storage quota exceeded — ignore */ }
}

/**
 * Load saved overrides for a specific file.
 * Returns null if nothing is stored or the file doesn't match.
 */
export function loadOverrides(fileName: string): Record<string, MaterialOverride> | null {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return null
    const record: OverridesRecord = JSON.parse(raw)
    return record.fileName === fileName ? record.materials : null
  } catch {
    return null
  }
}

/** Remove stored material overrides */
export function clearOverrides(): void {
  localStorage.removeItem(OVERRIDES_KEY)
}

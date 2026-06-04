import { useEffect, useState } from 'react'
import styles from './DropZone.module.css'

interface DropZoneProps {
  onDrop: (file: File) => void
  onDragStateChange: (isDragging: boolean) => void
}

export function DropZone({ onDrop, onDragStateChange }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    let enterCount = 0 // track nested dragenter/dragleave

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      enterCount++
      if (enterCount === 1) {
        setIsOver(true)
        onDragStateChange(true)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      enterCount--
      if (enterCount === 0) {
        setIsOver(false)
        onDragStateChange(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      enterCount = 0
      setIsOver(false)
      onDragStateChange(false)

      const file = e.dataTransfer?.files?.[0]
      if (file) onDrop(file)
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onDrop, onDragStateChange])

  if (!isOver) return null

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p className={styles.title}>Drop to load model</p>
        <p className={styles.hint}>.glb / .gltf</p>
      </div>
    </div>
  )
}

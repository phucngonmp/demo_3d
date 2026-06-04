import { useRef, useEffect } from 'react'
import styles from './Viewport.module.css'

interface ViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  isDragOver: boolean
}

export function Viewport({ containerRef, isDragOver }: ViewportProps) {
  return (
    <div
      ref={containerRef}
      className={`${styles.viewport} ${isDragOver ? styles.dragOver : ''}`}
      id="three-viewport"
    />
  )
}

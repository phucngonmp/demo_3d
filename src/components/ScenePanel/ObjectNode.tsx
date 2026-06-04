import { useState } from 'react'
import type { SceneNode } from '../../core/types'
import styles from './ObjectNode.module.css'

interface ObjectNodeProps {
  node: SceneNode
  selectedUuid: string | null
  onSelect: (uuid: string | null) => void
  onToggleVisibility: (uuid: string, visible: boolean) => void
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'Mesh':
    case 'SkinnedMesh':
      return '◈'
    case 'Group':
      return '⊞'
    case 'Bone':
      return '⊹'
    case 'Light':
    case 'DirectionalLight':
    case 'PointLight':
      return '✦'
    default:
      return '○'
  }
}

function formatMeta(node: SceneNode): string {
  const parts = [node.type]
  if (node.children.length > 0) parts.push(`${node.children.length} child${node.children.length === 1 ? '' : 'ren'}`)
  if (node.materialIds.length > 0) parts.push(`${node.materialIds.length} material${node.materialIds.length === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function getCategoryLabel(node: SceneNode): string | null {
  switch (node.meshCategory) {
    case 'floor':
      return 'sàn'
    case 'wall':
      return 'tường'
    case 'tile':
      return 'gạch'
    case 'brick':
      return 'brick'
    default:
      return null
  }
}

export function ObjectNode({
  node,
  selectedUuid,
  onSelect,
  onToggleVisibility,
}: ObjectNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = node.uuid === selectedUuid

  return (
    <div className={styles.nodeWrapper}>
      {/* Row */}
      <div
        className={`${styles.row} ${isSelected ? styles.selected : ''} ${!node.visible ? styles.hidden : ''}`}
        style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
        onClick={() => onSelect(isSelected ? null : node.uuid)}
        role="treeitem"
        aria-selected={isSelected}
      >
        {/* Expand / collapse toggle */}
        <button
          className={styles.expandBtn}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Type icon */}
        <span className={styles.typeIcon}>{getTypeIcon(node.type)}</span>

        {/* Name */}
        <span className={styles.nameWrap} title={node.name}>
          <span className={styles.nameLine}>
            <span className={styles.name}>{node.name}</span>
            {getCategoryLabel(node) && (
              <span className={styles.categoryBadge}>{getCategoryLabel(node)}</span>
            )}
          </span>
          <span className={styles.meta}>{formatMeta(node)}</span>
        </span>

        {/* Visibility toggle */}
        <button
          className={`${styles.visBtn} ${node.visible ? '' : styles.visBtnOff}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility(node.uuid, !node.visible)
          }}
          title={node.visible ? 'Hide object' : 'Show object'}
          aria-label={node.visible ? 'Hide' : 'Show'}
        >
          {node.visible ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          )}
        </button>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className={styles.children} role="group">
          {node.children.map((child) => (
            <ObjectNode
              key={child.uuid}
              node={child}
              selectedUuid={selectedUuid}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
            />
          ))}
        </div>
      )}
    </div>
  )
}

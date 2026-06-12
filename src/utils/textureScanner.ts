import type { PBRTextureSet } from '../core/types'

// Scan all textures in the assets folder at build time
const textureFiles = import.meta.glob('../assets/textures/**/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const textureSetsRecord: Record<string, PBRTextureSet> = {}
Object.entries(textureFiles).forEach(([path, url]) => {
  const parts = path.split('/')
  const idxTextures = parts.indexOf('textures')
  
  if (idxTextures !== -1 && idxTextures + 1 < parts.length) {
    const filename = parts[parts.length - 1]
    const category = parts[idxTextures + 1]
    let id = ''
    let isSingleFile = false
    
    if (parts.length - 1 > idxTextures + 2) {
      // It's inside a sub-folder (e.g. textures/wall/wood_01/wood_diff.jpg)
      id = parts[parts.length - 2]
    } else {
      // Direct file under category (e.g. textures/wall/wood.jpg)
      id = filename.substring(0, filename.lastIndexOf('.')) || filename
      isSingleFile = true
    }
    
    const uniqueKey = `${category}/${id}`
    
    if (!textureSetsRecord[uniqueKey]) {
      textureSetsRecord[uniqueKey] = { id: uniqueKey, category, diffuse: '' }
    }
    
    const lower = filename.toLowerCase()
    if (isSingleFile || lower.includes('diff') || lower.includes('color') || lower.includes('albedo') || lower.includes('_col')) {
      textureSetsRecord[uniqueKey].diffuse = url
    } else if (lower.includes('nor') || lower.includes('nrm')) {
      textureSetsRecord[uniqueKey].normal = url
    } else if (lower.includes('rough')) {
      textureSetsRecord[uniqueKey].roughness = url
    } else if (lower.includes('ao') || lower.includes('ambient')) {
      textureSetsRecord[uniqueKey].ao = url
    }
  }
})

export const ALL_TEXTURE_SETS = Object.values(textureSetsRecord).filter(t => t.diffuse)

export const TEXTURES_BY_CATEGORY: Record<string, PBRTextureSet[]> = {}
ALL_TEXTURE_SETS.forEach(tex => {
  if (!TEXTURES_BY_CATEGORY[tex.category]) {
    TEXTURES_BY_CATEGORY[tex.category] = []
  }
  TEXTURES_BY_CATEGORY[tex.category].push(tex)
})

export const ALL_CATEGORIES = Object.keys(TEXTURES_BY_CATEGORY).sort()

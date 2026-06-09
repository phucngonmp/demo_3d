export interface CategoryConfig {
  id: string
  displayName: string
  keywords: string[]
  color: string
  folderName?: string
}

export const B2C_CATEGORIES: CategoryConfig[] = [
  {
    id: 'cat_ceiling',
    displayName: 'Trần Nhà',
    keywords: ['white_mate'],
    color: '#ffffff',
    folderName: 'ceiling'
  },
  {
    id: 'cat_wall',
    displayName: 'Tường',
    keywords: ['t_beige', 'Wall_Brown'],
    color: '#fefae0',
    folderName: 'wall'
  },
  {
    id: 'cat_wood_interior',
    displayName: 'Nội Thất Gỗ',
    keywords: ['beige_shine'],
    color: '#d4a373',
    folderName: 'wood furniture'
  },
  {
    id: 'cat_wood_kitchen',
    displayName: 'Gỗ Bếp',
    keywords: ['desk_brown'],
    color: '#faedcd',
    folderName: 'kitchen wood'
  },
  {
    id: 'cat_countertop',
    displayName: 'Mặt Bếp',
    keywords: ['desk_white_shine'],
    color: '#e9edc9',
    folderName: 'wood'
  },
  {
    id: 'cat_metal',
    displayName: 'Đồ Kim Loại',
    keywords: ['metal_mate'],
    color: '#a8dadc',
    folderName: 'metal'
  },
  {
    id: 'cat_stainless',
    displayName: 'Đồ Inox',
    keywords: ['metal_brown_mate'],
    color: '#9ca3af',
    folderName: 'inox'
  },
  {
    id: 'cat_floor',
    displayName: 'Sàn Nhà',
    keywords: ['floor', 'san_nha', 'wood_floor', "Ground"],
    color: '#cdb4db',
    folderName: 'floor'
  },
]

'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Settings, 
  X, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown,
  Search,
  RotateCcw,
  GripVertical,
  Check,
  Sparkles,
  Layout,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  List,
  Save,
  RefreshCw,
  Info
} from 'lucide-react'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  order: number
  width?: string
  fixed?: boolean
  category?: string
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
  onClose: () => void
  title?: string
  storageKey?: string
}

// Column categories for better organization
const COLUMN_CATEGORIES = {
  'core': { label: 'Core Information', icon: Layout, color: 'blue' },
  'project': { label: 'Project Details', icon: Grid3x3, color: 'purple' },
  'dates': { label: 'Dates & Timeline', icon: List, color: 'orange' },
  'financial': { label: 'Financial', icon: Sparkles, color: 'green' },
  'progress': { label: 'Progress & Status', icon: Filter, color: 'pink' },
  'other': { label: 'Other', icon: Info, color: 'gray' }
}

// Helper to categorize columns
const categorizeColumn = (columnId: string): string => {
  if (columnId.includes('select') || columnId.includes('actions')) return 'core'
  if (columnId.includes('project_info') || columnId.includes('project_name') || columnId.includes('project_code')) return 'core'
  if (columnId.includes('date') || columnId.includes('duration') || columnId.includes('timeline')) return 'dates'
  if (columnId.includes('amount') || columnId.includes('value') || columnId.includes('financial') || columnId.includes('cost')) return 'financial'
  if (columnId.includes('progress') || columnId.includes('status') || columnId.includes('kpi')) return 'progress'
  if (columnId.includes('division') || columnId.includes('scope') || columnId.includes('location') || columnId.includes('staff') || columnId.includes('party')) return 'project'
  return 'other'
}

export function ColumnCustomizer({ 
  columns, 
  onColumnsChange, 
  onClose, 
  title = "Customize Columns",
  storageKey 
}: ColumnCustomizerProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns)
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core', 'project', 'dates', 'progress', 'financial']))
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')

  // Load from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`column-config-${storageKey}`)
      if (saved) {
        try {
          const parsedColumns = JSON.parse(saved)
          setLocalColumns(parsedColumns)
          onColumnsChange(parsedColumns)
        } catch (error) {
          console.warn('Failed to load column configuration:', error)
        }
      }
    }
  }, [storageKey, onColumnsChange])

  // Save to localStorage
  const saveConfiguration = (newColumns: ColumnConfig[]) => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`column-config-${storageKey}`, JSON.stringify(newColumns))
    }
    onColumnsChange(newColumns)
  }

  // Group columns by category
  const groupedColumns = useMemo(() => {
    const groups: Record<string, ColumnConfig[]> = {}
    
    localColumns.forEach(col => {
      const category = col.category || categorizeColumn(col.id)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(col)
    })
    
    // Sort columns within each group by order
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.order - b.order)
    })
    
    return groups
  }, [localColumns])

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return localColumns
    
    const term = searchTerm.toLowerCase()
    return localColumns.filter(col => 
      col.label.toLowerCase().includes(term) ||
      col.id.toLowerCase().includes(term)
    )
  }, [localColumns, searchTerm])

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    const newColumns = localColumns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    setLocalColumns(newColumns)
    saveConfiguration(newColumns)
  }

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Move column
  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    const newColumns = [...localColumns]
    const [moved] = newColumns.splice(fromIndex, 1)
    newColumns.splice(toIndex, 0, moved)
    
    const updatedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }))
    setLocalColumns(updatedColumns)
    saveConfiguration(updatedColumns)
  }

  // Move column up
  const moveColumnUp = (index: number) => {
    if (index > 0) {
      moveColumn(index, index - 1)
    }
  }

  // Move column down
  const moveColumnDown = (index: number) => {
    if (index < localColumns.length - 1) {
      moveColumn(index, index + 1)
    }
  }

  // Show all columns
  const showAllColumns = () => {
    const newColumns = localColumns.map(col => ({ ...col, visible: true }))
    setLocalColumns(newColumns)
    saveConfiguration(newColumns)
  }

  // Hide all columns (except fixed)
  const hideAllColumns = () => {
    const newColumns = localColumns.map(col => ({ 
      ...col, 
      visible: col.fixed ? true : false 
    }))
    setLocalColumns(newColumns)
    saveConfiguration(newColumns)
  }

  // Reset to default
  const resetToDefault = () => {
    setLocalColumns(columns)
    saveConfiguration(columns)
    if (storageKey && typeof window !== 'undefined') {
      localStorage.removeItem(`column-config-${storageKey}`)
    }
  }

  // Toggle all columns in category
  const toggleCategoryColumns = (category: string, visible: boolean) => {
    const newColumns = localColumns.map(col => {
      const colCategory = col.category || categorizeColumn(col.id)
      if (colCategory === category && !col.fixed) {
        return { ...col, visible }
      }
      return col
    })
    setLocalColumns(newColumns)
    saveConfiguration(newColumns)
  }

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    moveColumn(draggedIndex, dropIndex)
    setDraggedIndex(null)
  }

  const visibleCount = localColumns.filter(c => c.visible).length
  const totalCount = localColumns.length

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {title}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Customize your table columns and their order
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search and Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search columns..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
              >
                {viewMode === 'grouped' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                {viewMode === 'grouped' ? 'Flat View' : 'Grouped View'}
              </button>
              
              <button
                onClick={showAllColumns}
                className="px-4 py-2.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Show All
              </button>
              
              <button
                onClick={hideAllColumns}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
              >
                <EyeOff className="h-4 w-4" />
                Hide All
              </button>
              
              <button
                onClick={resetToDefault}
                className="px-4 py-2.5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Columns</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{totalCount}</p>
                </div>
                <Layout className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Visible</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{visibleCount}</p>
                </div>
                <Eye className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Hidden</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{totalCount - visibleCount}</p>
                </div>
                <EyeOff className="h-8 w-8 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Columns List */}
          {viewMode === 'grouped' ? (
            // Grouped View
            <div className="space-y-4">
              {Object.entries(COLUMN_CATEGORIES).map(([categoryKey, categoryInfo]) => {
                const categoryColumns = groupedColumns[categoryKey] || []
                const filteredCategoryColumns = searchTerm 
                  ? categoryColumns.filter(col => 
                      col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      col.id.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  : categoryColumns
                
                if (filteredCategoryColumns.length === 0) return null
                
                const visibleInCategory = categoryColumns.filter(c => c.visible).length
                const totalInCategory = categoryColumns.length
                const isExpanded = expandedCategories.has(categoryKey)
                const CategoryIcon = categoryInfo.icon
                
                return (
                  <div 
                    key={categoryKey}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(categoryKey)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          categoryInfo.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          categoryInfo.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                          categoryInfo.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
                          categoryInfo.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                          categoryInfo.color === 'pink' ? 'bg-pink-100 dark:bg-pink-900/30' :
                          'bg-gray-100 dark:bg-gray-900/30'
                        }`}>
                          <CategoryIcon className={`h-5 w-5 ${
                            categoryInfo.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                            categoryInfo.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                            categoryInfo.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                            categoryInfo.color === 'green' ? 'text-green-600 dark:text-green-400' :
                            categoryInfo.color === 'pink' ? 'text-pink-600 dark:text-pink-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {categoryInfo.label}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {visibleInCategory} of {totalInCategory} visible
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategoryColumns(categoryKey, true)
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-green-600 dark:text-green-400"
                            title="Show all in category"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategoryColumns(categoryKey, false)
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400"
                            title="Hide all in category"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Category Columns */}
                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-2 transition-all duration-200">
                        {filteredCategoryColumns.map((column, index) => {
                          const actualIndex = localColumns.findIndex(c => c.id === column.id)
                          return (
                            <ColumnItem
                              key={column.id}
                              column={column}
                              index={actualIndex}
                              draggedIndex={draggedIndex}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              onToggle={toggleColumn}
                              onMoveUp={moveColumnUp}
                              onMoveDown={moveColumnDown}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // Flat View
            <div className="space-y-2">
              {filteredColumns.map((column, index) => (
                <ColumnItem
                  key={column.id}
                  column={column}
                  index={index}
                  draggedIndex={draggedIndex}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onToggle={toggleColumn}
                  onMoveUp={moveColumnUp}
                  onMoveDown={moveColumnDown}
                />
              ))}
              {filteredColumns.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No columns found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{visibleCount}</span> of{' '}
            <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> columns visible
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                saveConfiguration(localColumns)
                onClose()
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Column Item Component
interface ColumnItemProps {
  column: ColumnConfig
  index: number
  draggedIndex: number | null
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onToggle: (columnId: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

function ColumnItem({
  column,
  index,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onToggle,
  onMoveUp,
  onMoveDown
}: ColumnItemProps) {
  const isDragging = draggedIndex === index
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`
        group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200
        ${isDragging ? 'opacity-50 border-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}
        ${column.visible ? 'shadow-sm' : 'opacity-75'}
        cursor-move
      `}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Column Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h4 className={`font-semibold ${column.visible ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {column.label}
          </h4>
          {column.fixed && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
              Fixed
            </span>
          )}
          {column.visible ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {column.id}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Visibility Toggle */}
        <button
          onClick={() => onToggle(column.id)}
          disabled={column.fixed}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
            ${column.visible 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
            ${column.fixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {column.visible ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Hidden</span>
            </>
          )}
        </button>

        {/* Move Controls */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === column.order}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColumnCustomizer

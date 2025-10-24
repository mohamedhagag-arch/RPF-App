'use client'

import { useState, useEffect } from 'react'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { Input } from '@/components/ui/Input'
import { 
  Settings, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown,
  Search,
  RotateCcw
} from 'lucide-react'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  order: number
  width?: string
  fixed?: boolean
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
  onClose: () => void
  title?: string
  storageKey?: string
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

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    const newColumns = localColumns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    setLocalColumns(newColumns)
    saveConfiguration(newColumns)
  }

  // Move column up
  const moveColumnUp = (index: number) => {
    if (index > 0) {
      const newColumns = [...localColumns]
      const temp = newColumns[index]
      newColumns[index] = newColumns[index - 1]
      newColumns[index - 1] = temp
      
      // Update order
      const updatedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }))
      setLocalColumns(updatedColumns)
      saveConfiguration(updatedColumns)
    }
  }

  // Move column down
  const moveColumnDown = (index: number) => {
    if (index < localColumns.length - 1) {
      const newColumns = [...localColumns]
      const temp = newColumns[index]
      newColumns[index] = newColumns[index + 1]
      newColumns[index + 1] = temp
      
      // Update order
      const updatedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }))
      setLocalColumns(updatedColumns)
      saveConfiguration(updatedColumns)
    }
  }

  // Show all columns
  const showAllColumns = () => {
    const newColumns = localColumns.map(col => ({ ...col, visible: true }))
    setLocalColumns(newColumns)
    saveConfiguration(newColumns)
  }

  // Hide all columns
  const hideAllColumns = () => {
    const newColumns = localColumns.map(col => ({ ...col, visible: false }))
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

  // Filter columns based on search
  const filteredColumns = localColumns.filter(col => 
    col.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
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

    const newColumns = [...localColumns]
    const draggedItem = newColumns[draggedIndex]
    
    // Remove dragged item
    newColumns.splice(draggedIndex, 1)
    
    // Insert at new position
    const newIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
    newColumns.splice(newIndex, 0, draggedItem)
    
    // Update order
    const updatedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }))
    setLocalColumns(updatedColumns)
    saveConfiguration(updatedColumns)
    
    setDraggedIndex(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <ModernCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose which columns to display and their order
              </p>
            </div>
          </div>
          <ModernButton
            onClick={onClose}
            variant="ghost"
            size="sm"
            icon={<X className="h-4 w-4" />}
          >
            Close
          </ModernButton>
        </div>

        <div className="p-6 space-y-6">
          {/* Search and Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search columns..."
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <ModernButton
                onClick={showAllColumns}
                variant="outline"
                size="sm"
                icon={<Eye className="h-4 w-4" />}
              >
                Show All
              </ModernButton>
              <ModernButton
                onClick={hideAllColumns}
                variant="outline"
                size="sm"
                icon={<EyeOff className="h-4 w-4" />}
              >
                Hide All
              </ModernButton>
              <ModernButton
                onClick={resetToDefault}
                variant="outline"
                size="sm"
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Reset
              </ModernButton>
            </div>
          </div>

          {/* Columns List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredColumns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 text-gray-400 cursor-move">
                  <div className="w-4 h-4 flex flex-col gap-1">
                    <div className="w-full h-0.5 bg-current"></div>
                    <div className="w-full h-0.5 bg-current"></div>
                    <div className="w-full h-0.5 bg-current"></div>
                  </div>
                </div>

                {/* Column Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {column.label}
                    </h4>
                    {column.fixed && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                        Fixed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Column ID: {column.id}
                  </p>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center gap-2">
                  <ModernButton
                    onClick={() => toggleColumn(column.id)}
                    variant={column.visible ? "primary" : "outline"}
                    size="sm"
                    icon={column.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    disabled={column.fixed}
                  >
                    {column.visible ? 'Visible' : 'Hidden'}
                  </ModernButton>

                  {/* Move Controls */}
                  <div className="flex flex-col gap-1">
                    <ModernButton
                      onClick={() => moveColumnUp(index)}
                      variant="ghost"
                      size="sm"
                      icon={<ArrowUp className="h-3 w-3" />}
                      disabled={index === 0}
                      className="p-1 h-6 w-6"
                    >
                      ↑
                    </ModernButton>
                    <ModernButton
                      onClick={() => moveColumnDown(index)}
                      variant="ghost"
                      size="sm"
                      icon={<ArrowDown className="h-3 w-3" />}
                      disabled={index === localColumns.length - 1}
                      className="p-1 h-6 w-6"
                    >
                      ↓
                    </ModernButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{localColumns.filter(c => c.visible).length}</strong> of <strong>{localColumns.length}</strong> columns visible
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Drag to reorder • Click to toggle visibility
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <ModernButton
            onClick={onClose}
            variant="outline"
          >
            Close
          </ModernButton>
        </div>
      </ModernCard>
    </div>
  )
}

export default ColumnCustomizer

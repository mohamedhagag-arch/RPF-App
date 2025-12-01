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
  Info,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Edit2,
  MoreVertical,
  Copy
} from 'lucide-react'
import { savedViewsManager } from '@/lib/savedViewsManager'
import { supabase } from '@/lib/supabase'

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

interface SavedView {
  id: string
  name: string
  columns: ColumnConfig[]
  createdAt: string
  isDefault?: boolean
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
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [currentViewId, setCurrentViewId] = useState<string | null>(null)
  const [showSaveViewModal, setShowSaveViewModal] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [showViewMenu, setShowViewMenu] = useState<string | null>(null)

  // Load saved views from Supabase
  useEffect(() => {
    const loadViews = async () => {
      if (!storageKey) return

      try {
        // Load saved views from database
        const dbViews = await savedViewsManager.loadSavedViews(storageKey)
        
        if (dbViews.length > 0) {
          // Convert DB format to component format
          const views: SavedView[] = dbViews.map(view => ({
            id: view.id,
            name: view.view_name,
            columns: view.columns,
            createdAt: view.created_at,
            isDefault: view.is_default
          }))
          
          setSavedViews(views)
          
          // Find default view or first view
          const defaultView = views.find(v => v.isDefault) || views[0]
          if (defaultView) {
            setCurrentViewId(defaultView.id)
            
            // Merge saved columns with current columns to ensure new columns are included
            const currentIds = new Set(columns.map(c => c.id))
            const savedIds = new Set(defaultView.columns.map((c: ColumnConfig) => c.id))
            
            // Merge: use saved settings for existing columns, add new columns from defaults
            const mergedColumns = columns.map(defaultCol => {
              const savedCol = defaultView.columns.find((c: ColumnConfig) => c.id === defaultCol.id)
              if (savedCol) {
                return { ...defaultCol, visible: savedCol.visible, order: savedCol.order }
              }
              return defaultCol
            })
            
            // Add any saved columns that don't exist in defaults (for backwards compatibility)
            const newSavedColumns = defaultView.columns.filter((c: ColumnConfig) => !currentIds.has(c.id))
            const finalColumns = [...mergedColumns, ...newSavedColumns].sort((a, b) => a.order - b.order)
            
            setLocalColumns(finalColumns)
            onColumnsChange(finalColumns)
          }
        } else {
          // Fallback to localStorage if no views in database
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`column-config-${storageKey}`)
            if (saved) {
              try {
                const parsedColumns = JSON.parse(saved)
                
                // Merge saved columns with current columns to ensure new columns are included
                const currentIds = new Set(columns.map(c => c.id))
                const savedIds = new Set(parsedColumns.map((c: ColumnConfig) => c.id))
                
                // Merge: use saved settings for existing columns, add new columns from defaults
                const mergedColumns = columns.map(defaultCol => {
                  const savedCol = parsedColumns.find((c: ColumnConfig) => c.id === defaultCol.id)
                  if (savedCol) {
                    return { ...defaultCol, visible: savedCol.visible, order: savedCol.order }
                  }
                  return defaultCol
                })
                
                // Add any saved columns that don't exist in defaults (for backwards compatibility)
                const newSavedColumns = parsedColumns.filter((c: ColumnConfig) => !currentIds.has(c.id))
                const finalColumns = [...mergedColumns, ...newSavedColumns].sort((a, b) => a.order - b.order)
                
                setLocalColumns(finalColumns)
                onColumnsChange(finalColumns)
              } catch (error) {
                console.warn('Failed to load column configuration:', error)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved views from database:', error)
        // Fallback to localStorage on error
        if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`column-config-${storageKey}`)
      if (saved) {
        try {
          const parsedColumns = JSON.parse(saved)
              
              // Merge saved columns with current columns to ensure new columns are included
              const currentIds = new Set(columns.map(c => c.id))
              const savedIds = new Set(parsedColumns.map((c: ColumnConfig) => c.id))
              
              // Merge: use saved settings for existing columns, add new columns from defaults
              const mergedColumns = columns.map(defaultCol => {
                const savedCol = parsedColumns.find((c: ColumnConfig) => c.id === defaultCol.id)
                if (savedCol) {
                  return { ...defaultCol, visible: savedCol.visible, order: savedCol.order }
                }
                return defaultCol
              })
              
              // Add any saved columns that don't exist in defaults (for backwards compatibility)
              const newSavedColumns = parsedColumns.filter((c: ColumnConfig) => !currentIds.has(c.id))
              const finalColumns = [...mergedColumns, ...newSavedColumns].sort((a, b) => a.order - b.order)
              
              setLocalColumns(finalColumns)
              onColumnsChange(finalColumns)
        } catch (error) {
          console.warn('Failed to load column configuration:', error)
            }
          }
        }
      }
    }

    loadViews()
  }, [storageKey, onColumnsChange, columns])

  // Save configuration and update current view
  const saveConfiguration = async (newColumns: ColumnConfig[]) => {
    if (!storageKey) {
      onColumnsChange(newColumns)
      return
    }

    // Update current view if one is selected
    if (currentViewId) {
      try {
        await savedViewsManager.updateView(currentViewId, { columns: newColumns })
        
        // Update local state
        const updatedViews = savedViews.map(view => 
          view.id === currentViewId 
            ? { ...view, columns: newColumns }
            : view
        )
        setSavedViews(updatedViews)
      } catch (error) {
        console.error('Error updating view in database:', error)
        // Fallback to localStorage on error
        if (typeof window !== 'undefined') {
          localStorage.setItem(`column-config-${storageKey}`, JSON.stringify(newColumns))
        }
      }
    } else {
      // Save to localStorage as fallback if no view is selected
      if (typeof window !== 'undefined') {
      localStorage.setItem(`column-config-${storageKey}`, JSON.stringify(newColumns))
      }
    }
    
    onColumnsChange(newColumns)
  }

  // Save new view
  const handleSaveView = async () => {
    if (!newViewName.trim() || !storageKey) return
    
    console.log('💾 ColumnCustomizer: Starting save view process', { viewName: newViewName.trim(), storageKey })
    
    try {
      const isDefault = savedViews.length === 0 // First view is default
      
      // Check authentication status first
      console.log('🔍 ColumnCustomizer: Checking authentication...')
      let sessionCheck = await supabase.auth.getSession()
      console.log('🔍 ColumnCustomizer: Session check result:', { 
        hasSession: !!sessionCheck.data?.session, 
        userId: sessionCheck.data?.session?.user?.id,
        email: sessionCheck.data?.session?.user?.email 
      })
      
      if (!sessionCheck.data?.session) {
        // Try refreshing the session
        console.log('🔄 ColumnCustomizer: No session found, attempting to refresh...')
        const refreshResult = await supabase.auth.refreshSession()
        console.log('🔄 ColumnCustomizer: Refresh result:', { 
          hasSession: !!refreshResult.data?.session,
          error: refreshResult.error?.message 
        })
        await new Promise(resolve => setTimeout(resolve, 500))
        sessionCheck = await supabase.auth.getSession()
        console.log('🔍 ColumnCustomizer: Session after refresh:', { 
          hasSession: !!sessionCheck.data?.session,
          userId: sessionCheck.data?.session?.user?.id 
        })
      }
      
      if (!sessionCheck.data?.session) {
        console.error('❌ ColumnCustomizer: No session available after refresh attempts')
        // User is not logged in - save locally and show warning
        const fallbackView: SavedView = {
          id: `view-${Date.now()}`,
          name: newViewName.trim(),
          columns: localColumns,
          createdAt: new Date().toISOString(),
          isDefault: isDefault
        }
        
        const updatedViews = [...savedViews, fallbackView]
        setSavedViews(updatedViews)
        setCurrentViewId(fallbackView.id)
        setShowSaveViewModal(false)
        setNewViewName('')
        
        // Save to localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem(`saved-views-${storageKey}`, JSON.stringify(updatedViews))
        }
        
        alert('View saved locally (not synced to database). Please ensure you are logged in for cloud sync.')
        return
      }
      
      // Try to save to database
      console.log('💾 ColumnCustomizer: Attempting to save to database...')
      let savedView = await savedViewsManager.saveView(
        storageKey,
        newViewName.trim(),
        localColumns,
        isDefault
      )
      
      // If save failed and we have a session, retry once more
      if (!savedView && sessionCheck.data?.session) {
        console.log('🔄 ColumnCustomizer: First save attempt failed, retrying...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Double-check session before retry
        const retrySessionCheck = await supabase.auth.getSession()
        if (retrySessionCheck.data?.session) {
          savedView = await savedViewsManager.saveView(
            storageKey,
            newViewName.trim(),
            localColumns,
            isDefault
          )
          console.log('🔄 ColumnCustomizer: Retry result:', { success: !!savedView })
        } else {
          console.error('❌ ColumnCustomizer: Session lost during retry')
        }
      }
      
      if (savedView) {
        console.log('✅ ColumnCustomizer: View saved successfully:', savedView.id)
        const newView: SavedView = {
          id: savedView.id,
          name: savedView.view_name,
          columns: savedView.columns,
          createdAt: savedView.created_at,
          isDefault: savedView.is_default
        }
        
        const updatedViews = [...savedViews, newView]
        setSavedViews(updatedViews)
        setCurrentViewId(newView.id)
        setShowSaveViewModal(false)
        setNewViewName('')
      } else {
        // If database save failed, check if user is still logged in
        const finalSessionCheck = await supabase.auth.getSession()
        if (!finalSessionCheck.data?.session) {
          // User is not logged in - save locally and show warning
          console.warn('❌ ColumnCustomizer: User not authenticated, saving locally only')
          const fallbackView: SavedView = {
            id: `view-${Date.now()}`,
            name: newViewName.trim(),
            columns: localColumns,
            createdAt: new Date().toISOString(),
            isDefault: isDefault
          }
          
          const updatedViews = [...savedViews, fallbackView]
          setSavedViews(updatedViews)
          setCurrentViewId(fallbackView.id)
          setShowSaveViewModal(false)
          setNewViewName('')
          
          // Save to localStorage as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem(`saved-views-${storageKey}`, JSON.stringify(updatedViews))
          }
          
          alert('View saved locally (not synced to database). Please ensure you are logged in for cloud sync.')
        } else {
          // User is logged in but save failed - this is a different error
          console.error('❌ ColumnCustomizer: User is authenticated but save failed - database error')
          console.error('❌ ColumnCustomizer: Check browser console above for detailed error messages')
          console.error('❌ ColumnCustomizer: Possible causes:')
          console.error('   1. Table "saved_views" does not exist - Run Database/create-saved-views-table.sql')
          console.error('   2. RLS policies blocking insert - Check Database/verify-saved-views-table.sql')
          console.error('   3. Database connection issue')
          console.error('   4. User permissions issue')
          
          // Try to get more info about the error
          console.error('❌ ColumnCustomizer: Attempting to diagnose the issue...')
          
          // Check if table exists by trying to select from it
          const tableCheck = await supabase
            .from('saved_views')
            .select('id')
            .limit(1)
          
          if (tableCheck.error) {
            console.error('❌ ColumnCustomizer: Table check failed:', tableCheck.error)
            if (tableCheck.error.code === 'PGRST116' || tableCheck.error.message?.includes('does not exist')) {
              alert(
                '❌ Table "saved_views" does not exist!\n\n' +
                'Please:\n' +
                '1. Open Supabase SQL Editor\n' +
                '2. Run: Database/create-saved-views-table.sql\n' +
                '3. Try saving the view again'
              )
              return
            }
          } else {
            console.log('✅ ColumnCustomizer: Table exists and is accessible')
            console.error('❌ ColumnCustomizer: Issue is likely with RLS policies or insert permissions')
            alert(
              'Failed to save view to database.\n\n' +
              'The table exists but insert failed.\n' +
              'Possible causes:\n' +
              '1. RLS policy blocking insert\n' +
              '2. User permissions issue\n\n' +
              'Check browser console (F12) for details.'
            )
          }
        }
      }
    } catch (error: any) {
      console.error('❌ ColumnCustomizer: Exception saving view:', error)
      console.error('❌ ColumnCustomizer: Error details:', {
        message: error?.message,
        stack: error?.stack
      })
      alert(`Error saving view: ${error?.message || 'Unknown error'}. Please check the browser console for details.`)
    }
  }

  // Load view
  const loadView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId)
    if (view) {
      setLocalColumns(view.columns)
      setCurrentViewId(viewId)
      onColumnsChange(view.columns)
    }
  }

  // Delete view
  const deleteView = async (viewId: string) => {
    try {
      const success = await savedViewsManager.deleteView(viewId)
      
      if (success) {
        const updatedViews = savedViews.filter(v => v.id !== viewId)
        setSavedViews(updatedViews)
        setShowViewMenu(null)
        
        if (viewId === currentViewId) {
          if (updatedViews.length > 0) {
            const defaultView = updatedViews.find(v => v.isDefault) || updatedViews[0]
            loadView(defaultView.id)
          } else {
            setCurrentViewId(null)
            setLocalColumns(columns)
            onColumnsChange(columns)
          }
        }
      } else {
        console.error('Failed to delete view')
        alert('Failed to delete view. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting view:', error)
      alert('Error deleting view. Please try again.')
    }
  }

  // Set default view
  const setDefaultView = async (viewId: string) => {
    try {
      const success = await savedViewsManager.setDefaultView(viewId)
      
      if (success) {
        const updatedViews = savedViews.map(v => ({
          ...v,
          isDefault: v.id === viewId
        }))
        setSavedViews(updatedViews)
        setShowViewMenu(null)
      } else {
        console.error('Failed to set default view')
        alert('Failed to set default view. Please try again.')
      }
    } catch (error) {
      console.error('Error setting default view:', error)
      alert('Error setting default view. Please try again.')
    }
  }

  // Duplicate view
  const duplicateView = async (viewId: string) => {
    try {
      const savedView = await savedViewsManager.duplicateView(viewId)
      
      if (savedView) {
        const newView: SavedView = {
          id: savedView.id,
          name: savedView.view_name,
          columns: savedView.columns,
          createdAt: savedView.created_at,
          isDefault: savedView.is_default
        }
        
        const updatedViews = [...savedViews, newView]
        setSavedViews(updatedViews)
        setShowViewMenu(null)
      } else {
        console.error('Failed to duplicate view')
        alert('Failed to duplicate view. Please try again.')
      }
    } catch (error) {
      console.error('Error duplicating view:', error)
      alert('Error duplicating view. Please try again.')
    }
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

  // Close view menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showViewMenu) {
        setShowViewMenu(null)
      }
    }
    
    if (showViewMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showViewMenu])

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
          
          {/* Saved Views Section */}
          <div className="relative mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                <span className="text-sm font-medium">Saved Views:</span>
              </div>
              
              {savedViews.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {savedViews.map((view) => (
                    <div key={view.id} className="relative group">
                      <button
                        onClick={() => loadView(view.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          currentViewId === view.id
                            ? 'bg-white text-blue-700 shadow-lg'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {view.isDefault && <Bookmark className="h-3 w-3" />}
                        {view.name}
                      </button>
                      
                      <button
                        onClick={() => setShowViewMenu(showViewMenu === view.id ? null : view.id)}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View options"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </button>
                      
                      {showViewMenu === view.id && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                          <button
                            onClick={() => {
                              setDefaultView(view.id)
                              setShowViewMenu(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Bookmark className="h-4 w-4" />
                            Set as Default
                          </button>
                          <button
                            onClick={() => {
                              duplicateView(view.id)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${view.name}"?`)) {
                                deleteView(view.id)
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowViewMenu(null)
                  setShowSaveViewModal(true)
                }}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save View
              </button>
            </div>
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
            {currentViewId && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                • View: {savedViews.find(v => v.id === currentViewId)?.name || 'Current'}
              </span>
            )}
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

      {/* Save View Modal */}
      {showSaveViewModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSaveViewModal(false)
              setNewViewName('')
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Save Current View
              </h3>
              <button
                onClick={() => {
                  setShowSaveViewModal(false)
                  setNewViewName('')
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  View Name
                </label>
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newViewName.trim()) {
                      handleSaveView()
                    }
                  }}
                  placeholder="e.g., Financial View, Default View"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowSaveViewModal(false)
                    setNewViewName('')
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveView}
                  disabled={!newViewName.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

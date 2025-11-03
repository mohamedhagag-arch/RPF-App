'use client'

import { useState, useEffect, useCallback } from 'react'
import { ColumnConfig } from '@/components/ui/ColumnCustomizer'

interface UseColumnCustomizationProps {
  defaultColumns: ColumnConfig[]
  storageKey: string
}

export function useColumnCustomization({ 
  defaultColumns, 
  storageKey 
}: UseColumnCustomizationProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns)
  const [showCustomizer, setShowCustomizer] = useState(false)

  // Load configuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`column-config-${storageKey}`)
      if (saved) {
        try {
          const parsedColumns = JSON.parse(saved)
          const defaultIds = new Set(defaultColumns.map(c => c.id))
          const savedIds = new Set(parsedColumns.map((c: ColumnConfig) => c.id))
          
          // Check if key columns exist in defaults but not in saved (structure changed)
          const hasNewMergedColumn = defaultIds.has('project_info_merged')
          const hasOldSeparateColumns = savedIds.has('project_code') || savedIds.has('project_name') || savedIds.has('plot_number')
          
          // If we have new merged column in defaults but old separate columns in saved, reset
          if (hasNewMergedColumn && hasOldSeparateColumns && storageKey === 'projects') {
            console.log(`Projects table structure changed (merged columns), resetting to defaults`)
            localStorage.removeItem(`column-config-${storageKey}`)
            setColumns(defaultColumns)
            return
          }
          
          // If structure changed significantly (more than 30% difference), reset to defaults
          const intersection = new Set(Array.from(defaultIds).filter(id => savedIds.has(id)))
          const similarity = intersection.size / Math.max(defaultIds.size, savedIds.size)
          
          if (similarity < 0.7 || parsedColumns.length === 0) {
            // Structure changed significantly or invalid, reset to defaults
            console.log(`Column structure changed for ${storageKey}, resetting to defaults`)
            localStorage.removeItem(`column-config-${storageKey}`)
            setColumns(defaultColumns)
          } else {
            // Merge saved columns with defaults to ensure new columns are included
            const mergedColumns = defaultColumns.map(defaultCol => {
              const savedCol = parsedColumns.find((c: ColumnConfig) => c.id === defaultCol.id)
              if (savedCol) {
                return { ...defaultCol, visible: savedCol.visible, order: savedCol.order }
              }
              return defaultCol
            })
            // Add any saved columns that don't exist in defaults (for backwards compatibility)
            const newSavedColumns = parsedColumns.filter((c: ColumnConfig) => !defaultIds.has(c.id))
            const finalColumns = [...mergedColumns, ...newSavedColumns].sort((a, b) => a.order - b.order)
            setColumns(finalColumns)
          }
        } catch (error) {
          console.warn('Failed to load column configuration:', error)
          setColumns(defaultColumns)
        }
      } else {
        setColumns(defaultColumns)
      }
    }
  }, [defaultColumns, storageKey])

  // Save configuration to localStorage
  const saveConfiguration = useCallback((newColumns: ColumnConfig[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`column-config-${storageKey}`, JSON.stringify(newColumns))
    }
    setColumns(newColumns)
  }, [storageKey])

  // Get visible columns in order
  const getVisibleColumns = useCallback(() => {
    return columns
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order)
  }, [columns])

  // Get column by ID
  const getColumn = useCallback((id: string) => {
    return columns.find(col => col.id === id)
  }, [columns])

  // Check if column is visible
  const isColumnVisible = useCallback((id: string) => {
    const column = getColumn(id)
    return column?.visible ?? true
  }, [getColumn])

  // Toggle column visibility
  const toggleColumn = useCallback((id: string) => {
    const newColumns = columns.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    )
    saveConfiguration(newColumns)
  }, [columns, saveConfiguration])

  // Reset to default
  const resetToDefault = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`column-config-${storageKey}`)
    }
    setColumns(defaultColumns)
  }, [defaultColumns, storageKey])

  // Open customizer
  const openCustomizer = useCallback(() => {
    setShowCustomizer(true)
  }, [])

  // Close customizer
  const closeCustomizer = useCallback(() => {
    setShowCustomizer(false)
  }, [])

  return {
    columns,
    visibleColumns: getVisibleColumns(),
    showCustomizer,
    openCustomizer,
    closeCustomizer,
    saveConfiguration,
    getColumn,
    isColumnVisible,
    toggleColumn,
    resetToDefault
  }
}

export default useColumnCustomization


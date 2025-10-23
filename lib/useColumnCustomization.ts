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
          setColumns(parsedColumns)
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


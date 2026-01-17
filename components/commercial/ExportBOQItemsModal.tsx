'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Download, FileSpreadsheet, FileText, CheckSquare, Square } from 'lucide-react'
import { exportData, generateFilename, ExportFormat } from '@/lib/exportImportUtils'
import { CommercialBOQItem } from '@/lib/supabase'

interface ExportBOQItemsModalProps {
  isOpen: boolean
  onClose: () => void
  items: CommercialBOQItem[]
}

interface ColumnOption {
  key: string
  label: string
  selected: boolean
}

// Define all available columns with user-friendly labels (outside component to avoid recreation)
const allColumns: ColumnOption[] = [
  { key: 'auto_generated_unique_reference_number', label: 'Ref Number', selected: true },
  { key: 'external_ref_no', label: 'External Ref no.', selected: true },
  { key: 'project_full_code', label: 'Project Full Code', selected: true },
  { key: 'project_name', label: 'Project Name', selected: true },
  { key: 'item_description', label: 'Item Description', selected: true },
  { key: 'unit', label: 'Unit', selected: true },
  { key: 'quantity', label: 'Quantity', selected: true },
  { key: 'rate', label: 'Rate', selected: true },
  { key: 'total_value', label: 'Total Value', selected: true },
  { key: 'remeasurable', label: 'Remeasurable', selected: true },
  { key: 'planning_assigned_amount', label: 'Planning Assigned Amount', selected: true },
  { key: 'units_variation', label: 'Units Variation', selected: true },
  { key: 'variations_amount', label: 'Variations Amount', selected: true },
  { key: 'total_units', label: 'Total Units', selected: true },
  { key: 'total_including_variations', label: 'Total Including Variations', selected: true },
  { key: 'created_at', label: 'Created At', selected: false },
  { key: 'updated_at', label: 'Updated At', selected: false },
]

export function ExportBOQItemsModal({ isOpen, onClose, items }: ExportBOQItemsModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')
  const [exporting, setExporting] = useState(false)
  const [success, setSuccess] = useState('')

  // Initialize selected columns on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultSelected = new Set(
        allColumns.filter(col => col.selected).map(col => col.key)
      )
      setSelectedColumns(defaultSelected)
    }
  }, [isOpen])

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedColumns(new Set(allColumns.map(col => col.key)))
  }

  const deselectAll = () => {
    setSelectedColumns(new Set())
  }

  const handleExport = async () => {
    if (selectedColumns.size === 0) {
      alert('Please select at least one column to export')
      return
    }

    if (items.length === 0) {
      alert('No items to export')
      return
    }

    try {
      setExporting(true)

      // Prepare export data with only selected columns and raw numbers
      const exportDataArray = items.map(item => {
        const row: any = {}
        selectedColumns.forEach(columnKey => {
          const value = item[columnKey as keyof CommercialBOQItem]
          
          // Use raw numbers for numeric fields (no formatting)
          if (typeof value === 'number') {
            row[allColumns.find(col => col.key === columnKey)?.label || columnKey] = value
          } else if (typeof value === 'boolean') {
            row[allColumns.find(col => col.key === columnKey)?.label || columnKey] = value ? 'Yes' : 'No'
          } else if (value === null || value === undefined) {
            row[allColumns.find(col => col.key === columnKey)?.label || columnKey] = ''
          } else {
            row[allColumns.find(col => col.key === columnKey)?.label || columnKey] = String(value)
          }
        })
        return row
      })

      // Get column labels in order
      const columnLabels = allColumns
        .filter(col => selectedColumns.has(col.key))
        .map(col => col.label)

      const filename = generateFilename('BOQ_Items')
      
      await exportData(
        exportDataArray,
        filename,
        exportFormat,
        {
          columns: columnLabels,
          sheetName: 'BOQ Items'
        }
      )

      setSuccess('Export completed successfully!')
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error: any) {
      console.error('Export error:', error)
      alert('An error occurred during export: ' + (error.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Export BOQ Items</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Export Format Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Export Format
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    exportFormat === 'excel'
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    exportFormat === 'csv'
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  CSV (.csv)
                </button>
              </div>
            </div>

            {/* Column Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Columns ({selectedColumns.size} selected)
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {allColumns.map(column => (
                    <button
                      key={column.key}
                      onClick={() => toggleColumn(column.key)}
                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                    >
                      {selectedColumns.has(column.key) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {column.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Exporting:</strong> {items.length} filtered item(s)
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Currency values will be exported as raw numbers (no formatting)
              </p>
            </div>

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedColumns.size === 0 || items.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react'
import { exportData, generateFilename, ExportFormat } from '@/lib/exportImportUtils'

interface ExportButtonProps {
  data: any[]
  filename: string
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  formats?: ExportFormat[]
  columns?: string[]
  sheetName?: string
  disabled?: boolean
}

export function ExportButton({
  data,
  filename,
  label = 'Export',
  variant = 'outline',
  className = '',
  formats = ['csv', 'excel'],
  columns,
  sheetName,
  disabled = false
}: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true)
      setShowMenu(false)
      
      const filenameWithDate = generateFilename(filename)
      await exportData(data, filenameWithDate, format, { columns, sheetName })
      
      // Success notification
      console.log(`✅ Successfully exported ${data.length} records`)
    } catch (error) {
      console.error('❌ Export error:', error)
      alert('An error occurred during export')
    } finally {
      setExporting(false)
    }
  }

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4" />
      case 'csv':
        return <FileText className="w-4 h-4" />
      case 'json':
        return <FileJson className="w-4 h-4" />
    }
  }

  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case 'excel':
        return 'Excel (.xlsx)'
      case 'csv':
        return 'CSV (.csv)'
      case 'json':
        return 'JSON (.json)'
    }
  }

  // If only one format, export directly
  if (formats.length === 1) {
    return (
      <Button
        variant={variant}
        onClick={() => handleExport(formats[0])}
        disabled={disabled || exporting || data.length === 0}
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        {exporting ? 'Exporting...' : label}
      </Button>
    )
  }

  // Multiple formats - show dropdown
  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || exporting || data.length === 0}
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        {exporting ? 'Exporting...' : label}
      </Button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            <div className="py-1">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  className="w-full px-4 py-2 text-sm text-right flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {getFormatIcon(format)}
                  <span>{getFormatLabel(format)}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data.length} records
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Quick Export Button (CSV only)
 */
export function QuickExportButton({
  data,
  filename,
  label = 'Export CSV',
  className = ''
}: {
  data: any[]
  filename: string
  label?: string
  className?: string
}) {
  return (
    <ExportButton
      data={data}
      filename={filename}
      label={label}
      formats={['csv']}
      variant="outline"
      className={className}
    />
  )
}

/**
 * Excel Export Button
 */
export function ExcelExportButton({
  data,
  filename,
  label = 'Export Excel',
  sheetName,
  className = ''
}: {
  data: any[]
  filename: string
  label?: string
  sheetName?: string
  className?: string
}) {
  return (
    <ExportButton
      data={data}
      filename={filename}
      label={label}
      formats={['excel']}
      sheetName={sheetName}
      variant="outline"
      className={className}
    />
  )
}


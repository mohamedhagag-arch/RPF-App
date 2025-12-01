'use client'

import { useState, useRef } from 'react'
import { Button } from './Button'
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react'
import { importFromFile, validateImportedData, downloadTemplate } from '@/lib/exportImportUtils'

interface ImportButtonProps {
  onImport: (data: any[]) => Promise<void> | void
  requiredColumns?: string[]
  templateName?: string
  templateColumns?: string[]
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  disabled?: boolean
  acceptedFormats?: string[]
  showTemplateButton?: boolean
}

export function ImportButton({
  onImport,
  requiredColumns = [],
  templateName,
  templateColumns,
  label = 'Import',
  variant = 'outline',
  className = '',
  disabled = false,
  acceptedFormats = ['.csv', '.xlsx', '.xls'],
  showTemplateButton = true
}: ImportButtonProps) {
  const [importing, setImporting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importedData, setImportedData] = useState<any[] | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setImportedData(null)
    setValidationErrors([])

    try {
      setImporting(true)
      
      // Import file
      const data = await importFromFile(
        file,
        (data) => {
          setImportedData(data)
          
          // Validate data
          if (requiredColumns.length > 0) {
            const validation = validateImportedData(data, requiredColumns)
            if (!validation.isValid) {
              setValidationErrors(validation.errors)
            }
          }
        },
        (error) => {
          alert(`Error reading file: ${error.message}`)
        }
      )
      
      setShowModal(true)
    } catch (error: any) {
      console.error('❌ Import error:', error)
      alert(`Failed to import file: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importedData || validationErrors.length > 0) return

    try {
      setImporting(true)
      await onImport(importedData)
      
      // Success
      setShowModal(false)
      setSelectedFile(null)
      setImportedData(null)
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      alert(`✅ Successfully imported ${importedData.length} records`)
    } catch (error: any) {
      console.error('❌ Error saving data:', error)
      alert(`Failed to save data: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setSelectedFile(null)
    setImportedData(null)
    setValidationErrors([])
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = async () => {
    if (!templateName || !templateColumns) return
    
    try {
      await downloadTemplate(templateName, templateColumns, 'excel')
    } catch (error) {
      console.error('❌ Error downloading template:', error)
      alert('Failed to download template')
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || importing}
          className={className}
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? 'Importing...' : label}
        </Button>

        {showTemplateButton && templateName && templateColumns && (
          <Button
            variant="ghost"
            onClick={handleDownloadTemplate}
            title="Download Excel Template"
            className="text-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Template
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Preview Modal */}
      {showModal && importedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Imported Data Preview
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* File Info */}
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>File:</strong> {selectedFile?.name}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Records:</strong> {importedData.length}
                </p>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                        Data Validation Errors:
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700 dark:text-red-300">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {validationErrors.length === 0 && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Data is valid and ready to import
                    </p>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      {Object.keys(importedData[0]).map((column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {importedData.slice(0, 50).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {Object.values(row).map((value: any, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap"
                          >
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedData.length > 50 && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-center text-sm text-gray-500">
                    Showing first 50 records of {importedData.length}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                disabled={importing || validationErrors.length > 0}
              >
                {importing ? 'Saving...' : `Import ${importedData.length} Records`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


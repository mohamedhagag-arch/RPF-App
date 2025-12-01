'use client'

/**
 * 🗂️ Table Manager - Single Table Operations
 * 
 * مكون إدارة جدول واحد
 * يوفر عمليات متقدمة لكل جدول على حدة
 */

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  FileDown, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Info
} from 'lucide-react'
import { 
  TableInfo, 
  TableStats, 
  getTableStats, 
  clearTableData, 
  exportTableData, 
  importTableData,
  downloadAsJSON,
  downloadAsCSV,
  getTableTemplate,
  downloadCSVTemplate,
  readJSONFile,
  readCSVFile,
  createCorrectTemplate
} from '@/lib/databaseManager'
import { createTableBackup, downloadBackup } from '@/lib/backupManager'

interface TableManagerProps {
  table: TableInfo
  onUpdate?: () => void
}

export function TableManager({ table, onUpdate }: TableManagerProps) {
  const guard = usePermissionGuard()
  const [stats, setStats] = useState<TableStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState<'clear' | 'import' | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string>('')

  // تحميل الإحصائيات
  useEffect(() => {
    loadStats()
  }, [table.name])

  const loadStats = async () => {
    const tableStats = await getTableStats(table.name)
    setStats(tableStats)
  }

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // مسح كل البيانات
  const handleClearData = async () => {
    setLoading(true)
    try {
      const result = await clearTableData(table.name)
      if (result.success) {
        showMessage('success', `✅ ${result.message}`)
        await loadStats()
        onUpdate?.()
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
      setShowConfirm(null)
    }
  }

  // تصدير البيانات
  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true)
    try {
      const result = await exportTableData(table.name)
      if (result.success && result.data) {
        if (format === 'json') {
          downloadAsJSON(result.data, table.name)
        } else {
          downloadAsCSV(result.data, table.name)
        }
        showMessage('success', `✅ Exported ${result.data.length} rows as ${format.toUpperCase()}`)
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // تنزيل قالب فارغ مع أسماء الأعمدة الصحيحة
  const handleDownloadTemplate = async () => {
    setLoading(true)
    try {
      const result = await createCorrectTemplate(table.name)
      if (result.success) {
        showMessage('success', '✅ Template downloaded with correct column names')
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // استيراد البيانات - محسن للتعامل مع مشاكل ID مع شريط تقدم
  const handleImport = async () => {
    if (!importFile) return

    setLoading(true)
    setUploadProgress(0)
    setUploadStatus('')
    
    try {
      // Step 1: Reading file
      setUploadProgress(10)
      setUploadStatus('📖 Reading file...')
      
      let data: any[]
      
      if (importFile.name.endsWith('.json')) {
        const jsonData = await readJSONFile(importFile)
        data = Array.isArray(jsonData) ? jsonData : [jsonData]
      } else if (importFile.name.endsWith('.csv')) {
        data = await readCSVFile(importFile)
      } else {
        showMessage('error', '❌ Invalid file type. Use JSON or CSV')
        setUploadProgress(0)
        setUploadStatus('')
        return
      }

      setUploadProgress(30)
      setUploadStatus(`✅ Read ${data.length} rows from file`)

      if (data.length === 0) {
        showMessage('error', '❌ File is empty')
        setUploadProgress(0)
        setUploadStatus('')
        return
      }

      // Step 2: Cleaning data
      setUploadProgress(40)
      setUploadStatus('🧹 Cleaning data...')

      // تحسين: إزالة عمود ID إذا كان موجوداً لتجنب مشاكل الاستيراد
      const cleanData = data.map(row => {
        const cleanRow = { ...row }
        // إزالة حقول ID المشتركة
        delete cleanRow.id
        delete cleanRow.uuid
        delete cleanRow.created_at
        delete cleanRow.updated_at
        return cleanRow
      })

      setUploadProgress(50)
      setUploadStatus(`✅ Cleaned ${cleanData.length} rows`)

      // Step 3: Validating data
      setUploadProgress(60)
      setUploadStatus('🔍 Validating data...')

      // Step 4: Importing
      setUploadProgress(70)
      setUploadStatus('📤 Uploading data to database...')

      // استخدام دالة الاستيراد العادية (محسنة مع تنظيف البيانات)
      const result = await importTableData(table.name, cleanData, importMode)

      if (result.success) {
        setUploadProgress(100)
        setUploadStatus('✅ Import completed successfully!')
        showMessage('success', `✅ ${result.message}`)
        await loadStats()
        onUpdate?.()
        
        // Hide progress bar after 2 seconds
        setTimeout(() => {
          setUploadProgress(0)
          setUploadStatus('')
        }, 2000)
      } else {
        setUploadProgress(0)
        setUploadStatus('❌ Import failed')
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      setUploadProgress(0)
      setUploadStatus('❌ An error occurred')
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
      setShowConfirm(null)
      if (uploadProgress === 100 || uploadProgress === 0) {
        setImportFile(null)
      }
    }
  }

  // نسخة احتياطية للجدول
  const handleBackup = async () => {
    setLoading(true)
    try {
      const result = await createTableBackup(table.name)
      if (result.success && result.backup) {
        downloadBackup(result.backup)
        showMessage('success', `✅ Backup created: ${result.message}`)
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      orange: 'from-orange-500 to-orange-600',
      indigo: 'from-indigo-500 to-indigo-600',
      pink: 'from-pink-500 to-pink-600',
      yellow: 'from-yellow-500 to-yellow-600',
      teal: 'from-teal-500 to-teal-600',
      gray: 'from-gray-500 to-gray-600'
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${getColorClasses(table.color)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{table.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {table.displayName}
              </h3>
              <p className="text-sm text-white/80">
                {table.description}
              </p>
            </div>
          </div>
          
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Refresh stats"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rows</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.totalRows.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Size</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.estimatedSize}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.lastUpdated 
                  ? new Date(stats.lastUpdated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-4 border-b ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : message.type === 'error'
            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {message.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
            {message.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            <p className={`text-sm ${
              message.type === 'success' 
                ? 'text-green-800 dark:text-green-200'
                : message.type === 'error'
                ? 'text-red-800 dark:text-red-200'
                : 'text-blue-800 dark:text-blue-200'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-3">
        {/* Export */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            📥 Export Data
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={loading || !stats?.hasData}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={loading || !stats?.hasData}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Template */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            📄 Download Template
          </h4>
          <button
            onClick={handleDownloadTemplate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Empty Template (CSV)</span>
          </button>
          {table.name === 'Planning Database - BOQ Rates' && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">💡 نصائح للاستيراد:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>استخدم Template لضمان التنسيق الصحيح</li>
                <li>تأكد من وجود Project Code في جدول Projects</li>
                <li>الحسابات ستعمل تلقائياً بعد الاستيراد</li>
              </ul>
            </div>
          )}
        </div>

        {/* Import */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            📤 Import Data
          </h4>
          <div className="space-y-2">
            <input
              type="file"
              accept=".json,.csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null)
                setUploadProgress(0)
                setUploadStatus('')
              }}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100
                dark:file:bg-indigo-900/20 dark:file:text-indigo-300"
            />
            {importFile && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="append">Append (Add to existing)</option>
                    <option value="replace">Replace (Delete & Replace)</option>
                  </select>
                  <button
                    onClick={() => setShowConfirm('import')}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import</span>
                  </button>
                </div>
                
                {/* Progress Bar */}
                {(loading || uploadProgress > 0) && (
                  <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    {uploadStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-800 dark:text-blue-200 font-medium">
                          {uploadStatus}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {uploadProgress}%
                        </span>
                      </div>
                    )}
                    <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                        style={{ width: `${uploadProgress}%` }}
                      >
                        {uploadProgress > 10 && uploadProgress < 100 && (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                    {uploadProgress === 100 && (
                      <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                        <CheckCircle className="w-4 h-4" />
                        <span>Import completed successfully!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Backup */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            💾 Backup Table
          </h4>
          <button
            onClick={handleBackup}
            disabled={loading || !stats?.hasData}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="w-4 h-4" />
            <span>Create Backup</span>
          </button>
        </div>

        {/* Clear Data */}
        {!table.hasSensitiveData && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              🗑️ Danger Zone
            </h4>
            <button
              onClick={() => setShowConfirm('clear')}
              disabled={loading || !stats?.hasData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Data</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      {showConfirm === 'clear' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Delete
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete <strong>ALL {stats?.totalRows || 0} rows</strong> from <strong>{table.displayName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm === 'import' && importFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Import
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {importMode === 'replace' ? 'This will replace all existing data' : 'This will add to existing data'}
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>File:</strong> {importFile.name}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Table:</strong> {table.displayName}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Mode:</strong> {importMode === 'append' ? 'Append (Add to existing)' : 'Replace (Delete & Replace)'}
              </p>
              {importMode === 'replace' && (
                <p className="text-red-600 dark:text-red-400 text-sm">
                  ⚠️ All existing {stats?.totalRows || 0} rows will be deleted first!
                </p>
              )}
            </div>
            
            {/* Progress Bar in Modal */}
            {(loading || uploadProgress > 0) && (
              <div className="mb-6 space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                {uploadStatus && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                      {uploadStatus}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {uploadProgress}%
                    </span>
                  </div>
                )}
                <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    {uploadProgress > 10 && uploadProgress < 100 && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
                {uploadProgress === 100 && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>Import completed successfully!</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(null)
                  setImportFile(null)
                  setUploadProgress(0)
                  setUploadStatus('')
                }}
                disabled={loading && uploadProgress > 0}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </span>
                ) : (
                  'Yes, Import'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


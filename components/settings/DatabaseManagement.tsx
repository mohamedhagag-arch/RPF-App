'use client'

/**
 * 🗄️ Database Management - Complete Database Operations
 * 
 * إدارة قاعدة البيانات الشاملة
 * النسخ الاحتياطي، الاستعادة، وإدارة الجداول
 */

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Save,
  FolderOpen,
  Info,
  Activity,
  Shield,
  Clock,
  HardDrive
} from 'lucide-react'
import { TableManager } from './TableManager'
import { 
  getAllTables, 
  getAllTablesStats,
  TableInfo,
  canManageDatabase,
  cleanupOldData,
  getDataSizeAnalysis
} from '@/lib/databaseManager'
import {
  createFullBackup,
  downloadBackup,
  loadBackupFile,
  restoreFromBackup,
  validateBackup,
  BackupData
} from '@/lib/backupManager'

type ViewMode = 'overview' | 'tables' | 'backup' | 'restore'

export function DatabaseManagement() {
  const guard = usePermissionGuard()
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [tables, setTables] = useState<TableInfo[]>([])
  const [stats, setStats] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [loadedBackup, setLoadedBackup] = useState<BackupData | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [restoreMode, setRestoreMode] = useState<'append' | 'replace'>('append')
  const [showConfirmRestore, setShowConfirmRestore] = useState(false)

  // التحقق من الصلاحيات
  useEffect(() => {
    checkPermissions()
  }, [])

  // تحميل الجداول والإحصائيات
  useEffect(() => {
    if (hasPermission) {
      loadData()
    }
  }, [hasPermission])

  const checkPermissions = async () => {
    const canManage = await canManageDatabase()
    setHasPermission(canManage)
    if (!canManage) {
      showMessage('error', '❌ You do not have permission to manage the database. Admin access required.')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const allTables = getAllTables()
      setTables(allTables)
      
      const allStats = await getAllTablesStats()
      setStats(allStats)
    } catch (error: any) {
      showMessage('error', `❌ Error loading data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // إنشاء نسخة احتياطية كاملة
  const handleCreateBackup = async () => {
    setLoading(true)
    try {
      showMessage('info', '💾 Creating backup... Please wait...')
      const result = await createFullBackup('Full database backup')
      
      if (result.success && result.backup) {
        downloadBackup(result.backup)
        showMessage('success', `✅ ${result.message}`)
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // تحليل الأداء وحجم البيانات
  const handlePerformanceAnalysis = async () => {
    setLoading(true)
    try {
      showMessage('info', '📊 Analyzing database performance... Please wait...')
      const result = await getDataSizeAnalysis()
      
      if (result.success && result.data) {
        const analysis = result.data
        const totalRows = analysis.totalRows
        const needsCleanup = analysis.needsCleanup
        
        let message = `📊 Analysis Complete!\n\n`
        message += `Total Records: ${totalRows.toLocaleString()}\n\n`
        
        // إضافة تفاصيل الجداول
        message += `Table Details:\n`
        Object.values(analysis.tables).forEach((table: any) => {
          message += `• ${table.displayName}: ${table.totalRows.toLocaleString()} rows (${table.estimatedSize})\n`
        })
        
        message += `\nRecommendations:\n`
        analysis.recommendations.forEach((rec: string) => {
          message += `• ${rec}\n`
        })
        
        if (needsCleanup) {
          message += `\n⚠️ Database is large - consider cleanup for better performance!`
        }
        
        showMessage('info', message)
        
        // إظهار تفاصيل إضافية في Console
        console.log('📊 Performance Analysis Results:', analysis)
        
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // تحميل ملف النسخة الاحتياطية
  const handleLoadBackup = async () => {
    if (!backupFile) return

    setLoading(true)
    try {
      const result = await loadBackupFile(backupFile)
      
      if (result.success && result.backup) {
        setLoadedBackup(result.backup)
        setSelectedTables(Object.keys(result.backup.tables))
        showMessage('success', `✅ ${result.message}`)
        setViewMode('restore')
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // استعادة من النسخة الاحتياطية
  const handleRestore = async () => {
    if (!loadedBackup) return

    setLoading(true)
    setShowConfirmRestore(false)
    
    try {
      showMessage('info', '🔄 Restoring data... Please wait...')
      
      const result = await restoreFromBackup(loadedBackup, {
        mode: restoreMode,
        selectedTables,
        confirmReplace: true
      })
      
      if (result.success) {
        showMessage('success', `✅ ${result.message}`)
        await loadData()
        setLoadedBackup(null)
        setBackupFile(null)
        setViewMode('overview')
      } else {
        showMessage('error', `❌ ${result.message}`)
      }
    } catch (error: any) {
      showMessage('error', `❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // حساب الإحصائيات الكلية
  const totalStats = Object.values(stats).reduce((acc: any, stat: any) => {
    if (stat) {
      acc.totalRows += stat.totalRows
      acc.totalTables += 1
    }
    return acc
  }, { totalRows: 0, totalTables: 0 })

  if (!hasPermission) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You need administrator privileges to access database management.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🗄️ Database Management
            </h2>
            <p className="text-indigo-100">
              Professional database operations: backup, restore, and manage tables
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
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
            <p className={`text-sm font-medium ${
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

      {/* Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Database },
          { id: 'tables', label: 'Manage Tables', icon: HardDrive },
          { id: 'backup', label: 'Create Backup', icon: Save },
          { id: 'restore', label: 'Restore', icon: Upload }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setViewMode(item.id as ViewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === item.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Database className="w-8 h-8" />
                <span className="text-4xl font-bold">{totalStats.totalTables}</span>
              </div>
              <p className="text-blue-100 text-sm">Total Tables</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <HardDrive className="w-8 h-8" />
                <span className="text-4xl font-bold">{totalStats.totalRows.toLocaleString()}</span>
              </div>
              <p className="text-green-100 text-sm">Total Rows</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8" />
                <span className="text-2xl font-bold">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-purple-100 text-sm">Today's Date</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors disabled:opacity-50"
              >
                <div className="p-3 bg-indigo-600 rounded-lg">
                  <Save className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Create Full Backup</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Backup all tables</p>
                </div>
              </button>

              <button
                onClick={handlePerformanceAnalysis}
                disabled={loading}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 transition-colors disabled:opacity-50"
              >
                <div className="p-3 bg-orange-600 rounded-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Performance Analysis</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Analyze data size & performance</p>
                </div>
              </button>

              <button
                onClick={() => setViewMode('tables')}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors"
              >
                <div className="p-3 bg-green-600 rounded-lg">
                  <HardDrive className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Manage Tables</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Individual table operations</p>
                </div>
              </button>
            </div>
          </div>

          {/* Tables Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Database Tables
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables.map((table) => {
                  const tableStat = stats[table.name]
                  return (
                    <div
                      key={table.name}
                      className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{table.icon}</span>
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {table.displayName.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {tableStat?.totalRows.toLocaleString() || 0} rows
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {tableStat?.estimatedSize || 'N/A'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Tables */}
      {viewMode === 'tables' && (
        <div className="space-y-4">
          {tables.map((table) => (
            <TableManager 
              key={table.name} 
              table={table}
              onUpdate={loadData}
            />
          ))}
        </div>
      )}

      {/* Create Backup */}
      {viewMode === 'backup' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <Save className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create Database Backup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download a complete backup of all database tables
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                What's included:
              </h4>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li>• All {tables.length} database tables</li>
                <li>• Total {totalStats.totalRows.toLocaleString()} rows</li>
                <li>• Metadata and version info</li>
                <li>• JSON format for easy restore</li>
              </ul>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Creating Backup...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Full Backup</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Restore */}
      {viewMode === 'restore' && (
        <div className="space-y-6">
          {/* Upload Backup */}
          {!loadedBackup && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Restore from Backup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a backup file to restore your database
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100
                    dark:file:bg-indigo-900/20 dark:file:text-indigo-300
                    cursor-pointer"
                />

                {backupFile && (
                  <button
                    onClick={handleLoadBackup}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-5 h-5" />
                        <span>Load Backup File</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Backup Preview */}
          {loadedBackup && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Backup Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Created:</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(loadedBackup.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Tables:</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {Object.keys(loadedBackup.tables).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Rows:</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {loadedBackup.metadata.totalRows.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Version:</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {loadedBackup.version}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Restore Options
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Restore Mode:
                    </label>
                    <select
                      value={restoreMode}
                      onChange={(e) => setRestoreMode(e.target.value as 'append' | 'replace')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="append">Append - Add to existing data</option>
                      <option value="replace">Replace - Delete existing data first</option>
                    </select>
                  </div>

                  {restoreMode === 'replace' && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="font-medium">Warning: All existing data will be deleted!</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowConfirmRestore(true)}
                    disabled={loading || selectedTables.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors disabled:opacity-50 text-lg font-semibold"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Restore Database</span>
                  </button>

                  <button
                    onClick={() => {
                      setLoadedBackup(null)
                      setBackupFile(null)
                    }}
                    className="w-full px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Restore Dialog */}
      {showConfirmRestore && loadedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                restoreMode === 'replace' 
                  ? 'bg-red-100 dark:bg-red-900/20'
                  : 'bg-green-100 dark:bg-green-900/20'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  restoreMode === 'replace' ? 'text-red-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Restore
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {restoreMode === 'replace' 
                    ? 'This will delete ALL existing data!'
                    : 'This will add data to existing tables'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Tables to restore:</strong> {selectedTables.length}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Total rows:</strong> {loadedBackup.metadata.totalRows.toLocaleString()}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Mode:</strong> {restoreMode === 'append' ? 'Append (Add)' : 'Replace (Delete & Add)'}
              </p>
              {restoreMode === 'replace' && (
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                  ⚠️ Current data in these tables will be permanently deleted!
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmRestore(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                  restoreMode === 'replace'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? 'Restoring...' : 'Yes, Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


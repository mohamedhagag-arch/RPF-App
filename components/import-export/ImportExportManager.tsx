'use client'

import { useState, useRef } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertCircle,
  X,
  FileSpreadsheet,
  FileJson,
  Trash2,
  RefreshCw,
  Archive
} from 'lucide-react'

interface ImportExportManagerProps {
  userRole?: string
  onClose?: () => void
}

interface ExportOptions {
  projects: boolean
  activities: boolean
  kpis: boolean
  users: boolean
  format: 'json' | 'csv' | 'excel'
  dateRange: {
    start: string
    end: string
  }
}

interface ImportOptions {
  fileType: 'json' | 'csv'
  overwrite: boolean
  validateData: boolean
}

export function ImportExportManager({ userRole = 'viewer', onClose }: ImportExportManagerProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('import-export') // ✅ Smart loading
  const [success, setSuccess] = useState('')
  const [progress, setProgress] = useState(0)
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    projects: true,
    activities: true,
    kpis: true,
    users: false,
    format: 'json',
    dateRange: {
      start: '',
      end: ''
    }
  })

  const [importOptions, setImportOptions] = useState<ImportOptions>({
    fileType: 'json',
    overwrite: false,
    validateData: true
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseClient()

  const handleExport = async () => {
    try {
      setLoading(true)
      setError('')
      setProgress(0)

      const exportData: any = {
        metadata: {
          exported_at: new Date().toISOString(),
          format: exportOptions.format,
          version: '1.0'
        }
      }

      // Export projects
      if (exportOptions.projects) {
        setProgress(20)
        let query = supabase.from('Planning Database - ProjectsList').select('*')
        
        if (exportOptions.dateRange.start) {
          query = query.gte('created_at', exportOptions.dateRange.start)
        }
        if (exportOptions.dateRange.end) {
          query = query.lte('created_at', exportOptions.dateRange.end)
        }
        
        const { data: projects } = await query
        exportData.projects = projects || []
      }

      // Export activities
      if (exportOptions.activities) {
        setProgress(40)
        let query = supabase.from('Planning Database - BOQ Rates').select('*')
        
        if (exportOptions.dateRange.start) {
          query = query.gte('created_at', exportOptions.dateRange.start)
        }
        if (exportOptions.dateRange.end) {
          query = query.lte('created_at', exportOptions.dateRange.end)
        }
        
        const { data: activities } = await query
        exportData.activities = activities || []
      }

      // Export KPIs
      if (exportOptions.kpis) {
        setProgress(60)
        let query = supabase.from('Planning Database - KPI').select('*')
        
        if (exportOptions.dateRange.start) {
          query = query.gte('created_at', exportOptions.dateRange.start)
        }
        if (exportOptions.dateRange.end) {
          query = query.lte('created_at', exportOptions.dateRange.end)
        }
        
        const { data: kpis } = await query
        exportData.kpis = kpis || []
      }

      // Export users (admin only)
      if (exportOptions.users && userRole === 'admin') {
        setProgress(80)
        const { data: users } = await supabase.from('users').select('*')
        exportData.users = users || []
      }

      setProgress(100)

      // Download file
      const fileName = `rabat-mvp-export-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`
      
      if (exportOptions.format === 'json') {
        const dataStr = JSON.stringify(exportData, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        downloadFile(dataUri, fileName)
      } else if (exportOptions.format === 'csv') {
        // Convert to CSV format
        const csvData = convertToCSV(exportData)
        const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvData)
        downloadFile(dataUri, fileName)
      }

      setSuccess('Data exported successfully')
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      setError('Export failed: ' + error.message)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      setProgress(0)

      const text = await file.text()
      setProgress(20)

      let data: any
      if (importOptions.fileType === 'json') {
        data = JSON.parse(text)
      } else {
        // Handle CSV import
        data = parseCSV(text)
      }

      setProgress(40)

      // Validate data structure
      if (importOptions.validateData) {
        const validation = validateImportData(data)
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }
      }

      // Import projects
      if (data.projects && data.projects.length > 0) {
        setProgress(60)
        const { error: projectsError } = await supabase
          .from('Planning Database - ProjectsList')
          .upsert(data.projects, { onConflict: 'id' })
        
        if (projectsError) throw projectsError
      }

      // Import activities
      if (data.activities && data.activities.length > 0) {
        setProgress(70)
        const { error: activitiesError } = await supabase
          .from('Planning Database - BOQ Rates')
          .upsert(data.activities, { onConflict: 'id' })
        
        if (activitiesError) throw activitiesError
      }

      // Import KPIs
      if (data.kpis && data.kpis.length > 0) {
        setProgress(80)
        const { error: kpisError } = await supabase
          .from('Planning Database - KPI')
          .upsert(data.kpis, { onConflict: 'id' })
        
        if (kpisError) throw kpisError
      }

      // Import users (admin only)
      if (data.users && data.users.length > 0 && userRole === 'admin') {
        setProgress(90)
        const { error: usersError } = await supabase
          .from('users')
          .upsert(data.users, { onConflict: 'id' })
        
        if (usersError) throw usersError
      }

      setProgress(100)
      setSuccess('Data imported successfully')
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      setError('Import failed: ' + error.message)
    } finally {
      setLoading(false)
      setProgress(0)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadFile = (dataUri: string, fileName: string) => {
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', fileName)
    linkElement.click()
  }

  const convertToCSV = (data: any) => {
    let csv = ''
    
    // Add metadata
    csv += 'Type,ID,Name,Description,Created\n'
    
    // Convert projects
    if (data.projects) {
      data.projects.forEach((project: any) => {
        csv += `Project,${project.id},${project.project_name},"${project.project_type}",${project.created_at}\n`
      })
    }
    
    // Convert activities
    if (data.activities) {
      data.activities.forEach((activity: any) => {
        csv += `Activity,${activity.id},${activity.activity_name},"${activity.activity}",${activity.created_at}\n`
      })
    }
    
    // Convert KPIs
    if (data.kpis) {
      data.kpis.forEach((kpi: any) => {
        csv += `KPI,${kpi.id},${kpi.kpi_name},"${kpi.notes || ''}",${kpi.created_at}\n`
      })
    }
    
    return csv
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',')
    const data: any = { projects: [], activities: [], kpis: [] }
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      if (values.length >= headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim()
        })
        
        if (row.Type === 'Project') {
          data.projects.push(row)
        } else if (row.Type === 'Activity') {
          data.activities.push(row)
        } else if (row.Type === 'KPI') {
          data.kpis.push(row)
        }
      }
    }
    
    return data
  }

  const validateImportData = (data: any) => {
    const errors: string[] = []
    
    if (!data.projects && !data.activities && !data.kpis) {
      errors.push('No valid data found')
    }
    
    if (data.projects) {
      data.projects.forEach((project: any, index: number) => {
        if (!project.project_name) errors.push(`Project ${index + 1}: Missing project name`)
        if (!project.project_code) errors.push(`Project ${index + 1}: Missing project code`)
      })
    }
    
    if (data.activities) {
      data.activities.forEach((activity: any, index: number) => {
        if (!activity.activity_name) errors.push(`Activity ${index + 1}: Missing activity name`)
        if (!activity.project_id) errors.push(`Activity ${index + 1}: Missing project ID`)
      })
    }
    
    if (data.kpis) {
      data.kpis.forEach((kpi: any, index: number) => {
        if (!kpi.kpi_name) errors.push(`KPI ${index + 1}: Missing KPI name`)
        if (!kpi.project_id) errors.push(`KPI ${index + 1}: Missing project ID`)
      })
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  const canExportUsers = userRole === 'admin'
  const canImport = userRole === 'admin' || userRole === 'manager'

  if (!canImport && !canExportUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have permission to access import/export features.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Import & Export</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage data import and export operations</p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      {/* Progress Bar */}
      {loading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="sm" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Download className="h-4 w-4 inline mr-2" />
          Export Data
        </button>
        {canImport && (
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Import Data
          </button>
        )}
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Export Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Selection */}
            <div>
              <h4 className="font-medium mb-3">Select Data to Export</h4>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.projects}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, projects: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <Database className="h-4 w-4" />
                  <span>Projects</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.activities}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, activities: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <FileText className="h-4 w-4" />
                  <span>Activities</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.kpis}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, kpis: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <CheckCircle className="h-4 w-4" />
                  <span>KPIs</span>
                </label>
                {canExportUsers && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.users}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, users: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <Archive className="h-4 w-4" />
                    <span>Users</span>
                  </label>
                )}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <h4 className="font-medium mb-3">Export Format</h4>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="json"
                    checked={exportOptions.format === 'json'}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <FileJson className="h-4 w-4" />
                  <span>JSON</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="csv"
                    checked={exportOptions.format === 'csv'}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV</span>
                </label>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="font-medium mb-3">Date Range (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportOptions.dateRange.start}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportOptions.dateRange.end}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={loading || (!exportOptions.projects && !exportOptions.activities && !exportOptions.kpis && !exportOptions.users)}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && canImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Selection */}
            <div>
              <h4 className="font-medium mb-3">Select File</h4>
              <input
                ref={fileInputRef}
                type="file"
                accept={importOptions.fileType === 'json' ? '.json' : '.csv'}
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file">
                <Button type="button" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File to Import
                </Button>
              </label>
            </div>

            {/* Import Options */}
            <div>
              <h4 className="font-medium mb-3">Import Options</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={importOptions.validateData}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, validateData: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span>Validate data before import</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={importOptions.overwrite}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, overwrite: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span>Overwrite existing records</span>
                </label>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <h4 className="font-medium mb-3">File Format</h4>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="json"
                    checked={importOptions.fileType === 'json'}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, fileType: e.target.value as any }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <FileJson className="h-4 w-4" />
                  <span>JSON</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="csv"
                    checked={importOptions.fileType === 'csv'}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, fileType: e.target.value as any }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV</span>
                </label>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800">Import Warning</h5>
                  <p className="text-sm text-yellow-700 mt-1">
                    Importing data will modify your database. Make sure to backup your data before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

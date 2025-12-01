'use client'

import { useState, useRef } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Download,
  Upload,
  FileText,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Archive,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react'

interface ExportData {
  departments: any[]
  job_titles: any[]
  metadata: {
    export_date: string
    version: string
    total_departments: number
    total_job_titles: number
  }
}

interface ImportResult {
  success: boolean
  departments_added: number
  departments_updated: number
  job_titles_added: number
  job_titles_updated: number
  errors: string[]
}

export function ExportImportManager() {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<ExportData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export Functions
  const handleExport = async (format: 'json' | 'csv' | 'excel') => {
    setExporting(true)
    setError('')
    setSuccess('')

    try {
      console.log('📤 Starting export...')
      
      // Fetch departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('display_order', { ascending: true })

      if (deptError) throw deptError

      // Fetch job titles
      const { data: jobTitles, error: jobError } = await supabase
        .from('job_titles')
        .select('*')
        .order('display_order', { ascending: true })

      if (jobError) throw jobError

      const exportData: ExportData = {
        departments: departments || [],
        job_titles: jobTitles || [],
        metadata: {
          export_date: new Date().toISOString(),
          version: '1.0.0',
          total_departments: departments?.length || 0,
          total_job_titles: jobTitles?.length || 0
        }
      }

      console.log('📊 Export data prepared:', exportData.metadata)

      // Generate file based on format
      let fileName = ''
      let mimeType = ''
      let content = ''

      switch (format) {
        case 'json':
          fileName = `departments-job-titles-${new Date().toISOString().split('T')[0]}.json`
          mimeType = 'application/json'
          content = JSON.stringify(exportData, null, 2)
          break

        case 'csv':
          fileName = `departments-job-titles-${new Date().toISOString().split('T')[0]}.csv`
          mimeType = 'text/csv'
          content = generateCSV(exportData)
          break

        case 'excel':
          fileName = `departments-job-titles-${new Date().toISOString().split('T')[0]}.xlsx`
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          content = await generateExcel(exportData)
          break
      }

      // Download file
      downloadFile(content, fileName, mimeType)
      
      setSuccess(`✅ Export completed successfully! ${exportData.metadata.total_departments} departments and ${exportData.metadata.total_job_titles} job titles exported.`)
      
    } catch (err: any) {
      console.error('❌ Export error:', err)
      setError(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  // Import Functions
  const handleImport = async (file: File) => {
    setImporting(true)
    setError('')
    setSuccess('')
    setImportResult(null)

    try {
      console.log('📥 Starting import...')
      
      const content = await file.text()
      let importData: ExportData

      // Parse file based on extension
      if (file.name.endsWith('.json')) {
        importData = JSON.parse(content)
      } else if (file.name.endsWith('.csv')) {
        importData = parseCSV(content)
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.')
      }

      console.log('📊 Import data parsed:', importData.metadata)

      // Show preview
      setPreviewData(importData)
      setShowPreview(true)

    } catch (err: any) {
      console.error('❌ Import error:', err)
      setError(`Import failed: ${err.message}`)
      setImporting(false)
    }
  }

  const confirmImport = async () => {
    if (!previewData) return

    setImporting(true)
    setError('')
    setSuccess('')

    try {
      console.log('💾 Confirming import...')
      
      const result: ImportResult = {
        success: true,
        departments_added: 0,
        departments_updated: 0,
        job_titles_added: 0,
        job_titles_updated: 0,
        errors: []
      }

      // Import departments
      for (const dept of previewData.departments) {
        try {
          const { error } = await supabase
            .from('departments')
            .upsert({
              name_en: dept.name_en,
              name_ar: dept.name_ar,
              description: dept.description,
              is_active: dept.is_active,
              display_order: dept.display_order
            } as any, {
              onConflict: 'name_en'
            })

          if (error) {
            result.errors.push(`Department ${dept.name_en}: ${error.message}`)
          } else {
            result.departments_added++
          }
        } catch (err: any) {
          result.errors.push(`Department ${dept.name_en}: ${err.message}`)
        }
      }

      // Import job titles
      for (const job of previewData.job_titles) {
        try {
          const { error } = await supabase
            .from('job_titles')
            .upsert({
              title_en: job.title_en,
              title_ar: job.title_ar,
              description: job.description,
              is_active: job.is_active,
              display_order: job.display_order
            } as any, {
              onConflict: 'title_en'
            })

          if (error) {
            result.errors.push(`Job Title ${job.title_en}: ${error.message}`)
          } else {
            result.job_titles_added++
          }
        } catch (err: any) {
          result.errors.push(`Job Title ${job.title_en}: ${err.message}`)
        }
      }

      setImportResult(result)
      setShowPreview(false)
      setPreviewData(null)
      
      if (result.errors.length === 0) {
        setSuccess(`✅ Import completed successfully! ${result.departments_added} departments and ${result.job_titles_added} job titles imported.`)
      } else {
        setSuccess(`⚠️ Import completed with ${result.errors.length} errors. Check details below.`)
      }
      
    } catch (err: any) {
      console.error('❌ Import confirmation error:', err)
      setError(`Import confirmation failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  // Utility Functions
  const generateCSV = (data: ExportData): string => {
    let csv = 'Type,Name (EN),Name (AR),Description,Active,Display Order\n'
    
    // Add departments
    data.departments.forEach(dept => {
      csv += `Department,"${dept.name_en}","${dept.name_ar}","${dept.description}",${dept.is_active},${dept.display_order}\n`
    })
    
    // Add job titles
    data.job_titles.forEach(job => {
      csv += `Job Title,"${job.title_en}","${job.title_ar}","${job.description}",${job.is_active},${job.display_order}\n`
    })
    
    return csv
  }

  const parseCSV = (content: string): ExportData => {
    const lines = content.split('\n').filter(line => line.trim())
    const departments: any[] = []
    const job_titles: any[] = []
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const [type, nameEn, nameAr, description, isActive, displayOrder] = lines[i].split(',')
      
      const item = {
        name_en: nameEn.replace(/"/g, ''),
        name_ar: nameAr.replace(/"/g, ''),
        description: description.replace(/"/g, ''),
        is_active: isActive === 'true',
        display_order: parseInt(displayOrder) || 0
      }
      
      if (type === 'Department') {
        departments.push(item)
      } else if (type === 'Job Title') {
        job_titles.push(item)
      }
    }
    
    return {
      departments,
      job_titles,
      metadata: {
        export_date: new Date().toISOString(),
        version: '1.0.0',
        total_departments: departments.length,
        total_job_titles: job_titles.length
      }
    }
  }

  const generateExcel = async (data: ExportData): Promise<string> => {
    // This would require a library like xlsx
    // For now, return JSON as fallback
    return JSON.stringify(data, null, 2)
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImport(file)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Export all departments and job titles to various formats for backup or migration.
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {exporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export JSON
            </Button>
            
            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {exporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </Button>
            
            <Button
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {exporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Import departments and job titles from JSON or CSV files.
          </p>
          
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {importing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Select File
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Eye className="w-5 h-5" />
              Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Departments ({previewData.metadata.total_departments})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {previewData.departments.map((dept, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      {dept.name_en} {dept.name_ar && `(${dept.name_ar})`}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Job Titles ({previewData.metadata.total_job_titles})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {previewData.job_titles.map((job, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      {job.title_en} {job.title_ar && `(${job.title_ar})`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={confirmImport}
                disabled={importing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {importing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Import
              </Button>
              
              <Button
                onClick={() => {
                  setShowPreview(false)
                  setPreviewData(null)
                }}
                variant="outline"
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className={importResult.success ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Departments
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Added: {importResult.departments_added}</div>
                  <div>Updated: {importResult.departments_updated}</div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Job Titles
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Added: {importResult.job_titles_added}</div>
                  <div>Updated: {importResult.job_titles_updated}</div>
                </div>
              </div>
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  Errors ({importResult.errors.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          {success}
        </Alert>
      )}
    </div>
  )
}

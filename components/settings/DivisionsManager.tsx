'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { 
  getAllDivisions, 
  addDivision, 
  updateDivision, 
  deleteDivision,
  initializeDivisionsTable,
  Division
} from '@/lib/divisionsManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  FileText,
  FileJson,
  FileSpreadsheet,
  Database,
  Eye
} from 'lucide-react'

export function DivisionsManager() {
  const guard = usePermissionGuard()
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  
  // Export/Import states
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [showImportPreview, setShowImportPreview] = useState(false)
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  })

  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تهيئة الجدول إذا لزم الأمر
      await initializeDivisionsTable()
      
      // جلب الأقسام
      const data = await getAllDivisions()
      setDivisions(data)
    } catch (error: any) {
      setError('Failed to load divisions')
      console.error('Error fetching divisions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Export functions
  const handleExport = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      if (divisions.length === 0) {
        setError('No divisions data to export.')
        return
      }

      let blob: Blob
      let fileExtension: string
      let mimeType: string

      if (exportFormat === 'json') {
        blob = new Blob([JSON.stringify(divisions, null, 2)], { type: 'application/json' })
        fileExtension = 'json'
        mimeType = 'application/json'
      } else if (exportFormat === 'csv') {
        const header = Object.keys(divisions[0]).join(',') + '\n'
        const rows = divisions.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
        blob = new Blob([header + rows], { type: 'text/csv' })
        fileExtension = 'csv'
        mimeType = 'text/csv'
      } else if (exportFormat === 'excel') {
        const header = Object.keys(divisions[0]).join(',') + '\n'
        const rows = divisions.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
        blob = new Blob([header + rows], { type: 'text/csv' })
        fileExtension = 'csv'
        mimeType = 'text/csv'
      } else {
        setError('Unsupported export format.')
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `divisions-${new Date().toISOString().split('T')[0]}.${fileExtension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccess(`Successfully exported divisions data as ${exportFormat.toUpperCase()}.`)
      
    } catch (err: any) {
      console.error('Error exporting divisions data:', err)
      setError(`Failed to export divisions data: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Import functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      setImportPreview(null)
      setShowImportPreview(false)
      setError('')
      setSuccess('')
    }
  }

  const handleImportPreview = async () => {
    if (!importFile) {
      setError('Please select a file to import.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          let parsedData: any[] = []

          if (importFile.type === 'application/json') {
            parsedData = JSON.parse(content)
          } else if (importFile.type === 'text/csv') {
            const lines = content.split('\n').filter(line => line.trim() !== '')
            if (lines.length === 0) {
              setError('CSV file is empty or malformed.')
              return
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
              if (values.length === headers.length) {
                const row: any = {}
                headers.forEach((header, index) => {
                  row[header] = values[index]
                })
                parsedData.push(row)
              }
            }
          } else {
            setError('Unsupported file type. Please upload JSON or CSV.')
            return
          }
          
          setImportPreview(parsedData)
          setShowImportPreview(true)
          setSuccess(`Previewing ${parsedData.length} records for divisions.`)
          
        } catch (e: any) {
          setError(`Failed to parse file: ${e.message || 'Invalid file content'}`)
        } finally {
          setLoading(false)
        }
      }
      reader.onerror = () => setError('Failed to read file')
      reader.readAsText(importFile)
      
    } catch (err: any) {
      console.error('Error parsing import file:', err)
      setError(`Failed to preview import: ${err.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreview || importPreview.length === 0) {
      setError('No data to import or preview is empty.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    let successful = 0
    let failed = 0
    const errors: string[] = []
    
    try {
      for (const record of importPreview) {
        try {
          await addDivision({
            name: record.name,
            code: record.code,
            description: record.description,
            is_active: record.is_active !== false
          })
          successful++
        } catch (recordError: any) {
          failed++
          errors.push(`Record failed: ${recordError.message}`)
        }
      }
      
      setSuccess(`Import completed: ${successful} successful, ${failed} failed.`)
      setImportFile(null)
      setImportPreview(null)
      setShowImportPreview(false)
      
      // Reload data
      await fetchDivisions()
      
    } catch (err: any) {
      console.error('Error during import:', err)
      setError(`Failed to complete import: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Division name is required')
      return
    }

    try {
      setLoading(true)

      if (editingDivision) {
        // تحديث قسم موجود
        const result = await updateDivision(editingDivision.id!, {
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim()
        })

        if (result.success) {
          setSuccess('Division updated successfully')
          await fetchDivisions()
          resetForm()
        } else {
          setError(result.error || 'Failed to update division')
        }
      } else {
        // إضافة قسم جديد
        const result = await addDivision({
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim(),
          is_active: true
        })

        if (result.success) {
          setSuccess('Division added successfully')
          await fetchDivisions()
          resetForm()
        } else {
          setError(result.error || 'Failed to add division')
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (division: Division) => {
    setEditingDivision(division)
    setFormData({
      name: division.name,
      code: division.code || '',
      description: division.description || ''
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (division: Division) => {
    if (!confirm(`Are you sure you want to delete "${division.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await deleteDivision(division.id!)

      if (result.success) {
        setSuccess('Division deleted successfully')
        await fetchDivisions()
      } else {
        setError(result.error || 'Failed to delete division')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' })
    setEditingDivision(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Divisions Management</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage responsible divisions for projects
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDivisions}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {guard.hasAccess('settings.divisions') && (
                <Button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Division
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Alerts */}
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              {success}
            </Alert>
          )}

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingDivision ? 'Edit Division' : 'Add New Division'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Division Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Enabling Division"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Code (Optional)
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., ENA"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the division"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingDivision ? 'Update' : 'Add'} Division
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Divisions List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : divisions.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No divisions found. Add your first division!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {divisions.map((division) => (
                <div
                  key={division.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                           hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {division.name}
                        </h4>
                        {division.code && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 
                                       text-blue-800 dark:text-blue-200 rounded">
                            {division.code}
                          </span>
                        )}
                      </div>
                      {division.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {division.description}
                        </p>
                      )}
                      {division.usage_count !== undefined && division.usage_count > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          Used in {division.usage_count} project{division.usage_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {guard.hasAccess('settings.divisions') && (
                        <button
                          onClick={() => handleEdit(division)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      )}
                      {guard.hasAccess('settings.divisions') && (
                        <button
                          onClick={() => handleDelete(division)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export/Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Export / Import Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Export Section */}
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" /> Export Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export your divisions data in various formats
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'excel')}
                  className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (CSV)</option>
                </select>
                <Button
                  onClick={handleExport}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Divisions
                </Button>
              </div>
            </div>

            {/* Import Section */}
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Import Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Import divisions data from JSON or CSV files
              </p>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className="flex-grow"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleImportPreview}
                    disabled={loading || !importFile}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Import
                  </Button>
                  {importFile && (
                    <Button
                      onClick={() => {
                        setImportFile(null)
                        setImportPreview(null)
                        setShowImportPreview(false)
                      }}
                      variant="outline"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Import Preview */}
                {showImportPreview && importPreview && (
                  <div className="mt-4 p-3 border rounded-lg bg-white dark:bg-gray-700">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Import Preview ({importPreview.length} records)
                    </h4>
                    <div className="max-h-60 overflow-y-auto text-sm text-gray-700 dark:text-gray-300">
                      <pre className="whitespace-pre-wrap break-all p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                        {JSON.stringify(importPreview.slice(0, 3), null, 2)}
                        {importPreview.length > 3 && '\n... (showing first 3 records)'}
                      </pre>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowImportPreview(false)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportConfirm}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Import
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


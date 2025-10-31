'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Building2,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Shield,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Download,
  Upload,
  FileText,
  FileJson,
  FileSpreadsheet,
  Database
} from 'lucide-react'

interface Department {
  id: string
  name_en: string
  name_ar: string
  description: string
  is_active: boolean
  display_order: number
}

interface JobTitle {
  id: string
  title_en: string
  title_ar: string
  description: string
  is_active: boolean
  display_order: number
}

export function DepartmentsJobTitlesManager() {
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'departments' | 'job_titles'>('departments')
  
  // Export/Import states
  const [showExportImport, setShowExportImport] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [showImportPreview, setShowImportPreview] = useState(false)

  // Departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [editingDept, setEditingDept] = useState<string | null>(null)
  const [newDept, setNewDept] = useState<Partial<Department>>({
    name_en: '',
    name_ar: '',
    description: '',
    is_active: true,
    display_order: 0
  })
  const buildDepartmentPayload = (dept: Partial<Department>, fallbackOrder = 0) => {
    const nameEn = typeof dept.name_en === 'string' ? dept.name_en.trim() : String(dept.name_en || '').trim()
    const nameArRaw = dept.name_ar
    const nameAr = typeof nameArRaw === 'string' ? nameArRaw.trim() : nameArRaw != null ? String(nameArRaw).trim() : ''
    const description = typeof dept.description === 'string'
      ? dept.description.trim()
      : String(dept.description || '').trim()
    const displayOrderValue = typeof dept.display_order === 'number'
      ? dept.display_order
      : Number(dept.display_order)

    return {
      name_en: nameEn,
      name_ar: nameAr.length > 0 ? nameAr : null,
      description,
      is_active: parseBoolean(dept.is_active, true),
      display_order: Number.isFinite(displayOrderValue) ? Number(displayOrderValue) : fallbackOrder
    }
  }

  // Job Titles
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState<Partial<JobTitle>>({
    title_en: '',
    title_ar: '',
    description: '',
    is_active: true,
    display_order: 0
  })

  const parseBoolean = (value: any, defaultValue = true) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes', 'y', 'active', 'on'].includes(normalized)) return true
      if (['false', '0', 'no', 'n', 'inactive', 'off'].includes(normalized)) return false
    }
    return defaultValue
  }

  const buildJobTitlePayload = (title: Partial<JobTitle>, fallbackOrder = 0) => {
    const titleEn = typeof title.title_en === 'string' ? title.title_en.trim() : String(title.title_en || '').trim()
    const titleArRaw = title.title_ar
    const titleArStr = typeof titleArRaw === 'string' ? titleArRaw.trim() : titleArRaw != null ? String(titleArRaw).trim() : ''
    const description = typeof title.description === 'string'
      ? title.description.trim()
      : String(title.description || '').trim()
    const displayOrderValue = typeof title.display_order === 'number'
      ? title.display_order
      : Number(title.display_order)

    return {
      title_en: titleEn,
      title_ar: titleArStr.length > 0 ? titleArStr : null,
      description,
      is_active: parseBoolean(title.is_active, true),
      display_order: Number.isFinite(displayOrderValue) ? Number(displayOrderValue) : fallbackOrder
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    if (activeTab === 'departments') {
      await loadDepartments()
    } else {
      await loadJobTitles()
    }
    setLoading(false)
  }

  // Export functions
  const handleExport = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      let data: any[] = []
      let filename = ''
      
      if (activeTab === 'departments') {
        data = departments
        filename = 'departments'
      } else {
        data = jobTitles
        filename = 'job_titles'
      }

      if (data.length === 0) {
        setError(`No ${activeTab} data to export.`)
        return
      }

      let blob: Blob
      let fileExtension: string
      let mimeType: string

      if (exportFormat === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        fileExtension = 'json'
        mimeType = 'application/json'
      } else if (exportFormat === 'csv') {
        const header = Object.keys(data[0]).join(',') + '\n'
        const rows = data.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
        blob = new Blob([header + rows], { type: 'text/csv' })
        fileExtension = 'csv'
        mimeType = 'text/csv'
      } else if (exportFormat === 'excel') {
        // For Excel, we'll use a simple CSV format
        const header = Object.keys(data[0]).join(',') + '\n'
        const rows = data.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
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
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${fileExtension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccess(`Successfully exported ${activeTab} data as ${exportFormat.toUpperCase()}.`)
      
    } catch (err: any) {
      console.error(`Error exporting ${activeTab} data:`, err)
      setError(`Failed to export ${activeTab} data: ${err.message || 'Unknown error'}`)
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
          setSuccess(`Previewing ${parsedData.length} records for ${activeTab}.`)
          
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
          if (activeTab === 'departments') {
            const { error: insertError } = await (supabase as any)
              .from('departments')
              .insert({
                name_en: record.name_en,
                name_ar: record.name_ar,
                description: record.description,
                is_active: record.is_active,
                display_order: record.display_order,
              })
            if (insertError) throw insertError
          } else {
            const payload = buildJobTitlePayload(
              {
                title_en: record.title_en,
                title_ar: record.title_ar,
                description: record.description,
                is_active: record.is_active,
                display_order: record.display_order
              },
              jobTitles.length + successful
            )
            const { error: insertError } = await (supabase as any)
              .from('job_titles')
              .insert(payload)
              .select()
              .single()
            if (insertError) throw insertError
          }
          successful++
        } catch (recordError: any) {
          failed++
          if (recordError?.code === '23505' || recordError?.message?.includes('duplicate key value')) {
            errors.push('Record failed: Arabic job title already exists.')
          } else {
            errors.push(`Record failed: ${recordError.message}`)
          }
        }
      }
      
      setSuccess(`Import completed: ${successful} successful, ${failed} failed.`)
      setImportFile(null)
      setImportPreview(null)
      setShowImportPreview(false)
      
      // Reload data
      await loadData()
      
    } catch (err: any) {
      console.error('Error during import:', err)
      setError(`Failed to complete import: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('departments')
        .select('*')
        .order('display_order')

      if (fetchError) throw fetchError
      const normalized = (data || []).map((item: any) => ({
        ...item,
        name_ar: item?.name_ar || '',
        description: item?.description || ''
      }))
      setDepartments(normalized)
    } catch (error: any) {
      console.error('Error loading departments:', error)
      setError('Failed to load departments')
    }
  }

  const loadJobTitles = async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('job_titles')
        .select('*')
        .order('display_order')

      if (fetchError) throw fetchError
      const normalized = (data || []).map((item: any) => ({
        ...item,
        title_ar: item?.title_ar || '',
        description: item?.description || ''
      }))
      setJobTitles(normalized)
    } catch (error: any) {
      console.error('Error loading job titles:', error)
      setError('Failed to load job titles')
    }
  }

  const handleAddDepartment = async () => {
    if (!newDept.name_en || newDept.name_en.trim() === '') {
      setError('Please fill in the English name')
      return
    }
    const sanitizedArabicName = newDept.name_ar?.trim()
    if (sanitizedArabicName) {
      const duplicateArabic = departments.some(
        existing => existing.name_ar && existing.name_ar.trim() === sanitizedArabicName
      )
      if (duplicateArabic) {
        setError('Arabic department name already exists. Please choose a different Arabic name.')
        return
      }
    }

    try {
      setSaving(true)
      setError('')

      const payload = buildDepartmentPayload({
        ...newDept,
        display_order: departments.length
      }, departments.length)

      const { error: insertError } = await (supabase as any)
        .from('departments')
        .insert(payload)

      if (insertError) throw insertError

      setSuccess('Department added successfully')
      setTimeout(() => setSuccess(''), 3000)
      setNewDept({ name_en: '', name_ar: '', description: '', is_active: true, display_order: 0 })
      await loadDepartments()
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key value')) {
        setError('Failed to add department: Arabic name already exists in the system.')
      } else {
        setError('Failed to add department: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDepartment = async (dept: Department) => {
    const trimmedArabic = dept.name_ar?.trim()
    if (trimmedArabic) {
      const duplicateArabic = departments.some(
        existing => existing.id !== dept.id && existing.name_ar && existing.name_ar.trim() === trimmedArabic
      )
      if (duplicateArabic) {
        setError('Arabic department name already exists. Please choose a different Arabic name.')
        return
      }
    }

    try {
      setSaving(true)
      setError('')

      const payload = buildDepartmentPayload(dept, dept.display_order)

      const { error: updateError } = await (supabase as any)
        .from('departments')
        .update(payload)
        .eq('id', dept.id)

      if (updateError) throw updateError

      setSuccess('Department updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingDept(null)
      await loadDepartments()
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key value')) {
        setError('Failed to update department: Arabic name already exists in the system.')
      } else {
        setError('Failed to update department: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    try {
      setSaving(true)
      setError('')

      const { error: deleteError } = await (supabase as any)
        .from('departments')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSuccess('Department deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await loadDepartments()
    } catch (error: any) {
      setError('Failed to delete department: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddJobTitle = async () => {
    if (!newTitle.title_en || newTitle.title_en.trim() === '') {
      setError('Please fill in the English title')
      return
    }

    const sanitizedArabicTitle = newTitle.title_ar?.trim()
    if (sanitizedArabicTitle) {
      const duplicateArabic = jobTitles.some(
        existing => existing.title_ar && existing.title_ar.trim() === sanitizedArabicTitle
      )
      if (duplicateArabic) {
        setError('Arabic job title already exists. Please choose a different Arabic name.')
        return
      }
    }

    try {
      setSaving(true)
      setError('')

      const payload = buildJobTitlePayload({
        ...newTitle,
        display_order: jobTitles.length
      }, jobTitles.length)

      const { error: insertError } = await (supabase as any)
        .from('job_titles')
        .insert(payload)

      if (insertError) throw insertError

      setSuccess('Job title added successfully')
      setTimeout(() => setSuccess(''), 3000)
      setNewTitle({ title_en: '', title_ar: '', description: '', is_active: true, display_order: 0 })
      await loadJobTitles()
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key value')) {
        setError('Failed to add job title: Arabic name already exists in the system.')
      } else {
        setError('Failed to add job title: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateJobTitle = async (title: JobTitle) => {
    const trimmedArabic = title.title_ar?.trim()
    if (trimmedArabic) {
      const duplicateArabic = jobTitles.some(
        existing => existing.id !== title.id && existing.title_ar && existing.title_ar.trim() === trimmedArabic
      )
      if (duplicateArabic) {
        setError('Arabic job title already exists. Please choose a different Arabic name.')
        return
      }
    }

    try {
      setSaving(true)
      setError('')

      const payload = buildJobTitlePayload(title, title.display_order)

      const { error: updateError } = await (supabase as any)
        .from('job_titles')
        .update(payload)
        .eq('id', title.id)

      if (updateError) throw updateError

      setSuccess('Job title updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingTitle(null)
      await loadJobTitles()
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key value')) {
        setError('Failed to update job title: Arabic name already exists in the system.')
      } else {
        setError('Failed to update job title: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJobTitle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job title?')) return

    try {
      setSaving(true)
      setError('')

      const { error: deleteError } = await (supabase as any)
        .from('job_titles')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSuccess('Job title deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await loadJobTitles()
    } catch (error: any) {
      setError('Failed to delete job title: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (type: 'department' | 'job_title', id: string, currentStatus: boolean) => {
    try {
      const table = type === 'department' ? 'departments' : 'job_titles'
      const { error: updateError } = await (supabase as any)
        .from(table)
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (updateError) throw updateError

      if (type === 'department') {
        await loadDepartments()
      } else {
        await loadJobTitles()
      }
    } catch (error: any) {
      setError('Failed to toggle status')
    }
  }

  if (!guard.hasAccess('settings.divisions')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have permission to manage departments and job titles.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Departments & Job Titles
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage organization structure and job positions
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'departments' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('departments')}
          className="flex items-center space-x-2"
        >
          <Building2 className="h-4 w-4" />
          <span>Departments</span>
        </Button>
        <Button
          variant={activeTab === 'job_titles' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('job_titles')}
          className="flex items-center space-x-2"
        >
          <Briefcase className="h-4 w-4" />
          <span>Job Titles</span>
        </Button>
      </div>

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
                Export your {activeTab} data in various formats
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
                  Export {activeTab === 'departments' ? 'Departments' : 'Job Titles'}
                </Button>
              </div>
            </div>

            {/* Import Section */}
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Import Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Import {activeTab} data from JSON or CSV files
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              {/* Add New Department */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Add New Department</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Department Name (English)"
                      value={newDept.name_en}
                      onChange={(e) => setNewDept(prev => ({ ...prev, name_en: e.target.value }))}
                    />
                    <Input
                      placeholder="اسم القسم (عربي) - اختياري"
                      value={newDept.name_ar}
                      onChange={(e) => setNewDept(prev => ({ ...prev, name_ar: e.target.value }))}
                      dir="rtl"
                    />
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Description (Optional)"
                        value={newDept.description}
                        onChange={(e) => setNewDept(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleAddDepartment} disabled={saving}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Departments List */}
              <Card>
                <CardHeader>
                  <CardTitle>Departments List ({departments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        {editingDept === dept.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={dept.name_en}
                                onChange={(e) => {
                                  const updated = departments.map(d =>
                                    d.id === dept.id ? { ...d, name_en: e.target.value } : d
                                  )
                                  setDepartments(updated)
                                }}
                              />
                              <Input
                                value={dept.name_ar}
                                onChange={(e) => {
                                  const updated = departments.map(d =>
                                    d.id === dept.id ? { ...d, name_ar: e.target.value } : d
                                  )
                                  setDepartments(updated)
                                }}
                                dir="rtl"
                              />
                              <div className="md:col-span-2">
                                <Input
                                  value={dept.description || ''}
                                  onChange={(e) => {
                                    const updated = departments.map(d =>
                                      d.id === dept.id ? { ...d, description: e.target.value } : d
                                    )
                                    setDepartments(updated)
                                  }}
                                  placeholder="Description"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDept(null)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateDepartment(dept)}
                                disabled={saving}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {dept.name_en}
                                {dept.name_ar?.trim() ? ` / ${dept.name_ar.trim()}` : ''}
                              </h3>
                              {dept.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {dept.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  dept.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {dept.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Order: {dept.display_order}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive('department', dept.id, dept.is_active)}
                              >
                                {dept.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDept(dept.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteDepartment(dept.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Job Titles Tab */}
          {activeTab === 'job_titles' && (
            <div className="space-y-6">
              {/* Add New Job Title */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Add New Job Title</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Job Title (English)"
                      value={newTitle.title_en}
                      onChange={(e) => setNewTitle(prev => ({ ...prev, title_en: e.target.value }))}
                    />
                    <Input
                      placeholder="المسمى الوظيفي (عربي) - اختياري"
                      value={newTitle.title_ar}
                      onChange={(e) => setNewTitle(prev => ({ ...prev, title_ar: e.target.value }))}
                      dir="rtl"
                    />
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Description (Optional)"
                        value={newTitle.description}
                        onChange={(e) => setNewTitle(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleAddJobTitle} disabled={saving}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Job Title
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Job Titles List */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Titles List ({jobTitles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jobTitles.map((title) => {
                      const trimmedArabic = title.title_ar?.trim()

                      return (
                        <div
                          key={title.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          {editingTitle === title.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                  value={title.title_en}
                                  onChange={(e) => {
                                    const updated = jobTitles.map(t =>
                                      t.id === title.id ? { ...t, title_en: e.target.value } : t
                                    )
                                    setJobTitles(updated)
                                  }}
                                />
                                <Input
                                  value={title.title_ar}
                                  onChange={(e) => {
                                    const updated = jobTitles.map(t =>
                                      t.id === title.id ? { ...t, title_ar: e.target.value } : t
                                    )
                                    setJobTitles(updated)
                                  }}
                                  dir="rtl"
                                />
                                <div className="md:col-span-2">
                                  <Input
                                    value={title.description || ''}
                                    onChange={(e) => {
                                      const updated = jobTitles.map(t =>
                                        t.id === title.id ? { ...t, description: e.target.value } : t
                                      )
                                      setJobTitles(updated)
                                    }}
                                    placeholder="Description"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingTitle(null)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateJobTitle(title)}
                                  disabled={saving}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {title.title_en}
                                  {trimmedArabic ? ` / ${trimmedArabic}` : ''}
                                </h3>
                                {title.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {title.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    title.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {title.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Order: {title.display_order}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleActive('job_title', title.id, title.is_active)}
                                >
                                  {title.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingTitle(title.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteJobTitle(title.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

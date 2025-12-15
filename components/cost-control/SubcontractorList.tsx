'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PermissionButton } from '@/components/ui/PermissionButton'
import {
  HardHat,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  X,
  CheckCircle
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'
import { downloadTemplate, downloadCSV, downloadExcel } from '@/lib/exportImportUtils'

interface Subcontractor {
  id: string
  date?: string
  project_code?: string
  activity?: string
  category?: string
  subcon_name: string
  unit?: string
  qtty?: number | string
  rate?: number | string
  cost?: number | string
  created_at: string
  updated_at: string
}

export default function SubcontractorList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('subcontractor-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedSubcontractors, setSelectedSubcontractors] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    date: '',
    project_code: '',
    activity: '',
    category: '',
    subcon_name: '',
    unit: '',
    qtty: '',
    rate: '',
    cost: ''
  })

  useEffect(() => {
    loadSubcontractors()
    loadCategories()
  }, [])

  const loadSubcontractors = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('subcontractor')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase Error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          setError('Table does not exist. Please run: Database/create-subcontractor-table.sql')
          setSubcontractors([])
          return
        }
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
          setError('Permission denied. Please run: Database/create-subcontractor-table.sql in Supabase SQL Editor to fix permissions.')
          setSubcontractors([])
          return
        }
        throw fetchError
      }

      setSubcontractors(data || [])
    } catch (error: any) {
      console.error('Error loading subcontractors:', error)
      setError('Failed to load subcontractors. Please ensure the subcontractor table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('vendor_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('subcontractor')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadSubcontractors()
      setSelectedSubcontractors(new Set())
    } catch (error: any) {
      console.error('Error deleting subcontractor:', error)
      setError('Failed to delete subcontractor')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSubcontractors.size === 0) {
      setError('Please select at least one subcontractor to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedSubcontractors.size} subcontractor(s)?`)) {
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const subcontractorIds = Array.from(selectedSubcontractors).filter(id => id && id.trim() !== '')
      
      if (subcontractorIds.length === 0) {
        setError('No valid subcontractor IDs selected')
        return
      }

      // Delete in batches to avoid URL length limits
      const batchSize = 100
      let deletedCount = 0
      let errors = 0
      
      for (let i = 0; i < subcontractorIds.length; i += batchSize) {
        const batch = subcontractorIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        const { error: deleteError, data } = await supabase
          .from('subcontractor')
          .delete()
          .in('id', batch)
          .select()

        if (deleteError) {
          console.error(`Error deleting batch ${batchNumber}:`, deleteError)
          errors += batch.length
        } else {
          deletedCount += data?.length || batch.length
        }
      }

      if (errors > 0 && deletedCount === 0) {
        throw new Error(`Failed to delete subcontractors. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} subcontractor(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} subcontractor(s)`)
      }
      
      setSelectedSubcontractors(new Set())
      await loadSubcontractors()
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting subcontractors:', error)
      setError(error.message || 'Failed to delete subcontractors')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubcontractors(new Set(filteredSubcontractors.map(s => s.id)))
    } else {
      setSelectedSubcontractors(new Set())
    }
  }

  const handleSelectSubcontractor = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedSubcontractors)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedSubcontractors(newSelected)
  }

  const handleSave = async () => {
    try {
      if (!formData.subcon_name.trim()) {
        setError('Subcontractor name is required')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const qtty = formData.qtty ? parseFloat(formData.qtty.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null

      const subcontractorData: any = {
        date: date,
        project_code: formData.project_code || null,
        activity: formData.activity || null,
        category: formData.category || null,
        subcon_name: formData.subcon_name.trim(),
        unit: formData.unit || null,
        qtty: qtty,
        rate: rate,
        cost: cost
      }

      if (editingSubcontractor) {
        const { error: updateError } = await supabase
          .from('subcontractor')
          .update(subcontractorData)
          .eq('id', editingSubcontractor.id)

        if (updateError) throw updateError
        setSuccess('Subcontractor updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('subcontractor')
          .insert([subcontractorData])

        if (insertError) throw insertError
        setSuccess('Subcontractor added successfully')
      }

      await loadSubcontractors()
      setShowForm(false)
      setEditingSubcontractor(null)
      setCategorySearch('')
      setShowCategoryDropdown(false)
      setFormData({
        date: '',
        project_code: '',
        activity: '',
        category: '',
        subcon_name: '',
        unit: '',
        qtty: '',
        rate: '',
        cost: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving subcontractor:', error)
      setError(error.message || 'Failed to save subcontractor')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Calculate cost automatically when qtty or rate changes
  useEffect(() => {
    if (showForm && formData.qtty && formData.rate) {
      const qtty = parseFloat(formData.qtty.toString()) || 0
      const rate = parseFloat(formData.rate.toString()) || 0
      const calculatedCost = qtty * rate
      setFormData(prev => ({
        ...prev,
        cost: calculatedCost.toString()
      }))
    }
  }, [formData.qtty, formData.rate, showForm])

  // Initialize form data when editing
  useEffect(() => {
    if (editingSubcontractor) {
      const dateValue = editingSubcontractor.date 
        ? new Date(editingSubcontractor.date).toISOString().split('T')[0]
        : ''
      setFormData({
        date: dateValue,
        project_code: editingSubcontractor.project_code || '',
        activity: editingSubcontractor.activity || '',
        category: editingSubcontractor.category || '',
        subcon_name: editingSubcontractor.subcon_name || '',
        unit: editingSubcontractor.unit || '',
        qtty: editingSubcontractor.qtty?.toString() || '',
        rate: editingSubcontractor.rate?.toString() || '',
        cost: editingSubcontractor.cost?.toString() || ''
      })
      setCategorySearch(editingSubcontractor.category || '')
    } else if (showForm) {
      setFormData({
        date: '',
        project_code: '',
        activity: '',
        category: '',
        subcon_name: '',
        unit: '',
        qtty: '',
        rate: '',
        cost: ''
      })
      setCategorySearch('')
      setShowCategoryDropdown(false)
    }
  }, [editingSubcontractor, showForm])

  const handleImport = async (data: any[]) => {
    try {
      setImporting(true)
      setError('')
      setSuccess('')
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('Preparing data...')

      const getValue = (row: any, possibleNames: string[]): any => {
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name]
          }
          const lowerName = name.toLowerCase()
          for (const key in row) {
            if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
        }
        return null
      }

      const cleanData = data.map(row => {
        const cleanRow: any = {}
        
        const date = getValue(row, ['DATE', 'date', 'Date'])
        if (date) {
          try {
            const dateObj = new Date(date)
            if (!isNaN(dateObj.getTime())) {
              cleanRow.date = dateObj.toISOString().split('T')[0]
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
        
        const projectCode = getValue(row, ['PROJECT CODE', 'project code', 'project_code', 'Project Code'])
        if (projectCode) cleanRow.project_code = String(projectCode).trim()
        
        const activity = getValue(row, ['ACTIVITY', 'activity', 'Activity'])
        if (activity) cleanRow.activity = String(activity).trim()
        
        const category = getValue(row, ['Category', 'category', 'CATEGORY'])
        if (category) cleanRow.category = String(category).trim()
        
        // Try to find subcontractor name in various column names
        let subconName = getValue(row, [
          'SUBCON. NAME', 
          'SUBCON NAME', 
          'SUBCONTRACTOR',
          'subcon. name', 
          'subcon name', 
          'subcon_name', 
          'Subcon Name',
          'Subcontractor',
          'SUBCONTRACTOR NAME',
          'Subcontractor Name',
          'SUBCONTRACTOR NAME',
          'SUBCONTRACTOR.NAME',
          'SUBCONTRACTOR. NAME'
        ])
        
        // If not found, try to find it in any column that might contain the name
        // Check all columns for potential subcontractor names (usually after ACTIVITY column)
        if (!subconName) {
          const rowKeys = Object.keys(row)
          // Look for columns that might contain subcontractor names
          // Usually it's the 4th column or any column after ACTIVITY
          for (const key of rowKeys) {
            const keyLower = key.toLowerCase().trim()
            if (keyLower.includes('subcon') || keyLower.includes('subcontractor') || 
                keyLower.includes('contractor') || (keyLower.includes('name') && !keyLower.includes('project'))) {
              const value = row[key]
              if (value && String(value).trim() && !String(value).match(/^\d+$/)) {
                // If it's not just a number, it might be a name
                subconName = value
                break
              }
            }
          }
          
          // If still not found, try the 4th column (index 3) as it's usually the subcontractor name
          if (!subconName && rowKeys.length >= 4) {
            const fourthColumn = rowKeys[3]
            const value = row[fourthColumn]
            if (value && String(value).trim() && !String(value).match(/^\d+$/)) {
              subconName = value
            }
          }
        }
        
        if (subconName) cleanRow.subcon_name = String(subconName).trim()
        
        const unit = getValue(row, ['UNIT', 'unit', 'Unit'])
        if (unit) cleanRow.unit = String(unit).trim()
        
        const qtty = getValue(row, ['QTTY', 'qtty', 'Qtty', 'quantity', 'Quantity'])
        if (qtty) {
          const num = parseFloat(String(qtty).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.qtty = num
        }
        
        const rate = getValue(row, ['RATE', 'rate', 'Rate'])
        if (rate) {
          const num = parseFloat(String(rate).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.rate = num
        }
        
        const cost = getValue(row, ['Cost', 'cost', 'COST'])
        if (cost) {
          const num = parseFloat(String(cost).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.cost = num
        }
        
        return cleanRow
      }).filter(row => {
        // Accept rows that have at least a subcontractor name OR activity (as fallback)
        return (row.subcon_name && row.subcon_name.trim() !== '') || (row.activity && row.activity.trim() !== '')
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains subcontractor information.')
      }
      
      // If subcon_name is missing but we have activity, use activity as fallback
      cleanData.forEach(row => {
        if (!row.subcon_name && row.activity) {
          row.subcon_name = row.activity
        }
      })
      
      // Filter again to ensure we have subcon_name
      const finalData = cleanData.filter(row => row.subcon_name && row.subcon_name.trim() !== '')
      
      if (finalData.length === 0) {
        throw new Error('No valid subcontractor names found in the file.')
      }

      const totalRecords = finalData.length
      setImportProgress({ current: 0, total: totalRecords, percentage: 0 })
      setImportStatus(`Processing ${totalRecords} records...`)

      const batchSize = 50
      let imported = 0
      let errors = 0

      for (let i = 0; i < finalData.length; i += batchSize) {
        const batch = finalData.slice(i, i + batchSize)
        const currentProcessed = i + batch.length
        
        // Update progress
        const percentage = Math.round((currentProcessed / totalRecords) * 100)
        setImportProgress({
          current: currentProcessed,
          total: totalRecords,
          percentage: percentage
        })
        setImportStatus(`Importing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalRecords / batchSize)}...`)

        const { error: insertError } = await supabase
          .from('subcontractor')
          .insert(batch)

        if (insertError) {
          console.error('Error inserting batch:', insertError)
          errors += batch.length
        } else {
          imported += batch.length
        }
      }

      // Final update
      setImportProgress({ current: totalRecords, total: totalRecords, percentage: 100 })
      setImportStatus('Import completed!')

      await loadSubcontractors()
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} subcontractor(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} subcontractor(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing subcontractors:', error)
      setError(error.message || 'Failed to import subcontractors')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredSubcontractors.length === 0) {
        setError('No subcontractors to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const exportData = filteredSubcontractors.map(subcontractor => ({
        'DATE': subcontractor.date || '',
        'PROJECT CODE': subcontractor.project_code || '',
        'ACTIVITY': subcontractor.activity || '',
        'Category': subcontractor.category || '',
        'SUBCON. NAME': subcontractor.subcon_name || '',
        'UNIT': subcontractor.unit || '',
        'QTTY': subcontractor.qtty || '',
        'RATE': subcontractor.rate || '',
        'Cost': subcontractor.cost || ''
      }))

      const filename = `subcontractors_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Subcontractors')
      }

      setSuccess(`Successfully exported ${exportData.length} subcontractor(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting subcontractors:', error)
      setError('Failed to export subcontractors')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'PROJECT CODE',
        'ACTIVITY',
        'Category',
        'SUBCON. NAME',
        'UNIT',
        'QTTY',
        'RATE',
        'Cost'
      ]
      await downloadTemplate('subcontractors_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredSubcontractors = () => {
    if (!searchTerm) return subcontractors

    const term = searchTerm.toLowerCase()
    return subcontractors.filter(subcontractor =>
      subcontractor.subcon_name?.toLowerCase().includes(term) ||
      subcontractor.project_code?.toLowerCase().includes(term) ||
      subcontractor.category?.toLowerCase().includes(term) ||
      subcontractor.activity?.toLowerCase().includes(term)
    )
  }

  const filteredSubcontractors = getFilteredSubcontractors()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.subcontractor.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Subcontractor
        </PermissionButton>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search subcontractors by name, project code, category, or activity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSubcontractors}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <div className="relative">
          <Alert variant="error">
            {error}
          </Alert>
          <button
            onClick={() => setError('')}
            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Import Progress Bar */}
      {importing && importProgress.total > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Upload className="h-4 w-4 animate-pulse" />
                  {importStatus || 'Importing subcontractors...'}
                </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {Math.round(importProgress.percentage)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(importProgress.percentage, 100)}%` }}
                >
                  {importProgress.percentage > 10 && importProgress.percentage < 100 && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                <span>
                  {importProgress.current} of {importProgress.total} subcontractors processed
                </span>
                {importProgress.percentage === 100 && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedSubcontractors.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedSubcontractors.size} subcontractor(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubcontractors(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('cost_control.subcontractor.delete') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subcontractors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Subcontractors ({filteredSubcontractors.length})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.subcontractor.import') && (
                <Button
                  onClick={handleDownloadTemplate}
                  variant="ghost"
                  size="sm"
                  title="Download Excel Template"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              )}
              <PermissionButton
                permission="cost_control.subcontractor.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.subcontractor.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="subcontractors_template"
                  templateColumns={['DATE', 'PROJECT CODE', 'ACTIVITY', 'Category', 'SUBCON. NAME', 'UNIT', 'QTTY', 'RATE', 'Cost']}
                  label=""
                  variant="outline"
                  className="p-2 border-0"
                  showTemplateButton={false}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredSubcontractors.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {subcontractors.length === 0 ? 'No Subcontractors Found' : 'No Subcontractors Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {subcontractors.length === 0 
                  ? 'Get started by adding your first subcontractor. You may need to create the subcontractor table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {subcontractors.length === 0 && (
                <PermissionButton
                  permission="cost_control.subcontractor.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Subcontractor
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.subcontractor.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedSubcontractors.size !== filteredSubcontractors.length)}
                          className="flex items-center justify-center"
                          title={selectedSubcontractors.size === filteredSubcontractors.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedSubcontractors.size === filteredSubcontractors.length && filteredSubcontractors.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Subcontractor Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Activity</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Unit</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubcontractors.map((subcontractor) => (
                    <tr
                      key={subcontractor.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.subcontractor.delete') && (
                          <button
                            onClick={() => handleSelectSubcontractor(subcontractor.id, !selectedSubcontractors.has(subcontractor.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedSubcontractors.has(subcontractor.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.date ? new Date(subcontractor.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {subcontractor.subcon_name}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.project_code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.activity || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.category || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.unit || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.qtty || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {subcontractor.rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {subcontractor.cost || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.subcontractor.edit"
                            onClick={() => {
                              setEditingSubcontractor(subcontractor)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.subcontractor.delete"
                            onClick={() => handleDelete(subcontractor.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subcontractor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingSubcontractor ? 'Edit Subcontractor' : 'Add New Subcontractor'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Subcontractor Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.subcon_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcon_name: e.target.value }))}
                      placeholder="Enter subcontractor name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code
                    </label>
                    <Input
                      value={formData.project_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_code: e.target.value }))}
                      placeholder="Project code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Activity
                    </label>
                    <Input
                      value={formData.activity}
                      onChange={(e) => setFormData(prev => ({ ...prev, activity: e.target.value }))}
                      placeholder="Activity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formData.category}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, category: e.target.value }))
                          setCategorySearch(e.target.value)
                          setShowCategoryDropdown(true)
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                        placeholder="Search or enter category..."
                        className="w-full"
                      />
                      {showCategoryDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {categories
                            .filter(cat => !categorySearch || cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                            .slice(0, 20)
                            .map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, category: cat.name }))
                                  setCategorySearch('')
                                  setShowCategoryDropdown(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {cat.name}
                              </button>
                            ))}
                          {categorySearch && !categories.find(cat => cat.name.toLowerCase() === categorySearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!categorySearch.trim()) return
                                try {
                                  const { data: existing } = await supabase
                                    .from('vendor_categories')
                                    .select('id, name')
                                    .eq('name', categorySearch.trim())
                                    .single()

                                  if (existing) {
                                    setFormData(prev => ({ ...prev, category: existing.name }))
                                    setCategorySearch('')
                                    setShowCategoryDropdown(false)
                                    return
                                  }

                                  const { data: newCategory } = await supabase
                                    .from('vendor_categories')
                                    .insert([{ name: categorySearch.trim(), is_active: true }])
                                    .select('id, name')
                                    .single()

                                  if (newCategory) {
                                    await loadCategories()
                                    setFormData(prev => ({ ...prev, category: newCategory.name }))
                                    setCategorySearch('')
                                    setShowCategoryDropdown(false)
                                  }
                                } catch (error) {
                                  setFormData(prev => ({ ...prev, category: categorySearch.trim() }))
                                  setCategorySearch('')
                                  setShowCategoryDropdown(false)
                                }
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            >
                              + Add "{categorySearch}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Unit
                    </label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="Unit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.qtty}
                      onChange={(e) => setFormData(prev => ({ ...prev, qtty: e.target.value }))}
                      placeholder="Quantity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Rate
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                      placeholder="Rate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Cost (Auto-calculated)
                    </label>
                    <Input
                      type="text"
                      value={formData.cost || '0'}
                      readOnly
                      disabled
                      className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                      placeholder="Qty × Rate"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false)
                      setEditingSubcontractor(null)
                      setCategorySearch('')
                      setShowCategoryDropdown(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading || !formData.subcon_name.trim()}
                  >
                    {loading ? 'Saving...' : editingSubcontractor ? 'Update' : 'Add'} Subcontractor
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


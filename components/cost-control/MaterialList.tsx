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
  Package,
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
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'
import { downloadTemplate, downloadCSV, downloadExcel } from '@/lib/exportImportUtils'

interface Material {
  id: string
  applicant?: string
  project_code?: string
  material: string
  unit?: string
  qtty?: number | string
  category?: string
  vendor?: string
  rate?: number | string
  cost?: number | string
  comment?: string
  join_text?: string
  created_at: string
  updated_at: string
}

export default function MaterialList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('material-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [vendors, setVendors] = useState<Array<{ name: string }>>([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    applicant: '',
    project_code: '',
    material: '',
    unit: '',
    qtty: '',
    category: '',
    vendor: '',
    rate: '',
    cost: '',
    comment: '',
    join_text: ''
  })

  useEffect(() => {
    loadMaterials()
    loadCategories()
    loadVendors()
  }, [])

  const loadMaterials = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('material')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase Error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          setError('Table does not exist. Please run: Database/create-material-table.sql')
          setMaterials([])
          return
        }
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
          setError('Permission denied. Please run: Database/create-material-table.sql in Supabase SQL Editor to fix permissions.')
          setMaterials([])
          return
        }
        throw fetchError
      }

      setMaterials(data || [])
    } catch (error: any) {
      console.error('Error loading materials:', error)
      setError('Failed to load materials. Please ensure the material table exists in the database.')
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

  const loadVendors = async () => {
    try {
      const { data } = await supabase
        .from('vendors')
        .select('name')
        .order('name', { ascending: true })
      setVendors(data || [])
    } catch (error) {
      console.error('Error loading vendors:', error)
      setVendors([])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('material')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadMaterials()
      setSelectedMaterials(new Set())
    } catch (error: any) {
      console.error('Error deleting material:', error)
      setError('Failed to delete material')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedMaterials.size === 0) {
      setError('Please select at least one material to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedMaterials.size} material(s)?`)) {
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const materialIds = Array.from(selectedMaterials).filter(id => id && id.trim() !== '')
      
      if (materialIds.length === 0) {
        setError('No valid material IDs selected')
        return
      }

      // Delete in batches to avoid URL length limits (Supabase has limits on query string length)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0
      
      for (let i = 0; i < materialIds.length; i += batchSize) {
        const batch = materialIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        const { error: deleteError, data } = await supabase
          .from('material')
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
        throw new Error(`Failed to delete materials. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} material(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} material(s)`)
      }
      
      setSelectedMaterials(new Set())
      await loadMaterials()
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting materials:', error)
      setError(error.message || 'Failed to delete materials')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMaterials(new Set(filteredMaterials.map(m => m.id)))
    } else {
      setSelectedMaterials(new Set())
    }
  }

  const handleSelectMaterial = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedMaterials)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedMaterials(newSelected)
  }

  const handleSave = async () => {
    try {
      if (!formData.material.trim()) {
        setError('Material name is required')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const qtty = formData.qtty ? parseFloat(formData.qtty.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null

      const materialData: any = {
        applicant: formData.applicant || null,
        project_code: formData.project_code || null,
        material: formData.material.trim(),
        unit: formData.unit || null,
        qtty: qtty,
        category: formData.category || null,
        vendor: formData.vendor || null,
        rate: rate,
        cost: cost,
        comment: formData.comment || null,
        join_text: formData.join_text || null
      }

      if (editingMaterial) {
        const { error: updateError } = await supabase
          .from('material')
          .update(materialData)
          .eq('id', editingMaterial.id)

        if (updateError) throw updateError
        setSuccess('Material updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('material')
          .insert([materialData])

        if (insertError) throw insertError
        setSuccess('Material added successfully')
      }

      await loadMaterials()
      setShowForm(false)
      setEditingMaterial(null)
      setCategorySearch('')
      setVendorSearch('')
      setShowCategoryDropdown(false)
      setShowVendorDropdown(false)
      setFormData({
        applicant: '',
        project_code: '',
        material: '',
        unit: '',
        qtty: '',
        category: '',
        vendor: '',
        rate: '',
        cost: '',
        comment: '',
        join_text: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving material:', error)
      setError(error.message || 'Failed to save material')
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
    if (editingMaterial) {
      setFormData({
        applicant: editingMaterial.applicant || '',
        project_code: editingMaterial.project_code || '',
        material: editingMaterial.material || '',
        unit: editingMaterial.unit || '',
        qtty: editingMaterial.qtty?.toString() || '',
        category: editingMaterial.category || '',
        vendor: editingMaterial.vendor || '',
        rate: editingMaterial.rate?.toString() || '',
        cost: editingMaterial.cost?.toString() || '',
        comment: editingMaterial.comment || '',
        join_text: editingMaterial.join_text || ''
      })
      setCategorySearch(editingMaterial.category || '')
      setVendorSearch(editingMaterial.vendor || '')
    } else if (showForm) {
      setFormData({
        applicant: '',
        project_code: '',
        material: '',
        unit: '',
        qtty: '',
        category: '',
        vendor: '',
        rate: '',
        cost: '',
        comment: '',
        join_text: ''
      })
      setCategorySearch('')
      setVendorSearch('')
      setShowCategoryDropdown(false)
      setShowVendorDropdown(false)
    }
  }, [editingMaterial, showForm])

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
        
        const applicant = getValue(row, ['Applicant', 'applicant', 'APPLICANT'])
        if (applicant) cleanRow.applicant = String(applicant).trim()
        
        const projectCode = getValue(row, ['PROJECT CODE', 'project code', 'project_code', 'Project Code'])
        if (projectCode) cleanRow.project_code = String(projectCode).trim()
        
        const material = getValue(row, ['MATERIAL', 'material', 'Material'])
        if (material) cleanRow.material = String(material).trim()
        
        const unit = getValue(row, ['UNIT', 'unit', 'Unit'])
        if (unit) cleanRow.unit = String(unit).trim()
        
        const qtty = getValue(row, ['QTTY', 'qtty', 'Qtty', 'quantity', 'Quantity'])
        if (qtty) {
          const num = parseFloat(String(qtty).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.qtty = num
        }
        
        const category = getValue(row, ['Category', 'category', 'CATEGORY'])
        if (category) cleanRow.category = String(category).trim()
        
        const vendor = getValue(row, ['Vendor', 'vendor', 'VENDOR'])
        if (vendor) cleanRow.vendor = String(vendor).trim()
        
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
        
        const comment = getValue(row, ['COMMENT', 'comment', 'Comment'])
        if (comment) cleanRow.comment = String(comment).trim()
        
        const joinText = getValue(row, ['JOIN TEXT', 'join text', 'join_text', 'Join Text'])
        if (joinText) cleanRow.join_text = String(joinText).trim()
        
        return cleanRow
      }).filter(row => row.material && row.material.trim() !== '')

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains at least a "material" column.')
      }

      const totalRecords = cleanData.length
      setImportProgress({ current: 0, total: totalRecords, percentage: 0 })
      setImportStatus(`Processing ${totalRecords} records...`)

      const batchSize = 50
      let imported = 0
      let errors = 0

      for (let i = 0; i < cleanData.length; i += batchSize) {
        const batch = cleanData.slice(i, i + batchSize)
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
          .from('material')
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

      await loadMaterials()
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} material(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} material(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing materials:', error)
      setError(error.message || 'Failed to import materials')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredMaterials.length === 0) {
        setError('No materials to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const exportData = filteredMaterials.map(material => ({
        'Applicant': material.applicant || '',
        'PROJECT CODE': material.project_code || '',
        'MATERIAL': material.material || '',
        'UNIT': material.unit || '',
        'QTTY': material.qtty || '',
        'Category': material.category || '',
        'Vendor': material.vendor || '',
        'RATE': material.rate || '',
        'Cost': material.cost || '',
        'COMMENT': material.comment || '',
        'JOIN TEXT': material.join_text || ''
      }))

      const filename = `materials_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Materials')
      }

      setSuccess(`Successfully exported ${exportData.length} material(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting materials:', error)
      setError('Failed to export materials')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'Applicant',
        'PROJECT CODE',
        'MATERIAL',
        'UNIT',
        'QTTY',
        'Category',
        'Vendor',
        'RATE',
        'Cost',
        'COMMENT',
        'JOIN TEXT'
      ]
      await downloadTemplate('materials_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredMaterials = () => {
    if (!searchTerm) return materials

    const term = searchTerm.toLowerCase()
    return materials.filter(material =>
      material.material?.toLowerCase().includes(term) ||
      material.project_code?.toLowerCase().includes(term) ||
      material.category?.toLowerCase().includes(term) ||
      material.vendor?.toLowerCase().includes(term) ||
      material.applicant?.toLowerCase().includes(term)
    )
  }

  const filteredMaterials = getFilteredMaterials()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.material.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Material
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
                placeholder="Search materials by name, project code, category, vendor, or applicant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMaterials}
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
                  {importStatus || 'Importing materials...'}
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
                  {importProgress.current} of {importProgress.total} materials processed
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
      {selectedMaterials.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedMaterials.size} material(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMaterials(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('cost_control.material.delete') && (
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

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Materials ({filteredMaterials.length})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.material.import') && (
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
                permission="cost_control.material.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.material.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={['material']}
                  templateName="materials_template"
                  templateColumns={['Applicant', 'PROJECT CODE', 'MATERIAL', 'UNIT', 'QTTY', 'Category', 'Vendor', 'RATE', 'Cost', 'COMMENT', 'JOIN TEXT']}
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
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {materials.length === 0 ? 'No Materials Found' : 'No Materials Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {materials.length === 0 
                  ? 'Get started by adding your first material. You may need to create the material table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {materials.length === 0 && (
                <PermissionButton
                  permission="cost_control.material.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Material
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.material.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedMaterials.size !== filteredMaterials.length)}
                          className="flex items-center justify-center"
                          title={selectedMaterials.size === filteredMaterials.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedMaterials.size === filteredMaterials.length && filteredMaterials.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Material</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Vendor</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Unit</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material) => (
                    <tr
                      key={material.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.material.delete') && (
                          <button
                            onClick={() => handleSelectMaterial(material.id, !selectedMaterials.has(material.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedMaterials.has(material.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {material.material}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {material.project_code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {material.category || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {material.vendor || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {material.unit || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {material.qtty || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {material.rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {material.cost || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.material.edit"
                            onClick={() => {
                              setEditingMaterial(material)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.material.delete"
                            onClick={() => handleDelete(material.id)}
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

      {/* Material Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Material <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.material}
                      onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                      placeholder="Enter material name"
                      required
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
                      Vendor
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formData.vendor}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, vendor: e.target.value }))
                          setVendorSearch(e.target.value)
                          setShowVendorDropdown(true)
                        }}
                        onFocus={() => setShowVendorDropdown(true)}
                        onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                        placeholder="Search or enter vendor..."
                        className="w-full"
                      />
                      {showVendorDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {vendors
                            .filter(v => !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()))
                            .slice(0, 20)
                            .map((v, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, vendor: v.name }))
                                  setVendorSearch('')
                                  setShowVendorDropdown(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {v.name}
                              </button>
                            ))}
                          {vendorSearch && !vendors.find(v => v.name.toLowerCase() === vendorSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, vendor: vendorSearch }))
                                setVendorSearch('')
                                setShowVendorDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            >
                              + Add "{vendorSearch}"
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

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Applicant
                    </label>
                    <Input
                      value={formData.applicant}
                      onChange={(e) => setFormData(prev => ({ ...prev, applicant: e.target.value }))}
                      placeholder="Applicant"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Comment
                    </label>
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Comments..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Join Text
                    </label>
                    <Input
                      value={formData.join_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, join_text: e.target.value }))}
                      placeholder="Join text"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false)
                      setEditingMaterial(null)
                      setCategorySearch('')
                      setVendorSearch('')
                      setShowCategoryDropdown(false)
                      setShowVendorDropdown(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading || !formData.material.trim()}
                  >
                    {loading ? 'Saving...' : editingMaterial ? 'Update' : 'Add'} Material
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


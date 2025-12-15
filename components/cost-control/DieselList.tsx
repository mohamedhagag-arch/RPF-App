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
  Fuel,
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

interface Diesel {
  id: string
  date?: string
  project_code?: string
  rpf_machine_code?: string
  gallons_qtty?: number | string
  rented_machines?: string
  qtty?: number | string
  category?: string
  material?: string
  supplier?: string
  invoice_review?: string
  rate?: number | string
  cost?: number | string
  join_text?: string
  created_at: string
  updated_at: string
}

export default function DieselList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('diesel-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [diesels, setDiesels] = useState<Diesel[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingDiesel, setEditingDiesel] = useState<Diesel | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedDiesels, setSelectedDiesels] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    date: '',
    project_code: '',
    rpf_machine_code: '',
    gallons_qtty: '',
    rented_machines: '',
    qtty: '',
    category: '',
    material: '',
    supplier: '',
    invoice_review: '',
    rate: '',
    cost: '',
    join_text: ''
  })

  useEffect(() => {
    loadDiesels()
    loadCategories()
  }, [])

  const loadDiesels = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('diesel')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase Error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          setError('Table does not exist. Please run: Database/create-diesel-table.sql')
          setDiesels([])
          return
        }
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
          setError('Permission denied. Please run: Database/create-diesel-table.sql in Supabase SQL Editor to fix permissions.')
          setDiesels([])
          return
        }
        throw fetchError
      }

      setDiesels(data || [])
    } catch (error: any) {
      console.error('Error loading diesels:', error)
      setError('Failed to load diesels. Please ensure the diesel table exists in the database.')
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
    if (!confirm('Are you sure you want to delete this diesel record?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('diesel')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadDiesels()
      setSelectedDiesels(new Set())
    } catch (error: any) {
      console.error('Error deleting diesel:', error)
      setError('Failed to delete diesel record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDiesels.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedDiesels.size} diesel record(s)?`)) return

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const selectedArray = Array.from(selectedDiesels)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0

      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batch = selectedArray.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('diesel')
          .delete()
          .in('id', batch)

        if (deleteError) {
          console.error('Error deleting batch:', deleteError)
          errors += batch.length
        } else {
          deletedCount += batch.length
        }
      }

      if (errors > 0 && deletedCount === 0) {
        throw new Error(`Failed to delete diesel records. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} diesel record(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} diesel record(s)`)
      }
      
      setSelectedDiesels(new Set())
      await loadDiesels()
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting diesel records:', error)
      setError(error.message || 'Failed to delete diesel records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDiesels(new Set(filteredDiesels.map(d => d.id)))
    } else {
      setSelectedDiesels(new Set())
    }
  }

  const handleSelectDiesel = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedDiesels)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedDiesels(newSelected)
  }

  const handleSave = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const qtty = formData.qtty ? parseFloat(formData.qtty.toString()) : null
      const gallonsQtty = formData.gallons_qtty ? parseFloat(formData.gallons_qtty.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null

      const dieselData: any = {
        date: date,
        project_code: formData.project_code || null,
        rpf_machine_code: formData.rpf_machine_code || null,
        gallons_qtty: gallonsQtty,
        rented_machines: formData.rented_machines || null,
        qtty: qtty,
        category: formData.category || null,
        material: formData.material || null,
        supplier: formData.supplier || null,
        invoice_review: formData.invoice_review || null,
        rate: rate,
        cost: cost,
        join_text: formData.join_text || null
      }

      if (editingDiesel) {
        const { error: updateError } = await supabase
          .from('diesel')
          .update(dieselData)
          .eq('id', editingDiesel.id)

        if (updateError) throw updateError
        setSuccess('Diesel record updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('diesel')
          .insert([dieselData])

        if (insertError) throw insertError
        setSuccess('Diesel record added successfully')
      }

      await loadDiesels()
      setShowForm(false)
      setEditingDiesel(null)
      setCategorySearch('')
      setShowCategoryDropdown(false)
      setFormData({
        date: '',
        project_code: '',
        rpf_machine_code: '',
        gallons_qtty: '',
        rented_machines: '',
        qtty: '',
        category: '',
        material: '',
        supplier: '',
        invoice_review: '',
        rate: '',
        cost: '',
        join_text: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving diesel:', error)
      setError(error.message || 'Failed to save diesel record')
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
    if (editingDiesel) {
      const dateValue = editingDiesel.date 
        ? new Date(editingDiesel.date).toISOString().split('T')[0]
        : ''
      setFormData({
        date: dateValue,
        project_code: editingDiesel.project_code || '',
        rpf_machine_code: editingDiesel.rpf_machine_code || '',
        gallons_qtty: editingDiesel.gallons_qtty?.toString() || '',
        rented_machines: editingDiesel.rented_machines || '',
        qtty: editingDiesel.qtty?.toString() || '',
        category: editingDiesel.category || '',
        material: editingDiesel.material || '',
        supplier: editingDiesel.supplier || '',
        invoice_review: editingDiesel.invoice_review || '',
        rate: editingDiesel.rate?.toString() || '',
        cost: editingDiesel.cost?.toString() || '',
        join_text: editingDiesel.join_text || ''
      })
      setCategorySearch(editingDiesel.category || '')
    } else if (showForm) {
      setFormData({
        date: '',
        project_code: '',
        rpf_machine_code: '',
        gallons_qtty: '',
        rented_machines: '',
        qtty: '',
        category: '',
        material: '',
        supplier: '',
        invoice_review: '',
        rate: '',
        cost: '',
        join_text: ''
      })
      setCategorySearch('')
      setShowCategoryDropdown(false)
    }
  }, [editingDiesel, showForm])

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
        
        const rpfMachineCode = getValue(row, ['RPF MACHINE CODE', 'rpf machine code', 'rpf_machine_code', 'RPF Machine Code'])
        if (rpfMachineCode) cleanRow.rpf_machine_code = String(rpfMachineCode).trim()
        
        const gallonsQtty = getValue(row, ['GALLONS QTTY', 'gallons qtty', 'gallons_qtty', 'Gallons Qtty'])
        if (gallonsQtty) {
          const num = parseFloat(String(gallonsQtty).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.gallons_qtty = num
        }
        
        const rentedMachines = getValue(row, ['RENTED MACHINES', 'rented machines', 'rented_machines', 'Rented Machines'])
        if (rentedMachines) cleanRow.rented_machines = String(rentedMachines).trim()
        
        const qtty = getValue(row, ['QTTY', 'qtty', 'Qtty', 'quantity', 'Quantity'])
        if (qtty) {
          const num = parseFloat(String(qtty).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.qtty = num
        }
        
        const category = getValue(row, ['Category', 'category', 'CATEGORY', 'Category '])
        if (category) cleanRow.category = String(category).trim()
        
        const material = getValue(row, ['MATERIAL', 'material', 'Material'])
        if (material) cleanRow.material = String(material).trim()
        
        const supplier = getValue(row, ['SUPPLIER', 'supplier', 'Supplier'])
        if (supplier) cleanRow.supplier = String(supplier).trim()
        
        const invoiceReview = getValue(row, ['INVOICE REVIEW', 'invoice review', 'invoice_review', 'Invoice Review'])
        if (invoiceReview) cleanRow.invoice_review = String(invoiceReview).trim()
        
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
        
        const joinText = getValue(row, ['JOIN TEXT', 'join text', 'join_text', 'Join Text'])
        if (joinText) cleanRow.join_text = String(joinText).trim()
        
        return cleanRow
      }).filter(row => {
        // Accept rows that have at least some data
        return row.date || row.project_code || row.material || row.supplier
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains diesel information.')
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
          .from('diesel')
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

      await loadDiesels()
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} diesel record(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} diesel record(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing diesel:', error)
      setError(error.message || 'Failed to import diesel records')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredDiesels.length === 0) {
        setError('No diesel records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const exportData = filteredDiesels.map(diesel => ({
        'DATE': diesel.date || '',
        'PROJECT CODE': diesel.project_code || '',
        'RPF MACHINE CODE': diesel.rpf_machine_code || '',
        'GALLONS QTTY': diesel.gallons_qtty || '',
        'RENTED MACHINES': diesel.rented_machines || '',
        'QTTY': diesel.qtty || '',
        'Category': diesel.category || '',
        'MATERIAL': diesel.material || '',
        'SUPPLIER': diesel.supplier || '',
        'INVOICE REVIEW': diesel.invoice_review || '',
        'RATE': diesel.rate || '',
        'Cost': diesel.cost || '',
        'JOIN TEXT': diesel.join_text || ''
      }))

      const filename = `diesel_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Diesel')
      }

      setSuccess(`Successfully exported ${exportData.length} diesel record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting diesel:', error)
      setError('Failed to export diesel records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'PROJECT CODE',
        'RPF MACHINE CODE',
        'GALLONS QTTY',
        'RENTED MACHINES',
        'QTTY',
        'Category',
        'MATERIAL',
        'SUPPLIER',
        'INVOICE REVIEW',
        'RATE',
        'Cost',
        'JOIN TEXT'
      ]
      await downloadTemplate('diesel_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredDiesels = () => {
    if (!searchTerm) return diesels

    const term = searchTerm.toLowerCase()
    return diesels.filter(diesel =>
      diesel.project_code?.toLowerCase().includes(term) ||
      diesel.rpf_machine_code?.toLowerCase().includes(term) ||
      diesel.category?.toLowerCase().includes(term) ||
      diesel.material?.toLowerCase().includes(term) ||
      diesel.supplier?.toLowerCase().includes(term)
    )
  }

  const filteredDiesels = getFilteredDiesels()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.diesel.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Diesel Record
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
                placeholder="Search diesel records by project code, machine code, category, material, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDiesels}
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
                  {importStatus || 'Importing diesel records...'}
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
                  {importProgress.current} of {importProgress.total} diesel records processed
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
      {selectedDiesels.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedDiesels.size} diesel record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDiesels(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('cost_control.diesel.delete') && (
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

      {/* Diesel Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Diesel Records ({filteredDiesels.length})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.diesel.import') && (
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
                permission="cost_control.diesel.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.diesel.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="diesel_template"
                  templateColumns={['DATE', 'PROJECT CODE', 'RPF MACHINE CODE', 'GALLONS QTTY', 'RENTED MACHINES', 'QTTY', 'Category', 'MATERIAL', 'SUPPLIER', 'INVOICE REVIEW', 'RATE', 'Cost', 'JOIN TEXT']}
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
          ) : filteredDiesels.length === 0 ? (
            <div className="text-center py-12">
              <Fuel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {diesels.length === 0 ? 'No Diesel Records Found' : 'No Diesel Records Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {diesels.length === 0 
                  ? 'Get started by adding your first diesel record. You may need to create the diesel table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {diesels.length === 0 && (
                <PermissionButton
                  permission="cost_control.diesel.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Diesel Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.diesel.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedDiesels.size !== filteredDiesels.length)}
                          className="flex items-center justify-center"
                          title={selectedDiesels.size === filteredDiesels.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedDiesels.size === filteredDiesels.length && filteredDiesels.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">RPF Machine Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Material</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Supplier</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiesels.map((diesel) => (
                    <tr
                      key={diesel.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.diesel.delete') && (
                          <button
                            onClick={() => handleSelectDiesel(diesel.id, !selectedDiesels.has(diesel.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedDiesels.has(diesel.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.date ? new Date(diesel.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.project_code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.rpf_machine_code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.category || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {diesel.material || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.supplier || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.qtty || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {diesel.rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {diesel.cost || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.diesel.edit"
                            onClick={() => {
                              setEditingDiesel(diesel)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.diesel.delete"
                            onClick={() => handleDelete(diesel.id)}
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

      {/* Diesel Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingDiesel ? 'Edit Diesel Record' : 'Add New Diesel Record'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      RPF Machine Code
                    </label>
                    <Input
                      value={formData.rpf_machine_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, rpf_machine_code: e.target.value }))}
                      placeholder="RPF machine code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Gallons Quantity
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.gallons_qtty}
                      onChange={(e) => setFormData(prev => ({ ...prev, gallons_qtty: e.target.value }))}
                      placeholder="Gallons quantity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Rented Machines
                    </label>
                    <Input
                      value={formData.rented_machines}
                      onChange={(e) => setFormData(prev => ({ ...prev, rented_machines: e.target.value }))}
                      placeholder="Rented machines"
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
                      Material
                    </label>
                    <Input
                      value={formData.material}
                      onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                      placeholder="Material"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Supplier
                    </label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Supplier"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Invoice Review
                    </label>
                    <Input
                      value={formData.invoice_review}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_review: e.target.value }))}
                      placeholder="Invoice review"
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
                      setEditingDiesel(null)
                      setCategorySearch('')
                      setShowCategoryDropdown(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : editingDiesel ? 'Update' : 'Add'} Diesel Record
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


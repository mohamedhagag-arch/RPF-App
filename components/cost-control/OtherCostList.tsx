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
  DollarSign,
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
  Filter,
  Calendar
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'
import { downloadTemplate, downloadCSV, downloadExcel } from '@/lib/exportImportUtils'
import { formatDate } from '@/lib/dateHelpers'
import { ProjectCodeSelect } from './ProjectCodeSelect'

interface OtherCost {
  id: string
  date?: string
  project_code?: string
  category?: string
  reference?: string
  unit?: string
  qtty?: number | string
  rate?: number | string
  cost?: number | string
  join_text?: string
  note?: string
  created_at: string
  updated_at: string
}

export default function OtherCostList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('other-cost-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingOtherCost, setEditingOtherCost] = useState<OtherCost | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedOtherCosts, setSelectedOtherCosts] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [displayedCount, setDisplayedCount] = useState(50) // عدد السجلات المعروضة
  const ITEMS_PER_PAGE = 50 // عدد السجلات في كل صفحة
  
  // Project Code and Category dropdown states for filters
  const [projectCodes, setProjectCodes] = useState<Array<{ code: string }>>([])
  const [projectCodeSearch, setProjectCodeSearch] = useState('')
  const [showProjectCodeDropdown, setShowProjectCodeDropdown] = useState(false)
  
  const [categories, setCategories] = useState<Array<{ category: string }>>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterProjectCode, setFilterProjectCode] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    date: '',
    project_code: '',
    category: '',
    reference: '',
    unit: '',
    qtty: '',
    rate: '',
    cost: '',
    join_text: '',
    note: ''
  })

  useEffect(() => {
    loadOtherCosts() // This will also load project codes and categories
  }, [])

  // إعادة تعيين عدد السجلات المعروضة عند تغيير البحث أو الفلاتر
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE)
  }, [searchTerm, filterDateFrom, filterDateTo, filterProjectCode, filterCategory])

  const loadOtherCosts = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تحميل جميع البيانات بدون limit
      let allData: OtherCost[] = []
      let page = 0
      const pageSize = 1000 // تحميل 1000 سجل في كل مرة
      let hasMore = true

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('other_cost')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (fetchError) {
          console.error('Supabase Error:', fetchError)
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
            setError('Table does not exist. Please run: Database/create-other-cost-table.sql')
            setOtherCosts([])
            return
          }
          if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
            setError('Permission denied. Please run: Database/create-other-cost-table.sql in Supabase SQL Editor to fix permissions.')
            setOtherCosts([])
            return
          }
          throw fetchError
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          page++
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      setOtherCosts(allData)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      // Extract unique project codes and categories from loaded data
      const uniqueProjectCodes = Array.from(
        new Set(
          allData
            .map(item => item.project_code)
            .filter(code => code && code.trim() !== '')
        )
      ).map(code => ({ code: code as string }))
        .sort((a, b) => a.code.localeCompare(b.code))
      
      const uniqueCategories = Array.from(
        new Set(
          allData
            .map(item => item.category)
            .filter(category => category && category.trim() !== '')
        )
      ).map(category => ({ category: category as string }))
        .sort((a, b) => a.category.localeCompare(b.category))
      
      setProjectCodes(uniqueProjectCodes)
      setCategories(uniqueCategories)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error loading Other cost:', error)
      setError('Failed to load Other cost records. Please ensure the other_cost table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  // Note: Project codes and categories are now extracted from loaded data in loadOtherCosts()

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Other cost record?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('other_cost')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadOtherCosts()
      setSelectedOtherCosts(new Set())
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error deleting Other cost:', error)
      setError('Failed to delete Other cost record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedOtherCosts.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedOtherCosts.size} Other cost record(s)?`)) return

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const selectedArray = Array.from(selectedOtherCosts)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0

      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batch = selectedArray.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('other_cost')
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
        throw new Error(`Failed to delete Other cost records. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} Other cost record(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} Other cost record(s)`)
      }
      
      setSelectedOtherCosts(new Set())
      await loadOtherCosts()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting Other cost records:', error)
      setError(error.message || 'Failed to delete Other cost records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOtherCosts(new Set(displayedOtherCosts.map(e => e.id)))
    } else {
      setSelectedOtherCosts(new Set())
    }
  }

  const handleSelectOtherCost = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedOtherCosts)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedOtherCosts(newSelected)
  }

  const handleSave = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const qtty = formData.qtty ? parseFloat(formData.qtty.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null

      const otherCostData: any = {
        date: date,
        project_code: formData.project_code || null,
        category: formData.category || null,
        reference: formData.reference || null,
        unit: formData.unit || null,
        qtty: qtty,
        rate: rate,
        cost: cost,
        join_text: formData.join_text || null,
        note: formData.note || null
      }

      if (editingOtherCost) {
        const { error: updateError } = await supabase
          .from('other_cost')
          .update(otherCostData)
          .eq('id', editingOtherCost.id)

        if (updateError) throw updateError
        setSuccess('Other cost record updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('other_cost')
          .insert([otherCostData])

        if (insertError) throw insertError
        setSuccess('Other cost record added successfully')
      }

      await loadOtherCosts() // This will also reload project codes and categories
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setShowForm(false)
      setEditingOtherCost(null)
      setCategorySearch('')
      setFormData({
        date: '',
        project_code: '',
        category: '',
        reference: '',
        unit: '',
        qtty: '',
        rate: '',
        cost: '',
        join_text: '',
        note: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving Other cost:', error)
      setError(error.message || 'Failed to save Other cost record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Note: Cost is entered manually for Other Cost (not auto-calculated)

  // Initialize form data when editing
  useEffect(() => {
    if (editingOtherCost) {
      const dateValue = editingOtherCost.date 
        ? new Date(editingOtherCost.date).toISOString().split('T')[0]
        : ''
      setFormData({
        date: dateValue,
        project_code: editingOtherCost.project_code || '',
        category: editingOtherCost.category || '',
        reference: editingOtherCost.reference || '',
        unit: editingOtherCost.unit || '',
        qtty: editingOtherCost.qtty?.toString() || '',
        rate: editingOtherCost.rate?.toString() || '',
        cost: editingOtherCost.cost?.toString() || '',
        join_text: editingOtherCost.join_text || '',
        note: editingOtherCost.note || ''
      })
      setCategorySearch(editingOtherCost.category || '')
    } else if (showForm) {
      setFormData({
        date: '',
        project_code: '',
        category: '',
        reference: '',
        unit: '',
        qtty: '',
        rate: '',
        cost: '',
        join_text: '',
        note: ''
      })
      setCategorySearch('')
    }
  }, [editingOtherCost, showForm])

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
        if (date !== null && date !== undefined && date !== '') {
          try {
            let dateObj: Date | null = null
            const dateStr = String(date).trim()
            
            const numValue = parseFloat(dateStr)
            
            if (!isNaN(numValue) && numValue > 0 && numValue < 1000000 && 
                !dateStr.includes('/') && !dateStr.includes('-') && !dateStr.includes('T')) {
              
              let days = Math.floor(numValue)
              const isAfterFeb28_1900 = days > 59
              
              if (isAfterFeb28_1900) {
                days = days - 1
              }
              
              const epoch = new Date(1899, 11, 30)
              dateObj = new Date(epoch.getTime() + (days - 1) * 24 * 60 * 60 * 1000)
              
              if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900 || dateObj.getFullYear() > 2100) {
                dateObj = null
              }
            } else {
              dateObj = new Date(dateStr)
              if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900 || dateObj.getFullYear() > 2100) {
                dateObj = null
              }
            }
            
            if (dateObj && !isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900 && dateObj.getFullYear() <= 2100) {
              cleanRow.date = dateObj.toISOString().split('T')[0]
            }
          } catch (e) {
            console.warn('Invalid date value:', date, e)
          }
        }
        
        const projectCode = getValue(row, ['PROJECT CODE', 'project code', 'project_code', 'Project Code'])
        if (projectCode) cleanRow.project_code = String(projectCode).trim()
        
        const category = getValue(row, ['Category', 'category', 'CATEGORY'])
        if (category) cleanRow.category = String(category).trim()
        
        const reference = getValue(row, ['Reference ', 'Reference', 'reference', 'REFERENCE'])
        if (reference) cleanRow.reference = String(reference).trim()
        
        const unit = getValue(row, ['UNIT', 'unit', 'Unit'])
        if (unit) cleanRow.unit = String(unit).trim()
        
        const qtty = getValue(row, ['QTTY', 'qtty', 'Qtty', 'QTY', 'qty'])
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
        
        const joinText = getValue(row, ['JOIN TEXT', 'join text', 'join_text', 'Join Text'])
        if (joinText) cleanRow.join_text = String(joinText).trim()
        
        const note = getValue(row, ['NOTE', 'note', 'Note'])
        if (note) cleanRow.note = String(note).trim()
        
        return cleanRow
      }).filter(row => {
        return row.date || row.project_code || row.category || row.reference
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains Other cost information.')
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
        
        const percentage = Math.round((currentProcessed / totalRecords) * 100)
        setImportProgress({
          current: currentProcessed,
          total: totalRecords,
          percentage: percentage
        })
        setImportStatus(`Importing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalRecords / batchSize)}...`)

        const { error: insertError } = await supabase
          .from('other_cost')
          .insert(batch)

        if (insertError) {
          console.error('Error inserting batch:', insertError)
          errors += batch.length
        } else {
          imported += batch.length
        }
      }

      setImportProgress({ current: totalRecords, total: totalRecords, percentage: 100 })
      setImportStatus('Import completed!')

      await loadOtherCosts()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} Other cost record(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} Other cost record(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing Other cost:', error)
      setError(error.message || 'Failed to import Other cost records')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (otherCosts.length === 0) {
        setError('No Other cost records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // تصدير جميع البيانات (وليس فقط المعروضة)
      const exportData = (searchTerm ? filteredOtherCosts : otherCosts).map(oc => ({
        'DATE': oc.date || '',
        'PROJECT CODE': oc.project_code || '',
        'Category': oc.category || '',
        'Reference ': oc.reference || '',
        'UNIT': oc.unit || '',
        'QTTY': oc.qtty || '',
        'RATE': oc.rate || '',
        'Cost': oc.cost || '',
        'JOIN TEXT': oc.join_text || '',
        'NOTE': oc.note || ''
      }))

      const filename = `other_cost_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Other Cost')
      }

      setSuccess(`Successfully exported ${exportData.length} Other cost record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting Other cost:', error)
      setError('Failed to export Other cost records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'PROJECT CODE',
        'Category',
        'Reference ',
        'UNIT',
        'QTTY',
        'RATE',
        'Cost',
        'JOIN TEXT',
        'NOTE'
      ]
      await downloadTemplate('other_cost_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredOtherCosts = () => {
    let filtered = otherCosts

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(oc =>
        oc.project_code?.toLowerCase().includes(term) ||
        oc.category?.toLowerCase().includes(term) ||
        oc.reference?.toLowerCase().includes(term) ||
        oc.unit?.toLowerCase().includes(term) ||
        oc.join_text?.toLowerCase().includes(term) ||
        oc.note?.toLowerCase().includes(term)
      )
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(eq => {
        if (!eq.date) return false
        const eqDate = new Date(eq.date)
        eqDate.setHours(0, 0, 0, 0)
        return eqDate >= fromDate
      })
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(eq => {
        if (!eq.date) return false
        const eqDate = new Date(eq.date)
        eqDate.setHours(0, 0, 0, 0)
        return eqDate <= toDate
      })
    }

    // Apply project code filter (multiple selection)
    if (filterProjectCode.size > 0) {
      filtered = filtered.filter(oc => {
        if (!oc.project_code) return false
        return filterProjectCode.has(oc.project_code)
      })
    }

    // Apply category filter (multiple selection)
    if (filterCategory.size > 0) {
      filtered = filtered.filter(oc => {
        if (!oc.category) return false
        return filterCategory.has(oc.category)
      })
    }

    return filtered
  }

  const clearFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterProjectCode(new Set())
    setFilterCategory(new Set())
    setProjectCodeSearch('')
    setCategorySearch('')
  }

  const hasActiveFilters = filterDateFrom || filterDateTo || filterProjectCode.size > 0 || filterCategory.size > 0

  const handleProjectCodeToggle = (code: string) => {
    const newSet = new Set(filterProjectCode)
    if (newSet.has(code)) {
      newSet.delete(code)
    } else {
      newSet.add(code)
    }
    setFilterProjectCode(newSet)
  }

  const handleCategoryToggle = (category: string) => {
    const newSet = new Set(filterCategory)
    if (newSet.has(category)) {
      newSet.delete(category)
    } else {
      newSet.add(category)
    }
    setFilterCategory(newSet)
  }

  const filteredOtherCosts = getFilteredOtherCosts()
  const displayedOtherCosts = filteredOtherCosts.slice(0, displayedCount)
  const hasMore = displayedCount < filteredOtherCosts.length

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.other_cost.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Other Cost Record
        </PermissionButton>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search Other cost records by project code, category, reference, unit, join text, or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 ${hasActiveFilters ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : ''}`}
                title="Toggle Filters"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                    {[
                      filterDateFrom || filterDateTo ? 1 : 0,
                      filterProjectCode.size > 0 ? 1 : 0,
                      filterCategory.size > 0 ? 1 : 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadOtherCosts}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Range
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Project Code Filter - Multi-select */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code {filterProjectCode.size > 0 && `(${filterProjectCode.size} selected)`}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search project codes..."
                        value={projectCodeSearch}
                        onChange={(e) => {
                          setProjectCodeSearch(e.target.value)
                          setShowProjectCodeDropdown(true)
                        }}
                        onFocus={() => setShowProjectCodeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowProjectCodeDropdown(false), 200)}
                        className="w-full"
                      />
                      {showProjectCodeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {projectCodes
                            .filter(pc => !projectCodeSearch || pc.code.toLowerCase().includes(projectCodeSearch.toLowerCase()))
                            .map((pc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleProjectCodeToggle(pc.code)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                              >
                                {filterProjectCode.has(pc.code) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{pc.code}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {/* Display selected project codes */}
                      {filterProjectCode.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(filterProjectCode).map((code) => (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {code}
                              <button
                                type="button"
                                onClick={() => handleProjectCodeToggle(code)}
                                className="hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Filter - Multi-select */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Category {filterCategory.size > 0 && `(${filterCategory.size} selected)`}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value)
                          setShowCategoryDropdown(true)
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                        className="w-full"
                      />
                      {showCategoryDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {categories
                            .filter(c => !categorySearch || c.category.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map((c, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleCategoryToggle(c.category)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                              >
                                {filterCategory.has(c.category) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{c.category}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {/* Display selected categories */}
                      {filterCategory.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(filterCategory).map((category) => (
                            <span
                              key={category}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {category}
                              <button
                                type="button"
                                onClick={() => handleCategoryToggle(category)}
                                className="hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-600 dark:text-gray-300"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
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
                  {importStatus || 'Importing Other cost records...'}
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
                  {importProgress.current} of {importProgress.total} Other cost records processed
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
      {selectedOtherCosts.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedOtherCosts.size} Other cost record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOtherCosts(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('cost_control.other_cost.delete') && (
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

      {/* Other Cost Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Other Cost Records ({filteredOtherCosts.length} {displayedCount < filteredOtherCosts.length ? `- Showing ${displayedCount}` : ''})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.other_cost.import') && (
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
                permission="cost_control.other_cost.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.other_cost.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="other_cost_template"
                  templateColumns={['DATE', 'PROJECT CODE', 'Category', 'Reference ', 'UNIT', 'QTTY', 'RATE', 'Cost', 'JOIN TEXT', 'NOTE']}
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
          ) : filteredOtherCosts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {otherCosts.length === 0 ? 'No Other Cost Records Found' : 'No Other Cost Records Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {otherCosts.length === 0 
                  ? 'Get started by adding your first Other cost record. You may need to create the other_cost table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {otherCosts.length === 0 && (
                <PermissionButton
                  permission="cost_control.other_cost.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Other Cost Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.other_cost.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedOtherCosts.size !== filteredOtherCosts.length)}
                          className="flex items-center justify-center"
                          title={selectedOtherCosts.size === filteredOtherCosts.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedOtherCosts.size === filteredOtherCosts.length && filteredOtherCosts.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Reference</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">UNIT</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">QTTY</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">JOIN TEXT</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Note</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOtherCosts.map((oc) => (
                    <tr
                      key={oc.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.other_cost.delete') && (
                          <button
                            onClick={() => handleSelectOtherCost(oc.id, !selectedOtherCosts.has(oc.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedOtherCosts.has(oc.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.date ? formatDate(oc.date) : '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.project_code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.category || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.reference || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.unit || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.qtty || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {oc.cost || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {oc.join_text || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={oc.note || ''}>
                        {oc.note || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.other_cost.edit"
                            onClick={() => {
                              setEditingOtherCost(oc)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.other_cost.delete"
                            onClick={() => handleDelete(oc.id)}
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

          {/* Load More Button */}
          {!loading && filteredOtherCosts.length > 0 && hasMore && (
            <div className="flex justify-center mt-6 pb-4">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load More ({Math.min(ITEMS_PER_PAGE, filteredOtherCosts.length - displayedCount)} more records)
              </Button>
            </div>
          )}

          {/* Show All Loaded Message */}
          {!loading && filteredOtherCosts.length > 0 && !hasMore && displayedCount > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All {filteredOtherCosts.length} records are displayed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Cost Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingOtherCost ? 'Edit Other Cost Record' : 'Add New Other Cost Record'}
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
                    <ProjectCodeSelect
                      value={formData.project_code || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, project_code: value }))}
                      placeholder="Project code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <div className="relative">
                      <Input
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
                            .filter(c => !categorySearch || c.category.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map((c, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, category: c.category }))
                                  setCategorySearch('')
                                  setShowCategoryDropdown(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {c.category}
                              </button>
                            ))}
                          {categorySearch && !categories.find(c => c.category.toLowerCase() === categorySearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, category: categorySearch }))
                                setCategorySearch('')
                                setShowCategoryDropdown(false)
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
                      Reference
                    </label>
                    <Input
                      value={formData.reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Reference"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      UNIT
                    </label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="Unit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      QTTY
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
                      Cost
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                      placeholder="Cost"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      JOIN TEXT
                    </label>
                    <Input
                      value={formData.join_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, join_text: e.target.value }))}
                      placeholder="Join text"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Note
                    </label>
                    <Input
                      value={formData.note}
                      onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="Note"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false)
                      setEditingOtherCost(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : editingOtherCost ? 'Update' : 'Add'} Other Cost Record
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


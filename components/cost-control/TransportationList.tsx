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
  Truck,
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

interface Transportation {
  id: string
  date?: string
  type?: string
  category?: string
  nos?: number | string
  length_m?: number | string
  items?: string
  project_code_from?: string
  project_code_to?: string
  rate?: number | string
  waiting_rate?: number | string
  cost?: number | string
  comment?: string
  confirmed?: boolean
  created_at: string
  updated_at: string
}

export default function TransportationList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('transportation-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [transportations, setTransportations] = useState<Transportation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTransportation, setEditingTransportation] = useState<Transportation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedTransportations, setSelectedTransportations] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProjectCodeFrom, setFilterProjectCodeFrom] = useState('')
  const [filterProjectCodeTo, setFilterProjectCodeTo] = useState('')
  const [filterConfirmed, setFilterConfirmed] = useState<string>('all') // 'all', 'yes', 'no'
  const [displayedCount, setDisplayedCount] = useState(50) // عدد السجلات المعروضة
  const ITEMS_PER_PAGE = 50 // عدد السجلات في كل صفحة
  
  const [formData, setFormData] = useState({
    date: '',
    type: '',
    category: '',
    nos: '',
    length_m: '',
    items: '',
    project_code_from: '',
    project_code_to: '',
    rate: '',
    waiting_rate: '',
    cost: '',
    comment: '',
    confirmed: false
  })

  useEffect(() => {
    loadTransportations()
    loadCategories()
  }, [])

  // إعادة تعيين عدد السجلات المعروضة عند تغيير البحث أو الفلاتر
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE)
  }, [searchTerm, filterDateFrom, filterDateTo, filterType, filterCategory, filterProjectCodeFrom, filterProjectCodeTo, filterConfirmed])

  const loadTransportations = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تحميل جميع البيانات بدون limit
      let allData: Transportation[] = []
      let page = 0
      const pageSize = 1000 // تحميل 1000 سجل في كل مرة
      let hasMore = true

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('transportation')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (fetchError) {
          console.error('Supabase Error:', fetchError)
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
            setError('Table does not exist. Please run: Database/create-transportation-table.sql')
            setTransportations([])
            return
          }
          if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
            setError('Permission denied. Please run: Database/create-transportation-table.sql in Supabase SQL Editor to fix permissions.')
            setTransportations([])
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

      setTransportations(allData)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error loading transportations:', error)
      setError('Failed to load transportations. Please ensure the transportation table exists in the database.')
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
    if (!confirm('Are you sure you want to delete this transportation record?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('transportation')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadTransportations()
      setSelectedTransportations(new Set())
    } catch (error: any) {
      console.error('Error deleting transportation:', error)
      setError('Failed to delete transportation record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTransportations.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedTransportations.size} transportation record(s)?`)) return

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const selectedArray = Array.from(selectedTransportations)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0

      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batch = selectedArray.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('transportation')
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
        throw new Error(`Failed to delete transportation records. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} transportation record(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} transportation record(s)`)
      }
      
      setSelectedTransportations(new Set())
      await loadTransportations()
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting transportation records:', error)
      setError(error.message || 'Failed to delete transportation records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransportations(new Set(displayedTransportations.map(t => t.id)))
    } else {
      setSelectedTransportations(new Set())
    }
  }

  const handleSelectTransportation = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTransportations)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedTransportations(newSelected)
  }

  const handleSave = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const nos = formData.nos ? parseFloat(formData.nos.toString()) : null
      const lengthM = formData.length_m ? parseFloat(formData.length_m.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const waitingRate = formData.waiting_rate ? parseFloat(formData.waiting_rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      
      // Validate and format date
      let date = null
      if (formData.date && formData.date.trim()) {
        try {
          const dateObj = new Date(formData.date)
          if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900) {
            date = dateObj.toISOString().split('T')[0]
          }
        } catch (e) {
          // Invalid date, leave as null
        }
      }

      const transportationData: any = {
        date: date,
        type: formData.type || null,
        category: formData.category || null,
        nos: nos,
        length_m: lengthM,
        items: formData.items || null,
        project_code_from: formData.project_code_from || null,
        project_code_to: formData.project_code_to || null,
        rate: rate,
        waiting_rate: waitingRate,
        cost: cost,
        comment: formData.comment || null,
        confirmed: formData.confirmed || false
      }

      if (editingTransportation) {
        const { error: updateError } = await supabase
          .from('transportation')
          .update(transportationData)
          .eq('id', editingTransportation.id)

        if (updateError) throw updateError
        setSuccess('Transportation record updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('transportation')
          .insert([transportationData])

        if (insertError) throw insertError
        setSuccess('Transportation record added successfully')
      }

      await loadTransportations()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setShowForm(false)
      setEditingTransportation(null)
      setCategorySearch('')
      setShowCategoryDropdown(false)
      setFormData({
        date: '',
        type: '',
        category: '',
        nos: '',
        length_m: '',
        items: '',
        project_code_from: '',
        project_code_to: '',
        rate: '',
        waiting_rate: '',
        cost: '',
        comment: '',
        confirmed: false
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving transportation:', error)
      setError(error.message || 'Failed to save transportation record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Initialize form data when editing
  useEffect(() => {
    if (editingTransportation) {
      let dateValue = ''
      if (editingTransportation.date) {
        try {
          const date = new Date(editingTransportation.date)
          if (!isNaN(date.getTime()) && date.getFullYear() >= 1900) {
            dateValue = date.toISOString().split('T')[0]
          }
        } catch (e) {
          // Invalid date, leave empty
        }
      }
      setFormData({
        date: dateValue,
        type: editingTransportation.type || '',
        category: editingTransportation.category || '',
        nos: editingTransportation.nos?.toString() || '',
        length_m: editingTransportation.length_m?.toString() || '',
        items: editingTransportation.items || '',
        project_code_from: editingTransportation.project_code_from || '',
        project_code_to: editingTransportation.project_code_to || '',
        rate: editingTransportation.rate?.toString() || '',
        waiting_rate: editingTransportation.waiting_rate?.toString() || '',
        cost: editingTransportation.cost?.toString() || '',
        comment: editingTransportation.comment || '',
        confirmed: editingTransportation.confirmed || false
      })
      setCategorySearch(editingTransportation.category || '')
    } else if (showForm) {
      setFormData({
        date: '',
        type: '',
        category: '',
        nos: '',
        length_m: '',
        items: '',
        project_code_from: '',
        project_code_to: '',
        rate: '',
        waiting_rate: '',
        cost: '',
        comment: '',
        confirmed: false
      })
      setCategorySearch('')
      setShowCategoryDropdown(false)
    }
  }, [editingTransportation, showForm])

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
            
            // Check if it's a numeric serial number (Excel/Google Sheets date format)
            // Excel/Google Sheets stores dates as serial numbers where 1 = Jan 1, 1900
            const numValue = parseFloat(dateStr)
            
            // Check if it looks like a serial date number (typically 1-100000 range for dates 1900-2174)
            if (!isNaN(numValue) && numValue > 0 && numValue < 1000000 && 
                !dateStr.includes('/') && !dateStr.includes('-') && !dateStr.includes('T')) {
              
              // Excel/Google Sheets serial date conversion
              // Excel epoch: January 1, 1900 = 1
              // Excel incorrectly treats 1900 as a leap year, so we adjust for dates after Feb 28, 1900
              let days = Math.floor(numValue)
              const isAfterFeb28_1900 = days > 59 // After Feb 28, 1900
              
              if (isAfterFeb28_1900) {
                days = days - 1 // Adjust for Excel's 1900 leap year bug
              }
              
              // Create date from epoch (December 30, 1899 for Excel compatibility)
              // This accounts for Excel's date system starting from Jan 1, 1900 = 1
              const epoch = new Date(1899, 11, 30) // December 30, 1899 (month is 0-indexed)
              dateObj = new Date(epoch.getTime() + (days - 1) * 24 * 60 * 60 * 1000)
              
              // Verify it's a valid date in reasonable range
              if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900 || dateObj.getFullYear() > 2100) {
                dateObj = null
              }
            } else {
              // Try parsing as regular date string (ISO format, MM/DD/YYYY, DD/MM/YYYY, etc.)
              dateObj = new Date(dateStr)
              if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900 || dateObj.getFullYear() > 2100) {
                dateObj = null
              }
            }
            
            if (dateObj && !isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900 && dateObj.getFullYear() <= 2100) {
              cleanRow.date = dateObj.toISOString().split('T')[0]
            }
          } catch (e) {
            // Ignore invalid dates
            console.warn('Invalid date value:', date, e)
          }
        }
        
        const type = getValue(row, ['TYPE', 'type', 'Type'])
        if (type) cleanRow.type = String(type).trim()
        
        const category = getValue(row, ['Category', 'category', 'CATEGORY'])
        if (category) cleanRow.category = String(category).trim()
        
        const nos = getValue(row, ['NOs', 'nos', 'Nos', 'NOS'])
        if (nos) {
          const num = parseFloat(String(nos).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.nos = num
        }
        
        const lengthM = getValue(row, ['LENGTH(M)', 'length(m)', 'length_m', 'LENGTH M', 'Length(M)', 'Length M'])
        if (lengthM) {
          const num = parseFloat(String(lengthM).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.length_m = num
        }
        
        const items = getValue(row, ['ITEMS', 'items', 'Items'])
        if (items) cleanRow.items = String(items).trim()
        
        const projectCodeFrom = getValue(row, ['PROJECT CODE ( FROM )', 'PROJECT CODE (FROM)', 'project code ( from )', 'project_code_from', 'Project Code ( From )'])
        if (projectCodeFrom) cleanRow.project_code_from = String(projectCodeFrom).trim()
        
        const projectCodeTo = getValue(row, ['PROJECT CODE ( TO )', 'PROJECT CODE (TO)', 'project code ( to )', 'project_code_to', 'Project Code ( To )'])
        if (projectCodeTo) cleanRow.project_code_to = String(projectCodeTo).trim()
        
        const rate = getValue(row, ['RATE', 'rate', 'Rate'])
        if (rate) {
          const num = parseFloat(String(rate).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.rate = num
        }
        
        const waitingRate = getValue(row, ['WAITING RATE', 'waiting rate', 'waiting_rate', 'Waiting Rate'])
        if (waitingRate) {
          const num = parseFloat(String(waitingRate).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.waiting_rate = num
        }
        
        const cost = getValue(row, ['Cost', 'cost', 'COST'])
        if (cost) {
          const num = parseFloat(String(cost).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.cost = num
        }
        
        const comment = getValue(row, ['COMMENT', 'comment', 'Comment'])
        if (comment) cleanRow.comment = String(comment).trim()
        
        const confirmed = getValue(row, ['Confirmed', 'confirmed', 'CONFIRMED', 'Confirmed '])
        if (confirmed !== null) {
          const confirmedStr = String(confirmed).toLowerCase().trim()
          cleanRow.confirmed = confirmedStr === 'true' || confirmedStr === 'yes' || confirmedStr === '1' || confirmedStr === '✓' || confirmedStr === '✔'
        }
        
        return cleanRow
      }).filter(row => {
        // Accept rows that have at least some data
        return row.date || row.type || row.category || row.items || row.project_code_from || row.project_code_to
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains transportation information.')
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
          .from('transportation')
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

      await loadTransportations()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} transportation record(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} transportation record(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing transportation:', error)
      setError(error.message || 'Failed to import transportation records')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredTransportations.length === 0) {
        setError('No transportation records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const exportData = filteredTransportations.map(transportation => ({
        'DATE': transportation.date || '',
        'TYPE': transportation.type || '',
        'Category': transportation.category || '',
        'NOs': transportation.nos || '',
        'LENGTH(M)': transportation.length_m || '',
        'ITEMS': transportation.items || '',
        'PROJECT CODE ( FROM )': transportation.project_code_from || '',
        'PROJECT CODE ( TO )': transportation.project_code_to || '',
        'RATE': transportation.rate || '',
        'WAITING RATE': transportation.waiting_rate || '',
        'Cost': transportation.cost || '',
        'COMMENT': transportation.comment || '',
        'Confirmed': transportation.confirmed ? 'Yes' : 'No'
      }))

      const filename = `transportation_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Transportation')
      }

      setSuccess(`Successfully exported ${exportData.length} transportation record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting transportation:', error)
      setError('Failed to export transportation records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'TYPE',
        'Category',
        'NOs',
        'LENGTH(M)',
        'ITEMS',
        'PROJECT CODE ( FROM )',
        'PROJECT CODE ( TO )',
        'RATE',
        'WAITING RATE',
        'Cost',
        'COMMENT',
        'Confirmed'
      ]
      await downloadTemplate('transportation_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredTransportations = () => {
    let filtered = transportations

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(transportation =>
        transportation.type?.toLowerCase().includes(term) ||
        transportation.category?.toLowerCase().includes(term) ||
        transportation.items?.toLowerCase().includes(term) ||
        transportation.project_code_from?.toLowerCase().includes(term) ||
        transportation.project_code_to?.toLowerCase().includes(term) ||
        transportation.comment?.toLowerCase().includes(term)
      )
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(transportation => {
        if (!transportation.date) return false
        const transDate = new Date(transportation.date)
        transDate.setHours(0, 0, 0, 0)
        return transDate >= fromDate
      })
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(transportation => {
        if (!transportation.date) return false
        const transDate = new Date(transportation.date)
        transDate.setHours(0, 0, 0, 0)
        return transDate <= toDate
      })
    }

    // Apply type filter
    if (filterType) {
      filtered = filtered.filter(transportation =>
        transportation.type?.toLowerCase().includes(filterType.toLowerCase())
      )
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(transportation =>
        transportation.category?.toLowerCase().includes(filterCategory.toLowerCase())
      )
    }

    // Apply project code from filter
    if (filterProjectCodeFrom) {
      filtered = filtered.filter(transportation =>
        transportation.project_code_from?.toLowerCase().includes(filterProjectCodeFrom.toLowerCase())
      )
    }

    // Apply project code to filter
    if (filterProjectCodeTo) {
      filtered = filtered.filter(transportation =>
        transportation.project_code_to?.toLowerCase().includes(filterProjectCodeTo.toLowerCase())
      )
    }

    // Apply confirmed filter
    if (filterConfirmed !== 'all') {
      filtered = filtered.filter(transportation => {
        if (filterConfirmed === 'yes') return transportation.confirmed === true
        if (filterConfirmed === 'no') return transportation.confirmed !== true
        return true
      })
    }

    return filtered
  }

  const filteredTransportations = getFilteredTransportations()
  const displayedTransportations = filteredTransportations.slice(0, displayedCount)
  const hasMore = displayedCount < filteredTransportations.length

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE)
  }

  const clearFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterType('')
    setFilterCategory('')
    setFilterProjectCodeFrom('')
    setFilterProjectCodeTo('')
    setFilterConfirmed('all')
  }

  const hasActiveFilters = filterDateFrom || filterDateTo || filterType || filterCategory || 
    filterProjectCodeFrom || filterProjectCodeTo || filterConfirmed !== 'all'

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.transportation.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Transportation Record
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
                  placeholder="Search transportation records by type, category, items, project codes, or comment..."
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
                      filterType ? 1 : 0,
                      filterCategory ? 1 : 0,
                      filterProjectCodeFrom ? 1 : 0,
                      filterProjectCodeTo ? 1 : 0,
                      filterConfirmed !== 'all' ? 1 : 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTransportations}
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

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Type
                    </label>
                    <Input
                      type="text"
                      placeholder="Filter by type..."
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    />
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <Input
                      type="text"
                      placeholder="Filter by category..."
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    />
                  </div>

                  {/* Project Code From Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code (From)
                    </label>
                    <Input
                      type="text"
                      placeholder="Filter by project code from..."
                      value={filterProjectCodeFrom}
                      onChange={(e) => setFilterProjectCodeFrom(e.target.value)}
                    />
                  </div>

                  {/* Project Code To Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code (To)
                    </label>
                    <Input
                      type="text"
                      placeholder="Filter by project code to..."
                      value={filterProjectCodeTo}
                      onChange={(e) => setFilterProjectCodeTo(e.target.value)}
                    />
                  </div>

                  {/* Confirmed Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Confirmed Status
                    </label>
                    <select
                      value={filterConfirmed}
                      onChange={(e) => setFilterConfirmed(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="yes">Confirmed</option>
                      <option value="no">Not Confirmed</option>
                    </select>
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
                  {importStatus || 'Importing transportation records...'}
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
                  {importProgress.current} of {importProgress.total} transportation records processed
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
      {selectedTransportations.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedTransportations.size} transportation record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTransportations(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('cost_control.transportation.delete') && (
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

      {/* Transportation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transportation Records ({filteredTransportations.length} {displayedCount < filteredTransportations.length ? `- Showing ${displayedCount}` : ''})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.transportation.import') && (
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
                permission="cost_control.transportation.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.transportation.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="transportation_template"
                  templateColumns={['DATE', 'TYPE', 'Category', 'NOs', 'LENGTH(M)', 'ITEMS', 'PROJECT CODE ( FROM )', 'PROJECT CODE ( TO )', 'RATE', 'WAITING RATE', 'Cost', 'COMMENT', 'Confirmed']}
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
          ) : filteredTransportations.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {transportations.length === 0 ? 'No Transportation Records Found' : 'No Transportation Records Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {transportations.length === 0 
                  ? 'Get started by adding your first transportation record. You may need to create the transportation table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {transportations.length === 0 && (
                <PermissionButton
                  permission="cost_control.transportation.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Transportation Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.transportation.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedTransportations.size !== filteredTransportations.length)}
                          className="flex items-center justify-center"
                          title={selectedTransportations.size === filteredTransportations.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedTransportations.size === filteredTransportations.length && filteredTransportations.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">NOs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Length (M)</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Items</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">From</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">To</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Waiting Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Confirmed</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransportations.map((transportation) => (
                    <tr
                      key={transportation.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.transportation.delete') && (
                          <button
                            onClick={() => handleSelectTransportation(transportation.id, !selectedTransportations.has(transportation.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedTransportations.has(transportation.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.date ? formatDate(transportation.date) : '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.type || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.category || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.nos || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.length_m || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {transportation.items || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.project_code_from || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.project_code_to || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.rate || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {transportation.waiting_rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {transportation.cost || '-'}
                      </td>
                      <td className="p-3">
                        {transportation.confirmed ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            No
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.transportation.edit"
                            onClick={() => {
                              setEditingTransportation(transportation)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.transportation.delete"
                            onClick={() => handleDelete(transportation.id)}
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
          {!loading && filteredTransportations.length > 0 && hasMore && (
            <div className="flex justify-center mt-6 pb-4">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load More ({Math.min(ITEMS_PER_PAGE, filteredTransportations.length - displayedCount)} more records)
              </Button>
            </div>
          )}

          {/* Show All Loaded Message */}
          {!loading && filteredTransportations.length > 0 && !hasMore && displayedCount > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All {filteredTransportations.length} records are displayed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transportation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingTransportation ? 'Edit Transportation Record' : 'Add New Transportation Record'}
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
                      Type
                    </label>
                    <Input
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      placeholder="Type"
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
                      NOs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.nos}
                      onChange={(e) => setFormData(prev => ({ ...prev, nos: e.target.value }))}
                      placeholder="Number of items"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Length (M)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.length_m}
                      onChange={(e) => setFormData(prev => ({ ...prev, length_m: e.target.value }))}
                      placeholder="Length in meters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Items
                    </label>
                    <Input
                      value={formData.items}
                      onChange={(e) => setFormData(prev => ({ ...prev, items: e.target.value }))}
                      placeholder="Items description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code (From)
                    </label>
                    <ProjectCodeSelect
                      value={formData.project_code_from || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, project_code_from: value }))}
                      placeholder="Project code from"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code (To)
                    </label>
                    <ProjectCodeSelect
                      value={formData.project_code_to || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, project_code_to: value }))}
                      placeholder="Project code to"
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
                      Waiting Rate
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.waiting_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, waiting_rate: e.target.value }))}
                      placeholder="Waiting rate"
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
                      Comment
                    </label>
                    <Input
                      value={formData.comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Comment"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.confirmed}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmed: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirmed
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false)
                      setEditingTransportation(null)
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
                    {loading ? 'Saving...' : editingTransportation ? 'Update' : 'Add'} Transportation Record
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

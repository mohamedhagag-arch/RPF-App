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
  Users,
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

interface HiredManpower {
  id: string
  date?: string
  project_code?: string
  designation?: string
  total_number?: number | string
  total_hrs?: number | string
  rate?: number | string
  cost?: number | string
  note?: string
  created_at: string
  updated_at: string
}

export default function HiredManpowerList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('hired-manpower-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hiredManpowers, setHiredManpowers] = useState<HiredManpower[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingHiredManpower, setEditingHiredManpower] = useState<HiredManpower | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedHiredManpowers, setSelectedHiredManpowers] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [displayedCount, setDisplayedCount] = useState(50) // عدد السجلات المعروضة
  const ITEMS_PER_PAGE = 50 // عدد السجلات في كل صفحة
  
  // Dropdown states for filters
  const [projectCodes, setProjectCodes] = useState<Array<{ code: string }>>([])
  const [projectCodeSearch, setProjectCodeSearch] = useState('')
  const [showProjectCodeDropdown, setShowProjectCodeDropdown] = useState(false)
  
  const [designations, setDesignations] = useState<Array<{ designation: string }>>([])
  const [designationSearch, setDesignationSearch] = useState('')
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false)
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterProjectCode, setFilterProjectCode] = useState<Set<string>>(new Set())
  const [filterDesignation, setFilterDesignation] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    date: '',
    project_code: '',
    designation: '',
    total_number: '',
    total_hrs: '',
    rate: '',
    cost: '',
    note: ''
  })

  useEffect(() => {
    loadHiredManpowers() // This will also load project codes and designations
  }, [])

  // إعادة تعيين عدد السجلات المعروضة عند تغيير البحث أو الفلاتر
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE)
  }, [searchTerm, filterDateFrom, filterDateTo, filterProjectCode, filterDesignation])

  const loadHiredManpowers = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تحميل جميع البيانات بدون limit
      let allData: HiredManpower[] = []
      let page = 0
      const pageSize = 1000 // تحميل 1000 سجل في كل مرة
      let hasMore = true

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('hired_manpower')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (fetchError) {
          console.error('Supabase Error:', fetchError)
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
            setError('Table does not exist. Please run: Database/create-hired-manpower-table.sql')
            setHiredManpowers([])
            return
          }
          if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
            setError('Permission denied. Please run: Database/create-hired-manpower-table.sql in Supabase SQL Editor to fix permissions.')
            setHiredManpowers([])
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

      setHiredManpowers(allData)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      // Extract unique project codes and designations from loaded data
      const uniqueProjectCodes = Array.from(
        new Set(
          allData
            .map(item => item.project_code)
            .filter(code => code && code.trim() !== '')
        )
      ).map(code => ({ code: code as string }))
        .sort((a, b) => a.code.localeCompare(b.code))
      
      const uniqueDesignations = Array.from(
        new Set(
          allData
            .map(item => item.designation)
            .filter(designation => designation && designation.trim() !== '')
        )
      ).map(designation => ({ designation: designation as string }))
        .sort((a, b) => a.designation.localeCompare(b.designation))
      
      setProjectCodes(uniqueProjectCodes)
      setDesignations(uniqueDesignations)
    } catch (error: any) {
      console.error('Error loading hired manpower:', error)
      setError('Failed to load hired manpower records. Please ensure the hired_manpower table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hired manpower record?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('hired_manpower')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadHiredManpowers()
      setSelectedHiredManpowers(new Set())
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error deleting hired manpower:', error)
      setError('Failed to delete hired manpower record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedHiredManpowers.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedHiredManpowers.size} hired manpower record(s)?`)) return

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const selectedArray = Array.from(selectedHiredManpowers)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0

      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batch = selectedArray.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('hired_manpower')
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
        throw new Error(`Failed to delete hired manpower records. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} hired manpower record(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} hired manpower record(s)`)
      }
      
      setSelectedHiredManpowers(new Set())
      await loadHiredManpowers()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting hired manpower records:', error)
      setError(error.message || 'Failed to delete hired manpower records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHiredManpowers(new Set(displayedHiredManpowers.map(h => h.id)))
    } else {
      setSelectedHiredManpowers(new Set())
    }
  }

  const handleSelectHiredManpower = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedHiredManpowers)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedHiredManpowers(newSelected)
  }

  const handleSave = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const totalNumber = formData.total_number ? parseFloat(formData.total_number.toString()) : null
      const totalHrs = formData.total_hrs ? parseFloat(formData.total_hrs.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null

      const hiredManpowerData: any = {
        date: date,
        project_code: formData.project_code || null,
        designation: formData.designation || null,
        total_number: totalNumber,
        total_hrs: totalHrs,
        rate: rate,
        cost: cost,
        note: formData.note || null
      }

      if (editingHiredManpower) {
        const { error: updateError } = await supabase
          .from('hired_manpower')
          .update(hiredManpowerData)
          .eq('id', editingHiredManpower.id)

        if (updateError) throw updateError
        setSuccess('Hired manpower record updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('hired_manpower')
          .insert([hiredManpowerData])

        if (insertError) throw insertError
        setSuccess('Hired manpower record added successfully')
      }

      await loadHiredManpowers()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setShowForm(false)
      setEditingHiredManpower(null)
      setFormData({
        date: '',
        project_code: '',
        designation: '',
        total_number: '',
        total_hrs: '',
        rate: '',
        cost: '',
        note: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving hired manpower:', error)
      setError(error.message || 'Failed to save hired manpower record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Calculate cost automatically when total_hrs and rate changes
  useEffect(() => {
    if (showForm && formData.total_hrs && formData.rate) {
      const totalHrs = parseFloat(formData.total_hrs.toString()) || 0
      const rate = parseFloat(formData.rate.toString()) || 0
      const calculatedCost = totalHrs * rate
      setFormData(prev => ({
        ...prev,
        cost: calculatedCost.toString()
      }))
    }
  }, [formData.total_hrs, formData.rate, showForm])

  // Initialize form data when editing
  useEffect(() => {
    if (editingHiredManpower) {
      const dateValue = editingHiredManpower.date 
        ? new Date(editingHiredManpower.date).toISOString().split('T')[0]
        : ''
      setFormData({
        date: dateValue,
        project_code: editingHiredManpower.project_code || '',
        designation: editingHiredManpower.designation || '',
        total_number: editingHiredManpower.total_number?.toString() || '',
        total_hrs: editingHiredManpower.total_hrs?.toString() || '',
        rate: editingHiredManpower.rate?.toString() || '',
        cost: editingHiredManpower.cost?.toString() || '',
        note: editingHiredManpower.note || ''
      })
    } else if (showForm) {
      setFormData({
        date: '',
        project_code: '',
        designation: '',
        total_number: '',
        total_hrs: '',
        rate: '',
        cost: '',
        note: ''
      })
    }
  }, [editingHiredManpower, showForm])

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
        
        const designation = getValue(row, ['DESIGNATION', 'designation', 'Designation'])
        if (designation) cleanRow.designation = String(designation).trim()
        
        const totalNumber = getValue(row, ['TOTAL NUMBER', 'total number', 'total_number', 'Total Number'])
        if (totalNumber) {
          const num = parseFloat(String(totalNumber).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.total_number = num
        }
        
        const totalHrs = getValue(row, ['TOTAL HRS', 'total hrs', 'total_hrs', 'Total Hrs', 'TOTAL HOURS', 'total hours'])
        if (totalHrs) {
          const num = parseFloat(String(totalHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.total_hrs = num
        }
        
        const rate = getValue(row, ['RATE', 'rate', 'Rate'])
        if (rate) {
          const num = parseFloat(String(rate).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.rate = num
        }
        
        const cost = getValue(row, ['COST', 'cost', 'Cost'])
        if (cost) {
          const num = parseFloat(String(cost).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.cost = num
        }
        
        const note = getValue(row, ['Note', 'note', 'NOTE', 'Note '])
        if (note) cleanRow.note = String(note).trim()
        
        return cleanRow
      }).filter(row => {
        return row.date || row.project_code || row.designation
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains hired manpower information.')
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
          .from('hired_manpower')
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

      await loadHiredManpowers()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} hired manpower record(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} hired manpower record(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing hired manpower:', error)
      setError(error.message || 'Failed to import hired manpower records')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (hiredManpowers.length === 0) {
        setError('No hired manpower records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // تصدير جميع البيانات (وليس فقط المعروضة)
      const exportData = (searchTerm ? filteredHiredManpowers : hiredManpowers).map(hm => ({
        'DATE': hm.date || '',
        'PROJECT CODE': hm.project_code || '',
        'DESIGNATION': hm.designation || '',
        'TOTAL NUMBER': hm.total_number || '',
        'TOTAL HRS': hm.total_hrs || '',
        'RATE': hm.rate || '',
        'COST': hm.cost || '',
        'Note': hm.note || ''
      }))

      const filename = `hired_manpower_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Hired Manpower')
      }

      setSuccess(`Successfully exported ${exportData.length} hired manpower record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting hired manpower:', error)
      setError('Failed to export hired manpower records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const loadProjectCodes = async () => {
    try {
      let allData: Array<{ project_code: string }> = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('hired_manpower')
          .select('project_code')
          .not('project_code', 'is', null)
          .order('project_code', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Error loading project codes:', error)
          setProjectCodes([])
          return
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          page++
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      const uniqueCodes = Array.from(
        new Set(
          allData
            .map(item => item.project_code)
            .filter(code => code && code.trim() !== '')
        )
      ).map(code => ({ code: code as string }))
        .sort((a, b) => a.code.localeCompare(b.code))

      setProjectCodes(uniqueCodes)
    } catch (error) {
      console.error('Error loading project codes:', error)
      setProjectCodes([])
    }
  }

  const loadDesignations = async () => {
    try {
      let allData: Array<{ designation: string }> = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('hired_manpower')
          .select('designation')
          .not('designation', 'is', null)
          .order('designation', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Error loading designations:', error)
          setDesignations([])
          return
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          page++
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      const uniqueDesignations = Array.from(
        new Set(
          allData
            .map(item => item.designation)
            .filter(designation => designation && designation.trim() !== '')
        )
      ).map(designation => ({ designation: designation as string }))
        .sort((a, b) => a.designation.localeCompare(b.designation))

      setDesignations(uniqueDesignations)
    } catch (error) {
      console.error('Error loading designations:', error)
      setDesignations([])
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'PROJECT CODE',
        'DESIGNATION',
        'TOTAL NUMBER',
        'TOTAL HRS',
        'RATE',
        'COST',
        'Note'
      ]
      await downloadTemplate('hired_manpower_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredHiredManpowers = () => {
    let filtered = hiredManpowers

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(hm =>
        hm.project_code?.toLowerCase().includes(term) ||
        hm.designation?.toLowerCase().includes(term) ||
        hm.note?.toLowerCase().includes(term)
      )
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(hm => {
        if (!hm.date) return false
        const hmDate = new Date(hm.date)
        hmDate.setHours(0, 0, 0, 0)
        return hmDate >= fromDate
      })
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(hm => {
        if (!hm.date) return false
        const hmDate = new Date(hm.date)
        hmDate.setHours(0, 0, 0, 0)
        return hmDate <= toDate
      })
    }

    // Apply project code filter (multiple selection)
    if (filterProjectCode.size > 0) {
      filtered = filtered.filter(hm => {
        if (!hm.project_code) return false
        return filterProjectCode.has(hm.project_code)
      })
    }

    // Apply designation filter (multiple selection)
    if (filterDesignation.size > 0) {
      filtered = filtered.filter(hm => {
        if (!hm.designation) return false
        return filterDesignation.has(hm.designation)
      })
    }

    return filtered
  }

  const clearFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterProjectCode(new Set())
    setFilterDesignation(new Set())
    setProjectCodeSearch('')
    setDesignationSearch('')
  }

  const hasActiveFilters = filterDateFrom || filterDateTo || filterProjectCode.size > 0 || filterDesignation.size > 0

  const handleProjectCodeToggle = (code: string) => {
    const newSet = new Set(filterProjectCode)
    if (newSet.has(code)) {
      newSet.delete(code)
    } else {
      newSet.add(code)
    }
    setFilterProjectCode(newSet)
  }

  const handleDesignationToggle = (designation: string) => {
    const newSet = new Set(filterDesignation)
    if (newSet.has(designation)) {
      newSet.delete(designation)
    } else {
      newSet.add(designation)
    }
    setFilterDesignation(newSet)
  }

  const filteredHiredManpowers = getFilteredHiredManpowers()
  const displayedHiredManpowers = filteredHiredManpowers.slice(0, displayedCount)
  const hasMore = displayedCount < filteredHiredManpowers.length

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.hired_manpower.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Hired Manpower Record
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
                  placeholder="Search hired manpower records by project code, designation, or note..."
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
                      filterDesignation.size > 0 ? 1 : 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHiredManpowers}
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

                  {/* Designation Filter - Multi-select */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Designation {filterDesignation.size > 0 && `(${filterDesignation.size} selected)`}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search designations..."
                        value={designationSearch}
                        onChange={(e) => {
                          setDesignationSearch(e.target.value)
                          setShowDesignationDropdown(true)
                        }}
                        onFocus={() => setShowDesignationDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDesignationDropdown(false), 200)}
                        className="w-full"
                      />
                      {showDesignationDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {designations
                            .filter(des => !designationSearch || des.designation.toLowerCase().includes(designationSearch.toLowerCase()))
                            .map((des, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleDesignationToggle(des.designation)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                              >
                                {filterDesignation.has(des.designation) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{des.designation}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {/* Display selected designations */}
                      {filterDesignation.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(filterDesignation).map((designation) => (
                            <span
                              key={designation}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {designation}
                              <button
                                type="button"
                                onClick={() => handleDesignationToggle(designation)}
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
                  {importStatus || 'Importing hired manpower records...'}
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
                  {importProgress.current} of {importProgress.total} hired manpower records processed
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
      {selectedHiredManpowers.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedHiredManpowers.size} hired manpower record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHiredManpowers(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('cost_control.hired_manpower.delete') && (
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

      {/* Hired Manpower Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hired Manpower Records ({filteredHiredManpowers.length} {displayedCount < filteredHiredManpowers.length ? `- Showing ${displayedCount}` : ''})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.hired_manpower.import') && (
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
                permission="cost_control.hired_manpower.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.hired_manpower.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="hired_manpower_template"
                  templateColumns={['DATE', 'PROJECT CODE', 'DESIGNATION', 'TOTAL NUMBER', 'TOTAL HRS', 'RATE', 'COST', 'Note']}
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
          ) : filteredHiredManpowers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {hiredManpowers.length === 0 ? 'No Hired Manpower Records Found' : 'No Hired Manpower Records Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {hiredManpowers.length === 0 
                  ? 'Get started by adding your first hired manpower record. You may need to create the hired_manpower table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {hiredManpowers.length === 0 && (
                <PermissionButton
                  permission="cost_control.hired_manpower.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Hired Manpower Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.hired_manpower.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedHiredManpowers.size !== filteredHiredManpowers.length)}
                          className="flex items-center justify-center"
                          title={selectedHiredManpowers.size === filteredHiredManpowers.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedHiredManpowers.size === filteredHiredManpowers.length && filteredHiredManpowers.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Total Number</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Total Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Note</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHiredManpowers.map((hm) => (
                    <tr
                      key={hm.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.hired_manpower.delete') && (
                          <button
                            onClick={() => handleSelectHiredManpower(hm.id, !selectedHiredManpowers.has(hm.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedHiredManpowers.has(hm.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {hm.date ? formatDate(hm.date) : '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {hm.project_code || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {hm.designation || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {hm.total_number || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {hm.total_hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {hm.rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {hm.cost || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={hm.note || ''}>
                        {hm.note || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.hired_manpower.edit"
                            onClick={() => {
                              setEditingHiredManpower(hm)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.hired_manpower.delete"
                            onClick={() => handleDelete(hm.id)}
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
          {!loading && filteredHiredManpowers.length > 0 && hasMore && (
            <div className="flex justify-center mt-6 pb-4">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load More ({Math.min(ITEMS_PER_PAGE, filteredHiredManpowers.length - displayedCount)} more records)
              </Button>
            </div>
          )}

          {/* Show All Loaded Message */}
          {!loading && filteredHiredManpowers.length > 0 && !hasMore && displayedCount > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All {filteredHiredManpowers.length} records are displayed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hired Manpower Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingHiredManpower ? 'Edit Hired Manpower Record' : 'Add New Hired Manpower Record'}
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
                      Designation
                    </label>
                    <Input
                      value={formData.designation}
                      onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                      placeholder="Designation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Total Number
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_number: e.target.value }))}
                      placeholder="Total number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Total Hours
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_hrs: e.target.value }))}
                      placeholder="Total hours"
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
                      Cost (Auto-calculated: Total Hrs × Rate)
                    </label>
                    <Input
                      type="text"
                      value={formData.cost || '0'}
                      readOnly
                      disabled
                      className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                      placeholder="Total Hrs × Rate"
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
                      setEditingHiredManpower(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : editingHiredManpower ? 'Update' : 'Add'} Hired Manpower Record
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


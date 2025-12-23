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
  Wrench,
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

interface RentedEquipment {
  id: string
  date?: string
  project_code?: string
  machine_type?: string
  machine_name?: string
  hrs?: number | string
  time_sheet_review?: string
  rate?: number | string
  cost?: number | string
  supplier?: string
  comment?: string
  status?: string
  created_at: string
  updated_at: string
}

export default function RentedEquipmentList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('rented-equipment-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rentedEquipments, setRentedEquipments] = useState<RentedEquipment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRentedEquipment, setEditingRentedEquipment] = useState<RentedEquipment | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedRentedEquipments, setSelectedRentedEquipments] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [displayedCount, setDisplayedCount] = useState(50) // عدد السجلات المعروضة
  const ITEMS_PER_PAGE = 50 // عدد السجلات في كل صفحة
  
  // Machine Type dropdown states
  const [machineTypes, setMachineTypes] = useState<Array<{ type: string }>>([])
  const [machineTypeSearch, setMachineTypeSearch] = useState('')
  const [showMachineTypeDropdown, setShowMachineTypeDropdown] = useState(false)
  const [filterMachineTypeSearch, setFilterMachineTypeSearch] = useState('')
  const [showFilterMachineTypeDropdown, setShowFilterMachineTypeDropdown] = useState(false)
  
  // Project Code and Supplier dropdown states for filters
  const [projectCodes, setProjectCodes] = useState<Array<{ code: string }>>([])
  const [projectCodeSearch, setProjectCodeSearch] = useState('')
  const [showProjectCodeDropdown, setShowProjectCodeDropdown] = useState(false)
  
  const [suppliers, setSuppliers] = useState<Array<{ supplier: string }>>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterProjectCode, setFilterProjectCode] = useState<Set<string>>(new Set())
  const [filterMachineType, setFilterMachineType] = useState<Set<string>>(new Set())
  const [filterSupplier, setFilterSupplier] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    date: '',
    project_code: '',
    machine_type: '',
    machine_name: '',
    hrs: '',
    time_sheet_review: '',
    rate: '',
    cost: '',
    supplier: '',
    comment: '',
    status: ''
  })

  useEffect(() => {
    loadRentedEquipments() // This will also load machine types and suppliers
  }, [])

  // إعادة تعيين عدد السجلات المعروضة عند تغيير البحث أو الفلاتر
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE)
  }, [searchTerm, filterDateFrom, filterDateTo, filterProjectCode, filterMachineType, filterSupplier])

  const loadRentedEquipments = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تحميل جميع البيانات بدون limit
      let allData: RentedEquipment[] = []
      let page = 0
      const pageSize = 1000 // تحميل 1000 سجل في كل مرة
      let hasMore = true

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('rented_equipment')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (fetchError) {
          console.error('Supabase Error:', fetchError)
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
            setError('Table does not exist. Please run: Database/create-rented-equipment-table.sql')
            setRentedEquipments([])
            return
          }
          if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
            setError('Permission denied. Please run: Database/create-rented-equipment-table.sql in Supabase SQL Editor to fix permissions.')
            setRentedEquipments([])
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

      setRentedEquipments(allData)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      // Extract unique project codes, machine types, and suppliers from loaded data
      const uniqueProjectCodes = Array.from(
        new Set(
          allData
            .map(item => item.project_code)
            .filter(code => code && code.trim() !== '')
        )
      ).map(code => ({ code: code as string }))
        .sort((a, b) => a.code.localeCompare(b.code))
      
      const uniqueMachineTypes = Array.from(
        new Set(
          allData
            .map(item => item.machine_type)
            .filter(type => type && type.trim() !== '')
        )
      ).map(type => ({ type: type as string }))
        .sort((a, b) => a.type.localeCompare(b.type))
      
      const uniqueSuppliers = Array.from(
        new Set(
          allData
            .map(item => item.supplier)
            .filter(supplier => supplier && supplier.trim() !== '')
        )
      ).map(supplier => ({ supplier: supplier as string }))
        .sort((a, b) => a.supplier.localeCompare(b.supplier))
      
      setMachineTypes(uniqueMachineTypes)
      setProjectCodes(uniqueProjectCodes)
      setSuppliers(uniqueSuppliers)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error loading Rented equipment:', error)
      setError('Failed to load Rented equipment records. Please ensure the rented_equipment table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  // Note: Machine types, project codes, and suppliers are now extracted from loaded data in loadRentedEquipments()

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Rented equipment record?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('rented_equipment')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadRentedEquipments()
      setSelectedRentedEquipments(new Set())
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error deleting Rented equipment:', error)
      setError('Failed to delete Rented equipment record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRentedEquipments.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedRentedEquipments.size} Rented equipment record(s)?`)) return

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const selectedArray = Array.from(selectedRentedEquipments)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0

      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batch = selectedArray.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('rented_equipment')
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
        throw new Error(`Failed to delete Rented equipment records. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} Rented equipment record(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} Rented equipment record(s)`)
      }
      
      setSelectedRentedEquipments(new Set())
      await loadRentedEquipments()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting Rented equipment records:', error)
      setError(error.message || 'Failed to delete Rented equipment records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRentedEquipments(new Set(displayedRentedEquipments.map(e => e.id)))
    } else {
      setSelectedRentedEquipments(new Set())
    }
  }

  const handleSelectRentedEquipment = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRentedEquipments)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRentedEquipments(newSelected)
  }

  const handleSave = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const hrs = formData.hrs ? parseFloat(formData.hrs.toString()) : null
      const rate = formData.rate ? parseFloat(formData.rate.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null

      const rentedEquipmentData: any = {
        date: date,
        project_code: formData.project_code || null,
        machine_type: formData.machine_type || null,
        machine_name: formData.machine_name || null,
        hrs: hrs,
        time_sheet_review: formData.time_sheet_review || null,
        rate: rate,
        cost: cost,
        supplier: formData.supplier || null,
        comment: formData.comment || null,
        status: formData.status || null
      }

      if (editingRentedEquipment) {
        const { error: updateError } = await supabase
          .from('rented_equipment')
          .update(rentedEquipmentData)
          .eq('id', editingRentedEquipment.id)

        if (updateError) throw updateError
        setSuccess('Rented equipment record updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('rented_equipment')
          .insert([rentedEquipmentData])

        if (insertError) throw insertError
        setSuccess('Rented equipment record added successfully')
      }

      await loadRentedEquipments() // This will also reload machine types, project codes, and suppliers
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setShowForm(false)
      setEditingRentedEquipment(null)
      setMachineTypeSearch('')
      setFormData({
        date: '',
        project_code: '',
        machine_type: '',
        machine_name: '',
        hrs: '',
        time_sheet_review: '',
        rate: '',
        cost: '',
        supplier: '',
        comment: '',
        status: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving Rented equipment:', error)
      setError(error.message || 'Failed to save Rented equipment record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Note: Cost is entered manually for Rented Equipment (not auto-calculated)

  // Initialize form data when editing
  useEffect(() => {
    if (editingRentedEquipment) {
      const dateValue = editingRentedEquipment.date 
        ? new Date(editingRentedEquipment.date).toISOString().split('T')[0]
        : ''
      setFormData({
        date: dateValue,
        project_code: editingRentedEquipment.project_code || '',
        machine_type: editingRentedEquipment.machine_type || '',
        machine_name: editingRentedEquipment.machine_name || '',
        hrs: editingRentedEquipment.hrs?.toString() || '',
        time_sheet_review: editingRentedEquipment.time_sheet_review || '',
        rate: editingRentedEquipment.rate?.toString() || '',
        cost: editingRentedEquipment.cost?.toString() || '',
        supplier: editingRentedEquipment.supplier || '',
        comment: editingRentedEquipment.comment || '',
        status: editingRentedEquipment.status || ''
      })
      setMachineTypeSearch(editingRentedEquipment.machine_type || '')
    } else if (showForm) {
      setFormData({
        date: '',
        project_code: '',
        machine_type: '',
        machine_name: '',
        hrs: '',
        time_sheet_review: '',
        rate: '',
        cost: '',
        supplier: '',
        comment: '',
        status: ''
      })
      setMachineTypeSearch('')
    }
  }, [editingRentedEquipment, showForm])

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
        
        const machineType = getValue(row, ['MACHINE TYPE', 'machine type', 'machine_type', 'Machine Type'])
        if (machineType) cleanRow.machine_type = String(machineType).trim()
        
        const machineName = getValue(row, ['MACHINE NAME', 'machine name', 'machine_name', 'Machine Name'])
        if (machineName) cleanRow.machine_name = String(machineName).trim()
        
        const hrs = getValue(row, ['HRS', 'hrs', 'Hrs'])
        if (hrs) {
          const num = parseFloat(String(hrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.hrs = num
        }
        
        const timeSheetReview = getValue(row, ['Time Sheet Review', 'time sheet review', 'time_sheet_review', 'TIME SHEET REVIEW'])
        if (timeSheetReview) cleanRow.time_sheet_review = String(timeSheetReview).trim()
        
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
        
        const supplier = getValue(row, ['SUPPLIER', 'supplier', 'Supplier'])
        if (supplier) cleanRow.supplier = String(supplier).trim()
        
        const comment = getValue(row, ['COMMENT', 'comment', 'Comment'])
        if (comment) cleanRow.comment = String(comment).trim()
        
        const status = getValue(row, ['Status', 'status', 'STATUS'])
        if (status) cleanRow.status = String(status).trim()
        
        return cleanRow
      }).filter(row => {
        return row.date || row.project_code || row.machine_type || row.machine_name
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains Rented equipment information.')
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
          .from('rented_equipment')
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

      await loadRentedEquipments()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} Rented equipment record(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} Rented equipment record(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing Rented equipment:', error)
      setError(error.message || 'Failed to import Rented equipment records')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (rentedEquipments.length === 0) {
        setError('No Rented equipment records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // تصدير جميع البيانات (وليس فقط المعروضة)
      const exportData = (searchTerm ? filteredRentedEquipments : rentedEquipments).map(eq => ({
        'DATE': eq.date || '',
        'PROJECT CODE': eq.project_code || '',
        'MACHINE TYPE': eq.machine_type || '',
        'MACHINE NAME': eq.machine_name || '',
        'HRS': eq.hrs || '',
        'Time Sheet Review': eq.time_sheet_review || '',
        'RATE': eq.rate || '',
        'Cost': eq.cost || '',
        'SUPPLIER': eq.supplier || '',
        'COMMENT': eq.comment || '',
        'Status': eq.status || ''
      }))

      const filename = `rented_equipment_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Rented Equipment')
      }

      setSuccess(`Successfully exported ${exportData.length} Rented equipment record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting Rented equipment:', error)
      setError('Failed to export Rented equipment records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'PROJECT CODE',
        'MACHINE TYPE',
        'MACHINE NAME',
        'HRS',
        'Time Sheet Review',
        'RATE',
        'Cost',
        'SUPPLIER',
        'COMMENT',
        'Status'
      ]
      await downloadTemplate('rented_equipment_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredRentedEquipments = () => {
    let filtered = rentedEquipments

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(eq =>
        eq.project_code?.toLowerCase().includes(term) ||
        eq.machine_type?.toLowerCase().includes(term) ||
        eq.machine_name?.toLowerCase().includes(term) ||
        eq.supplier?.toLowerCase().includes(term) ||
        eq.comment?.toLowerCase().includes(term) ||
        eq.status?.toLowerCase().includes(term)
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
      filtered = filtered.filter(eq => {
        if (!eq.project_code) return false
        return filterProjectCode.has(eq.project_code)
      })
    }

    // Apply machine type filter (multiple selection)
    if (filterMachineType.size > 0) {
      filtered = filtered.filter(eq => {
        if (!eq.machine_type) return false
        return filterMachineType.has(eq.machine_type)
      })
    }

    // Apply supplier filter (multiple selection)
    if (filterSupplier.size > 0) {
      filtered = filtered.filter(eq => {
        if (!eq.supplier) return false
        return filterSupplier.has(eq.supplier)
      })
    }

    return filtered
  }

  const clearFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterProjectCode(new Set())
    setFilterMachineType(new Set())
    setFilterSupplier(new Set())
    setProjectCodeSearch('')
    setFilterMachineTypeSearch('')
    setSupplierSearch('')
  }

  const hasActiveFilters = filterDateFrom || filterDateTo || filterProjectCode.size > 0 || filterMachineType.size > 0 || filterSupplier.size > 0

  const handleProjectCodeToggle = (code: string) => {
    const newSet = new Set(filterProjectCode)
    if (newSet.has(code)) {
      newSet.delete(code)
    } else {
      newSet.add(code)
    }
    setFilterProjectCode(newSet)
  }

  const handleMachineTypeToggle = (type: string) => {
    const newSet = new Set(filterMachineType)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    setFilterMachineType(newSet)
  }

  const handleSupplierToggle = (supplier: string) => {
    const newSet = new Set(filterSupplier)
    if (newSet.has(supplier)) {
      newSet.delete(supplier)
    } else {
      newSet.add(supplier)
    }
    setFilterSupplier(newSet)
  }

  const filteredRentedEquipments = getFilteredRentedEquipments()
  const displayedRentedEquipments = filteredRentedEquipments.slice(0, displayedCount)
  const hasMore = displayedCount < filteredRentedEquipments.length

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.rented_equipment.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Rented Equipment Record
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
                  placeholder="Search Rented equipment records by project code, activity type, machine code, machine name, or note..."
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
                      filterMachineType.size > 0 ? 1 : 0,
                      filterSupplier.size > 0 ? 1 : 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRentedEquipments}
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

                  {/* Machine Type Filter - Multi-select */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Machine Type {filterMachineType.size > 0 && `(${filterMachineType.size} selected)`}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search machine types..."
                        value={filterMachineTypeSearch}
                        onChange={(e) => {
                          setFilterMachineTypeSearch(e.target.value)
                          setShowFilterMachineTypeDropdown(true)
                        }}
                        onFocus={() => setShowFilterMachineTypeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowFilterMachineTypeDropdown(false), 200)}
                        className="w-full"
                      />
                      {showFilterMachineTypeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {machineTypes
                            .filter(mt => !filterMachineTypeSearch || mt.type.toLowerCase().includes(filterMachineTypeSearch.toLowerCase()))
                            .map((mt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleMachineTypeToggle(mt.type)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                              >
                                {filterMachineType.has(mt.type) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{mt.type}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {/* Display selected machine types */}
                      {filterMachineType.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(filterMachineType).map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {type}
                              <button
                                type="button"
                                onClick={() => handleMachineTypeToggle(type)}
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

                  {/* Supplier Filter - Multi-select */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Supplier {filterSupplier.size > 0 && `(${filterSupplier.size} selected)`}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search suppliers..."
                        value={supplierSearch}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value)
                          setShowSupplierDropdown(true)
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                        onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                        className="w-full"
                      />
                      {showSupplierDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {suppliers
                            .filter(s => !supplierSearch || s.supplier.toLowerCase().includes(supplierSearch.toLowerCase()))
                            .map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSupplierToggle(s.supplier)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                              >
                                {filterSupplier.has(s.supplier) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{s.supplier}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {/* Display selected suppliers */}
                      {filterSupplier.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(filterSupplier).map((supplier) => (
                            <span
                              key={supplier}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {supplier}
                              <button
                                type="button"
                                onClick={() => handleSupplierToggle(supplier)}
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
                  {importStatus || 'Importing Rented equipment records...'}
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
                  {importProgress.current} of {importProgress.total} Rented equipment records processed
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
      {selectedRentedEquipments.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedRentedEquipments.size} Rented equipment record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRentedEquipments(new Set())}
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

      {/* Rented Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rented Equipment Records ({filteredRentedEquipments.length} {displayedCount < filteredRentedEquipments.length ? `- Showing ${displayedCount}` : ''})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.rented_equipment.import') && (
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
                permission="cost_control.rented_equipment.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.rented_equipment.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="rented_equipment_template"
                  templateColumns={['DATE', 'PROJECT CODE', 'MACHINE TYPE', 'MACHINE NAME', 'HRS', 'Time Sheet Review', 'RATE', 'Cost', 'SUPPLIER', 'COMMENT', 'Status']}
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
          ) : filteredRentedEquipments.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {rentedEquipments.length === 0 ? 'No Rented Equipment Records Found' : 'No Rented Equipment Records Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {rentedEquipments.length === 0 
                  ? 'Get started by adding your first Rented equipment record. You may need to create the rented_equipment table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {rentedEquipments.length === 0 && (
                <PermissionButton
                  permission="cost_control.rented_equipment.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Rented Equipment Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.rented_equipment.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedRentedEquipments.size !== filteredRentedEquipments.length)}
                          className="flex items-center justify-center"
                          title={selectedRentedEquipments.size === filteredRentedEquipments.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedRentedEquipments.size === filteredRentedEquipments.length && filteredRentedEquipments.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Machine Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Machine Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">HRS</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Time Sheet Review</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Supplier</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Comment</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRentedEquipments.map((eq) => (
                    <tr
                      key={eq.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.rented_equipment.delete') && (
                          <button
                            onClick={() => handleSelectRentedEquipment(eq.id, !selectedRentedEquipments.has(eq.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedRentedEquipments.has(eq.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.date ? formatDate(eq.date) : '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.project_code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.machine_type || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {eq.machine_name || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.time_sheet_review || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.rate || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {eq.cost || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.supplier || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={eq.comment || ''}>
                        {eq.comment || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.status || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.rented_equipment.edit"
                            onClick={() => {
                              setEditingRentedEquipment(eq)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.rented_equipment.delete"
                            onClick={() => handleDelete(eq.id)}
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
          {!loading && filteredRentedEquipments.length > 0 && hasMore && (
            <div className="flex justify-center mt-6 pb-4">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load More ({Math.min(ITEMS_PER_PAGE, filteredRentedEquipments.length - displayedCount)} more records)
              </Button>
            </div>
          )}

          {/* Show All Loaded Message */}
          {!loading && filteredRentedEquipments.length > 0 && !hasMore && displayedCount > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All {filteredRentedEquipments.length} records are displayed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rented Equipment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingRentedEquipment ? 'Edit Rented Equipment Record' : 'Add New Rented Equipment Record'}
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
                      Machine Type
                    </label>
                    <div className="relative">
                      <Input
                        value={formData.machine_type}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, machine_type: e.target.value }))
                          setMachineTypeSearch(e.target.value)
                          setShowMachineTypeDropdown(true)
                        }}
                        onFocus={() => setShowMachineTypeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowMachineTypeDropdown(false), 200)}
                        placeholder="Search or enter machine type..."
                        className="w-full"
                      />
                      {showMachineTypeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {machineTypes
                            .filter(mt => !machineTypeSearch || mt.type.toLowerCase().includes(machineTypeSearch.toLowerCase()))
                            .map((mt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, machine_type: mt.type }))
                                  setMachineTypeSearch('')
                                  setShowMachineTypeDropdown(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {mt.type}
                              </button>
                            ))}
                          {machineTypeSearch && !machineTypes.find(mt => mt.type.toLowerCase() === machineTypeSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, machine_type: machineTypeSearch }))
                                setMachineTypeSearch('')
                                setShowMachineTypeDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            >
                              + Add "{machineTypeSearch}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Machine Name
                    </label>
                    <Input
                      value={formData.machine_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, machine_name: e.target.value }))}
                      placeholder="Machine name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      HRS
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, hrs: e.target.value }))}
                      placeholder="Hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Time Sheet Review
                    </label>
                    <Input
                      value={formData.time_sheet_review}
                      onChange={(e) => setFormData(prev => ({ ...prev, time_sheet_review: e.target.value }))}
                      placeholder="Time sheet review"
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
                      Status
                    </label>
                    <Input
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      placeholder="Status"
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
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false)
                      setEditingRentedEquipment(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : editingRentedEquipment ? 'Update' : 'Add'} Rented Equipment Record
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


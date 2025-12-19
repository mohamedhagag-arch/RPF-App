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
  Cog,
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

interface RPFEquipment {
  id: string
  date?: string
  project_code?: string
  activity_type?: string
  machine_code?: string
  machine_full_name?: string
  meters_drilling?: number | string
  working_hrs?: number | string
  idle_taken_hrs?: number | string
  idle_not_taken_hrs?: number | string
  breakdown_hrs?: number | string
  maintenance_hrs?: number | string
  not_in_use_hrs?: number | string
  cost?: number | string
  note?: string
  created_at: string
  updated_at: string
}

export default function RPFEquipmentList() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('rpf-equipment-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rpfEquipments, setRpfEquipments] = useState<RPFEquipment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRPFEquipment, setEditingRPFEquipment] = useState<RPFEquipment | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedRPFEquipments, setSelectedRPFEquipments] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importStatus, setImportStatus] = useState('')
  const [displayedCount, setDisplayedCount] = useState(50) // عدد السجلات المعروضة
  const ITEMS_PER_PAGE = 50 // عدد السجلات في كل صفحة
  
  // Machine Code dropdown states
  const [machineCodes, setMachineCodes] = useState<Array<{ code: string }>>([])
  const [machineCodeSearch, setMachineCodeSearch] = useState('')
  const [showMachineCodeDropdown, setShowMachineCodeDropdown] = useState(false)
  const [filterMachineCodeSearch, setFilterMachineCodeSearch] = useState('')
  const [showFilterMachineCodeDropdown, setShowFilterMachineCodeDropdown] = useState(false)
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterProjectCode, setFilterProjectCode] = useState('')
  const [filterActivityType, setFilterActivityType] = useState('')
  const [filterMachineCode, setFilterMachineCode] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    date: '',
    project_code: '',
    activity_type: '',
    machine_code: '',
    machine_full_name: '',
    meters_drilling: '',
    working_hrs: '',
    idle_taken_hrs: '',
    idle_not_taken_hrs: '',
    breakdown_hrs: '',
    maintenance_hrs: '',
    not_in_use_hrs: '',
    cost: '',
    note: ''
  })

  useEffect(() => {
    loadRPFEquipments()
    loadMachineCodes()
  }, [])

  // إعادة تعيين عدد السجلات المعروضة عند تغيير البحث أو الفلاتر
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE)
  }, [searchTerm, filterDateFrom, filterDateTo, filterProjectCode, filterActivityType, filterMachineCode])

  const loadRPFEquipments = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تحميل جميع البيانات بدون limit
      let allData: RPFEquipment[] = []
      let page = 0
      const pageSize = 1000 // تحميل 1000 سجل في كل مرة
      let hasMore = true

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('rpf_equipment')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (fetchError) {
          console.error('Supabase Error:', fetchError)
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
            setError('Table does not exist. Please run: Database/create-rpf-equipment-table.sql')
            setRpfEquipments([])
            return
          }
          if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
            setError('Permission denied. Please run: Database/create-rpf-equipment-table.sql in Supabase SQL Editor to fix permissions.')
            setRpfEquipments([])
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

      setRpfEquipments(allData)
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error loading RPF equipment:', error)
      setError('Failed to load RPF equipment records. Please ensure the rpf_equipment table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  const loadMachineCodes = async () => {
    try {
      // تحميل جميع البيانات بدون limit
      let allData: Array<{ machine_code: string }> = []
      let page = 0
      const pageSize = 1000 // تحميل 1000 سجل في كل مرة
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('rpf_equipment')
          .select('machine_code')
          .not('machine_code', 'is', null)
          .order('machine_code', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Error loading machine codes:', error)
          setMachineCodes([])
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

      // Get unique machine codes
      const uniqueCodes = Array.from(
        new Set(
          allData
            .map(item => item.machine_code)
            .filter(code => code && code.trim() !== '')
        )
      ).map(code => ({ code: code as string }))
        .sort((a, b) => a.code.localeCompare(b.code))

      setMachineCodes(uniqueCodes)
      console.log(`Loaded ${uniqueCodes.length} unique machine codes`)
    } catch (error) {
      console.error('Error loading machine codes:', error)
      setMachineCodes([])
    }
  }

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this RPF equipment record?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('rpf_equipment')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadRPFEquipments()
      setSelectedRPFEquipments(new Set())
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
    } catch (error: any) {
      console.error('Error deleting RPF equipment:', error)
      setError('Failed to delete RPF equipment record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRPFEquipments.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedRPFEquipments.size} RPF equipment record(s)?`)) return

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const selectedArray = Array.from(selectedRPFEquipments)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0

      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batch = selectedArray.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('rpf_equipment')
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
        throw new Error(`Failed to delete RPF equipment records. ${errors} failed.`)
      } else if (errors > 0) {
        setSuccess(`Successfully deleted ${deletedCount} RPF equipment record(s). ${errors} failed.`)
      } else {
        setSuccess(`Successfully deleted ${deletedCount} RPF equipment record(s)`)
      }
      
      setSelectedRPFEquipments(new Set())
      await loadRPFEquipments()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error deleting RPF equipment records:', error)
      setError(error.message || 'Failed to delete RPF equipment records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRPFEquipments(new Set(displayedRPFEquipments.map(e => e.id)))
    } else {
      setSelectedRPFEquipments(new Set())
    }
  }

  const handleSelectRPFEquipment = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRPFEquipments)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRPFEquipments(newSelected)
  }

  const handleSave = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const metersDrilling = formData.meters_drilling ? parseFloat(formData.meters_drilling.toString()) : null
      const workingHrs = formData.working_hrs ? parseFloat(formData.working_hrs.toString()) : null
      const idleTakenHrs = formData.idle_taken_hrs ? parseFloat(formData.idle_taken_hrs.toString()) : null
      const idleNotTakenHrs = formData.idle_not_taken_hrs ? parseFloat(formData.idle_not_taken_hrs.toString()) : null
      const breakdownHrs = formData.breakdown_hrs ? parseFloat(formData.breakdown_hrs.toString()) : null
      const maintenanceHrs = formData.maintenance_hrs ? parseFloat(formData.maintenance_hrs.toString()) : null
      const notInUseHrs = formData.not_in_use_hrs ? parseFloat(formData.not_in_use_hrs.toString()) : null
      const cost = formData.cost ? parseFloat(formData.cost.toString()) : null
      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null

      const rpfEquipmentData: any = {
        date: date,
        project_code: formData.project_code || null,
        activity_type: formData.activity_type || null,
        machine_code: formData.machine_code || null,
        machine_full_name: formData.machine_full_name || null,
        meters_drilling: metersDrilling,
        working_hrs: workingHrs,
        idle_taken_hrs: idleTakenHrs,
        idle_not_taken_hrs: idleNotTakenHrs,
        breakdown_hrs: breakdownHrs,
        maintenance_hrs: maintenanceHrs,
        not_in_use_hrs: notInUseHrs,
        cost: cost,
        note: formData.note || null
      }

      if (editingRPFEquipment) {
        const { error: updateError } = await supabase
          .from('rpf_equipment')
          .update(rpfEquipmentData)
          .eq('id', editingRPFEquipment.id)

        if (updateError) throw updateError
        setSuccess('RPF equipment record updated successfully')
      } else {
        const { error: insertError } = await supabase
          .from('rpf_equipment')
          .insert([rpfEquipmentData])

        if (insertError) throw insertError
        setSuccess('RPF equipment record added successfully')
      }

      await loadRPFEquipments()
      await loadMachineCodes() // Reload machine codes after saving
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      setShowForm(false)
      setEditingRPFEquipment(null)
      setMachineCodeSearch('')
      setFormData({
        date: '',
        project_code: '',
        activity_type: '',
        machine_code: '',
        machine_full_name: '',
        meters_drilling: '',
        working_hrs: '',
        idle_taken_hrs: '',
        idle_not_taken_hrs: '',
        breakdown_hrs: '',
        maintenance_hrs: '',
        not_in_use_hrs: '',
        cost: '',
        note: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving RPF equipment:', error)
      setError(error.message || 'Failed to save RPF equipment record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Note: Cost is entered manually for RPF Equipment (not auto-calculated)

  // Initialize form data when editing
  useEffect(() => {
    if (editingRPFEquipment) {
      const dateValue = editingRPFEquipment.date 
        ? new Date(editingRPFEquipment.date).toISOString().split('T')[0]
        : ''
      setFormData({
        date: dateValue,
        project_code: editingRPFEquipment.project_code || '',
        activity_type: editingRPFEquipment.activity_type || '',
        machine_code: editingRPFEquipment.machine_code || '',
        machine_full_name: editingRPFEquipment.machine_full_name || '',
        meters_drilling: editingRPFEquipment.meters_drilling?.toString() || '',
        working_hrs: editingRPFEquipment.working_hrs?.toString() || '',
        idle_taken_hrs: editingRPFEquipment.idle_taken_hrs?.toString() || '',
        idle_not_taken_hrs: editingRPFEquipment.idle_not_taken_hrs?.toString() || '',
        breakdown_hrs: editingRPFEquipment.breakdown_hrs?.toString() || '',
        maintenance_hrs: editingRPFEquipment.maintenance_hrs?.toString() || '',
        not_in_use_hrs: editingRPFEquipment.not_in_use_hrs?.toString() || '',
        cost: editingRPFEquipment.cost?.toString() || '',
        note: editingRPFEquipment.note || ''
      })
      setMachineCodeSearch(editingRPFEquipment.machine_code || '')
    } else if (showForm) {
      setFormData({
        date: '',
        project_code: '',
        activity_type: '',
        machine_code: '',
        machine_full_name: '',
        meters_drilling: '',
        working_hrs: '',
        idle_taken_hrs: '',
        idle_not_taken_hrs: '',
        breakdown_hrs: '',
        maintenance_hrs: '',
        not_in_use_hrs: '',
        cost: '',
        note: ''
      })
    }
  }, [editingRPFEquipment, showForm])

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
        
        const activityType = getValue(row, ['ACTIVITY TYPE', 'activity type', 'activity_type', 'Activity Type', 'ACTIVITY  TYPE'])
        if (activityType) cleanRow.activity_type = String(activityType).trim()
        
        const machineCode = getValue(row, ['MACHINE CODE', 'machine code', 'machine_code', 'Machine Code', 'MACHINE  CODE'])
        if (machineCode) cleanRow.machine_code = String(machineCode).trim()
        
        const machineFullName = getValue(row, ['MACHINE FULL NAME', 'machine full name', 'machine_full_name', 'Machine Full Name', 'MACHINE FULL NAME'])
        if (machineFullName) cleanRow.machine_full_name = String(machineFullName).trim()
        
        const metersDrilling = getValue(row, ['Meters drilling(M)', 'meters drilling', 'meters_drilling', 'Meters Drilling', 'Meters drilling(M)'])
        if (metersDrilling) {
          const num = parseFloat(String(metersDrilling).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.meters_drilling = num
        }
        
        const workingHrs = getValue(row, ['WORKING HRS', 'working hrs', 'working_hrs', 'Working Hrs', 'WORKING HRS'])
        if (workingHrs) {
          const num = parseFloat(String(workingHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.working_hrs = num
        }
        
        const idleTakenHrs = getValue(row, ['IDLE TAKEN HRS', 'idle taken hrs', 'idle_taken_hrs', 'Idle Taken Hrs', 'IDLE  TAKEN HRS'])
        if (idleTakenHrs) {
          const num = parseFloat(String(idleTakenHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.idle_taken_hrs = num
        }
        
        const idleNotTakenHrs = getValue(row, ['IDLE NOT TAKEN HRS', 'idle not taken hrs', 'idle_not_taken_hrs', 'Idle Not Taken Hrs', 'IDLE NOT TAKEN HRS'])
        if (idleNotTakenHrs) {
          const num = parseFloat(String(idleNotTakenHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.idle_not_taken_hrs = num
        }
        
        const breakdownHrs = getValue(row, ['BREAKDOWN HRS', 'breakdown hrs', 'breakdown_hrs', 'Breakdown Hrs', 'BREAKDOWN HRS'])
        if (breakdownHrs) {
          const num = parseFloat(String(breakdownHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.breakdown_hrs = num
        }
        
        const maintenanceHrs = getValue(row, ['MAINTENANCE HRS', 'maintenance hrs', 'maintenance_hrs', 'Maintenance Hrs', 'MAINTENANCE HRS'])
        if (maintenanceHrs) {
          const num = parseFloat(String(maintenanceHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.maintenance_hrs = num
        }
        
        const notInUseHrs = getValue(row, ['NOT IN USE HRS', 'not in use hrs', 'not_in_use_hrs', 'Not In Use Hrs', 'NOT IN USE HRS'])
        if (notInUseHrs) {
          const num = parseFloat(String(notInUseHrs).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.not_in_use_hrs = num
        }
        
        const cost = getValue(row, ['Cost', 'cost', 'COST'])
        if (cost) {
          const num = parseFloat(String(cost).replace(/[^\d.-]/g, ''))
          if (!isNaN(num)) cleanRow.cost = num
        }
        
        const note = getValue(row, ['NOTE', 'note', 'Note'])
        if (note) cleanRow.note = String(note).trim()
        
        return cleanRow
      }).filter(row => {
        return row.date || row.project_code || row.machine_code
      })

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains RPF equipment information.')
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
          .from('rpf_equipment')
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

      await loadRPFEquipments()
      setDisplayedCount(ITEMS_PER_PAGE) // إعادة تعيين عدد السجلات المعروضة
      
      if (errors === 0) {
        setSuccess(`Successfully imported ${imported} RPF equipment record(s)`)
      } else {
        setSuccess(`Successfully imported ${imported} RPF equipment record(s). ${errors} failed.`)
      }
      
      setTimeout(() => {
        setSuccess('')
        setImporting(false)
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImportStatus('')
      }, 5000)
    } catch (error: any) {
      console.error('Error importing RPF equipment:', error)
      setError(error.message || 'Failed to import RPF equipment records')
      setImporting(false)
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImportStatus('')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (rpfEquipments.length === 0) {
        setError('No RPF equipment records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // تصدير جميع البيانات (وليس فقط المعروضة)
      const exportData = (searchTerm ? filteredRPFEquipments : rpfEquipments).map(eq => ({
        'DATE': eq.date || '',
        'Project Code': eq.project_code || '',
        'ACTIVITY  TYPE': eq.activity_type || '',
        'MACHINE  CODE': eq.machine_code || '',
        'MACHINE FULL NAME': eq.machine_full_name || '',
        'Meters drilling(M)': eq.meters_drilling || '',
        'WORKING HRS': eq.working_hrs || '',
        'IDLE  TAKEN HRS': eq.idle_taken_hrs || '',
        'IDLE NOT TAKEN HRS': eq.idle_not_taken_hrs || '',
        'BREAKDOWN HRS': eq.breakdown_hrs || '',
        'MAINTENANCE HRS': eq.maintenance_hrs || '',
        'NOT IN USE HRS': eq.not_in_use_hrs || '',
        'Cost': eq.cost || '',
        'NOTE': eq.note || ''
      }))

      const filename = `rpf_equipment_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'RPF Equipment')
      }

      setSuccess(`Successfully exported ${exportData.length} RPF equipment record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting RPF equipment:', error)
      setError('Failed to export RPF equipment records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'DATE',
        'Project Code',
        'ACTIVITY  TYPE',
        'MACHINE  CODE',
        'MACHINE FULL NAME',
        'Meters drilling(M)',
        'WORKING HRS',
        'IDLE  TAKEN HRS',
        'IDLE NOT TAKEN HRS',
        'BREAKDOWN HRS',
        'MAINTENANCE HRS',
        'NOT IN USE HRS',
        'Cost',
        'NOTE'
      ]
      await downloadTemplate('rpf_equipment_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredRPFEquipments = () => {
    let filtered = rpfEquipments

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(eq =>
        eq.project_code?.toLowerCase().includes(term) ||
        eq.activity_type?.toLowerCase().includes(term) ||
        eq.machine_code?.toLowerCase().includes(term) ||
        eq.machine_full_name?.toLowerCase().includes(term) ||
        eq.note?.toLowerCase().includes(term)
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

    // Apply project code filter
    if (filterProjectCode) {
      filtered = filtered.filter(eq =>
        eq.project_code?.toLowerCase().includes(filterProjectCode.toLowerCase())
      )
    }

    // Apply activity type filter
    if (filterActivityType) {
      filtered = filtered.filter(eq =>
        eq.activity_type?.toLowerCase().includes(filterActivityType.toLowerCase())
      )
    }

    // Apply machine code filter (multiple selection)
    if (filterMachineCode.size > 0) {
      filtered = filtered.filter(eq => {
        if (!eq.machine_code) return false
        return filterMachineCode.has(eq.machine_code)
      })
    }

    return filtered
  }

  const clearFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterProjectCode('')
    setFilterActivityType('')
    setFilterMachineCode(new Set())
    setFilterMachineCodeSearch('')
  }

  const hasActiveFilters = filterDateFrom || filterDateTo || filterProjectCode || filterActivityType || filterMachineCode.size > 0

  const handleMachineCodeToggle = (code: string) => {
    const newSet = new Set(filterMachineCode)
    if (newSet.has(code)) {
      newSet.delete(code)
    } else {
      newSet.add(code)
    }
    setFilterMachineCode(newSet)
  }

  const filteredRPFEquipments = getFilteredRPFEquipments()
  const displayedRPFEquipments = filteredRPFEquipments.slice(0, displayedCount)
  const hasMore = displayedCount < filteredRPFEquipments.length

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="cost_control.rpf_equipment.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add RPF Equipment Record
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
                  placeholder="Search RPF equipment records by project code, activity type, machine code, machine name, or note..."
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
                      filterProjectCode ? 1 : 0,
                      filterActivityType ? 1 : 0,
                      filterMachineCode ? 1 : 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRPFEquipments}
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

                  {/* Project Code Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Project Code
                    </label>
                    <Input
                      type="text"
                      placeholder="Filter by project code..."
                      value={filterProjectCode}
                      onChange={(e) => setFilterProjectCode(e.target.value)}
                    />
                  </div>

                  {/* Activity Type Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Activity Type
                    </label>
                    <Input
                      type="text"
                      placeholder="Filter by activity type..."
                      value={filterActivityType}
                      onChange={(e) => setFilterActivityType(e.target.value)}
                    />
                  </div>

                  {/* Machine Code Filter - Multi-select */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Machine Code {filterMachineCode.size > 0 && `(${filterMachineCode.size} selected)`}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search machine codes..."
                        value={filterMachineCodeSearch}
                        onChange={(e) => {
                          setFilterMachineCodeSearch(e.target.value)
                          setShowFilterMachineCodeDropdown(true)
                        }}
                        onFocus={() => setShowFilterMachineCodeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowFilterMachineCodeDropdown(false), 200)}
                        className="w-full"
                      />
                      {showFilterMachineCodeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {machineCodes
                            .filter(mc => !filterMachineCodeSearch || mc.code.toLowerCase().includes(filterMachineCodeSearch.toLowerCase()))
                            .map((mc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleMachineCodeToggle(mc.code)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                              >
                                {filterMachineCode.has(mc.code) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{mc.code}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {/* Display selected machine codes */}
                      {filterMachineCode.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(filterMachineCode).map((code) => (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {code}
                              <button
                                type="button"
                                onClick={() => handleMachineCodeToggle(code)}
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
                  {importStatus || 'Importing RPF equipment records...'}
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
                  {importProgress.current} of {importProgress.total} RPF equipment records processed
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
      {selectedRPFEquipments.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedRPFEquipments.size} RPF equipment record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRPFEquipments(new Set())}
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
            <span>RPF Equipment Records ({filteredRPFEquipments.length} {displayedCount < filteredRPFEquipments.length ? `- Showing ${displayedCount}` : ''})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('cost_control.rpf_equipment.import') && (
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
                permission="cost_control.rpf_equipment.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('cost_control.rpf_equipment.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={[]}
                  templateName="rpf_equipment_template"
                  templateColumns={['DATE', 'Project Code', 'ACTIVITY  TYPE', 'MACHINE  CODE', 'MACHINE FULL NAME', 'Meters drilling(M)', 'WORKING HRS', 'IDLE  TAKEN HRS', 'IDLE NOT TAKEN HRS', 'BREAKDOWN HRS', 'MAINTENANCE HRS', 'NOT IN USE HRS', 'Cost', 'NOTE']}
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
          ) : filteredRPFEquipments.length === 0 ? (
            <div className="text-center py-12">
              <Cog className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {rpfEquipments.length === 0 ? 'No RPF Equipment Records Found' : 'No RPF Equipment Records Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {rpfEquipments.length === 0 
                  ? 'Get started by adding your first RPF equipment record. You may need to create the rpf_equipment table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {rpfEquipments.length === 0 && (
                <PermissionButton
                  permission="cost_control.rpf_equipment.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First RPF Equipment Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('cost_control.rpf_equipment.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedRPFEquipments.size !== filteredRPFEquipments.length)}
                          className="flex items-center justify-center"
                          title={selectedRPFEquipments.size === filteredRPFEquipments.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedRPFEquipments.size === filteredRPFEquipments.length && filteredRPFEquipments.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Project Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Activity Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Machine Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Machine Full Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Meters Drilling</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Working Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Idle Taken Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Idle Not Taken Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Breakdown Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Maintenance Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Not In Use Hrs</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Note</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRPFEquipments.map((eq) => (
                    <tr
                      key={eq.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('cost_control.rpf_equipment.delete') && (
                          <button
                            onClick={() => handleSelectRPFEquipment(eq.id, !selectedRPFEquipments.has(eq.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedRPFEquipments.has(eq.id) ? (
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
                        {eq.activity_type || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {eq.machine_code || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.machine_full_name || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.meters_drilling || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.working_hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.idle_taken_hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.idle_not_taken_hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.breakdown_hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.maintenance_hrs || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {eq.not_in_use_hrs || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {eq.cost || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={eq.note || ''}>
                        {eq.note || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="cost_control.rpf_equipment.edit"
                            onClick={() => {
                              setEditingRPFEquipment(eq)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.rpf_equipment.delete"
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
          {!loading && filteredRPFEquipments.length > 0 && hasMore && (
            <div className="flex justify-center mt-6 pb-4">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load More ({Math.min(ITEMS_PER_PAGE, filteredRPFEquipments.length - displayedCount)} more records)
              </Button>
            </div>
          )}

          {/* Show All Loaded Message */}
          {!loading && filteredRPFEquipments.length > 0 && !hasMore && displayedCount > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All {filteredRPFEquipments.length} records are displayed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RPF Equipment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingRPFEquipment ? 'Edit RPF Equipment Record' : 'Add New RPF Equipment Record'}
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
                      Activity Type
                    </label>
                    <Input
                      value={formData.activity_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, activity_type: e.target.value }))}
                      placeholder="Activity type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Machine Code
                    </label>
                    <div className="relative">
                      <Input
                        value={formData.machine_code}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, machine_code: e.target.value }))
                          setMachineCodeSearch(e.target.value)
                          setShowMachineCodeDropdown(true)
                        }}
                        onFocus={() => setShowMachineCodeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowMachineCodeDropdown(false), 200)}
                        placeholder="Search or enter machine code..."
                        className="w-full"
                      />
                      {showMachineCodeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {machineCodes
                            .filter(mc => !machineCodeSearch || mc.code.toLowerCase().includes(machineCodeSearch.toLowerCase()))
                            .map((mc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, machine_code: mc.code }))
                                  setMachineCodeSearch('')
                                  setShowMachineCodeDropdown(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {mc.code}
                              </button>
                            ))}
                          {machineCodeSearch && !machineCodes.find(mc => mc.code.toLowerCase() === machineCodeSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, machine_code: machineCodeSearch }))
                                setMachineCodeSearch('')
                                setShowMachineCodeDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            >
                              + Add "{machineCodeSearch}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Machine Full Name
                    </label>
                    <Input
                      value={formData.machine_full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, machine_full_name: e.target.value }))}
                      placeholder="Machine full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Meters Drilling (M)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.meters_drilling}
                      onChange={(e) => setFormData(prev => ({ ...prev, meters_drilling: e.target.value }))}
                      placeholder="Meters drilling"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Working Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.working_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, working_hrs: e.target.value }))}
                      placeholder="Working hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Idle Taken Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.idle_taken_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, idle_taken_hrs: e.target.value }))}
                      placeholder="Idle taken hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Idle Not Taken Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.idle_not_taken_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, idle_not_taken_hrs: e.target.value }))}
                      placeholder="Idle not taken hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Breakdown Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.breakdown_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, breakdown_hrs: e.target.value }))}
                      placeholder="Breakdown hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Maintenance Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.maintenance_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, maintenance_hrs: e.target.value }))}
                      placeholder="Maintenance hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Not In Use Hrs
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.not_in_use_hrs}
                      onChange={(e) => setFormData(prev => ({ ...prev, not_in_use_hrs: e.target.value }))}
                      placeholder="Not in use hours"
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
                      setEditingRPFEquipment(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : editingRPFEquipment ? 'Update' : 'Add'} RPF Equipment Record
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


'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Upload, 
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  FileSpreadsheet,
  Cog,
  List,
  Calculator
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, Machine, MachineryDayRate } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import MachineryDayRates from './MachineryDayRates'
import { usePermissionGuard } from '@/lib/permissionGuard'

export default function MachineList() {
  const { user, appUser } = useAuth()
  const guard = usePermissionGuard()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set())
  
  // Check permissions
  const canCreate = guard.hasAccess('cost_control.machine_list.create')
  const canEdit = guard.hasAccess('cost_control.machine_list.edit')
  const canDelete = guard.hasAccess('cost_control.machine_list.delete')
  const canViewRates = guard.hasAccess('cost_control.machinery_day_rates.view')
  
  // Filter states
  const [rentalFilter, setRentalFilter] = useState<'all' | 'rented' | 'not-rented'>('all')
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'list' | 'rates'>('list')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    rate: '',
    machine_full_name: '',
    rental: ''
  })

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.MACHINE_LIST)
        // @ts-ignore
        .select('*')
        .order('code', { ascending: true })

      if (error) {
        // Provide more specific error messages
        if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure the SQL script has been run in Supabase.')
        } else if (error.code === 'PGRST116') {
          throw new Error('Table not found. Please run the schema SQL script first.')
        }
        throw error
      }
      setMachines((data || []) as any)
    } catch (err: any) {
      console.error('Error fetching machines:', err)
      setError('Failed to load machine list: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingMachine(null)
    setFormData({
      code: '',
      name: '',
      rate: '',
      machine_full_name: '',
      rental: ''
    })
    setShowModal(true)
  }

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine)
    setFormData({
      code: machine.code,
      name: machine.name,
      rate: machine.rate.toString(),
      machine_full_name: machine.machine_full_name || '',
      rental: machine.rental?.toString() || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      if (!formData.code.trim()) {
        setError('Please enter a machine code')
        setLoading(false)
        return
      }

      if (!formData.name.trim()) {
        setError('Please enter a machine name')
        setLoading(false)
        return
      }

      if (!formData.rate || parseFloat(formData.rate) < 0) {
        setError('Please enter a valid rate')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      const machineData: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        rate: parseFloat(formData.rate),
        machine_full_name: formData.machine_full_name.trim() || null,
        rental: formData.rental.trim() || null // Accept text values like "R" for rented
      }

      const supabaseClient = getSupabaseClient()
      
      if (editingMachine) {
        machineData.updated_by = currentUserId
        const { error } = await supabaseClient
          .from(TABLES.MACHINE_LIST)
          // @ts-ignore
          .update(machineData)
          .eq('id', editingMachine.id)

        if (error) throw error
        setSuccess('Machine updated successfully!')
      } else {
        machineData.created_by = currentUserId
        const { error } = await supabaseClient
          .from(TABLES.MACHINE_LIST)
          // @ts-ignore
          .insert([machineData])

        if (error) {
          if (error.code === '23505') {
            throw new Error('Machine code already exists. Please use a unique code.')
          }
          throw error
        }
        setSuccess('Machine added successfully!')
      }

      setShowModal(false)
      await fetchMachines()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save machine: ' + err.message)
      console.error('Error saving machine:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machine?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.MACHINE_LIST)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Machine deleted successfully!')
      setSelectedMachines(new Set())
      await fetchMachines()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete machine: ' + err.message)
      console.error('Error deleting machine:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedMachines.size === 0) {
      setError('Please select at least one machine to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedMachines.size} machine(s)?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const machineIds = Array.from(selectedMachines)
      
      const { error } = await supabaseClient
        .from(TABLES.MACHINE_LIST)
        // @ts-ignore
        .delete()
        .in('id', machineIds)

      if (error) throw error

      setSuccess(`Successfully deleted ${selectedMachines.size} machine(s)!`)
      setSelectedMachines(new Set())
      await fetchMachines()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete machines: ' + err.message)
      console.error('Error deleting machines:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMachines(new Set(filteredMachines.map(m => m.id)))
    } else {
      setSelectedMachines(new Set())
    }
  }

  const handleSelectMachine = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedMachines)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedMachines(newSelected)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const codeIndex = headers.findIndex(h => h.includes('code'))
      const nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('full'))
      const rateIndex = headers.findIndex(h => h.includes('rate'))
      const fullNameIndex = headers.findIndex(h => h.includes('full') && h.includes('name'))
      const rentalIndex = headers.findIndex(h => h.includes('rental'))

      if (codeIndex === -1 || nameIndex === -1 || rateIndex === -1) {
        throw new Error('Invalid CSV format. Required columns: Code, Name, Rate')
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const machinesToImport: any[] = []
      const codeSet = new Set<string>() // Track unique codes to avoid duplicates
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const code = values[codeIndex]
        const name = values[nameIndex]
        const rate = parseFloat(values[rateIndex])

        if (!code || !name || isNaN(rate)) continue

        // Skip if code already exists in this import batch
        if (codeSet.has(code)) {
          console.warn(`Skipping duplicate code in CSV: ${code}`)
          continue
        }

        codeSet.add(code)
        // Handle rental: accept "R" for rented or numeric values
        let rentalValue: string | null = null
        if (rentalIndex !== -1 && values[rentalIndex]) {
          const rentalStr = values[rentalIndex].trim()
          // If it's "R" or starts with "R", keep it as is
          if (rentalStr.toUpperCase() === 'R' || rentalStr.toUpperCase().startsWith('R')) {
            rentalValue = 'R'
          } else {
            // Try to parse as number, if fails keep as text
            const rentalNum = parseFloat(rentalStr)
            rentalValue = isNaN(rentalNum) ? rentalStr : rentalStr
          }
        }

        machinesToImport.push({
          code,
          name,
          rate,
          machine_full_name: fullNameIndex !== -1 && values[fullNameIndex] ? values[fullNameIndex] : null,
          rental: rentalValue,
          created_by: currentUserId
        })
      }

      if (machinesToImport.length === 0) {
        throw new Error('No valid data found in CSV file')
      }

      // Process imports in batches for better performance
      const supabaseClient = getSupabaseClient()
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      const totalMachines = machinesToImport.length
      
      // Set initial progress
      setImportProgress({ current: 0, total: totalMachines, percentage: 0 })

      // Process in batches of 10 for better performance
      const batchSize = 10
      for (let i = 0; i < machinesToImport.length; i += batchSize) {
        const batch = machinesToImport.slice(i, i + batchSize)
        
        try {
          const { error } = await supabaseClient
            .from(TABLES.MACHINE_LIST)
            // @ts-ignore
            .upsert(batch, { onConflict: 'code' })

          if (error) {
            // If batch fails, try individual inserts
            for (const machine of batch) {
              try {
                const { error: singleError } = await supabaseClient
                  .from(TABLES.MACHINE_LIST)
                  // @ts-ignore
                  .upsert([machine], { onConflict: 'code' })

                if (singleError) {
                  errorCount++
                  errors.push(`${machine.code}: ${singleError.message}`)
                } else {
                  successCount++
                }
              } catch (err: any) {
                errorCount++
                errors.push(`${machine.code}: ${err.message}`)
              }
            }
          } else {
            successCount += batch.length
          }
        } catch (err: any) {
          // If batch fails, try individual inserts
          for (const machine of batch) {
            try {
              const { error: singleError } = await supabaseClient
                .from(TABLES.MACHINE_LIST)
                // @ts-ignore
                .upsert([machine], { onConflict: 'code' })

              if (singleError) {
                errorCount++
                errors.push(`${machine.code}: ${singleError.message}`)
              } else {
                successCount++
              }
            } catch (singleErr: any) {
              errorCount++
              errors.push(`${machine.code}: ${singleErr.message}`)
            }
          }
        }

        // Update progress
        const current = Math.min(i + batchSize, totalMachines)
        const percentage = Math.round((current / totalMachines) * 100)
        setImportProgress({ current, total: totalMachines, percentage })
      }

      if (errorCount > 0 && successCount === 0) {
        throw new Error(`Failed to import all machines. Errors: ${errors.join('; ')}`)
      } else if (errorCount > 0) {
        setSuccess(`Successfully imported ${successCount} machine(s)! ${errorCount} failed: ${errors.join('; ')}`)
      } else {
        setSuccess(`Successfully imported ${successCount} machine(s)!`)
      }

      await fetchMachines()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError('Failed to import: ' + err.message)
      console.error('Error importing:', err)
    } finally {
      setLoading(false)
      // Reset progress
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      // Reset file input
      event.target.value = ''
    }
  }

  const handleExport = () => {
    const headers = ['Code', 'Name', 'Rate', 'Machine Full Name', 'Rental']
    const csvContent = [
      headers.join(','),
      ...machines.map(machine => [
        machine.code,
        machine.name,
        machine.rate,
        machine.machine_full_name || '',
        machine.rental || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `machine_list_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Filter machines with smart filters
  const filteredMachines = machines.filter(machine => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        machine.code.toLowerCase().includes(searchLower) ||
        machine.name.toLowerCase().includes(searchLower) ||
        (machine.machine_full_name && machine.machine_full_name.toLowerCase().includes(searchLower))
      )
      if (!matchesSearch) return false
    }

    // Rental filter
    if (rentalFilter === 'rented') {
      if (!machine.rental || machine.rental.toUpperCase() !== 'R') return false
    } else if (rentalFilter === 'not-rented') {
      if (machine.rental && machine.rental.toUpperCase() === 'R') return false
    }

    // Rate range filter
    if (rateMin) {
      const minRate = parseFloat(rateMin)
      if (!isNaN(minRate) && machine.rate < minRate) return false
    }
    if (rateMax) {
      const maxRate = parseFloat(rateMax)
      if (!isNaN(maxRate) && machine.rate > maxRate) return false
    }

    return true
  })

  // Calculate statistics
  const stats = {
    total: machines.length,
    filtered: filteredMachines.length,
    rented: machines.filter(m => m.rental && m.rental.toUpperCase() === 'R').length,
    notRented: machines.filter(m => !m.rental || m.rental.toUpperCase() !== 'R').length,
    avgRate: machines.length > 0 
      ? (machines.reduce((sum, m) => sum + m.rate, 0) / machines.length).toFixed(2)
      : '0.00'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Machine List</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage machine information and rates for cost control
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Machine List
            </div>
          </button>
          {canViewRates && (
            <button
              onClick={() => setActiveTab('rates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rates'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Machinery Day Rates
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <>
          {/* Header Actions */}
          <div className="flex items-center justify-end gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            id="import-csv-input"
          />
          <label htmlFor="import-csv-input">
            <span>
              <PermissionButton
                permission="cost_control.machine_list.create"
                variant="outline" 
                className="flex items-center gap-2 cursor-pointer" 
                type="button"
                onClick={() => document.getElementById('import-csv-input')?.click()}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </PermissionButton>
            </span>
          </label>
          <PermissionButton
            permission="cost_control.machine_list.export"
            variant="outline" 
            onClick={handleExport} 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </PermissionButton>
          {selectedMachines.size > 0 && (
            <PermissionButton
              permission="cost_control.machine_list.delete"
              variant="outline" 
              onClick={handleBulkDelete} 
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedMachines.size})
            </PermissionButton>
          )}
          <PermissionButton
            permission="cost_control.machine_list.create"
            onClick={handleAdd} 
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Machine
          </PermissionButton>
          </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" className="animate-in slide-in-from-top-5">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800 animate-in slide-in-from-top-5">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Import Progress Bar */}
      {importProgress.total > 0 && loading && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Importing machines...
                </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {importProgress.percentage}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress.percentage}%` }}
                />
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 text-center">
                {importProgress.current} of {importProgress.total} machines processed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search and Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by code, name, or full name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">Total</div>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">{stats.total}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">Filtered</div>
                    <div className="font-semibold text-green-600 dark:text-green-400">{stats.filtered}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rental Status</label>
                <select
                  value={rentalFilter}
                  onChange={(e) => setRentalFilter(e.target.value as 'all' | 'rented' | 'not-rented')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All ({stats.total})</option>
                  <option value="rented">Rented ({stats.rented})</option>
                  <option value="not-rented">Not Rented ({stats.notRented})</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Min Rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Min"
                  value={rateMin}
                  onChange={(e) => setRateMin(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Max"
                  value={rateMax}
                  onChange={(e) => setRateMax(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setRentalFilter('all')
                    setRateMin('')
                    setRateMax('')
                  }}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Machines</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</div>
              </div>
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Rented</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.rented}</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Not Rented</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.notRented}</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Rate</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.avgRate}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machine List ({filteredMachines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No machines found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold w-12">
                      <input
                        type="checkbox"
                        checked={filteredMachines.length > 0 && selectedMachines.size === filteredMachines.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th className="text-left p-3 font-semibold">Code</th>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Rate</th>
                    <th className="text-left p-3 font-semibold">Machine Full Name</th>
                    <th className="text-left p-3 font-semibold">Rental</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map((machine) => (
                    <tr 
                      key={machine.id} 
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        selectedMachines.has(machine.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedMachines.has(machine.id)}
                          onChange={(e) => handleSelectMachine(machine.id, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {machine.code}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-900 dark:text-white">
                          {machine.name}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {machine.rate.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        {machine.machine_full_name ? (
                          <span className="text-gray-600 dark:text-gray-400">
                            {machine.machine_full_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {machine.rental ? (
                          <span className={`font-semibold ${
                            machine.rental.toUpperCase() === 'R' 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {machine.rental.toUpperCase() === 'R' ? 'R (Rented)' : machine.rental}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <PermissionButton
                            permission="cost_control.machine_list.edit"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(machine)}
                            className="h-10 w-10 p-0 flex items-center justify-center"
                            title="Edit Machine"
                          >
                            <Edit className="h-5 w-5" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.machine_list.delete"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(machine.id)}
                            className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                            title="Delete Machine"
                          >
                            <Trash2 className="h-5 w-5" />
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

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingMachine ? 'Edit Machine' : 'Add Machine'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., M001"
                    required
                    disabled={!!editingMachine}
                  />
                  {editingMachine && (
                    <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Excavator"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Rate *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., 150.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Machine Full Name</label>
                  <input
                    type="text"
                    value={formData.machine_full_name}
                    onChange={(e) => setFormData({ ...formData, machine_full_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., CAT 320D Excavator"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rental <span className="text-gray-400 text-xs">(Enter "R" for rented or rental cost)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rental}
                    onChange={(e) => setFormData({ ...formData, rental: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder='Enter "R" for rented or rental cost'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use "R" to mark machine as rented, or enter the rental cost amount
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <PermissionButton
                    permission={editingMachine ? 'cost_control.machine_list.edit' : 'cost_control.machine_list.create'}
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {editingMachine ? 'Update' : 'Add'} Machine
                      </>
                    )}
                  </PermissionButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
          </>
        ) : activeTab === 'rates' && canViewRates ? (
          <MachineryDayRates machines={machines} />
        ) : null}
    </div>
  )
}


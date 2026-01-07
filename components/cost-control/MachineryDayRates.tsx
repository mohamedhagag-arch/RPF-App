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
  Calculator,
  ChevronDown,
  Check,
  History,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, MachineryDayRate, Machine, MachineDailyRateHistory } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface MachineryDayRatesProps {
  machines: Machine[] // Pass machines list for code dropdown
}

export default function MachineryDayRates({ machines }: MachineryDayRatesProps) {
  const { user, appUser } = useAuth()
  const guard = usePermissionGuard()
  const [rates, setRates] = useState<MachineryDayRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [codeSearchTerm, setCodeSearchTerm] = useState('')
  const [showCodeDropdown, setShowCodeDropdown] = useState(false)
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set())
  
  // Check permissions
  const canCreate = guard.hasAccess('cost_control.machinery_day_rates.create')
  const canEdit = guard.hasAccess('cost_control.machinery_day_rates.edit')
  const canDelete = guard.hasAccess('cost_control.machinery_day_rates.delete')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<MachineryDayRate | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    rate: '',
    efficiency: '100'
  })

  // Daily Rate Modal state
  const [showDailyRateModal, setShowDailyRateModal] = useState(false)
  const [selectedRate, setSelectedRate] = useState<MachineryDayRate | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [editingDailyRate, setEditingDailyRate] = useState<MachineDailyRateHistory | null>(null)
  const [dailyRateHistory, setDailyRateHistory] = useState<Map<string, MachineDailyRateHistory[]>>(new Map())
  const [dailyRateFormData, setDailyRateFormData] = useState({
    daily_rate: '',
    name: '',
    start_date: '',
    end_date: '',
    is_active: true
  })

  useEffect(() => {
    fetchRates()
    fetchDailyRateHistory()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showCodeDropdown && !target.closest('.code-dropdown-container')) {
        setShowCodeDropdown(false)
      }
    }

    if (showCodeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCodeDropdown])

  const fetchRates = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.MACHINERY_DAY_RATES)
        // @ts-ignore
        .select('*')
        .order('code', { ascending: true })

      if (error) {
        if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure the SQL script has been run in Supabase.')
        } else if (error.code === 'PGRST116') {
          throw new Error('Table not found. Please run the schema SQL script first.')
        }
        throw error
      }
      setRates((data || []) as any)
    } catch (err: any) {
      console.error('Error fetching rates:', err)
      setError('Failed to load machinery day rates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyRateHistory = async () => {
    try {
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.MACHINE_DAILY_RATE_HISTORY)
        // @ts-ignore
        .select('*')
        .order('start_date', { ascending: false })

      if (error) {
        // If table doesn't exist, just log and continue (table will be created by SQL script)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Daily rate history table does not exist yet. Please run the SQL script first.')
          setDailyRateHistory(new Map())
          return
        }
        console.error('Error fetching daily rate history:', error)
        return
      }

      // Group by machine_id
      const historyMap = new Map<string, MachineDailyRateHistory[]>()
      if (data) {
        data.forEach((item: any) => {
          const machineId = item.machine_id
          if (!historyMap.has(machineId)) {
            historyMap.set(machineId, [])
          }
          historyMap.get(machineId)!.push(item as MachineDailyRateHistory)
        })
      }
      setDailyRateHistory(historyMap)
    } catch (err: any) {
      console.error('Error fetching daily rate history:', err)
      // Don't show error to user if table doesn't exist yet
      if (err?.code !== '42P01' && !err?.message?.includes('does not exist')) {
        console.error('Unexpected error:', err)
      }
    }
  }

  const getActiveDailyRate = (machineId: string): MachineDailyRateHistory | null => {
    const history = dailyRateHistory.get(machineId) || []
    return history.find(rate => rate.is_active) || null
  }

  const handleManageDailyRate = (rate: MachineryDayRate) => {
    // Find machine by code
    const machine = machines.find(m => m.code === rate.code)
    if (!machine) {
      setError('Machine not found for code: ' + rate.code)
      return
    }
    
    setSelectedRate(rate)
    setSelectedMachine(machine)
    setEditingDailyRate(null)
    setDailyRateFormData({
      daily_rate: rate.rate.toString(),
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true
    })
    setShowDailyRateModal(true)
  }

  const handleEditDailyRate = (dailyRate: MachineDailyRateHistory) => {
    setEditingDailyRate(dailyRate)
    setDailyRateFormData({
      daily_rate: dailyRate.daily_rate.toString(),
      name: dailyRate.name,
      start_date: dailyRate.start_date,
      end_date: dailyRate.end_date || '',
      is_active: dailyRate.is_active
    })
    setShowDailyRateModal(true)
  }

  const handleSaveDailyRate = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      if (!dailyRateFormData.daily_rate || parseFloat(dailyRateFormData.daily_rate) < 0) {
        setError('Please enter a valid daily rate')
        setLoading(false)
        return
      }

      if (!dailyRateFormData.name.trim()) {
        setError('Please enter a name for this rate period')
        setLoading(false)
        return
      }

      if (!dailyRateFormData.start_date) {
        setError('Please enter a start date')
        setLoading(false)
        return
      }

      if (dailyRateFormData.end_date && new Date(dailyRateFormData.end_date) < new Date(dailyRateFormData.start_date)) {
        setError('End date must be after start date')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id
      
      if (!selectedMachine) {
        setError('No machine selected')
        setLoading(false)
        return
      }

      // Validate machine_id exists
      if (!selectedMachine.id) {
        setError('Invalid machine ID. Please refresh the page and try again.')
        setLoading(false)
        return
      }

      // Save to history table
      const rateData: any = {
        machine_id: selectedMachine.id,
        name: dailyRateFormData.name.trim(),
        daily_rate: parseFloat(dailyRateFormData.daily_rate),
        start_date: dailyRateFormData.start_date,
        end_date: dailyRateFormData.end_date || null,
        is_active: dailyRateFormData.is_active
      }

      // Only add created_by/updated_by if user is authenticated (these fields are nullable)
      if (currentUserId) {
        if (editingDailyRate) {
          rateData.updated_by = currentUserId
        } else {
          rateData.created_by = currentUserId
        }
      }

      const supabaseClient = getSupabaseClient()
      
      if (editingDailyRate) {
        rateData.updated_by = currentUserId
        
        const { data, error } = await supabaseClient
          .from(TABLES.MACHINE_DAILY_RATE_HISTORY)
          // @ts-ignore
          .update(rateData)
          .eq('id', editingDailyRate.id)
          .select()

        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('Table does not exist. Please run the SQL script: Database/machine-daily-rate-history-complete.sql')
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            throw new Error('Permission denied. Please check RLS policies in Supabase.')
          } else if (error.code === '23503' || error.message?.includes('foreign key')) {
            throw new Error('Invalid machine. Please refresh the page and try again.')
          }
          
          throw new Error(error.message || error.details || 'Failed to update daily rate')
        }
        
        setSuccess('Daily rate updated successfully!')
      } else {
        const { data, error } = await supabaseClient
          .from(TABLES.MACHINE_DAILY_RATE_HISTORY)
          // @ts-ignore
          .insert([rateData])
          .select()

        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('Table does not exist. Please run the SQL script: Database/machine-daily-rate-history-complete.sql')
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            throw new Error('Permission denied. Please check RLS policies in Supabase.')
          } else if (error.code === '23503' || error.message?.includes('foreign key')) {
            throw new Error('Invalid machine. Please refresh the page and try again.')
          } else if (error.code === '23505' || error.message?.includes('unique constraint')) {
            throw new Error('A rate with this name already exists for this machine.')
          }
          
          throw new Error(error.message || error.details || 'Failed to insert daily rate')
        }
        
        setSuccess('Daily rate added successfully!')
      }

      // If this is the active rate, update rate in machinery_day_rates table
      if (dailyRateFormData.is_active && selectedRate) {
        const newDailyRate = parseFloat(dailyRateFormData.daily_rate)
        const updateData: any = {
          rate: newDailyRate,
          updated_by: currentUserId || null
        }

        const { error: updateError } = await supabaseClient
          .from(TABLES.MACHINERY_DAY_RATES)
          // @ts-ignore
          .update(updateData)
          .eq('id', selectedRate.id)

        if (updateError) {
          console.error('⚠️ Failed to update rate in machinery_day_rates:', updateError)
          // Don't throw error, just log it - the history was saved successfully
        } else {
          console.log('✅ Updated rate in machinery_day_rates table:', updateData)
        }
      }

      setShowDailyRateModal(false)
      setEditingDailyRate(null)
      
      // Always refresh both tables to show updated data
      await fetchRates() // Refresh rates to show updated rate
      await fetchDailyRateHistory() // Refresh history
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Unknown error occurred'
      setError('Failed to save daily rate: ' + errorMessage)
      console.error('Error saving daily rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDailyRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this daily rate?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.MACHINE_DAILY_RATE_HISTORY)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Daily rate deleted successfully!')
      await fetchDailyRateHistory()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete daily rate: ' + err.message)
      console.error('Error deleting daily rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUseRate = async (rate: MachineDailyRateHistory) => {
    if (!selectedMachine || !selectedRate) return

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const currentUserId = user?.id || appUser?.id
      const supabaseClient = getSupabaseClient()

      // Set this rate as active (trigger will deactivate others)
      const { error: updateError } = await supabaseClient
        .from(TABLES.MACHINE_DAILY_RATE_HISTORY)
        // @ts-ignore
        .update({
          is_active: true,
          updated_by: currentUserId || null
        })
        .eq('id', rate.id)

      if (updateError) {
        if (updateError.code === '42P01' || updateError.message?.includes('does not exist')) {
          throw new Error('Table does not exist. Please run the SQL script: Database/machine-daily-rate-history-complete.sql')
        } else if (updateError.code === '42501' || updateError.message?.includes('permission denied')) {
          throw new Error('Permission denied. Please check RLS policies in Supabase.')
        }
        throw new Error(updateError.message || updateError.details || 'Failed to activate rate')
      }

      // Update rate in machinery_day_rates table
      const { error: rateUpdateError } = await supabaseClient
        .from(TABLES.MACHINERY_DAY_RATES)
        // @ts-ignore
        .update({
          rate: rate.daily_rate,
          updated_by: currentUserId || null
        })
        .eq('id', selectedRate.id)

      if (rateUpdateError) {
        console.error('⚠️ Failed to update rate in machinery_day_rates:', rateUpdateError)
        // Don't throw error, just log it - the history was updated successfully
      } else {
        console.log('✅ Updated rate in machinery_day_rates table:', rate.daily_rate)
      }

      setSuccess('Rate activated and machinery day rate updated successfully!')
      
      // Refresh both tables
      await fetchRates()
      await fetchDailyRateHistory()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Unknown error occurred'
      setError('Failed to use rate: ' + errorMessage)
      console.error('Error using rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRate(null)
    setFormData({
      code: '',
      description: '',
      rate: '',
      efficiency: '100'
    })
    setCodeSearchTerm('')
    setShowCodeDropdown(false)
    setShowModal(true)
  }

  const handleEdit = (rate: MachineryDayRate) => {
    setEditingRate(rate)
    setFormData({
      code: rate.code,
      description: rate.description || '',
      rate: rate.rate.toString(),
      efficiency: rate.efficiency?.toString() || '100'
    })
    setCodeSearchTerm('')
    setShowCodeDropdown(false)
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

      if (!formData.rate || parseFloat(formData.rate) < 0) {
        setError('Please enter a valid rate')
        setLoading(false)
        return
      }

      const efficiency = parseFloat(formData.efficiency) || 100
      if (efficiency < 0 || efficiency > 100) {
        setError('Efficiency must be between 0 and 100')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      const rateData: any = {
        code: formData.code.trim(),
        description: formData.description.trim() || null,
        rate: parseFloat(formData.rate),
        efficiency: efficiency
      }

      const supabaseClient = getSupabaseClient()
      
      if (editingRate) {
        rateData.updated_by = currentUserId
        const { error } = await supabaseClient
          .from(TABLES.MACHINERY_DAY_RATES)
          // @ts-ignore
          .update(rateData)
          .eq('id', editingRate.id)

        if (error) {
          if (error.code === '23505') {
            throw new Error('Machine code already exists. Please use a unique code.')
          }
          throw error
        }
        setSuccess('Machinery day rate updated successfully!')
      } else {
        rateData.created_by = currentUserId
        const { error } = await supabaseClient
          .from(TABLES.MACHINERY_DAY_RATES)
          // @ts-ignore
          .insert([rateData])

        if (error) {
          if (error.code === '23505') {
            throw new Error('Machine code already exists. Please use a unique code.')
          }
          throw error
        }
        setSuccess('Machinery day rate added successfully!')
      }

      setShowModal(false)
      await fetchRates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save rate: ' + err.message)
      console.error('Error saving rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machinery day rate?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.MACHINERY_DAY_RATES)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Machinery day rate deleted successfully!')
      setSelectedRates(new Set())
      await fetchRates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete rate: ' + err.message)
      console.error('Error deleting rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRates.size === 0) {
      setError('Please select at least one rate to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedRates.size} rate(s)?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const rateIds = Array.from(selectedRates)
      
      const { error } = await supabaseClient
        .from(TABLES.MACHINERY_DAY_RATES)
        // @ts-ignore
        .delete()
        .in('id', rateIds)

      if (error) throw error

      setSuccess(`Successfully deleted ${selectedRates.size} rate(s)!`)
      setSelectedRates(new Set())
      await fetchRates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete rates: ' + err.message)
      console.error('Error deleting rates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRates(new Set(filteredRates.map(r => r.id)))
    } else {
      setSelectedRates(new Set())
    }
  }

  const handleSelectRate = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRates)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRates(newSelected)
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
      const descriptionIndex = headers.findIndex(h => h.includes('description'))
      const rateIndex = headers.findIndex(h => h.includes('rate'))
      const efficiencyIndex = headers.findIndex(h => h.includes('efficiency'))

      if (codeIndex === -1 || rateIndex === -1) {
        throw new Error('Invalid CSV format. Required columns: Code, Rate')
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const ratesToImport: any[] = []
      const codeSet = new Set<string>()
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const code = values[codeIndex]
        const rate = parseFloat(values[rateIndex])

        if (!code || isNaN(rate)) continue

        if (codeSet.has(code)) {
          console.warn(`Skipping duplicate code in CSV: ${code}`)
          continue
        }

        codeSet.add(code)
        ratesToImport.push({
          code,
          description: descriptionIndex !== -1 && values[descriptionIndex] ? values[descriptionIndex] : null,
          rate,
          efficiency: efficiencyIndex !== -1 && values[efficiencyIndex] ? parseFloat(values[efficiencyIndex]) || 100 : 100,
          created_by: currentUserId
        })
      }

      if (ratesToImport.length === 0) {
        throw new Error('No valid data found in CSV file')
      }

      const supabaseClient = getSupabaseClient()
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      const totalRates = ratesToImport.length
      
      for (const rate of ratesToImport) {
        try {
          const { error } = await supabaseClient
            .from(TABLES.MACHINERY_DAY_RATES)
            // @ts-ignore
            .upsert([rate], { onConflict: 'code' })

          if (error) {
            errorCount++
            errors.push(`${rate.code}: ${error.message}`)
          } else {
            successCount++
          }
        } catch (err: any) {
          errorCount++
          errors.push(`${rate.code}: ${err.message}`)
        }
      }

      if (errorCount > 0 && successCount === 0) {
        throw new Error(`Failed to import all rates. Errors: ${errors.join('; ')}`)
      } else if (errorCount > 0) {
        setSuccess(`Successfully imported ${successCount} rate(s)! ${errorCount} failed: ${errors.join('; ')}`)
      } else {
        setSuccess(`Successfully imported ${successCount} rate(s)!`)
      }

      await fetchRates()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError('Failed to import: ' + err.message)
      console.error('Error importing:', err)
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleExport = () => {
    const headers = ['Code', 'Description', 'Rate', 'Efficiency']
    const csvContent = [
      headers.join(','),
      ...rates.map(rate => [
        rate.code,
        rate.description || '',
        rate.rate,
        rate.efficiency || 100
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `machinery_day_rates_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Filter rates
  const filteredRates = rates.filter(rate => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      rate.code.toLowerCase().includes(searchLower) ||
      (rate.description && rate.description.toLowerCase().includes(searchLower))
    )
  })

  // Get machine info for code
  const getMachineInfo = (code: string) => {
    return machines.find(m => m.code === code)
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-2">
        <input
          type="file"
          accept=".csv"
          onChange={handleImport}
          className="hidden"
          id="import-rates-csv-input"
        />
        <label htmlFor="import-rates-csv-input">
          <span>
            <PermissionButton
              permission="cost_control.machinery_day_rates.create"
              variant="outline" 
              className="flex items-center gap-2 cursor-pointer" 
              type="button"
              onClick={() => document.getElementById('import-rates-csv-input')?.click()}
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </PermissionButton>
          </span>
        </label>
        <PermissionButton
          permission="cost_control.machinery_day_rates.view"
          variant="outline" 
          onClick={handleExport} 
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </PermissionButton>
        {selectedRates.size > 0 && (
          <PermissionButton
            permission="cost_control.machinery_day_rates.delete"
            variant="outline"
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRates.size})
          </PermissionButton>
        )}
        <PermissionButton
          permission="cost_control.machinery_day_rates.create"
          onClick={handleAdd} 
          className="flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Rate
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by code or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold">{filteredRates.length}</span> rate(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machinery Day Rates ({filteredRates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : filteredRates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No machinery day rates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold w-12">
                      <input
                        type="checkbox"
                        checked={filteredRates.length > 0 && selectedRates.size === filteredRates.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th className="text-left p-3 font-semibold">Code</th>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold">Rate</th>
                    <th className="text-left p-3 font-semibold">Daily Rate Name</th>
                    <th className="text-left p-3 font-semibold">Period (From - To)</th>
                    <th className="text-left p-3 font-semibold">Efficiency (%)</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((rate) => {
                    const machineInfo = getMachineInfo(rate.code)
                    const isSelected = selectedRates.has(rate.id)
                    // Get active daily rate for this machine
                    const activeDailyRate = machineInfo ? getActiveDailyRate(machineInfo.id) : null
                    return (
                      <tr 
                        key={rate.id} 
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRate(rate.id, e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {rate.code}
                            </span>
                            {machineInfo && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {machineInfo.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {rate.description ? (
                            <span className="text-gray-600 dark:text-gray-400">
                              {rate.description}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {rate.rate.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3">
                          {activeDailyRate ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {activeDailyRate.name}
                              </span>
                              {activeDailyRate.is_active && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded text-xs">
                                  Active
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {activeDailyRate ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(activeDailyRate.start_date).toLocaleDateString()}</span>
                              </div>
                              {activeDailyRate.end_date ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-gray-400">-</span>
                                  <span>{new Date(activeDailyRate.end_date).toLocaleDateString()}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 mt-1">Ongoing</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (rate.efficiency || 100) >= 80 
                                    ? 'bg-green-500' 
                                    : (rate.efficiency || 100) >= 50 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${rate.efficiency || 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem]">
                              {(rate.efficiency || 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <PermissionButton
                              permission="cost_control.machinery_day_rates.create"
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageDailyRate(rate)}
                              className="h-10 w-10 p-0 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Manage Daily Rate"
                            >
                              <History className="h-5 w-5" />
                            </PermissionButton>
                            <PermissionButton
                              permission="cost_control.machinery_day_rates.edit"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(rate)}
                              className="h-10 w-10 p-0 flex items-center justify-center"
                              title="Edit Rate"
                            >
                              <Edit className="h-5 w-5" />
                            </PermissionButton>
                            <PermissionButton
                              permission="cost_control.machinery_day_rates.delete"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(rate.id)}
                              className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                              title="Delete Rate"
                            >
                              <Trash2 className="h-5 w-5" />
                            </PermissionButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                  {editingRate ? 'Edit Machinery Day Rate' : 'Add Machinery Day Rate'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowModal(false)
                    setShowCodeDropdown(false)
                    setCodeSearchTerm('')
                  }}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="relative code-dropdown-container">
                  <label className="block text-sm font-medium mb-2">Code *</label>
                  {editingRate ? (
                    <input
                      type="text"
                      value={formData.code}
                      disabled
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowCodeDropdown(!showCodeDropdown)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-sm">
                          {formData.code 
                            ? machines.find(m => m.code === formData.code) 
                              ? `${formData.code} - ${machines.find(m => m.code === formData.code)?.name}`
                              : formData.code
                            : 'Select Machine Code...'}
                        </span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${showCodeDropdown ? 'transform rotate-180' : ''}`}
                        />
                      </button>
                      
                      {showCodeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search machine code or name..."
                                value={codeSearchTerm}
                                onChange={(e) => setCodeSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-80">
                            {machines
                              .filter((machine) => {
                                if (!codeSearchTerm) return true
                                const searchLower = codeSearchTerm.toLowerCase()
                                return (
                                  machine.code?.toLowerCase().includes(searchLower) ||
                                  machine.name?.toLowerCase().includes(searchLower) ||
                                  machine.machine_full_name?.toLowerCase().includes(searchLower)
                                )
                              })
                              .map((machine) => {
                                const isSelected = formData.code === machine.code
                                return (
                                  <div
                                    key={machine.id}
                                    onClick={() => {
                                      setFormData({ ...formData, code: machine.code })
                                      setShowCodeDropdown(false)
                                      setCodeSearchTerm('')
                                    }}
                                    className={`px-3 py-2 cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                        isSelected
                                          ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400'
                                          : 'border-gray-300 dark:border-gray-600'
                                      }`}>
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{machine.code}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {machine.name}
                                          {machine.machine_full_name && ` • ${machine.machine_full_name}`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            {machines.filter((machine) => {
                              if (!codeSearchTerm) return false
                              const searchLower = codeSearchTerm.toLowerCase()
                              return (
                                machine.code?.toLowerCase().includes(searchLower) ||
                                machine.name?.toLowerCase().includes(searchLower) ||
                                machine.machine_full_name?.toLowerCase().includes(searchLower)
                              )
                            }).length === 0 && codeSearchTerm && (
                              <div className="px-3 py-4 text-center text-sm text-gray-500">
                                No machines found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {editingRate && (
                    <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Daily rate for excavator"
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
                    placeholder="e.g., 500.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Efficiency (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.efficiency}
                    onChange={(e) => setFormData({ ...formData, efficiency: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Efficiency percentage (0-100, default: 100%)</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setShowCodeDropdown(false)
                      setCodeSearchTerm('')
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <PermissionButton
                    permission={editingRate ? 'cost_control.machinery_day_rates.edit' : 'cost_control.machinery_day_rates.create'}
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
                        {editingRate ? 'Update' : 'Add'} Rate
                      </>
                    )}
                  </PermissionButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Rate Modal */}
      {showDailyRateModal && selectedRate && selectedMachine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingDailyRate ? 'Edit Daily Rate' : 'Add Daily Rate'} - {selectedMachine.name} ({selectedMachine.code})
                </CardTitle>
                <button
                  onClick={() => {
                    setShowDailyRateModal(false)
                    setEditingDailyRate(null)
                    setSelectedRate(null)
                    setSelectedMachine(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveDailyRate(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Daily Rate *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={dailyRateFormData.daily_rate}
                      onChange={(e) => setDailyRateFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter daily rate"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Name/Description *
                    </label>
                    <input
                      type="text"
                      value={dailyRateFormData.name}
                      onChange={(e) => setDailyRateFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., Q1 2025 Rate, Mid-Year Update"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={dailyRateFormData.start_date}
                      onChange={(e) => setDailyRateFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dailyRateFormData.end_date}
                      onChange={(e) => setDailyRateFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      min={dailyRateFormData.start_date}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dailyRateFormData.is_active}
                        onChange={(e) => setDailyRateFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Set as active rate (will update machinery day rate in main table)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Daily Rate History */}
                {selectedMachine && dailyRateHistory.get(selectedMachine.id) && dailyRateHistory.get(selectedMachine.id)!.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Rate History</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {dailyRateHistory.get(selectedMachine.id)!.map((rate) => (
                        <div
                          key={rate.id}
                          className={`p-3 border rounded-lg ${
                            rate.is_active
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{rate.name}</span>
                                {rate.is_active && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded text-xs">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="font-semibold">{rate.daily_rate.toFixed(2)}</span> - {new Date(rate.start_date).toLocaleDateString()}
                                {rate.end_date ? ` to ${new Date(rate.end_date).toLocaleDateString()}` : ' (Ongoing)'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!rate.is_active && (
                                <button
                                  type="button"
                                  onClick={() => handleUseRate(rate)}
                                  className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 rounded transition-colors"
                                  title="Use this rate"
                                  disabled={loading}
                                >
                                  USE
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditDailyRate(rate)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Edit"
                                disabled={loading}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDailyRate(rate.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Delete"
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDailyRateModal(false)
                      setEditingDailyRate(null)
                      setSelectedRate(null)
                      setSelectedMachine(null)
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <PermissionButton
                    permission={editingDailyRate ? 'cost_control.machinery_day_rates.edit' : 'cost_control.machinery_day_rates.create'}
                    onClick={handleSaveDailyRate}
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
                        {editingDailyRate ? 'Update' : 'Add'} Daily Rate
                      </>
                    )}
                  </PermissionButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


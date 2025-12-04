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
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, MachineryDayRate, Machine } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

interface MachineryDayRatesProps {
  machines: Machine[] // Pass machines list for code dropdown
}

export default function MachineryDayRates({ machines }: MachineryDayRatesProps) {
  const { user, appUser } = useAuth()
  const [rates, setRates] = useState<MachineryDayRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [codeSearchTerm, setCodeSearchTerm] = useState('')
  const [showCodeDropdown, setShowCodeDropdown] = useState(false)
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set())
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<MachineryDayRate | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    rate: '',
    efficiency: '100'
  })

  useEffect(() => {
    fetchRates()
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
            <Button 
              variant="outline" 
              className="flex items-center gap-2 cursor-pointer" 
              type="button"
              onClick={() => document.getElementById('import-rates-csv-input')?.click()}
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </span>
        </label>
        <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        {selectedRates.size > 0 && (
          <Button
            variant="outline"
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRates.size})
          </Button>
        )}
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Rate
        </Button>
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
                    <th className="text-left p-3 font-semibold">Efficiency (%)</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((rate) => {
                    const machineInfo = getMachineInfo(rate.code)
                    const isSelected = selectedRates.has(rate.id)
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(rate)}
                              className="h-10 w-10 p-0 flex items-center justify-center"
                              title="Edit Rate"
                            >
                              <Edit className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(rate.id)}
                              className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                              title="Delete Rate"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
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
                  <Button
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
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


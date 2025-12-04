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
  Calculator,
  CheckCircle,
  XCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, DesignationRate } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

export default function DesignationRates() {
  const { user, appUser } = useAuth()
  const [rates, setRates] = useState<DesignationRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<DesignationRate | null>(null)
  const [formData, setFormData] = useState({
    designation: '',
    hourly_rate: '',
    overtime_hourly_rate: '',
    off_day_hourly_rate: '',
    authority: 'General Authority'
  })

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .select('*')
        .order('designation', { ascending: true })

      if (error) {
        // Provide more specific error messages
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
      setError('Failed to load designation rates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRate(null)
    setFormData({
      designation: '',
      hourly_rate: '',
      overtime_hourly_rate: '',
      off_day_hourly_rate: '',
      authority: 'General Authority'
    })
    setShowModal(true)
  }

  const handleEdit = (rate: DesignationRate) => {
    setEditingRate(rate)
    setFormData({
      designation: rate.designation,
      hourly_rate: rate.hourly_rate.toString(),
      overtime_hourly_rate: rate.overtime_hourly_rate?.toString() || '',
      off_day_hourly_rate: rate.off_day_hourly_rate?.toString() || '',
      authority: rate.authority || 'General Authority'
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      if (!formData.designation.trim()) {
        setError('Please enter a designation')
        setLoading(false)
        return
      }

      if (!formData.hourly_rate || parseFloat(formData.hourly_rate) < 0) {
        setError('Please enter a valid hourly rate')
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
        designation: formData.designation.trim(),
        hourly_rate: parseFloat(formData.hourly_rate),
        overtime_hourly_rate: formData.overtime_hourly_rate ? parseFloat(formData.overtime_hourly_rate) : null,
        off_day_hourly_rate: formData.off_day_hourly_rate ? parseFloat(formData.off_day_hourly_rate) : null,
        authority: formData.authority || 'General Authority'
      }

      const supabaseClient = getSupabaseClient()
      
      if (editingRate) {
        rateData.updated_by = currentUserId
        const { error } = await supabaseClient
          .from(TABLES.DESIGNATION_RATES)
          // @ts-ignore
          .update(rateData)
          .eq('id', editingRate.id)

        if (error) throw error
        setSuccess('Designation rate updated successfully!')
      } else {
        rateData.created_by = currentUserId
        const { error } = await supabaseClient
          .from(TABLES.DESIGNATION_RATES)
          // @ts-ignore
          .insert([rateData])

        if (error) throw error
        setSuccess('Designation rate added successfully!')
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
    if (!confirm('Are you sure you want to delete this designation rate?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Designation rate deleted successfully!')
      await fetchRates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete rate: ' + err.message)
      console.error('Error deleting rate:', err)
    } finally {
      setLoading(false)
    }
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

      const designationIndex = headers.findIndex(h => h.includes('designation'))
      const hourlyRateIndex = headers.findIndex(h => h.includes('hourly') && h.includes('rate') && !h.includes('overtime') && !h.includes('off'))
      const overtimeIndex = headers.findIndex(h => h.includes('overtime'))
      const offDayIndex = headers.findIndex(h => h.includes('off') && h.includes('day'))

      if (designationIndex === -1 || hourlyRateIndex === -1) {
        throw new Error('Invalid CSV format. Required columns: Designation, hourly Rate')
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const ratesToImport: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const designation = values[designationIndex]
        const hourlyRate = parseFloat(values[hourlyRateIndex])

        if (!designation || isNaN(hourlyRate)) continue

        ratesToImport.push({
          designation,
          hourly_rate: hourlyRate,
          overtime_hourly_rate: overtimeIndex !== -1 && values[overtimeIndex] ? parseFloat(values[overtimeIndex]) : null,
          off_day_hourly_rate: offDayIndex !== -1 && values[offDayIndex] ? parseFloat(values[offDayIndex]) : null,
          authority: 'General Authority',
          created_by: currentUserId
        })
      }

      if (ratesToImport.length === 0) {
        throw new Error('No valid data found in CSV file')
      }

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .upsert(ratesToImport, { onConflict: 'designation' })

      if (error) throw error

      setSuccess(`Successfully imported ${ratesToImport.length} designation rate(s)!`)
      await fetchRates()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError('Failed to import: ' + err.message)
      console.error('Error importing:', err)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleExport = () => {
    const headers = ['Designation', 'hourly Rate', 'Overtime Hourly Rate', 'Off day hourly working rate', 'Authority']
    const csvContent = [
      headers.join(','),
      ...rates.map(rate => [
        rate.designation,
        rate.hourly_rate,
        rate.overtime_hourly_rate || '',
        rate.off_day_hourly_rate || '',
        rate.authority || 'General Authority'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `designation_rates_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Calculate daily rate (8 hours)
  const calculateDailyRate = (hourlyRate: number) => {
    return (hourlyRate * 8).toFixed(2)
  }

  // Filter rates
  const filteredRates = rates.filter(rate => {
    const matchesSearch = !searchTerm || 
      rate.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rate.authority && rate.authority.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesAuthority = selectedAuthority === 'all' || rate.authority === selectedAuthority
    
    return matchesSearch && matchesAuthority
  })

  // Get unique authorities
  const authorities = Array.from(new Set(rates.map(r => r.authority).filter(Boolean))) as string[]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Designation Rates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage hourly rates for different job designations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            id="import-csv-input"
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => document.getElementById('import-csv-input')?.click()}
            type="button"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Rate
          </Button>
        </div>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Authority</label>
              <select
                value={selectedAuthority}
                onChange={(e) => setSelectedAuthority(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Authorities</option>
                {authorities.map((auth) => (
                  <option key={auth} value={auth}>
                    {auth}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total: <span className="font-semibold">{filteredRates.length}</span> designation(s)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Designation Rates ({filteredRates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : filteredRates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No designation rates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold">Designation</th>
                    <th className="text-left p-3 font-semibold">hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Daily Rate (8h)</th>
                    <th className="text-left p-3 font-semibold">Overtime Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Off day hourly working rate</th>
                    <th className="text-left p-3 font-semibold">Authority</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((rate) => (
                    <tr 
                      key={rate.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {rate.designation}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {rate.hourly_rate.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-4 w-4 text-indigo-500" />
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {calculateDailyRate(rate.hourly_rate)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {rate.overtime_hourly_rate ? (
                          <span className="text-gray-600 dark:text-gray-400">
                            {rate.overtime_hourly_rate.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {rate.off_day_hourly_rate ? (
                          <span className="text-gray-600 dark:text-gray-400">
                            {rate.off_day_hourly_rate.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {rate.authority || 'General Authority'}
                        </span>
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
                  {editingRate ? 'Edit Designation Rate' : 'Add Designation Rate'}
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
                  <label className="block text-sm font-medium mb-2">Designation *</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Project Manager"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">hourly Rate *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 31.25"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Overtime Hourly Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.overtime_hourly_rate}
                    onChange={(e) => setFormData({ ...formData, overtime_hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Off day hourly working rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.off_day_hourly_rate}
                    onChange={(e) => setFormData({ ...formData, off_day_hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Authority</label>
                  <input
                    type="text"
                    value={formData.authority}
                    onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., General Authority"
                  />
                </div>

                {formData.hourly_rate && !isNaN(parseFloat(formData.hourly_rate)) && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="h-4 w-4 text-indigo-600" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Daily Rate (8 hours): <span className="font-semibold text-indigo-600">
                          {(parseFloat(formData.hourly_rate) * 8).toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
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


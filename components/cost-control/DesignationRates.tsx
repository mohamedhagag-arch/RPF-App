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
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, EmployeeRate, HRManpower } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { usePermissionGuard } from '@/lib/permissionGuard'

// Extended interface to include employee with optional rate
interface EmployeeWithRate extends HRManpower {
  rate?: EmployeeRate | null
  hasRate: boolean
}

export default function DesignationRates() {
  const { user, appUser } = useAuth()
  const guard = usePermissionGuard()
  const [rates, setRates] = useState<EmployeeRate[]>([])
  const [employees, setEmployees] = useState<HRManpower[]>([]) // All employees from hr_manpower
  const [employeesWithRates, setEmployeesWithRates] = useState<EmployeeWithRate[]>([]) // All employees merged with their rates
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all')
  const [filterDesignation, setFilterDesignation] = useState<string>('all')
  
  // Check permissions
  const canCreate = guard.hasAccess('cost_control.designation_rates.create')
  const canEdit = guard.hasAccess('cost_control.designation_rates.edit')
  const canDelete = guard.hasAccess('cost_control.designation_rates.delete')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<EmployeeRate | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_code: '',
    employee_name: '',
    designation: '',
    hourly_rate: '',
    overtime_hourly_rate: '',
    off_day_hourly_rate: '',
    overhead_hourly_rate: '5.3', // Default value 5.3
    authority: 'General Authority'
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const [useCustomOvertime, setUseCustomOvertime] = useState(false)
  const [useCustomOffDay, setUseCustomOffDay] = useState(false)
  const [useCustomOverhead, setUseCustomOverhead] = useState(false)

  useEffect(() => {
    fetchEmployees()
    fetchRates()
  }, [])

  // Merge employees with rates when both are loaded
  useEffect(() => {
    if (employees.length > 0) {
      mergeEmployeesWithRates()
    }
  }, [employees, rates])

  // Fetch all employees from hr_manpower
  const fetchEmployees = async () => {
    try {
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.HR_MANPOWER)
        // @ts-ignore
        .select('*')
        .eq('status', 'Active') // Only fetch active employees
        .order('employee_name', { ascending: true })

      if (error) {
        console.error('Error fetching employees:', error)
        return
      }

      setEmployees((data || []) as HRManpower[])
    } catch (err: any) {
      console.error('Error fetching employees:', err)
    }
  }

  const fetchRates = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.EMPLOYEE_RATES)
        // @ts-ignore
        .select('*')
        .order('employee_name', { ascending: true })

      if (error) {
        // If table doesn't exist yet, just log and continue (will show employees without rates)
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Employee rates table does not exist yet. Employees will be shown without rates.')
          setRates([])
          setLoading(false)
          return
        }
        // Provide more specific error messages
        if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure the SQL script has been run in Supabase.')
        }
        throw error
      }
      
      const ratesData = (data || []) as EmployeeRate[]
      
      // Ensure all rates have proper default values if null
      const ratesWithDefaults = ratesData.map((rate: any) => ({
        ...rate,
        overtime_hourly_rate: rate.overtime_hourly_rate != null ? rate.overtime_hourly_rate : rate.hourly_rate,
        off_day_hourly_rate: rate.off_day_hourly_rate != null ? rate.off_day_hourly_rate : (rate.hourly_rate * 2),
        overhead_hourly_rate: rate.overhead_hourly_rate != null ? rate.overhead_hourly_rate : 5.3,
        total_hourly_rate: rate.total_hourly_rate != null ? rate.total_hourly_rate : (rate.hourly_rate + (rate.overhead_hourly_rate || 5.3))
      }))
      
      setRates(ratesWithDefaults as EmployeeRate[])
      console.log('✅ Loaded employee rates:', ratesWithDefaults.length)
    } catch (err: any) {
      console.error('Error fetching employee rates:', err)
      setError('Failed to load employee rates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Merge employees with their rates
  const mergeEmployeesWithRates = () => {
    const merged: EmployeeWithRate[] = employees.map(employee => {
      const rate = rates.find(r => r.employee_id === employee.id)
      return {
        ...employee,
        rate: rate || null,
        hasRate: !!rate
      }
    })
    setEmployeesWithRates(merged)
  }

  const handleAdd = () => {
    setEditingRate(null)
    setFormData({
      employee_id: '',
      employee_code: '',
      employee_name: '',
      designation: '',
      hourly_rate: '',
      overtime_hourly_rate: '',
      off_day_hourly_rate: '',
      overhead_hourly_rate: '5.3', // Default value 5.3
      authority: 'General Authority'
    })
    setFormErrors({})
    setAutoSaveEnabled(false)
    setUseCustomOvertime(false)
    setUseCustomOffDay(false)
    setUseCustomOverhead(false)
    setShowModal(true)
  }

  // Validate form fields in real-time
  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = { ...formErrors }
    
    switch (name) {
      case 'employee_id':
        if (!value.trim()) {
          errors.employee_id = 'Employee is required'
        } else if (rates.some(r => r.employee_id === value && r.id !== editingRate?.id)) {
          errors.employee_id = 'This employee already has a rate'
        } else {
          delete errors.employee_id
        }
        break
      case 'hourly_rate':
        if (!value || parseFloat(value) < 0) {
          errors.hourly_rate = 'Please enter a valid hourly rate (≥ 0)'
        } else {
          delete errors.hourly_rate
        }
        break
      case 'overtime_hourly_rate':
        if (value && parseFloat(value) < 0) {
          errors.overtime_hourly_rate = 'Overtime rate must be ≥ 0'
        } else {
          delete errors.overtime_hourly_rate
        }
        break
      case 'off_day_hourly_rate':
        if (value && parseFloat(value) < 0) {
          errors.off_day_hourly_rate = 'Off-day rate must be ≥ 0'
        } else {
          delete errors.off_day_hourly_rate
        }
        break
      case 'overhead_hourly_rate':
        if (value && parseFloat(value) < 0) {
          errors.overhead_hourly_rate = 'Overhead rate must be ≥ 0'
        } else {
          delete errors.overhead_hourly_rate
        }
        break
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEdit = (rate: EmployeeRate) => {
    setEditingRate(rate)
    // If overtime_hourly_rate is null or empty, use hourly_rate as default
    const overtimeRate = rate.overtime_hourly_rate?.toString() || rate.hourly_rate.toString()
    // If off_day_hourly_rate is null or empty, use hourly_rate * 2 as default
    const offDayRate = rate.off_day_hourly_rate?.toString() || (rate.hourly_rate * 2).toString()
    // If overhead_hourly_rate is null or empty, use default 5.3
    const overheadRate = rate.overhead_hourly_rate?.toString() || '5.3'
    
    // Check if overhead_hourly_rate is custom (not equal to default 5.3)
    const isOverheadCustom = rate.overhead_hourly_rate != null && rate.overhead_hourly_rate !== 5.3
    
    setFormData({
      employee_id: rate.employee_id,
      employee_code: rate.employee_code,
      employee_name: rate.employee_name,
      designation: rate.designation || '',
      hourly_rate: rate.hourly_rate.toString(),
      overtime_hourly_rate: overtimeRate,
      off_day_hourly_rate: offDayRate,
      overhead_hourly_rate: overheadRate,
      authority: rate.authority || 'General Authority'
    })
    
    // Set custom flags based on whether values differ from defaults
    setUseCustomOvertime(rate.overtime_hourly_rate != null && rate.overtime_hourly_rate !== rate.hourly_rate)
    setUseCustomOffDay(rate.off_day_hourly_rate != null && rate.off_day_hourly_rate !== (rate.hourly_rate * 2))
    setUseCustomOverhead(isOverheadCustom)
    
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      // Validate all fields
      const isEmployeeValid = validateField('employee_id', formData.employee_id)
      const isHourlyRateValid = validateField('hourly_rate', formData.hourly_rate)
      const isOvertimeValid = validateField('overtime_hourly_rate', formData.overtime_hourly_rate)
      const isOffDayValid = validateField('off_day_hourly_rate', formData.off_day_hourly_rate)
      const isOverheadValid = validateField('overhead_hourly_rate', formData.overhead_hourly_rate)

      if (!isEmployeeValid || !isHourlyRateValid || !isOvertimeValid || !isOffDayValid || !isOverheadValid) {
        setError('Please fix the errors in the form')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id

      // Get selected employee details
      const selectedEmployee = employees.find(emp => emp.id === formData.employee_id)
      if (!selectedEmployee) {
        setError('Selected employee not found')
        setLoading(false)
        return
      }

      // Calculate overtime_hourly_rate based on custom setting
      const overtimeRateValue = useCustomOvertime && formData.overtime_hourly_rate && formData.overtime_hourly_rate.trim() !== ''
        ? parseFloat(formData.overtime_hourly_rate)
        : parseFloat(formData.hourly_rate)

      // Calculate off_day_hourly_rate based on custom setting
      const offDayRateValue = useCustomOffDay && formData.off_day_hourly_rate && formData.off_day_hourly_rate.trim() !== ''
        ? parseFloat(formData.off_day_hourly_rate)
        : parseFloat(formData.hourly_rate) * 2

      // Get overhead_hourly_rate based on custom setting
      const overheadRateValue = useCustomOverhead && formData.overhead_hourly_rate && formData.overhead_hourly_rate.trim() !== ''
        ? parseFloat(formData.overhead_hourly_rate)
        : 5.3

      const rateData: any = {
        employee_id: formData.employee_id,
        employee_code: selectedEmployee.employee_code,
        employee_name: selectedEmployee.employee_name,
        designation: selectedEmployee.designation,
        hourly_rate: parseFloat(formData.hourly_rate),
        overtime_hourly_rate: overtimeRateValue,
        off_day_hourly_rate: offDayRateValue,
        overhead_hourly_rate: overheadRateValue,
        authority: formData.authority || 'General Authority'
      }

      const supabaseClient = getSupabaseClient()
      
      if (editingRate) {
        rateData.updated_by = currentUserId || null
        const { error } = await supabaseClient
          .from(TABLES.EMPLOYEE_RATES)
          // @ts-ignore
          .update(rateData)
          .eq('id', editingRate.id)
          .select()
          .single()

        if (error) throw error
        setSuccess('Employee rate updated successfully!')
      } else {
        rateData.created_by = currentUserId || null
        const { error } = await supabaseClient
          .from(TABLES.EMPLOYEE_RATES)
          // @ts-ignore
          .insert([rateData])
          .select()
          .single()

        if (error) throw error
        setSuccess('Employee rate added successfully!')
      }

      setShowModal(false)
      await fetchRates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save rate: ' + (err?.message || 'Unknown error'))
      console.error('Error saving rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee rate?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.EMPLOYEE_RATES)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Employee rate deleted successfully!')
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

      const employeeCodeIndex = headers.findIndex(h => h.includes('employee') && h.includes('code'))
      const employeeNameIndex = headers.findIndex(h => h.includes('employee') && h.includes('name'))
      const hourlyRateIndex = headers.findIndex(h => h.includes('hourly') && h.includes('rate') && !h.includes('overtime') && !h.includes('off'))
      const overtimeIndex = headers.findIndex(h => h.includes('overtime'))
      const offDayIndex = headers.findIndex(h => h.includes('off') && h.includes('day'))

      if (employeeCodeIndex === -1 || hourlyRateIndex === -1) {
        throw new Error('Invalid CSV format. Required columns: Employee Code, Hourly Rate')
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const ratesToImport: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const employeeCode = values[employeeCodeIndex]
        const employeeName = values[employeeNameIndex] || ''
        const hourlyRate = parseFloat(values[hourlyRateIndex])

        if (!employeeCode || isNaN(hourlyRate)) continue

        // Find employee by code
        const employee = employees.find(emp => emp.employee_code === employeeCode)
        if (!employee) {
          console.warn(`Employee with code ${employeeCode} not found, skipping...`)
          continue
        }

        ratesToImport.push({
          employee_id: employee.id,
          employee_code: employee.employee_code,
          employee_name: employee.employee_name,
          designation: employee.designation,
          hourly_rate: hourlyRate,
          overtime_hourly_rate: overtimeIndex !== -1 && values[overtimeIndex] ? parseFloat(values[overtimeIndex]) : hourlyRate,
          off_day_hourly_rate: offDayIndex !== -1 && values[offDayIndex] ? parseFloat(values[offDayIndex]) : (hourlyRate * 2),
          overhead_hourly_rate: 5.3,
          authority: 'General Authority',
          created_by: currentUserId
        })
      }

      if (ratesToImport.length === 0) {
        throw new Error('No valid data found in CSV file')
      }

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.EMPLOYEE_RATES)
        // @ts-ignore
        .upsert(ratesToImport, { onConflict: 'employee_id' })

      if (error) throw error

      setSuccess(`Successfully imported ${ratesToImport.length} employee rate(s)!`)
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
    const headers = ['Employee Code', 'Employee Name', 'Designation', 'Hourly Rate', 'Overtime Hourly Rate', 'Off day hourly working rate', 'Overhead Hourly Rate', 'Total Hourly Rate', 'Daily Rate', 'Authority']
    const csvContent = [
      headers.join(','),
      ...rates.map(rate => [
        rate.employee_code,
        rate.employee_name,
        rate.designation || '',
        rate.hourly_rate,
        (rate.overtime_hourly_rate || rate.hourly_rate).toString(),
        (rate.off_day_hourly_rate || rate.hourly_rate * 2).toString(),
        (rate.overhead_hourly_rate || 5.3).toString(),
        ((rate.total_hourly_rate) || (rate.hourly_rate + (rate.overhead_hourly_rate || 5.3))).toString(),
        (rate.daily_rate || ((rate.hourly_rate + (rate.overhead_hourly_rate || 5.3)) * 8)).toString(),
        rate.authority || 'General Authority'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `employee_rates_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Calculate daily rate (8 hours)
  const calculateDailyRate = (hourlyRate: number) => {
    return (hourlyRate * 8).toFixed(2)
  }

  // Filter employees with rates
  const filteredEmployees = employeesWithRates.filter(emp => {
    const matchesSearch = !searchTerm || 
      emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.rate?.authority && emp.rate.authority.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesAuthority = selectedAuthority === 'all' || emp.rate?.authority === selectedAuthority || (!emp.hasRate && selectedAuthority === 'all')
    const matchesDesignation = filterDesignation === 'all' || emp.designation === filterDesignation
    
    return matchesSearch && matchesAuthority && matchesDesignation
  })

  // Get unique authorities (from rates)
  const authorities = Array.from(new Set(rates.map(r => r.authority).filter(Boolean))) as string[]
  
  // Get unique designations (from employees)
  const designations = Array.from(new Set(employees.map(e => e.designation).filter(Boolean))) as string[]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Rates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage hourly rates for individual employees
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
          <PermissionButton
            permission="cost_control.designation_rates.create"
            variant="outline" 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => document.getElementById('import-csv-input')?.click()}
            type="button"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </PermissionButton>
          <PermissionButton
            permission="cost_control.designation_rates.export"
            variant="outline" 
            onClick={handleExport} 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </PermissionButton>
          <PermissionButton
            permission="cost_control.designation_rates.create"
            onClick={handleAdd} 
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Rate
          </PermissionButton>
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
                  placeholder="Search by employee name, code, or designation..."
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

            <div>
              <label className="block text-sm font-medium mb-2">Designation</label>
              <select
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Designations</option>
                {designations.map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total: <span className="font-semibold">{filteredEmployees.length}</span> employee(s)
                {filteredEmployees.length > 0 && (
                  <span className="ml-2 text-xs">
                    ({filteredEmployees.filter(e => e.hasRate).length} with rates)
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Rates ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold">Employee Code</th>
                    <th className="text-left p-3 font-semibold">Employee Name</th>
                    <th className="text-left p-3 font-semibold">Designation</th>
                    <th className="text-left p-3 font-semibold">Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Daily Rate (8h)</th>
                    <th className="text-left p-3 font-semibold">Overtime Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Off day hourly working rate</th>
                    <th className="text-left p-3 font-semibold">Overhead Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Total Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Authority</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const rate = emp.rate
                    return (
                      <tr 
                        key={emp.id} 
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          !emp.hasRate ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {emp.employee_code}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {emp.employee_name}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {emp.designation || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <span className="text-gray-900 dark:text-white font-semibold">
                              {rate.hourly_rate.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">Not Set</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <div className="flex items-center gap-1">
                              <Calculator className="h-4 w-4 text-indigo-500" />
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                {rate.daily_rate 
                                  ? rate.daily_rate.toFixed(2) 
                                  : calculateDailyRate((rate.total_hourly_rate) || (rate.hourly_rate + (rate.overhead_hourly_rate || 5.3)))}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <span className="text-gray-600 dark:text-gray-400">
                              {(rate.overtime_hourly_rate || rate.hourly_rate).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <span className="text-gray-600 dark:text-gray-400">
                              {(rate.off_day_hourly_rate || rate.hourly_rate * 2).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <span className="text-gray-600 dark:text-gray-400">
                              {(rate.overhead_hourly_rate || 5.3).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <span className="text-gray-900 dark:text-white font-semibold">
                              {((rate.total_hourly_rate) || (rate.hourly_rate + (rate.overhead_hourly_rate || 5.3))).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rate ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {rate.authority || 'General Authority'}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {emp.hasRate ? (
                              <>
                                <PermissionButton
                                  permission="cost_control.designation_rates.edit"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(rate!)}
                                  className="h-10 w-10 p-0 flex items-center justify-center"
                                  title="Edit Rate"
                                >
                                  <Edit className="h-5 w-5" />
                                </PermissionButton>
                                <PermissionButton
                                  permission="cost_control.designation_rates.delete"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(rate!.id)}
                                  className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                                  title="Delete Rate"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </PermissionButton>
                              </>
                            ) : (
                              <PermissionButton
                                permission="cost_control.designation_rates.create"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFormData({
                                    employee_id: emp.id,
                                    employee_code: emp.employee_code,
                                    employee_name: emp.employee_name,
                                    designation: emp.designation,
                                    hourly_rate: '',
                                    overtime_hourly_rate: '',
                                    off_day_hourly_rate: '',
                                    overhead_hourly_rate: '5.3',
                                    authority: 'General Authority'
                                  })
                                  setEditingRate(null)
                                  setFormErrors({})
                                  setUseCustomOvertime(false)
                                  setUseCustomOffDay(false)
                                  setUseCustomOverhead(false)
                                  setShowModal(true)
                                }}
                                className="h-10 px-3 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-1"
                                title="Add Rate"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="text-xs">Add Rate</span>
                              </PermissionButton>
                            )}
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
                  {editingRate ? 'Edit Employee Rate' : 'Add Employee Rate'}
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
                  <label className="block text-sm font-medium mb-2">
                    Employee *
                    {formErrors.employee_id && (
                      <span className="text-red-500 text-xs ml-2">({formErrors.employee_id})</span>
                    )}
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => {
                      const selectedEmployee = employees.find(emp => emp.id === e.target.value)
                      if (selectedEmployee) {
                        setFormData({ 
                          ...formData, 
                          employee_id: e.target.value,
                          employee_code: selectedEmployee.employee_code,
                          employee_name: selectedEmployee.employee_name,
                          designation: selectedEmployee.designation
                        })
                        validateField('employee_id', e.target.value)
                      }
                    }}
                    disabled={!!editingRate} // Disable if editing (can't change employee)
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.employee_id ? 'border-red-500' : 'border-gray-300'
                    } ${editingRate ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}`}
                    required
                  >
                    <option value="">Select an employee...</option>
                    {employees
                      .filter(emp => emp.status === 'Active')
                      .filter(emp => !editingRate || emp.id === formData.employee_id) // Show all if adding, only current if editing
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employee_code} - {emp.employee_name} ({emp.designation})
                        </option>
                      ))}
                  </select>
                  {formErrors.employee_id && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.employee_id}</p>
                  )}
                  {formData.employee_id && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                      <div><strong>Code:</strong> {formData.employee_code}</div>
                      <div><strong>Name:</strong> {formData.employee_name}</div>
                      <div><strong>Designation:</strong> {formData.designation}</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hourly Rate *
                    {formErrors.hourly_rate && (
                      <span className="text-red-500 text-xs ml-2">({formErrors.hourly_rate})</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => {
                      const newHourlyRate = e.target.value
                      const oldHourlyRate = formData.hourly_rate
                      
                      // Update hourly_rate first
                      const updatedFormData = { ...formData, hourly_rate: newHourlyRate }
                      
                      if (!newHourlyRate || isNaN(parseFloat(newHourlyRate))) {
                        setFormData(updatedFormData)
                        validateField('hourly_rate', newHourlyRate)
                        return
                      }
                      
                      const oldHourlyRateValue = parseFloat(oldHourlyRate) || 0
                      const newHourlyRateValue = parseFloat(newHourlyRate)
                      
                      // Get current displayed values (what user sees in the form)
                      const displayedOvertime = formData.overtime_hourly_rate || oldHourlyRate
                      const displayedOffDay = formData.off_day_hourly_rate || (oldHourlyRateValue * 2).toString()
                      
                      const displayedOvertimeValue = parseFloat(displayedOvertime)
                      const displayedOffDayValue = parseFloat(displayedOffDay)
                      
                      // Check if displayed values are at default (equal to old hourly_rate or old hourly_rate * 2)
                      // This means user hasn't manually changed them
                      const isOvertimeAtDefault = !formData.overtime_hourly_rate || 
                        formData.overtime_hourly_rate.trim() === '' ||
                        (oldHourlyRateValue > 0 && Math.abs(displayedOvertimeValue - oldHourlyRateValue) < 0.01)
                      
                      const isOffDayAtDefault = !formData.off_day_hourly_rate || 
                        formData.off_day_hourly_rate.trim() === '' ||
                        (oldHourlyRateValue > 0 && Math.abs(displayedOffDayValue - (oldHourlyRateValue * 2)) < 0.01)
                      
                      // Update values based on custom settings
                      // If not using custom, always update to default (locked mode)
                      if (!useCustomOvertime) {
                        // Use default (same as hourly_rate) - locked mode
                        updatedFormData.overtime_hourly_rate = newHourlyRate
                      } else {
                        // Keep the manually set custom value (only update if at default)
                        if (isOvertimeAtDefault) {
                          updatedFormData.overtime_hourly_rate = newHourlyRate
                        } else {
                          updatedFormData.overtime_hourly_rate = formData.overtime_hourly_rate
                        }
                      }
                      
                      if (!useCustomOffDay) {
                        // Use default (hourly_rate * 2) - locked mode
                        updatedFormData.off_day_hourly_rate = (newHourlyRateValue * 2).toString()
                      } else {
                        // Keep the manually set custom value (only update if at default)
                        if (isOffDayAtDefault) {
                          updatedFormData.off_day_hourly_rate = (newHourlyRateValue * 2).toString()
                        } else {
                          updatedFormData.off_day_hourly_rate = formData.off_day_hourly_rate
                        }
                      }
                      
                      console.log('🔄 Updating hourly_rate:', {
                        old: oldHourlyRate,
                        new: newHourlyRate,
                        currentOvertime: formData.overtime_hourly_rate,
                        currentOffDay: formData.off_day_hourly_rate,
                        isOvertimeAtDefault,
                        isOffDayAtDefault,
                        newOvertime: updatedFormData.overtime_hourly_rate,
                        newOffDay: updatedFormData.off_day_hourly_rate
                      })
                      
                      // Update all form data at once
                      setFormData(updatedFormData)
                      
                      validateField('hourly_rate', newHourlyRate)
                      if (isOvertimeAtDefault) {
                        validateField('overtime_hourly_rate', updatedFormData.overtime_hourly_rate)
                      }
                      if (isOffDayAtDefault) {
                        validateField('off_day_hourly_rate', updatedFormData.off_day_hourly_rate)
                      }
                    }}
                    onBlur={(e) => {
                      validateField('hourly_rate', e.target.value)
                      const hourlyValue = parseFloat(e.target.value)
                      // Ensure overtime_hourly_rate has a value
                      if (!formData.overtime_hourly_rate || formData.overtime_hourly_rate.trim() === '') {
                        setFormData({ ...formData, overtime_hourly_rate: e.target.value })
                      }
                      // Ensure off_day_hourly_rate has a value (hourly_rate * 2)
                      if (!formData.off_day_hourly_rate || formData.off_day_hourly_rate.trim() === '') {
                        setFormData({ ...formData, off_day_hourly_rate: (hourlyValue * 2).toString() })
                      }
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.hourly_rate ? 'border-red-500' : 'border-gray-300'
                    }`}
                      placeholder="e.g., 31.25"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  {formErrors.hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.hourly_rate}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Overtime Hourly Rate
                      {formErrors.overtime_hourly_rate && (
                        <span className="text-red-500 text-xs ml-2">({formErrors.overtime_hourly_rate})</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use_custom_overtime"
                        checked={useCustomOvertime}
                        onChange={(e) => {
                          setUseCustomOvertime(e.target.checked)
                          if (!e.target.checked) {
                            // Reset to default (hourly_rate)
                            setFormData({ ...formData, overtime_hourly_rate: formData.hourly_rate })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="use_custom_overtime" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        Use Custom
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={useCustomOvertime ? (formData.overtime_hourly_rate || formData.hourly_rate) : formData.hourly_rate}
                      onChange={(e) => {
                        if (useCustomOvertime) {
                          const newValue = e.target.value || formData.hourly_rate
                          setFormData({ ...formData, overtime_hourly_rate: newValue })
                          validateField('overtime_hourly_rate', newValue)
                        }
                      }}
                      onBlur={(e) => {
                        if (useCustomOvertime) {
                          const finalValue = e.target.value || formData.hourly_rate
                          if (e.target.value !== finalValue) {
                            setFormData({ ...formData, overtime_hourly_rate: finalValue })
                          }
                          validateField('overtime_hourly_rate', finalValue)
                        }
                      }}
                      disabled={!useCustomOvertime}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.overtime_hourly_rate ? 'border-red-500' : 'border-gray-300'
                      } ${!useCustomOvertime ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800'}`}
                      placeholder={formData.hourly_rate || "Same as Hourly Rate"}
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {useCustomOvertime ? 'Enter custom overtime rate' : 'Defaults to Hourly Rate (locked)'}
                  </p>
                  {formErrors.overtime_hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.overtime_hourly_rate}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Off Day Hourly Working Rate
                      {formErrors.off_day_hourly_rate && (
                        <span className="text-red-500 text-xs ml-2">({formErrors.off_day_hourly_rate})</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use_custom_off_day"
                        checked={useCustomOffDay}
                        onChange={(e) => {
                          setUseCustomOffDay(e.target.checked)
                          if (!e.target.checked) {
                            // Reset to default (hourly_rate * 2)
                            const defaultOffDay = (parseFloat(formData.hourly_rate) * 2).toString()
                            setFormData({ ...formData, off_day_hourly_rate: defaultOffDay })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="use_custom_off_day" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        Use Custom
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={useCustomOffDay ? (formData.off_day_hourly_rate || (parseFloat(formData.hourly_rate) * 2).toString()) : (parseFloat(formData.hourly_rate) * 2).toString()}
                      onChange={(e) => {
                        if (useCustomOffDay) {
                          const newValue = e.target.value || (parseFloat(formData.hourly_rate) * 2).toString()
                          setFormData({ ...formData, off_day_hourly_rate: newValue })
                          validateField('off_day_hourly_rate', newValue)
                        }
                      }}
                      onBlur={(e) => {
                        if (useCustomOffDay) {
                          const finalValue = e.target.value || (parseFloat(formData.hourly_rate) * 2).toString()
                          if (e.target.value !== finalValue) {
                            setFormData({ ...formData, off_day_hourly_rate: finalValue })
                          }
                          validateField('off_day_hourly_rate', finalValue)
                        }
                      }}
                      disabled={!useCustomOffDay}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.off_day_hourly_rate ? 'border-red-500' : 'border-gray-300'
                      } ${!useCustomOffDay ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800'}`}
                      placeholder={(parseFloat(formData.hourly_rate) * 2).toString() || "Hourly Rate × 2"}
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {useCustomOffDay ? 'Enter custom off-day rate' : 'Defaults to Hourly Rate × 2 (locked)'}
                  </p>
                  {formErrors.off_day_hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.off_day_hourly_rate}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Overhead Hourly Rate
                      {formErrors.overhead_hourly_rate && (
                        <span className="text-red-500 text-xs ml-2">({formErrors.overhead_hourly_rate})</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use_custom_overhead"
                        checked={useCustomOverhead}
                        onChange={(e) => {
                          setUseCustomOverhead(e.target.checked)
                          if (!e.target.checked) {
                            // Reset to default (5.3)
                            setFormData({ ...formData, overhead_hourly_rate: '5.3' })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="use_custom_overhead" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        Use Custom
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={useCustomOverhead ? (formData.overhead_hourly_rate || '5.3') : '5.3'}
                      onChange={(e) => {
                        if (useCustomOverhead) {
                          const newValue = e.target.value || '5.3'
                          setFormData({ ...formData, overhead_hourly_rate: newValue })
                          validateField('overhead_hourly_rate', newValue)
                        }
                      }}
                      onBlur={(e) => {
                        if (useCustomOverhead) {
                          const finalValue = e.target.value || '5.3'
                          if (e.target.value !== finalValue) {
                            setFormData({ ...formData, overhead_hourly_rate: finalValue })
                          }
                          validateField('overhead_hourly_rate', finalValue)
                        }
                      }}
                      disabled={!useCustomOverhead}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.overhead_hourly_rate ? 'border-red-500' : 'border-gray-300'
                      } ${!useCustomOverhead ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800'}`}
                      placeholder="5.3"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {useCustomOverhead ? 'Enter custom overhead rate' : 'Defaults to 5.3 (locked)'}
                  </p>
                  {formErrors.overhead_hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.overhead_hourly_rate}</p>
                  )}
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
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calculator className="h-5 w-5 text-indigo-600" />
                        <span className="text-gray-700 dark:text-gray-300">
                          <strong>Daily Rate (8 hours):</strong> <span className="font-bold text-indigo-600 text-lg">
                            {((parseFloat(formData.hourly_rate) + (useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3)) * 8).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            (Total Hourly: {(parseFloat(formData.hourly_rate) + (useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3)).toFixed(2)} × 8 hours)
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center gap-2 text-sm">
                        <Calculator className="h-5 w-5 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">
                          <strong>Total Hourly Rate:</strong> <span className="font-bold text-green-600 text-lg">
                            {(parseFloat(formData.hourly_rate) + (useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3)).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            (Hourly: {parseFloat(formData.hourly_rate).toFixed(2)} + Overhead: {(useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3).toFixed(2)})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_save"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="auto_save" className="text-sm text-gray-600 dark:text-gray-400">
                      Auto-save on change
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowModal(false)
                        setFormErrors({})
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSave()}
                      disabled={loading || Object.keys(formErrors).length > 0}
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
        </div>
      )}

    </div>
  )
}


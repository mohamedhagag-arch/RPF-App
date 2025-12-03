'use client'

import React, { useState, useEffect } from 'react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ModernButton } from '@/components/ui/ModernButton'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Search,
  FileText,
  FileSpreadsheet,
  Database,
  BarChart3
} from 'lucide-react'
import { TABLES, HRManpower } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { useSearchParams, useRouter } from 'next/navigation'

type HRManpowerTab = 'manpower' | 'management-data'

export default function HRManpowerPage() {
  const guard = usePermissionGuard()
  const { appUser, user } = useAuth()
  const supabase = getSupabaseClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HRManpowerTab>('manpower')
  const [employees, setEmployees] = useState<HRManpower[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<HRManpower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<HRManpower | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'All' | HRManpower['status']>('All')
  
  // Export/Import states
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  
  // Form fields
  const [formData, setFormData] = useState({
    employee_code: '',
    employee_name: '',
    designation: '',
    status: 'Active' as HRManpower['status'],
    department: '',
    phone_number: '',
    email: '',
    hire_date: '',
    notes: ''
  })

  const isAdmin = appUser?.role === 'admin'
  const canEdit = guard.hasAccess('users.edit') || isAdmin
  const canDelete = isAdmin

  // Handle query parameter for tabs
  useEffect(() => {
    const tab = searchParams?.get('tab') as HRManpowerTab | null
    if (tab && ['manpower', 'management-data'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    // Only fetch if user is authenticated and on manpower tab
    if ((appUser || user) && activeTab === 'manpower') {
      fetchEmployees()
    }
  }, [appUser, user, activeTab])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchQuery, filterStatus])

  const fetchEmployees = async () => {
    // Don't fetch if user is not authenticated
    if (!user && !appUser) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await (supabase
        .from(TABLES.HR_MANPOWER) as any)
        .select('*')
        .order('employee_code', { ascending: true })
      
      if (fetchError) {
        // Provide helpful error messages
        if (fetchError.code === '42501' || fetchError.message?.includes('permission denied')) {
          setError(
            '⚠️ Permission denied for table hr_manpower. ' +
            'Policy exists but GRANT permissions may be missing. ' +
            'Please run: Database/hr-manpower-verify-and-fix.sql in Supabase SQL Editor to fix GRANT permissions.'
          )
        } else if (fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist')) {
          setError(
            '⚠️ Table hr_manpower does not exist. ' +
            'Please run: Database/hr-manpower-complete-setup.sql in Supabase SQL Editor'
          )
        } else if (fetchError.code === '401' || fetchError.message?.includes('Unauthorized')) {
          setError('Please log in to access HR Manpower data')
        } else {
          throw fetchError
        }
        console.error('Error fetching employees:', fetchError)
        return
      }
      
      setEmployees(data || [])
    } catch (error: any) {
      setError('Failed to load employees: ' + (error.message || 'Unknown error'))
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    // Filter by status
    if (filterStatus !== 'All') {
      filtered = filtered.filter(e => e.status === filterStatus)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.employee_code.toLowerCase().includes(query) ||
        e.employee_name.toLowerCase().includes(query) ||
        e.designation.toLowerCase().includes(query) ||
        (e.department && e.department.toLowerCase().includes(query))
      )
    }

    setFilteredEmployees(filtered)
  }

  const handleAdd = () => {
    setEditingEmployee(null)
    setFormData({
      employee_code: '',
      employee_name: '',
      designation: '',
      status: 'Active',
      department: '',
      phone_number: '',
      email: '',
      hire_date: '',
      notes: ''
    })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleEdit = (employee: HRManpower) => {
    setEditingEmployee(employee)
    setFormData({
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      designation: employee.designation,
      status: employee.status,
      department: employee.department || '',
      phone_number: employee.phone_number || '',
      email: employee.email || '',
      hire_date: employee.hire_date || '',
      notes: employee.notes || ''
    })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingEmployee(null)
    setFormData({
      employee_code: '',
      employee_name: '',
      designation: '',
      status: 'Active',
      department: '',
      phone_number: '',
      email: '',
      hire_date: '',
      notes: ''
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')

      // Validation
      if (!formData.employee_code.trim()) {
        setError('Employee Code is required')
        return
      }
      if (!formData.employee_name.trim()) {
        setError('Employee Name is required')
        return
      }
      if (!formData.designation.trim()) {
        setError('Designation is required')
        return
      }

      const employeeData: any = {
        employee_code: formData.employee_code.trim(),
        employee_name: formData.employee_name.trim(),
        designation: formData.designation.trim(),
        status: formData.status,
        department: formData.department.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        email: formData.email.trim() || null,
        hire_date: formData.hire_date || null,
        notes: formData.notes.trim() || null
      }

      if (editingEmployee) {
        // Update existing employee
        const { error: updateError } = await (supabase
          .from(TABLES.HR_MANPOWER) as any)
          .update(employeeData)
          .eq('id', editingEmployee.id)
        
        if (updateError) throw updateError
        setSuccess('Employee updated successfully')
      } else {
        // Insert new employee
        const { error: insertError } = await (supabase
          .from(TABLES.HR_MANPOWER) as any)
          .insert([employeeData])
        
        if (insertError) {
          if (insertError.code === '23505') {
            setError('Employee Code already exists')
            return
          }
          throw insertError
        }
        setSuccess('Employee added successfully')
      }

      await fetchEmployees()
      setTimeout(() => {
        setShowForm(false)
        setEditingEmployee(null)
        setSuccess('')
      }, 1500)
    } catch (error: any) {
      setError('Failed to save employee: ' + (error.message || 'Unknown error'))
      console.error('Error saving employee:', error)
    }
  }

  const handleDelete = async (employee: HRManpower) => {
    if (!confirm(`Are you sure you want to delete ${employee.employee_name}?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const { error: deleteError } = await supabase
        .from(TABLES.HR_MANPOWER)
        .delete()
        .eq('id', employee.id)
      
      if (deleteError) throw deleteError
      
      setSuccess('Employee deleted successfully')
      await fetchEmployees()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to delete employee: ' + (error.message || 'Unknown error'))
      console.error('Error deleting employee:', error)
    }
  }

  // CSV Import Functions
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const data: any[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      if (values.length === headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }
    }
    
    return data
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('📁 File selected:', file.name, file.size, 'bytes')
      setImportFile(file)
      setError('')
      setSuccess('')
      setImportPreview(null)
      setShowImportPreview(false)
    } else {
      console.log('⚠️ No file selected')
      setImportFile(null)
    }
  }

  const handleImportPreview = async () => {
    if (!importFile) {
      setError('Please select a file to import.')
      return
    }
    
    setImporting(true)
    setError('')
    setSuccess('')
    
    try {
      const text = await importFile.text()
      let parsedData: any[] = []

      if (importFile.name.endsWith('.csv')) {
        parsedData = parseCSV(text)
      } else if (importFile.name.endsWith('.json')) {
        parsedData = JSON.parse(text)
        if (!Array.isArray(parsedData)) {
          parsedData = [parsedData]
        }
      } else {
        setError('Unsupported file type. Please upload CSV or JSON.')
        setImporting(false)
        return
      }

      // Map CSV columns to database columns
      const mappedData = parsedData.map((row: any) => {
        return {
          employee_code: row['Employee Code'] || row['employee_code'] || row['EmployeeCode'] || '',
          employee_name: row['Employee Name'] || row['employee_name'] || row['EmployeeName'] || '',
          designation: row['Designation'] || row['designation'] || '',
          status: row['Status'] || row['status'] || 'Active',
          department: row['Department'] || row['department'] || null,
          phone_number: row['Phone Number'] || row['phone_number'] || row['PhoneNumber'] || null,
          email: row['Email'] || row['email'] || null,
          hire_date: row['Hire Date'] || row['hire_date'] || row['HireDate'] || null,
          notes: row['Notes'] || row['notes'] || null
        }
      }).filter((row: any) => row.employee_code && row.employee_name && row.designation)

      if (mappedData.length === 0) {
        setError('No valid data found in file. Please check the file format.')
        setImporting(false)
        return
      }

      setImportPreview(mappedData)
      setShowImportPreview(true)
      setSuccess(`Previewing ${mappedData.length} records.`)
      
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message || 'Invalid file content'}`)
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.length === 0) return

    setImporting(true)
    setError('')
    setSuccess('')
    setImportProgress(0)

    try {
      const totalRows = importPreview.length
      setImportProgress(10)
      
      // Prepare all data at once
      const dataToImport = importPreview.map((row: any) => ({
        employee_code: row.employee_code,
        employee_name: row.employee_name,
        designation: row.designation,
        status: row.status || 'Active',
        department: row.department || null,
        phone_number: row.phone_number || null,
        email: row.email || null,
        hire_date: row.hire_date || null,
        notes: row.notes || null
      }))

      setImportProgress(30)
      
      // Import all rows in one batch operation
      const { data: insertedData, error: upsertError } = await (supabase
        .from(TABLES.HR_MANPOWER) as any)
        .upsert(dataToImport, { 
          onConflict: 'employee_code',
          ignoreDuplicates: false 
        })
        .select()

      setImportProgress(80)

      if (upsertError) {
        // If batch fails, try importing in smaller chunks
        console.warn('⚠️ Batch import failed, trying chunked import...', upsertError)
        
        const chunkSize = 50
        let importedCount = 0
        let updatedCount = 0
        const errors: string[] = []

        for (let i = 0; i < dataToImport.length; i += chunkSize) {
          const chunk = dataToImport.slice(i, i + chunkSize)
          setImportProgress(30 + Math.round((i / dataToImport.length) * 50))

          try {
            const { error: chunkError } = await (supabase
              .from(TABLES.HR_MANPOWER) as any)
              .upsert(chunk, { onConflict: 'employee_code' })

            if (chunkError) {
              errors.push(`Chunk ${Math.floor(i / chunkSize) + 1}: ${chunkError.message}`)
            } else {
              importedCount += chunk.length
            }
          } catch (err: any) {
            errors.push(`Chunk ${Math.floor(i / chunkSize) + 1}: ${err.message || 'Unknown error'}`)
          }
        }

        setImportProgress(100)

        if (errors.length > 0) {
          setError(`Import completed with ${errors.length} errors. ${importedCount} records processed.`)
          console.error('Import errors:', errors)
        } else {
          setSuccess(`Successfully imported ${importedCount} records.`)
        }
      } else {
        // Batch import succeeded
        setImportProgress(100)
        const importedCount = insertedData?.length || dataToImport.length
        setSuccess(`Successfully imported ${importedCount} records.`)
      }

      setShowImportPreview(false)
      setImportPreview(null)
      setImportFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('import-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      await fetchEmployees()
      
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 5000)
    } catch (err: any) {
      setError(`Import failed: ${err.message || 'Unknown error'}`)
      console.error('Import error:', err)
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  // Export Functions
  const handleExport = async () => {
    try {
      setError('')
      setSuccess('')

      const dataToExport = filteredEmployees.length > 0 ? filteredEmployees : employees

      if (dataToExport.length === 0) {
        setError('No data to export')
        return
      }

      if (exportFormat === 'csv') {
        // CSV Export
        const headers = ['Employee Code', 'Employee Name', 'Designation', 'Status', 'Department', 'Phone Number', 'Email', 'Hire Date', 'Notes']
        const rows = dataToExport.map(emp => [
          emp.employee_code,
          emp.employee_name,
          emp.designation,
          emp.status,
          emp.department || '',
          emp.phone_number || '',
          emp.email || '',
          emp.hire_date || '',
          emp.notes || ''
        ])

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `hr-manpower-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setSuccess('Data exported to CSV successfully')
      } else {
        // JSON Export
        const jsonContent = JSON.stringify(dataToExport, null, 2)
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `hr-manpower-${new Date().toISOString().split('T')[0]}.json`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setSuccess('Data exported to JSON successfully')
      }

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to export data: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDownloadTemplate = () => {
    const template = [
      ['Employee Code', 'Employee Name', 'Designation', 'Status', 'Department', 'Phone Number', 'Email', 'Hire Date', 'Notes'],
      ['EMP001', 'John Doe', 'Engineer', 'Active', 'Engineering', '1234567890', 'john@example.com', '2024-01-01', 'Sample employee']
    ]

    const csvContent = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'hr-manpower-template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleTabChange = (tab: HRManpowerTab) => {
    setActiveTab(tab)
    // Update URL without page reload
    router.push(`/hr/manpower?tab=${tab}`, { scroll: false })
  }

  const tabs = [
    {
      id: 'manpower' as HRManpowerTab,
      label: 'Manpower',
      icon: Users,
      description: 'Manage and view employee data'
    },
    {
      id: 'management-data' as HRManpowerTab,
      label: 'Management Data',
      icon: Database,
      description: 'Import, export, and manage HR data'
    }
  ]

  const renderManagementDataTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import / Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Import */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <ModernButton
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                type="button"
                onClick={() => {
                  document.getElementById('import-file-input')?.click()
                }}
              >
                <Upload className="h-4 w-4" />
                Select File
              </ModernButton>
              {importFile && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {importFile.name}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      ({(importFile.size / 1024).toFixed(2)} KB)
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setImportFile(null)
                        setImportPreview(null)
                        setShowImportPreview(false)
                        // Reset file input
                        const fileInput = document.getElementById('import-file-input') as HTMLInputElement
                        if (fileInput) fileInput.value = ''
                      }}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      title="Remove file"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <ModernButton
                    onClick={handleImportPreview}
                    variant="primary"
                    size="sm"
                    disabled={importing}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Preview Import
                  </ModernButton>
                </div>
              )}
            </div>

            {/* Export */}
            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <ModernButton
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </ModernButton>
              <ModernButton
                onClick={handleDownloadTemplate}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download Template
              </ModernButton>
            </div>
          </div>

          {/* Import Progress */}
          {importing && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Importing...</span>
                <span className="text-sm font-medium">{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Preview Modal */}
      {showImportPreview && importPreview && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Import Preview ({importPreview.length} records)</span>
              <Button
                onClick={() => {
                  setShowImportPreview(false)
                  setImportPreview(null)
                }}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="p-2 text-left">Employee Code</th>
                    <th className="p-2 text-left">Employee Name</th>
                    <th className="p-2 text-left">Designation</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{row.employee_code}</td>
                      <td className="p-2">{row.employee_name}</td>
                      <td className="p-2">{row.designation}</td>
                      <td className="p-2">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 10 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Showing first 10 of {importPreview.length} records
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <ModernButton
                onClick={handleConfirmImport}
                variant="primary"
                disabled={importing}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Import
              </ModernButton>
              <ModernButton
                onClick={() => {
                  setShowImportPreview(false)
                  setImportPreview(null)
                }}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </ModernButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderManpowerTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by code, name, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</span>
              <Button onClick={handleCancel} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee Code *</label>
                <Input
                  type="text"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  placeholder="EMP001"
                  disabled={!!editingEmployee}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Name *</label>
                <Input
                  type="text"
                  value={formData.employee_name}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Designation *</label>
                <Input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <Input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <Input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hire Date</label>
                <Input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <ModernButton
                onClick={handleSave}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingEmployee ? 'Update' : 'Save'}
              </ModernButton>
              <ModernButton
                onClick={handleCancel}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </ModernButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Employees ({filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {employees.length === 0 ? 'No employees found. Add your first employee!' : 'No employees match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Designation</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Phone</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    {canEdit && <th className="text-right p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-mono text-sm">{employee.employee_code}</td>
                      <td className="p-3">{employee.employee_name}</td>
                      <td className="p-3">{employee.designation}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : employee.status === 'Inactive'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {employee.department || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {employee.phone_number || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {employee.email || '-'}
                      </td>
                      {canEdit && (
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <ModernButton
                              onClick={() => handleEdit(employee)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 flex items-center justify-center"
                              title="Edit"
                            >
                              <Edit className="h-5 w-5" />
                            </ModernButton>
                            {canDelete && (
                              <ModernButton
                                onClick={() => handleDelete(employee)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </ModernButton>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'manpower':
        return renderManpowerTab()
      case 'management-data':
        return renderManagementDataTab()
      default:
        return renderManpowerTab()
    }
  }

  if (loading) {
    return (
      <PermissionPage 
        permission="reports.view"
        accessDeniedTitle="HR Manpower Access Required"
        accessDeniedMessage="You need permission to view HR Manpower. Please contact your administrator."
      >
        <DynamicTitle pageTitle="HR - Manpower" />
        <div className="p-6 flex items-center justify-center min-h-[600px]">
          <LoadingSpinner size="lg" />
        </div>
      </PermissionPage>
    )
  }

  return (
    <PermissionPage 
      permission="reports.view"
      accessDeniedTitle="HR Manpower Access Required"
      accessDeniedMessage="You need permission to view HR Manpower. Please contact your administrator."
    >
      <DynamicTitle pageTitle="HR - Manpower" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            HR - Manpower
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track human resources and employee information
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <ModernButton
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                onClick={() => handleTabChange(tab.id)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </ModernButton>
            )
          })}
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="error" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
          </Alert>
        )}

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'manpower' && (
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2">
                {canEdit && (
                  <ModernButton
                    onClick={handleAdd}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </ModernButton>
                )}
                <ModernButton
                  onClick={fetchEmployees}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </ModernButton>
              </div>
            </div>
          )}
          {renderTabContent()}
        </div>
      </div>
    </PermissionPage>
  )
}

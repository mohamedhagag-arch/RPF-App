'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Users, Plus, Edit, Trash2, Search, X, CheckCircle, AlertCircle, 
  Building, Phone, Mail, UserCheck, Filter, QrCode
} from 'lucide-react'
import { supabase, TABLES, AttendanceEmployee } from '@/lib/supabase'
import { QRCodeDisplay } from './QRCodeDisplay'

export function EmployeesManagement() {
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<AttendanceEmployee | null>(null)
  const [viewingQRCode, setViewingQRCode] = useState<AttendanceEmployee | null>(null)
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    job_title: '',
    department: '',
    phone_number: '',
    email: '',
    status: 'Active' as 'Active' | 'Inactive'
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setEmployees(data || [])
    } catch (err: any) {
      setError('Failed to load employees: ' + err.message)
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = (employee: AttendanceEmployee): string => {
    // Create JSON object with essential employee data only
    const qrData = {
      // Employee identification
      id: employee.id,
      employee_code: employee.employee_code,
      name: employee.name,
      
      // Employee details
      job_title: employee.job_title || null,
      department: employee.department || null,
      phone_number: employee.phone_number || null,
      email: employee.email || null
    }
    
    // Convert to JSON string
    return JSON.stringify(qrData)
  }

  const ensureQRCode = async (employee: AttendanceEmployee): Promise<string> => {
    // If employee already has QR code, check if it's the new format (JSON)
    if (employee.qr_code) {
      try {
        // Try to parse as JSON to check if it's new format
        const parsed = JSON.parse(employee.qr_code)
        if (parsed.id === employee.id && parsed.employee_code === employee.employee_code) {
          // It's new format, but check if data is up to date
          const currentData = generateQRCode(employee)
          if (employee.qr_code !== currentData) {
            // Data changed, update QR code
            console.log('🔄 Employee data changed, updating QR code...')
            return await updateQRCode(employee, currentData)
          }
          return employee.qr_code
        }
        // Old format or different employee, convert to new format
        console.log('🔄 Converting QR code format to new format...')
        const newQRCode = generateQRCode(employee)
        return await updateQRCode(employee, newQRCode)
      } catch (e) {
        // Not JSON, it's old format (EMP-XXX), convert to new format
        console.log('🔄 Converting old QR code format to new format...')
        const newQRCode = generateQRCode(employee)
        return await updateQRCode(employee, newQRCode)
      }
    }

    // Generate new QR code with essential employee data
    const qrCode = generateQRCode(employee)
    return await updateQRCode(employee, qrCode)
  }

  const updateQRCode = async (employee: AttendanceEmployee, qrCode: string): Promise<string> => {
    // Update employee with QR code
    try {
      const { error } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        // @ts-ignore
        .update({ qr_code: qrCode })
        .eq('id', employee.id)

      if (error) {
        console.error('Error updating QR code:', error)
        return qrCode // Return generated code even if update fails
      }

      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === employee.id ? { ...emp, qr_code: qrCode } : emp
      ))

      return qrCode
    } catch (err) {
      console.error('Error updating QR code:', err)
      return qrCode
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      setSuccess('')

      if (editingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from(TABLES.ATTENDANCE_EMPLOYEES)
          // @ts-ignore - Attendance tables not in Supabase types yet
          .update(formData)
          .eq('id', editingEmployee.id)

        if (updateError) throw updateError
        setSuccess('Employee updated successfully!')
      } else {
        // Add new employee
        const { error: insertError } = await supabase
          .from(TABLES.ATTENDANCE_EMPLOYEES)
          // @ts-ignore - Attendance tables not in Supabase types yet
          .insert([formData])

        if (insertError) throw insertError
        setSuccess('Employee added successfully!')
      }

      setShowAddForm(false)
      setEditingEmployee(null)
      setFormData({
        employee_code: '',
        name: '',
        job_title: '',
        department: '',
        phone_number: '',
        email: '',
        status: 'Active'
      })
      fetchEmployees()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save employee: ' + err.message)
      console.error('Error saving employee:', err)
    }
  }

  const handleEdit = (employee: AttendanceEmployee) => {
    setEditingEmployee(employee)
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name,
      job_title: employee.job_title || '',
      department: employee.department || '',
      phone_number: employee.phone_number || '',
      email: employee.email || '',
      status: employee.status
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      setError('')
      const { error: deleteError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setSuccess('Employee deleted successfully!')
      fetchEmployees()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete employee: ' + err.message)
      console.error('Error deleting employee:', err)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)))

  if (loading && employees.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-green-500" />
            Employees Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage employee records for attendance tracking
          </p>
        </div>
        <Button onClick={() => {
          setShowAddForm(true)
          setEditingEmployee(null)
          setFormData({
            employee_code: '',
            name: '',
            job_title: '',
            department: '',
            phone_number: '',
            email: '',
            status: 'Active'
          })
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(emp => emp.status === 'Active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {employees.filter(emp => emp.status === 'Inactive').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{departments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingEmployee(null)
                  setFormData({
                    employee_code: '',
                    name: '',
                    job_title: '',
                    department: '',
                    phone_number: '',
                    email: '',
                    status: 'Active'
                  })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Code *</label>
                  <Input
                    value={formData.employee_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                    required
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Software Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="IT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingEmployee(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, code, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Employees List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      employee.status === 'Active' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Users className={`h-6 w-6 ${
                        employee.status === 'Active' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.employee_code}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {employee.job_title && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {employee.job_title}
                          </span>
                        )}
                        {employee.department && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {employee.department}
                          </span>
                        )}
                        {employee.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {employee.phone_number}
                          </span>
                        )}
                        {employee.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {employee.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      employee.status === 'Active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {employee.status}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Ensure QR code exists before showing
                        const qrCode = await ensureQRCode(employee)
                        setViewingQRCode({ ...employee, qr_code: qrCode })
                      }}
                      title="View QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No employees found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {viewingQRCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Employee QR Code</h3>
                  <p className="text-xs text-indigo-100">Scan to verify employee identity</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingQRCode(null)}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <QRCodeDisplay
                qrCode={viewingQRCode.qr_code || ''}
                employeeName={viewingQRCode.name}
                employeeCode={viewingQRCode.employee_code}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


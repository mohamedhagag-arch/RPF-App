'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BarChart3, Download, Calendar, Users, Clock, TrendingUp,
  FileText, Filter, RefreshCw, Eye, Printer, Search
} from 'lucide-react'
import { supabase, TABLES, AttendanceRecord, AttendanceEmployee } from '@/lib/supabase'
import { exportData, ExportFormat } from '@/lib/exportImportUtils'

interface ReportFilters {
  start_date: string
  end_date: string
  employee_ids: string[]
  departments: string[]
  status: string[]
}

export function AttendanceReports() {
  const [reports, setReports] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    employee_ids: [],
    departments: [],
    status: []
  })
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [reportType, setReportType] = useState<'attendance' | 'summary' | 'detailed'>('attendance')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  useEffect(() => {
    fetchEmployees()
    fetchReports()
  }, [filters])

  const fetchEmployees = async () => {
    try {
      // @ts-ignore - Attendance tables not in Supabase types yet
      const { data, error: empError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .select('*')
        .eq('status', 'Active')
        .order('name')

      if (empError) throw empError
      setEmployees((data || []) as any)
      
      // @ts-ignore
      const depts = Array.from(new Set((data || []).map((emp: any) => emp.department).filter(Boolean)))
      setDepartments(depts as string[])
    } catch (err: any) {
      console.error('Error fetching employees:', err)
    }
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError('')
      
      let query = supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        .select(`
          *,
          employee:${TABLES.ATTENDANCE_EMPLOYEES}(id, name, employee_code, department, job_title),
          location:${TABLES.ATTENDANCE_LOCATIONS}(id, name)
        `)
        .gte('date', filters.start_date)
        .lte('date', filters.end_date)
        .order('date', { ascending: false })
        .order('check_time', { ascending: false })

      if (filters.employee_ids.length > 0) {
        query = query.in('employee_id', filters.employee_ids)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Apply department filter
      let filteredData = data || []
      if (filters.departments.length > 0) {
        filteredData = filteredData.filter((record: any) => {
          const emp = record.employee as any
          return emp && emp.department && filters.departments.includes(emp.department)
        })
      }

      // Apply status filter
      if (filters.status.length > 0) {
        filteredData = filteredData.filter((record: any) => {
          if (filters.status.includes('late') && record.is_late) return true
          if (filters.status.includes('on-time') && !record.is_late && record.type === 'Check-In') return true
          if (filters.status.includes('early') && record.is_early && record.type === 'Check-Out') return true
          return false
        })
      }

      setReports(filteredData)
    } catch (err: any) {
      setError('Failed to load reports: ' + err.message)
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      setError('')
      setSuccess('')

      if (reports.length === 0) {
        setError('No data to export')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const exportData = reports.map((record: any) => {
        const emp = record.employee || {}
        return {
          'Date': record.date || '',
          'Employee Code': emp.employee_code || '',
          'Employee Name': emp.name || '',
          'Department': emp.department || '',
          'Job Title': emp.job_title || '',
          'Type': record.type || '',
          'Check Time': record.check_time || '',
          'Location': record.location?.name || '',
          'Work Duration (Hours)': record.work_duration_hours || '',
          'Is Late': record.is_late ? 'Yes' : 'No',
          'Is Early': record.is_early ? 'Yes' : 'No',
          'Notes': record.notes || ''
        }
      })

      const filename = `attendance_report_${today}`
      const { exportData: exportDataFn } = await import('@/lib/exportImportUtils')
      await exportDataFn(exportData, filename, exportFormat, {
        columns: [
          'Date', 'Employee Code', 'Employee Name', 'Department', 'Job Title',
          'Type', 'Check Time', 'Location', 'Work Duration (Hours)',
          'Is Late', 'Is Early', 'Notes'
        ],
        sheetName: 'Attendance Report'
      })

      setSuccess(`Successfully exported ${exportData.length} record(s) as ${exportFormat.toUpperCase()}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to export: ' + err.message)
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const getAttendanceStatus = (record: AttendanceRecord) => {
    if (record.type === 'Check-In') {
      return record.is_late ? 'Late' : 'On Time'
    }
    return record.is_early ? 'Early' : 'Normal'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Time':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'Late':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'Early':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const stats = {
    total_records: reports.length,
    check_ins: reports.filter(r => r.type === 'Check-In').length,
    check_outs: reports.filter(r => r.type === 'Check-Out').length,
    late_count: reports.filter(r => r.is_late).length,
    on_time_count: reports.filter(r => !r.is_late && r.type === 'Check-In').length,
    average_hours: reports
      .filter(r => r.work_duration_hours)
      .reduce((sum, r) => sum + (r.work_duration_hours || 0), 0) / 
      (reports.filter(r => r.work_duration_hours).length || 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-green-500" />
            Attendance Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and export attendance reports with detailed analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting || reports.length === 0}>
            {exporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_records}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-Ins</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.check_ins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.late_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.average_hours.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="attendance">Attendance Report</option>
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Departments</label>
              <select
                multiple
                value={filters.departments}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters(prev => ({ ...prev, departments: selected }))
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                multiple
                value={filters.status}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters(prev => ({ ...prev, status: selected }))
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="on-time">On Time</option>
                <option value="late">Late</option>
                <option value="early">Early</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end_date: new Date().toISOString().split('T')[0],
                  employee_ids: [],
                  departments: [],
                  status: []
                })
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((record: any) => {
                const employee = record.employee || {}
                const status = getAttendanceStatus(record)
                return (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        record.type === 'Check-In' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                      }`}>
                        <Clock className={`h-6 w-6 ${
                          record.type === 'Check-In' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{employee.name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">{employee.employee_code || ''}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>{record.date}</span>
                          <span>{record.check_time}</span>
                          {employee.department && <span>{employee.department}</span>}
                          {record.location?.name && <span>📍 {record.location.name}</span>}
                          {record.work_duration_hours && (
                            <span>⏱️ {record.work_duration_hours.toFixed(2)}h</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No records found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


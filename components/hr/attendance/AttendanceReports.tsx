'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BarChart3, Download, Calendar, Users, Clock, TrendingUp,
  FileText, Filter, RefreshCw, Eye, Printer, Search, ListChecks, AlertCircle,
  Check, ChevronDown, X
} from 'lucide-react'
import { supabase, TABLES, AttendanceRecord, AttendanceEmployee, AttendanceDailyStatus } from '@/lib/supabase'
import { exportData, ExportFormat } from '@/lib/exportImportUtils'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface ReportFilters {
  start_date: string
  end_date: string
  employee_ids: string[]
  departments: string[]
  statuses: string[]
}

type CombinedStatus = AttendanceDailyStatus['status'] | 'missing'

type DailyRow = {
  key: string
  date: string
  employee: AttendanceEmployee
  status: CombinedStatus
  notes?: string | null
  checkIns: string[]
  checkOuts: string[]
  locationNames: string[]
  isLate: boolean
  isEarly: boolean
  hasAttendance: boolean
  workDurationHours?: number | null
}

type SummaryRow = {
  employee: AttendanceEmployee
  attended: number
  vacation: number
  cancelled: number
  excused_absent: number
  absent: number
  missing: number
  totalDays: number
  totalHours: number
}

type DepartmentSummaryRow = {
  department: string
  attended: number
  vacation: number
  cancelled: number
  excused_absent: number
  absent: number
  missing: number
  totalDays: number
  totalHours: number
}

type ReportType = 'attendance' | 'summary' | 'missing' | 'late_early' | 'department_summary' | 'employee_timeline'

export function AttendanceReports() {
  const [reports, setReports] = useState<AttendanceRecord[]>([])
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([])
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([])
  const [deptSummaryRows, setDeptSummaryRows] = useState<DepartmentSummaryRow[]>([])
  const [showEmployeesDropdown, setShowEmployeesDropdown] = useState(false)
  const [employeesSearch, setEmployeesSearch] = useState('')
  const [showDepartmentsDropdown, setShowDepartmentsDropdown] = useState(false)
  const [departmentsSearch, setDepartmentsSearch] = useState('')
  const [showStatusesDropdown, setShowStatusesDropdown] = useState(false)
  const [statusesSearch, setStatusesSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    employee_ids: [],
    departments: [],
    statuses: []
  })
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [reportType, setReportType] = useState<ReportType>('attendance')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  useEffect(() => {
    fetchEmployees()
    fetchReports()
  }, [filters])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showEmployeesDropdown && !target.closest('.timeline-employee-dropdown')) {
        setShowEmployeesDropdown(false)
        setEmployeesSearch('')
      }
      if (showDepartmentsDropdown && !target.closest('.departments-dropdown')) {
        setShowDepartmentsDropdown(false)
        setDepartmentsSearch('')
      }
      if (showStatusesDropdown && !target.closest('.statuses-dropdown')) {
        setShowStatusesDropdown(false)
        setStatusesSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmployeesDropdown, showDepartmentsDropdown, showStatusesDropdown])

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
      
      // Attendance records
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

      const [{ data, error: fetchError }, { data: statusData, error: statusError }] = await Promise.all([
        query,
        supabase
          .from(TABLES.ATTENDANCE_DAILY_STATUSES)
          // @ts-ignore
          .select(`
            *,
            employee:${TABLES.ATTENDANCE_EMPLOYEES}(id, name, employee_code, department, job_title)
          `)
          .gte('date', filters.start_date)
          .lte('date', filters.end_date)
          .order('date', { ascending: false })
      ])

      if (fetchError) throw fetchError
      if (statusError) throw statusError

      // Apply department filter
      let filteredData = data || []
      if (filters.departments.length > 0) {
        filteredData = filteredData.filter((record: any) => {
          const emp = record.employee as any
          return emp && emp.department && filters.departments.includes(emp.department)
        })
      }

      // (Legacy) status filter removed; we now rely on combined status filtering later

      setReports(filteredData)

      // Build combined daily rows
      const combinedMap = new Map<string, DailyRow>()

      // Add statuses first
      ;(statusData || []).forEach((s: any) => {
        const emp = s.employee as AttendanceEmployee
        const key = `${emp.id}_${s.date}`
        combinedMap.set(key, {
          key,
          date: s.date,
          employee: emp,
          status: s.status as CombinedStatus,
          notes: s.notes,
          checkIns: [],
          checkOuts: [],
          locationNames: [],
          isLate: false,
          isEarly: false,
          hasAttendance: false,
          workDurationHours: null
        })
      })

      // Merge attendance records
      ;(filteredData || []).forEach((rec: any) => {
        const emp = rec.employee as AttendanceEmployee
        const key = `${emp.id}_${rec.date}`
        if (!combinedMap.has(key)) {
          combinedMap.set(key, {
            key,
            date: rec.date,
            employee: emp,
            status: 'attended',
            notes: rec.notes,
            checkIns: [],
            checkOuts: [],
            locationNames: [],
            isLate: rec.is_late,
            isEarly: rec.is_early,
            hasAttendance: true,
            workDurationHours: null
          })
        }
        const row = combinedMap.get(key)!
        if (rec.type === 'Check-In') row.checkIns.push(rec.check_time)
        if (rec.type === 'Check-Out') row.checkOuts.push(rec.check_time)
        if (rec.location?.name) row.locationNames.push(rec.location.name)
        // If there is attendance, override to attended
        row.status = 'attended'
        row.hasAttendance = true
        row.isLate = row.isLate || rec.is_late
        row.isEarly = row.isEarly || rec.is_early
        row.notes = row.notes || rec.notes
      })

      // Compute duration per day (earliest check-in to latest check-out)
      const combined = Array.from(combinedMap.values()).map((row) => {
        const ins = [...row.checkIns].sort()
        const outs = [...row.checkOuts].sort()
        if (ins.length > 0 && outs.length > 0) {
          const [inH, inM] = ins[0].split(':').map(Number)
          const [outH, outM] = outs[outs.length - 1].split(':').map(Number)
          const inMinutes = inH * 60 + inM
          const outMinutes = outH * 60 + outM
          const diffMinutes = Math.max(0, outMinutes - inMinutes)
          row.workDurationHours = parseFloat((diffMinutes / 60).toFixed(2))
        } else {
          row.workDurationHours = null
        }
        return row
      }).sort((a, b) => b.date.localeCompare(a.date))

      setDailyRows(combined)

      // Build summary per employee
      const summaryMap = new Map<string, SummaryRow>()
      combined.forEach((row) => {
        const key = row.employee.id
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            employee: row.employee,
            attended: 0,
            vacation: 0,
            cancelled: 0,
            excused_absent: 0,
            absent: 0,
            missing: 0,
            totalDays: 0,
            totalHours: 0
          })
        }
        const s = summaryMap.get(key)!
        const statusKey = (row.status || 'missing') as CombinedStatus
        s[statusKey] = (s[statusKey] || 0) + 1
        s.totalDays += 1
        if (row.workDurationHours) {
          s.totalHours += row.workDurationHours
        }
      })
      const summaryList = Array.from(summaryMap.values()).sort((a, b) => a.employee.name.localeCompare(b.employee.name))
      setSummaryRows(summaryList)

      // Build department summary
      const deptMap = new Map<string, DepartmentSummaryRow>()
      combined.forEach((row) => {
        const dept = row.employee.department || 'Not Assigned'
        if (!deptMap.has(dept)) {
          deptMap.set(dept, {
            department: dept,
            attended: 0,
            vacation: 0,
            cancelled: 0,
            excused_absent: 0,
            absent: 0,
            missing: 0,
            totalDays: 0,
            totalHours: 0
          })
        }
        const d = deptMap.get(dept)!
        const statusKey = (row.status || 'missing') as CombinedStatus
        d[statusKey] = (d[statusKey] || 0) + 1
        d.totalDays += 1
        if (row.workDurationHours) d.totalHours += row.workDurationHours
      })
      const deptList = Array.from(deptMap.values()).sort((a, b) => a.department.localeCompare(b.department))
      setDeptSummaryRows(deptList)
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

      if (reportType === 'employee_timeline' && filters.employee_ids.length === 0) {
        setError('Select at least one employee before exporting the timeline')
        return
      }

      const hasData = reportType === 'summary'
        ? summaryRows.length > 0
        : (filteredDaily.length > 0 || dailyRows.length > 0)

      if (!hasData) {
        setError('No data to export')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      
      // Helper to yield control to browser for better responsiveness
      const yieldToBrowser = () => new Promise(resolve => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => resolve(void 0), { timeout: 5 })
        } else {
          setTimeout(resolve, 5)
        }
      })
      
      // Process data in smaller chunks to avoid blocking UI
      const CHUNK_SIZE = 500
      const exportData: any[] = []
      
      if (reportType === 'summary') {
        const source = summaryRows
        for (let i = 0; i < source.length; i += CHUNK_SIZE) {
          const chunk = source.slice(i, i + CHUNK_SIZE)
          const chunkData = chunk.map((row) => ({
            'Employee Code': row.employee.employee_code || '',
            'Employee Name': row.employee.name || '',
            'Department': row.employee.department || '',
            'Job Title': row.employee.job_title || '',
            'Attended': row.attended,
            'Vacation': row.vacation,
            'Cancelled': row.cancelled,
            'Excused Absent': row.excused_absent,
            'Absent': row.absent,
            'Missing': row.missing,
            'Total Days': row.totalDays,
            'Total Hours': row.totalHours.toFixed(2)
          }))
          exportData.push(...chunkData)
          if (i + CHUNK_SIZE < source.length) await yieldToBrowser()
        }

        const filename = `attendance_summary_${today}`
        const { exportData: exportDataFn } = await import('@/lib/exportImportUtils')
        await exportDataFn(exportData, filename, exportFormat, {
          columns: [
            'Employee Code', 'Employee Name', 'Department', 'Job Title',
            'Attended', 'Vacation', 'Cancelled', 'Excused Absent', 'Absent', 'Missing',
            'Total Days', 'Total Hours'
          ],
          sheetName: 'Attendance Summary'
        })
      } else if (reportType === 'department_summary') {
        const source = deptSummaryRows
        for (let i = 0; i < source.length; i += CHUNK_SIZE) {
          const chunk = source.slice(i, i + CHUNK_SIZE)
          const chunkData = chunk.map((row) => ({
            'Department': row.department,
            'Attended': row.attended,
            'Vacation': row.vacation,
            'Cancelled': row.cancelled,
            'Excused Absent': row.excused_absent,
            'Absent': row.absent,
            'Missing': row.missing,
            'Total Days': row.totalDays,
            'Total Hours': row.totalHours.toFixed(2)
          }))
        exportData.push(...chunkData)
          if (i + CHUNK_SIZE < source.length) await yieldToBrowser()
        }

        const filename = `attendance_dept_summary_${today}`
        const { exportData: exportDataFn } = await import('@/lib/exportImportUtils')
        await exportDataFn(exportData, filename, exportFormat, {
          columns: [
            'Department',
            'Attended', 'Vacation', 'Cancelled', 'Excused Absent', 'Absent', 'Missing',
            'Total Days', 'Total Hours'
          ],
          sheetName: 'Department Summary'
        })
      } else {
        const source = filteredDaily.length > 0 ? filteredDaily : dailyRows
        for (let i = 0; i < source.length; i += CHUNK_SIZE) {
          const chunk = source.slice(i, i + CHUNK_SIZE)
          const chunkData = chunk.map((row) => ({
            'Date': row.date,
            'Employee Code': row.employee.employee_code || '',
            'Employee Name': row.employee.name || '',
            'Department': row.employee.department || '',
            'Job Title': row.employee.job_title || '',
            'Status': row.status || 'missing',
            'Check-Ins': row.checkIns.join(', '),
            'Check-Outs': row.checkOuts.join(', '),
            'Locations': row.locationNames.join(', '),
            'Duration (Hours)': row.workDurationHours ?? '',
            'Notes': row.notes || '',
            'Is Late': row.isLate ? 'Yes' : 'No',
            'Is Early': row.isEarly ? 'Yes' : 'No'
          }))
          exportData.push(...chunkData)
          if (i + CHUNK_SIZE < source.length) await yieldToBrowser()
      }

      const filename = `attendance_report_${today}`
      const { exportData: exportDataFn } = await import('@/lib/exportImportUtils')
      await exportDataFn(exportData, filename, exportFormat, {
        columns: [
          'Date', 'Employee Code', 'Employee Name', 'Department', 'Job Title',
            'Status', 'Check-Ins', 'Check-Outs', 'Locations', 'Duration (Hours)',
          'Is Late', 'Is Early', 'Notes'
        ],
        sheetName: 'Attendance Report'
      })
      }

      setSuccess(`Successfully exported ${exportData.length} record(s) as ${exportFormat.toUpperCase()}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to export: ' + err.message)
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const getStatusColor = (status: CombinedStatus) => {
    switch (status) {
      case 'attended':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'vacation':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'cancelled':
        return 'text-gray-700 bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
      case 'excused_absent':
        return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'absent':
        return 'text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200'
      case 'missing':
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const filteredDaily = useMemo(() => {
    let base = dailyRows
    // Apply report-type specific quick filters
    if (reportType === 'missing') {
      base = base.filter((row) => (row.status || 'missing') === 'missing')
    } else if (reportType === 'late_early') {
      base = base.filter((row) => row.isLate || row.isEarly)
    }

    return base.filter((row) => {
      const matchesDept = filters.departments.length === 0 || (row.employee.department && filters.departments.includes(row.employee.department))
      const matchesEmployee = filters.employee_ids.length === 0 || filters.employee_ids.includes(row.employee.id)
      const statusFilter = filters.statuses
      const computedStatus: CombinedStatus = row.status || 'missing'
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(computedStatus)
      return matchesDept && matchesEmployee && matchesStatus
    })
  }, [dailyRows, filters, reportType])

  const stats = {
    total_records: reportType === 'department_summary'
      ? deptSummaryRows.reduce((sum, r) => sum + r.totalDays, 0)
      : filteredDaily.length,
    statusCounts: filteredDaily.reduce<Record<CombinedStatus, number>>((acc, row) => {
      const s = (row.status || 'missing') as CombinedStatus
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, { attended: 0, vacation: 0, cancelled: 0, excused_absent: 0, absent: 0, missing: 0 } as any)
  }

  const renderDeptSummaryTable = () => {
    if (deptSummaryRows.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No records found for the selected filters</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Attended</th>
              <th className="p-3 text-left">Vacation</th>
              <th className="p-3 text-left">Cancelled</th>
              <th className="p-3 text-left">Excused</th>
              <th className="p-3 text-left">Absent</th>
              <th className="p-3 text-left">Missing</th>
              <th className="p-3 text-left">Total Days</th>
              <th className="p-3 text-left">Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {deptSummaryRows.map((row) => (
              <tr key={row.department} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-3 font-medium text-gray-900 dark:text-white">{row.department}</td>
                <td className="p-3">{row.attended}</td>
                <td className="p-3">{row.vacation}</td>
                <td className="p-3">{row.cancelled}</td>
                <td className="p-3">{row.excused_absent}</td>
                <td className="p-3">{row.absent}</td>
                <td className="p-3">{row.missing}</td>
                <td className="p-3">{row.totalDays}</td>
                <td className="p-3">{row.totalHours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const employeeTimeline = useMemo(() => {
    const groups = new Map<string, { employee: AttendanceEmployee; rows: DailyRow[] }>()
    filteredDaily.forEach((row) => {
      const key = row.employee.id
      if (!groups.has(key)) {
        groups.set(key, { employee: row.employee, rows: [] })
      }
      groups.get(key)!.rows.push(row)
    })
    return Array.from(groups.values()).map(g => ({
      ...g,
      rows: g.rows.sort((a, b) => b.date.localeCompare(a.date))
    }))
  }, [filteredDaily])

  const renderSummaryTable = () => {
    if (summaryRows.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No records found for the selected filters</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">Attended</th>
              <th className="p-3 text-left">Vacation</th>
              <th className="p-3 text-left">Cancelled</th>
              <th className="p-3 text-left">Excused</th>
              <th className="p-3 text-left">Absent</th>
              <th className="p-3 text-left">Missing</th>
              <th className="p-3 text-left">Total Days</th>
              <th className="p-3 text-left">Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.employee.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-3">
                  <div className="font-medium text-gray-900 dark:text-white">{row.employee.name}</div>
                  <div className="text-xs text-gray-500">
                    {row.employee.employee_code}
                    {row.employee.department ? ` • ${row.employee.department}` : ''}
                    {row.employee.job_title ? ` • ${row.employee.job_title}` : ''}
                  </div>
                </td>
                <td className="p-3">{row.attended}</td>
                <td className="p-3">{row.vacation}</td>
                <td className="p-3">{row.cancelled}</td>
                <td className="p-3">{row.excused_absent}</td>
                <td className="p-3">{row.absent}</td>
                <td className="p-3">{row.missing}</td>
                <td className="p-3">{row.totalDays}</td>
                <td className="p-3">{row.totalHours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
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
          <PermissionButton
            permission="hr.attendance.reports.export"
            onClick={handleExport}
            disabled={exporting || reports.length === 0}
          >
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
          </PermissionButton>
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_records}</div>
          </CardContent>
        </Card>
        {['attended','vacation','cancelled','excused_absent','absent','missing'].map((s) => {
          const labelMap: Record<CombinedStatus, string> = {
            attended: 'Attended',
            vacation: 'Vacation',
            cancelled: 'Cancelled',
            excused_absent: 'Excused',
            absent: 'Absent',
            missing: 'Missing'
          }
          const color = getStatusColor(s as CombinedStatus)
          return (
            <Card key={s}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{labelMap[s as CombinedStatus]}</CardTitle>
                <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                <div className={`text-2xl font-bold ${color.split(' ').find(c => c.startsWith('text-')) || ''}`}>
                  {stats.statusCounts[s as CombinedStatus] || 0}
                </div>
          </CardContent>
        </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="attendance">Attendance Report (daily rows)</option>
                <option value="summary">Employee Summary</option>
                <option value="department_summary">Department Summary</option>
                <option value="missing">Missing Only</option>
                <option value="late_early">Late / Early Only</option>
                <option value="employee_timeline">Employee Daily Timeline</option>
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
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative departments-dropdown">
              <label className="block text-sm font-medium mb-1">Departments</label>
              <button
                type="button"
                onClick={() => setShowDepartmentsDropdown(!showDepartmentsDropdown)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-between"
              >
                <span className="text-sm">
                  {filters.departments.length === 0
                    ? 'Select departments...'
                    : `${filters.departments.length} selected`}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showDepartmentsDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDepartmentsDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={departmentsSearch}
                        onChange={(e) => setDepartmentsSearch(e.target.value)}
                        placeholder="Search department..."
                        className="w-full pl-8 pr-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto pb-2">
                    {departments
                      .filter((dept) => {
                        if (!departmentsSearch) return true
                        return dept.toLowerCase().includes(departmentsSearch.toLowerCase())
                      })
                      .map((dept) => {
                        const selected = filters.departments.includes(dept)
                        return (
                          <div
                            key={dept}
                            onClick={() => {
                              setFilters((prev) => {
                                const exists = prev.departments.includes(dept)
                                const next = exists
                                  ? prev.departments.filter((d) => d !== dept)
                                  : [...prev.departments, dept]
                                return { ...prev, departments: next }
                              })
                            }}
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              selected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                            }`}>
                              {selected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="font-medium">{dept}</div>
                          </div>
                        )
                      })}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters((prev) => ({ ...prev, departments: [] }))}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDepartmentsDropdown(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative statuses-dropdown">
              <label className="block text-sm font-medium mb-1">Status</label>
              <button
                type="button"
                onClick={() => setShowStatusesDropdown(!showStatusesDropdown)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-between"
              >
                <span className="text-sm">
                  {filters.statuses.length === 0
                    ? 'Select statuses...'
                    : `${filters.statuses.length} selected`}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showStatusesDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showStatusesDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={statusesSearch}
                        onChange={(e) => setStatusesSearch(e.target.value)}
                        placeholder="Search status..."
                        className="w-full pl-8 pr-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto pb-2">
                    {['attended','vacation','cancelled','excused_absent','absent','missing']
                      .filter((s) => {
                        if (!statusesSearch) return true
                        return s.toLowerCase().includes(statusesSearch.toLowerCase())
                      })
                      .map((s) => {
                        const selected = filters.statuses.includes(s)
                        const labelMap: Record<CombinedStatus, string> = {
                          attended: 'Attended',
                          vacation: 'Vacation',
                          cancelled: 'Cancelled',
                          excused_absent: 'Excused Absent',
                          absent: 'Absent',
                          missing: 'Missing'
                        }
                        return (
                          <div
                            key={s}
                            onClick={() => {
                              setFilters((prev) => {
                                const exists = prev.statuses.includes(s)
                                const next = exists
                                  ? prev.statuses.filter((st) => st !== s)
                                  : [...prev.statuses, s]
                                return { ...prev, statuses: next }
                              })
                            }}
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              selected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                            }`}>
                              {selected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="font-medium">{labelMap[s as CombinedStatus]}</div>
                          </div>
                        )
                      })}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters((prev) => ({ ...prev, statuses: [] }))}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStatusesDropdown(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Employees</label>
              <div className="relative timeline-employee-dropdown">
                <button
                  type="button"
                  onClick={() => setShowEmployeesDropdown(!showEmployeesDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-between"
                >
                  <span className="text-sm">
                    {filters.employee_ids.length === 0
                      ? 'Select employees...'
                      : `${filters.employee_ids.length} selected`}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showEmployeesDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showEmployeesDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={employeesSearch}
                          onChange={(e) => setEmployeesSearch(e.target.value)}
                          placeholder="Search employee..."
                          className="w-full pl-8 pr-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto pb-2">
                      {employees
                        .filter((emp) => {
                          if (!employeesSearch) return true
                          const s = employeesSearch.toLowerCase()
                          return (
                            emp.name.toLowerCase().includes(s) ||
                            emp.employee_code.toLowerCase().includes(s) ||
                            (emp.department || '').toLowerCase().includes(s)
                          )
                        })
                        .map((emp) => {
                          const selected = filters.employee_ids.includes(emp.id)
                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                setFilters((prev) => {
                                  const exists = prev.employee_ids.includes(emp.id)
                                  const next = exists
                                    ? prev.employee_ids.filter((id) => id !== emp.id)
                                    : [...prev.employee_ids, emp.id]
                                  return { ...prev, employee_ids: next }
                                })
                              }}
                              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                selected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200' : ''
                              }`}
                            >
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                              }`}>
                                {selected && <Check className="h-3 w-3" />}
                              </div>
                              <div>
                                <div className="font-medium">{emp.name}</div>
                                <div className="text-xs text-gray-500">
                                  {emp.employee_code}
                                  {emp.department ? ` • ${emp.department}` : ''}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      {employees.filter((emp) => {
                        const s = employeesSearch.toLowerCase()
                        return (
                          s &&
                          !(
                            emp.name.toLowerCase().includes(s) ||
                            emp.employee_code.toLowerCase().includes(s) ||
                            (emp.department || '').toLowerCase().includes(s)
                          )
                        )
                      }).length === employees.length && employeesSearch && (
                        <div className="px-3 py-2 text-xs text-gray-500">No employees found</div>
                      )}
                    </div>
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters((prev) => ({ ...prev, employee_ids: [] }))}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmployeesDropdown(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end_date: new Date().toISOString().split('T')[0],
                  employee_ids: [],
                  departments: [],
                  statuses: []
                })
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button variant="outline" onClick={fetchReports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {reportType === 'summary'
              ? `Summary (${summaryRows.length})`
              : `Attendance & Status (${filteredDaily.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : reportType === 'summary' ? (
            renderSummaryTable()
          ) : reportType === 'department_summary' ? (
            renderDeptSummaryTable()
          ) : reportType === 'employee_timeline' ? (
            employeeTimeline.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filters.employee_ids.length === 0
                    ? 'Select at least one employee to view the timeline'
                    : 'No records found for the selected filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeTimeline.map(({ employee, rows }) => (
                  <Card key={employee.id} className="border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{employee.name}</div>
                          <div className="text-xs text-gray-500">
                            {employee.employee_code}
                            {employee.department ? ` • ${employee.department}` : ''}
                            {employee.job_title ? ` • ${employee.job_title}` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{rows.length} day(s)</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rows.map((row) => (
                        <div key={row.key} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status || 'missing')}`}>
                                {row.status || 'missing'}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{row.date}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex gap-3">
                              <span>Late: {row.isLate ? 'Yes' : 'No'}</span>
                              <span>Early: {row.isEarly ? 'Yes' : 'No'}</span>
                              <span>Duration: {row.workDurationHours != null ? `${row.workDurationHours}h` : '—'}</span>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-gray-500 mb-1">Check-Ins</p>
                              {row.checkIns.length > 0 ? row.checkIns.join(', ') : '—'}
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Check-Outs</p>
                              {row.checkOuts.length > 0 ? row.checkOuts.join(', ') : '—'}
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Locations</p>
                              {row.locationNames.length > 0 ? row.locationNames.join(', ') : '—'}
                            </div>
                          </div>
                          {row.notes && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                              Notes: {row.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : filteredDaily.length > 0 ? (
            <div className="space-y-4">
              {filteredDaily.map((row) => {
                return (
                  <div key={row.key} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status || 'missing')}`}>
                          {row.status || 'missing'}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{row.employee.name}</h3>
                          <p className="text-sm text-gray-500">
                            {row.employee.employee_code}
                            {row.employee.department ? ` • ${row.employee.department}` : ''}
                            {row.employee.job_title ? ` • ${row.employee.job_title}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{row.date}</span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Check-Ins</p>
                        {row.checkIns.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.checkIns.map((t) => (
                              <span key={t} className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Check-Outs</p>
                        {row.checkOuts.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.checkOuts.map((t) => (
                              <span key={t} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Locations</p>
                        {row.locationNames.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.locationNames.map((loc) => (
                              <span key={loc} className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                                {loc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Late: {row.isLate ? 'Yes' : 'No'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Early: {row.isEarly ? 'Yes' : 'No'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Duration: {row.workDurationHours != null ? `${row.workDurationHours}h` : '—'}
                      </span>
                      {row.notes && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {row.notes}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No records found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { supabase, TABLES, AttendanceEmployee, AttendanceDailyStatus } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ClipboardList,
  Filter,
  RefreshCw,
  Search,
  Users
} from 'lucide-react'

type StatusValue = AttendanceDailyStatus['status']

const STATUS_OPTIONS: Array<{
  value: StatusValue
  code: string
  label: string
  color: string
}> = [
  { value: 'attended', code: 'A', label: 'Attended', color: 'bg-green-100 text-green-700' },
  { value: 'vacation', code: 'V', label: 'Vacation', color: 'bg-blue-100 text-blue-700' },
  { value: 'cancelled', code: 'C', label: 'Cancelled / Inactive', color: 'bg-gray-200 text-gray-700' },
  { value: 'excused_absent', code: 'E', label: 'Absent with permission', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'absent', code: 'X', label: 'Absent', color: 'bg-red-100 text-red-700' }
]

type StatusState = {
  status: StatusValue | ''
  notes: string
  hasAttendance: boolean
}

export function MissingAttendance() {
  const { user, appUser } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, StatusState>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'missing' | 'attended'>('missing')
  const [selectedStatuses, setSelectedStatuses] = useState<StatusValue[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [{ data: employeeData, error: employeeError }, { data: attendanceData, error: attendanceError }, { data: statusData, error: statusError }] =
        await Promise.all([
          supabase
            .from(TABLES.ATTENDANCE_EMPLOYEES)
            // @ts-ignore
            .select('*')
            .order('name', { ascending: true }),
          supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .select('employee_id')
            .eq('date', selectedDate)
            .eq('type', 'Check-In'),
          supabase
            .from(TABLES.ATTENDANCE_DAILY_STATUSES)
            // @ts-ignore
            .select('*')
            .eq('date', selectedDate)
        ])

      if (employeeError) throw employeeError
      if (attendanceError) throw attendanceError
      if (statusError) throw statusError

      const employeesList = (employeeData || []) as AttendanceEmployee[]
      const attendedSet = new Set((attendanceData || []).map((r: any) => r.employee_id))
      const statusByEmployee = new Map<string, AttendanceDailyStatus>()

      ;(statusData || []).forEach((s: any) => {
        statusByEmployee.set(s.employee_id, s as AttendanceDailyStatus)
      })

      const nextStatusMap: Record<string, StatusState> = {}
      employeesList.forEach((emp) => {
        const hasAttendance = attendedSet.has(emp.id)
        const existing = statusByEmployee.get(emp.id)
        nextStatusMap[emp.id] = {
          status: existing?.status || (hasAttendance ? 'attended' : ''),
          notes: existing?.notes || '',
          hasAttendance
        }
      })

      setEmployees(employeesList)
      setStatusMap(nextStatusMap)
    } catch (err: any) {
      console.error('Error loading missing attendance data:', err)
      setError('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const departments = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department)
    })
    return Array.from(set).sort()
  }, [employees])

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const entry = statusMap[emp.id]

      const matchesSearch =
        !searchTerm ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.job_title || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAttendance =
        attendanceFilter === 'all'
          ? true
          : attendanceFilter === 'missing'
            ? !entry?.hasAttendance
            : entry?.hasAttendance

      const matchesStatus =
        selectedStatuses.length === 0 ||
        (entry && entry.status && selectedStatuses.includes(entry.status as StatusValue))

      const matchesDepartment =
        selectedDepartments.length === 0 || (emp.department && selectedDepartments.includes(emp.department))

      return matchesSearch && matchesAttendance && matchesStatus && matchesDepartment
    })
  }, [employees, searchTerm, attendanceFilter, selectedStatuses, selectedDepartments, statusMap])

  const summary = useMemo(() => {
    const totals: Record<StatusValue, number> = {
      attended: 0,
      vacation: 0,
      cancelled: 0,
      excused_absent: 0,
      absent: 0
    }

    Object.values(statusMap).forEach((entry) => {
      if (entry.status) {
        const key = entry.status as StatusValue
        totals[key] = (totals[key] || 0) + 1
      }
    })

    const missingCount = Object.values(statusMap).filter((entry) => !entry.hasAttendance).length

    return { totals, missingCount }
  }, [statusMap])

  const updateStatus = (employeeId: string, updater: Partial<StatusState>) => {
    setStatusMap((prev) => {
      const current = prev[employeeId] || { status: '', notes: '', hasAttendance: false }
      return {
        ...prev,
        [employeeId]: { ...current, ...updater }
      }
    })
  }

  const markMissingAs = (status: StatusValue) => {
    setStatusMap((prev) => {
      const next = { ...prev }
      employees.forEach((emp) => {
        const entry = prev[emp.id]
        if (entry && !entry.hasAttendance) {
          next[emp.id] = { ...entry, status }
        }
      })
      return next
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const currentUserId = user?.id || appUser?.id || null
      const payload = employees
        .map((emp) => {
          const entry = statusMap[emp.id] || { status: '', notes: '', hasAttendance: false }
          if (!entry.status) return null // لا ترسل سجلاً بدون حالة
          return {
            employee_id: emp.id,
            date: selectedDate,
            status: entry.status as StatusValue,
            notes: entry.notes || null,
            recorded_by: currentUserId
          }
        })
        .filter(Boolean) as {
          employee_id: string
          date: string
          status: StatusValue
          notes: string | null
          recorded_by: string | null
        }[]

      if (payload.length === 0) {
        setError('اختر حالة واحدة على الأقل قبل الحفظ')
        return
      }

      const { error: upsertError } = await supabase
        .from(TABLES.ATTENDANCE_DAILY_STATUSES)
        // @ts-ignore
        .upsert(payload, { onConflict: 'employee_id,date' })

      if (upsertError) throw upsertError

      setSuccess('Statuses saved and preserved successfully')
      setTimeout(() => setSuccess(''), 2500)
      await loadData()
    } catch (err: any) {
      console.error('Error saving statuses:', err)
      setError('Failed to save statuses: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-green-500" />
            Missing Attendance Review
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review employees without check-ins and store a permanent daily status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Statuses
              </>
            )}
          </Button>
        </div>
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

      {/* Filters & Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Search className="h-4 w-4" />
                Search
              </label>
              <Input
                placeholder="Search by name, code or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant={attendanceFilter === 'missing' ? 'primary' : 'outline'}
                className="w-full"
                onClick={() => setAttendanceFilter(attendanceFilter === 'missing' ? 'all' : 'missing')}
              >
                <Users className="h-4 w-4 mr-2" />
                {attendanceFilter === 'missing' ? 'Only without attendance' : 'All employees'}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = selectedStatuses.includes(opt.value)
                  return (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={active ? 'primary' : 'outline'}
                      onClick={() => {
                        setSelectedStatuses((prev) =>
                          active ? prev.filter((s) => s !== opt.value) : [...prev, opt.value]
                        )
                      }}
                      className="text-xs"
                    >
                      {opt.code} - {opt.label}
                    </Button>
                  )
                })}
                {selectedStatuses.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedStatuses([])}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Department</p>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => {
                  const active = selectedDepartments.includes(dept)
                  return (
                    <Button
                      key={dept}
                      size="sm"
                      variant={active ? 'primary' : 'outline'}
                      onClick={() => {
                        setSelectedDepartments((prev) =>
                          active ? prev.filter((d) => d !== dept) : [...prev, dept]
                        )
                      }}
                      className="text-xs"
                    >
                      {dept}
                    </Button>
                  )
                })}
                {selectedDepartments.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDepartments([])}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Attendance</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'missing', label: 'No attendance' },
                  { value: 'attended', label: 'Attended' }
                ].map((opt) => {
                  const active = attendanceFilter === opt.value
                  return (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={active ? 'primary' : 'outline'}
                      onClick={() => setAttendanceFilter(opt.value as any)}
                      className="text-xs"
                    >
                      {opt.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500">Missing check-in</p>
              <p className="text-xl font-bold text-red-600">{summary.missingCount}</p>
            </div>
            {STATUS_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${opt.color}`}>
                    {opt.code}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">{opt.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {summary.totals[opt.value] || 0}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markMissingAs('absent')}
              title="Mark all without check-in as Absent"
            >
              Mark missing as Absent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markMissingAs('vacation')}
            >
              Mark missing as Vacation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markMissingAs('excused_absent')}
            >
              Mark missing as Excused
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Employees {attendanceFilter === 'missing' ? '(without attendance today)' : ''} ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              No employees found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Employee</th>
                    <th className="text-left p-3">Attendance</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const entry = statusMap[emp.id] || { status: '', notes: '', hasAttendance: false }
                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{emp.name}</p>
                            <p className="text-sm text-gray-500">
                              {emp.employee_code}
                              {emp.department ? ` • ${emp.department}` : ''}
                              {emp.job_title ? ` • ${emp.job_title}` : ''}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          {entry.hasAttendance ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              Already checked in
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                              No attendance
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            value={entry.status}
                            onChange={(e) =>
                              updateStatus(emp.id, { status: e.target.value as StatusValue })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                          >
                            <option value="">Select status</option>
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.code} - {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Optional note"
                            value={entry.notes}
                            onChange={(e) => updateStatus(emp.id, { notes: e.target.value })}
                          />
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
    </div>
  )
}



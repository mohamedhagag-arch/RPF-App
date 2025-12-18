'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Calendar, Clock, UserCheck, TrendingUp, Users, AlertCircle, CheckCircle, MapPin, BarChart3, Settings, Plus, Search, Filter, Download, QrCode } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { supabase, TABLES, AttendanceStats, AttendanceEmployee, AttendanceRecord } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { EmployeesManagement } from './attendance/EmployeesManagement'
import { CheckInOut } from './attendance/CheckInOut'
import { AttendanceReports } from './attendance/AttendanceReports'
import { AttendanceSettings } from './attendance/AttendanceSettings'
import { LocationsManagement } from './attendance/LocationsManagement'
import { QRSettings } from './attendance/QRSettings'

export default function HRAttendance() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<AttendanceStats>({
    total_employees: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    on_time_today: 0,
    attendance_rate: 0,
    average_hours: 0
  })
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'check-in' | 'reports' | 'locations' | 'settings' | 'qr-settings'>('dashboard')
  const router = useRouter()
  const { user } = useAuth()
  const guard = usePermissionGuard()
  
  // Check permissions for different tabs
  const canCheckInOut = guard.hasAccess('hr.attendance.check_in_out')
  const canViewEmployees = guard.hasAccess('hr.attendance.employees.view')
  const canViewReports = guard.hasAccess('hr.attendance.reports.view')
  const canManageSettings = guard.hasAccess('hr.attendance.settings.manage')
  const canManageLocations = guard.hasAccess('hr.attendance.locations.view')
  const canManageQR = guard.hasAccess('hr.attendance.qr.view')

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats()
      fetchRecentAttendance()
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Fetch total employees
      const { data: employees, error: empError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .select('id, status')
        .eq('status', 'Active')

      if (empError) throw empError

      const totalEmployees = employees?.length || 0

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: todayCheckIns, error: attError } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        .select('employee_id, type, is_late')
        .eq('date', today)
        .eq('type', 'Check-In')

      if (attError) throw attError

      const presentToday = todayCheckIns?.length || 0
      const absentToday = totalEmployees - presentToday
      const lateToday = todayCheckIns?.filter((r: any) => r.is_late).length || 0
      const onTimeToday = presentToday - lateToday
      const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0

      // Calculate average hours (simplified - would need check-out data)
      const averageHours = 8.0 // Placeholder

      setStats({
        total_employees: totalEmployees,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
        on_time_today: onTimeToday,
        attendance_rate: attendanceRate,
        average_hours: averageHours
      })
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      // Error will be handled silently or shown in UI
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        .select(`
          *,
          employee:${TABLES.ATTENDANCE_EMPLOYEES}(id, name, employee_code, department)
        `)
        .eq('date', today)
        .order('check_time', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentAttendance(data || [])
    } catch (error: any) {
      console.error('Error fetching recent attendance:', error)
    }
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_employees}</div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present_today}</div>
            <p className="text-xs text-muted-foreground">
              {stats.attendance_rate.toFixed(1)}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent_today}</div>
            <p className="text-xs text-muted-foreground">
              Employees absent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.late_today}</div>
            <p className="text-xs text-muted-foreground">
              {stats.on_time_today} on time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => setActiveTab('check-in')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Clock className="h-6 w-6" />
              <span>Check-In/Out</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setActiveTab('employees')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Users className="h-6 w-6" />
              <span>Manage Employees</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setActiveTab('reports')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAttendance.length > 0 ? (
              recentAttendance.map((record) => {
                const employee = record.employee as any
                return (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        record.type === 'Check-In' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {record.type === 'Check-In' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Clock className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{employee?.name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">
                          {employee?.employee_code || ''} • {employee?.department || ''}
                        </p>
                        <p className="text-xs text-gray-400">
                          {record.check_time} • {record.type}
                          {record.is_late && <span className="text-orange-600 ml-2">(Late)</span>}
                        </p>
                      </div>
                    </div>
                    {record.location_id && (
                      <MapPin className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No attendance records for today</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <PermissionPage
      permission="hr.attendance.view"
      accessDeniedTitle="Attendance Access Required"
      accessDeniedMessage="You need permission to view attendance data. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Attendance" />
      <div className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                <span className="break-words">Attendance Management</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Manage and track employee attendance records
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PermissionButton 
                permission="hr.attendance.reports.export"
                variant="outline" 
                onClick={() => setActiveTab('reports')}
                className="text-xs sm:text-sm"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </PermissionButton>
              <PermissionButton 
                permission="hr.attendance.settings.manage"
                variant="outline" 
                onClick={() => setActiveTab('settings')}
                className="text-xs sm:text-sm"
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </PermissionButton>
            </div>
          </div>

          {/* Tabs */}
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <div className="inline-flex items-center gap-1 sm:gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-1.5 sm:p-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Dashboard
              </button>
              {canViewEmployees && (
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'employees'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Employees
                </button>
              )}
              {canCheckInOut && (
                <button
                  onClick={() => setActiveTab('check-in')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'check-in'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Check-In/Out
                </button>
              )}
              {canViewReports && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'reports'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Reports
                </button>
              )}
              {canManageLocations && (
                <button
                  onClick={() => setActiveTab('locations')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'locations'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Locations
                </button>
              )}
              {canManageSettings && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Settings
                </button>
              )}
              {canManageQR && (
                <button
                  onClick={() => setActiveTab('qr-settings')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'qr-settings'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105 transform'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  QR Settings
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'employees' && <EmployeesManagement />}
            {activeTab === 'check-in' && <CheckInOut />}
            {activeTab === 'reports' && <AttendanceReports />}
            {activeTab === 'locations' && <LocationsManagement />}
            {activeTab === 'settings' && <AttendanceSettings />}
            {activeTab === 'qr-settings' && <QRSettings />}
          </div>
        </div>
      </div>
    </PermissionPage>
  )
}


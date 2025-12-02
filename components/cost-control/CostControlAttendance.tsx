'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Clock, UserCheck, TrendingUp, Users, AlertCircle, CheckCircle, MapPin, BarChart3, Settings, Plus, Search, Filter, Download } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { supabase, TABLES, AttendanceStats, AttendanceEmployee, AttendanceRecord } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { EmployeesManagement } from './attendance/EmployeesManagement'
import { CheckInOut } from './attendance/CheckInOut'
import { AttendanceReports } from './attendance/AttendanceReports'
import { AttendanceSettings } from './attendance/AttendanceSettings'
import { LocationsManagement } from './attendance/LocationsManagement'
import { QRSettings } from './attendance/QRSettings'

export default function CostControlAttendance() {
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
      permission="reports.view"
      accessDeniedTitle="Attendance Access Required"
      accessDeniedMessage="You need permission to view attendance data. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Attendance" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-500" />
                Attendance Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and track employee attendance records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setActiveTab('reports')}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 border-b">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'employees'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => setActiveTab('check-in')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'check-in'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Check-In/Out
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'locations'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Locations
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('qr-settings')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'qr-settings'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              QR Settings
            </button>
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

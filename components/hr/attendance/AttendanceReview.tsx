'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle,
  Save,
  X,
  Loader2,
  ChevronDown,
  Check,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, AttendanceRecord, AttendanceEmployee, AttendanceLocation } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { syncAttendanceToManpower, syncAttendanceDeletionToManpower } from '@/lib/attendanceSync'
import { MissingAttendance } from './MissingAttendance'

export default function AttendanceReview() {
  const { user, appUser } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [locations, setLocations] = useState<AttendanceLocation[]>([])
  const [users, setUsers] = useState<any[]>([]) // Store users data for lookup
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'records' | 'missing'>('records')
  
  // ✅ Group records by employee and date for displaying check-in/out times together
  const groupedRecords = useMemo(() => {
    const grouped: { [key: string]: { employee: any, date: string, checkIn?: AttendanceRecord, checkOut?: AttendanceRecord } } = {}
    
    records.forEach((record: any) => {
      const key = `${record.employee_id}_${record.date}`
      if (!grouped[key]) {
        grouped[key] = {
          employee: record.employee || {},
          date: record.date,
          checkIn: undefined,
          checkOut: undefined
        }
      }
      
      if (record.type === 'Check-In') {
        grouped[key].checkIn = record
      } else if (record.type === 'Check-Out') {
        grouped[key].checkOut = record
      }
    })
    
    return Object.values(grouped)
  }, [records])
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedType, setSelectedType] = useState<'all' | 'Check-In' | 'Check-Out'>('all')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')
  
  // Edit/Add Modal
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    check_out_time: '', // ✅ New field for check-out time
    type: 'Check-In' as 'Check-In' | 'Check-Out',
    location_id: '',
    latitude: '',
    longitude: '',
    notes: ''
  })

  useEffect(() => {
    fetchEmployees()
    fetchUsers()
    fetchRecords()
  }, [])

  useEffect(() => {
    fetchLocationsByDate()
    fetchRecords()
  }, [selectedEmployee, selectedDate, selectedType, selectedLocations])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        // @ts-ignore
        .select('*')
        .eq('status', 'Active')
        .order('name', { ascending: true })

      if (error) throw error
      setEmployees((data || []) as any)
    } catch (err: any) {
      console.error('Error fetching employees:', err)
      setError('Failed to load employees')
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        // @ts-ignore
        .select('id, full_name, email, role')
        // Remove is_active filter to get all users (some might be inactive but still have records)
        // .eq('is_active', true)

      if (error) throw error
      setUsers((data || []) as any)
      console.log('👥 Loaded users:', (data || []).length)
    } catch (err: any) {
      console.error('❌ Error fetching users:', err)
      // Don't show error for users, just log it
    }
  }

  const fetchLocationsByDate = async () => {
    try {
      // First, get all attendance records for the selected date
      let recordsQuery = supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('location_id')
        .not('location_id', 'is', null)

      if (selectedDate) {
        recordsQuery = recordsQuery.eq('date', selectedDate)
      }

      // Apply other filters if needed
      if (selectedEmployee) {
        recordsQuery = recordsQuery.eq('employee_id', selectedEmployee)
      }
      if (selectedType !== 'all') {
        recordsQuery = recordsQuery.eq('type', selectedType)
      }

      const { data: recordsData, error: recordsError } = await recordsQuery

      if (recordsError) throw recordsError

      // Extract unique location IDs from records
      const locationIds = Array.from(
        new Set(
          (recordsData || [])
            .map((r: any) => r.location_id)
            .filter((id: string) => id !== null && id !== undefined)
        )
      )

      // If no locations found in records, set empty array
      if (locationIds.length === 0) {
        setLocations([])
        return
      }

      // Fetch location details for these IDs
      const { data: locationsData, error: locationsError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .select('*')
        .in('id', locationIds)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (locationsError) throw locationsError
      setLocations((locationsData || []) as any)
    } catch (err: any) {
      console.error('Error fetching locations by date:', err)
      setLocations([])
    }
  }

  const fetchRecords = async () => {
    try {
      setLoading(true)
      setError('')
      
      let query = supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select(`
          *,
          created_by,
          updated_by,
          created_at,
          updated_at,
          employee:attendance_employees(*),
          location:attendance_locations(*)
        `)
        .order('date', { ascending: false })
        .order('check_time', { ascending: false })

      // Apply filters
      if (selectedEmployee) {
        query = query.eq('employee_id', selectedEmployee)
      }
      if (selectedDate) {
        query = query.eq('date', selectedDate)
      }
      if (selectedType !== 'all') {
        query = query.eq('type', selectedType)
      }
      if (selectedLocations.length > 0) {
        query = query.in('location_id', selectedLocations)
      }

      const { data, error } = await query

      if (error) throw error

      // ✅ Debug: Check if created_by exists in raw data
      if (data && data.length > 0) {
        const sampleRecord = data[0] as any
        console.log('📊 Raw record sample:', {
          id: sampleRecord.id,
          type: sampleRecord.type,
          created_by: sampleRecord.created_by,
          updated_by: sampleRecord.updated_by,
          hasCreatedBy: 'created_by' in sampleRecord,
          hasUpdatedBy: 'updated_by' in sampleRecord,
          allKeys: Object.keys(sampleRecord)
        })
      }

      // Filter by search term if provided
      let filteredData = (data || []) as any[]
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filteredData = filteredData.filter((record: any) => {
          const employee = record.employee || {}
          return (
            employee.name?.toLowerCase().includes(searchLower) ||
            employee.employee_code?.toLowerCase().includes(searchLower) ||
            record.notes?.toLowerCase().includes(searchLower)
          )
        })
      }

      // Enrich records with user data manually
      const enrichedData = filteredData.map((record: any) => {
        // ✅ Debug: Log created_by value
        if (record.created_by) {
          console.log('🔍 Processing record:', {
            id: record.id,
            type: record.type,
            created_by: record.created_by,
            created_by_type: typeof record.created_by,
            usersAvailable: users.length
          })
        }
        
        let createdByUser = null
        let updatedByUser = null
        
        // Try to find created_by user
        if (record.created_by) {
          // Try exact match first
          createdByUser = users.find((u: any) => u.id === record.created_by) || null
          
          // If not found, try string comparison (in case of type mismatch)
          if (!createdByUser) {
            createdByUser = users.find((u: any) => String(u.id) === String(record.created_by)) || null
          }
          
          if (!createdByUser) {
            console.warn('⚠️ Created By user not found:', {
              created_by: record.created_by,
              created_by_type: typeof record.created_by,
              usersCount: users.length,
              sampleUserIds: users.slice(0, 3).map((u: any) => ({ id: u.id, type: typeof u.id }))
            })
          }
        }
        
        // Try to find updated_by user
        if (record.updated_by) {
          updatedByUser = users.find((u: any) => u.id === record.updated_by) || null
          if (!updatedByUser) {
            updatedByUser = users.find((u: any) => String(u.id) === String(record.updated_by)) || null
          }
        }

        return {
          ...record,
          created_by_user: createdByUser,
          updated_by_user: updatedByUser
        }
      })
      
      // ✅ Debug: Log enriched data sample
      if (enrichedData.length > 0) {
        const sample = enrichedData[0] as any
        console.log('✅ Enriched record sample:', {
          id: sample.id,
          type: sample.type,
          created_by: sample.created_by,
          created_by_user: sample.created_by_user ? {
            id: sample.created_by_user.id,
            name: sample.created_by_user.full_name,
            email: sample.created_by_user.email
          } : 'NOT FOUND',
          updated_by: sample.updated_by,
          updated_by_user: sample.updated_by_user ? 'Found' : 'Not found'
        })
      }

      setRecords(enrichedData as any)
    } catch (err: any) {
      console.error('Error fetching records:', err)
      setError('Failed to load attendance records: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      check_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      check_out_time: '',
      type: 'Check-In',
      location_id: '',
      latitude: '',
      longitude: '',
      notes: ''
    })
    setShowModal(true)
  }

  const handleEdit = async (record: AttendanceRecord) => {
    setEditingRecord(record)
    
    // ✅ Get both check-in and check-out records for this employee on this date
    const { data: allRecordsForDate } = await supabase
      .from(TABLES.ATTENDANCE_RECORDS)
      // @ts-ignore
      .select('*')
      .eq('employee_id', record.employee_id)
      .eq('date', record.date)
      .order('check_time', { ascending: true })
    
    const checkInRecord = allRecordsForDate?.find((r: any) => r.type === 'Check-In') as any
    const checkOutRecord = allRecordsForDate?.find((r: any) => r.type === 'Check-Out') as any
    
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      check_time: (checkInRecord as any)?.check_time || record.check_time,
      check_out_time: (checkOutRecord as any)?.check_time || '',
      type: record.type,
      location_id: record.location_id || '',
      latitude: record.latitude?.toString() || '',
      longitude: record.longitude?.toString() || '',
      notes: record.notes || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      if (!formData.employee_id) {
        setError('Please select an employee')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        setError('User not authenticated. Please log in again.')
        setLoading(false)
        return
      }

      // ✅ Handle both check-in and check-out times
      const checkInData: any = {
        employee_id: formData.employee_id,
        date: formData.date,
        check_time: formData.check_time,
        type: 'Check-In',
        location_id: formData.location_id || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        notes: formData.notes || null,
        is_late: false,
        is_early: false
      }

      let savedCheckIn: AttendanceRecord | null = null
      let savedCheckOut: AttendanceRecord | null = null
      
      if (editingRecord) {
        // ✅ Update or create check-in record
        const { data: existingCheckIn } = await supabase
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .select('*')
          .eq('employee_id', formData.employee_id)
          .eq('date', formData.date)
          .eq('type', 'Check-In')
          .maybeSingle()
        
        if (existingCheckIn) {
          // Update existing check-in
          checkInData.updated_by = currentUserId
          checkInData.updated_at = new Date().toISOString()
          
          const existingCheckInTyped = existingCheckIn as any
          const { data: updatedCheckIn, error: checkInError } = await supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .update(checkInData)
            .eq('id', existingCheckInTyped.id)
            .select()
            .single()
          
          if (checkInError) throw checkInError
          savedCheckIn = updatedCheckIn as AttendanceRecord
        } else {
          // Create new check-in
          checkInData.created_by = currentUserId
          
          const { data: insertedCheckIn, error: checkInError } = await supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .insert([checkInData])
            .select()
            .single()
          
          if (checkInError) throw checkInError
          savedCheckIn = insertedCheckIn as AttendanceRecord
        }
        
        // ✅ Update or create check-out record if time provided
        if (formData.check_out_time) {
          const checkOutData: any = {
            employee_id: formData.employee_id,
            date: formData.date,
            check_time: formData.check_out_time,
            type: 'Check-Out',
            location_id: formData.location_id || null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            notes: formData.notes || null,
            is_late: false,
            is_early: false
          }
          
          const { data: existingCheckOut } = await supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .select('*')
            .eq('employee_id', formData.employee_id)
            .eq('date', formData.date)
            .eq('type', 'Check-Out')
            .maybeSingle()
          
          if (existingCheckOut) {
            // Update existing check-out
            checkOutData.updated_by = currentUserId
            checkOutData.updated_at = new Date().toISOString()
            
            const existingCheckOutTyped = existingCheckOut as any
            const { data: updatedCheckOut, error: checkOutError } = await supabase
              .from(TABLES.ATTENDANCE_RECORDS)
              // @ts-ignore
              .update(checkOutData)
              .eq('id', existingCheckOutTyped.id)
              .select()
              .single()
            
            if (checkOutError) throw checkOutError
            savedCheckOut = updatedCheckOut as AttendanceRecord
          } else {
            // Create new check-out
            checkOutData.created_by = currentUserId
            
            const { data: insertedCheckOut, error: checkOutError } = await supabase
              .from(TABLES.ATTENDANCE_RECORDS)
              // @ts-ignore
              .insert([checkOutData])
              .select()
              .single()
            
            if (checkOutError) throw checkOutError
            savedCheckOut = insertedCheckOut as AttendanceRecord
          }
        } else {
          // Delete check-out if time is empty
          const { data: existingCheckOut } = await supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .select('*')
            .eq('employee_id', formData.employee_id)
            .eq('date', formData.date)
            .eq('type', 'Check-Out')
            .maybeSingle()
          
          if (existingCheckOut) {
            const existingCheckOutTyped = existingCheckOut as any
            await supabase
              .from(TABLES.ATTENDANCE_RECORDS)
              // @ts-ignore
              .delete()
              .eq('id', existingCheckOutTyped.id)
          }
        }
        
        setSuccess('Attendance records updated successfully!')
      } else {
        // Create new check-in record
        checkInData.created_by = currentUserId
        
        const { data: insertedCheckIn, error: checkInError } = await supabase
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .insert([checkInData])
          .select()
          .single()
        
        if (checkInError) throw checkInError
        savedCheckIn = insertedCheckIn as AttendanceRecord
        
        // Create check-out record if time provided
        if (formData.check_out_time) {
          const checkOutData: any = {
            employee_id: formData.employee_id,
            date: formData.date,
            check_time: formData.check_out_time,
            type: 'Check-Out',
            location_id: formData.location_id || null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            notes: formData.notes || null,
            is_late: false,
            is_early: false,
            created_by: currentUserId
          }
          
          const { data: insertedCheckOut, error: checkOutError } = await supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .insert([checkOutData])
            .select()
            .single()
          
          if (checkOutError) throw checkOutError
          savedCheckOut = insertedCheckOut as AttendanceRecord
        }
        
        setSuccess('Attendance records added successfully!')
      }
      
      const savedRecord = savedCheckOut || savedCheckIn

      // ✅ Sync to MANPOWER table
      if (savedRecord) {
        const employee = employees.find(emp => emp.id === savedRecord!.employee_id)
        if (employee) {
          // Get all records for this employee on this date
          const { data: allRecordsForDate } = await supabase
            .from(TABLES.ATTENDANCE_RECORDS)
            // @ts-ignore
            .select('*')
            .eq('employee_id', employee.id)
            .eq('date', savedRecord.date)
            .order('check_time', { ascending: true })
          
          if (allRecordsForDate && allRecordsForDate.length > 0) {
            const checkInRecords = allRecordsForDate.filter((r: any) => r.type === 'Check-In')
            const checkOutRecords = allRecordsForDate.filter((r: any) => r.type === 'Check-Out')
            
            if (checkInRecords.length > 0 && checkOutRecords.length > 0) {
              // Use the latest check-in and check-out
              const latestCheckIn = checkInRecords[checkInRecords.length - 1] as AttendanceRecord
              const latestCheckOut = checkOutRecords[checkOutRecords.length - 1] as AttendanceRecord
              
              const syncResult = await syncAttendanceToManpower(
                latestCheckOut,
                employee,
                latestCheckIn,
                latestCheckOut
              )
              
              if (syncResult.success) {
                console.log('✅ Synced to MANPOWER:', syncResult.message)
              } else {
                console.warn('⚠️ MANPOWER sync warning:', syncResult.message)
              }
            }
          }
        }
      }

      setShowModal(false)
      await fetchRecords()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save record: ' + err.message)
      console.error('Error saving record:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
      return
    }

    const recordToDelete = records.find(r => r.id === id)
    if (!recordToDelete) return
    
    const employee = employees.find(emp => emp.id === recordToDelete.employee_id)
    if (!employee) return

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const { error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      // ✅ Sync deletion to MANPOWER
      const syncResult = await syncAttendanceDeletionToManpower(
        employee.employee_code,
        recordToDelete.date
      )
      
      if (syncResult.success) {
        console.log('✅ Synced deletion to MANPOWER:', syncResult.message)
      } else {
        console.warn('⚠️ MANPOWER sync warning:', syncResult.message)
      }

      setSuccess('Attendance record deleted successfully!')
      await fetchRecords()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete record: ' + err.message)
      console.error('Error deleting record:', err)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Filtered grouped records (calculated in the table rendering)
  // Note: We now use groupedRecords instead of filteredRecords

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showLocationDropdown && !target.closest('.location-dropdown-container')) {
        setShowLocationDropdown(false)
      }
      if (showEmployeeDropdown && !target.closest('.employee-dropdown-container')) {
        setShowEmployeeDropdown(false)
        setEmployeeSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLocationDropdown, showEmployeeDropdown])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Attendance Review</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and manage employee attendance records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'records'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Records
            </button>
            <button
              onClick={() => setActiveTab('missing')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'missing'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Missing Attendance
            </button>
          </div>
          {activeTab === 'records' && (
            <PermissionButton
              permission="hr.attendance.review"
              onClick={handleAdd}
              className="flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Record
            </PermissionButton>
          )}
        </div>
      </div>

      {activeTab === 'records' ? (
        <>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="relative employee-dropdown-container">
                  <label className="block text-sm font-medium mb-2">Employee</label>
                  <button
                    type="button"
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm">
                      {selectedEmployee 
                        ? employees.find(e => e.id === selectedEmployee)?.name || 'Selected Employee'
                        : 'All Employees'}
                    </span>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${showEmployeeDropdown ? 'transform rotate-180' : ''}`}
                    />
                  </button>
                  
                  {showEmployeeDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search employee..."
                            value={employeeSearchTerm}
                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-80">
                        <div
                          onClick={() => {
                            setSelectedEmployee('')
                            setShowEmployeeDropdown(false)
                            setEmployeeSearchTerm('')
                          }}
                          className={`px-3 py-2 cursor-pointer transition-colors ${
                            selectedEmployee === ''
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              selectedEmployee === ''
                                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedEmployee === '' && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">All Employees</span>
                          </div>
                        </div>
                        {employees
                          .filter((emp) => {
                            if (!employeeSearchTerm) return true
                            const searchLower = employeeSearchTerm.toLowerCase()
                            return (
                              emp.name?.toLowerCase().includes(searchLower) ||
                              emp.employee_code?.toLowerCase().includes(searchLower) ||
                              emp.job_title?.toLowerCase().includes(searchLower) ||
                              emp.department?.toLowerCase().includes(searchLower)
                            )
                          })
                          .map((emp) => {
                            const isSelected = selectedEmployee === emp.id
                            return (
                              <div
                                key={emp.id}
                                onClick={() => {
                                  setSelectedEmployee(emp.id)
                                  setShowEmployeeDropdown(false)
                                  setEmployeeSearchTerm('')
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
                                    <p className="text-sm font-medium">{emp.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {emp.employee_code}
                                      {emp.job_title && ` • ${emp.job_title}`}
                                      {emp.department && ` • ${emp.department}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        {employees.filter((emp) => {
                          if (!employeeSearchTerm) return false
                          const searchLower = employeeSearchTerm.toLowerCase()
                          return (
                            emp.name?.toLowerCase().includes(searchLower) ||
                            emp.employee_code?.toLowerCase().includes(searchLower) ||
                            emp.job_title?.toLowerCase().includes(searchLower) ||
                            emp.department?.toLowerCase().includes(searchLower)
                          )
                        }).length === 0 && employeeSearchTerm && (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No employees found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Types</option>
                    <option value="Check-In">Check-In</option>
                    <option value="Check-Out">Check-Out</option>
                  </select>
                </div>

                <div className="relative location-dropdown-container">
                  <label className="block text-sm font-medium mb-2">
                    Location(s) 
                    {selectedLocations.length > 0 && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-1">
                        ({selectedLocations.length} selected)
                      </span>
                    )}
                  </label>
                  {locations.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-3 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <MapPin className="h-4 w-4 inline-block mr-2 opacity-50" />
                      No locations found for the selected date
                      {selectedDate && (
                        <span className="block text-xs mt-1">
                          No attendance records on {new Date(selectedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-sm">
                          {selectedLocations.length === 0
                            ? 'Select locations...'
                            : `${selectedLocations.length} location(s) selected`}
                        </span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${showLocationDropdown ? 'transform rotate-180' : ''}`}
                        />
                      </button>
                      
                      {showLocationDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2">
                            {locations.map((loc) => {
                              const isSelected = selectedLocations.includes(loc.id)
                              return (
                                <div
                                  key={loc.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedLocations(selectedLocations.filter(id => id !== loc.id))
                                    } else {
                                      setSelectedLocations([...selectedLocations, loc.id])
                                    }
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                    isSelected
                                      ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm flex-1">{loc.name}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {selectedLocations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedLocations.map((locId) => {
                            const loc = locations.find(l => l.id === locId)
                            return loc ? (
                              <span
                                key={locId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium"
                              >
                                <MapPin className="h-3 w-3" />
                                {loc.name}
                                <button
                                  onClick={() => setSelectedLocations(selectedLocations.filter(id => id !== locId))}
                                  className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                                  type="button"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null
                          })}
                          <button
                            onClick={() => setSelectedLocations([])}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                            type="button"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Records Table */}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({groupedRecords.filter((group: any) => {
            // Apply filters to count grouped records
            if (selectedEmployee && group.employee.id !== selectedEmployee) return false
            if (selectedDate && group.date !== selectedDate) return false
            if (selectedType !== 'all') {
              if (selectedType === 'Check-In' && !group.checkIn) return false
              if (selectedType === 'Check-Out' && !group.checkOut) return false
            }
            if (selectedLocations.length > 0) {
              const hasLocation = (group.checkIn?.location_id && selectedLocations.includes(group.checkIn.location_id)) ||
                                (group.checkOut?.location_id && selectedLocations.includes(group.checkOut.location_id))
              if (!hasLocation) return false
            }
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase()
              const matchesEmployee = group.employee.name?.toLowerCase().includes(searchLower) ||
                                    group.employee.employee_code?.toLowerCase().includes(searchLower)
              if (!matchesEmployee) return false
            }
            return true
          }).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : groupedRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold">Employee</th>
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-left p-3 font-semibold">Check-In / Check-Out Time</th>
                    <th className="text-left p-3 font-semibold">Location & Coordinates</th>
                    <th className="text-left p-3 font-semibold">Notes</th>
                    <th className="text-left p-3 font-semibold">Created By</th>
                    <th className="text-left p-3 font-semibold">Updated By</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRecords
                    .filter((group: any) => {
                      // Apply filters to grouped records
                      if (selectedEmployee && group.employee.id !== selectedEmployee) return false
                      if (selectedDate && group.date !== selectedDate) return false
                      if (selectedType !== 'all') {
                        if (selectedType === 'Check-In' && !group.checkIn) return false
                        if (selectedType === 'Check-Out' && !group.checkOut) return false
                      }
                      if (selectedLocations.length > 0) {
                        const hasLocation = (group.checkIn?.location_id && selectedLocations.includes(group.checkIn.location_id)) ||
                                          (group.checkOut?.location_id && selectedLocations.includes(group.checkOut.location_id))
                        if (!hasLocation) return false
                      }
                      if (searchTerm) {
                        const searchLower = searchTerm.toLowerCase()
                        const matchesEmployee = group.employee.name?.toLowerCase().includes(searchLower) ||
                                              group.employee.employee_code?.toLowerCase().includes(searchLower)
                        if (!matchesEmployee) return false
                      }
                      return true
                    })
                    .map((group: any) => {
                      const employee = group.employee || {}
                      const checkInLocation = group.checkIn?.location || {}
                      const checkOutLocation = group.checkOut?.location || {}
                      const location = checkInLocation.name ? checkInLocation : checkOutLocation
                      
                      return (
                        <tr 
                          key={`${group.employee.id}_${group.date}`} 
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{employee.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{employee.employee_code || ''}</p>
                            </div>
                          </td>
                          <td className="p-3">{group.date}</td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              {group.checkIn ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                    In: {group.checkIn.check_time}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No Check-In</span>
                              )}
                              {group.checkOut ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    Out: {group.checkOut.check_time}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No Check-Out</span>
                              )}
                            </div>
                          </td>
                        <td className="p-3">
                          {location.name || (group.checkIn?.latitude && group.checkIn?.longitude) || (group.checkOut?.latitude && group.checkOut?.longitude) ? (
                            <div className="flex flex-col gap-2">
                              {location.name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-indigo-500" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {location.name}
                                  </span>
                                </div>
                              )}
                              {(group.checkIn?.latitude && group.checkIn?.longitude) || (group.checkOut?.latitude && group.checkOut?.longitude) ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                    {(group.checkIn?.latitude || group.checkOut?.latitude)?.toFixed(6)}, {(group.checkIn?.longitude || group.checkOut?.longitude)?.toFixed(6)}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const lat = group.checkIn?.latitude || group.checkOut?.latitude
                                      const lng = group.checkIn?.longitude || group.checkOut?.longitude
                                      if (lat && lng) {
                                        const url = `https://www.google.com/maps?q=${lat},${lng}`
                                        window.open(url, '_blank', 'noopener,noreferrer')
                                      }
                                    }}
                                    className="h-7 px-2 text-xs flex items-center gap-1"
                                    title="Open in Google Maps"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Open Map
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {group.checkIn?.notes || group.checkOut?.notes || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          {(() => {
                            // ✅ Get created_by from check-in (first record created)
                            const checkInRecord = group.checkIn as any
                            const checkOutRecord = group.checkOut as any
                            
                            // Prefer check-in for created_by (it's the first record)
                            const createdById = checkInRecord?.created_by || checkOutRecord?.created_by
                            
                            // Try to find user from enriched data first
                            let createdByUser = checkInRecord?.created_by_user || checkOutRecord?.created_by_user
                            
                            // If not found, search in users array
                            if (!createdByUser && createdById && users.length > 0) {
                              createdByUser = users.find((u: any) => u.id === createdById) || null
                            }
                            
                            // Debug logging (can be removed later)
                            if (!createdByUser && createdById) {
                              console.log('🔍 Created By Debug:', {
                                createdById,
                                usersCount: users.length,
                                checkInCreatedBy: checkInRecord?.created_by,
                                checkOutCreatedBy: checkOutRecord?.created_by,
                                hasCheckIn: !!checkInRecord,
                                hasCheckOut: !!checkOutRecord
                              })
                            }
                            
                            return createdByUser ? (
                              <div className="text-sm">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {createdByUser.full_name || createdByUser.email || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {createdByUser.role || 'N/A'}
                                </p>
                                {(checkInRecord?.created_at || checkOutRecord?.created_at) && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {new Date(checkInRecord?.created_at || checkOutRecord?.created_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            ) : createdById ? (
                              <div className="text-sm">
                                <p className="font-medium text-gray-900 dark:text-white text-yellow-600 dark:text-yellow-400">
                                  User ID: {createdById.substring(0, 8)}...
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  User not found in system
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )
                          })()}
                        </td>
                        <td className="p-3">
                          {(() => {
                            // Get updated_by_user from check-in or check-out, prefer check-out (most recent)
                            const updatedByUser = group.checkOut?.updated_by_user || group.checkIn?.updated_by_user
                            // If not found in enriched data, try to find from users array
                            const updatedById = group.checkOut?.updated_by || group.checkIn?.updated_by
                            const userFromArray = updatedById ? users.find((u: any) => u.id === updatedById) : null
                            const finalUpdatedBy = updatedByUser || userFromArray
                            
                            return finalUpdatedBy ? (
                              <div className="text-sm">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {finalUpdatedBy.full_name || finalUpdatedBy.email || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {finalUpdatedBy.role || 'N/A'}
                                </p>
                                {(group.checkOut?.updated_at || group.checkIn?.updated_at) && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {new Date(group.checkOut?.updated_at || group.checkIn?.updated_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )
                          })()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <PermissionButton
                              permission="hr.attendance.review"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(group.checkIn || group.checkOut)}
                              className="h-10 w-10 p-0 flex items-center justify-center"
                              title="Edit Record"
                            >
                              <Edit className="h-5 w-5" />
                            </PermissionButton>
                            {(group.checkIn || group.checkOut) && (
                              <PermissionButton
                                permission="hr.attendance.review"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (group.checkIn) handleDelete(group.checkIn.id)
                                  if (group.checkOut) handleDelete(group.checkOut.id)
                                }}
                                className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                                title="Delete Record"
                              >
                                <Trash2 className="h-5 w-5" />
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
                  {editingRecord ? 'Edit Attendance Record' : 'Add Attendance Record'}
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
                  <label className="block text-sm font-medium mb-2">Employee *</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-green-500" />
                        Check-In Time *
                      </span>
                    </label>
                    <input
                      type="time"
                      value={formData.check_time}
                      onChange={(e) => setFormData({ ...formData, check_time: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Check-Out Time
                      </span>
                    </label>
                    <input
                      type="time"
                      value={formData.check_out_time}
                      onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 30.0444"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., 31.2357"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Additional notes..."
                  />
                </div>

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
                        {editingRecord ? 'Update' : 'Add'} Record
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <MissingAttendance />
      )}
    </div>
  )
}


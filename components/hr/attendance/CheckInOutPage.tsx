'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  User, 
  Calendar,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff,
  Navigation,
  CheckSquare,
  Square,
  History,
  AlertCircle,
  Loader2,
  Camera,
  CameraOff,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, AttendanceEmployee, AttendanceRecord, AttendanceLocation } from '@/lib/supabase'
import { QRCodeScanner } from './QRCodeScanner'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

export default function CheckInOutPage() {
  // State Management
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  
  // Employee & Data
  const [selectedEmployee, setSelectedEmployee] = useState<AttendanceEmployee | null>(null)
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [locations, setLocations] = useState<AttendanceLocation[]>([])
  const [nearestLocation, setNearestLocation] = useState<AttendanceLocation | null>(null)
  
  // UI State
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrCheckType, setQrCheckType] = useState<'Check-In' | 'Check-Out'>('Check-In')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  
  // Refs
  const locationWatchId = useRef<number | null>(null)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize
  useEffect(() => {
    // Update time every second
    timeIntervalRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load initial data
    loadEmployees()
    loadLocations()
    getCurrentLocation()

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current)
      if (locationWatchId.current) navigator.geolocation.clearWatch(locationWatchId.current)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load today's records when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      loadTodayRecords(selectedEmployee.id)
    }
  }, [selectedEmployee])

  // Update nearest location when location changes
  useEffect(() => {
    if (location && locations.length > 0) {
      findNearestLocation()
    }
  }, [location, locations])

  // Functions
  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        // @ts-ignore
        .select('*')
        .eq('status', 'Active')
        .order('name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (err: any) {
      console.error('Error loading employees:', err)
      setErrorMessage('Failed to load employees')
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setLocations(data || [])
    } catch (err: any) {
      console.error('Error loading locations:', err)
    }
  }

  const loadTodayRecords = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .order('check_time', { ascending: true })

      if (error) throw error
      setTodayRecords(data || [])
    } catch (err: any) {
      console.error('Error loading today records:', err)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          timestamp: Date.now()
        })
        setIsGettingLocation(false)
      },
      (error) => {
        setLocationError(`Location error: ${error.message}`)
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    // Watch position for continuous updates
    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          timestamp: Date.now()
        })
      },
      (error) => {
        console.error('Location watch error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  const findNearestLocation = () => {
    if (!location || locations.length === 0) return

    let nearest: AttendanceLocation | null = null
    let minDistance = Infinity

    locations.forEach((loc) => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        Number(loc.latitude),
        Number(loc.longitude)
      )
      if (distance < minDistance && distance <= (loc.radius_meters || 100)) {
        minDistance = distance
        nearest = loc
      }
    })

    setNearestLocation(nearest)
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleCheckIn = async () => {
    if (!selectedEmployee) {
      setErrorMessage('Please select an employee')
      return
    }

    if (!location) {
      setErrorMessage('Please enable location services')
      return
    }

    setCheckingIn(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0].substring(0, 5)

      // Check if already checked in today
      const existingCheckIn = todayRecords.find(att => att.type === 'Check-In')
      if (existingCheckIn) {
        setErrorMessage('You have already checked in today')
        setCheckingIn(false)
        return
      }

      const record = {
        employee_id: selectedEmployee.id,
        date: today,
        check_time: checkTime,
        type: 'Check-In' as const,
        latitude: location.latitude,
        longitude: location.longitude,
        location_id: nearestLocation?.id || null,
        notes: nearestLocation ? `Checked in at ${nearestLocation.name}` : null
      }

      const { error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .insert(record)

      if (error) throw error

      setSuccessMessage(`✅ Check-In successful at ${checkTime}`)
      await loadTodayRecords(selectedEmployee.id)
      
      // Clear message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setErrorMessage('Failed to check in: ' + err.message)
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    if (!selectedEmployee) {
      setErrorMessage('Please select an employee')
      return
    }

    if (!location) {
      setErrorMessage('Please enable location services')
      return
    }

    setCheckingOut(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0].substring(0, 5)

      // Check if checked in today
      const checkIn = todayRecords.find(att => att.type === 'Check-In')
      if (!checkIn) {
        setErrorMessage('Please check in first')
        setCheckingOut(false)
        return
      }

      // Check if already checked out
      const existingCheckOut = todayRecords.find(att => att.type === 'Check-Out')
      if (existingCheckOut) {
        setErrorMessage('You have already checked out today')
        setCheckingOut(false)
        return
      }

      // Calculate work duration
      const [checkInHour, checkInMinute] = checkIn.check_time.split(':').map(Number)
      const [checkOutHour, checkOutMinute] = checkTime.split(':').map(Number)
      const checkInMinutes = checkInHour * 60 + checkInMinute
      const checkOutMinutes = checkOutHour * 60 + checkOutMinute
      const workDuration = (checkOutMinutes - checkInMinutes) / 60

      const record = {
        employee_id: selectedEmployee.id,
        date: today,
        check_time: checkTime,
        type: 'Check-Out' as const,
        latitude: location.latitude,
        longitude: location.longitude,
        location_id: nearestLocation?.id || null,
        work_duration_hours: workDuration > 0 ? workDuration : null,
        notes: nearestLocation ? `Checked out at ${nearestLocation.name}` : null
      }

      const { error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .insert(record)

      if (error) throw error

      setSuccessMessage(`✅ Check-Out successful at ${checkTime}. Work duration: ${workDuration.toFixed(2)} hours`)
      await loadTodayRecords(selectedEmployee.id)
      
      // Clear message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setErrorMessage('Failed to check out: ' + err.message)
    } finally {
      setCheckingOut(false)
    }
  }

  const handleQRScanSuccess = async (employee: AttendanceEmployee) => {
    try {
      // Set the employee
      setSelectedEmployee(employee)
      
      // Don't close the scanner - keep it open for continuous scanning
      // setShowQRScanner(false) // Commented out for continuous scanning
      
      // Automatically perform check-in or check-out based on qrCheckType
      if (qrCheckType === 'Check-In') {
        // Auto check-in
        await handleCheckInForEmployee(employee)
      } else {
        // Auto check-out
        await handleCheckOutForEmployee(employee)
      }
    } catch (error: any) {
      console.error('Error in QR scan success:', error)
      setErrorMessage('Failed to process QR scan: ' + error.message)
    }
  }

  const handleCheckInForEmployee = async (employee: AttendanceEmployee) => {
    if (!location) {
      setErrorMessage('Please enable location services')
      return
    }

    setCheckingIn(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0].substring(0, 5)

      // Check if already checked in today
      const { data: existingRecords } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .eq('type', 'Check-In')

      if (existingRecords && existingRecords.length > 0) {
        setSuccessMessage(`✅ ${employee.name} - Already checked in today at ${existingRecords[0].check_time}`)
        setCheckingIn(false)
        setTimeout(() => setSuccessMessage(''), 3000)
        return
      }

      const record = {
        employee_id: employee.id,
        date: today,
        check_time: checkTime,
        type: 'Check-In' as const,
        latitude: location.latitude,
        longitude: location.longitude,
        location_id: nearestLocation?.id || null,
        notes: `Auto check-in via QR code`
      }

      const { error: insertError } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .insert([record])

      if (insertError) throw insertError

      setSuccessMessage(`✅ ${employee.name} - Checked in successfully at ${checkTime}`)
      await loadTodayRecords(employee.id)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setErrorMessage(`Failed to check in ${employee.name}: ` + err.message)
      console.error('Check-in error:', err)
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOutForEmployee = async (employee: AttendanceEmployee) => {
    if (!location) {
      setErrorMessage('Please enable location services')
      return
    }

    setCheckingOut(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0].substring(0, 5)

      // Get today's check-in
      const { data: checkInRecord } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .eq('type', 'Check-In')
        .single()

      if (!checkInRecord) {
        setErrorMessage(`❌ ${employee.name} - Must check in first before checking out`)
        setCheckingOut(false)
        setTimeout(() => setErrorMessage(''), 3000)
        return
      }

      // Check if already checked out today
      const { data: existingCheckOut } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .eq('type', 'Check-Out')
        .single()

      if (existingCheckOut) {
        setSuccessMessage(`✅ ${employee.name} - Already checked out today at ${existingCheckOut.check_time}`)
        setCheckingOut(false)
        setTimeout(() => setSuccessMessage(''), 3000)
        return
      }

      // Calculate work hours
      const checkInTime = new Date(`${today}T${checkInRecord.check_time}:00`)
      const checkOutTime = new Date(`${today}T${checkTime}:00`)
      const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

      const record = {
        employee_id: employee.id,
        date: today,
        check_time: checkTime,
        type: 'Check-Out' as const,
        latitude: location.latitude,
        longitude: location.longitude,
        location_id: nearestLocation?.id || null,
        work_duration_hours: Math.max(0, workHours.toFixed(2)),
        notes: `Auto check-out via QR code`
      }

      const { error: insertError } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .insert([record])

      if (insertError) throw insertError

      setSuccessMessage(`✅ ${employee.name} - Checked out successfully at ${checkTime} (${workHours.toFixed(2)}h worked)`)
      await loadTodayRecords(employee.id)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setErrorMessage(`Failed to check out ${employee.name}: ` + err.message)
      console.error('Check-out error:', err)
    } finally {
      setCheckingOut(false)
    }
  }

  const getTodayStats = () => {
    if (!selectedEmployee || todayRecords.length === 0) {
      return { hasCheckIn: false, hasCheckOut: false, workHours: 0 }
    }

    const checkIn = todayRecords.find(r => r.type === 'Check-In')
    const checkOut = todayRecords.find(r => r.type === 'Check-Out')
    const workHours = checkOut?.work_duration_hours || 0

    return {
      hasCheckIn: !!checkIn,
      hasCheckOut: !!checkOut,
      workHours: workHours
    }
  }

  const stats = getTodayStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Check-In / Check-Out
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Record your attendance with GPS location tracking
          </p>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Online Status */}
          <Card className="border-2 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <Wifi className="h-6 w-6 text-green-500" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connection</p>
                    <p className="font-semibold text-lg">{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Status */}
          <Card className="border-2 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {location ? (
                    <MapPin className="h-6 w-6 text-green-500" />
                  ) : (
                    <MapPin className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                    <p className="font-semibold text-lg">
                      {location ? 'Active' : 'Not Available'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Nearest Location */}
          <Card className="border-2 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Navigation className="h-6 w-6 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nearest Location</p>
                  <p className="font-semibold text-lg truncate">
                    {nearestLocation ? nearestLocation.name : 'Not in range'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Time & Employee Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Time Card */}
            <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Current Time</h2>
                  </div>
                  <div className="text-6xl md:text-7xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    {formatDate(currentTime)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Selection */}
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Select Employee
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setQrCheckType('Check-In')
                      setShowQRScanner(true)
                    }}
                    className="gap-3 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <QrCode className="h-7 w-7" />
                    <span className="font-bold text-base">Scan QR</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === e.target.value)
                    setSelectedEmployee(emp || null)
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code})
                    </option>
                  ))}
                </select>

                {selectedEmployee && (
                  <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{selectedEmployee.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedEmployee.employee_code} • {selectedEmployee.department || 'No Department'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-In/Out Actions */}
            {selectedEmployee && (
              <Card className="border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Attendance Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={handleCheckIn}
                      disabled={checkingIn || checkingOut || stats.hasCheckIn}
                      className="h-16 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {checkingIn ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Checking In...
                        </>
                      ) : stats.hasCheckIn ? (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Already Checked In
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Check In
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleCheckOut}
                      disabled={checkingIn || checkingOut || !stats.hasCheckIn || stats.hasCheckOut}
                      className="h-16 text-lg font-semibold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {checkingOut ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Checking Out...
                        </>
                      ) : stats.hasCheckOut ? (
                        <>
                          <XCircle className="h-5 w-5 mr-2" />
                          Already Checked Out
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 mr-2" />
                          Check Out
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats & History */}
          <div className="space-y-6">
            {/* Today's Stats */}
            {selectedEmployee && (
              <Card className="border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Today's Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Check-In</span>
                    <span className="font-bold text-lg">
                      {stats.hasCheckIn ? (
                        <span className="text-green-600 dark:text-green-400">✓ Done</span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Check-Out</span>
                    <span className="font-bold text-lg">
                      {stats.hasCheckOut ? (
                        <span className="text-red-600 dark:text-red-400">✓ Done</span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </span>
                  </div>
                  {stats.workHours > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Work Hours</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {stats.workHours.toFixed(2)}h
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Today's History */}
            {selectedEmployee && todayRecords.length > 0 && (
              <Card className="border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Today's History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayRecords.map((record, index) => (
                      <div
                        key={record.id || index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          {record.type === 'Check-In' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-semibold">{record.type}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {record.check_time}
                            </p>
                          </div>
                        </div>
                        {record.work_duration_hours && (
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {record.work_duration_hours.toFixed(2)}h
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <Alert variant="success" className="animate-in slide-in-from-top-5">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="animate-in slide-in-from-top-5">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </Alert>
        )}

        {locationError && (
          <Alert variant="warning" className="animate-in slide-in-from-top-5">
            <AlertCircle className="h-4 w-4" />
            {locationError}
          </Alert>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Scan QR Code
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQRScanner(false)}
                  className="rounded-full"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              <QRCodeScanner
                onScanSuccess={handleQRScanSuccess}
                onClose={() => setShowQRScanner(false)}
                checkType={qrCheckType}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


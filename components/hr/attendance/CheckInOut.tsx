'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Clock, MapPin, CheckCircle, AlertCircle, Wifi, WifiOff, 
  Loader2, Calendar, UserCheck, Navigation, QrCode
} from 'lucide-react'
import { supabase, TABLES, AttendanceEmployee, AttendanceLocation } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { QRCodeScanner } from './QRCodeScanner'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

export function CheckInOut() {
  const guard = usePermissionGuard()
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [notes, setNotes] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [locations, setLocations] = useState<AttendanceLocation[]>([])
  const [todayAttendance, setTodayAttendance] = useState<any[]>([])
  const [lastCheckInTime, setLastCheckInTime] = useState<string | null>(null)
  const [openSessionStart, setOpenSessionStart] = useState<string | null>(null)
  const [nearestLocation, setNearestLocation] = useState<AttendanceLocation | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrCheckType, setQrCheckType] = useState<'Check-In' | 'Check-Out'>('Check-In')

  const { user } = useAuth()
  
  // Check permission
  const canCheckInOut = guard.hasAccess('hr.attendance.check_in_out')

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Get current location
    getCurrentLocation()

    // Load employees and locations
    fetchEmployees()
    fetchLocations()
    fetchTodayAttendance()

    return () => {
      clearInterval(timeInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (location && locations.length > 0) {
      findNearestLocation()
    }
  }, [location, locations])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .select('*')
        .eq('status', 'Active')
        .order('name')

      if (error) throw error
      setEmployees(data || [])
      if (data && data.length > 0 && !selectedEmployee) {
        setSelectedEmployee((data[0] as any).id)
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err)
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setLocations(data || [])
    } catch (err: any) {
      console.error('Error fetching locations:', err)
    }
  }

  const fetchTodayAttendance = async () => {
    if (!selectedEmployee) return
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('date', today)
        .order('check_time', { ascending: true })

      if (error) throw error
      const rows = data || []
      setTodayAttendance(rows)
      const lastIn = ([...rows] as any[]).filter((r: any) => r.type === 'Check-In').pop() as any
      setLastCheckInTime(lastIn?.check_time || null)

      const ins = rows.filter((r: any) => r.type === 'Check-In')
      const outs = rows.filter((r: any) => r.type === 'Check-Out')
      if (ins.length > outs.length) {
        const open: any = ins[ins.length - 1]
        setOpenSessionStart(open?.check_time || null)
      } else {
        setOpenSessionStart(null)
      }
    } catch (err: any) {
      console.error('Error fetching today attendance:', err)
    }
  }

  useEffect(() => {
    if (selectedEmployee) {
      fetchTodayAttendance()
    }
  }, [selectedEmployee])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser does not support geolocation')
      return
    }

    setLoading(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        }
        setLocation(locationData)
        setLoading(false)
      },
      (error) => {
        let errorMessage = 'Error getting location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timeout'
            break
        }
        setLocationError(errorMessage)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
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

    locations.forEach(loc => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        Number(loc.latitude),
        Number(loc.longitude)
      )
      if (distance < minDistance && distance <= loc.radius_meters) {
        minDistance = distance
        nearest = loc
      }
    })

    setNearestLocation(nearest)
  }

  const checkIfLate = (checkTime: string): boolean => {
    // Get work start time from settings (default 08:30)
    const workStartTime = '08:30:00'
    const [workHour, workMinute] = workStartTime.split(':').map(Number)
    const [checkHour, checkMinute] = checkTime.split(':').map(Number)
    
    const workTime = workHour * 60 + workMinute
    const checkTimeMinutes = checkHour * 60 + checkMinute
    
    // Allow 15 minutes grace period
    return checkTimeMinutes > workTime + 15
  }

  const handleCheckIn = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee')
      return
    }

    if (!location) {
      alert('Please enable location services')
      return
    }

    setCheckingIn(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0]

      const ins = todayAttendance.filter(att => att.type === 'Check-In')
      const outs = todayAttendance.filter(att => att.type === 'Check-Out')
      const hasOpenSession = ins.length > outs.length

      if (hasOpenSession) {
        alert('You already have an open check-in. Please check out first.')
        setCheckingIn(false)
        return
      }

      const isLate = checkIfLate(checkTime)

      // @ts-ignore - Attendance tables not in Supabase types yet
      const { error } = await (supabase
        .from(TABLES.ATTENDANCE_RECORDS) as any)
        .insert([{
          employee_id: selectedEmployee,
          check_time: checkTime,
          date: today,
          type: 'Check-In',
          location_id: nearestLocation?.id || null,
          latitude: location.latitude,
          longitude: location.longitude,
          notes: notes || null,
          is_late: isLate,
          is_early: false
        }])

      if (error) throw error

      alert('Check-in successful!')
      setNotes('')
      fetchTodayAttendance()
    } catch (err: any) {
      alert('Failed to check in: ' + err.message)
      console.error('Error checking in:', err)
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee')
      return
    }

    if (!location) {
      alert('Please enable location services')
      return
    }

    setCheckingOut(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0]

      // Get ordered lists
      const checkInsToday = todayAttendance.filter(att => att.type === 'Check-In')
      const checkOutsToday = todayAttendance.filter(att => att.type === 'Check-Out')
      const hasOpenSession = checkInsToday.length > checkOutsToday.length
      const lastCheckIn = checkInsToday[checkInsToday.length - 1]

      if (!lastCheckIn || !hasOpenSession) {
        alert('Please check in first (or you already checked out this session)')
        setCheckingOut(false)
        return
      }

      // Enforce min 60 minutes since last check-in
      const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
      const [inHour, inMinute] = lastCheckIn.check_time.split(':').map(Number)
      const inMinutes = inHour * 60 + inMinute
      if (nowMinutes - inMinutes < 60) {
        alert('Check-Out is allowed after at least 60 minutes from the last Check-In')
        setCheckingOut(false)
        return
      }

      // Prevent duplicate checkout for same last check-in (if already checked out after that check-in)
      const lastCheckOut = checkOutsToday[checkOutsToday.length - 1]
      if (lastCheckOut) {
        const [outHPrev, outMPrev] = lastCheckOut.check_time.split(':').map(Number)
        const prevOutMinutes = outHPrev * 60 + outMPrev
        if (prevOutMinutes >= inMinutes) {
          alert('You already checked out for the latest check-in session')
          setCheckingOut(false)
          return
        }
      }

      // Calculate work duration based on this session only
      const [outHour, outMinute] = checkTime.split(':').map(Number)
      const outMinutes = outHour * 60 + outMinute
      const workDurationHours = Math.max(0, (outMinutes - inMinutes) / 60)

      const workEndTime = '17:00:00'
      const [endHour, endMinute] = workEndTime.split(':').map(Number)
      const endMinutes = endHour * 60 + endMinute
      const isEarly = outMinutes < endMinutes - 15

      const { error } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore - Attendance tables not in Supabase types yet
        .insert([{
          employee_id: selectedEmployee,
          check_time: checkTime,
          date: today,
          type: 'Check-Out',
          location_id: nearestLocation?.id || null,
          latitude: location.latitude,
          longitude: location.longitude,
          notes: notes || null,
          work_duration_hours: workDurationHours,
          is_late: false,
          is_early: isEarly
        }])

      if (error) throw error

      // Update check-in record with work duration
      await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore - Attendance tables not in Supabase types yet
          .update({ work_duration_hours: workDurationHours })
          .eq('id', lastCheckIn.id)

      alert('Check-out successful!')
      setNotes('')
      fetchTodayAttendance()
    } catch (err: any) {
      alert('Failed to check out: ' + err.message)
      console.error('Error checking out:', err)
    } finally {
      setCheckingOut(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const checkInsToday = todayAttendance.filter(att => att.type === 'Check-In')
  const checkOutsToday = todayAttendance.filter(att => att.type === 'Check-Out')
  const openSessionCheckIn = checkInsToday.length > checkOutsToday.length
    ? checkInsToday[checkInsToday.length - 1]
    : null
  const minutesSinceOpen = openSessionCheckIn
    ? (currentTime.getHours() * 60 + currentTime.getMinutes()) -
      (parseInt(openSessionCheckIn.check_time.split(':')[0]) * 60 + parseInt(openSessionCheckIn.check_time.split(':')[1]))
    : 0
  const canCheckoutNow = !!openSessionCheckIn && minutesSinceOpen >= 60

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Clock className="h-6 w-6 text-green-500" />
          Check-In / Check-Out
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Record employee attendance with GPS location tracking
        </p>
      </div>

      {/* Current Time */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-lg text-gray-600 dark:text-gray-400">
              {formatDate(currentTime)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Employee</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQrCheckType(openSessionCheckIn ? 'Check-Out' : 'Check-In')
                setShowQRScanner(true)
              }}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code ({openSessionCheckIn ? 'Check-Out' : 'Check-In'})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_code} - {emp.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Location Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2">Getting location...</span>
            </div>
          ) : location ? (
            <div className="space-y-4">
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Location detected</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Latitude:</span> {location.latitude.toFixed(6)}
                </div>
                <div>
                  <span className="font-medium">Longitude:</span> {location.longitude.toFixed(6)}
                </div>
                {location.accuracy && (
                  <div>
                    <span className="font-medium">Accuracy:</span> ±{Math.round(location.accuracy)} meters
                  </div>
                )}
                {nearestLocation && (
                  <div className="flex items-center text-green-600">
                    <Navigation className="h-4 w-4 mr-1" />
                    <span>Near: {nearestLocation.name}</span>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={getCurrentLocation}>
                <MapPin className="h-4 w-4 mr-2" />
                Refresh Location
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Location not available</span>
              </div>
              {locationError && (
                <Alert variant="error">
                  {locationError}
                </Alert>
              )}
              <Button onClick={getCurrentLocation} variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Get Location
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Attendance Status */}
      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkInsToday.length > 0 && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>
                    First Check-In: {checkInsToday[0].check_time} {checkInsToday[0].is_late && <span className="text-orange-600">(Late)</span>}
                  </span>
                </div>
              )}
              {openSessionCheckIn && (
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Open Session: started at {openSessionCheckIn.check_time}</span>
                </div>
              )}
              {checkOutsToday.length > 0 && (
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>
                    Last Check-Out: {checkOutsToday[checkOutsToday.length - 1].check_time}
                    {checkOutsToday[checkOutsToday.length - 1].is_early && (
                      <span className="ml-2 text-orange-600">(Early)</span>
                    )}
                  </span>
                </div>
              )}
              {checkOutsToday.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Last Session Duration: {checkOutsToday[checkOutsToday.length - 1].work_duration_hours?.toFixed(2) || '0'} hours
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-In/Out Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <Input
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <PermissionButton
                permission="hr.attendance.check_in_out"
                onClick={handleCheckIn}
                disabled={!location || checkingIn || !isOnline || !canCheckInOut || !!openSessionCheckIn}
                className="flex-1"
                size="lg"
              >
                {checkingIn ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Check In
                  </>
                )}
              </PermissionButton>

              <PermissionButton
                permission="hr.attendance.check_in_out"
                onClick={handleCheckOut}
                disabled={!location || checkingOut || !isOnline || !canCheckInOut || !openSessionCheckIn || !canCheckoutNow}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Checking Out...
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Check Out
                  </>
                )}
              </PermissionButton>

              <Button
                onClick={() => {
                  setQrCheckType(openSessionCheckIn ? 'Check-Out' : 'Check-In')
                  setShowQRScanner(true)
                }}
                variant="outline"
                size="lg"
                title={`Scan QR Code for ${openSessionCheckIn ? 'Check-Out' : 'Check-In'}`}
              >
                <QrCode className="h-5 w-5" />
              </Button>
            </div>

            {openSessionCheckIn && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Open session since {openSessionCheckIn.check_time}. Check-Out allowed after 60 min (elapsed {Math.max(0, minutesSinceOpen)} min).
              </div>
            )}

            {!isOnline && (
              <Alert variant="error">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4" />
                  <span>Cannot record attendance without internet connection</span>
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <QRCodeScanner
              checkType={openSessionCheckIn ? 'Check-Out' : 'Check-In'}
              onScanSuccess={(employee) => {
                setSelectedEmployee(employee.id)
                // Decide mode based on current open session
                const mode: 'Check-In' | 'Check-Out' = openSessionCheckIn ? 'Check-Out' : 'Check-In'
                setQrCheckType(mode)
                setShowQRScanner(false)
                // Auto-trigger after 500ms to allow state update
                setTimeout(() => {
                  if (mode === 'Check-In') {
                    handleCheckIn()
                  } else {
                    // Respect 60-minute rule
                    if (!canCheckoutNow) {
                      alert('Check-Out allowed after at least 60 minutes from last Check-In')
                      return
                    }
                    handleCheckOut()
                  }
                }, 500)
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}


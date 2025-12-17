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
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, AttendanceEmployee, AttendanceRecord, AttendanceLocation, HRManpower, DesignationRate } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { QRCodeScanner } from './QRCodeScanner'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

export default function CheckInOutPage() {
  const guard = usePermissionGuard()
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
  
  // ✅ Employee Designation from HR Manpower
  const [employeeDesignation, setEmployeeDesignation] = useState<string | null>(null)
  
  // ✅ Location Selection State
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('')
  const [showLocationDropdown, setShowLocationDropdown] = useState<boolean>(false)
  
  // UI State
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrCheckType, setQrCheckType] = useState<'Check-In' | 'Check-Out'>('Check-In')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [scannedEmployees, setScannedEmployees] = useState<Array<{
    employee: AttendanceEmployee
    timestamp: Date
    type: 'Check-In' | 'Check-Out'
    status: 'success' | 'error'
    message: string
  }>>([])
  const recentlyProcessedRef = useRef<Map<string, number>>(new Map()) // employee_id -> timestamp
  
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
      // ✅ Load employee designation from HR Manpower
      loadEmployeeDesignation(selectedEmployee.employee_code)
    } else {
      setEmployeeDesignation(null)
    }
  }, [selectedEmployee])

  // ✅ Load employee designation from HR Manpower
  const loadEmployeeDesignation = async (employeeCode: string) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.HR_MANPOWER)
        // @ts-ignore
        .select('designation')
        .eq('employee_code', employeeCode)
        .eq('status', 'Active')
        .maybeSingle()

      if (error) {
        console.warn('⚠️ Error loading employee designation:', error)
        setEmployeeDesignation(null)
        return
      }

      if (data) {
        const hrData = data as any
        setEmployeeDesignation(hrData.designation)
        console.log('✅ Loaded employee designation:', hrData.designation)
      } else {
        setEmployeeDesignation(null)
        console.warn(`⚠️ No designation found for employee: ${employeeCode}`)
      }
    } catch (err: any) {
      console.error('❌ Error loading employee designation:', err)
      setEmployeeDesignation(null)
    }
  }

  // Update nearest location when location changes
  useEffect(() => {
    if (location && locations.length > 0 && locationMode === 'auto') {
      findNearestLocation()
    }
  }, [location, locations, locationMode])

  // ✅ Handle manual location selection
  useEffect(() => {
    if (locationMode === 'manual' && selectedLocationId) {
      const selectedLoc = locations.find(loc => loc.id === selectedLocationId)
      if (selectedLoc) {
        setLocation({
          latitude: Number(selectedLoc.latitude),
          longitude: Number(selectedLoc.longitude),
          accuracy: selectedLoc.radius_meters ? selectedLoc.radius_meters : undefined,
          timestamp: Date.now()
        })
        setNearestLocation(selectedLoc)
        setLocationError('')
        setShowLocationDropdown(false)
      }
    } else if (locationMode === 'auto') {
      // Reset to auto mode - get current location if not available
      if (!location) {
        getCurrentLocation()
      }
      setShowLocationDropdown(false)
      setLocationSearchQuery('')
    }
  }, [locationMode, selectedLocationId, locations])

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.location-dropdown-container')) {
        setShowLocationDropdown(false)
      }
    }
    
    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showLocationDropdown])

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

  const loadTodayRecords = async (employeeId: string): Promise<AttendanceRecord[]> => {
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
      return data || []
    } catch (err: any) {
      console.error('Error loading today records:', err)
      return []
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
      if (locationMode === 'manual') {
        setErrorMessage('Please select a location manually')
      } else {
        setErrorMessage('Please enable location services')
      }
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
      if (locationMode === 'manual') {
        setErrorMessage('Please select a location manually')
      } else {
        setErrorMessage('Please enable location services')
      }
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
      let workDuration = (checkOutMinutes - checkInMinutes) / 60
      
      // Handle case where check-out is on the next day (if negative, assume same day minimum 0.01 hours)
      if (workDuration < 0) {
        // If negative, it might be next day - add 24 hours
        workDuration = (24 * 60 - checkInMinutes + checkOutMinutes) / 60
      }
      
      // Ensure minimum 0.01 hours if both times are same (to avoid 0 hours)
      if (workDuration <= 0) {
        workDuration = 0.01 // Minimum 1 minute
      }

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

      // ✅ Sync to MANPOWER table
      // Pass the selected location (nearestLocation for auto mode, or manually selected location)
      const syncResult = await syncToManpower(
        selectedEmployee,
        checkIn.check_time,
        checkTime,
        today,
        workDuration,
        nearestLocation // Pass the selected/nearest location
      )

      // Get project code from sync result if available
      let projectCodeInfo = ''
      if (syncResult && syncResult.projectCode) {
        projectCodeInfo = ` | Project: ${syncResult.projectCode}`
      }

      setSuccessMessage(`✅ Check-Out successful at ${checkTime}. Work duration: ${workDuration.toFixed(2)} hours${projectCodeInfo}`)
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
      // Prevent processing the same employee within 3 seconds
      const now = Date.now()
      const lastProcessed = recentlyProcessedRef.current.get(employee.id)
      
      if (lastProcessed && (now - lastProcessed) < 3000) {
        console.log(`⚠️ Duplicate scan prevented for ${employee.name} - processed too recently`)
        // Still add to list but mark as duplicate
        setScannedEmployees(prev => [
          {
            employee,
            timestamp: new Date(),
            type: qrCheckType,
            status: 'error',
            message: 'Duplicate scan - already processed recently'
          },
          ...prev.slice(0, 49)
        ])
        return
      }

      // Mark as processed
      recentlyProcessedRef.current.set(employee.id, now)
      
      // Clean up old entries (older than 10 seconds)
      const tenSecondsAgo = now - 10000
      const entriesToCheck = Array.from(recentlyProcessedRef.current.entries())
      for (const [empId, timestamp] of entriesToCheck) {
        if (timestamp < tenSecondsAgo) {
          recentlyProcessedRef.current.delete(empId)
        }
      }

      // Set the employee
      setSelectedEmployee(employee)
      
      // Don't close the scanner - keep it open for continuous scanning
      // setShowQRScanner(false) // Commented out for continuous scanning
      
      let result: { status: 'success' | 'error', message: string } = { status: 'success', message: '' }
      
      // Refresh today's records for this employee to get the latest state
      const freshRecords = await loadTodayRecords(employee.id)
      const ins = freshRecords.filter(r => r.type === 'Check-In')
      const outs = freshRecords.filter(r => r.type === 'Check-Out')
      const hasOpenSession = ins.length > outs.length
      const mode: 'Check-In' | 'Check-Out' = hasOpenSession ? 'Check-Out' : 'Check-In'
      setQrCheckType(mode)

      if (mode === 'Check-In') {
        result = await handleCheckInForEmployee(employee)
      } else {
        result = await handleCheckOutForEmployee(employee)
      }
      
      // Add to scanned employees list
      setScannedEmployees(prev => [
        {
          employee,
          timestamp: new Date(),
          type: mode,
          status: result.status,
          message: result.message
        },
        ...prev.slice(0, 49) // Keep last 50 records
      ])
    } catch (error: any) {
      console.error('Error in QR scan success:', error)
      setErrorMessage('Failed to process QR scan: ' + error.message)
      
      // Add error to scanned employees list
      setScannedEmployees(prev => [
        {
          employee,
          timestamp: new Date(),
          type: qrCheckType,
          status: 'error',
          message: 'Failed to process: ' + error.message
        },
        ...prev.slice(0, 49)
      ])
    }
  }

  const handleCheckInForEmployee = async (employee: AttendanceEmployee): Promise<{ status: 'success' | 'error', message: string }> => {
    if (!location) {
      setErrorMessage('Please enable location services')
      return { status: 'error', message: 'Location services not enabled' }
    }

    setCheckingIn(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0].substring(0, 5)

      // Load today's records to detect open session
      const { data: existingRecords } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .order('check_time', { ascending: true })

      const checkIns = (existingRecords || []).filter((r: any) => r.type === 'Check-In')
      const checkOuts = (existingRecords || []).filter((r: any) => r.type === 'Check-Out')
      const hasOpenSession = checkIns.length > checkOuts.length

      if (hasOpenSession) {
        const lastIn = checkIns[checkIns.length - 1] as any
        const message = `Open session exists (last Check-In at ${lastIn.check_time}). Please Check-Out first.`
        setErrorMessage(`⚠️ ${employee.name} - ${message}`)
        setCheckingIn(false)
        setTimeout(() => setErrorMessage(''), 4000)
        return { status: 'error', message }
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

      const message = `Checked in successfully at ${checkTime}`
      setSuccessMessage(`✅ ${employee.name} - ${message}`)
      await loadTodayRecords(employee.id)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Update selected employee to show updated records
      setSelectedEmployee(employee)
      
      return { status: 'success', message }
    } catch (err: any) {
      const errorMsg = `Failed to check in: ${err.message}`
      setErrorMessage(`Failed to check in ${employee.name}: ` + err.message)
      console.error('Check-in error:', err)
      return { status: 'error', message: errorMsg }
    } finally {
      setCheckingIn(false)
    }
  }

  // ✅ Sync Check-Out to MANPOWER table
  const syncToManpower = async (
    employee: AttendanceEmployee,
    checkInTime: string,
    checkOutTime: string,
    date: string,
    totalHours: number,
    selectedLocation?: AttendanceLocation | null
  ): Promise<{ projectCode: string } | undefined> => {
    try {
      console.log('🔄 Starting MANPOWER sync...', {
        employee: employee.employee_code,
        checkInTime,
        checkOutTime,
        date,
        totalHours
      })

      const supabaseClient = getSupabaseClient()
      
      // 1. Get employee designation from HR Manpower
      const { data: hrEmployee, error: hrError } = await supabaseClient
        .from(TABLES.HR_MANPOWER)
        // @ts-ignore
        .select('employee_code, designation')
        .eq('employee_code', employee.employee_code)
        .eq('status', 'Active')
        .single()

      if (hrError) {
        console.error('❌ Error fetching HR Employee:', hrError)
      }

      if (!hrEmployee) {
        console.warn(`⚠️ Employee ${employee.employee_code} not found in HR Manpower`)
        return undefined
      }

      console.log('✅ Found HR Employee:', hrEmployee)
      const hrEmployeeTyped = hrEmployee as any

      // 2. Get designation rate for cost calculation
      // ✅ Enhanced search: Try exact match first, then case-insensitive match
      let designationRate: any = null
      let rateError: any = null
      
      // Strategy 1: Exact match (case-sensitive)
      const { data: exactRate, error: exactError } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .select('*')
        .eq('designation', hrEmployeeTyped.designation)
        .maybeSingle()
      
      if (exactRate && !exactError) {
        designationRate = exactRate
        console.log(`✅ Found exact designation rate for: ${hrEmployeeTyped.designation}`, designationRate)
      } else {
        // Strategy 2: Case-insensitive match
        const { data: caseInsensitiveRate, error: caseError } = await supabaseClient
          .from(TABLES.DESIGNATION_RATES)
          // @ts-ignore
          .select('*')
          .ilike('designation', hrEmployeeTyped.designation)
          .maybeSingle()
        
        if (caseInsensitiveRate && !caseError) {
          designationRate = caseInsensitiveRate
          console.log(`✅ Found case-insensitive designation rate for: ${hrEmployeeTyped.designation}`, designationRate)
        } else {
          rateError = caseError || exactError
          console.warn(`⚠️ No designation rate found for: ${hrEmployeeTyped.designation}`)
          console.warn(`   Tried exact match: ${hrEmployeeTyped.designation}`)
          console.warn(`   Tried case-insensitive match: ${hrEmployeeTyped.designation}`)
          
          // Strategy 3: Debug - List all available designations
          const { data: allRates } = await supabaseClient
            .from(TABLES.DESIGNATION_RATES)
            // @ts-ignore
            .select('designation')
            .order('designation', { ascending: true })
          
          if (allRates && allRates.length > 0) {
            const availableDesignations = allRates.map((r: any) => r.designation)
            console.warn(`   Available designations in database:`, availableDesignations)
            console.warn(`   💡 Tip: Make sure the designation "${hrEmployeeTyped.designation}" exists in Designation Rates page`)
          }
        }
      }

      // 3. Calculate overtime (if total hours > 8)
      const standardHours = 8
      const overtimeHours = Math.max(0, totalHours - standardHours)
      const overtimeText = overtimeHours > 0 ? `${overtimeHours.toFixed(2)}h` : '0h'

      // 4. Calculate cost
      let cost = 0
      if (designationRate) {
        const rate = designationRate as any
        const hourlyRate = rate.hourly_rate || 0
        const overtimeRate = rate.overtime_hourly_rate || hourlyRate || 0
        
        console.log(`💰 Calculating cost for ${hrEmployeeTyped.designation}:`, {
          hourlyRate,
          overtimeRate,
          totalHours,
          standardHours,
          overtimeHours
        })
        
        const standardCost = Math.min(totalHours, standardHours) * hourlyRate
        const overtimeCost = overtimeHours * overtimeRate
        cost = standardCost + overtimeCost
        
        console.log(`💰 Cost breakdown:`, {
          standardCost,
          overtimeCost,
          totalCost: cost
        })
      } else {
        console.warn(`⚠️ Cannot calculate cost - no rate found for designation: ${hrEmployeeTyped.designation}`)
      }

      // 5. Get Project Code from selected location name
      // Location name format: "P5108 - Venus - Umm Al Sheif" or "P5108"
      let projectCode = ''
      try {
        // ✅ Strategy 1: Extract Project Code from selected location name
        if (selectedLocation && selectedLocation.name) {
          // Try to extract project code from location name (format: "P5108 - ..." or "P5108")
          const locationName = selectedLocation.name.trim()
          const projectCodeMatch = locationName.match(/^([P]\d+[-\w]*)/i)
          
          if (projectCodeMatch && projectCodeMatch[1]) {
            projectCode = projectCodeMatch[1].trim()
            console.log(`📋 Project Code extracted from location name "${locationName}":`, projectCode)
          } else {
            console.warn(`⚠️ Could not extract Project Code from location name: "${locationName}"`)
          }
        }
        
        // ✅ Strategy 2: If no project code from location, try to get from Projects table
        if (!projectCode) {
          const { data: projects, error: projectsError } = await supabaseClient
            .from(TABLES.PROJECTS)
            // @ts-ignore
            .select('"Project Code"')
            .not('"Project Code"', 'is', null)
            .limit(1)
          
          if (projectsError) {
            console.warn('⚠️ Error fetching from Projects table:', projectsError)
          }
          
          if (projects && projects.length > 0) {
            projectCode = (projects[0] as any)['Project Code']
            console.log('📋 Project Code found from Projects table:', projectCode)
          } else {
            // ✅ Strategy 3: Fallback - Try BOQ Activities table
            const { data: boqActivities, error: boqError } = await supabaseClient
              .from(TABLES.BOQ_ACTIVITIES)
              // @ts-ignore
              .select('"Project Code"')
              .not('"Project Code"', 'is', null)
              .limit(1)
            
            if (boqError) {
              console.warn('⚠️ Error fetching from BOQ Activities table:', boqError)
            }
            
            if (boqActivities && boqActivities.length > 0) {
              projectCode = (boqActivities[0] as any)['Project Code']
              console.log('📋 Project Code found from BOQ Activities table:', projectCode)
            }
          }
        }
        
        console.log('📋 Final Project Code:', projectCode || 'DEFAULT')
      } catch (err) {
        console.warn('⚠️ Could not fetch project code, will use DEFAULT:', err)
      }

      // 6. Format date (YYYY-MM-DD to DD/MM/YYYY or keep as is)
      const formattedDate = date

      // 7. Check if record already exists for this employee on this date
      const { data: existingRecord, error: checkError } = await supabaseClient
        .from(TABLES.MANPOWER)
        // @ts-ignore
        .select('id')
        .eq('LABOUR CODE', employee.employee_code)
        .eq('Date', formattedDate)
        .limit(1)

      if (checkError) {
        console.error('❌ Error checking existing record:', checkError)
      }

      if (existingRecord && existingRecord.length > 0) {
        console.log(`⚠️ MANPOWER record already exists for ${employee.employee_code} on ${formattedDate}, skipping sync`)
        return { projectCode: projectCode || 'DEFAULT' }
      }

      // 8. Insert into MANPOWER table
      const manpowerRecord: any = {
        'Date': formattedDate,
        'PROJECT CODE': projectCode || 'DEFAULT', // Use 'DEFAULT' if no project found
        'LABOUR CODE': employee.employee_code,
        'Designation': hrEmployeeTyped.designation,
        'START': checkInTime,
        'FINISH': checkOutTime,
        'OVERTIME': overtimeText,
        'Total Hours': parseFloat(totalHours.toFixed(2)),
        'Cost': parseFloat(cost.toFixed(2))
      }
      
      // ✅ Add Location = Selected Location Name (from attendance locations)
      // Location column will contain the name of the location where employee checked in/out
      if (selectedLocation && selectedLocation.name) {
        manpowerRecord['Location'] = selectedLocation.name
        console.log('📍 Adding Location (Selected Location) to MANPOWER record:', selectedLocation.name)
      } else {
        // Fallback: Use Project Code if no location selected
        manpowerRecord['Location'] = projectCode || 'DEFAULT'
        console.log('📍 Adding Location (Project Code fallback) to MANPOWER record:', projectCode || 'DEFAULT')
      }

      console.log('📦 Inserting MANPOWER record:', manpowerRecord)

      const { data: insertedData, error: manpowerError } = await supabaseClient
        .from(TABLES.MANPOWER)
        // @ts-ignore
        .insert([manpowerRecord])
        .select()

      if (manpowerError) {
        // ✅ Handle Location column missing error gracefully (expected if migration not run)
        if (manpowerError.code === 'PGRST204' && manpowerError.message?.includes('Location')) {
          // This is expected if migration script hasn't been run yet
          // Silently retry without Location column
          const recordWithoutLocation = { ...manpowerRecord }
          delete recordWithoutLocation['Location']
          
          const { data: retryData, error: retryError } = await supabaseClient
            .from(TABLES.MANPOWER)
            // @ts-ignore
            .insert([recordWithoutLocation])
            .select()
          
          if (retryError) {
            // Only log if retry also fails
            console.error('❌ Error syncing to MANPOWER (retry without Location):', retryError)
            // Don't throw - we don't want to fail the check-out if MANPOWER sync fails
          } else {
            // Success - log quietly
            console.log('✅ Successfully synced to MANPOWER:', {
              insertedData: retryData,
              employee: employee.employee_code,
              date: formattedDate,
              hours: totalHours,
              cost: cost,
              projectCode: projectCode || 'DEFAULT',
              note: 'Location column not available - run migration to enable'
            })
            
            console.log(`📋 To view this record in MANPOWER page, search for Project Code: "${projectCode || 'DEFAULT'}"`)
            
            // Show migration hint only once (not every time)
            if (!sessionStorage.getItem('manpower_location_migration_hint_shown')) {
              console.log(`💡 Tip: Run migration script to enable Location tracking: Database/manpower-add-location-column-migration.sql`)
              sessionStorage.setItem('manpower_location_migration_hint_shown', 'true')
            }
            
            return { projectCode: projectCode || 'DEFAULT' }
          }
        } else {
          // Other errors - log normally
          console.error('❌ Error syncing to MANPOWER:', manpowerError)
          console.error('❌ Error details:', {
            message: manpowerError.message,
            details: manpowerError.details,
            hint: manpowerError.hint,
            code: manpowerError.code
          })
          // Don't throw - we don't want to fail the check-out if MANPOWER sync fails
        }
      } else {
        console.log('✅ Successfully synced to MANPOWER:', {
          insertedData,
          employee: employee.employee_code,
          date: formattedDate,
          hours: totalHours,
          cost: cost,
          projectCode: projectCode || 'DEFAULT',
          location: selectedLocation?.name || projectCode || 'DEFAULT' // Location = Selected Location Name
        })
        
        // ✅ Show success message with project code for easy search
        console.log(`📋 To view this record in MANPOWER page:`)
        console.log(`   - Search for Project Code: "${projectCode || 'DEFAULT'}"`)
        console.log(`   - Or search by Labour Code: "${employee.employee_code}"`)
        console.log(`   - Or search by Date: "${formattedDate}"`)
        
        // Return project code for display in success message
        return { projectCode: projectCode || 'DEFAULT' }
      }
    } catch (err: any) {
      console.error('❌ Error in syncToManpower:', err)
      // Don't throw - we don't want to fail the check-out if MANPOWER sync fails
    }
  }

  const handleCheckOutForEmployee = async (employee: AttendanceEmployee): Promise<{ status: 'success' | 'error', message: string }> => {
    if (!location) {
      setErrorMessage('Please enable location services')
      return { status: 'error', message: 'Location services not enabled' }
    }

    setCheckingOut(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const checkTime = currentTime.toTimeString().split(' ')[0].substring(0, 5)

      // Get today's check-in
      // Load today's records to find last open session
      const { data: existingRecords } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .order('check_time', { ascending: true })

      const checkIns = (existingRecords || []).filter((r: any) => r.type === 'Check-In')
      const checkOuts = (existingRecords || []).filter((r: any) => r.type === 'Check-Out')
      const hasOpenSession = checkIns.length > checkOuts.length
      const openSession = hasOpenSession ? (checkIns[checkIns.length - 1] as any) : null

      if (!openSession) {
        const message = 'Must check in first (no open session found)'
        setErrorMessage(`❌ ${employee.name} - ${message}`)
        setCheckingOut(false)
        setTimeout(() => setErrorMessage(''), 3000)
        return { status: 'error', message }
      }

      // Enforce minimum 60 minutes since last check-in
      const [inH, inM] = openSession.check_time.split(':').map(Number)
      const inMinutes = inH * 60 + inM
      const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
      if (nowMinutes - inMinutes < 60) {
        const message = 'Check-Out allowed after 60 minutes from last Check-In'
        setErrorMessage(`⌛ ${employee.name} - ${message}`)
        setCheckingOut(false)
        setTimeout(() => setErrorMessage(''), 3000)
        return { status: 'error', message }
      }

      // Calculate work hours for this session
      const checkInTime = new Date(`${today}T${openSession.check_time}:00`)
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
        work_duration_hours: Math.max(0, parseFloat(workHours.toFixed(2))),
        notes: `Auto check-out via QR code`
      }

      const { error: insertError } = await supabase
        .from(TABLES.ATTENDANCE_RECORDS)
        // @ts-ignore
        .insert([record])

      if (insertError) throw insertError

      // ✅ Sync to MANPOWER table
      // Pass the selected location (nearestLocation for auto mode, or manually selected location)
      const syncResult = await syncToManpower(
        employee,
        openSession.check_time,
        checkTime,
        today,
        workHours,
        nearestLocation // Pass the selected/nearest location object
      )

      // Get project code from sync result if available
      let projectCodeInfo = ''
      if (syncResult && syncResult.projectCode) {
        projectCodeInfo = ` | Project: ${syncResult.projectCode}`
      }

      const message = `Checked out successfully at ${checkTime} (${workHours.toFixed(2)}h worked)${projectCodeInfo}`
      setSuccessMessage(`✅ ${employee.name} - ${message}`)
      await loadTodayRecords(employee.id)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      return { status: 'success', message }
    } catch (err: any) {
      const errorMsg = `Failed to check out: ${err.message}`
      setErrorMessage(`Failed to check out ${employee.name}: ` + err.message)
      console.error('Check-out error:', err)
      return { status: 'error', message: errorMsg }
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
              <div className="space-y-3">
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
                        {location ? (locationMode === 'manual' ? 'Manual' : 'Active') : 'Not Available'}
                      </p>
                    </div>
                  </div>
                  {locationMode === 'auto' && (
                    <PermissionButton
                      permission="hr.attendance.check_in_out"
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
                    </PermissionButton>
                  )}
                </div>
                
                {/* ✅ Location Mode Selection */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Mode:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocationMode('auto')}
                      className={`px-3 py-1 text-xs rounded-md transition-all ${
                        locationMode === 'auto'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setLocationMode('manual')}
                      className={`px-3 py-1 text-xs rounded-md transition-all ${
                        locationMode === 'manual'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {/* ✅ Manual Location Selection */}
                {locationMode === 'manual' && (
                  <div className="pt-2 relative location-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedLocationId ? locations.find(l => l.id === selectedLocationId)?.name || '' : locationSearchQuery}
                        onChange={(e) => {
                          setLocationSearchQuery(e.target.value)
                          setShowLocationDropdown(true)
                          if (!e.target.value) {
                            setSelectedLocationId('')
                            setLocation(null)
                            setNearestLocation(null)
                          }
                        }}
                        onFocus={() => setShowLocationDropdown(true)}
                        placeholder="Search and select location..."
                        className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                      {selectedLocationId && (
                        <button
                          onClick={() => {
                            setSelectedLocationId('')
                            setLocationSearchQuery('')
                            setLocation(null)
                            setNearestLocation(null)
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    
                    {/* ✅ Searchable Dropdown */}
                    {showLocationDropdown && (
                      <div className="absolute z-50 w-full mt-2 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl">
                        {locations
                          .filter(loc => 
                            !locationSearchQuery || 
                            loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                            loc.latitude.toString().includes(locationSearchQuery) ||
                            loc.longitude.toString().includes(locationSearchQuery)
                          )
                          .map(loc => (
                            <div
                              key={loc.id}
                              onClick={() => {
                                setSelectedLocationId(loc.id)
                                setLocationSearchQuery('')
                                setShowLocationDropdown(false)
                              }}
                              className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-gray-200 dark:border-gray-700 ${
                                selectedLocationId === loc.id ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-base text-gray-900 dark:text-white">
                                    {loc.name}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {loc.latitude}, {loc.longitude}
                                  </p>
                                </div>
                                {selectedLocationId === loc.id && (
                                  <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                )}
                              </div>
                            </div>
                          ))}
                        {locations.filter(loc => 
                          !locationSearchQuery || 
                          loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                          loc.latitude.toString().includes(locationSearchQuery) ||
                          loc.longitude.toString().includes(locationSearchQuery)
                        ).length === 0 && (
                          <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                            No locations found
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedLocationId && location && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Location set: {locations.find(l => l.id === selectedLocationId)?.name}
                      </p>
                    )}
                  </div>
                )}
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
                  <PermissionButton
                    permission="hr.attendance.check_in_out"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      const hasOpenSession = todayRecords.filter(r => r.type === 'Check-In').length > todayRecords.filter(r => r.type === 'Check-Out').length
                      setQrCheckType(hasOpenSession ? 'Check-Out' : 'Check-In')
                      setShowQRScanner(true)
                    }}
                    className="gap-3 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <QrCode className="h-7 w-7" />
                    <span className="font-bold text-base">Scan QR</span>
                  </PermissionButton>
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
                    <PermissionButton
                      permission="hr.attendance.check_in_out"
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
                    </PermissionButton>

                    <PermissionButton
                      permission="hr.attendance.check_in_out"
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
                    </PermissionButton>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-none md:rounded-2xl shadow-2xl max-w-7xl w-full h-full md:h-auto md:max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Scan QR Code - {qrCheckType}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowQRScanner(false)
                    setScannedEmployees([]) // Clear list when closing
                  }}
                  className="rounded-full"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-6">
              {/* Scanner Section */}
              <div className="flex-1 min-w-0 flex flex-col">
                <QRCodeScanner
                  onScanSuccess={handleQRScanSuccess}
                  onClose={() => {
                    setShowQRScanner(false)
                    setScannedEmployees([])
                  }}
                  checkType={qrCheckType}
                />
              </div>
              
              {/* Scanned Employees List */}
              <div className="w-full md:w-80 h-64 md:h-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0">
                <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 flex-shrink-0">
                  <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 md:h-5 md:w-5" />
                    Scanned ({scannedEmployees.length})
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-3 md:p-3 space-y-2 md:space-y-2">
                  {scannedEmployees.length === 0 ? (
                    <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                      <User className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm md:text-sm font-medium">No scans yet</p>
                      <p className="text-xs md:text-xs mt-1">Scanned employees will appear here</p>
                    </div>
                  ) : (
                    scannedEmployees.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 md:p-3 rounded-lg border-2 transition-all animate-in slide-in-from-right ${
                          item.status === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {item.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 md:h-4 md:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 md:h-4 md:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                              )}
                              <p className="font-semibold text-sm md:text-sm text-gray-900 dark:text-white truncate">
                                {item.employee.name}
                              </p>
                            </div>
                            <p className="text-xs md:text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {item.employee.employee_code}
                            </p>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs md:text-xs px-2 md:px-2 py-1 md:py-0.5 rounded font-medium ${
                                item.type === 'Check-In'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            <p className={`text-xs md:text-xs line-clamp-2 ${
                              item.status === 'success'
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {item.message}
                            </p>
                            <p className="text-xs md:text-xs text-gray-500 dark:text-gray-500 mt-1 font-medium">
                              {item.timestamp.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {scannedEmployees.length > 0 && (
                  <div className="p-3 md:p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScannedEmployees([])}
                      className="w-full text-sm md:text-xs py-2 md:py-2 font-medium"
                    >
                      Clear List
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


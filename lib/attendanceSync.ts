/**
 * Attendance Sync Utility
 * 
 * This utility provides functions to synchronize attendance records
 * across different tables (attendance_records, MANPOWER, etc.)
 * 
 * When an attendance record is created, updated, or deleted,
 * this utility ensures all related records are kept in sync.
 */

import { getSupabaseClient } from './simpleConnectionManager'
import { TABLES, AttendanceRecord, AttendanceEmployee, AttendanceLocation, HRManpower, DesignationRate } from './supabase'

/**
 * Sync attendance record to MANPOWER table
 * This function updates or creates a MANPOWER record based on attendance records
 */
export async function syncAttendanceToManpower(
  attendanceRecord: AttendanceRecord,
  employee: AttendanceEmployee,
  checkInRecord?: AttendanceRecord,
  checkOutRecord?: AttendanceRecord
): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseClient = getSupabaseClient()
    
    // Determine which records to use
    const checkIn = checkInRecord || (attendanceRecord.type === 'Check-In' ? attendanceRecord : null)
    const checkOut = checkOutRecord || (attendanceRecord.type === 'Check-Out' ? attendanceRecord : null)
    
    // If we don't have both check-in and check-out, we can't create a complete MANPOWER record
    if (!checkIn || !checkOut) {
      return {
        success: false,
        message: 'Both Check-In and Check-Out records are required for MANPOWER sync'
      }
    }
    
    // 1. Get employee designation from HR Manpower
    const { data: hrEmployee, error: hrError } = await supabaseClient
      .from(TABLES.HR_MANPOWER)
      // @ts-ignore
      .select('employee_code, designation')
      .eq('employee_code', employee.employee_code)
      .eq('status', 'Active')
      .maybeSingle()
    
    if (hrError || !hrEmployee) {
      console.warn(`⚠️ Employee ${employee.employee_code} not found in HR Manpower`)
      return {
        success: false,
        message: `Employee ${employee.employee_code} not found in HR Manpower`
      }
    }
    
    const hrEmployeeTyped = hrEmployee as any
    
    // 2. Get designation rate for cost calculation
    let designationRate: any = null
    
    // Try exact match first
    const { data: exactRate } = await supabaseClient
      .from(TABLES.DESIGNATION_RATES)
      // @ts-ignore
      .select('*')
      .eq('designation', hrEmployeeTyped.designation)
      .maybeSingle()
    
    if (exactRate) {
      designationRate = exactRate
    } else {
      // Try case-insensitive match
      const { data: caseInsensitiveRate } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .select('*')
        .ilike('designation', hrEmployeeTyped.designation)
        .maybeSingle()
      
      if (caseInsensitiveRate) {
        designationRate = caseInsensitiveRate
      }
    }
    
    // 3. Calculate work duration
    const checkInTime = checkIn.check_time
    const checkOutTime = checkOut.check_time
    
    const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number)
    const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number)
    
    let checkInMinutes = checkInHour * 60 + checkInMinute
    let checkOutMinutes = checkOutHour * 60 + checkOutMinute
    
    // Handle next day check-out
    if (checkOutMinutes < checkInMinutes) {
      checkOutMinutes += 24 * 60
    }
    
    const workDurationMinutes = checkOutMinutes - checkInMinutes
    const totalHours = Math.max(0.01, workDurationMinutes / 60) // Minimum 0.01 hours
    
    // 4. Calculate overtime
    const standardHours = 8
    const overtimeHours = Math.max(0, totalHours - standardHours)
    const overtimeText = overtimeHours > 0 ? `${overtimeHours.toFixed(2)}h` : '0h'
    
    // 5. Calculate cost
    let cost = 0
    if (designationRate) {
      const hourlyRate = designationRate.hourly_rate || 0
      const overtimeRate = designationRate.overtime_hourly_rate || hourlyRate || 0
      const standardCost = Math.min(totalHours, standardHours) * hourlyRate
      const overtimeCost = overtimeHours * overtimeRate
      cost = standardCost + overtimeCost
    }
    
    // 6. Get Project Code from location
    let projectCode = ''
    let locationName = ''
    
    // Try to get location from check-out record (most recent)
    if (checkOut.location_id) {
      const { data: location } = await supabaseClient
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .select('*')
        .eq('id', checkOut.location_id)
        .maybeSingle()
      
      if (location) {
        const locationTyped = location as any
        locationName = locationTyped.name || ''
        // Extract Project Code from location name (format: "P5108 - ...")
        const projectCodeMatch = locationName.match(/^([P]\d+[-\w]*)/i)
        if (projectCodeMatch && projectCodeMatch[1]) {
          projectCode = projectCodeMatch[1].trim()
        }
      }
    }
    
    // Fallback: Try to get from Projects table
    if (!projectCode) {
      const { data: projects } = await supabaseClient
        .from(TABLES.PROJECTS)
        // @ts-ignore
        .select('"Project Code"')
        .not('"Project Code"', 'is', null)
        .limit(1)
      
      if (projects && projects.length > 0) {
        projectCode = (projects[0] as any)['Project Code']
      }
    }
    
    // 7. Format date
    const formattedDate = checkIn.date || checkOut.date
    
    // 8. Check if MANPOWER record exists
    const { data: existingRecord } = await supabaseClient
      .from(TABLES.MANPOWER)
      // @ts-ignore
      .select('id')
      .eq('LABOUR CODE', employee.employee_code)
      .eq('Date', formattedDate)
      .limit(1)
    
    // 9. Prepare MANPOWER record
    const manpowerRecord: any = {
      'Date': formattedDate,
      'PROJECT CODE': projectCode || 'DEFAULT',
      'LABOUR CODE': employee.employee_code,
      'Designation': hrEmployeeTyped.designation,
      'START': checkInTime,
      'FINISH': checkOutTime,
      'OVERTIME': overtimeText,
      'Total Hours': parseFloat(totalHours.toFixed(2)),
      'Cost': parseFloat(cost.toFixed(2))
    }
    
    // Add Location if available
    if (locationName) {
      manpowerRecord['Location'] = locationName
    } else if (projectCode) {
      manpowerRecord['Location'] = projectCode
    }
    
    // 10. Update or insert MANPOWER record
    if (existingRecord && existingRecord.length > 0) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from(TABLES.MANPOWER)
        // @ts-ignore
        .update(manpowerRecord)
        .eq('LABOUR CODE', employee.employee_code)
        .eq('Date', formattedDate)
      
      if (updateError) {
        // Try without Location if column doesn't exist
        if (updateError.code === 'PGRST204' && updateError.message?.includes('Location')) {
          const recordWithoutLocation = { ...manpowerRecord }
          delete recordWithoutLocation['Location']
          
          const { error: retryError } = await supabaseClient
            .from(TABLES.MANPOWER)
            // @ts-ignore
            .update(recordWithoutLocation)
            .eq('LABOUR CODE', employee.employee_code)
            .eq('Date', formattedDate)
          
          if (retryError) {
            throw retryError
          }
        } else {
          throw updateError
        }
      }
      
      return {
        success: true,
        message: 'MANPOWER record updated successfully'
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseClient
        .from(TABLES.MANPOWER)
        // @ts-ignore
        .insert([manpowerRecord])
      
      if (insertError) {
        // Try without Location if column doesn't exist
        if (insertError.code === 'PGRST204' && insertError.message?.includes('Location')) {
          const recordWithoutLocation = { ...manpowerRecord }
          delete recordWithoutLocation['Location']
          
          const { error: retryError } = await supabaseClient
            .from(TABLES.MANPOWER)
            // @ts-ignore
            .insert([recordWithoutLocation])
          
          if (retryError) {
            throw retryError
          }
        } else {
          throw insertError
        }
      }
      
      return {
        success: true,
        message: 'MANPOWER record created successfully'
      }
    }
  } catch (error: any) {
    console.error('❌ Error syncing attendance to MANPOWER:', error)
    return {
      success: false,
      message: error.message || 'Failed to sync attendance to MANPOWER'
    }
  }
}

/**
 * Sync attendance record deletion to MANPOWER
 * When an attendance record is deleted, check if we should delete the MANPOWER record
 */
export async function syncAttendanceDeletionToManpower(
  employeeCode: string,
  date: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseClient = getSupabaseClient()
    
    // Get employee ID first
    const { data: employeeData } = await supabaseClient
      .from(TABLES.ATTENDANCE_EMPLOYEES)
      // @ts-ignore
      .select('id')
      .eq('employee_code', employeeCode)
      .maybeSingle()
    
    if (!employeeData) {
      return {
        success: false,
        message: 'Employee not found'
      }
    }
    
    const employeeId = (employeeData as any).id
    
    // Check if there are any other attendance records for this employee on this date
    const { data: otherRecords } = await supabaseClient
      .from(TABLES.ATTENDANCE_RECORDS)
      // @ts-ignore
      .select('id, type')
      .eq('employee_id', employeeId)
      .eq('date', date)
    
    // If no other records exist, delete MANPOWER record
    if (!otherRecords || otherRecords.length === 0) {
      const { error } = await supabaseClient
        .from(TABLES.MANPOWER)
        // @ts-ignore
        .delete()
        .eq('LABOUR CODE', employeeCode)
        .eq('Date', date)
      
      if (error) {
        console.warn('⚠️ Error deleting MANPOWER record:', error)
        return {
          success: false,
          message: 'Failed to delete MANPOWER record'
        }
      }
      
      return {
        success: true,
        message: 'MANPOWER record deleted successfully'
      }
    }
    
    // If other records exist, recalculate MANPOWER record
    const checkInRecords = otherRecords.filter((r: any) => r.type === 'Check-In')
    const checkOutRecords = otherRecords.filter((r: any) => r.type === 'Check-Out')
    
    if (checkInRecords.length > 0 && checkOutRecords.length > 0) {
      // Get the employee
      const { data: employee } = await supabaseClient
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        // @ts-ignore
        .select('*')
        .eq('employee_code', employeeCode)
        .single()
      
      if (employee) {
        // Get the latest check-in and check-out
        const latestCheckIn = checkInRecords[checkInRecords.length - 1]
        const latestCheckOut = checkOutRecords[checkOutRecords.length - 1]
        
        // Fetch full records
        const checkInRecordTyped = latestCheckIn as any
        const checkOutRecordTyped = latestCheckOut as any
        
        const { data: checkInRecord } = await supabaseClient
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .select('*')
          .eq('id', checkInRecordTyped.id)
          .single()
        
        const { data: checkOutRecord } = await supabaseClient
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .select('*')
          .eq('id', checkOutRecordTyped.id)
          .single()
        
        if (checkInRecord && checkOutRecord) {
          return await syncAttendanceToManpower(
            checkOutRecord as AttendanceRecord,
            employee as AttendanceEmployee,
            checkInRecord as AttendanceRecord,
            checkOutRecord as AttendanceRecord
          )
        }
      }
    }
    
    return {
      success: true,
      message: 'MANPOWER record will be recalculated'
    }
  } catch (error: any) {
    console.error('❌ Error syncing attendance deletion to MANPOWER:', error)
    return {
      success: false,
      message: error.message || 'Failed to sync attendance deletion to MANPOWER'
    }
  }
}

/**
 * Sync MANPOWER record to Attendance Records
 * When a MANPOWER record is updated or created, update the corresponding attendance records
 * This is the reverse sync from syncAttendanceToManpower
 */
export async function syncManpowerToAttendance(
  manpowerRecord: any // Record from 'CCD - MANPOWER' table
): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseClient = getSupabaseClient()
    
    // Extract data from MANPOWER record
    const employeeCode = manpowerRecord['LABOUR CODE']
    const date = manpowerRecord['Date']
    const startTime = manpowerRecord['START']
    const finishTime = manpowerRecord['FINISH']
    
    if (!employeeCode || !date) {
      return {
        success: false,
        message: 'Employee code and date are required'
      }
    }
    
    // 1. Get employee from attendance_employees
    const { data: employee, error: employeeError } = await supabaseClient
      .from(TABLES.ATTENDANCE_EMPLOYEES)
      // @ts-ignore
      .select('*')
      .eq('employee_code', employeeCode)
      .maybeSingle()
    
    if (employeeError || !employee) {
      console.warn(`⚠️ Employee ${employeeCode} not found in attendance_employees`)
      return {
        success: false,
        message: `Employee ${employeeCode} not found in attendance_employees`
      }
    }
    
    const employeeTyped = employee as AttendanceEmployee
    
    // 2. Get existing attendance records for this employee on this date
    const { data: existingRecords, error: recordsError } = await supabaseClient
      .from(TABLES.ATTENDANCE_RECORDS)
      // @ts-ignore
      .select('*')
      .eq('employee_id', employeeTyped.id)
      .eq('date', date)
      .order('check_time', { ascending: true })
    
    if (recordsError) {
      console.error('❌ Error fetching attendance records:', recordsError)
      return {
        success: false,
        message: 'Failed to fetch attendance records'
      }
    }
    
    // 3. If we have START and FINISH times, update or create check-in and check-out records
    if (startTime && finishTime) {
      // Parse times (format: "HH:MM" or "HH:MM:SS")
      const startTimeFormatted = startTime.includes(':') ? startTime.split(':').slice(0, 2).join(':') : startTime
      const finishTimeFormatted = finishTime.includes(':') ? finishTime.split(':').slice(0, 2).join(':') : finishTime
      
      // Find or create check-in record
      const checkInRecords = existingRecords?.filter((r: any) => r.type === 'Check-In') || []
      const checkOutRecords = existingRecords?.filter((r: any) => r.type === 'Check-Out') || []
      
      // Get location from MANPOWER record if available (Location column)
      let locationId: string | null = null
      if (manpowerRecord['Location']) {
        const locationName = manpowerRecord['Location']
        // Try to find location by name
        const { data: location } = await supabaseClient
          .from(TABLES.ATTENDANCE_LOCATIONS)
          // @ts-ignore
          .select('id')
          .eq('name', locationName)
          .maybeSingle()
        
        if (location) {
          locationId = (location as any).id
        }
      }
      
      // Update or create check-in record
      if (checkInRecords.length > 0) {
        // Update the latest check-in record
        const latestCheckIn = checkInRecords[checkInRecords.length - 1] as any
        const { error: updateCheckInError } = await supabaseClient
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .update({
            check_time: startTimeFormatted,
            location_id: locationId || latestCheckIn.location_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', latestCheckIn.id)
        
        if (updateCheckInError) {
          console.error('❌ Error updating check-in record:', updateCheckInError)
        }
      } else {
        // Create new check-in record
        const { error: createCheckInError } = await supabaseClient
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .insert([{
            employee_id: employeeTyped.id,
            date: date,
            check_time: startTimeFormatted,
            type: 'Check-In',
            location_id: locationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
        
        if (createCheckInError) {
          console.error('❌ Error creating check-in record:', createCheckInError)
        }
      }
      
      // Update or create check-out record
      if (checkOutRecords.length > 0) {
        // Update the latest check-out record
        const latestCheckOut = checkOutRecords[checkOutRecords.length - 1] as any
        const { error: updateCheckOutError } = await supabaseClient
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .update({
            check_time: finishTimeFormatted,
            location_id: locationId || latestCheckOut.location_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', latestCheckOut.id)
        
        if (updateCheckOutError) {
          console.error('❌ Error updating check-out record:', updateCheckOutError)
        }
      } else {
        // Create new check-out record
        const { error: createCheckOutError } = await supabaseClient
          .from(TABLES.ATTENDANCE_RECORDS)
          // @ts-ignore
          .insert([{
            employee_id: employeeTyped.id,
            date: date,
            check_time: finishTimeFormatted,
            type: 'Check-Out',
            location_id: locationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
        
        if (createCheckOutError) {
          console.error('❌ Error creating check-out record:', createCheckOutError)
        }
      }
      
      return {
        success: true,
        message: 'Attendance records updated successfully'
      }
    }
    
    return {
      success: true,
      message: 'No time data to sync'
    }
  } catch (error: any) {
    console.error('❌ Error syncing MANPOWER to attendance:', error)
    return {
      success: false,
      message: error.message || 'Failed to sync MANPOWER to attendance'
    }
  }
}

/**
 * Sync MANPOWER record deletion to Attendance Records
 * When a MANPOWER record is deleted, optionally delete the corresponding attendance records
 */
export async function syncManpowerDeletionToAttendance(
  employeeCode: string,
  date: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseClient = getSupabaseClient()
    
    // Get employee from attendance_employees
    const { data: employee, error: employeeError } = await supabaseClient
      .from(TABLES.ATTENDANCE_EMPLOYEES)
      // @ts-ignore
      .select('id')
      .eq('employee_code', employeeCode)
      .maybeSingle()
    
    if (employeeError || !employee) {
      console.warn(`⚠️ Employee ${employeeCode} not found in attendance_employees`)
      return {
        success: false,
        message: `Employee ${employeeCode} not found in attendance_employees`
      }
    }
    
    const employeeId = (employee as any).id
    
    // Note: We don't delete attendance records automatically when MANPOWER is deleted
    // because attendance records are the source of truth and may be needed for other purposes
    // Instead, we just log that the MANPOWER record was deleted
    
    console.log(`ℹ️ MANPOWER record deleted for ${employeeCode} on ${date}. Attendance records preserved.`)
    
    return {
      success: true,
      message: 'Attendance records preserved (not deleted)'
    }
  } catch (error: any) {
    console.error('❌ Error syncing MANPOWER deletion to attendance:', error)
    return {
      success: false,
      message: error.message || 'Failed to sync MANPOWER deletion to attendance'
    }
  }
}


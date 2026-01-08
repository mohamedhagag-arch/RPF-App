/**
 * Holidays Manager - Database-backed holiday management
 * Handles CRUD operations for holidays and integrates with workdays calculator
 */

import { getSupabaseClient } from './simpleConnectionManager'
import { Holiday } from './workdaysCalculator'
import { TABLES } from './supabase'

export interface DatabaseHoliday {
  id: string
  date: string
  name: string
  description?: string
  is_recurring: boolean
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface HolidayFormData {
  date: string
  name: string
  description?: string
  is_recurring: boolean
}

/**
 * Get all active holidays from database
 */
export async function getHolidays(): Promise<DatabaseHoliday[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await (supabase
      .from(TABLES.HOLIDAYS) as any)
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true })

    if (error) {
      console.error('❌ Error fetching holidays:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('❌ Failed to fetch holidays:', error)
    throw error
  }
}

/**
 * Get holidays for a specific year
 */
export async function getHolidaysForYear(year: number): Promise<DatabaseHoliday[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await (supabase
      .from(TABLES.HOLIDAYS) as any)
      .select('*')
      .eq('is_active', true)
      .or(`date.gte.${year}-01-01,date.lte.${year}-12-31,is_recurring.eq.true`)
      .order('date', { ascending: true })

    if (error) {
      console.error('❌ Error fetching holidays for year:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('❌ Failed to fetch holidays for year:', error)
    throw error
  }
}

/**
 * Add a new holiday
 */
export async function addHoliday(holiday: HolidayFormData): Promise<DatabaseHoliday> {
  try {
    const supabase = getSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await (supabase
      .from(TABLES.HOLIDAYS) as any)
      .insert({
        date: holiday.date,
        name: holiday.name,
        description: holiday.description || null,
        is_recurring: holiday.is_recurring,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error adding holiday:', error)
      throw error
    }

    console.log('✅ Holiday added successfully:', data.name)
    return data
  } catch (error) {
    console.error('❌ Failed to add holiday:', error)
    throw error
  }
}

/**
 * Update an existing holiday
 */
export async function updateHoliday(id: string, updates: Partial<HolidayFormData>): Promise<DatabaseHoliday> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await (supabase
      .from(TABLES.HOLIDAYS) as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating holiday:', error)
      throw error
    }

    console.log('✅ Holiday updated successfully:', data.name)
    return data
  } catch (error) {
    console.error('❌ Failed to update holiday:', error)
    throw error
  }
}

/**
 * Delete a holiday (soft delete by setting is_active to false)
 */
export async function deleteHoliday(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await (supabase
      .from(TABLES.HOLIDAYS) as any)
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting holiday:', error)
      throw error
    }

    console.log('✅ Holiday deleted successfully')
  } catch (error) {
    console.error('❌ Failed to delete holiday:', error)
    throw error
  }
}

/**
 * Convert database holiday to workdays calculator format
 */
export function convertToWorkdaysHoliday(dbHoliday: DatabaseHoliday): Holiday {
  return {
    date: dbHoliday.date,
    name: dbHoliday.name,
    isRecurring: dbHoliday.is_recurring
  }
}

/**
 * Get holidays formatted for workdays calculator
 */
export async function getWorkdaysHolidays(): Promise<Holiday[]> {
  try {
    const holidays = await getHolidays()
    return holidays.map(convertToWorkdaysHoliday)
  } catch (error) {
    console.error('❌ Failed to get workdays holidays:', error)
    return []
  }
}

/**
 * Get holidays for a specific date range (optimized - only holidays that actually fall in the range)
 */
export async function getHolidaysInRange(startDate: string, endDate: string): Promise<DatabaseHoliday[]> {
  try {
    const supabase = getSupabaseClient()
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    // ✅ OPTIMIZED: Get holidays in date range OR recurring holidays (we'll filter recurring ones)
    const { data, error } = await (supabase
      .from(TABLES.HOLIDAYS) as any)
      .select('*')
      .eq('is_active', true)
      .or(`and(date.gte.${startDate},date.lte.${endDate}),is_recurring.eq.true`)
      .limit(1000) // ✅ Limit to prevent huge queries
      .order('date', { ascending: true })

    if (error) {
      console.error('❌ Error fetching holidays in range:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // ✅ FAST FILTER: Only process holidays that actually fall in range
    const filteredHolidays: DatabaseHoliday[] = []
    const startTime = start.getTime()
    const endTime = end.getTime()
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    
    for (const holiday of data) {
      if (!holiday.is_recurring) {
        // Simple date check for non-recurring holidays
        const holidayTime = new Date(holiday.date).getTime()
        if (holidayTime >= startTime && holidayTime <= endTime) {
          filteredHolidays.push(holiday)
        }
      } else {
        // ✅ OPTIMIZED: For recurring holidays, check only start and end years (not all years)
        const holidayDate = new Date(holiday.date)
        const holidayMonth = holidayDate.getMonth()
        const holidayDay = holidayDate.getDate()
        
        // Check start year
        const startYearDate = new Date(startYear, holidayMonth, holidayDay)
        const startYearTime = startYearDate.getTime()
        if (startYearTime >= startTime && startYearTime <= endTime) {
          filteredHolidays.push({
            ...holiday,
            date: startYearDate.toISOString().split('T')[0]
          })
          continue
        }
        
        // Check end year (only if different from start year)
        if (endYear > startYear) {
          const endYearDate = new Date(endYear, holidayMonth, holidayDay)
          const endYearTime = endYearDate.getTime()
          if (endYearTime >= startTime && endYearTime <= endTime) {
            filteredHolidays.push({
              ...holiday,
              date: endYearDate.toISOString().split('T')[0]
            })
          }
        }
      }
    }
    
    // Sort by date (only if we have items)
    if (filteredHolidays.length > 0) {
      filteredHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    
    return filteredHolidays
  } catch (error) {
    console.error('❌ Failed to fetch holidays in range:', error)
    throw error
  }
}

/**
 * Check if a date is a holiday
 */
export async function isDateHoliday(date: string): Promise<boolean> {
  try {
    const holidays = await getHolidaysInRange(date, date)
    
    // Check for exact date match
    const exactMatch = holidays.some(holiday => holiday.date === date)
    if (exactMatch) return true
    
    // Check for recurring holidays (same month and day)
    const dateObj = new Date(date)
    const recurringMatch = holidays.some(holiday => {
      if (!holiday.is_recurring) return false
      const holidayDate = new Date(holiday.date)
      return dateObj.getMonth() === holidayDate.getMonth() && 
             dateObj.getDate() === holidayDate.getDate()
    })
    
    return recurringMatch
  } catch (error) {
    console.error('❌ Failed to check if date is holiday:', error)
    return false
  }
}


/**
 * Workdays Calculator - Smart Duration Calculation
 * Handles holidays, weekends, and custom non-working days
 */

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  isRecurring?: boolean // For annual holidays
}

export interface WorkdaysConfig {
  weekendDays: number[] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  holidays: Holiday[]
  includeWeekends?: boolean // For compressed projects
}

// Default configuration - Sunday is weekend
const DEFAULT_CONFIG: WorkdaysConfig = {
  weekendDays: [0], // Sunday
  holidays: [],
  includeWeekends: false
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date, config: WorkdaysConfig = DEFAULT_CONFIG): boolean {
  if (config.includeWeekends) return false
  return config.weekendDays.includes(date.getDay())
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date, config: WorkdaysConfig = DEFAULT_CONFIG): boolean {
  const dateStr = formatDateToYMD(date)
  return config.holidays.some(holiday => {
    if (holiday.isRecurring) {
      // Compare month and day only
      const holidayDate = new Date(holiday.date)
      return date.getMonth() === holidayDate.getMonth() && 
             date.getDate() === holidayDate.getDate()
    }
    return holiday.date === dateStr
  })
}

/**
 * Check if a date is a working day
 */
export function isWorkingDay(date: Date, config: WorkdaysConfig = DEFAULT_CONFIG): boolean {
  return !isWeekend(date, config) && !isHoliday(date, config)
}

/**
 * Calculate number of working days between two dates
 */
export function calculateWorkdays(
  startDate: Date | string,
  endDate: Date | string,
  config: WorkdaysConfig = DEFAULT_CONFIG
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate)
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate)
  
  let workdays = 0
  const current = new Date(start)
  
  while (current <= end) {
    if (isWorkingDay(current, config)) {
      workdays++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return workdays
}

/**
 * Get all working days between two dates
 */
export function getWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  config: WorkdaysConfig = DEFAULT_CONFIG
): Date[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate)
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate)
  
  const workingDays: Date[] = []
  const current = new Date(start)
  
  while (current <= end) {
    if (isWorkingDay(current, config)) {
      workingDays.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  
  return workingDays
}

/**
 * Add working days to a start date
 */
export function addWorkdays(
  startDate: Date | string,
  days: number,
  config: WorkdaysConfig = DEFAULT_CONFIG
): Date {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate)
  const result = new Date(start)
  let addedDays = 0
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    if (isWorkingDay(result, config)) {
      addedDays++
    }
  }
  
  return result
}

/**
 * Calculate end date from start date and duration (in working days)
 */
export function calculateEndDate(
  startDate: Date | string,
  durationInWorkdays: number,
  config: WorkdaysConfig = DEFAULT_CONFIG
): Date {
  if (durationInWorkdays <= 0) {
    return typeof startDate === 'string' ? new Date(startDate) : new Date(startDate)
  }
  return addWorkdays(startDate, durationInWorkdays - 1, config)
}

/**
 * Distribute quantity over working days
 * Uses smart rounding to ensure total equals exactly the input quantity
 */
export function distributeOverWorkdays(
  startDate: Date | string,
  endDate: Date | string,
  totalQuantity: number,
  config: WorkdaysConfig = DEFAULT_CONFIG
): Array<{ date: Date; quantity: number }> {
  const workingDays = getWorkingDays(startDate, endDate, config)
  
  if (workingDays.length === 0) {
    return []
  }
  
  // Calculate base quantity per day (rounded down to integer)
  const baseQuantity = Math.floor(totalQuantity / workingDays.length)
  
  // Calculate remainder to distribute
  const remainder = totalQuantity - (baseQuantity * workingDays.length)
  
  // Distribute: give base quantity to all, then add 1 to first 'remainder' days
  return workingDays.map((date, index) => ({
    date,
    quantity: index < remainder ? baseQuantity + 1 : baseQuantity
  }))
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDateToYMD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Common UAE Holidays (can be customized)
 */
export const UAE_HOLIDAYS: Holiday[] = [
  { date: '2024-01-01', name: 'New Year', isRecurring: true },
  { date: '2024-12-02', name: 'UAE National Day', isRecurring: true },
  { date: '2024-12-03', name: 'UAE National Day Holiday', isRecurring: true },
  // Islamic holidays (dates vary each year - these are examples)
  { date: '2024-04-10', name: 'Eid Al-Fitr', isRecurring: false },
  { date: '2024-04-11', name: 'Eid Al-Fitr Holiday', isRecurring: false },
  { date: '2024-04-12', name: 'Eid Al-Fitr Holiday', isRecurring: false },
  { date: '2024-06-15', name: 'Arafat Day', isRecurring: false },
  { date: '2024-06-16', name: 'Eid Al-Adha', isRecurring: false },
  { date: '2024-06-17', name: 'Eid Al-Adha Holiday', isRecurring: false },
  { date: '2024-06-18', name: 'Eid Al-Adha Holiday', isRecurring: false },
  { date: '2024-07-07', name: 'Islamic New Year', isRecurring: false },
  { date: '2024-09-15', name: 'Prophet\'s Birthday', isRecurring: false },
]

/**
 * Get holiday name for a specific date
 */
export function getHolidayName(date: Date, config: WorkdaysConfig = DEFAULT_CONFIG): string | null {
  const dateStr = formatDateToYMD(date)
  const holiday = config.holidays.find(h => {
    if (h.isRecurring) {
      const holidayDate = new Date(h.date)
      return date.getMonth() === holidayDate.getMonth() && 
             date.getDate() === holidayDate.getDate()
    }
    return h.date === dateStr
  })
  return holiday?.name || null
}

/**
 * Format date to display string
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}


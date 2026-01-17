/**
 * Date Parsing Utilities
 * Handles multiple date formats and converts them to YYYY-MM-DD format
 * for use with PostgreSQL DATE type
 */

/**
 * Parse date from various formats and convert to YYYY-MM-DD
 * Handles: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, YYYYMMDD, Excel serial dates, etc.
 * 
 * @param dateValue - Date value in any format (string, number, Date object)
 * @param defaultValue - Default date to return if parsing fails (default: '2025-12-31')
 * @returns Date string in YYYY-MM-DD format or defaultValue
 */
export function parseDateToYYYYMMDD(
  dateValue: string | number | Date | null | undefined,
  defaultValue: string = '2025-12-31'
): string {
  // Handle null/undefined/empty
  if (!dateValue && dateValue !== 0) {
    return defaultValue
  }

  // Handle Date objects
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) {
      return defaultValue
    }
    return dateValue.toISOString().split('T')[0]
  }

  // Convert to string and trim
  let dateStr = String(dateValue).trim()

  // Handle empty strings
  if (dateStr === '' || dateStr === 'null' || dateStr === 'undefined' || dateStr === 'N/A' || dateStr === '#DIV/0!' || dateStr === '#ERROR!') {
    return defaultValue
  }

  // Handle Excel serial dates (numeric values)
  const numValue = parseFloat(dateStr)
  if (!isNaN(numValue) && numValue > 0 && numValue < 1000000 && 
      !dateStr.includes('/') && !dateStr.includes('-') && !dateStr.includes('T')) {
    try {
      // Excel epoch: January 1, 1900 (but Excel treats 1900 as leap year, so adjust)
      let days = Math.floor(numValue)
      const isAfterFeb28_1900 = days > 59
      
      if (isAfterFeb28_1900) {
        days = days - 1
      }
      
      const epoch = new Date(1899, 11, 30)
      const dateObj = new Date(epoch.getTime() + (days - 1) * 24 * 60 * 60 * 1000)
      
      if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900 && dateObj.getFullYear() <= 2100) {
        return dateObj.toISOString().split('T')[0]
      }
    } catch (e) {
      // Fall through to other parsing methods
    }
  }

  // Format 1: Already in YYYY-MM-DD format (with or without time)
  const yyyyMMddMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
  if (yyyyMMddMatch) {
    const [, year, month, day] = yyyyMMddMatch
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)
    
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`
    }
  }

  // Format 2: YYYYMMDD (8 digits)
  const yyyyMMddNumericMatch = dateStr.match(/^(\d{8})$/)
  if (yyyyMMddNumericMatch) {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)
    
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`
    }
  }

  // Format 3: MM/DD/YYYY or M/D/YYYY
  const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)
    
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    }
  }

  // Format 4: DD/MM/YYYY or D/M/YYYY
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyyMatch && !mmddyyyyMatch) {
    // Only try DD/MM/YYYY if MM/DD/YYYY didn't match
    const [, day, month, year] = ddmmyyyyMatch
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)
    
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    }
  }

  // Format 5: DD-MMM-YY or D-MMM-YY (e.g., "6-Jan-25", "18-Jun-25")
  const ddmmyyMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)
  if (ddmmyyMatch) {
    const [, day, monthStr, yearStr] = ddmmyyMatch
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    const month = monthMap[monthStr]
    const year = '20' + yearStr
    
    if (month) {
      const dayNum = parseInt(day, 10)
      if (dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month}-${String(dayNum).padStart(2, '0')}`
      }
    }
  }

  // Format 6: Try JavaScript Date parsing as fallback
  try {
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900 && dateObj.getFullYear() <= 2100) {
      return dateObj.toISOString().split('T')[0]
    }
  } catch (e) {
    // Fall through to default
  }

  // If all parsing fails, return default
  return defaultValue
}

/**
 * Format date for Supabase DATE column (ensures YYYY-MM-DD format)
 * 
 * @param dateValue - Date value in any format
 * @returns Date string in YYYY-MM-DD format or empty string
 */
export function formatDateForSupabase(
  dateValue: string | number | Date | null | undefined
): string {
  if (!dateValue && dateValue !== 0) {
    return ''
  }
  
  const formatted = parseDateToYYYYMMDD(dateValue, '')
  return formatted || ''
}

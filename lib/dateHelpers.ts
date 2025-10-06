/**
 * Date Helper Functions for KPI and Activity Tracking
 * تابع المساعدة للتواريخ
 */

/**
 * Check if date is in the next week
 * التحقق إذا كان التاريخ في الأسبوع القادم
 */
export function isInNextWeek(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  return d >= today && d <= nextWeek
}

/**
 * Check if date is in the current week
 * التحقق إذا كان التاريخ في الأسبوع الحالي
 */
export function isInThisWeek(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  return d >= weekStart && d < weekEnd
}

/**
 * Check if date is in the current month
 * التحقق إذا كان التاريخ في الشهر الحالي
 */
export function isInThisMonth(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  return d.getMonth() === today.getMonth() && 
         d.getFullYear() === today.getFullYear()
}

/**
 * Check if date is in the next 4 weeks (lookahead)
 * التحقق إذا كان التاريخ في الأسابيع الأربعة القادمة
 */
export function isInNext4Weeks(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fourWeeks = new Date(today)
  fourWeeks.setDate(today.getDate() + 28)
  return d >= today && d <= fourWeeks
}

/**
 * Check if date is in the past
 * التحقق إذا كان التاريخ في الماضي
 */
export function isPast(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/**
 * Check if date is today
 * التحقق إذا كان التاريخ اليوم
 */
export function isToday(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear()
}

/**
 * Group KPIs by week
 * تجميع الأنشطة حسب الأسبوع
 */
export function groupByWeek(kpis: any[]): Record<string, any[]> {
  return kpis.reduce((groups, kpi) => {
    const date = kpi.activity_date || kpi.target_date || kpi.actual_date
    if (!date) return groups
    
    const d = new Date(date)
    const week = getWeekNumber(d)
    const year = d.getFullYear()
    const key = `${year}-W${week}`
    
    if (!groups[key]) groups[key] = []
    groups[key].push(kpi)
    return groups
  }, {} as Record<string, any[]>)
}

/**
 * Group KPIs by month
 * تجميع الأنشطة حسب الشهر
 */
export function groupByMonth(kpis: any[]): Record<string, any[]> {
  return kpis.reduce((groups, kpi) => {
    const date = kpi.activity_date || kpi.target_date || kpi.actual_date
    if (!date) return groups
    
    const d = new Date(date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    
    if (!groups[key]) groups[key] = []
    groups[key].push(kpi)
    return groups
  }, {} as Record<string, any[]>)
}

/**
 * Get week number of the year
 * الحصول على رقم الأسبوع في السنة
 */
export function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + firstDay.getDay() + 1) / 7)
}

/**
 * Format date for display (e.g., "15 Jan 2025")
 * تنسيق التاريخ للعرض
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  } catch (err) {
    return 'Invalid Date'
  }
}

/**
 * Format date for display (short version, e.g., "15 Jan")
 * تنسيق التاريخ للعرض (نسخة قصيرة)
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short'
    })
  } catch (err) {
    return 'Invalid'
  }
}

/**
 * Calculate days difference between two dates
 * حساب فرق الأيام بين تاريخين
 */
export function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days until date (negative if past)
 * حساب الأيام حتى التاريخ (سالب إذا كان في الماضي)
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diffTime = date.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get relative time description (e.g., "in 3 days", "2 days ago")
 * الحصول على وصف نسبي للوقت
 */
export function getRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date'
  
  const days = daysUntil(dateStr)
  if (days === null) return 'No date'
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

/**
 * Get date range for this week
 * الحصول على نطاق تواريخ هذا الأسبوع
 */
export function getThisWeekRange(): { start: Date, end: Date } {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { start: weekStart, end: weekEnd }
}

/**
 * Get date range for next week
 * الحصول على نطاق تواريخ الأسبوع القادم
 */
export function getNextWeekRange(): { start: Date, end: Date } {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { start: weekStart, end: weekEnd }
}

/**
 * Get date range for this month
 * الحصول على نطاق تواريخ هذا الشهر
 */
export function getThisMonthRange(): { start: Date, end: Date } {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Check if date is in range
 * التحقق إذا كان التاريخ في نطاق معين
 */
export function isInDateRange(
  dateStr: string | null | undefined,
  startDate: Date,
  endDate: Date
): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  return date >= startDate && date <= endDate
}

/**
 * Filter KPIs by date range
 * تصفية الأنشطة حسب نطاق زمني
 */
export function filterByDateRange(
  kpis: any[],
  startDate: Date,
  endDate: Date,
  dateField: 'activity_date' | 'target_date' | 'actual_date' = 'activity_date'
): any[] {
  return kpis.filter(kpi => 
    isInDateRange(kpi[dateField], startDate, endDate)
  )
}


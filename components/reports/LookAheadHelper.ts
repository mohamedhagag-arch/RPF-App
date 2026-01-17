// Helper functions for LookAhead Planning Report
// Based on: Remaining Quantity / Actual Productivity = Remaining Days

import { BOQActivity } from '@/lib/supabase'

export interface ActivityLookAhead {
  activity: BOQActivity
  totalUnits: number
  actualUnits: number
  remainingUnits: number
  actualProductivity: number
  plannedProductivity: number
  remainingDays: number
  completionDate: Date | null
  isCompleted: boolean
}

export interface ProjectLookAhead {
  projectId: string
  projectCode: string
  projectName: string
  activities: ActivityLookAhead[]
  latestCompletionDate: Date | null
  completionMonth: string | null
  completionWeek: string | null
  completionDay: string | null
}

/**
 * Match KPI to Activity (same logic as BOQTableWithCustomization)
 */
export function kpiMatchesActivity(kpi: any, activity: BOQActivity): boolean {
  const rawKPI = (kpi as any).raw || {}
  
  // 1. Project Code Matching (ULTRA STRICT)
  const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
  const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
  const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
  const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
  
  let projectMatch = false
  
  if (activityProjectFullCode && activityProjectFullCode.includes('-')) {
    // Activity has sub-code - KPI MUST have EXACT Project Full Code match
    if (kpiProjectFullCode && kpiProjectFullCode === activityProjectFullCode) {
      projectMatch = true
    }
  } else {
    // Activity has no sub-code - Match by Project Code or Project Full Code
    projectMatch = (
      (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
      (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
      (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
      (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
    )
  }
  
  if (!projectMatch) return false
  
  // 2. Activity Name Matching
  const kpiActivityName = (kpi.activity_description || (kpi as any).activity_name || kpi['Activity Description'] || kpi['Activity Name'] || (kpi as any).activity || rawKPI['Activity Description'] || rawKPI['Activity Name'] || '').toLowerCase().trim()
  const activityName = (activity.activity_description || '').toLowerCase().trim()
  const activityMatch = kpiActivityName && activityName && (
    kpiActivityName === activityName || 
    kpiActivityName.includes(activityName) || 
    activityName.includes(kpiActivityName)
  )
  
  if (!activityMatch) return false
  
  // 3. Zone Matching (simplified - if activity has zone, KPI should have matching zone)
  // Note: For LookAhead, we'll be more lenient with zone matching to get productivity data
  // This is acceptable since we're calculating aggregate productivity, not exact activity matching
  
  return true
}

/**
 * Get KPI Quantity
 */
export function getKPIQuantity(kpi: any): number {
  const raw = (kpi as any).raw || {}
  const quantityStr = String(
    kpi.quantity || 
    kpi['Quantity'] || 
    kpi.Quantity ||
    raw['Quantity'] || 
    raw.Quantity ||
    '0'
  ).replace(/,/g, '').trim()
  return parseFloat(quantityStr) || 0
}

/**
 * Check if KPI date is until yesterday
 */
export function isKPIUntilYesterday(kpi: any, inputType: 'planned' | 'actual'): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(23, 59, 59, 999)
  
  const raw = (kpi as any).raw || {}
  let kpiDateStr = ''
  
  // Use Activity Date (filtered by Input Type)
  kpiDateStr = kpi.activity_date || 
              kpi['Activity Date'] || 
              raw['Activity Date'] ||
              raw['Date'] ||
              kpi.date ||
              kpi.created_at ||
              ''
  
  if (!kpiDateStr) return true // If no date, include it
  
  try {
    const kpiDate = new Date(kpiDateStr)
    if (isNaN(kpiDate.getTime())) return true
    return kpiDate <= yesterday
  } catch {
    return true
  }
}

/**
 * Calculate Activity LookAhead
 */
export function calculateActivityLookAhead(
  activity: BOQActivity,
  allKPIs: any[]
): ActivityLookAhead {
  const rawActivity = (activity as any).raw || {}
  
  // 1. Get Total Units
  const totalUnits = activity.total_units || 
                    activity.planned_units ||
                    parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                    0
  
  // 2. Calculate Actual Units from KPIs Actual
  let actualUnits = 0
  let actualDays = 0
  const actualDaysSet = new Set<string>()
  
  if (allKPIs.length > 0) {
    // Filter Actual KPIs
    const actualKPIs = allKPIs.filter((kpi: any) => {
      const inputType = String(
        kpi.input_type || 
        kpi['Input Type'] || 
        (kpi as any).raw?.['Input Type'] || 
        (kpi as any).raw?.['input_type'] ||
        ''
      ).trim().toLowerCase()
      
      return inputType === 'actual' && kpiMatchesActivity(kpi, activity)
    })
    
    // Filter until yesterday
    const actualKPIsUntilYesterday = actualKPIs.filter((kpi: any) => isKPIUntilYesterday(kpi, 'actual'))
    
    // Sum quantities
    actualUnits = actualKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
      return sum + getKPIQuantity(kpi)
    }, 0)
    
    // Count unique dates
    actualKPIsUntilYesterday.forEach((kpi: any) => {
      const raw = (kpi as any).raw || {}
      const kpiDateStr = kpi.activity_date || 
                        kpi['Activity Date'] || 
                        raw['Activity Date'] ||
                        kpi.created_at ||
                        ''
      
      if (kpiDateStr) {
        try {
          const kpiDate = new Date(kpiDateStr)
          if (!isNaN(kpiDate.getTime())) {
            const dateKey = kpiDate.toISOString().split('T')[0]
            actualDaysSet.add(dateKey)
          }
        } catch {
          // Skip invalid dates
        }
      }
    })
    
    actualDays = actualDaysSet.size
  }
  
  // Cap Actual to not exceed Total
  const cappedActual = totalUnits > 0 ? Math.min(actualUnits, totalUnits) : actualUnits
  
  // 3. Calculate Remaining Units
  const remainingUnits = Math.max(0, totalUnits - cappedActual)
  
  // 4. Calculate Actual Productivity
  let actualProductivity = 0
  if (actualUnits > 0 && actualDays > 0) {
    actualProductivity = actualUnits / actualDays
  }
  
  // 5. Calculate Planned Productivity (fallback)
  const calendarDuration = activity.calendar_duration || 
                          parseFloat(String(rawActivity['Calendar Duration'] || '0')) ||
                          0
  let plannedProductivity = 0
  if (totalUnits > 0 && calendarDuration > 0) {
    plannedProductivity = totalUnits / calendarDuration
  }
  
  // 6. Use Actual Productivity if available, otherwise Planned Productivity
  const productivity = actualProductivity > 0 ? actualProductivity : plannedProductivity
  
  // 7. Calculate Remaining Days
  let remainingDays = 0
  let completionDate: Date | null = null
  const isCompleted = remainingUnits === 0 && totalUnits > 0
  
  if (!isCompleted && productivity > 0) {
    remainingDays = Math.ceil(remainingUnits / productivity)
    
    // Calculate completion date (today + remaining days, excluding weekends)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let currentDate = new Date(today)
    let workdaysAdded = 0
    
    while (workdaysAdded < remainingDays) {
      const dayOfWeek = currentDate.getDay()
      // Exclude Friday (5) and Saturday (6)
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        workdaysAdded++
      }
      if (workdaysAdded < remainingDays) {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    completionDate = currentDate
  }
  
  return {
    activity,
    totalUnits,
    actualUnits: cappedActual,
    remainingUnits,
    actualProductivity,
    plannedProductivity,
    remainingDays,
    completionDate,
    isCompleted
  }
}

/**
 * Calculate Project LookAhead
 */
export function calculateProjectLookAhead(
  project: any,
  projectActivities: BOQActivity[],
  allKPIs: any[]
): ProjectLookAhead {
  // Calculate LookAhead for each activity
  const activities = projectActivities.map(activity => 
    calculateActivityLookAhead(activity, allKPIs)
  )
  
  // Find latest completion date
  const completionDates = activities
    .filter(a => a.completionDate !== null)
    .map(a => a.completionDate!)
  
  const latestCompletionDate = completionDates.length > 0
    ? new Date(Math.max(...completionDates.map(d => d.getTime())))
    : null
  
  // Format completion date
  let completionMonth: string | null = null
  let completionWeek: string | null = null
  let completionDay: string | null = null
  
  if (latestCompletionDate) {
    completionMonth = latestCompletionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    
    // Calculate week number
    const startOfYear = new Date(latestCompletionDate.getFullYear(), 0, 1)
    const days = Math.floor((latestCompletionDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    completionWeek = `Week ${weekNumber}, ${latestCompletionDate.getFullYear()}`
    
    completionDay = latestCompletionDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  
  return {
    projectId: project.id,
    projectCode: project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`,
    projectName: project.project_name || '',
    activities,
    latestCompletionDate,
    completionMonth,
    completionWeek,
    completionDay
  }
}


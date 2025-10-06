/**
 * Advanced Reporting System for Planning Data
 * 
 * This system tracks actual work completion with timestamps
 * and generates daily, weekly, and monthly reports
 */

import { BOQActivity, KPIRecord } from './supabase'

// Extended interfaces with timestamp tracking
export interface ActualWorkEntry {
  id: string
  activity_id: string
  project_code: string
  actual_value: number
  entry_date: Date | string
  entered_by: string
  notes?: string
  week_number?: number
  month: number
  year: number
}

export interface WorkReport {
  period: 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  totalPlanned: number
  totalActual: number
  completedActivities: number
  ongoingActivities: number
  delayedActivities: number
  progressPercentage: number
  activities: BOQActivity[]
}

export interface LookaheadReport {
  currentWeek: {
    weekNumber: number
    startDate: Date
    endDate: Date
    plannedActivities: BOQActivity[]
    completedActivities: BOQActivity[]
    inProgressActivities: BOQActivity[]
  }
  nextWeek: {
    weekNumber: number
    startDate: Date
    endDate: Date
    plannedActivities: BOQActivity[]
    estimatedWorkload: number
  }
  upcoming: {
    activities: BOQActivity[]
    criticalPath: BOQActivity[]
  }
}

export interface ProjectSummary {
  totalWork: {
    planned: number
    actual: number
    remaining: number
  }
  progress: {
    percentage: number
    status: 'on_track' | 'delayed' | 'ahead' | 'at_risk'
  }
  byPeriod: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
  }
}

/**
 * Calculate week number of the year
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Get start and end dates of a week
 */
export function getWeekDates(weekNumber: number, year: number): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7)
  const dayOfWeek = simple.getDay()
  const weekStart = new Date(simple)
  weekStart.setDate(simple.getDate() - dayOfWeek)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  
  return { start: weekStart, end: weekEnd }
}

/**
 * Filter activities by date range
 */
export function filterActivitiesByDateRange(
  activities: BOQActivity[],
  startDate: Date,
  endDate: Date,
  dateField: 'planned_activity_start_date' | 'deadline' | 'activity_planned_completion_date' = 'deadline'
): BOQActivity[] {
  return activities.filter(activity => {
    const activityDate = new Date(activity[dateField])
    return activityDate >= startDate && activityDate <= endDate
  })
}

/**
 * Generate Daily Report
 */
export function generateDailyReport(
  activities: BOQActivity[],
  date: Date = new Date()
): WorkReport {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  const todayActivities = activities.filter(activity => {
    const activityDate = new Date(activity.deadline)
    return activityDate >= startOfDay && activityDate <= endOfDay
  })
  
  const totalPlanned = todayActivities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
  const totalActual = todayActivities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
  const completedCount = todayActivities.filter(a => a.activity_completed).length
  const ongoingCount = todayActivities.filter(a => !a.activity_completed && a.actual_units > 0).length
  const delayedCount = todayActivities.filter(a => a.activity_delayed).length
  
  return {
    period: 'daily',
    startDate: startOfDay,
    endDate: endOfDay,
    totalPlanned,
    totalActual,
    completedActivities: completedCount,
    ongoingActivities: ongoingCount,
    delayedActivities: delayedCount,
    progressPercentage: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
    activities: todayActivities
  }
}

/**
 * Generate Weekly Report
 */
export function generateWeeklyReport(
  activities: BOQActivity[],
  weekNumber?: number,
  year?: number
): WorkReport {
  const now = new Date()
  const currentWeek = weekNumber || getWeekNumber(now)
  const currentYear = year || now.getFullYear()
  
  const { start, end } = getWeekDates(currentWeek, currentYear)
  
  const weekActivities = filterActivitiesByDateRange(activities, start, end)
  
  const totalPlanned = weekActivities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
  const totalActual = weekActivities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
  const completedCount = weekActivities.filter(a => a.activity_completed).length
  const ongoingCount = weekActivities.filter(a => !a.activity_completed && a.actual_units > 0).length
  const delayedCount = weekActivities.filter(a => a.activity_delayed).length
  
  return {
    period: 'weekly',
    startDate: start,
    endDate: end,
    totalPlanned,
    totalActual,
    completedActivities: completedCount,
    ongoingActivities: ongoingCount,
    delayedActivities: delayedCount,
    progressPercentage: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
    activities: weekActivities
  }
}

/**
 * Generate Monthly Report
 */
export function generateMonthlyReport(
  activities: BOQActivity[],
  month?: number,
  year?: number
): WorkReport {
  const now = new Date()
  const targetMonth = month !== undefined ? month : now.getMonth()
  const targetYear = year || now.getFullYear()
  
  const startOfMonth = new Date(targetYear, targetMonth, 1)
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)
  
  const monthActivities = filterActivitiesByDateRange(activities, startOfMonth, endOfMonth)
  
  const totalPlanned = monthActivities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
  const totalActual = monthActivities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
  const completedCount = monthActivities.filter(a => a.activity_completed).length
  const ongoingCount = monthActivities.filter(a => !a.activity_completed && a.actual_units > 0).length
  const delayedCount = monthActivities.filter(a => a.activity_delayed).length
  
  return {
    period: 'monthly',
    startDate: startOfMonth,
    endDate: endOfMonth,
    totalPlanned,
    totalActual,
    completedActivities: completedCount,
    ongoingActivities: ongoingCount,
    delayedActivities: delayedCount,
    progressPercentage: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
    activities: monthActivities
  }
}

/**
 * Generate Lookahead Report (Current Week + Next Week)
 */
export function generateLookaheadReport(
  activities: BOQActivity[],
  currentDate: Date = new Date()
): LookaheadReport {
  const currentWeek = getWeekNumber(currentDate)
  const currentYear = currentDate.getFullYear()
  
  // Current week
  const currentWeekDates = getWeekDates(currentWeek, currentYear)
  const currentWeekActivities = filterActivitiesByDateRange(
    activities,
    currentWeekDates.start,
    currentWeekDates.end
  )
  
  // Next week
  const nextWeekDates = getWeekDates(currentWeek + 1, currentYear)
  const nextWeekActivities = filterActivitiesByDateRange(
    activities,
    nextWeekDates.start,
    nextWeekDates.end
  )
  
  // Upcoming activities (beyond next week)
  const upcomingStartDate = new Date(nextWeekDates.end)
  upcomingStartDate.setDate(upcomingStartDate.getDate() + 1)
  
  const upcomingActivities = activities.filter(activity => {
    const activityDate = new Date(activity.deadline)
    return activityDate > upcomingStartDate
  }).sort((a, b) => {
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
  
  // Critical path (delayed or at risk)
  const criticalActivities = upcomingActivities.filter(
    a => a.activity_delayed || a.activity_progress_percentage < 50
  )
  
  return {
    currentWeek: {
      weekNumber: currentWeek,
      startDate: currentWeekDates.start,
      endDate: currentWeekDates.end,
      plannedActivities: currentWeekActivities,
      completedActivities: currentWeekActivities.filter(a => a.activity_completed),
      inProgressActivities: currentWeekActivities.filter(a => !a.activity_completed && a.actual_units > 0)
    },
    nextWeek: {
      weekNumber: currentWeek + 1,
      startDate: nextWeekDates.start,
      endDate: nextWeekDates.end,
      plannedActivities: nextWeekActivities,
      estimatedWorkload: nextWeekActivities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
    },
    upcoming: {
      activities: upcomingActivities.slice(0, 20), // Next 20 activities
      criticalPath: criticalActivities.slice(0, 10) // Top 10 critical
    }
  }
}

/**
 * Generate Project Summary
 */
export function generateProjectSummary(
  activities: BOQActivity[]
): ProjectSummary {
  const totalPlanned = activities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
  const totalActual = activities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
  const totalRemaining = totalPlanned - totalActual
  
  const progressPercentage = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
  
  // Determine status
  let status: 'on_track' | 'delayed' | 'ahead' | 'at_risk' = 'on_track'
  if (progressPercentage >= 100) {
    status = 'ahead'
  } else if (progressPercentage >= 80) {
    status = 'on_track'
  } else if (progressPercentage >= 50) {
    status = 'at_risk'
  } else {
    status = 'delayed'
  }
  
  // Calculate work by period
  const today = generateDailyReport(activities)
  const thisWeek = generateWeeklyReport(activities)
  const thisMonth = generateMonthlyReport(activities)
  
  return {
    totalWork: {
      planned: totalPlanned,
      actual: totalActual,
      remaining: totalRemaining
    },
    progress: {
      percentage: progressPercentage,
      status
    },
    byPeriod: {
      today: today.totalActual,
      thisWeek: thisWeek.totalActual,
      thisMonth: thisMonth.totalActual,
      total: totalActual
    }
  }
}

/**
 * Get activities completed in a date range
 */
export function getCompletedActivitiesInRange(
  activities: BOQActivity[],
  startDate: Date,
  endDate: Date
): BOQActivity[] {
  return activities.filter(activity => {
    if (!activity.activity_completed) return false
    
    // Assuming completion date is when actual = planned or deadline
    const completionDate = new Date(activity.deadline)
    return completionDate >= startDate && completionDate <= endDate
  })
}

/**
 * Get remaining work breakdown
 */
export function getRemainingWorkBreakdown(activities: BOQActivity[]) {
  const remaining = activities.filter(a => !a.activity_completed)
  
  return {
    total: remaining.length,
    byStatus: {
      notStarted: remaining.filter(a => a.actual_units === 0).length,
      inProgress: remaining.filter(a => a.actual_units > 0 && a.actual_units < a.planned_units).length,
      delayed: remaining.filter(a => a.activity_delayed).length
    },
    byDivision: remaining.reduce((acc, activity) => {
      const division = activity.activity_division || 'Unknown'
      acc[division] = (acc[division] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    estimatedCompletion: remaining.reduce((sum, a) => sum + (a.planned_units - a.actual_units), 0)
  }
}

/**
 * Format report for export
 */
export function formatReportForExport(report: WorkReport) {
  return {
    title: `${report.period.toUpperCase()} Report`,
    period: `${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`,
    summary: {
      'Total Planned': report.totalPlanned,
      'Total Actual': report.totalActual,
      'Progress %': report.progressPercentage.toFixed(2) + '%',
      'Completed Activities': report.completedActivities,
      'Ongoing Activities': report.ongoingActivities,
      'Delayed Activities': report.delayedActivities
    },
    activities: report.activities.map(a => ({
      'Activity Name': a.activity_name,
      'Project': a.project_code,
      'Planned': a.planned_units,
      'Actual': a.actual_units,
      'Progress %': a.activity_progress_percentage.toFixed(1) + '%',
      'Status': a.activity_completed ? 'Completed' : a.activity_delayed ? 'Delayed' : 'In Progress'
    }))
  }
}


/**
 * Rate Calculator System
 * 
 * Calculates rates automatically for activities and projects
 * Rate = Value / Quantity
 */

import { BOQActivity, KPIRecord, Project } from './supabase'

export interface ActivityRate {
  activityId: string
  activityName: string
  projectCode: string
  plannedUnits: number
  plannedValue: number
  rate: number // Value per unit
  actualUnits: number
  actualValue: number
  earnedValue: number
  progress: number
}

export interface ProjectRate {
  projectId: string
  projectCode: string
  projectName: string
  totalPlannedValue: number
  totalEarnedValue: number
  totalProgress: number
  activities: ActivityRate[]
  performance: {
    onSchedule: boolean
    onBudget: boolean
    overall: 'excellent' | 'good' | 'fair' | 'poor'
  }
}

/**
 * Calculate rate for a single activity
 * Rate = Planned Value / Planned Units
 */
export function calculateActivityRate(activity: BOQActivity): ActivityRate {
  const plannedUnits = parseFloat(activity.planned_units?.toString() || '0')
  // ✅ Use total_value for old data compatibility, fallback to planned_value
  const plannedValue = parseFloat(activity.total_value?.toString() || activity.planned_value?.toString() || '0')
  const actualUnits = parseFloat(activity.actual_units?.toString() || '0')
  
  // Calculate rate (value per unit)
  const rate = plannedUnits > 0 ? plannedValue / plannedUnits : 0
  
  // Calculate actual value based on actual units
  const actualValue = actualUnits * rate
  
  // Calculate earned value (actual value achieved)
  const earnedValue = Math.min(actualValue, plannedValue)
  
  // Calculate progress percentage
  const progress = plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0
  
  return {
    activityId: activity.id,
    activityName: activity.activity_name || '',
    projectCode: activity.project_code || '',
    plannedUnits,
    plannedValue,
    rate,
    actualUnits,
    actualValue,
    earnedValue,
    progress: Math.min(progress, 100) // Cap at 100%
  }
}

/**
 * Calculate rates for multiple activities
 */
export function calculateActivitiesRates(activities: BOQActivity[]): ActivityRate[] {
  return activities.map(calculateActivityRate)
}

/**
 * Calculate project rate and performance
 */
export function calculateProjectRate(
  project: Project,
  activities: BOQActivity[],
  kpis: KPIRecord[] = []
): ProjectRate {
  const projectActivities = activities.filter(
    activity => activity.project_code === project.project_code
  )
  
  // Calculate rates for all activities
  const activityRates = calculateActivitiesRates(projectActivities)
  
  // Calculate totals
  const totalPlannedValue = activityRates.reduce((sum, activity) => sum + activity.plannedValue, 0)
  const totalEarnedValue = activityRates.reduce((sum, activity) => sum + activity.earnedValue, 0)
  const totalProgress = totalPlannedValue > 0 ? (totalEarnedValue / totalPlannedValue) * 100 : 0
  
  // Calculate performance metrics
  const avgActivityProgress = activityRates.length > 0 
    ? activityRates.reduce((sum, activity) => sum + activity.progress, 0) / activityRates.length
    : 0
  
  // Determine performance status
  let overall: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  if (totalProgress >= 90) overall = 'excellent'
  else if (totalProgress >= 75) overall = 'good'
  else if (totalProgress >= 50) overall = 'fair'
  
  // Check if on schedule (based on KPI data if available)
  const onSchedule = kpis.length > 0 
    ? checkSchedulePerformance(kpis, project.project_code)
    : totalProgress >= 75 // Default assumption
  
  // Check if on budget
  const onBudget = totalEarnedValue <= totalPlannedValue
  
  return {
    projectId: project.id,
    projectCode: project.project_code || '',
    projectName: project.project_name || '',
    totalPlannedValue,
    totalEarnedValue,
    totalProgress: Math.min(totalProgress, 100),
    activities: activityRates,
    performance: {
      onSchedule,
      onBudget,
      overall
    }
  }
}

/**
 * Calculate rates for multiple projects
 */
export function calculateProjectsRates(
  projects: Project[],
  activities: BOQActivity[],
  kpis: KPIRecord[] = []
): ProjectRate[] {
  return projects.map(project => 
    calculateProjectRate(project, activities, kpis)
  )
}

/**
 * Check schedule performance based on KPI data
 */
function checkSchedulePerformance(kpis: KPIRecord[], projectCode: string): boolean {
  const projectKPIs = kpis.filter(kpi => kpi.project_full_code === projectCode)
  
  if (projectKPIs.length === 0) return true // No data, assume on schedule
  
  // Check if actual dates are within target dates
  const overdueKPIs = projectKPIs.filter(kpi => {
    const targetDate = new Date(kpi.target_date || '')
    const actualDate = new Date(kpi.actual_date || '')
    const today = new Date()
    
    // If no actual date, check if target date has passed
    if (!kpi.actual_date) {
      return targetDate < today
    }
    
    // If actual date is after target date
    return actualDate > targetDate
  })
  
  // Consider on schedule if less than 20% of KPIs are overdue
  const overduePercentage = (overdueKPIs.length / projectKPIs.length) * 100
  return overduePercentage < 20
}

/**
 * Get rate summary for dashboard
 */
export function getRateSummary(projectRates: ProjectRate[]) {
  const totalProjects = projectRates.length
  const totalPlannedValue = projectRates.reduce((sum, project) => sum + project.totalPlannedValue, 0)
  const totalEarnedValue = projectRates.reduce((sum, project) => sum + project.totalEarnedValue, 0)
  const overallProgress = totalPlannedValue > 0 ? (totalEarnedValue / totalPlannedValue) * 100 : 0
  
  const performanceCounts = {
    excellent: projectRates.filter(p => p.performance.overall === 'excellent').length,
    good: projectRates.filter(p => p.performance.overall === 'good').length,
    fair: projectRates.filter(p => p.performance.overall === 'fair').length,
    poor: projectRates.filter(p => p.performance.overall === 'poor').length
  }
  
  const onScheduleCount = projectRates.filter(p => p.performance.onSchedule).length
  const onBudgetCount = projectRates.filter(p => p.performance.onBudget).length
  
  return {
    totalProjects,
    totalPlannedValue,
    totalEarnedValue,
    overallProgress: Math.min(overallProgress, 100),
    performanceCounts,
    onScheduleCount,
    onBudgetCount,
    onSchedulePercentage: totalProjects > 0 ? (onScheduleCount / totalProjects) * 100 : 0,
    onBudgetPercentage: totalProjects > 0 ? (onBudgetCount / totalProjects) * 100 : 0
  }
}

/**
 * Calculate activity progress based on KPI actual records
 */
export function calculateActivityProgressFromKPI(
  activity: BOQActivity,
  kpis: KPIRecord[]
): number {
  const activityKPIs = kpis.filter(kpi => 
    kpi.activity_name === activity.activity_name &&
    kpi.project_full_code === activity.project_code &&
    kpi.input_type === 'Actual'
  )
  
  if (activityKPIs.length === 0) return 0
  
  // Sum all actual quantities from KPIs
  const totalActualQuantity = activityKPIs.reduce((sum, kpi) => {
    return sum + parseFloat(kpi.quantity?.toString() || '0')
  }, 0)
  
  // Calculate progress based on actual vs planned units
  const plannedUnits = parseFloat(activity.planned_units?.toString() || '0')
  if (plannedUnits === 0) return 0
  
  const progress = (totalActualQuantity / plannedUnits) * 100
  return Math.min(progress, 100)
}

/**
 * Update activity rates with KPI data
 */
export function updateActivityRateWithKPI(
  activityRate: ActivityRate,
  kpis: KPIRecord[]
): ActivityRate {
  const activityKPIs = kpis.filter(kpi => 
    kpi.activity_name === activityRate.activityName &&
    kpi.project_full_code === activityRate.projectCode &&
    kpi.input_type === 'Actual'
  )
  
  // Calculate actual units from KPI data
  const actualUnitsFromKPI = activityKPIs.reduce((sum, kpi) => {
    return sum + parseFloat(kpi.quantity?.toString() || '0')
  }, 0)
  
  // Update actual units and recalculate
  const updatedActualUnits = Math.max(activityRate.actualUnits, actualUnitsFromKPI)
  const updatedActualValue = updatedActualUnits * activityRate.rate
  const updatedEarnedValue = Math.min(updatedActualValue, activityRate.plannedValue)
  const updatedProgress = activityRate.plannedValue > 0 
    ? (updatedEarnedValue / activityRate.plannedValue) * 100 
    : 0
  
  return {
    ...activityRate,
    actualUnits: updatedActualUnits,
    actualValue: updatedActualValue,
    earnedValue: updatedEarnedValue,
    progress: Math.min(updatedProgress, 100)
  }
}

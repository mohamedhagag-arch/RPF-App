/**
 * Progress Calculator System
 * 
 * Calculates progress for activities and projects using rate-based calculations
 */

import { BOQActivity, KPIRecord, Project } from './supabase'
import { ActivityRate, ProjectRate, calculateActivityRate, calculateProjectRate } from './rateCalculator'

export interface ProgressMetrics {
  plannedValue: number
  earnedValue: number
  actualCost: number
  progress: number
  schedulePerformance: number
  costPerformance: number
  variance: number
  status: 'on-track' | 'behind' | 'ahead' | 'at-risk'
}

export interface ActivityProgress {
  activityId: string
  activityName: string
  projectCode: string
  metrics: ProgressMetrics
  rate: number
  completionDate?: Date
  estimatedCompletion?: Date
}

export interface ProjectProgress {
  projectId: string
  projectCode: string
  projectName: string
  overallMetrics: ProgressMetrics
  activities: ActivityProgress[]
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  recommendations: string[]
}

/**
 * Calculate progress metrics for an activity
 */
export function calculateActivityProgress(
  activity: BOQActivity,
  kpis: KPIRecord[] = []
): ActivityProgress {
  const activityRate = calculateActivityRate(activity)
  
  // Get KPI data for this activity
  const activityKPIs = kpis.filter(kpi => 
    kpi.activity_name === activity.activity_name &&
    kpi.project_full_code === activity.project_code &&
    kpi.input_type === 'Actual'
  )
  
  // Calculate actual units from KPI data
  const actualUnitsFromKPI = activityKPIs.reduce((sum, kpi) => {
    return sum + parseFloat(kpi.quantity?.toString() || '0')
  }, 0)
  
  // Use the higher of BOQ actual units or KPI actual units
  const actualUnits = Math.max(
    parseFloat(activity.actual_units?.toString() || '0'),
    actualUnitsFromKPI
  )
  
  // Calculate metrics
  const plannedValue = activityRate.plannedValue
  const earnedValue = actualUnits * activityRate.rate
  const actualCost = parseFloat((activity as any).actual_cost?.toString() || '0') || earnedValue
  
  const progress = plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0
  const schedulePerformance = calculateSchedulePerformance(activityKPIs)
  const costPerformance = actualCost > 0 ? earnedValue / actualCost : 1
  const variance = earnedValue - plannedValue
  
  // Determine status
  let status: 'on-track' | 'behind' | 'ahead' | 'at-risk' = 'on-track'
  if (progress < 50 && schedulePerformance < 0.8) status = 'behind'
  else if (progress > 100) status = 'ahead'
  else if (costPerformance < 0.8) status = 'at-risk'
  
  // Calculate completion dates
  const completionDate = getLatestActualDate(activityKPIs)
  const estimatedCompletion = calculateEstimatedCompletion(
    activity,
    actualUnits,
    activityRate.rate
  )
  
  return {
    activityId: activity.id,
    activityName: activity.activity_name || '',
    projectCode: activity.project_code || '',
    metrics: {
      plannedValue,
      earnedValue,
      actualCost,
      progress: Math.min(progress, 100),
      schedulePerformance,
      costPerformance,
      variance,
      status
    },
    rate: activityRate.rate,
    completionDate,
    estimatedCompletion
  }
}

/**
 * Calculate project progress
 */
export function calculateProjectProgress(
  project: Project,
  activities: BOQActivity[],
  kpis: KPIRecord[] = []
): ProjectProgress {
  const projectActivities = activities.filter(
    activity => activity.project_code === project.project_code
  )
  
  // Calculate progress for all activities
  const activityProgresses = projectActivities.map(activity => 
    calculateActivityProgress(activity, kpis)
  )
  
  // Calculate overall project metrics
  const totalPlannedValue = activityProgresses.reduce(
    (sum, activity) => sum + activity.metrics.plannedValue, 0
  )
  const totalEarnedValue = activityProgresses.reduce(
    (sum, activity) => sum + activity.metrics.earnedValue, 0
  )
  const totalActualCost = activityProgresses.reduce(
    (sum, activity) => sum + activity.metrics.actualCost, 0
  )
  
  const overallProgress = totalPlannedValue > 0 
    ? (totalEarnedValue / totalPlannedValue) * 100 
    : 0
  
  const overallSchedulePerformance = activityProgresses.length > 0
    ? activityProgresses.reduce((sum, activity) => sum + activity.metrics.schedulePerformance, 0) / activityProgresses.length
    : 1
  
  const overallCostPerformance = totalActualCost > 0 
    ? totalEarnedValue / totalActualCost 
    : 1
  
  const overallVariance = totalEarnedValue - totalPlannedValue
  
  // Determine project health
  const health = determineProjectHealth(
    overallProgress,
    overallSchedulePerformance,
    overallCostPerformance,
    activityProgresses
  )
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    overallProgress,
    overallSchedulePerformance,
    overallCostPerformance,
    activityProgresses
  )
  
  return {
    projectId: project.id,
    projectCode: project.project_code || '',
    projectName: project.project_name || '',
    overallMetrics: {
      plannedValue: totalPlannedValue,
      earnedValue: totalEarnedValue,
      actualCost: totalActualCost,
      progress: Math.min(overallProgress, 100),
      schedulePerformance: overallSchedulePerformance,
      costPerformance: overallCostPerformance,
      variance: overallVariance,
      status: overallProgress >= 90 ? 'on-track' : 
              overallProgress < 50 ? 'behind' : 
              overallProgress > 100 ? 'ahead' : 'at-risk'
    },
    activities: activityProgresses,
    health,
    recommendations
  }
}

/**
 * Calculate schedule performance based on KPI dates
 */
function calculateSchedulePerformance(kpis: KPIRecord[]): number {
  if (kpis.length === 0) return 1
  
  const today = new Date()
  let onTimeCount = 0
  
  for (const kpi of kpis) {
    const targetDate = new Date(kpi.target_date || '')
    const actualDate = new Date(kpi.actual_date || '')
    
    if (kpi.actual_date) {
      // If completed, check if on time
      if (actualDate <= targetDate) onTimeCount++
    } else {
      // If not completed, check if still within target
      if (targetDate >= today) onTimeCount++
    }
  }
  
  return onTimeCount / kpis.length
}

/**
 * Get the latest actual date from KPIs
 */
function getLatestActualDate(kpis: KPIRecord[]): Date | undefined {
  const actualDates = kpis
    .map(kpi => kpi.actual_date)
    .filter(date => date)
    .map(date => new Date(date!))
    .sort((a, b) => b.getTime() - a.getTime())
  
  return actualDates.length > 0 ? actualDates[0] : undefined
}

/**
 * Calculate estimated completion date
 */
function calculateEstimatedCompletion(
  activity: BOQActivity,
  actualUnits: number,
  rate: number
): Date | undefined {
  const plannedUnits = parseFloat(activity.planned_units?.toString() || '0')
  const remainingUnits = plannedUnits - actualUnits
  
  if (remainingUnits <= 0) return undefined
  
  // Estimate based on current rate (this is simplified)
  const estimatedDays = Math.ceil(remainingUnits / (actualUnits / 30)) // Assuming 30 days of work
  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays)
  
  return estimatedDate
}

/**
 * Determine project health
 */
function determineProjectHealth(
  progress: number,
  schedulePerformance: number,
  costPerformance: number,
  activities: ActivityProgress[]
): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  const atRiskActivities = activities.filter(a => a.metrics.status === 'at-risk').length
  const behindActivities = activities.filter(a => a.metrics.status === 'behind').length
  
  if (progress >= 95 && schedulePerformance >= 0.9 && costPerformance >= 0.9) {
    return 'excellent'
  } else if (progress >= 80 && schedulePerformance >= 0.8 && costPerformance >= 0.8) {
    return 'good'
  } else if (progress >= 60 && schedulePerformance >= 0.7 && costPerformance >= 0.7) {
    return 'fair'
  } else if (atRiskActivities > activities.length * 0.3 || behindActivities > activities.length * 0.5) {
    return 'critical'
  } else {
    return 'poor'
  }
}

/**
 * Generate recommendations based on project status
 */
function generateRecommendations(
  progress: number,
  schedulePerformance: number,
  costPerformance: number,
  activities: ActivityProgress[]
): string[] {
  const recommendations: string[] = []
  
  if (progress < 50) {
    recommendations.push('Project is significantly behind schedule. Consider increasing resources or adjusting scope.')
  }
  
  if (schedulePerformance < 0.8) {
    recommendations.push('Schedule performance is below target. Review critical path and resource allocation.')
  }
  
  if (costPerformance < 0.8) {
    recommendations.push('Cost performance is below target. Review budget and cost control measures.')
  }
  
  const atRiskActivities = activities.filter(a => a.metrics.status === 'at-risk')
  if (atRiskActivities.length > 0) {
    recommendations.push(`${atRiskActivities.length} activities are at risk. Focus on risk mitigation.`)
  }
  
  const behindActivities = activities.filter(a => a.metrics.status === 'behind')
  if (behindActivities.length > 0) {
    recommendations.push(`${behindActivities.length} activities are behind schedule. Consider acceleration strategies.`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Project is performing well. Continue current approach.')
  }
  
  return recommendations
}

/**
 * Calculate portfolio progress
 */
export function calculatePortfolioProgress(
  projects: Project[],
  activities: BOQActivity[],
  kpis: KPIRecord[] = []
): {
  totalProjects: number
  totalPlannedValue: number
  totalEarnedValue: number
  overallProgress: number
  healthDistribution: Record<string, number>
  recommendations: string[]
} {
  // Use calculateProjectProgress for health and recommendations
  const projectProgresses = projects.map(project => 
    calculateProjectProgress(project, activities, kpis)
  )
  
  // ✅ NEW CONCEPTS: Use getAllProjectsAnalytics for accurate value calculations
  const { getAllProjectsAnalytics } = require('./projectAnalytics')
  const allAnalytics = getAllProjectsAnalytics(projects, activities, kpis as any[])
  
  // Calculate values using NEW CONCEPTS
  const totalValue = allAnalytics.reduce((sum: number, a: any) => sum + a.totalValue, 0)
  const totalPlannedValue = allAnalytics.reduce((sum: number, a: any) => sum + a.totalPlannedValue, 0)
  const totalEarnedValue = allAnalytics.reduce((sum: number, a: any) => sum + a.totalEarnedValue, 0)
  
  // ✅ NEW CONCEPT: Actual Progress = (Earned Value / Total Value)
  const overallProgress = totalValue > 0 
    ? (totalEarnedValue / totalValue) * 100 
    : 0
  
  const healthDistribution = {
    excellent: projectProgresses.filter(p => p.health === 'excellent').length,
    good: projectProgresses.filter(p => p.health === 'good').length,
    fair: projectProgresses.filter(p => p.health === 'fair').length,
    poor: projectProgresses.filter(p => p.health === 'poor').length,
    critical: projectProgresses.filter(p => p.health === 'critical').length
  }
  
  const allRecommendations = projectProgresses.flatMap(p => p.recommendations)
  const uniqueRecommendations = Array.from(new Set(allRecommendations))
  
  return {
    totalProjects: projects.length,
    totalPlannedValue,
    totalEarnedValue,
    overallProgress: Math.min(overallProgress, 100),
    healthDistribution,
    recommendations: uniqueRecommendations
  }
}

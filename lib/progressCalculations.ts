/**
 * Progress Calculation Utilities
 * 
 * These functions calculate progress percentages for activities and projects
 * based on planned vs actual values.
 */

import { BOQActivity, Project } from './supabase'

/**
 * Calculate activity progress percentage
 * Formula: (actual_units / planned_units) * 100
 */
export function calculateActivityProgress(
  plannedUnits: number,
  actualUnits: number
): number {
  if (plannedUnits <= 0) return 0
  return (actualUnits / plannedUnits) * 100
}

/**
 * Calculate project progress based on its activities
 * Formula: Average of all activities progress percentages
 */
export function calculateProjectProgress(
  activities: BOQActivity[]
): number {
  if (!activities || activities.length === 0) return 0
  
  const totalProgress = activities.reduce(
    (sum, activity) => sum + (activity.activity_progress_percentage || 0),
    0
  )
  
  return totalProgress / activities.length
}

/**
 * Calculate weighted project progress based on activity values
 * Activities with higher values have more weight in the calculation
 */
export function calculateWeightedProjectProgress(
  activities: BOQActivity[]
): number {
  if (!activities || activities.length === 0) return 0
  
  const totalValue = activities.reduce(
    (sum, activity) => sum + (activity.total_value || 0),
    0
  )
  
  if (totalValue === 0) {
    // If no values, use simple average
    return calculateProjectProgress(activities)
  }
  
  const weightedProgress = activities.reduce((sum, activity) => {
    const weight = (activity.total_value || 0) / totalValue
    const progress = activity.activity_progress_percentage || 0
    return sum + (progress * weight)
  }, 0)
  
  return weightedProgress
}

/**
 * Calculate project progress based on planned vs actual values
 * This is the most accurate method
 */
export function calculateProjectProgressByUnits(
  activities: BOQActivity[]
): number {
  if (!activities || activities.length === 0) return 0
  
  const totalPlanned = activities.reduce(
    (sum, activity) => sum + (activity.planned_units || 0),
    0
  )
  
  const totalActual = activities.reduce(
    (sum, activity) => sum + (activity.actual_units || 0),
    0
  )
  
  if (totalPlanned === 0) return 0
  
  return (totalActual / totalPlanned) * 100
}

/**
 * Calculate project progress based on earned value
 * Formula: (earned_value / planned_value) * 100
 */
export function calculateProjectProgressByValue(
  activities: BOQActivity[]
): number {
  if (!activities || activities.length === 0) return 0
  
  const totalPlannedValue = activities.reduce(
    (sum, activity) => sum + (activity.planned_value || 0),
    0
  )
  
  const totalEarnedValue = activities.reduce(
    (sum, activity) => sum + (activity.earned_value || 0),
    0
  )
  
  if (totalPlannedValue === 0) return 0
  
  return (totalEarnedValue / totalPlannedValue) * 100
}

/**
 * Get project status based on progress percentage
 */
export function getProjectStatus(progressPercentage: number): {
  status: 'completed' | 'on_track' | 'at_risk' | 'delayed'
  label: string
  color: string
} {
  if (progressPercentage >= 100) {
    return { status: 'completed', label: 'Completed', color: 'green' }
  } else if (progressPercentage >= 80) {
    return { status: 'on_track', label: 'On Track', color: 'blue' }
  } else if (progressPercentage >= 50) {
    return { status: 'at_risk', label: 'At Risk', color: 'yellow' }
  } else {
    return { status: 'delayed', label: 'Delayed', color: 'red' }
  }
}

/**
 * Get activity status based on progress percentage
 */
export function getActivityStatus(progressPercentage: number): {
  completed: boolean
  onTrack: boolean
  delayed: boolean
  label: string
  color: string
} {
  const completed = progressPercentage >= 100
  const onTrack = progressPercentage >= 80 && progressPercentage < 100
  const delayed = progressPercentage < 80
  
  let label = 'Starting'
  let color = 'gray'
  
  if (completed) {
    label = 'Completed'
    color = 'green'
  } else if (onTrack) {
    label = 'On Track'
    color = 'blue'
  } else if (progressPercentage >= 50) {
    label = 'In Progress'
    color = 'yellow'
  } else if (delayed) {
    label = 'Delayed'
    color = 'red'
  }
  
  return { completed, onTrack, delayed, label, color }
}

/**
 * Calculate delay percentage
 * Formula: ((planned - actual) / planned) * 100
 */
export function calculateDelayPercentage(
  plannedUnits: number,
  actualUnits: number
): number {
  if (plannedUnits <= 0) return 0
  return ((plannedUnits - actualUnits) / plannedUnits) * 100
}

/**
 * Calculate variance (difference between planned and actual)
 */
export function calculateVariance(
  plannedUnits: number,
  actualUnits: number
): number {
  return actualUnits - plannedUnits
}

/**
 * Calculate remaining work
 */
export function calculateRemainingWork(
  totalUnits: number,
  actualUnits: number
): number {
  return Math.max(0, totalUnits - actualUnits)
}

/**
 * Format progress percentage for display
 */
export function formatProgressPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Get comprehensive project statistics
 */
export function getProjectStatistics(
  project: Project,
  activities: BOQActivity[]
) {
  const progressByUnits = calculateProjectProgressByUnits(activities)
  const progressByValue = calculateProjectProgressByValue(activities)
  const weightedProgress = calculateWeightedProjectProgress(activities)
  
  const totalActivities = activities.length
  const completedActivities = activities.filter(a => a.activity_completed).length
  const delayedActivities = activities.filter(a => a.activity_delayed).length
  const onTrackActivities = activities.filter(a => a.activity_on_track).length
  
  const totalPlannedValue = activities.reduce((sum, a) => sum + (a.planned_value || 0), 0)
  const totalEarnedValue = activities.reduce((sum, a) => sum + (a.earned_value || 0), 0)
  const totalRemainingValue = activities.reduce((sum, a) => sum + (a.remaining_work_value || 0), 0)
  
  return {
    progress: {
      byUnits: progressByUnits,
      byValue: progressByValue,
      weighted: weightedProgress,
      average: calculateProjectProgress(activities)
    },
    activities: {
      total: totalActivities,
      completed: completedActivities,
      delayed: delayedActivities,
      onTrack: onTrackActivities,
      completionRate: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0
    },
    financial: {
      contractAmount: project.contract_amount || 0,
      plannedValue: totalPlannedValue,
      earnedValue: totalEarnedValue,
      remainingValue: totalRemainingValue,
      completionPercentage: totalPlannedValue > 0 ? (totalEarnedValue / totalPlannedValue) * 100 : 0
    },
    status: getProjectStatus(progressByUnits)
  }
}


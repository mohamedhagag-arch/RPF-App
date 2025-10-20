/**
 * Auto Calculation Saver
 * 
 * Automatically calculates and saves rate-based calculations to Supabase
 * Updates BOQ activities, projects, and related data automatically
 */

import { getSupabaseClient } from './simpleConnectionManager'
import { BOQActivity, Project, KPIRecord, TABLES } from './supabase'
import { calculateActivityRate, ActivityRate } from './rateCalculator'
import { calculateActivityProgress, ActivityProgress } from './progressCalculator'

export interface AutoCalculationResult {
  success: boolean
  updatedActivities: number
  updatedProjects: number
  errors: string[]
}

/**
 * Auto-save calculations for a single BOQ activity
 */
export async function autoSaveActivityCalculations(activity: BOQActivity): Promise<AutoCalculationResult> {
  const supabase = getSupabaseClient()
  const errors: string[] = []
  let updatedActivities = 0
  let updatedProjects = 0

  try {
    console.log('🔄 Auto-saving calculations for activity:', activity.activity_name)

    // Calculate rate and progress
    const rate = calculateActivityRate(activity)
    const progress = calculateActivityProgress(activity, [])

    // Update BOQ activity with calculated values
    const updateData = {
      // ✅ Save calculated rate
      rate: rate.rate,
      // ✅ Save calculated progress
      progress_percentage: progress.metrics.progress,
      // ✅ Save earned value
      earned_value: rate.earnedValue,
      // ✅ Save actual value
      actual_value: rate.actualValue,
      // ✅ Save planned value
      planned_value: rate.plannedValue,
      // ✅ Save remaining value
      remaining_value: rate.plannedValue - rate.earnedValue,
      // ✅ Update last calculated timestamp
      last_calculated_at: new Date().toISOString()
    }
    
    const { error: activityError } = await (supabase as any)
      .from(TABLES.BOQ_ACTIVITIES)
      .update(updateData)
      .eq('id', activity.id)

    if (activityError) {
      errors.push(`Activity update failed: ${activityError.message}`)
    } else {
      updatedActivities++
      console.log('✅ Activity calculations saved:', {
        activityName: activity.activity_name,
        rate: rate.rate,
        progress: progress.metrics.progress,
        earnedValue: rate.earnedValue
      })
    }

    // Update project calculations
    const projectUpdateResult = await updateProjectCalculations(activity.project_code)
    if (projectUpdateResult.success) {
      updatedProjects++
    } else {
      errors.push(...projectUpdateResult.errors)
    }

  } catch (error: any) {
    errors.push(`Auto-save failed: ${error.message}`)
    console.error('❌ Auto-save error:', error)
  }

  return {
    success: errors.length === 0,
    updatedActivities,
    updatedProjects,
    errors
  }
}

/**
 * Update project calculations based on all its activities
 */
export async function updateProjectCalculations(projectCode: string): Promise<AutoCalculationResult> {
  const supabase = getSupabaseClient()
  const errors: string[] = []
  let updatedProjects = 0

  try {
    console.log('🔄 Auto-updating project calculations:', projectCode)

    // Get all activities for this project
    const { data: activities, error: activitiesError } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('project_code', projectCode)

    if (activitiesError) {
      errors.push(`Failed to fetch activities: ${activitiesError.message}`)
      return { success: false, updatedActivities: 0, updatedProjects: 0, errors }
    }

    if (!activities || activities.length === 0) {
      return { success: true, updatedActivities: 0, updatedProjects: 0, errors }
    }

    // Calculate project totals
    let totalPlannedValue = 0
    let totalEarnedValue = 0
    let totalProgress = 0
    let activitiesCount = 0

    for (const activity of activities) {
      const rate = calculateActivityRate(activity)
      const progress = calculateActivityProgress(activity, [])

      totalPlannedValue += rate.plannedValue
      totalEarnedValue += rate.earnedValue
      totalProgress += progress.metrics.progress
      activitiesCount++
    }

    const averageProgress = activitiesCount > 0 ? totalProgress / activitiesCount : 0

    // Update project with calculated values
    const projectUpdateData = {
      // ✅ Save calculated project values
      total_planned_value: totalPlannedValue,
      total_earned_value: totalEarnedValue,
      overall_progress: averageProgress,
      // ✅ Save financial metrics
      schedule_performance_index: totalEarnedValue / totalPlannedValue,
      cost_performance_index: totalEarnedValue / totalPlannedValue,
      // ✅ Update last calculated timestamp
      last_calculated_at: new Date().toISOString()
    }
    
    const { error: projectError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .update(projectUpdateData)
      .eq('project_code', projectCode)

    if (projectError) {
      errors.push(`Project update failed: ${projectError.message}`)
    } else {
      updatedProjects++
      console.log('✅ Project calculations saved:', {
        projectCode,
        totalPlannedValue,
        totalEarnedValue,
        averageProgress
      })
    }

  } catch (error: any) {
    errors.push(`Project update failed: ${error.message}`)
    console.error('❌ Project update error:', error)
  }

  return {
    success: errors.length === 0,
    updatedActivities: 0,
    updatedProjects,
    errors
  }
}

/**
 * Auto-save calculations for multiple activities
 */
export async function autoSaveMultipleActivities(activities: BOQActivity[]): Promise<AutoCalculationResult> {
  const results: AutoCalculationResult[] = []
  const allErrors: string[] = []
  let totalUpdatedActivities = 0
  let totalUpdatedProjects = 0

  console.log(`🔄 Auto-saving calculations for ${activities.length} activities`)

  for (const activity of activities) {
    const result = await autoSaveActivityCalculations(activity)
    results.push(result)
    allErrors.push(...result.errors)
    totalUpdatedActivities += result.updatedActivities
    totalUpdatedProjects += result.updatedProjects
  }

  return {
    success: allErrors.length === 0,
    updatedActivities: totalUpdatedActivities,
    updatedProjects: totalUpdatedProjects,
    errors: allErrors
  }
}

/**
 * Auto-save calculations when KPI is updated
 */
export async function autoSaveOnKPIUpdate(kpiRecord: KPIRecord): Promise<AutoCalculationResult> {
  const supabase = getSupabaseClient()
  const errors: string[] = []

  try {
    console.log('🔄 Auto-saving calculations on KPI update:', kpiRecord.activity_name)

    // Get the activity for this KPI
    const { data: activity, error: activityError } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('project_code', kpiRecord.project_full_code)
      .eq('activity_name', kpiRecord.activity_name)
      .single()

    if (activityError) {
      errors.push(`Failed to fetch activity: ${activityError.message}`)
      return { success: false, updatedActivities: 0, updatedProjects: 0, errors }
    }

    if (!activity) {
      errors.push('Activity not found')
      return { success: false, updatedActivities: 0, updatedProjects: 0, errors }
    }

    // Auto-save calculations for this activity
    const result = await autoSaveActivityCalculations(activity)
    return result

  } catch (error: any) {
    errors.push(`KPI update auto-save failed: ${error.message}`)
    console.error('❌ KPI update auto-save error:', error)
    return { success: false, updatedActivities: 0, updatedProjects: 0, errors }
  }
}

/**
 * Auto-save calculations when BOQ activity is updated
 */
export async function autoSaveOnBOQUpdate(activity: BOQActivity): Promise<AutoCalculationResult> {
  console.log('🔄 Auto-saving calculations on BOQ update:', activity.activity_name)
  return await autoSaveActivityCalculations(activity)
}

/**
 * Auto-save calculations when project is updated
 */
export async function autoSaveOnProjectUpdate(project: Project): Promise<AutoCalculationResult> {
  console.log('🔄 Auto-saving calculations on project update:', project.project_code)
  return await updateProjectCalculations(project.project_code)
}

/**
 * Batch auto-save all calculations (for initial setup or maintenance)
 */
export async function batchAutoSaveAllCalculations(): Promise<AutoCalculationResult> {
  const supabase = getSupabaseClient()
  const errors: string[] = []
  let totalUpdatedActivities = 0
  let totalUpdatedProjects = 0

  try {
    console.log('🔄 Starting batch auto-save of all calculations')

    // Get all activities
    const { data: activities, error: activitiesError } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')

    if (activitiesError) {
      errors.push(`Failed to fetch activities: ${activitiesError.message}`)
      return { success: false, updatedActivities: 0, updatedProjects: 0, errors }
    }

    if (!activities || activities.length === 0) {
      return { success: true, updatedActivities: 0, updatedProjects: 0, errors }
    }

    // Process all activities
    const result = await autoSaveMultipleActivities(activities)
    totalUpdatedActivities += result.updatedActivities
    totalUpdatedProjects += result.updatedProjects
    errors.push(...result.errors)

    console.log('✅ Batch auto-save completed:', {
      totalActivities: activities.length,
      updatedActivities: totalUpdatedActivities,
      updatedProjects: totalUpdatedProjects,
      errors: errors.length
    })

  } catch (error: any) {
    errors.push(`Batch auto-save failed: ${error.message}`)
    console.error('❌ Batch auto-save error:', error)
  }

  return {
    success: errors.length === 0,
    updatedActivities: totalUpdatedActivities,
    updatedProjects: totalUpdatedProjects,
    errors
  }
}

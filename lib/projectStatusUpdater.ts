/**
 * Project Status Updater
 * Automatically updates project statuses based on activities and KPIs
 */

import { supabase, TABLES } from './supabase'
import { calculateProjectStatus, ProjectStatusData, ProjectStatusResult } from './projectStatusCalculator'

export interface ProjectStatusUpdate {
  project_id: string
  old_status: string
  new_status: string
  confidence: number
  reason: string
  updated_at: string
}

/**
 * Update status for a single project
 */
export async function updateProjectStatus(projectId: string): Promise<ProjectStatusUpdate | null> {
  try {
    // Use the imported supabase client
    
    // Get project data
    const { data: project, error: projectError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (projectError || !project) {
      console.error('Error fetching project:', projectError)
      return null
    }
    
    // Get project activities
    const { data: activities, error: activitiesError } = await (supabase as any)
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('project_code', project.project_code)
    
    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return null
    }
    
    // Get project KPIs
    const { data: kpis, error: kpisError } = await (supabase as any)
      .from(TABLES.KPI)
      .select('*')
      .eq('Project Full Code', project.project_code)
    
    if (kpisError) {
      console.error('Error fetching KPIs:', kpisError)
      return null
    }
    
    // Prepare data for status calculation
    const statusData: ProjectStatusData = {
      project_id: project.id,
      project_code: project.project_code,
      project_name: project.project_name,
      project_start_date: project.project_start_date || project.created_at,
      project_end_date: project.project_end_date || project.deadline,
      current_date: new Date().toISOString(),
      activities: activities.map((activity: any) => ({
        id: activity.id,
        activity_timing: activity.activity_timing || 'post-commencement',
        planned_units: activity.planned_units || 0,
        actual_units: activity.actual_units || 0,
        planned_activity_start_date: activity.planned_activity_start_date,
        deadline: activity.deadline,
        status: activity.status || 'not_started'
      })),
      kpis: kpis.map((kpi: any) => ({
        id: kpi.id,
        input_type: kpi['Input Type'] || 'Planned',
        quantity: kpi.Quantity || 0,
        target_date: kpi['Target Date'] || kpi['Activity Date'],
        actual_date: kpi['Actual Date']
      }))
    }
    
    // Calculate new status
    const statusResult: ProjectStatusResult = calculateProjectStatus(statusData)
    
    // Check if status has changed
    const currentStatus = project.project_status || 'upcoming'
    if (currentStatus === statusResult.status) {
      console.log(`Project ${project.project_code} status unchanged: ${statusResult.status}`)
      return null
    }
    
    // Update project status
    const { error: updateError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .update({
        project_status: statusResult.status,
        status_confidence: statusResult.confidence,
        status_reason: statusResult.reason,
        status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
    
    if (updateError) {
      console.error('Error updating project status:', updateError)
      return null
    }
    
    // Log status change
    const statusUpdate: ProjectStatusUpdate = {
      project_id: projectId,
      old_status: currentStatus,
      new_status: statusResult.status,
      confidence: statusResult.confidence,
      reason: statusResult.reason,
      updated_at: new Date().toISOString()
    }
    
    console.log(`✅ Project ${project.project_code} status updated: ${currentStatus} → ${statusResult.status}`)
    console.log(`   Reason: ${statusResult.reason}`)
    console.log(`   Confidence: ${statusResult.confidence}%`)
    
    return statusUpdate
    
  } catch (error) {
    console.error('Error updating project status:', error)
    return null
  }
}

/**
 * Update statuses for all projects
 */
export async function updateAllProjectStatuses(): Promise<ProjectStatusUpdate[]> {
  try {
    // Use the imported supabase client
    
    // Get all projects
    const { data: projects, error: projectsError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .select('id, project_code, project_name')
      .order('created_at', { ascending: false })
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return []
    }
    
    console.log(`🔄 Updating statuses for ${projects.length} projects...`)
    
    const updates: ProjectStatusUpdate[] = []
    
    // Update each project
    for (const project of projects) {
      const update = await updateProjectStatus(project.id)
      if (update) {
        updates.push(update)
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`✅ Updated ${updates.length} project statuses`)
    return updates
    
  } catch (error) {
    console.error('Error updating all project statuses:', error)
    return []
  }
}

/**
 * Update statuses for projects with specific criteria
 */
export async function updateProjectStatusesByCriteria(criteria: {
  project_codes?: string[]
  statuses?: string[]
  date_range?: { start: string; end: string }
}): Promise<ProjectStatusUpdate[]> {
  try {
    // Use the imported supabase client
    
    let query = supabase
      .from(TABLES.PROJECTS)
      .select('id, project_code, project_name')
    
    // Apply filters
    if (criteria.project_codes && criteria.project_codes.length > 0) {
      query = query.in('project_code', criteria.project_codes)
    }
    
    if (criteria.statuses && criteria.statuses.length > 0) {
      query = query.in('project_status', criteria.statuses)
    }
    
    if (criteria.date_range) {
      query = query
        .gte('created_at', criteria.date_range.start)
        .lte('created_at', criteria.date_range.end)
    }
    
    const { data: projects, error: projectsError } = await (query as any).order('created_at', { ascending: false })
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return []
    }
    
    console.log(`🔄 Updating statuses for ${projects.length} filtered projects...`)
    
    const updates: ProjectStatusUpdate[] = []
    
    // Update each project
    for (const project of projects) {
      const update = await updateProjectStatus(project.id)
      if (update) {
        updates.push(update)
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`✅ Updated ${updates.length} project statuses`)
    return updates
    
  } catch (error) {
    console.error('Error updating filtered project statuses:', error)
    return []
  }
}

/**
 * Get project status summary
 */
export async function getProjectStatusSummary(): Promise<{
  total: number
  by_status: Record<string, number>
  recent_updates: ProjectStatusUpdate[]
}> {
  try {
    // Use the imported supabase client
    
    // Get all projects with their statuses
    const { data: projects, error: projectsError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .select('project_status')
    
    if (projectsError) {
      console.error('Error fetching project statuses:', projectsError)
      return { total: 0, by_status: {}, recent_updates: [] }
    }
    
    // Count by status
    const by_status: Record<string, number> = {}
    projects.forEach((project: any) => {
      const status = project.project_status || 'upcoming'
      by_status[status] = (by_status[status] || 0) + 1
    })
    
    return {
      total: projects.length,
      by_status,
      recent_updates: [] // TODO: Implement recent updates tracking
    }
    
  } catch (error) {
    console.error('Error getting project status summary:', error)
    return { total: 0, by_status: {}, recent_updates: [] }
  }
}

/**
 * Schedule automatic status updates
 */
export function scheduleStatusUpdates(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`🕐 Scheduling automatic status updates every ${intervalMinutes} minutes`)
  
  return setInterval(async () => {
    console.log('🔄 Running scheduled status updates...')
    try {
      const updates = await updateAllProjectStatuses()
      console.log(`✅ Scheduled update completed: ${updates.length} projects updated`)
    } catch (error) {
      console.error('❌ Scheduled update failed:', error)
    }
  }, intervalMinutes * 60 * 1000)
}

/**
 * Stop scheduled updates
 */
export function stopScheduledUpdates(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId)
  console.log('⏹️ Stopped scheduled status updates')
}

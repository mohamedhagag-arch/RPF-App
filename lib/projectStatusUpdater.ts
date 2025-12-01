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
    // ✅ Use maybeSingle() instead of single() to handle cases where project doesn't exist
    const { data: project, error: projectError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .select('*')
      .eq('id', projectId)
      .maybeSingle()
    
    if (projectError) {
      // Only log if it's not a "not found" error
      if (projectError.code !== 'PGRST116') {
        console.error('Error fetching project:', projectError)
      }
      return null
    }
    
    if (!project) {
      // Project doesn't exist - silently return (not an error)
      return null
    }
    
    // Get project activities
    // ✅ Use project_full_code for better matching (handles sub-codes)
    const projectFullCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? '-' + project.project_sub_code : ''}`
    const { data: activities, error: activitiesError } = await (supabase as any)
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .or(`project_code.eq.${project.project_code},Project Full Code.eq.${projectFullCode},Project Code.eq.${project.project_code}`)
    
    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return null
    }
    
    // Get project KPIs (check for Planned KPIs specifically)
    const { data: kpis, error: kpisError } = await (supabase as any)
      .from(TABLES.KPI)
      .select('*')
      .or(`Project Full Code.eq.${projectFullCode},Project Code.eq.${project.project_code}`)
    
    if (kpisError) {
      console.error('Error fetching KPIs:', kpisError)
      return null
    }
    
    // ✅ Prepare data for status calculation (based on ACTUAL activities and Activity Timing)
    const statusData: ProjectStatusData = {
      project_id: project.id,
      project_code: project.project_code,
      project_name: project.project_name,
      project_start_date: project.project_start_date || project.created_at,
      project_end_date: project.project_completion_date || project.deadline,
      project_award_date: project.date_project_awarded || project['Date Project Awarded'] || project['Project Award Date'] || undefined,
      current_date: new Date().toISOString(),
      activities: activities.map((activity: any) => ({
        id: activity.id,
        activity_timing: activity.activity_timing || activity['Activity Timing'] || 'post-commencement',
        activity_name: activity.activity_name || activity['Activity Name'] || '',
        planned_units: activity.planned_units || activity.total_units || 0,
        actual_units: activity.actual_units || 0,
        planned_activity_start_date: activity.planned_activity_start_date || activity['Planned Activity Start Date'] || undefined,
        activity_actual_start_date: activity.activity_actual_start_date || activity['Activity Actual Start Date'] || activity.actual_start_date || activity['Actual Start Date'] || undefined,
        deadline: activity.deadline || undefined,
        activity_actual_completion_date: activity.activity_actual_completion_date || activity['Activity Actual Completion Date'] || activity.actual_completion_date || activity['Actual Completion Date'] || undefined,
        status: activity.status || activity.activity_completed ? 'completed' : (activity.activity_delayed ? 'delayed' : 'not_started')
      })),
      kpis: kpis.map((kpi: any) => ({
        id: kpi.id,
        input_type: kpi['Input Type'] || kpi.input_type || 'Planned',
        quantity: parseFloat(String(kpi.Quantity || kpi.quantity || '0').replace(/,/g, '')) || 0,
        target_date: kpi['Target Date'] || kpi.target_date || '',
        actual_date: kpi['Actual Date'] || kpi.actual_date || undefined,
        activity_date: kpi['Activity Date'] || kpi.activity_date || undefined,
        activity_name: kpi['Activity Name'] || kpi.activity_name || undefined
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
    
    // ✅ Check if project has KPI Planned (for KPI Added field)
    const hasKPIPlanned = kpis.some((kpi: any) => {
      const inputType = kpi['Input Type'] || kpi.input_type || ''
      return String(inputType).trim().toLowerCase() === 'planned'
    })
    
    // Update project status and KPI Added
    // ✅ Build update object with 'KPI Added' - if column doesn't exist, we'll retry without it
    const updateData: any = {
      project_status: statusResult.status,
      status_confidence: statusResult.confidence,
      status_reason: statusResult.reason,
      status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      'KPI Added': hasKPIPlanned ? 'Yes' : 'No' // ✅ Try to update KPI Added
    }
    
    const { error: updateError } = await (supabase as any)
      .from(TABLES.PROJECTS)
      .update(updateData)
      .eq('id', projectId)
    
    if (updateError) {
      // ✅ Handle 406 Not Acceptable (column doesn't exist) gracefully
      // This happens when 'KPI Added' column hasn't been added to the database yet
      if (updateError.code === 'PGRST116' || 
          updateError.message?.includes('406') || 
          updateError.message?.includes('Not Acceptable') ||
          updateError.code === '42703') { // PostgreSQL error code for undefined column
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ "KPI Added" column not found for project ${project.project_code}. Please run add-kpi-added-column.sql`)
        }
        // Try updating without 'KPI Added' column
        const { error: retryError } = await (supabase as any)
          .from(TABLES.PROJECTS)
          .update({
            project_status: statusResult.status,
            status_confidence: statusResult.confidence,
            status_reason: statusResult.reason,
            status_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
        
        if (retryError) {
          console.error('Error updating project status (retry):', retryError)
          return null
        }
        // ✅ Successfully updated without 'KPI Added' - continue normally
      } else {
        console.error('Error updating project status:', updateError)
        return null
      }
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

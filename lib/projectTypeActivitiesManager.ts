/**
 * 🎯 Project Type Activities Manager
 * 
 * Manages activities for each project type with full CRUD operations
 * Each project type can have its own set of activities
 */

import { getSupabaseClient } from './simpleConnectionManager'

// ============================================
// Types & Interfaces
// ============================================

export interface ProjectTypeActivity {
  id: string
  project_type: string
  activity_name: string
  activity_name_ar?: string
  description?: string
  default_unit?: string
  estimated_rate?: number
  category?: string
  is_active: boolean
  is_default: boolean
  display_order: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ProjectTypeActivityFormData {
  project_type: string
  activity_name: string
  activity_name_ar?: string
  description?: string
  default_unit?: string
  estimated_rate?: number
  category?: string
  display_order?: number
}

export interface ActivityStats {
  totalActivities: number
  activeActivities: number
  inactiveActivities: number
  defaultActivities: number
  customActivities: number
  activitiesByProjectType: Record<string, number>
  activitiesByCategory: Record<string, number>
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get all activities for a specific project type
 * This should be linked to the main project_types table
 */
export async function getActivitiesByProjectType(
  projectType: string,
  includeInactive: boolean = false
): Promise<ProjectTypeActivity[]> {
  const supabase = getSupabaseClient()
  
  try {
    console.log(`📋 Loading activities for project type: ${projectType}`)
    
    // First, verify that this project type exists in the main project_types table
    const { data: projectTypeData, error: projectTypeError } = await supabase
      .from('project_types')
      .select('name')
      .eq('name', projectType)
      .eq('is_active', true)
      .single()
    
    if (projectTypeError) {
      console.warn('⚠️ Project type not found in main table, using direct lookup')
    } else {
      console.log('✅ Project type verified in main table')
    }
    
    let query = supabase
      .from('project_type_activities')
      .select('*')
      .eq('project_type', projectType)
      .order('display_order', { ascending: true })
      .order('activity_name', { ascending: true })
    
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Error loading activities:', error)
      throw error
    }
    
    console.log(`✅ Loaded ${data?.length || 0} activities for ${projectType}`)
    return data || []
    
  } catch (error) {
    console.error('❌ Error in getActivitiesByProjectType:', error)
    return []
  }
}

/**
 * Get all activities (grouped by project type)
 */
export async function getAllActivities(
  includeInactive: boolean = false
): Promise<Record<string, ProjectTypeActivity[]>> {
  const supabase = getSupabaseClient()
  
  try {
    console.log('📋 Loading all activities...')
    
    let query = supabase
      .from('project_type_activities')
      .select('*')
      .order('project_type', { ascending: true })
      .order('display_order', { ascending: true })
    
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Error loading all activities:', error)
      throw error
    }
    
    // Group by project type
    const grouped = (data || []).reduce((acc, activity: any) => {
      if (!acc[activity.project_type]) {
        acc[activity.project_type] = []
      }
      acc[activity.project_type].push(activity)
      return acc
    }, {} as Record<string, ProjectTypeActivity[]>)
    
    console.log(`✅ Loaded activities for ${Object.keys(grouped).length} project types`)
    return grouped
    
  } catch (error) {
    console.error('❌ Error in getAllActivities:', error)
    return {}
  }
}

/**
 * Get available project types (that have activities)
 * This should be linked to the main project_types table
 */
export async function getProjectTypesWithActivities(): Promise<string[]> {
  const supabase = getSupabaseClient()
  
  try {
    console.log('📋 Getting project types with activities...')
    
    // First, try to get from the main project_types table
    const { data: projectTypesData, error: projectTypesError } = await supabase
      .from('project_types')
      .select('name')
      .eq('is_active', true)
      .order('name')
    
    if (projectTypesError) {
      console.warn('⚠️ Could not fetch from project_types table, falling back to project_type_activities')
      
      // Fallback: get from project_type_activities table
      const { data, error } = await supabase
        .from('project_type_activities')
        .select('project_type')
        .eq('is_active', true)
      
      if (error) throw error
      
      const projectTypes = (data || []).map((item: any) => item.project_type)
      const uniqueTypes = Array.from(new Set(projectTypes)) as string[]
      return uniqueTypes.sort()
    }
    
    // Return project types from main table
    const projectTypes = (projectTypesData || []).map((item: any) => item.name)
    console.log('✅ Found project types from main table:', projectTypes)
    return projectTypes
    
  } catch (error) {
    console.error('❌ Error getting project types:', error)
    return []
  }
}

/**
 * Add new activity
 * This should be linked to the main project_types table
 */
export async function addActivity(
  activityData: ProjectTypeActivityFormData,
  userId?: string
): Promise<{ success: boolean; data?: ProjectTypeActivity; error?: string }> {
  const supabase = getSupabaseClient()
  
  try {
    console.log('➕ Adding new activity:', activityData.activity_name)
    
    // First, verify that the project type exists in the main project_types table
    const { data: projectTypeData, error: projectTypeError } = await supabase
      .from('project_types')
      .select('name')
      .eq('name', activityData.project_type)
      .eq('is_active', true)
      .single()
    
    if (projectTypeError) {
      return { success: false, error: 'Project type not found in main table. Please add it to Project Types settings first.' }
    }
    
    console.log('✅ Project type verified in main table')
    
    // Check if activity already exists for this project type
    const { data: existing } = await supabase
      .from('project_type_activities')
      .select('id')
      .eq('project_type', activityData.project_type)
      .eq('activity_name', activityData.activity_name)
      .single()
    
    if (existing) {
      return {
        success: false,
        error: `Activity "${activityData.activity_name}" already exists for project type "${activityData.project_type}"`
      }
    }
    
    // Insert new activity
    const { data, error } = await (supabase
      .from('project_type_activities') as any)
      .insert({
        ...activityData,
        is_active: true,
        is_default: false,
        created_by: userId,
        display_order: activityData.display_order || 999
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error adding activity:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Activity added successfully')
    return { success: true, data }
    
  } catch (error: any) {
    console.error('❌ Error in addActivity:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update existing activity
 */
export async function updateActivity(
  activityId: string,
  updates: Partial<ProjectTypeActivityFormData>
): Promise<{ success: boolean; data?: ProjectTypeActivity; error?: string }> {
  const supabase = getSupabaseClient()
  
  try {
    console.log('📝 Updating activity:', activityId)
    
    const { data, error } = await (supabase
      .from('project_type_activities') as any)
      .update(updates)
      .eq('id', activityId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating activity:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Activity updated successfully')
    return { success: true, data }
    
  } catch (error: any) {
    console.error('❌ Error in updateActivity:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete activity (soft delete - set is_active to false)
 */
export async function deleteActivity(
  activityId: string,
  hardDelete: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  
  try {
    console.log(`🗑️ ${hardDelete ? 'Hard' : 'Soft'} deleting activity:`, activityId)
    
    if (hardDelete) {
      // Hard delete - actually remove from database
      const { error } = await supabase
        .from('project_type_activities')
        .delete()
        .eq('id', activityId)
      
      if (error) {
        console.error('❌ Error hard deleting activity:', error)
        return { success: false, error: error.message }
      }
    } else {
      // Soft delete - just mark as inactive
      const { error } = await (supabase
        .from('project_type_activities') as any)
        .update({ is_active: false })
        .eq('id', activityId)
      
      if (error) {
        console.error('❌ Error soft deleting activity:', error)
        return { success: false, error: error.message }
      }
    }
    
    console.log('✅ Activity deleted successfully')
    return { success: true }
    
  } catch (error: any) {
    console.error('❌ Error in deleteActivity:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Restore deleted activity (set is_active to true)
 */
export async function restoreActivity(
  activityId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  
  try {
    console.log('♻️ Restoring activity:', activityId)
    
    const { error } = await (supabase
      .from('project_type_activities') as any)
      .update({ is_active: true })
      .eq('id', activityId)
    
    if (error) {
      console.error('❌ Error restoring activity:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Activity restored successfully')
    return { success: true }
    
  } catch (error: any) {
    console.error('❌ Error in restoreActivity:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reorder activities
 */
export async function reorderActivities(
  projectType: string,
  activityIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  
  try {
    console.log(`🔄 Reordering ${activityIds.length} activities for ${projectType}`)
    
    // Update display_order for each activity
    const updates = activityIds.map((id, index) => 
      (supabase
        .from('project_type_activities') as any)
        .update({ display_order: index })
        .eq('id', id)
    )
    
    const results = await Promise.all(updates)
    
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('❌ Errors reordering activities:', errors)
      return { success: false, error: 'Some activities failed to reorder' }
    }
    
    console.log('✅ Activities reordered successfully')
    return { success: true }
    
  } catch (error: any) {
    console.error('❌ Error in reorderActivities:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Bulk import activities for a project type
 */
export async function bulkImportActivities(
  projectType: string,
  activities: ProjectTypeActivityFormData[],
  userId?: string
): Promise<{ 
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}> {
  const supabase = getSupabaseClient()
  
  try {
    console.log(`📥 Bulk importing ${activities.length} activities for ${projectType}`)
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    for (const activity of activities) {
      const result = await addActivity({ ...activity, project_type: projectType }, userId)
      
      if (result.success) {
        results.imported++
      } else {
        if (result.error?.includes('already exists')) {
          results.skipped++
        } else {
          results.errors.push(`${activity.activity_name}: ${result.error}`)
        }
      }
    }
    
    console.log(`✅ Bulk import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`)
    
    return {
      success: results.errors.length === 0,
      ...results
    }
    
  } catch (error: any) {
    console.error('❌ Error in bulkImportActivities:', error)
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [error.message]
    }
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats(): Promise<ActivityStats> {
  const supabase = getSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('project_type_activities')
      .select('*')
    
    if (error) throw error
    
    const stats: ActivityStats = {
      totalActivities: data?.length || 0,
      activeActivities: data?.filter((a: any) => a.is_active).length || 0,
      inactiveActivities: data?.filter((a: any) => !a.is_active).length || 0,
      defaultActivities: data?.filter((a: any) => a.is_default).length || 0,
      customActivities: data?.filter((a: any) => !a.is_default).length || 0,
      activitiesByProjectType: {},
      activitiesByCategory: {}
    }
    
    // Count by project type
    data?.forEach((activity: any) => {
      stats.activitiesByProjectType[activity.project_type] = 
        (stats.activitiesByProjectType[activity.project_type] || 0) + 1
      
      if (activity.category) {
        stats.activitiesByCategory[activity.category] = 
          (stats.activitiesByCategory[activity.category] || 0) + 1
      }
    })
    
    return stats
    
  } catch (error) {
    console.error('❌ Error getting activity stats:', error)
    return {
      totalActivities: 0,
      activeActivities: 0,
      inactiveActivities: 0,
      defaultActivities: 0,
      customActivities: 0,
      activitiesByProjectType: {},
      activitiesByCategory: {}
    }
  }
}

/**
 * Copy activities from one project type to another
 */
export async function copyActivities(
  fromProjectType: string,
  toProjectType: string,
  userId?: string
): Promise<{ success: boolean; copied: number; error?: string }> {
  try {
    console.log(`📋 Copying activities from ${fromProjectType} to ${toProjectType}`)
    
    const activities = await getActivitiesByProjectType(fromProjectType, false)
    
    if (activities.length === 0) {
      return { success: false, copied: 0, error: 'No activities found to copy' }
    }
    
    const activitiesToCopy = activities.map(activity => ({
      project_type: toProjectType,
      activity_name: activity.activity_name,
      activity_name_ar: activity.activity_name_ar,
      description: activity.description,
      default_unit: activity.default_unit,
      estimated_rate: activity.estimated_rate,
      category: activity.category,
      display_order: activity.display_order
    }))
    
    const result = await bulkImportActivities(toProjectType, activitiesToCopy, userId)
    
    return {
      success: result.success,
      copied: result.imported,
      error: result.errors.length > 0 ? result.errors.join(', ') : undefined
    }
    
  } catch (error: any) {
    console.error('❌ Error copying activities:', error)
    return { success: false, copied: 0, error: error.message }
  }
}

// ============================================
// Export default
// ============================================

export default {
  getActivitiesByProjectType,
  getAllActivities,
  getProjectTypesWithActivities,
  addActivity,
  updateActivity,
  deleteActivity,
  restoreActivity,
  reorderActivities,
  bulkImportActivities,
  getActivityStats,
  copyActivities
}


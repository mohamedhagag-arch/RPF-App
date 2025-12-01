/**
 * Custom Activities Management
 * Save and load user-defined activities for future use
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ActivityTemplate } from './activityTemplates'

export interface CustomActivity {
  id?: string
  name: string
  division: string
  unit: string
  typical_duration?: number
  created_by?: string
  usage_count?: number
  created_at?: string
}

/**
 * Save custom activity to database (or localStorage as fallback)
 */
export async function saveCustomActivity(
  activityName: string,
  division: string,
  unit: string,
  duration?: number
): Promise<boolean> {
  try {
    // Try localStorage first (simpler, works without DB table)
    const stored = localStorage.getItem('custom_activities')
    const activities: CustomActivity[] = stored ? JSON.parse(stored) : []
    
    // Check if already exists
    const exists = activities.find(
      a => a.name.toLowerCase() === activityName.toLowerCase() && 
           a.division.toLowerCase() === division.toLowerCase()
    )
    
    if (exists) {
      // Update usage count
      exists.usage_count = (exists.usage_count || 0) + 1
      console.log('✅ Updated usage count for existing activity:', activityName)
    } else {
      // Add new
      activities.push({
        name: activityName,
        division,
        unit,
        typical_duration: duration,
        usage_count: 1,
        created_at: new Date().toISOString()
      })
      console.log('✅ Saved new custom activity:', activityName)
    }
    
    localStorage.setItem('custom_activities', JSON.stringify(activities))
    return true
    
  } catch (error) {
    console.error('❌ Error saving custom activity:', error)
    return false
  }
}

/**
 * Load custom activities from storage
 */
export function loadCustomActivities(): CustomActivity[] {
  try {
    const stored = localStorage.getItem('custom_activities')
    if (stored) {
      const activities = JSON.parse(stored)
      console.log(`📦 Loaded ${activities.length} custom activities`)
      return activities
    }
    return []
  } catch (error) {
    console.error('❌ Error loading custom activities:', error)
    return []
  }
}

/**
 * Get all activities (templates + custom) by division
 */
export function getAllActivitiesByDivision(
  division: string,
  templates: ActivityTemplate[]
): ActivityTemplate[] {
  // Load custom activities
  const custom = loadCustomActivities()
  
  // Filter custom activities by division
  const customForDivision = custom
    .filter(c => c.division.toLowerCase() === division.toLowerCase())
    .map(c => ({
      name: c.name,
      division: c.division,
      defaultUnit: c.unit,
      typicalDuration: c.typical_duration,
      category: 'Custom'
    }))
  
  // Filter templates by division
  const templatesForDivision = templates.filter(
    t => t.division.toLowerCase() === division.toLowerCase()
  )
  
  // Merge and sort by usage (custom first, then templates)
  return [...customForDivision, ...templatesForDivision]
}

/**
 * Delete custom activity
 */
export function deleteCustomActivity(activityName: string, division: string): boolean {
  try {
    const stored = localStorage.getItem('custom_activities')
    if (!stored) return false
    
    const activities: CustomActivity[] = JSON.parse(stored)
    const filtered = activities.filter(
      a => !(a.name.toLowerCase() === activityName.toLowerCase() && 
             a.division.toLowerCase() === division.toLowerCase())
    )
    
    localStorage.setItem('custom_activities', JSON.stringify(filtered))
    console.log('🗑️ Deleted custom activity:', activityName)
    return true
    
  } catch (error) {
    console.error('❌ Error deleting custom activity:', error)
    return false
  }
}

/**
 * Get most used custom activities
 */
export function getMostUsedActivities(limit: number = 10): CustomActivity[] {
  const activities = loadCustomActivities()
  return activities
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, limit)
}

/**
 * Export custom activities to JSON
 */
export function exportCustomActivities(): string {
  const activities = loadCustomActivities()
  return JSON.stringify(activities, null, 2)
}

/**
 * Import custom activities from JSON
 */
export function importCustomActivities(json: string): boolean {
  try {
    const activities = JSON.parse(json)
    if (Array.isArray(activities)) {
      localStorage.setItem('custom_activities', JSON.stringify(activities))
      console.log('✅ Imported custom activities')
      return true
    }
    return false
  } catch (error) {
    console.error('❌ Error importing custom activities:', error)
    return false
  }
}



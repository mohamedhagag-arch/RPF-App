/**
 * Auto KPI Generator - Fixed Version
 * Generates KPI records automatically from BOQ activities
 */

import { BOQActivity } from './supabase'
import { getSupabaseClient } from './simpleConnectionManager'
import { TABLES } from './supabase'
import { getWorkingDays, WorkdaysConfig } from './workdaysCalculator'

export interface GeneratedKPI {
  activity_name: string
  quantity: number
  unit: string
  target_date: string
  activity_date: string
  project_code: string
  project_sub_code: string
  project_full_code: string
  section: string
  day: string
}

/**
 * Generate KPIs from BOQ activity
 */
export async function generateKPIsFromBOQ(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<GeneratedKPI[]> {
  console.log('🎯 Generating KPIs for activity:', activity.activity_name)
  
  try {
    const supabase = getSupabaseClient()
    
    // Get workdays between start and end dates
    const startDate = new Date(activity.planned_activity_start_date || activity.activity_planned_start_date || '')
    const endDate = new Date(activity.deadline || activity.activity_planned_completion_date || '')
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('⚠️ Invalid dates for activity:', activity.activity_name)
      return []
    }
    
    const workdays = getWorkingDays(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], config)
    console.log(`📅 Calculated ${workdays.length} workdays for ${activity.activity_name}`)
    
    if (workdays.length === 0) {
      console.warn('⚠️ No workdays calculated for activity:', activity.activity_name)
      return []
    }
    
    // Calculate quantity per day (rounded to nearest integer)
    const totalQuantity = activity.planned_units || 0
    const baseQuantityPerDay = Math.round(totalQuantity / workdays.length)
    const remainder = totalQuantity - (baseQuantityPerDay * workdays.length)
    
    console.log(`📊 Quantity distribution: ${totalQuantity} total → ${baseQuantityPerDay} per day (base) + ${remainder} remainder`)
    
    // Generate KPIs with proper distribution
    const kpis: GeneratedKPI[] = workdays.map((date, index) => {
      // Add remainder to first few days to ensure total matches
      const extraQuantity = index < remainder ? 1 : 0
      const finalQuantity = baseQuantityPerDay + extraQuantity
      
      return {
        activity_name: activity.activity_name || activity.activity || '',
        quantity: finalQuantity,
        unit: activity.unit || '',
        target_date: date.toISOString().split('T')[0],
        activity_date: date.toISOString().split('T')[0],
        project_code: activity.project_code || '',
        project_sub_code: activity.project_sub_code || '',
        project_full_code: activity.project_full_code || activity.project_code || '',
        section: activity.zone_ref || '',
        day: `Day ${index + 1} - ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
      }
    })
    
    console.log(`✅ Generated ${kpis.length} KPIs for ${activity.activity_name}`)
    return kpis
    
  } catch (error) {
    console.error('❌ Error generating KPIs:', error)
    return []
  }
}

/**
 * Save generated KPIs to database
 */
export async function saveGeneratedKPIs(kpis: GeneratedKPI[]): Promise<{ success: boolean; message: string; savedCount: number }> {
  if (kpis.length === 0) {
    return { success: true, message: 'No KPIs to save', savedCount: 0 }
  }
  
  try {
    const supabase = getSupabaseClient()
    
    // Convert to database format
    const dbKPIs = kpis.map(kpi => ({
      'Project Full Code': kpi.project_full_code,
      'Project Code': kpi.project_code,
      'Project Sub Code': kpi.project_sub_code,
      'Activity Name': kpi.activity_name,
      'Quantity': kpi.quantity.toString(),
      'Input Type': 'Planned',
      'Target Date': kpi.target_date,
      'Activity Date': kpi.activity_date,
      'Unit': kpi.unit,
      'Section': kpi.section,
      'Day': kpi.day
    }))
    
    console.log('📦 Database format sample:', JSON.stringify(dbKPIs[0], null, 2))
    console.log('🎯 Inserting into UNIFIED KPI table')
    
    // Insert into MAIN KPI table
    const { data, error } = await supabase
      .from(TABLES.KPI)
      .insert(dbKPIs as any)
      .select()
    
    if (error) {
      console.error('❌ Database error:', error)
      console.error('   Code:', error.code)
      console.error('   Message:', error.message)
      console.error('   Details:', error.details)
      console.error('   Hint:', error.hint)
      throw error
    }
    
    console.log(`✅ Successfully saved ${data?.length || 0} KPIs to database`)
    
    return {
      success: true,
      message: `Successfully generated and saved ${data?.length || 0} KPI records`,
      savedCount: data?.length || 0
    }
    
  } catch (error: any) {
    console.error('❌ Error saving KPIs:', error)
    return {
      success: false,
      message: error.message || 'Failed to save KPIs',
      savedCount: 0
    }
  }
}

/**
 * Generate and save KPIs from BOQ activity
 */
export async function generateAndSaveKPIs(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<{ success: boolean; message: string; kpisGenerated: number; kpisSaved: number }> {
  try {
    console.log('🚀 Starting KPI generation for:', activity.activity_name)
    
    // Generate KPIs
    const kpis = await generateKPIsFromBOQ(activity, config)
    
    if (kpis.length === 0) {
      return {
        success: false,
        message: 'No KPIs generated - check activity dates and configuration',
        kpisGenerated: 0,
        kpisSaved: 0
      }
    }
    
    // Save KPIs
    const saveResult = await saveGeneratedKPIs(kpis)
    
    return {
      success: saveResult.success,
      message: saveResult.message,
      kpisGenerated: kpis.length,
      kpisSaved: saveResult.savedCount
    }
    
  } catch (error: any) {
    console.error('❌ Error in generateAndSaveKPIs:', error)
    return {
      success: false,
      message: error.message || 'Failed to generate and save KPIs',
      kpisGenerated: 0,
      kpisSaved: 0
    }
  }
}

/**
 * Preview KPIs without saving
 */
export function previewKPIs(activity: BOQActivity, config?: WorkdaysConfig): GeneratedKPI[] {
  try {
    const startDate = new Date(activity.planned_activity_start_date || activity.activity_planned_start_date || '')
    const endDate = new Date(activity.deadline || activity.activity_planned_completion_date || '')
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return []
    }
    
    const workdays = getWorkingDays(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], config)
    const totalQuantity = activity.planned_units || 0
    const baseQuantityPerDay = Math.round(totalQuantity / workdays.length)
    const remainder = totalQuantity - (baseQuantityPerDay * workdays.length)
    
    return workdays.map((date, index) => {
      // Add remainder to first few days to ensure total matches
      const extraQuantity = index < remainder ? 1 : 0
      const finalQuantity = baseQuantityPerDay + extraQuantity
      
      return {
        activity_name: activity.activity_name || activity.activity || '',
        quantity: finalQuantity,
        unit: activity.unit || '',
        target_date: date.toISOString().split('T')[0],
        activity_date: date.toISOString().split('T')[0],
        project_code: activity.project_code || '',
        project_sub_code: activity.project_sub_code || '',
        project_full_code: activity.project_full_code || activity.project_code || '',
        section: activity.zone_ref || '',
        day: `Day ${index + 1} - ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
      }
    })
    
  } catch (error) {
    console.error('❌ Error previewing KPIs:', error)
    return []
  }
}

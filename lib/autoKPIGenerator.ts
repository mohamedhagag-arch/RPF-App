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
    
    const workdays = await getWorkingDays(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], config)
    console.log(`📅 Calculated ${workdays.length} workdays for ${activity.activity_name}`)
    
    if (workdays.length === 0) {
      console.warn('⚠️ No workdays calculated for activity:', activity.activity_name)
      return []
    }
    
    // ✅ Calculate quantity per day using FLOOR to ensure total matches
    const totalQuantity = activity.planned_units || 0
    const baseQuantityPerDay = Math.floor(totalQuantity / workdays.length) // Use floor instead of round
    const remainder = totalQuantity - (baseQuantityPerDay * workdays.length) // Calculate exact remainder
    
    console.log(`📊 Quantity distribution: ${totalQuantity} total → ${baseQuantityPerDay} per day (base) + ${remainder} remainder`)
    console.log(`✅ Verification: ${baseQuantityPerDay} × ${workdays.length} + ${remainder} = ${(baseQuantityPerDay * workdays.length) + remainder} (should equal ${totalQuantity})`)
    
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
    
    // ✅ Verify total quantity matches planned units
    const calculatedTotal = kpis.reduce((sum, kpi) => sum + kpi.quantity, 0)
    console.log(`✅ Generated ${kpis.length} KPIs for ${activity.activity_name}`)
    console.log(`📊 Total Quantity Verification: ${calculatedTotal} (Generated) === ${totalQuantity} (Planned Units)`)
    
    if (calculatedTotal !== totalQuantity) {
      console.error(`❌ MISMATCH! Generated total (${calculatedTotal}) ≠ Planned Units (${totalQuantity})`)
    } else {
      console.log(`✅ VERIFIED: Total matches Planned Units perfectly!`)
    }
    
    return kpis
    
  } catch (error) {
    console.error('❌ Error generating KPIs:', error)
    return []
  }
}

/**
 * Delete existing Planned KPIs for an activity (cleanup before creating new ones)
 */
async function deleteExistingPlannedKPIs(
  projectCode: string,
  activityName: string
): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const supabase = getSupabaseClient()
    
    console.log('🧹 Checking for existing Planned KPIs to clean up...')
    console.log('   Project:', projectCode)
    console.log('   Activity:', activityName)
    
    // Check if there are existing Planned KPIs
    const { data: existingKPIs, error: checkError } = await supabase
      .from(TABLES.KPI)
      .select('id')
      .eq('Project Full Code', projectCode)
      .eq('Activity Name', activityName)
      .eq('Input Type', 'Planned')
    
    if (checkError) throw checkError
    
    if (existingKPIs && existingKPIs.length > 0) {
      console.log(`⚠️ Found ${existingKPIs.length} existing Planned KPIs - will delete them first`)
      
      // Delete existing Planned KPIs
      const { error: deleteError } = await supabase
        .from(TABLES.KPI)
        .delete()
        .eq('Project Full Code', projectCode)
        .eq('Activity Name', activityName)
        .eq('Input Type', 'Planned')
      
      if (deleteError) throw deleteError
      
      console.log(`✅ Deleted ${existingKPIs.length} existing Planned KPIs`)
      return { success: true, deletedCount: existingKPIs.length }
    } else {
      console.log('✅ No existing Planned KPIs found - proceeding with creation')
      return { success: true, deletedCount: 0 }
    }
    
  } catch (error: any) {
    console.error('❌ Error deleting existing KPIs:', error)
    return { success: false, deletedCount: 0 }
  }
}

/**
 * Save generated KPIs to database
 */
export async function saveGeneratedKPIs(kpis: GeneratedKPI[], cleanupFirst: boolean = true): Promise<{ success: boolean; message: string; savedCount: number; deletedCount?: number }> {
  if (kpis.length === 0) {
    return { success: true, message: 'No KPIs to save', savedCount: 0 }
  }
  
  try {
    const supabase = getSupabaseClient()
    
    let deletedCount = 0
    
    // ✅ CLEANUP: Delete existing Planned KPIs before creating new ones (prevents duplicates!)
    if (cleanupFirst && kpis.length > 0) {
      const projectCode = kpis[0].project_full_code
      const activityName = kpis[0].activity_name
      
      const cleanupResult = await deleteExistingPlannedKPIs(projectCode, activityName)
      deletedCount = cleanupResult.deletedCount
    }
    
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
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old Planned KPIs before creating new ones`)
    }
    
    return {
      success: true,
      message: deletedCount > 0 
        ? `Successfully replaced ${deletedCount} old KPIs with ${data?.length || 0} new KPI records`
        : `Successfully generated and saved ${data?.length || 0} KPI records`,
      savedCount: data?.length || 0,
      deletedCount
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
 * Update existing KPIs when BOQ activity is modified
 */
export async function updateExistingKPIs(
  activity: BOQActivity,
  oldActivityName: string,
  config?: WorkdaysConfig
): Promise<{ success: boolean; message: string; updatedCount: number; deletedCount: number; addedCount: number }> {
  try {
    const supabase = getSupabaseClient()
    
    console.log('🔄 Updating existing KPIs for activity:', {
      oldName: oldActivityName,
      newName: activity.activity_name,
      projectCode: activity.project_code
    })
    
    // Step 1: Find existing KPIs by old activity name
    const { data: existingKPIs, error: fetchError } = await supabase
      .from(TABLES.KPI)
      .select('*')
      .eq('Project Code', activity.project_code)
      .eq('Activity Name', oldActivityName)
      .eq('Input Type', 'Planned')
      .order('Target Date', { ascending: true })
    
    if (fetchError) {
      console.error('❌ Error fetching existing KPIs:', fetchError)
      return { success: false, message: fetchError.message, updatedCount: 0, deletedCount: 0, addedCount: 0 }
    }
    
    console.log(`📊 Found ${existingKPIs?.length || 0} existing KPIs to update`)
    
    // Step 2: Generate new KPIs based on updated activity
    const newKPIs = await generateKPIsFromBOQ(activity, config)
    
    if (newKPIs.length === 0) {
      // If no new KPIs, delete all existing ones
      if (existingKPIs && existingKPIs.length > 0) {
        const { error: deleteError } = await supabase
          .from(TABLES.KPI)
          .delete()
          .eq('Project Code', activity.project_code)
          .eq('Activity Name', oldActivityName)
          .eq('Input Type', 'Planned')
        
        if (deleteError) {
          console.error('❌ Error deleting KPIs:', deleteError)
          return { success: false, message: deleteError.message, updatedCount: 0, deletedCount: 0, addedCount: 0 }
        }
        
        console.log(`🗑️ Deleted ${existingKPIs.length} KPIs (no new KPIs generated)`)
        return { success: true, message: `Deleted ${existingKPIs.length} KPIs (no new KPIs generated)`, updatedCount: 0, deletedCount: existingKPIs.length, addedCount: 0 }
      }
      return { success: true, message: 'No KPIs to update', updatedCount: 0, deletedCount: 0, addedCount: 0 }
    }
    
    const existingCount = existingKPIs?.length || 0
    const newCount = newKPIs.length
    let updatedCount = 0
    let deletedCount = 0
    let addedCount = 0
    
    // Step 3: Smart update based on count difference
    if (existingCount === 0) {
      // No existing KPIs → Insert all new
      console.log('🆕 No existing KPIs, creating all from scratch...')
      const insertResult = await saveGeneratedKPIs(newKPIs)
      if (!insertResult.success) {
        return { success: false, message: insertResult.message, updatedCount: 0, deletedCount: 0, addedCount: 0 }
      }
      addedCount = insertResult.savedCount
      
    } else if (newCount === existingCount) {
      // Same count → Update existing KPIs with new values
      console.log(`✏️ Same count (${existingCount}), updating existing KPIs...`)
      
      for (let i = 0; i < existingCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          // @ts-ignore
          .update({
            'Activity Name': newKPI.activity_name,
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit,
            'Target Date': newKPI.target_date,
            'Activity Date': newKPI.activity_date,
            'Project Code': newKPI.project_code,
            'Project Sub Code': newKPI.project_sub_code,
            'Project Full Code': newKPI.project_full_code,
            'Section': newKPI.section,
            'Day': newKPI.day
          })
          .eq('id', (existingKPI as any).id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updatedCount++
        }
      }
      
    } else if (newCount > existingCount) {
      // More days → Update existing + Add new
      console.log(`➕ Increased from ${existingCount} to ${newCount} days`)
      
      // Update existing KPIs
      for (let i = 0; i < existingCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          // @ts-ignore
          .update({
            'Activity Name': newKPI.activity_name,
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit,
            'Target Date': newKPI.target_date,
            'Activity Date': newKPI.activity_date,
            'Project Code': newKPI.project_code,
            'Project Sub Code': newKPI.project_sub_code,
            'Project Full Code': newKPI.project_full_code,
            'Section': newKPI.section,
            'Day': newKPI.day
          })
          .eq('id', (existingKPI as any).id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updatedCount++
        }
      }
      
      // Insert new KPIs for additional days
      const additionalKPIs = newKPIs.slice(existingCount)
      const insertResult = await saveGeneratedKPIs(additionalKPIs)
      if (insertResult.success) {
        addedCount = insertResult.savedCount
      }
      
    } else {
      // Fewer days → Update remaining + Delete extra
      console.log(`➖ Decreased from ${existingCount} to ${newCount} days`)
      
      // Update remaining KPIs
      for (let i = 0; i < newCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          // @ts-ignore
          .update({
            'Activity Name': newKPI.activity_name,
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit,
            'Target Date': newKPI.target_date,
            'Activity Date': newKPI.activity_date,
            'Project Code': newKPI.project_code,
            'Project Sub Code': newKPI.project_sub_code,
            'Project Full Code': newKPI.project_full_code,
            'Section': newKPI.section,
            'Day': newKPI.day
          })
          .eq('id', (existingKPI as any).id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updatedCount++
        }
      }
      
      // Delete extra KPIs
      const extraKPIs = existingKPIs.slice(newCount)
      const idsToDelete = extraKPIs.map(kpi => (kpi as any).id)
      
      const { error: deleteError } = await supabase
        .from(TABLES.KPI)
        .delete()
        .in('id', idsToDelete)
      
      if (deleteError) {
        console.error('❌ Error deleting extra KPIs:', deleteError)
      } else {
        deletedCount = idsToDelete.length
      }
    }
    
    console.log('✅ KPI update complete!', {
      updated: updatedCount,
      added: addedCount,
      deleted: deletedCount
    })
    
    const parts = []
    if (updatedCount > 0) parts.push(`Updated ${updatedCount} KPIs`)
    if (addedCount > 0) parts.push(`Added ${addedCount} new KPIs`)
    if (deletedCount > 0) parts.push(`Deleted ${deletedCount} extra KPIs`)
    
    return {
      success: true,
      message: parts.length > 0 ? parts.join(', ') : 'KPIs updated successfully',
      updatedCount,
      deletedCount,
      addedCount
    }
    
  } catch (error: any) {
    console.error('❌ Error updating KPIs:', error)
    return {
      success: false,
      message: error.message || 'Failed to update KPIs',
      updatedCount: 0,
      deletedCount: 0,
      addedCount: 0
    }
  }
}

/**
 * Preview KPIs without saving
 */
export async function previewKPIs(activity: BOQActivity, config?: WorkdaysConfig): Promise<GeneratedKPI[]> {
  try {
    const startDate = new Date(activity.planned_activity_start_date || activity.activity_planned_start_date || '')
    const endDate = new Date(activity.deadline || activity.activity_planned_completion_date || '')
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return []
    }
    
    const workdays = await getWorkingDays(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], config)
    const totalQuantity = activity.planned_units || 0
    const baseQuantityPerDay = Math.floor(totalQuantity / workdays.length) // ✅ Use floor to ensure total matches
    const remainder = totalQuantity - (baseQuantityPerDay * workdays.length) // ✅ Calculate exact remainder
    
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

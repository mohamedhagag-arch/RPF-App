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
  zone: string // ✅ Zone field (from activity.zone_ref or zone_number)
  day: string
  activity_division?: string // ✅ Division field
  activity_timing?: string // ✅ Activity Timing field
}

/**
 * Generate KPIs from BOQ activity
 */
export async function generateKPIsFromBOQ(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<GeneratedKPI[]> {
  console.log('🎯 Generating KPIs for activity:', activity.activity_name)
  console.log('📋 Activity data received:', {
    activity_name: activity.activity_name,
    planned_activity_start_date: activity.planned_activity_start_date,
    activity_planned_start_date: activity.activity_planned_start_date,
    deadline: activity.deadline,
    activity_planned_completion_date: activity.activity_planned_completion_date,
    planned_units: activity.planned_units,
    calendar_duration: activity.calendar_duration,
    activity_timing: activity.activity_timing,
    has_value: activity.has_value,
    affects_timeline: activity.affects_timeline
  })
  
  try {
    // ✅ Check Activity Timing - skip KPI generation ONLY for post-completion activities without value/timeline impact
    // ✅ Pre-commencement and Post-commencement activities SHOULD generate KPIs
    const activityTiming = activity.activity_timing || 'post-commencement'
    const hasValue = activity.has_value !== undefined ? activity.has_value : true
    const affectsTimeline = activity.affects_timeline !== undefined ? activity.affects_timeline : false
    const useVirtualMaterial = activity.use_virtual_material !== undefined ? activity.use_virtual_material : false
    
    console.log('⏰ Activity Timing check:', {
      activity_timing: activityTiming,
      has_value: hasValue,
      affects_timeline: affectsTimeline,
      use_virtual_material: useVirtualMaterial,
      activity_name: activity.activity_name
    })
    
    // ✅ If use_virtual_material is true, ALWAYS generate KPIs (regardless of other conditions)
    if (useVirtualMaterial) {
      console.log('✅ Use Virtual Material is enabled - will generate KPIs')
    }
    
    // ✅ Only skip for post-completion without value/timeline impact (unless use_virtual_material is true)
    // ✅ Pre-commencement and Post-commencement should ALWAYS generate KPIs
    if (!useVirtualMaterial && activityTiming === 'post-completion' && !hasValue && !affectsTimeline) {
      console.log('⚠️ Post-completion activity with no value and no timeline impact - skipping KPI generation')
      return []
    }
    
    // ✅ Pre-commencement and Post-commencement should generate KPIs
    if (activityTiming === 'pre-commencement' || activityTiming === 'post-commencement') {
      console.log(`✅ ${activityTiming} activity - will generate KPIs`)
    }
    
    const supabase = getSupabaseClient()
    
    // Get workdays between start and end dates
    const startDateStr = activity.planned_activity_start_date || activity.activity_planned_start_date || ''
    const endDateStr = activity.deadline || activity.activity_planned_completion_date || ''
    
    console.log(`📅 Date range: ${startDateStr} → ${endDateStr}`)
    
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('⚠️ Invalid dates for activity:', activity.activity_name, {
        startDate: startDateStr,
        endDate: endDateStr,
        startDateValid: !isNaN(startDate.getTime()),
        endDateValid: !isNaN(endDate.getTime())
      })
      return []
    }
    
    const workdays = await getWorkingDays(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], config)
    console.log(`📅 Calculated ${workdays.length} workdays for ${activity.activity_name} (from ${startDateStr} to ${endDateStr})`)
    
    if (workdays.length === 0) {
      console.warn('⚠️ No workdays calculated for activity:', activity.activity_name)
      return []
    }
    
    // ✅ Calculate quantity per day using FLOOR to ensure total matches
    const totalQuantity = activity.planned_units || 0
    console.log(`📊 Total quantity: ${totalQuantity} units`)
    const baseQuantityPerDay = Math.floor(totalQuantity / workdays.length) // Use floor instead of round
    const remainder = totalQuantity - (baseQuantityPerDay * workdays.length) // Calculate exact remainder
    
    console.log(`📊 Quantity distribution: ${totalQuantity} total → ${baseQuantityPerDay} per day (base) + ${remainder} remainder`)
    console.log(`✅ Verification: ${baseQuantityPerDay} × ${workdays.length} + ${remainder} = ${(baseQuantityPerDay * workdays.length) + remainder} (should equal ${totalQuantity})`)
    
    // ✅ FIX: Use project_full_code as project_code if available (e.g., "P4110-P")
    // This ensures KPIs are created with the correct project code when project has sub_code
    const projectFullCode = activity.project_full_code || activity.project_code || ''
    const projectCode = projectFullCode || activity.project_code || '' // Use full_code as code if available
    
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
        project_code: projectCode, // ✅ Use project_full_code if available
        project_sub_code: activity.project_sub_code || '',
        project_full_code: projectFullCode, // ✅ Use project_full_code
        // ✅ Section and Zone are separate - Section is only for Actual KPIs entered by site engineer
        section: '', // ✅ Section is separate from Zone - leave empty for auto-created KPIs
        zone: activity.zone_ref || activity.zone_number || '', // ✅ Zone comes from activity.zone_ref or zone_number
        day: `Day ${index + 1} - ${date.toLocaleDateString('en-US', { weekday: 'long' })}`,
        activity_division: activity.activity_division || '', // ✅ Division field
        activity_timing: activity.activity_timing || 'post-commencement' // ✅ Activity Timing field
      }
    })
    
    // ✅ Verify Activity Timing is included in all generated KPIs
    if (kpis.length > 0) {
      const timingCounts = kpis.reduce((acc, kpi) => {
        const timing = kpi.activity_timing || 'post-commencement'
        acc[timing] = (acc[timing] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log('⏰ Activity Timing distribution in generated KPIs:', timingCounts)
      console.log('⏰ Activity Timing from BOQ Activity:', activity.activity_timing || 'post-commencement')
    }
    
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
export async function saveGeneratedKPIs(kpis: GeneratedKPI[], cleanupFirst: boolean = true, createdBy?: string): Promise<{ success: boolean; message: string; savedCount: number; deletedCount?: number }> {
  if (kpis.length === 0) {
    return { success: true, message: 'No KPIs to save', savedCount: 0 }
  }
  
  try {
    const supabase = getSupabaseClient()
    
    // ✅ Get user info if not provided
    let createdByValue = createdBy
    if (!createdByValue) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try to get email from users table
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', user.id)
            .single()
          
          if (userData && typeof userData === 'object' && 'email' in userData) {
            createdByValue = (userData as { email?: string }).email || user.email || user.id || 'System'
          } else {
            createdByValue = user.email || user.id || 'System'
          }
        } else {
          createdByValue = 'System'
        }
      } catch (e) {
        createdByValue = 'System'
      }
    }
    
    let deletedCount = 0
    
    // ✅ CLEANUP: Delete existing Planned KPIs before creating new ones (prevents duplicates!)
    if (cleanupFirst && kpis.length > 0) {
      const projectCode = kpis[0].project_full_code
      const activityName = kpis[0].activity_name
      
      const cleanupResult = await deleteExistingPlannedKPIs(projectCode, activityName)
      deletedCount = cleanupResult.deletedCount
    }
    
    // Convert to database format
    // ✅ AUTO-APPROVE: All Planned KPIs are automatically approved on creation
    // ✅ FIX: Use project_full_code as Project Code if available (e.g., "P4110-P")
    const dbKPIs = kpis.map(kpi => ({
      'Project Full Code': kpi.project_full_code,
      'Project Code': kpi.project_full_code || kpi.project_code, // ✅ Use full_code as code if available
      'Project Sub Code': kpi.project_sub_code,
      'Activity Name': kpi.activity_name,
      'Activity Division': kpi.activity_division || '', // ✅ Division field
      'Activity Timing': kpi.activity_timing || 'post-commencement', // ✅ Activity Timing field
      'Quantity': kpi.quantity.toString(),
      'Input Type': 'Planned',
      'Target Date': kpi.target_date,
      'Activity Date': kpi.activity_date,
      'Unit': kpi.unit,
      // ✅ Section and Zone are separate fields
      'Section': kpi.section || '', // ✅ Section is separate from Zone - leave empty for auto-created KPIs
      // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
      'Zone': (() => {
        const projectFullCode = kpi.project_full_code || kpi.project_code || ''
        const activityZone = kpi.zone || ''
        if (activityZone && projectFullCode) {
          // If zone already contains project code, use it as is
          if (activityZone.includes(projectFullCode)) {
            return activityZone
          }
          // Otherwise, format as: full code + zone
          return `${projectFullCode}-${activityZone}`
        }
        return activityZone || ''
      })(),
      'Zone Number': '', // ✅ Zone Number can be extracted from zone if needed
      'Day': kpi.day,
      'Approval Status': 'approved', // ✅ Auto-approve Planned KPIs
      'created_by': createdByValue // ✅ Set created_by
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
      
      // ✅ Helpful error message for missing Activity Timing column
      if (error.message && error.message.includes("Activity Timing") && error.message.includes("schema cache")) {
        console.error('')
        console.error('🔧 SOLUTION: The "Activity Timing" column is missing from the KPI table.')
        console.error('   Please run the migration script: Database/add-activity-timing-to-kpi.sql')
        console.error('   This will add the required column to the "Planning Database - KPI" table.')
        console.error('')
      }
      
      throw error
    }
    
    console.log(`✅ Successfully saved ${data?.length || 0} KPIs to database`)
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old Planned KPIs before creating new ones`)
    }
    
    // ✅ Dispatch database-updated event to refresh KPI and BOQ pages
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('database-updated', {
        detail: { tableName: TABLES.KPI }
      })
      window.dispatchEvent(event)
      console.log('🔔 Dispatched database-updated event for KPI table')
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
      projectCode: activity.project_code,
      activity_timing: activity.activity_timing, // ✅ Log Activity Timing
      has_value: activity.has_value,
      affects_timeline: activity.affects_timeline
    })
    
    // Step 1: Find existing KPIs by old activity name and project
    // ✅ Build project_full_code for accurate matching
    const projectCode = (activity.project_code || '').trim()
    const projectSubCode = (activity.project_sub_code || '').trim()
    let projectFullCode = activity.project_full_code || projectCode
    if (!projectFullCode || projectFullCode === projectCode) {
      if (projectSubCode) {
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode
        } else {
          if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`
          }
        }
      }
    }
    
    console.log(`🔍 Searching for existing KPIs:`, {
      projectCode,
      projectSubCode,
      projectFullCode,
      oldActivityName
    })
    
    // ✅ Try multiple strategies to find existing KPIs
    let existingKPIs: any[] = []
    
    // Strategy 1: Match by Project Full Code + Activity Name
    let { data: kpisByFullCode, error: error1 } = await supabase
      .from(TABLES.KPI)
      .select('*')
      .eq('Project Full Code', projectFullCode)
      .eq('Activity Name', oldActivityName)
      .eq('Input Type', 'Planned')
      .order('Target Date', { ascending: true })
    
    if (kpisByFullCode && Array.isArray(kpisByFullCode) && kpisByFullCode.length > 0) {
      existingKPIs = kpisByFullCode
      console.log(`✅ Found ${existingKPIs.length} KPIs by Project Full Code`)
    } else {
      // Strategy 2: Match by Project Code + Project Sub Code + Activity Name
      if (projectSubCode) {
        let { data: kpisByCodeAndSub, error: error2 } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Code', projectCode)
          .eq('Project Sub Code', projectSubCode)
          .eq('Activity Name', oldActivityName)
          .eq('Input Type', 'Planned')
          .order('Target Date', { ascending: true })
        
        if (kpisByCodeAndSub && Array.isArray(kpisByCodeAndSub) && kpisByCodeAndSub.length > 0) {
          existingKPIs = kpisByCodeAndSub
          console.log(`✅ Found ${existingKPIs.length} KPIs by Project Code + Sub Code`)
        } else {
          // Strategy 3: Match by Project Code only (fallback)
          let { data: kpisByCode, error: error3 } = await supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Code', projectCode)
            .eq('Activity Name', oldActivityName)
            .eq('Input Type', 'Planned')
            .order('Target Date', { ascending: true })
          
          if (kpisByCode && Array.isArray(kpisByCode) && kpisByCode.length > 0) {
            existingKPIs = kpisByCode
            console.log(`✅ Found ${existingKPIs.length} KPIs by Project Code only`)
          }
        }
      } else {
        // Strategy 3: Match by Project Code only (no sub_code)
        let { data: kpisByCode, error: error3 } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Code', projectCode)
          .eq('Activity Name', oldActivityName)
          .eq('Input Type', 'Planned')
          .order('Target Date', { ascending: true })
        
        if (kpisByCode && Array.isArray(kpisByCode) && kpisByCode.length > 0) {
          existingKPIs = kpisByCode
          console.log(`✅ Found ${existingKPIs.length} KPIs by Project Code only`)
        }
      }
    }
    
    // Don't fail if error1 exists - we might have found KPIs with other strategies
    if (error1 && existingKPIs.length === 0) {
      console.warn('⚠️ Error in primary fetch strategy, but continuing with other strategies')
    }
    
    console.log(`📊 Found ${existingKPIs?.length || 0} existing KPIs to update`)
    
    // ✅ Log Activity Timing from BOQ Activity
    console.log('⏰ Activity Timing from BOQ Activity:', {
      activity_timing: activity.activity_timing,
      activity_name: activity.activity_name,
      project_full_code: activity.project_full_code
    })
    
    // Step 2: Generate new KPIs based on updated activity
    const newKPIs = await generateKPIsFromBOQ(activity, config)
    
    // ✅ Verify Activity Timing is included in generated KPIs
    if (newKPIs.length > 0) {
      console.log('⏰ Activity Timing in generated KPIs:', {
        firstKPI_timing: newKPIs[0].activity_timing,
        allKPIs_have_timing: newKPIs.every(kpi => kpi.activity_timing),
        activity_timing_from_activity: activity.activity_timing
      })
    }
    
    if (newKPIs.length === 0) {
      // If no new KPIs, delete all existing ones
      if (existingKPIs && existingKPIs.length > 0) {
        const idsToDelete = existingKPIs.map((kpi: any) => (kpi as any).id)
        const { error: deleteError } = await supabase
          .from(TABLES.KPI)
          .delete()
          .in('id', idsToDelete)
        
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
      console.log(`✏️ Same count (${existingCount}), updating all ${existingCount} existing KPIs...`)
      
      for (let i = 0; i < existingCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          // @ts-ignore
          .update({
            'Activity Name': newKPI.activity_name,
            'Activity Division': newKPI.activity_division || '', // ✅ Update Division
            'Activity Timing': newKPI.activity_timing || 'post-commencement', // ✅ Update Activity Timing
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit,
            'Target Date': newKPI.target_date,
            'Activity Date': newKPI.activity_date,
            'Project Code': newKPI.project_code,
            'Project Sub Code': newKPI.project_sub_code,
            'Project Full Code': newKPI.project_full_code,
            // ✅ Section and Zone are separate fields
            'Section': newKPI.section || '', // ✅ Section is separate from Zone
            'Zone': newKPI.zone || '', // ✅ Zone comes from activity.zone_ref or zone_number
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
      console.log(`➕ Increased from ${existingCount} to ${newCount} days (need to add ${newCount - existingCount} new KPIs)`)
      
      // Update existing KPIs
      console.log(`✏️ Updating ${existingCount} existing KPIs...`)
      for (let i = 0; i < existingCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          // @ts-ignore
          .update({
            'Activity Name': newKPI.activity_name,
            'Activity Division': newKPI.activity_division || '', // ✅ Update Division
            'Activity Timing': newKPI.activity_timing || 'post-commencement', // ✅ Update Activity Timing
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit,
            'Target Date': newKPI.target_date,
            'Activity Date': newKPI.activity_date,
            'Project Code': newKPI.project_code,
            'Project Sub Code': newKPI.project_sub_code,
            'Project Full Code': newKPI.project_full_code,
            // ✅ Section and Zone are separate fields
            'Section': newKPI.section || '', // ✅ Section is separate from Zone
            'Zone': newKPI.zone || '', // ✅ Zone comes from activity.zone_ref or zone_number
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
      console.log(`➕ Adding ${additionalKPIs.length} new KPIs (from day ${existingCount + 1} to ${newCount})`)
      
      // ✅ IMPORTANT: Don't cleanup when adding - we only want to add new ones
      const insertResult = await saveGeneratedKPIs(additionalKPIs, false) // cleanupFirst = false
      if (insertResult.success) {
        addedCount = insertResult.savedCount
        console.log(`✅ Successfully added ${addedCount} new KPIs`)
      } else {
        console.error('❌ Failed to add new KPIs:', insertResult.message)
      }
      
    } else {
      // Fewer days → Update remaining + Delete extra
      console.log(`➖ Decreased from ${existingCount} to ${newCount} days (need to delete ${existingCount - newCount} extra KPIs)`)
      console.log(`📊 Count breakdown: existing=${existingCount}, new=${newCount}, to_delete=${existingCount - newCount}`)
      
      // ✅ Verify KPIs are sorted by date
      console.log(`📅 Existing KPIs dates (first 3):`, existingKPIs.slice(0, 3).map((k: any) => k['Target Date'] || k['Activity Date']))
      console.log(`📅 New KPIs dates (first 3):`, newKPIs.slice(0, 3).map(k => k.target_date))
      
      // Update remaining KPIs
      console.log(`✏️ Updating ${newCount} remaining KPIs...`)
      for (let i = 0; i < newCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        // ✅ DEBUG: Log first update to verify matching
        if (i === 0) {
          console.log('🔍 First KPI update:', {
            existing_date: existingKPI['Target Date'] || existingKPI['Activity Date'],
            new_date: newKPI.target_date,
            existing_id: (existingKPI as any).id
          })
        }
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          // @ts-ignore
          .update({
            'Activity Name': newKPI.activity_name,
            'Activity Division': newKPI.activity_division || '', // ✅ Update Division
            'Activity Timing': newKPI.activity_timing || 'post-commencement', // ✅ Update Activity Timing
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit,
            'Target Date': newKPI.target_date,
            'Activity Date': newKPI.activity_date,
            'Project Code': newKPI.project_code,
            'Project Sub Code': newKPI.project_sub_code,
            'Project Full Code': newKPI.project_full_code,
            // ✅ Section and Zone are separate fields
            'Section': newKPI.section || '', // ✅ Section is separate from Zone
            'Zone': newKPI.zone || '', // ✅ Zone comes from activity.zone_ref or zone_number
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
      
      console.log(`🗑️ Deleting ${idsToDelete.length} extra KPIs (IDs: ${idsToDelete.slice(0, 5).join(', ')}${idsToDelete.length > 5 ? '...' : ''})`)
      
      if (idsToDelete.length > 0) {
        const { error: deleteError, data: deleteData } = await supabase
          .from(TABLES.KPI)
          .delete()
          .in('id', idsToDelete)
          .select()
        
        if (deleteError) {
          console.error('❌ Error deleting extra KPIs:', deleteError)
          console.error('   IDs attempted:', idsToDelete)
        } else {
          deletedCount = deleteData?.length || idsToDelete.length
          console.log(`✅ Successfully deleted ${deletedCount} extra KPIs`)
        }
      } else {
        console.warn('⚠️ No KPIs to delete (idsToDelete is empty)')
      }
    }
    
    // ✅ VERIFY: Check final count matches expected using multiple strategies
    let finalCount = 0
    
    // Strategy 1: Count by Project Full Code
    let { count: countByFullCode } = await supabase
      .from(TABLES.KPI)
      .select('id', { count: 'exact', head: true })
      .eq('Project Full Code', projectFullCode)
      .eq('Activity Name', activity.activity_name)
      .eq('Input Type', 'Planned')
    
    if (countByFullCode && countByFullCode > 0) {
      finalCount = countByFullCode
    } else if (projectSubCode) {
      // Strategy 2: Count by Project Code + Project Sub Code
      let { count: countByCodeAndSub } = await supabase
        .from(TABLES.KPI)
        .select('id', { count: 'exact', head: true })
        .eq('Project Code', projectCode)
        .eq('Project Sub Code', projectSubCode)
        .eq('Activity Name', activity.activity_name)
        .eq('Input Type', 'Planned')
      
      if (countByCodeAndSub && countByCodeAndSub > 0) {
        finalCount = countByCodeAndSub
      } else {
        // Strategy 3: Count by Project Code only
        let { count: countByCode } = await supabase
          .from(TABLES.KPI)
          .select('id', { count: 'exact', head: true })
          .eq('Project Code', projectCode)
          .eq('Activity Name', activity.activity_name)
          .eq('Input Type', 'Planned')
        
        if (countByCode) {
          finalCount = countByCode
        }
      }
    } else {
      // Strategy 3: Count by Project Code only (no sub_code)
      let { count: countByCode } = await supabase
        .from(TABLES.KPI)
        .select('id', { count: 'exact', head: true })
        .eq('Project Code', projectCode)
        .eq('Activity Name', activity.activity_name)
        .eq('Input Type', 'Planned')
      
      if (countByCode) {
        finalCount = countByCode
      }
    }
    
    console.log(`📊 Final KPI count verification: ${finalCount} (expected: ${newCount})`)
    console.log(`📊 Update summary: Updated=${updatedCount}, Added=${addedCount}, Deleted=${deletedCount}`)
    
    if (finalCount !== newCount) {
      console.warn(`⚠️ MISMATCH! Final count (${finalCount}) ≠ Expected (${newCount})`)
      console.warn(`   This indicates a problem with the update logic!`)
      console.warn(`   Update summary: Updated=${updatedCount}, Added=${addedCount}, Deleted=${deletedCount}`)
      
      // ✅ If count is higher than expected, try to find and delete extra KPIs
      if (finalCount > newCount) {
        const extraCount = finalCount - newCount
        console.warn(`⚠️ Found ${extraCount} extra KPIs that should be deleted`)
        
        // Try to find and delete the extra KPIs
        let { data: extraKPIsData } = await supabase
          .from(TABLES.KPI)
          .select('id')
          .eq('Project Full Code', projectFullCode)
          .eq('Activity Name', activity.activity_name)
          .eq('Input Type', 'Planned')
          .order('Target Date', { ascending: true })
          .range(newCount, finalCount - 1) // Get the extra KPIs (after the first newCount)
        
        if (extraKPIsData && extraKPIsData.length > 0) {
          const extraIds = extraKPIsData.map((kpi: any) => kpi.id)
          console.log(`🗑️ Attempting to delete ${extraIds.length} extra KPIs found in verification...`)
          
          const { error: cleanupError } = await supabase
            .from(TABLES.KPI)
            .delete()
            .in('id', extraIds)
          
          if (cleanupError) {
            console.error('❌ Error cleaning up extra KPIs:', cleanupError)
          } else {
            console.log(`✅ Successfully cleaned up ${extraIds.length} extra KPIs`)
            deletedCount += extraIds.length
          }
        }
      }
    } else {
      console.log(`✅ VERIFIED: Final count matches expected!`)
    }
    
    console.log('✅ KPI update complete!', {
      updated: updatedCount,
      added: addedCount,
      deleted: deletedCount,
      expected: newCount,
      final: finalCount
    })
    
    const parts = []
    if (updatedCount > 0) parts.push(`Updated ${updatedCount} KPIs`)
    if (addedCount > 0) parts.push(`Added ${addedCount} new KPIs`)
    if (deletedCount > 0) parts.push(`Deleted ${deletedCount} extra KPIs`)
    
    // ✅ Dispatch database-updated event to refresh KPI and BOQ pages
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('database-updated', {
        detail: { tableName: TABLES.KPI }
      })
      window.dispatchEvent(event)
      console.log('🔔 Dispatched database-updated event for KPI table (after update)')
    }
    
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
        // ✅ Section and Zone are separate - Section is only for Actual KPIs entered by site engineer
        section: '', // ✅ Section is separate from Zone - leave empty for auto-created KPIs
        zone: activity.zone_ref || activity.zone_number || '', // ✅ Zone comes from activity.zone_ref or zone_number
        day: `Day ${index + 1} - ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
      }
    })
    
  } catch (error) {
    console.error('❌ Error previewing KPIs:', error)
    return []
  }
}

/**
 * Auto KPI Generator
 * Automatically creates KPI Planned records from BOQ Activities
 */

import { 
  getWorkingDays, 
  distributeOverWorkdays, 
  WorkdaysConfig 
} from './workdaysCalculator'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TABLES } from './supabase'

export interface BOQActivity {
  id: string
  project_code: string
  project_sub_code?: string
  project_full_code: string
  activity_name: string
  activity?: string
  activity_division?: string
  unit: string
  planned_units: number
  planned_activity_start_date: string | null
  deadline: string | null
  zone_ref?: string
}

export interface GeneratedKPI {
  project_full_code: string
  project_code: string
  project_sub_code?: string
  activity_name: string
  quantity: number
  'Input Type': 'Planned'
  'Target Date': string
  unit: string
  section?: string
  day: string
  activity_date: string
}

/**
 * Generate KPI Planned records from BOQ Activity
 */
export async function generateKPIsFromBOQ(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<GeneratedKPI[]> {
  console.log('🔄 Generating KPIs for activity:', activity.activity_name)
  
  // Validate required fields
  if (!activity.planned_activity_start_date || !activity.deadline) {
    console.warn('⚠️ Activity missing start date or deadline')
    return []
  }
  
  if (!activity.planned_units || activity.planned_units <= 0) {
    console.warn('⚠️ Activity has no planned units')
    return []
  }
  
  try {
    // Get working days between start and end (will exclude weekends/holidays based on config)
    const workingDays = getWorkingDays(
      activity.planned_activity_start_date,
      activity.deadline,
      config
    )
    
    if (workingDays.length === 0) {
      console.warn('⚠️ No working days found in date range')
      return []
    }
    
    console.log(`📅 Found ${workingDays.length} working days (excluding ${config?.includeWeekends ? '0' : '1'} weekend days + holidays)`)
    
    // Distribute quantity over working days ONLY
    const distribution = distributeOverWorkdays(
      activity.planned_activity_start_date,
      activity.deadline,
      activity.planned_units,
      config
    )
    
    // Create KPI records (quantities are already integers from distributeOverWorkdays)
    const kpis: GeneratedKPI[] = distribution.map((item, index) => {
      const date = item.date
      const dateStr = formatDate(date)
      const dayName = getDayName(date)
      
      return {
        project_full_code: activity.project_full_code || activity.project_code,
        project_code: activity.project_code,
        project_sub_code: activity.project_sub_code,
        activity_name: activity.activity_name,
        quantity: item.quantity, // Already an integer, no rounding needed
        'Input Type': 'Planned',
        'Target Date': dateStr,
        activity_date: dateStr,
        unit: activity.unit || 'No.',
        section: activity.zone_ref || activity.activity_division || '',
        day: `Day ${index + 1} - ${dayName}`
      }
    })
    
    console.log(`✅ Generated ${kpis.length} KPI records`)
    return kpis
    
  } catch (error) {
    console.error('❌ Error generating KPIs:', error)
    return []
  }
}

/**
 * Save generated KPIs to database
 */
export async function saveGeneratedKPIs(
  kpis: GeneratedKPI[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (kpis.length === 0) {
    console.warn('⚠️ No KPIs to save (empty array)')
    return { success: true, count: 0 }
  }
  
  try {
    const supabase = createClientComponentClient()
    
    console.log('========================================')
    console.log('💾 SAVING KPIs TO DATABASE')
    console.log('  - Total KPIs:', kpis.length)
    console.log('  - First KPI sample:', JSON.stringify(kpis[0], null, 2))
    console.log('========================================')
    
    // Convert to database format - Use UNIFIED table with all required columns
    const dbKPIs = kpis.map(kpi => ({
      'Project Full Code': kpi.project_full_code,
      'Project Code': kpi.project_code || '',
      'Project Sub Code': kpi.project_sub_code || '',
      'Activity Name': kpi.activity_name,
      'Quantity': kpi.quantity.toString(),
      'Input Type': 'Planned', // This IS a column in the unified KPI table
      'Target Date': kpi['Target Date'] || '',
      'Activity Date': kpi.activity_date || kpi['Target Date'] || '',
      'Unit': kpi.unit || '',
      'Section': kpi.section || '',
      'Day': kpi.day || '',
      'Drilled Meters': '0'
    }))
    
    console.log('📦 Database format sample:', JSON.stringify(dbKPIs[0], null, 2))
    console.log('🎯 Inserting into UNIFIED KPI table')
    
    // ✅ Insert into MAIN KPI table
    const { data, error } = await supabase
      .from(TABLES.KPI)
      .insert(dbKPIs)
      .select()
    
    if (error) {
      console.error('❌ Database error:', error)
      console.error('   Code:', error.code)
      console.error('   Message:', error.message)
      console.error('   Details:', error.details)
      return { success: false, count: 0, error: error.message }
    }
    
    console.log('✅ Successfully saved', data?.length || 0, 'KPIs')
    console.log('========================================')
    return { success: true, count: data?.length || 0 }
    
  } catch (error: any) {
    console.error('❌ Exception while saving KPIs:', error)
    return { success: false, count: 0, error: error.message }
  }
}

/**
 * Smart Update KPIs when BOQ activity is modified
 * - Updates existing KPIs if count is same
 * - Adds new KPIs if days increased
 * - Deletes extra KPIs if days decreased
 */
export async function updateKPIsFromBOQ(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<{ success: boolean; added: number; deleted: number; updated: number; error?: string }> {
  try {
    const supabase = createClientComponentClient()
    
    console.log('========================================')
    console.log('🧠 SMART KPI UPDATE for activity')
    console.log('  - Project Full Code:', activity.project_full_code || activity.project_code)
    console.log('  - Activity Name:', activity.activity_name)
    console.log('  - Planned Units:', activity.planned_units)
    console.log('========================================')
    
    // Step 1: Fetch existing KPIs (with full data, not just count)
    const { data: existingKPIs, error: fetchError } = await supabase
      .from(TABLES.KPI)
      .select('*')
      .eq('Project Full Code', activity.project_full_code || activity.project_code)
      .eq('Activity Name', activity.activity_name)
      .eq('Input Type', 'Planned')
      .order('Target Date', { ascending: true }) // Sort by date
    
    if (fetchError) {
      console.error('❌ Error fetching existing KPIs:', fetchError)
      return { success: false, added: 0, deleted: 0, updated: 0, error: fetchError.message }
    }
    
    console.log(`📊 Found ${existingKPIs?.length || 0} existing Planned KPIs`)
    
    // Step 2: Generate new KPIs based on updated activity data
    console.log('📦 Generating new KPI structure based on updated data...')
    const newKPIs = await generateKPIsFromBOQ(activity, config)
    
    if (newKPIs.length === 0) {
      console.warn('⚠️ No new KPIs generated (planned units = 0?)')
      // Delete all existing KPIs
      if (existingKPIs && existingKPIs.length > 0) {
        await supabase
          .from(TABLES.KPI)
          .delete()
          .eq('Project Full Code', activity.project_full_code || activity.project_code)
          .eq('Activity Name', activity.activity_name)
          .eq('Input Type', 'Planned')
        console.log(`🗑️ Deleted all ${existingKPIs.length} KPIs (planned units = 0)`)
        return { 
          success: true, 
          added: 0, 
          deleted: existingKPIs.length,
          updated: 0,
          error: undefined
        }
      }
      return { success: true, added: 0, deleted: 0, updated: 0, error: undefined }
    }
    
    console.log(`🆚 Comparing: ${existingKPIs?.length || 0} existing vs ${newKPIs.length} new KPIs`)
    
    const oldCount = existingKPIs?.length || 0
    const newCount = newKPIs.length
    
    let updated = 0
    let added = 0
    let deleted = 0
    
    // Step 3: Smart update based on count difference
    
    if (oldCount === 0) {
      // 🆕 No existing KPIs → Insert all new
      console.log('🆕 No existing KPIs, creating all from scratch...')
      const insertResult = await saveGeneratedKPIs(newKPIs)
      if (!insertResult.success) {
        return { success: false, added: 0, deleted: 0, updated: 0, error: insertResult.error }
      }
      added = insertResult.count
      console.log(`✅ Created ${added} new KPIs`)
      
    } else if (newCount === oldCount) {
      // ✏️ Same count → Update existing KPIs with new values
      console.log(`✏️ Same count (${oldCount}), updating existing KPIs...`)
      
      for (let i = 0; i < oldCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          .update({
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit || '',
            'Target Date': newKPI['Target Date'] || '',
            'Activity Date': newKPI.activity_date || newKPI['Target Date'] || '',
            'Project Code': newKPI.project_code || '',
            'Project Sub Code': newKPI.project_sub_code || '',
            'Section': newKPI.section || '',
            'Day': newKPI.day || ''
          })
          .eq('id', existingKPI.id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updated++
        }
      }
      console.log(`✅ Updated ${updated} KPIs`)
      
    } else if (newCount > oldCount) {
      // ➕ More days → Update existing + Add new
      console.log(`➕ Increased from ${oldCount} to ${newCount} days`)
      console.log(`  - Updating first ${oldCount} KPIs`)
      console.log(`  - Adding ${newCount - oldCount} new KPIs`)
      
      // Update existing KPIs
      for (let i = 0; i < oldCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          .update({
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit || '',
            'Target Date': newKPI['Target Date'] || '',
            'Activity Date': newKPI.activity_date || newKPI['Target Date'] || '',
            'Project Code': newKPI.project_code || '',
            'Project Sub Code': newKPI.project_sub_code || '',
            'Section': newKPI.section || '',
            'Day': newKPI.day || ''
          })
          .eq('id', existingKPI.id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updated++
        }
      }
      
      // Insert new KPIs for additional days
      const additionalKPIs = newKPIs.slice(oldCount)
      const insertResult = await saveGeneratedKPIs(additionalKPIs)
      if (!insertResult.success) {
        console.error('❌ Error adding new KPIs:', insertResult.error)
      } else {
        added = insertResult.count
      }
      
      console.log(`✅ Updated ${updated} KPIs, added ${added} new KPIs`)
      
    } else {
      // ➖ Fewer days → Update remaining + Delete extra
      console.log(`➖ Decreased from ${oldCount} to ${newCount} days`)
      console.log(`  - Updating first ${newCount} KPIs`)
      console.log(`  - Deleting ${oldCount - newCount} extra KPIs`)
      
      // Update remaining KPIs
      for (let i = 0; i < newCount; i++) {
        const existingKPI = existingKPIs[i]
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await supabase
          .from(TABLES.KPI)
          .update({
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit || '',
            'Target Date': newKPI['Target Date'] || '',
            'Activity Date': newKPI.activity_date || newKPI['Target Date'] || '',
            'Project Code': newKPI.project_code || '',
            'Project Sub Code': newKPI.project_sub_code || '',
            'Section': newKPI.section || '',
            'Day': newKPI.day || ''
          })
          .eq('id', existingKPI.id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updated++
        }
      }
      
      // Delete extra KPIs
      const extraKPIs = existingKPIs.slice(newCount)
      const idsToDelete = extraKPIs.map(kpi => kpi.id)
      
      const { error: deleteError } = await supabase
        .from(TABLES.KPI)
        .delete()
        .in('id', idsToDelete)
      
      if (deleteError) {
        console.error('❌ Error deleting extra KPIs:', deleteError)
      } else {
        deleted = idsToDelete.length
      }
      
      console.log(`✅ Updated ${updated} KPIs, deleted ${deleted} extra KPIs`)
    }
    
    console.log('========================================')
    console.log('✅ SMART KPI UPDATE COMPLETE!')
    console.log(`  - Updated: ${updated} KPIs`)
    console.log(`  - Added: ${added} new KPIs`)
    console.log(`  - Deleted: ${deleted} extra KPIs`)
    console.log('========================================')
    
    return { 
      success: true, 
      added,
      deleted,
      updated,
      error: undefined
    }
    
  } catch (error: any) {
    console.error('❌ Error in smart KPI update:', error)
    return { 
      success: false, 
      added: 0, 
      deleted: 0,
      updated: 0,
      error: error.message 
    }
  }
}

/**
 * Helper: Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Helper: Get day name
 */
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

/**
 * Preview KPIs without saving
 */
export async function previewKPIs(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<GeneratedKPI[]> {
  try {
    return await generateKPIsFromBOQ(activity, config)
  } catch (error) {
    console.error('Error previewing KPIs:', error)
    return []
  }
}

/**
 * Calculate summary statistics
 */
export function calculateKPISummary(kpis: GeneratedKPI[]): {
  totalQuantity: number
  numberOfDays: number
  averagePerDay: number
  startDate: string
  endDate: string
} {
  if (kpis.length === 0) {
    return {
      totalQuantity: 0,
      numberOfDays: 0,
      averagePerDay: 0,
      startDate: '',
      endDate: ''
    }
  }
  
  const totalQuantity = kpis.reduce((sum, kpi) => sum + kpi.quantity, 0)
  const dates = kpis.map(kpi => kpi['Target Date']).sort()
  
  return {
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    numberOfDays: kpis.length,
    averagePerDay: Math.round((totalQuantity / kpis.length) * 100) / 100,
    startDate: dates[0],
    endDate: dates[dates.length - 1]
  }
}


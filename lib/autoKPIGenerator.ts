/**
 * Fixed Auto KPI Generator
 * 
 * This version properly handles BOQ activity updates without creating duplicate KPIs
 */

import { 
  getWorkingDays, 
  distributeOverWorkdays, 
  WorkdaysConfig 
} from './workdaysCalculator'
import { getSupabaseClient } from './supabaseConnectionManager'
import { TABLES } from './supabase'

export interface BOQActivity {
  id: string
  project_code: string
  project_sub_code: string
  project_full_code: string
  activity_name: string
  planned_units: number
  deadline: string
  planned_activity_start_date: string
  calendar_duration: number
  total_drilling_meters: number
  unit: string
  activity_division: string
  zone_ref: string
  zone_number: string
  rate: number
  total_value: number
  planned_value: number
  project_full_name: string
  project_status: string
}

export interface GeneratedKPI {
  id?: string
  project_full_code: string
  project_code: string
  project_sub_code: string
  activity_name: string
  quantity: number
  unit: string
  input_type: 'Planned' | 'Actual'
  target_date: string
  activity_date: string
  section: string
  day: string
  drilled_meters: number
}

/**
 * Generate KPIs from BOQ activity
 */
export async function generateKPIsFromBOQ(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<GeneratedKPI[]> {
  try {
    console.log('🔧 Generating KPIs from BOQ activity:', activity.activity_name)
    
    const startDate = new Date(activity.planned_activity_start_date || activity.deadline)
    const endDate = new Date(activity.deadline)
    const workingDays = getWorkingDays(startDate, endDate, config)
    const totalDays = workingDays.length
    const totalUnits = activity.planned_units || 0
    
    if (totalDays <= 0 || totalUnits <= 0) {
      console.log('⚠️ No KPIs to generate - invalid days or units')
      return []
    }
    
    const dailyUnits = distributeOverWorkdays(startDate, endDate, totalUnits, config)
    const kpis: GeneratedKPI[] = []
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      kpis.push({
        project_full_code: activity.project_full_code || activity.project_code,
        project_code: activity.project_code,
        project_sub_code: activity.project_sub_code,
        activity_name: activity.activity_name,
        quantity: (dailyUnits[i] as any)?.quantity || 0,
        unit: activity.unit || '',
        input_type: 'Planned',
        target_date: currentDate.toISOString().split('T')[0],
        activity_date: currentDate.toISOString().split('T')[0],
        section: activity.activity_division || '',
        day: `Day ${i + 1}`,
        drilled_meters: activity.total_drilling_meters || 0
      })
    }
    
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
export async function saveGeneratedKPIs(
  kpis: GeneratedKPI[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    if (kpis.length === 0) {
      return { success: true, count: 0 }
    }
    
    const dbKPIs = kpis.map(kpi => ({
      'Project Full Code': kpi.project_full_code,
      'Project Code': kpi.project_code,
      'Project Sub Code': kpi.project_sub_code,
      'Activity Name': kpi.activity_name,
      'Quantity': kpi.quantity.toString(),
      'Unit': kpi.unit,
      'Input Type': kpi.input_type,
      'Target Date': kpi.target_date,
      'Activity Date': kpi.activity_date,
      'Section': kpi.section,
      'Day': kpi.day,
      'Drilled Meters': kpi.drilled_meters.toString()
    }))
    
    const { data, error } = await (supabase
      .from(TABLES.KPI) as any)
      .insert(dbKPIs)
      .select()
    
    if (error) {
      console.error('❌ Error saving KPIs:', error)
      return { success: false, count: 0, error: error.message }
    }
    
    console.log(`✅ Saved ${data?.length || 0} KPIs to database`)
    return { success: true, count: data?.length || 0 }
  } catch (error: any) {
    console.error('❌ Exception saving KPIs:', error)
    return { success: false, count: 0, error: error.message }
  }
}

/**
 * ✅ FIXED: Smart Update KPIs when BOQ activity is modified
 * - Finds existing KPIs by OLD activity name
 * - Updates them with NEW activity name and data
 * - No duplicate KPIs created
 */
export async function updateKPIsFromBOQ(
  activity: BOQActivity,
  config?: WorkdaysConfig,
  oldActivityName?: string // ✅ NEW: Pass old activity name for proper KPI matching
): Promise<{ success: boolean; added: number; deleted: number; updated: number; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    console.log('========================================')
    console.log('🧠 FIXED SMART KPI UPDATE for activity')
    console.log('  - Project Full Code:', activity.project_full_code || activity.project_code)
    console.log('  - Activity Name (NEW):', activity.activity_name)
    console.log('  - Activity Name (OLD):', oldActivityName || 'N/A')
    console.log('  - Planned Units:', activity.planned_units)
    console.log('========================================')
    
    // ✅ Step 1: Find existing KPIs using OLD activity name (if provided)
    const searchActivityName = oldActivityName || activity.activity_name
    console.log('🔍 Searching for existing KPIs with activity name:', searchActivityName)
    
    const { data: existingKPIs, error: fetchError } = await supabase
      .from(TABLES.KPI)
      .select('*')
      .eq('Project Full Code', activity.project_full_code || activity.project_code)
      .eq('Activity Name', searchActivityName) // ✅ Use old name to find existing KPIs
      .eq('Input Type', 'Planned')
      .order('Target Date', { ascending: true })
    
    if (fetchError) {
      console.error('❌ Error fetching existing KPIs:', fetchError)
      return { success: false, added: 0, deleted: 0, updated: 0, error: fetchError.message }
    }
    
    console.log(`📊 Found ${existingKPIs?.length || 0} existing Planned KPIs`)
    
    // ✅ Step 2: Generate new KPIs based on updated activity data
    console.log('📦 Generating new KPI structure based on updated data...')
    const newKPIs = await generateKPIsFromBOQ(activity, config)
    
    if (newKPIs.length === 0) {
      console.warn('⚠️ No KPIs to generate - activity has no planned units or duration')
      return { success: true, added: 0, deleted: 0, updated: 0 }
    }
    
    const oldCount = existingKPIs?.length || 0
    const newCount = newKPIs.length
    
    console.log(`📊 KPI Count Comparison: Old=${oldCount}, New=${newCount}`)
    
    let added = 0
    let updated = 0
    let deleted = 0
    
    // ✅ Step 3: Smart update based on count difference
    
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
      // ✏️ Same count → Update existing KPIs with new values AND new activity name
      console.log(`✏️ Same count (${oldCount}), updating existing KPIs with new data...`)
      
      for (let i = 0; i < oldCount; i++) {
        const existingKPI = existingKPIs[i] as any
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await (supabase
          .from(TABLES.KPI) as any)
          .update({
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit || '',
            'Target Date': newKPI.target_date || '',
            'Activity Date': newKPI.activity_date || newKPI.target_date || '',
            'Activity Name': activity.activity_name, // ✅ Update to NEW activity name
            'Project Code': newKPI.project_code || '',
            'Project Sub Code': newKPI.project_sub_code || '',
            'Section': newKPI.section || '',
            'Day': newKPI.day || '',
            'Drilled Meters': newKPI.drilled_meters.toString()
          })
          .eq('id', existingKPI.id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updated++
        }
      }
      console.log(`✅ Updated ${updated} KPIs with new activity name and data`)
      
    } else if (newCount > oldCount) {
      // ➕ More days → Update existing + Add new
      console.log(`➕ Increased from ${oldCount} to ${newCount} days`)
      
      // Update existing KPIs
      for (let i = 0; i < oldCount; i++) {
        const existingKPI = existingKPIs[i] as any
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await (supabase
          .from(TABLES.KPI) as any)
          .update({
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit || '',
            'Target Date': newKPI.target_date || '',
            'Activity Date': newKPI.activity_date || newKPI.target_date || '',
            'Activity Name': activity.activity_name, // ✅ Update to NEW activity name
            'Project Code': newKPI.project_code || '',
            'Project Sub Code': newKPI.project_sub_code || '',
            'Section': newKPI.section || '',
            'Day': newKPI.day || '',
            'Drilled Meters': newKPI.drilled_meters.toString()
          })
          .eq('id', existingKPI.id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updated++
        }
      }
      
      // Add new KPIs
      const newKPIsToAdd = newKPIs.slice(oldCount)
      const insertResult = await saveGeneratedKPIs(newKPIsToAdd)
      if (insertResult.success) {
        added = insertResult.count
      }
      
      console.log(`✅ Updated ${updated} existing KPIs, added ${added} new KPIs`)
      
    } else {
      // ➖ Fewer days → Update existing + Delete extra
      console.log(`➖ Decreased from ${oldCount} to ${newCount} days`)
      
      // Update existing KPIs
      for (let i = 0; i < newCount; i++) {
        const existingKPI = existingKPIs[i] as any
        const newKPI = newKPIs[i]
        
        const { error: updateError } = await (supabase
          .from(TABLES.KPI) as any)
          .update({
            'Quantity': newKPI.quantity.toString(),
            'Unit': newKPI.unit || '',
            'Target Date': newKPI.target_date || '',
            'Activity Date': newKPI.activity_date || newKPI.target_date || '',
            'Activity Name': activity.activity_name, // ✅ Update to NEW activity name
            'Project Code': newKPI.project_code || '',
            'Project Sub Code': newKPI.project_sub_code || '',
            'Section': newKPI.section || '',
            'Day': newKPI.day || '',
            'Drilled Meters': newKPI.drilled_meters.toString()
          })
          .eq('id', existingKPI.id)
        
        if (updateError) {
          console.error(`❌ Error updating KPI ${i + 1}:`, updateError)
        } else {
          updated++
        }
      }
      
      // Delete extra KPIs
      const kpisToDelete = existingKPIs.slice(newCount)
      for (const kpiToDelete of kpisToDelete) {
        const { error: deleteError } = await (supabase
          .from(TABLES.KPI) as any)
          .delete()
          .eq('id', (kpiToDelete as any).id)
        
        if (deleteError) {
          console.error(`❌ Error deleting KPI:`, deleteError)
        } else {
          deleted++
        }
      }
      
      console.log(`✅ Updated ${updated} existing KPIs, deleted ${deleted} extra KPIs`)
    }
    
    console.log('========================================')
    console.log('🎉 SMART KPI UPDATE COMPLETED')
    console.log(`  - Updated: ${updated}`)
    console.log(`  - Added: ${added}`)
    console.log(`  - Deleted: ${deleted}`)
    console.log('========================================')
    
    return { success: true, added, deleted, updated }
  } catch (error: any) {
    console.error('❌ Exception in smart KPI update:', error)
    return { success: false, added: 0, deleted: 0, updated: 0, error: error.message }
  }
}

/**
 * Preview KPIs before generation
 */
export async function previewKPIs(
  activity: BOQActivity,
  config?: WorkdaysConfig
): Promise<GeneratedKPI[]> {
  try {
    console.log('👀 Previewing KPIs for activity:', activity.activity_name)
    const kpis = await generateKPIsFromBOQ(activity, config)
    console.log(`📋 Preview: ${kpis.length} KPIs would be generated`)
    return kpis
  } catch (error) {
    console.error('❌ Error previewing KPIs:', error)
    return []
  }
}

/**
 * Calculate KPI summary for preview
 */
export function calculateKPISummary(kpis: GeneratedKPI[]) {
  if (kpis.length === 0) {
    return {
      totalKPIs: 0,
      totalQuantity: 0,
      dateRange: 'No KPIs',
      averageDaily: 0
    }
  }
  
  const totalQuantity = kpis.reduce((sum, kpi) => sum + kpi.quantity, 0)
  const dates = kpis.map(kpi => new Date(kpi.target_date)).sort((a, b) => a.getTime() - b.getTime())
  const startDate = dates[0].toLocaleDateString()
  const endDate = dates[dates.length - 1].toLocaleDateString()
  const averageDaily = totalQuantity / kpis.length
  
  return {
    totalKPIs: kpis.length,
    totalQuantity,
    dateRange: `${startDate} - ${endDate}`,
    averageDaily: Math.round(averageDaily * 100) / 100
  }
}

export default {
  generateKPIsFromBOQ,
  saveGeneratedKPIs,
  updateKPIsFromBOQ,
  previewKPIs,
  calculateKPISummary
}

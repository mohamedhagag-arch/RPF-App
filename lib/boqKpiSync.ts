/**
 * BOQ-KPI Real-time Synchronization
 * 
 * Keeps BOQ and KPI data in sync automatically
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TABLES } from './supabase'
import { mapBOQFromDB, mapKPIFromDB } from './dataMappers'
import { kpiCache, generateKPICacheKey } from './kpiCache'

/**
 * Sync BOQ Planned Units and Actual Units from KPI records
 * 
 * When KPI Planned/Actual is updated, BOQ should reflect the sum
 * ✅ FIX: Now updates BOTH Planned Units and Actual Units
 */
export async function syncBOQFromKPI(
  projectCode: string,
  activityName: string
): Promise<{ success: boolean; message: string; updatedBOQActual: number; updatedBOQPlanned: number }> {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🔄 Starting BOQ-KPI Sync...')
    console.log('Project:', projectCode)
    console.log('Activity:', activityName)
    
    // ✅ FIX: Get BOTH Planned and Actual KPIs
    const [plannedResult, actualResult] = await Promise.all([
      supabase
        .from(TABLES.KPI)
        .select('*')
        .eq('Input Type', 'Planned')
        .eq('Project Full Code', projectCode)
        .eq('Activity Description', activityName),
      supabase
        .from(TABLES.KPI)
      .select('*')
      .eq('Input Type', 'Actual')
      .eq('Project Full Code', projectCode)
      .eq('Activity Description', activityName)
    ])
    
    if (plannedResult.error) throw plannedResult.error
    if (actualResult.error) throw actualResult.error
    
    const kpiPlannedRecords = plannedResult.data || []
    const kpiActualRecords = actualResult.data || []
    
    console.log('📊 Found KPI Planned records:', kpiPlannedRecords.length)
    console.log('📊 Found KPI Actual records:', kpiActualRecords.length)
    
    // ✅ FIX: Sum all KPI Planned quantities
    const totalPlanned = kpiPlannedRecords.reduce((sum, record) => {
      const qty = parseFloat(record['Quantity'] || '0')
      return sum + qty
    }, 0)
    
    // ✅ Sum all KPI Actual quantities
    const totalActual = kpiActualRecords.reduce((sum, record) => {
      const qty = parseFloat(record['Quantity'] || '0')
      return sum + qty
    }, 0)
    
    console.log('📈 Total KPI Planned:', totalPlanned)
    console.log('📈 Total KPI Actual:', totalActual)
    
    // Find matching BOQ activity
    // ✅ FIX: Try both Project Code and Project Full Code for matching
    let { data: boqActivities, error: boqFindError } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('Activity Description', activityName)
      .or(`Project Code.eq.${projectCode},Project Full Code.eq.${projectCode}`)
    
    if (boqFindError) throw boqFindError
    
    if (!boqActivities || boqActivities.length === 0) {
      console.log('⚠️ No matching BOQ activity found')
      console.log('🔍 This means the BOQ activity was already deleted or never existed')
      return {
        success: false,
        message: 'No matching BOQ activity found - activity may have been deleted',
        updatedBOQActual: 0,
        updatedBOQPlanned: 0
      }
    }
    
    const boqActivity = boqActivities[0]
    console.log('🎯 Found BOQ Activity:', boqActivity.id)
    
    // ✅ FIX: Update BOTH Planned Units and Actual Units
    console.log('🔄 Updating BOQ Activity:')
    console.log('  - Planned Units:', totalPlanned)
    console.log('  - Actual Units:', totalActual)
    console.log('⚠️ IMPORTANT: This will NOT delete the BOQ activity, only update Units')
    
    const { data: updatedBOQ, error: updateError } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .update({
        'Planned Units': totalPlanned.toString(),
        'Actual Units': totalActual.toString()
      })
      .eq('id', boqActivity.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Failed to update BOQ Activity:', updateError)
      throw updateError
    }
    
    console.log('✅ BOQ Activity updated successfully:', updatedBOQ.id)
    console.log('🔍 BOQ Activity still exists with ID:', updatedBOQ.id)
    console.log('📊 BOQ Activity Name:', updatedBOQ['Activity Name'])
    console.log('📊 BOQ Project Code:', updatedBOQ['Project Code'])
    console.log('📊 New BOQ Planned Units:', totalPlanned)
    console.log('📊 New BOQ Actual Units:', totalActual)
    console.log('⚠️ IMPORTANT: BOQ Activity should still be visible in the activities list')
    
    return {
      success: true,
      message: `BOQ updated: Planned = ${totalPlanned}, Actual = ${totalActual} - Activity preserved`,
      updatedBOQActual: totalActual,
      updatedBOQPlanned: totalPlanned
    }
    
  } catch (error: any) {
    console.error('❌ Sync Error:', error)
    return {
      success: false,
      message: error.message,
      updatedBOQActual: 0,
      updatedBOQPlanned: 0
    }
  }
}

/**
 * Get BOQ context for KPI
 * 
 * Shows KPI record in context of its BOQ activity
 */
export async function getKPIContext(
  projectCode: string,
  activityName: string
): Promise<{
  boq: any | null
  kpiPlanned: any[]
  kpiActual: any[]
  summary: {
    boqPlanned: number
    boqActual: number
    kpiPlannedTotal: number
    kpiActualTotal: number
    progress: number
    variance: number
  }
}> {
  const supabase = createClientComponentClient()
  
  try {
    // Get BOQ
    const { data: boqData } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('Project Code', projectCode)
      .eq('Activity Description', activityName)
      .single()
    
    // Get KPI records from both tables
    const [plannedResult, actualResult] = await Promise.all([
      supabase
        .from(TABLES.KPI) // ✅ From main KPI table
        .select('*')
        .eq('Input Type', 'Planned')
        .eq('Project Full Code', projectCode)
        .eq('Activity Description', activityName),
      supabase
        .from(TABLES.KPI) // ✅ From main KPI table
        .select('*')
        .eq('Input Type', 'Actual')
        .eq('Project Full Code', projectCode)
        .eq('Activity Description', activityName)
    ])
    
    const kpiPlanned = (plannedResult.data || []).map(mapKPIFromDB)
    const kpiActual = (actualResult.data || []).map(mapKPIFromDB)
    
    const boq = boqData ? mapBOQFromDB(boqData) : null
    
    const boqPlanned = boq?.planned_units || 0
    const boqActual = boq?.actual_units || 0
    const kpiPlannedTotal = kpiPlanned.reduce((sum, k) => sum + (k.quantity || 0), 0)
    const kpiActualTotal = kpiActual.reduce((sum, k) => sum + (k.quantity || 0), 0)
    const progress = boqPlanned > 0 ? (boqActual / boqPlanned) * 100 : 0
    const variance = boqActual - boqPlanned
    
    return {
      boq,
      kpiPlanned,
      kpiActual,
      summary: {
        boqPlanned,
        boqActual,
        kpiPlannedTotal,
        kpiActualTotal,
        progress,
        variance
      }
    }
  } catch (error) {
    console.error('Error getting KPI context:', error)
    return {
      boq: null,
      kpiPlanned: [],
      kpiActual: [],
      summary: {
        boqPlanned: 0,
        boqActual: 0,
        kpiPlannedTotal: 0,
        kpiActualTotal: 0,
        progress: 0,
        variance: 0
      }
    }
  }
}

/**
 * Calculate Actual Units from KPI Actual records
 * 
 * This function calculates the total actual units from KPI Actual records
 * for a specific project and activity
 */
export async function calculateActualFromKPI(
  projectCode: string,
  activityName: string
): Promise<number> {
  // Check cache first
  const cacheKey = generateKPICacheKey(projectCode, activityName)
  const cached = kpiCache.get<number>(cacheKey)
  if (cached !== null) {
    return cached
  }
  
  const supabase = createClientComponentClient()
  
  try {
    // Get all KPI Actual records for this activity
    // Try exact match first
    let { data: kpiActual, error } = await supabase
      .from(TABLES.KPI)
      .select('Quantity, "Activity Description"')
      .eq('Input Type', 'Actual')
      .eq('Project Full Code', projectCode)
      .eq('Activity Description', activityName)
    
    // If no exact match, try flexible match
    if (!kpiActual || kpiActual.length === 0) {
      const { data: allProjectKPIs } = await supabase
        .from(TABLES.KPI)
        .select('Quantity, "Activity Description"')
        .eq('Input Type', 'Actual')
        .eq('Project Full Code', projectCode)
      
      if (allProjectKPIs && allProjectKPIs.length > 0) {
        const activityNameLower = (activityName || '').toLowerCase().trim()
        kpiActual = allProjectKPIs.filter(kpi => {
          const kpiActivityName = ((kpi as any)['Activity Description'] as string || (kpi as any)['Activity Name'] as string || '').toLowerCase().trim()
          return kpiActivityName.includes(activityNameLower) || 
                 activityNameLower.includes(kpiActivityName)
        })
      }
    }
    
    if (error) {
      return 0
    }
    
    // Sum all actual quantities
    const totalActual = (kpiActual || []).reduce((sum, record) => {
      const qty = parseFloat(record.Quantity?.toString() || '0') || 0
      return sum + qty
    }, 0)
    
    // Cache the result
    kpiCache.set(cacheKey, totalActual)
    
    return totalActual
  } catch (error: any) {
    return 0
  }
}

/**
 * ✅ FIX: Calculate Planned Units from KPI Planned records
 * 
 * This function calculates the total planned units from KPI Planned records
 * for a specific project and activity
 */
export async function calculatePlannedFromKPI(
  projectCode: string,
  activityName: string
): Promise<number> {
  const supabase = createClientComponentClient()
  
  try {
    // Get all KPI Planned records for this activity
    // Try exact match first
    let { data: kpiPlanned, error } = await supabase
      .from(TABLES.KPI)
      .select('Quantity, "Activity Description"')
      .eq('Input Type', 'Planned')
      .eq('Project Full Code', projectCode)
      .eq('Activity Description', activityName)
    
    // If no exact match, try flexible match
    if (!kpiPlanned || kpiPlanned.length === 0) {
      const { data: allProjectKPIs } = await supabase
        .from(TABLES.KPI)
        .select('Quantity, "Activity Description"')
        .eq('Input Type', 'Planned')
        .eq('Project Full Code', projectCode)
      
      if (allProjectKPIs && allProjectKPIs.length > 0) {
        const activityNameLower = (activityName || '').toLowerCase().trim()
        kpiPlanned = allProjectKPIs.filter(kpi => {
          const kpiActivityName = ((kpi as any)['Activity Description'] as string || (kpi as any)['Activity Name'] as string || '').toLowerCase().trim()
          return kpiActivityName.includes(activityNameLower) || 
                 activityNameLower.includes(kpiActivityName)
        })
      }
    }
    
    if (error) {
      return 0
    }
    
    // Sum all planned quantities
    const totalPlanned = (kpiPlanned || []).reduce((sum, record) => {
      const qty = parseFloat(record.Quantity?.toString() || '0') || 0
      return sum + qty
    }, 0)
    
    return totalPlanned
  } catch (error: any) {
    return 0
  }
}

/**
 * Validate KPI against BOQ limits
 */
export async function validateKPIQuantity(
  projectCode: string,
  activityName: string,
  newKPIQuantity: number,
  isActual: boolean = true
): Promise<{ valid: boolean; message: string; details: any }> {
  if (!isActual) {
    // Planned KPI can be any value
    return { valid: true, message: 'OK', details: {} }
  }
  
  const supabase = createClientComponentClient()
  
  try {
    // Get BOQ limits
    const { data: boqData } = await supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('Project Code', projectCode)
      .eq('Activity Description', activityName)
      .single()
    
    if (!boqData) {
      return {
        valid: false,
        message: 'No BOQ activity found',
        details: {}
      }
    }
    
    const boq = mapBOQFromDB(boqData)
    const boqPlanned = boq.planned_units || 0
    const boqActual = boq.actual_units || 0
    
    // Get existing KPI Actual total from main KPI table
    const { data: kpiData } = await supabase
      .from(TABLES.KPI) // ✅ From main KPI table
      .select('*')
      .eq('Input Type', 'Actual')
      .eq('Project Full Code', projectCode)
      .eq('Activity Description', activityName)
    
    const currentKPITotal = (kpiData || []).reduce((sum, record) => {
      return sum + parseFloat(record['Quantity'] || '0')
    }, 0)
    
    const newTotal = currentKPITotal + newKPIQuantity
    
    // Check if new total exceeds BOQ planned
    if (newTotal > boqPlanned) {
      return {
        valid: false,
        message: `Total KPI Actual (${newTotal.toFixed(2)}) would exceed BOQ Planned (${boqPlanned.toFixed(2)})`,
        details: {
          boqPlanned,
          currentKPITotal,
          newKPIQuantity,
          newTotal,
          exceeded: newTotal - boqPlanned
        }
      }
    }
    
    return {
      valid: true,
      message: 'Valid',
      details: {
        boqPlanned,
        currentKPITotal,
        newKPIQuantity,
        newTotal,
        remaining: boqPlanned - newTotal
      }
    }
  } catch (error: any) {
    return {
      valid: false,
      message: error.message,
      details: {}
    }
  }
}


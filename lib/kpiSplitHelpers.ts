/**
 * KPI Split System Helpers
 * Helper functions for working with split KPI tables
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TABLES_SPLIT_KPI, KPIPlanned, KPIActual, KPICombined } from './supabase-kpi-split'

/**
 * Fetch both planned and actual KPIs and combine them
 */
export async function fetchCombinedKPIs(
  projectCode?: string,
  activityName?: string
): Promise<KPICombined[]> {
  const supabase = createClientComponentClient()
  
  try {
    // Build queries
    let plannedQuery = supabase.from(TABLES_SPLIT_KPI.KPI_PLANNED).select('*')
    let actualQuery = supabase.from(TABLES_SPLIT_KPI.KPI_ACTUAL).select('*')
    
    // Filter by project if provided
    if (projectCode) {
      plannedQuery = plannedQuery.eq('Project Full Code', projectCode)
      actualQuery = actualQuery.eq('Project Full Code', projectCode)
    }
    
    // Filter by activity if provided
    if (activityName) {
      plannedQuery = plannedQuery.eq('Activity Description', activityName)
      actualQuery = actualQuery.eq('Activity Description', activityName)
    }
    
    // Fetch both in parallel
    const [plannedResult, actualResult] = await Promise.all([
      plannedQuery,
      actualQuery
    ])
    
    if (plannedResult.error) throw plannedResult.error
    if (actualResult.error) throw actualResult.error
    
    // Map to internal format
    const plannedKPIs = (plannedResult.data || []).map(mapKPIPlannedFromDB)
    const actualKPIs = (actualResult.data || []).map(mapKPIActualFromDB)
    
    // Combine by project + activity
    const combined = combineKPIs(plannedKPIs, actualKPIs)
    
    return combined
  } catch (error) {
    console.error('Error fetching combined KPIs:', error)
    throw error
  }
}

/**
 * Map Planned KPI from database
 */
export function mapKPIPlannedFromDB(row: any): KPIPlanned {
  const parseNum = (val: any) => {
    if (!val) return 0
    if (typeof val === 'number') return val
    return parseFloat(String(val).replace(/,/g, ''))
  }
  
  return {
    id: row.id,
    project_full_code: row['Project Full Code'] || '',
    project_code: row['Project Code'] || '',
    project_sub_code: row['Project Sub Code'] || '',
    activity_description: row['Activity Description'] || row['Activity Name'] || '',
    activity_name: row['Activity Description'] || row['Activity Name'] || '', // Backward compatibility
    activity: row['Activity'] || '',
    quantity: parseNum(row['Quantity']),
    section: row['Section'] || '',
    drilled_meters: parseNum(row['Drilled Meters']),
    unit: row['Unit'] || '',
    target_date: row['Target Date'] || '',
    notes: row['Notes'] || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  }
}

/**
 * Map Actual KPI from database
 */
export function mapKPIActualFromDB(row: any): KPIActual {
  const parseNum = (val: any) => {
    if (!val) return 0
    if (typeof val === 'number') return val
    return parseFloat(String(val).replace(/,/g, ''))
  }
  
  return {
    id: row.id,
    project_full_code: row['Project Full Code'] || '',
    project_code: row['Project Code'] || '',
    project_sub_code: row['Project Sub Code'] || '',
    activity_description: row['Activity Description'] || row['Activity Name'] || '',
    activity_name: row['Activity Description'] || row['Activity Name'] || '', // Backward compatibility
    activity: row['Activity'] || '',
    quantity: parseNum(row['Quantity']),
    section: row['Section'] || '',
    drilled_meters: parseNum(row['Drilled Meters']),
    unit: row['Unit'] || '',
    actual_date: row['Actual Date'] || row.created_at || '',
    recorded_by: row['Recorded By'] || '',
    notes: row['Notes'] || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  }
}

/**
 * Map to database format for Planned KPI
 */
export function mapKPIPlannedToDB(kpi: Partial<KPIPlanned>): any {
  return {
    'Project Full Code': kpi.project_full_code,
    'Project Code': kpi.project_code,
    'Project Sub Code': kpi.project_sub_code,
    'Activity Description': kpi.activity_description || kpi.activity_name || '',
    'Activity': kpi.activity,
    'Quantity': kpi.quantity?.toString(),
    'Section': kpi.section,
    'Drilled Meters': kpi.drilled_meters?.toString(),
    'Unit': kpi.unit,
    'Target Date': kpi.target_date,
    'Notes': kpi.notes
  }
}

/**
 * Map to database format for Actual KPI
 */
export function mapKPIActualToDB(kpi: Partial<KPIActual>): any {
  return {
    'Project Full Code': kpi.project_full_code,
    'Project Code': kpi.project_code,
    'Project Sub Code': kpi.project_sub_code,
    'Activity Description': kpi.activity_description || kpi.activity_name || '',
    'Activity': kpi.activity,
    'Quantity': kpi.quantity?.toString(),
    'Section': kpi.section,
    'Drilled Meters': kpi.drilled_meters?.toString(),
    'Unit': kpi.unit,
    'Actual Date': kpi.actual_date,
    'Recorded By': kpi.recorded_by,
    'Notes': kpi.notes
  }
}

/**
 * Combine Planned and Actual KPIs into analytics format
 */
export function combineKPIs(
  planned: KPIPlanned[],
  actual: KPIActual[]
): KPICombined[] {
  const combined = new Map<string, KPICombined>()
  
  // Group by project + activity
  planned.forEach(p => {
    const activityName = p.activity_description || p.activity_name || ''
    const key = `${p.project_full_code}-${activityName}`
    if (!combined.has(key)) {
      combined.set(key, {
        id: p.id,
        project_full_code: p.project_full_code,
        activity_name: activityName,
        planned_quantity: p.quantity,
        actual_quantity: 0,
        progress_percentage: 0,
        variance: 0,
        variance_percentage: 0,
        status: 'delayed',
        planned_drilled_meters: p.drilled_meters,
        actual_drilled_meters: 0,
        section: p.section
      })
    } else {
      const existing = combined.get(key)!
      existing.planned_quantity += p.quantity
      existing.planned_drilled_meters += p.drilled_meters
    }
  })
  
  // Add actual values
  actual.forEach(a => {
    const activityName = a.activity_description || a.activity_name || ''
    const key = `${a.project_full_code}-${activityName}`
    if (combined.has(key)) {
      const existing = combined.get(key)!
      existing.actual_quantity += a.quantity
      existing.actual_drilled_meters += a.drilled_meters
    } else {
      // Actual without planned (unusual but possible)
      combined.set(key, {
        id: a.id,
        project_full_code: a.project_full_code,
        activity_name: activityName,
        planned_quantity: 0,
        actual_quantity: a.quantity,
        progress_percentage: 100, // If no planned, assume complete
        variance: a.quantity,
        variance_percentage: 0,
        status: 'completed',
        planned_drilled_meters: 0,
        actual_drilled_meters: a.drilled_meters,
        section: a.section
      })
    }
  })
  
  // Calculate progress and status for each
  const result: KPICombined[] = []
  combined.forEach(kpi => {
    if (kpi.planned_quantity > 0) {
      kpi.progress_percentage = (kpi.actual_quantity / kpi.planned_quantity) * 100
      kpi.variance = kpi.actual_quantity - kpi.planned_quantity
      kpi.variance_percentage = (kpi.variance / kpi.planned_quantity) * 100
      
      // Determine status
      if (kpi.progress_percentage >= 100) {
        kpi.status = 'completed'
      } else if (kpi.progress_percentage >= 80) {
        kpi.status = 'on_track'
      } else if (kpi.progress_percentage >= 50) {
        kpi.status = 'at_risk'
      } else {
        kpi.status = 'delayed'
      }
    }
    
    result.push(kpi)
  })
  
  return result
}

/**
 * Get KPI summary for a project
 */
export async function getProjectKPISummary(projectCode: string): Promise<{
  totalPlanned: number
  totalActual: number
  progress: number
  completedActivities: number
  onTrackActivities: number
  atRiskActivities: number
  delayedActivities: number
}> {
  const combined = await fetchCombinedKPIs(projectCode)
  
  const totalPlanned = combined.reduce((sum, k) => sum + k.planned_quantity, 0)
  const totalActual = combined.reduce((sum, k) => sum + k.actual_quantity, 0)
  const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
  
  const completedActivities = combined.filter(k => k.status === 'completed').length
  const onTrackActivities = combined.filter(k => k.status === 'on_track').length
  const atRiskActivities = combined.filter(k => k.status === 'at_risk').length
  const delayedActivities = combined.filter(k => k.status === 'delayed').length
  
  return {
    totalPlanned,
    totalActual,
    progress,
    completedActivities,
    onTrackActivities,
    atRiskActivities,
    delayedActivities
  }
}

/**
 * Get KPI summary for an activity
 */
export async function getActivityKPISummary(
  projectCode: string,
  activityName: string
): Promise<{
  planned: number
  actual: number
  progress: number
  status: 'completed' | 'on_track' | 'at_risk' | 'delayed'
}> {
  const combined = await fetchCombinedKPIs(projectCode, activityName)
  
  if (combined.length === 0) {
    return {
      planned: 0,
      actual: 0,
      progress: 0,
      status: 'delayed'
    }
  }
  
  const kpi = combined[0]
  
  return {
    planned: kpi.planned_quantity,
    actual: kpi.actual_quantity,
    progress: kpi.progress_percentage,
    status: kpi.status
  }
}

/**
 * Create new Planned KPI
 */
export async function createPlannedKPI(kpi: Partial<KPIPlanned>): Promise<KPIPlanned> {
  const supabase = createClientComponentClient()
  const dbData = mapKPIPlannedToDB(kpi)
  
  const { data, error } = await supabase
    .from(TABLES_SPLIT_KPI.KPI_PLANNED)
    .insert([dbData])
    .select()
    .single()
  
  if (error) throw error
  return mapKPIPlannedFromDB(data)
}

/**
 * Create new Actual KPI
 */
export async function createActualKPI(kpi: Partial<KPIActual>): Promise<KPIActual> {
  const supabase = createClientComponentClient()
  const dbData = mapKPIActualToDB(kpi)
  
  const { data, error } = await supabase
    .from(TABLES_SPLIT_KPI.KPI_ACTUAL)
    .insert([dbData])
    .select()
    .single()
  
  if (error) throw error
  return mapKPIActualFromDB(data)
}


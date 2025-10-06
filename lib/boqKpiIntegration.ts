/**
 * BOQ & KPI Integration
 * 
 * This module handles the relationship between BOQ activities and KPI records.
 * 
 * Relationship:
 * - BOQ contains base activities with total quantities
 * - KPI breaks down BOQ quantities into daily planned/actual targets
 * - KPI Planned values are derived from BOQ by dividing by productivity/duration
 */

import { BOQActivity } from '@/lib/supabase'

/**
 * Calculate daily KPI targets from BOQ activity
 * 
 * Logic:
 * 1. Get BOQ planned_units
 * 2. Get duration (calendar_duration in days)
 * 3. Daily target = planned_units / duration
 */
export function calculateDailyKPIFromBOQ(activity: BOQActivity, days: number = 1): number {
  if (!activity.planned_units || days <= 0) return 0
  
  // If calendar_duration is available, use it
  const duration = activity.calendar_duration || days
  
  return activity.planned_units / duration
}

/**
 * Generate KPI records from BOQ activity
 * 
 * Creates daily breakdown of BOQ quantities
 */
export interface KPIFromBOQParams {
  activity: BOQActivity
  days: number // Number of days to split the work
  startDate?: string // Optional start date
}

export function generateKPIFromBOQ(params: KPIFromBOQParams) {
  const { activity, days, startDate } = params
  
  const dailyPlanned = calculateDailyKPIFromBOQ(activity, days)
  
  return {
    project_full_code: activity.project_code,
    activity_name: activity.activity_name,
    section: activity.zone_ref || '',
    quantity: dailyPlanned,
    input_type: 'Planned',
    drilled_meters: 0,
    // Metadata
    source: 'BOQ',
    source_activity_id: activity.id,
    days_count: days,
    total_planned: activity.planned_units
  }
}

/**
 * Calculate total KPI progress vs BOQ
 * 
 * Compares total KPI actual to BOQ planned
 */
export interface BOQKPIComparison {
  boq_planned: number
  kpi_total_planned: number
  kpi_total_actual: number
  variance: number
  progress_percentage: number
  status: 'on_track' | 'ahead' | 'behind'
}

export function compareBOQWithKPI(
  boqActivity: BOQActivity,
  kpiRecords: Array<{ quantity: number; input_type: string }>
): BOQKPIComparison {
  const boq_planned = boqActivity.planned_units || 0
  
  const kpi_planned = kpiRecords
    .filter(k => k.input_type === 'Planned')
    .reduce((sum, k) => sum + k.quantity, 0)
  
  const kpi_actual = kpiRecords
    .filter(k => k.input_type === 'Actual')
    .reduce((sum, k) => sum + k.quantity, 0)
  
  const variance = kpi_actual - boq_planned
  const progress = boq_planned > 0 ? (kpi_actual / boq_planned) * 100 : 0
  
  let status: 'on_track' | 'ahead' | 'behind'
  if (progress >= 100) status = 'ahead'
  else if (progress >= 80) status = 'on_track'
  else status = 'behind'
  
  return {
    boq_planned,
    kpi_total_planned: kpi_planned,
    kpi_total_actual: kpi_actual,
    variance,
    progress_percentage: progress,
    status
  }
}

/**
 * Validate KPI against BOQ
 * 
 * Ensures KPI totals don't exceed BOQ limits
 */
export function validateKPIAgainstBOQ(
  boqActivity: BOQActivity,
  kpiQuantity: number,
  existingKPITotal: number = 0
): { valid: boolean; message: string } {
  const boqLimit = boqActivity.planned_units || 0
  const newTotal = existingKPITotal + kpiQuantity
  
  if (newTotal > boqLimit) {
    return {
      valid: false,
      message: `Total KPI (${newTotal}) exceeds BOQ planned (${boqLimit})`
    }
  }
  
  return {
    valid: true,
    message: 'Valid'
  }
}


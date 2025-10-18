/**
 * BOQ Value Calculator
 * 
 * Calculates activity values based on the correct business logic:
 * - Rate = Total Value / Total Units
 * - Value = Rate × Actual Units (قيمة النشاط المنجز)
 * - Progress = (Actual Units / Planned Units) × 100
 * - Project Progress = (Total Earned Value / Total Project Value) × 100
 */

export interface BOQValueCalculation {
  rate: number
  value: number
  progress: number
  totalValue: number
  plannedValue: number
  earnedValue: number
  remainingValue: number
}

/**
 * Calculate BOQ activity values based on correct business logic
 */
export function calculateBOQValues(
  totalUnits: number,
  plannedUnits: number,
  actualUnits: number,
  totalValue: number
): BOQValueCalculation {
  // ✅ Rate = Total Value / Total Units
  const rate = totalUnits > 0 ? totalValue / totalUnits : 0
  
  // ✅ Value = Rate × Actual Units (قيمة ما تم تنفيذه)
  const value = rate * actualUnits
  
  // ✅ Progress = (Actual Units / Planned Units) × 100
  const progress = plannedUnits > 0 ? (actualUnits / plannedUnits) * 100 : 0
  
  // ✅ Planned Value = Rate × Planned Units
  const plannedValue = rate * plannedUnits
  
  // ✅ Earned Value = Rate × Actual Units (نفس Value)
  const earnedValue = rate * actualUnits
  
  // ✅ Remaining Value = Rate × (Total Units - Actual Units)
  const remainingValue = rate * (totalUnits - actualUnits)
  
  return {
    rate,
    value,
    progress,
    totalValue,
    plannedValue,
    earnedValue,
    remainingValue
  }
}

/**
 * Calculate rate from total value and total units
 */
export function calculateRate(totalValue: number, totalUnits: number): number {
  return totalUnits > 0 ? totalValue / totalUnits : 0
}

/**
 * Calculate value from rate and actual units
 */
export function calculateValue(rate: number, actualUnits: number): number {
  return rate * actualUnits
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(actualUnits: number, plannedUnits: number): number {
  return plannedUnits > 0 ? (actualUnits / plannedUnits) * 100 : 0
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Calculate project progress based on earned values of activities
 * 
 * Logic:
 * 1. Calculate earned value for each activity (Actual Units × Rate)
 * 2. Sum all earned values = Total Earned Value
 * 3. Sum all planned values = Total Project Value
 * 4. Progress = (Total Earned Value / Total Project Value) × 100
 */
export function calculateProjectProgressFromValues(activities: any[]): {
  totalProjectValue: number
  totalEarnedValue: number
  progress: number
  activitiesProgress: Array<{
    activityName: string
    plannedValue: number
    earnedValue: number
    progress: number
  }>
} {
  let totalProjectValue = 0
  let totalEarnedValue = 0
  const activitiesProgress: Array<{
    activityName: string
    plannedValue: number
    earnedValue: number
    progress: number
  }> = []

  for (const activity of activities) {
    // Calculate rate for this activity
    const rate = (activity.total_units || 0) > 0 
      ? (activity.total_value || 0) / (activity.total_units || 0) 
      : 0

    // Calculate planned value (Planned Units × Rate)
    const plannedValue = (activity.planned_units || 0) * rate

    // Calculate earned value (Actual Units × Rate)
    const earnedValue = (activity.actual_units || 0) * rate

    // Calculate activity progress
    const activityProgress = plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0

    totalProjectValue += plannedValue
    totalEarnedValue += earnedValue

    activitiesProgress.push({
      activityName: activity.activity_name || '',
      plannedValue,
      earnedValue,
      progress: activityProgress
    })
  }

  // Calculate overall project progress
  const progress = totalProjectValue > 0 ? (totalEarnedValue / totalProjectValue) * 100 : 0

  return {
    totalProjectValue,
    totalEarnedValue,
    progress,
    activitiesProgress
  }
}

/**
 * Calculate project progress using KPI data (more accurate)
 */
export function calculateProjectProgressFromKPI(
  activities: any[],
  kpiData: { [key: string]: { totalActual: number; totalPlanned: number } }
): {
  totalProjectValue: number
  totalEarnedValue: number
  progress: number
  activitiesProgress: Array<{
    activityName: string
    plannedValue: number
    earnedValue: number
    progress: number
  }>
} {
  let totalProjectValue = 0
  let totalEarnedValue = 0
  const activitiesProgress: Array<{
    activityName: string
    plannedValue: number
    earnedValue: number
    progress: number
  }> = []

  for (const activity of activities) {
    // Get KPI data for this activity
    const kpiKey = `${activity.project_code}-${activity.activity_name}`
    const kpiInfo = kpiData[kpiKey] || { totalActual: 0, totalPlanned: 0 }

    // Use KPI actual if available, otherwise use BOQ actual
    const actualUnits = kpiInfo.totalActual > 0 ? kpiInfo.totalActual : (activity.actual_units || 0)
    const plannedUnits = kpiInfo.totalPlanned > 0 ? kpiInfo.totalPlanned : (activity.planned_units || 0)

    // ✅ Calculate rate for this activity using correct business logic
    const rate = (activity.total_units || 0) > 0
      ? (activity.total_value || 0) / (activity.total_units || 0)
      : 0

    // ✅ Calculate planned value (Planned Units × Rate)
    const plannedValue = plannedUnits * rate

    // ✅ Calculate earned value (Actual Units × Rate)
    const earnedValue = actualUnits * rate

    // ✅ Calculate activity progress
    const activityProgress = plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0

    totalProjectValue += plannedValue
    totalEarnedValue += earnedValue

    activitiesProgress.push({
      activityName: activity.activity_name || '',
      plannedValue,
      earnedValue,
      progress: activityProgress
    })
  }

  // Calculate overall project progress
  const progress = totalProjectValue > 0 ? (totalEarnedValue / totalProjectValue) * 100 : 0

  return {
    totalProjectValue,
    totalEarnedValue,
    progress,
    activitiesProgress
  }
}

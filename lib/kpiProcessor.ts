/**
 * KPI Data Processor
 * Processes KPI data intelligently for display
 */

export interface ProcessedKPI {
  id: string
  project_full_code: string
  activity_name: string
  section: string
  zone: string
  quantity: number
  input_type: 'Planned' | 'Actual'
  drilled_meters: number
  value: number
  planned_value: number
  actual_value: number
  // Data fields for reports
  unit?: string
  activity_date: string // ✅ Unified date field (replaces target_date)
  // Calculated fields
  status: 'excellent' | 'good' | 'average' | 'low'
  performance_level: number
  created_at: string
  updated_at: string
}

/**
 * Calculate smart status based on quantity and type
 */
function calculateSmartStatus(quantity: number, inputType: string): {
  status: 'excellent' | 'good' | 'average' | 'low'
  performance_level: number
} {
  // For simplicity, classify based on quantity ranges
  // This can be customized based on your business logic
  let status: 'excellent' | 'good' | 'average' | 'low'
  let performance_level: number
  
  if (quantity >= 500) {
    status = 'excellent'
    performance_level = 100
  } else if (quantity >= 100) {
    status = 'good'
    performance_level = 75
  } else if (quantity >= 10) {
    status = 'average'
    performance_level = 50
  } else {
    status = 'low'
    performance_level = 25
  }
  
  return { status, performance_level }
}

/**
 * Process KPI record for display
 */
export function processKPIRecord(kpi: any): ProcessedKPI & { raw?: any } {
  const quantity = kpi.quantity || 0
  const inputType = kpi.input_type || 'Planned'
  const rawValue = typeof kpi.value === 'number' ? kpi.value : parseFloat(kpi.value || '0') || 0
  const plannedValue = typeof kpi.planned_value === 'number'
    ? kpi.planned_value
    : inputType === 'Planned'
      ? rawValue
      : 0
  const actualValue = typeof kpi.actual_value === 'number'
    ? kpi.actual_value
    : inputType === 'Actual'
      ? rawValue
      : 0
  const smartStatus = calculateSmartStatus(quantity, inputType)
  
  // ✅ FIX: Preserve activity_name and project_full_code even if empty (don't convert to empty string)
  const activityName = kpi.activity_name || kpi.activity || kpi.kpi_name || ''
  const projectFullCode = kpi.project_full_code || (kpi as any).project_code || ''
  
  return {
    id: kpi.id,
    project_full_code: projectFullCode,
    activity_name: activityName,
    section: kpi.section || '',
    zone: kpi.zone || '',
    quantity: quantity,
    input_type: inputType as 'Planned' | 'Actual',
    drilled_meters: kpi.drilled_meters || 0,
    value: rawValue,
    planned_value: plannedValue,
    actual_value: actualValue,
    // Data fields for reports
    unit: kpi.unit || '',
    activity_date: kpi.activity_date || kpi.created_at || '',
    // Calculated fields
    status: smartStatus.status,
    performance_level: smartStatus.performance_level,
    created_at: kpi.created_at,
    updated_at: kpi.updated_at,
    // ✅ Preserve project_code and project_sub_code for filtering
    project_code: (kpi as any).project_code || '',
    project_sub_code: (kpi as any).project_sub_code || '',
    // ✅ CRITICAL: Preserve raw data for value calculation
    raw: kpi
  } as ProcessedKPI & { project_code?: string; project_sub_code?: string; raw?: any }
}

/**
 * Get status color based on type and status
 */
export function getKPITypeStatusColor(inputType: string, status: string): string {
  if (inputType === 'Planned') {
    // Planned = Target (Blue shades)
    switch (status) {
      case 'excellent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'good': return 'bg-blue-50 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
      case 'average': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200'
      case 'low': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      default: return 'bg-blue-100 text-blue-800'
    }
  } else {
    // Actual = Achievement (Green shades)
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'good': return 'bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-200'
      case 'average': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
      case 'low': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300'
      default: return 'bg-green-100 text-green-800'
    }
  }
}

/**
 * Get type badge color
 */
export function getKPITypeBadgeColor(inputType: string): string {
  return inputType === 'Planned' 
    ? 'bg-blue-500 text-white'
    : 'bg-green-500 text-white'
}

/**
 * Get type icon
 */
export function getKPITypeIcon(inputType: string): string {
  return inputType === 'Planned' ? '🎯' : '✓'
}

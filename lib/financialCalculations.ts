/**
 * Financial Calculation Functions for KPI Tracking
 */

/**
 * Calculate total planned value
 */
export function calculatePlannedValue(kpis: any[]): number {
  return kpis
    .filter(k => k.input_type === 'Planned')
    .reduce((sum, k) => sum + (k.value || 0), 0)
}

/**
 * Calculate total earned value (actual completed)
 */
export function calculateEarnedValue(kpis: any[]): number {
  return kpis
    .filter(k => k.input_type === 'Actual')
    .reduce((sum, k) => sum + (k.value || 0), 0)
}

/**
 * Calculate value for specific date range
 */
export function calculateValueForDateRange(
  kpis: any[], 
  startDate: Date, 
  endDate: Date
): { planned: number, actual: number } {
  const planned = kpis
    .filter(k => {
      if (k.input_type !== 'Planned' || !k.target_date) return false
      const d = new Date(k.target_date)
      return d >= startDate && d <= endDate
    })
    .reduce((sum, k) => sum + (k.value || 0), 0)
  
  const actual = kpis
    .filter(k => {
      if (k.input_type !== 'Actual' || !k.actual_date) return false
      const d = new Date(k.actual_date)
      return d >= startDate && d <= endDate
    })
    .reduce((sum, k) => sum + (k.value || 0), 0)
  
  return { planned, actual }
}

/**
 * Calculate Schedule Performance Index (SPI)
 * SPI = Earned Value / Planned Value
 * SPI > 1: Ahead of schedule
 * SPI = 1: On schedule
 * SPI < 1: Behind schedule
 */
export function calculateSPI(earnedValue: number, plannedValue: number): number {
  if (plannedValue === 0) return 0
  return earnedValue / plannedValue
}

/**
 * Calculate Cost Performance Index (CPI)
 * (For future use when actual costs are added)
 */
export function calculateCPI(earnedValue: number, actualCost: number): number {
  if (actualCost === 0) return 0
  return earnedValue / actualCost
}

/**
 * Get performance status based on SPI
 */
export function getPerformanceStatus(spi: number): {
  status: 'excellent' | 'good' | 'at_risk' | 'poor'
  label: string
  color: string
  bgColor: string
} {
  if (spi >= 1.1) return { 
    status: 'excellent', 
    label: 'Ahead of Schedule', 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900'
  }
  if (spi >= 0.95) return { 
    status: 'good', 
    label: 'On Track', 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900'
  }
  if (spi >= 0.85) return { 
    status: 'at_risk', 
    label: 'Slightly Behind', 
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900'
  }
  return { 
    status: 'poor', 
    label: 'Behind Schedule', 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900'
  }
}

/**
 * Calculate variance (Actual - Planned)
 */
export function calculateVariance(actual: number, planned: number): number {
  return actual - planned
}

/**
 * Calculate variance percentage
 */
export function calculateVariancePercentage(actual: number, planned: number): number {
  if (planned === 0) return 0
  return ((actual - planned) / planned) * 100
}

/**
 * Calculate total value by project
 */
export function calculateValueByProject(kpis: any[]): Record<string, {
  planned: number
  actual: number
  variance: number
  spi: number
}> {
  const projectValues: Record<string, { planned: number, actual: number }> = {}
  
  kpis.forEach(kpi => {
    const projectCode = kpi.project_full_code
    if (!projectValues[projectCode]) {
      projectValues[projectCode] = { planned: 0, actual: 0 }
    }
    
    if (kpi.input_type === 'Planned') {
      projectValues[projectCode].planned += kpi.value || 0
    } else if (kpi.input_type === 'Actual') {
      projectValues[projectCode].actual += kpi.value || 0
    }
  })
  
  // Calculate variance and SPI for each project
  const result: Record<string, any> = {}
  for (const [project, values] of Object.entries(projectValues)) {
    result[project] = {
      planned: values.planned,
      actual: values.actual,
      variance: values.actual - values.planned,
      spi: values.planned > 0 ? values.actual / values.planned : 0
    }
  }
  
  return result
}

/**
 * Calculate weekly value trend
 */
export function calculateWeeklyValueTrend(kpis: any[]): Array<{
  week: string
  planned: number
  actual: number
  variance: number
}> {
  const weeklyData: Record<string, { planned: number, actual: number }> = {}
  
  kpis.forEach(kpi => {
    const date = kpi.activity_date || kpi.target_date || kpi.actual_date
    if (!date) return
    
    const d = new Date(date)
    const weekNum = getWeekNumber(d)
    const year = d.getFullYear()
    const key = `${year}-W${String(weekNum).padStart(2, '0')}`
    
    if (!weeklyData[key]) {
      weeklyData[key] = { planned: 0, actual: 0 }
    }
    
    if (kpi.input_type === 'Planned') {
      weeklyData[key].planned += kpi.value || 0
    } else if (kpi.input_type === 'Actual') {
      weeklyData[key].actual += kpi.value || 0
    }
  })
  
  // Convert to array and sort
  return Object.entries(weeklyData)
    .map(([week, values]) => ({
      week,
      planned: values.planned,
      actual: values.actual,
      variance: values.actual - values.planned
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

/**
 * Calculate monthly value trend
 */
export function calculateMonthlyValueTrend(kpis: any[]): Array<{
  month: string
  planned: number
  actual: number
  variance: number
  spi: number
}> {
  const monthlyData: Record<string, { planned: number, actual: number }> = {}
  
  kpis.forEach(kpi => {
    const date = kpi.activity_date || kpi.target_date || kpi.actual_date
    if (!date) return
    
    const d = new Date(date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[key]) {
      monthlyData[key] = { planned: 0, actual: 0 }
    }
    
    if (kpi.input_type === 'Planned') {
      monthlyData[key].planned += kpi.value || 0
    } else if (kpi.input_type === 'Actual') {
      monthlyData[key].actual += kpi.value || 0
    }
  })
  
  // Convert to array and sort
  return Object.entries(monthlyData)
    .map(([month, values]) => ({
      month,
      planned: values.planned,
      actual: values.actual,
      variance: values.actual - values.planned,
      spi: values.planned > 0 ? values.actual / values.planned : 0
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

// Helper function
function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + firstDay.getDay() + 1) / 7)
}

/**
 * Calculate forecast to completion
 */
export function calculateForecast(
  totalPlanned: number,
  earnedValue: number,
  spi: number
): {
  estimatedTotal: number
  remainingValue: number
  forecastVariance: number
} {
  if (spi === 0) {
    return {
      estimatedTotal: totalPlanned,
      remainingValue: totalPlanned - earnedValue,
      forecastVariance: 0
    }
  }
  
  const estimatedTotal = totalPlanned / spi
  const remainingValue = estimatedTotal - earnedValue
  const forecastVariance = estimatedTotal - totalPlanned
  
  return {
    estimatedTotal,
    remainingValue,
    forecastVariance
  }
}


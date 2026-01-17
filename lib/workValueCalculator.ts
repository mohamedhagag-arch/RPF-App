/**
 * ✅ Shared Work Value Calculator
 * This module provides a unified calculation logic for Work Value Status
 * Used in: ProjectsTableWithCustomization, ModernProjectCard, ProjectDetailsPanel
 * 
 * ✅ IMPORTANT: Uses EXACT SAME LOGIC as KPI Page (KPITracking.tsx)
 * 
 * Business Logic:
 * - Total Value: مجموع كل Planned KPIs للمشروع بغض النظر عن أي شيء
 * - Planned Value: مجموع كل Planned KPIs حتى تاريخ أمس، ولا يضع في الاعتبار Activity Commencement Relation
 * - Earned Value: مجموع كل Actual KPIs
 * 
 * Value Calculation Priority (SAME AS KPI PAGE):
 * - Planned KPIs: 1) Value field, 2) Quantity × Rate (if Value equals Quantity or not available)
 * - Actual KPIs: 1) Actual Value field, 2) Value field as fallback
 */

import { Project } from '@/lib/supabase'

interface WorkValueStatus {
  total: number
  planned: number
  earned: number
}

/**
 * Helper function to extract project codes from any item
 * ✅ PRIORITY: project_full_code first (most specific), then project_code (fallback)
 */
function extractProjectCodes(item: any): string[] {
  const codes: string[] = []
  const raw = (item as any).raw || {}
  
  // ✅ PRIORITY 1: Extract project_full_code (most specific - distinguishes P4110 from P4110-P)
  const fullCodeSources = [
    item.project_full_code,
    (item as any)['Project Full Code'],
    raw['Project Full Code']
  ]
  
  for (const source of fullCodeSources) {
    if (source) {
      const code = source.toString().trim()
      if (code) {
        codes.push(code)
        codes.push(code.toUpperCase())
        // If we have a full code, return immediately (don't add project_code)
        // This ensures P4110-P and P4110 are treated as different projects
        return Array.from(new Set(codes))
      }
    }
  }
  
  // ✅ PRIORITY 2: Extract project_code (fallback if no full code exists)
  const codeSources = [
    item.project_code,
    (item as any)['Project Code'],
    raw['Project Code']
  ]
  
  for (const source of codeSources) {
    if (source) {
      const code = source.toString().trim()
      if (code) {
        codes.push(code)
        codes.push(code.toUpperCase())
      }
    }
  }
  
  return Array.from(new Set(codes))
}

/**
 * Helper function to check if codes match
 * ✅ CRITICAL: Use exact match for project_full_code to distinguish P4110 from P4110-P
 */
function codesMatch(itemCodes: string[], targetCodes: string[]): boolean {
  const targetCodesUpper = targetCodes.map(c => c.toUpperCase().trim())
  const itemCodesUpper = itemCodes.map(c => c.toUpperCase().trim())
  
  // ✅ First, try exact match (most important for project_full_code)
  for (const itemCode of itemCodesUpper) {
    if (targetCodesUpper.includes(itemCode)) {
      return true
    }
  }
  
  // ✅ Only if no exact match, check if one is a prefix of another
  // But ONLY if both don't have a dash (to avoid matching P4110 with P4110-P)
  for (const itemCode of itemCodesUpper) {
    for (const targetCode of targetCodesUpper) {
      // If both codes contain a dash, require exact match
      const itemHasDash = itemCode.includes('-')
      const targetHasDash = targetCode.includes('-')
      
      if (itemHasDash || targetHasDash) {
        // If either has a dash, only exact match is allowed
        if (itemCode === targetCode) {
          return true
        }
      } else {
        // If neither has a dash, allow prefix matching (for backward compatibility)
        if (itemCode.startsWith(targetCode) || targetCode.startsWith(itemCode)) {
          return true
        }
      }
    }
  }
  
  return false
}

/**
 * Helper function to check if item matches project
 */
function matchesProject(item: any, project: Project): boolean {
  const itemCodes = extractProjectCodes(item)
  const projectCodes = extractProjectCodes(project)
  return codesMatch(itemCodes, projectCodes)
}

/**
 * Helper function to parse date string
 */
function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
    return null
  }
  
  try {
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Helper function to get Input Type from KPI
 */
function getInputType(kpi: any): string {
  const rawKpi = (kpi as any).raw || {}
  return String(
    kpi.input_type || 
    kpi['Input Type'] || 
    rawKpi['Input Type'] || 
    rawKpi['input_type'] ||
    ''
  ).trim().toLowerCase()
}

/**
 * Helper function to get KPI date
 */
function getKPIDate(kpi: any): Date | null {
  const rawKpi = (kpi as any).raw || {}
  const kpiDateStr = kpi.activity_date ||
                    kpi.target_date ||
                    rawKpi['Activity Date'] ||
                    rawKpi['Target Date'] ||
                    rawKpi['Day'] ||
                    kpi.day ||
                    ''
  
  if (!kpiDateStr || kpiDateStr.trim() === '' || kpiDateStr === 'N/A') {
    return null
  }
  
  return parseDateString(kpiDateStr)
}

/**
 * Helper function to get KPI value for Planned KPIs
 * ✅ SAME LOGIC AS KPI PAGE (KPITracking.tsx)
 * Priority: 1) Value field directly, 2) Calculate from Quantity × Rate (if Value equals Quantity or not available)
 */
function getPlannedKPIValue(kpi: any, allActivities: any[], project: Project): number {
  const rawKpi = (kpi as any).raw || {}
  const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
  
  // ✅ PRIORITY 1: Use Value field directly (SAME AS KPI PAGE)
  let kpiValue = 0
  
  // Try raw['Value'] (from database with capital V)
  if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
    const val = rawKpi['Value']
    kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
  }
  
  // Try raw.value (from database with lowercase v)
  if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
    const val = rawKpi.value
    kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
  }
  
  // Try k.value (direct property from ProcessedKPI)
  if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
    const val = kpi.value
    kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
  }
  
  // ✅ Check if Value equals Quantity (means it's quantity, not value)
  // If Value equals Quantity, we need to calculate from Rate × Quantity (SAME AS KPI PAGE)
  if (kpiValue > 0 && quantity > 0 && Math.abs(kpiValue - quantity) < 0.01) {
    // Value equals quantity, so it's not a real value - calculate from rate
    kpiValue = 0
  }
  
  if (kpiValue > 0) {
    return kpiValue
  }
  
  // ✅ PRIORITY 2: Calculate from Quantity × Rate (if Value is not available or equals quantity)
  if (quantity > 0 && allActivities.length > 0) {
    const kpiActivityName = (kpi.activity_description || rawKpi['Activity Description'] || kpi.activity_name || rawKpi['Activity Name'] || kpi.activity || rawKpi['Activity'] || '').toLowerCase().trim()
    const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
    const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
    
    // Extract KPI Zone Number
    const kpiZoneRaw = (rawKpi['Zone Number'] || (kpi as any).zone_number || kpi.zone || rawKpi['Zone'] || '0').toString().trim()
    let kpiZone = kpiZoneRaw.toLowerCase().trim()
    if (kpiZone && kpiProjectCode) {
      const projectCodeUpper = kpiProjectCode.toUpperCase()
      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
    }
    if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
    
    // Try multiple matching strategies
    let relatedActivity: any = null
    
    // Try 1: activity_name + project_full_code + zone
    if (kpiActivityName && kpiProjectFullCode && kpiZone) {
      relatedActivity = allActivities.find((activity: any) => {
        if (!matchesProject(activity, project)) return false
        const activityName = (activity.activity_description || activity.activity_name || activity['Activity Description'] || activity['Activity Name'] || activity.activity || '').toLowerCase().trim()
        const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
        const rawActivity = (activity as any).raw || {}
        const activityZone = (activity.zone_number || rawActivity['Zone Number'] || '0').toString().toLowerCase().trim()
        return activityName === kpiActivityName && 
               activityProjectFullCode === kpiProjectFullCode &&
               (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
      })
    }
    
    // Try 2: activity_name + project_full_code
    if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
      relatedActivity = allActivities.find((activity: any) => {
        if (!matchesProject(activity, project)) return false
        const activityName = (activity.activity_description || activity.activity_name || activity['Activity Description'] || activity['Activity Name'] || activity.activity || '').toLowerCase().trim()
        const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
        return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
      })
    }
    
    // Try 3: activity_name + project_code + zone
    if (!relatedActivity && kpiActivityName && kpiProjectCode && kpiZone) {
      relatedActivity = allActivities.find((activity: any) => {
        if (!matchesProject(activity, project)) return false
        const activityName = (activity.activity_description || activity.activity_name || activity['Activity Description'] || activity['Activity Name'] || activity.activity || '').toLowerCase().trim()
        const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
        const rawActivity = (activity as any).raw || {}
        const activityZone = (activity.zone_number || rawActivity['Zone Number'] || '0').toString().toLowerCase().trim()
        return activityName === kpiActivityName && 
               activityProjectCode === kpiProjectCode &&
               (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
      })
    }
    
    // Try 4: activity_name + project_code
    if (!relatedActivity && kpiActivityName && kpiProjectCode) {
      relatedActivity = allActivities.find((activity: any) => {
        if (!matchesProject(activity, project)) return false
        const activityName = (activity.activity_description || activity.activity_name || activity['Activity Description'] || activity['Activity Name'] || activity.activity || '').toLowerCase().trim()
        const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
        return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
      })
    }
    
    // Try 5: activity_name only
    if (!relatedActivity && kpiActivityName) {
      relatedActivity = allActivities.find((activity: any) => {
        if (!matchesProject(activity, project)) return false
        const activityName = (activity.activity_description || activity.activity_name || activity['Activity Description'] || activity['Activity Name'] || activity.activity || '').toLowerCase().trim()
        return activityName === kpiActivityName
      })
    }
    
    if (relatedActivity) {
      const rawActivity = (relatedActivity as any).raw || {}
      const totalValueFromActivity = relatedActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
      const totalUnits = relatedActivity.total_units || 
                      relatedActivity.planned_units ||
                      parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                      0
      
      let rate = 0
      if (totalUnits > 0 && totalValueFromActivity > 0) {
        rate = totalValueFromActivity / totalUnits
      } else if (relatedActivity.rate && relatedActivity.rate > 0) {
        rate = relatedActivity.rate
      } else {
        const rateFromRaw = parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
        if (rateFromRaw > 0) rate = rateFromRaw
      }
      
      if (rate > 0 && quantity > 0) {
        const calculatedValue = quantity * rate
        if (calculatedValue > 0) {
          return calculatedValue
        }
      }
    }
    
    // Try Rate from KPI raw data
    const rateFromKPI = parseFloat(String(rawKpi['Rate'] || kpi.rate || '0').replace(/,/g, '')) || 0
    if (rateFromKPI > 0 && quantity > 0) {
      const calculatedFromKPIRate = quantity * rateFromKPI
      if (calculatedFromKPIRate > 0) {
        return calculatedFromKPIRate
      }
    }
  }
  
  // If no value found, return 0 (SAME AS KPI PAGE)
  return 0
}

/**
 * Helper function to get KPI value for Actual KPIs
 * ✅ SAME LOGIC AS KPI PAGE (KPITracking.tsx)
 * Priority: 1) Actual Value from KPI, 2) Value field as fallback
 */
function getActualKPIValue(kpi: any): number {
  const rawKpi = (kpi as any).raw || {}
  
  // ✅ PRIORITY 1: Actual Value directly from KPI
  const actualValueFromKPI = kpi.actual_value || parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, '')) || 0
  if (actualValueFromKPI > 0) {
    return actualValueFromKPI
  }
  
  // ✅ PRIORITY 2: Value field as fallback
  let kpiValue = 0
  if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
    const val = rawKpi['Value']
    kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
  }
  if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
    const val = rawKpi.value
    kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
  }
  if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
    const val = kpi.value
    kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
  }
  
  return kpiValue
}

/**
 * Calculate Work Value Status with correct business logic
 * 
 * @param project - The project to calculate for
 * @param allActivities - All BOQ activities
 * @param allKPIs - All KPI records
 * @returns Work value status with total, planned, and earned values
 */
export function calculateWorkValueStatus(
  project: Project,
  allActivities: any[],
  allKPIs: any[]
): WorkValueStatus {
  let totalValue = 0
  let plannedValue = 0
  let earnedValue = 0
  
  if (!project.project_code) {
    return { total: 0, planned: 0, earned: 0 }
  }

  try {
    // ✅ Calculate yesterday date (end of yesterday)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)

    // Filter KPIs for this project
    const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))

    // ============================================
    // ✅ STEP 1: Calculate Total Value
    // Total Value = مجموع كل Planned KPIs للمشروع بغض النظر عن أي شيء
    // لا فلترة بالتاريخ، لا فلترة بـ Activity Commencement Relation، لا فلترة بأي شيء آخر
    // ============================================
    const allPlannedKPIs = projectKPIs.filter((kpi: any) => {
      const inputType = getInputType(kpi)
      return inputType === 'planned'
    })
    
    // ✅ جمع كل Planned KPIs بدون أي فلترة إضافية
    allPlannedKPIs.forEach((kpi: any) => {
      const kpiValue = getPlannedKPIValue(kpi, allActivities, project)
      // جمع القيمة حتى لو كانت 0 (لكن في الواقع القيم 0 لا تضيف شيئاً)
      totalValue += kpiValue
    })

    // ============================================
    // ✅ STEP 2: Calculate Planned Value
    // Planned Value = مجموع كل Planned KPIs حتى تاريخ أمس فقط
    // لا يضع في الاعتبار Activity Commencement Relation
    // ============================================
    const plannedKPIsUntilYesterday = projectKPIs.filter((kpi: any) => {
      // Check Input Type
      const inputType = getInputType(kpi)
      if (inputType !== 'planned') {
        return false
      }
      
      // Check date (must have date and be <= yesterday)
      const kpiDate = getKPIDate(kpi)
      if (!kpiDate) {
        return false // Exclude KPIs without date
      }
      
      // Only include KPIs with date <= yesterday
      return kpiDate <= yesterday
    })
    
    plannedKPIsUntilYesterday.forEach((kpi: any) => {
      const kpiValue = getPlannedKPIValue(kpi, allActivities, project)
      if (kpiValue > 0) {
        plannedValue += kpiValue
      }
    })

    // ============================================
    // ✅ STEP 3: Calculate Earned Value
    // Earned Value = مجموع كل Actual KPIs
    // ============================================
    const actualKPIs = projectKPIs.filter((kpi: any) => {
      const inputType = getInputType(kpi)
      return inputType === 'actual'
    })
    
    actualKPIs.forEach((kpi: any) => {
      const kpiValue = getActualKPIValue(kpi)
      if (kpiValue > 0) {
        earnedValue += kpiValue
      }
    })
  } catch (error) {
    console.error('Error calculating work value status:', error)
  }
  
  return { total: totalValue, planned: plannedValue, earned: earnedValue }
}

/**
 * Calculate Progress Summary from Work Value Status
 * 
 * @param workValueStatus - Work value status
 * @returns Progress summary with planned and actual percentages
 */
export function calculateProgressFromWorkValue(workValueStatus: WorkValueStatus): {
  planned: number
  actual: number
  variance: number
} {
  const { total, planned, earned } = workValueStatus
  
  const plannedProgress = total > 0 ? (planned / total) * 100 : 0
  const actualProgress = total > 0 ? (earned / total) * 100 : 0
  
  // ✅ Clamp progress values between 0 and 100
  const plannedProgressClamped = Math.min(100, Math.max(0, plannedProgress))
  const actualProgressClamped = Math.min(100, Math.max(0, actualProgress))
  
  // ✅ Calculate variance from clamped values
  const variance = actualProgressClamped - plannedProgressClamped
  
  return {
    planned: plannedProgressClamped,
    actual: actualProgressClamped,
    variance
  }
}

interface QuantityStatus {
  total: number
  planned: number
  earned: number
}

/**
 * Calculate Quantity Status with correct business logic
 * Same principle as Work Value Status but for quantities
 * 
 * @param project - The project to calculate for
 * @param allActivities - All BOQ activities
 * @param allKPIs - All KPI records
 * @returns Quantity status with total, planned, and earned quantities
 */
export function calculateQuantityStatus(
  project: Project,
  allActivities: any[],
  allKPIs: any[]
): QuantityStatus {
  let totalQuantity = 0
  let plannedQuantity = 0
  let earnedQuantity = 0
  
  if (!project.project_code) {
    return { total: 0, planned: 0, earned: 0 }
  }

  try {
    // ✅ Calculate yesterday date (end of yesterday)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)

    // Filter KPIs for this project
    const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))

    // ✅ STEP 1: Calculate Total Quantity from all Planned KPIs (not filtered by date)
    const allPlannedKPIs = projectKPIs.filter((kpi: any) => {
      const inputType = getInputType(kpi)
      return inputType === 'planned'
    })

    allPlannedKPIs.forEach((kpi: any) => {
      const rawKpi = (kpi as any).raw || {}
      const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
      totalQuantity += quantity
    })

    // ✅ STEP 2: Calculate Planned Quantity from Planned KPIs until yesterday
    const plannedKPIsUntilYesterday = projectKPIs.filter((kpi: any) => {
      const inputType = getInputType(kpi)
      if (inputType !== 'planned') {
        return false
      }
      
      const kpiDate = getKPIDate(kpi)
      if (!kpiDate) {
        return false
      }
      
      return kpiDate <= yesterday
    })

    plannedKPIsUntilYesterday.forEach((kpi: any) => {
      const rawKpi = (kpi as any).raw || {}
      const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
      plannedQuantity += quantity
    })

    // ✅ STEP 3: Calculate Earned Quantity from all Actual KPIs
    const actualKPIs = projectKPIs.filter((kpi: any) => {
      const inputType = getInputType(kpi)
      return inputType === 'actual'
    })

    actualKPIs.forEach((kpi: any) => {
      const rawKpi = (kpi as any).raw || {}
      const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
      earnedQuantity += quantity
    })
  } catch (error) {
    console.error('Error calculating quantity status:', error)
  }
  
  return { total: totalQuantity, planned: plannedQuantity, earned: earnedQuantity }
}

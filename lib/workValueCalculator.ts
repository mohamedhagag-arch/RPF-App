/**
 * ✅ Shared Work Value Calculator
 * This module provides a unified calculation logic for Work Value Status
 * Used in: ProjectsTableWithCustomization, ModernProjectCard, ProjectDetailsPanel
 * 
 * Business Logic:
 * - Total Value: مجموع كل القيم لل BOQ مجتمعة أو KPI Planned مجتمعة
 * - Planned Value: مجموع القيم المخطط لها حتى تاريخ أمس (من KPI Planned)
 * - Earned Value: مجموع كل القيم ال KPI Actual حتى تاريخ أمس
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

    // ✅ STEP 1: Calculate Total Value from BOQ Activities (all activities, not filtered by date)
    if (allActivities.length > 0) {
      const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
      
      if (projectActivities.length > 0) {
        projectActivities.forEach((activity: any) => {
          const rawActivity = (activity as any).raw || {}
          
          // Get Total Value from activity
          const activityTotalValue = activity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
          
          if (activityTotalValue > 0) {
            totalValue += activityTotalValue
          } else {
            // Calculate from Rate × Total Units if Total Value not available
            const rate = activity.rate || 
                        parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                        0
            const totalUnits = activity.total_units || 
                            parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                            0
            
            if (rate > 0 && totalUnits > 0) {
              totalValue += rate * totalUnits
            }
          }
        })
      }
    }

    // ✅ STEP 2: Calculate Total Value from ALL Planned KPIs (not filtered by date)
    // Total Value = مجموع جميع Planned KPIs للمشروع بدون فلترة بالتاريخ
    // This should be calculated regardless of BOQ total value
    if (allKPIs.length > 0) {
      const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
      
      const plannedKPIs = projectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        return inputType === 'planned'
      })
      
      // ✅ If we have Planned KPIs, use them for Total Value (override BOQ if exists)
      // Total Value = مجموع جميع Planned KPIs للمشروع بدون فلترة بالتاريخ
      if (plannedKPIs.length > 0) {
        // Reset totalValue to calculate from Planned KPIs
        totalValue = 0
        
        plannedKPIs.forEach((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          
          // Get Quantity
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          // Find matching activity to get Rate
          let rate = 0
          const matchingActivity = allActivities.find((activity: any) => {
            if (!matchesProject(activity, project)) return false
            
            const kpiActivityName = (kpi.activity_name || rawKpi['Activity Name'] || '').toLowerCase().trim()
            const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            if (!kpiActivityName || !activityName || kpiActivityName !== activityName) return false
            
            // Zone matching (flexible)
            const kpiZone = (kpi.zone || rawKpi['Zone'] || '').toString().trim()
            const activityZone = (activity.zone_ref || activity.zone_number || activity.zone || '').toString().trim()
            if (activityZone && kpiZone && activityZone !== kpiZone) return false
            
            return true
          })
          
          if (matchingActivity) {
            const rawActivity = (matchingActivity as any).raw || {}
            const totalValueFromActivity = matchingActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            const totalUnits = matchingActivity.total_units || 
                            matchingActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else if (matchingActivity.rate && matchingActivity.rate > 0) {
              rate = matchingActivity.rate
            } else {
              const rateFromRaw = parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
              if (rateFromRaw > 0) rate = rateFromRaw
            }
          }
          
          // ✅ PRIORITY 1: ALWAYS calculate from Quantity × Rate if both are available
          // This is the most accurate method as it uses the actual rate from the BOQ Activity
          if (rate > 0 && quantity > 0) {
            const calculatedValue = quantity * rate
            if (calculatedValue > 0) {
              totalValue += calculatedValue
              return
            }
          }
          
          // ✅ PRIORITY 2: Use Planned Value directly from KPI (fallback)
          const plannedValue = kpi.planned_value || parseFloat(String(rawKpi['Planned Value'] || '0').replace(/,/g, '')) || 0
          if (plannedValue > 0) {
            totalValue += plannedValue
            return
          }
          
          // ✅ PRIORITY 3: Fallback to Value field if Planned Value is not available (but check if it's actually a quantity)
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
          
          // ✅ CRITICAL CHECK: If Value equals Quantity, it means it's a quantity, not a financial value
          if (kpiValue > 0 && quantity > 0 && Math.abs(kpiValue - quantity) < 0.01) {
            // Value equals quantity, so it's not a real financial value - skip
            kpiValue = 0
          }
          
          // ✅ PRIORITY 4: If still no rate, try to get Rate from KPI raw data and calculate
          if (kpiValue === 0 && quantity > 0) {
            const rateFromKPI = parseFloat(String(rawKpi['Rate'] || kpi.rate || '0').replace(/,/g, '')) || 0
            if (rateFromKPI > 0) {
              const calculatedFromKPIRate = quantity * rateFromKPI
              if (calculatedFromKPIRate > 0) {
                totalValue += calculatedFromKPIRate
                return
              }
            }
          }
          
          if (kpiValue > 0) {
            totalValue += kpiValue
          }
        })
      }
    }

    // ✅ STEP 3: Calculate Planned Value from KPI Planned until yesterday
    if (allKPIs.length > 0) {
      const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
      
      const plannedKPIs = projectKPIs.filter((kpi: any) => {
        // Check if it's Planned
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') {
          return false
        }
        
        // ✅ Filter by date: only KPIs until yesterday
        const rawKpi = (kpi as any).raw || {}
        const kpiDateStr = kpi.activity_date ||
                          kpi.target_date ||
                          rawKpi['Activity Date'] ||
                          rawKpi['Target Date'] ||
                          rawKpi['Day'] ||
                          kpi.day ||
                          ''
        
        if (kpiDateStr) {
          const kpiDate = parseDateString(kpiDateStr)
          if (kpiDate && kpiDate > yesterday) {
            return false // Skip KPIs after yesterday
          }
        }
        
        return true
      })

      if (plannedKPIs.length > 0) {
        plannedKPIs.forEach((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          // ✅ IMPROVED: Find related activity with Zone matching (SAME AS KPI PAGE)
          // This matches the logic in KPITracking.tsx getActivityRate function
          let rate = 0
          if (allActivities.length > 0) {
            const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || '').toLowerCase().trim()
            const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
            const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
            
            // Extract KPI Zone (same logic as KPI page)
            const rawKpiForZone = (kpi as any).raw || {}
            const kpiZoneRaw = (kpi.zone || rawKpiForZone['Zone'] || rawKpiForZone['Zone Number'] || '').toString().trim()
            let kpiZone = kpiZoneRaw.toLowerCase().trim()
            if (kpiZone && kpiProjectCode) {
              const projectCodeUpper = kpiProjectCode.toUpperCase()
              kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
              kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
              kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
            }
            if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
            
            // Try multiple matching strategies (with Zone priority) - SAME AS KPI PAGE
            let relatedActivity: any = null
            
            // Try 1: activity_name + project_full_code + zone (most precise)
            if (kpiActivityName && kpiProjectFullCode && kpiZone) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
                const rawActivity = (activity as any).raw || {}
                const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
                return activityName === kpiActivityName && 
                       activityProjectFullCode === kpiProjectFullCode &&
                       (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
              })
            }
            
            // Try 2: activity_name + project_full_code (without zone - fallback)
            if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
                return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
              })
            }
            
            // Try 3: activity_name + project_code + zone (if not found and project_code exists)
            if (!relatedActivity && kpiActivityName && kpiProjectCode && kpiZone) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
                const rawActivity = (activity as any).raw || {}
                const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
                return activityName === kpiActivityName && 
                       activityProjectCode === kpiProjectCode &&
                       (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
              })
            }
            
            // Try 4: activity_name + project_code (without zone - fallback)
            if (!relatedActivity && kpiActivityName && kpiProjectCode) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
                return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
              })
            }
            
            // Try 5: activity_name only (last resort)
            if (!relatedActivity && kpiActivityName) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                return activityName === kpiActivityName
              })
            }
            
            if (relatedActivity) {
              const rawActivity = (relatedActivity as any).raw || {}
              
              // ✅ PRIORITY 1: Calculate Rate = Total Value / Total Units (SAME AS TABLE)
              const totalValueFromActivity = relatedActivity.total_value || 
                                           parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                           0
              
              const totalUnits = relatedActivity.total_units || 
                              relatedActivity.planned_units ||
                              parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                              0
              
              if (totalUnits > 0 && totalValueFromActivity > 0) {
                rate = totalValueFromActivity / totalUnits
              } else {
                // ✅ PRIORITY 2: Use rate directly from activity (fallback)
                rate = relatedActivity.rate || 
                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                      0
              }
            }
          }
          
          // ✅ FIXED: Calculate Planned Value from KPI Planned until yesterday - Use Planned Value directly from database
          // Priority: 1) Planned Value directly from KPI, 2) Value field as fallback
          let kpiValue = 0
          const plannedValueFromKPI = kpi.planned_value || parseFloat(String(rawKpi['Planned Value'] || '0').replace(/,/g, '')) || 0
          if (plannedValueFromKPI > 0) {
            kpiValue = plannedValueFromKPI
            plannedValue += kpiValue
            return
          }
          
          // Fallback to Value field
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
          
          if (kpiValue > 0) {
            plannedValue += kpiValue
            return
          }
          
          // ✅ CRITICAL: If no value found, skip (NEVER use quantity as value!)
          // This KPI will not contribute to planned value
        })
      }
    }

    // ✅ STEP 4: Calculate Earned Value from KPI Actual until yesterday
    if (allKPIs.length > 0) {
      const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
      
      const actualKPIs = projectKPIs.filter((kpi: any) => {
        // Check if it's Actual
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') {
          return false
        }
        
        // ✅ Filter by date: only KPIs until yesterday
        const rawKpi = (kpi as any).raw || {}
        const kpiDateStr = kpi.activity_date ||
                          kpi.target_date ||
                          rawKpi['Activity Date'] ||
                          rawKpi['Target Date'] ||
                          rawKpi['Day'] ||
                          kpi.day ||
                          ''
        
        if (kpiDateStr) {
          const kpiDate = parseDateString(kpiDateStr)
          if (kpiDate && kpiDate > yesterday) {
            return false // Skip KPIs after yesterday
          }
        }
        
        return true
      })

      if (actualKPIs.length > 0) {
        actualKPIs.forEach((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          // ✅ IMPROVED: Find related activity with Zone matching (SAME AS KPI PAGE)
          // This matches the logic in KPITracking.tsx getActivityRate function
          let rate = 0
          if (allActivities.length > 0) {
            const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || '').toLowerCase().trim()
            const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
            const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
            
            // Extract KPI Zone (same logic as KPI page)
            const rawKpiForZone = (kpi as any).raw || {}
            const kpiZoneRaw = (kpi.zone || rawKpiForZone['Zone'] || rawKpiForZone['Zone Number'] || '').toString().trim()
            let kpiZone = kpiZoneRaw.toLowerCase().trim()
            if (kpiZone && kpiProjectCode) {
              const projectCodeUpper = kpiProjectCode.toUpperCase()
              kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
              kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
              kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
            }
            if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
            
            // Try multiple matching strategies (with Zone priority) - SAME AS KPI PAGE
            let relatedActivity: any = null
            
            // Try 1: activity_name + project_full_code + zone (most precise)
            if (kpiActivityName && kpiProjectFullCode && kpiZone) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
                const rawActivity = (activity as any).raw || {}
                const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
                return activityName === kpiActivityName && 
                       activityProjectFullCode === kpiProjectFullCode &&
                       (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
              })
            }
            
            // Try 2: activity_name + project_full_code (without zone - fallback)
            if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
                return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
              })
            }
            
            // Try 3: activity_name + project_code + zone (if not found and project_code exists)
            if (!relatedActivity && kpiActivityName && kpiProjectCode && kpiZone) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
                const rawActivity = (activity as any).raw || {}
                const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
                return activityName === kpiActivityName && 
                       activityProjectCode === kpiProjectCode &&
                       (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
              })
            }
            
            // Try 4: activity_name + project_code (without zone - fallback)
            if (!relatedActivity && kpiActivityName && kpiProjectCode) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
                return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
              })
            }
            
            // Try 5: activity_name only (last resort)
            if (!relatedActivity && kpiActivityName) {
              relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const activityName = (activity.activity_name || activity['Activity Name'] || '').toLowerCase().trim()
                return activityName === kpiActivityName
              })
            }
            
            if (relatedActivity) {
              const rawActivity = (relatedActivity as any).raw || {}
              
              // ✅ PRIORITY 1: Calculate Rate = Total Value / Total Units (SAME AS TABLE)
              const totalValueFromActivity = relatedActivity.total_value || 
                                           parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                           0
              
              const totalUnits = relatedActivity.total_units || 
                              relatedActivity.planned_units ||
                              parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                              0
              
              if (totalUnits > 0 && totalValueFromActivity > 0) {
                rate = totalValueFromActivity / totalUnits
              } else {
                // ✅ PRIORITY 2: Use rate directly from activity (fallback)
                rate = relatedActivity.rate || 
                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                      0
              }
            }
          }
          
          // ✅ FIXED: Calculate Earned Value from KPI Actual until yesterday - Use Actual Value directly from database
          // Priority: 1) Actual Value directly from KPI, 2) Value field as fallback
          let kpiValue = 0
          const actualValueFromKPI = kpi.actual_value || parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, '')) || 0
          if (actualValueFromKPI > 0) {
            kpiValue = actualValueFromKPI
            earnedValue += kpiValue
            return
          }
          
          // Fallback to Value field
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
          
          if (kpiValue > 0) {
            earnedValue += kpiValue
            return
          }
          
          // ✅ CRITICAL: If no value found, skip (NEVER use quantity as value!)
          // This KPI will not contribute to earned value
        })
      }
    }
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

    // ✅ STEP 1: Calculate Total Quantity from BOQ Activities (all activities, not filtered by date)
    if (allActivities.length > 0) {
      const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
      
      if (projectActivities.length > 0) {
        projectActivities.forEach((activity: any) => {
          const rawActivity = (activity as any).raw || {}
          
          // Get Total Units from activity
          const activityTotalUnits = activity.total_units || 
                                   parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                   0
          
          if (activityTotalUnits > 0) {
            totalQuantity += activityTotalUnits
          } else {
            // Fallback to planned_units if total_units not available
            const plannedUnits = activity.planned_units || 
                               parseFloat(String(rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                               0
            if (plannedUnits > 0) {
              totalQuantity += plannedUnits
            }
          }
        })
      }
    }

    // ✅ STEP 2: If Total Quantity from BOQ is 0, calculate from all KPI Planned (not filtered by date)
    if (totalQuantity === 0 && allKPIs.length > 0) {
      const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
      
      const plannedKPIs = projectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        return inputType === 'planned'
      })

      if (plannedKPIs.length > 0) {
        plannedKPIs.forEach((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          totalQuantity += quantity
        })
      }
    }

    // ✅ STEP 3: Calculate Planned Quantity from KPI Planned until yesterday
    if (allKPIs.length > 0) {
      const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
      
      const plannedKPIs = projectKPIs.filter((kpi: any) => {
        // Check if it's Planned
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') {
          return false
        }
        
        // ✅ Filter by date: only KPIs until yesterday
        const rawKpi = (kpi as any).raw || {}
        const kpiDateStr = kpi.activity_date ||
                          kpi.target_date ||
                          rawKpi['Activity Date'] ||
                          rawKpi['Target Date'] ||
                          rawKpi['Day'] ||
                          kpi.day ||
                          ''
        
        if (kpiDateStr) {
          const kpiDate = parseDateString(kpiDateStr)
          if (kpiDate && kpiDate > yesterday) {
            return false // Skip KPIs after yesterday
          }
        }
        
        return true
      })

      if (plannedKPIs.length > 0) {
        plannedKPIs.forEach((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          plannedQuantity += quantity
        })
      }
    }

    // ✅ STEP 4: Calculate Earned Quantity from KPI Actual until yesterday
    if (allKPIs.length > 0) {
      const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
      
      const actualKPIs = projectKPIs.filter((kpi: any) => {
        // Check if it's Actual
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') {
          return false
        }
        
        // ✅ Filter by date: only KPIs until yesterday
        const rawKpi = (kpi as any).raw || {}
        const kpiDateStr = kpi.activity_date ||
                          kpi.target_date ||
                          rawKpi['Activity Date'] ||
                          rawKpi['Target Date'] ||
                          rawKpi['Day'] ||
                          kpi.day ||
                          ''
        
        if (kpiDateStr) {
          const kpiDate = parseDateString(kpiDateStr)
          if (kpiDate && kpiDate > yesterday) {
            return false // Skip KPIs after yesterday
          }
        }
        
        return true
      })

      if (actualKPIs.length > 0) {
        actualKPIs.forEach((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          earnedQuantity += quantity
        })
      }
    }
  } catch (error) {
    console.error('Error calculating quantity status:', error)
  }
  
  return { total: totalQuantity, planned: plannedQuantity, earned: earnedQuantity }
}


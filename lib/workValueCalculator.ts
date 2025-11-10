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
 */
function extractProjectCodes(item: any): string[] {
  const codes: string[] = []
  const raw = (item as any).raw || {}
  
  const sources = [
    item.project_full_code,
    (item as any)['Project Full Code'],
    raw['Project Full Code'],
    item.project_code,
    (item as any)['Project Code'],
    raw['Project Code']
  ]
  
  for (const source of sources) {
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
 */
function codesMatch(itemCodes: string[], targetCodes: string[]): boolean {
  const targetCodesUpper = targetCodes.map(c => c.toUpperCase().trim())
  for (const itemCode of itemCodes) {
    const itemCodeUpper = itemCode.toUpperCase().trim()
    if (targetCodesUpper.includes(itemCodeUpper)) {
      return true
    }
    for (const targetCode of targetCodesUpper) {
      if (itemCodeUpper.startsWith(targetCode) || targetCode.startsWith(itemCodeUpper)) {
        return true
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

    // ✅ STEP 2: If Total Value from BOQ is 0, calculate from all KPI Planned (not filtered by date)
    if (totalValue === 0 && allKPIs.length > 0) {
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
          
          // Find related activity to get rate
          let rate = 0
          if (allActivities.length > 0) {
            const relatedActivity = allActivities.find((activity: any) => {
              if (!matchesProject(activity, project)) return false
              const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
              const activityName = activity.activity_name || activity['Activity Name'] || ''
              return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
            })
            
            if (relatedActivity) {
              const rawActivity = (relatedActivity as any).raw || {}
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
              
              if (rate === 0) {
                const totalValue = relatedActivity.total_value || 
                                 parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                 0
                const totalUnits = relatedActivity.total_units || 
                                parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                0
                if (totalUnits > 0 && totalValue > 0) {
                  rate = totalValue / totalUnits
                }
              }
            }
          }
          
          // Calculate value: rate × quantity or use kpi.value
          let kpiValue = 0
          if (rate > 0 && quantity > 0) {
            kpiValue = rate * quantity
          } else {
            kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
          }
          
          totalValue += kpiValue
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
          
          // Find related activity to get rate
          let rate = 0
          if (allActivities.length > 0) {
            const relatedActivity = allActivities.find((activity: any) => {
              if (!matchesProject(activity, project)) return false
              const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
              const activityName = activity.activity_name || activity['Activity Name'] || ''
              return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
            })
            
            if (relatedActivity) {
              const rawActivity = (relatedActivity as any).raw || {}
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
              
              if (rate === 0) {
                const totalValue = relatedActivity.total_value || 
                                 parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                 0
                const totalUnits = relatedActivity.total_units || 
                                parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                0
                if (totalUnits > 0 && totalValue > 0) {
                  rate = totalValue / totalUnits
                }
              }
            }
          }
          
          // Calculate value: rate × quantity or use kpi.value
          let kpiValue = 0
          if (rate > 0 && quantity > 0) {
            kpiValue = rate * quantity
          } else {
            kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
          }
          
          plannedValue += kpiValue
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
          
          // Find related activity to get rate
          let rate = 0
          if (allActivities.length > 0) {
            const relatedActivity = allActivities.find((activity: any) => {
              if (!matchesProject(activity, project)) return false
              const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
              const activityName = activity.activity_name || activity['Activity Name'] || ''
              return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
            })
            
            if (relatedActivity) {
              const rawActivity = (relatedActivity as any).raw || {}
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
              
              if (rate === 0) {
                const totalValue = relatedActivity.total_value || 
                                 parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                 0
                const totalUnits = relatedActivity.total_units || 
                                parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                0
                if (totalUnits > 0 && totalValue > 0) {
                  rate = totalValue / totalUnits
                }
              }
            }
          }
          
          // Calculate value: rate × quantity or use kpi.value
          let kpiValue = 0
          if (rate > 0 && quantity > 0) {
            kpiValue = rate * quantity
          } else {
            kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
          }
          
          earnedValue += kpiValue
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


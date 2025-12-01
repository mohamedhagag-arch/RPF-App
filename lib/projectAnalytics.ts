/**
 * Project Analytics and Smart Linking
 * Links Projects with BOQ Activities and KPI Records
 * Calculates comprehensive statistics and progress metrics
 */

import { Project, BOQActivity, KPIRecord } from './supabase'
import { calculateProjectProgressFromValues, calculateProjectProgressFromKPI } from './boqValueCalculator'
import { calculateActivityRate } from './rateCalculator'

type KPIAggregate = {
  totalActual: number
  totalPlanned: number
  totalActualValue: number
  totalPlannedValue: number
}

export interface ProjectAnalytics {
  project: Project
  
  // BOQ Statistics
  totalActivities: number
  completedActivities: number
  onTrackActivities: number
  delayedActivities: number
  notStartedActivities: number
  
  // Financial Metrics - New Concepts
  totalContractValue: number // قيمة المشروع الإجمالية - القيمة التي يتم إدخالها عند إنشاء المشروع (قيمة العقد)
  totalValue: number // قيمة مجموع كل الأنشطة للمشروع (BOQ) أو كل KPI Planned للمشروع (المفترض أنهما دائماً نفس القيمة)
  totalPlannedValue: number // مجموع KPI Planned حتى اليوم فقط (yesterday)
  totalEarnedValue: number // مجموع KPI Actual (Actual Value / Earned Value / Work Done)
  totalRemainingValue: number // Total Value – Earned Value
  variance: number // Earned Value – Planned Value
  actualProgress: number // (Earned Value / Total Value) × 100
  plannedProgress: number // (Planned Value / Total Value) × 100
  financialProgress: number // Legacy field (kept for compatibility)
  
  // Quantity Metrics - Same concepts applied to quantities
  totalQuantity: number // مجموع الكميات لجميع أنشطة المشروع (BOQ) أو كل KPI Planned للمشروع
  totalPlannedQuantity: number // مجموع الكميات المخططة حتى اليوم فقط (من KPI Planned)
  totalEarnedQuantity: number // مجموع الكميات الفعلية حتى اليوم فقط (من KPI Actual)
  totalRemainingQuantity: number // Total Quantity – Earned Quantity
  quantityVariance: number // Earned Quantity – Planned Quantity
  actualQuantityProgress: number // (Earned Quantity / Total Quantity) × 100
  plannedQuantityProgress: number // (Planned Quantity / Total Quantity) × 100
  
  // Progress Metrics
  overallProgress: number
  weightedProgress: number
  averageActivityProgress: number
  
  // KPI Metrics
  totalKPIs: number
  plannedKPIs: number
  actualKPIs: number
  completedKPIs: number
  onTrackKPIs: number
  delayedKPIs: number
  atRiskKPIs: number
  
  // Time Metrics
  activitiesOnSchedule: number
  activitiesBehindSchedule: number
  averageDelay: number
  
  // Related Data
  activities: BOQActivity[]
  kpis: any[]
  
  // Status Summary
  projectHealth: 'excellent' | 'good' | 'warning' | 'critical'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  
  // Variance Metrics
  variancePercentage: number
  projectStatus: 'ahead' | 'on_track' | 'delayed' // Based on variance percentage
  
  // ✅ PERFORMANCE: Cached work value and quantity status (calculated once, reused everywhere)
  workValueStatus?: { total: number; planned: number; earned: number }
  quantityStatus?: { total: number; planned: number; earned: number }
}

/**
 * Create empty analytics for projects with no data
 */
function createEmptyAnalytics(project: Project): ProjectAnalytics {
  return {
    project,
    
    // BOQ Statistics
    totalActivities: 0,
    completedActivities: 0,
    onTrackActivities: 0,
    delayedActivities: 0,
    notStartedActivities: 0,
    
    // Financial Metrics - New Concepts
    totalContractValue: project.contract_amount || 0,
    totalValue: 0,
    totalPlannedValue: 0,
    totalEarnedValue: 0,
    totalRemainingValue: 0,
    variance: 0,
    actualProgress: 0,
    plannedProgress: 0,
    financialProgress: 0,
    
    // Quantity Metrics
    totalQuantity: 0,
    totalPlannedQuantity: 0,
    totalEarnedQuantity: 0,
    totalRemainingQuantity: 0,
    quantityVariance: 0,
    actualQuantityProgress: 0,
    plannedQuantityProgress: 0,
    
    // Progress Metrics
    overallProgress: 0,
    weightedProgress: 0,
    averageActivityProgress: 0,
    
    // KPI Metrics
    totalKPIs: 0,
    plannedKPIs: 0,
    actualKPIs: 0,
    completedKPIs: 0,
    onTrackKPIs: 0,
    delayedKPIs: 0,
    atRiskKPIs: 0,
    
    // Time Metrics
    activitiesOnSchedule: 0,
    activitiesBehindSchedule: 0,
    averageDelay: 0,
    
    // Related Data
    activities: [],
    kpis: [],
    
    // Status Summary
    projectHealth: 'warning',
    riskLevel: 'low',
    
    // Variance Metrics
    variancePercentage: 0,
    projectStatus: 'on_track'
  }
}

/**
 * Calculate comprehensive analytics for a project
 */
export function calculateProjectAnalytics(
  project: Project,
  allActivities: BOQActivity[],
  allKPIs: any[]
): ProjectAnalytics {
  // 🔧 PERFORMANCE: Early return if no data
  if (allActivities.length === 0 && allKPIs.length === 0) {
    // Only log warnings in development mode
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [${project.project_code}] No activities or KPIs provided`)
    }
    return createEmptyAnalytics(project)
  }
  
  // ✅ FIX: Build project_full_code correctly first, then create variations
  const projectCode = (project.project_code || '').toString().trim()
  const projectSubCode = (project.project_sub_code || '').toString().trim()
  
  // Build project_full_code (case-sensitive for exact matching)
  let projectFullCode = projectCode
  if (projectSubCode) {
    // Check if sub_code already starts with project_code (case-insensitive)
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      projectFullCode = projectSubCode
    } else {
      if (projectSubCode.startsWith('-')) {
        projectFullCode = `${projectCode}${projectSubCode}`
      } else {
        projectFullCode = `${projectCode}-${projectSubCode}`
      }
    }
  }
  
  // ✅ Build all possible project code variations for matching (uppercase for comparison)
  const projectCodeUpper = projectCode.toUpperCase()
  const projectSubCodeUpper = projectSubCode.toUpperCase()
  const projectFullCodeUpper = projectFullCode.toUpperCase()
  
  const projectCodeVariations = new Set<string>()
  projectCodeVariations.add(projectCodeUpper)
  projectCodeVariations.add(projectFullCodeUpper) // ✅ PRIMARY: Add project_full_code
  
  if (projectSubCode) {
    projectCodeVariations.add(projectSubCodeUpper)
    // If sub-code contains project code, add it
    if (projectSubCodeUpper.includes(projectCodeUpper)) {
      projectCodeVariations.add(projectSubCodeUpper)
    } else {
      // Otherwise, combine them
      projectCodeVariations.add(`${projectCodeUpper}${projectSubCodeUpper}`)
      projectCodeVariations.add(`${projectCodeUpper}-${projectSubCodeUpper}`)
    }
  }
  
  // ✅ FIX: Helper function to extract project code from any source
  // Prioritize project_full_code for accurate matching
  const extractProjectCode = (item: any): string[] => {
    const codes: string[] = []
    const raw = (item as any).raw || {}
    
    // ✅ PRIORITY 1: Try project_full_code first (most accurate)
    const fullCodeSources = [
      item.project_full_code,
      (item as any)['Project Full Code'],
      raw['Project Full Code']
    ]
    
    // ✅ PRIORITY 2: Try project_code and project_sub_code separately (for building full code)
    const projectCode = item.project_code || (item as any)['Project Code'] || raw['Project Code']
    const projectSubCode = item.project_sub_code || (item as any)['Project Sub Code'] || raw['Project Sub Code']
    
    // Add project_full_code if available
    for (const source of fullCodeSources) {
      if (source) {
        const code = source.toString().trim()
        if (code) {
          codes.push(code)
          codes.push(code.toUpperCase())
        }
      }
    }
    
    // Add project_code if available
    if (projectCode) {
      const code = projectCode.toString().trim()
      if (code) {
        codes.push(code)
        codes.push(code.toUpperCase())
      }
    }
    
    // Build full code from project_code + project_sub_code if both exist
    if (projectCode && projectSubCode) {
      const codeStr = projectCode.toString().trim()
      const subCodeStr = projectSubCode.toString().trim()
      
      let builtFullCode = codeStr
      if (subCodeStr.toUpperCase().startsWith(codeStr.toUpperCase())) {
        builtFullCode = subCodeStr
      } else if (subCodeStr.startsWith('-')) {
        builtFullCode = `${codeStr}${subCodeStr}`
      } else {
        builtFullCode = `${codeStr}-${subCodeStr}`
      }
      
      if (builtFullCode) {
        codes.push(builtFullCode)
        codes.push(builtFullCode.toUpperCase())
      }
    }
    
    // Remove duplicates
    return Array.from(new Set(codes))
  }
  
  // ✅ FIXED: Helper function to check if codes match - EXACT SAME LOGIC as KPI page
  // This matches the logic in KPITracking.tsx filteredKPIsData filter
  const codesMatch = (itemCodes: string[], projectCodes: Set<string>): boolean => {
    for (const itemCode of itemCodes) {
      const itemCodeUpper = itemCode.toUpperCase().trim()
      
      // ✅ PRIORITY 1: Exact match on project_full_code (same as KPI page)
      if (projectFullCodeUpper && itemCodeUpper === projectFullCodeUpper) {
        return true
      }
      
      // ✅ PRIORITY 2: If selected project has sub_code (e.g., "P4110-P") and item has no sub_code (e.g., "P4110"),
      // match by project_code only (KPIs might not have sub_code in DB) - SAME AS KPI PAGE
      if (projectSubCode && projectCodeUpper && itemCodeUpper === projectCodeUpper) {
        // Extract item sub_code if exists
        const itemParts = itemCode.split('-')
        const itemCodeOnly = itemParts[0]?.toUpperCase().trim()
        const itemSubCode = itemParts.slice(1).join('-').toUpperCase().trim()
        
        // If project has sub_code and item has no sub_code, match by project_code
        if (!itemSubCode && itemCodeOnly === projectCodeUpper) {
          return true
        }
      }
      
      // ✅ PRIORITY 3: If both have sub_codes, build item full code and match (same as KPI page)
      if (projectSubCode) {
        const itemParts = itemCode.split('-')
        const itemCodeOnly = itemParts[0]?.toUpperCase().trim()
        const itemSubCode = itemParts.slice(1).join('-').toUpperCase().trim()
        
        if (itemCodeOnly && itemSubCode) {
          let builtItemFullCode = itemCodeOnly
          if (itemSubCode.toUpperCase().startsWith(itemCodeOnly)) {
            builtItemFullCode = itemSubCode
          } else if (itemSubCode.startsWith('-')) {
            builtItemFullCode = `${itemCodeOnly}${itemSubCode}`
          } else {
            builtItemFullCode = `${itemCodeOnly}-${itemSubCode}`
          }
          
          if (builtItemFullCode.toUpperCase() === projectFullCodeUpper) {
            return true
          }
        }
      }
      
      // ✅ PRIORITY 4: Match by project_code alone if current project has no sub_code (old data fallback)
      if (!projectSubCode && itemCodeUpper === projectCodeUpper) {
        return true
      }
    }
    return false
  }
  
  // ✅ DEBUG: Log actual data structure for first project only
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
    console.log(`🔍 DEBUG calculateProjectAnalytics for ${projectCode}:`, {
      project: {
        project_code: project.project_code,
        project_sub_code: project.project_sub_code,
        projectCode_normalized: projectCode,
        projectSubCode_normalized: projectSubCode,
        projectCodeVariations: Array.from(projectCodeVariations)
      },
      sampleActivity: allActivities[0] ? {
        project_code: allActivities[0].project_code,
        project_full_code: allActivities[0].project_full_code,
        rawProjectCode: (allActivities[0] as any).raw?.['Project Code'],
        rawProjectFullCode: (allActivities[0] as any).raw?.['Project Full Code'],
        'Project Code': (allActivities[0] as any)['Project Code'],
        'Project Full Code': (allActivities[0] as any)['Project Full Code']
      } : null,
      sampleKPI: allKPIs[0] ? {
        project_code: allKPIs[0].project_code,
        project_full_code: allKPIs[0].project_full_code,
        rawProjectCode: (allKPIs[0] as any).raw?.['Project Code'],
        rawProjectFullCode: (allKPIs[0] as any).raw?.['Project Full Code'],
        'Project Code': (allKPIs[0] as any)['Project Code'],
        'Project Full Code': (allKPIs[0] as any)['Project Full Code']
      } : null,
      allActivitiesCount: allActivities.length,
      allKPIsCount: allKPIs.length
    })
  }
  
  // ✅ FIX: Filter activities with improved matching using project_full_code
  const projectActivities = allActivities.filter(a => {
    const activityCodes = extractProjectCode(a)
    if (activityCodes.length === 0) return false
    
    const matches = codesMatch(activityCodes, projectCodeVariations)
    
    // ✅ Only log in development mode for debugging
    if (process.env.NODE_ENV === 'development' && allActivities.indexOf(a) < 2) {
      console.log(`🔍 [${projectCode}] Activity matching:`, {
        activityName: a.activity_name,
        activityCodes,
        projectFullCode,
        projectCodeVariations: Array.from(projectCodeVariations),
        matches
      })
    }
    
    return matches
  })
  
  // ✅ FIX: Filter KPIs with improved matching using project_full_code
  const projectKPIs = allKPIs.filter(k => {
    const kpiCodes = extractProjectCode(k)
    if (kpiCodes.length === 0) {
      // ✅ PERFORMANCE: Removed excessive logging - only log in development and very rarely
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.0001) {
        console.warn(`⚠️ [${projectCode}] KPI has no project codes:`, {
          kpiActivityName: k.activity_name,
          kpiInputType: k.input_type
        })
      }
      return false
    }
    
    const matches = codesMatch(kpiCodes, projectCodeVariations)
    
    // ✅ PERFORMANCE: Removed excessive logging - only log in development and very rarely (0.01%)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.0001) {
      console.log(`🔍 [${projectCode}] KPI matching:`, {
        kpiActivityName: k.activity_name,
        kpiInputType: k.input_type,
        kpiCodes,
        projectFullCode,
        projectCodeVariations: Array.from(projectCodeVariations),
        matches
      })
    }
    
    return matches
  })
  
  // ✅ PERFORMANCE: Removed excessive logging - only log in development and very rarely (0.01%)
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
    console.log(`📊 [${projectCode}] Matching results:`, {
      projectFullCode,
      matchedActivitiesCount: projectActivities.length,
      matchedKPIsCount: projectKPIs.length
    })
  }
  
  // BOQ Statistics
  const totalActivities = projectActivities.length
  const completedActivities = projectActivities.filter(a => a.activity_completed).length
  const onTrackActivities = projectActivities.filter(a => a.activity_on_track && !a.activity_completed).length
  const delayedActivities = projectActivities.filter(a => a.activity_delayed).length
  const notStartedActivities = projectActivities.filter(a => 
    !a.activity_completed && !a.activity_on_track && !a.activity_delayed
  ).length
  
  // ✅ NEW CONCEPTS: Calculate yesterday's date for filtering KPIs
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(23, 59, 59, 999) // End of yesterday
  
  // ✅ DEBUG: Log matching results
  if (process.env.NODE_ENV === 'development' && project === (allActivities[0]?.project_code || allKPIs[0]?.project_code ? undefined : project)) {
    console.log(`🔍 calculateProjectAnalytics for ${project.project_code}:`, {
      projectActivitiesCount: projectActivities.length,
      projectKPIsCount: projectKPIs.length,
      allActivitiesCount: allActivities.length,
      allKPIsCount: allKPIs.length
    })
  }
  
  // ✅ FIXED: Total Value = Sum of ALL Planned KPIs (not filtered by date)
  // Total Value = مجموع كل Planned Value من Planned KPIs بغض النظر عن التاريخ
  // ✅ IMPORTANT: يعتمد بالكامل على KPI فقط (لا BOQ Activities)
  // Will be set after Planned Value is calculated
  let totalValue = 0
  
  // ✅ NEW CONCEPT: Total Quantity = Sum of quantity of all project activities (BOQ)
  // OR Sum of all KPI Planned quantities (should be the same)
  let totalQuantityFromBOQ = 0
  for (const activity of projectActivities) {
    totalQuantityFromBOQ += activity.total_units || 0
  }
  
  // ✅ Also calculate Total Quantity from all KPI Planned
  let totalQuantityFromKPIPlanned = 0
  for (const kpi of projectKPIs) {
    const inputType = String(
      kpi.input_type || 
      (kpi as any)['Input Type'] || 
      (kpi as any).raw?.['Input Type'] || 
      (kpi as any).raw?.['input_type'] ||
      ''
    ).trim().toLowerCase()
    if (inputType === 'planned') {
      const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
      totalQuantityFromKPIPlanned += quantityValue
    }
  }
  
  // ✅ Use both methods: prefer BOQ if available, otherwise use KPI Planned
  const totalQuantity = totalQuantityFromBOQ > 0 ? totalQuantityFromBOQ : totalQuantityFromKPIPlanned
  
  // ✅ REWRITTEN: Calculate Financial Metrics using EXACT SAME LOGIC as KPI page
  // جميع القيم تعتمد بالكامل على KPI فقط - مثل صفحة KPI بالضبط
  
  // Initialize totals
  let totalPlannedValue = 0
  let totalEarnedValue = 0
  let totalPlannedQuantity = 0
  let totalEarnedQuantity = 0
  
  // Prepare KPI data for aggregation
  const kpiData: Record<string, KPIAggregate> = {}
  
  // ✅ STEP 1: Calculate Planned Value from ALL Planned KPIs (no date filter)
  // Planned Value = مجموع كل Planned Value من Planned KPIs بغض النظر عن التاريخ
  const plannedKPIs = projectKPIs.filter((k: any) => {
    const inputType = String(
      k.input_type || 
      k['Input Type'] || 
      (k as any).raw?.['Input Type'] || 
      (k as any).raw?.['input_type'] ||
      ''
    ).trim().toLowerCase()
    return inputType === 'planned'
  })
  
  plannedKPIs.forEach((kpi: any) => {
    const rawKPI = (kpi as any).raw || {}
    
    // ✅ PRIORITY 1: Use Planned Value directly from KPI (most accurate)
    const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
    if (plannedValue > 0) {
      totalPlannedValue += plannedValue
      return
    }
    
    // ✅ PRIORITY 2: Fallback to Value field if Planned Value is not available
    let kpiValue = 0
    
    // Try raw['Value'] (from database with capital V)
    if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
      const val = rawKPI['Value']
      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
    }
    
    // Try raw.value (from database with lowercase v)
    if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
      const val = rawKPI.value
      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
    }
    
    // Try k.value (direct property from ProcessedKPI)
    if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
      const val = kpi.value
      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
    }
    
    if (kpiValue > 0) {
      totalPlannedValue += kpiValue
    }
    
    // Also track quantity
    const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
    totalPlannedQuantity += quantityValue
  })
  
  // ✅ STEP 2: Calculate Earned Value from ALL Actual KPIs (no date filter)
  // Earned Value = مجموع Actual Value من كل Actual KPIs بغض النظر عن التاريخ
  const actualKPIs = projectKPIs.filter((k: any) => {
    const inputType = String(
      k.input_type || 
      k['Input Type'] || 
      (k as any).raw?.['Input Type'] || 
      (k as any).raw?.['input_type'] ||
      ''
    ).trim().toLowerCase()
    return inputType === 'actual'
  })
  
  actualKPIs.forEach((kpi: any) => {
    const rawKPI = (kpi as any).raw || {}
    const quantity = parseFloat(String(kpi.quantity || rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
    
    // Find matching activity for this KPI to get rate
    const kpiActivityName = String(kpi.activity_name || kpi['Activity Name'] || rawKPI['Activity Name'] || '').toLowerCase().trim()
    const kpiZone = String(kpi.zone || kpi['Zone'] || rawKPI['Zone'] || '').toString().trim().toLowerCase()
    
    let matchingActivity: BOQActivity | null = null
    for (const activity of projectActivities) {
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      const activityZone = (activity.zone_ref || activity.zone_number || '').toString().trim().toLowerCase()
      
      // Match activity name
      const nameMatch = kpiActivityName === activityName || 
                       kpiActivityName.includes(activityName) || 
                       activityName.includes(kpiActivityName)
      
      if (!nameMatch) continue
      
      // Match zone if available
      if (kpiZone && activityZone && kpiZone !== 'enabling division') {
        const zoneMatch = kpiZone === activityZone || 
                         kpiZone.includes(activityZone) || 
                         activityZone.includes(kpiZone)
        if (!zoneMatch) continue
      }
      
      matchingActivity = activity
      break
    }
    
    // ✅ PRIORITY 1: Calculate from Rate × Quantity (most accurate)
    let calculatedValue = 0
    if (matchingActivity && quantity > 0) {
      const rawActivity = (matchingActivity as any).raw || {}
      
      // Get rate from activity
      let rate = 0
      const totalValueFromActivity = matchingActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
      const totalUnits = matchingActivity.total_units || 
                      matchingActivity.planned_units ||
                      parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                      0
      
      if (totalUnits > 0 && totalValueFromActivity > 0) {
        rate = totalValueFromActivity / totalUnits
      } else {
        rate = matchingActivity.rate || 
              parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
              0
      }
      
      if (rate > 0 && quantity > 0) {
        calculatedValue = rate * quantity
        if (calculatedValue > 0) {
          totalEarnedValue += calculatedValue
          const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
          totalEarnedQuantity += quantityValue
          return // Move to next KPI
        }
      }
    }
    
    // ✅ PRIORITY 2: Use Value directly from KPI
    let kpiValue = 0
    
    // Try raw['Value'] (from database with capital V)
    if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
      const val = rawKPI['Value']
      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
    }
    
    // Try raw.value (from database with lowercase v)
    if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
      const val = rawKPI.value
      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
    }
    
    // Try k.value (direct property from ProcessedKPI)
    if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
      const val = kpi.value
      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
    }
    
    if (kpiValue > 0) {
      totalEarnedValue += kpiValue
      const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
      totalEarnedQuantity += quantityValue
      return // Move to next KPI
    }
    
    // ✅ PRIORITY 3: Use Actual Value directly from KPI (fallback)
    const actualValue = kpi.actual_value || parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, '')) || 0
    if (actualValue > 0) {
      totalEarnedValue += actualValue
      const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
      totalEarnedQuantity += quantityValue
      return
    }
    
    // Also track quantity even if no value found
    const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
    totalEarnedQuantity += quantityValue
  })
  
  // ✅ STEP 3: Total Value = Planned Value (both are sum of all Planned KPIs)
  // Total Value = Planned Value = مجموع كل Planned Value من Planned KPIs
  totalValue = totalPlannedValue
  
  // ✅ Planned Quantity and Earned Quantity are already calculated in the loops above
  // No additional processing needed
  
  // ✅ NEW CONCEPT: Remaining Work Value = Total Value – Earned Value
  const totalRemainingValue = totalValue - totalEarnedValue
  
  // ✅ NEW CONCEPT: Remaining Quantity = Total Quantity – Earned Quantity
  const totalRemainingQuantity = totalQuantity - totalEarnedQuantity
  
  // ✅ NEW CONCEPT: Variance = Earned Value – Planned Value
  const variance = totalEarnedValue - totalPlannedValue
  
  // ✅ NEW CONCEPT: Quantity Variance = Earned Quantity – Planned Quantity
  const quantityVariance = totalEarnedQuantity - totalPlannedQuantity
  
  // ✅ NEW CONCEPT: Actual Progress = (Earned Value / Total Value)
  const actualProgress = totalValue > 0 ? (totalEarnedValue / totalValue) * 100 : 0
  
  // ✅ NEW CONCEPT: Planned Progress = (Planned Value / Total Value)
  const plannedProgress = totalValue > 0 ? (totalPlannedValue / totalValue) * 100 : 0
  
  // ✅ DEBUG: Log calculated values for first project
  if (process.env.NODE_ENV === 'development' && projectActivities.length > 0) {
    console.log(`📊 calculateProjectAnalytics results for ${project.project_code}:`, {
      totalValue,
      totalPlannedValue,
      totalEarnedValue,
      actualProgress,
      plannedProgress,
      variance,
      projectActivitiesCount: projectActivities.length,
      projectKPIsCount: projectKPIs.length
    })
  }
  
  // ✅ NEW CONCEPT: Actual Quantity Progress = (Earned Quantity / Total Quantity)
  const actualQuantityProgress = totalQuantity > 0 ? (totalEarnedQuantity / totalQuantity) * 100 : 0
  
  // ✅ NEW CONCEPT: Planned Quantity Progress = (Planned Quantity / Total Quantity)
  const plannedQuantityProgress = totalQuantity > 0 ? (totalPlannedQuantity / totalQuantity) * 100 : 0
  
  // Legacy field for compatibility
  const financialProgress = totalPlannedValue > 0 ? (totalEarnedValue / totalPlannedValue) * 100 : 0
  
  // ✅ PERFORMANCE: Remove logging in production
  
  // ✅ Progress Metrics - Based on Earned Values (قيم الأنشطة المنجزة)
  // Calculate progress from earned values of activities
  // (kpiData already prepared above)
  
  // Calculate project progress using earned values
  const projectProgress = calculateProjectProgressFromKPI(projectActivities, kpiData)
  
  // Use the calculated progress for weighted and average
  const averageActivityProgress = projectProgress.progress
  const weightedProgress = projectProgress.progress
  
  // ✅ NEW CONCEPT: Overall Progress = Actual Progress (Earned Value / Total Value)
  // Use actualProgress which is calculated based on Total Value
  const overallProgress = actualProgress
  
  // KPI Metrics
  const totalKPIs = projectKPIs.length
  const plannedKPIsCount = projectKPIs.filter((k: any) => {
    const inputType = String(
      k.input_type || 
      k['Input Type'] || 
      (k as any).raw?.['Input Type'] || 
      (k as any).raw?.['input_type'] ||
      ''
    ).trim().toLowerCase()
    return inputType === 'planned'
  }).length
  const actualKPIsCount = projectKPIs.filter((k: any) => {
    const inputType = String(
      k.input_type || 
      k['Input Type'] || 
      (k as any).raw?.['Input Type'] || 
      (k as any).raw?.['input_type'] ||
      ''
    ).trim().toLowerCase()
    return inputType === 'actual'
  }).length
  
  // ✅ PERFORMANCE: Remove or reduce logging in production
  // Only log in development mode and very rarely
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
    console.log('📊 Progress Calculation (from KPIs):', {
      plannedKPIs: plannedKPIsCount,
      actualKPIs: actualKPIsCount,
      totalPlannedQuantity: projectProgress.totalProjectValue,
      totalActualQuantity: projectProgress.totalEarnedValue,
      kpiProgress: averageActivityProgress.toFixed(1) + '%',
      financialProgress: financialProgress.toFixed(1) + '%',
      weightedProgress: weightedProgress.toFixed(1) + '%',
      overallProgress: overallProgress.toFixed(1) + '%'
    })
  }
  const completedKPIs = projectKPIs.filter(k => k.status === 'completed').length
  const onTrackKPIs = projectKPIs.filter(k => k.status === 'on_track').length
  const delayedKPIs = projectKPIs.filter(k => k.status === 'delayed').length
  const atRiskKPIs = projectKPIs.filter(k => k.status === 'at_risk').length
  
  // Time Metrics
  const activitiesWithDeadline = projectActivities.filter(a => a.deadline)
  const now = new Date()
  const activitiesOnSchedule = activitiesWithDeadline.filter(a => {
    if (!a.deadline) return false
    const deadline = new Date(a.deadline)
    const progress = a.activity_progress_percentage || 0
    return progress >= 80 || deadline > now
  }).length
  
  const activitiesBehindSchedule = activitiesWithDeadline.filter(a => {
    if (!a.deadline) return false
    const deadline = new Date(a.deadline)
    const progress = a.activity_progress_percentage || 0
    return progress < 80 && deadline < now
  }).length
  
  const averageDelay = totalActivities > 0
    ? projectActivities.reduce((sum, a) => sum + (a.delay_percentage || 0), 0) / totalActivities
    : 0
  
  // Project Health Assessment
  let projectHealth: 'excellent' | 'good' | 'warning' | 'critical'
  if (overallProgress >= 90 && delayedActivities === 0) {
    projectHealth = 'excellent'
  } else if (overallProgress >= 70 && delayedActivities <= totalActivities * 0.2) {
    projectHealth = 'good'
  } else if (overallProgress >= 50 || delayedActivities <= totalActivities * 0.4) {
    projectHealth = 'warning'
  } else {
    projectHealth = 'critical'
  }
  
  // Risk Level Assessment
  let riskLevel: 'low' | 'medium' | 'high' | 'critical'
  if (delayedActivities === 0 && averageDelay < 5) {
    riskLevel = 'low'
  } else if (delayedActivities <= totalActivities * 0.2 && averageDelay < 15) {
    riskLevel = 'medium'
  } else if (delayedActivities <= totalActivities * 0.4 && averageDelay < 30) {
    riskLevel = 'high'
  } else {
    riskLevel = 'critical'
  }
  
  // ✅ NEW CONCEPT: Contract Value = Entered manually during project creation
  const totalContractValue = project.contract_amount || 0
  
  // ✅ Calculate Variance Percentage based on new concepts
  // Variance Percentage = ((Actual Progress - Planned Progress) / Planned Progress) × 100
  // Actual Progress = actualProgress (Earned Value / Total Value)
  // Planned Progress = plannedProgress (Planned Value / Total Value)
  let variancePercentage = 0
  if (plannedProgress > 0) {
    variancePercentage = ((actualProgress - plannedProgress) / plannedProgress) * 100
  } else if (actualProgress > 0) {
    // If planned is 0 but actual > 0, we're ahead
    variancePercentage = 100
  }
  
  // ✅ Determine Project Status based on Variance Percentage
  // Project Ahead: Variance Percentage > 5%
  // Project On Track: Variance Percentage between -5% to 5%
  // Project Delayed: Variance Percentage < -5%
  let projectStatus: 'ahead' | 'on_track' | 'delayed'
  if (variancePercentage > 5) {
    projectStatus = 'ahead'
  } else if (variancePercentage >= -5 && variancePercentage <= 5) {
    projectStatus = 'on_track'
  } else {
    projectStatus = 'delayed'
  }
  
  // ✅ PERFORMANCE: Remove logging in production
  // Only log in development mode and very rarely
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
    console.log('💵 New Concepts:', {
      contractValue: totalContractValue,
      totalValue,
      totalPlannedValue,
      totalEarnedValue,
      variance,
      actualProgress,
      plannedProgress,
      totalQuantity,
      totalPlannedQuantity,
      totalEarnedQuantity,
      quantityVariance,
      actualQuantityProgress,
      plannedQuantityProgress
    })
  }
  
  return {
    project,
    
    // BOQ Statistics
    totalActivities,
    completedActivities,
    onTrackActivities,
    delayedActivities,
    notStartedActivities,
    
    // Financial Metrics - New Concepts
    totalContractValue,
    totalValue,
    totalPlannedValue,
    totalEarnedValue,
    totalRemainingValue,
    variance,
    actualProgress,
    plannedProgress,
    financialProgress,
    
    // Quantity Metrics
    totalQuantity,
    totalPlannedQuantity,
    totalEarnedQuantity,
    totalRemainingQuantity,
    quantityVariance,
    actualQuantityProgress,
    plannedQuantityProgress,
    
    // Progress Metrics
    overallProgress,
    weightedProgress,
    averageActivityProgress,
    
    // KPI Metrics
    totalKPIs,
    plannedKPIs: plannedKPIsCount,
    actualKPIs: actualKPIsCount,
    completedKPIs,
    onTrackKPIs,
    delayedKPIs,
    atRiskKPIs,
    
    // Time Metrics
    activitiesOnSchedule,
    activitiesBehindSchedule,
    averageDelay,
    
    // Related Data
    activities: projectActivities,
    kpis: projectKPIs,
    
    // Status Summary
    projectHealth,
    riskLevel,
    
    // Variance Metrics
    variancePercentage,
    projectStatus
  }
}

/**
 * Get all projects with their analytics
 */
export function getAllProjectsAnalytics(
  projects: Project[],
  allActivities: BOQActivity[],
  allKPIs: any[]
): ProjectAnalytics[] {
  return projects.map(project => 
    calculateProjectAnalytics(project, allActivities, allKPIs)
  )
}

/**
 * Get project by code with analytics
 */
export function getProjectAnalyticsByCode(
  projectCode: string,
  projects: Project[],
  allActivities: BOQActivity[],
  allKPIs: any[]
): ProjectAnalytics | null {
  const project = projects.find(p => p.project_code === projectCode)
  if (!project) return null
  
  return calculateProjectAnalytics(project, allActivities, allKPIs)
}

/**
 * Get top performing projects
 */
export function getTopPerformingProjects(
  projects: Project[],
  allActivities: BOQActivity[],
  allKPIs: any[],
  limit: number = 5
): ProjectAnalytics[] {
  const analytics = getAllProjectsAnalytics(projects, allActivities, allKPIs)
  
  return analytics
    .sort((a, b) => b.overallProgress - a.overallProgress)
    .slice(0, limit)
}

/**
 * Get projects at risk
 */
export function getProjectsAtRisk(
  projects: Project[],
  allActivities: BOQActivity[],
  allKPIs: any[]
): ProjectAnalytics[] {
  const analytics = getAllProjectsAnalytics(projects, allActivities, allKPIs)
  
  return analytics.filter(a => 
    a.riskLevel === 'high' || a.riskLevel === 'critical'
  )
}

/**
 * Get project completion summary
 */
export function getProjectCompletionSummary(
  analytics: ProjectAnalytics
): {
  label: string
  value: number
  color: string
  icon: string
}[] {
  return [
    {
      label: 'Completed',
      value: analytics.completedActivities,
      color: 'text-green-600',
      icon: 'CheckCircle'
    },
    {
      label: 'On Track',
      value: analytics.onTrackActivities,
      color: 'text-blue-600',
      icon: 'Clock'
    },
    {
      label: 'Delayed',
      value: analytics.delayedActivities,
      color: 'text-red-600',
      icon: 'AlertTriangle'
    },
    {
      label: 'Not Started',
      value: analytics.notStartedActivities,
      color: 'text-gray-600',
      icon: 'Circle'
    }
  ]
}


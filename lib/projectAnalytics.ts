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
    return createEmptyAnalytics(project)
  }
  
  // ✅ SIMPLIFIED: Pre-calculate project codes once
  const projectCode = (project.project_code || '').toString().trim().toUpperCase()
  const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
  
  // ✅ Build all possible project code variations for matching
  const projectCodeVariations = new Set<string>()
  projectCodeVariations.add(projectCode)
  
  if (projectSubCode) {
    projectCodeVariations.add(projectSubCode)
    // If sub-code contains project code, add it
    if (projectSubCode.includes(projectCode)) {
      projectCodeVariations.add(projectSubCode)
    } else {
      // Otherwise, combine them
      projectCodeVariations.add(`${projectCode}${projectSubCode}`)
      projectCodeVariations.add(`${projectCode}-${projectSubCode}`)
    }
  }
  
  // Helper function to extract project code from any source
  const extractProjectCode = (item: any): string[] => {
    const codes: string[] = []
    const raw = (item as any).raw || {}
    
    // Try all possible sources
    const sources = [
      item.project_code,
      item.project_full_code,
      (item as any)['Project Code'],
      (item as any)['Project Full Code'],
      raw['Project Code'],
      raw['Project Full Code']
    ]
    
    for (const source of sources) {
      if (source) {
        const code = source.toString().trim().toUpperCase()
        if (code) {
          codes.push(code)
        }
      }
    }
    
    return codes
  }
  
  // Helper function to check if codes match
  const codesMatch = (itemCodes: string[], projectCodes: Set<string>): boolean => {
    const projectCodesArray = Array.from(projectCodes)
    
    for (const itemCode of itemCodes) {
      // Direct match
      if (projectCodes.has(itemCode)) return true
      
      // Check if item code contains any project code
      for (const projCode of projectCodesArray) {
        if (itemCode.includes(projCode) || projCode.includes(itemCode)) {
          return true
        }
        // Check if item code starts with project code (e.g., P9999 matches P9999-01)
        if (itemCode.startsWith(projCode) || projCode.startsWith(itemCode)) {
          return true
        }
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
  
  // ✅ SIMPLIFIED: Filter activities with improved matching
  const projectActivities = allActivities.filter(a => {
    const activityCodes = extractProjectCode(a)
    if (activityCodes.length === 0) return false
    
    return codesMatch(activityCodes, projectCodeVariations)
  })
  
  // ✅ SIMPLIFIED: Filter KPIs with improved matching
  const projectKPIs = allKPIs.filter(k => {
    const kpiCodes = extractProjectCode(k)
    if (kpiCodes.length === 0) return false
    
    return codesMatch(kpiCodes, projectCodeVariations)
  })
  
  // ✅ DEBUG: Always log matching results for ALL projects to diagnose issues
  // Log for first few projects to see what's happening
  const isFirstProject = allActivities.length > 0 && allActivities[0] && 
    ((allActivities[0].project_code || (allActivities[0] as any)['Project Code'] || (allActivities[0] as any).raw?.['Project Code'] || '').toString().trim().toUpperCase() === projectCode.toUpperCase())
  
  // ✅ DEBUG: Log matching results for first few projects
  const shouldLog = projectCode === 'P9999' || projectCode === 'P8888' || projectCode === 'P5096' || projectActivities.length > 0 || projectKPIs.length > 0
  if (shouldLog) {
    // Sample first few activities and KPIs to see their actual codes
    const sampleActivities = allActivities.slice(0, 3).map((a: any) => {
      const codes = extractProjectCode(a)
      return {
        codes,
        project_code: a.project_code,
        project_full_code: a.project_full_code,
        rawProjectCode: (a as any).raw?.['Project Code'],
        rawProjectFullCode: (a as any).raw?.['Project Full Code'],
        'Project Code': (a as any)['Project Code'],
        'Project Full Code': (a as any)['Project Full Code'],
        activity_name: a.activity_name
      }
    })
    
    const sampleKPIs = allKPIs.slice(0, 3).map((k: any) => {
      const codes = extractProjectCode(k)
      return {
        codes,
        project_code: k.project_code,
        project_full_code: k.project_full_code,
        rawProjectCode: (k as any).raw?.['Project Code'],
        rawProjectFullCode: (k as any).raw?.['Project Full Code'],
        'Project Code': (k as any)['Project Code'],
        'Project Full Code': (k as any)['Project Full Code'],
        activity_name: k.activity_name,
        input_type: k.input_type
      }
    })
    
    console.log(`🔍 calculateProjectAnalytics [${projectCode}]:`, {
      projectCode,
      projectSubCode,
      projectCodeVariations: Array.from(projectCodeVariations),
      matchedActivitiesCount: projectActivities.length,
      matchedKPIsCount: projectKPIs.length,
      allActivitiesCount: allActivities.length,
      allKPIsCount: allKPIs.length,
      sampleActivities,
      sampleKPIs,
      matchedActivities: projectActivities.slice(0, 2).map((a: any) => ({
        codes: extractProjectCode(a),
        activity_name: a.activity_name
      })),
      matchedKPIs: projectKPIs.slice(0, 2).map((k: any) => ({
        codes: extractProjectCode(k),
        activity_name: k.activity_name,
        input_type: k.input_type
      }))
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
  
  // ✅ NEW CONCEPT: Total Value = Sum of value of all project activities (BOQ)
  // OR Sum of all KPI Planned for the project (should be the same)
  let totalValueFromBOQ = 0
  for (const activity of projectActivities) {
    totalValueFromBOQ += activity.total_value || 0
  }
  
  // ✅ NEW CONCEPT: Also calculate Total Value from all KPI Planned (not filtered by date)
  let totalValueFromKPIPlanned = 0
  for (const kpi of projectKPIs) {
    if (kpi.input_type === 'Planned') {
      // Find the related activity to get the rate
      const relatedActivity = projectActivities.find(a => {
        const activityMatch = a.activity_name === kpi.activity_name
        if (!activityMatch) return false
        const kpiProjectCode = kpi.project_code || kpi.project_full_code
        return (
          a.project_code === kpiProjectCode ||
          a.project_full_code === kpiProjectCode ||
          a.project_code === kpi.project_full_code ||
          a.project_full_code === kpi.project_full_code
        )
      })
      
      let financialValue = 0
      if (relatedActivity) {
        const activityRate = calculateActivityRate(relatedActivity)
        const rate = activityRate.rate
        const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
        if (rate > 0) {
          financialValue = quantityValue * rate
        } else {
          financialValue = parseFloat(kpi.value?.toString() || '0') || 0
        }
      } else {
        financialValue = parseFloat(kpi.value?.toString() || '0') || 0
      }
      totalValueFromKPIPlanned += financialValue
    }
  }
  
  // ✅ Use both methods: prefer BOQ if available, otherwise use KPI Planned
  // If both are available, they should be the same (use BOQ as primary)
  const totalValue = totalValueFromBOQ > 0 ? totalValueFromBOQ : totalValueFromKPIPlanned
  
  // ✅ NEW CONCEPT: Total Quantity = Sum of quantity of all project activities (BOQ)
  // OR Sum of all KPI Planned quantities (should be the same)
  let totalQuantityFromBOQ = 0
  for (const activity of projectActivities) {
    totalQuantityFromBOQ += activity.total_units || 0
  }
  
  // ✅ Also calculate Total Quantity from all KPI Planned
  let totalQuantityFromKPIPlanned = 0
  for (const kpi of projectKPIs) {
    if (kpi.input_type === 'Planned') {
      const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
      totalQuantityFromKPIPlanned += quantityValue
    }
  }
  
  // ✅ Use both methods: prefer BOQ if available, otherwise use KPI Planned
  const totalQuantity = totalQuantityFromBOQ > 0 ? totalQuantityFromBOQ : totalQuantityFromKPIPlanned
  
  // ✅ Financial Metrics - Using correct business logic with KPI data
  // Calculate using Rate × Units logic with KPI actuals
  let totalPlannedValue = 0
  let totalEarnedValue = 0
  let totalPlannedQuantity = 0
  let totalEarnedQuantity = 0
  
  // Prepare KPI data for more accurate calculation
  const kpiData: Record<string, KPIAggregate> = {}
  let totalPlannedValueFromKPIs = 0
  let totalEarnedValueFromKPIs = 0
  let totalPlannedQuantityFromKPIs = 0
  let totalEarnedQuantityFromKPIs = 0
  
  // Group KPI data by activity - Filter by date (till yesterday)
  for (const kpi of projectKPIs) {
    // ✅ NEW CONCEPT: Filter KPIs till yesterday
    const kpiDate = kpi.activity_date || kpi.target_date || kpi.created_at
    if (kpiDate) {
      const kpiDateObj = new Date(kpiDate)
      if (kpiDateObj > yesterday) {
        // Skip KPIs after yesterday
        continue
      }
    }
    // Use project_full_code if available, otherwise use project_code
    const projectKey = kpi.project_full_code || kpi.project_code || project.project_code
    const key = `${projectKey}-${kpi.activity_name}`
    if (!kpiData[key]) {
      kpiData[key] = {
        totalActual: 0,
        totalPlanned: 0,
        totalActualValue: 0,
        totalPlannedValue: 0
      }
    }
    
    const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
    
    // ✅ FIXED: Always calculate Planned Value = Rate × Quantity (not from kpi.value)
    // Find the related activity to get the rate
    const relatedActivity = projectActivities.find(a => {
      // Match by activity name and project code
      const activityMatch = a.activity_name === kpi.activity_name
      if (!activityMatch) return false
      
      // Match project codes - support both project_code and project_full_code
      const kpiProjectCode = kpi.project_code || kpi.project_full_code
      return (
        a.project_code === kpiProjectCode ||
        a.project_full_code === kpiProjectCode ||
        a.project_code === kpi.project_full_code ||
        a.project_full_code === kpi.project_full_code
      )
    })
    
    let financialValue = 0
    if (relatedActivity) {
      // ✅ Use calculateActivityRate for consistent rate calculation
      const activityRate = calculateActivityRate(relatedActivity)
      const rate = activityRate.rate
      
      // Calculate value = rate × quantity
      if (rate > 0) {
        financialValue = quantityValue * rate
      } else {
        // Last fallback: use existing value if rate not found
        financialValue = parseFloat(kpi.value?.toString() || '0') || 0
      }
    } else {
      // If no activity found, use existing value as fallback
      financialValue = parseFloat(kpi.value?.toString() || '0') || 0
    }

    if (kpi.input_type === 'Actual') {
      kpiData[key].totalActual += quantityValue
      kpiData[key].totalActualValue += financialValue
      totalEarnedValueFromKPIs += financialValue
      totalEarnedQuantityFromKPIs += quantityValue
    } else if (kpi.input_type === 'Planned') {
      kpiData[key].totalPlanned += quantityValue
      kpiData[key].totalPlannedValue += financialValue
      totalPlannedValueFromKPIs += financialValue
      totalPlannedQuantityFromKPIs += quantityValue
    }
  }
  
  // ✅ NEW CONCEPT: Planned Value = Sum of KPI Planned till yesterday only
  // This is already calculated in the loop above (filtered by date <= yesterday)
  // Use KPIs if available (most accurate), otherwise calculate from BOQ activities
  if (totalPlannedValueFromKPIs > 0) {
    totalPlannedValue = totalPlannedValueFromKPIs
  } else {
    // Fallback: Calculate from BOQ activities if no KPIs (but this is less accurate)
    for (const activity of projectActivities) {
      const activityRate = calculateActivityRate(activity)
      const plannedUnits = activity.planned_units || 0
      const plannedValue = plannedUnits * activityRate.rate
      totalPlannedValue += plannedValue
    }
  }
  
  // ✅ NEW CONCEPT: Actual Value (Earned Value) = Sum of KPI Actual till yesterday only
  // This is already calculated in the loop above (filtered by date <= yesterday)
  // Use KPIs if available (most accurate), otherwise calculate from BOQ activities
  if (totalEarnedValueFromKPIs > 0) {
    totalEarnedValue = totalEarnedValueFromKPIs
  } else {
    // Fallback: Calculate from BOQ activities if no KPIs (but this is less accurate)
    for (const activity of projectActivities) {
      const activityRate = calculateActivityRate(activity)
      const actualUnits = activity.actual_units || 0
      const earnedValue = actualUnits * activityRate.rate
      totalEarnedValue += earnedValue
    }
  }
  
  // ✅ NEW CONCEPT: Planned Quantity = Sum of planned quantities till yesterday only (from KPI Planned)
  // This is already calculated in the loop above (filtered by date <= yesterday)
  if (totalPlannedQuantityFromKPIs > 0) {
    totalPlannedQuantity = totalPlannedQuantityFromKPIs
  } else {
    // Fallback: Calculate from BOQ activities (but this is less accurate)
    for (const activity of projectActivities) {
      totalPlannedQuantity += activity.planned_units || 0
    }
  }
  
  // ✅ NEW CONCEPT: Earned Quantity = Sum of actual quantities till yesterday only (from KPI Actual)
  // This is already calculated in the loop above (filtered by date <= yesterday)
  if (totalEarnedQuantityFromKPIs > 0) {
    totalEarnedQuantity = totalEarnedQuantityFromKPIs
  } else {
    // Fallback: Calculate from BOQ activities (but this is less accurate)
    for (const activity of projectActivities) {
      totalEarnedQuantity += activity.actual_units || 0
    }
  }
  
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
      totalValueFromBOQ,
      totalValueFromKPIPlanned,
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
  const plannedKPIs = projectKPIs.filter(k => k.input_type === 'Planned').length
  const actualKPIs = projectKPIs.filter(k => k.input_type === 'Actual').length
  
  // ✅ PERFORMANCE: Remove or reduce logging in production
  // Only log in development mode and very rarely
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
    console.log('📊 Progress Calculation (from KPIs):', {
      plannedKPIs: plannedKPIs,
      actualKPIs: actualKPIs,
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
    plannedKPIs,
    actualKPIs,
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


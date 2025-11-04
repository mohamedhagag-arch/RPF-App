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
  
  // Financial Metrics
  totalContractValue: number
  totalPlannedValue: number
  totalEarnedValue: number
  totalRemainingValue: number
  financialProgress: number
  
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
    
    // Financial Metrics
    totalContractValue: project.contract_amount || 0,
    totalPlannedValue: 0,
    totalEarnedValue: 0,
    totalRemainingValue: 0,
    financialProgress: 0,
    
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
    riskLevel: 'low'
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
  
  // ✅ PERFORMANCE: Pre-calculate project codes once
  const projectCode = project.project_code || ''
  const projectSubCode = project.project_sub_code || ''
  const fullCode = `${projectCode}${projectSubCode}`
  
  // ✅ PERFORMANCE: Filter activities with optimized matching
  const projectActivities = allActivities.filter(a => {
    if (!a.project_code && !a.project_full_code) return false
    
    // Direct project code match
    if (a.project_code === projectCode) return true
    
    // Project full code starts with project code (e.g., P5067 matches P5067-01)
    if (a.project_full_code?.startsWith(projectCode)) return true
    
    // Exact full code match (if project has sub-code)
    if (fullCode && a.project_full_code === fullCode) return true
    
    return false
  })
  
  // ✅ PERFORMANCE: Filter KPIs with optimized matching
  const projectKPIs = allKPIs.filter(k => {
    if (!k.project_code && !k.project_full_code) return false
    
    // Direct project code match
    if (k.project_code === projectCode) return true
    
    // Project full code starts with project code (e.g., P5067 matches P5067-01, P5067-02, etc.)
    if (k.project_full_code?.startsWith(projectCode)) return true
    
    // Exact full code match (if project has sub-code)
    if (fullCode && k.project_full_code === fullCode) return true
    
    return false
  })
  
  // ✅ PERFORMANCE: Remove logging in production
  
  // BOQ Statistics
  const totalActivities = projectActivities.length
  const completedActivities = projectActivities.filter(a => a.activity_completed).length
  const onTrackActivities = projectActivities.filter(a => a.activity_on_track && !a.activity_completed).length
  const delayedActivities = projectActivities.filter(a => a.activity_delayed).length
  const notStartedActivities = projectActivities.filter(a => 
    !a.activity_completed && !a.activity_on_track && !a.activity_delayed
  ).length
  
  // ✅ Financial Metrics - Using correct business logic with KPI data
  // Calculate using Rate × Units logic with KPI actuals
  let totalPlannedValue = 0
  let totalEarnedValue = 0
  
  // Prepare KPI data for more accurate calculation
  const kpiData: Record<string, KPIAggregate> = {}
  let totalPlannedValueFromKPIs = 0
  let totalEarnedValueFromKPIs = 0
  
  // Group KPI data by activity
  for (const kpi of projectKPIs) {
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
    } else if (kpi.input_type === 'Planned') {
      kpiData[key].totalPlanned += quantityValue
      kpiData[key].totalPlannedValue += financialValue
      totalPlannedValueFromKPIs += financialValue
    }
  }
  
  // ✅ FIXED: Calculate Planned Value from ALL BOQ activities
  // Planned Value = القيمة الكلية المخططة من جميع الأنشطة في BOQ (بغض النظر عن KPIs)
  let totalPlannedValueFromAllActivities = 0
  for (const activity of projectActivities) {
    let activityPlannedValue = 0
    
    // ✅ Use calculateActivityRate for consistent calculation
    const activityRate = calculateActivityRate(activity)
    const rate = activityRate.rate
    
    // Calculate planned value = rate × planned units
    const plannedUnits = activity.planned_units || 0
    if (rate > 0 && plannedUnits > 0) {
      activityPlannedValue = plannedUnits * rate
    } else if (activity.planned_value && activity.planned_value > 0) {
      // Use planned_value directly if available
      activityPlannedValue = activity.planned_value
    } else if (activity.total_value && activity.total_value > 0) {
      // Fallback: use total_value
      activityPlannedValue = activity.total_value
    }
    
    totalPlannedValueFromAllActivities += activityPlannedValue
  }
  
  // ✅ FIXED: Planned Value = مجموع Planned Values من جميع الأنشطة في BOQ
  // Always use all BOQ activities to ensure complete coverage
  totalPlannedValue = totalPlannedValueFromAllActivities
  
  // ✅ Calculate Earned Value from KPIs (more accurate), fallback to BOQ if no KPIs
  if (totalEarnedValueFromKPIs > 0) {
    // Use KPIs if available (most accurate)
    totalEarnedValue = totalEarnedValueFromKPIs
  } else {
    // Calculate from BOQ activities if no KPIs
    for (const activity of projectActivities) {
      const activityRate = calculateActivityRate(activity)
      const actualUnits = activity.actual_units || 0
      const earnedValue = actualUnits * activityRate.rate
      totalEarnedValue += earnedValue
    }
  }
  
  const totalRemainingValue = totalPlannedValue - totalEarnedValue
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
  
  // ✅ FIXED: Overall Progress = (Earned Value / Contract Value) × 100
  // Calculate overall progress based on contract value (will be defined later)
  // We'll use project.contract_amount directly here
  const contractAmount = project.contract_amount || 0
  const overallProgress = contractAmount > 0 ? (totalEarnedValue / contractAmount) * 100 : projectProgress.progress
  
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
  
  // ✅ FIXED: Contract Value should always show the original contract amount entered when creating the project
  // This is the total contract value that the user manually entered
  const totalContractValue = project.contract_amount || 0
  
  // ✅ PERFORMANCE: Remove logging in production
  // Only log in development mode and very rarely
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
    console.log('💵 Contract Value:', {
      fromProject: project.contract_amount,
      fromAllActivities: totalPlannedValueFromAllActivities,
      fromKPIs: totalPlannedValue,
      final: totalContractValue,
      note: 'Contract Value always uses project.contract_amount (original value entered when creating project)'
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
    
    // Financial Metrics
    totalContractValue,
    totalPlannedValue,
    totalEarnedValue,
    totalRemainingValue,
    financialProgress,
    
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
    riskLevel
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


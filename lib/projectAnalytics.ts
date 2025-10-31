/**
 * Project Analytics and Smart Linking
 * Links Projects with BOQ Activities and KPI Records
 * Calculates comprehensive statistics and progress metrics
 */

import { Project, BOQActivity, KPIRecord } from './supabase'
import { calculateProjectProgressFromValues, calculateProjectProgressFromKPI } from './boqValueCalculator'

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
  // تقليل التسجيل لتجنب البطء
  if (Math.random() < 0.1) { // تسجيل 10% فقط من المشاريع
    console.log('🔍 Calculating analytics for project:', project.project_code)
  }
  
  // 🔧 PERFORMANCE: Early return if no data
  if (allActivities.length === 0 && allKPIs.length === 0) {
    return createEmptyAnalytics(project)
  }
  
  // Filter activities for this project by project_code
  // Match by Project Code OR if Project Full Code starts with Project Code
  const projectActivities = allActivities.filter(a => {
    if (!a.project_code && !a.project_full_code) return false
    
    // Direct project code match
    if (a.project_code === project.project_code) return true
    
    // Project full code starts with project code (e.g., P5067 matches P5067-01)
    if (a.project_full_code?.startsWith(project.project_code)) return true
    
    // Exact full code match (if project has sub-code)
    const fullCode = `${project.project_code}${project.project_sub_code || ''}`
    if (a.project_full_code === fullCode) return true
    
    return false
  })
  
  // Filter KPIs for this project
  const projectKPIs = allKPIs.filter(k => {
    if (!k.project_code && !k.project_full_code) return false
    
    // Direct project code match
    if (k.project_code === project.project_code) return true
    
    // Project full code starts with project code (e.g., P5067 matches P5067-01, P5067-02, etc.)
    if (k.project_full_code?.startsWith(project.project_code)) return true
    
    // Exact full code match (if project has sub-code)
    const fullCode = `${project.project_code}${project.project_sub_code || ''}`
    if (k.project_full_code === fullCode) return true
    
    return false
  })
  
  // تقليل التسجيل لتجنب البطء
  if (Math.random() < 0.05) { // تسجيل 5% فقط من المشاريع
    console.log(`✅ Filtered for ${project.project_code}:`, {
      activities: projectActivities.length,
      kpis: projectKPIs.length
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
    const key = `${kpi.project_code}-${kpi.activity_name}`
    if (!kpiData[key]) {
      kpiData[key] = {
        totalActual: 0,
        totalPlanned: 0,
        totalActualValue: 0,
        totalPlannedValue: 0
      }
    }
    
    const quantityValue = parseFloat(kpi.quantity?.toString() || '0') || 0
    let financialValue = parseFloat(kpi.value?.toString() || '0') || 0
    
    // ✅ If Value is missing or zero, calculate from Quantity × Rate
    // This fixes the issue where newly created KPIs don't have Value field
    if (!financialValue || financialValue === 0) {
      // Find the related activity to get the rate
      const relatedActivity = projectActivities.find(a => 
        a.activity_name === kpi.activity_name && 
        (a.project_code === kpi.project_code || a.project_full_code === kpi.project_full_code)
      )
      
      if (relatedActivity && relatedActivity.rate && relatedActivity.rate > 0) {
        financialValue = quantityValue * relatedActivity.rate
      } else if (relatedActivity && relatedActivity.total_value && relatedActivity.total_units && relatedActivity.total_units > 0) {
        // Calculate rate from activity total
        const rate = relatedActivity.total_value / relatedActivity.total_units
        financialValue = quantityValue * rate
      } else {
        // Last fallback: use quantity as value (1:1 ratio)
        financialValue = quantityValue
      }
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
  
  for (const activity of projectActivities) {
    // Get KPI data for this activity
    const kpiKey = `${activity.project_code}-${activity.activity_name}`
    const kpiInfo: KPIAggregate = kpiData[kpiKey] || {
      totalActual: 0,
      totalPlanned: 0,
      totalActualValue: 0,
      totalPlannedValue: 0
    }
    
    // Use KPI actual if available, otherwise use BOQ actual
    const actualUnits = kpiInfo.totalActual > 0 ? kpiInfo.totalActual : (activity.actual_units || 0)
    const plannedUnits = kpiInfo.totalPlanned > 0 ? kpiInfo.totalPlanned : (activity.planned_units || 0)
    
    let rate = 0
    if ((activity.total_units || 0) > 0 && (activity.total_value || 0)) {
      rate = (activity.total_value || 0) / (activity.total_units || 0)
    } else if ((activity.planned_units || 0) > 0 && (activity.total_value || 0)) {
      rate = (activity.total_value || 0) / (activity.planned_units || 0)
    } else if (kpiInfo.totalPlannedValue > 0 && kpiInfo.totalPlanned > 0) {
      rate = kpiInfo.totalPlannedValue / kpiInfo.totalPlanned
    }
    
    let plannedValue = plannedUnits * rate
    let earnedValue = actualUnits * rate

    if (kpiInfo.totalPlannedValue > 0) {
      plannedValue = kpiInfo.totalPlannedValue
    }

    if (kpiInfo.totalActualValue > 0) {
      earnedValue = kpiInfo.totalActualValue
    }
    
    totalPlannedValue += plannedValue
    totalEarnedValue += earnedValue
  }
  
  if (totalPlannedValueFromKPIs > 0) {
    totalPlannedValue = totalPlannedValueFromKPIs
  }
  if (totalEarnedValueFromKPIs > 0) {
    totalEarnedValue = totalEarnedValueFromKPIs
  }
  
  const totalRemainingValue = totalPlannedValue - totalEarnedValue
  const financialProgress = totalPlannedValue > 0 ? (totalEarnedValue / totalPlannedValue) * 100 : 0
  
  // تقليل التسجيل لتجنب البطء
  if (Math.random() < 0.02) { // تسجيل 2% فقط من المشاريع
    console.log('💰 Financial Metrics:', {
      totalPlannedValue,
      totalEarnedValue,
      totalRemainingValue,
      financialProgress: financialProgress.toFixed(1) + '%'
    })
  }
  
  // ✅ Progress Metrics - Based on Earned Values (قيم الأنشطة المنجزة)
  // Calculate progress from earned values of activities
  // (kpiData already prepared above)
  
  // Calculate project progress using earned values
  const projectProgress = calculateProjectProgressFromKPI(projectActivities, kpiData)
  
  // Use the calculated progress
  const averageActivityProgress = projectProgress.progress
  const weightedProgress = projectProgress.progress
  const overallProgress = projectProgress.progress
  
  // KPI Metrics
  const totalKPIs = projectKPIs.length
  const plannedKPIs = projectKPIs.filter(k => k.input_type === 'Planned').length
  const actualKPIs = projectKPIs.filter(k => k.input_type === 'Actual').length
  
  // تقليل التسجيل لتجنب البطء
  if (Math.random() < 0.02) { // تسجيل 2% فقط من المشاريع
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
  
  // ✅ Use contract_amount if available, otherwise use sum of planned values
  const totalContractValue = project.contract_amount || totalPlannedValue || 0
  
  console.log('💵 Contract Value:', {
    fromProject: project.contract_amount,
    fromBOQ: totalPlannedValue,
    final: totalContractValue
  })
  
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


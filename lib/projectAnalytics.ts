/**
 * Project Analytics and Smart Linking
 * Links Projects with BOQ Activities and KPI Records
 * Calculates comprehensive statistics and progress metrics
 */

import { Project, BOQActivity, KPIRecord } from './supabase'

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
  console.log('🔍 Calculating analytics for project:', project.project_code)
  console.log('📦 Total activities in database:', allActivities.length)
  console.log('📊 Total KPIs in database:', allKPIs.length)
  console.log('🔍 Sample activities project codes:', allActivities.slice(0, 3).map(a => a.project_code))
  console.log('🔍 Sample KPIs project codes:', allKPIs.slice(0, 3).map(k => k.project_code))
  
  // 🔍 DEBUG: Check if we have any data at all
  if (allActivities.length === 0 && allKPIs.length === 0) {
    console.warn('⚠️ NO DATA: No activities or KPIs found in database!')
    console.log('🔍 This means the issue is in data fetching, not calculation')
  }
  
  // 🔧 PERFORMANCE: Early return if no data
  if (allActivities.length === 0 && allKPIs.length === 0) {
    console.log('⚡ Early return: No data to process')
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
  
  console.log(`✅ Filtered for ${project.project_code}:`, {
    activities: projectActivities.length,
    kpis: projectKPIs.length
  })
  
  if (projectActivities.length > 0) {
    console.log('🔍 Sample activity:', projectActivities[0])
  } else {
    console.warn(`⚠️ NO ACTIVITIES found for project ${project.project_code}`)
    console.log('🔍 Available project codes in activities:', Array.from(new Set(allActivities.map(a => a.project_code))).slice(0, 10))
  }
  
  if (projectKPIs.length > 0) {
    console.log('🔍 Sample KPI:', projectKPIs[0])
  } else {
    console.warn(`⚠️ NO KPIs found for project ${project.project_code}`)
    console.log('🔍 Available project codes in KPIs:', Array.from(new Set(allKPIs.map(k => k.project_code))).slice(0, 10))
  }
  
  // BOQ Statistics
  const totalActivities = projectActivities.length
  const completedActivities = projectActivities.filter(a => a.activity_completed).length
  const onTrackActivities = projectActivities.filter(a => a.activity_on_track && !a.activity_completed).length
  const delayedActivities = projectActivities.filter(a => a.activity_delayed).length
  const notStartedActivities = projectActivities.filter(a => 
    !a.activity_completed && !a.activity_on_track && !a.activity_delayed
  ).length
  
  // Financial Metrics
  const totalPlannedValue = projectActivities.reduce((sum, a) => sum + (a.planned_value || 0), 0)
  const totalEarnedValue = projectActivities.reduce((sum, a) => {
    // Calculate earned value = planned_value * (progress / 100)
    const plannedValue = a.planned_value || 0
    const progress = a.activity_progress_percentage || 0
    const earnedValue = a.earned_value || (plannedValue * progress / 100)
    return sum + earnedValue
  }, 0)
  const totalRemainingValue = totalPlannedValue - totalEarnedValue
  const financialProgress = totalPlannedValue > 0 ? (totalEarnedValue / totalPlannedValue) * 100 : 0
  
  console.log('💰 Financial Metrics:', {
    totalPlannedValue,
    totalEarnedValue,
    totalRemainingValue,
    financialProgress: financialProgress.toFixed(1) + '%'
  })
  
  // ✅ Progress Metrics - Based on KPIs (Actual vs Planned)
  // Calculate progress from KPI quantities, not BOQ directly
  const plannedKPIsData = projectKPIs.filter(k => k.input_type === 'Planned')
  const actualKPIsData = projectKPIs.filter(k => k.input_type === 'Actual')
  
  // Sum of all planned quantities from KPIs
  const totalPlannedQuantity = plannedKPIsData.reduce((sum, k) => {
    const qty = parseFloat(k.quantity?.toString() || '0') || 0
    return sum + qty
  }, 0)
  
  // Sum of all actual quantities from KPIs
  const totalActualQuantity = actualKPIsData.reduce((sum, k) => {
    const qty = parseFloat(k.quantity?.toString() || '0') || 0
    return sum + qty
  }, 0)
  
  // Progress from KPIs
  const averageActivityProgress = totalPlannedQuantity > 0
    ? (totalActualQuantity / totalPlannedQuantity) * 100
    : 0
  
  // Weighted progress (by value) - also based on actual vs planned
  const weightedProgress = totalPlannedValue > 0
    ? (totalEarnedValue / totalPlannedValue) * 100
    : 0
  
  // Overall progress = average of KPI-based and value-based progress
  const overallProgress = totalPlannedQuantity > 0 || totalPlannedValue > 0
    ? ((averageActivityProgress + financialProgress + weightedProgress) / 3)
    : 0
  
  console.log('📊 Progress Calculation (from KPIs):', {
    plannedKPIs: plannedKPIsData.length,
    actualKPIs: actualKPIsData.length,
    totalPlannedQuantity,
    totalActualQuantity,
    kpiProgress: averageActivityProgress.toFixed(1) + '%',
    financialProgress: financialProgress.toFixed(1) + '%',
    weightedProgress: weightedProgress.toFixed(1) + '%',
    overallProgress: overallProgress.toFixed(1) + '%'
  })
  
  // KPI Metrics
  const totalKPIs = projectKPIs.length
  const plannedKPIs = projectKPIs.filter(k => k.input_type === 'Planned').length
  const actualKPIs = projectKPIs.filter(k => k.input_type === 'Actual').length
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


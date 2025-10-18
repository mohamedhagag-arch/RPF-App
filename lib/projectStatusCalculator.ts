/**
 * Project Status Calculator
 * Automatically calculates project status based on activities and KPIs
 */

export interface ProjectStatusData {
  project_id: string
  project_code: string
  project_name: string
  project_start_date: string
  project_end_date: string
  current_date: string
  activities: Array<{
    id: string
    activity_timing: 'pre-commencement' | 'post-commencement'
    planned_units: number
    actual_units: number
    planned_activity_start_date: string
    deadline: string
    status: string
  }>
  kpis: Array<{
    id: string
    input_type: 'Planned' | 'Actual'
    quantity: number
    target_date: string
    actual_date?: string
  }>
}

export type ProjectStatus = 
  | 'upcoming'
  | 'site-preparation' 
  | 'on-going'
  | 'completed'
  | 'completed-duration'
  | 'contract-duration'
  | 'on-hold'
  | 'cancelled'

export interface ProjectStatusResult {
  status: ProjectStatus
  confidence: number // 0-100
  reason: string
  details: {
    preCommencementProgress: number
    postCommencementProgress: number
    overallProgress: number
    quantityCompletion: number
    durationCompletion: number
    contractCompletion: number
  }
}

/**
 * Calculate project status based on activities and KPIs
 */
export function calculateProjectStatus(data: ProjectStatusData): ProjectStatusResult {
  const {
    project_start_date,
    project_end_date,
    current_date,
    activities,
    kpis
  } = data

  const currentDate = new Date(current_date)
  const startDate = new Date(project_start_date)
  const endDate = new Date(project_end_date)
  
  // Check if project has started
  const hasStarted = currentDate >= startDate
  const hasEnded = currentDate >= endDate
  
  // Separate activities by timing
  const preCommencementActivities = activities.filter(a => a.activity_timing === 'pre-commencement')
  const postCommencementActivities = activities.filter(a => a.activity_timing === 'post-commencement')
  
  // Calculate progress for each phase
  const preCommencementProgress = calculatePhaseProgress(preCommencementActivities, kpis)
  const postCommencementProgress = calculatePhaseProgress(postCommencementActivities, kpis)
  
  // Calculate overall progress
  const overallProgress = (preCommencementProgress + postCommencementProgress) / 2
  
  // Calculate quantity completion (actual vs planned)
  const totalPlannedUnits = activities.reduce((sum, a) => sum + a.planned_units, 0)
  const totalActualUnits = activities.reduce((sum, a) => sum + a.actual_units, 0)
  const quantityCompletion = totalPlannedUnits > 0 ? (totalActualUnits / totalPlannedUnits) * 100 : 0
  
  // Calculate duration completion
  const totalDuration = endDate.getTime() - startDate.getTime()
  const elapsedDuration = currentDate.getTime() - startDate.getTime()
  const durationCompletion = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0
  
  // Calculate contract completion (all activities completed)
  const completedActivities = activities.filter(a => a.status === 'completed').length
  const contractCompletion = activities.length > 0 ? (completedActivities / activities.length) * 100 : 0
  
  // Determine status based on logic
  let status: ProjectStatus
  let confidence: number
  let reason: string
  
  // 1. Check for manual statuses first
  const manualStatuses = activities.filter(a => a.status === 'on-hold' || a.status === 'cancelled')
  if (manualStatuses.length > 0) {
    const onHoldCount = activities.filter(a => a.status === 'on-hold').length
    const cancelledCount = activities.filter(a => a.status === 'cancelled').length
    
    if (cancelledCount > onHoldCount) {
      status = 'cancelled'
      confidence = 100
      reason = 'Project has been cancelled'
    } else {
      status = 'on-hold'
      confidence = 100
      reason = 'Project is on hold'
    }
  }
  // 2. Upcoming - Project hasn't started yet
  else if (!hasStarted) {
    status = 'upcoming'
    confidence = 100
    reason = 'Project has not started yet'
  }
  // 3. Site Preparation - Project started but pre-commencement phase
  else if (hasStarted && preCommencementProgress < 100) {
    status = 'site-preparation'
    confidence = Math.min(95, 70 + (preCommencementProgress * 0.25))
    reason = `Pre-commencement activities in progress (${preCommencementProgress.toFixed(1)}%)`
  }
  // 4. On-going - Post-commencement phase
  else if (hasStarted && preCommencementProgress >= 100 && postCommencementProgress < 100) {
    status = 'on-going'
    confidence = Math.min(95, 70 + (postCommencementProgress * 0.25))
    reason = `Post-commencement activities in progress (${postCommencementProgress.toFixed(1)}%)`
  }
  // 5. Completed - All quantities achieved
  else if (quantityCompletion >= 100) {
    status = 'completed'
    confidence = Math.min(100, 80 + (quantityCompletion - 100) * 2)
    reason = `All planned quantities achieved (${quantityCompletion.toFixed(1)}%)`
  }
  // 6. Completed Duration - Project duration ended
  else if (hasEnded && quantityCompletion >= 95) {
    status = 'completed-duration'
    confidence = Math.min(100, 85 + (quantityCompletion - 95) * 3)
    reason = `Project duration completed with ${quantityCompletion.toFixed(1)}% quantities`
  }
  // 7. Contract Duration - All activities completed
  else if (contractCompletion >= 100) {
    status = 'contract-duration'
    confidence = 100
    reason = `All contract activities completed (${contractCompletion.toFixed(1)}%)`
  }
  // Default fallback
  else {
    status = 'on-going'
    confidence = 50
    reason = 'Project status unclear, defaulting to on-going'
  }
  
  return {
    status,
    confidence,
    reason,
    details: {
      preCommencementProgress,
      postCommencementProgress,
      overallProgress,
      quantityCompletion,
      durationCompletion,
      contractCompletion
    }
  }
}

/**
 * Calculate progress for a specific phase (pre or post commencement)
 */
function calculatePhaseProgress(activities: any[], kpis: any[]): number {
  if (activities.length === 0) return 100
  
  let totalProgress = 0
  let validActivities = 0
  
  for (const activity of activities) {
    // Calculate activity progress based on actual vs planned units
    const activityProgress = activity.planned_units > 0 
      ? Math.min(100, (activity.actual_units / activity.planned_units) * 100)
      : 0
    
    // Check KPI progress for this activity
    const activityKPIs = kpis.filter(k => k.activity_id === activity.id)
    let kpiProgress = 0
    
    if (activityKPIs.length > 0) {
      const plannedKPIs = activityKPIs.filter(k => k.input_type === 'Planned')
      const actualKPIs = activityKPIs.filter(k => k.input_type === 'Actual')
      
      if (plannedKPIs.length > 0 && actualKPIs.length > 0) {
        const totalPlannedQuantity = plannedKPIs.reduce((sum, k) => sum + k.quantity, 0)
        const totalActualQuantity = actualKPIs.reduce((sum, k) => sum + k.quantity, 0)
        kpiProgress = totalPlannedQuantity > 0 
          ? Math.min(100, (totalActualQuantity / totalPlannedQuantity) * 100)
          : 0
      }
    }
    
    // ✅ Use KPI progress if available (more accurate), otherwise use activity progress
    const finalProgress = kpiProgress > 0 ? kpiProgress : activityProgress
    totalProgress += finalProgress
    validActivities++
  }
  
  return validActivities > 0 ? totalProgress / validActivities : 0
}

/**
 * Get status display information
 */
export function getStatusDisplayInfo(status: ProjectStatus) {
  const statusInfo = {
    'upcoming': {
      label: 'Upcoming',
      color: 'gray',
      icon: '⏳',
      description: 'Project has not started yet'
    },
    'site-preparation': {
      label: 'Site Preparation',
      color: 'orange',
      icon: '🏗️',
      description: 'Pre-commencement activities in progress'
    },
    'on-going': {
      label: 'On Going',
      color: 'blue',
      icon: '🚀',
      description: 'Post-commencement activities in progress'
    },
    'completed': {
      label: 'Completed',
      color: 'green',
      icon: '✅',
      description: 'All planned quantities achieved'
    },
    'completed-duration': {
      label: 'Completed Duration',
      color: 'purple',
      icon: '⏰',
      description: 'Project duration completed'
    },
    'contract-duration': {
      label: 'Contract Duration',
      color: 'emerald',
      icon: '📋',
      description: 'All contract activities completed'
    },
    'on-hold': {
      label: 'On Hold',
      color: 'yellow',
      icon: '⏸️',
      description: 'Project is temporarily suspended'
    },
    'cancelled': {
      label: 'Cancelled',
      color: 'red',
      icon: '❌',
      description: 'Project has been cancelled'
    }
  }
  
  return statusInfo[status] || statusInfo['on-going']
}

/**
 * Validate project status transition
 */
export function validateStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): boolean {
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    'upcoming': ['site-preparation', 'on-hold', 'cancelled'],
    'site-preparation': ['on-going', 'on-hold', 'cancelled'],
    'on-going': ['completed', 'completed-duration', 'contract-duration', 'on-hold', 'cancelled'],
    'completed': ['completed-duration', 'contract-duration'],
    'completed-duration': ['contract-duration'],
    'contract-duration': [], // Final state
    'on-hold': ['site-preparation', 'on-going', 'cancelled'],
    'cancelled': [] // Final state
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false
}

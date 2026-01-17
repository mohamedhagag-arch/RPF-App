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
  project_award_date?: string // ✅ NEW: Project award date
  current_date: string
  activities: Array<{
    id: string
    activity_timing: 'pre-commencement' | 'post-commencement' | 'post-completion'
    activity_name?: string // ✅ NEW: Activity name (for matching with KPIs)
    planned_units: number
    actual_units: number
    planned_activity_start_date?: string
    activity_actual_start_date?: string // ✅ NEW: Actual start date
    deadline?: string
    activity_actual_completion_date?: string // ✅ NEW: Actual completion date
    status: string
  }>
  kpis: Array<{
    id: string
    input_type: 'Planned' | 'Actual'
    quantity: number
    activity_date: string // ✅ Unified date field (replaces target_date and actual_date)
    target_date?: string // ✅ Deprecated - kept for backward compatibility
    actual_date?: string // ✅ Deprecated - kept for backward compatibility
    activity_name?: string // ✅ NEW: Activity name from KPI (for matching)
  }>
}

export type ProjectStatus = 
  | 'upcoming' // ✅ Once the project is awarded
  | 'site-preparation' // ✅ Once any Pre-commencement activities start (actual)
  | 'on-going' // ✅ Once any Post-commencement activities start (actual)
  | 'completed-duration' // ✅ Once all Post-commencement activities finish (actual)
  | 'contract-completed' // ✅ Once all Post-Completion activities finish (actual)
  | 'on-hold' // ✅ To be added manually
  | 'cancelled' // ✅ To be added manually

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
 * ✅ إعادة كتابة كاملة: حساب حالة المشروع بناءً على الأنشطة والـ KPIs فقط
 * Logic (بدون Project Award Date):
 * 1. Upcoming: الحالة التلقائية عند إنشاء المشروع (لا توجد Actual KPIs)
 * 2. Site preparation: عندما يبدأ أي نشاط Pre-commencement (KPI Actual موجود)
 * 3. Ongoing: عندما يبدأ أي نشاط Post-commencement (KPI Actual موجود) - حتى لو واحد فقط
 * 4. Completed Duration: عندما تنتهي كل الأنشطة Post-commencement (Actual >= Planned)
 * 5. Contract Completed: عندما تنتهي كل الأنشطة Post-Completion (Actual >= Planned)
 * 6. On hold: يدوياً (يتم تعيينه من الفورم)
 * 7. Cancelled: يدوياً (يتم تعيينه من الفورم)
 */
export function calculateProjectStatus(data: ProjectStatusData): ProjectStatusResult {
  const {
    current_date,
    activities,
    kpis
  } = data

  const currentDate = new Date(current_date)
  
  // ✅ فصل الأنشطة حسب Activity Timing
  const preCommencementActivities = activities.filter(a => a.activity_timing === 'pre-commencement')
  const postCommencementActivities = activities.filter(a => a.activity_timing === 'post-commencement')
  const postCompletionActivities = activities.filter(a => a.activity_timing === 'post-completion')
  
  // ✅ Helper: Check if activity has actually started (based on KPI ACTUAL data ONLY)
  // ✅ أساسي: أي حالة غير Upcoming تتطلب Actual KPIs
  const hasActivityStarted = (activity: any): boolean => {
    // ✅ MUST HAVE: Activity name to match with KPIs
    const activityName = (activity.activity_name || '').toString().trim().toLowerCase()
    
    if (!activityName) {
      // ❌ NO FALLBACK: Without activity name, we cannot match with KPIs, so return false
      return false
    }
    
    // ✅ Find KPIs that match this activity by name (case-insensitive, exact match)
    const activityKPIs = kpis.filter(k => {
      const kpi = k as any
      const kpiActivityName = String(
        kpi.activity_name || 
        kpi['Activity Name'] || 
        ''
      ).trim().toLowerCase()
      
      // ✅ Exact match (case-insensitive)
      return kpiActivityName === activityName && kpiActivityName.length > 0
    })
    
    if (activityKPIs.length === 0) {
      // ✅ DEBUG: Log in development mode to help diagnose matching issues
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.warn(`⚠️ [Status Calc] No KPIs found for activity: "${activityName}"`, {
          totalKPIs: kpis.length,
          sampleKPIActivityNames: kpis.slice(0, 3).map((k: any) => {
            const kpi = k as any
            return kpi.activity_name || kpi['Activity Name'] || 'N/A'
          })
        })
      }
      // ❌ NO FALLBACK: بدون Actual KPIs، النشاط لم يبدأ
      return false
    }
    
    // ✅ Check if we have ANY KPI Actual for this activity
    const hasActualKPIs = activityKPIs.some(k => {
      const kpi = k as any
      
      // ✅ Check input type - MUST be 'actual'
      const inputType = String(
        kpi.input_type || 
        kpi['Input Type'] || 
        ''
      ).trim().toLowerCase()
      
      if (inputType !== 'actual') return false
      
      // ✅ Check if KPI Actual has quantity > 0
      const quantity = parseFloat(String(
        kpi.quantity || 
        kpi['Quantity'] || 
        '0'
      ).replace(/,/g, '')) || 0
      
      if (quantity > 0) {
        // ✅ DEBUG: Log in development mode
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log(`✅ [Status Calc] Activity "${activityName}" started: KPI Actual quantity = ${quantity}`)
        }
        return true
      }
      
      // ✅ Check if KPI Actual has a date (activity_date or actual_date) that is <= current date
      const kpiDate = kpi.activity_date || 
                     kpi.actual_date || 
                     kpi['Activity Date'] || 
                     kpi['Actual Date']
      
      if (kpiDate) {
        const date = new Date(kpiDate)
        if (!isNaN(date.getTime()) && date <= currentDate) {
          // ✅ DEBUG: Log in development mode
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log(`✅ [Status Calc] Activity "${activityName}" started: KPI Actual date = ${kpiDate}`)
          }
          return true
        }
      }
      
      return false
    })
    
    // ✅ Return true ONLY if we found KPI Actual data (NO FALLBACKS)
    return hasActualKPIs
  }
  
  // ✅ Helper: Check if activity has actually completed (based on KPI ACTUAL data ONLY - NO FALLBACKS)
  const hasActivityCompleted = (activity: any): boolean => {
    // ✅ MUST HAVE: Activity name to match with KPIs
    const activityName = (activity.activity_name || '').toString().trim().toLowerCase()
    
    if (!activityName) {
      // ❌ NO FALLBACK: Without activity name, we cannot match with KPIs, so return false
      return false
    }
    
    // ✅ Find KPIs that match this activity by name (case-insensitive, exact match)
    const activityKPIs = kpis.filter(k => {
      const kpi = k as any
      const kpiActivityName = String(
        kpi.activity_name || 
        kpi['Activity Name'] || 
        ''
      ).trim().toLowerCase()
      
      // ✅ Exact match (case-insensitive)
      return kpiActivityName === activityName && kpiActivityName.length > 0
    })
    
    if (activityKPIs.length === 0) {
      // ❌ NO FALLBACK: No KPIs found for this activity, cannot determine if completed
      return false
    }
    
    // ✅ Separate Planned and Actual KPIs
    const plannedKPIs = activityKPIs.filter(k => {
      const kpi = k as any
      const inputType = String(
        kpi.input_type || 
        kpi['Input Type'] || 
        ''
      ).trim().toLowerCase()
      return inputType === 'planned'
    })
    
    const actualKPIs = activityKPIs.filter(k => {
      const kpi = k as any
      const inputType = String(
        kpi.input_type || 
        kpi['Input Type'] || 
        ''
      ).trim().toLowerCase()
      return inputType === 'actual'
    })
    
    // ✅ Activity is completed ONLY if:
    // 1. We have Planned KPIs
    // 2. We have Actual KPIs
    // 3. Total Actual Quantity >= Total Planned Quantity
    if (plannedKPIs.length > 0 && actualKPIs.length > 0) {
      const totalPlannedQuantity = plannedKPIs.reduce((sum, k) => {
        const kpi = k as any
        const qty = parseFloat(String(
          kpi.quantity || 
          kpi['Quantity'] || 
          '0'
        ).replace(/,/g, '')) || 0
        return sum + qty
      }, 0)
      
      const totalActualQuantity = actualKPIs.reduce((sum, k) => {
        const kpi = k as any
        const qty = parseFloat(String(
          kpi.quantity || 
          kpi['Quantity'] || 
          '0'
        ).replace(/,/g, '')) || 0
        return sum + qty
      }, 0)
      
      // ✅ Activity is completed if actual quantity >= planned quantity
      if (totalPlannedQuantity > 0 && totalActualQuantity >= totalPlannedQuantity) {
        return true
      }
    }
    
    // ❌ NO FALLBACK: If we don't have both Planned and Actual KPIs, or quantities don't match, return false
    return false
  }
  
  // Calculate progress for each phase (based on ACTUAL data)
  const preCommencementProgress = calculatePhaseProgressActual(preCommencementActivities, kpis)
  const postCommencementProgress = calculatePhaseProgressActual(postCommencementActivities, kpis)
  const postCompletionProgress = calculatePhaseProgressActual(postCompletionActivities, kpis)
  
  // Calculate overall progress
  const totalPhases = (preCommencementActivities.length > 0 ? 1 : 0) + 
                      (postCommencementActivities.length > 0 ? 1 : 0) + 
                      (postCompletionActivities.length > 0 ? 1 : 0)
  const overallProgress = totalPhases > 0 
    ? (preCommencementProgress + postCommencementProgress + postCompletionProgress) / totalPhases
    : 0
  
  // Calculate quantity completion (actual vs planned)
  const totalPlannedUnits = activities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
  const totalActualUnits = activities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
  const quantityCompletion = totalPlannedUnits > 0 ? (totalActualUnits / totalPlannedUnits) * 100 : 0
  
  // Calculate duration completion (not used in status determination, but kept for details)
  const durationCompletion = 0 // Will be calculated if needed
  
  // Calculate contract completion (all activities completed)
  const completedActivities = activities.filter(a => hasActivityCompleted(a)).length
  const contractCompletion = activities.length > 0 ? (completedActivities / activities.length) * 100 : 0
  
  // ✅ تحديد الحالة بناءً على الأنشطة الفعلية والـ KPIs فقط (بدون Project Award Date)
  let status: ProjectStatus
  let confidence: number
  let reason: string
  
  // 1. التحقق من الحالات اليدوية أولاً (on-hold, cancelled)
  // هذه الحالات يتم تعيينها يدوياً من الفورم، لذلك نتخطاها هنا
  
  // 2. Upcoming: الحالة التلقائية عند إنشاء المشروع (لا توجد Actual KPIs)
  if (activities.length === 0) {
    status = 'upcoming'
    confidence = 100
    reason = 'No activities found for this project'
  } else {
    // التحقق من الأنشطة التي بدأت فعلياً (KPI Actual موجود)
    const startedPreCommencement = preCommencementActivities.filter(a => hasActivityStarted(a))
    const startedPostCommencement = postCommencementActivities.filter(a => hasActivityStarted(a))
    const startedPostCompletion = postCompletionActivities.filter(a => hasActivityStarted(a))
    
    // التحقق من الأنشطة المكتملة (Actual >= Planned)
    const completedPreCommencement = preCommencementActivities.filter(a => hasActivityCompleted(a))
    const completedPostCommencement = postCommencementActivities.filter(a => hasActivityCompleted(a))
    const completedPostCompletion = postCompletionActivities.filter(a => hasActivityCompleted(a))
    
    // 5. Contract Completed: عندما تنتهي كل الأنشطة Post-Completion (Actual >= Planned)
    if (postCompletionActivities.length > 0 && completedPostCompletion.length === postCompletionActivities.length) {
      status = 'contract-completed'
      confidence = 100
      reason = 'All Post-Completion activities finished (Actual >= Planned)'
    }
    // 4. Completed Duration: عندما تنتهي كل الأنشطة Post-commencement (Actual >= Planned)
    else if (postCommencementActivities.length > 0 && completedPostCommencement.length === postCommencementActivities.length) {
      status = 'completed-duration'
      confidence = 100
      reason = 'All Post-commencement activities finished (Actual >= Planned)'
    }
    // 3. Ongoing: عندما يبدأ أي نشاط Post-commencement (KPI Actual موجود) - حتى لو واحد فقط
    else if (startedPostCommencement.length > 0) {
      status = 'on-going'
      confidence = 100
      reason = `Post-commencement activities have started (${startedPostCommencement.length} activity/activities with Actual KPIs)`
    }
    // 2. Site preparation: عندما يبدأ أي نشاط Pre-commencement (KPI Actual موجود)
    else if (startedPreCommencement.length > 0) {
      status = 'site-preparation'
      confidence = 100
      reason = `Pre-commencement activities have started (${startedPreCommencement.length} activity/activities with Actual KPIs)`
    }
    // 1. Upcoming: لم تبدأ أي أنشطة بعد (لا توجد Actual KPIs)
    else {
      status = 'upcoming'
      confidence = 100
      reason = 'No activities have started yet (no Actual KPIs found)'
    }
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
 * ✅ NEW: Calculate progress for a specific phase based on KPI ACTUAL data ONLY - NO FALLBACKS
 */
function calculatePhaseProgressActual(activities: any[], kpis: any[]): number {
  if (activities.length === 0) return 100
  
  let totalProgress = 0
  let validActivities = 0
  
  for (const activity of activities) {
    const activityName = (activity.activity_name || '').toString().trim().toLowerCase()
    
    // ✅ MUST HAVE: Activity name to match with KPIs
    if (!activityName) {
      // ❌ NO FALLBACK: Skip activities without name
      continue
    }
    
    // ✅ Find KPIs that match this activity by name (case-insensitive, exact match)
    const activityKPIs = kpis.filter(k => {
      const kpi = k as any
      const kpiActivityName = String(
        kpi.activity_name || 
        kpi['Activity Name'] || 
        ''
      ).trim().toLowerCase()
      return kpiActivityName === activityName && kpiActivityName.length > 0
    })
    
    if (activityKPIs.length === 0) {
      // ❌ NO FALLBACK: Skip activities without KPIs
      continue
    }
    
    // ✅ Separate Planned and Actual KPIs
    const plannedKPIs = activityKPIs.filter(k => {
      const kpi = k as any
      const inputType = String(
        kpi.input_type || 
        kpi['Input Type'] || 
        ''
      ).trim().toLowerCase()
      return inputType === 'planned'
    })
    
    const actualKPIs = activityKPIs.filter(k => {
      const kpi = k as any
      const inputType = String(
        kpi.input_type || 
        kpi['Input Type'] || 
        ''
      ).trim().toLowerCase()
      return inputType === 'actual'
    })
    
    // ✅ Calculate progress ONLY from KPI Actual vs Planned
    let kpiProgress = 0
    
    if (plannedKPIs.length > 0 && actualKPIs.length > 0) {
      const totalPlannedQuantity = plannedKPIs.reduce((sum, k) => {
        const kpi = k as any
        const qty = parseFloat(String(
          kpi.quantity || 
          kpi['Quantity'] || 
          '0'
        ).replace(/,/g, '')) || 0
        return sum + qty
      }, 0)
      
      const totalActualQuantity = actualKPIs.reduce((sum, k) => {
        const kpi = k as any
        const qty = parseFloat(String(
          kpi.quantity || 
          kpi['Quantity'] || 
          '0'
        ).replace(/,/g, '')) || 0
        return sum + qty
      }, 0)
      
      kpiProgress = totalPlannedQuantity > 0 
        ? Math.min(100, (totalActualQuantity / totalPlannedQuantity) * 100)
        : 0
    } else if (actualKPIs.length > 0 && plannedKPIs.length === 0) {
      // ✅ If we have actual KPIs but no planned, consider it as partial progress (work is being done)
      kpiProgress = 50 // Partial progress
    }
    
    // ❌ NO FALLBACK: Use KPI progress only (no activity actual_units fallback)
    if (kpiProgress > 0) {
      totalProgress += kpiProgress
      validActivities++
    }
  }
  
  return validActivities > 0 ? totalProgress / validActivities : 0
}

/**
 * Calculate progress for a specific phase (pre or post commencement) - OLD VERSION (kept for compatibility)
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
      description: 'Once the project is awarded'
    },
    'site-preparation': {
      label: 'Site Preparation',
      color: 'orange',
      icon: '🏗️',
      description: 'Once any Pre-commencement activities start'
    },
    'on-going': {
      label: 'On Going',
      color: 'blue',
      icon: '🚀',
      description: 'Once any Post-commencement activities start'
    },
    'completed-duration': {
      label: 'Completed Duration',
      color: 'purple',
      icon: '⏰',
      description: 'Once all Post-commencement activities finish'
    },
    'contract-completed': {
      label: 'Contract Completed',
      color: 'emerald',
      icon: '📋',
      description: 'Once all Post-Completion activities finish'
    },
    'on-hold': {
      label: 'On Hold',
      color: 'yellow',
      icon: '⏸️',
      description: 'To be added manually'
    },
    'cancelled': {
      label: 'Cancelled',
      color: 'red',
      icon: '❌',
      description: 'To be added manually'
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
    'on-going': ['completed-duration', 'on-hold', 'cancelled'],
    'completed-duration': ['contract-completed', 'on-hold', 'cancelled'],
    'contract-completed': [], // Final state
    'on-hold': ['site-preparation', 'on-going', 'cancelled'],
    'cancelled': [] // Final state
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false
}

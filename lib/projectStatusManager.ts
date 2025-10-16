/**
 * Project Status Manager
 * Unified system for managing project statuses across the entire application
 */

import { getStatusDisplayInfo, ProjectStatus } from './projectStatusCalculator'

// Legacy status mapping for backward compatibility
const LEGACY_STATUS_MAP: Record<string, ProjectStatus> = {
  'active': 'on-going',
  'completed': 'completed',
  'on_hold': 'on-hold',
  'cancelled': 'cancelled'
}

// Reverse mapping for display
const STATUS_DISPLAY_MAP: Record<ProjectStatus, string> = {
  'upcoming': 'Upcoming',
  'site-preparation': 'Site Preparation',
  'on-going': 'On Going',
  'completed': 'Completed',
  'completed-duration': 'Completed Duration',
  'contract-duration': 'Contract Duration',
  'on-hold': 'On Hold',
  'cancelled': 'Cancelled'
}

/**
 * Get unified project status
 * Converts legacy statuses to new system
 */
export function getUnifiedProjectStatus(project: any): ProjectStatus {
  const rawStatus = project.project_status || project.status || 'upcoming'
  
  // If it's already a new status, return it
  if (Object.values(STATUS_DISPLAY_MAP).includes(rawStatus) || 
      Object.keys(STATUS_DISPLAY_MAP).includes(rawStatus)) {
    return rawStatus as ProjectStatus
  }
  
  // Convert legacy status
  return LEGACY_STATUS_MAP[rawStatus] || 'upcoming'
}

/**
 * Get status color for UI components
 */
export function getProjectStatusColor(status: string): string {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  const statusInfo = getStatusDisplayInfo(unifiedStatus)
  
  const colorMap: Record<string, string> = {
    'gray': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'orange': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    'blue': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    'green': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    'purple': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    'emerald': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
    'yellow': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    'red': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  }
  
  return colorMap[statusInfo.color] || colorMap['gray']
}

/**
 * Get status text for UI components
 */
export function getProjectStatusText(status: string): string {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  return STATUS_DISPLAY_MAP[unifiedStatus] || 'Unknown'
}

/**
 * Get status icon for UI components
 */
export function getProjectStatusIcon(status: string): string {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  const statusInfo = getStatusDisplayInfo(unifiedStatus)
  return statusInfo.icon
}

/**
 * Get status description for UI components
 */
export function getProjectStatusDescription(status: string): string {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  const statusInfo = getStatusDisplayInfo(unifiedStatus)
  return statusInfo.description
}

/**
 * Get all available project statuses
 */
export function getAllProjectStatuses(): Array<{
  value: ProjectStatus
  label: string
  icon: string
  color: string
  description: string
}> {
  return Object.keys(STATUS_DISPLAY_MAP).map(status => {
    const statusInfo = getStatusDisplayInfo(status as ProjectStatus)
    return {
      value: status as ProjectStatus,
      label: STATUS_DISPLAY_MAP[status as ProjectStatus],
      icon: statusInfo.icon,
      color: statusInfo.color,
      description: statusInfo.description
    }
  })
}

/**
 * Check if status is active (not completed/cancelled)
 */
export function isProjectActive(status: string): boolean {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  return !['completed', 'completed-duration', 'contract-duration', 'cancelled'].includes(unifiedStatus)
}

/**
 * Check if status is completed
 */
export function isProjectCompleted(status: string): boolean {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  return ['completed', 'completed-duration', 'contract-duration'].includes(unifiedStatus)
}

/**
 * Check if status is problematic (on-hold or cancelled)
 */
export function isProjectProblematic(status: string): boolean {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  return ['on-hold', 'cancelled'].includes(unifiedStatus)
}

/**
 * Get status priority for sorting
 */
export function getProjectStatusPriority(status: string): number {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  const priorityMap: Record<ProjectStatus, number> = {
    'upcoming': 1,
    'site-preparation': 2,
    'on-going': 3,
    'completed': 4,
    'completed-duration': 5,
    'contract-duration': 6,
    'on-hold': 7,
    'cancelled': 8
  }
  return priorityMap[unifiedStatus] || 0
}

/**
 * Get status badge props for UI components
 */
export function getProjectStatusBadgeProps(status: string) {
  const unifiedStatus = getUnifiedProjectStatus({ project_status: status })
  const statusInfo = getStatusDisplayInfo(unifiedStatus)
  
  return {
    className: getProjectStatusColor(status),
    icon: statusInfo.icon,
    text: STATUS_DISPLAY_MAP[unifiedStatus]
  }
}

/**
 * Get status filter options for dropdowns
 */
export function getProjectStatusFilterOptions() {
  return getAllProjectStatuses().map(status => ({
    value: status.value,
    label: status.label,
    icon: status.icon,
    color: status.color
  }))
}

/**
 * Validate status transition
 */
export function validateProjectStatusTransition(currentStatus: string, newStatus: string): boolean {
  const current = getUnifiedProjectStatus({ project_status: currentStatus })
  const next = getUnifiedProjectStatus({ project_status: newStatus })
  
  // Define valid transitions
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
  
  return validTransitions[current]?.includes(next) || false
}

/**
 * Get status statistics
 */
export function getProjectStatusStatistics(projects: any[]) {
  const stats = {
    total: projects.length,
    by_status: {} as Record<ProjectStatus, number>,
    active_count: 0,
    completed_count: 0,
    problematic_count: 0
  }
  
  projects.forEach(project => {
    const status = getUnifiedProjectStatus(project)
    stats.by_status[status] = (stats.by_status[status] || 0) + 1
    
    if (isProjectActive(project.project_status)) {
      stats.active_count++
    }
    if (isProjectCompleted(project.project_status)) {
      stats.completed_count++
    }
    if (isProjectProblematic(project.project_status)) {
      stats.problematic_count++
    }
  })
  
  return stats
}

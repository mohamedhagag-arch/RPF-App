/**
 * User Activity Tracker
 * Tracks all user actions across the application
 */

import { getSupabaseClient } from './simpleConnectionManager'

export type ActionType = 
  | 'view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'export' 
  | 'import' 
  | 'approve' 
  | 'reject'
  | 'search'
  | 'filter'
  | 'sort'
  | 'download'
  | 'upload'
  | 'login'
  | 'logout'
  | 'settings_change'
  | 'bulk_action'
  | 'other'

export type EntityType = 
  | 'kpi' 
  | 'boq' 
  | 'project' 
  | 'settings' 
  | 'user_guide' 
  | 'user' 
  | 'department'
  | 'job_title'
  | 'company'
  | 'preferences'
  | 'dashboard'
  | 'other'

export interface ActivityMetadata {
  [key: string]: any
  old_values?: any
  new_values?: any
  filters?: any
  search_query?: string
  sort_by?: string
  export_format?: string
  import_format?: string
  bulk_count?: number
  error?: string
}

export interface LogActivityParams {
  action: ActionType
  entity?: EntityType
  entityId?: string
  pagePath?: string
  pageTitle?: string
  description?: string
  metadata?: ActivityMetadata
  isActive?: boolean // Whether this is an active session activity
}

/**
 * Get current page path and title with full details
 */
export function getCurrentPageInfo(): { path: string; title: string; fullPath: string; queryParams: string } {
  if (typeof window === 'undefined') {
    return { path: '', title: '', fullPath: '', queryParams: '' }
  }

  const path = window.location.pathname
  const queryParams = window.location.search
  const fullPath = path + queryParams
  let title = document.title || path

  // Map common paths to titles with more details
  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/kpi': 'KPI Tracking',
    '/kpi/add': 'Add KPI',
    '/kpi/smart-form': 'Smart KPI Form',
    '/kpi/pending-approval': 'Pending Approval',
    '/boq': 'BOQ Management',
    '/projects': 'Projects',
    '/settings': 'Settings',
    '/user-guide': 'User Guide',
    '/activity-log': 'Activity Log',
  }

  // Add query params to title if present
  if (queryParams) {
    const params = new URLSearchParams(queryParams)
    const tab = params.get('tab')
    if (tab) {
      title = `${pageTitles[path] || title} - ${tab.charAt(0).toUpperCase() + tab.slice(1)}`
    } else {
      title = pageTitles[path] || title
    }
  } else {
    title = pageTitles[path] || title
  }

  return { path, title, fullPath, queryParams }
}

/**
 * Get user agent and IP (if available)
 */
export function getUserInfo(): { userAgent: string; ipAddress?: string } {
  if (typeof window === 'undefined') {
    return { userAgent: '' }
  }

  return {
    userAgent: navigator.userAgent,
    // IP address would need to be fetched from an API
    // For now, we'll skip it or get it from a service
  }
}

/**
 * Generate session ID (simple implementation)
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  let sessionId = sessionStorage.getItem('activity_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('activity_session_id', sessionId)
  }
  return sessionId
}

/**
 * Log user activity
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { path, title, fullPath, queryParams } = getCurrentPageInfo()
    const { userAgent } = getUserInfo()
    const sessionId = getSessionId()

    const supabase = getSupabaseClient()
    
    // Build detailed description
    let description = params.description || `${params.action} ${params.entity || 'item'}`
    if (queryParams) {
      const paramsObj = new URLSearchParams(queryParams)
      const tab = paramsObj.get('tab')
      if (tab) {
        description += ` (${tab} tab)`
      }
    }
    
    const activityData = {
      action_type: params.action,
      entity_type: params.entity || null,
      entity_id: params.entityId || null,
      page_path: params.pagePath || path,
      page_title: params.pageTitle || title,
      description: description,
      metadata: {
        ...(params.metadata || {}),
        full_path: params.pagePath || fullPath,
        query_params: queryParams,
        timestamp: new Date().toISOString(),
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight,
        } : null,
      },
      user_agent: userAgent,
      session_id: sessionId,
      current_page: params.pagePath || fullPath, // Store full path with query params
      is_active: params.isActive !== undefined ? params.isActive : (params.action === 'view'),
    }

    const { error } = await (supabase as any)
      .from('user_activities')
      .insert(activityData)

    if (error) {
      console.error('Failed to log activity:', error)
      // Don't throw - activity logging should not break the app
    } else {
      console.log('✅ Activity logged:', params.action, params.entity)
    }
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw - activity logging should not break the app
  }
}

/**
 * Quick logging functions for common actions
 */
export const activityLogger = {
  view: (entity: EntityType, entityId?: string, description?: string) =>
    logActivity({
      action: 'view',
      entity,
      entityId,
      description: description || `Viewed ${entity}`,
    }),

  create: (entity: EntityType, entityId?: string, metadata?: ActivityMetadata) =>
    logActivity({
      action: 'create',
      entity,
      entityId,
      description: `Created ${entity}`,
      metadata,
    }),

  update: (entity: EntityType, entityId?: string, metadata?: ActivityMetadata) =>
    logActivity({
      action: 'update',
      entity,
      entityId,
      description: `Updated ${entity}`,
      metadata,
    }),

  delete: (entity: EntityType, entityId?: string, metadata?: ActivityMetadata) =>
    logActivity({
      action: 'delete',
      entity,
      entityId,
      description: `Deleted ${entity}`,
      metadata,
    }),

  approve: (entity: EntityType, entityId?: string, metadata?: ActivityMetadata) =>
    logActivity({
      action: 'approve',
      entity,
      entityId,
      description: `Approved ${entity}`,
      metadata,
    }),

  reject: (entity: EntityType, entityId?: string, metadata?: ActivityMetadata) =>
    logActivity({
      action: 'reject',
      entity,
      entityId,
      description: `Rejected ${entity}`,
      metadata,
    }),

  export: (entity: EntityType, format: string, count?: number) =>
    logActivity({
      action: 'export',
      entity,
      description: `Exported ${entity} as ${format}`,
      metadata: {
        export_format: format,
        bulk_count: count,
      },
    }),

  import: (entity: EntityType, format: string, count?: number) =>
    logActivity({
      action: 'import',
      entity,
      description: `Imported ${entity} from ${format}`,
      metadata: {
        import_format: format,
        bulk_count: count,
      },
    }),

  search: (entity: EntityType, query: string) =>
    logActivity({
      action: 'search',
      entity,
      description: `Searched ${entity}`,
      metadata: {
        search_query: query,
      },
    }),

  filter: (entity: EntityType, filters: any) =>
    logActivity({
      action: 'filter',
      entity,
      description: `Filtered ${entity}`,
      metadata: {
        filters,
      },
    }),

  sort: (entity: EntityType, sortBy: string) =>
    logActivity({
      action: 'sort',
      entity,
      description: `Sorted ${entity}`,
      metadata: {
        sort_by: sortBy,
      },
    }),

  bulkAction: (entity: EntityType, action: string, count: number) =>
    logActivity({
      action: 'bulk_action',
      entity,
      description: `Bulk ${action} on ${count} ${entity} items`,
      metadata: {
        bulk_action: action,
        bulk_count: count,
      },
    }),

  pageView: (pageTitle: string, pagePath?: string) =>
    logActivity({
      action: 'view',
      entity: 'other',
      pagePath: pagePath || window.location.pathname,
      pageTitle,
      description: `Viewed ${pageTitle}`,
    }),

  settingsChange: (setting: string, oldValue: any, newValue: any) =>
    logActivity({
      action: 'settings_change',
      entity: 'settings',
      description: `Changed setting: ${setting}`,
      metadata: {
        setting,
        old_values: oldValue,
        new_values: newValue,
      },
    }),
}


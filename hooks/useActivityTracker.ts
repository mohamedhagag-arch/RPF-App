/**
 * React Hook for Activity Tracking
 * Makes it easy to track user activities in components
 */

import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { activityLogger, logActivity, type ActionType, type EntityType, type ActivityMetadata } from '@/lib/activityTracker'

export function useActivityTracker() {
  const pathname = usePathname()

  // Track page views automatically
  useEffect(() => {
    if (pathname) {
      const pageTitle = document.title || pathname
      activityLogger.pageView(pageTitle, pathname)
    }
  }, [pathname])

  // Return logging functions
  return {
    log: logActivity,
    view: activityLogger.view,
    create: activityLogger.create,
    update: activityLogger.update,
    delete: activityLogger.delete,
    approve: activityLogger.approve,
    reject: activityLogger.reject,
    export: activityLogger.export,
    import: activityLogger.import,
    search: activityLogger.search,
    filter: activityLogger.filter,
    sort: activityLogger.sort,
    bulkAction: activityLogger.bulkAction,
    settingsChange: activityLogger.settingsChange,
  }
}

/**
 * Hook for tracking specific entity actions
 */
export function useEntityActivityTracker(entity: EntityType) {
  const tracker = useActivityTracker()

  return {
    view: (entityId?: string, description?: string) =>
      tracker.view(entity, entityId, description),
    create: (entityId?: string, metadata?: ActivityMetadata) =>
      tracker.create(entity, entityId, metadata),
    update: (entityId?: string, metadata?: ActivityMetadata) =>
      tracker.update(entity, entityId, metadata),
    delete: (entityId?: string, metadata?: ActivityMetadata) =>
      tracker.delete(entity, entityId, metadata),
    approve: (entityId?: string, metadata?: ActivityMetadata) =>
      tracker.approve(entity, entityId, metadata),
    reject: (entityId?: string, metadata?: ActivityMetadata) =>
      tracker.reject(entity, entityId, metadata),
    export: (format: string, count?: number) =>
      tracker.export(entity, format, count),
    import: (format: string, count?: number) =>
      tracker.import(entity, format, count),
    search: (query: string) => tracker.search(entity, query),
    filter: (filters: any) => tracker.filter(entity, filters),
    sort: (sortBy: string) => tracker.sort(entity, sortBy),
    bulkAction: (action: string, count: number) =>
      tracker.bulkAction(entity, action, count),
  }
}


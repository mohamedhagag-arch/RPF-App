/**
 * Advanced Permission Guard System
 * نظام حراسة الصلاحيات المتقدم
 * 
 * This system provides comprehensive permission checking and UI element protection
 * across the entire application.
 */

import { useAuth } from '@/app/providers'
import { hasPermission, hasAnyPermission, hasAllPermissions, canPerformAction, getUserPermissions } from './permissionsSystem'
import { UserWithPermissions } from './permissionsSystem'

// Permission categories for better organization
export const PERMISSION_CATEGORIES = {
  PROJECTS: 'projects',
  BOQ: 'boq', 
  KPI: 'kpi',
  REPORTS: 'reports',
  USERS: 'users',
  SETTINGS: 'settings',
  DATABASE: 'database',
  SYSTEM: 'system'
} as const

// Common permission patterns
export const PERMISSION_PATTERNS = {
  // Basic CRUD operations
  VIEW: 'view',
  CREATE: 'create', 
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
  
  // Advanced operations
  MANAGE: 'manage',
  APPROVE: 'approve',
  IMPORT: 'import',
  BACKUP: 'backup',
  RESTORE: 'restore',
  CLEAR: 'clear'
} as const

/**
 * Permission Guard Hook
 * Hook شامل لفحص الصلاحيات
 */
// Cache for permission checks to improve performance
const permissionCache = new Map<string, boolean>()
const cacheTimeout = 5000 // 5 seconds cache

export function usePermissionGuard() {
  const { appUser } = useAuth()

  /**
   * Check if user has a specific permission
   * فحص صلاحية محددة
   */
  const hasAccess = (permission: string): boolean => {
    if (!appUser) {
      return false
    }
    
    // ✅ FIX: Create cache key that includes permissions hash to invalidate cache when permissions change
    const permissionsHash = Array.isArray(appUser.permissions) 
      ? appUser.permissions.join(',') 
      : ''
    const customEnabled = appUser.custom_permissions_enabled ? '1' : '0'
    const cacheKey = `${appUser.id || 'anonymous'}-${permission}-${customEnabled}-${permissionsHash}`
    
    // Check cache first
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!
    }
    
    const result = hasPermission(appUser as UserWithPermissions, permission)
    
    // Cache the result
    permissionCache.set(cacheKey, result)
    
    // Clear cache after timeout
    setTimeout(() => {
      permissionCache.delete(cacheKey)
    }, cacheTimeout)
    
    return result
  }

  /**
   * Check if user has any of the specified permissions
   * فحص أي صلاحية من مجموعة صلاحيات
   */
  const hasAnyAccess = (permissions: string[]): boolean => {
    if (!appUser) return false
    
    // ✅ FIX: Include permissions hash in cache key
    const permissionsHash = Array.isArray(appUser.permissions) 
      ? appUser.permissions.join(',') 
      : ''
    const customEnabled = appUser.custom_permissions_enabled ? '1' : '0'
    const cacheKey = `${appUser.id || 'anonymous'}-any-${permissions.join(',')}-${customEnabled}-${permissionsHash}`
    
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!
    }
    
    const result = hasAnyPermission(appUser as UserWithPermissions, permissions)
    permissionCache.set(cacheKey, result)
    
    setTimeout(() => {
      permissionCache.delete(cacheKey)
    }, cacheTimeout)
    
    return result
  }

  /**
   * Check if user has all of the specified permissions
   * فحص جميع الصلاحيات المحددة
   */
  const hasAllAccess = (permissions: string[]): boolean => {
    if (!appUser) return false
    
    // ✅ FIX: Include permissions hash in cache key
    const permissionsHash = Array.isArray(appUser.permissions) 
      ? appUser.permissions.join(',') 
      : ''
    const customEnabled = appUser.custom_permissions_enabled ? '1' : '0'
    const cacheKey = `${appUser.id || 'anonymous'}-all-${permissions.join(',')}-${customEnabled}-${permissionsHash}`
    
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!
    }
    
    const result = hasAllPermissions(appUser as UserWithPermissions, permissions)
    permissionCache.set(cacheKey, result)
    
    setTimeout(() => {
      permissionCache.delete(cacheKey)
    }, cacheTimeout)
    
    return result
  }

  /**
   * Check if user can perform a specific action on a category
   * فحص إمكانية تنفيذ إجراء محدد على فئة
   */
  const canDo = (category: string, action: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'): boolean => {
    if (!appUser) return false
    
    // ✅ FIX: Include permissions hash in cache key
    const permissionsHash = Array.isArray(appUser.permissions) 
      ? appUser.permissions.join(',') 
      : ''
    const customEnabled = appUser.custom_permissions_enabled ? '1' : '0'
    const cacheKey = `${appUser.id || 'anonymous'}-action-${category}.${action}-${customEnabled}-${permissionsHash}`
    
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!
    }
    
    const result = canPerformAction(appUser as UserWithPermissions, category, action)
    permissionCache.set(cacheKey, result)
    
    setTimeout(() => {
      permissionCache.delete(cacheKey)
    }, cacheTimeout)
    
    return result
  }

  /**
   * Get user's current permissions
   * الحصول على صلاحيات المستخدم الحالية
   */
  const getCurrentPermissions = (): string[] => {
    if (!appUser) return []
    return getUserPermissions(appUser as UserWithPermissions)
  }

  /**
   * Check if user is admin
   * فحص إذا كان المستخدم مدير
   */
  const isAdmin = (): boolean => {
    return appUser?.role === 'admin'
  }

  /**
   * Check if user has a specific role
   * فحص دور محدد
   */
  const hasRole = (role: string): boolean => {
    return appUser?.role === role
  }

  /**
   * Clear permission cache
   * تنظيف ذاكرة التخزين المؤقت للصلاحيات
   */
  const clearCache = (): void => {
    permissionCache.clear()
  }

  return {
    hasAccess,
    hasAnyAccess,
    hasAllAccess,
    canDo,
    getCurrentPermissions,
    isAdmin,
    hasRole,
    clearCache,
    user: appUser
  }
}

/**
 * Permission Guard Component Props
 * خصائص مكون حراسة الصلاحيات
 */
export interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  category?: string
  action?: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
  role?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Check if user has permission based on props
 * فحص إذا كان المستخدم لديه صلاحية بناءً على الخصائص
 */
export function checkPermissionFromProps(
  guard: ReturnType<typeof usePermissionGuard>,
  props: PermissionGuardProps
): boolean {
  const { permission, permissions, requireAll = false, category, action, role } = props
  
  // Check single permission
  if (permission) {
    return guard.hasAccess(permission)
  }
  
  // Check multiple permissions
  if (permissions) {
    return requireAll 
      ? guard.hasAllAccess(permissions)
      : guard.hasAnyAccess(permissions)
  }
  
  // Check category + action
  if (category && action) {
    return guard.canDo(category, action)
  }
  
  // Check role
  if (role) {
    return guard.hasRole(role)
  }
  
  return false
}

/**
 * Permission-based Route Protection
 * حماية المسارات بناءً على الصلاحيات
 */
export function useRoutePermission(route: string): boolean {
  const guard = usePermissionGuard()
  
  // Map routes to permissions
  const routePermissions: Record<string, string> = {
    '/projects': 'projects.view',
    '/activities': 'activities.view',
    '/kpi': 'kpi.view',
    '/reports': 'reports.view',
    '/users': 'users.view',
    '/settings': 'settings.view',
    '/settings/database': 'database.manage',
    '/settings/users': 'users.manage'
  }
  
  const requiredPermission = routePermissions[route]
  if (!requiredPermission) {
    console.log('⚠️ Permission Guard: No permission mapping for route:', route)
    return true // Allow access if no mapping exists
  }
  
  return guard.hasAccess(requiredPermission)
}

/**
 * Menu Item Permission Checker
 * فاحص صلاحيات عناصر القائمة
 */
export function useMenuPermission(menuItem: string): boolean {
  const guard = usePermissionGuard()
  
  // Map menu items to permissions
  const menuPermissions: Record<string, string> = {
    'projects': 'projects.view',
    'activities': 'activities.view',
    'kpi': 'kpi.view',
    'reports': 'reports.view',
    'users': 'users.view',
    'settings': 'settings.view',
    'database': 'database.view',
    'import-export': 'system.import'
  }
  
  const requiredPermission = menuPermissions[menuItem]
  if (!requiredPermission) {
    console.log('⚠️ Permission Guard: No permission mapping for menu item:', menuItem)
    return true
  }
  
  return guard.hasAccess(requiredPermission)
}

/**
 * Button Permission Checker
 * فاحص صلاحيات الأزرار
 */
export function useButtonPermission(buttonType: string, context?: string): boolean {
  const guard = usePermissionGuard()
  
  // Map button types to permissions
  const buttonPermissions: Record<string, string> = {
    'create-project': 'projects.create',
    'edit-project': 'projects.edit',
    'delete-project': 'projects.delete',
    'export-project': 'projects.export',
    
    'create-activities': 'activities.create',
    'edit-activities': 'activities.edit',
    'delete-activities': 'activities.delete',
    'approve-activities': 'activities.approve',
    'export-activities': 'activities.export',
    
    'create-kpi': 'kpi.create',
    'edit-kpi': 'kpi.edit',
    'delete-kpi': 'kpi.delete',
    'export-kpi': 'kpi.export',
    
    'create-user': 'users.create',
    'edit-user': 'users.edit',
    'delete-user': 'users.delete',
    'manage-permissions': 'users.permissions',
    
    'backup-database': 'database.backup',
    'restore-database': 'database.restore',
    'clear-table': 'database.clear',
    'export-table': 'database.export',
    'import-table': 'database.import'
  }
  
  const permissionKey = context ? `${context}-${buttonType}` : buttonType
  const requiredPermission = buttonPermissions[permissionKey] || buttonPermissions[buttonType]
  
  if (!requiredPermission) {
    console.log('⚠️ Permission Guard: No permission mapping for button:', permissionKey)
    return true
  }
  
  return guard.hasAccess(requiredPermission)
}

/**
 * Quick permission checks for common scenarios
 * فحوصات سريعة للسيناريوهات الشائعة
 */
export const quickChecks = {
  canCreateProjects: () => usePermissionGuard().hasAccess('projects.create'),
  canEditProjects: () => usePermissionGuard().hasAccess('projects.edit'),
  canDeleteProjects: () => usePermissionGuard().hasAccess('projects.delete'),
  
  canCreateActivities: () => usePermissionGuard().hasAccess('activities.create'),
  canEditActivities: () => usePermissionGuard().hasAccess('activities.edit'),
  canDeleteActivities: () => usePermissionGuard().hasAccess('activities.delete'),
  
  canCreateKPI: () => usePermissionGuard().hasAccess('kpi.create'),
  canEditKPI: () => usePermissionGuard().hasAccess('kpi.edit'),
  canDeleteKPI: () => usePermissionGuard().hasAccess('kpi.delete'),
  
  canManageUsers: () => usePermissionGuard().hasAccess('users.manage'),
  canManageDatabase: () => usePermissionGuard().hasAccess('database.manage'),
  canViewReports: () => usePermissionGuard().hasAccess('reports.view')
}

/**
 * Debug utility to log all user permissions
 * أداة تشخيص لتسجيل جميع صلاحيات المستخدم
 */
export function debugUserPermissions() {
  const guard = usePermissionGuard()
  const permissions = guard.getCurrentPermissions()
  
  console.log('🔍 Permission Debug: User Info', {
    email: guard.user?.email,
    role: guard.user?.role,
    permissionsCount: permissions.length,
    permissions: permissions
  })
  
  return permissions
}

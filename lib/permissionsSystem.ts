/**
 * Advanced Permissions System
 * نظام صلاحيات متقدم ودقيق لإدارة الوصول
 */

// تعريف جميع الصلاحيات الممكنة في النظام
export interface Permission {
  id: string
  name: string
  category: 'projects' | 'boq' | 'kpi' | 'users' | 'reports' | 'settings' | 'system' | 'database'
  description: string
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export' | 'approve' | 'backup' | 'restore'
}

// جميع الصلاحيات المتاحة
export const ALL_PERMISSIONS: Permission[] = [
  // Projects Permissions
  { id: 'projects.view', name: 'View Projects', category: 'projects', description: 'Can view projects list and details', action: 'view' },
  { id: 'projects.create', name: 'Create Projects', category: 'projects', description: 'Can create new projects', action: 'create' },
  { id: 'projects.edit', name: 'Edit Projects', category: 'projects', description: 'Can edit existing projects', action: 'edit' },
  { id: 'projects.delete', name: 'Delete Projects', category: 'projects', description: 'Can delete projects', action: 'delete' },
  { id: 'projects.export', name: 'Export Projects', category: 'projects', description: 'Can export projects data', action: 'export' },
  
  // BOQ Permissions
  { id: 'boq.view', name: 'View BOQ', category: 'boq', description: 'Can view BOQ activities', action: 'view' },
  { id: 'boq.create', name: 'Create Activities', category: 'boq', description: 'Can create BOQ activities', action: 'create' },
  { id: 'boq.edit', name: 'Edit Activities', category: 'boq', description: 'Can edit BOQ activities', action: 'edit' },
  { id: 'boq.delete', name: 'Delete Activities', category: 'boq', description: 'Can delete BOQ activities', action: 'delete' },
  { id: 'boq.approve', name: 'Approve Activities', category: 'boq', description: 'Can approve BOQ activities', action: 'approve' },
  { id: 'boq.export', name: 'Export BOQ', category: 'boq', description: 'Can export BOQ data', action: 'export' },
  
  // KPI Permissions
  { id: 'kpi.view', name: 'View KPIs', category: 'kpi', description: 'Can view KPI records', action: 'view' },
  { id: 'kpi.create', name: 'Create KPIs', category: 'kpi', description: 'Can create KPI records', action: 'create' },
  { id: 'kpi.edit', name: 'Edit KPIs', category: 'kpi', description: 'Can edit KPI records', action: 'edit' },
  { id: 'kpi.delete', name: 'Delete KPIs', category: 'kpi', description: 'Can delete KPI records', action: 'delete' },
  { id: 'kpi.export', name: 'Export KPIs', category: 'kpi', description: 'Can export KPI data', action: 'export' },
  
  // Reports Permissions
  { id: 'reports.view', name: 'View Reports', category: 'reports', description: 'Can view all reports', action: 'view' },
  { id: 'reports.daily', name: 'Daily Reports', category: 'reports', description: 'Can access daily reports', action: 'view' },
  { id: 'reports.weekly', name: 'Weekly Reports', category: 'reports', description: 'Can access weekly reports', action: 'view' },
  { id: 'reports.monthly', name: 'Monthly Reports', category: 'reports', description: 'Can access monthly reports', action: 'view' },
  { id: 'reports.financial', name: 'Financial Reports', category: 'reports', description: 'Can access financial reports', action: 'view' },
  { id: 'reports.export', name: 'Export Reports', category: 'reports', description: 'Can export reports', action: 'export' },
  { id: 'reports.print', name: 'Print Reports', category: 'reports', description: 'Can print reports', action: 'export' },
  
  // Users Permissions
  { id: 'users.view', name: 'View Users', category: 'users', description: 'Can view users list', action: 'view' },
  { id: 'users.create', name: 'Create Users', category: 'users', description: 'Can create new users', action: 'create' },
  { id: 'users.edit', name: 'Edit Users', category: 'users', description: 'Can edit user details', action: 'edit' },
  { id: 'users.delete', name: 'Delete Users', category: 'users', description: 'Can delete users', action: 'delete' },
  { id: 'users.permissions', name: 'Manage Permissions', category: 'users', description: 'Can manage user permissions', action: 'manage' },
  
  // Settings Permissions
  { id: 'settings.view', name: 'View Settings', category: 'settings', description: 'Can view settings', action: 'view' },
  { id: 'settings.company', name: 'Manage Company Settings', category: 'settings', description: 'Can manage company settings', action: 'manage' },
  { id: 'settings.divisions', name: 'Manage Divisions', category: 'settings', description: 'Can manage divisions', action: 'manage' },
  { id: 'settings.project_types', name: 'Manage Project Types', category: 'settings', description: 'Can manage project types', action: 'manage' },
  { id: 'settings.currencies', name: 'Manage Currencies', category: 'settings', description: 'Can manage currencies', action: 'manage' },
  { id: 'settings.activities', name: 'Manage Activities', category: 'settings', description: 'Can manage activity templates', action: 'manage' },
  { id: 'settings.holidays', name: 'Manage Holidays', category: 'settings', description: 'Can manage holidays and workdays', action: 'manage' },
  
  // System Permissions
  { id: 'system.import', name: 'Import Data', category: 'system', description: 'Can import data from files', action: 'manage' },
  { id: 'system.export', name: 'Export System Data', category: 'system', description: 'Can export all system data', action: 'export' },
  { id: 'system.backup', name: 'Backup System', category: 'system', description: 'Can backup system data', action: 'manage' },
  { id: 'system.audit', name: 'View Audit Logs', category: 'system', description: 'Can view system audit logs', action: 'view' },
  
  // Database Management Permissions (Admin Only)
  { id: 'database.view', name: 'View Database Stats', category: 'database', description: 'Can view database statistics and information', action: 'view' },
  { id: 'database.backup', name: 'Create Backups', category: 'database', description: 'Can create database backups', action: 'backup' },
  { id: 'database.restore', name: 'Restore Database', category: 'database', description: 'Can restore database from backups', action: 'restore' },
  { id: 'database.export', name: 'Export Tables', category: 'database', description: 'Can export individual tables', action: 'export' },
  { id: 'database.import', name: 'Import Tables', category: 'database', description: 'Can import data to tables', action: 'manage' },
  { id: 'database.clear', name: 'Clear Table Data', category: 'database', description: 'Can clear all data from tables (DANGEROUS)', action: 'delete' },
  { id: 'database.manage', name: 'Full Database Management', category: 'database', description: 'Complete database management access (Admin only)', action: 'manage' },
]

// الصلاحيات الافتراضية لكل دور
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // Admin - كل الصلاحيات
  admin: ALL_PERMISSIONS.map(p => p.id),
  
  // Manager - كل شيء ماعدا إدارة المستخدمين والنظام
  manager: [
    // Projects
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    // BOQ
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    // KPI
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    // Reports
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
    // Settings (manage most settings)
    'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays',
    // System (limited)
    'system.export', 'system.backup',
    // Database (view and export only - no dangerous operations)
    'database.view', 'database.export', 'database.backup'
  ],
  
  // Engineer - إنشاء وتعديل البيانات فقط
  engineer: [
    // Projects (view and export only)
    'projects.view', 'projects.export',
    // BOQ (create, edit, view)
    'boq.view', 'boq.create', 'boq.edit', 'boq.export',
    // KPI (all except delete)
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
    // Reports (view and export)
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print',
    // Settings (view only)
    'settings.view',
    // Database (view only)
    'database.view'
  ],
  
  // Viewer - عرض فقط
  viewer: [
    'projects.view',
    'boq.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'settings.view',
    'database.view'
  ]
}

// Extended User with Permissions
export interface UserWithPermissions {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'engineer' | 'viewer'
  division?: string
  permissions: string[] // Custom permissions (overrides default role permissions)
  custom_permissions_enabled: boolean // If true, use custom permissions instead of role defaults
  created_at: string
  updated_at: string
  last_login?: string
  is_active: boolean
}

/**
 * الحصول على صلاحيات المستخدم
 */
export function getUserPermissions(user: UserWithPermissions): string[] {
  // إذا كان لديه صلاحيات مخصصة مفعّلة، استخدمها
  if (user.custom_permissions_enabled && user.permissions && user.permissions.length > 0) {
    return user.permissions
  }
  
  // وإلا استخدم الصلاحيات الافتراضية للدور
  return DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
}

/**
 * التحقق من وجود صلاحية معينة
 */
export function hasPermission(user: UserWithPermissions | null, permission: string): boolean {
  if (!user) return false
  
  // Admin لديه كل الصلاحيات دائماً
  if (user.role === 'admin') return true
  
  const userPermissions = getUserPermissions(user)
  return userPermissions.includes(permission)
}

/**
 * التحقق من وجود أي صلاحية من مجموعة
 */
export function hasAnyPermission(user: UserWithPermissions | null, permissions: string[]): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  
  const userPermissions = getUserPermissions(user)
  return permissions.some(p => userPermissions.includes(p))
}

/**
 * التحقق من وجود جميع الصلاحيات
 */
export function hasAllPermissions(user: UserWithPermissions | null, permissions: string[]): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  
  const userPermissions = getUserPermissions(user)
  return permissions.every(p => userPermissions.includes(p))
}

/**
 * الحصول على الصلاحيات حسب الفئة
 */
export function getPermissionsByCategory(category: Permission['category']): Permission[] {
  return ALL_PERMISSIONS.filter(p => p.category === category)
}

/**
 * الحصول على الصلاحيات المفقودة
 */
export function getMissingPermissions(user: UserWithPermissions, requiredPermissions: string[]): Permission[] {
  const userPermissions = getUserPermissions(user)
  const missingIds = requiredPermissions.filter(p => !userPermissions.includes(p))
  return ALL_PERMISSIONS.filter(p => missingIds.includes(p.id))
}

/**
 * وصف الدور
 */
export function getRoleDescription(role: string): string {
  switch (role) {
    case 'admin':
      return 'Full system access with all permissions. Can manage users, permissions, system settings, and database operations including backups, restore, and data management.'
    case 'manager':
      return 'Can manage projects, activities, KPIs, and most settings (divisions, types, currencies). Can create backups and export data. Cannot manage users or perform dangerous database operations.'
    case 'engineer':
      return 'Can create and edit activities and KPIs. Can view projects, reports, and database stats. Can export data. Limited delete permissions.'
    case 'viewer':
      return 'Read-only access. Can view all data, reports, and database statistics but cannot create, edit, delete, or perform any management operations.'
    default:
      return 'Unknown role'
  }
}

/**
 * الحصول على عدد الصلاحيات لكل دور
 */
export function getPermissionsCount(role: string): number {
  return DEFAULT_ROLE_PERMISSIONS[role]?.length || 0
}

/**
 * مقارنة الصلاحيات بين دورين
 */
export function compareRolePermissions(role1: string, role2: string): {
  role1Only: string[]
  role2Only: string[]
  common: string[]
} {
  const perms1 = DEFAULT_ROLE_PERMISSIONS[role1] || []
  const perms2 = DEFAULT_ROLE_PERMISSIONS[role2] || []
  
  return {
    role1Only: perms1.filter(p => !perms2.includes(p)),
    role2Only: perms2.filter(p => !perms1.includes(p)),
    common: perms1.filter(p => perms2.includes(p))
  }
}

/**
 * التحقق من إمكانية تنفيذ عملية معينة
 */
export function canPerformAction(
  user: UserWithPermissions | null,
  category: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  
  const permissionId = `${category}.${action}`
  return hasPermission(user, permissionId)
}

/**
 * الحصول على قائمة العمليات المتاحة للمستخدم في فئة معينة
 */
export function getAvailableActions(
  user: UserWithPermissions | null,
  category: string
): string[] {
  if (!user) return []
  
  const userPermissions = getUserPermissions(user)
  const categoryPermissions = userPermissions.filter(p => p.startsWith(category + '.'))
  
  return categoryPermissions.map(p => p.split('.')[1])
}

/**
 * تقرير صلاحيات كامل للمستخدم
 */
export function generatePermissionsReport(user: UserWithPermissions): {
  role: string
  totalPermissions: number
  permissionsByCategory: Record<string, Permission[]>
  customPermissionsEnabled: boolean
  missingFromRole: Permission[]
  extraFromRole: Permission[]
} {
  const userPermissions = getUserPermissions(user)
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || []
  
  const permissionsByCategory = ALL_PERMISSIONS
    .filter(p => userPermissions.includes(p.id))
    .reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = []
      acc[p.category].push(p)
      return acc
    }, {} as Record<string, Permission[]>)
  
  // الصلاحيات المفقودة من الدور
  const missingFromRole = ALL_PERMISSIONS.filter(p => 
    rolePermissions.includes(p.id) && !userPermissions.includes(p.id)
  )
  
  // الصلاحيات الإضافية عن الدور
  const extraFromRole = ALL_PERMISSIONS.filter(p => 
    !rolePermissions.includes(p.id) && userPermissions.includes(p.id)
  )
  
  return {
    role: user.role,
    totalPermissions: userPermissions.length,
    permissionsByCategory,
    customPermissionsEnabled: user.custom_permissions_enabled,
    missingFromRole,
    extraFromRole
  }
}

export default {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsByCategory,
  getMissingPermissions,
  getRoleDescription,
  getPermissionsCount,
  compareRolePermissions,
  canPerformAction,
  getAvailableActions,
  generatePermissionsReport
}


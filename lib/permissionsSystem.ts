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
  // Dashboard Permissions
  { id: 'dashboard.view', name: 'View Dashboard', category: 'system', description: 'Can view main dashboard', action: 'view' },
  
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
  { id: 'settings.holidays.view', name: 'View Holidays', category: 'settings', description: 'Can view holidays and workdays configuration', action: 'view' },
  { id: 'settings.holidays.create', name: 'Create Holidays', category: 'settings', description: 'Can create new holidays', action: 'create' },
  { id: 'settings.holidays.edit', name: 'Edit Holidays', category: 'settings', description: 'Can edit existing holidays', action: 'edit' },
  { id: 'settings.holidays.delete', name: 'Delete Holidays', category: 'settings', description: 'Can delete holidays', action: 'delete' },
  
  // System Permissions
  { id: 'system.import', name: 'Import Data', category: 'system', description: 'Can import data from files', action: 'manage' },
  { id: 'system.export', name: 'Export System Data', category: 'system', description: 'Can export all system data', action: 'export' },
  { id: 'system.backup', name: 'Backup System', category: 'system', description: 'Can backup system data', action: 'manage' },
  { id: 'system.audit', name: 'View Audit Logs', category: 'system', description: 'Can view system audit logs', action: 'view' },
  { id: 'system.search', name: 'Search System', category: 'system', description: 'Can use global search functionality', action: 'view' },
  
  // Database Management Permissions (Admin Only)
  { id: 'database.view', name: 'View Database Stats', category: 'database', description: 'Can view database statistics and information', action: 'view' },
  { id: 'database.backup', name: 'Create Backups', category: 'database', description: 'Can create database backups', action: 'backup' },
  { id: 'database.restore', name: 'Restore Database', category: 'database', description: 'Can restore database from backups', action: 'restore' },
  { id: 'database.export', name: 'Export Tables', category: 'database', description: 'Can export individual tables', action: 'export' },
  { id: 'database.import', name: 'Import Tables', category: 'database', description: 'Can import data to tables', action: 'manage' },
  { id: 'database.clear', name: 'Clear Table Data', category: 'database', description: 'Can clear all data from tables (DANGEROUS)', action: 'delete' },
  { id: 'database.manage', name: 'Full Database Management', category: 'database', description: 'Complete database management access (Admin only)', action: 'manage' },
  { id: 'database.templates', name: 'Download Templates', category: 'database', description: 'Can download data templates for tables', action: 'export' },
  { id: 'database.analyze', name: 'Performance Analysis', category: 'database', description: 'Can analyze database performance and size', action: 'view' },
  { id: 'database.cleanup', name: 'Data Cleanup', category: 'database', description: 'Can clean up old or unnecessary data', action: 'delete' },
]

// الصلاحيات الافتراضية لكل دور
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // Admin - كل الصلاحيات
  admin: ALL_PERMISSIONS.map(p => p.id),
  
  // Manager - كل شيء ماعدا إدارة المستخدمين والنظام
  manager: [
    // Dashboard
    'dashboard.view',
    // Projects
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    // BOQ
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    // KPI
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    // Reports
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
    // Settings (manage most settings)
    'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete',
    // System (limited)
    'system.export', 'system.backup', 'system.search',
    // Database (view and export only - no dangerous operations)
    'database.view', 'database.export', 'database.backup'
  ],
  
  // Engineer - إنشاء وتعديل البيانات فقط
  engineer: [
    // Dashboard
    'dashboard.view',
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
    // System (search only)
    'system.search',
    // Database (view only)
    'database.view'
  ],
  
  // Viewer - عرض فقط
  viewer: [
    'dashboard.view',
    'projects.view',
    'boq.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'settings.view',
    'system.search',
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
  console.log('🔍 getUserPermissions called:', {
    userEmail: user.email,
    userRole: user.role,
    customEnabled: user.custom_permissions_enabled,
    savedPermissions: user.permissions?.length || 0,
    savedPermissionsList: user.permissions
  })

  // الحصول على الصلاحيات الافتراضية للدور
  const defaultRolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
  
  // إذا كان نظام الصلاحيات المخصصة مفعل وكان لديه صلاحيات محفوظة
  if (user.custom_permissions_enabled && user.permissions && user.permissions.length > 0) {
    console.log('✅ Using custom permissions:', user.permissions.length)
    return user.permissions
  }
  
  // إذا كان لديه صلاحيات إضافية (حتى لو لم يكن في وضع مخصص)
  if (user.permissions && user.permissions.length > 0) {
    // دمج الصلاحيات الافتراضية مع الصلاحيات الإضافية
    const combinedPermissions = Array.from(new Set([...defaultRolePermissions, ...user.permissions]))
    console.log('✅ Using combined permissions:', {
      default: defaultRolePermissions.length,
      additional: user.permissions.length,
      total: combinedPermissions.length
    })
    return combinedPermissions
  }
  
  // وإلا استخدم الصلاحيات الافتراضية للدور فقط
  console.log('✅ Using default role permissions only:', defaultRolePermissions.length, 'for role:', user.role)
  return defaultRolePermissions
}

/**
 * التحقق من وجود صلاحية معينة
 */
export function hasPermission(user: UserWithPermissions | null, permission: string): boolean {
  console.log('🔍 Permission Check:', {
    permission,
    userEmail: user?.email,
    userRole: user?.role,
    userPermissionsCount: user?.permissions?.length,
    userPermissions: user?.permissions,
    customEnabled: user?.custom_permissions_enabled
  })
  
  if (!user) {
    console.log('❌ Permission denied: No user')
    return false
  }
  
  // Admin لديه كل الصلاحيات دائماً
  if (user.role === 'admin') {
    console.log('✅ Permission granted: Admin role')
    return true
  }
  
  const userPermissions = getUserPermissions(user)
  const hasAccess = userPermissions.includes(permission)
  
  console.log('🔍 Permission result:', {
    permission,
    hasAccess,
    userPermissionsCount: userPermissions.length,
    permissionSource: user.custom_permissions_enabled ? 'Custom' : 'Role + Additional'
  })
  
  return hasAccess
}

/**
 * دالة مساعدة لفهم صلاحيات المستخدم
 */
export function explainUserPermissions(user: UserWithPermissions): {
  role: string
  mode: 'role-only' | 'role-plus-additional' | 'custom-only'
  defaultPermissions: string[]
  additionalPermissions: string[]
  finalPermissions: string[]
  explanation: string
} {
  const defaultRolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
  const finalPermissions = getUserPermissions(user)
  
  let mode: 'role-only' | 'role-plus-additional' | 'custom-only'
  let additionalPermissions: string[] = []
  let explanation: string
  
  if (user.custom_permissions_enabled && user.permissions && user.permissions.length > 0) {
    mode = 'custom-only'
    explanation = `المستخدم في وضع الصلاحيات المخصصة. يحصل على ${user.permissions.length} صلاحية مخصصة فقط.`
  } else if (user.permissions && user.permissions.length > 0) {
    mode = 'role-plus-additional'
    additionalPermissions = user.permissions.filter(p => !defaultRolePermissions.includes(p))
    explanation = `المستخدم يحصل على صلاحيات الدور الافتراضية (${defaultRolePermissions.length}) بالإضافة إلى ${additionalPermissions.length} صلاحية إضافية.`
  } else {
    mode = 'role-only'
    explanation = `المستخدم يحصل على صلاحيات الدور الافتراضية فقط (${defaultRolePermissions.length} صلاحية).`
  }
  
  return {
    role: user.role,
    mode,
    defaultPermissions: defaultRolePermissions,
    additionalPermissions,
    finalPermissions,
    explanation
  }
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
  const permissionId = `${category}.${action}`
  console.log('🔍 Action Check:', {
    category,
    action,
    permissionId,
    userEmail: user?.email,
    userRole: user?.role
  })
  
  if (!user) {
    console.log('❌ Action denied: No user')
    return false
  }
  if (user.role === 'admin') {
    console.log('✅ Action granted: Admin role')
    return true
  }
  
  const result = hasPermission(user, permissionId)
  console.log('🔍 Action result:', {
    permissionId,
    result
  })
  
  return result
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
 * التحقق من صحة الصلاحيات ومنع التضاربات المنطقية
 * Validate permissions and prevent logical conflicts
 */
export function validatePermissions(permissions: string[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // فحص: هل توجد صلاحيات مكررة؟
  const uniquePermissions = Array.from(new Set(permissions))
  if (permissions.length !== uniquePermissions.length) {
    warnings.push('تحذير: توجد صلاحيات مكررة. سيتم إزالة التكرارات.')
  }
  
  // فحص: هل توجد صلاحيات غير موجودة؟
  const validPermissionIds = ALL_PERMISSIONS.map(p => p.id)
  uniquePermissions.forEach(perm => {
    if (!validPermissionIds.includes(perm)) {
      errors.push(`خطأ: الصلاحية "${perm}" غير موجودة في النظام.`)
    }
  })
  
  // فحص: هل توجد صلاحيات متضاربة منطقياً؟
  const categories = ['projects', 'boq', 'kpi', 'reports', 'users', 'settings', 'database']
  
  categories.forEach(category => {
    const categoryPerms = uniquePermissions.filter(p => p.startsWith(category + '.'))
    const hasView = categoryPerms.includes(`${category}.view`)
    const hasCreate = categoryPerms.includes(`${category}.create`)
    const hasEdit = categoryPerms.includes(`${category}.edit`)
    const hasDelete = categoryPerms.includes(`${category}.delete`)
    const hasManage = categoryPerms.includes(`${category}.manage`)
    
    // إذا كان لديه manage، لا حاجة لـ view (manage يشمل كل شيء)
    if (hasManage) {
      return
    }
    
    // تحذير: إذا كان لديه create/edit/delete بدون view
    if ((hasCreate || hasEdit || hasDelete) && !hasView) {
      warnings.push(
        `تحذير: لديك صلاحية إنشاء/تعديل/حذف في "${category}" لكن ليس لديك صلاحية عرض. ` +
        `قد لا تستطيع رؤية البيانات التي تعدلها.`
      )
    }
  })
  
  // فحص: هل عدد الصلاحيات كبير جداً؟
  if (uniquePermissions.length > 40) {
    warnings.push(
      `تحذير: لديك ${uniquePermissions.length} صلاحية. ` +
      `فكر في استخدام دور بدلاً من الصلاحيات المخصصة لتحسين الأداء.`
    )
  }
  
  const isValid = errors.length === 0
  
  return {
    isValid,
    errors,
    warnings
  }
}

/**
 * تنظيف الصلاحيات وإزالة التكرارات
 * Clean permissions and remove duplicates
 */
export function cleanPermissions(permissions: string[]): string[] {
  // إزالة التكرارات
  const unique = Array.from(new Set(permissions))
  
  // إزالة الصلاحيات غير الموجودة
  const validPermissionIds = ALL_PERMISSIONS.map(p => p.id)
  const valid = unique.filter(p => validPermissionIds.includes(p))
  
  // ترتيب الصلاحيات حسب الفئة
  return valid.sort((a, b) => {
    const categoryA = a.split('.')[0]
    const categoryB = b.split('.')[0]
    if (categoryA === categoryB) {
      return a.localeCompare(b)
    }
    return categoryA.localeCompare(categoryB)
  })
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


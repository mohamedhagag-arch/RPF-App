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
  { id: 'kpi.approve', name: 'Approve KPIs', category: 'kpi', description: 'Can approve Actual KPIs created by engineers. Users with this permission receive notifications when new KPIs are created and can approve them to appear on the main KPI page', action: 'approve' },
  
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
  
  // Directory & User Directory Permissions
  { id: 'directory.view', name: 'View Directory', category: 'users', description: 'Can view user directory and team members', action: 'view' },
  { id: 'directory.export', name: 'Export Directory', category: 'users', description: 'Can export user directory data', action: 'export' },
  { id: 'directory.search', name: 'Search Directory', category: 'users', description: 'Can search in user directory', action: 'view' },
  
  // QR Code & Profile Permissions
  { id: 'profile.view', name: 'View Profile', category: 'users', description: 'Can view user profiles', action: 'view' },
  { id: 'profile.edit', name: 'Edit Profile', category: 'users', description: 'Can edit own profile', action: 'edit' },
  { id: 'profile.qr', name: 'Generate QR Code', category: 'users', description: 'Can generate QR codes for profiles', action: 'export' },
  { id: 'profile.photo', name: 'Manage Profile Photos', category: 'users', description: 'Can upload and manage profile photos', action: 'edit' },
  
  // Import/Export & Data Management
  { id: 'data.import', name: 'Import Data', category: 'system', description: 'Can import data from files', action: 'manage' },
  { id: 'data.export', name: 'Export Data', category: 'system', description: 'Can export system data', action: 'export' },
  { id: 'data.templates', name: 'Download Templates', category: 'system', description: 'Can download data templates', action: 'export' },
  { id: 'data.validation', name: 'Validate Data', category: 'system', description: 'Can validate imported data', action: 'view' },
  
  // Advanced Analytics & Insights
  { id: 'analytics.view', name: 'View Analytics', category: 'system', description: 'Can view advanced analytics and insights', action: 'view' },
  { id: 'analytics.export', name: 'Export Analytics', category: 'system', description: 'Can export analytics data', action: 'export' },
  { id: 'analytics.dashboard', name: 'Analytics Dashboard', category: 'system', description: 'Can access analytics dashboard', action: 'view' },
  
  // Performance & Monitoring
  { id: 'performance.view', name: 'View Performance', category: 'system', description: 'Can view system performance metrics', action: 'view' },
  { id: 'performance.monitor', name: 'Monitor Performance', category: 'system', description: 'Can monitor system performance', action: 'view' },
  { id: 'performance.optimize', name: 'Optimize Performance', category: 'system', description: 'Can optimize system performance', action: 'manage' },
  
  // Notifications & Alerts
  { id: 'notifications.view', name: 'View Notifications', category: 'system', description: 'Can view system notifications', action: 'view' },
  { id: 'notifications.manage', name: 'Manage Notifications', category: 'system', description: 'Can manage notification settings', action: 'manage' },
  { id: 'alerts.view', name: 'View Alerts', category: 'system', description: 'Can view system alerts', action: 'view' },
  { id: 'alerts.manage', name: 'Manage Alerts', category: 'system', description: 'Can manage alert settings', action: 'manage' },
  
  // Advanced Features & Integrations
  { id: 'integrations.view', name: 'View Integrations', category: 'system', description: 'Can view system integrations', action: 'view' },
  { id: 'integrations.manage', name: 'Manage Integrations', category: 'system', description: 'Can manage system integrations', action: 'manage' },
  { id: 'api.access', name: 'API Access', category: 'system', description: 'Can access system APIs', action: 'view' },
  { id: 'api.manage', name: 'Manage API', category: 'system', description: 'Can manage API settings', action: 'manage' },
  
  // Workflow & Automation
  { id: 'workflow.view', name: 'View Workflows', category: 'system', description: 'Can view workflow configurations', action: 'view' },
  { id: 'workflow.create', name: 'Create Workflows', category: 'system', description: 'Can create new workflows', action: 'create' },
  { id: 'workflow.edit', name: 'Edit Workflows', category: 'system', description: 'Can edit workflows', action: 'edit' },
  { id: 'workflow.delete', name: 'Delete Workflows', category: 'system', description: 'Can delete workflows', action: 'delete' },
  { id: 'automation.view', name: 'View Automation', category: 'system', description: 'Can view automation rules', action: 'view' },
  { id: 'automation.manage', name: 'Manage Automation', category: 'system', description: 'Can manage automation rules', action: 'manage' },
  
  // Security & Compliance
  { id: 'security.view', name: 'View Security', category: 'system', description: 'Can view security settings', action: 'view' },
  { id: 'security.manage', name: 'Manage Security', category: 'system', description: 'Can manage security settings', action: 'manage' },
  { id: 'compliance.view', name: 'View Compliance', category: 'system', description: 'Can view compliance reports', action: 'view' },
  { id: 'compliance.manage', name: 'Manage Compliance', category: 'system', description: 'Can manage compliance settings', action: 'manage' },
  
  // Advanced User Management
  { id: 'users.roles', name: 'Manage User Roles', category: 'users', description: 'Can assign and manage user roles', action: 'manage' },
  { id: 'users.groups', name: 'Manage User Groups', category: 'users', description: 'Can create and manage user groups', action: 'manage' },
  { id: 'users.bulk', name: 'Bulk User Operations', category: 'users', description: 'Can perform bulk user operations', action: 'manage' },
  { id: 'users.import', name: 'Import Users', category: 'users', description: 'Can import users from files', action: 'manage' },
  { id: 'users.export', name: 'Export Users', category: 'users', description: 'Can export user data', action: 'export' },
  
  // Advanced Reports & Lookahead
  { id: 'reports.lookahead', name: 'Lookahead Reports', category: 'reports', description: 'Can access lookahead planning reports', action: 'view' },
  { id: 'reports.critical', name: 'Critical Path Reports', category: 'reports', description: 'Can access critical path analysis reports', action: 'view' },
  { id: 'reports.performance', name: 'Performance Reports', category: 'reports', description: 'Can access performance analysis reports', action: 'view' },
  { id: 'reports.custom', name: 'Custom Reports', category: 'reports', description: 'Can create custom reports', action: 'create' },
  
  // Project Types & Activities Management
  { id: 'project_types.view', name: 'View Project Types', category: 'settings', description: 'Can view project types', action: 'view' },
  { id: 'project_types.create', name: 'Create Project Types', category: 'settings', description: 'Can create new project types', action: 'create' },
  { id: 'project_types.edit', name: 'Edit Project Types', category: 'settings', description: 'Can edit project types', action: 'edit' },
  { id: 'project_types.delete', name: 'Delete Project Types', category: 'settings', description: 'Can delete project types', action: 'delete' },
  { id: 'activities.view', name: 'View Activities', category: 'settings', description: 'Can view activity templates', action: 'view' },
  { id: 'activities.create', name: 'Create Activities', category: 'settings', description: 'Can create activity templates', action: 'create' },
  { id: 'activities.edit', name: 'Edit Activities', category: 'settings', description: 'Can edit activity templates', action: 'edit' },
  { id: 'activities.delete', name: 'Delete Activities', category: 'settings', description: 'Can delete activity templates', action: 'delete' },
  
  // Departments & Job Titles
  { id: 'departments.view', name: 'View Departments', category: 'settings', description: 'Can view departments', action: 'view' },
  { id: 'departments.create', name: 'Create Departments', category: 'settings', description: 'Can create departments', action: 'create' },
  { id: 'departments.edit', name: 'Edit Departments', category: 'settings', description: 'Can edit departments', action: 'edit' },
  { id: 'departments.delete', name: 'Delete Departments', category: 'settings', description: 'Can delete departments', action: 'delete' },
  { id: 'job_titles.view', name: 'View Job Titles', category: 'settings', description: 'Can view job titles', action: 'view' },
  { id: 'job_titles.create', name: 'Create Job Titles', category: 'settings', description: 'Can create job titles', action: 'create' },
  { id: 'job_titles.edit', name: 'Edit Job Titles', category: 'settings', description: 'Can edit job titles', action: 'edit' },
  { id: 'job_titles.delete', name: 'Delete Job Titles', category: 'settings', description: 'Can delete job titles', action: 'delete' },
  
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
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export', 'kpi.approve',
    // Reports
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
    'reports.lookahead', 'reports.critical', 'reports.performance', 'reports.custom',
    // Settings (manage most settings)
    'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete',
    'project_types.view', 'project_types.create', 'project_types.edit', 'project_types.delete',
    'activities.view', 'activities.create', 'activities.edit', 'activities.delete',
    'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
    'job_titles.view', 'job_titles.create', 'job_titles.edit', 'job_titles.delete',
    // Users (limited)
    'users.view', 'users.roles', 'users.groups', 'users.bulk', 'users.import', 'users.export',
    'directory.view', 'directory.export', 'directory.search',
    'profile.view', 'profile.edit', 'profile.qr', 'profile.photo',
    // System (limited)
    'system.export', 'system.backup', 'system.search', 'system.audit',
    'data.import', 'data.export', 'data.templates', 'data.validation',
    'analytics.view', 'analytics.export', 'analytics.dashboard',
    'performance.view', 'performance.monitor',
    'notifications.view', 'notifications.manage', 'alerts.view', 'alerts.manage',
    'integrations.view', 'integrations.manage', 'api.access', 'api.manage',
    'workflow.view', 'workflow.create', 'workflow.edit', 'workflow.delete',
    'automation.view', 'automation.manage',
    'security.view', 'security.manage', 'compliance.view', 'compliance.manage',
    // Database (view and export only - no dangerous operations)
    'database.view', 'database.export', 'database.backup', 'database.templates', 'database.analyze'
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
    'reports.lookahead', 'reports.critical', 'reports.performance',
    // Settings (view only)
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 'job_titles.view',
    // Users (limited)
    'directory.view', 'directory.search', 'profile.view', 'profile.edit', 'profile.qr', 'profile.photo',
    // System (limited)
    'system.search', 'data.export', 'data.templates', 'analytics.view', 'performance.view',
    'notifications.view', 'alerts.view', 'integrations.view', 'api.access',
    'workflow.view', 'automation.view', 'security.view', 'compliance.view',
    // Database (view only)
    'database.view', 'database.templates'
  ],
  
  // Viewer - عرض فقط
  viewer: [
    'dashboard.view',
    'projects.view',
    'boq.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'reports.lookahead', 'reports.critical', 'reports.performance',
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 'job_titles.view',
    'directory.view', 'directory.search', 'profile.view',
    'system.search', 'analytics.view', 'performance.view',
    'notifications.view', 'alerts.view', 'integrations.view',
    'workflow.view', 'automation.view', 'security.view', 'compliance.view',
    'database.view'
  ],
  
  // Planner - قسم التخطيط - يمكنه الموافقة على Planned KPIs
  planner: [
    // Dashboard
    'dashboard.view',
    // Projects (view and export)
    'projects.view', 'projects.export',
    // BOQ (view and approve)
    'boq.view', 'boq.approve', 'boq.export',
    // KPI (view, approve planned KPIs)
    'kpi.view', 'kpi.approve', 'kpi.export',
    // Reports (view and export)
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print',
    'reports.lookahead', 'reports.critical', 'reports.performance',
    // Settings (view only)
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 'job_titles.view',
    // Users (limited)
    'directory.view', 'directory.search', 'profile.view', 'profile.edit',
    // System (limited)
    'system.search', 'data.export', 'data.templates', 'analytics.view', 'performance.view',
    'notifications.view', 'alerts.view', 'workflow.view', 'automation.view',
    'database.view', 'database.templates'
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
  
  // ✅ إذا كان نظام الصلاحيات المخصصة مفعل (حتى لو كان Admin)
  if (user.custom_permissions_enabled) {
    // استخدم الصلاحيات المخصصة فقط
    const customPerms = user.permissions || []
    console.log('✅ Using CUSTOM permissions ONLY:', customPerms.length, '(custom mode enabled)')
    return customPerms
  }
  
  // إذا لم يكن custom mode، استخدم الصلاحيات الافتراضية للدور
  console.log('✅ Using default role permissions:', defaultRolePermissions.length, 'for role:', user.role)
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
  
  // ✅ Admin لديه كل الصلاحيات دائماً (إلا إذا كان custom_permissions_enabled)
  if (user.role === 'admin' && !user.custom_permissions_enabled) {
    console.log('✅ Permission granted: Admin role (using default admin permissions)')
    return true
  }
  
  // إذا كان Admin مع custom permissions، نفحص الصلاحيات المخصصة
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


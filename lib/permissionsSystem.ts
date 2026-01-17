/**
 * Advanced Permissions System
 * نظام صلاحيات متقدم ودقيق لإدارة الوصول
 */

// تعريف جميع الصلاحيات الممكنة في النظام
export interface Permission {
  id: string
  name: string
  category: 'projects' | 'boq' | 'kpi' | 'users' | 'reports' | 'settings' | 'system' | 'database' | 'cost-control' | 'hr' | 'procurement' | 'commercial' | 'activities'
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
  { id: 'projects.import', name: 'Import Projects', category: 'projects', description: 'Can import projects from files', action: 'manage' },
  { id: 'projects.print', name: 'Print Projects', category: 'projects', description: 'Can print projects reports', action: 'export' },
  { id: 'projects.zones', name: 'Manage Zones', category: 'projects', description: 'Can manage project zones', action: 'manage' },
  
  // Activities Permissions
  { id: 'activities.view', name: 'View Activities', category: 'activities', description: 'Can view activities', action: 'view' },
  { id: 'activities.create', name: 'Create Activities', category: 'activities', description: 'Can create activities', action: 'create' },
  { id: 'activities.edit', name: 'Edit Activities', category: 'activities', description: 'Can edit activities', action: 'edit' },
  { id: 'activities.delete', name: 'Delete Activities', category: 'activities', description: 'Can delete activities', action: 'delete' },
  { id: 'activities.approve', name: 'Approve Activities', category: 'activities', description: 'Can approve activities', action: 'approve' },
  { id: 'activities.export', name: 'Export Activities', category: 'activities', description: 'Can export activities data', action: 'export' },
  { id: 'activities.import', name: 'Import Activities', category: 'activities', description: 'Can import activities from files', action: 'manage' },
  { id: 'activities.print', name: 'Print Activities', category: 'activities', description: 'Can print activities reports', action: 'export' },
  
  // KPI Permissions
  { id: 'kpi.view', name: 'View KPIs', category: 'kpi', description: 'Can view KPI records', action: 'view' },
  { id: 'kpi.create', name: 'Create KPIs', category: 'kpi', description: 'Can create KPI records', action: 'create' },
  { id: 'kpi.create.standard', name: 'Add New KPI', category: 'kpi', description: 'Can access the standard "Add New KPI" form to create KPI records', action: 'create' },
  { id: 'kpi.create.smart', name: 'Smart Site KPI Form', category: 'kpi', description: 'Can access the Smart Site KPI Form to create KPI records with intelligent workflow', action: 'create' },
  { id: 'kpi.create.legacy', name: 'Legacy Site Form', category: 'kpi', description: 'Can access the Legacy Site Form to create KPI records', action: 'create' },
  { id: 'kpi.edit', name: 'Edit KPIs', category: 'kpi', description: 'Can edit KPI records', action: 'edit' },
  { id: 'kpi.delete', name: 'Delete KPIs', category: 'kpi', description: 'Can delete KPI records', action: 'delete' },
  { id: 'kpi.export', name: 'Export KPIs', category: 'kpi', description: 'Can export KPI data', action: 'export' },
  { id: 'kpi.import', name: 'Import KPIs', category: 'kpi', description: 'Can import KPI records from files', action: 'manage' },
  { id: 'kpi.print', name: 'Print KPIs', category: 'kpi', description: 'Can print KPI reports', action: 'export' },
  { id: 'kpi.approve', name: 'Approve KPIs', category: 'kpi', description: 'Can approve Actual KPIs created by engineers. Users with this permission receive notifications when new KPIs are created and can approve them to appear on the main KPI page', action: 'approve' },
  { id: 'kpi.need_to_submit', name: 'Need to Submit', category: 'kpi', description: 'Can access the "Need to Submit" feature to view and manage KPIs pending approval. This permission allows viewing pending KPIs that need to be submitted for approval', action: 'approve' },
  
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
  { id: 'settings.login_security', name: 'Manage Login Security', category: 'settings', description: 'Can manage login security settings including rate limiting, OTP, OAuth, password validation, and authentication methods', action: 'manage' },
  { id: 'settings.maintenance_mode', name: 'Manage Maintenance Mode', category: 'settings', description: 'Can enable/disable maintenance mode and configure maintenance page settings. When enabled, the site will be closed for all users except admin', action: 'manage' },
  { id: 'settings.manage', name: 'Manage All Settings', category: 'settings', description: 'Can manage all system settings', action: 'manage' },
  
  // System Permissions
  { id: 'system.import', name: 'Import Data', category: 'system', description: 'Can import data from files', action: 'manage' },
  { id: 'system.export', name: 'Export System Data', category: 'system', description: 'Can export all system data', action: 'export' },
  { id: 'system.backup', name: 'Backup System', category: 'system', description: 'Can backup system data', action: 'manage' },
  { id: 'system.audit', name: 'View Audit Logs', category: 'system', description: 'Can view system audit logs', action: 'view' },
  { id: 'system.search', name: 'Search System', category: 'system', description: 'Can use global search functionality', action: 'view' },
  
  // Audit Log Permissions (Detailed change tracking for BOQ, Projects, KPI)
  { id: 'audit_log.view', name: 'View Audit Logs', category: 'system', description: 'Can view detailed audit logs for BOQ, Projects, and KPI changes', action: 'view' },
  { id: 'audit_log.export', name: 'Export Audit Logs', category: 'system', description: 'Can export audit log data', action: 'export' },
  
  // User Guide Permissions
  { id: 'user_guide.view', name: 'View User Guide', category: 'system', description: 'Can view user guides and tutorials', action: 'view' },
  { id: 'user_guide.manage', name: 'Manage User Guide', category: 'system', description: 'Can create, edit, and delete user guides (Admin only)', action: 'manage' },
  
  // Activity Log Permissions (User activity tracking)
  { id: 'activity_log.view', name: 'View Activity Log', category: 'system', description: 'Can view user activity logs and tracking data', action: 'view' },
  { id: 'activity_log.export', name: 'Export Activity Log', category: 'system', description: 'Can export activity log data', action: 'export' },
  
  // Active Users Permissions
  { id: 'active_users.view', name: 'View Active Users', category: 'users', description: 'Can view currently active/online users', action: 'view' },
  
  // Directory & User Directory Permissions
  { id: 'directory.view', name: 'View Directory', category: 'users', description: 'Can view user directory and team members', action: 'view' },
  { id: 'directory.export', name: 'Export Directory', category: 'users', description: 'Can export user directory data', action: 'export' },
  { id: 'directory.search', name: 'Search Directory', category: 'users', description: 'Can search in user directory', action: 'view' },
  
  // QR Code & Profile Permissions
  { id: 'profile.view', name: 'View Profile', category: 'users', description: 'Can view user profiles', action: 'view' },
  { id: 'profile.edit', name: 'Edit Profile', category: 'users', description: 'Can edit own profile', action: 'edit' },
  { id: 'profile.qr', name: 'Generate QR Code', category: 'users', description: 'Can generate QR codes for profiles', action: 'export' },
  { id: 'profile.photo', name: 'Manage Profile Photos', category: 'users', description: 'Can upload and manage profile photos', action: 'edit' },
  { id: 'profile.share', name: 'Share Profile', category: 'users', description: 'Can share profile links and QR codes', action: 'view' },
  
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
  
  // Cost Control Permissions
  { id: 'cost_control.view', name: 'View Cost Control', category: 'cost-control', description: 'Can view cost control overview and statistics', action: 'view' },
  { id: 'cost_control.manpower.view', name: 'View Manpower', category: 'cost-control', description: 'Can view manpower data and records', action: 'view' },
  { id: 'cost_control.manpower.create', name: 'Create Manpower Records', category: 'cost-control', description: 'Can create new manpower records', action: 'create' },
  { id: 'cost_control.manpower.edit', name: 'Edit Manpower Records', category: 'cost-control', description: 'Can edit existing manpower records', action: 'edit' },
  { id: 'cost_control.manpower.delete', name: 'Delete Manpower Records', category: 'cost-control', description: 'Can delete manpower records', action: 'delete' },
  { id: 'cost_control.manpower.import', name: 'Import Manpower Data', category: 'cost-control', description: 'Can import manpower data from files', action: 'manage' },
  { id: 'cost_control.manpower.export', name: 'Export Manpower Data', category: 'cost-control', description: 'Can export manpower data', action: 'export' },
  { id: 'cost_control.designation_rates.view', name: 'View Designation Rates', category: 'cost-control', description: 'Can view designation hourly rates', action: 'view' },
  { id: 'cost_control.designation_rates.create', name: 'Create Designation Rates', category: 'cost-control', description: 'Can create new designation rates', action: 'create' },
  { id: 'cost_control.designation_rates.edit', name: 'Edit Designation Rates', category: 'cost-control', description: 'Can edit designation rates', action: 'edit' },
  { id: 'cost_control.designation_rates.delete', name: 'Delete Designation Rates', category: 'cost-control', description: 'Can delete designation rates', action: 'delete' },
  { id: 'cost_control.designation_rates.export', name: 'Export Designation Rates', category: 'cost-control', description: 'Can export designation rates to CSV', action: 'export' },
  { id: 'cost_control.machine_list.view', name: 'View Machine List', category: 'cost-control', description: 'Can view machine list and equipment', action: 'view' },
  { id: 'cost_control.machine_list.create', name: 'Create Machines', category: 'cost-control', description: 'Can add new machines to the list', action: 'create' },
  { id: 'cost_control.machine_list.edit', name: 'Edit Machines', category: 'cost-control', description: 'Can edit machine information', action: 'edit' },
  { id: 'cost_control.machine_list.delete', name: 'Delete Machines', category: 'cost-control', description: 'Can delete machines from the list', action: 'delete' },
  { id: 'cost_control.machine_list.export', name: 'Export Machine List', category: 'cost-control', description: 'Can export machine list to CSV', action: 'export' },
  { id: 'cost_control.machinery_day_rates.view', name: 'View Machinery Day Rates', category: 'cost-control', description: 'Can view machinery day rates', action: 'view' },
  { id: 'cost_control.machinery_day_rates.create', name: 'Create Machinery Day Rates', category: 'cost-control', description: 'Can create new machinery day rates', action: 'create' },
  { id: 'cost_control.machinery_day_rates.edit', name: 'Edit Machinery Day Rates', category: 'cost-control', description: 'Can edit machinery day rates', action: 'edit' },
  { id: 'cost_control.machinery_day_rates.delete', name: 'Delete Machinery Day Rates', category: 'cost-control', description: 'Can delete machinery day rates', action: 'delete' },
  { id: 'cost_control.database.view', name: 'View Cost Control Database', category: 'cost-control', description: 'Can view cost control database manager', action: 'view' },
  { id: 'cost_control.database.manage', name: 'Manage Cost Control Database', category: 'cost-control', description: 'Can manage cost control database (import, export, clear)', action: 'manage' },
  { id: 'cost_control.material.view', name: 'View Material', category: 'cost-control', description: 'Can view material list', action: 'view' },
  { id: 'cost_control.material.create', name: 'Create Material', category: 'cost-control', description: 'Can create new materials', action: 'create' },
  { id: 'cost_control.material.edit', name: 'Edit Material', category: 'cost-control', description: 'Can edit material information', action: 'edit' },
  { id: 'cost_control.material.delete', name: 'Delete Material', category: 'cost-control', description: 'Can delete materials', action: 'delete' },
  { id: 'cost_control.material.import', name: 'Import Material', category: 'cost-control', description: 'Can import materials from files', action: 'manage' },
  { id: 'cost_control.material.export', name: 'Export Material', category: 'cost-control', description: 'Can export material data', action: 'export' },
  { id: 'cost_control.subcontractor.view', name: 'View Subcontractor', category: 'cost-control', description: 'Can view subcontractor list', action: 'view' },
  { id: 'cost_control.subcontractor.create', name: 'Create Subcontractor', category: 'cost-control', description: 'Can create new subcontractors', action: 'create' },
  { id: 'cost_control.subcontractor.edit', name: 'Edit Subcontractor', category: 'cost-control', description: 'Can edit subcontractor information', action: 'edit' },
  { id: 'cost_control.subcontractor.delete', name: 'Delete Subcontractor', category: 'cost-control', description: 'Can delete subcontractors', action: 'delete' },
  { id: 'cost_control.subcontractor.import', name: 'Import Subcontractor', category: 'cost-control', description: 'Can import subcontractors from files', action: 'manage' },
  { id: 'cost_control.subcontractor.export', name: 'Export Subcontractor', category: 'cost-control', description: 'Can export subcontractor data', action: 'export' },
  { id: 'cost_control.diesel.view', name: 'View Diesel', category: 'cost-control', description: 'Can view diesel records', action: 'view' },
  { id: 'cost_control.diesel.create', name: 'Create Diesel', category: 'cost-control', description: 'Can create new diesel records', action: 'create' },
  { id: 'cost_control.diesel.edit', name: 'Edit Diesel', category: 'cost-control', description: 'Can edit diesel record information', action: 'edit' },
  { id: 'cost_control.diesel.delete', name: 'Delete Diesel', category: 'cost-control', description: 'Can delete diesel records', action: 'delete' },
  { id: 'cost_control.diesel.import', name: 'Import Diesel', category: 'cost-control', description: 'Can import diesel records from files', action: 'manage' },
  { id: 'cost_control.diesel.export', name: 'Export Diesel', category: 'cost-control', description: 'Can export diesel data', action: 'export' },
  { id: 'cost_control.transportation.view', name: 'View Transportation', category: 'cost-control', description: 'Can view transportation records', action: 'view' },
  { id: 'cost_control.transportation.create', name: 'Create Transportation', category: 'cost-control', description: 'Can create new transportation records', action: 'create' },
  { id: 'cost_control.transportation.edit', name: 'Edit Transportation', category: 'cost-control', description: 'Can edit transportation record information', action: 'edit' },
  { id: 'cost_control.transportation.delete', name: 'Delete Transportation', category: 'cost-control', description: 'Can delete transportation records', action: 'delete' },
  { id: 'cost_control.transportation.import', name: 'Import Transportation', category: 'cost-control', description: 'Can import transportation records from files', action: 'manage' },
  { id: 'cost_control.transportation.export', name: 'Export Transportation', category: 'cost-control', description: 'Can export transportation data', action: 'export' },
  { id: 'cost_control.hired_manpower.view', name: 'View Hired Manpower', category: 'cost-control', description: 'Can view hired manpower records', action: 'view' },
  { id: 'cost_control.hired_manpower.create', name: 'Create Hired Manpower', category: 'cost-control', description: 'Can create new hired manpower records', action: 'create' },
  { id: 'cost_control.hired_manpower.edit', name: 'Edit Hired Manpower', category: 'cost-control', description: 'Can edit hired manpower record information', action: 'edit' },
  { id: 'cost_control.hired_manpower.delete', name: 'Delete Hired Manpower', category: 'cost-control', description: 'Can delete hired manpower records', action: 'delete' },
  { id: 'cost_control.hired_manpower.import', name: 'Import Hired Manpower', category: 'cost-control', description: 'Can import hired manpower records from files', action: 'manage' },
  { id: 'cost_control.hired_manpower.export', name: 'Export Hired Manpower', category: 'cost-control', description: 'Can export hired manpower data', action: 'export' },
  { id: 'cost_control.rpf_equipment.view', name: 'View RPF Equipment', category: 'cost-control', description: 'Can view RPF equipment records', action: 'view' },
  { id: 'cost_control.rpf_equipment.create', name: 'Create RPF Equipment', category: 'cost-control', description: 'Can create new RPF equipment records', action: 'create' },
  { id: 'cost_control.rpf_equipment.edit', name: 'Edit RPF Equipment', category: 'cost-control', description: 'Can edit RPF equipment record information', action: 'edit' },
  { id: 'cost_control.rpf_equipment.delete', name: 'Delete RPF Equipment', category: 'cost-control', description: 'Can delete RPF equipment records', action: 'delete' },
  { id: 'cost_control.rpf_equipment.import', name: 'Import RPF Equipment', category: 'cost-control', description: 'Can import RPF equipment records from files', action: 'manage' },
  { id: 'cost_control.rpf_equipment.export', name: 'Export RPF Equipment', category: 'cost-control', description: 'Can export RPF equipment data', action: 'export' },
  { id: 'cost_control.rented_equipment.view', name: 'View Rented Equipment', category: 'cost-control', description: 'Can view rented equipment records', action: 'view' },
  { id: 'cost_control.rented_equipment.create', name: 'Create Rented Equipment', category: 'cost-control', description: 'Can create new rented equipment records', action: 'create' },
  { id: 'cost_control.rented_equipment.edit', name: 'Edit Rented Equipment', category: 'cost-control', description: 'Can edit rented equipment record information', action: 'edit' },
  { id: 'cost_control.rented_equipment.delete', name: 'Delete Rented Equipment', category: 'cost-control', description: 'Can delete rented equipment records', action: 'delete' },
  { id: 'cost_control.rented_equipment.import', name: 'Import Rented Equipment', category: 'cost-control', description: 'Can import rented equipment records from files', action: 'manage' },
  { id: 'cost_control.rented_equipment.export', name: 'Export Rented Equipment', category: 'cost-control', description: 'Can export rented equipment data', action: 'export' },
  { id: 'cost_control.other_cost.view', name: 'View Other Cost', category: 'cost-control', description: 'Can view other cost records', action: 'view' },
  { id: 'cost_control.other_cost.create', name: 'Create Other Cost', category: 'cost-control', description: 'Can create new other cost records', action: 'create' },
  { id: 'cost_control.other_cost.edit', name: 'Edit Other Cost', category: 'cost-control', description: 'Can edit other cost record information', action: 'edit' },
  { id: 'cost_control.other_cost.delete', name: 'Delete Other Cost', category: 'cost-control', description: 'Can delete other cost records', action: 'delete' },
  { id: 'cost_control.other_cost.import', name: 'Import Other Cost', category: 'cost-control', description: 'Can import other cost records from files', action: 'manage' },
  { id: 'cost_control.other_cost.export', name: 'Export Other Cost', category: 'cost-control', description: 'Can export other cost data', action: 'export' },
  
  // HR Permissions
  { id: 'hr.view', name: 'View HR', category: 'hr', description: 'Can view HR module and overview', action: 'view' },
  { id: 'hr.manpower.view', name: 'View HR Manpower', category: 'hr', description: 'Can view HR manpower records', action: 'view' },
  { id: 'hr.manpower.create', name: 'Create HR Manpower', category: 'hr', description: 'Can create new HR manpower records', action: 'create' },
  { id: 'hr.manpower.edit', name: 'Edit HR Manpower', category: 'hr', description: 'Can edit HR manpower records', action: 'edit' },
  { id: 'hr.manpower.delete', name: 'Delete HR Manpower', category: 'hr', description: 'Can delete HR manpower records', action: 'delete' },
  { id: 'hr.attendance.view', name: 'View Attendance', category: 'hr', description: 'Can view attendance dashboard and statistics', action: 'view' },
  { id: 'hr.attendance.check_in_out', name: 'Check-In/Out', category: 'hr', description: 'Can perform check-in and check-out operations', action: 'create' },
  { id: 'hr.attendance.review', name: 'Review Attendance', category: 'hr', description: 'Can review and approve attendance records', action: 'approve' },
  { id: 'hr.attendance.employees.view', name: 'View Attendance Employees', category: 'hr', description: 'Can view attendance employees list', action: 'view' },
  { id: 'hr.attendance.employees.create', name: 'Create Attendance Employees', category: 'hr', description: 'Can create new attendance employees', action: 'create' },
  { id: 'hr.attendance.employees.edit', name: 'Edit Attendance Employees', category: 'hr', description: 'Can edit attendance employee information', action: 'edit' },
  { id: 'hr.attendance.employees.delete', name: 'Delete Attendance Employees', category: 'hr', description: 'Can delete attendance employees', action: 'delete' },
  { id: 'hr.attendance.locations.view', name: 'View Attendance Locations', category: 'hr', description: 'Can view attendance locations (GPS tracking)', action: 'view' },
  { id: 'hr.attendance.locations.create', name: 'Create Attendance Locations', category: 'hr', description: 'Can create new attendance locations', action: 'create' },
  { id: 'hr.attendance.locations.edit', name: 'Edit Attendance Locations', category: 'hr', description: 'Can edit attendance locations', action: 'edit' },
  { id: 'hr.attendance.locations.delete', name: 'Delete Attendance Locations', category: 'hr', description: 'Can delete attendance locations', action: 'delete' },
  { id: 'hr.attendance.reports.view', name: 'View Attendance Reports', category: 'hr', description: 'Can view attendance reports and analytics', action: 'view' },
  { id: 'hr.attendance.reports.export', name: 'Export Attendance Reports', category: 'hr', description: 'Can export attendance reports', action: 'export' },
  { id: 'hr.attendance.settings.view', name: 'View Attendance Settings', category: 'hr', description: 'Can view attendance system settings', action: 'view' },
  { id: 'hr.attendance.settings.manage', name: 'Manage Attendance Settings', category: 'hr', description: 'Can manage attendance system settings', action: 'manage' },
  { id: 'hr.attendance.qr.view', name: 'View QR Settings', category: 'hr', description: 'Can view QR code settings for attendance', action: 'view' },
  { id: 'hr.attendance.qr.manage', name: 'Manage QR Settings', category: 'hr', description: 'Can manage QR code settings for attendance', action: 'manage' },
  
  // Companies Management Permissions
  { id: 'companies.view', name: 'View Companies', category: 'settings', description: 'Can view companies list', action: 'view' },
  { id: 'companies.create', name: 'Create Companies', category: 'settings', description: 'Can create new companies', action: 'create' },
  { id: 'companies.edit', name: 'Edit Companies', category: 'settings', description: 'Can edit company information', action: 'edit' },
  { id: 'companies.delete', name: 'Delete Companies', category: 'settings', description: 'Can delete companies', action: 'delete' },
  { id: 'settings.manage', name: 'Manage All Settings', category: 'settings', description: 'Can manage all system settings (full access)', action: 'manage' },
  
  // Procurement Permissions
  { id: 'procurement.view', name: 'View Procurement', category: 'procurement', description: 'Can view procurement module and overview', action: 'view' },
  { id: 'procurement.vendor_list.view', name: 'View Vendor List', category: 'procurement', description: 'Can view vendor list', action: 'view' },
  { id: 'procurement.vendor_list.create', name: 'Create Vendors', category: 'procurement', description: 'Can create new vendors', action: 'create' },
  { id: 'procurement.vendor_list.edit', name: 'Edit Vendors', category: 'procurement', description: 'Can edit vendor information', action: 'edit' },
  { id: 'procurement.vendor_list.delete', name: 'Delete Vendors', category: 'procurement', description: 'Can delete vendors', action: 'delete' },
  { id: 'procurement.vendor_list.import', name: 'Import Vendors', category: 'procurement', description: 'Can import vendors from files', action: 'manage' },
  { id: 'procurement.vendor_list.export', name: 'Export Vendors', category: 'procurement', description: 'Can export vendor data', action: 'export' },
  { id: 'procurement.items_list.view', name: 'View Items List', category: 'procurement', description: 'Can view items list', action: 'view' },
  { id: 'procurement.items_list.create', name: 'Create Items', category: 'procurement', description: 'Can create new items', action: 'create' },
  { id: 'procurement.items_list.edit', name: 'Edit Items', category: 'procurement', description: 'Can edit item information', action: 'edit' },
  { id: 'procurement.items_list.delete', name: 'Delete Items', category: 'procurement', description: 'Can delete items', action: 'delete' },
  { id: 'procurement.items_list.import', name: 'Import Items', category: 'procurement', description: 'Can import items from files', action: 'manage' },
  { id: 'procurement.items_list.export', name: 'Export Items', category: 'procurement', description: 'Can export items data', action: 'export' },
  { id: 'procurement.payment_terms.view', name: 'View Payment Terms', category: 'procurement', description: 'Can view payment terms list', action: 'view' },
  { id: 'procurement.payment_terms.create', name: 'Create Payment Terms', category: 'procurement', description: 'Can create new payment terms', action: 'create' },
  { id: 'procurement.payment_terms.edit', name: 'Edit Payment Terms', category: 'procurement', description: 'Can edit payment term information', action: 'edit' },
  { id: 'procurement.payment_terms.delete', name: 'Delete Payment Terms', category: 'procurement', description: 'Can delete payment terms', action: 'delete' },
  { id: 'procurement.payment_terms.import', name: 'Import Payment Terms', category: 'procurement', description: 'Can import payment terms from files', action: 'manage' },
  { id: 'procurement.payment_terms.export', name: 'Export Payment Terms', category: 'procurement', description: 'Can export payment terms data', action: 'export' },
  { id: 'procurement.lpo.view', name: 'View LPO Database', category: 'procurement', description: 'Can view LPO database', action: 'view' },
  { id: 'procurement.lpo.create', name: 'Create LPO Records', category: 'procurement', description: 'Can create new LPO records', action: 'create' },
  { id: 'procurement.lpo.edit', name: 'Edit LPO Records', category: 'procurement', description: 'Can edit LPO record information', action: 'edit' },
  { id: 'procurement.lpo.delete', name: 'Delete LPO Records', category: 'procurement', description: 'Can delete LPO records', action: 'delete' },
  { id: 'procurement.lpo.import', name: 'Import LPO Records', category: 'procurement', description: 'Can import LPO records from files', action: 'manage' },
  { id: 'procurement.lpo.export', name: 'Export LPO Records', category: 'procurement', description: 'Can export LPO records data', action: 'export' },
  
  // Commercial Permissions
  { id: 'commercial.view', name: 'View Commercial', category: 'commercial', description: 'Can view commercial module and overview', action: 'view' },
  { id: 'commercial.boq_items.view', name: 'View BOQ Items', category: 'commercial', description: 'Can view commercial BOQ items', action: 'view' },
  { id: 'commercial.boq_items.create', name: 'Create BOQ Items', category: 'commercial', description: 'Can create new commercial BOQ items', action: 'create' },
  { id: 'commercial.boq_items.edit', name: 'Edit BOQ Items', category: 'commercial', description: 'Can edit commercial BOQ items', action: 'edit' },
  { id: 'commercial.boq_items.delete', name: 'Delete BOQ Items', category: 'commercial', description: 'Can delete commercial BOQ items', action: 'delete' },
  { id: 'commercial.boq_items.export', name: 'Export BOQ Items', category: 'commercial', description: 'Can export commercial BOQ items data', action: 'export' },
  { id: 'commercial.boq_items.import', name: 'Import BOQ Items', category: 'commercial', description: 'Can import commercial BOQ items from files', action: 'manage' },
  { id: 'commercial.payments_invoicing.view', name: 'View Payments & Invoicing', category: 'commercial', description: 'Can view payments and invoicing records', action: 'view' },
  { id: 'commercial.payments_invoicing.create', name: 'Create Payments & Invoicing', category: 'commercial', description: 'Can create new payments and invoicing records', action: 'create' },
  { id: 'commercial.payments_invoicing.edit', name: 'Edit Payments & Invoicing', category: 'commercial', description: 'Can edit payments and invoicing records', action: 'edit' },
  { id: 'commercial.payments_invoicing.delete', name: 'Delete Payments & Invoicing', category: 'commercial', description: 'Can delete payments and invoicing records', action: 'delete' },
  { id: 'commercial.payments_invoicing.export', name: 'Export Payments & Invoicing', category: 'commercial', description: 'Can export payments and invoicing data', action: 'export' },
  { id: 'commercial.payments_invoicing.import', name: 'Import Payments & Invoicing', category: 'commercial', description: 'Can import payments and invoicing records from files', action: 'manage' },
  { id: 'commercial.variations.view', name: 'View Variations', category: 'commercial', description: 'Can view contract variations', action: 'view' },
  { id: 'commercial.variations.create', name: 'Create Variations', category: 'commercial', description: 'Can create new contract variations', action: 'create' },
  { id: 'commercial.variations.edit', name: 'Edit Variations', category: 'commercial', description: 'Can edit contract variations', action: 'edit' },
  { id: 'commercial.variations.delete', name: 'Delete Variations', category: 'commercial', description: 'Can delete contract variations', action: 'delete' },
  { id: 'commercial.variations.export', name: 'Export Variations', category: 'commercial', description: 'Can export variations data', action: 'export' },
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
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export', 'projects.import', 'projects.print', 'projects.zones',
    // Activities
    'activities.view', 'activities.create', 'activities.edit', 'activities.delete', 'activities.approve', 'activities.export', 'activities.import', 'activities.print',
    // KPI
    'kpi.view', 'kpi.create', 'kpi.create.standard', 'kpi.create.smart', 'kpi.create.legacy', 'kpi.edit', 'kpi.delete', 'kpi.export', 'kpi.import', 'kpi.print', 'kpi.approve', 'kpi.need_to_submit',
    // Reports
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
    'reports.lookahead', 'reports.critical', 'reports.performance', 'reports.custom',
    // Cost Control
    'cost_control.view', 'cost_control.manpower.view', 'cost_control.manpower.create', 'cost_control.manpower.edit', 'cost_control.manpower.delete', 'cost_control.manpower.import', 'cost_control.manpower.export',
    'cost_control.designation_rates.view', 'cost_control.designation_rates.create', 'cost_control.designation_rates.edit', 'cost_control.designation_rates.delete', 'cost_control.designation_rates.export',
    'cost_control.machine_list.view', 'cost_control.machine_list.create', 'cost_control.machine_list.edit', 'cost_control.machine_list.delete', 'cost_control.machine_list.export',
    'cost_control.machinery_day_rates.view', 'cost_control.machinery_day_rates.create', 'cost_control.machinery_day_rates.edit', 'cost_control.machinery_day_rates.delete',
    'cost_control.database.view', 'cost_control.database.manage',
    'cost_control.material.view', 'cost_control.material.create', 'cost_control.material.edit', 'cost_control.material.delete', 'cost_control.material.import', 'cost_control.material.export',
    'cost_control.subcontractor.view', 'cost_control.subcontractor.create', 'cost_control.subcontractor.edit', 'cost_control.subcontractor.delete', 'cost_control.subcontractor.import', 'cost_control.subcontractor.export',
    'cost_control.diesel.view', 'cost_control.diesel.create', 'cost_control.diesel.edit', 'cost_control.diesel.delete', 'cost_control.diesel.import', 'cost_control.diesel.export',
    'cost_control.transportation.view', 'cost_control.transportation.create', 'cost_control.transportation.edit', 'cost_control.transportation.delete', 'cost_control.transportation.import', 'cost_control.transportation.export',
    'cost_control.hired_manpower.view', 'cost_control.hired_manpower.create', 'cost_control.hired_manpower.edit', 'cost_control.hired_manpower.delete', 'cost_control.hired_manpower.import', 'cost_control.hired_manpower.export',
    'cost_control.rented_equipment.view', 'cost_control.rented_equipment.create', 'cost_control.rented_equipment.edit', 'cost_control.rented_equipment.delete', 'cost_control.rented_equipment.import', 'cost_control.rented_equipment.export',
    'cost_control.other_cost.view', 'cost_control.other_cost.create', 'cost_control.other_cost.edit', 'cost_control.other_cost.delete', 'cost_control.other_cost.import', 'cost_control.other_cost.export',
    // HR
    'hr.view', 'hr.manpower.view', 'hr.manpower.create', 'hr.manpower.edit', 'hr.manpower.delete',
    'hr.attendance.view', 'hr.attendance.check_in_out', 'hr.attendance.review',
    'hr.attendance.employees.view', 'hr.attendance.employees.create', 'hr.attendance.employees.edit', 'hr.attendance.employees.delete',
    'hr.attendance.locations.view', 'hr.attendance.locations.create', 'hr.attendance.locations.edit', 'hr.attendance.locations.delete',
    'hr.attendance.reports.view', 'hr.attendance.reports.export',
    'hr.attendance.settings.view', 'hr.attendance.settings.manage',
    'hr.attendance.qr.view', 'hr.attendance.qr.manage',
    // Procurement
    'procurement.view', 'procurement.vendor_list.view', 'procurement.vendor_list.create', 'procurement.vendor_list.edit', 'procurement.vendor_list.delete', 'procurement.vendor_list.import', 'procurement.vendor_list.export',
    'procurement.items_list.view', 'procurement.items_list.create', 'procurement.items_list.edit', 'procurement.items_list.delete', 'procurement.items_list.import', 'procurement.items_list.export',
    'procurement.payment_terms.view', 'procurement.payment_terms.create', 'procurement.payment_terms.edit', 'procurement.payment_terms.delete', 'procurement.payment_terms.import', 'procurement.payment_terms.export',
    'procurement.lpo.view', 'procurement.lpo.create', 'procurement.lpo.edit', 'procurement.lpo.delete', 'procurement.lpo.import', 'procurement.lpo.export',
    // Commercial
    'commercial.view', 'commercial.boq_items.view', 'commercial.boq_items.create', 'commercial.boq_items.edit', 'commercial.boq_items.delete', 'commercial.boq_items.import', 'commercial.boq_items.export',
    'commercial.payments_invoicing.view', 'commercial.payments_invoicing.create', 'commercial.payments_invoicing.edit', 'commercial.payments_invoicing.delete', 'commercial.payments_invoicing.import', 'commercial.payments_invoicing.export',
    // Settings (manage most settings)
    'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete',
    'settings.login_security', 'settings.maintenance_mode', 'settings.manage', 'companies.view', 'companies.create', 'companies.edit', 'companies.delete',
    'project_types.view', 'project_types.create', 'project_types.edit', 'project_types.delete',
    'activities.view', 'activities.create', 'activities.edit', 'activities.delete',
    'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
    'job_titles.view', 'job_titles.create', 'job_titles.edit', 'job_titles.delete',
    // Users (limited)
    'users.view', 'users.roles', 'users.groups', 'users.bulk', 'users.import', 'users.export',
    'directory.view', 'directory.export', 'directory.search',
    'profile.view', 'profile.edit', 'profile.qr', 'profile.photo', 'profile.share',
    // System (limited)
    'system.export', 'system.backup', 'system.search', 'system.audit',
    'audit_log.view', 'audit_log.export',
    'user_guide.view',
    'activity_log.view', 'activity_log.export',
    'active_users.view',
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
    'activities.view', 'activities.create', 'activities.edit', 'activities.export',
    // KPI (all except delete)
    'kpi.view', 'kpi.create', 'kpi.create.standard', 'kpi.create.smart', 'kpi.create.legacy', 'kpi.edit', 'kpi.export',
    // Reports (view and export)
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print',
    'reports.lookahead', 'reports.critical', 'reports.performance',
    // Cost Control (view only)
    'cost_control.view', 'cost_control.manpower.view', 'cost_control.designation_rates.view', 'cost_control.machine_list.view', 'cost_control.machinery_day_rates.view', 'cost_control.material.view', 'cost_control.subcontractor.view', 'cost_control.diesel.view', 'cost_control.transportation.view', 'cost_control.hired_manpower.view', 'cost_control.rpf_equipment.view', 'cost_control.rented_equipment.view', 'cost_control.other_cost.view',
    // HR (limited - view and check-in/out)
    'hr.view', 'hr.attendance.view', 'hr.attendance.check_in_out', 'hr.attendance.reports.view',
    // Procurement (view only)
    'procurement.view', 'procurement.vendor_list.view', 'procurement.items_list.view', 'procurement.payment_terms.view', 'procurement.lpo.view',
    // Commercial (view only)
    'commercial.view', 'commercial.boq_items.view', 'commercial.payments_invoicing.view',
    // Settings (view only)
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 'job_titles.view', 'companies.view',
    // Users (limited)
    'directory.view', 'directory.search', 'profile.view', 'profile.edit', 'profile.qr', 'profile.photo',
    // System (limited)
    'system.search', 'user_guide.view', 'active_users.view',
    'data.export', 'data.templates', 'analytics.view', 'performance.view',
    'notifications.view', 'alerts.view', 'integrations.view', 'api.access',
    'workflow.view', 'automation.view', 'security.view', 'compliance.view',
    // Database (view only)
    'database.view', 'database.templates'
  ],
  
  // Viewer - عرض فقط
  viewer: [
    'dashboard.view',
    'projects.view',
    'activities.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'reports.lookahead', 'reports.critical', 'reports.performance',
    // Cost Control (view only)
    'cost_control.view', 'cost_control.manpower.view', 'cost_control.designation_rates.view', 'cost_control.machine_list.view', 'cost_control.machinery_day_rates.view', 'cost_control.material.view', 'cost_control.subcontractor.view', 'cost_control.diesel.view', 'cost_control.transportation.view', 'cost_control.hired_manpower.view', 'cost_control.rpf_equipment.view', 'cost_control.rented_equipment.view', 'cost_control.other_cost.view',
    // HR (view only)
    'hr.view', 'hr.manpower.view', 'hr.attendance.view', 'hr.attendance.reports.view',
    // Procurement (view only)
    'procurement.view', 'procurement.vendor_list.view', 'procurement.items_list.view', 'procurement.payment_terms.view', 'procurement.lpo.view',
    // Commercial (view only)
    'commercial.view', 'commercial.boq_items.view', 'commercial.payments_invoicing.view',
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 'job_titles.view', 'companies.view',
    'directory.view', 'directory.search', 'profile.view',
    'system.search', 'user_guide.view', 'active_users.view',
    'analytics.view', 'performance.view',
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
    'activities.view', 'activities.approve', 'activities.export',
    // KPI (view, approve planned KPIs)
    'kpi.view', 'kpi.approve', 'kpi.need_to_submit', 'kpi.export',
    // Reports (view and export)
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print',
    'reports.lookahead', 'reports.critical', 'reports.performance',
    // Cost Control (view only)
    'cost_control.view', 'cost_control.manpower.view', 'cost_control.designation_rates.view', 'cost_control.machine_list.view', 'cost_control.machinery_day_rates.view', 'cost_control.material.view', 'cost_control.subcontractor.view', 'cost_control.diesel.view', 'cost_control.transportation.view', 'cost_control.hired_manpower.view', 'cost_control.rpf_equipment.view', 'cost_control.rented_equipment.view', 'cost_control.other_cost.view',
    // HR (view only)
    'hr.view', 'hr.manpower.view', 'hr.attendance.view', 'hr.attendance.reports.view',
    // Procurement (view only)
    'procurement.view', 'procurement.vendor_list.view', 'procurement.items_list.view', 'procurement.payment_terms.view', 'procurement.lpo.view',
    // Commercial (view only)
    'commercial.view', 'commercial.boq_items.view', 'commercial.payments_invoicing.view',
    // Settings (view only)
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 'job_titles.view', 'companies.view',
    // Users (limited)
    'directory.view', 'directory.search', 'profile.view', 'profile.edit',
    // System (limited)
    'system.search', 'user_guide.view', 'active_users.view',
    'data.export', 'data.templates', 'analytics.view', 'performance.view',
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

// Cache for default role overrides to avoid repeated database queries
let defaultRoleOverridesCache: Record<string, string[]> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60000 // 1 minute cache

/**
 * Load default role overrides from database
 * تحميل التعديلات المحدثة للأدوار الافتراضية من قاعدة البيانات
 */
async function loadDefaultRoleOverrides(): Promise<Record<string, string[]>> {
  // Check cache first
  const now = Date.now()
  if (defaultRoleOverridesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return defaultRoleOverridesCache
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { getSupabaseClient } = await import('@/lib/simpleConnectionManager')
    const supabase = getSupabaseClient()
    
    const { data, error } = await (supabase as any)
      .from('custom_roles')
      .select('role_key, permissions')
    
    if (error) {
      console.warn('⚠️ Error loading default role overrides:', error)
      return {}
    }
    
    const overrides: Record<string, string[]> = {}
    if (data) {
      data.forEach((role: any) => {
        if (role.role_key?.startsWith('__default_override__')) {
          const originalKey = role.role_key.replace('__default_override__', '')
          if (DEFAULT_ROLE_PERMISSIONS[originalKey]) {
            overrides[originalKey] = role.permissions || []
          }
        }
      })
    }
    
    // Update cache
    defaultRoleOverridesCache = overrides
    cacheTimestamp = now
    
    return overrides
  } catch (err) {
    console.warn('⚠️ Error loading default role overrides:', err)
    return {}
  }
}

/**
 * Clear the default role overrides cache
 * تنظيف cache التعديلات المحدثة
 */
export function clearDefaultRoleOverridesCache(): void {
  defaultRoleOverridesCache = null
  cacheTimestamp = 0
}

/**
 * الحصول على صلاحيات المستخدم
 */
export async function getUserPermissionsAsync(user: UserWithPermissions): Promise<string[]> {
  // ✅ PERFORMANCE: Only log in development mode and very rarely (0.1%)
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
    console.log('🔍 getUserPermissionsAsync called:', {
      userEmail: user.email,
      userRole: user.role,
      customEnabled: user.custom_permissions_enabled,
      savedPermissions: user.permissions?.length || 0
    })
  }

  // ✅ إذا كان نظام الصلاحيات المخصصة مفعل (حتى لو كان Admin)
  if (user.custom_permissions_enabled) {
    // استخدم الصلاحيات المخصصة فقط
    const customPerms = Array.isArray(user.permissions) ? user.permissions : []
    
    if (customPerms.length === 0) {
      console.warn('⚠️ Custom permissions enabled but permissions array is empty. Loading default role permissions with overrides.')
      // Load overrides and use them
      const overrides = await loadDefaultRoleOverrides()
      const defaultRolePermissions = overrides[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
      return defaultRolePermissions
    }
    
    return customPerms
  }
  
  // Load default role overrides and use them
  const overrides = await loadDefaultRoleOverrides()
  const defaultRolePermissions = overrides[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
  
  return defaultRolePermissions
}

/**
 * الحصول على صلاحيات المستخدم (synchronous version - uses cache)
 */
export function getUserPermissions(user: UserWithPermissions): string[] {
  // ✅ PERFORMANCE: Only log in development mode and very rarely (0.1%)
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
    console.log('🔍 getUserPermissions called:', {
      userEmail: user.email,
      userRole: user.role,
      customEnabled: user.custom_permissions_enabled,
      savedPermissions: user.permissions?.length || 0
    })
  }

  // ✅ إذا كان نظام الصلاحيات المخصصة مفعل (حتى لو كان Admin)
  if (user.custom_permissions_enabled) {
    // استخدم الصلاحيات المخصصة فقط
    const customPerms = Array.isArray(user.permissions) ? user.permissions : []
    
    if (customPerms.length === 0) {
      console.warn('⚠️ Custom permissions enabled but permissions array is empty. Using default role permissions with overrides.')
      // Use cached overrides if available
      const defaultRolePermissions = defaultRoleOverridesCache?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
      return defaultRolePermissions
    }
    
    return customPerms
  }
  
  // Use cached overrides if available, otherwise use default
  const defaultRolePermissions = defaultRoleOverridesCache?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
  
  return defaultRolePermissions
}

/**
 * التحقق من وجود صلاحية معينة
 */
export function hasPermission(user: UserWithPermissions | null, permission: string): boolean {
  if (!user) {
    return false
  }
  
  // ✅ Admin لديه كل الصلاحيات دائماً (حتى مع custom_permissions_enabled)
  // ✅ Exception: Admin can always delete users, manage users, and access critical system functions
  const criticalAdminPermissions = [
    'users.delete',
    'users.create',
    'users.edit',
    'users.permissions',
    'users.view',
    'system.backup',
    'system.restore',
    'database.manage',
    'settings.maintenance_mode'
  ]
  
  if (user.role === 'admin') {
    // Admin always has critical permissions, even with custom_permissions_enabled
    if (criticalAdminPermissions.includes(permission)) {
      return true
    }
    // For other permissions, check custom if enabled, otherwise all permissions
    if (!user.custom_permissions_enabled) {
      return true
    }
  }
  
  // ✅ FIX: الحصول على الصلاحيات مع logging أفضل للتشخيص
  const userPermissions = getUserPermissions(user)
  
  // ✅ DEBUG: Log permission check in development (only for specific permissions or when debugging)
  if (process.env.NODE_ENV === 'development') {
    const debugPermissions = ['cost_control.view', 'hr.view', 'cost_control.manpower.view']
    if (debugPermissions.includes(permission)) {
      console.log('🔍 Permission Check Debug:', {
        permission,
        userEmail: user.email,
        userRole: user.role,
        customEnabled: user.custom_permissions_enabled,
        savedPermissions: user.permissions,
        savedPermissionsLength: user.permissions?.length || 0,
        finalPermissions: userPermissions,
        finalPermissionsLength: userPermissions.length,
        hasAccess: userPermissions.includes(permission)
      })
    }
  }
  
  const hasAccess = userPermissions.includes(permission)
  
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


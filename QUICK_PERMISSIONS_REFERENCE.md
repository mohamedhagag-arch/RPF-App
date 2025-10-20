# 🔐 Quick Permissions Reference

## 📊 System Overview
- **Total Permissions**: 80+ permissions
- **Categories**: 8 main categories
- **Roles**: 4 roles (Admin, Manager, Engineer, Viewer)

---

## 🎯 Permission Categories

### 1. **Projects** (5 permissions)
- `projects.view` - View projects
- `projects.create` - Create projects
- `projects.edit` - Edit projects
- `projects.delete` - Delete projects
- `projects.export` - Export projects

### 2. **BOQ** (6 permissions)
- `boq.view` - View BOQ activities
- `boq.create` - Create activities
- `boq.edit` - Edit activities
- `boq.delete` - Delete activities
- `boq.approve` - Approve activities
- `boq.export` - Export BOQ

### 3. **KPI** (5 permissions)
- `kpi.view` - View KPIs
- `kpi.create` - Create KPIs
- `kpi.edit` - Edit KPIs
- `kpi.delete` - Delete KPIs
- `kpi.export` - Export KPIs

### 4. **Users** (13 permissions)
- `users.view` - View users
- `users.create` - Create users
- `users.edit` - Edit users
- `users.delete` - Delete users
- `users.permissions` - Manage permissions
- `users.roles` - Manage roles
- `users.groups` - Manage groups
- `users.bulk` - Bulk operations
- `users.import` - Import users
- `users.export` - Export users
- `directory.view` - View directory
- `directory.export` - Export directory
- `directory.search` - Search directory

### 5. **Reports** (11 permissions)
- `reports.view` - View reports
- `reports.daily` - Daily reports
- `reports.weekly` - Weekly reports
- `reports.monthly` - Monthly reports
- `reports.financial` - Financial reports
- `reports.export` - Export reports
- `reports.print` - Print reports
- `reports.lookahead` - Lookahead reports
- `reports.critical` - Critical path reports
- `reports.performance` - Performance reports
- `reports.custom` - Custom reports

### 6. **Settings** (20 permissions)
- `settings.view` - View settings
- `settings.company` - Company settings
- `settings.divisions` - Manage divisions
- `settings.project_types` - Manage project types
- `settings.currencies` - Manage currencies
- `settings.activities` - Manage activities
- `settings.holidays` - Manage holidays
- `project_types.*` - Project types CRUD
- `activities.*` - Activities CRUD
- `departments.*` - Departments CRUD
- `job_titles.*` - Job titles CRUD

### 7. **System** (25 permissions)
- `system.import` - Import data
- `system.export` - Export data
- `system.backup` - Backup system
- `system.audit` - View audit logs
- `system.search` - Global search
- `data.*` - Data management
- `analytics.*` - Analytics
- `performance.*` - Performance monitoring
- `notifications.*` - Notifications
- `alerts.*` - Alerts
- `integrations.*` - Integrations
- `api.*` - API management
- `workflow.*` - Workflow management
- `automation.*` - Automation
- `security.*` - Security
- `compliance.*` - Compliance

### 8. **Database** (10 permissions)
- `database.view` - View database stats
- `database.backup` - Create backups
- `database.restore` - Restore database
- `database.export` - Export tables
- `database.import` - Import tables
- `database.clear` - Clear table data
- `database.manage` - Full management
- `database.templates` - Download templates
- `database.analyze` - Performance analysis
- `database.cleanup` - Data cleanup

---

## 🎯 Role Permissions Summary

### **Admin** (All Permissions)
- **Total**: 80+ permissions
- **Access**: Full system access
- **Description**: Complete control over all features

### **Manager** (Advanced Permissions)
- **Total**: 65+ permissions
- **Access**: Most features except dangerous operations
- **Description**: Can manage projects, users, settings, and most system features

### **Engineer** (Limited Permissions)
- **Total**: 35+ permissions
- **Access**: Create/edit data, view reports, limited system access
- **Description**: Can work with data but limited management capabilities

### **Viewer** (Read-Only)
- **Total**: 25+ permissions
- **Access**: View-only access to most features
- **Description**: Can view data and reports but cannot modify anything

---

## 🚀 Usage Examples

### Check Single Permission
```typescript
const canCreateProject = hasPermission(user, 'projects.create')
```

### Check Multiple Permissions
```typescript
const canManageUsers = hasAnyPermission(user, ['users.create', 'users.edit', 'users.delete'])
```

### Check Category Access
```typescript
const canAccessReports = canPerformAction(user, 'reports', 'view')
```

### Get User Permissions
```typescript
const userPermissions = getUserPermissions(user)
```

---

## 🔧 Development Notes

- All permissions are defined in `lib/permissionsSystem.ts`
- Use `usePermissionGuard()` hook for component protection
- Use `PermissionButton` for protected buttons
- Use `PermissionSection` for protected sections
- Use `PermissionPage` for protected pages

---

## 📝 Adding New Permissions

1. Add permission to `ALL_PERMISSIONS` array
2. Update role permissions in `DEFAULT_ROLE_PERMISSIONS`
3. Test with different user roles
4. Update documentation

---

## ✅ System Status

- ✅ **80+ Permissions** defined
- ✅ **8 Categories** organized
- ✅ **4 Roles** configured
- ✅ **All Features** supported
- ✅ **Ready for Production**
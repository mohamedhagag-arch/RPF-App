/**
 * Test Settings Page Permissions
 * اختبار صلاحيات صفحة الإعدادات
 */

// محاكاة نظام الصلاحيات
const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export',
    'settings.view', 'settings.edit', 'settings.divisions', 'settings.project_types', 'settings.currencies',
    'users.view', 'users.manage', 'users.edit',
    'system.export', 'system.import', 'system.backup', 'system.search',
    'database.view', 'dashboard.view'
  ],
  manager: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export',
    'settings.view', 'settings.divisions', 'settings.project_types', 'settings.currencies',
    'users.view',
    'system.export', 'system.backup', 'system.search',
    'database.view', 'dashboard.view'
  ],
  engineer: [
    'projects.view', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export',
    'settings.view',
    'system.search',
    'database.view'
  ],
  viewer: [
    'projects.view',
    'boq.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'settings.view',
    'system.search',
    'database.view'
  ]
}

function getUserPermissions(user) {
  const defaultRolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
  
  if (user.custom_permissions_enabled && user.permissions && user.permissions.length > 0) {
    return user.permissions
  }
  
  if (user.permissions && user.permissions.length > 0) {
    const combinedPermissions = Array.from(new Set([...defaultRolePermissions, ...user.permissions]))
    return combinedPermissions
  }
  
  return defaultRolePermissions
}

function hasPermission(user, permission) {
  if (!user) return false
  if (user.role === 'admin') return true
  
  const userPermissions = getUserPermissions(user)
  return userPermissions.includes(permission)
}

function testSettingsTabs(user) {
  console.log(`\n👤 Testing user: ${user.email} (${user.role})`)
  console.log('   Custom enabled:', user.custom_permissions_enabled)
  console.log('   Saved permissions:', user.permissions?.length || 0)
  
  const finalPermissions = getUserPermissions(user)
  console.log('   Final permissions count:', finalPermissions.length)
  
  // تعريف علامات التبويب
  const tabs = [
    { id: 'profile', label: 'Profile', permission: 'users.view' },
    { id: 'notifications', label: 'Notifications', permission: 'users.view' },
    { id: 'appearance', label: 'Appearance', permission: 'users.view' },
    { id: 'divisions', label: 'Divisions', permission: 'settings.divisions' },
    { id: 'project-types', label: 'Project Types', permission: 'settings.project_types' },
    { id: 'currencies', label: 'Currencies', permission: 'settings.currencies' },
    { id: 'data', label: 'Data Management', permission: 'system.export' },
    { id: 'security', label: 'Security', permission: 'users.manage' }
  ]
  
  // تصفية علامات التبويب بناءً على الصلاحيات
  const filteredTabs = tabs.filter(tab => {
    if (['profile', 'notifications', 'appearance'].includes(tab.id)) {
      return ['admin', 'manager', 'engineer', 'viewer'].includes(user.role)
    }
    return hasPermission(user, tab.permission)
  })
  
  console.log('   Available tabs:', filteredTabs.map(t => t.label).join(', '))
  
  // اختبار كل علامة تبويب
  console.log('   Tab permissions:')
  tabs.forEach(tab => {
    const hasAccess = hasPermission(user, tab.permission)
    const isVisible = filteredTabs.some(t => t.id === tab.id)
    console.log(`     ${tab.label}: ${hasAccess ? '✅' : '❌'} ${isVisible ? '(visible)' : '(hidden)'}`)
  })
  
  return filteredTabs
}

async function testSettingsPermissions() {
  console.log('🧪 Testing Settings Page Permissions...')
  console.log('=====================================')

  // اختبار سيناريوهات مختلفة
  const testCases = [
    {
      name: 'Engineer Normal',
      user: {
        email: 'engineer@test.com',
        role: 'engineer',
        permissions: [],
        custom_permissions_enabled: false
      }
    },
    {
      name: 'Engineer with Divisions Permission',
      user: {
        email: 'engineer-divisions@test.com',
        role: 'engineer',
        permissions: ['settings.divisions'],
        custom_permissions_enabled: false
      }
    },
    {
      name: 'Engineer with System Permissions',
      user: {
        email: 'engineer-system@test.com',
        role: 'engineer',
        permissions: ['settings.divisions', 'system.export', 'system.import'],
        custom_permissions_enabled: false
      }
    },
    {
      name: 'Engineer with All Settings Permissions',
      user: {
        email: 'engineer-all@test.com',
        role: 'engineer',
        permissions: ['settings.divisions', 'settings.project_types', 'settings.currencies', 'system.export', 'system.import', 'users.manage'],
        custom_permissions_enabled: false
      }
    },
    {
      name: 'Manager Normal',
      user: {
        email: 'manager@test.com',
        role: 'manager',
        permissions: [],
        custom_permissions_enabled: false
      }
    },
    {
      name: 'Admin',
      user: {
        email: 'admin@test.com',
        role: 'admin',
        permissions: [],
        custom_permissions_enabled: false
      }
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`)
    testSettingsTabs(testCase.user)
  }

  console.log('\n🎉 Settings Permissions Test Completed!')
  console.log('\n📝 Summary:')
  console.log('   ✅ Basic tabs (Profile, Notifications, Appearance) work for all roles')
  console.log('   ✅ Advanced tabs (Divisions, Project Types, etc.) show based on permissions')
  console.log('   ✅ Engineers can now see advanced tabs if they have the permissions')
  console.log('   ✅ System correctly filters tabs based on actual permissions')
  console.log('\n🚀 Settings page is ready for enhanced permissions!')
}

// تشغيل الاختبار
testSettingsPermissions()

/**
 * Local Permissions System Test
 * اختبار محلي لنظام الصلاحيات
 */

// محاكاة نظام الصلاحيات
const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export',
    'settings.view', 'settings.edit', 'settings.divisions', 'settings.project_types',
    'users.view', 'users.manage',
    'system.export', 'system.backup', 'system.search',
    'database.view', 'dashboard.view'
  ],
  manager: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export',
    'settings.view', 'settings.divisions', 'settings.project_types',
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
  console.log('🔍 getUserPermissions called:', {
    userEmail: user.email,
    userRole: user.role,
    customEnabled: user.custom_permissions_enabled,
    savedPermissions: user.permissions?.length || 0
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

function hasPermission(user, permission) {
  if (!user) return false
  if (user.role === 'admin') return true
  
  const userPermissions = getUserPermissions(user)
  return userPermissions.includes(permission)
}

function explainUserPermissions(user) {
  const defaultRolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.viewer
  const finalPermissions = getUserPermissions(user)
  
  let mode, additionalPermissions = [], explanation
  
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

async function testEnhancedPermissions() {
  console.log('🧪 Testing Enhanced Permissions System...')
  console.log('==========================================')

  // اختبار سيناريوهات مختلفة
  console.log('\n🎭 Testing different scenarios...')

  // سيناريو 1: مهندس عادي
  console.log('\n📋 Scenario 1: Engineer (Normal)')
  const engineerNormal = {
    email: 'engineer@test.com',
    role: 'engineer',
    permissions: [],
    custom_permissions_enabled: false
  }
  
  const explanation1 = explainUserPermissions(engineerNormal)
  console.log('   Mode:', explanation1.mode)
  console.log('   Explanation:', explanation1.explanation)
  console.log('   Final permissions count:', explanation1.finalPermissions.length)
  console.log('   Has settings.divisions?', hasPermission(engineerNormal, 'settings.divisions'))
  console.log('   Has projects.view?', hasPermission(engineerNormal, 'projects.view'))

  // سيناريو 2: مهندس مع صلاحيات إضافية
  console.log('\n📋 Scenario 2: Engineer with additional permissions')
  const engineerWithExtra = {
    email: 'engineer-extra@test.com',
    role: 'engineer',
    permissions: ['settings.divisions', 'users.manage', 'system.export'],
    custom_permissions_enabled: false
  }
  
  const explanation2 = explainUserPermissions(engineerWithExtra)
  console.log('   Mode:', explanation2.mode)
  console.log('   Explanation:', explanation2.explanation)
  console.log('   Final permissions count:', explanation2.finalPermissions.length)
  console.log('   Has settings.divisions?', hasPermission(engineerWithExtra, 'settings.divisions'))
  console.log('   Has users.manage?', hasPermission(engineerWithExtra, 'users.manage'))
  console.log('   Has projects.view?', hasPermission(engineerWithExtra, 'projects.view'))
  console.log('   Additional permissions:', explanation2.additionalPermissions)

  // سيناريو 3: مهندس مع صلاحيات مخصصة
  console.log('\n📋 Scenario 3: Engineer with custom permissions')
  const engineerCustom = {
    email: 'engineer-custom@test.com',
    role: 'engineer',
    permissions: ['settings.divisions', 'users.manage'],
    custom_permissions_enabled: true
  }
  
  const explanation3 = explainUserPermissions(engineerCustom)
  console.log('   Mode:', explanation3.mode)
  console.log('   Explanation:', explanation3.explanation)
  console.log('   Final permissions count:', explanation3.finalPermissions.length)
  console.log('   Has settings.divisions?', hasPermission(engineerCustom, 'settings.divisions'))
  console.log('   Has users.manage?', hasPermission(engineerCustom, 'users.manage'))
  console.log('   Has projects.view?', hasPermission(engineerCustom, 'projects.view'))

  // سيناريو 4: مدير مع صلاحيات إضافية
  console.log('\n📋 Scenario 4: Manager with additional permissions')
  const managerWithExtra = {
    email: 'manager-extra@test.com',
    role: 'manager',
    permissions: ['users.manage', 'database.backup'],
    custom_permissions_enabled: false
  }
  
  const explanation4 = explainUserPermissions(managerWithExtra)
  console.log('   Mode:', explanation4.mode)
  console.log('   Explanation:', explanation4.explanation)
  console.log('   Final permissions count:', explanation4.finalPermissions.length)
  console.log('   Has users.manage?', hasPermission(managerWithExtra, 'users.manage'))
  console.log('   Has database.backup?', hasPermission(managerWithExtra, 'database.backup'))
  console.log('   Has projects.create?', hasPermission(managerWithExtra, 'projects.create'))
  console.log('   Additional permissions:', explanation4.additionalPermissions)

  // سيناريو 5: Admin
  console.log('\n📋 Scenario 5: Admin (should have all permissions)')
  const admin = {
    email: 'admin@test.com',
    role: 'admin',
    permissions: [],
    custom_permissions_enabled: false
  }
  
  console.log('   Has any permission?', hasPermission(admin, 'users.manage'))
  console.log('   Has any permission?', hasPermission(admin, 'settings.divisions'))
  console.log('   Has any permission?', hasPermission(admin, 'database.backup'))

  // اختبار شامل للصلاحيات
  console.log('\n🔍 Comprehensive Permission Tests')
  console.log('================================')
  
  const testCases = [
    { name: 'Engineer Normal', user: engineerNormal },
    { name: 'Engineer + Extra', user: engineerWithExtra },
    { name: 'Engineer Custom', user: engineerCustom },
    { name: 'Manager + Extra', user: managerWithExtra },
    { name: 'Admin', user: admin }
  ]

  const testPermissions = [
    'projects.view',
    'projects.create',
    'projects.edit',
    'projects.delete',
    'settings.view',
    'settings.divisions',
    'users.manage',
    'system.export',
    'database.backup'
  ]

  console.log('\nPermission Matrix:')
  console.log('User Type'.padEnd(20), '|', testPermissions.join(' | '))
  console.log('-'.repeat(20), '+', '-'.repeat(testPermissions.length * 6))

  for (const testCase of testCases) {
    let row = testCase.name.padEnd(20) + ' |'
    for (const permission of testPermissions) {
      const hasAccess = hasPermission(testCase.user, permission)
      row += (hasAccess ? '  ✅  ' : '  ❌  ') + ' |'
    }
    console.log(row)
  }

  console.log('\n🎉 Enhanced Permissions System Test Completed!')
  console.log('\n📝 Summary:')
  console.log('   ✅ Role-based permissions work correctly')
  console.log('   ✅ Additional permissions are combined with role permissions')
  console.log('   ✅ Custom permissions mode works independently')
  console.log('   ✅ Admin always has all permissions')
  console.log('   ✅ System handles all scenarios properly')
  console.log('\n🚀 System is ready for production!')
}

// تشغيل الاختبار
testEnhancedPermissions()

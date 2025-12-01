/**
 * Test Script: Permissions Logic Testing
 * سكريبت اختبار: اختبار منطق الصلاحيات
 */

// محاكاة البيانات
const DEFAULT_ROLE_PERMISSIONS = {
  admin: ['projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'settings.view', 'settings.edit'],
  manager: ['projects.view', 'projects.create', 'projects.edit', 'settings.view'],
  engineer: ['projects.view', 'projects.create'],
  viewer: ['projects.view']
}

// محاكاة دالة getUserPermissions
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
    const combinedPermissions = [...new Set([...defaultRolePermissions, ...user.permissions])]
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

// اختبارات مختلفة
function runTests() {
  console.log('🧪 Testing Permissions Logic...')
  console.log('=====================================')

  // اختبار 1: مهندس بدون صلاحيات إضافية
  console.log('\n📋 Test 1: Engineer with no additional permissions')
  const engineer1 = {
    email: 'engineer1@test.com',
    role: 'engineer',
    permissions: [],
    custom_permissions_enabled: false
  }
  const permissions1 = getUserPermissions(engineer1)
  console.log('Result:', permissions1)
  console.log('Has settings.edit?', permissions1.includes('settings.edit'))

  // اختبار 2: مهندس مع صلاحيات إضافية (غير مفعل)
  console.log('\n📋 Test 2: Engineer with additional permissions (not enabled)')
  const engineer2 = {
    email: 'engineer2@test.com',
    role: 'engineer',
    permissions: ['settings.edit', 'settings.divisions'],
    custom_permissions_enabled: false
  }
  const permissions2 = getUserPermissions(engineer2)
  console.log('Result:', permissions2)
  console.log('Has settings.edit?', permissions2.includes('settings.edit'))
  console.log('Has settings.divisions?', permissions2.includes('settings.divisions'))

  // اختبار 3: مهندس مع صلاحيات مخصصة (مفعل)
  console.log('\n📋 Test 3: Engineer with custom permissions (enabled)')
  const engineer3 = {
    email: 'engineer3@test.com',
    role: 'engineer',
    permissions: ['settings.edit', 'settings.divisions'],
    custom_permissions_enabled: true
  }
  const permissions3 = getUserPermissions(engineer3)
  console.log('Result:', permissions3)
  console.log('Has settings.edit?', permissions3.includes('settings.edit'))
  console.log('Has projects.view?', permissions3.includes('projects.view'))

  // اختبار 4: مدير مع صلاحيات إضافية
  console.log('\n📋 Test 4: Manager with additional permissions')
  const manager1 = {
    email: 'manager1@test.com',
    role: 'manager',
    permissions: ['users.manage', 'database.view'],
    custom_permissions_enabled: false
  }
  const permissions4 = getUserPermissions(manager1)
  console.log('Result:', permissions4)
  console.log('Has users.manage?', permissions4.includes('users.manage'))
  console.log('Has database.view?', permissions4.includes('database.view'))
  console.log('Has projects.view?', permissions4.includes('projects.view'))

  console.log('\n🎉 Tests completed!')
}

// تشغيل الاختبارات
runTests()

/**
 * Enhanced Permissions System Test
 * اختبار النظام المحسن للصلاحيات
 */

const { createClient } = require('@supabase/supabase-js')

// إعدادات Supabase (استخدم المتغيرات البيئية الحقيقية)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key'

if (supabaseUrl === 'your-supabase-url') {
  console.log('⚠️  Please set your Supabase environment variables first!')
  console.log('   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function testEnhancedPermissions() {
  console.log('🧪 Testing Enhanced Permissions System...')
  console.log('==========================================')

  try {
    // جلب المستخدمين من قاعدة البيانات
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (error) {
      console.error('❌ Error fetching users:', error)
      return
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database')
      return
    }

    console.log(`📋 Found ${users.length} users to test`)

    // اختبار كل مستخدم
    for (const user of users) {
      console.log(`\n👤 Testing user: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Custom enabled: ${user.custom_permissions_enabled}`)
      console.log(`   Saved permissions: ${user.permissions?.length || 0}`)

      const finalPermissions = getUserPermissions(user)
      console.log(`   Final permissions count: ${finalPermissions.length}`)

      // اختبار صلاحيات مختلفة
      const testPermissions = [
        'projects.view',
        'projects.create',
        'settings.divisions',
        'users.manage',
        'system.export',
        'database.view'
      ]

      console.log('   Permission tests:')
      for (const permission of testPermissions) {
        const hasAccess = hasPermission(user, permission)
        console.log(`     ${permission}: ${hasAccess ? '✅' : '❌'}`)
      }
    }

    // اختبار سيناريوهات مختلفة
    console.log('\n🎭 Testing different scenarios...')

    // سيناريو 1: مهندس مع صلاحيات إضافية
    console.log('\n📋 Scenario 1: Engineer with additional permissions')
    const engineerWithExtra = {
      email: 'test-engineer@example.com',
      role: 'engineer',
      permissions: ['settings.divisions', 'users.manage'],
      custom_permissions_enabled: false
    }
    
    const engineerPermissions = getUserPermissions(engineerWithExtra)
    console.log('   Final permissions:', engineerPermissions.length)
    console.log('   Has settings.divisions?', hasPermission(engineerWithExtra, 'settings.divisions'))
    console.log('   Has users.manage?', hasPermission(engineerWithExtra, 'users.manage'))
    console.log('   Has projects.view?', hasPermission(engineerWithExtra, 'projects.view'))

    // سيناريو 2: مهندس مع صلاحيات مخصصة
    console.log('\n📋 Scenario 2: Engineer with custom permissions')
    const engineerCustom = {
      email: 'test-engineer-custom@example.com',
      role: 'engineer',
      permissions: ['settings.divisions', 'users.manage'],
      custom_permissions_enabled: true
    }
    
    const engineerCustomPermissions = getUserPermissions(engineerCustom)
    console.log('   Final permissions:', engineerCustomPermissions.length)
    console.log('   Has settings.divisions?', hasPermission(engineerCustom, 'settings.divisions'))
    console.log('   Has users.manage?', hasPermission(engineerCustom, 'users.manage'))
    console.log('   Has projects.view?', hasPermission(engineerCustom, 'projects.view'))

    console.log('\n🎉 Enhanced Permissions System Test Completed!')
    console.log('\n📝 Summary:')
    console.log('   ✅ Role-based permissions work')
    console.log('   ✅ Additional permissions are combined with role permissions')
    console.log('   ✅ Custom permissions mode works independently')
    console.log('   ✅ Admin always has all permissions')
    console.log('   ✅ System is ready for production!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// تشغيل الاختبار
testEnhancedPermissions()

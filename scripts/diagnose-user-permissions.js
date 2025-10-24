/**
 * سكريبت تشخيص شامل لمشاكل الصلاحيات
 * Comprehensive permissions diagnosis script
 * 
 * الاستخدام:
 * node scripts/diagnose-user-permissions.js USER_EMAIL
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// الصلاحيات الافتراضية لكل دور
const DEFAULT_ROLE_PERMISSIONS = {
  admin: ['*'], // جميع الصلاحيات
  manager: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
    'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies',
    'system.export', 'system.backup', 'system.search'
  ],
  engineer: [
    'projects.view', 'projects.export',
    'boq.view', 'boq.create', 'boq.edit', 'boq.export',
    'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print',
    'settings.view',
    'system.search'
  ],
  viewer: [
    'projects.view',
    'boq.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'settings.view'
  ]
}

async function diagnoseUser(email) {
  console.log('🔍 بدء التشخيص الشامل...')
  console.log('=' .repeat(80))
  console.log(`📧 البريد الإلكتروني: ${email}`)
  console.log('=' .repeat(80))
  
  try {
    // 1. جلب بيانات المستخدم
    console.log('\n1️⃣ جلب بيانات المستخدم من قاعدة البيانات...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (userError) {
      console.error('❌ خطأ في جلب المستخدم:', userError.message)
      return
    }
    
    if (!user) {
      console.error('❌ المستخدم غير موجود!')
      return
    }
    
    console.log('✅ تم العثور على المستخدم')
    console.log('📊 معلومات المستخدم:')
    console.log('   - ID:', user.id)
    console.log('   - الاسم:', user.full_name)
    console.log('   - الدور:', user.role)
    console.log('   - نشط:', user.is_active ? 'نعم' : 'لا')
    console.log('   - الصلاحيات المخصصة مفعلة:', user.custom_permissions_enabled ? 'نعم' : 'لا')
    
    // 2. فحص الصلاحيات المحفوظة
    console.log('\n2️⃣ فحص الصلاحيات المحفوظة في قاعدة البيانات...')
    const savedPermissions = user.permissions || []
    console.log('📋 الصلاحيات المحفوظة:', savedPermissions.length, 'صلاحية')
    
    if (savedPermissions.length > 0) {
      console.log('✅ الصلاحيات المحفوظة:')
      savedPermissions.forEach((perm, i) => {
        console.log(`   ${i + 1}. ${perm}`)
      })
    } else {
      console.log('⚠️  لا توجد صلاحيات محفوظة!')
    }
    
    // 3. حساب الصلاحيات الفعلية
    console.log('\n3️⃣ حساب الصلاحيات الفعلية للمستخدم...')
    let effectivePermissions = []
    
    if (user.role === 'admin') {
      console.log('👑 المستخدم Admin - لديه جميع الصلاحيات')
      effectivePermissions = ['*']
    } else if (user.custom_permissions_enabled && savedPermissions.length > 0) {
      console.log('🔧 استخدام الصلاحيات المخصصة فقط')
      effectivePermissions = savedPermissions
    } else if (savedPermissions.length > 0) {
      console.log('🔀 دمج صلاحيات الدور مع الصلاحيات الإضافية')
      const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || []
      effectivePermissions = Array.from(new Set([...rolePermissions, ...savedPermissions]))
      console.log('   - صلاحيات الدور:', rolePermissions.length)
      console.log('   - صلاحيات إضافية:', savedPermissions.length)
      console.log('   - المجموع:', effectivePermissions.length)
    } else {
      console.log('📝 استخدام صلاحيات الدور الافتراضية فقط')
      effectivePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || []
    }
    
    console.log('📊 إجمالي الصلاحيات الفعلية:', effectivePermissions.length)
    
    // 4. فحص صلاحيات User Management
    console.log('\n4️⃣ فحص صلاحيات User Management...')
    const hasUsersView = effectivePermissions.includes('users.view') || effectivePermissions.includes('*')
    const hasUsersPermissions = effectivePermissions.includes('users.permissions') || effectivePermissions.includes('*')
    const hasUsersCreate = effectivePermissions.includes('users.create') || effectivePermissions.includes('*')
    const hasUsersEdit = effectivePermissions.includes('users.edit') || effectivePermissions.includes('*')
    const hasUsersDelete = effectivePermissions.includes('users.delete') || effectivePermissions.includes('*')
    
    console.log('   - users.view:', hasUsersView ? '✅' : '❌')
    console.log('   - users.permissions:', hasUsersPermissions ? '✅' : '❌')
    console.log('   - users.create:', hasUsersCreate ? '✅' : '❌')
    console.log('   - users.edit:', hasUsersEdit ? '✅' : '❌')
    console.log('   - users.delete:', hasUsersDelete ? '✅' : '❌')
    
    // 5. فحص شروط ظهور User Management Tab
    console.log('\n5️⃣ فحص شروط ظهور User Management Tab...')
    const isAdmin = user.role === 'admin'
    const canManageUsers = hasUsersPermissions || hasUsersView || isAdmin
    
    console.log('   - هل المستخدم Admin؟', isAdmin ? '✅' : '❌')
    console.log('   - هل يمكنه إدارة المستخدمين؟', canManageUsers ? '✅' : '❌')
    
    if (canManageUsers) {
      console.log('\n✅ يجب أن يرى المستخدم User Management Tab!')
    } else {
      console.log('\n❌ المستخدم لا يرى User Management Tab')
      console.log('\n💡 الحلول المقترحة:')
      console.log('   1. أضف صلاحية "users.view" أو "users.permissions"')
      console.log('   2. أو غير دور المستخدم إلى "admin"')
    }
    
    // 6. فحص التحديثات الأخيرة
    console.log('\n6️⃣ فحص آخر تحديث...')
    console.log('   - تاريخ الإنشاء:', new Date(user.created_at).toLocaleString('ar-EG'))
    console.log('   - آخر تحديث:', new Date(user.updated_at).toLocaleString('ar-EG'))
    
    const timeSinceUpdate = Date.now() - new Date(user.updated_at).getTime()
    const minutesSinceUpdate = Math.floor(timeSinceUpdate / 1000 / 60)
    console.log('   - منذ:', minutesSinceUpdate, 'دقيقة')
    
    if (minutesSinceUpdate < 5) {
      console.log('   ⚠️  تحديث حديث! قد يحتاج المستخدم لتحديث الصفحة')
    }
    
    // 7. التوصيات
    console.log('\n7️⃣ التوصيات:')
    console.log('=' .repeat(80))
    
    if (!canManageUsers && savedPermissions.length === 0) {
      console.log('❌ المشكلة: لا توجد صلاحيات محفوظة في قاعدة البيانات!')
      console.log('\n💡 الحل:')
      console.log('   1. اذهب إلى Settings → Users')
      console.log('   2. اضغط "Permissions" للمستخدم')
      console.log('   3. أضف صلاحية "users.view" أو "users.permissions"')
      console.log('   4. اضغط "Save Changes"')
    } else if (!canManageUsers && savedPermissions.length > 0) {
      console.log('⚠️  المشكلة: الصلاحيات محفوظة لكن لا تشمل User Management!')
      console.log('\n💡 الحل:')
      console.log('   أضف إحدى هذه الصلاحيات:')
      console.log('   - users.view (للعرض فقط)')
      console.log('   - users.permissions (لإدارة الصلاحيات)')
    } else if (canManageUsers && minutesSinceUpdate < 5) {
      console.log('✅ الصلاحيات صحيحة!')
      console.log('\n⚠️  لكن التحديث حديث جداً. اطلب من المستخدم:')
      console.log('   1. تحديث الصفحة (F5 أو Ctrl+R)')
      console.log('   2. مسح الـ Cache (Ctrl+Shift+R)')
      console.log('   3. تسجيل الخروج ثم الدخول مرة أخرى')
    } else {
      console.log('✅ الصلاحيات صحيحة والنظام يعمل!')
      console.log('\nإذا كان المستخدم لا يزال لا يرى User Management:')
      console.log('   1. تحقق من أن المستخدم سجل دخول بهذا البريد:', email)
      console.log('   2. تحقق من الكونسول في المتصفح للأخطاء')
      console.log('   3. تأكد من أن المستخدم في صفحة Settings')
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ انتهى التشخيص!')
    console.log('=' .repeat(80))
    
  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error)
  }
}

// تشغيل التشخيص
const userEmail = process.argv[2]

if (!userEmail) {
  console.error('❌ يجب توفير البريد الإلكتروني للمستخدم')
  console.log('\nالاستخدام:')
  console.log('  node scripts/diagnose-user-permissions.js USER_EMAIL')
  console.log('\nمثال:')
  console.log('  node scripts/diagnose-user-permissions.js test@example.com')
  process.exit(1)
}

diagnoseUser(userEmail)

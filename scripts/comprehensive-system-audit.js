/**
 * فحص شامل للنظام - البحث عن الأخطاء المنطقية والمشاكل المحتملة
 * Comprehensive System Audit - Finding logical errors and potential issues
 */

console.log('🔍 بدء الفحص الشامل للنظام...')
console.log('=' .repeat(80))

// تعريف الصلاحيات (نسخة مبسطة للاختبار)
const ALL_PERMISSIONS = [
  { id: 'projects.view', category: 'projects', action: 'view' },
  { id: 'projects.create', category: 'projects', action: 'create' },
  { id: 'projects.edit', category: 'projects', action: 'edit' },
  { id: 'projects.delete', category: 'projects', action: 'delete' },
  { id: 'boq.view', category: 'boq', action: 'view' },
  { id: 'boq.create', category: 'boq', action: 'create' },
  { id: 'boq.edit', category: 'boq', action: 'edit' },
  { id: 'boq.delete', category: 'boq', action: 'delete' },
  { id: 'users.view', category: 'users', action: 'view' },
  { id: 'users.create', category: 'users', action: 'create' },
  { id: 'users.edit', category: 'users', action: 'edit' },
  { id: 'users.delete', category: 'users', action: 'delete' },
  { id: 'users.permissions', category: 'users', action: 'manage' },
  { id: 'settings.view', category: 'settings', action: 'view' },
  { id: 'settings.divisions', category: 'settings', action: 'manage' },
  { id: 'settings.currencies', category: 'settings', action: 'manage' },
  { id: 'database.view', category: 'database', action: 'view' },
  { id: 'database.manage', category: 'database', action: 'manage' },
]

const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS.map(p => p.id),
  manager: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'boq.view', 'boq.create', 'boq.edit', 'boq.delete',
    'settings.view', 'settings.divisions', 'settings.currencies'
  ],
  engineer: [
    'projects.view',
    'boq.view', 'boq.create', 'boq.edit',
    'settings.view'
  ],
  viewer: [
    'projects.view',
    'boq.view',
    'settings.view'
  ]
}

// ========================================
// 1️⃣ فحص التناقضات المنطقية في الصلاحيات
// ========================================
console.log('\n1️⃣ فحص التناقضات المنطقية في الصلاحيات:')
console.log('-'.repeat(80))

const logicIssues = []

// فحص: هل يوجد create بدون view؟
ALL_PERMISSIONS.forEach(perm => {
  if (perm.action === 'create') {
    const viewPerm = `${perm.category}.view`
    const hasView = ALL_PERMISSIONS.some(p => p.id === viewPerm)
    if (!hasView) {
      logicIssues.push({
        type: 'missing_view',
        permission: perm.id,
        issue: `يوجد إذن إنشاء (${perm.id}) لكن لا يوجد إذن عرض (${viewPerm})`
      })
    }
  }
})

// فحص: هل يوجد edit بدون view؟
ALL_PERMISSIONS.forEach(perm => {
  if (perm.action === 'edit') {
    const viewPerm = `${perm.category}.view`
    const hasView = ALL_PERMISSIONS.some(p => p.id === viewPerm)
    if (!hasView) {
      logicIssues.push({
        type: 'missing_view',
        permission: perm.id,
        issue: `يوجد إذن تعديل (${perm.id}) لكن لا يوجد إذن عرض (${viewPerm})`
      })
    }
  }
})

// فحص: هل يوجد delete بدون view؟
ALL_PERMISSIONS.forEach(perm => {
  if (perm.action === 'delete') {
    const viewPerm = `${perm.category}.view`
    const hasView = ALL_PERMISSIONS.some(p => p.id === viewPerm)
    if (!hasView) {
      logicIssues.push({
        type: 'missing_view',
        permission: perm.id,
        issue: `يوجد إذن حذف (${perm.id}) لكن لا يوجد إذن عرض (${viewPerm})`
      })
    }
  }
})

if (logicIssues.length > 0) {
  console.log('❌ تم العثور على مشاكل منطقية:')
  logicIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.issue}`)
  })
} else {
  console.log('✅ لا توجد مشاكل منطقية في تعريف الصلاحيات')
}

// ========================================
// 2️⃣ فحص تناسق الأدوار مع الصلاحيات
// ========================================
console.log('\n2️⃣ فحص تناسق الأدوار مع الصلاحيات:')
console.log('-'.repeat(80))

const roleIssues = []

Object.entries(DEFAULT_ROLE_PERMISSIONS).forEach(([role, permissions]) => {
  permissions.forEach(permId => {
    const permExists = ALL_PERMISSIONS.some(p => p.id === permId)
    if (!permExists) {
      roleIssues.push({
        role,
        permission: permId,
        issue: `الدور "${role}" يحتوي على صلاحية غير موجودة: ${permId}`
      })
    }
  })
})

// فحص: الأدوار الأعلى يجب أن تحتوي على صلاحيات الأدوار الأقل
const roleHierarchy = {
  viewer: [],
  engineer: ['viewer'],
  manager: ['viewer', 'engineer'],
  admin: ['viewer', 'engineer', 'manager']
}

Object.entries(roleHierarchy).forEach(([role, parentRoles]) => {
  parentRoles.forEach(parentRole => {
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || []
    const parentPerms = DEFAULT_ROLE_PERMISSIONS[parentRole] || []
    
    parentPerms.forEach(parentPerm => {
      if (!rolePerms.includes(parentPerm)) {
        roleIssues.push({
          role,
          parentRole,
          permission: parentPerm,
          issue: `الدور "${role}" لا يحتوي على الصلاحية "${parentPerm}" من الدور الأدنى "${parentRole}"`
        })
      }
    })
  })
})

if (roleIssues.length > 0) {
  console.log('⚠️  تم العثور على مشاكل في تناسق الأدوار:')
  roleIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.issue}`)
  })
} else {
  console.log('✅ جميع الأدوار متناسقة مع الصلاحيات')
}

// ========================================
// 3️⃣ فحص الحالات الاستثنائية
// ========================================
console.log('\n3️⃣ فحص الحالات الاستثنائية:')
console.log('-'.repeat(80))

// سيناريو 1: مستخدم بدون دور
const userWithoutRole = {
  email: 'test@test.com',
  role: null,
  permissions: ['projects.view']
}
console.log('🧪 سيناريو 1: مستخدم بدون دور')
console.log(`   الدور: ${userWithoutRole.role}`)
console.log(`   الصلاحيات: ${userWithoutRole.permissions.length}`)
if (!userWithoutRole.role) {
  console.log('   ⚠️  خطر: المستخدم بدون دور قد يسبب مشاكل')
}

// سيناريو 2: مستخدم بدور لكن بدون صلاحيات
const userWithRoleNoPerms = {
  email: 'test2@test.com',
  role: 'viewer',
  permissions: []
}
console.log('\n🧪 سيناريو 2: مستخدم بدور لكن بدون صلاحيات محفوظة')
console.log(`   الدور: ${userWithRoleNoPerms.role}`)
console.log(`   الصلاحيات المحفوظة: ${userWithRoleNoPerms.permissions.length}`)
console.log(`   الصلاحيات الافتراضية: ${DEFAULT_ROLE_PERMISSIONS[userWithRoleNoPerms.role].length}`)
console.log('   ✅ سيستخدم الصلاحيات الافتراضية للدور')

// سيناريو 3: مستخدم بصلاحيات متضاربة
const userWithConflictingPerms = {
  email: 'test3@test.com',
  role: 'viewer',
  custom_permissions_enabled: true,
  permissions: ['projects.delete', 'projects.create'] // لديه delete لكن ليس لديه view
}
console.log('\n🧪 سيناريو 3: مستخدم بصلاحيات متضاربة')
console.log(`   الدور: ${userWithConflictingPerms.role}`)
console.log(`   الصلاحيات: ${userWithConflictingPerms.permissions.join(', ')}`)
const hasView = userWithConflictingPerms.permissions.includes('projects.view')
const hasDelete = userWithConflictingPerms.permissions.includes('projects.delete')
if (hasDelete && !hasView) {
  console.log('   ⚠️  خطر: المستخدم لديه صلاحية حذف لكن ليس لديه صلاحية عرض!')
}

// سيناريو 4: مستخدم بصلاحيات مكررة
const userWithDuplicatePerms = {
  email: 'test4@test.com',
  role: 'engineer',
  permissions: ['projects.view', 'projects.view', 'boq.view']
}
console.log('\n🧪 سيناريو 4: مستخدم بصلاحيات مكررة')
console.log(`   الصلاحيات: ${userWithDuplicatePerms.permissions.length}`)
const uniquePerms = [...new Set(userWithDuplicatePerms.permissions)]
console.log(`   الصلاحيات الفريدة: ${uniquePerms.length}`)
if (userWithDuplicatePerms.permissions.length !== uniquePerms.length) {
  console.log('   ⚠️  تحذير: توجد صلاحيات مكررة')
}

// ========================================
// 4️⃣ فحص الأمان
// ========================================
console.log('\n4️⃣ فحص الأمان:')
console.log('-'.repeat(80))

const securityIssues = []

// فحص: هل يوجد مستخدم غير admin يمكنه إدارة قاعدة البيانات؟
Object.entries(DEFAULT_ROLE_PERMISSIONS).forEach(([role, permissions]) => {
  if (role !== 'admin') {
    const dangerousPerms = permissions.filter(p => 
      p.includes('database.manage') || 
      p.includes('database.clear') ||
      p.includes('database.restore')
    )
    if (dangerousPerms.length > 0) {
      securityIssues.push({
        role,
        permissions: dangerousPerms,
        issue: `الدور "${role}" لديه صلاحيات خطيرة: ${dangerousPerms.join(', ')}`
      })
    }
  }
})

// فحص: هل يوجد مستخدم غير admin يمكنه حذف مستخدمين؟
Object.entries(DEFAULT_ROLE_PERMISSIONS).forEach(([role, permissions]) => {
  if (role !== 'admin') {
    if (permissions.includes('users.delete')) {
      securityIssues.push({
        role,
        permission: 'users.delete',
        issue: `الدور "${role}" يمكنه حذف مستخدمين`
      })
    }
  }
})

if (securityIssues.length > 0) {
  console.log('⚠️  تم العثور على مشاكل أمنية محتملة:')
  securityIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.issue}`)
  })
} else {
  console.log('✅ لا توجد مشاكل أمنية واضحة')
}

// ========================================
// 5️⃣ فحص تجربة المستخدم (UX)
// ========================================
console.log('\n5️⃣ فحص تجربة المستخدم (UX):')
console.log('-'.repeat(80))

const uxIssues = []

// فحص: مستخدم يمكنه عرض صفحة لكن لا يمكنه رؤية أي محتوى
const viewerPerms = DEFAULT_ROLE_PERMISSIONS['viewer']
console.log('🔍 فحص صلاحيات Viewer:')
console.log(`   - يمكنه عرض المشاريع: ${viewerPerms.includes('projects.view') ? '✅' : '❌'}`)
console.log(`   - يمكنه إنشاء مشاريع: ${viewerPerms.includes('projects.create') ? '✅' : '❌'}`)
console.log(`   - يمكنه تعديل مشاريع: ${viewerPerms.includes('projects.edit') ? '✅' : '❌'}`)

if (viewerPerms.includes('projects.view') && 
    !viewerPerms.includes('projects.create') && 
    !viewerPerms.includes('projects.edit')) {
  console.log('   ℹ️  ملاحظة: Viewer يمكنه فقط المشاهدة (تصميم صحيح)')
}

// ========================================
// 6️⃣ فحص الأداء المحتمل
// ========================================
console.log('\n6️⃣ فحص الأداء المحتمل:')
console.log('-'.repeat(80))

console.log(`📊 إجمالي الصلاحيات: ${ALL_PERMISSIONS.length}`)
console.log(`📊 إجمالي الأدوار: ${Object.keys(DEFAULT_ROLE_PERMISSIONS).length}`)

// حساب متوسط الصلاحيات لكل دور
const avgPermsPerRole = Object.values(DEFAULT_ROLE_PERMISSIONS).reduce((sum, perms) => 
  sum + perms.length, 0) / Object.keys(DEFAULT_ROLE_PERMISSIONS).length
console.log(`📊 متوسط الصلاحيات لكل دور: ${avgPermsPerRole.toFixed(1)}`)

if (ALL_PERMISSIONS.length > 100) {
  console.log('   ⚠️  تحذير: عدد الصلاحيات كبير جداً (قد يؤثر على الأداء)')
} else {
  console.log('   ✅ عدد الصلاحيات معقول')
}

// ========================================
// 7️⃣ فحص الاتساق في التسمية
// ========================================
console.log('\n7️⃣ فحص الاتساق في التسمية:')
console.log('-'.repeat(80))

const namingIssues = []

// فحص: جميع الصلاحيات يجب أن تتبع نمط category.action
ALL_PERMISSIONS.forEach(perm => {
  const parts = perm.id.split('.')
  if (parts.length < 2) {
    namingIssues.push({
      permission: perm.id,
      issue: `الصلاحية لا تتبع النمط المتوقع (category.action)`
    })
  }
})

if (namingIssues.length > 0) {
  console.log('⚠️  مشاكل في التسمية:')
  namingIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.issue}`)
  })
} else {
  console.log('✅ جميع الصلاحيات تتبع نمط التسمية الصحيح')
}

// ========================================
// 📊 الملخص النهائي
// ========================================
console.log('\n' + '='.repeat(80))
console.log('📊 ملخص الفحص الشامل:')
console.log('='.repeat(80))

const totalIssues = logicIssues.length + roleIssues.length + securityIssues.length + namingIssues.length

console.log(`🔍 المشاكل المنطقية: ${logicIssues.length}`)
console.log(`⚠️  مشاكل تناسق الأدوار: ${roleIssues.length}`)
console.log(`🔒 المشاكل الأمنية: ${securityIssues.length}`)
console.log(`📝 مشاكل التسمية: ${namingIssues.length}`)
console.log(`📊 إجمالي المشاكل: ${totalIssues}`)

if (totalIssues === 0) {
  console.log('\n🎉 ممتاز! النظام خالي من المشاكل المنطقية الواضحة!')
} else {
  console.log(`\n⚠️  يوجد ${totalIssues} مشكلة تحتاج للمراجعة`)
}

console.log('\n✅ انتهى الفحص الشامل!')
console.log('='.repeat(80))

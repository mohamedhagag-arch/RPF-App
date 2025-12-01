# 🔐 تحديث نظام الحماية والصلاحيات

## 📋 نظرة عامة

تم تحديث نظام الحماية والصلاحيات ليشمل الميزات الجديدة:
- **Audit Log System** - تتبع التغييرات في BOQ, Projects, KPI
- **User Guide System** - إدارة الأدلة التعليمية
- **Activity Log** - تتبع نشاط المستخدمين
- **Active Users** - عرض المستخدمين النشطين

---

## ✅ التحديثات المنفذة

### 1. **إضافة صلاحيات جديدة** (`lib/permissionsSystem.ts`)

تم إضافة الصلاحيات التالية:

#### Audit Log Permissions
- `audit_log.view` - عرض سجلات Audit Log
- `audit_log.export` - تصدير سجلات Audit Log

#### User Guide Permissions
- `user_guide.view` - عرض User Guide (جميع المستخدمين)
- `user_guide.manage` - إدارة User Guide (Admin only)

#### Activity Log Permissions
- `activity_log.view` - عرض Activity Log (Admin only)
- `activity_log.export` - تصدير Activity Log

#### Active Users Permissions
- `active_users.view` - عرض Active Users (جميع المستخدمين)

---

### 2. **تحديث DEFAULT_ROLE_PERMISSIONS**

تم تحديث الصلاحيات الافتراضية لكل دور:

#### Admin
- ✅ جميع الصلاحيات (تلقائياً)

#### Manager
- ✅ `audit_log.view`, `audit_log.export`
- ✅ `user_guide.view`
- ✅ `activity_log.view`, `activity_log.export`
- ✅ `active_users.view`

#### Engineer
- ✅ `user_guide.view`
- ✅ `active_users.view`

#### Viewer
- ✅ `user_guide.view`
- ✅ `active_users.view`

#### Planner
- ✅ `user_guide.view`
- ✅ `active_users.view`

---

### 3. **تحديث Permission Guards**

#### User Guide Page (`app/(authenticated)/user-guide/page.tsx`)
- ✅ استخدام `user_guide.view` للعرض
- ✅ استخدام `user_guide.manage` للإدارة (Admin only)
- ✅ إضافة `PermissionGuard` للتحقق من الصلاحيات

#### Activity Log Page (`app/(authenticated)/activity-log/page.tsx`)
- ✅ يستخدم `activity_log.view` بالفعل
- ✅ محمي بـ `PermissionPage`

---

### 4. **تحديث RLS Policies**

#### User Guides (`Database/fix-user-guide-permissions.sql`)
- ✅ جميع المستخدمين يمكنهم عرض Guides النشطة
- ✅ Admin فقط يمكنه إدارة Guides

#### User Activities (`Database/create-user-activities-table.sql`)
- ✅ Admin يمكنه عرض جميع الأنشطة
- ✅ المستخدمون يمكنهم عرض أنشطتهم فقط
- ✅ جميع المستخدمين يمكنهم تسجيل الأنشطة

#### Audit Logs (`Database/add-audit-log-rls-policies.sql`)
- ✅ Admin فقط يمكنه عرض Audit Logs
- ✅ INSERT يتم عبر Triggers (SECURITY DEFINER)

---

## 📝 SQL Scripts المطلوبة

### 1. **تحديث الصلاحيات للمستخدمين الحاليين**
```sql
-- تشغيل: Database/update-permissions-for-new-features.sql
```
هذا السكريبت يضيف الصلاحيات الجديدة للمستخدمين الحاليين حسب دورهم.

### 2. **إضافة RLS Policies لـ Audit Logs**
```sql
-- تشغيل: Database/add-audit-log-rls-policies.sql
```
هذا السكريبت يضيف RLS policies لـ Audit Log tables (Admin only).

---

## 🚀 خطوات التطبيق

### الخطوة 1: تشغيل SQL Scripts
1. افتح Supabase SQL Editor
2. شغّل `Database/update-permissions-for-new-features.sql`
3. شغّل `Database/add-audit-log-rls-policies.sql`

### الخطوة 2: التحقق من التحديثات
1. افتح User Management
2. تحقق من ظهور الصلاحيات الجديدة في قائمة الصلاحيات
3. تحقق من أن المستخدمين الحاليين لديهم الصلاحيات المناسبة

### الخطوة 3: اختبار الصلاحيات
1. **User Guide**: 
   - جميع المستخدمين يجب أن يتمكنوا من الوصول
   - Admin فقط يمكنه إدارة Guides
2. **Activity Log**: 
   - Admin فقط يمكنه الوصول
3. **Active Users**: 
   - جميع المستخدمين يمكنهم رؤية Active Users
4. **Audit Log**: 
   - Admin فقط يمكنه عرض Audit Logs (من خلال Record History Modal)

---

## 📊 ملخص الصلاحيات الجديدة

| Permission | Admin | Manager | Engineer | Viewer | Planner |
|------------|-------|---------|----------|--------|---------|
| `audit_log.view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `audit_log.export` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user_guide.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user_guide.manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `activity_log.view` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `activity_log.export` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `active_users.view` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 ملاحظات مهمة

1. **Admin Role**: يحصل تلقائياً على جميع الصلاحيات (حتى الجديدة)
2. **Custom Permissions**: المستخدمون الذين لديهم `custom_permissions_enabled = TRUE` لن يتم تحديث صلاحياتهم تلقائياً
3. **RLS Policies**: جميع الجداول الجديدة محمية بـ RLS policies
4. **Audit Logs**: يمكن الوصول إليها فقط من خلال Record History Modal (زر 👤)

---

## ✅ التحقق من النجاح

بعد تطبيق التحديثات، تحقق من:

- [ ] الصلاحيات الجديدة تظهر في `EnhancedPermissionsManager`
- [ ] المستخدمون الحاليون لديهم الصلاحيات المناسبة
- [ ] User Guide متاح لجميع المستخدمين
- [ ] Activity Log متاح فقط لـ Admin
- [ ] Active Users متاح لجميع المستخدمين
- [ ] Audit Logs محمية (Admin only)
- [ ] RLS Policies تعمل بشكل صحيح

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من أن SQL Scripts تم تشغيلها بنجاح
2. تحقق من RLS Policies في Supabase Dashboard
3. تحقق من أن المستخدمين لديهم الأدوار الصحيحة

---

**تاريخ التحديث**: $(date)
**الإصدار**: 1.0.0


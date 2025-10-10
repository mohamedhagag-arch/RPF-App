# 🔍 **تشخيص مشكلة عدم ظهور User Management**

---

## ❌ **المشكلة:**
المستخدم حصل على صلاحيات User Management لكنها لم تظهر له في Settings.

---

## 🔍 **خطوات التشخيص:**

### **الخطوة 1: التحقق من الصلاحيات في قاعدة البيانات**

#### **في Supabase SQL Editor:**
```sql
-- استبدل 'USER_EMAIL' ببريد المستخدم الفعلي
SELECT 
  id,
  email,
  full_name,
  role,
  permissions,
  array_length(permissions, 1) as permissions_count,
  custom_permissions_enabled,
  is_active,
  updated_at
FROM users
WHERE email = 'USER_EMAIL';
```

#### **ما تبحث عنه:**
- ✅ `permissions` يجب أن يحتوي على `users.view` أو `users.permissions`
- ✅ `permissions_count` يجب أن يكون > 0
- ✅ `is_active` يجب أن يكون `true`

---

### **الخطوة 2: استخدام سكريبت التشخيص**

```bash
cd "C:\Users\ENG.MO\Desktop\rabat mvp"
node scripts/diagnose-user-permissions.js USER_EMAIL
```

**مثال:**
```bash
node scripts/diagnose-user-permissions.js ahmed@example.com
```

**ما سيعرضه:**
- 📊 معلومات المستخدم الكاملة
- 📋 الصلاحيات المحفوظة
- 🔀 الصلاحيات الفعلية
- ✅ فحص صلاحيات User Management
- 💡 توصيات للحل

---

### **الخطوة 3: التحقق من الكونسول في المتصفح**

اطلب من المستخدم:
```
1. فتح Settings في المتصفح
2. فتح Console (F12 → Console)
3. البحث عن رسائل "Permission Guard"
4. إرسال لقطة شاشة من الرسائل
```

**ما تبحث عنه:**
```
🔍 Permission Guard: Checking access for: users.view
👤 Current user: { email: '...', role: 'engineer', savedPermissions: 22, ... }
🔍 getUserPermissions called: { userEmail: '...', savedPermissions: 22, ... }
🔍 Permission Guard: Result: ✅ Granted أو ❌ Denied
```

---

### **الخطوة 4: التحقق من الصلاحيات الفعلية**

#### **في Supabase SQL Editor:**
```sql
-- اختبار دالة getUserPermissions (محاكاة)
SELECT 
  email,
  role,
  permissions,
  CASE 
    WHEN role = 'admin' THEN 'All permissions (Admin)'
    WHEN custom_permissions_enabled AND array_length(permissions, 1) > 0 THEN 'Custom permissions only'
    WHEN array_length(permissions, 1) > 0 THEN 'Role + Additional permissions'
    ELSE 'Role default permissions only'
  END as permission_mode
FROM users
WHERE email = 'USER_EMAIL';
```

---

## 🛠️ **الحلول الشائعة:**

### **الحل 1: الصلاحية غير محفوظة**

**التشخيص:**
```sql
SELECT permissions FROM users WHERE email = 'USER_EMAIL';
-- النتيجة: NULL أو [] أو لا يحتوي على users.view
```

**الحل:**
```
1. Settings → Users
2. اضغط "Permissions" للمستخدم
3. أضف صلاحية "users.view"
4. احفظ التغييرات
5. تحقق من الكونسول: يجب أن ترى "Permissions updated successfully"
```

---

### **الحل 2: المستخدم لم يحدث الصفحة**

**التشخيص:**
```sql
SELECT 
  email,
  updated_at,
  NOW() - updated_at as time_since_update
FROM users
WHERE email = 'USER_EMAIL';

-- إذا كان time_since_update < 5 minutes
```

**الحل:**
```
اطلب من المستخدم:
1. تحديث الصفحة (F5)
2. أو مسح الـ Cache (Ctrl+Shift+R)
3. أو تسجيل الخروج والدخول مرة أخرى
```

---

### **الحل 3: مشكلة في الـ Cache**

**التشخيص:**
المستخدم يرى بيانات قديمة في الواجهة رغم التحديث في قاعدة البيانات.

**الحل:**
```javascript
// اطلب من المستخدم فتح الكونسول وتنفيذ:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

---

### **الحل 4: appUser في الـ Context لم يتحدث**

**التشخيص:**
الصلاحيات محفوظة في قاعدة البيانات لكن `appUser` في الـ Context لم يتحدث.

**الحل:**
```typescript
// في app/providers.tsx - تأكد من وجود refreshUserProfile
const refreshUserProfile = async () => {
  if (!user?.id) return
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (profile) {
    setAppUser(profile)
  }
}
```

**الاستخدام:**
```typescript
// بعد تحديث الصلاحيات
await handleUpdatePermissions(...)
await refreshUserProfile() // ✅ تحديث فوري
```

---

### **الحل 5: الصلاحية الخاطئة**

**التشخيص:**
المستخدم لديه صلاحية لكن ليست الصحيحة.

**الصلاحيات المطلوبة لـ User Management:**
- ✅ `users.view` - للعرض فقط
- ✅ `users.permissions` - لإدارة الصلاحيات
- ✅ `users.create` - لإنشاء مستخدمين
- ✅ `users.edit` - لتعديل المستخدمين
- ✅ `users.delete` - لحذف المستخدمين

**الحل:**
```
تأكد من إضافة على الأقل واحدة من:
- users.view
- users.permissions
```

---

## 🧪 **اختبار شامل:**

### **السيناريو الكامل:**

#### **1. إنشاء مستخدم اختبار:**
```sql
-- في Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'test-permissions@example.com',
  crypt('Test123!', gen_salt('bf')),
  NOW()
);

-- إنشاء profile
INSERT INTO users (id, email, full_name, role, permissions, is_active)
SELECT 
  id,
  'test-permissions@example.com',
  'Test User',
  'engineer',
  ARRAY['users.view', 'users.permissions'],
  true
FROM auth.users
WHERE email = 'test-permissions@example.com';
```

#### **2. تشخيص المستخدم:**
```bash
node scripts/diagnose-user-permissions.js test-permissions@example.com
```

#### **3. تسجيل دخول:**
```
1. سجل دخول كـ test-permissions@example.com
2. اذهب إلى Settings
3. ✅ يجب أن ترى "👥 User Management" Tab
4. اضغط عليها
5. ✅ يجب أن ترى قائمة المستخدمين
```

---

## 📊 **Checklist التشخيص:**

- [ ] الصلاحيات محفوظة في قاعدة البيانات
- [ ] `users.view` أو `users.permissions` موجودة في `permissions[]`
- [ ] `is_active = true`
- [ ] المستخدم حدّث الصفحة بعد التغيير
- [ ] لا توجد أخطاء في الكونسول
- [ ] `appUser` في الـ Context محدّث
- [ ] `usePermissionGuard` يقرأ الصلاحيات بشكل صحيح

---

## 💡 **الحل السريع:**

إذا كنت تريد حل سريع بدون تشخيص:

```
1. تأكد من أن الصلاحيات محفوظة:
   SELECT permissions FROM users WHERE email = 'USER_EMAIL';

2. إذا كانت محفوظة، اطلب من المستخدم:
   - تسجيل الخروج
   - تسجيل الدخول مرة أخرى
   - الذهاب إلى Settings
   - التحقق من ظهور User Management

3. إذا لم تظهر، أرسل لي:
   - لقطة شاشة من الكونسول (F12 → Console)
   - نتيجة: SELECT * FROM users WHERE email = 'USER_EMAIL';
```

---

## ✅ **الملخص:**

**الأسباب المحتملة:**
1. 🔴 الصلاحية غير محفوظة في قاعدة البيانات
2. 🟡 المستخدم لم يحدث الصفحة
3. 🟡 مشكلة في الـ Cache
4. 🟡 `appUser` في الـ Context لم يتحدث
5. 🟢 الصلاحية الخاطئة (ليست users.view أو users.permissions)

**استخدم سكريبت التشخيص لتحديد السبب الدقيق!** 🎯

```bash
node scripts/diagnose-user-permissions.js USER_EMAIL
```

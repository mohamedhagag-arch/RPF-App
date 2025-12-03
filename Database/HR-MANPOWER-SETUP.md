# HR Manpower - Setup Guide
# دليل إعداد HR Manpower

## المشكلة
إذا كنت تواجه خطأ "permission denied for table hr_manpower"، اتبع الخطوات التالية:

## الحل السريع (موصى به)

### الطريقة 1: السكريبت الكامل (الأسهل)
1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. انسخ محتوى الملف: `Database/hr-manpower-complete-setup.sql`
4. الصق الكود في SQL Editor
5. اضغط **Run** أو **F5**
6. انتظر حتى ترى رسالة النجاح
7. أعد تحميل صفحة HR Manpower في التطبيق

### الطريقة 2: إصلاح الصلاحيات فقط
إذا كان الجدول موجوداً بالفعل ولكن الصلاحيات لا تعمل:
1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. انسخ محتوى الملف: `Database/hr-manpower-fix-rls.sql`
4. الصق الكود في SQL Editor
5. اضغط **Run**
6. أعد تحميل الصفحة

## التحقق من الإعداد

بعد تشغيل السكريبت، يمكنك التحقق من الإعداد باستخدام هذه الاستعلامات في SQL Editor:

### 1. التحقق من وجود الجدول
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'hr_manpower'
);
```
يجب أن يعيد `true`

### 2. التحقق من تفعيل RLS
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'hr_manpower';
```
يجب أن يكون `rowsecurity = true`

### 3. التحقق من السياسات
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'hr_manpower';
```
يجب أن ترى 4 سياسات على الأقل:
- `hr_manpower_select_all`
- `hr_manpower_insert_authenticated`
- `hr_manpower_update_authenticated`
- `hr_manpower_delete_authenticated`

### 4. التحقق من الصلاحيات
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'hr_manpower'
AND grantee = 'authenticated';
```
يجب أن ترى: SELECT, INSERT, UPDATE, DELETE

## الملفات المتوفرة

1. **`hr-manpower-complete-setup.sql`** - إعداد كامل (إنشاء جدول + صلاحيات)
2. **`hr-manpower-schema.sql`** - السكريبت الأصلي (إنشاء جدول فقط)
3. **`hr-manpower-fix-rls.sql`** - إصلاح الصلاحيات فقط

## ملاحظات مهمة

- تأكد من أنك مسجل الدخول في Supabase Dashboard
- تأكد من أنك في المشروع الصحيح
- بعد تشغيل السكريبت، انتظر بضع ثوانٍ قبل إعادة تحميل الصفحة
- إذا استمرت المشكلة، تحقق من أن المستخدم الحالي موجود في جدول `auth.users`

## استكشاف الأخطاء

### الخطأ: "relation hr_manpower does not exist"
**الحل**: شغّل `hr-manpower-complete-setup.sql` أولاً لإنشاء الجدول

### الخطأ: "permission denied" بعد تشغيل السكريبت
**الحل**: 
1. تحقق من أن RLS مفعل: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'hr_manpower';`
2. تحقق من وجود السياسات: `SELECT * FROM pg_policies WHERE tablename = 'hr_manpower';`
3. شغّل `hr-manpower-fix-rls.sql` مرة أخرى

### الخطأ: "policy already exists"
**الحل**: هذا طبيعي، السكريبت يستخدم `DROP POLICY IF EXISTS` لإزالة السياسات القديمة أولاً

## الدعم

إذا استمرت المشكلة بعد اتباع جميع الخطوات:
1. تحقق من console المتصفح للأخطاء
2. تحقق من Supabase Logs
3. تأكد من أن المستخدم الحالي لديه صلاحيات في Supabase


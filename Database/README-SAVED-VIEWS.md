# 📋 إرشادات إنشاء جدول Saved Views

## ⚠️ مهم جداً: يجب تنفيذ SQL Scripts قبل استخدام ميزة حفظ Views!

## الخطوات المطلوبة:

### 1. إنشاء الجدول
1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. انسخ محتوى ملف `Database/create-saved-views-table.sql`
4. الصقه في SQL Editor
5. اضغط **Run** أو **Execute**

### 2. التحقق من الجدول (اختياري لكن موصى به)
1. في نفس SQL Editor
2. انسخ محتوى ملف `Database/verify-saved-views-table.sql`
3. الصقه واشغله
4. تأكد من أن كل الفحوصات تعطي نتائج صحيحة

### 3. التحقق من RLS Policies
بعد تنفيذ SQL script، تأكد من:
- ✅ الجدول موجود في `public` schema
- ✅ RLS مفعل (ENABLED)
- ✅ Policies موجودة للـ SELECT, INSERT, UPDATE, DELETE

## 🔍 حل المشاكل الشائعة:

### المشكلة: "View saved locally (not synced to database)"

#### الحل 1: التحقق من الجدول
```sql
-- نفّذ هذا في Supabase SQL Editor
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'saved_views'
);
```

إذا كانت النتيجة `false`، الجدول غير موجود. نفّذ `create-saved-views-table.sql`

#### الحل 2: التحقق من RLS Policies
```sql
-- التحقق من RLS Policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'saved_views';
```

يجب أن ترى 4 policies:
- Users can view their own saved views
- Users can insert their own saved views
- Users can update their own saved views
- Users can delete their own saved views

#### الحل 3: التحقق من Session
افتح Browser Console (F12) وابحث عن:
- `✅ SavedViewsManager: User ID found` - يجب أن يظهر
- `✅ SavedViewsManager: Session verified` - يجب أن يظهر
- `✅ SavedViewsManager: Table access verified` - يجب أن يظهر

إذا لم يظهر أي من هذه، هناك مشكلة في:
- Authentication (Session)
- Table access (RLS or table doesn't exist)

## 📝 ملاحظات مهمة:

1. **يجب أن تكون مسجل دخول** قبل محاولة حفظ View
2. **الجدول يجب أن يكون في `public` schema**
3. **RLS Policies يجب أن تكون مفعلة وصحيحة**
4. **User ID يجب أن يكون موجود في auth.users**

## 🆘 إذا استمرت المشكلة:

1. افتح Browser Console (F12)
2. حاول حفظ View
3. ابحث عن الرسائل التي تبدأ بـ `❌`
4. شارك هذه الرسائل مع المطور

## ✅ اختبار سريع:

بعد تنفيذ SQL scripts، جرّب:
1. سجّل دخول
2. افتح Projects page
3. اضغط على Customize Columns
4. احفظ View جديدة
5. يجب أن ترى `✅ SavedViewsManager: View saved successfully` في Console

إذا نجحت، ستظهر View في قائمة Saved Views!











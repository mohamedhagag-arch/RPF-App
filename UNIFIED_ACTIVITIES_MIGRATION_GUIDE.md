# 🎯 دليل ترحيل نظام الأنشطة الموحد

## 📋 نظرة عامة

هذا الدليل يشرح كيفية توحيد نظام الأنشطة من جدولين منفصلين (`activities` و `project_type_activities`) إلى جدول موحد واحد (`project_type_activities`).

## ⚠️ قبل البدء

### **متطلبات مهمة:**
1. ✅ **نسخة احتياطية كاملة** من قاعدة البيانات
2. ✅ **الوصول إلى Supabase SQL Editor**
3. ✅ **صلاحيات Admin** لتنفيذ SQL
4. ✅ **اختبار على بيئة Test** أولاً (إذا أمكن)

### **ما سيحدث:**
- ✅ إضافة أعمدة جديدة لجدول `project_type_activities`
- ✅ ترحيل جميع البيانات من `activities` إلى `project_type_activities`
- ✅ إنشاء دوال مساعدة (functions) جديدة
- ✅ إنشاء views للتوافق مع الكود القديم
- ❌ **لن يتم حذف** جدول `activities` تلقائياً (للأمان)

## 🚀 خطوات التنفيذ

### **الخطوة 1: تشغيل SQL Script**

1. **افتح Supabase Dashboard**
   - انتقل إلى مشروعك في Supabase
   - اضغط على SQL Editor

2. **نفذ SQL Script:**
   ```bash
   # افتح ملف: Database/migrate-to-unified-activities.sql
   # انسخ المحتوى كاملاً
   # الصقه في SQL Editor
   # اضغط Run
   ```

3. **راقب النتائج:**
   - يجب أن ترى رسائل النجاح
   - تحقق من عدد السجلات المرحلة
   - تأكد من عدم وجود أخطاء

### **الخطوة 2: التحقق من الترحيل**

#### **2.1 فحص عدد السجلات:**
```sql
-- عدد السجلات في الجدول القديم
SELECT COUNT(*) as old_count FROM activities_backup;

-- عدد السجلات في الجدول الموحد
SELECT COUNT(*) as new_count FROM project_type_activities;

-- يجب أن يكون new_count >= old_count
```

#### **2.2 فحص الأنشطة حسب نوع المشروع:**
```sql
-- عرض الأنشطة المرحلة حسب نوع المشروع
SELECT 
    project_type,
    COUNT(*) as activity_count,
    SUM(usage_count) as total_usage,
    COUNT(DISTINCT category) as categories
FROM project_type_activities
GROUP BY project_type
ORDER BY activity_count DESC;
```

#### **2.3 فحص البيانات المرحلة:**
```sql
-- عرض عينة من البيانات
SELECT 
    project_type,
    activity_name,
    default_unit,
    category,
    division,
    usage_count,
    typical_duration
FROM project_type_activities
WHERE division IS NOT NULL
LIMIT 20;
```

### **الخطوة 3: تحديث الكود**

#### **3.1 تحديث استيراد الأنشطة:**

**قبل:**
```typescript
// من جدول activities
const { data } = await supabase
  .from('activities')
  .select('*')
  .eq('is_active', true)
```

**بعد:**
```typescript
// من جدول project_type_activities الموحد
const { data } = await supabase
  .from('project_type_activities')
  .select('*')
  .eq('is_active', true)
```

#### **3.2 تحديث استعلامات الفلترة:**

**قبل:**
```typescript
// فلترة حسب division
const { data } = await supabase
  .from('activities')
  .select('*')
  .eq('division', selectedDivision)
```

**بعد:**
```typescript
// فلترة حسب project_type
const { data } = await supabase
  .from('project_type_activities')
  .select('*')
  .eq('project_type', selectedProjectType)
```

#### **3.3 تحديث زيادة عداد الاستخدام:**

**قبل:**
```typescript
await supabase.rpc('increment_activity_usage', {
  activity_name: activityName
})
```

**بعد:**
```typescript
await supabase.rpc('increment_activity_usage_unified', {
  p_project_type: projectType,
  p_activity_name: activityName
})
```

### **الخطوة 4: اختبار الوظائف**

#### **4.1 اختبار القراءة:**
- [ ] عرض جميع الأنشطة
- [ ] فلترة حسب نوع المشروع
- [ ] فلترة حسب الفئة
- [ ] البحث في الأنشطة

#### **4.2 اختبار الكتابة:**
- [ ] إضافة نشاط جديد
- [ ] تعديل نشاط موجود
- [ ] حذف (تعطيل) نشاط
- [ ] زيادة عداد الاستخدام

#### **4.3 اختبار التكامل:**
- [ ] إنشاء BOQ جديد
- [ ] اختيار أنشطة من القائمة
- [ ] التحقق من الأنشطة المقترحة
- [ ] التحقق من عداد الاستخدام

## 📊 الدوال المساعدة الجديدة

### **1. get_activities_by_project_type_unified**
```sql
-- جلب جميع الأنشطة لنوع مشروع معين
SELECT * FROM get_activities_by_project_type_unified('Infrastructure');

-- مع الأنشطة غير النشطة
SELECT * FROM get_activities_by_project_type_unified('Infrastructure', true);
```

### **2. get_activities_by_category**
```sql
-- جلب الأنشطة مجمعة حسب الفئة
SELECT * FROM get_activities_by_category('Infrastructure');
```

### **3. get_unified_activity_stats**
```sql
-- جلب إحصائيات شاملة
SELECT * FROM get_unified_activity_stats();
```

### **4. increment_activity_usage_unified**
```sql
-- زيادة عداد الاستخدام
SELECT increment_activity_usage_unified('Infrastructure', 'Bored Piling');
```

## 🔍 استكشاف الأخطاء

### **مشكلة: السجلات لم تُرحّل**
```sql
-- تحقق من السجلات المفقودة
SELECT * FROM activities_backup 
WHERE name NOT IN (
  SELECT activity_name FROM project_type_activities
);

-- أعد ترحيل السجلات المفقودة
INSERT INTO project_type_activities (...)
SELECT ...
FROM activities_backup
WHERE ...;
```

### **مشكلة: project_type غير صحيح**
```sql
-- تحديث project_type للسجلات
UPDATE project_type_activities
SET project_type = 'Correct Project Type'
WHERE project_type = 'Wrong Project Type';
```

### **مشكلة: usage_count صفر**
```sql
-- تحديث usage_count من الجدول القديم
UPDATE project_type_activities pta
SET usage_count = a.usage_count
FROM activities_backup a
WHERE pta.activity_name = a.name
AND pta.division = a.division;
```

## ✅ التحقق النهائي

### **قائمة التحقق:**
- [ ] جميع السجلات رُحّلت بنجاح
- [ ] usage_count صحيح لجميع الأنشطة
- [ ] الفئات (categories) مرحلة بشكل صحيح
- [ ] الدوال المساعدة تعمل
- [ ] الاختبارات نجحت
- [ ] الواجهة تعمل بشكل صحيح
- [ ] لا توجد أخطاء في console

### **اختبار نهائي:**
```sql
-- اختبار شامل
SELECT 
    '✅ Migration Verification' as test_name,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as active_activities,
    (SELECT COUNT(DISTINCT project_type) FROM project_type_activities) as project_types,
    (SELECT COUNT(DISTINCT category) FROM project_type_activities WHERE category IS NOT NULL) as categories,
    (SELECT SUM(usage_count) FROM project_type_activities) as total_usage;
```

## 🗑️ حذف الجدول القديم (اختياري)

⚠️ **فقط بعد التأكد الكامل من نجاح الترحيل!**

### **الخطوات:**
1. **انتظر أسبوع** على الأقل للتأكد من استقرار النظام
2. **تأكد من وجود نسخة احتياطية**
3. **نفذ الأمر:**
   ```sql
   -- حذف الجدول القديم
   DROP TABLE IF EXISTS activities CASCADE;
   
   -- (اختياري) حذف النسخة الاحتياطية بعد فترة
   -- DROP TABLE IF EXISTS activities_backup CASCADE;
   ```

## 📝 ملاحظات مهمة

### **التوافق مع الكود القديم:**
- ✅ تم إنشاء view `v_activities_legacy` للتوافق
- ✅ يمكن استخدام الكود القديم مؤقتاً
- ⚠️ يُفضل تحديث الكود في أقرب وقت

### **الأداء:**
- ✅ الجدول الموحد أسرع (استعلام واحد بدلاً من اثنين)
- ✅ Indexes محسّنة للفلترة السريعة
- ✅ Functions محسّنة للاستعلامات الشائعة

### **الصيانة:**
- ✅ نقطة صيانة واحدة (جدول واحد)
- ✅ سهولة الإضافة والتعديل
- ✅ تكامل كامل مع Project Types Management

## 🎯 النتيجة النهائية

بعد إتمام الترحيل بنجاح:
- ✅ **جدول موحد واحد** للأنشطة
- ✅ **جميع البيانات محفوظة** ومرحلة
- ✅ **تكامل كامل** مع أنواع المشاريع
- ✅ **أداء محسّن** وصيانة أسهل
- ✅ **توافق** مع الكود القديم (مؤقتاً)

**كل شيء موحد ومتكامل!** 🎉

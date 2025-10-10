# ✅ **دليل إصلاح مشكلة استيراد الأنشطة**

---

## 🎯 **المشكلة:**

```
null value in column "id" of relation "activities" violates not-null constraint
```

**السبب:** ملف CSV الذي رفعته يحتوي على عمود `id` فارغ، لكن جدول `activities` يتطلب `id` ولا يمكن أن يكون فارغاً.

---

## ✅ **الحل:**

### **الطريقة 1: استخدام Template صحيح (مستحسن)**

1. **حمل Template الجديد:**
   - استخدم الملف: `Database/activities_template_fixed.csv`
   - هذا الملف **بدون عمود ID**

2. **تنسيق الملف:**
   ```csv
   name,division,unit,category,description,typical_duration,is_active,usage_count
   Mobilization,Enabling Division,Lump Sum,General,Mobilization activities,1,true,0
   ```

3. **رفع الملف الجديد:**
   - اذهب إلى Activities Database
   - اضغط "Choose File"
   - اختر الملف الجديد
   - اضغط Import

---

### **الطريقة 2: تشغيل SQL Fix (للمطورين)**

1. **شغل ملف الإصلاح:**
   ```sql
   -- تشغيل في Supabase SQL Editor
   \i Database/fix-activities-import.sql
   ```

2. **استخدم الدوال الجديدة:**
   ```sql
   -- استيراد نشاط واحد
   SELECT import_activities_direct(
     'Activity Name',
     'Division Name', 
     'Unit',
     'Category',
     'Description',
     5, -- typical_duration
     true, -- is_active
     0 -- usage_count
   );
   ```

---

### **الطريقة 3: تعديل ملف CSV الحالي**

#### **إذا كان لديك ملف CSV موجود:**

1. **افتح الملف في Excel أو محرر نصوص**

2. **تأكد من التنسيق:**
   ```
   name,division,unit,category,description,typical_duration,is_active,usage_count
   ```

3. **احذف عمود ID إذا كان موجوداً**

4. **أضف بيانات نموذجية:**
   ```csv
   name,division,unit,category,description,typical_duration,is_active,usage_count
   Test Activity,Test Division,No.,Test,Test description,1,true,0
   ```

5. **احفظ الملف بـ encoding UTF-8**

6. **ارفع الملف الجديد**

---

## 📋 **تنسيق CSV الصحيح:**

### **الأعمدة المطلوبة:**
```
name          ← اسم النشاط (مطلوب)
division      ← القسم (مطلوب)  
unit          ← الوحدة (مطلوب)
category      ← الفئة (اختياري)
description   ← الوصف (اختياري)
typical_duration ← المدة النموذجية بالأيام (اختياري)
is_active     ← نشط أم لا (true/false، اختياري)
usage_count   ← عدد الاستخدامات (رقم، اختياري)
```

### **مثال:**
```csv
name,division,unit,category,description,typical_duration,is_active,usage_count
Mobilization,Enabling Division,Lump Sum,General,Mobilization activities,1,true,0
Vibro Compaction,Enabling Division,No.,Soil Improvement,Vibro compaction work,2,true,0
Supply of Concrete Panel,Enabling Division,No.,Structural,Supply concrete panels,1,true,0
```

---

## 🔧 **خطوات الحل السريع:**

### **1. حذف البيانات الخاطئة:**
```sql
-- في Supabase SQL Editor
DELETE FROM public.activities WHERE id IS NULL;
```

### **2. تشغيل الإصلاح:**
```sql
-- تشغيل ملف الإصلاح
\i Database/fix-activities-import.sql
```

### **3. رفع ملف CSV صحيح:**
- استخدم `Database/activities_template_fixed.csv`
- أو أنشئ ملف جديد بالتنسيق الصحيح

### **4. اختبار الاستيراد:**
- جرب نشاط واحد أولاً
- إذا نجح، ارجع واستورد باقي البيانات

---

## 💡 **نصائح مهمة:**

### **1. تأكد من التنسيق:**
- استخدم فواصل (,) بين الحقول
- لا تضع مسافات زائدة
- استخدم UTF-8 encoding

### **2. تحقق من البيانات:**
- تأكد أن `name` و `division` و `unit` موجودة
- تأكد من صحة القيم (true/false للـ boolean)

### **3. اختبر تدريجياً:**
- ابدأ بنشاط واحد
- إذا نجح، زد العدد تدريجياً

---

## 🎯 **النتيجة المتوقعة:**

### **عندما تستخدم التنسيق الصحيح:**

```
✅ Successfully imported 33 activities
Total Rows: 33
Estimated Size: 2.5 KB
Last Updated: [Current Date]
```

### **بدلاً من:**
```
❌ Failed to import data: null value in column "id" violates not-null constraint
```

---

## 📁 **الملفات المتاحة:**

### **1. Template صحيح:**
- `Database/activities_template_fixed.csv`

### **2. SQL Fix:**
- `Database/fix-activities-import.sql`

### **3. Schema:**
- `Database/activities-table-schema.sql`

---

## 🚀 **الحل السريع:**

### **فقط اتبع هذه الخطوات:**

1. **حمل:** `Database/activities_template_fixed.csv`
2. **اذهب إلى:** Activities Database في التطبيق
3. **اضغط:** "Choose File"
4. **اختر:** الملف الجديد
5. **اضغط:** Import
6. **✅ سينجح!**

---

## ✅ **الخلاصة:**

### **المشكلة:**
- ملف CSV يحتوي على عمود ID فارغ
- جدول activities يتطلب ID

### **الحل:**
- استخدم template بدون عمود ID
- أو احذف عمود ID من ملفك الحالي

### **النتيجة:**
- استيراد ناجح للأنشطة
- قاعدة بيانات تعمل بشكل صحيح

---

🎉 **مشكلة محلولة!**  
📁 **استخدم Template الجديد!**  
✅ **الاستيراد سينجح!**

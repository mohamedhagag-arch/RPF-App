# 📥 دليل استيراد البيانات - أفضل الممارسات

## 🎯 نظرة عامة

هذا الدليل يوضح أفضل طريقة لرفع البيانات لضمان عمل جميع الحسابات والتحليل بشكل صحيح.

---

## ✅ الخطوات الموصى بها لاستيراد البيانات

### 1️⃣ ترتيب الاستيراد

**يجب استيراد البيانات بالترتيب التالي:**

1. **Projects (المشاريع)** أولاً
2. **BOQ Activities (أنشطة BOQ)** ثانياً
3. **KPIs** أخيراً (اختياري)

> ⚠️ **مهم**: يجب استيراد المشاريع قبل الأنشطة لأن الأنشطة تحتاج إلى ربطها بالمشاريع.

---

## 📋 استيراد BOQ Activities (أنشطة BOQ)

### الحقول المطلوبة (Required Fields)

يجب أن تحتوي كل صف على هذه الحقول:

- ✅ **Project Code** - كود المشروع (مثل: P476)
- ✅ **Activity Name** - اسم النشاط
- ✅ **Total Units** - الكمية الإجمالية
- ✅ **Planned Units** - الكمية المخططة
- ✅ **Rate** - السعر
- ✅ **Total Value** - القيمة الإجمالية

### الحقول الموصى بها (Recommended Fields)

- 📌 **Project Sub Code** - الكود الفرعي للمشروع
- 📌 **Project Full Code** - الكود الكامل للمشروع
- 📌 **Activity** - نوع النشاط
- 📌 **Activity Division** - القسم
- 📌 **Unit** - الوحدة
- 📌 **Planned Activity Start Date** - تاريخ البدء المخطط
- 📌 **Deadline** - الموعد النهائي
- 📌 **Calendar Duration** - المدة بالتقويم

### خطوات الاستيراد

1. **افتح Database Management**
   - اذهب إلى Settings → Database Management
   - اختر "Manage Tables"
   - اختر جدول "BOQ Activities"

2. **حمّل Template**
   - اضغط على "Download Empty Template (CSV)"
   - ستحصل على ملف CSV مع أسماء الأعمدة الصحيحة

3. **املأ البيانات**
   - افتح ملف CSV في Excel أو Google Sheets
   - املأ البيانات مع التأكد من:
     - أسماء الأعمدة صحيحة (مع مسافات)
     - Project Code موجود في جدول Projects
     - القيم الرقمية صحيحة (أرقام وليست نصوص)
     - التواريخ بصيغة YYYY-MM-DD

4. **استورد البيانات**
   - اضغط على "Import Data"
   - اختر ملف CSV
   - اختر Mode: "Append" (لإضافة) أو "Replace" (للاستبدال)
   - اضغط "Import"

5. **انتظر الحسابات التلقائية**
   - بعد الاستيراد، سيتم تشغيل الحسابات تلقائياً
   - يمكنك متابعة التقدم في Console (F12)
   - ستظهر رسائل مثل:
     - `🔄 Running calculations for imported BOQ activities...`
     - `✅ Calculated values for activity: [Activity Name]`
     - `✅ Updated calculations for project: [Project Code]`

---

## 🔍 التحقق من صحة البيانات

### قبل الاستيراد

✅ **تأكد من:**
- جميع الحقول المطلوبة موجودة
- Project Code موجود في جدول Projects
- القيم الرقمية صحيحة (ليست نصوص)
- أسماء الأعمدة صحيحة (مع مسافات)

### بعد الاستيراد

✅ **تحقق من:**
- البيانات ظهرت في BOQ Management
- الحسابات تمت (Rate, Progress, Earned Value, etc.)
- المشاريع تم تحديثها (Total Planned Value, Total Earned Value)

---

## 📊 أمثلة على البيانات الصحيحة

### مثال 1: نشاط BOQ بسيط

```csv
Project Code,Activity Name,Total Units,Planned Units,Rate,Total Value
P476,Excavation,1000,800,50,40000
```

### مثال 2: نشاط BOQ كامل

```csv
Project Code,Project Sub Code,Project Full Code,Activity,Activity Name,Activity Division,Unit,Total Units,Planned Units,Rate,Total Value,Planned Activity Start Date,Deadline,Calendar Duration
P476,-01,P476-01,Earthwork,Excavation,Civil,m³,1000,800,50,40000,2024-01-01,2024-01-31,30
```

---

## ⚠️ الأخطاء الشائعة وكيفية تجنبها

### ❌ خطأ 1: أسماء أعمدة خاطئة

**المشكلة:**
```csv
project_code,activity_name,planned_units
```

**الحل:**
```csv
Project Code,Activity Name,Planned Units
```

> 💡 **نصيحة**: استخدم Template من Database Management لضمان الأسماء الصحيحة.

### ❌ خطأ 2: Project Code غير موجود

**المشكلة:**
- استيراد أنشطة لمشروع غير موجود

**الحل:**
- تأكد من استيراد المشاريع أولاً
- تحقق من أن Project Code موجود في جدول Projects

### ❌ خطأ 3: قيم رقمية كنصوص

**المشكلة:**
```csv
Planned Units,Rate
"800","50"
```

**الحل:**
```csv
Planned Units,Rate
800,50
```

### ❌ خطأ 4: تواريخ بصيغة خاطئة

**المشكلة:**
```csv
Planned Activity Start Date
01/01/2024
```

**الحل:**
```csv
Planned Activity Start Date
2024-01-01
```

---

## 🔄 ماذا يحدث بعد الاستيراد؟

بعد استيراد البيانات، النظام يقوم تلقائياً بـ:

1. ✅ **التحقق من صحة البيانات** (Validation)
2. ✅ **تنظيف البيانات** (Data Cleaning)
3. ✅ **إدراج البيانات** في قاعدة البيانات
4. ✅ **تشغيل الحسابات**:
   - حساب Rate
   - حساب Progress Percentage
   - حساب Earned Value
   - حساب Planned Value
   - حساب Remaining Work Value
5. ✅ **تحديث حسابات المشاريع**:
   - Total Planned Value
   - Total Earned Value
   - Overall Progress
6. ✅ **تحديث جميع الصفحات** (Global Refresh)

---

## 📝 قائمة التحقق النهائية

قبل الاستيراد، تأكد من:

- [ ] جميع الحقول المطلوبة موجودة
- [ ] أسماء الأعمدة صحيحة (مع مسافات)
- [ ] Project Code موجود في جدول Projects
- [ ] القيم الرقمية صحيحة (أرقام وليست نصوص)
- [ ] التواريخ بصيغة YYYY-MM-DD
- [ ] استخدمت Template من Database Management

بعد الاستيراد، تحقق من:

- [ ] البيانات ظهرت في BOQ Management
- [ ] الحسابات تمت (Rate, Progress, etc.)
- [ ] المشاريع تم تحديثها
- [ ] لا توجد أخطاء في Console

---

## 🆘 حل المشاكل

### المشكلة: الحسابات لا تعمل

**الحل:**
1. تحقق من Console (F12) للأخطاء
2. تأكد من أن أسماء الأعمدة صحيحة
3. تأكد من أن Project Code موجود
4. جرب إعادة الاستيراد

### المشكلة: البيانات لا تظهر

**الحل:**
1. تحقق من الفلاتر في BOQ Management
2. تأكد من أن Project Code صحيح
3. تحقق من Console للأخطاء

### المشكلة: أخطاء في الاستيراد

**الحل:**
1. تحقق من رسالة الخطأ
2. تأكد من التنسيق الصحيح
3. استخدم Template كمرجع

---

## 📞 الدعم

إذا واجهت مشاكل، تحقق من:
- Console (F12) للأخطاء
- رسائل التحذير في Database Management
- ملفات Log في Console

---

**آخر تحديث**: 2024
















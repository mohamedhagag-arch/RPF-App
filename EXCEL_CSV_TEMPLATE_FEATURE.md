# Excel/CSV Template Management Feature

## Overview
تم إضافة ميزة إدارة Templates بصيغة Excel/CSV إلى نظام Project Types & Activities Management، مما يوفر مرونة أكبر في تصدير واستيراد البيانات.

## الميزات الجديدة

### 1. تصدير Excel/CSV
- **تصدير جميع البيانات**: تصدير جميع Project Types والأنشطة بصيغة CSV
- **دعم UTF-8**: دعم كامل للنصوص العربية والإنجليزية
- **تنسيق منظم**: أعمدة واضحة ومنظمة للبيانات
- **BOM Support**: دعم BOM لضمان عرض النصوص العربية بشكل صحيح

### 2. استيراد Excel/CSV
- **دعم ملفات متعددة**: CSV, XLSX, XLS
- **تحقق من البيانات**: التحقق من صحة البيانات المطلوبة
- **معالجة الأخطاء**: رسائل خطأ واضحة ومفيدة
- **استيراد ذكي**: تحديث البيانات الموجودة وإضافة الجديدة

## هيكل ملف CSV

### الأعمدة المطلوبة
```
Project Type,Project Type Code,Project Type Description,Activity Name,Activity Name (Arabic),Activity Description,Default Unit,Estimated Rate,Category,Typical Duration (Days),Division,Display Order,Is Active
```

### الأعمدة الاختيارية
- **Project Type Code**: كود نوع المشروع
- **Project Type Description**: وصف نوع المشروع
- **Activity Name (Arabic)**: اسم النشاط بالعربية
- **Activity Description**: وصف النشاط
- **Division**: القسم المسؤول

## كيفية الاستخدام

### 1. تصدير Excel/CSV
1. اذهب إلى **Settings** > **Project Types & Activities Management**
2. اضغط على **Export Excel/CSV** في Header
3. سيتم تحميل ملف CSV يحتوي على جميع البيانات

### 2. استيراد Excel/CSV
1. اذهب إلى **Settings** > **Project Types & Activities Management**
2. اضغط على **Import Excel/CSV**
3. اختر ملف CSV أو Excel
4. سيتم استيراد البيانات تلقائياً

## أمثلة على الملفات

### ملف CSV مثال
```csv
Project Type,Project Type Code,Project Type Description,Activity Name,Activity Name (Arabic),Activity Description,Default Unit,Estimated Rate,Category,Typical Duration (Days),Division,Display Order,Is Active
Infrastructure,INF,Infrastructure and civil engineering projects,Site Preparation,إعداد الموقع,Site clearing leveling and preparation works,Square Meter,5.00,Preparation,5,Civil Division,1,Yes
Residential,RES,Residential building projects,Block Work,أعمال البناء,Masonry and block construction,Square Meter,25.00,Masonry,20,Construction Division,1,Yes
```

## الميزات التقنية

### 1. معالجة البيانات
- **CSV Parsing**: تحليل ملفات CSV مع دعم الاقتباسات
- **Data Validation**: التحقق من صحة البيانات المطلوبة
- **Error Handling**: معالجة الأخطاء مع رسائل واضحة

### 2. دعم الترميز
- **UTF-8 Support**: دعم كامل للنصوص العربية
- **BOM Support**: دعم BOM لضمان عرض صحيح
- **Encoding Detection**: كشف ترميز الملفات تلقائياً

### 3. معالجة الملفات
- **File Type Support**: دعم CSV, XLSX, XLS
- **Memory Efficient**: معالجة فعالة للذاكرة
- **Progress Tracking**: تتبع تقدم العملية

## رسائل الخطأ الشائعة

### 1. Missing Headers
```
Missing required headers: Project Type, Activity Name, Default Unit
```
**الحل**: تأكد من وجود جميع الأعمدة المطلوبة في الملف

### 2. Invalid Data Format
```
Invalid data format for Estimated Rate: must be a number
```
**الحل**: تأكد من أن القيم الرقمية في الأعمدة الصحيحة

### 3. File Format Error
```
Unsupported file format. Please use CSV, XLSX, or XLS files
```
**الحل**: استخدم تنسيق ملف مدعوم

## أفضل الممارسات

### 1. إعداد ملف CSV
- استخدم UTF-8 encoding
- تأكد من وجود headers في السطر الأول
- استخدم فاصلة (,) كفاصل
- ضع النصوص بين علامات اقتباس إذا احتوت على فاصلات

### 2. إدارة البيانات
- احتفظ بنسخة احتياطية قبل الاستيراد
- تحقق من البيانات قبل الاستيراد
- استخدم أسماء واضحة ومميزة

### 3. حل المشاكل
- تحقق من ترميز الملف
- تأكد من صحة البيانات
- راجع رسائل الخطأ بعناية

## الملفات المحدثة

### 1. UnifiedProjectTypesManager.tsx
- إضافة وظائف Excel/CSV export/import
- تحديث UI لدعم الميزات الجديدة
- إضافة معالجة الأخطاء

### 2. Icons
- إضافة FileSpreadsheet و Table icons
- تحديث UI buttons

## الاختبار

### 1. تصدير البيانات
- تصدير جميع البيانات
- التحقق من صحة الملف المُصدر
- اختبار دعم النصوص العربية

### 2. استيراد البيانات
- استيراد ملف CSV صحيح
- اختبار معالجة الأخطاء
- التحقق من تحديث البيانات

## الدعم الفني

### 1. استكشاف الأخطاء
- تحقق من ترميز الملف
- راجع رسائل الخطأ
- تأكد من صحة البيانات

### 2. الحصول على المساعدة
- راجع هذا الدليل
- تحقق من أمثلة الملفات
- اتصل بالدعم الفني

## الخلاصة

ميزة Excel/CSV Template Management توفر:
- **مرونة أكبر** في إدارة البيانات
- **سهولة الاستخدام** مع Excel/CSV
- **دعم كامل** للنصوص العربية
- **معالجة ذكية** للأخطاء
- **واجهة سهلة** للاستخدام

هذه الميزة تجعل إدارة Project Types والأنشطة أكثر مرونة وسهولة، خاصة للمستخدمين الذين يفضلون العمل مع Excel أو CSV.

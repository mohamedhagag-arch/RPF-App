# QR Code System for Attendance - نظام QR Code للحضور

## نظرة عامة / Overview

تم إنشاء نظام QR Code متكامل لتسجيل حضور الموظفين. كل موظف يحصل على QR Code فريد وثابت مرتبط به.

A complete QR Code system has been created for employee attendance tracking. Each employee gets a unique and permanent QR code linked to them.

## المميزات / Features

### 1. QR Code Generation - إنشاء QR Code
- ✅ QR Code يتم إنشاؤه تلقائياً لكل موظف جديد
- ✅ QR Code ثابت ولا يتغير حتى لو تغيرت بيانات الموظف
- ✅ تنسيق QR Code: `EMP-XXXXXXXX` (مثال: `EMP-A1B2C3D4`)
- ✅ QR Code فريد ومفهرس للبحث السريع

### 2. QR Code Display - عرض QR Code
- ✅ عرض QR Code لكل موظف في صفحة Employees Management
- ✅ إمكانية تحميل QR Code كصورة PNG
- ✅ إمكانية نسخ رمز QR Code

### 3. QR Code Scanner - مسح QR Code
- ✅ مسح QR Code من الكاميرا
- ✅ إدخال QR Code يدوياً
- ✅ ربط تلقائي بالموظف وتسجيل الحضور

## خطوات التثبيت / Installation Steps

### Step 1: تطبيق SQL Script
قم بتنفيذ الملف التالي في Supabase SQL Editor:

```sql
Database/add-qr-code-to-employees.sql
```

هذا الملف:
- يضيف حقل `qr_code` في جدول `attendance_employees`
- ينشئ QR Codes للموظفين الموجودين
- ينشئ trigger لإنشاء QR Code تلقائياً للموظفين الجدد

### Step 2: تثبيت المكتبات
تم تثبيت المكتبات التالية:
- `qrcode.react` - لعرض QR Code
- `html5-qrcode` - لمسح QR Code

### Step 3: التحقق
1. افتح صفحة Attendance > Employees
2. اضغط على أيقونة QR Code بجانب أي موظف
3. يجب أن يظهر QR Code الخاص بالموظف

## الاستخدام / Usage

### للموظفين / For Employees
1. افتح صفحة **Employees Management**
2. اضغط على أيقونة **QR Code** بجانب اسم الموظف
3. يمكنك:
   - عرض QR Code
   - تحميل QR Code كصورة
   - نسخ رمز QR Code

### للمسؤولين / For Administrators
1. افتح صفحة **Check-In/Out**
2. اضغط على زر **Scan QR Code**
3. استخدم الكاميرا لمسح QR Code الموظف
4. سيتم اختيار الموظف تلقائياً وتسجيل الحضور

## الملفات المضافة / Added Files

1. **Database/add-qr-code-to-employees.sql**
   - SQL script لإضافة دعم QR Code

2. **components/cost-control/attendance/QRCodeDisplay.tsx**
   - مكون لعرض QR Code للموظف

3. **components/cost-control/attendance/QRCodeScanner.tsx**
   - مكون لمسح QR Code من الكاميرا

4. **lib/supabase.ts** (محدث)
   - إضافة `qr_code` في interface `AttendanceEmployee`

5. **components/cost-control/attendance/EmployeesManagement.tsx** (محدث)
   - إضافة زر QR Code لكل موظف
   - إضافة modal لعرض QR Code

6. **components/cost-control/attendance/CheckInOut.tsx** (محدث)
   - إضافة QR Scanner لتسجيل الحضور

## ملاحظات مهمة / Important Notes

- ⚠️ QR Code ثابت ولا يتغير - حتى لو تم تعديل بيانات الموظف
- ⚠️ QR Code مرتبط بـ `employee_id` وليس بالبيانات الأخرى
- ⚠️ QR Code فريد - لا يمكن أن يكون هناك موظفان بنفس QR Code
- ⚠️ QR Code يتم إنشاؤه تلقائياً عند إضافة موظف جديد

## استكشاف الأخطاء / Troubleshooting

### QR Code لا يظهر
1. تأكد من تنفيذ SQL script
2. تحقق من أن الموظف لديه `qr_code` في قاعدة البيانات
3. حدّث الصفحة (Ctrl+Shift+R)

### Scanner لا يعمل
1. تأكد من السماح للكاميرا بالوصول
2. جرب كاميرا أخرى من القائمة
3. استخدم الإدخال اليدوي كبديل

## التطوير المستقبلي / Future Development

- [ ] طباعة QR Codes بكميات كبيرة
- [ ] QR Code مع صورة الموظف
- [ ] إحصائيات استخدام QR Code
- [ ] QR Code للتحقق من الهوية


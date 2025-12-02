# إصلاح مشكلة QR Code - QR Code Fix Instructions

## المشكلة / Problem
QR Code لا يظهر للموظفين الموجودين (يظهر "No QR Code available")

## الحل / Solution

### الطريقة 1: تنفيذ SQL Script (مُوصى به) / Method 1: Run SQL Script (Recommended)

1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. انسخ محتوى ملف `Database/add-qr-code-to-employees.sql`
4. نفذ الكود
5. حدّث الصفحة (Ctrl+Shift+R)

هذا سينشئ QR Codes لجميع الموظفين الموجودين تلقائياً.

### الطريقة 2: إنشاء تلقائي من الواجهة / Method 2: Auto-Generate from UI

تم إضافة حل تلقائي في الكود:
- عند الضغط على زر QR Code لأي موظف
- إذا لم يكن لديه QR Code، سيتم إنشاؤه تلقائياً
- سيتم حفظه في قاعدة البيانات

**خطوات:**
1. افتح صفحة **Employees**
2. اضغط على أيقونة **QR Code** بجانب أي موظف
3. سيتم إنشاء QR Code تلقائياً وعرضه

## التحقق / Verification

بعد تنفيذ SQL script، تحقق من:

```sql
-- Check employees with QR codes
SELECT 
  employee_code,
  name,
  qr_code
FROM attendance_employees
ORDER BY created_at DESC;
```

يجب أن ترى QR Codes لجميع الموظفين.

## ملاحظات / Notes

- ✅ QR Code يتم إنشاؤه تلقائياً للموظفين الجدد
- ✅ QR Code ثابت ولا يتغير
- ✅ إذا لم يُنفذ SQL script، الكود سينشئ QR Code تلقائياً عند الطلب


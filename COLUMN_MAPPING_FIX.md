# ✅ إصلاح مشكلة أسماء الأعمدة في الاستيراد

## 🎯 **المشكلة:**

عند رفع البيانات من 🗄️ Database Management، ظهر الخطأ:
```
Failed to import data: Could not find the 'contract_amount' column of 'Planning Database - ProjectsList' in the schema cache
```

## 🔍 **السبب:**

النظام كان يبحث عن أعمدة بأسماء مختلفة عما هو موجود في قاعدة البيانات:
- **النظام يبحث عن:** `contract_amount` (بخط صغير)
- **قاعدة البيانات تحتوي على:** `"Contract Amount"` (بخط كبير ومسافات)

## 🛠️ **الحل المطبق:**

### **1️⃣ إضافة نظام تحويل أسماء الأعمدة**

```typescript
// في lib/databaseManager.ts
function normalizeColumnNames(data: any[], tableName: string): any[] {
  const columnMappings: Record<string, Record<string, string>> = {
    [TABLES.PROJECTS]: {
      'contract_amount': 'Contract Amount',
      'project_code': 'Project Code',
      'project_name': 'Project Name',
      // ... المزيد من التحويلات
    }
  }
  
  return data.map((row, index) => {
    const normalizedRow: any = {}
    Object.keys(row).forEach(originalKey => {
      const normalizedKey = mappings[originalKey.toLowerCase()] || originalKey
      normalizedRow[normalizedKey] = value
    })
    return normalizedRow
  })
}
```

### **2️⃣ تحديث دالة الاستيراد**

```typescript
export async function importTableData(tableName: string, data: any[], mode: 'append' | 'replace' = 'append') {
  // ✅ الخطوة 1: تحويل أسماء الأعمدة أولاً
  const normalizedData = normalizeColumnNames(data, tableName)
  
  // ✅ الخطوة 2: التحقق من الترابط
  const validation = await validateDataRelationships(tableName, normalizedData)
  
  // ✅ الخطوة 3: تنظيف البيانات
  const cleanedData = normalizedData.map(/* ... */)
  
  // ✅ الخطوة 4: إدراج البيانات
  const { error } = await supabase.from(tableName).insert(cleanedData)
}
```

### **3️⃣ إضافة قوالب CSV صحيحة**

```typescript
export async function createCorrectTemplate(tableName: string): Promise<OperationResult> {
  const correctColumns = getCorrectColumnNames(tableName)
  const templateData = [correctColumns.reduce((acc, col) => {
    acc[col] = ''
    return acc
  }, {} as any)]
  
  const csvContent = convertToCSV(templateData)
  // تحميل الملف...
}
```

## 📋 **الأعمدة المدعومة:**

### **جدول المشاريع (Projects):**
- `Project Code` ✅
- `Project Name` ✅
- `Contract Amount` ✅
- `Project Type` ✅
- `Client Name` ✅
- `Project Manager Email` ✅
- `Date Project Awarded` ✅
- `Workmanship only?` ✅
- `Advnace Payment Required` ✅
- `First Party name` ✅
- `Virtual Material Value` ✅

### **جدول BOQ:**
- `Project Code` ✅
- `Activity Name` ✅
- `Activity Division` ✅
- `Total Value` ✅
- `Planned Activity Start Date` ✅

### **جدول KPI:**
- `Project Code` ✅
- `Activity Name` ✅
- `Input Type` ✅
- `Date` ✅
- `Planned Quantity` ✅
- `Actual Quantity` ✅

## 🚀 **كيفية الاستخدام:**

### **الخطوة 1: تحميل قالب صحيح**
1. اذهب لـ **🗄️ Database Management**
2. اختر الجدول المطلوب
3. انقر **"Download Empty Template (CSV)"**
4. سيتم تحميل ملف CSV بأسماء الأعمدة الصحيحة

### **الخطوة 2: ملء البيانات**
1. افتح الملف المحمل
2. املأ البيانات في الأعمدة الصحيحة
3. احفظ الملف

### **الخطوة 3: رفع البيانات**
1. انقر **"Choose File"**
2. اختر الملف المملوء
3. انقر **"Import Data"**
4. ✅ ستتم العملية بنجاح!

## 🔧 **الميزات الجديدة:**

### **1️⃣ تحويل تلقائي للأعمدة**
- `contract_amount` → `Contract Amount`
- `project_code` → `Project Code`
- `client_name` → `Client Name`

### **2️⃣ قوالب صحيحة**
- أسماء أعمدة مطابقة لقاعدة البيانات
- تنسيق CSV صحيح
- دعم جميع الجداول

### **3️⃣ رسائل خطأ واضحة**
- تشخيص مشاكل الأعمدة
- اقتراحات للحلول
- تسجيل مفصل للعمليات

## 📊 **النتيجة:**

✅ **قبل الإصلاح:** خطأ في أسماء الأعمدة
❌ `contract_amount` not found

✅ **بعد الإصلاح:** استيراد ناجح
✅ `Contract Amount` mapped correctly

---

**الآن يمكنك رفع البيانات بنجاح من 🗄️ Database Management! 🎉**


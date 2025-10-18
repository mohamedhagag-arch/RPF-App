# ✅ دليل القوالب الموحدة - 🗄️ Database Management

## 🎯 **المشكلة التي تم حلها:**

كانت هناك اختلافات في أسماء الأعمدة بين:
- **🗄️ Database Management** - قوالب مختلفة
- **📊 KPI Tracking** - أعمدة مختلفة  
- **📋 BOQ Management** - أعمدة مختلفة
- **🏗️ Project Management** - أعمدة مختلفة

## 🛠️ **الحل المطبق:**

### **1️⃣ توحيد أسماء الأعمدة**

تم توحيد جميع أسماء الأعمدة لتكون متطابقة مع ما تستخدمه الصفحات الأخرى:

#### **جدول المشاريع (Projects):**
```csv
Project Code,Project Sub-Code,Project Name,Project Type,Responsible Division,Plot Number,KPI Completed,Project Status,Contract Amount,Contract Status,Work Programme,Latitude,Longitude,Project Manager Email,Area Manager Email,Date Project Awarded,Workmanship only?,Advnace Payment Required,Client Name,Consultant Name,First Party name,Virtual Material Value
```

#### **جدول BOQ Activities:**
```csv
Project Code,Project Sub Code,Project Full Code,Activity,Activity Name,Activity Division,Unit,Zone Ref,Total Units,Planned Units,Actual Units,Total Value,Planned Value,Planned Activity Start Date,Deadline,Total Drilling Meters,Calendar Duration,Project Full Name,Project Status
```

#### **جدول KPI:**
```csv
Project Code,Project Full Code,Project Sub Code,Activity Name,Activity,Input Type,Quantity,Target Date,Actual Date,Activity Date,Unit,Section,Drilled Meters
```

### **2️⃣ تحويل تلقائي للأعمدة**

النظام الآن يحول تلقائياً بين الأسماء المختلفة:

#### **للمشاريع:**
- `contract_amount` → `Contract Amount`
- `project_code` → `Project Code`
- `client_name` → `Client Name`
- `project_manager_email` → `Project Manager Email`

#### **لـ BOQ:**
- `activity_name` → `Activity Name`
- `planned_units` → `Planned Units`
- `actual_units` → `Actual Units`
- `total_value` → `Total Value`
- `planned_activity_start_date` → `Planned Activity Start Date`

#### **لـ KPI:**
- `input_type` → `Input Type`
- `quantity` → `Quantity`
- `target_date` → `Target Date`
- `activity_date` → `Activity Date`

## 🚀 **كيفية الاستخدام:**

### **الخطوة 1: تحميل قالب موحد**
1. اذهب لـ **🗄️ Database Management**
2. اختر الجدول المطلوب (Projects/BOQ/KPI)
3. انقر **"Download Empty Template (CSV)"**
4. سيتم تحميل ملف بأسماء الأعمدة الموحدة

### **الخطوة 2: ملء البيانات**
1. افتح الملف المحمل
2. املأ البيانات في الأعمدة الصحيحة
3. احفظ الملف

### **الخطوة 3: رفع البيانات**
1. انقر **"Choose File"**
2. اختر الملف المملوء
3. انقر **"Import Data"**
4. ✅ **ستتم العملية بنجاح!**

## 📊 **المقارنة:**

### **قبل التوحيد:**
❌ **Database Management:** `contract_amount`
❌ **Project Management:** `Contract Amount`
❌ **BOQ Management:** `Activity Name`
❌ **KPI Tracking:** `Input Type`

### **بعد التوحيد:**
✅ **جميع الصفحات:** `Contract Amount`
✅ **جميع الصفحات:** `Activity Name`
✅ **جميع الصفحات:** `Input Type`
✅ **جميع الصفحات:** `Project Code`

## 🔧 **الميزات الجديدة:**

### **1️⃣ قوالب موحدة**
- أسماء أعمدة متطابقة في جميع الصفحات
- تنسيق CSV صحيح
- دعم جميع الجداول

### **2️⃣ تحويل تلقائي**
- تحويل أسماء الأعمدة تلقائياً
- دعم أسماء مختلفة من المستخدم
- رسائل خطأ واضحة

### **3️⃣ تكامل كامل**
- البيانات المستوردة تظهر في جميع الصفحات
- لا توجد اختلافات في الأعمدة
- تجربة مستخدم موحدة

## 📋 **قائمة الأعمدة المدعومة:**

### **🏗️ Projects Table:**
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

### **📋 BOQ Activities Table:**
- `Project Code` ✅
- `Activity Name` ✅
- `Activity Division` ✅
- `Total Units` ✅
- `Planned Units` ✅
- `Actual Units` ✅
- `Total Value` ✅
- `Planned Value` ✅
- `Planned Activity Start Date` ✅
- `Deadline` ✅
- `Total Drilling Meters` ✅
- `Calendar Duration` ✅
- `Project Full Name` ✅
- `Project Status` ✅

### **📊 KPI Table:**
- `Project Code` ✅
- `Project Full Code` ✅
- `Activity Name` ✅
- `Input Type` ✅
- `Quantity` ✅
- `Target Date` ✅
- `Actual Date` ✅
- `Activity Date` ✅
- `Unit` ✅
- `Section` ✅
- `Drilled Meters` ✅

---

**الآن جميع القوالب موحدة ومتطابقة مع الصفحات الأخرى! 🎉**


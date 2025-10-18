# ✅ دليل الأعمدة المحسوبة تلقائياً

## 🎯 **المشكلة:**
بعض الأعمدة في قاعدة البيانات يتم حسابها تلقائياً بواسطة النظام ولا يجب على المستخدم إدخالها يدوياً.

## 🛠️ **الحل المطبق:**
تم استبعاد الأعمدة المحسوبة تلقائياً من القوالب لتجنب الالتباس.

---

## 📊 **الأعمدة المحسوبة تلقائياً:**

### **🏗️ جدول المشاريع (Projects):**
**✅ جميع الأعمدة مطلوبة من المستخدم**
- لا توجد أعمدة محسوبة تلقائياً
- جميع الأعمدة مطلوبة من المستخدم

---

### **📋 جدول BOQ Activities:**

#### **✅ الأعمدة المطلوبة من المستخدم:**
```csv
Project Code,Project Sub Code,Project Full Code,Activity,Activity Name,Activity Division,Unit,Zone Ref,Zone Number,Total Units,Planned Units,Rate,Total Value,Planned Activity Start Date,Deadline,Calendar Duration,Project Full Name,Project Status
```

#### **❌ الأعمدة المحسوبة تلقائياً (مستبعدة من القالب):**

**📊 Progress & Status:**
- `Actual Units` - محسوب من KPI Actual entries
- `Difference` - محسوب: Actual - Planned
- `Variance Units` - محسوب: Total - Actual
- `Activity Progress %` - محسوب: (Actual/Planned) * 100
- `Activity Planned Status` - محسوب بناءً على التواريخ
- `Activity Actual Status` - محسوب من KPI
- `Activity Delayed?` - محسوب من التواريخ
- `Activity On Track?` - محسوب من التقدم
- `Activity Completed?` - محسوب من التقدم

**💰 Financial Calculations:**
- `Planned Value` - محسوب: Planned Units * Rate
- `Earned Value` - محسوب من KPI
- `Remaining Work Value` - محسوب: Total Value - Earned Value
- `Variance Works Value` - محسوب: Planned Value - Earned Value

**📅 Date Calculations:**
- `Activity Planned Start Date` - محسوب من Planned Activity Start Date
- `Activity Planned Completion Date` - محسوب من Deadline
- `Lookahead Start Date` - محسوب من التواريخ
- `Lookahead Activity Completion Date` - محسوب من التواريخ
- `Remaining Lookahead Duration for Activity Completion` - محسوب من التواريخ

**🔧 Productivity & Performance:**
- `Productivity Daily Rate` - محسوب: Planned Units / Duration
- `Delay %` - محسوب من التواريخ
- `Planned Progress %` - محسوب من التواريخ

**⛏️ Drilling Calculations:**
- `Total Drilling Meters` - محسوب من KPI
- `Drilled Meters Planned Progress` - محسوب من KPI
- `Drilled Meters Actual Progress` - محسوب من KPI
- `Remaining Meters` - محسوب: Total - Actual

**📊 Reporting:**
- `Reported on Data Date` - محسوب من KPI

---

### **📊 جدول KPI:**

#### **✅ الأعمدة المطلوبة من المستخدم:**
```csv
Project Full Code,Project Code,Project Sub Code,Activity Name,Activity,Input Type,Quantity,Unit,Section,Zone,Drilled Meters,Value,Target Date,Actual Date,Activity Date,Day,Recorded By,Notes
```

#### **❌ الأعمدة المحسوبة تلقائياً:**
- جميع الأعمدة في KPI مطلوبة من المستخدم
- لا توجد أعمدة محسوبة تلقائياً في KPI

---

## 🔄 **كيفية عمل الحسابات التلقائية:**

### **1️⃣ عند إضافة BOQ Activity:**
1. المستخدم يدخل: `Project Code`, `Activity Name`, `Planned Units`, `Rate`, `Total Value`
2. النظام يحسب تلقائياً:
   - `Planned Value = Planned Units * Rate`
   - `Activity Progress % = 0` (في البداية)
   - `Activity Planned Status = "upcoming"`

### **2️⃣ عند إضافة KPI Actual:**
1. المستخدم يدخل: `Project Code`, `Activity Name`, `Quantity`, `Input Type = "Actual"`
2. النظام يحسب تلقائياً:
   - `Actual Units` في BOQ (من مجموع KPI Actual)
   - `Difference = Actual Units - Planned Units`
   - `Activity Progress % = (Actual Units / Planned Units) * 100`
   - `Activity Actual Status` بناءً على التقدم

### **3️⃣ عند تحديث التواريخ:**
1. المستخدم يحدث: `Planned Activity Start Date`, `Deadline`
2. النظام يحسب تلقائياً:
   - `Calendar Duration = Deadline - Start Date`
   - `Productivity Daily Rate = Planned Units / Duration`
   - `Activity Planned Start Date = Planned Activity Start Date`
   - `Activity Planned Completion Date = Deadline`

---

## 🚀 **الفوائد:**

### **✅ للمستخدم:**
- قوالب بسيطة وواضحة
- لا حاجة لإدخال قيم محسوبة
- تجنب الأخطاء في الحسابات
- تركيز على البيانات الأساسية

### **✅ للنظام:**
- حسابات دقيقة ومتسقة
- تحديث تلقائي للقيم
- تجنب التضارب في البيانات
- أداء أفضل

---

## 📋 **الخلاصة:**

**🎉 القوالب الآن تحتوي فقط على الأعمدة المطلوبة من المستخدم!**

- ✅ **Projects:** 22 عمود (جميعها مطلوبة)
- ✅ **BOQ:** 18 عمود (مطلوبة) + 26 عمود (محسوبة تلقائياً)
- ✅ **KPI:** 18 عمود (جميعها مطلوبة)

**النتيجة:** قوالب بسيطة وواضحة بدون أعمدة محسوبة تلقائياً! 🎉


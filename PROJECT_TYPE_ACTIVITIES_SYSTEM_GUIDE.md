# 🎯 دليل نظام الأنشطة المرتبطة بأنواع المشاريع

## 📋 نظرة عامة

تم إنشاء نظام متكامل لربط **الأنشطة بأنواع المشاريع** مع إمكانية **التحكم الكامل** في إضافة وتعديل وحذف الأنشطة لكل نوع مشروع.

### **المشكلة التي تم حلها:**
- كانت الأنشطة ثابتة في الكود ومرتبطة بالأقسام (Divisions)
- صعوبة التحكم في الأنشطة المقترحة لكل مشروع
- عدم المرونة في إضافة أنشطة جديدة

### **الحل:**
✅ نظام قاعدة بيانات متكامل لإدارة الأنشطة  
✅ ربط الأنشطة بأنواع المشاريع (Project Types)  
✅ واجهة إدارة كاملة (CRUD)  
✅ تكامل تلقائي مع نموذج إضافة BOQ  
✅ أنشطة افتراضية لكل نوع مشروع

---

## 🗄️ بنية قاعدة البيانات

### الجدول: `project_type_activities`

```sql
CREATE TABLE project_type_activities (
    id UUID PRIMARY KEY,
    
    -- معلومات نوع المشروع
    project_type VARCHAR(255) NOT NULL,
    
    -- معلومات النشاط
    activity_name VARCHAR(500) NOT NULL,
    activity_name_ar VARCHAR(500),      -- الاسم بالعربية
    description TEXT,
    
    -- التفاصيل التقنية
    default_unit VARCHAR(50),           -- الوحدة الافتراضية
    estimated_rate DECIMAL(15,2),       -- السعر التقديري
    category VARCHAR(100),               -- الفئة
    
    -- الإعدادات
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,   -- نشاط افتراضي أم مخصص
    display_order INTEGER DEFAULT 0,
    
    -- البيانات الوصفية
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- قيد فريد
    CONSTRAINT unique_project_type_activity 
        UNIQUE(project_type, activity_name)
);
```

### المؤشرات (Indexes):
```sql
- idx_project_type_activities_type     → للبحث بنوع المشروع
- idx_project_type_activities_active   → للأنشطة النشطة
- idx_project_type_activities_category → للفئات
- idx_project_type_activities_order    → للترتيب
```

---

## 📊 الأنشطة الافتراضية

### تم إضافة أنشطة افتراضية لـ 6 أنواع مشاريع:

#### 1️⃣ **Piling Projects** (11 نشاط)
```
- Mobilization & Site Setup
- C.Piles 600mm / 800mm / 1000mm / 1200mm
- Pile Cap Excavation / Concrete / Reinforcement
- Pile Load Testing
- Pile Integrity Testing (PIT)
- De-mobilization
```

#### 2️⃣ **Shoring Projects** (12 نشاط)
```
- Mobilization & Site Setup
- Steel Sheet Piles (Installation / Extraction)
- Contiguous Piles 800mm / 1000mm
- Secant Piles
- Soldier Piles
- Lagging & Waling
- Ground Anchors
- Tiebacks
- Excavation Support System
- De-mobilization
```

#### 3️⃣ **Dewatering Projects** (9 أنشطة)
```
- Mobilization & Site Setup
- Dewatering Wells Installation
- Submersible Pumps Installation
- Wellpoint System
- Deep Well System
- Pumping Operations
- Water Discharge Management
- Monitoring & Testing
- De-mobilization
```

#### 4️⃣ **Ground Improvement Projects** (10 أنشطة)
```
- Mobilization & Site Setup
- Stone Columns
- Dynamic Compaction
- Vibro Compaction
- Jet Grouting
- Soil Mixing
- Soil Nailing
- Geotextile Installation
- Testing & Quality Control
- De-mobilization
```

#### 5️⃣ **Infrastructure Projects** (13 نشاط)
```
- Mobilization & Site Setup
- Site Clearing & Grubbing
- Excavation (Unclassified / Rock)
- Fill & Compaction
- Subbase / Base Course
- Asphalt Wearing Course
- Storm Water Drainage
- Utilities Installation
- Concrete Works
- Steel Reinforcement
- De-mobilization
```

#### 6️⃣ **General Construction Projects** (11 نشاط)
```
- Mobilization & Site Setup
- Site Preparation
- Foundation Works
- Structural Concrete
- Reinforcement Steel
- Masonry Works
- Plastering / Flooring / Painting
- MEP Installation
- De-mobilization
```

---

## 🛠️ المكونات المنشأة

### 1️⃣ **قاعدة البيانات**
📁 `Database/project_type_activities_table.sql`
- إنشاء الجدول
- المؤشرات
- RLS Policies
- الأنشطة الافتراضية
- الـ Triggers

### 2️⃣ **مدير الأنشطة (Manager)**
📁 `lib/projectTypeActivitiesManager.ts`

**الدوال المتاحة:**
```typescript
// قراءة الأنشطة
getActivitiesByProjectType(projectType, includeInactive?)
getAllActivities(includeInactive?)
getProjectTypesWithActivities()

// إضافة وتعديل
addActivity(activityData, userId?)
updateActivity(activityId, updates)

// حذف واستعادة
deleteActivity(activityId, hardDelete?)
restoreActivity(activityId)

// ترتيب ونسخ
reorderActivities(projectType, activityIds)
copyActivities(fromProjectType, toProjectType, userId?)

// استيراد وإحصائيات
bulkImportActivities(projectType, activities, userId?)
getActivityStats()
```

### 3️⃣ **واجهة الإدارة**
📁 `components/settings/ProjectTypeActivitiesManager.tsx`

**الميزات:**
- ✅ عرض جميع أنواع المشاريع
- ✅ عرض أنشطة كل نوع
- ✅ إضافة نشاط جديد
- ✅ تعديل نشاط موجود
- ✅ حذف نشاط (soft delete)
- ✅ استعادة نشاط محذوف
- ✅ نسخ الأنشطة بين الأنواع
- ✅ بحث وفلترة
- ✅ إحصائيات شاملة

### 4️⃣ **التكامل مع BOQ Form**
📁 `components/boq/IntelligentBOQForm.tsx`

**التحديثات:**
- ✅ تحميل الأنشطة من قاعدة البيانات بناءً على نوع المشروع
- ✅ عرض الأنشطة المقترحة تلقائياً
- ✅ تحميل الوحدة الافتراضية للنشاط
- ✅ Fallback إلى النظام القديم إذا لم توجد أنشطة

### 5️⃣ **التكامل مع صفحة الإعدادات**
📁 `components/settings/SettingsPage.tsx`

**تم إضافة:**
- ✅ تبويب "Project Activities"
- ✅ التحقق من صلاحية `settings.activities`
- ✅ عرض واجهة إدارة الأنشطة

---

## 🔐 نظام الصلاحيات

### RLS Policies:

#### 1️⃣ **القراءة (SELECT)**
```sql
-- جميع المستخدمين يمكنهم رؤية الأنشطة النشطة
Users can view active activities: is_active = true

-- المدراء والأدمن يمكنهم رؤية كل الأنشطة (حتى المعطلة)
Managers can view all activities: role IN ('admin', 'manager')
```

#### 2️⃣ **الإضافة (INSERT)**
```sql
-- فقط المدراء والأدمن
Managers can create activities: role IN ('admin', 'manager')
```

#### 3️⃣ **التعديل (UPDATE)**
```sql
-- فقط المدراء والأدمن
Managers can update activities: role IN ('admin', 'manager')
```

#### 4️⃣ **الحذف (DELETE)**
```sql
-- فقط الأدمن
Admins can delete activities: role = 'admin'
```

### صلاحية الوصول في الواجهة:
```typescript
canView = guard.hasAccess('settings.view')
canManage = guard.hasAccess('settings.activities')
```

---

## 🔄 تدفق العمل

### إضافة نشاط جديد لمشروع:

```
1. المدير → Settings → Project Activities
   ↓
2. اختيار نوع المشروع (Project Type)
   ↓
3. النقر على "Add Activity"
   ↓
4. ملء البيانات:
   - Activity Name (English) *
   - Activity Name (Arabic)
   - Description
   - Default Unit
   - Estimated Rate
   - Category
   ↓
5. حفظ → يُضاف إلى قاعدة البيانات
   ↓
6. يظهر تلقائياً في BOQ Form عند اختيار مشروع من نفس النوع
```

### استخدام النشاط في BOQ:

```
1. المستخدم → BOQ → Add New Activity
   ↓
2. إدخال Project Code
   ↓
3. النظام يحدد نوع المشروع (Project Type)
   ↓
4. تحميل الأنشطة المرتبطة بهذا النوع من قاعدة البيانات
   ↓
5. عرض الأنشطة المقترحة في Dropdown
   ↓
6. عند اختيار نشاط:
   - يتم تعبئة Activity Name تلقائياً
   - يتم تعبئة Default Unit تلقائياً
   - يتم عرض Category
```

---

## 📊 الإحصائيات

### Dashboard الإحصائيات:
```typescript
{
  totalActivities: 66,          // إجمالي الأنشطة
  activeActivities: 66,          // الأنشطة النشطة
  inactiveActivities: 0,         // الأنشطة المعطلة
  defaultActivities: 66,         // الأنشطة الافتراضية
  customActivities: 0,           // الأنشطة المخصصة
  activitiesByProjectType: {     // حسب نوع المشروع
    "Piling": 11,
    "Shoring": 12,
    "Dewatering": 9,
    ...
  },
  activitiesByCategory: {        // حسب الفئة
    "Mobilization": 6,
    "Piling": 4,
    "Excavation": 5,
    ...
  }
}
```

---

## 🎯 حالات الاستخدام

### 1️⃣ **إضافة نوع مشروع جديد**
```
مثال: مشروع "Marine Works"
1. Settings → Project Activities
2. عند إضافة أول نشاط، أدخل نوع المشروع الجديد
3. أضف الأنشطة المطلوبة واحداً تلو الآخر
```

### 2️⃣ **نسخ أنشطة من نوع إلى آخر**
```
مثال: نسخ من "Piling" إلى "Deep Foundation"
1. اختر "Piling"
2. انقر على "Copy"
3. أدخل "Deep Foundation"
4. سيتم نسخ جميع الأنشطة
```

### 3️⃣ **تعطيل نشاط مؤقتاً**
```
بدلاً من الحذف:
1. انقر على زر Delete
2. سيتم تعطيل النشاط (soft delete)
3. لن يظهر في BOQ Form
4. يمكن استعادته لاحقاً
```

### 4️⃣ **استيراد أنشطة جماعي**
```typescript
// في المستقبل - يمكن إضافة:
const activities = [
  { activity_name: "...", default_unit: "...", ... },
  { activity_name: "...", default_unit: "...", ... },
  ...
]

bulkImportActivities("ProjectType", activities, userId)
```

---

## 🚀 المزايا

### للمستخدمين:
✅ **اقتراحات ذكية:** عند إضافة BOQ، الأنشطة المقترحة تكون مناسبة لنوع المشروع  
✅ **توفير الوقت:** لا حاجة لكتابة اسم النشاط والوحدة يدوياً  
✅ **دقة أعلى:** الأنشطة محددة مسبقاً بشكل صحيح  

### للمدراء:
✅ **تحكم كامل:** إضافة/تعديل/حذف الأنشطة بسهولة  
✅ **مرونة:** إضافة أنواع مشاريع جديدة بسهولة  
✅ **توحيد:** ضمان استخدام أنشطة موحدة في جميع المشاريع  

### للنظام:
✅ **قابلية التوسع:** إضافة أنشطة جديدة بدون تعديل الكود  
✅ **سهولة الصيانة:** كل شيء في قاعدة البيانات  
✅ **الأداء:** استعلامات محسّنة مع Indexes  

---

## 🔧 الإعداد والتشغيل

### 1️⃣ **تشغيل SQL Script**
```sql
-- في Supabase SQL Editor:
-- انسخ محتوى الملف والصقه وشغّله
Database/project_type_activities_table.sql
```

### 2️⃣ **التحقق من الجدول**
```sql
-- تحقق من إنشاء الجدول
SELECT COUNT(*) FROM project_type_activities;
-- يجب أن يعطي: 66 نشاط افتراضي

-- تحقق من أنواع المشاريع
SELECT DISTINCT project_type FROM project_type_activities;
-- يجب أن يعطي: 6 أنواع
```

### 3️⃣ **التحقق من RLS**
```sql
-- تحقق من سياسات RLS
SELECT * FROM pg_policies 
WHERE tablename = 'project_type_activities';
```

### 4️⃣ **الوصول إلى الواجهة**
```
1. افتح النظام كـ Admin أو Manager
2. اذهب إلى Settings
3. اختر تبويب "Project Activities"
4. يجب أن ترى 6 أنواع مشاريع و66 نشاط
```

---

## 📝 ملاحظات مهمة

### ⚠️ **Soft Delete:**
- عند حذف نشاط، يتم تعطيله فقط (is_active = false)
- لن يظهر في BOQ Form
- يمكن استعادته من خلال "Show All" → Restore

### ⚠️ **الأنشطة الافتراضية:**
- الأنشطة ذات `is_default = true` هي أنشطة النظام
- لا يُنصح بحذفها نهائياً
- يمكن تعطيلها فقط

### ⚠️ **القيد الفريد:**
- لا يمكن إضافة نشاط بنفس الاسم لنفس نوع المشروع
- الرسالة: "Activity already exists for this project type"

---

## 🎉 **النظام جاهز للاستخدام!**

الآن يمكنك:
1. ✅ إدارة الأنشطة لكل نوع مشروع
2. ✅ إضافة أنواع مشاريع جديدة
3. ✅ استخدام الأنشطة المقترحة في BOQ
4. ✅ تخصيص الأنشطة حسب احتياجاتك

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من Console للأخطاء
2. تحقق من RLS Policies
3. تحقق من الصلاحيات (settings.activities)
4. تحقق من أن الجدول تم إنشاؤه بنجاح

---

**تم بناء النظام بنجاح! 🚀**


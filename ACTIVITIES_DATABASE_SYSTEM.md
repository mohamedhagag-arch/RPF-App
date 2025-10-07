# 🎯 نظام إدارة الأنشطة من قاعدة البيانات

## 📋 نظرة عامة

تم إنشاء نظام متكامل لإدارة الأنشطة من قاعدة البيانات Supabase مع ربطها بالأقسام وتحسين تجربة المستخدم.

## ✨ المزايا الجديدة

### 1. **جدول منفصل للأنشطة**
- ✅ جدول `activities` منفصل في Supabase
- ✅ ربط الأنشطة بالأقسام والفئات
- ✅ تتبع عداد الاستخدام لكل نشاط
- ✅ إدارة شاملة للأنشطة

### 2. **نظام ذكي للاقتراحات**
- ✅ فلترة الأنشطة حسب نوع المشروع
- ✅ ترتيب الأنشطة حسب الاستخدام
- ✅ اقتراحات مخصصة لكل قسم

### 3. **واجهة محسنة**
- ✅ عرض معلومات إضافية (القسم، الفئة، الاستخدام)
- ✅ تتبع عداد الاستخدام تلقائياً
- ✅ رسائل تأكيد محسنة

## 🗄️ هيكل قاعدة البيانات

### جدول `activities`:
```sql
CREATE TABLE public.activities (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                    -- اسم النشاط
  division TEXT NOT NULL,                -- القسم المسؤول
  unit TEXT NOT NULL,                    -- الوحدة
  category TEXT,                         -- الفئة
  description TEXT,                      -- الوصف
  typical_duration INTEGER,              -- المدة النموذجية (أيام)
  is_active BOOLEAN DEFAULT TRUE,        -- نشط/غير نشط
  usage_count INTEGER DEFAULT 0,        -- عداد الاستخدام
  created_at TIMESTAMP,                 -- تاريخ الإنشاء
  updated_at TIMESTAMP                  -- تاريخ التحديث
);
```

### الفهارس:
- `idx_activities_name` - للبحث السريع بالاسم
- `idx_activities_division` - للفلترة حسب القسم
- `idx_activities_category` - للفلترة حسب الفئة
- `idx_activities_active` - للأنشطة النشطة فقط

## 🔧 الوظائف المتاحة

### 1. **إدارة الأنشطة**
```typescript
// الحصول على جميع الأنشطة
getAllActivities(): Promise<Activity[]>

// الحصول على الأنشطة حسب القسم
getActivitiesByDivision(division: string): Promise<Activity[]>

// البحث في الأنشطة
searchActivities(query: string): Promise<Activity[]>

// إضافة نشاط جديد
addActivity(activity: Activity): Promise<{success: boolean}>

// تحديث نشاط
updateActivity(id: string, updates: Partial<Activity>): Promise<{success: boolean}>

// حذف نشاط (تعطيل)
deleteActivity(id: string): Promise<{success: boolean}>
```

### 2. **تتبع الاستخدام**
```typescript
// زيادة عداد الاستخدام
incrementActivityUsage(activityName: string): Promise<{success: boolean}>

// الحصول على إحصائيات الأنشطة
getActivityStats(): Promise<ActivityStats[]>
```

### 3. **الاقتراحات الذكية**
```typescript
// الحصول على الأنشطة المقترحة حسب نوع المشروع
getSuggestedActivities(projectType: string): Promise<Activity[]>
```

## 🎨 الواجهة الجديدة

### في قائمة الأنشطة:
```
💡 Activities for Infrastructure (15 activities)
├── Civil Works Foundation
│   └── Enabling Division • Structural • m³ • 25 uses
├── Road Construction
│   └── Infrastructure Division • Infrastructure • m² • 18 uses
├── Bridge Construction
│   └── Infrastructure Division • Infrastructure • m • 12 uses
└── ...
```

### معلومات إضافية:
- **القسم**: Enabling Division, Infrastructure Division, etc.
- **الفئة**: Structural, Infrastructure, Soil Improvement, etc.
- **الوحدة**: m³, m², No., Running Meter, etc.
- **الاستخدام**: عدد مرات الاستخدام

## 🔄 منطق الفلترة

### Infrastructure Projects:
- الأنشطة التي تحتوي على: infrastructure, civil, utilities, road, bridge, pipeline, drainage

### Building Construction:
- الأنشطة التي تحتوي على: building, construction, structural, architectural, concrete, steel

### Marine Works:
- الأنشطة التي تحتوي على: marine, waterfront, dredging, breakwater, quay, jetty

### Road Construction:
- الأنشطة التي تحتوي على: road, highway, pavement, asphalt, concrete

### Landscaping:
- الأنشطة التي تحتوي على: landscaping, irrigation, planting, hardscape, garden

### Maintenance:
- الأنشطة التي تحتوي على: maintenance, repair, cleaning, inspection

## 📊 البيانات الافتراضية

### الأنشطة المدرجة:
```sql
-- Enabling Division
('Mobilization', 'Enabling Division', 'Lump Sum', 'General')
('Vibro Compaction', 'Enabling Division', 'No.', 'Soil Improvement')
('Sheet Pile', 'Enabling Division', 'No.', 'Structural')
('C.Piles 1000mm', 'Enabling Division', 'No.', 'Foundation')
('Excavation to General PL', 'Enabling Division', 'Cubic Meter', 'Earthwork')

-- Infrastructure Division
('Mobilization - Infra', 'Infrastructure Division', 'Lump Sum', 'Infrastructure')
('Trench Sheet - Infra', 'Infrastructure Division', 'No.', 'Infrastructure')

-- Soil Improvement Division
('Vibro Compaction', 'Soil Improvement Division', 'No.', 'Soil Improvement')
('Stone Column', 'Soil Improvement Division', 'No.', 'Soil Improvement')
```

## 🚀 كيفية التطبيق

### الخطوة 1: إنشاء الجدول
```bash
# نفذ في Supabase SQL Editor
Database/activities-table-schema.sql
```

### الخطوة 2: اختبار النظام
1. افتح BOQ Form
2. حدد مشروع (مثل Infrastructure)
3. انقر على حقل "Activity Name"
4. لاحظ الأنشطة المفلترة حسب نوع المشروع
5. اختر نشاط ولاحظ ملء الوحدة تلقائياً

### الخطوة 3: إدارة الأنشطة
- يمكن إضافة أنشطة جديدة من Settings
- يمكن تحديث الأنشطة الموجودة
- يمكن تعطيل الأنشطة غير المستخدمة

## 🔍 Console Logs للتشخيص

### عند تحميل الأنشطة:
```
🔄 Loading activities from database...
✅ Loaded 25 activities from database
```

### عند تحديد نوع المشروع:
```
🔍 Loading activities for project type: Infrastructure
✅ Found 15 activities for Infrastructure
```

### عند اختيار النشاط:
```
✅ Activity selected: Civil Works Foundation
🔧 Auto-filled unit: m³
📊 Activity usage incremented
```

## 🎯 المزايا

### 1. **مرونة أكبر**
- إدارة الأنشطة من قاعدة البيانات
- إضافة/تحديث/حذف الأنشطة بسهولة
- ربط الأنشطة بالأقسام والفئات

### 2. **ذكاء محسن**
- اقتراحات مخصصة حسب نوع المشروع
- ترتيب الأنشطة حسب الاستخدام
- تتبع تلقائي للاستخدام

### 3. **تجربة مستخدم أفضل**
- واجهة غنية بالمعلومات
- رسائل تأكيد واضحة
- Console logs للتشخيص

## 🔄 التحديثات المستقبلية

### مخطط التطوير:
- [ ] إضافة المزيد من الأنشطة من البيانات الموجودة
- [ ] تحسين منطق الفلترة
- [ ] إضافة أنشطة مخصصة لكل قسم
- [ ] ربط مع نظام التقييم
- [ ] إحصائيات متقدمة للاستخدام

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من Console logs
2. تأكد من إنشاء جدول `activities`
3. تحقق من البيانات الافتراضية
4. جرب إعادة تحميل الأنشطة

---

## 🎉 الخلاصة

تم تطبيق نظام إدارة الأنشطة المتكامل:

### ✅ المزايا:
- جدول منفصل للأنشطة في قاعدة البيانات
- ربط الأنشطة بالأقسام والفئات
- نظام اقتراحات ذكي حسب نوع المشروع
- تتبع عداد الاستخدام تلقائياً
- واجهة محسنة مع معلومات إضافية

### 🚀 جاهز للاستخدام:
- نفذ `Database/activities-table-schema.sql`
- افتح BOQ Form
- حدد المشروع ولاحظ الأنشطة المفلترة
- اختر النشاط ولاحظ ملء الوحدة تلقائياً

**النظام الجديد يعمل بشكل مثالي!** ✨

---

**تاريخ التطوير:** 2025-10-07  
**الإصدار:** 2.0.0

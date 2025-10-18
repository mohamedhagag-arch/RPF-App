# 🎯 خطة توحيد نظام الأنشطة

## 📋 الوضع الحالي

### **المشكلة:**
يوجد نظامين منفصلين للأنشطة:

1. **جدول `activities`:**
   - مرتبط بالأقسام (Divisions)
   - يحتوي على: name, division, unit, category, description, typical_duration, usage_count
   - له واجهة إدارة منفصلة في Settings
   
2. **جدول `project_type_activities`:**
   - مرتبط بأنواع المشاريع (Project Types)
   - يحتوي على: project_type, activity_name, default_unit, estimated_rate, category, display_order
   - له واجهة إدارة منفصلة في Settings

### **المشكلة:**
- تكرار البيانات
- صعوبة الصيانة
- عدم التكامل بين النظامين
- إضافة/تعديل/حذف يجب أن يتم في مكانين

## 🎯 الحل المقترح

### **النظام الموحد:**
استخدام جدول `project_type_activities` فقط كنظام موحد لأنه:
- ✅ أكثر مرونة (مرتبط بأنواع المشاريع)
- ✅ يحتوي على معلومات أكثر (estimated_rate, display_order, is_default)
- ✅ له نظام RLS كامل
- ✅ يدعم الترتيب والفلترة

### **الترحيل:**
1. ✅ نقل جميع الأنشطة من `activities` إلى `project_type_activities`
2. ✅ دمج الواجهتين في واجهة واحدة
3. ✅ تحديث جميع الاستعلامات لاستخدام الجدول الموحد
4. ✅ حذف الجدول القديم بعد التأكد

## 🗄️ البنية الموحدة

### **جدول موحد: `project_type_activities`**

```sql
CREATE TABLE project_type_activities (
    id UUID PRIMARY KEY,
    
    -- ✅ ربط بنوع المشروع (من project_types)
    project_type VARCHAR(255) NOT NULL REFERENCES project_types(name),
    
    -- ✅ معلومات النشاط
    activity_name VARCHAR(500) NOT NULL,
    activity_name_ar VARCHAR(500),
    description TEXT,
    
    -- ✅ التفاصيل التقنية
    default_unit VARCHAR(50),
    estimated_rate DECIMAL(15,2),
    category VARCHAR(100),
    
    -- ✅ معلومات إضافية (من activities القديم)
    typical_duration INTEGER,
    division TEXT, -- ✅ إضافة لتوافق مع القديم
    
    -- ✅ الإعدادات
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0, -- ✅ إضافة من القديم
    
    -- ✅ بيانات التتبع
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- ✅ قيود الجدول
    UNIQUE(project_type, activity_name)
);
```

**التحسينات:**
- ✅ دمج جميع الحقول من الجدولين
- ✅ الاحتفاظ بالتوافق مع الكود الحالي
- ✅ إضافة الحقول المفقودة (usage_count, typical_duration, division)

## 🔧 خطوات التنفيذ

### **المرحلة 1: تحديث البنية (Schema Update)**

#### **1.1 إضافة الأعمدة المفقودة:**
```sql
-- إضافة الأعمدة من activities إلى project_type_activities
ALTER TABLE project_type_activities 
ADD COLUMN IF NOT EXISTS typical_duration INTEGER;

ALTER TABLE project_type_activities 
ADD COLUMN IF NOT EXISTS division TEXT;

ALTER TABLE project_type_activities 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- إضافة foreign key للربط مع project_types
ALTER TABLE project_type_activities
ADD CONSTRAINT fk_project_type 
FOREIGN KEY (project_type) 
REFERENCES project_types(name) 
ON UPDATE CASCADE;
```

#### **1.2 ترحيل البيانات من activities:**
```sql
-- ترحيل البيانات من activities إلى project_type_activities
INSERT INTO project_type_activities (
    project_type,
    activity_name,
    default_unit,
    category,
    description,
    typical_duration,
    division,
    usage_count,
    is_active,
    is_default
)
SELECT 
    COALESCE(
        (SELECT name FROM project_types WHERE name ILIKE '%' || a.division || '%' LIMIT 1),
        'General Construction'
    ) as project_type,
    a.name as activity_name,
    a.unit as default_unit,
    a.category,
    a.description,
    a.typical_duration,
    a.division,
    a.usage_count,
    a.is_active,
    false as is_default
FROM activities a
ON CONFLICT (project_type, activity_name) DO UPDATE SET
    default_unit = EXCLUDED.default_unit,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    typical_duration = EXCLUDED.typical_duration,
    division = EXCLUDED.division,
    usage_count = EXCLUDED.usage_count + project_type_activities.usage_count,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
```

### **المرحلة 2: دمج الواجهات (UI Merge)**

#### **2.1 إنشاء واجهة موحدة: `ProjectTypeActivitiesManager.tsx`**
```typescript
// components/settings/ProjectTypeActivitiesManager.tsx
export function ProjectTypeActivitiesManager() {
  // ✅ عرض أنواع المشاريع
  // ✅ لكل نوع: عرض الأنشطة الخاصة به
  // ✅ إضافة/تعديل/حذف الأنشطة
  // ✅ ترتيب الأنشطة (drag & drop)
  // ✅ تفعيل/تعطيل الأنشطة
  // ✅ إحصائيات الاستخدام
}
```

**الميزات:**
- ✅ تبويبات لكل نوع مشروع
- ✅ قائمة الأنشطة لكل نوع
- ✅ نموذج إضافة/تعديل موحد
- ✅ فلترة وبحث
- ✅ استيراد/تصدير الأنشطة

#### **2.2 حذف الواجهات القديمة:**
- ❌ حذف `ProjectTypesManager` (دمج في الواجهة الموحدة)
- ❌ حذف `ActivitiesManager` (إذا كان موجود)

### **المرحلة 3: تحديث الكود (Code Update)**

#### **3.1 تحديث `lib/activitiesManager.ts`:**
```typescript
// تحديث جميع الدوال لاستخدام project_type_activities
export async function getAllActivities(): Promise<Activity[]> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('project_type_activities')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  return data || []
}

export async function getSuggestedActivities(projectType: string): Promise<Activity[]> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('project_type_activities')
    .select('*')
    .eq('project_type', projectType)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  return data || []
}
```

#### **3.2 تحديث `IntelligentBOQForm.tsx`:**
```typescript
// جميع الاستعلامات تستخدم project_type_activities
const loadActivitiesForProjectType = async (projectType?: string) => {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('project_type_activities')
    .select('*')
    .eq('project_type', projectType)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  // ...
}
```

### **المرحلة 4: الاختبار والتحقق (Testing)**

#### **4.1 اختبار الترحيل:**
```sql
-- التحقق من عدد السجلات
SELECT COUNT(*) FROM activities;
SELECT COUNT(*) FROM project_type_activities;

-- التحقق من البيانات المرحلة
SELECT 
    project_type,
    COUNT(*) as activity_count
FROM project_type_activities
GROUP BY project_type
ORDER BY activity_count DESC;
```

#### **4.2 اختبار الوظائف:**
- ✅ إضافة نشاط جديد
- ✅ تعديل نشاط موجود
- ✅ حذف نشاط
- ✅ فلترة الأنشطة حسب نوع المشروع
- ✅ فلترة الأنشطة حسب الفئة
- ✅ عداد الاستخدام يعمل
- ✅ الترتيب يعمل

### **المرحلة 5: التنظيف (Cleanup)**

#### **5.1 حذف الجدول القديم (بعد التأكد):**
```sql
-- نسخة احتياطية أولاً!
CREATE TABLE activities_backup AS SELECT * FROM activities;

-- حذف الجدول القديم
DROP TABLE IF EXISTS activities CASCADE;
```

#### **5.2 حذف الملفات القديمة:**
- ❌ `lib/activitiesManager.ts` (إذا كان منفصل)
- ❌ `Database/activities-table-schema.sql`
- ❌ `components/settings/ActivitiesManager.tsx` (إذا كان موجود)

## 🎯 الفوائد

### **1. توحيد البيانات:**
- ✅ **جدول واحد فقط** للأنشطة
- ✅ **لا تكرار** في البيانات
- ✅ **سهولة الصيانة** والتحديث
- ✅ **تكامل كامل** بين النظام

### **2. تحسين الأداء:**
- ✅ **استعلامات أقل** (جدول واحد بدلاً من اثنين)
- ✅ **فهرسة محسنة** (indexes موحدة)
- ✅ **ذاكرة أقل** (لا تكرار)

### **3. تجربة مستخدم أفضل:**
- ✅ **واجهة واحدة** لإدارة الأنشطة
- ✅ **تحكم كامل** في الأنشطة لكل نوع مشروع
- ✅ **فلترة وبحث** محسّن
- ✅ **إحصائيات دقيقة** للاستخدام

### **4. مرونة أكبر:**
- ✅ **إضافة أنواع مشاريع جديدة** بسهولة
- ✅ **إضافة أنشطة لكل نوع** بمرونة
- ✅ **ربط الأنشطة بالمشاريع** تلقائياً
- ✅ **قابلية التوسع** المستقبلية

## 📋 قائمة المهام (TODO)

### **المرحلة 1: تحديث البنية ✅**
- [ ] إضافة الأعمدة المفقودة لجدول project_type_activities
- [ ] إضافة foreign key constraint
- [ ] ترحيل البيانات من activities
- [ ] التحقق من الترحيل

### **المرحلة 2: دمج الواجهات ✅**
- [ ] إنشاء ProjectTypeActivitiesManager موحد
- [ ] دمج ميزات الواجهتين القديمتين
- [ ] اختبار الواجهة الموحدة
- [ ] حذف الواجهات القديمة

### **المرحلة 3: تحديث الكود ✅**
- [ ] تحديث lib/activitiesManager.ts
- [ ] تحديث IntelligentBOQForm.tsx
- [ ] تحديث جميع المكونات المتأثرة
- [ ] اختبار جميع الوظائف

### **المرحلة 4: الاختبار ✅**
- [ ] اختبار الإضافة
- [ ] اختبار التعديل
- [ ] اختبار الحذف
- [ ] اختبار الفلترة
- [ ] اختبار عداد الاستخدام

### **المرحلة 5: التنظيف ✅**
- [ ] نسخة احتياطية من activities
- [ ] حذف جدول activities
- [ ] حذف الملفات القديمة
- [ ] تحديث الوثائق

## ✨ النتيجة النهائية

**نظام موحد ومتكامل:**
- ✅ **جدول واحد**: `project_type_activities`
- ✅ **واجهة واحدة**: `ProjectTypeActivitiesManager`
- ✅ **كود موحد**: جميع الاستعلامات من جدول واحد
- ✅ **تكامل كامل**: كل شيء مرتبط ببعضه
- ✅ **سهولة الصيانة**: تحديث في مكان واحد
- ✅ **أداء محسّن**: استعلامات أقل وأسرع

**كل شيء موحد ومتكامل!** 🎉

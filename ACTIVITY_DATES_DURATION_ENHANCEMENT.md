# ✅ تحسين عرض تواريخ ومدة الأنشطة - Activity Dates & Duration Enhancement

## 🎯 المطلوب

إضافة وتحسين عرض:
- **Start Date**: تاريخ بداية النشاط
- **Duration**: مدة النشاط (محسوبة من بيانات KPI المخططة)

## 🔧 التحسينات المطبقة

### **1. إضافة دالة حساب Duration من بيانات KPI**

```typescript
// ✅ Calculate Duration from KPI Planned data
const calculateActivityDuration = (activity: any) => {
  if (!analytics?.kpis) return activity.calendar_duration || 0
  
  // Find KPI records for this activity
  const activityKPIs = analytics.kpis.filter((kpi: any) => 
    kpi.project_code === activity.project_code && 
    kpi.activity_name === activity.activity_name &&
    kpi.input_type === 'Planned'
  )
  
  if (activityKPIs.length > 0) {
    // Sum all planned quantities to get total planned days
    const totalPlannedDays = activityKPIs.reduce((sum: number, kpi: any) => {
      return sum + (parseFloat(kpi.quantity?.toString() || '0') || 0)
    }, 0)
    
    return Math.round(totalPlannedDays) || activity.calendar_duration || 0
  }
  
  return activity.calendar_duration || 0
}
```

**المنطق:**
- ✅ البحث عن سجلات KPI للنشاط مع `input_type = 'Planned'`
- ✅ جمع جميع الكميات المخططة للحصول على إجمالي الأيام المخططة
- ✅ استخدام البيانات المحسوبة أو العودة للقيمة الأصلية

### **2. تحسين عرض Duration**

```typescript
<div>
  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
  <p className="text-sm font-medium text-gray-900 dark:text-white">
    {(() => {
      const duration = calculateActivityDuration(activity)
      return duration > 0 ? `${duration} days` : 'Not set'
    })()}
  </p>
  {(() => {
    const duration = calculateActivityDuration(activity)
    const originalDuration = activity.calendar_duration
    if (duration !== originalDuration && duration > 0) {
      return (
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Updated from KPI
        </p>
      )
    }
    return null
  })()}
</div>
```

**المزايا:**
- ✅ عرض Duration محسوب من بيانات KPI
- ✅ إظهار "Updated from KPI" إذا كانت القيمة مختلفة عن الأصلية
- ✅ عرض "Not set" إذا لم تكن هناك بيانات

### **3. تحسين عرض Start Date**

```typescript
<div>
  <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
  <p className="text-sm font-medium text-gray-900 dark:text-white">
    {activity.planned_activity_start_date 
      ? new Date(activity.planned_activity_start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : 'Not set'
    }
  </p>
  {activity.planned_activity_start_date && (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      {(() => {
        const startDate = new Date(activity.planned_activity_start_date)
        const today = new Date()
        const diffTime = startDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays > 0) {
          return `${diffDays} days from now`
        } else if (diffDays === 0) {
          return 'Today'
        } else {
          return `${Math.abs(diffDays)} days ago`
        }
      })()}
    </p>
  )}
</div>
```

**المزايا:**
- ✅ تنسيق أفضل للتاريخ (Month Day, Year)
- ✅ إظهار الوقت النسبي (X days from now, Today, X days ago)
- ✅ عرض "Not set" إذا لم يكن هناك تاريخ

## 📊 النتائج المتوقعة

### **للعرض في تفاصيل النشاط:**

#### **Start Date:**
- **التاريخ**: "Dec 15, 2024" (تنسيق محسن)
- **الوقت النسبي**: "5 days from now" أو "Today" أو "3 days ago"

#### **Duration:**
- **المدة**: "15 days" (محسوبة من KPI)
- **المصدر**: "Updated from KPI" (إذا كانت مختلفة عن الأصلية)

### **مثال على البيانات:**

```typescript
// بيانات KPI للنشاط
const kpiData = [
  { project_code: 'P5022', activity_name: 'Stone Column', input_type: 'Planned', quantity: 10 },
  { project_code: 'P5022', activity_name: 'Stone Column', input_type: 'Planned', quantity: 5 },
  { project_code: 'P5022', activity_name: 'Stone Column', input_type: 'Planned', quantity: 3 }
]

// النتيجة: Duration = 10 + 5 + 3 = 18 days
```

## 🔧 الملفات المحدثة

### **components/projects/ProjectDetailsPanel.tsx**
- ✅ إضافة دالة `calculateActivityDuration`
- ✅ تحسين عرض Duration مع إشارة "Updated from KPI"
- ✅ تحسين عرض Start Date مع الوقت النسبي
- ✅ تنسيق أفضل للتواريخ

## 🎯 المزايا الجديدة

### **1. دقة في حساب Duration:**
- ✅ استخدام بيانات KPI الأكثر دقة
- ✅ حساب تلقائي من الكميات المخططة
- ✅ إظهار مصدر البيانات

### **2. وضوح في عرض Start Date:**
- ✅ تنسيق محسن للتاريخ
- ✅ عرض الوقت النسبي
- ✅ سهولة في الفهم

### **3. تكامل مع بيانات KPI:**
- ✅ استخدام بيانات KPI بدلاً من BOQ
- ✅ حساب تلقائي للمدة
- ✅ إظهار التحديثات

## ✨ الخلاصة

**تم تحسين عرض تواريخ ومدة الأنشطة بالكامل!**

الآن في تفاصيل المشروع ستظهر:
- ✅ **Start Date**: تاريخ محسن مع الوقت النسبي
- ✅ **Duration**: مدة محسوبة من بيانات KPI المخططة
- ✅ **مؤشر التحديث**: "Updated from KPI" عند الحاجة
- ✅ **دقة أكبر**: استخدام بيانات KPI بدلاً من BOQ

**البيانات ستكون أكثر دقة ووضوحاً!** 🎉

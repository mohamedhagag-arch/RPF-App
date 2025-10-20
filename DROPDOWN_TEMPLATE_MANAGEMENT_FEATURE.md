# Dropdown Template Management Feature

## Overview
تم تحويل أزرار Export و Import إلى dropdown menus (prob lists) تحتوي على الأنواع المختلفة من التصدير والاستيراد، مما يوفر واجهة أكثر تنظيماً وسهولة في الاستخدام.

## الميزات الجديدة

### 1. Export Dropdown Menu
- **Export JSON**: تصدير جميع البيانات بصيغة JSON
- **Export Excel/CSV**: تصدير جميع البيانات بصيغة CSV مع دعم UTF-8
- **واجهة منظمة**: قائمة منسدلة تحتوي على جميع خيارات التصدير

### 2. Import Dropdown Menu
- **Import JSON**: استيراد ملفات JSON
- **Import Excel/CSV**: استيراد ملفات CSV, XLSX, XLS
- **واجهة منظمة**: قائمة منسدلة تحتوي على جميع خيارات الاستيراد

### 3. تحسينات الواجهة
- **Dropdown Menus**: قوائم منسدلة بدلاً من الأزرار المتعددة
- **أيقونات واضحة**: أيقونات مميزة لكل نوع ملف
- **إغلاق تلقائي**: إغلاق القوائم عند النقر خارجها
- **تصميم متجاوب**: يعمل بشكل مثالي على جميع الأجهزة

## كيفية الاستخدام

### 1. تصدير البيانات
1. اذهب إلى **Settings** > **Project Types & Activities Management**
2. اضغط على **Export** في Header
3. اختر من القائمة المنسدلة:
   - **Export JSON**: لتصدير بصيغة JSON
   - **Export Excel/CSV**: لتصدير بصيغة CSV

### 2. استيراد البيانات
1. اذهب إلى **Settings** > **Project Types & Activities Management**
2. اضغط على **Import** في Header
3. اختر من القائمة المنسدلة:
   - **Import JSON**: لاستيراد ملفات JSON
   - **Import Excel/CSV**: لاستيراد ملفات CSV/Excel

## الميزات التقنية

### 1. State Management
```typescript
const [showExportMenu, setShowExportMenu] = useState(false)
const [showImportMenu, setShowImportMenu] = useState(false)
```

### 2. Event Handling
```typescript
const handleExportJSON = () => {
  setShowExportMenu(false)
  handleExportTemplate()
}

const handleExportCSV = () => {
  setShowExportMenu(false)
  handleExportToExcel()
}
```

### 3. Click Outside Detection
```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.dropdown-menu')) {
      setShowExportMenu(false)
      setShowImportMenu(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [])
```

## التصميم والواجهة

### 1. Export Dropdown
```jsx
<div className="relative dropdown-menu">
  <ModernButton
    onClick={() => setShowExportMenu(!showExportMenu)}
    variant="outline"
    size="sm"
    icon={<Download className="h-4 w-4" />}
    className="flex items-center gap-2"
  >
    Export
    <ChevronDown className="h-4 w-4" />
  </ModernButton>
  
  {showExportMenu && (
    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
      <div className="py-1">
        <button onClick={handleExportJSON}>
          <FileText className="h-4 w-4" />
          Export JSON
        </button>
        <button onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel/CSV
        </button>
      </div>
    </div>
  )}
</div>
```

### 2. Import Dropdown
```jsx
<div className="relative dropdown-menu">
  <ModernButton
    onClick={() => setShowImportMenu(!showImportMenu)}
    variant="outline"
    size="sm"
    icon={<Upload className="h-4 w-4" />}
    className="flex items-center gap-2"
  >
    Import
    <ChevronDown className="h-4 w-4" />
  </ModernButton>
  
  {showImportMenu && (
    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
      <div className="py-1">
        <button onClick={handleImportJSON}>
          <FileText className="h-4 w-4" />
          Import JSON
        </button>
        <button onClick={handleImportCSV}>
          <FileSpreadsheet className="h-4 w-4" />
          Import Excel/CSV
        </button>
      </div>
    </div>
  )}
</div>
```

## الملفات المحدثة

### 1. UnifiedProjectTypesManager.tsx
- إضافة state للdropdown menus
- إضافة وظائف معالجة الأحداث
- تحديث UI لدعم dropdown menus
- إضافة click outside detection

### 2. Icons
- إضافة ChevronDown icon
- استخدام FileText و FileSpreadsheet icons
- تحديث أيقونات الأزرار

## المزايا

### 1. تحسين تجربة المستخدم
- **واجهة منظمة**: قوائم منسدلة بدلاً من أزرار متعددة
- **سهولة الاستخدام**: اختيار واضح لنوع الملف
- **تصميم نظيف**: واجهة أقل ازدحاماً

### 2. تحسين الأداء
- **إغلاق تلقائي**: إغلاق القوائم عند النقر خارجها
- **state management**: إدارة فعالة لحالة القوائم
- **event handling**: معالجة سريعة للأحداث

### 3. قابلية التوسع
- **سهولة الإضافة**: إضافة أنواع جديدة بسهولة
- **مرونة التصميم**: قابلية تخصيص القوائم
- **دعم متعدد**: دعم أنواع ملفات متعددة

## الاختبار

### 1. اختبار الوظائف
- فتح وإغلاق القوائم المنسدلة
- اختيار خيارات التصدير والاستيراد
- إغلاق القوائم عند النقر خارجها

### 2. اختبار التصميم
- عرض صحيح على جميع الأجهزة
- دعم Dark/Light mode
- استجابة سريعة للتفاعل

## الدعم الفني

### 1. استكشاف الأخطاء
- تحقق من state management
- راجع event handlers
- تأكد من CSS classes

### 2. الحصول على المساعدة
- راجع هذا الدليل
- تحقق من console logs
- اتصل بالدعم الفني

## الخلاصة

ميزة Dropdown Template Management توفر:
- **واجهة منظمة** للتصدير والاستيراد
- **سهولة الاستخدام** مع قوائم منسدلة
- **تصميم نظيف** ومرن
- **دعم متعدد** لأنواع الملفات
- **تجربة مستخدم محسنة** بشكل كبير

هذه الميزة تجعل إدارة Templates أكثر تنظيماً وسهولة، خاصة مع إضافة المزيد من أنواع الملفات في المستقبل.

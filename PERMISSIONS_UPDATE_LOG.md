# 📋 سجل تحديث نظام الصلاحيات

## ✅ التحديثات المنجزة

### 1. **إضافة فئات جديدة للصلاحيات**
- ✅ إضافة فئة `cost-control` للصلاحيات المتعلقة بالتحكم في التكاليف
- ✅ إضافة فئة `hr` للصلاحيات المتعلقة بالموارد البشرية

### 2. **صلاحيات Cost Control (27 صلاحية جديدة)**

#### Cost Control Overview
- `cost_control.view` - عرض Cost Control

#### Manpower
- `cost_control.manpower.view` - عرض بيانات القوى العاملة
- `cost_control.manpower.create` - إنشاء سجلات القوى العاملة
- `cost_control.manpower.edit` - تعديل سجلات القوى العاملة
- `cost_control.manpower.delete` - حذف سجلات القوى العاملة
- `cost_control.manpower.import` - استيراد بيانات القوى العاملة
- `cost_control.manpower.export` - تصدير بيانات القوى العاملة

#### Designation Rates
- `cost_control.designation_rates.view` - عرض أسعار المسميات الوظيفية
- `cost_control.designation_rates.create` - إنشاء أسعار المسميات الوظيفية
- `cost_control.designation_rates.edit` - تعديل أسعار المسميات الوظيفية
- `cost_control.designation_rates.delete` - حذف أسعار المسميات الوظيفية

#### Machine List
- `cost_control.machine_list.view` - عرض قائمة الآلات
- `cost_control.machine_list.create` - إضافة آلات جديدة
- `cost_control.machine_list.edit` - تعديل معلومات الآلات
- `cost_control.machine_list.delete` - حذف الآلات من القائمة

#### Machinery Day Rates
- `cost_control.machinery_day_rates.view` - عرض أسعار الآلات اليومية
- `cost_control.machinery_day_rates.create` - إنشاء أسعار الآلات اليومية
- `cost_control.machinery_day_rates.edit` - تعديل أسعار الآلات اليومية
- `cost_control.machinery_day_rates.delete` - حذف أسعار الآلات اليومية

#### Cost Control Database
- `cost_control.database.view` - عرض مدير قاعدة بيانات Cost Control
- `cost_control.database.manage` - إدارة قاعدة بيانات Cost Control (استيراد، تصدير، مسح)

### 3. **صلاحيات HR (23 صلاحية جديدة)**

#### HR Overview
- `hr.view` - عرض وحدة HR

#### HR Manpower
- `hr.manpower.view` - عرض سجلات HR Manpower
- `hr.manpower.create` - إنشاء سجلات HR Manpower
- `hr.manpower.edit` - تعديل سجلات HR Manpower
- `hr.manpower.delete` - حذف سجلات HR Manpower

#### Attendance
- `hr.attendance.view` - عرض لوحة الحضور والإحصائيات
- `hr.attendance.check_in_out` - تسجيل الحضور والانصراف
- `hr.attendance.review` - مراجعة والموافقة على سجلات الحضور

#### Attendance Employees
- `hr.attendance.employees.view` - عرض قائمة موظفي الحضور
- `hr.attendance.employees.create` - إنشاء موظفين جدد للحضور
- `hr.attendance.employees.edit` - تعديل معلومات موظفي الحضور
- `hr.attendance.employees.delete` - حذف موظفي الحضور

#### Attendance Locations
- `hr.attendance.locations.view` - عرض مواقع الحضور (GPS tracking)
- `hr.attendance.locations.create` - إنشاء مواقع حضور جديدة
- `hr.attendance.locations.edit` - تعديل مواقع الحضور
- `hr.attendance.locations.delete` - حذف مواقع الحضور

#### Attendance Reports
- `hr.attendance.reports.view` - عرض تقارير الحضور والتحليلات
- `hr.attendance.reports.export` - تصدير تقارير الحضور

#### Attendance Settings
- `hr.attendance.settings.view` - عرض إعدادات نظام الحضور
- `hr.attendance.settings.manage` - إدارة إعدادات نظام الحضور

#### QR Settings
- `hr.attendance.qr.view` - عرض إعدادات QR Code للحضور
- `hr.attendance.qr.manage` - إدارة إعدادات QR Code للحضور

### 4. **صلاحيات Companies Management (5 صلاحيات جديدة)**
- `companies.view` - عرض قائمة الشركات
- `companies.create` - إنشاء شركات جديدة
- `companies.edit` - تعديل معلومات الشركة
- `companies.delete` - حذف الشركات
- `settings.manage` - إدارة جميع إعدادات النظام (وصول كامل)

### 5. **تحديث الصلاحيات الافتراضية للأدوار**

#### Admin
- ✅ يحصل على جميع الصلاحيات تلقائياً (بما في ذلك الجديدة)

#### Manager
- ✅ تم إضافة جميع صلاحيات Cost Control
- ✅ تم إضافة جميع صلاحيات HR
- ✅ تم إضافة صلاحيات Companies Management

#### Engineer
- ✅ تم إضافة صلاحيات عرض Cost Control (view only)
- ✅ تم إضافة صلاحيات HR محدودة (view و check-in/out)

#### Viewer
- ✅ تم إضافة صلاحيات عرض Cost Control (view only)
- ✅ تم إضافة صلاحيات عرض HR (view only)

#### Planner
- ✅ تم إضافة صلاحيات عرض Cost Control (view only)
- ✅ تم إضافة صلاحيات عرض HR (view only)

### 6. **تحديث AdvancedPermissionsManager**
- ✅ إضافة أيقونات وألوان للفئات الجديدة:
  - `cost-control`: أيقونة DollarSign، لون أصفر
  - `hr`: أيقونة UserCheck، لون وردي
- ✅ تحديث colorClasses و bgColorClasses و textColorClasses لدعم الألوان الجديدة

## 📊 الإحصائيات

### قبل التحديث
- **إجمالي الصلاحيات**: 203 صلاحية
- **الفئات**: 8 فئات (projects, boq, kpi, users, reports, settings, system, database)

### بعد التحديث
- **إجمالي الصلاحيات**: 258 صلاحية (+55 صلاحية جديدة)
- **الفئات**: 10 فئات (+2 فئة جديدة: cost-control, hr)

### الصلاحيات الجديدة حسب الفئة
- **Cost Control**: 27 صلاحية
- **HR**: 23 صلاحية
- **Companies Management**: 5 صلاحيات

## 🎯 الاستخدام

### في الصفحات
يمكنك الآن استخدام الصلاحيات الجديدة في الصفحات:

```tsx
// Cost Control
<PermissionPage permission="cost_control.view">
  {/* Cost Control Content */}
</PermissionPage>

// HR Attendance
<PermissionPage permission="hr.attendance.view">
  {/* HR Attendance Content */}
</PermissionPage>

// Manpower
<PermissionPage permission="cost_control.manpower.view">
  {/* Manpower Content */}
</PermissionPage>
```

### في الأزرار
```tsx
<PermissionButton permission="cost_control.manpower.create">
  Add Manpower Record
</PermissionButton>

<PermissionButton permission="hr.attendance.check_in_out">
  Check-In/Out
</PermissionButton>
```

## 📝 ملاحظات مهمة

1. **التوافق مع الإصدارات السابقة**: جميع الصلاحيات القديمة لا تزال تعمل كما هي
2. **Admin**: يحصل تلقائياً على جميع الصلاحيات الجديدة
3. **الأدوار الأخرى**: تم تحديث الصلاحيات الافتراضية لكل دور ليشمل الصلاحيات الجديدة المناسبة
4. **Custom Permissions**: يمكن للمستخدمين المخصصين إضافة الصلاحيات الجديدة يدوياً

## 🔄 الخطوات التالية

1. ✅ تحديث نظام الصلاحيات
2. ✅ تحديث الصلاحيات الافتراضية للأدوار
3. ✅ تحديث AdvancedPermissionsManager
4. ⏳ (اختياري) تحديث الصفحات لاستخدام الصلاحيات الجديدة بدلاً من `reports.view`

---

**تاريخ التحديث**: ديسمبر 2024  
**الإصدار**: 3.0.15


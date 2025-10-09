# 🔐 نظام الصلاحيات المحدث - Permissions System v2.0

## ✨ التحديثات الجديدة

تم تحديث نظام الصلاحيات ليشمل **Database Management** وجميع الميزات الجديدة!

---

## 📊 إحصائيات النظام

### إجمالي الصلاحيات: **46 صلاحية** (زيادة من 39)
### الفئات: **8 فئات** (إضافة فئة Database)
### الأدوار: **4 أدوار** (Admin, Manager, Engineer, Viewer)

---

## 🎯 الصلاحيات حسب الفئة

### 1. **Projects** (5 صلاحيات) 🏗️
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `projects.view` | View Projects | Can view projects list and details | View |
| `projects.create` | Create Projects | Can create new projects | Create |
| `projects.edit` | Edit Projects | Can edit existing projects | Edit |
| `projects.delete` | Delete Projects | Can delete projects | Delete |
| `projects.export` | Export Projects | Can export projects data | Export |

### 2. **BOQ Activities** (6 صلاحيات) 📋
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `boq.view` | View BOQ | Can view BOQ activities | View |
| `boq.create` | Create Activities | Can create BOQ activities | Create |
| `boq.edit` | Edit Activities | Can edit BOQ activities | Edit |
| `boq.delete` | Delete Activities | Can delete BOQ activities | Delete |
| `boq.approve` | Approve Activities | Can approve BOQ activities | Approve |
| `boq.export` | Export BOQ | Can export BOQ data | Export |

### 3. **KPI Records** (5 صلاحيات) 📊
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `kpi.view` | View KPIs | Can view KPI records | View |
| `kpi.create` | Create KPIs | Can create KPI records | Create |
| `kpi.edit` | Edit KPIs | Can edit KPI records | Edit |
| `kpi.delete` | Delete KPIs | Can delete KPI records | Delete |
| `kpi.export` | Export KPIs | Can export KPI data | Export |

### 4. **Reports** (7 صلاحيات) 📈
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `reports.view` | View Reports | Can view all reports | View |
| `reports.daily` | Daily Reports | Can access daily reports | View |
| `reports.weekly` | Weekly Reports | Can access weekly reports | View |
| `reports.monthly` | Monthly Reports | Can access monthly reports | View |
| `reports.financial` | Financial Reports | Can access financial reports | View |
| `reports.export` | Export Reports | Can export reports | Export |
| `reports.print` | Print Reports | Can print reports | Export |

### 5. **Users Management** (5 صلاحيات) 👥
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `users.view` | View Users | Can view users list | View |
| `users.create` | Create Users | Can create new users | Create |
| `users.edit` | Edit Users | Can edit user details | Edit |
| `users.delete` | Delete Users | Can delete users | Delete |
| `users.permissions` | Manage Permissions | Can manage user permissions | Manage |

### 6. **Settings** (7 صلاحيات) ⚙️ **← محدث!**
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `settings.view` | View Settings | Can view settings | View |
| `settings.company` | Manage Company Settings | Can manage company settings | Manage |
| `settings.divisions` | Manage Divisions | Can manage divisions | Manage |
| `settings.project_types` | Manage Project Types | Can manage project types | Manage |
| `settings.currencies` | Manage Currencies | Can manage currencies | Manage |
| `settings.activities` | Manage Activities | Can manage activity templates | Manage |
| `settings.holidays` | Manage Holidays | Can manage holidays and workdays | Manage |

### 7. **System** (4 صلاحيات) 🔧
| Permission ID | Name | Description | Action |
|--------------|------|-------------|--------|
| `system.import` | Import Data | Can import data from files | Manage |
| `system.export` | Export System Data | Can export all system data | Export |
| `system.backup` | Backup System | Can backup system data | Manage |
| `system.audit` | View Audit Logs | Can view system audit logs | View |

### 8. **Database Management** (7 صلاحيات) 🗄️ **← جديد!**
| Permission ID | Name | Description | Action | Danger Level |
|--------------|------|-------------|--------|--------------|
| `database.view` | View Database Stats | Can view database statistics and information | View | 🟢 Safe |
| `database.backup` | Create Backups | Can create database backups | Backup | 🟢 Safe |
| `database.restore` | Restore Database | Can restore database from backups | Restore | 🟡 Medium |
| `database.export` | Export Tables | Can export individual tables | Export | 🟢 Safe |
| `database.import` | Import Tables | Can import data to tables | Manage | 🟡 Medium |
| `database.clear` | Clear Table Data | Can clear all data from tables | Delete | 🔴 **DANGEROUS** |
| `database.manage` | Full Database Management | Complete database management access | Manage | 🔴 **DANGEROUS** |

---

## 👥 الصلاحيات حسب الدور

### **Admin** (46 صلاحيات) - المدير الكامل
```
✅ ALL PERMISSIONS - جميع الصلاحيات

الميزات الخاصة بـ Admin:
┌─────────────────────────────────────────┐
│ ✅ Users Management (كل الصلاحيات)       │
│ ✅ Database Management (كل الصلاحيات)    │
│ ✅ Settings Management (كل الصلاحيات)    │
│ ✅ System Operations (كل الصلاحيات)      │
│ ✅ Can perform DANGEROUS operations     │
│ ✅ Database Backup & Restore            │
│ ✅ Clear Table Data                     │
│ ✅ Import/Export everything             │
└─────────────────────────────────────────┘
```

### **Manager** (36 صلاحيات) - المدير التنفيذي
```
✅ Projects: All (view, create, edit, delete, export)
✅ BOQ: All (view, create, edit, delete, approve, export)
✅ KPI: All (view, create, edit, delete, export)
✅ Reports: All (view, daily, weekly, monthly, financial, export, print)
✅ Settings: Manage (company, divisions, types, currencies, activities, holidays)
✅ System: Limited (export, backup)
✅ Database: Safe Operations (view, export, backup)

❌ Cannot manage users
❌ Cannot restore database
❌ Cannot import to database
❌ Cannot clear table data
❌ Cannot manage full database

الميزات الخاصة بـ Manager:
┌─────────────────────────────────────────┐
│ ✅ Create database backups              │
│ ✅ Export any table                     │
│ ✅ View database statistics             │
│ ✅ Manage all settings                  │
│ ❌ NO dangerous database operations     │
└─────────────────────────────────────────┘
```

### **Engineer** (18 صلاحيات) - المهندس
```
✅ Projects: View, Export
✅ BOQ: View, Create, Edit, Export
✅ KPI: View, Create, Edit, Export
✅ Reports: View, Daily, Weekly, Monthly, Export, Print
✅ Settings: View only
✅ Database: View only

❌ Cannot delete projects
❌ Cannot delete BOQ activities
❌ Cannot delete KPIs
❌ Cannot manage settings
❌ Cannot manage users
❌ Cannot backup/restore database

الميزات الخاصة بـ Engineer:
┌─────────────────────────────────────────┐
│ ✅ Create and edit activities           │
│ ✅ Create and edit KPIs                 │
│ ✅ View database statistics             │
│ ✅ Export data                          │
│ ❌ NO delete permissions                │
│ ❌ NO database management               │
└─────────────────────────────────────────┘
```

### **Viewer** (11 صلاحيات) - المشاهد
```
✅ Projects: View
✅ BOQ: View
✅ KPI: View
✅ Reports: View, Daily, Weekly, Monthly
✅ Settings: View
✅ Database: View stats only

❌ Cannot create anything
❌ Cannot edit anything
❌ Cannot delete anything
❌ Cannot export anything
❌ Cannot manage anything
❌ Cannot access database operations

الميزات الخاصة بـ Viewer:
┌─────────────────────────────────────────┐
│ ✅ Read-only access to all data         │
│ ✅ Can view reports                     │
│ ✅ Can view database statistics         │
│ ❌ NO modification permissions          │
│ ❌ NO export capabilities               │
│ ❌ NO database operations               │
└─────────────────────────────────────────┘
```

---

## 🆕 الصلاحيات الجديدة المضافة

### **Settings:**
```
🆕 settings.company - إدارة إعدادات الشركة
🆕 settings.holidays - إدارة الإجازات وأيام العمل
```

### **Database (فئة جديدة كاملة):**
```
🆕 database.view - عرض إحصائيات قاعدة البيانات
🆕 database.backup - إنشاء نسخ احتياطية
🆕 database.restore - استعادة من نسخة احتياطية
🆕 database.export - تصدير الجداول
🆕 database.import - استيراد بيانات للجداول
🆕 database.clear - مسح بيانات الجداول (خطر!)
🆕 database.manage - إدارة كاملة لقاعدة البيانات
```

---

## 🔒 مستويات الأمان للصلاحيات

### 🟢 **Safe Operations** (عمليات آمنة):
```
✅ View (عرض)
✅ Export (تصدير)
✅ Backup (نسخ احتياطي)
✅ Create (إنشاء)

يمكن إعطاؤها لـ: Manager, Engineer
```

### 🟡 **Medium Risk Operations** (عمليات متوسطة الخطورة):
```
⚠️ Edit (تعديل)
⚠️ Import (استيراد)
⚠️ Restore (استعادة)
⚠️ Approve (اعتماد)

يمكن إعطاؤها لـ: Manager فقط
تحتاج: مراجعة وتأكيد
```

### 🔴 **Dangerous Operations** (عمليات خطرة):
```
❌ Delete (حذف)
❌ Clear (مسح كل البيانات)
❌ Manage Users (إدارة المستخدمين)
❌ Manage Database (إدارة قاعدة البيانات)

يمكن إعطاؤها لـ: Admin فقط
تحتاج: تأكيد مزدوج
```

---

## 📋 جدول مقارنة الأدوار

| Feature | Admin | Manager | Engineer | Viewer |
|---------|-------|---------|----------|--------|
| **Projects** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ |
| **BOQ Activities** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ |
| **KPI Records** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ |
| **Reports** |
| View All | ✅ | ✅ | ✅ | ✅ |
| Daily/Weekly/Monthly | ✅ | ✅ | ✅ | ✅ |
| Financial | ✅ | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ |
| Print | ✅ | ✅ | ✅ | ❌ |
| **Users** |
| View | ✅ | ❌ | ❌ | ❌ |
| Create | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| Manage Permissions | ✅ | ❌ | ❌ | ❌ |
| **Settings** |
| View | ✅ | ✅ | ✅ | ✅ |
| Manage Company | ✅ | ✅ | ❌ | ❌ |
| Manage Divisions | ✅ | ✅ | ❌ | ❌ |
| Manage Types | ✅ | ✅ | ❌ | ❌ |
| Manage Currencies | ✅ | ✅ | ❌ | ❌ |
| Manage Activities | ✅ | ✅ | ❌ | ❌ |
| Manage Holidays | ✅ | ✅ | ❌ | ❌ |
| **System** |
| Import Data | ✅ | ❌ | ❌ | ❌ |
| Export System | ✅ | ✅ | ❌ | ❌ |
| Backup System | ✅ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| **Database 🆕** |
| View Stats | ✅ | ✅ | ✅ | ✅ |
| Create Backups | ✅ | ✅ | ❌ | ❌ |
| Restore Database | ✅ | ❌ | ❌ | ❌ |
| Export Tables | ✅ | ✅ | ❌ | ❌ |
| Import Tables | ✅ | ❌ | ❌ | ❌ |
| Clear Table Data | ✅ | ❌ | ❌ | ❌ |
| Full DB Management | ✅ | ❌ | ❌ | ❌ |

---

## 🎯 استخدام النظام في الكود

### 1. التحقق من صلاحية Database Management:
```typescript
import { hasPermission } from '@/lib/permissionsSystem'

// في المكون
const canManageDB = hasPermission(appUser, 'database.manage')
const canBackup = hasPermission(appUser, 'database.backup')
const canRestore = hasPermission(appUser, 'database.restore')
const canClearData = hasPermission(appUser, 'database.clear')

if (!canManageDB) {
  return <div>Access Denied - Admin only</div>
}
```

### 2. التحقق من صلاحيات Settings:
```typescript
const canManageCompany = hasPermission(appUser, 'settings.company')
const canManageDivisions = hasPermission(appUser, 'settings.divisions')
const canManageTypes = hasPermission(appUser, 'settings.project_types')
const canManageCurrencies = hasPermission(appUser, 'settings.currencies')
const canManageHolidays = hasPermission(appUser, 'settings.holidays')
```

### 3. التحقق من عدة صلاحيات:
```typescript
import { hasAnyPermission, hasAllPermissions } from '@/lib/permissionsSystem'

// يمكنه عمل backup (Admin أو Manager)
const canDoBackup = hasAnyPermission(appUser, [
  'database.backup',
  'system.backup'
])

// يحتاج كل صلاحيات الـ Settings
const canManageAllSettings = hasAllPermissions(appUser, [
  'settings.company',
  'settings.divisions',
  'settings.project_types',
  'settings.currencies'
])
```

---

## 🔐 سيناريوهات الأمان

### **السيناريو 1: نقل البيانات من Test إلى Production**
```
المستخدم: Manager
الصلاحيات:
  ✅ database.view - يمكنه رؤية الإحصائيات
  ✅ database.backup - يمكنه عمل نسخة احتياطية
  ✅ database.export - يمكنه تصدير الجداول
  ❌ database.restore - لا يمكنه الاستعادة
  ❌ database.import - لا يمكنه الاستيراد
  ❌ database.clear - لا يمكنه المسح

الحل: يحتاج Admin للقيام بـ:
  1. Restore
  2. Import
  3. Clear Data
```

### **السيناريو 2: مهندس يريد تصدير بيانات للتحليل**
```
المستخدم: Engineer
الصلاحيات:
  ✅ database.view - يمكنه رؤية الإحصائيات
  ❌ database.export - لا يمكنه التصدير
  
الحل: يحتاج Manager أو Admin للقيام بالتصدير
```

### **السيناريو 3: Admin يريد مسح بيانات تجريبية**
```
المستخدم: Admin
الصلاحيات:
  ✅ database.manage - كل الصلاحيات
  ✅ database.clear - يمكنه المسح
  
الخطوات:
  1. Create Backup (safety)
  2. Clear Table Data
  3. Import Real Data
```

---

## 📊 ملخص الصلاحيات الجديدة

### ما تمت إضافته:
```
✅ 7 صلاحيات جديدة لـ Database Management
✅ 2 صلاحيات جديدة لـ Settings (company, holidays)
✅ فئة جديدة: 'database'
✅ أفعال جديدة: 'backup', 'restore'
✅ توزيع محدث للصلاحيات على الأدوار
✅ أوصاف محدثة للأدوار
```

### التوزيع النهائي:
```
📊 Admin: 46 صلاحية (100%)
📊 Manager: 36 صلاحية (78%)
📊 Engineer: 18 صلاحية (39%)
📊 Viewer: 11 صلاحية (24%)
```

---

## 🎨 في واجهة Manage Permissions

### عند فتح Permissions Manager:

```
الفئات المعروضة:
┌─────────────────────────────────────────┐
│ 🏗️ Projects (5)                         │
│ 📋 BOQ Activities (6)                   │
│ 📊 KPI Records (5)                      │
│ 📈 Reports (7)                          │
│ 👥 Users (5)                            │
│ ⚙️ Settings (7) ← محدث                 │
│ 🔧 System (4)                           │
│ 🗄️ Database (7) ← جديد!                │
└─────────────────────────────────────────┘
```

### لون فئة Database:
- **اللون:** Cyan/Teal (سماوي)
- **الأيقونة:** 🗄️ Database
- **العمليات الخطرة:** مميزة باللون الأحمر

---

## ✅ التحقق من التحديث

### في Supabase (لا حاجة لتحديثات):
```sql
-- النظام يعمل على مستوى التطبيق
-- لا توجد تغييرات على قاعدة البيانات مطلوبة
-- الصلاحيات محفوظة في جدول users موجود بالفعل
```

### في التطبيق:
```
1. اذهب إلى Users Management
2. اختر أي مستخدم
3. اضغط "Manage Permissions"
4. لاحظ الفئة الجديدة "Database" بلون Cyan
5. لاحظ الصلاحيات الجديدة في Settings
```

---

## 🎉 الخلاصة

### التحديثات المنجزة:
```
✅ إضافة فئة Database (7 صلاحيات)
✅ تحديث فئة Settings (من 5 إلى 7)
✅ توزيع الصلاحيات على الأدوار بشكل ذكي
✅ أوصاف محدثة للأدوار
✅ دعم كامل في واجهة Permissions Manager
✅ ألوان وأيقونات للفئة الجديدة
✅ لا حاجة لتحديثات في قاعدة البيانات
```

### الصلاحيات حسب الدور:
```
📊 Admin: 46 صلاحية (كل شيء)
📊 Manager: 36 صلاحية (كل شيء إلا Users & Dangerous DB ops)
📊 Engineer: 18 صلاحية (Create & Edit فقط)
📊 Viewer: 11 صلاحية (View فقط)
```

---

## 🚀 جاهز للاستخدام!

النظام محدث بالكامل ويدعم:
- ✅ Database Management
- ✅ Company Settings
- ✅ Holidays Management
- ✅ All new features

**افتح Users Management → Manage Permissions لرؤية التحديثات!** 🎯

---

**تاريخ التحديث:** 2025-10-09  
**الإصدار:** 2.0.0  
**الحالة:** ✅ محدث وجاهز


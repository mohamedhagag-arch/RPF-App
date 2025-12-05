# 📚 فهم شامل ومتكامل لمشروع AlRabat RPF

## 🎯 نظرة عامة على المشروع

**AlRabat RPF - Masters of Foundation Construction** هو نظام متقدم لإدارة المشاريع الإنشائية مبني على:
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

---

## 📁 هيكل المشروع

### 1. **الصفحات الرئيسية (app/(authenticated)/)**

#### 🏠 Dashboard (`/dashboard`)
- **الوصف**: لوحة تحكم رئيسية مع إحصائيات شاملة
- **الصلاحية المطلوبة**: `dashboard.view`
- **المكونات**: `IntegratedDashboard`
- **الميزات**:
  - إحصائيات المشاريع
  - تتبع الأداء
  - رسوم بيانية تفاعلية
  - نشاطات حديثة

#### 📂 Projects (`/projects`)
- **الوصف**: إدارة المشاريع الكاملة
- **الصلاحية المطلوبة**: `projects.view`
- **المكونات**: `ProjectsList`
- **الميزات**:
  - عرض جميع المشاريع
  - إنشاء/تعديل/حذف مشاريع
  - تصفية حسب الحالة، القسم، التاريخ
  - بحث متقدم
  - تصدير البيانات
  - عرض تفاصيل المشروع

#### 📋 BOQ Activities (`/boq`)
- **الوصف**: إدارة قائمة الكميات (Bill of Quantities)
- **الصلاحية المطلوبة**: `boq.view`
- **المكونات**: `BOQManagement`
- **الميزات**:
  - إدارة أنشطة BOQ
  - تتبع التقدم
  - حسابات تلقائية
  - ربط مع KPIs
  - تصدير/استيراد

#### 🎯 KPI Tracking (`/kpi`)
- **الوصف**: تتبع مؤشرات الأداء الرئيسية
- **الصلاحية المطلوبة**: `kpi.view`
- **المكونات**: `KPITracking`
- **الميزات**:
  - عرض KPIs (Planned & Actual)
  - إضافة KPIs يدوياً
  - تعديل/حذف KPIs
  - تصفية متقدمة
  - تقارير الأداء

#### 📊 KPI Add (`/kpi/add`)
- **الوصف**: نموذج إضافة KPI قياسي
- **الصلاحية المطلوبة**: `kpi.create`
- **المكونات**: `AddKPIForm`

#### ⚡ KPI Smart Form (`/kpi/smart-form`)
- **الوصف**: نموذج ذكي لإضافة KPIs متعددة
- **الصلاحية المطلوبة**: `kpi.create.smart`
- **الميزات**:
  - اختيار تاريخ عالمي
  - إضافة KPIs متعددة دفعة واحدة
  - معاينة قبل الحفظ

#### ✅ KPI Pending Approval (`/kpi/pending-approval`)
- **الوصف**: صفحة الموافقة على KPIs المعلقة
- **الصلاحية المطلوبة**: `kpi.need_to_submit`
- **الميزات**:
  - عرض KPIs المعلقة
  - الموافقة/الرفض
  - تعديل KPIs قبل الموافقة
  - تصفية متقدمة
  - رفض مع سبب
  - عرض KPIs المرفوضة

#### 📈 Reports (`/reports`)
- **الوصف**: تقارير شاملة
- **الصلاحية المطلوبة**: `reports.view`
- **المكونات**: `ModernReportsManager`
- **أنواع التقارير**:
  - تقارير يومية
  - تقارير أسبوعية
  - تقارير شهرية
  - تقارير مالية
  - تقارير Lookahead
  - تقارير الأنشطة المتأخرة
  - تقارير الأداء

#### ⚙️ Settings (`/settings`)
- **الوصف**: إعدادات النظام
- **الصلاحية المطلوبة**: `settings.view`
- **الأقسام**:
  - **General Settings**: إعدادات عامة
  - **Company Settings**: إعدادات الشركة (يتطلب `settings.company`)
  - **Companies**: إدارة الشركات (يتطلب `settings.manage`)
  - **Holidays**: إدارة العطلات (يتطلب `settings.holidays`)
  - **Custom Activities**: الأنشطة المخصصة (يتطلب `settings.activities`)
  - **Database Management**: إدارة قاعدة البيانات (يتطلب `database.manage`)
  - **User Management**: إدارة المستخدمين (يتطلب `users.view`)

#### 💰 Cost Control (`/cost-control`)
- **الوصف**: نظام التحكم في التكاليف
- **الصلاحية المطلوبة**: `reports.view`
- **الأقسام**:
  - **Overview**: نظرة عامة على التكاليف
  - **MANPOWER**: إدارة القوى العاملة (`/cost-control/manpower`)
  - **Designation Rates**: أسعار المسميات الوظيفية (`/cost-control/designation-rates`)
  - **Machine List**: قائمة الآلات (`/cost-control/machine-list`)
  - **Database Manager**: إدارة قاعدة البيانات (`/cost-control/database`)

#### 👥 HR (`/hr`)
- **الوصف**: إدارة الموارد البشرية
- **الصلاحية المطلوبة**: `reports.view`
- **الأقسام**:
  - **Manpower**: إدارة القوى العاملة (`/hr/manpower`)
  - **Attendance**: الحضور والانصراف (`/hr/attendance`)
  - **Check-In/Out**: تسجيل الحضور (`/hr/attendance/check-in-out`)
  - **Review Attendance**: مراجعة الحضور (`/hr/attendance/review`)

#### 📖 User Guide (`/user-guide`)
- **الوصف**: دليل المستخدم
- **الصلاحية المطلوبة**: `user_guide.view`
- **الميزات**:
  - عرض المقالات
  - البحث في الدليل
  - إدارة المقالات (للمديرين)

#### 📝 Activity Log (`/activity-log`)
- **الوصف**: سجل النشاطات
- **الصلاحية المطلوبة**: `activity_log.view` (Admin only)
- **الميزات**:
  - عرض جميع النشاطات
  - تصفية حسب المستخدم، التاريخ، النوع

#### 👤 Profile (`/profile`)
- **الوصف**: الملف الشخصي
- **الميزات**:
  - عرض/تعديل المعلومات الشخصية
  - QR Code للملف الشخصي
  - مشاركة الملف الشخصي

#### 📞 Directory (`/directory`)
- **الوصف**: دليل الموظفين
- **الصلاحية المطلوبة**: `directory.view`
- **الميزات**:
  - عرض جميع الموظفين
  - البحث والتصفية
  - عرض تفاصيل الموظف
  - تصدير الدليل

#### 🏗️ Projects Zones (`/projects/zones`)
- **الوصف**: إدارة مناطق المشاريع
- **الصلاحية المطلوبة**: `projects.zones`

---

## 🔐 نظام الصلاحيات

### الأدوار (Roles)
1. **Admin**: جميع الصلاحيات
2. **Manager**: صلاحيات إدارية (عدا إدارة المستخدمين والنظام)
3. **Engineer**: صلاحيات محدودة (إنشاء/تعديل KPIs و BOQ)
4. **Viewer**: صلاحيات عرض فقط

### الصلاحيات (54 صلاحية في 8 فئات)

#### 1. Dashboard
- `dashboard.view`

#### 2. Projects
- `projects.view`, `projects.create`, `projects.edit`, `projects.delete`
- `projects.export`, `projects.import`, `projects.print`
- `projects.zones`

#### 3. BOQ
- `boq.view`, `boq.create`, `boq.edit`, `boq.delete`
- `boq.approve`, `boq.export`, `boq.import`, `boq.print`

#### 4. KPI
- `kpi.view`, `kpi.create`, `kpi.create.standard`, `kpi.create.smart`
- `kpi.edit`, `kpi.delete`, `kpi.export`, `kpi.import`, `kpi.print`
- `kpi.approve`, `kpi.need_to_submit`

#### 5. Reports
- `reports.view`, `reports.daily`, `reports.weekly`, `reports.monthly`
- `reports.financial`, `reports.export`, `reports.print`
- `reports.lookahead`, `reports.critical`, `reports.performance`, `reports.custom`

#### 6. Settings
- `settings.view`, `settings.company`, `settings.divisions`
- `settings.project_types`, `settings.currencies`, `settings.activities`
- `settings.holidays` (مع sub-permissions)

#### 7. Users
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `users.permissions`, `users.roles`, `users.groups`
- `users.bulk`, `users.import`, `users.export`

#### 8. System
- `system.export`, `system.backup`, `system.restore`
- `system.manage`, `system.search`

### نظام الصلاحيات المخصصة
- يمكن تفعيل صلاحيات مخصصة لكل مستخدم
- Admin يحتفظ بصلاحيات حرجة حتى مع تفعيل الصلاحيات المخصصة

---

## 🗄️ قاعدة البيانات

### الجداول الرئيسية

#### 1. **Planning Database - ProjectsList**
- **الوصف**: جدول المشاريع
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `project_code`, `project_sub_code`, `project_full_code`
  - `project_name`, `project_description`
  - `project_type`, `responsible_division`
  - `contract_amount`, `currency`
  - `project_status`
  - `project_start_date`, `project_completion_date`
  - `created_at`, `updated_at`, `created_by`

#### 2. **Planning Database - BOQ Rates**
- **الوصف**: جدول أنشطة BOQ
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `project_id`, `project_code`, `project_full_code`
  - `activity`, `activity_division`, `activity_name`
  - `unit`, `zone_ref`, `zone_number`
  - `total_units`, `planned_units`, `actual_units`
  - `rate`, `total_value`, `planned_value`, `earned_value`
  - `activity_progress_percentage`
  - `planned_activity_start_date`, `deadline`
  - `activity_timing` (pre-commencement/post-commencement/post-completion)
  - `use_virtual_material` (boolean)

#### 3. **Planning Database - KPI**
- **الوصف**: جدول موحد لجميع KPIs (Planned & Actual)
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `project_id`, `activity_id`
  - `project_full_code`, `project_code`, `project_sub_code`
  - `activity_name`, `activity`
  - `quantity`, `unit`, `value`
  - `input_type` ('Planned' | 'Actual')
  - `target_date` (لـ Planned)
  - `actual_date` (لـ Actual)
  - `activity_date` (تاريخ موحد)
  - `zone`, `section`
  - `activity_timing`
  - `approval_status` ('pending' | 'approved' | 'rejected')
  - `created_at`, `updated_at`, `created_by`

#### 4. **users**
- **الوصف**: جدول المستخدمين
- **الأعمدة الرئيسية**:
  - `id` (UUID, FK to auth.users)
  - `email`, `full_name`, `first_name`, `last_name`
  - `role` ('admin' | 'manager' | 'engineer' | 'viewer')
  - `division`
  - `permissions` (TEXT[])
  - `custom_permissions_enabled` (BOOLEAN)
  - `is_active` (BOOLEAN)
  - `created_at`, `updated_at`

#### 5. **attendance_employees**
- **الوصف**: جدول الموظفين للحضور
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `employee_code` (UNIQUE)
  - `name`, `job_title`, `department`
  - `phone_number`, `email`
  - `profile_pic_url`
  - `status` ('Active' | 'Inactive')
  - `user_id` (FK to auth.users)
  - `qr_code` (QR code للموظف)

#### 6. **attendance_records**
- **الوصف**: جدول سجلات الحضور
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `employee_id` (FK)
  - `check_time` (TIME)
  - `date` (DATE)
  - `type` ('Check-In' | 'Check-Out')
  - `location_id` (FK)
  - `latitude`, `longitude`
  - `notes`
  - `work_duration_hours`
  - `is_late`, `is_early`
  - `created_at`, `created_by`, `updated_by`

#### 7. **attendance_locations**
- **الوصف**: جدول مواقع الحضور
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `name`
  - `latitude`, `longitude`
  - `radius_meters`
  - `description`
  - `is_active`, `is_favorite`

#### 8. **attendance_settings**
- **الوصف**: إعدادات نظام الحضور
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `key`, `value`, `description`

#### 9. **company_settings**
- **الوصف**: إعدادات الشركة
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `company_name`, `company_slogan`
  - `company_logo_url`
  - `created_at`, `updated_at`

#### 10. **holidays**
- **الوصف**: جدول العطلات
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `date`, `name`, `description`
  - `is_recurring`, `is_active`
  - `created_by`

#### 11. **CCD - MANPOWER**
- **الوصف**: جدول القوى العاملة (Cost Control)
- **الأعمدة**: ديناميكية (تختلف حسب البيانات المستوردة)

#### 12. **hr_manpower**
- **الوصف**: جدول القوى العاملة (HR)
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `employee_code`, `employee_name`
  - `designation`, `status`
  - `department`, `phone_number`, `email`
  - `hire_date`, `notes`

#### 13. **designation_rates**
- **الوصف**: جدول أسعار المسميات الوظيفية
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `designation`
  - `hourly_rate`, `overtime_hourly_rate`, `off_day_hourly_rate`
  - `authority`

#### 14. **machine_list**
- **الوصف**: جدول قائمة الآلات
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `code`, `name`
  - `rate`, `machine_full_name`
  - `rental`

#### 15. **machinery_day_rates**
- **الوصف**: جدول أسعار الآلات اليومية
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `code`, `description`
  - `rate`, `efficiency`

#### 16. **kpi_rejected**
- **الوصف**: جدول KPIs المرفوضة (تخزين مؤقت)
- **الأعمدة**: مشابهة لجدول KPI مع حقول إضافية للرفض

#### 17. **user_activities**
- **الوصف**: جدول نشاطات المستخدمين
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `user_id` (FK)
  - `action`, `entity`, `entity_id`
  - `page_path`, `page_title`
  - `description`, `metadata`
  - `is_active` (للمستخدمين النشطين)
  - `last_activity_at`, `session_id`
  - `created_at`

#### 18. **backup_settings**
- **الوصف**: إعدادات النسخ الاحتياطي
- **الأعمدة الرئيسية**:
  - `id` (UUID)
  - `storage_location` ('google_drive' | 'local')
  - `frequency` ('daily' | 'weekly' | 'monthly')
  - `is_active`
  - `google_drive_folder_id`
  - `last_backup_at`

#### 19. **divisions**
- **الوصف**: جدول الأقسام
- **الأعمدة**: `id`, `name`, `name_arabic`, `description`, etc.

#### 20. **departments**
- **الوصف**: جدول الأقسام/الإدارات
- **الأعمدة**: `id`, `name`, `name_arabic`, `description`, etc.

#### 21. **job_titles**
- **الوصف**: جدول المسميات الوظيفية
- **الأعمدة**: `id`, `name`, `name_arabic`, `description`, etc.

#### 22. **currencies**
- **الوصف**: جدول العملات
- **الأعمدة**: `id`, `code`, `name`, `symbol`, `is_default`, etc.

#### 23. **project_types**
- **الوصف**: جدول أنواع المشاريع
- **الأعمدة**: `id`, `name`, `description`, `activities` (JSONB)

#### 24. **user_guide_articles**
- **الوصف**: جدول مقالات دليل المستخدم
- **الأعمدة**: `id`, `title`, `content`, `category`, `difficulty`, etc.

---

## 🔌 API Routes

### `/api/users/activity`
- **GET**: الحصول على المستخدمين النشطين
- **POST**: تحديث نشاط المستخدم (heartbeat)

### `/api/users/delete`
- **DELETE**: حذف مستخدم

### `/api/activity/cleanup`
- **POST**: تنظيف النشاطات القديمة (أكثر من 7 أيام)

### `/api/cron/cleanup-activities`
- **GET**: Cron job لتنظيف النشاطات (يومياً)

### `/api/cron/daily-backup`
- **GET**: Cron job للنسخ الاحتياطي اليومي

### `/api/backup/google-drive`
- **POST**: إنشاء نسخة احتياطية ورفعها إلى Google Drive

### `/api/backup/settings`
- **GET**: الحصول على إعدادات النسخ الاحتياطي
- **POST**: تحديث إعدادات النسخ الاحتياطي

### `/api/test-backup`
- **POST**: اختبار النسخ الاحتياطي

---

## 🎨 المكونات الرئيسية (Components)

### Authentication (`components/auth/`)
- `LoginForm`: نموذج تسجيل الدخول
- `ProfileCompletionModal`: إكمال الملف الشخصي
- `ProfileCompletionWrapper`: wrapper لإكمال الملف الشخصي
- `SessionManager`: إدارة الجلسات

### Dashboard (`components/dashboard/`)
- `IntegratedDashboard`: لوحة التحكم المتكاملة
- `ModernSidebar`: الشريط الجانبي الحديث
- `DashboardCharts`: الرسوم البيانية
- `SmartDashboardStats`: إحصائيات ذكية
- `RecentActivityFeed`: نشاطات حديثة

### Projects (`components/projects/`)
- `ProjectsList`: قائمة المشاريع
- `ProjectForm`: نموذج المشروع
- `IntelligentProjectForm`: نموذج ذكي للمشروع
- `ProjectCard`: بطاقة المشروع
- `ProjectsTable`: جدول المشاريع

### BOQ (`components/boq/`)
- `BOQManagement`: إدارة BOQ
- `BOQForm`: نموذج BOQ
- `IntelligentBOQForm`: نموذج ذكي لـ BOQ
- `SmartBOQForm`: نموذج BOQ ذكي
- `BOQTable`: جدول BOQ
- `BOQActivityCard`: بطاقة نشاط BOQ

### KPI (`components/kpi/`)
- `KPITracking`: تتبع KPIs
- `AddKPIForm`: نموذج إضافة KPI
- `SmartKPIForm`: نموذج KPI ذكي
- `SmartActualKPIForm`: نموذج Actual KPI ذكي
- `KPITable`: جدول KPIs
- `KPIEditModal`: نافذة تعديل KPI
- `BulkEditKPIModal`: نافذة تعديل KPIs متعددة

### Reports (`components/reports/`)
- `ModernReportsManager`: مدير التقارير الحديث
- `ActivityPeriodicalProgressReportView`: تقرير التقدم الدوري
- `DelayedActivitiesReportView`: تقرير الأنشطة المتأخرة
- `KPICChartReportView`: تقرير KPI Chart
- `ProjectTimelineView`: عرض الجدول الزمني للمشروع

### Settings (`components/settings/`)
- `SettingsPage`: صفحة الإعدادات
- `CompanySettings`: إعدادات الشركة
- `HolidaysSettings`: إعدادات العطلات
- `CustomActivitiesManager`: مدير الأنشطة المخصصة
- `DatabaseManagement`: إدارة قاعدة البيانات

### Cost Control (`components/cost-control/`)
- `CostControlOverview`: نظرة عامة على التكاليف
- `CostControlManpower`: إدارة القوى العاملة
- `CostControlDatabase`: إدارة قاعدة البيانات
- `DesignationRates`: أسعار المسميات الوظيفية
- `MachineList`: قائمة الآلات
- `MachineryDayRates`: أسعار الآلات اليومية

### HR (`components/hr/`)
- `HRAttendance`: نظام الحضور HR
- مكونات الحضور المختلفة

### Users (`components/users/`)
- `UserManagement`: إدارة المستخدمين
- `AdvancedPermissionsManager`: مدير الصلاحيات المتقدم
- `UserCard`: بطاقة المستخدم
- `UserProfile`: الملف الشخصي

### UI (`components/ui/`)
- مكونات واجهة مستخدم قابلة لإعادة الاستخدام
- `Button`, `Card`, `Modal`, `Table`, `Input`, etc.

---

## 🔧 الميزات الرئيسية

### 1. نظام إدارة المشاريع
- إنشاء/تعديل/حذف مشاريع
- تتبع حالة المشروع
- إدارة مناطق المشروع
- ربط المشاريع بالأنشطة وال KPIs

### 2. نظام BOQ
- إدارة أنشطة BOQ
- تتبع التقدم
- حسابات تلقائية (القيمة، التقدم، الفروقات)
- ربط مع KPIs
- توليد KPIs تلقائياً من BOQ

### 3. نظام KPI
- إضافة KPIs (Planned & Actual)
- نماذج ذكية لإضافة KPIs متعددة
- نظام الموافقة على KPIs
- تعديل/حذف KPIs
- تتبع الأداء

### 4. نظام التقارير
- تقارير يومية/أسبوعية/شهرية
- تقارير مالية
- تقارير Lookahead
- تقارير الأنشطة المتأخرة
- تقارير الأداء
- تصدير التقارير (PDF, Excel)

### 5. نظام الحضور والانصراف
- تسجيل الحضور/الانصراف
- تتبع GPS
- مراجعة الحضور
- إحصائيات الحضور
- QR Code للموظفين

### 6. نظام التحكم في التكاليف
- إدارة القوى العاملة
- أسعار المسميات الوظيفية
- قائمة الآلات
- أسعار الآلات اليومية
- إحصائيات التكاليف

### 7. نظام إدارة المستخدمين
- إنشاء/تعديل/حذف مستخدمين
- نظام صلاحيات متقدم (54 صلاحية)
- أدوار مخصصة
- صلاحيات مخصصة لكل مستخدم
- إدارة الأقسام والمسميات الوظيفية

### 8. نظام النسخ الاحتياطي
- نسخ احتياطي تلقائي
- رفع إلى Google Drive
- جدولة النسخ الاحتياطي
- استعادة البيانات

### 9. نظام تتبع النشاطات
- تتبع جميع نشاطات المستخدمين
- عرض المستخدمين النشطين
- سجل النشاطات
- تنظيف تلقائي للنشاطات القديمة

### 10. نظام دليل المستخدم
- مقالات دليل المستخدم
- بحث في الدليل
- إدارة المقالات (للمديرين)

---

## 🎯 الأزرار والوظائف الرئيسية

### في Dashboard
- عرض الإحصائيات
- التنقل بين الصفحات
- البحث السريع

### في Projects
- **إنشاء مشروع جديد**: زر "New Project"
- **تعديل مشروع**: زر Edit
- **حذف مشروع**: زر Delete
- **تصدير**: زر Export
- **استيراد**: زر Import
- **تصفية**: أزرار Filter
- **بحث**: حقل Search

### في BOQ
- **إضافة نشاط**: زر "Add Activity"
- **تعديل نشاط**: زر Edit
- **حذف نشاط**: زر Delete
- **توليد KPIs**: زر "Generate KPIs"
- **تصدير/استيراد**: أزرار Export/Import
- **تصفية**: أزرار Filter

### في KPI
- **إضافة KPI**: زر "Add KPI"
- **إضافة KPI ذكي**: زر "Smart Form"
- **تعديل KPI**: زر Edit
- **حذف KPI**: زر Delete
- **الموافقة**: زر Approve (في صفحة Pending Approval)
- **الرفض**: زر Reject (في صفحة Pending Approval)
- **تصدير**: زر Export
- **تصفية**: أزرار Filter

### في Reports
- **إنشاء تقرير**: اختيار نوع التقرير
- **تصدير PDF**: زر Export PDF
- **تصدير Excel**: زر Export Excel
- **طباعة**: زر Print
- **تصفية**: أزرار Filter

### في Settings
- **حفظ الإعدادات**: زر Save
- **إعادة تعيين**: زر Reset
- **إدارة المستخدمين**: تبويب Users
- **إدارة قاعدة البيانات**: تبويب Database

### في Cost Control
- **استيراد بيانات**: زر Import
- **تصدير بيانات**: زر Export
- **إضافة سجل**: زر Add
- **تعديل سجل**: زر Edit
- **حذف سجل**: زر Delete

### في HR
- **تسجيل حضور**: زر Check-In
- **تسجيل انصراف**: زر Check-Out
- **مراجعة الحضور**: زر Review
- **إضافة موظف**: زر Add Employee
- **تعديل موظف**: زر Edit

---

## 🔒 الأمان والحماية

### Row Level Security (RLS)
- جميع الجداول محمية بـ RLS
- سياسات وصول مخصصة لكل جدول
- فحص الصلاحيات على مستوى الصف

### Authentication
- Supabase Auth
- جلسات آمنة
- تحديث تلقائي للجلسات
- إدارة الجلسات المتعددة

### Authorization
- نظام صلاحيات متقدم
- فحص الصلاحيات على كل صفحة
- فحص الصلاحيات على كل زر
- حماية API routes

---

## 📊 الأداء والتحسينات

### Connection Management
- Stable connection manager
- Fast connection manager
- إدارة الاتصالات المتعددة
- إعادة الاتصال التلقائي

### Caching
- Company settings caching
- User permissions caching
- Query result caching

### Optimization
- Lazy loading
- Pagination
- Virtual scrolling
- Code splitting

---

## 🚀 النشر (Deployment)

### Vercel
- النشر التلقائي من GitHub
- Environment variables
- Cron jobs
- Edge functions

### Database
- Supabase PostgreSQL
- Migrations
- Backups

---

## 📝 الملاحظات المهمة

1. **نظام KPI الموحد**: جميع KPIs (Planned & Actual) في جدول واحد
2. **نظام الصلاحيات المرن**: صلاحيات مخصصة لكل مستخدم
3. **نظام الحضور المتقدم**: مع GPS tracking
4. **نظام النسخ الاحتياطي**: تلقائي مع Google Drive
5. **نظام تتبع النشاطات**: لتتبع جميع الإجراءات
6. **واجهة مستخدم حديثة**: مع Dark mode
7. **تصدير/استيراد**: دعم CSV, Excel, JSON
8. **تقارير متقدمة**: مع تصدير PDF

---

## 🎓 الخلاصة

هذا مشروع شامل ومتكامل لإدارة المشاريع الإنشائية مع:
- ✅ نظام إدارة مشاريع كامل
- ✅ نظام BOQ متقدم
- ✅ نظام KPI شامل
- ✅ نظام تقارير متعدد
- ✅ نظام حضور وانصراف
- ✅ نظام تحكم في التكاليف
- ✅ نظام إدارة مستخدمين متقدم
- ✅ نظام صلاحيات مرن
- ✅ قاعدة بيانات منظمة
- ✅ API routes محمية
- ✅ واجهة مستخدم حديثة

**الإصدار**: 3.0.14  
**آخر تحديث**: ديسمبر 2024


# فهم شامل لمشروع AlRabat RPF - نظام إدارة المشاريع والمؤشرات

## 📋 نظرة عامة على المشروع

**AlRabat RPF** هو نظام متقدم لإدارة المشاريع الإنشائية يتخصص في:
- إدارة مشاريع البنية التحتية والأساسات
- تتبع مؤشرات الأداء الرئيسية (KPI)
- إدارة كشوف الكميات (BOQ)
- تتبع التقدم المالي والزمني للمشاريع
- إدارة الصلاحيات والأدوار المتقدمة

**الرابط المباشر:** https://alrabat-rpf.vercel.app  
**التقنيات المستخدمة:** Next.js 14, React 18, TypeScript, Supabase (PostgreSQL), Tailwind CSS

---

## 🗄️ قاعدة بيانات Supabase - البنية الكاملة

### الجداول الرئيسية (Main Tables)

#### 1. **Planning Database - ProjectsList** (جدول المشاريع)
```sql
الغرض: تخزين جميع معلومات المشاريع

الأعمدة الرئيسية:
- Project Code: رمز المشروع (فريد)
- Project Sub-Code: الرمز الفرعي
- Project Name: اسم المشروع
- Project Type: نوع المشروع
- Responsible Division: القسم المسؤول
- Project Status: حالة المشروع
  (upcoming, site-preparation, on-going, completed, on-hold, cancelled)
- Contract Amount: قيمة العقد
- Currency: العملة (افتراضي: AED)
- Client Name: اسم العميل
- Consultant Name: اسم الاستشاري
- Project Manager Email: إيميل مدير المشروع
- Area Manager Email: إيميل مدير المنطقة
- Date Project Awarded: تاريخ منح المشروع
- Latitude/Longitude: الإحداثيات الجغرافية
- Work Programme: برنامج العمل
- Contract Status: حالة العقد
```

**حالات المشروع المتاحة:**
- `upcoming`: قادم
- `site-preparation`: إعداد الموقع
- `on-going`: جاري
- `completed`: مكتمل
- `completed-duration`: مكتمل بالمدّة
- `contract-duration`: مدة العقد
- `on-hold`: متوقف
- `cancelled`: ملغي

---

#### 2. **Planning Database - BOQ Rates** (جدول أنشطة BOQ)
```sql
الغرض: تخزين جميع أنشطة كشوف الكميات وتتبع تقدمها

الأعمدة الرئيسية:
- Activity: اسم النشاط
- Activity Name: اسم النشاط (معياري)
- Activity Division: قسم النشاط
- Unit: وحدة القياس (Cu.M, Running Meter, etc.)
- Zone Ref: مرجع المنطقة
- Zone Number: رقم المنطقة

📏 الكميات:
- Total Units: إجمالي الوحدات المخططة
- Planned Units: الوحدات المخططة للفترة
- Actual Units: الوحدات الفعلية المنجزة
- Difference: الفرق (Actual - Planned)
- Variance Units: التباين في الوحدات

💰 القيم المالية:
- Rate: سعر الوحدة
- Total Value: القيمة الإجمالية
- Planned Value: القيمة المخططة
- Earned Value: القيمة المكتسبة
- Remaining Work Value: القيمة المتبقية
- Variance Works Value: التباين في القيمة

📅 التواريخ والمدد:
- Planned Activity Start Date: تاريخ بدء النشاط المخطط
- Deadline: الموعد النهائي
- Activity Planned Start Date: تاريخ البدء المخطط
- Activity Planned Completion Date: تاريخ الإنجاز المخطط
- Activity Actual Start Date: تاريخ البدء الفعلي
- Activity Actual Completion Date: تاريخ الإنجاز الفعلي
- Calendar Duration: المدة التقويمية

📊 التقدم والأداء:
- Activity Progress %: نسبة تقدم النشاط
- Planned Progress %: نسبة التقدم المخطط
- Delay %: نسبة التأخير
- Productivity Daily Rate: معدل الإنتاجية اليومي

✅ الحالات:
- Activity Completed: مكتمل؟
- Activity Delayed: متأخر؟
- Activity On Track: على المسار الصحيح؟
- Activity Planned Status: حالة النشاط المخطط
- Activity Actual Status: حالة النشاط الفعلي

🎯 Activity Timing (توقيت النشاط):
- pre-commencement: قبل البدء
- post-commencement: بعد البدء
- post-completion: بعد الإنجاز

- Has Value: له قيمة مالية؟
- Affects Timeline: يؤثر على الجدول الزمني؟
```

---

#### 3. **Planning Database - KPI** (جدول موحد للمؤشرات)
```sql
الغرض: جدول واحد لجميع مؤشرات الأداء (المخططة والفعلية)

✨ الميزة الرئيسية: جدول موحد يحتوي على Planned و Actual في نفس المكان
يتم التمييز بينهما باستخدام عمود "Input Type"

الأعمدة الرئيسية:
- Project Full Code: رمز المشروع الكامل
- Project Code: رمز المشروع
- Project Sub Code: الرمز الفرعي
- Activity Name: اسم النشاط
- Activity: اسم النشاط (للتوافق)

🎯 Input Type: نوع السجل
  - "Planned": مخططة
  - "Actual": فعلية

📏 الكميات:
- Quantity: الكمية
- Unit: وحدة القياس
- Drilled Meters: أمتار الحفر (للحفر)

💰 القيمة المالية:
- Value: القيمة المالية للنشاط
  (يتم حسابها تلقائياً: Quantity × Rate)

📅 التواريخ:
- Target Date: التاريخ المستهدف (للمخططة)
- Actual Date: التاريخ الفعلي (للفعلية)
- Activity Date: التاريخ الموحد
- Day: اليوم المرجعي (Day 5 - Monday)

📍 الموقع:
- Zone: المنطقة
- Section: القسم

👤 المسؤول:
- Recorded By: سجل بواسطة (للفعلية فقط)

📝 ملاحظات:
- Notes: ملاحظات
- Approval Status: حالة الموافقة
- Approved By: وافق عليه
```

**كيف يعمل الجدول الموحد:**
```typescript
// KPI مخططة
{
  "Input Type": "Planned",
  "Target Date": "2025-10-15",
  "Quantity": "100",
  "Value": "15000"
}

// KPI فعلية
{
  "Input Type": "Actual",
  "Actual Date": "2025-10-16",
  "Quantity": "95",
  "Value": "14250",
  "Recorded By": "engineer@company.com"
}
```

---

#### 4. **users** (جدول المستخدمين)
```sql
الغرض: إدارة المستخدمين والصلاحيات

الأعمدة:
- id: UUID (مرتبط بـ auth.users)
- email: البريد الإلكتروني (فريد)
- full_name: الاسم الكامل
- first_name: الاسم الأول (اختياري)
- last_name: اسم العائلة (اختياري)
- role: الدور (admin, manager, engineer, viewer, planner)
- division: القسم
- permissions: TEXT[] - مصفوفة من أرقام الصلاحيات
- custom_permissions_enabled: BOOLEAN
  - false: استخدام صلاحيات الدور الافتراضية
  - true: استخدام الصلاحيات المخصصة فقط
- is_active: نشط؟
- created_at: تاريخ الإنشاء
- updated_at: تاريخ التحديث
```

**الأدوار المتاحة:**
- `admin`: مدير النظام - كل الصلاحيات
- `manager`: مدير - إدارة المشاريع والأنشطة (بدون إدارة المستخدمين)
- `engineer`: مهندس - إنشاء وتعديل الأنشطة والمؤشرات
- `viewer`: مشاهد - عرض فقط
- `planner`: مخطط - يمكنه الموافقة على Planned KPIs

---

#### 5. **divisions** (جدول الأقسام)
```sql
الغرض: إدارة أقسام الشركة

- name: اسم القسم
- code: رمز القسم
- description: الوصف
- is_active: نشط؟
- usage_count: عدد مرات الاستخدام
```

---

#### 6. **project_types** (أنواع المشاريع)
```sql
الغرض: أنواع المشاريع المتاحة

- name: اسم النوع
- code: الرمز
- description: الوصف
- is_active: نشط؟
- usage_count: عدد مرات الاستخدام
```

---

#### 7. **currencies** (العملات)
```sql
الغرض: العملات المدعومة

- code: رمز العملة (AED, USD, EUR)
- name: اسم العملة
- symbol: الرمز ($, €, د.إ)
- exchange_rate: سعر الصرف
- is_default: افتراضي؟
- is_active: نشط؟
```

---

#### 8. **holidays** (العطلات)
```sql
الغرض: إدارة العطلات وأيام العمل

- date: تاريخ العطلة
- name: اسم العطلة
- description: الوصف
- is_recurring: متكررة؟
- is_active: نشط؟
- created_by: منشئ السجل
```

---

#### 9. **company_settings** (إعدادات الشركة)
```sql
الغرض: إعدادات الشركة العامة

- key: المفتاح
- value: القيمة
- description: الوصف
```

---

#### 10. **departments** (الأقسام)
```sql
الغرض: أقسام الشركة

- name: الاسم (عربي/إنجليزي)
- name_arabic: الاسم العربي
- code: الرمز
- is_active: نشط؟
```

---

#### 11. **job_titles** (المسميات الوظيفية)
```sql
الغرض: المسميات الوظيفية

- name: الاسم (عربي/إنجليزي)
- name_arabic: الاسم العربي
- department_id: معرف القسم
- is_active: نشط؟
```

---

## 🔐 نظام الصلاحيات المتقدم

### الصلاحيات المتاحة (54 صلاحية في 8 فئات)

#### 1. **Dashboard Permissions**
- `dashboard.view`: عرض لوحة التحكم

#### 2. **Projects Permissions**
- `projects.view`: عرض المشاريع
- `projects.create`: إنشاء مشاريع
- `projects.edit`: تعديل المشاريع
- `projects.delete`: حذف المشاريع
- `projects.export`: تصدير بيانات المشاريع

#### 3. **BOQ Permissions**
- `boq.view`: عرض الأنشطة
- `boq.create`: إنشاء أنشطة
- `boq.edit`: تعديل الأنشطة
- `boq.delete`: حذف الأنشطة
- `boq.approve`: الموافقة على الأنشطة
- `boq.export`: تصدير بيانات BOQ

#### 4. **KPI Permissions**
- `kpi.view`: عرض المؤشرات
- `kpi.create`: إنشاء مؤشرات
- `kpi.edit`: تعديل المؤشرات
- `kpi.delete`: حذف المؤشرات
- `kpi.export`: تصدير بيانات KPI
- `kpi.approve`: الموافقة على المؤشرات الفعلية

#### 5. **Reports Permissions**
- `reports.view`: عرض التقارير
- `reports.daily`: التقارير اليومية
- `reports.weekly`: التقارير الأسبوعية
- `reports.monthly`: التقارير الشهرية
- `reports.financial`: التقارير المالية
- `reports.export`: تصدير التقارير
- `reports.print`: طباعة التقارير
- `reports.lookahead`: تقارير Lookahead
- `reports.critical`: تقارير المسار الحرج
- `reports.performance`: تقارير الأداء
- `reports.custom`: تقارير مخصصة

#### 6. **Users Permissions**
- `users.view`: عرض المستخدمين
- `users.create`: إنشاء مستخدمين
- `users.edit`: تعديل المستخدمين
- `users.delete`: حذف المستخدمين
- `users.permissions`: إدارة الصلاحيات
- `users.roles`: إدارة الأدوار
- `users.groups`: إدارة المجموعات
- `users.bulk`: عمليات مجمعة
- `users.import`: استيراد مستخدمين
- `users.export`: تصدير بيانات المستخدمين

#### 7. **Settings Permissions**
- `settings.view`: عرض الإعدادات
- `settings.company`: إدارة إعدادات الشركة
- `settings.divisions`: إدارة الأقسام
- `settings.project_types`: إدارة أنواع المشاريع
- `settings.currencies`: إدارة العملات
- `settings.activities`: إدارة قوالب الأنشطة
- `settings.holidays`: إدارة العطلات
  - `settings.holidays.view`
  - `settings.holidays.create`
  - `settings.holidays.edit`
  - `settings.holidays.delete`

#### 8. **System Permissions**
- `system.import`: استيراد البيانات
- `system.export`: تصدير البيانات
- `system.backup`: النسخ الاحتياطي
- `system.audit`: عرض سجلات التدقيق
- `system.search`: البحث الشامل

### الصلاحيات الافتراضية للأدوار

#### **Admin (كل الصلاحيات - 54)**
- جميع الصلاحيات في النظام

#### **Manager (~45 صلاحية)**
- كل شيء عدا:
  - إدارة المستخدمين الكاملة
  - العمليات الخطيرة على قاعدة البيانات

#### **Engineer (~30 صلاحية)**
- عرض المشاريع
- إنشاء وتعديل BOQ و KPI
- عرض التقارير
- لا يمكنه حذف المشاريع

#### **Viewer (~20 صلاحية)**
- عرض فقط (read-only)
- لا يمكنه إنشاء/تعديل/حذف

#### **Planner (~25 صلاحية)**
- عرض المشاريع والأنشطة
- الموافقة على Planned KPIs
- عرض التقارير

### نظام الصلاحيات المخصصة

```typescript
// إذا كان custom_permissions_enabled = true
// يستخدم فقط الصلاحيات المخصصة (حتى لو كان Admin)
if (user.custom_permissions_enabled) {
  return user.permissions // الصلاحيات المخصصة فقط
}

// إذا كان custom_permissions_enabled = false
// يستخدم صلاحيات الدور الافتراضية
return DEFAULT_ROLE_PERMISSIONS[user.role]
```

---

## 🎯 الميزات الرئيسية للنظام

### 1. **إدارة المشاريع (Projects Management)**

#### الوظائف المتاحة:
- ✅ إنشاء مشاريع جديدة مع معلومات كاملة
- ✅ تعديل معلومات المشاريع
- ✅ حذف المشاريع (مع Cascade Delete للأنشطة)
- ✅ تتبع حالة المشروع (8 حالات)
- ✅ إدارة العملات للمشاريع
- ✅ ربط المشاريع بالأقسام والأنواع
- ✅ تتبع الموقع الجغرافي (GPS)
- ✅ إدارة فريق المشروع (PM, Area Manager)
- ✅ عرض قائمة المشاريع مع تصفية وفرز متقدم

#### المكونات الرئيسية:
- `IntelligentProjectForm.tsx`: نموذج ذكي لإنشاء/تعديل المشاريع
- `ProjectsTableWithCustomization.tsx`: جدول المشاريع مع تخصيص الأعمدة
- `ProjectsList.tsx`: قائمة المشاريع

---

### 2. **إدارة BOQ (Bill of Quantities)**

#### الوظائف المتاحة:
- ✅ إنشاء أنشطة BOQ جديدة
- ✅ ربط الأنشطة بالمشاريع
- ✅ تتبع الكميات المخططة والفعلية
- ✅ حساب القيم المالية تلقائياً
- ✅ تتبع التقدم والنسب المئوية
- ✅ تحديد Activity Timing (pre/post commencement/completion)
- ✅ إدارة التواريخ (Start, End, Duration)
- ✅ حساب الإنتاجية اليومية
- ✅ تتبع الحفر (Drilled Meters)
- ✅ **توليد KPI تلقائياً** من أنشطة BOQ

#### المكونات الرئيسية:
- `IntelligentBOQForm.tsx`: نموذج ذكي لأنشطة BOQ
- `BOQTableWithCustomization.tsx`: جدول الأنشطة
- `BOQManagement.tsx`: إدارة BOQ

#### توليد KPI التلقائي:
```typescript
// عند إنشاء/تعديل نشاط BOQ:
1. يتم حساب أيام العمل بين تاريخي البدء والانتهاء
2. يتم توزيع الكمية (Planned Units) على أيام العمل
3. يتم إنشاء سجلات KPI مخططة لكل يوم عمل
4. كل سجل يحتوي على:
   - Quantity: الكمية المخططة لذلك اليوم
   - Target Date: تاريخ ذلك اليوم
   - Value: القيمة المالية (Quantity × Rate)
   - Input Type: "Planned"
```

---

### 3. **تتبع KPI (Key Performance Indicators)**

#### الوظائف المتاحة:
- ✅ عرض جميع KPIs (مخططة وفعلية)
- ✅ إنشاء KPIs مخططة يدوياً
- ✅ تسجيل KPIs فعلية
- ✅ موافقة على KPIs فعلية (للمديرين)
- ✅ تتبع التقدم مقابل المخطط
- ✅ حساب الفروقات والنسب المئوية
- ✅ عرض KPIs حسب التاريخ والمنطقة
- ✅ **نموذج ذكي** مع اختيار تاريخ شامل
- ✅ **عرض Day Order** (ترتيب الأيام)
- ✅ **حساب Activity Start Date** من أول KPI مخططة

#### المكونات الرئيسية:
- `KPITracking.tsx`: صفحة تتبع KPI الرئيسية
- `KPITableWithCustomization.tsx`: جدول KPIs
- `SmartKPIForm.tsx`: نموذج ذكي لإنشاء KPIs
- `KPITable.tsx`: عرض KPIs

#### كيفية عمل النظام:
```typescript
// KPIs المخططة:
// - يتم إنشاؤها تلقائياً من BOQ
// - أو يمكن إنشاؤها يدوياً
// - Input Type = "Planned"
// - تحتوي على Target Date

// KPIs الفعلية:
// - يتم إنشاؤها يدوياً من قبل المهندسين
// - Input Type = "Actual"
// - تحتوي على Actual Date
// - تحتاج موافقة إذا كان المستخدم ليس Admin/Manager
```

#### حساب تاريخ البدء التلقائي:
```typescript
// عند عرض نشاط BOQ:
1. يتم البحث عن أول KPI مخططة لهذا النشاط
2. يتم أخذ Target Date من أول KPI
3. يتم عرضه كـ Activity Start Date
4. إذا لم توجد KPI مخططة، يتم استخدام Planned Activity Start Date من BOQ
```

---

### 4. **لوحة التحكم (Dashboard)**

#### الوظائف المتاحة:
- ✅ عرض إحصائيات شاملة:
  - عدد المشاريع (الإجمالي، النشطة، المكتملة)
  - عدد الأنشطة (الإجمالي، المكتملة)
  - عدد KPIs (الإجمالي، المكتملة، المتأخرة)
  - القيمة المالية (المخططة، المكتسبة، المتبقية)
- ✅ رسوم بيانية:
  - توزيع المشاريع حسب الحالة
  - تقدم الأنشطة
  - أداء KPIs
  - الاتجاهات الزمنية
- ✅ تحليلات متقدمة:
  - تحليل الأداء
  - تحليل مالي
  - تحليل المخاطر
- ✅ تنبيهات ذكية:
  - مشاريع متأخرة
  - أنشطة تحتاج انتباه
  - KPIs متأخرة
- ✅ أحداث حديثة:
  - آخر التحديثات
  - آخر الأنشطة المكتملة
  - آخر KPIs المسجلة

#### المكونات الرئيسية:
- `IntegratedDashboard.tsx`: لوحة التحكم الرئيسية
- `DashboardOverview.tsx`: نظرة عامة
- `DataInsights.tsx`: رؤى البيانات
- `DashboardCharts.tsx`: الرسوم البيانية
- `SmartAlerts.tsx`: التنبيهات الذكية
- `AdvancedAnalytics.tsx`: التحليلات المتقدمة

---

### 5. **التقارير (Reports)**

#### أنواع التقارير المتاحة:
- ✅ **التقارير اليومية**: إنتاجية اليوم
- ✅ **التقارير الأسبوعية**: ملخص الأسبوع
- ✅ **التقارير الشهرية**: ملخص الشهر
- ✅ **التقارير المالية**: الأداء المالي
- ✅ **تقارير Lookahead**: التخطيط المستقبلي
- ✅ **تقارير المسار الحرج**: الأنشطة الحرجة
- ✅ **تقارير الأداء**: مقارنة المخطط مقابل الفعلي
- ✅ **تقارير مخصصة**: تقارير مخصصة حسب الحاجة

#### الوظائف:
- ✅ تصدير PDF
- ✅ تصدير Excel
- ✅ طباعة التقارير
- ✅ تصدير JSON/CSV

---

### 6. **الإعدادات (Settings)**

#### الأقسام المتاحة:
- ✅ **إعدادات الشركة**: معلومات الشركة
- ✅ **الأقسام**: إدارة الأقسام
- ✅ **أنواع المشاريع**: إدارة الأنواع
- ✅ **العملات**: إدارة العملات
- ✅ **قوالب الأنشطة**: إدارة قوالب الأنشطة
- ✅ **العطلات**: إدارة العطلات وأيام العمل
- ✅ **المستخدمين**: إدارة المستخدمين والصلاحيات
- ✅ **الأقسام**: إدارة أقسام الشركة
- ✅ **المسميات الوظيفية**: إدارة المسميات

#### وظائف إضافية:
- ✅ استيراد/تصدير البيانات
- ✅ إدارة الصلاحيات المخصصة
- ✅ إدارة الأدوار
- ✅ النسخ الاحتياطي

---

### 7. **إدارة المستخدمين**

#### الوظائف:
- ✅ عرض قائمة المستخدمين
- ✅ إنشاء مستخدمين جدد
- ✅ تعديل معلومات المستخدمين
- ✅ حذف المستخدمين
- ✅ إدارة الأدوار
- ✅ إدارة الصلاحيات المخصصة
- ✅ تفعيل/تعطيل المستخدمين
- ✅ مزامنة المستخدمين مع Supabase Auth
- ✅ دليل المستخدمين (Directory)
- ✅ ملفات تعريف المستخدمين مع QR Codes

---

### 8. **الاستيراد والتصدير**

#### البيانات القابلة للاستيراد/التصدير:
- ✅ المشاريع
- ✅ أنشطة BOQ
- ✅ KPIs
- ✅ الأقسام
- ✅ أنواع المشاريع
- ✅ العملات
- ✅ المستخدمين
- ✅ العطلات

#### الصيغ المدعومة:
- ✅ CSV
- ✅ Excel (XLSX)
- ✅ JSON

---

## 🔄 تدفق البيانات في النظام

### 1. **إنشاء مشروع جديد:**
```
المستخدم → IntelligentProjectForm
         → ProjectsList Component
         → Supabase: INSERT into "Planning Database - ProjectsList"
         ✅ المشروع محفوظ
```

### 2. **إنشاء نشاط BOQ:**
```
المستخدم → IntelligentBOQForm
         → يملأ: المشروع، النشاط، الكمية المخططة، التواريخ
         → يتم توليد KPI Preview تلقائياً (13 سجل يومي)
         → BOQManagement Component
         → Supabase: INSERT into "Planning Database - BOQ Rates"
         ✅ النشاط محفوظ
         
         إذا كان Auto-Generate KPIs مفعّل:
         → autoKPIGenerator.ts
         → generateKPIsFromBOQ()
         → توزيع الكمية على أيام العمل
         → saveGeneratedKPIs()
         → Supabase: INSERT into "Planning Database - KPI"
            WITH "Input Type" = "Planned"
         ✅ KPIs تم إنشاؤها
```

### 3. **عرض KPIs:**
```
المستخدم → يفتح صفحة /kpi
         → KPITracking Component
         → Supabase: SELECT * from "Planning Database - KPI"
         → تصفية حسب:
            - Project Code
            - Input Type (Planned/Actual)
            - Date Range
         ✅ KPIs معروضة
```

### 4. **إضافة KPI فعلي (يدوي):**
```
المستخدم → KPI Form
         → يختار: Input Type = "Actual"
         → KPITracking.handleCreateKPI()
         → Supabase: INSERT into "Planning Database - KPI"
            WITH "Input Type" = "Actual"
         ✅ KPI محفوظ
         
         إذا كان المستخدم ليس Admin/Manager:
         → يحتاج موافقة
         → يتم حفظه مع Approval Status = "Pending"
```

### 5. **تحديث Actual Units في BOQ:**
```
عند تحديث KPI فعلي:
→ syncBOQFromKPI()
→ يجمع كل KPIs الفعلية لنفس النشاط
→ يحسب مجموع الكميات
→ يحدث "Actual Units" في BOQ
✅ BOQ محدث تلقائياً
```

---

## 🔧 الميزات التقنية المتقدمة

### 1. **Row Level Security (RLS)**
- ✅ حماية على مستوى الصفوف في قاعدة البيانات
- ✅ كل مستخدم يرى فقط البيانات المسموح له برؤيتها
- ✅ سياسات أمان لكل جدول

### 2. **Connection Management**
- ✅ إدارة اتصالات Supabase محسّنة
- ✅ حل مشكلة فقدان الاتصال
- ✅ Connection pooling
- ✅ Fast query executor

### 3. **Caching System**
- ✅ تخزين مؤقت للبيانات المتكررة
- ✅ KPI Cache
- ✅ Projects Cache
- ✅ Smart cache invalidation

### 4. **Auto Calculations**
- ✅ حساب التقدم تلقائياً
- ✅ حساب القيم المالية
- ✅ حساب النسب المئوية
- ✅ حساب الفروقات
- ✅ حساب الإنتاجية

### 5. **Smart Date Calculations**
- ✅ حساب أيام العمل (استثناء العطلات)
- ✅ حساب Activity Start Date من أول KPI
- ✅ حساب المدد والجداول الزمنية
- ✅ عرض Day Order

### 6. **Data Mappers**
- ✅ تحويل البيانات بين قاعدة البيانات والتطبيق
- ✅ معالجة أسماء الأعمدة (مع المسافات)
- ✅ تحويل الأنواع (TEXT إلى NUMERIC)
- ✅ معالجة القيم الفارغة

### 7. **Permission Guards**
- ✅ حماية المكونات حسب الصلاحيات
- ✅ إخفاء/إظهار العناصر حسب الدور
- ✅ منع الوصول غير المصرح به

---

## 📊 البنية التقنية

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form
- **State Management**: React Hooks + Context

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Supabase REST API
- **Real-time**: Supabase Realtime (يمكن تفعيله)

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase Cloud
- **File Storage**: Supabase Storage (للصور والملفات)

---

## 🎨 واجهة المستخدم

### المكونات UI الأساسية:
- ✅ Cards: بطاقات المعلومات
- ✅ Tables: جداول قابلة للتخصيص
- ✅ Forms: نماذج ذكية
- ✅ Modals: نوافذ منبثقة
- ✅ Buttons: أزرار بألوان متعددة
- ✅ Inputs: حقول إدخال
- ✅ Selects: قوائم منسدلة
- ✅ Date Pickers: منتقي التواريخ
- ✅ Charts: رسوم بيانية
- ✅ Alerts: تنبيهات
- ✅ Loading Spinners: مؤشرات التحميل

### السمات (Themes):
- ✅ Dark Mode: وضع مظلم
- ✅ Light Mode: وضع فاتح
- ✅ Responsive: متجاوب مع جميع الشاشات

---

## 📈 الأداء والتحسينات

### التحسينات المطبقة:
- ✅ Lazy Loading: تحميل كسول
- ✅ Pagination: ترقيم الصفحات
- ✅ Query Optimization: تحسين الاستعلامات
- ✅ Connection Pooling: تجميع الاتصالات
- ✅ Caching: التخزين المؤقت
- ✅ Code Splitting: تقسيم الكود
- ✅ Image Optimization: تحسين الصور

### المراقبة:
- ✅ Performance Monitoring
- ✅ Error Tracking
- ✅ Usage Analytics

---

## 🔒 الأمان

### طبقات الأمان:
1. **Authentication**: مصادقة المستخدمين
2. **Authorization**: التحقق من الصلاحيات
3. **Row Level Security**: أمان على مستوى الصفوف
4. **Data Validation**: التحقق من صحة البيانات
5. **Input Sanitization**: تنظيف المدخلات
6. **HTTPS**: تشفير الاتصالات

---

## 📝 السكربتات المساعدة

### في مجلد `scripts/`:
- ✅ `import-data.js`: استيراد البيانات الأولية
- ✅ `sync-all-auth-users.js`: مزامنة المستخدمين
- ✅ `check-database-structure.js`: فحص بنية قاعدة البيانات
- ✅ `fix-permissions-flag.js`: إصلاح صلاحيات المستخدمين
- ✅ `test-kpi-generation-math.js`: اختبار حساب KPIs
- ✅ `performance-monitor.js`: مراقبة الأداء
- ✅ وعدة سكربتات أخرى للإدارة والصيانة

---

## 🚀 سير العمل اليومي

### للمهندس (Engineer):
1. تسجيل الدخول
2. عرض المشاريع المخصصة له
3. إنشاء/تعديل أنشطة BOQ
4. تسجيل KPIs فعلية يومياً
5. عرض التقارير اليومية

### للمدير (Manager):
1. تسجيل الدخول
2. عرض لوحة التحكم الشاملة
3. مراقبة تقدم جميع المشاريع
4. الموافقة على KPIs فعلية
5. إنشاء/تعديل المشاريع
6. عرض التقارير الشاملة
7. إدارة الإعدادات

### للمشاهد (Viewer):
1. تسجيل الدخول
2. عرض لوحة التحكم (قراءة فقط)
3. عرض المشاريع والأنشطة
4. عرض التقارير
5. لا يمكنه التعديل

---

## 📚 الملفات المهمة

### المكونات الرئيسية:
- `components/projects/`: مكونات إدارة المشاريع
- `components/boq/`: مكونات BOQ
- `components/kpi/`: مكونات KPI
- `components/dashboard/`: مكونات لوحة التحكم
- `components/settings/`: مكونات الإعدادات
- `components/auth/`: مكونات المصادقة

### المكتبات:
- `lib/supabase.ts`: تعريفات Supabase والأنواع
- `lib/dataMappers.ts`: محولات البيانات
- `lib/permissionsSystem.ts`: نظام الصلاحيات
- `lib/autoKPIGenerator.ts`: توليد KPI تلقائياً
- `lib/stableConnection.ts`: إدارة الاتصالات
- `lib/boqKpiSync.ts`: مزامنة BOQ و KPI

### قاعدة البيانات:
- `Database/`: جميع ملفات SQL والهجرات
- `Database/PRODUCTION_SCHEMA_COMPLETE.sql`: البنية الكاملة
- `Database/COMPLETE_SCHEMA_DOCUMENTATION.md`: توثيق شامل

---

## 🎯 الخلاصة

**AlRabat RPF** هو نظام متكامل ومتقدم لإدارة المشاريع الإنشائية يتضمن:

✅ **إدارة شاملة للمشاريع** مع تتبع كامل للحالات والتقدم  
✅ **نظام BOQ متقدم** مع توليد KPI تلقائي  
✅ **تتبع KPI دقيق** مع مقارنة المخطط مقابل الفعلي  
✅ **لوحة تحكم ذكية** مع تحليلات ورسوم بيانية  
✅ **نظام صلاحيات متقدم** مع 54 صلاحية قابلة للتخصيص  
✅ **تقارير شاملة** بمختلف الأنواع  
✅ **أمان متعدد الطبقات** مع RLS و Permission Guards  
✅ **أداء محسّن** مع caching و query optimization  

النظام مصمم خصيصاً لشركات البناء وإدارة المشاريع مع مراعاة أفضل الممارسات في الصناعة.

---

**الإصدار الحالي:** 3.0.14  
**تاريخ آخر تحديث:** ديسمبر 2024  
**الحالة:** جاهز للإنتاج ✅











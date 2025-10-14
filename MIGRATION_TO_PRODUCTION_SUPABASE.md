# 🚀 دليل الانتقال إلى Supabase الفعلي (Production Migration)

## 📋 نظرة عامة

هذا الدليل الشامل لنقل المشروع من حساب Supabase التجريبي إلى حساب الإنتاج الفعلي.

---

## ⚠️ قبل البدء - مهم جداً!

### ✅ التحقق من الجاهزية:
- [ ] لديك حساب Supabase جديد (أو ستنشئ واحد)
- [ ] لديك صلاحيات Admin في الحساب القديم
- [ ] قمت بعمل نسخة احتياطية كاملة من البيانات
- [ ] لديك وصول إلى Vercel Dashboard
- [ ] لديك صلاحيات تعديل على GitHub Repository

---

## 📊 المرحلة 1: تصدير البيانات من الحساب الحالي

### الخطوة 1.1: النسخ الاحتياطي الكامل

#### عبر الواجهة (أسهل):
```
1. افتح التطبيق على: http://localhost:3000
2. سجل دخول كـ Admin
3. اذهب إلى: Settings → Database Management
4. اضغط "Create Full Backup"
5. انتظر حتى يكتمل التحميل
6. احفظ الملف: database_backup_YYYY-MM-DD.json
7. احتفظ بنسخة في مكان آمن (Google Drive, Dropbox)
```

#### عبر Supabase Dashboard (احتياطي):
```
1. افتح https://supabase.com
2. اختر مشروعك الحالي
3. اذهب إلى: Database → Backups
4. اضغط "Create Backup"
5. أو استخدم: Table Editor → Export as CSV لكل جدول
```

### الخطوة 1.2: تصدير SQL Schema

```sql
-- في Supabase SQL Editor، نفذ هذا الأمر:
-- سيعطيك كل الـ schema

SELECT 
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE WHEN character_maximum_length IS NOT NULL 
             THEN '(' || character_maximum_length || ')' 
             ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'Planning Database - ProjectsList',
    'Planning Database - BOQ Rates',
    'Planning Database - KPI',
    'users',
    'divisions',
    'project_types',
    'currencies',
    'activities',
    'company_settings',
    'holidays'
  )
GROUP BY table_name;
```

احفظ النتيجة في ملف: `schema_backup.sql`

### الخطوة 1.3: تصدير RLS Policies

```sql
-- في Supabase SQL Editor:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public';
```

احفظ النتيجة في ملف: `rls_policies_backup.sql`

---

## 🆕 المرحلة 2: إنشاء مشروع Supabase جديد

### الخطوة 2.1: إنشاء المشروع

```
1. اذهب إلى: https://supabase.com/dashboard
2. اضغط "New Project"
3. املأ البيانات:
   - Project Name: "AlRabat RPF Production" (أو اسم مناسب)
   - Database Password: [اختر كلمة مرور قوية واحفظها!]
   - Region: اختر أقرب منطقة (مثل: Frankfurt لأوروبا/الشرق الأوسط)
   - Pricing Plan: 
     * Free: للتجربة (محدود)
     * Pro: للإنتاج الفعلي (موصى به) - $25/شهر
     * Team/Enterprise: للشركات الكبرى
4. اضغط "Create Project"
5. انتظر 2-3 دقائق حتى يكتمل الإنشاء
```

### الخطوة 2.2: الحصول على بيانات الاتصال

```
بعد إنشاء المشروع:

1. اذهب إلى: Settings → API
2. احفظ هذه البيانات في ملف آمن:

   ✅ Project URL:
   https://xxxxxxxxxxxxx.supabase.co
   
   ✅ anon (public) key:
   eyJhbGc...[طويل جداً]
   
   ✅ service_role key: [اضغط "Reveal" لرؤيته]
   eyJhbGc...[طويل جداً - سري للغاية!]
   
   ✅ Database Password: [الذي أدخلته عند الإنشاء]
```

⚠️ **مهم جداً:** لا تشارك `service_role key` مع أحد!

---

## 🗄️ المرحلة 3: إعداد قاعدة البيانات الجديدة

### الخطوة 3.1: إنشاء الجداول الأساسية

```
في Supabase Dashboard الجديد:
1. اذهب إلى: SQL Editor
2. اضغط "New Query"
3. انسخ محتوى الملفات التالية بالترتيب:
```

#### أ) إنشاء الجداول الرئيسية:

```sql
-- الصق هذا في SQL Editor الجديد:

-- ============================================================
-- 1. Create Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'viewer',
  division TEXT,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_permissions_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 2. Create Projects Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - ProjectsList" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Code" TEXT,
  "Project Sub-Code" TEXT,
  "Project Name" TEXT,
  "Project Type" TEXT,
  "Responsible Division" TEXT,
  "Plot Number" TEXT,
  "KPI Completed" TEXT,
  "Project Status" TEXT DEFAULT 'active',
  "Contract Amount" TEXT,
  "Contract Status" TEXT,
  "Currency" TEXT DEFAULT 'AED',
  "Work Programme" TEXT,
  "Latitude" TEXT,
  "Longitude" TEXT,
  "Project Manager Email" TEXT,
  "Area Manager Email" TEXT,
  "Date Project Awarded" TEXT,
  "Workmanship only?" TEXT,
  "Advnace Payment Required" TEXT,
  "Client Name" TEXT,
  "Consultant Name" TEXT,
  "First Party name" TEXT,
  "Virtual Material Value" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."Planning Database - ProjectsList" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public."Planning Database - ProjectsList"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Create BOQ Activities Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - BOQ Rates" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Code" TEXT,
  "Project Sub Code" TEXT,
  "Project Full Code" TEXT,
  "Activity" TEXT,
  "Activity Division" TEXT,
  "Unit" TEXT,
  "Zone Ref" TEXT,
  "Zone Number" TEXT,
  "Activity Name" TEXT,
  "Total Units" TEXT,
  "Planned Units" TEXT,
  "Actual Units" TEXT,
  "Difference" TEXT,
  "Variance Units" TEXT,
  "Rate" TEXT,
  "Total Value" TEXT,
  "Planned Activity Start Date" TEXT,
  "Deadline" TEXT,
  "Calendar Duration" TEXT,
  "Activity Progress %" TEXT,
  "Productivity Daily Rate" TEXT,
  "Total Drilling Meters" TEXT,
  "Drilled Meters Planned Progress" TEXT,
  "Drilled Meters Actual Progress" TEXT,
  "Remaining Meters" TEXT,
  "Activity Planned Status" TEXT,
  "Activity Actual Status" TEXT,
  "Reported on Data Date" TEXT,
  "Planned Value" TEXT,
  "Earned Value" TEXT,
  "Delay %" TEXT,
  "Planned Progress %" TEXT,
  "Activity Planned Start Date" TEXT,
  "Activity Planned Completion Date" TEXT,
  "Activity Delayed?" TEXT,
  "Activity On Track?" TEXT,
  "Activity Completed?" TEXT,
  "Project Full Name" TEXT,
  "Project Status" TEXT,
  "Remaining Work Value" TEXT,
  "Variance Works Value" TEXT,
  "Lookahead Start Date" TEXT,
  "Lookahead Activity Completion Date" TEXT,
  "Remaining Lookahead Duration for Activity Completion" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."Planning Database - BOQ Rates" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public."Planning Database - BOQ Rates"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Create KPI Table (Unified)
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Full Code" TEXT,
  "Project Code" TEXT,
  "Project Sub Code" TEXT,
  "Activity Name" TEXT,
  "Activity" TEXT,
  "Input Type" TEXT, -- 'Planned' or 'Actual'
  "Quantity" TEXT,
  "Unit" TEXT,
  "Section" TEXT,
  "Zone" TEXT,
  "Drilled Meters" TEXT,
  "Value" TEXT,
  "Target Date" TEXT,
  "Actual Date" TEXT,
  "Activity Date" TEXT,
  "Day" TEXT,
  "Recorded By" TEXT,
  "Notes" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."Planning Database - KPI" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public."Planning Database - KPI"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Create Divisions Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default divisions
INSERT INTO public.divisions (name, code, description, is_active) VALUES
  ('Enabling Division', 'EN', 'Enabling works division', true),
  ('Soil Improvement Division', 'SI', 'Soil improvement division', true),
  ('Infrastructure Division', 'IN', 'Infrastructure development division', true),
  ('Marine Division', 'MA', 'Marine works division', true)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.divisions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Create Project Types Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default project types
INSERT INTO public.project_types (name, code, description, is_active) VALUES
  ('Infrastructure', 'INF', 'Infrastructure projects', true),
  ('Building Construction', 'BLD', 'Building construction projects', true),
  ('Road Construction', 'RD', 'Road construction projects', true),
  ('Marine Works', 'MAR', 'Marine works projects', true),
  ('Landscaping', 'LND', 'Landscaping projects', true),
  ('Maintenance', 'MNT', 'Maintenance projects', true)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.project_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. Create Currencies Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_default, is_active) VALUES
  ('AED', 'UAE Dirham', 'د.إ', 1.0, true, true),
  ('USD', 'US Dollar', '$', 3.67, false, true),
  ('SAR', 'Saudi Riyal', '﷼', 0.98, false, true)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.currencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. Create Holidays Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default UAE holidays
INSERT INTO public.holidays (date, name, description, is_recurring, is_active) VALUES
  ('2025-01-01', 'New Year''s Day', 'New Year celebration', true, true),
  ('2025-12-02', 'UAE National Day', 'UAE National Day', true, true),
  ('2025-12-03', 'UAE National Day Holiday', 'UAE National Day Holiday', true, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.holidays
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 9. Create Activities Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  division TEXT,
  unit TEXT,
  category TEXT,
  description TEXT,
  typical_duration INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 10. Create Company Settings Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'AlRabat RPF',
  company_slogan TEXT DEFAULT 'Masters of Foundation Construction',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.company_settings (company_name, company_slogan)
VALUES ('AlRabat RPF', 'Masters of Foundation Construction')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.company_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Create Indexes for Performance
-- ============================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_code ON public."Planning Database - ProjectsList" ("Project Code");
CREATE INDEX IF NOT EXISTS idx_projects_status ON public."Planning Database - ProjectsList" ("Project Status");
CREATE INDEX IF NOT EXISTS idx_projects_created ON public."Planning Database - ProjectsList" (created_at DESC);

-- BOQ indexes
CREATE INDEX IF NOT EXISTS idx_boq_project_code ON public."Planning Database - BOQ Rates" ("Project Code");
CREATE INDEX IF NOT EXISTS idx_boq_activity ON public."Planning Database - BOQ Rates" ("Activity Name");
CREATE INDEX IF NOT EXISTS idx_boq_created ON public."Planning Database - BOQ Rates" (created_at DESC);

-- KPI indexes
CREATE INDEX IF NOT EXISTS idx_kpi_project_code ON public."Planning Database - KPI" ("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_kpi_activity ON public."Planning Database - KPI" ("Activity Name");
CREATE INDEX IF NOT EXISTS idx_kpi_input_type ON public."Planning Database - KPI" ("Input Type");
CREATE INDEX IF NOT EXISTS idx_kpi_date ON public."Planning Database - KPI" ("Activity Date");
CREATE INDEX IF NOT EXISTS idx_kpi_created ON public."Planning Database - KPI" (created_at DESC);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- ============================================================
-- ✅ Schema Creation Complete!
-- ============================================================
```

اضغط **Run** وانتظر حتى تنتهي العملية (5-10 ثواني).

---

## 📥 المرحلة 4: استيراد البيانات

### الخطوة 4.1: إنشاء مستخدم Admin أولي

```sql
-- في SQL Editor الجديد:
-- ⚠️ هام: غير البيانات بما يناسبك!

-- سنستخدم API لإنشاء المستخدم
-- افتح Terminal في مشروعك وشغل:
```

أنشئ ملف مؤقت: `create-admin-user.js`

```javascript
// create-admin-user.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'YOUR_NEW_SUPABASE_URL' // ضع الجديد هنا
const supabaseKey = 'YOUR_NEW_SERVICE_ROLE_KEY' // ضع الجديد هنا

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  console.log('🔄 Creating admin user...')
  
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@rabat.com', // غير هذا
    password: 'YourSecurePassword123!', // غير هذا
    email_confirm: true,
    user_metadata: {
      full_name: 'System Administrator'
    }
  })
  
  if (authError) {
    console.error('❌ Error creating auth user:', authError.message)
    return
  }
  
  console.log('✅ Auth user created:', authData.user.email)
  
  // 2. Create user record
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: authData.user.email,
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true
    })
    .select()
    .single()
  
  if (userError) {
    console.error('❌ Error creating user record:', userError.message)
  } else {
    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', authData.user.email)
    console.log('👤 Role: admin')
  }
}

createAdminUser()
```

شغل الملف:
```bash
node create-admin-user.js
```

### الخطوة 4.2: استيراد البيانات الأساسية

#### الطريقة 1: عبر الواجهة (موصى به)

```
1. افتح التطبيق على localhost:3000
2. ⚠️ لكن انتظر! يجب تحديث .env.local أولاً (المرحلة 5)
3. بعد التحديث، سجل دخول كـ Admin
4. اذهب إلى: Settings → Database Management → Restore
5. اختر ملف النسخة الاحتياطية: database_backup_YYYY-MM-DD.json
6. اضغط "Load Backup File"
7. راجع المعلومات
8. اختر Mode: "Append" (آمن)
9. اضغط "Restore Database"
10. انتظر حتى تكتمل العملية
```

#### الطريقة 2: عبر SQL (للبيانات الكبيرة)

إذا كانت البيانات كبيرة جداً:

```sql
-- في SQL Editor الجديد:
-- استخدم COPY command

-- مثال للمشاريع:
COPY public."Planning Database - ProjectsList" 
FROM '/path/to/projects.csv' 
DELIMITER ',' 
CSV HEADER;

-- كرر لكل جدول
```

---

## 🔧 المرحلة 5: تحديث المشروع المحلي

### الخطوة 5.1: تحديث ملف البيئة

افتح ملف `.env.local` وحدّث البيانات:

```env
# ⚠️ استبدل هذه القيم بالقيم الجديدة من Supabase الجديد

# Supabase Configuration (PRODUCTION)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...الكي_الجديد_الطويل
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...الكي_السري_الجديد_الطويل

# App URL (سيتغير عند النشر)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **احفظ الملف القديم قبل التعديل!**

```bash
# انسخ الملف القديم للاحتفاظ به
cp .env.local .env.local.backup

# ثم حرر .env.local
```

### الخطوة 5.2: اختبار الاتصال محلياً

```bash
# أعد تشغيل التطبيق
npm run dev

# افتح http://localhost:3000
# جرب تسجيل الدخول بحساب Admin الجديد
```

✅ **اختبر كل شيء:**
- [ ] تسجيل الدخول
- [ ] عرض المشاريع
- [ ] عرض BOQ
- [ ] عرض KPIs
- [ ] إضافة مشروع جديد
- [ ] إضافة نشاط
- [ ] التقارير
- [ ] الإعدادات

---

## ☁️ المرحلة 6: نشر على Vercel

### الخطوة 6.1: تحديث المتغيرات في Vercel

```
1. اذهب إلى: https://vercel.com/dashboard
2. اختر مشروعك: alrabat-rpf
3. اذهب إلى: Settings → Environment Variables
4. احذف أو حدّث المتغيرات القديمة:

   Variable Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://xxxxxxxxxxxxx.supabase.co (الجديد)
   
   Variable Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGc... (الجديد)
   
   Variable Name: SUPABASE_SERVICE_ROLE_KEY
   Value: eyJhbGc... (الجديد السري)
   
   Variable Name: NEXT_PUBLIC_APP_URL
   Value: https://alrabat-rpf.vercel.app (أو نطاقك المخصص)

5. لكل متغير، اختر Environment:
   - ✅ Production
   - ✅ Preview (اختياري)
   - ❌ Development (لا)

6. اضغط "Save"
```

### الخطوة 6.2: إعادة النشر

#### الطريقة 1: عبر Git

```bash
# في Terminal:
git add .
git commit -m "✨ Migrate to production Supabase"
git push origin main
```

سيقوم Vercel بإعادة النشر تلقائياً.

#### الطريقة 2: عبر Vercel Dashboard

```
1. في Vercel Dashboard
2. اذهب إلى: Deployments
3. اختر آخر deployment
4. اضغط القائمة (...)
5. اضغط "Redeploy"
6. اختار "Use existing Build Cache" = No
7. اضغط "Redeploy"
```

انتظر 2-5 دقائق حتى يكتمل النشر.

### الخطوة 6.3: اختبار الموقع المباشر

```
1. افتح: https://alrabat-rpf.vercel.app
2. جرب تسجيل الدخول
3. اختبر كل الميزات
4. تحقق من سرعة التحميل
5. تحقق من عدم وجود أخطاء في Console (F12)
```

---

## 🔐 المرحلة 7: تأمين Supabase الجديد

### الخطوة 7.1: تفعيل الحماية

في Supabase Dashboard الجديد:

```
1. Authentication → Settings:
   ✅ Enable email confirmations
   ✅ Enable password requirements (min 8 characters)
   ✅ Rate limiting: ON
   
2. Database → Settings:
   ✅ Connection Pooling: ON (للأداء)
   ✅ SSL Enforcement: Required
   
3. Storage → Policies:
   ✅ تأكد من RLS مفعل على كل الجداول
```

### الخطوة 7.2: إعداد النسخ الاحتياطي التلقائي

```
Settings → Backups:
✅ Enable Daily Backups (في النسخة Pro)
✅ Retention: 7 days (أو أكثر)
```

---

## ✅ المرحلة 8: التحقق النهائي

### قائمة الفحص الشاملة:

#### قاعدة البيانات:
- [ ] جميع الجداول موجودة (10 جداول)
- [ ] البيانات مستوردة بنجاح
- [ ] RLS مفعل على كل الجداول
- [ ] Indexes منشأة
- [ ] Policies تعمل

#### التطبيق المحلي:
- [ ] .env.local محدث
- [ ] الاتصال يعمل
- [ ] تسجيل الدخول يعمل
- [ ] جميع الصفحات تعمل
- [ ] لا توجد أخطاء في Console

#### التطبيق المباشر (Vercel):
- [ ] Environment variables محدثة
- [ ] Deployment ناجح
- [ ] الموقع يفتح بدون أخطاء
- [ ] تسجيل الدخول يعمل
- [ ] جميع الميزات تعمل
- [ ] الأداء جيد (3-5 ثواني)

#### الأمان:
- [ ] كلمة مرور قاعدة البيانات قوية
- [ ] Service Role Key محفوظ بأمان
- [ ] Rate limiting مفعل
- [ ] SSL مفعل
- [ ] النسخ الاحتياطي مجدول

---

## 🚨 استكشاف الأخطاء المحتملة

### خطأ: "Invalid API Key"

```
الحل:
1. تحقق من أنك نسخت الـ keys الصحيحة
2. تأكد من عدم وجود مسافات في البداية/النهاية
3. تحقق من Environment في Vercel
4. أعد تشغيل التطبيق المحلي
```

### خطأ: "Could not connect to database"

```
الحل:
1. تحقق من Project URL
2. تأكد من أن المشروع نشط (active)
3. تحقق من SSL settings
4. جرب من browser مختلف
```

### خطأ: "Authentication failed"

```
الحل:
1. تحقق من إنشاء مستخدم Admin
2. جرب إعادة إنشاء المستخدم
3. تحقق من RLS policies على جدول users
4. راجع Authentication settings في Supabase
```

### خطأ: "Data not loading"

```
الحل:
1. تحقق من استيراد البيانات
2. راجع RLS policies
3. تحقق من Console للأخطاء
4. جرب Refresh الصفحة
```

---

## 📊 بعد الانتقال

### مراقبة الأداء:

```
في Supabase Dashboard:

1. Reports → Database:
   - راقب Connection count
   - راقب Query performance
   - راقب Storage usage

2. Reports → API:
   - راقب Request count
   - راقب Error rate
   - راقب Response time

3. Logs:
   - راقب الأخطاء
   - راجع الـ queries البطيئة
```

### الصيانة الدورية:

```
أسبوعياً:
- [ ] مراجعة Logs
- [ ] فحص الأداء
- [ ] نسخة احتياطية يدوية

شهرياً:
- [ ] تنظيف البيانات القديمة
- [ ] تحسين Indexes
- [ ] مراجعة Usage/Billing
- [ ] تحديث Packages (npm update)
```

---

## 🎉 تهانينا!

✅ **أنت الآن على Supabase الفعلي (Production)!**

### ما تم إنجازه:
1. ✅ إنشاء مشروع Supabase جديد
2. ✅ تصدير البيانات من الحساب القديم
3. ✅ إعداد قاعدة البيانات الجديدة
4. ✅ استيراد البيانات
5. ✅ تحديث التطبيق المحلي
6. ✅ نشر على Vercel
7. ✅ تأمين النظام
8. ✅ اختبار شامل

### الخطوات التالية:

```
1. 📧 إنشاء حسابات المستخدمين الفعليين
2. 📊 استيراد البيانات الحقيقية (إن وجدت)
3. 🎨 تخصيص Company Settings
4. 📱 مشاركة الرابط مع الفريق
5. 📚 تدريب المستخدمين
6. 🔍 مراقبة الأداء
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:

1. راجع قسم "استكشاف الأخطاء" أعلاه
2. تحقق من Console logs (F12)
3. راجع Supabase logs في Dashboard
4. تحقق من Vercel deployment logs

---

## 📝 ملاحظات مهمة

⚠️ **لا تحذف حساب Supabase القديم مباشرة!**

احتفظ به لمدة شهر على الأقل كـ backup، ثم:
```
1. تأكد من أن كل شيء يعمل على الجديد
2. احتفظ بنسخة احتياطية نهائية
3. يمكنك حذف المشروع القديم
```

⚠️ **احتفظ بهذه البيانات في مكان آمن:**
- Database Password
- Service Role Key
- Admin user credentials
- Backup files

---

**تاريخ الإنشاء:** 2025-10-13
**الحالة:** ✅ جاهز للتطبيق
**المدة المتوقعة:** 30-60 دقيقة

**بالتوفيق! 🚀**


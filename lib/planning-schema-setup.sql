-- ====================================================================
-- Rabat MVP - Planning Schema Setup
-- ====================================================================
-- هذا السكريبت ينشئ schema "planning" وينقل الجداول إليها
-- أو ينشئ الجداول مباشرة في schema "planning"
-- ====================================================================

-- 1. إنشاء schema "planning"
-- ====================================================================
CREATE SCHEMA IF NOT EXISTS planning;

-- 2. منح الصلاحيات الأساسية
-- ====================================================================
GRANT USAGE ON SCHEMA planning TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA planning TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA planning TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA planning TO anon, authenticated, service_role;

-- 3. إنشاء Custom Types في schema planning
-- ====================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'planning')) THEN
    CREATE TYPE planning.project_status AS ENUM ('active', 'completed', 'on_hold', 'cancelled');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'planning')) THEN
    CREATE TYPE planning.user_role AS ENUM ('admin', 'manager', 'engineer', 'viewer');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'planning')) THEN
    CREATE TYPE planning.kpi_status AS ENUM ('on_track', 'delayed', 'completed', 'at_risk');
  END IF;
END $$;

-- ====================================================================
-- 4. إنشاء الجداول في schema "planning"
-- ====================================================================

-- جدول المستخدمين (users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS planning.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role planning.user_role DEFAULT 'viewer',
  division TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول المشاريع (projects)
-- ====================================================================
CREATE TABLE IF NOT EXISTS planning.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code TEXT NOT NULL,
  project_sub_code TEXT,
  project_name TEXT NOT NULL,
  project_type TEXT,
  responsible_division TEXT,
  plot_number TEXT,
  kpi_completed BOOLEAN DEFAULT FALSE,
  project_status planning.project_status DEFAULT 'active',
  contract_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES planning.users(id) ON DELETE SET NULL
);

-- جدول أنشطة BOQ (boq_activities)
-- ====================================================================
CREATE TABLE IF NOT EXISTS planning.boq_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES planning.projects(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  project_sub_code TEXT,
  project_full_code TEXT,
  activity TEXT NOT NULL,
  activity_division TEXT,
  unit TEXT,
  zone_ref TEXT,
  zone_number TEXT,
  activity_name TEXT NOT NULL,
  total_units DECIMAL(15,2) DEFAULT 0,
  planned_units DECIMAL(15,2) DEFAULT 0,
  actual_units DECIMAL(15,2) DEFAULT 0,
  difference DECIMAL(15,2) DEFAULT 0,
  variance_units DECIMAL(15,2) DEFAULT 0,
  rate DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) DEFAULT 0,
  planned_activity_start_date DATE,
  deadline DATE,
  calendar_duration INTEGER DEFAULT 0,
  activity_progress_percentage DECIMAL(5,2) DEFAULT 0,
  productivity_daily_rate DECIMAL(15,2) DEFAULT 0,
  total_drilling_meters DECIMAL(15,2) DEFAULT 0,
  drilled_meters_planned_progress DECIMAL(15,2) DEFAULT 0,
  drilled_meters_actual_progress DECIMAL(15,2) DEFAULT 0,
  remaining_meters DECIMAL(15,2) DEFAULT 0,
  activity_planned_status TEXT,
  activity_actual_status TEXT,
  reported_on_data_date BOOLEAN DEFAULT FALSE,
  planned_value DECIMAL(15,2) DEFAULT 0,
  earned_value DECIMAL(15,2) DEFAULT 0,
  delay_percentage DECIMAL(5,2) DEFAULT 0,
  planned_progress_percentage DECIMAL(5,2) DEFAULT 0,
  activity_planned_start_date DATE,
  activity_planned_completion_date DATE,
  activity_delayed BOOLEAN DEFAULT FALSE,
  activity_on_track BOOLEAN DEFAULT TRUE,
  activity_completed BOOLEAN DEFAULT FALSE,
  project_full_name TEXT,
  project_status TEXT,
  remaining_work_value DECIMAL(15,2) DEFAULT 0,
  variance_works_value DECIMAL(15,2) DEFAULT 0,
  lookahead_start_date DATE,
  lookahead_activity_completion_date DATE,
  remaining_lookahead_duration_for_activity_completion INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول سجلات KPI (kpi_records)
-- ====================================================================
CREATE TABLE IF NOT EXISTS planning.kpi_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES planning.projects(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES planning.boq_activities(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  planned_value DECIMAL(15,2) NOT NULL,
  actual_value DECIMAL(15,2) DEFAULT 0,
  target_date DATE NOT NULL,
  completion_date DATE,
  status planning.kpi_status DEFAULT 'on_track',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES planning.users(id) ON DELETE SET NULL
);

-- ====================================================================
-- 5. إنشاء الفهارس (Indexes)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_planning_projects_code ON planning.projects(project_code);
CREATE INDEX IF NOT EXISTS idx_planning_projects_status ON planning.projects(project_status);
CREATE INDEX IF NOT EXISTS idx_planning_boq_project_id ON planning.boq_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_boq_code ON planning.boq_activities(project_code);
CREATE INDEX IF NOT EXISTS idx_planning_kpi_project_id ON planning.kpi_records(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_kpi_activity_id ON planning.kpi_records(activity_id);
CREATE INDEX IF NOT EXISTS idx_planning_kpi_status ON planning.kpi_records(status);

-- ====================================================================
-- 6. تفعيل Row Level Security (RLS)
-- ====================================================================
ALTER TABLE planning.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning.boq_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning.kpi_records ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 7. إنشاء RLS Policies
-- ====================================================================

-- Users Policies
-- ====================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON planning.users;
CREATE POLICY "Users can view own profile" ON planning.users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON planning.users;
CREATE POLICY "Users can update own profile" ON planning.users
  FOR UPDATE USING (auth.uid() = id);

-- Projects Policies
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON planning.projects;
CREATE POLICY "Authenticated users can view projects" ON planning.projects
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers and admins can insert projects" ON planning.projects;
CREATE POLICY "Managers and admins can insert projects" ON planning.projects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "Managers and admins can update projects" ON planning.projects;
CREATE POLICY "Managers and admins can update projects" ON planning.projects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "Admins can delete projects" ON planning.projects;
CREATE POLICY "Admins can delete projects" ON planning.projects
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role = 'admin')
  );

-- BOQ Activities Policies
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can view BOQ activities" ON planning.boq_activities;
CREATE POLICY "Authenticated users can view BOQ activities" ON planning.boq_activities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Engineers and above can insert BOQ activities" ON planning.boq_activities;
CREATE POLICY "Engineers and above can insert BOQ activities" ON planning.boq_activities
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

DROP POLICY IF EXISTS "Engineers and above can update BOQ activities" ON planning.boq_activities;
CREATE POLICY "Engineers and above can update BOQ activities" ON planning.boq_activities
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

DROP POLICY IF EXISTS "Managers and admins can delete BOQ activities" ON planning.boq_activities;
CREATE POLICY "Managers and admins can delete BOQ activities" ON planning.boq_activities
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- KPI Records Policies
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can view KPI records" ON planning.kpi_records;
CREATE POLICY "Authenticated users can view KPI records" ON planning.kpi_records
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Engineers and above can insert KPI records" ON planning.kpi_records;
CREATE POLICY "Engineers and above can insert KPI records" ON planning.kpi_records
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

DROP POLICY IF EXISTS "Engineers and above can update KPI records" ON planning.kpi_records;
CREATE POLICY "Engineers and above can update KPI records" ON planning.kpi_records
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

DROP POLICY IF EXISTS "Managers and admins can delete KPI records" ON planning.kpi_records;
CREATE POLICY "Managers and admins can delete KPI records" ON planning.kpi_records
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM planning.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ====================================================================
-- 8. إنشاء الدوال المساعدة (Functions)
-- ====================================================================

-- دالة تحديث updated_at تلقائياً
-- ====================================================================
CREATE OR REPLACE FUNCTION planning.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ====================================================================
-- 9. إنشاء Triggers
-- ====================================================================
DROP TRIGGER IF EXISTS update_users_updated_at ON planning.users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON planning.users
  FOR EACH ROW EXECUTE FUNCTION planning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON planning.projects;
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON planning.projects
  FOR EACH ROW EXECUTE FUNCTION planning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_boq_activities_updated_at ON planning.boq_activities;
CREATE TRIGGER update_boq_activities_updated_at 
  BEFORE UPDATE ON planning.boq_activities
  FOR EACH ROW EXECUTE FUNCTION planning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_kpi_records_updated_at ON planning.kpi_records;
CREATE TRIGGER update_kpi_records_updated_at 
  BEFORE UPDATE ON planning.kpi_records
  FOR EACH ROW EXECUTE FUNCTION planning.update_updated_at_column();

-- ====================================================================
-- 10. منح الصلاحيات النهائية
-- ====================================================================
GRANT ALL ON ALL TABLES IN SCHEMA planning TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA planning TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA planning TO anon, authenticated, service_role;

-- تعيين search_path افتراضي (اختياري)
-- ALTER DATABASE postgres SET search_path TO planning, public;

-- ====================================================================
-- تم بنجاح! Schema "planning" جاهزة للاستخدام
-- ====================================================================

-- للتحقق من الجداول المنشأة:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'planning';

-- للتحقق من الصلاحيات:
-- SELECT * FROM information_schema.role_table_grants WHERE table_schema = 'planning';


-- ============================================================
-- AlRabat RPF - Complete Production Schema
-- نسخ هذا الكود بالكامل والصقه في Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: Create All Tables
-- ============================================================

-- 1. Users Table
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

COMMENT ON TABLE public.users IS 'User profiles with roles and permissions';

-- 2. Projects Table (Planning Database - ProjectsList)
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

COMMENT ON TABLE public."Planning Database - ProjectsList" IS 'Main projects table with all project information';

-- 3. BOQ Activities Table (Planning Database - BOQ Rates)
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

COMMENT ON TABLE public."Planning Database - BOQ Rates" IS 'BOQ activities with detailed progress tracking';

-- 4. KPI Table (Unified - Planning Database - KPI)
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

COMMENT ON TABLE public."Planning Database - KPI" IS 'Unified KPI table for both Planned and Actual records';

-- 5. Divisions Table
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

COMMENT ON TABLE public.divisions IS 'Company divisions/departments';

-- 6. Project Types Table
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

COMMENT ON TABLE public.project_types IS 'Available project types';

-- 7. Currencies Table
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

COMMENT ON TABLE public.currencies IS 'Supported currencies with exchange rates';

-- 8. Holidays Table
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

COMMENT ON TABLE public.holidays IS 'Public holidays and non-working days';

-- 9. Activities Database Table
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

COMMENT ON TABLE public.activities IS 'Predefined activities database for quick selection';

-- 10. Company Settings Table
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

COMMENT ON TABLE public.company_settings IS 'Company branding and configuration';

-- ============================================================
-- PART 2: Insert Default Data
-- ============================================================

-- Insert Default Divisions
INSERT INTO public.divisions (name, code, description, is_active) VALUES
  ('Enabling Division', 'EN', 'Enabling works division', true),
  ('Soil Improvement Division', 'SI', 'Soil improvement division', true),
  ('Infrastructure Division', 'IN', 'Infrastructure development division', true),
  ('Marine Division', 'MA', 'Marine works division', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Default Project Types
INSERT INTO public.project_types (name, code, description, is_active) VALUES
  ('Infrastructure', 'INF', 'Infrastructure projects', true),
  ('Building Construction', 'BLD', 'Building construction projects', true),
  ('Road Construction', 'RD', 'Road construction projects', true),
  ('Marine Works', 'MAR', 'Marine works projects', true),
  ('Landscaping', 'LND', 'Landscaping projects', true),
  ('Maintenance', 'MNT', 'Maintenance projects', true),
  ('Enabling Division', 'EN', 'Enabling division projects', true),
  ('Soil Improvement Division', 'SI', 'Soil improvement projects', true),
  ('Infrastructure Division', 'IN', 'Infrastructure division projects', true),
  ('Marine Division', 'MA', 'Marine division projects', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Default Currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_default, is_active) VALUES
  ('AED', 'UAE Dirham', 'د.إ', 1.0, true, true),
  ('USD', 'US Dollar', '$', 3.67, false, true),
  ('SAR', 'Saudi Riyal', '﷼', 0.98, false, true)
ON CONFLICT (code) DO NOTHING;

-- Insert Default UAE Holidays
INSERT INTO public.holidays (date, name, description, is_recurring, is_active) VALUES
  ('2025-01-01', 'New Year''s Day', 'New Year celebration', true, true),
  ('2025-12-02', 'UAE National Day', 'UAE National Day', true, true),
  ('2025-12-03', 'UAE National Day Holiday', 'UAE National Day Holiday', true, true)
ON CONFLICT DO NOTHING;

-- Insert Default Company Settings
INSERT INTO public.company_settings (company_name, company_slogan)
VALUES ('AlRabat RPF', 'Masters of Foundation Construction')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - ProjectsList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - BOQ Rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - KPI" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 4: Create RLS Policies
-- ============================================================

-- Users Policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Projects Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_projects" ON public."Planning Database - ProjectsList"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BOQ Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_boq" ON public."Planning Database - BOQ Rates"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- KPI Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_kpi" ON public."Planning Database - KPI"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Divisions Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_divisions" ON public.divisions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project Types Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_project_types" ON public.project_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Currencies Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_currencies" ON public.currencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Holidays Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_holidays" ON public.holidays
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Activities Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_activities" ON public.activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Company Settings Policies (Authenticated users can do everything)
CREATE POLICY "auth_all_company_settings" ON public.company_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PART 5: Create Indexes for Performance
-- ============================================================

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users (is_active);

-- Projects Indexes
CREATE INDEX IF NOT EXISTS idx_projects_code ON public."Planning Database - ProjectsList" ("Project Code");
CREATE INDEX IF NOT EXISTS idx_projects_status ON public."Planning Database - ProjectsList" ("Project Status");
CREATE INDEX IF NOT EXISTS idx_projects_division ON public."Planning Database - ProjectsList" ("Responsible Division");
CREATE INDEX IF NOT EXISTS idx_projects_type ON public."Planning Database - ProjectsList" ("Project Type");
CREATE INDEX IF NOT EXISTS idx_projects_created ON public."Planning Database - ProjectsList" (created_at DESC);

-- BOQ Indexes
CREATE INDEX IF NOT EXISTS idx_boq_project_code ON public."Planning Database - BOQ Rates" ("Project Code");
CREATE INDEX IF NOT EXISTS idx_boq_project_full_code ON public."Planning Database - BOQ Rates" ("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_boq_activity ON public."Planning Database - BOQ Rates" ("Activity Name");
CREATE INDEX IF NOT EXISTS idx_boq_division ON public."Planning Database - BOQ Rates" ("Activity Division");
CREATE INDEX IF NOT EXISTS idx_boq_completed ON public."Planning Database - BOQ Rates" ("Activity Completed?");
CREATE INDEX IF NOT EXISTS idx_boq_created ON public."Planning Database - BOQ Rates" (created_at DESC);

-- KPI Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_project_code ON public."Planning Database - KPI" ("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_kpi_activity ON public."Planning Database - KPI" ("Activity Name");
CREATE INDEX IF NOT EXISTS idx_kpi_input_type ON public."Planning Database - KPI" ("Input Type");
CREATE INDEX IF NOT EXISTS idx_kpi_target_date ON public."Planning Database - KPI" ("Target Date");
CREATE INDEX IF NOT EXISTS idx_kpi_actual_date ON public."Planning Database - KPI" ("Actual Date");
CREATE INDEX IF NOT EXISTS idx_kpi_activity_date ON public."Planning Database - KPI" ("Activity Date");
CREATE INDEX IF NOT EXISTS idx_kpi_created ON public."Planning Database - KPI" (created_at DESC);

-- Divisions Indexes
CREATE INDEX IF NOT EXISTS idx_divisions_name ON public.divisions (name);
CREATE INDEX IF NOT EXISTS idx_divisions_active ON public.divisions (is_active);

-- Project Types Indexes
CREATE INDEX IF NOT EXISTS idx_project_types_name ON public.project_types (name);
CREATE INDEX IF NOT EXISTS idx_project_types_active ON public.project_types (is_active);

-- Currencies Indexes
CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies (code);
CREATE INDEX IF NOT EXISTS idx_currencies_active ON public.currencies (is_active);
CREATE INDEX IF NOT EXISTS idx_currencies_default ON public.currencies (is_default);

-- Holidays Indexes
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays (date);
CREATE INDEX IF NOT EXISTS idx_holidays_active ON public.holidays (is_active);

-- Activities Indexes
CREATE INDEX IF NOT EXISTS idx_activities_name ON public.activities (name);
CREATE INDEX IF NOT EXISTS idx_activities_division ON public.activities (division);
CREATE INDEX IF NOT EXISTS idx_activities_active ON public.activities (is_active);

-- ============================================================
-- PART 6: Create Helper Functions
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public."Planning Database - ProjectsList"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boq_updated_at BEFORE UPDATE ON public."Planning Database - BOQ Rates"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_updated_at BEFORE UPDATE ON public."Planning Database - KPI"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON public.divisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_types_updated_at BEFORE UPDATE ON public.project_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON public.currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON public.holidays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PART 7: Grant Permissions
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant all privileges on tables to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant all privileges on sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;

-- ============================================================
-- PART 8: Analyze Tables for Better Performance
-- ============================================================

ANALYZE public.users;
ANALYZE public."Planning Database - ProjectsList";
ANALYZE public."Planning Database - BOQ Rates";
ANALYZE public."Planning Database - KPI";
ANALYZE public.divisions;
ANALYZE public.project_types;
ANALYZE public.currencies;
ANALYZE public.holidays;
ANALYZE public.activities;
ANALYZE public.company_settings;

-- ============================================================
-- ✅ SCHEMA SETUP COMPLETE!
-- ============================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN (
      'users',
      'Planning Database - ProjectsList',
      'Planning Database - BOQ Rates',
      'Planning Database - KPI',
      'divisions',
      'project_types',
      'currencies',
      'holidays',
      'activities',
      'company_settings'
    );
  
  RAISE NOTICE '✅ Schema setup complete! Created % tables.', table_count;
  RAISE NOTICE '✅ RLS enabled on all tables';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ Default data inserted';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create admin user (use the migration script)';
  RAISE NOTICE '2. Update .env.local with new credentials';
  RAISE NOTICE '3. Test locally';
  RAISE NOTICE '4. Import data (Settings → Database Management)';
  RAISE NOTICE '5. Deploy to production';
END $$;


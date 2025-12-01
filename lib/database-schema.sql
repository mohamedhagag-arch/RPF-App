-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'engineer', 'viewer');
CREATE TYPE kpi_status AS ENUM ('on_track', 'delayed', 'completed', 'at_risk');

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'viewer',
  division TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code TEXT NOT NULL,
  project_sub_code TEXT,
  project_name TEXT NOT NULL,
  project_type TEXT,
  responsible_division TEXT,
  plot_number TEXT,
  kpi_completed BOOLEAN DEFAULT FALSE,
  project_status project_status DEFAULT 'active',
  contract_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create BOQ activities table
CREATE TABLE public.boq_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
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
  activity_timing TEXT,
  has_value BOOLEAN DEFAULT TRUE,
  affects_timeline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create KPI records table
CREATE TABLE public.kpi_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.boq_activities(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  planned_value DECIMAL(15,2) NOT NULL,
  actual_value DECIMAL(15,2) DEFAULT 0,
  target_date DATE NOT NULL,
  completion_date DATE,
  status kpi_status DEFAULT 'on_track',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_projects_code ON public.projects(project_code);
CREATE INDEX idx_projects_status ON public.projects(project_status);
CREATE INDEX idx_boq_activities_project_id ON public.boq_activities(project_id);
CREATE INDEX idx_boq_activities_code ON public.boq_activities(project_code);
CREATE INDEX idx_kpi_records_project_id ON public.kpi_records(project_id);
CREATE INDEX idx_kpi_records_activity_id ON public.kpi_records(activity_id);
CREATE INDEX idx_kpi_records_status ON public.kpi_records(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can view their own profile and admins can view all
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can insert projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Managers and admins can update projects" ON public.projects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- BOQ Activities policies
CREATE POLICY "Authenticated users can view BOQ activities" ON public.boq_activities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Engineers and above can insert BOQ activities" ON public.boq_activities
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

CREATE POLICY "Engineers and above can update BOQ activities" ON public.boq_activities
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

CREATE POLICY "Managers and admins can delete BOQ activities" ON public.boq_activities
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- KPI Records policies
CREATE POLICY "Authenticated users can view KPI records" ON public.kpi_records
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Engineers and above can insert KPI records" ON public.kpi_records
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

CREATE POLICY "Engineers and above can update KPI records" ON public.kpi_records
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'engineer'))
  );

CREATE POLICY "Managers and admins can delete KPI records" ON public.kpi_records
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boq_activities_updated_at BEFORE UPDATE ON public.boq_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_records_updated_at BEFORE UPDATE ON public.kpi_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

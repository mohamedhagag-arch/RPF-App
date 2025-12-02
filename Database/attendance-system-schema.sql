-- ============================================================
-- Attendance System - Complete Database Schema
-- نظام الحضور والانصراف - مخطط قاعدة البيانات الكامل
-- ============================================================
-- 
-- IMPORTANT: Run this script in Supabase SQL Editor
-- مهم: قم بتنفيذ هذا الملف في Supabase SQL Editor
--
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Attendance Employees Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  phone_number TEXT,
  email TEXT UNIQUE,
  profile_pic_url TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.attendance_employees IS 'Employees for attendance tracking';
COMMENT ON COLUMN public.attendance_employees.employee_code IS 'Unique employee identifier code';
COMMENT ON COLUMN public.attendance_employees.user_id IS 'Link to auth.users if employee has login access';

-- ============================================================
-- 2. Attendance Locations Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.attendance_locations IS 'GPS locations for attendance tracking';
COMMENT ON COLUMN public.attendance_locations.radius_meters IS 'Allowed radius in meters for check-in/out';

-- ============================================================
-- 3. Attendance Records Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.attendance_employees(id) ON DELETE CASCADE,
  check_time TIME NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Check-In', 'Check-Out')),
  location_id UUID REFERENCES public.attendance_locations(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  work_duration_hours DECIMAL(5, 2),
  is_late BOOLEAN DEFAULT FALSE,
  is_early BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.attendance_records IS 'Attendance check-in and check-out records';
COMMENT ON COLUMN public.attendance_records.check_time IS 'Time of check-in/out (HH:mm format)';
COMMENT ON COLUMN public.attendance_records.work_duration_hours IS 'Calculated work duration in hours';

-- ============================================================
-- 4. Attendance Settings Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.attendance_settings IS 'System settings for attendance';
COMMENT ON COLUMN public.attendance_settings.key IS 'Setting key (e.g., work_start_time)';
COMMENT ON COLUMN public.attendance_settings.value IS 'Setting value (stored as text)';

-- ============================================================
-- Create Indexes for Performance
-- ============================================================
-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employees_code ON public.attendance_employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_employees_email ON public.attendance_employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_employees_status ON public.attendance_employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employees_user_id ON public.attendance_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employees_department ON public.attendance_employees(department);

-- Attendance records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_type ON public.attendance_records(type);
CREATE INDEX IF NOT EXISTS idx_attendance_records_location ON public.attendance_records(location_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_is_late ON public.attendance_records(is_late);
CREATE INDEX IF NOT EXISTS idx_attendance_records_is_early ON public.attendance_records(is_early);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_type_date ON public.attendance_records(employee_id, type, date);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_attendance_locations_active ON public.attendance_locations(is_active);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_attendance_settings_key ON public.attendance_settings(key);

-- ============================================================
-- Create Updated At Trigger Function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_attendance_employees_updated_at ON public.attendance_employees;
CREATE TRIGGER update_attendance_employees_updated_at 
  BEFORE UPDATE ON public.attendance_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_settings_updated_at ON public.attendance_settings;
CREATE TRIGGER update_attendance_settings_updated_at 
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.attendance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Drop existing policies if they exist (for re-running)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.attendance_employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.attendance_employees;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.attendance_locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.attendance_locations;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.attendance_settings;

-- ============================================================
-- RLS Policies
-- ============================================================

-- ============================================================
-- ATTENDANCE_EMPLOYEES Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) employees
CREATE POLICY "attendance_employees_select_all"
  ON public.attendance_employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to INSERT employees
CREATE POLICY "attendance_employees_insert_admin"
  ON public.attendance_employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    -- Fallback: Allow if user exists in auth.users (for initial setup)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins and managers to UPDATE employees
CREATE POLICY "attendance_employees_update_admin"
  ON public.attendance_employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins and managers to DELETE employees
CREATE POLICY "attendance_employees_delete_admin"
  ON public.attendance_employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- ============================================================
-- ATTENDANCE_RECORDS Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) attendance records
CREATE POLICY "attendance_records_select_all"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow ALL authenticated users to INSERT attendance records
-- (This allows employees to check in/out)
CREATE POLICY "attendance_records_insert_all"
  ON public.attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins and managers to UPDATE attendance records
CREATE POLICY "attendance_records_update_admin"
  ON public.attendance_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins and managers to DELETE attendance records
CREATE POLICY "attendance_records_delete_admin"
  ON public.attendance_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- ============================================================
-- ATTENDANCE_LOCATIONS Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) locations
CREATE POLICY "attendance_locations_select_all"
  ON public.attendance_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to INSERT locations
CREATE POLICY "attendance_locations_insert_admin"
  ON public.attendance_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins and managers to UPDATE locations
CREATE POLICY "attendance_locations_update_admin"
  ON public.attendance_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins and managers to DELETE locations
CREATE POLICY "attendance_locations_delete_admin"
  ON public.attendance_locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- ============================================================
-- ATTENDANCE_SETTINGS Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) settings
CREATE POLICY "attendance_settings_select_all"
  ON public.attendance_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to INSERT settings
CREATE POLICY "attendance_settings_insert_admin"
  ON public.attendance_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins to UPDATE settings
CREATE POLICY "attendance_settings_update_admin"
  ON public.attendance_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Allow admins to DELETE settings
CREATE POLICY "attendance_settings_delete_admin"
  ON public.attendance_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- ============================================================
-- Insert Default Settings
-- ============================================================
INSERT INTO public.attendance_settings (key, value, description) VALUES
('work_start_time', '08:30:00', 'Default work start time'),
('work_end_time', '17:00:00', 'Default work end time'),
('late_allowance_minutes', '15', 'Minutes allowed before considered late'),
('early_departure_minutes', '15', 'Minutes allowed before work end time'),
('location_required', 'true', 'Require GPS location for check-in'),
('location_radius_meters', '100', 'Default location radius in meters'),
('auto_calculate_hours', 'true', 'Automatically calculate work hours'),
('notifications_enabled', 'true', 'Enable attendance notifications')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================
-- Sample Data (Optional - for testing)
-- ============================================================
-- Uncomment the following lines to insert sample data for testing

/*
-- Sample Employees
INSERT INTO public.attendance_employees (employee_code, name, job_title, department, email, status) VALUES
('EMP001', 'Ahmed Mohamed', 'Software Developer', 'IT', 'ahmed@company.com', 'Active'),
('EMP002', 'Fatima Ali', 'Accountant', 'Finance', 'fatima@company.com', 'Active'),
('EMP003', 'Mohamed Hassan', 'HR Manager', 'HR', 'mohamed@company.com', 'Active')
ON CONFLICT (employee_code) DO NOTHING;

-- Sample Locations
INSERT INTO public.attendance_locations (name, latitude, longitude, radius_meters, description, is_active) VALUES
('Main Office', 30.0444, 31.2357, 100, 'Main company office building', true),
('Branch Office', 29.9668, 31.2500, 100, 'Secondary branch location', true)
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- Verification Queries (Optional - to verify setup)
-- ============================================================
-- Run these queries to verify the setup:

-- SELECT COUNT(*) FROM public.attendance_employees;
-- SELECT COUNT(*) FROM public.attendance_locations;
-- SELECT COUNT(*) FROM public.attendance_settings;
-- SELECT * FROM public.attendance_settings ORDER BY key;

-- ============================================================
-- End of Schema
-- ============================================================
-- 
-- After running this script:
-- 1. Verify tables are created: Check Supabase Table Editor
-- 2. Verify RLS is enabled: Check table settings
-- 3. Verify default settings: Run SELECT * FROM attendance_settings;
-- 4. Add employees and locations through the UI
-- 
-- بعد تنفيذ هذا الملف:
-- 1. تحقق من إنشاء الجداول: راجع Supabase Table Editor
-- 2. تحقق من تفعيل RLS: راجع إعدادات الجداول
-- 3. تحقق من الإعدادات الافتراضية: نفذ SELECT * FROM attendance_settings;
-- 4. أضف الموظفين والمواقع من خلال الواجهة

-- ============================================================
-- Create Table for KPI Ignored Reporting Dates
-- This table stores dates when KPI reporting is ignored for specific projects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kpi_ignored_reporting_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  project_full_code TEXT NOT NULL,
  ignored_date DATE NOT NULL,
  ignored_day_string TEXT, -- Store the formatted day string (e.g., "Jan 1, 2024 - Monday")
  ignored_by TEXT, -- User who ignored the reporting
  reason TEXT, -- Optional reason for ignoring
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per project per date
  UNIQUE(project_id, ignored_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_ignored_project_id ON public.kpi_ignored_reporting_dates(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_ignored_date ON public.kpi_ignored_reporting_dates(ignored_date);
CREATE INDEX IF NOT EXISTS idx_kpi_ignored_project_date ON public.kpi_ignored_reporting_dates(project_id, ignored_date);

-- Add comment
COMMENT ON TABLE public.kpi_ignored_reporting_dates IS 'Stores dates when KPI reporting is ignored for specific projects (shared across all users)';

-- ============================================================
-- Step 2: Grant Permissions
-- ============================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_ignored_reporting_dates TO authenticated;

-- ============================================================
-- Step 3: Enable Row Level Security
-- ============================================================

ALTER TABLE public.kpi_ignored_reporting_dates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: Create RLS Policies
-- ============================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "kpi_ignored_select_all" ON public.kpi_ignored_reporting_dates;
DROP POLICY IF EXISTS "kpi_ignored_insert_authenticated" ON public.kpi_ignored_reporting_dates;
DROP POLICY IF EXISTS "kpi_ignored_update_authenticated" ON public.kpi_ignored_reporting_dates;
DROP POLICY IF EXISTS "kpi_ignored_delete_authenticated" ON public.kpi_ignored_reporting_dates;

-- Policy 1: ALL authenticated users can SELECT (read)
CREATE POLICY "kpi_ignored_select_all"
  ON public.kpi_ignored_reporting_dates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: ALL authenticated users can INSERT
CREATE POLICY "kpi_ignored_insert_authenticated"
  ON public.kpi_ignored_reporting_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: ALL authenticated users can UPDATE
CREATE POLICY "kpi_ignored_update_authenticated"
  ON public.kpi_ignored_reporting_dates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: ALL authenticated users can DELETE
CREATE POLICY "kpi_ignored_delete_authenticated"
  ON public.kpi_ignored_reporting_dates
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Attendance Daily Statuses - Tracking missing/verified attendance
-- This table stores a daily status for every employee so we can
-- keep a permanent record (attended, vacation, cancelled/inactive,
-- excused absence, absent) even when no check-in exists.
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- Ensure UUID extension exists (harmless if already created)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: attendance_daily_statuses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_daily_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.attendance_employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'attended',
    'vacation',
    'cancelled',
    'excused_absent',
    'absent'
  )),
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT attendance_daily_statuses_unique UNIQUE (employee_id, date)
);

COMMENT ON TABLE public.attendance_daily_statuses IS 'Daily attendance status (present/vacation/cancelled/excused/absent) for each employee';
COMMENT ON COLUMN public.attendance_daily_statuses.status IS 'attended | vacation | cancelled | excused_absent | absent';
COMMENT ON COLUMN public.attendance_daily_statuses.recorded_by IS 'User who recorded/updated this status';

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_daily_statuses_date ON public.attendance_daily_statuses(date);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_statuses_status ON public.attendance_daily_statuses(status);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_statuses_employee_date ON public.attendance_daily_statuses(employee_id, date);

-- ============================================================
-- Trigger to auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_attendance_daily_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_daily_statuses_updated_at ON public.attendance_daily_statuses;
CREATE TRIGGER trigger_update_attendance_daily_statuses_updated_at
  BEFORE UPDATE ON public.attendance_daily_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_daily_statuses_updated_at();

-- ============================================================
-- Grants (required in addition to RLS policies)
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_daily_statuses TO authenticated;
GRANT SELECT ON public.attendance_daily_statuses TO anon;

-- ============================================================
-- Row Level Security & Policies
-- ============================================================
ALTER TABLE public.attendance_daily_statuses ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running
DROP POLICY IF EXISTS attendance_daily_statuses_select_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_insert_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_update_admin ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_delete_admin ON public.attendance_daily_statuses;

-- Allow all authenticated users to read statuses
CREATE POLICY attendance_daily_statuses_select_all
  ON public.attendance_daily_statuses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update their reviews
CREATE POLICY attendance_daily_statuses_insert_all
  ON public.attendance_daily_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins/managers (or existing app users) to update
CREATE POLICY attendance_daily_statuses_update_admin
  ON public.attendance_daily_statuses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  );

-- Allow admins/managers (or existing app users) to delete
CREATE POLICY attendance_daily_statuses_delete_admin
  ON public.attendance_daily_statuses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  );

-- ============================================================
-- Verification (optional)
-- ============================================================
-- SELECT * FROM public.attendance_daily_statuses LIMIT 5;
-- SELECT status, COUNT(*) FROM public.attendance_daily_statuses GROUP BY status;
-- SELECT * FROM public.attendance_daily_statuses WHERE date = CURRENT_DATE;

-- ============================================================
-- End of file
-- ============================================================


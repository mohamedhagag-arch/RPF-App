-- ============================================================
-- Absent Costs Table - Tracking costs for absent employees
-- This table stores the cost for employees who are absent or excused absent
-- The cost is calculated as: 8 hours × Overhead Hourly Rate from Designation Rate
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- Ensure UUID extension exists (harmless if already created)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: absent_costs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.absent_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.attendance_employees(id) ON DELETE CASCADE,
  attendance_status_id UUID NOT NULL REFERENCES public.attendance_daily_statuses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('absent', 'excused_absent')),
  designation_id UUID REFERENCES public.designation_rates(id) ON DELETE SET NULL,
  designation TEXT, -- Store designation name for reference
  overhead_hourly_rate DECIMAL(10, 2) NOT NULL,
  hours DECIMAL(5, 2) NOT NULL DEFAULT 8.00, -- Default 8 hours
  cost DECIMAL(10, 2) NOT NULL, -- Calculated: hours × overhead_hourly_rate
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT absent_costs_unique UNIQUE (attendance_status_id)
);

COMMENT ON TABLE public.absent_costs IS 'Cost tracking for absent and excused absent employees';
COMMENT ON COLUMN public.absent_costs.status IS 'absent | excused_absent';
COMMENT ON COLUMN public.absent_costs.overhead_hourly_rate IS 'Overhead hourly rate from designation_rates table';
COMMENT ON COLUMN public.absent_costs.hours IS 'Number of hours (default: 8)';
COMMENT ON COLUMN public.absent_costs.cost IS 'Calculated cost: hours × overhead_hourly_rate';

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_absent_costs_date ON public.absent_costs(date);
CREATE INDEX IF NOT EXISTS idx_absent_costs_status ON public.absent_costs(status);
CREATE INDEX IF NOT EXISTS idx_absent_costs_employee_date ON public.absent_costs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_absent_costs_designation ON public.absent_costs(designation_id);

-- ============================================================
-- Trigger to update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_absent_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_absent_costs_updated_at
  BEFORE UPDATE ON public.absent_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_absent_costs_updated_at();

-- ============================================================
-- Permissions & Row Level Security (RLS)
-- ============================================================
-- Grant permissions
GRANT ALL ON TABLE public.absent_costs TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE public.absent_costs TO anon;

-- Enable Row Level Security
ALTER TABLE public.absent_costs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for authenticated users
DROP POLICY IF EXISTS "auth_all_absent_costs" ON public.absent_costs;
CREATE POLICY "auth_all_absent_costs" ON public.absent_costs
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

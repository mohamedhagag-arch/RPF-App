-- ============================================================
-- Migrate absent_costs table to use employee_rates
-- تحديث جدول absent_costs لاستخدام employee_rates
-- ============================================================
-- This script migrates absent_costs from designation_rates to employee_rates
-- Run this script in Supabase SQL Editor AFTER creating employee_rates table
-- ============================================================

-- Step 1: Add new column for employee_rate_id
ALTER TABLE public.absent_costs
ADD COLUMN IF NOT EXISTS employee_rate_id UUID REFERENCES public.employee_rates(id) ON DELETE SET NULL;

-- Step 2: Migrate existing data from designation_id to employee_rate_id
-- This will try to find matching employee_rate by employee_code from attendance_employees
UPDATE public.absent_costs ac
SET employee_rate_id = (
  SELECT er.id
  FROM public.employee_rates er
  INNER JOIN public.attendance_employees ae ON er.employee_code = ae.employee_code
  WHERE ae.id = ac.employee_id
  LIMIT 1
)
WHERE ac.employee_rate_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.attendance_employees ae
    INNER JOIN public.employee_rates er ON er.employee_code = ae.employee_code
    WHERE ae.id = ac.employee_id
  );

-- Step 3: Create index for employee_rate_id
CREATE INDEX IF NOT EXISTS idx_absent_costs_employee_rate_id ON public.absent_costs(employee_rate_id);

-- Step 4: Update comments
COMMENT ON COLUMN public.absent_costs.employee_rate_id IS 'Reference to employee_rates table (replaces designation_id)';
COMMENT ON COLUMN public.absent_costs.designation_id IS 'Legacy field - kept for backward compatibility. Use employee_rate_id instead.';

-- Note: designation_id column is kept for backward compatibility but should not be used for new records
-- New records should use employee_rate_id instead

-- ============================================================
-- Success Message
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed!';
  RAISE NOTICE '📋 absent_costs now uses employee_rate_id';
  RAISE NOTICE '⚠️ designation_id kept for backward compatibility';
END $$;

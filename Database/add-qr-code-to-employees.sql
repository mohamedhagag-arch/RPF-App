-- ============================================================
-- Add QR Code Support to Attendance Employees
-- إضافة دعم QR Code لموظفي الحضور
-- ============================================================
-- 
-- This script adds QR Code field to attendance_employees table
-- and generates QR codes for existing employees
-- 
-- ============================================================

-- Step 1: Add qr_code column to attendance_employees
ALTER TABLE public.attendance_employees 
ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE;

-- Step 2: Create index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_attendance_employees_qr_code 
ON public.attendance_employees(qr_code) 
WHERE qr_code IS NOT NULL;

-- Step 3: Generate QR codes for existing employees that don't have one
-- QR Code format: EMP-{employee_id} (first 8 chars of UUID)
DO $$
DECLARE
  emp RECORD;
  qr_value TEXT;
BEGIN
  FOR emp IN 
    SELECT id, employee_code 
    FROM public.attendance_employees 
    WHERE qr_code IS NULL OR qr_code = ''
  LOOP
    -- Generate unique QR code: EMP-{first 8 chars of UUID}
    qr_value := 'EMP-' || UPPER(SUBSTRING(emp.id::TEXT, 1, 8));
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.attendance_employees WHERE qr_code = qr_value) LOOP
      qr_value := 'EMP-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
    END LOOP;
    
    UPDATE public.attendance_employees
    SET qr_code = qr_value
    WHERE id = emp.id;
    
    RAISE NOTICE 'Generated QR code for employee %: %', emp.employee_code, qr_value;
  END LOOP;
END $$;

-- Step 4: Create function to auto-generate QR code on insert
CREATE OR REPLACE FUNCTION generate_employee_qr_code()
RETURNS TRIGGER AS $$
DECLARE
  qr_value TEXT;
BEGIN
  -- Only generate if qr_code is not provided
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    -- Generate unique QR code: EMP-{first 8 chars of UUID}
    qr_value := 'EMP-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.attendance_employees WHERE qr_code = qr_value) LOOP
      qr_value := 'EMP-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
    END LOOP;
    
    NEW.qr_code := qr_value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-generate QR code
DROP TRIGGER IF EXISTS trigger_generate_employee_qr_code ON public.attendance_employees;
CREATE TRIGGER trigger_generate_employee_qr_code
  BEFORE INSERT ON public.attendance_employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_qr_code();

-- Step 6: Add comment
COMMENT ON COLUMN public.attendance_employees.qr_code IS 'Unique QR code for employee attendance (format: EMP-XXXXXXXX). Auto-generated and permanent.';

-- ============================================================
-- Verification
-- ============================================================
-- Check that all employees have QR codes
SELECT 
  COUNT(*) as total_employees,
  COUNT(qr_code) as employees_with_qr,
  COUNT(*) - COUNT(qr_code) as employees_without_qr
FROM public.attendance_employees;

-- View sample QR codes
SELECT 
  employee_code,
  name,
  qr_code
FROM public.attendance_employees
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 
-- ✅ QR Code format: EMP-XXXXXXXX (e.g., EMP-A1B2C3D4)
-- ✅ QR Code is auto-generated and permanent
-- ✅ QR Code remains the same even if employee data changes
-- ✅ QR Code is unique and indexed for fast lookups
-- 
-- ============================================================


-- ============================================================
-- Update Rental Column to TEXT to Support "R" Value
-- تحديث عمود Rental إلى TEXT لدعم قيمة "R" (مؤجرة)
-- ============================================================

-- Step 1: Change column type from NUMERIC to TEXT directly
-- تغيير نوع العمود من NUMERIC إلى TEXT مباشرة
-- This will automatically convert numeric values to text
ALTER TABLE public.machine_list
ALTER COLUMN rental TYPE TEXT USING 
  CASE 
    WHEN rental IS NOT NULL THEN rental::TEXT
    ELSE NULL
  END;

-- Step 2: Update comment
-- تحديث التعليق
COMMENT ON COLUMN public.machine_list.rental IS 'Rental status: "R" for rented, or rental cost as text.';

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Rental column updated to TEXT successfully.';
END $$;


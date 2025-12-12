-- ============================================================
-- MANPOWER Table - Add Location Column Migration
-- ============================================================
-- This migration adds a "Location" column to the CCD - MANPOWER table
-- Created: 2025-12-12
-- ============================================================

-- Add Location column to MANPOWER table
ALTER TABLE public."CCD - MANPOWER"
ADD COLUMN IF NOT EXISTS "Location" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public."CCD - MANPOWER"."Location" IS 'Location where the employee checked in/out (from attendance locations)';

-- Create index for Location column for better search performance
CREATE INDEX IF NOT EXISTS idx_manpower_location ON public."CCD - MANPOWER"("Location");

-- ============================================================
-- Verification
-- ============================================================

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CCD - MANPOWER'
      AND column_name = 'Location'
  ) THEN
    RAISE NOTICE '✅ Column "Location" added successfully to "CCD - MANPOWER" table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add column "Location" to "CCD - MANPOWER" table';
  END IF;
END $$;

-- Display column information
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'CCD - MANPOWER'
  AND column_name = 'Location';

-- ============================================================
-- END OF MIGRATION
-- ============================================================


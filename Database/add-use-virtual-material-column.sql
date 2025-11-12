-- ============================================================
-- Add "Use Virtual Material" Column to BOQ Activities Table
-- ============================================================
-- This script adds the "Use Virtual Material" column to the
-- "Planning Database - BOQ Rates" table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Check if column already exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Planning Database - BOQ Rates'
    AND column_name = 'Use Virtual Material'
  ) THEN
    RAISE NOTICE '✅ Column "Use Virtual Material" already exists';
  ELSE
    -- Step 2: Add the column
    ALTER TABLE "Planning Database - BOQ Rates"
    ADD COLUMN "Use Virtual Material" TEXT DEFAULT 'FALSE';
    
    RAISE NOTICE '✅ Column "Use Virtual Material" added successfully';
  END IF;
END $$;

-- Step 3: Update existing rows to have default value 'FALSE'
UPDATE "Planning Database - BOQ Rates"
SET "Use Virtual Material" = 'FALSE'
WHERE "Use Virtual Material" IS NULL;

-- Step 4: Add comment to column
COMMENT ON COLUMN "Planning Database - BOQ Rates"."Use Virtual Material" IS 
'If TRUE, auto-generate KPIs and use Virtual Material Value from project in KPI calculations';

-- Step 5: Verify the column was added
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Planning Database - BOQ Rates'
    AND column_name = 'Use Virtual Material'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE '✅ Verification: Column "Use Virtual Material" exists in table';
    RAISE NOTICE '✅ Script completed successfully!';
  ELSE
    RAISE EXCEPTION '❌ Verification failed: Column "Use Virtual Material" was not found';
  END IF;
END $$;


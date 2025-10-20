-- ============================================
-- Post Completion Feature Migration Script
-- ============================================
-- تاريخ: 2025-10-20
-- الوصف: إضافة دعم Post Completion للأنشطة
-- ============================================

-- Step 1: Add new columns to BOQ activities table
ALTER TABLE "Planning Database - BOQ Rates" 
ADD COLUMN IF NOT EXISTS activity_timing TEXT,
ADD COLUMN IF NOT EXISTS has_value BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS affects_timeline BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing records with default values
UPDATE "Planning Database - BOQ Rates"
SET 
  activity_timing = 'post-commencement',
  has_value = TRUE,
  affects_timeline = FALSE
WHERE activity_timing IS NULL;

-- Step 3: Add CHECK constraints for data integrity
ALTER TABLE "Planning Database - BOQ Rates"
ADD CONSTRAINT check_activity_timing 
CHECK (activity_timing IN ('pre-commencement', 'post-commencement', 'post-completion'));

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_boq_activity_timing 
ON "Planning Database - BOQ Rates" (activity_timing);

CREATE INDEX IF NOT EXISTS idx_boq_has_value 
ON "Planning Database - BOQ Rates" (has_value);

CREATE INDEX IF NOT EXISTS idx_boq_affects_timeline 
ON "Planning Database - BOQ Rates" (affects_timeline);

-- Step 5: Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_boq_timing_value_timeline 
ON "Planning Database - BOQ Rates" (activity_timing, has_value, affects_timeline);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN "Planning Database - BOQ Rates".activity_timing IS 
'Timing of the activity: pre-commencement (before project start), post-commencement (with/after start), post-completion (after project end)';

COMMENT ON COLUMN "Planning Database - BOQ Rates".has_value IS 
'Indicates if the activity has monetary value and should be included in project calculations';

COMMENT ON COLUMN "Planning Database - BOQ Rates".affects_timeline IS 
'Indicates if the activity affects the overall project timeline and should be tracked';

-- ============================================
-- Verification Queries
-- ============================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'Planning Database - BOQ Rates'
  AND column_name IN ('activity_timing', 'has_value', 'affects_timeline');

-- Count activities by timing type
SELECT 
  activity_timing,
  COUNT(*) as activity_count,
  SUM(CASE WHEN has_value THEN 1 ELSE 0 END) as valued_activities,
  SUM(CASE WHEN affects_timeline THEN 1 ELSE 0 END) as timeline_affecting
FROM "Planning Database - BOQ Rates"
GROUP BY activity_timing
ORDER BY activity_timing;

-- Sample post-completion activities
SELECT 
  "Project Code",
  "Activity Name",
  activity_timing,
  has_value,
  affects_timeline,
  "Planned Units",
  "Unit"
FROM "Planning Database - BOQ Rates"
WHERE activity_timing = 'post-completion'
LIMIT 10;

-- ============================================
-- Rollback Script (if needed)
-- ============================================
/*
-- Uncomment to rollback changes

-- Drop indexes
DROP INDEX IF EXISTS idx_boq_timing_value_timeline;
DROP INDEX IF EXISTS idx_boq_affects_timeline;
DROP INDEX IF EXISTS idx_boq_has_value;
DROP INDEX IF EXISTS idx_boq_activity_timing;

-- Drop constraint
ALTER TABLE "Planning Database - BOQ Rates"
DROP CONSTRAINT IF EXISTS check_activity_timing;

-- Drop columns
ALTER TABLE "Planning Database - BOQ Rates"
DROP COLUMN IF EXISTS affects_timeline,
DROP COLUMN IF EXISTS has_value,
DROP COLUMN IF EXISTS activity_timing;

*/


-- ============================================================
-- Safe Calculation Setup - Handles Existing Columns
-- This script safely adds calculation columns without errors
-- ============================================================

-- ============================================================
-- PART 1: Check and add columns safely
-- ============================================================

-- Add calculation columns to BOQ Activities table (only if they don't exist)
DO $$ 
BEGIN
    -- Add rate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'rate') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN rate DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add progress_percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'progress_percentage') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add earned_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'earned_value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN earned_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add actual_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'actual_value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN actual_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add planned_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'planned_value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN planned_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add remaining_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'remaining_value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN remaining_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add last_calculated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'last_calculated_at') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN last_calculated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- ============================================================
-- PART 2: Add columns to Projects table safely
-- ============================================================

DO $$ 
BEGIN
    -- Add total_planned_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'total_planned_value') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN total_planned_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add total_earned_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'total_earned_value') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN total_earned_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add overall_progress column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'overall_progress') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN overall_progress DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add schedule_performance_index column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'schedule_performance_index') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN schedule_performance_index DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add cost_performance_index column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'cost_performance_index') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN cost_performance_index DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add last_calculated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'last_calculated_at') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN last_calculated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- ============================================================
-- PART 3: Create indexes safely
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_boq_rate ON "Planning Database - BOQ Rates"(rate);
CREATE INDEX IF NOT EXISTS idx_boq_progress ON "Planning Database - BOQ Rates"(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_boq_last_calculated ON "Planning Database - BOQ Rates"(last_calculated_at);

CREATE INDEX IF NOT EXISTS idx_projects_total_planned ON "Planning Database - ProjectsList"(total_planned_value);
CREATE INDEX IF NOT EXISTS idx_projects_total_earned ON "Planning Database - ProjectsList"(total_earned_value);
CREATE INDEX IF NOT EXISTS idx_projects_overall_progress ON "Planning Database - ProjectsList"(overall_progress);
CREATE INDEX IF NOT EXISTS idx_projects_last_calculated ON "Planning Database - ProjectsList"(last_calculated_at);

-- ============================================================
-- PART 4: Update existing data with calculated values
-- ============================================================

-- Update BOQ activities with calculated values
UPDATE "Planning Database - BOQ Rates" 
SET 
  rate = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
  END,
  progress_percentage = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100
    ELSE 0 
  END,
  earned_value = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
  END,
  actual_value = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL),
  planned_value = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL),
  remaining_value = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * (CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) - CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL))
    ELSE 0 
  END,
  last_calculated_at = NOW()
WHERE rate = 0 OR rate IS NULL;

-- ============================================================
-- PART 5: Create views
-- ============================================================

-- Create view for BOQ activities with calculations
CREATE OR REPLACE VIEW boq_activities_with_calculations AS
SELECT 
  *,
  rate,
  progress_percentage,
  earned_value,
  actual_value,
  planned_value,
  remaining_value,
  last_calculated_at
FROM "Planning Database - BOQ Rates";

-- Create view for projects with calculations
CREATE OR REPLACE VIEW projects_with_calculations AS
SELECT 
  *,
  total_planned_value,
  total_earned_value,
  overall_progress,
  schedule_performance_index,
  cost_performance_index,
  last_calculated_at
FROM "Planning Database - ProjectsList";

-- ============================================================
-- PART 6: Grant permissions
-- ============================================================

GRANT SELECT ON boq_activities_with_calculations TO authenticated;
GRANT SELECT ON projects_with_calculations TO authenticated;

-- ============================================================
-- PART 7: Success message
-- ============================================================

SELECT 'Safe calculation setup completed successfully!' as status;

-- ============================================================
-- Add Calculation Columns - FIXED VERSION
-- Based on actual Supabase database structure
-- ============================================================

-- ============================================================
-- PART 1: Add calculation columns to BOQ Activities table
-- ============================================================

-- Add calculation columns to "Planning Database - BOQ Rates"
-- Note: Some columns might already exist, so we use IF NOT EXISTS
ALTER TABLE "Planning Database - BOQ Rates" 
ADD COLUMN IF NOT EXISTS rate DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP DEFAULT NOW();

-- ============================================================
-- PART 2: Add calculation columns to Projects table
-- ============================================================

-- Add calculation columns to "Planning Database - ProjectsList"
ALTER TABLE "Planning Database - ProjectsList" 
ADD COLUMN IF NOT EXISTS total_planned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_progress DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule_performance_index DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_performance_index DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP DEFAULT NOW();

-- ============================================================
-- PART 3: Create indexes for better performance
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
    WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
    THEN CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
  END,
  progress_percentage = CASE 
    WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
    THEN (CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100
    ELSE 0 
  END,
  earned_value = CASE 
    WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
  END,
  actual_value = CASE 
    WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
  END,
  planned_value = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL),
  remaining_value = CASE 
    WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * (CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) - CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL))
    ELSE 0 
  END,
  last_calculated_at = NOW()
WHERE rate = 0 OR rate IS NULL;

-- ============================================================
-- PART 5: Update projects with calculated values
-- ============================================================

-- Update projects with calculated values
UPDATE "Planning Database - ProjectsList" 
SET 
  total_planned_value = (
    SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
  ),
  total_earned_value = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
        THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
        ELSE 0 
      END
    ), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
  ),
  overall_progress = CASE 
    WHEN (
      SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) > 0 THEN (
      SELECT COALESCE(SUM(
        CASE 
          WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
          THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) / (
      SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) * 100
    ELSE 0 
  END,
  schedule_performance_index = CASE 
    WHEN (
      SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) > 0 THEN (
      SELECT COALESCE(SUM(
        CASE 
          WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
          THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) / (
      SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    )
    ELSE 0 
  END,
  cost_performance_index = CASE 
    WHEN (
      SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) > 0 THEN (
      SELECT COALESCE(SUM(
        CASE 
          WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
          THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) / (
      SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    )
    ELSE 0 
  END,
  last_calculated_at = NOW()
WHERE total_planned_value = 0 OR total_planned_value IS NULL;

-- ============================================================
-- PART 6: Create views for easy access
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
-- PART 7: Grant permissions
-- ============================================================

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON "Planning Database - BOQ Rates" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Planning Database - ProjectsList" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant access to views
GRANT SELECT ON boq_activities_with_calculations TO authenticated;
GRANT SELECT ON projects_with_calculations TO authenticated;

-- ============================================================
-- PART 8: Success message
-- ============================================================

SELECT 'Calculation columns added successfully!' as status;

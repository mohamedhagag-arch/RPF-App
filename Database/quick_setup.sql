-- Quick Setup for Calculation Columns
-- This is a simplified version for quick execution

-- Add columns to BOQ Activities table
ALTER TABLE "Planning Database - BOQ Rates" 
ADD COLUMN IF NOT EXISTS rate DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP DEFAULT NOW();

-- Add columns to Projects table
ALTER TABLE "Planning Database - ProjectsList" 
ADD COLUMN IF NOT EXISTS total_planned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_progress DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule_performance_index DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_performance_index DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP DEFAULT NOW();

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_boq_rate ON "Planning Database - BOQ Rates"(rate);
CREATE INDEX IF NOT EXISTS idx_boq_progress ON "Planning Database - BOQ Rates"(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_projects_progress ON "Planning Database - ProjectsList"(overall_progress);

-- Update existing data with calculated values
UPDATE "Planning Database - BOQ Rates" 
SET 
  rate = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)
    ELSE 0 
  END,
  progress_percentage = CASE 
    WHEN CAST(REPLACE("Total Value", ',', '') AS DECIMAL) > 0 AND CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN 
      ((CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)) / CAST(REPLACE("Total Value", ',', '') AS DECIMAL) * 100
    ELSE 0 
  END,
  earned_value = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
    ELSE 0 
  END,
  actual_value = CAST(REPLACE("Total Value", ',', '') AS DECIMAL),
  planned_value = CAST(REPLACE("Total Value", ',', '') AS DECIMAL),
  remaining_value = CAST("Total Value" AS DECIMAL) - CASE 
    WHEN CAST("Planned Units" AS DECIMAL) > 0 THEN (CAST("Total Value" AS DECIMAL) / CAST("Planned Units" AS DECIMAL)) * CAST("Actual Units" AS DECIMAL)
    ELSE 0 
  END,
  last_calculated_at = NOW();

-- Update projects with calculated values
UPDATE "Planning Database - ProjectsList" 
SET 
  total_planned_value = (
    SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
  ),
  total_earned_value = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
        ELSE 0 
      END
    ), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
  ),
  overall_progress = CASE 
    WHEN (
      SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) > 0 THEN (
      SELECT COALESCE(SUM(
        CASE 
          WHEN "Planned Units" > 0 THEN ("Total Value" / "Planned Units") * "Actual Units"
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) / (
      SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) * 100
    ELSE 0 
  END,
  last_calculated_at = NOW();

-- Create views for easy access
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

-- Grant access to views
GRANT SELECT ON boq_activities_with_calculations TO authenticated;
GRANT SELECT ON projects_with_calculations TO authenticated;

-- Success message
SELECT 'Calculation columns added successfully!' as status;

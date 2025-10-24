-- ============================================================
-- Quick Calculation Setup - SIMPLIFIED VERSION
-- For immediate execution without errors
-- ============================================================

-- ============================================================
-- PART 1: Add calculation columns
-- ============================================================

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

-- ============================================================
-- PART 2: Create basic indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_boq_rate ON "Planning Database - BOQ Rates"(rate);
CREATE INDEX IF NOT EXISTS idx_boq_progress ON "Planning Database - BOQ Rates"(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_projects_progress ON "Planning Database - ProjectsList"(overall_progress);

-- ============================================================
-- PART 3: Update existing data (simplified)
-- ============================================================

-- Update BOQ activities with basic calculations
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
-- PART 4: Create views
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
-- PART 5: Grant permissions
-- ============================================================

GRANT SELECT ON boq_activities_with_calculations TO authenticated;
GRANT SELECT ON projects_with_calculations TO authenticated;

-- ============================================================
-- PART 6: Success message
-- ============================================================

SELECT 'Quick calculation setup completed successfully!' as status;

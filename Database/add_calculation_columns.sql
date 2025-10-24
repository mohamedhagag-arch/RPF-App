-- Add calculation columns to BOQ Activities table
-- This script adds the necessary columns for auto-calculated values

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boq_activities_rate ON "Planning Database - BOQ Rates"(rate);
CREATE INDEX IF NOT EXISTS idx_boq_activities_progress ON "Planning Database - BOQ Rates"(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_boq_activities_last_calculated ON "Planning Database - BOQ Rates"(last_calculated_at);

CREATE INDEX IF NOT EXISTS idx_projects_total_planned_value ON "Planning Database - ProjectsList"(total_planned_value);
CREATE INDEX IF NOT EXISTS idx_projects_total_earned_value ON "Planning Database - ProjectsList"(total_earned_value);
CREATE INDEX IF NOT EXISTS idx_projects_overall_progress ON "Planning Database - ProjectsList"(overall_progress);
CREATE INDEX IF NOT EXISTS idx_projects_last_calculated ON "Planning Database - ProjectsList"(last_calculated_at);

-- Update existing data with calculated values
-- This will populate the new columns with calculated values for existing data

-- Update BOQ activities with calculated values
UPDATE "Planning Database - BOQ Rates" 
SET 
  rate = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)
    ELSE 0 
  END,
  progress_percentage = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Actual Units", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * 100
    ELSE 0 
  END,
  earned_value = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
    ELSE 0 
  END,
  actual_value = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
    ELSE 0 
  END,
  planned_value = CAST(REPLACE("Total Value", ',', '') AS DECIMAL),
  remaining_value = CASE 
    WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * (CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) - CAST(REPLACE("Actual Units", ',', '') AS DECIMAL))
    ELSE 0 
  END,
  last_calculated_at = NOW()
WHERE rate = 0 OR rate IS NULL;

-- Update "Planning Database - ProjectsList" with calculated values
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
          WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
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
  schedule_performance_index = CASE 
    WHEN (
      SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) > 0 THEN (
      SELECT COALESCE(SUM(
        CASE 
          WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) / (
      SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    )
    ELSE 0 
  END,
  cost_performance_index = CASE 
    WHEN (
      SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) > 0 THEN (
      SELECT COALESCE(SUM(
        CASE 
          WHEN CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) > 0 THEN (CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL)
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    ) / (
      SELECT COALESCE(SUM(CAST(REPLACE("Total Value", ',', '') AS DECIMAL)), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    )
    ELSE 0 
  END,
  last_calculated_at = NOW()
WHERE total_planned_value = 0 OR total_planned_value IS NULL;

-- Create a function to automatically update calculations when data changes
CREATE OR REPLACE FUNCTION update_boq_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the activity's calculated values
  NEW.rate = CASE 
    WHEN NEW."Planned Units" > 0 THEN NEW."Total Value" / NEW."Planned Units"
    ELSE 0 
  END;
  
  NEW.progress_percentage = CASE 
    WHEN NEW."Planned Units" > 0 THEN (NEW."Actual Units" / NEW."Planned Units") * 100
    ELSE 0 
  END;
  
  NEW.earned_value = CASE 
    WHEN NEW."Planned Units" > 0 THEN (NEW."Total Value" / NEW."Planned Units") * NEW."Actual Units"
    ELSE 0 
  END;
  
  NEW.actual_value = NEW.earned_value;
  NEW.planned_value = NEW."Total Value";
  NEW.remaining_value = CASE 
    WHEN NEW."Planned Units" > 0 THEN (NEW."Total Value" / NEW."Planned Units") * (NEW."Planned Units" - NEW."Actual Units")
    ELSE 0 
  END;
  
  NEW.last_calculated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update calculations
DROP TRIGGER IF EXISTS trigger_update_boq_calculations ON "Planning Database - BOQ Rates";
CREATE TRIGGER trigger_update_boq_calculations
  BEFORE INSERT OR UPDATE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_boq_calculations();

-- Create a function to update project calculations when BOQ activities change
CREATE OR REPLACE FUNCTION update_project_calculations()
RETURNS TRIGGER AS $$
DECLARE
  project_code TEXT;
BEGIN
  -- Get the project code from the changed activity
  IF TG_OP = 'DELETE' THEN
    project_code = OLD."Project Code";
  ELSE
    project_code = NEW."Project Code";
  END IF;
  
  -- Update the project's calculated values
  UPDATE "Planning Database - ProjectsList" 
  SET 
    total_planned_value = (
      SELECT COALESCE(SUM("Total Value"), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = project_code
    ),
    total_earned_value = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN "Planned Units" > 0 THEN ("Total Value" / "Planned Units") * "Actual Units"
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = project_code
    ),
    overall_progress = CASE 
      WHEN (
        SELECT COALESCE(SUM("Total Value"), 0)
        FROM "Planning Database - BOQ Rates" 
        WHERE "Project Code" = project_code
      ) > 0 THEN (
        SELECT COALESCE(SUM(
          CASE 
            WHEN "Planned Units" > 0 THEN ("Total Value" / "Planned Units") * "Actual Units"
            ELSE 0 
          END
        ), 0)
        FROM "Planning Database - BOQ Rates" 
        WHERE "Project Code" = project_code
      ) / (
        SELECT COALESCE(SUM("Total Value"), 0)
        FROM "Planning Database - BOQ Rates" 
        WHERE "Project Code" = project_code
      ) * 100
      ELSE 0 
    END,
    last_calculated_at = NOW()
  WHERE project_code = "Planning Database - ProjectsList".project_code;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update project calculations
DROP TRIGGER IF EXISTS trigger_update_project_calculations ON "Planning Database - BOQ Rates";
CREATE TRIGGER trigger_update_project_calculations
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_calculations();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "Planning Database - BOQ Rates" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Planning Database - ProjectsList" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a view for easy access to calculated values
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

-- Create a view for project calculations
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

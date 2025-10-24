-- ============================================================
-- Update Existing Calculations - Handle Existing Columns
-- This script updates existing calculation columns without adding new ones
-- ============================================================

-- ============================================================
-- PART 1: Check what columns exist first
-- ============================================================

-- Show existing columns in BOQ Rates table
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name IN ('rate', 'progress_percentage', 'earned_value', 'actual_value', 'planned_value', 'remaining_value', 'last_calculated_at')
        THEN 'CALCULATION COLUMN'
        ELSE 'REGULAR COLUMN'
    END as column_type
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- ============================================================
-- PART 2: Update existing calculation columns (if they exist)
-- ============================================================

-- Update rate column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'Rate') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET "Rate" = CASE 
            WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
            THEN CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
            ELSE 0 
        END
        WHERE "Rate" = 0 OR "Rate" IS NULL;
        
        RAISE NOTICE 'Updated rate column';
    ELSE
        RAISE NOTICE 'Rate column does not exist';
    END IF;
END $$;

-- Update progress_percentage column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'Activity Progress %') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET "Activity Progress %" = CASE 
            WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
            THEN (CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100
            ELSE 0 
        END
        WHERE "Activity Progress %" = 0 OR "Activity Progress %" IS NULL;
        
        RAISE NOTICE 'Updated progress_percentage column';
    ELSE
        RAISE NOTICE 'Progress_percentage column does not exist';
    END IF;
END $$;

-- Update earned_value column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'Earned Value') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET "Earned Value" = CASE 
            WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
            THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
            ELSE 0 
        END
        WHERE "Earned Value" = 0 OR "Earned Value" IS NULL;
        
        RAISE NOTICE 'Updated earned_value column';
    ELSE
        RAISE NOTICE 'Earned_value column does not exist';
    END IF;
END $$;

-- Update actual_value column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'actual_value') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET actual_value = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
        WHERE actual_value = 0 OR actual_value IS NULL;
        
        RAISE NOTICE 'Updated actual_value column';
    ELSE
        RAISE NOTICE 'Actual_value column does not exist';
    END IF;
END $$;

-- Update planned_value column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'planned_value') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET planned_value = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
        WHERE planned_value = 0 OR planned_value IS NULL;
        
        RAISE NOTICE 'Updated planned_value column';
    ELSE
        RAISE NOTICE 'Planned_value column does not exist';
    END IF;
END $$;

-- Update remaining_value column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'remaining_value') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET remaining_value = CASE 
            WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
            THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * (CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) - CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL))
            ELSE 0 
        END
        WHERE remaining_value = 0 OR remaining_value IS NULL;
        
        RAISE NOTICE 'Updated remaining_value column';
    ELSE
        RAISE NOTICE 'Remaining_value column does not exist';
    END IF;
END $$;

-- Update last_calculated_at column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - BOQ Rates' 
               AND column_name = 'last_calculated_at') THEN
        
        UPDATE "Planning Database - BOQ Rates" 
        SET last_calculated_at = NOW()
        WHERE last_calculated_at IS NULL;
        
        RAISE NOTICE 'Updated last_calculated_at column';
    ELSE
        RAISE NOTICE 'Last_calculated_at column does not exist';
    END IF;
END $$;

-- ============================================================
-- PART 3: Update project calculation columns (if they exist)
-- ============================================================

-- Update total_planned_value column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - ProjectsList' 
               AND column_name = 'total_planned_value') THEN
        
        UPDATE "Planning Database - ProjectsList" 
        SET total_planned_value = (
            SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
            FROM "Planning Database - BOQ Rates" 
            WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
        )
        WHERE total_planned_value = 0 OR total_planned_value IS NULL;
        
        RAISE NOTICE 'Updated total_planned_value column';
    ELSE
        RAISE NOTICE 'Total_planned_value column does not exist';
    END IF;
END $$;

-- Update total_earned_value column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - ProjectsList' 
               AND column_name = 'total_earned_value') THEN
        
        UPDATE "Planning Database - ProjectsList" 
        SET total_earned_value = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
                    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
                    ELSE 0 
                END
            ), 0)
            FROM "Planning Database - BOQ Rates" 
            WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
        )
        WHERE total_earned_value = 0 OR total_earned_value IS NULL;
        
        RAISE NOTICE 'Updated total_earned_value column';
    ELSE
        RAISE NOTICE 'Total_earned_value column does not exist';
    END IF;
END $$;

-- Update overall_progress column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Planning Database - ProjectsList' 
               AND column_name = 'overall_progress') THEN
        
        UPDATE "Planning Database - ProjectsList" 
        SET overall_progress = CASE 
            WHEN (
                SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
                FROM "Planning Database - BOQ Rates" 
                WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
            ) > 0 THEN (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
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
        END
        WHERE overall_progress = 0 OR overall_progress IS NULL;
        
        RAISE NOTICE 'Updated overall_progress column';
    ELSE
        RAISE NOTICE 'Overall_progress column does not exist';
    END IF;
END $$;

-- ============================================================
-- PART 4: Create views (safe)
-- ============================================================

-- Create view for BOQ activities with calculations
CREATE OR REPLACE VIEW boq_activities_with_calculations AS
SELECT 
  *,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Planning Database - BOQ Rates' 
                AND column_name = 'Rate') 
    THEN "Rate" 
    ELSE NULL 
  END as rate,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Planning Database - BOQ Rates' 
                AND column_name = 'Activity Progress %') 
    THEN "Activity Progress %" 
    ELSE NULL 
  END as progress_percentage,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Planning Database - BOQ Rates' 
                AND column_name = 'Earned Value') 
    THEN "Earned Value" 
    ELSE NULL 
  END as earned_value
FROM "Planning Database - BOQ Rates";

-- ============================================================
-- PART 5: Success message
-- ============================================================

SELECT 'Calculation update completed successfully!' as status;

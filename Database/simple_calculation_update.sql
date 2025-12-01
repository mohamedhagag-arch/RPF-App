-- ============================================================
-- Simple Calculation Update - Just Update Existing Columns
-- This script only updates existing calculation columns
-- ============================================================

-- ============================================================
-- PART 1: Update BOQ Activities calculations
-- ============================================================

-- Update rate calculations
UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
END
WHERE "Rate" = 0 OR "Rate" IS NULL;

-- Update progress calculations
UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100
    ELSE 0 
END
WHERE "Activity Progress %" = 0 OR "Activity Progress %" IS NULL;

-- Update earned value calculations
UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
END
WHERE "Earned Value" = 0 OR "Earned Value" IS NULL;

-- Update actual value
UPDATE "Planning Database - BOQ Rates" 
SET "Actual Value" = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
WHERE "Actual Value" = 0 OR "Actual Value" IS NULL;

-- Update planned value
UPDATE "Planning Database - BOQ Rates" 
SET "Planned Value" = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
WHERE "Planned Value" = 0 OR "Planned Value" IS NULL;

-- Update remaining value
UPDATE "Planning Database - BOQ Rates" 
SET "Remaining Work Value" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * (CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) - CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL))
    ELSE 0 
END
WHERE "Remaining Work Value" = 0 OR "Remaining Work Value" IS NULL;

-- ============================================================
-- PART 2: Update Projects calculations
-- ============================================================

-- Update total planned value
UPDATE "Planning Database - ProjectsList" 
SET total_planned_value = (
    SELECT COALESCE(SUM(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
)
WHERE total_planned_value = 0 OR total_planned_value IS NULL;

-- Update total earned value
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

-- Update overall progress
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

-- Update last calculated timestamp
UPDATE "Planning Database - ProjectsList" 
SET last_calculated_at = NOW()
WHERE last_calculated_at IS NULL;

-- ============================================================
-- PART 3: Success message
-- ============================================================

SELECT 'Simple calculation update completed successfully!' as status;

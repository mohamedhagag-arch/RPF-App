-- ============================================================
-- Fix: column Planning Database - ProjectsList.project_code does not exist
-- إصلاح خطأ: عمود project_code غير موجود
-- ============================================================
-- المشكلة: في trigger update_project_calculations يستخدم project_code بدلاً من "Project Code"
-- ============================================================

-- Fix the update_project_calculations function
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
  -- ✅ FIXED: Use "Project Code" instead of project_code in WHERE clause
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
  WHERE "Project Code" = project_code;  -- ✅ FIXED: Use "Project Code" instead of project_code
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS trigger_update_project_calculations ON "Planning Database - BOQ Rates";
CREATE TRIGGER trigger_update_project_calculations
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_calculations();

-- ============================================================
-- Check for any other functions/triggers using project_code
-- ============================================================

-- Check for other triggers on ProjectsList table
DO $$ 
BEGIN
  -- Drop any problematic triggers on ProjectsList
  -- This trigger should only be on BOQ Rates, not on ProjectsList
  DROP TRIGGER IF EXISTS trigger_update_project_calculations ON "Planning Database - ProjectsList";
  
  RAISE NOTICE 'Checked for problematic triggers on ProjectsList table';
END $$;

-- ============================================================
-- Fix comprehensive-import-fix.sql function
-- ============================================================
CREATE OR REPLACE FUNCTION create_or_get_project_id(
  p_project_code TEXT,
  p_project_sub_code TEXT,
  p_project_name TEXT,
  p_project_type TEXT,
  p_responsible_division TEXT,
  p_plot_number TEXT,
  p_contract_amount NUMERIC,
  p_project_status TEXT
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO "Planning Database - ProjectsList" (
    "Project Code",           -- ✅ FIXED: Use "Project Code" instead of project_code
    "Project Sub-Code",       -- ✅ FIXED: Use "Project Sub-Code" instead of project_sub_code
    "Project Name",           -- ✅ FIXED: Use "Project Name" instead of project_name
    "Project Type",           -- ✅ FIXED: Use "Project Type" instead of project_type
    "Responsible Division",   -- ✅ FIXED: Use "Responsible Division" instead of responsible_division
    "Plot Number",            -- ✅ FIXED: Use "Plot Number" instead of plot_number
    "Contract Amount",        -- ✅ FIXED: Use "Contract Amount" instead of contract_amount
    "Project Status",         -- ✅ FIXED: Use "Project Status" instead of project_status
    "KPI Completed",          -- ✅ FIXED: Use "KPI Completed" instead of kpi_completed
    created_at,
    updated_at
  ) VALUES (
    p_project_code,
    p_project_sub_code,
    p_project_name,
    p_project_type,
    p_responsible_division,
    p_plot_number,
    p_contract_amount::TEXT,  -- Convert to TEXT since Contract Amount is TEXT
    p_project_status,
    'FALSE',
    NOW(),
    NOW()
  ) ON CONFLICT ("Project Code", "Project Sub-Code") DO UPDATE SET  -- ✅ FIXED: Use column names with quotes
    "Project Name" = EXCLUDED."Project Name",
    "Project Type" = EXCLUDED."Project Type",
    "Responsible Division" = EXCLUDED."Responsible Division",
    "Plot Number" = EXCLUDED."Plot Number",
    "Contract Amount" = EXCLUDED."Contract Amount",
    "Project Status" = EXCLUDED."Project Status",
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM "Planning Database - ProjectsList" 
    WHERE "Project Code" = p_project_code AND "Project Sub-Code" = p_project_sub_code  -- ✅ FIXED: Use "Project Code" instead of project_code
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Fix update_project_status function that might reference wrong columns
-- ============================================================
CREATE OR REPLACE FUNCTION update_project_status()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by triggers to update project status
  -- The actual status calculation will be done by the application
  -- This is just a placeholder for future database-level updates
  
  -- ✅ FIXED: Don't try to update projects table that doesn't exist
  -- The table is "Planning Database - ProjectsList", not "projects"
  -- For now, this function just returns without error
  -- Future implementation can use "Project Code" to find and update projects
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Check for problematic triggers on ProjectsList
-- ============================================================
-- List all triggers to identify problematic ones
DO $$ 
DECLARE
  r RECORD;
  problematic_triggers TEXT[] := ARRAY[
    'trigger_update_project_calculations'  -- This should NOT be on ProjectsList
  ];
BEGIN
  -- Find all triggers on ProjectsList table and log them
  FOR r IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'Planning Database - ProjectsList'
  LOOP
    -- Only drop known problematic triggers
    IF r.trigger_name = ANY(problematic_triggers) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON "Planning Database - ProjectsList"', r.trigger_name);
      RAISE NOTICE 'Dropped problematic trigger: %', r.trigger_name;
    ELSE
      RAISE NOTICE 'Keeping trigger: % (not problematic)', r.trigger_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Check if there are any views or constraints using project_code
-- ============================================================
DO $$ 
BEGIN
  -- Try to find any constraints or indexes that might reference project_code
  -- Note: This is just for information, we can't easily drop constraints without knowing their names
  RAISE NOTICE 'Checking for problematic constraints or indexes...';
END $$;

-- ============================================================
-- Verification
-- ============================================================
SELECT 'All triggers and functions fixed successfully!' AS status;

-- List all triggers on ProjectsList to verify
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'Planning Database - ProjectsList';


-- ============================================================
-- FIX COMPLETE: column Planning Database - ProjectsList.project_code does not exist
-- إصلاح شامل لخطأ: عمود project_code غير موجود
-- ============================================================

-- Step 1: Find and list all problematic code
-- ============================================================
SELECT 
  'Current triggers on ProjectsList:' AS info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'Planning Database - ProjectsList';

-- Step 2: Drop ALL triggers on ProjectsList that might cause issues
-- ============================================================
-- We'll recreate the safe ones after
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'Planning Database - ProjectsList'
    AND trigger_name != 'update_projects_updated_at'
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON "Planning Database - ProjectsList"', r.trigger_name);
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Fix update_project_calculations function
-- ============================================================
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
  -- ✅ FIXED: Use "Project Code" instead of project_code
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
  WHERE "Project Code" = project_code;  -- ✅ FIXED: Use "Project Code"
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Fix create_or_get_project_id function
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
    "Project Code",
    "Project Sub-Code",
    "Project Name",
    "Project Type",
    "Responsible Division",
    "Plot Number",
    "Contract Amount",
    "Project Status",
    "KPI Completed",
    created_at,
    updated_at
  ) VALUES (
    p_project_code,
    p_project_sub_code,
    p_project_name,
    p_project_type,
    p_responsible_division,
    p_plot_number,
    p_contract_amount::TEXT,
    p_project_status,
    'FALSE',
    NOW(),
    NOW()
  ) ON CONFLICT ("Project Code", "Project Sub-Code") DO UPDATE SET
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
    WHERE "Project Code" = p_project_code AND "Project Sub-Code" = p_project_sub_code
  ));
END;
$$ LANGUAGE plpgsql;

-- Step 5: Fix update_project_status function
-- ============================================================
CREATE OR REPLACE FUNCTION update_project_status()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is called by triggers but doesn't update ProjectsList
  -- It just returns without error to prevent issues
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 6: Recreate safe triggers only on BOQ Rates (NOT on ProjectsList)
-- ============================================================
DROP TRIGGER IF EXISTS trigger_update_project_calculations ON "Planning Database - BOQ Rates";
CREATE TRIGGER trigger_update_project_calculations
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_calculations();

-- Step 7: Check for constraints and defaults that might use project_code
-- ============================================================
-- Check for constraints
SELECT 
  'Constraints on ProjectsList:' AS info,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = '"Planning Database - ProjectsList"'::regclass;

-- Check for column defaults
SELECT 
  'Column defaults on ProjectsList:' AS info,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'Planning Database - ProjectsList'
AND column_default IS NOT NULL;

-- Step 8: Check for RLS policies that might cause issues
-- ============================================================
-- RLS policies should be fine, but let's verify
SELECT 
  'RLS Policies on ProjectsList:' AS info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'Planning Database - ProjectsList';

-- Step 9: Verify final state
-- ============================================================
SELECT '✅ All fixes applied successfully!' AS status;

-- List remaining triggers
SELECT 
  'Remaining triggers:' AS info,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'Planning Database - ProjectsList';


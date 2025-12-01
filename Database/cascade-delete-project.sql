-- ============================================================
-- CASCADE DELETE: Delete related BOQ and KPI when project is deleted
-- حذف تلقائي: حذف جميع BOQ و KPI المرتبطة عند حذف مشروع
-- ============================================================
-- هذا السكريبت ينشئ Trigger يقوم بحذف جميع:
-- 1. BOQ Activities المرتبطة بالمشروع
-- 2. KPIs المرتبطة بالمشروع
-- عند حذف مشروع من جدول ProjectsList
-- ============================================================

-- Step 1: Create function to cascade delete related records
-- ============================================================
-- ✅ FIXED: Use AFTER DELETE to avoid trigger conflicts
CREATE OR REPLACE FUNCTION cascade_delete_project_data()
RETURNS TRIGGER AS $$
DECLARE
  deleted_boq_count INTEGER := 0;
  deleted_kpi_count INTEGER := 0;
  project_code_to_delete TEXT;
BEGIN
  -- Get the project code from the deleted project
  project_code_to_delete := OLD."Project Code";
  
  -- Log deletion start
  RAISE NOTICE '🗑️ Cascade deleting data for project: %', project_code_to_delete;
  
  -- ✅ IMPORTANT: Delete KPIs FIRST (they don't trigger project updates)
  DELETE FROM "Planning Database - KPI"
  WHERE "Project Code" = project_code_to_delete
     OR "Project Full Code" = project_code_to_delete;
  
  GET DIAGNOSTICS deleted_kpi_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Deleted % KPIs for project: %', deleted_kpi_count, project_code_to_delete;
  
  -- ✅ Delete BOQ Activities
  -- The project is already deleted at this point (AFTER DELETE), 
  -- so update_project_calculations will check and skip if project doesn't exist
  DELETE FROM "Planning Database - BOQ Rates"
  WHERE "Project Code" = project_code_to_delete;
  
  GET DIAGNOSTICS deleted_boq_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Deleted % BOQ Activities for project: %', deleted_boq_count, project_code_to_delete;
  
  RAISE NOTICE '✅ Cascade deletion complete for project: % (BOQ: %, KPI: %)', 
    project_code_to_delete, deleted_boq_count, deleted_kpi_count;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update update_project_calculations to handle deleted projects gracefully
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
  
  -- ✅ Check if project still exists before trying to update it
  -- This prevents errors when deleting a project (which triggers BOQ deletion)
  IF NOT EXISTS (
    SELECT 1 FROM "Planning Database - ProjectsList" 
    WHERE "Project Code" = project_code
  ) THEN
    -- Project doesn't exist (probably being deleted), skip update
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Update the project's calculated values
  -- ✅ FIXED: Convert TEXT columns to DECIMAL before using SUM()
  UPDATE "Planning Database - ProjectsList" 
  SET 
    total_planned_value = (
      SELECT COALESCE(SUM(
        CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = project_code
    ),
    total_earned_value = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
          THEN (
            CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / 
            CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
          ) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
          ELSE 0 
        END
      ), 0)
      FROM "Planning Database - BOQ Rates" 
      WHERE "Project Code" = project_code
    ),
    overall_progress = CASE 
      WHEN (
        SELECT COALESCE(SUM(
          CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
        ), 0)
        FROM "Planning Database - BOQ Rates" 
        WHERE "Project Code" = project_code
      ) > 0 THEN (
        SELECT COALESCE(SUM(
          CASE 
            WHEN CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) > 0 
            THEN (
              CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / 
              CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
            ) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
            ELSE 0 
          END
        ), 0)
        FROM "Planning Database - BOQ Rates" 
        WHERE "Project Code" = project_code
      ) / (
        SELECT COALESCE(SUM(
          CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
        ), 0)
        FROM "Planning Database - BOQ Rates" 
        WHERE "Project Code" = project_code
      ) * 100
      ELSE 0 
    END
  WHERE "Project Code" = project_code;
  
  -- Try to update last_calculated_at (if it exists)
  BEGIN
    UPDATE "Planning Database - ProjectsList" 
    SET last_calculated_at = NOW()
    WHERE "Project Code" = project_code;
  EXCEPTION WHEN OTHERS THEN
    -- last_calculated_at column doesn't exist, skip it
    NULL;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on ProjectsList table (AFTER DELETE to avoid conflicts)
-- ============================================================
-- ✅ Using AFTER DELETE ensures the project is deleted first, then we clean up related data
-- This prevents "tuple to be deleted was already modified" error
DROP TRIGGER IF EXISTS trigger_cascade_delete_project_data ON "Planning Database - ProjectsList";

CREATE TRIGGER trigger_cascade_delete_project_data
  AFTER DELETE ON "Planning Database - ProjectsList"
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_project_data();

-- Step 3: Verification
-- ============================================================
SELECT 
  '✅ Cascade delete trigger created successfully!' AS status,
  EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_cascade_delete_project_data'
  ) AS trigger_exists,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'cascade_delete_project_data'
  ) AS function_exists;

-- ============================================================
-- ملاحظات مهمة / Important Notes:
-- ============================================================
-- ✅ عند حذف مشروع، سيتم حذف:
--    - جميع BOQ Activities المرتبطة بـ Project Code
--    - جميع KPIs المرتبطة بـ Project Code أو Project Full Code
--
-- ⚠️ تحذير: هذا الحذف دائم ولا يمكن التراجع عنه!
--    تأكد من عمل backup قبل الحذف!
--
-- ✅ للاختبار:
--    SELECT "Project Code" FROM "Planning Database - ProjectsList" LIMIT 1;
--    -- ثم احذف المشروع وسترى الحذف التلقائي في logs
-- ============================================================


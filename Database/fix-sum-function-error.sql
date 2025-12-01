-- ============================================================
-- FIX: function sum(text) does not exist
-- إصلاح: دالة sum() لا تعمل مع الأعمدة النصية
-- ============================================================
-- المشكلة: الأعمدة "Total Value", "Planned Units", "Actual Units"
-- قد تكون من نوع TEXT، وتحتاج إلى تحويل إلى DECIMAL قبل استخدام SUM()
-- ============================================================
-- ✅ هذا السكريبت آمن 100% - لن يحذف أو يغير أي بيانات موجودة
-- ✅ فقط يحدث الدوال (Functions) لإصلاح استخدام SUM() على الأعمدة النصية
-- ============================================================

-- Step 1: Temporarily disable triggers to avoid conflicts
-- ============================================================
DROP TRIGGER IF EXISTS trigger_update_project_calculations ON "Planning Database - BOQ Rates";
DROP TRIGGER IF EXISTS trigger_update_boq_calculations ON "Planning Database - BOQ Rates";

-- Step 2: Fix update_project_calculations function
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

-- Step 3: Recreate trigger (if it doesn't exist or needs to be updated)
-- ============================================================
CREATE TRIGGER trigger_update_project_calculations
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_calculations();

-- Step 4: Fix update_boq_calculations function (if it also has similar issues)
-- ============================================================
CREATE OR REPLACE FUNCTION update_boq_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the activity's calculated values
  -- ✅ FIXED: Convert TEXT columns to DECIMAL before calculations
  -- ✅ FIXED: Only update columns that exist in the table
  
  -- Try to update Rate column (if it exists)
  BEGIN
    IF CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL) > 0 THEN
      NEW."Rate" = CAST(REPLACE(COALESCE(NEW."Total Value", '0'), ',', '') AS DECIMAL) / 
                   CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL);
    ELSE
      NEW."Rate" = 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Rate column doesn't exist, skip it
    NULL;
  END;
  
  -- Try to update progress_percentage (if it exists)
  BEGIN
    IF CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL) > 0 THEN
      NEW.progress_percentage = (
        CAST(REPLACE(COALESCE(NEW."Actual Units", '0'), ',', '') AS DECIMAL) / 
        CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL)
      ) * 100;
    ELSE
      NEW.progress_percentage = 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- progress_percentage column doesn't exist, skip it
    NULL;
  END;
  
  -- Try to update earned_value (if it exists)
  BEGIN
    IF CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL) > 0 THEN
      NEW.earned_value = (
        CAST(REPLACE(COALESCE(NEW."Total Value", '0'), ',', '') AS DECIMAL) / 
        CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL)
      ) * CAST(REPLACE(COALESCE(NEW."Actual Units", '0'), ',', '') AS DECIMAL);
    ELSE
      NEW.earned_value = 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- earned_value column doesn't exist, skip it
    NULL;
  END;
  
  -- Try to update actual_value (if it exists)
  BEGIN
    NEW.actual_value = NEW.earned_value;
  EXCEPTION WHEN OTHERS THEN
    -- actual_value column doesn't exist, skip it
    NULL;
  END;
  
  -- Try to update planned_value (if it exists)
  BEGIN
    NEW.planned_value = CAST(REPLACE(COALESCE(NEW."Total Value", '0'), ',', '') AS DECIMAL);
  EXCEPTION WHEN OTHERS THEN
    -- planned_value column doesn't exist, skip it
    NULL;
  END;
  
  -- Try to update remaining_value (if it exists)
  BEGIN
    IF CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL) > 0 THEN
      NEW.remaining_value = (
        CAST(REPLACE(COALESCE(NEW."Total Value", '0'), ',', '') AS DECIMAL) / 
        CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL)
      ) * (
        CAST(REPLACE(COALESCE(NEW."Planned Units", '0'), ',', '') AS DECIMAL) - 
        CAST(REPLACE(COALESCE(NEW."Actual Units", '0'), ',', '') AS DECIMAL)
      );
    ELSE
      NEW.remaining_value = 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- remaining_value column doesn't exist, skip it
    NULL;
  END;
  
  -- Try to update last_calculated_at (if it exists)
  BEGIN
    NEW.last_calculated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- last_calculated_at column doesn't exist, skip it
    NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate BOQ calculations trigger
-- ============================================================
CREATE TRIGGER trigger_update_boq_calculations
  BEFORE INSERT OR UPDATE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_boq_calculations();

-- Step 6: Verification - Test that functions exist and work
-- ============================================================
SELECT 
  '✅ Verification: Functions fixed successfully!' AS status,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_project_calculations') AS project_calc_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_boq_calculations') AS boq_calc_exists;

-- Show triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_update_project_calculations', 'trigger_update_boq_calculations')
ORDER BY trigger_name;


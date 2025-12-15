-- ============================================================
-- COMPREHENSIVE IMPORT FIX FOR ALL TABLES
-- حل شامل لاستيراد جميع الجداول في Database Management
-- ============================================================

-- هذا الملف يحل مشاكل الاستيراد لجميع الجداول في النظام
-- الجداول المشمولة: Projects, BOQ Activities, KPI, Users, Divisions, 
-- Project Types, Currencies, Activities, Company Settings

-- ============================================================
-- 1. PROJECTS TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_projects_safe(
  p_project_code TEXT,
  p_project_sub_code TEXT,
  p_project_name TEXT,
  p_project_type TEXT,
  p_responsible_division TEXT,
  p_plot_number TEXT DEFAULT NULL,
  p_contract_amount NUMERIC DEFAULT 0,
  p_project_status TEXT DEFAULT 'active'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO "Planning Database - ProjectsList" (
    project_code,
    project_sub_code,
    project_name,
    project_type,
    responsible_division,
    plot_number,
    contract_amount,
    project_status,
    kpi_completed,
    created_at,
    updated_at
  ) VALUES (
    p_project_code,
    p_project_sub_code,
    p_project_name,
    p_project_type,
    p_responsible_division,
    p_plot_number,
    p_contract_amount,
    p_project_status,
    false,
    NOW(),
    NOW()
  ) ON CONFLICT (project_code, project_sub_code) DO UPDATE SET
    project_name = EXCLUDED.project_name,
    project_type = EXCLUDED.project_type,
    responsible_division = EXCLUDED.responsible_division,
    plot_number = EXCLUDED.plot_number,
    contract_amount = EXCLUDED.contract_amount,
    project_status = EXCLUDED.project_status,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM "Planning Database - ProjectsList" 
    WHERE project_code = p_project_code AND project_sub_code = p_project_sub_code
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. BOQ ACTIVITIES TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_boq_activities_safe(
  p_project_id TEXT,
  p_project_code TEXT,
  p_project_sub_code TEXT,
  p_activity TEXT,
  p_activity_division TEXT,
  p_unit TEXT,
  p_total_units NUMERIC DEFAULT 0,
  p_planned_units NUMERIC DEFAULT 0,
  p_rate NUMERIC DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO "Planning Database - BOQ Rates" (
    project_id,
    project_code,
    project_sub_code,
    project_full_code,
    activity,
    activity_division,
    unit,
    total_units,
    planned_units,
    actual_units,
    rate,
    total_value,
    activity_progress_percentage,
    created_at,
    updated_at
  ) VALUES (
    p_project_id,
    p_project_code,
    p_project_sub_code,
    p_project_code || '-' || p_project_sub_code,
    p_activity,
    p_activity_division,
    p_unit,
    p_total_units,
    p_planned_units,
    0,
    p_rate,
    p_total_units * p_rate,
    0,
    NOW(),
    NOW()
  ) ON CONFLICT (project_code, activity) DO UPDATE SET
    activity_division = EXCLUDED.activity_division,
    unit = EXCLUDED.unit,
    total_units = EXCLUDED.total_units,
    planned_units = EXCLUDED.planned_units,
    rate = EXCLUDED.rate,
    total_value = EXCLUDED.total_value,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM "Planning Database - BOQ Rates" 
    WHERE project_code = p_project_code AND activity = p_activity
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. KPI TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_kpi_safe(
  p_project_full_code TEXT,
  p_activity_name TEXT,
  p_quantity NUMERIC,
  p_input_type TEXT,
  p_section TEXT DEFAULT NULL,
  p_unit TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO "Planning Database - KPI" (
    project_full_code,
    activity_name,
    quantity,
    input_type,
    section,
    unit,
    created_at,
    updated_at
  ) VALUES (
    p_project_full_code,
    p_activity_name,
    p_quantity,
    p_input_type,
    p_section,
    p_unit,
    NOW(),
    NOW()
  ) ON CONFLICT (project_full_code, activity_name, input_type) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    section = EXCLUDED.section,
    unit = EXCLUDED.unit,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM "Planning Database - KPI" 
    WHERE project_full_code = p_project_full_code 
    AND activity_name = p_activity_name 
    AND input_type = p_input_type
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. DIVISIONS TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_divisions_safe(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.divisions (
    name,
    description,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_description,
    p_is_active,
    NOW(),
    NOW()
  ) ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM public.divisions 
    WHERE name = p_name
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. PROJECT TYPES TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_project_types_safe(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.project_types (
    name,
    description,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_description,
    p_is_active,
    NOW(),
    NOW()
  ) ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM public.project_types 
    WHERE name = p_name
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. CURRENCIES TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_currencies_safe(
  p_code TEXT,
  p_name TEXT,
  p_symbol TEXT,
  p_exchange_rate NUMERIC DEFAULT 1,
  p_is_default BOOLEAN DEFAULT FALSE,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- إذا كان هذا العملة الافتراضية، قم بإلغاء الافتراضية من العملات الأخرى
  IF p_is_default THEN
    UPDATE public.currencies SET is_default = false WHERE is_default = true;
  END IF;
  
  INSERT INTO public.currencies (
    code,
    name,
    symbol,
    exchange_rate,
    is_default,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_code,
    p_name,
    p_symbol,
    p_exchange_rate,
    p_is_default,
    p_is_active,
    NOW(),
    NOW()
  ) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    exchange_rate = EXCLUDED.exchange_rate,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM public.currencies 
    WHERE code = p_code
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. ACTIVITIES TABLE IMPORT FIX (المحدث)
-- ============================================================

CREATE OR REPLACE FUNCTION import_activities_safe(
  p_name TEXT,
  p_division TEXT,
  p_unit TEXT,
  p_category TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_typical_duration INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE,
  p_usage_count INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.activities (
    name,
    division,
    unit,
    category,
    description,
    typical_duration,
    is_active,
    usage_count,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_division,
    p_unit,
    p_category,
    p_description,
    p_typical_duration,
    p_is_active,
    p_usage_count,
    NOW(),
    NOW()
  ) ON CONFLICT (name, division) DO UPDATE SET
    unit = EXCLUDED.unit,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    typical_duration = EXCLUDED.typical_duration,
    is_active = EXCLUDED.is_active,
    usage_count = EXCLUDED.usage_count,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM public.activities 
    WHERE name = p_name AND division = p_division
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. COMPANY SETTINGS TABLE IMPORT FIX
-- ============================================================

CREATE OR REPLACE FUNCTION import_company_settings_safe(
  p_setting_key TEXT,
  p_setting_value TEXT,
  p_setting_type TEXT DEFAULT 'text',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.company_settings (
    setting_key,
    setting_value,
    setting_type,
    description,
    created_at,
    updated_at
  ) VALUES (
    p_setting_key,
    p_setting_value,
    p_setting_type,
    p_description,
    NOW(),
    NOW()
  ) ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO new_id;
  
  RETURN COALESCE(new_id, (
    SELECT id FROM public.company_settings 
    WHERE setting_key = p_setting_key
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. CSV IMPORT FUNCTIONS FOR ALL TABLES
-- ============================================================

-- CSV Import for Projects
CREATE OR REPLACE FUNCTION import_projects_csv(csv_data TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, imported_count INTEGER, errors TEXT[]) AS $$
DECLARE
  lines TEXT[];
  line TEXT;
  fields TEXT[];
  imported INTEGER := 0;
  error_count INTEGER := 0;
  error_list TEXT[] := '{}';
  current_line INTEGER := 0;
BEGIN
  lines := string_to_array(csv_data, E'\n');
  
  FOR i IN 2..array_length(lines, 1) LOOP
    line := trim(lines[i]);
    current_line := i;
    
    IF line = '' THEN CONTINUE; END IF;
    
    fields := string_to_array(line, ',');
    
    IF array_length(fields, 1) < 5 THEN
      error_count := error_count + 1;
      error_list := array_append(error_list, 'Line ' || current_line || ': Insufficient fields');
      CONTINUE;
    END IF;
    
    BEGIN
      PERFORM import_projects_safe(
        trim(fields[1]), -- project_code
        trim(fields[2]), -- project_sub_code
        trim(fields[3]), -- project_name
        trim(fields[4]), -- project_type
        trim(fields[5]), -- responsible_division
        CASE WHEN array_length(fields, 1) > 5 THEN trim(fields[6]) ELSE NULL END, -- plot_number
        CASE WHEN array_length(fields, 1) > 6 AND fields[7] ~ '^[0-9.]+$' THEN fields[7]::NUMERIC ELSE 0 END, -- contract_amount
        CASE WHEN array_length(fields, 1) > 7 THEN trim(fields[8]) ELSE 'active' END -- project_status
      );
      imported := imported + 1;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        error_list := array_append(error_list, 'Line ' || current_line || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    (error_count = 0) as success,
    CASE WHEN error_count = 0 THEN 'Successfully imported ' || imported || ' projects'
         ELSE 'Imported ' || imported || ' projects with ' || error_count || ' errors' END as message,
    imported as imported_count,
    error_list as errors;
END;
$$ LANGUAGE plpgsql;

-- CSV Import for Divisions
CREATE OR REPLACE FUNCTION import_divisions_csv(csv_data TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, imported_count INTEGER, errors TEXT[]) AS $$
DECLARE
  lines TEXT[];
  line TEXT;
  fields TEXT[];
  imported INTEGER := 0;
  error_count INTEGER := 0;
  error_list TEXT[] := '{}';
  current_line INTEGER := 0;
BEGIN
  lines := string_to_array(csv_data, E'\n');
  
  FOR i IN 2..array_length(lines, 1) LOOP
    line := trim(lines[i]);
    current_line := i;
    
    IF line = '' THEN CONTINUE; END IF;
    
    fields := string_to_array(line, ',');
    
    IF array_length(fields, 1) < 1 THEN
      error_count := error_count + 1;
      error_list := array_append(error_list, 'Line ' || current_line || ': No name provided');
      CONTINUE;
    END IF;
    
    BEGIN
      PERFORM import_divisions_safe(
        trim(fields[1]), -- name
        CASE WHEN array_length(fields, 1) > 1 THEN trim(fields[2]) ELSE NULL END, -- description
        CASE WHEN array_length(fields, 1) > 2 THEN fields[3]::BOOLEAN ELSE TRUE END -- is_active
      );
      imported := imported + 1;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        error_list := array_append(error_list, 'Line ' || current_line || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    (error_count = 0) as success,
    CASE WHEN error_count = 0 THEN 'Successfully imported ' || imported || ' divisions'
         ELSE 'Imported ' || imported || ' divisions with ' || error_count || ' errors' END as message,
    imported as imported_count,
    error_list as errors;
END;
$$ LANGUAGE plpgsql;

-- CSV Import for Activities (المحدث)
CREATE OR REPLACE FUNCTION import_activities_csv_safe(csv_data TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, imported_count INTEGER, errors TEXT[]) AS $$
DECLARE
  lines TEXT[];
  line TEXT;
  fields TEXT[];
  imported INTEGER := 0;
  error_count INTEGER := 0;
  error_list TEXT[] := '{}';
  current_line INTEGER := 0;
BEGIN
  lines := string_to_array(csv_data, E'\n');
  
  FOR i IN 2..array_length(lines, 1) LOOP
    line := trim(lines[i]);
    current_line := i;
    
    IF line = '' THEN CONTINUE; END IF;
    
    fields := string_to_array(line, ',');
    
    IF array_length(fields, 1) < 3 THEN
      error_count := error_count + 1;
      error_list := array_append(error_list, 'Line ' || current_line || ': Need name, division, unit');
      CONTINUE;
    END IF;
    
    BEGIN
      PERFORM import_activities_safe(
        trim(fields[1]), -- name
        trim(fields[2]), -- division
        trim(fields[3]), -- unit
        CASE WHEN array_length(fields, 1) > 3 THEN trim(fields[4]) ELSE NULL END, -- category
        CASE WHEN array_length(fields, 1) > 4 THEN trim(fields[5]) ELSE NULL END, -- description
        CASE WHEN array_length(fields, 1) > 5 AND fields[6] ~ '^[0-9]+$' THEN fields[6]::INTEGER ELSE NULL END, -- typical_duration
        CASE WHEN array_length(fields, 1) > 6 THEN fields[7]::BOOLEAN ELSE TRUE END, -- is_active
        CASE WHEN array_length(fields, 1) > 7 AND fields[8] ~ '^[0-9]+$' THEN fields[8]::INTEGER ELSE 0 END -- usage_count
      );
      imported := imported + 1;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        error_list := array_append(error_list, 'Line ' || current_line || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    (error_count = 0) as success,
    CASE WHEN error_count = 0 THEN 'Successfully imported ' || imported || ' activities'
         ELSE 'Imported ' || imported || ' activities with ' || error_count || ' errors' END as message,
    imported as imported_count,
    error_list as errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. UTILITY FUNCTIONS
-- ============================================================

-- Clear invalid data from all tables
CREATE OR REPLACE FUNCTION clear_invalid_data_all_tables()
RETURNS TABLE (
  table_name TEXT,
  deleted_count INTEGER
) AS $$
DECLARE
  deleted INTEGER;
BEGIN
  -- Clear invalid projects
  DELETE FROM "Planning Database - ProjectsList" WHERE project_code IS NULL OR project_name IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN QUERY SELECT 'projects'::TEXT, deleted;
  
  -- Clear invalid divisions
  DELETE FROM public.divisions WHERE name IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN QUERY SELECT 'divisions'::TEXT, deleted;
  
  -- Clear invalid activities
  DELETE FROM public.activities WHERE name IS NULL OR division IS NULL OR unit IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN QUERY SELECT 'activities'::TEXT, deleted;
  
  -- Clear invalid currencies
  DELETE FROM public.currencies WHERE code IS NULL OR name IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN QUERY SELECT 'currencies'::TEXT, deleted;
  
  -- Clear invalid project types
  DELETE FROM public.project_types WHERE name IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN QUERY SELECT 'project_types'::TEXT, deleted;
  
  -- Clear invalid company settings
  -- ⚠️ REMOVED: This was deleting all company_settings records!
  -- DELETE FROM public.company_settings WHERE setting_key IS NULL;
  -- The company_settings table doesn't have a setting_key column,
  -- so this query would delete ALL records!
  -- Instead, we'll just ensure there's at least one record
  INSERT INTO public.company_settings (company_name, company_slogan)
  SELECT 'AlRabat RPF', 'Masters of Foundation Construction'
  WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN QUERY SELECT 'company_settings'::TEXT, deleted;
END;
$$ LANGUAGE plpgsql;

-- Test import functions
CREATE OR REPLACE FUNCTION test_all_import_functions()
RETURNS TABLE (
  function_name TEXT,
  test_result TEXT
) AS $$
BEGIN
  -- Test divisions
  BEGIN
    PERFORM import_divisions_safe('Test Division', 'Test description', true);
    RETURN QUERY SELECT 'import_divisions_safe'::TEXT, 'SUCCESS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'import_divisions_safe'::TEXT, 'FAILED: ' || SQLERRM;
  END;
  
  -- Test activities
  BEGIN
    PERFORM import_activities_safe('Test Activity', 'Test Division', 'No.', 'Test', 'Test description', 1, true, 0);
    RETURN QUERY SELECT 'import_activities_safe'::TEXT, 'SUCCESS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'import_activities_safe'::TEXT, 'FAILED: ' || SQLERRM;
  END;
  
  -- Test currencies
  BEGIN
    PERFORM import_currencies_safe('TEST', 'Test Currency', 'T', 1, false, true);
    RETURN QUERY SELECT 'import_currencies_safe'::TEXT, 'SUCCESS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'import_currencies_safe'::TEXT, 'FAILED: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- رسالة نجاح
SELECT 'Comprehensive import functions created successfully for all tables!' as status;

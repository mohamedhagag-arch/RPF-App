-- ============================================================
-- FIX ACTIVITIES IMPORT ISSUE - SIMPLE VERSION
-- حل مشكلة استيراد الأنشطة من CSV - نسخة مبسطة
-- ============================================================

-- المشكلة: CSV لا يحتوي على عمود ID
-- الحل: إنشاء دالة للاستيراد بدون ID

-- 1. إنشاء دالة لاستيراد مباشر من CSV (بدون ID)
CREATE OR REPLACE FUNCTION import_activities_direct(
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
    usage_count
  ) VALUES (
    p_name,
    p_division,
    p_unit,
    p_category,
    p_description,
    p_typical_duration,
    p_is_active,
    p_usage_count
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

-- 2. إنشاء دالة لاستيراد CSV كامل
CREATE OR REPLACE FUNCTION import_activities_csv(
  csv_data TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  imported_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  lines TEXT[];
  line TEXT;
  fields TEXT[];
  imported INTEGER := 0;
  error_count INTEGER := 0;
  error_list TEXT[] := '{}';
  current_line INTEGER := 0;
BEGIN
  -- تقسيم CSV إلى أسطر
  lines := string_to_array(csv_data, E'\n');
  
  -- تخطي العنوان (السطر الأول)
  FOR i IN 2..array_length(lines, 1) LOOP
    line := trim(lines[i]);
    current_line := i;
    
    IF line = '' THEN
      CONTINUE;
    END IF;
    
    -- تقسيم السطر إلى حقول
    fields := string_to_array(line, ',');
    
    IF array_length(fields, 1) < 3 THEN
      error_count := error_count + 1;
      error_list := array_append(error_list, 
        'Line ' || current_line || ': Insufficient fields (need at least name, division, unit)');
      CONTINUE;
    END IF;
    
    BEGIN
      PERFORM import_activities_direct(
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
        error_list := array_append(error_list, 
          'Line ' || current_line || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    (error_count = 0) as success,
    CASE 
      WHEN error_count = 0 THEN 'Successfully imported ' || imported || ' activities'
      ELSE 'Imported ' || imported || ' activities with ' || error_count || ' errors'
    END as message,
    imported as imported_count,
    error_list as errors;
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء دالة لمسح البيانات الخاطئة
CREATE OR REPLACE FUNCTION clear_invalid_activities()
RETURNS TABLE (
  deleted_count INTEGER
) AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.activities WHERE id IS NULL OR name IS NULL OR division IS NULL OR unit IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  
  RETURN QUERY SELECT deleted;
END;
$$ LANGUAGE plpgsql;

-- 4. إنشاء دالة لإدراج نشاط واحد للاختبار
CREATE OR REPLACE FUNCTION test_import_activity()
RETURNS UUID AS $$
DECLARE
  test_id UUID;
BEGIN
  SELECT import_activities_direct(
    'Test Activity Import',
    'Test Division',
    'No.',
    'Test',
    'Test description for import',
    1,
    true,
    0
  ) INTO test_id;
  
  RETURN test_id;
END;
$$ LANGUAGE plpgsql;

-- 5. إدراج بيانات تجريبية للاختبار
INSERT INTO public.activities (name, division, unit, category, description) VALUES
('Sample Activity 1', 'Sample Division', 'No.', 'Sample', 'Sample activity for testing')
ON CONFLICT (name, division) DO NOTHING;

-- رسالة نجاح
SELECT 'Activities import functions created successfully!' as status;

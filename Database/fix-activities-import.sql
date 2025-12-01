-- ============================================================
-- FIX ACTIVITIES IMPORT ISSUE
-- حل مشكلة استيراد الأنشطة من CSV
-- ============================================================

-- المشكلة: CSV لا يحتوي على عمود ID
-- الحل: تعديل الجدول ليقبل استيراد بدون ID

-- 1. إنشاء جدول مؤقت للاستيراد
CREATE TABLE IF NOT EXISTS public.activities_import_temp (
  name TEXT NOT NULL,
  division TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  description TEXT,
  typical_duration INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0
);

-- 2. إنشاء دالة لاستيراد البيانات من الجدول المؤقت
CREATE OR REPLACE FUNCTION import_activities_from_temp()
RETURNS TABLE (
  imported_count INTEGER,
  skipped_count INTEGER
) AS $$
DECLARE
  imported INTEGER := 0;
  skipped INTEGER := 0;
  activity_record RECORD;
BEGIN
  -- حذف البيانات القديمة في الجدول المؤقت
  DELETE FROM public.activities_import_temp;
  
  -- إدراج البيانات الجديدة
  FOR activity_record IN 
    SELECT * FROM public.activities_import_temp
  LOOP
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
        activity_record.name,
        activity_record.division,
        activity_record.unit,
        activity_record.category,
        activity_record.description,
        activity_record.typical_duration,
        COALESCE(activity_record.is_active, TRUE),
        COALESCE(activity_record.usage_count, 0)
      ) ON CONFLICT (name, division) DO UPDATE SET
        unit = EXCLUDED.unit,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        typical_duration = EXCLUDED.typical_duration,
        is_active = EXCLUDED.is_active,
        usage_count = EXCLUDED.usage_count,
        updated_at = NOW();
      
      imported := imported + 1;
    EXCEPTION
      WHEN OTHERS THEN
        skipped := skipped + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT imported, skipped;
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء دالة لمسح البيانات المؤقتة
CREATE OR REPLACE FUNCTION clear_activities_import_temp()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.activities_import_temp;
END;
$$ LANGUAGE plpgsql;

-- 4. إنشاء دالة لاستيراد مباشر من CSV (بدون ID)
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

-- 5. إنشاء دالة لاستيراد CSV كامل
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

-- 6. إضافة RLS policies للجدول المؤقت
ALTER TABLE public.activities_import_temp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert to temp table for authenticated users" ON public.activities_import_temp
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow select from temp table for authenticated users" ON public.activities_import_temp
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete from temp table for authenticated users" ON public.activities_import_temp
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. إدراج بيانات تجريبية للاختبار
INSERT INTO public.activities_import_temp (name, division, unit, category) VALUES
('Test Activity 1', 'Test Division', 'No.', 'Test'),
('Test Activity 2', 'Test Division', 'Meter', 'Test')
ON CONFLICT DO NOTHING;

-- رسالة نجاح
SELECT 'Activities import functions created successfully!' as status;

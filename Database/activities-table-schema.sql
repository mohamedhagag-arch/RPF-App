-- ============================================================
-- ACTIVITIES TABLE SCHEMA
-- جدول منفصل للأنشطة مع ربطها بالأقسام
-- ============================================================

-- إنشاء جدول الأنشطة
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  division TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  description TEXT,
  typical_duration INTEGER, -- في الأيام
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- إضافة constraint فريد للاسم والقسم
  UNIQUE(name, division)
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_activities_name ON public.activities(name);
CREATE INDEX IF NOT EXISTS idx_activities_division ON public.activities(division);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_active ON public.activities(is_active);

-- RLS Policies
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policy للقراءة العامة
CREATE POLICY "Allow read access to activities" ON public.activities
  FOR SELECT USING (true);

-- Policy للكتابة للمستخدمين المصرح لهم
CREATE POLICY "Allow insert/update/delete for authenticated users" ON public.activities
  FOR ALL USING (auth.role() = 'authenticated');

-- دالة لزيادة عداد الاستخدام
CREATE OR REPLACE FUNCTION increment_activity_usage(activity_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.activities 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE name = activity_name;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على إحصائيات الأنشطة
CREATE OR REPLACE FUNCTION get_activity_stats()
RETURNS TABLE (
  division_name TEXT,
  activities_count BIGINT,
  total_usage BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.division AS division_name,
    COUNT(a.id) AS activities_count,
    SUM(a.usage_count) AS total_usage
  FROM public.activities a
  WHERE a.is_active = TRUE
  GROUP BY a.division
  ORDER BY total_usage DESC;
END;
$$ LANGUAGE plpgsql;

-- إدراج الأنشطة الافتراضية من البيانات الموجودة
INSERT INTO public.activities (name, division, unit, category) VALUES
-- Enabling Division Activities
('Mobilization', 'Enabling Division', 'Lump Sum', 'General'),
('Mobilization - Infra', 'Enabling Division', 'Lump Sum', 'Infrastructure'),
('Vibro Compaction', 'Enabling Division', 'No.', 'Soil Improvement'),
('Supply of Concrete Panel', 'Enabling Division', 'No.', 'Structural'),
('Sheet Pile', 'Enabling Division', 'No.', 'Structural'),
('Soldier Pile (H. Beams)', 'Enabling Division', 'No.', 'Structural'),
('Predrilling for Sheet Piles', 'Enabling Division', 'No.', 'Structural'),
('Predrilling for Soldier Piles', 'Enabling Division', 'No.', 'Structural'),
('C.Piles 1000mm', 'Enabling Division', 'No.', 'Foundation'),
('C.Piles 750mm', 'Enabling Division', 'No.', 'Foundation'),
('Integrity Test', 'Enabling Division', 'No.', 'Testing'),
('PTP Test', 'Enabling Division', 'No.', 'Testing'),
('Adjustment', 'Enabling Division', 'Lump Sum', 'General'),
('Excavation to General PL', 'Enabling Division', 'Cubic Meter', 'Earthwork'),
('Excavation to Final Pit', 'Enabling Division', 'Cubic Meter', 'Earthwork'),
('Excavation -2.00m', 'Enabling Division', 'Cubic Meter', 'Earthwork'),
('Excavation & Cart Away', 'Enabling Division', 'Cubic Meter', 'Earthwork'),
('Anchoring', 'Enabling Division', 'No.', 'Structural'),
('Capping Beam', 'Enabling Division', 'Running Meter', 'Structural'),
('Caliper Logging Test', 'Enabling Division', 'No.', 'Testing'),
('Sonic Test', 'Enabling Division', 'No.', 'Testing'),
('EV / AC', 'Enabling Division', 'Lump Sum', 'Electrical'),
('CMC Column', 'Enabling Division', 'No.', 'Structural'),
('Trench Sheet - Infra', 'Enabling Division', 'No.', 'Infrastructure'),

-- Infrastructure Division Activities
('Mobilization - Infra', 'Infrastructure Division', 'Lump Sum', 'Infrastructure'),
('Trench Sheet - Infra', 'Infrastructure Division', 'No.', 'Infrastructure'),
('Road Construction', 'Infrastructure Division', 'Square Meter', 'Infrastructure'),
('Bridge Construction', 'Infrastructure Division', 'Meter', 'Infrastructure'),
('Pipeline Installation', 'Infrastructure Division', 'Meter', 'Infrastructure'),
('Drainage Works', 'Infrastructure Division', 'Meter', 'Infrastructure'),
('Utilities Installation', 'Infrastructure Division', 'Lump Sum', 'Infrastructure'),

-- Soil Improvement Division Activities
('Vibro Compaction', 'Soil Improvement Division', 'No.', 'Soil Improvement'),
('Stone Column', 'Soil Improvement Division', 'No.', 'Soil Improvement'),
('CMC Column', 'Soil Improvement Division', 'No.', 'Soil Improvement'),
('Dynamic Compaction', 'Soil Improvement Division', 'Square Meter', 'Soil Improvement'),
('Soil Stabilization', 'Soil Improvement Division', 'Cubic Meter', 'Soil Improvement'),

-- Marine Division Activities (إضافة جديدة)
('Dredging Works', 'Marine Division', 'Cubic Meter', 'Marine'),
('Breakwater Construction', 'Marine Division', 'Meter', 'Marine'),
('Quay Wall Construction', 'Marine Division', 'Meter', 'Marine'),
('Jetty Construction', 'Marine Division', 'Meter', 'Marine'),
('Waterfront Development', 'Marine Division', 'Square Meter', 'Marine')

ON CONFLICT (name, division) DO NOTHING;
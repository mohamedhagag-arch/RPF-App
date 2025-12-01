-- ============================================
-- Divisions Table Schema
-- جدول الأقسام (Divisions)
-- ============================================

-- إنشاء جدول الأقسام
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(10),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_divisions_name ON divisions(name);
CREATE INDEX IF NOT EXISTS idx_divisions_is_active ON divisions(is_active);
CREATE INDEX IF NOT EXISTS idx_divisions_code ON divisions(code);

-- إضافة تعليقات للتوضيح
COMMENT ON TABLE divisions IS 'جدول الأقسام المسؤولة عن المشاريع';
COMMENT ON COLUMN divisions.id IS 'المعرف الفريد للقسم';
COMMENT ON COLUMN divisions.name IS 'اسم القسم';
COMMENT ON COLUMN divisions.code IS 'رمز القسم (اختصار)';
COMMENT ON COLUMN divisions.description IS 'وصف القسم';
COMMENT ON COLUMN divisions.is_active IS 'هل القسم نشط؟';
COMMENT ON COLUMN divisions.usage_count IS 'عدد المرات التي تم استخدام القسم في المشاريع';
COMMENT ON COLUMN divisions.created_at IS 'تاريخ إنشاء القسم';
COMMENT ON COLUMN divisions.updated_at IS 'تاريخ آخر تحديث للقسم';

-- إدراج الأقسام الافتراضية
INSERT INTO divisions (name, code, description, is_active) VALUES
  ('Enabling Division', 'ENA', 'Enabling works and preliminary activities', TRUE),
  ('Soil Improvement Division', 'SID', 'Soil improvement and ground treatment', TRUE),
  ('Infrastructure Division', 'INF', 'Infrastructure and utilities', TRUE),
  ('Marine Division', 'MAR', 'Marine and waterfront works', TRUE)
ON CONFLICT (name) DO NOTHING;

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_divisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS divisions_updated_at_trigger ON divisions;
CREATE TRIGGER divisions_updated_at_trigger
  BEFORE UPDATE ON divisions
  FOR EACH ROW
  EXECUTE FUNCTION update_divisions_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- تفعيل RLS
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الأقسام النشطة
CREATE POLICY "Anyone can view active divisions"
  ON divisions
  FOR SELECT
  USING (is_active = TRUE);

-- سياسة الإضافة: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can add divisions"
  ON divisions
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- سياسة التحديث: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can update divisions"
  ON divisions
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- سياسة الحذف: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can delete divisions"
  ON divisions
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- ============================================
-- إحصائيات الأقسام
-- ============================================

-- دالة للحصول على إحصائيات الأقسام
CREATE OR REPLACE FUNCTION get_division_stats()
RETURNS TABLE (
  division_name VARCHAR(255),
  projects_count BIGINT,
  total_contract_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.name AS division_name,
    COUNT(p.id) AS projects_count,
    COALESCE(
      SUM(
        CASE 
          WHEN p."Contract Amount" IS NOT NULL AND p."Contract Amount" ~ '^[0-9]+\.?[0-9]*$'
          THEN CAST(p."Contract Amount" AS NUMERIC)
          ELSE 0
        END
      ), 
      0
    ) AS total_contract_value
  FROM divisions d
  LEFT JOIN "Planning Database - ProjectsList" p ON p."Responsible Division" = d.name
  WHERE d.is_active = TRUE
  GROUP BY d.name
  ORDER BY projects_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- إكمال الإعداد
-- ============================================

-- عرض جميع الأقسام
SELECT * FROM divisions ORDER BY name;

-- عرض إحصائيات الأقسام
SELECT * FROM get_division_stats();


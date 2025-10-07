-- ============================================
-- Project Types Table Schema
-- جدول أنواع المشاريع (Project Types)
-- ============================================

-- إنشاء جدول أنواع المشاريع
CREATE TABLE IF NOT EXISTS project_types (
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
CREATE INDEX IF NOT EXISTS idx_project_types_name ON project_types(name);
CREATE INDEX IF NOT EXISTS idx_project_types_is_active ON project_types(is_active);
CREATE INDEX IF NOT EXISTS idx_project_types_code ON project_types(code);

-- إضافة تعليقات للتوضيح
COMMENT ON TABLE project_types IS 'جدول أنواع المشاريع';
COMMENT ON COLUMN project_types.id IS 'المعرف الفريد لنوع المشروع';
COMMENT ON COLUMN project_types.name IS 'اسم نوع المشروع';
COMMENT ON COLUMN project_types.code IS 'رمز نوع المشروع (اختصار)';
COMMENT ON COLUMN project_types.description IS 'وصف نوع المشروع';
COMMENT ON COLUMN project_types.is_active IS 'هل نوع المشروع نشط؟';
COMMENT ON COLUMN project_types.usage_count IS 'عدد المرات التي تم استخدام النوع في المشاريع';
COMMENT ON COLUMN project_types.created_at IS 'تاريخ إنشاء نوع المشروع';
COMMENT ON COLUMN project_types.updated_at IS 'تاريخ آخر تحديث لنوع المشروع';

-- إدراج أنواع المشاريع الافتراضية
INSERT INTO project_types (name, code, description, is_active) VALUES
  ('Infrastructure', 'INF', 'Infrastructure and utilities projects', TRUE),
  ('Building Construction', 'BLD', 'Building and construction projects', TRUE),
  ('Road Construction', 'RD', 'Road and highway construction', TRUE),
  ('Marine Works', 'MAR', 'Marine and waterfront projects', TRUE),
  ('Landscaping', 'LND', 'Landscaping and beautification', TRUE),
  ('Maintenance', 'MNT', 'Maintenance and repair works', TRUE),
  ('Enabling Division', 'ENA', 'Enabling works and preliminary activities', TRUE),
  ('Soil Improvement Division', 'SID', 'Soil improvement and ground treatment', TRUE),
  ('Infrastructure Division', 'IDV', 'Infrastructure division projects', TRUE),
  ('Marine Division', 'MDV', 'Marine division projects', TRUE)
ON CONFLICT (name) DO NOTHING;

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_project_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS project_types_updated_at_trigger ON project_types;
CREATE TRIGGER project_types_updated_at_trigger
  BEFORE UPDATE ON project_types
  FOR EACH ROW
  EXECUTE FUNCTION update_project_types_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- تفعيل RLS
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الأنواع النشطة
CREATE POLICY "Anyone can view active project types"
  ON project_types
  FOR SELECT
  USING (is_active = TRUE);

-- سياسة الإضافة: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can add project types"
  ON project_types
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- سياسة التحديث: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can update project types"
  ON project_types
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- سياسة الحذف: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can delete project types"
  ON project_types
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- ============================================
-- إحصائيات أنواع المشاريع
-- ============================================

-- دالة للحصول على إحصائيات أنواع المشاريع
CREATE OR REPLACE FUNCTION get_project_type_stats()
RETURNS TABLE (
  project_type_name VARCHAR(255),
  projects_count BIGINT,
  total_contract_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.name AS project_type_name,
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
  FROM project_types pt
  LEFT JOIN "Planning Database - ProjectsList" p ON p."Project Type" = pt.name
  WHERE pt.is_active = TRUE
  GROUP BY pt.name
  ORDER BY projects_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- إكمال الإعداد
-- ============================================

-- عرض جميع أنواع المشاريع
SELECT * FROM project_types ORDER BY name;

-- عرض إحصائيات أنواع المشاريع
SELECT * FROM get_project_type_stats();

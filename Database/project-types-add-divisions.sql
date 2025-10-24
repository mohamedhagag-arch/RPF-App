-- ============================================
-- إضافة الأقسام الأربعة إلى أنواع المشاريع
-- Add the 4 divisions to project types
-- ============================================

-- إضافة الأقسام الأربعة الجديدة
INSERT INTO project_types (name, code, description, is_active) VALUES
  ('Enabling Division', 'ENA', 'Enabling works and preliminary activities', TRUE),
  ('Soil Improvement Division', 'SID', 'Soil improvement and ground treatment', TRUE),
  ('Infrastructure Division', 'IDV', 'Infrastructure division projects', TRUE),
  ('Marine Division', 'MDV', 'Marine division projects', TRUE)
ON CONFLICT (name) DO NOTHING;

-- عرض جميع أنواع المشاريع للتأكد
SELECT 
  name,
  code,
  description,
  usage_count,
  created_at
FROM project_types 
WHERE is_active = TRUE
ORDER BY name;

-- عرض إحصائيات الأنواع
SELECT * FROM get_project_type_stats();

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. تم إضافة 4 أنواع جديدة من الأقسام
-- 2. الأكواد: ENA, SID, IDV, MDV
-- 3. ON CONFLICT DO NOTHING يمنع الأخطاء إذا كانت موجودة
-- 4. يمكن تشغيل هذا الملف عدة مرات بأمان

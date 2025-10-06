-- ============================================================
-- إضافة أعمدة جديدة لجداول KPI
-- ============================================================

-- إضافة أعمدة للـ KPI Planned
ALTER TABLE public."Planning Database - KPI Planned" 
ADD COLUMN IF NOT EXISTS "Value" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "Day" TEXT,
ADD COLUMN IF NOT EXISTS "Zone" TEXT;

-- إضافة أعمدة للـ KPI Actual
ALTER TABLE public."Planning Database - KPI Actual" 
ADD COLUMN IF NOT EXISTS "Value" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "Day" TEXT,
ADD COLUMN IF NOT EXISTS "Zone" TEXT;

-- إضافة تعليقات
COMMENT ON COLUMN public."Planning Database - KPI Planned"."Value" IS 'القيمة المالية المخططة للنشاط';
COMMENT ON COLUMN public."Planning Database - KPI Actual"."Value" IS 'القيمة المالية الفعلية للنشاط';

-- تحديث الـ View ليشمل جميع الأعمدة الجديدة
DROP VIEW IF EXISTS public."Planning Database - KPI Combined";

CREATE OR REPLACE VIEW public."Planning Database - KPI Combined" AS
SELECT 
  id,
  "Project Full Code",
  "Project Code",
  "Project Sub Code",
  "Activity Name",
  "Activity",
  "Quantity",
  'Planned' as "Input Type",
  "Section",
  "Drilled Meters",
  "Unit",
  "Value",                               -- 💰 القيمة المالية
  "Day",                                 -- 📅 اليوم
  "Zone",                                -- 📍 المنطقة
  "Target Date" as "Activity Date",      -- 📅 التاريخ المخطط
  "Target Date",                         -- 📅 الاحتفاظ بالاسم الأصلي
  NULL as "Actual Date",                 -- 📅 NULL للـ Planned
  NULL as "Recorded By",                 -- فقط للـ Actual
  "Notes",
  created_at,
  updated_at
FROM public."Planning Database - KPI Planned"

UNION ALL

SELECT 
  id,
  "Project Full Code",
  "Project Code",
  "Project Sub Code",
  "Activity Name",
  "Activity",
  "Quantity",
  'Actual' as "Input Type",
  "Section",
  "Drilled Meters",
  "Unit",
  "Value",                               -- 💰 القيمة المالية
  "Day",                                 -- 📅 اليوم
  "Zone",                                -- 📍 المنطقة
  "Actual Date" as "Activity Date",      -- 📅 التاريخ الفعلي
  NULL as "Target Date",                 -- 📅 NULL للـ Actual
  "Actual Date",                         -- 📅 الاحتفاظ بالاسم الأصلي
  "Recorded By",
  "Notes",
  created_at,
  updated_at
FROM public."Planning Database - KPI Actual";

-- منح صلاحيات
GRANT SELECT ON public."Planning Database - KPI Combined" TO authenticated, anon;

-- إنشاء فهرس للقيمة (للتقارير المالية)
CREATE INDEX IF NOT EXISTS idx_kpi_planned_value 
  ON public."Planning Database - KPI Planned"("Value");

CREATE INDEX IF NOT EXISTS idx_kpi_actual_value 
  ON public."Planning Database - KPI Actual"("Value");

-- ============================================================
-- الآن الجداول تحتوي على:
-- - Value: القيمة المالية (مهم للتقارير المالية)
-- - Day: اليوم
-- - Zone: المنطقة
-- - Target Date / Actual Date: التواريخ
-- ============================================================

COMMENT ON VIEW public."Planning Database - KPI Combined" IS 
'Combined view of Planned and Actual KPIs with complete fields:
- Value: Financial value for monetary reports
- Activity Date: Unified date field (Target Date for Planned, Actual Date for Actual)
- Target Date: Planned activity date (NULL for Actual records)
- Actual Date: Actual execution date (NULL for Planned records)
- Day, Zone: Additional tracking fields
- Use for weekly/monthly reports, financial tracking, and lookahead planning';


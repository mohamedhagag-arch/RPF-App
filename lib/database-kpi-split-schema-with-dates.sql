-- ============================================================
-- تحديث KPI Combined View ليشمل التواريخ
-- ============================================================

-- حذف الـ View القديم
DROP VIEW IF EXISTS public."Planning Database - KPI Combined";

-- إنشاء View جديد مع التواريخ
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
  "Actual Date" as "Activity Date",      -- 📅 التاريخ الفعلي
  NULL as "Target Date",                 -- 📅 NULL للـ Actual
  "Actual Date",                         -- 📅 الاحتفاظ بالاسم الأصلي
  "Recorded By",
  "Notes",
  created_at,
  updated_at
FROM public."Planning Database - KPI Actual";

-- منح صلاحيات للـ View
GRANT SELECT ON public."Planning Database - KPI Combined" TO authenticated, anon;

-- ============================================================
-- إنشاء فهرس للتواريخ لتحسين الأداء
-- ============================================================

-- فهرس للـ Target Date
CREATE INDEX IF NOT EXISTS idx_kpi_planned_target_date 
  ON public."Planning Database - KPI Planned"("Target Date");

-- فهرس للـ Actual Date (موجود بالفعل)
-- CREATE INDEX IF NOT EXISTS idx_kpi_actual_date 
--   ON public."Planning Database - KPI Actual"("Actual Date");

-- ============================================================
-- الآن الـ View يحتوي على:
-- - Activity Date: تاريخ النشاط (Target أو Actual حسب النوع)
-- - Target Date: التاريخ المخطط (فقط للـ Planned)
-- - Actual Date: التاريخ الفعلي (فقط للـ Actual)
-- ============================================================

COMMENT ON VIEW public."Planning Database - KPI Combined" IS 
'Combined view of Planned and Actual KPIs with date fields for reporting:
- Activity Date: Unified date field (Target Date for Planned, Actual Date for Actual)
- Target Date: Planned activity date (NULL for Actual records)
- Actual Date: Actual execution date (NULL for Planned records)
- Use for weekly/monthly reports and lookahead planning';


-- ============================================================
-- تقسيم جدول KPI إلى جدولين منفصلين
-- KPI Planned & KPI Actual
-- ============================================================

-- 1. إنشاء جدول KPI Planned
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI Planned" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Full Code" TEXT,
  "Project Code" TEXT,
  "Project Sub Code" TEXT,
  "Activity Name" TEXT,
  "Activity" TEXT,
  "Quantity" TEXT,
  "Section" TEXT,
  "Drilled Meters" TEXT,
  "Unit" TEXT,
  "Target Date" DATE,
  "Notes" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إنشاء جدول KPI Actual
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI Actual" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Full Code" TEXT,
  "Project Code" TEXT,
  "Project Sub Code" TEXT,
  "Activity Name" TEXT,
  "Activity" TEXT,
  "Quantity" TEXT,
  "Section" TEXT,
  "Drilled Meters" TEXT,
  "Unit" TEXT,
  "Actual Date" DATE,
  "Recorded By" TEXT,
  "Notes" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. إنشاء الفهارس (Indexes) للأداء
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kpi_planned_project_code 
  ON public."Planning Database - KPI Planned"("Project Full Code");

CREATE INDEX IF NOT EXISTS idx_kpi_planned_activity 
  ON public."Planning Database - KPI Planned"("Activity Name");

CREATE INDEX IF NOT EXISTS idx_kpi_actual_project_code 
  ON public."Planning Database - KPI Actual"("Project Full Code");

CREATE INDEX IF NOT EXISTS idx_kpi_actual_activity 
  ON public."Planning Database - KPI Actual"("Activity Name");

CREATE INDEX IF NOT EXISTS idx_kpi_actual_date 
  ON public."Planning Database - KPI Actual"("Actual Date");

-- 4. منح الصلاحيات
-- ============================================================
GRANT ALL ON public."Planning Database - KPI Planned" TO authenticated, anon;
GRANT ALL ON public."Planning Database - KPI Actual" TO authenticated, anon;

-- 5. نقل البيانات من الجدول القديم (إذا كان موجوداً)
-- ============================================================
-- نقل Planned KPIs
INSERT INTO public."Planning Database - KPI Planned" 
  ("Project Full Code", "Activity Name", "Quantity", "Section", "Drilled Meters")
SELECT 
  "Project Full Code",
  "Activity Name",
  "Quantity",
  "Section",
  "Drilled Meters"
FROM public."Planning Database - KPI"
WHERE "Input Type" = 'Planned'
ON CONFLICT DO NOTHING;

-- نقل Actual KPIs
INSERT INTO public."Planning Database - KPI Actual" 
  ("Project Full Code", "Activity Name", "Quantity", "Section", "Drilled Meters", "Actual Date")
SELECT 
  "Project Full Code",
  "Activity Name",
  "Quantity",
  "Section",
  "Drilled Meters",
  created_at::DATE
FROM public."Planning Database - KPI"
WHERE "Input Type" = 'Actual'
ON CONFLICT DO NOTHING;

-- 6. إنشاء View للتوافق مع الكود القديم (اختياري)
-- ============================================================
CREATE OR REPLACE VIEW public."Planning Database - KPI Combined" AS
SELECT 
  id,
  "Project Full Code",
  "Activity Name",
  "Quantity",
  'Planned' as "Input Type",
  "Section",
  "Drilled Meters",
  created_at
FROM public."Planning Database - KPI Planned"
UNION ALL
SELECT 
  id,
  "Project Full Code",
  "Activity Name",
  "Quantity",
  'Actual' as "Input Type",
  "Section",
  "Drilled Meters",
  created_at
FROM public."Planning Database - KPI Actual";

-- منح صلاحيات للـ View
GRANT SELECT ON public."Planning Database - KPI Combined" TO authenticated, anon;

-- ============================================================
-- تم بنجاح! الآن لديك:
-- 1. "Planning Database - KPI Planned" - للقيم المخططة
-- 2. "Planning Database - KPI Actual" - للقيم الفعلية
-- 3. "Planning Database - KPI Combined" - View مجمّع (للتوافق)
-- ============================================================


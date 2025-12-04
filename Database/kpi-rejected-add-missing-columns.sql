-- ============================================================
-- إضافة الأعمدة الناقصة إلى جدول kpi_rejected
-- Add missing columns to kpi_rejected table
-- ============================================================

-- ✅ إضافة عمود Activity Division
ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Division" TEXT;

COMMENT ON COLUMN public.kpi_rejected."Activity Division" IS 'Division or department responsible for the activity';

-- ✅ إضافة أعمدة أخرى قد تكون موجودة في جدول KPI الأساسي
ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Scope" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Timing" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Zone Ref" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Column 45" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Column 44" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Zone #" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Zone Number" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Total Units" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Planned Units" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Actual Units" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Diffrence" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Variance Units" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Rate" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Total Value" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Planned Activity Start Date" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Deadline" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Calendar Duration" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Progress %" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Productivity Daily Rate" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Total Drilling Meters" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Drilled Meters Planned Progress" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Drilled Meters Actual Progress" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Remaining Meters" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Planned Status" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Actual Status" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Reported on Data Date?" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Planned Value" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Earned Value" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Delay %" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Planned Progress %" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Planned Start Date" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Planned Completion Date" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Delayed?" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity On Track?" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Completed" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Project Full Name" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Project Status" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Remaining Work Value" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Variance Works Value" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "LookAhead Start Date" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "LookAhead Activity Completion Date" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Remaining LookAhead Duration For Activity Completion" TEXT;

-- ✅ إضافة أعمدة الموافقة/الرفض (من الجدول الأساسي)
ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Approval Status" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Approved By" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Approval Date" TEXT;

-- ✅ إضافة فهارس للأعمدة الجديدة
CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity_division 
  ON public.kpi_rejected("Activity Division");

CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity_scope 
  ON public.kpi_rejected("Activity Scope");

-- ✅ إضافة أعمدة إضافية قد تكون موجودة في جدول KPI
ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Project Name" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Activity Code" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Week" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Month" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Quarter" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Area" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Block" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Chainage" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Location" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Verified By" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Engineer Name" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Supervisor Name" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Quality Rating" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Completion Status" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Inspection Status" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Test Results" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Productivity Rate" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Efficiency %" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Variance" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Variance %" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Cumulative Quantity" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Cumulative Value" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Cost" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Budget" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Recorded Date" TEXT;

ALTER TABLE public.kpi_rejected 
ADD COLUMN IF NOT EXISTS "Submission Date" TEXT;

-- ============================================================
-- ملاحظة: هذا السكريبت يستخدم IF NOT EXISTS لتجنب الأخطاء
-- إذا كان العمود موجوداً بالفعل، سيتم تخطيه
-- ============================================================


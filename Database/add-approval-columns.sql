-- ============================================================
-- إضافة أعمدة الموافقة (Approval) لجدول KPI
-- Add Approval columns to KPI table
-- ============================================================

ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Approval Status" TEXT,
ADD COLUMN IF NOT EXISTS "Approved By" TEXT,
ADD COLUMN IF NOT EXISTS "Approval Date" TEXT;

-- تعليقات على الأعمدة
COMMENT ON COLUMN public."Planning Database - KPI"."Approval Status" IS 'Status of approval: null, pending, approved, or rejected';
COMMENT ON COLUMN public."Planning Database - KPI"."Approved By" IS 'Email or name of the person who approved/rejected the KPI';
COMMENT ON COLUMN public."Planning Database - KPI"."Approval Date" IS 'Date when the KPI was approved or rejected';

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_kpi_approval_status 
  ON public."Planning Database - KPI"("Approval Status");

-- ============================================================
-- تم إضافة الأعمدة بنجاح
-- Columns added successfully
-- ============================================================


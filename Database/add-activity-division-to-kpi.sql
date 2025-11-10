-- ============================================================
-- إضافة عمود Activity Division إلى جدول Planning Database - KPI
-- Add Activity Division column to Planning Database - KPI table
-- ============================================================

-- التحقق من وجود العمود وإضافته إذا لم يكن موجوداً
-- Check if column exists and add it if it doesn't exist

DO $$ 
BEGIN
    -- التحقق من وجود العمود
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Activity Division'
    ) THEN
        -- إضافة العمود
        -- Add the column
        ALTER TABLE public."Planning Database - KPI" 
        ADD COLUMN "Activity Division" TEXT;
        
        RAISE NOTICE '✅ تم إضافة عمود Activity Division بنجاح';
        RAISE NOTICE '✅ Activity Division column added successfully';
    ELSE
        RAISE NOTICE 'ℹ️ عمود Activity Division موجود بالفعل';
        RAISE NOTICE 'ℹ️ Activity Division column already exists';
    END IF;
END $$;

-- إضافة فهرس للعمود لتحسين الأداء (اختياري)
-- Add index for the column to improve performance (optional)
CREATE INDEX IF NOT EXISTS idx_kpi_activity_division 
  ON public."Planning Database - KPI"("Activity Division");

-- إضافة تعليق على العمود
-- Add comment on the column
COMMENT ON COLUMN public."Planning Database - KPI"."Activity Division" IS 
'Division or department responsible for the activity';


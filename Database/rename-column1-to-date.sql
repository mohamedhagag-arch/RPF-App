-- ============================================================
-- Rename "Column 1" to "Date" in MANPOWER Table
-- تغيير اسم العمود "Column 1" إلى "Date" في جدول MANPOWER
-- ============================================================

-- التحقق من وجود الجدول
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'CCD - MANPOWER'
  ) THEN
    RAISE EXCEPTION 'Table "CCD - MANPOWER" does not exist. Please run create-manpower-table.sql first.';
  END IF;
END $$;

-- ============================================================
-- PART 1: Rename Column
-- ============================================================

-- تغيير اسم العمود من "Column 1" إلى "Date"
ALTER TABLE public."CCD - MANPOWER" 
RENAME COLUMN "Column 1" TO "Date";

-- ============================================================
-- PART 2: Update Index (if exists)
-- ============================================================

-- حذف index القديم إن وجد
DROP INDEX IF EXISTS idx_manpower_column_1;

-- إنشاء index جديد للعمود "Date"
CREATE INDEX IF NOT EXISTS idx_manpower_date ON public."CCD - MANPOWER"("Date");

-- ============================================================
-- PART 3: Update Comments
-- ============================================================

COMMENT ON COLUMN public."CCD - MANPOWER"."Date" IS 'تاريخ السجل (مهم جداً)';

-- ============================================================
-- PART 4: Verification
-- ============================================================

-- التحقق من تغيير الاسم
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'CCD - MANPOWER'
    AND column_name = 'Date'
  ) THEN
    RAISE NOTICE '✅ Column renamed successfully from "Column 1" to "Date"';
  ELSE
    RAISE EXCEPTION '❌ Failed to rename column. Column "Date" not found.';
  END IF;
  
  -- التحقق من عدم وجود "Column 1" بعد التغيير
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'CCD - MANPOWER'
    AND column_name = 'Column 1'
  ) THEN
    RAISE WARNING '⚠️ Old column "Column 1" still exists. Please check manually.';
  ELSE
    RAISE NOTICE '✅ Old column "Column 1" removed successfully';
  END IF;
END $$;

-- عرض معلومات العمود الجديد
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'CCD - MANPOWER'
  AND column_name = 'Date';

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Column "Column 1" renamed to "Date" successfully!';
  RAISE NOTICE '✅ Index created for "Date" column';
  RAISE NOTICE '✅ Comments updated';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Update your application code to use "Date" instead of "Column 1"';
  RAISE NOTICE '   2. Update import/export scripts if any';
  RAISE NOTICE '   3. Test the application to ensure everything works correctly';
END $$;

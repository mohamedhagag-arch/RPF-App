-- ============================================================
-- CCD - MANPOWER Table Creation Script
-- سكريبت إنشاء جدول MANPOWER لقسم Cost Control
-- ============================================================

-- ============================================================
-- PART 1: Create Table
-- ============================================================

-- إنشاء جدول MANPOWER
CREATE TABLE IF NOT EXISTS public."CCD - MANPOWER" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Date" TEXT, -- ✅ تاريخ السجل (مهم جداً)
  "PROJECT CODE" TEXT NOT NULL,
  "LABOUR CODE" TEXT,
  "Designation" TEXT,
  "START" TEXT,
  "FINISH" TEXT,
  "OVERTIME" TEXT,
  "Total Hours" NUMERIC(10, 2) DEFAULT 0,
  "Cost" NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- PART 2: Indexes for Performance
-- ============================================================

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_manpower_date ON public."CCD - MANPOWER"("Date"); -- ✅ Index للتاريخ (مهم جداً)
CREATE INDEX IF NOT EXISTS idx_manpower_project_code ON public."CCD - MANPOWER"("PROJECT CODE");
CREATE INDEX IF NOT EXISTS idx_manpower_labour_code ON public."CCD - MANPOWER"("LABOUR CODE");
CREATE INDEX IF NOT EXISTS idx_manpower_designation ON public."CCD - MANPOWER"("Designation");
CREATE INDEX IF NOT EXISTS idx_manpower_start ON public."CCD - MANPOWER"("START");
CREATE INDEX IF NOT EXISTS idx_manpower_finish ON public."CCD - MANPOWER"("FINISH");
CREATE INDEX IF NOT EXISTS idx_manpower_created_at ON public."CCD - MANPOWER"(created_at DESC);

-- Composite index for common queries (Project Code + Labour Code)
CREATE INDEX IF NOT EXISTS idx_manpower_project_labour ON public."CCD - MANPOWER"("PROJECT CODE", "LABOUR CODE");

-- ============================================================
-- PART 3: Comments
-- ============================================================

COMMENT ON TABLE public."CCD - MANPOWER" IS 'جدول MANPOWER - بيانات القوى العاملة والتكاليف للمشاريع';
COMMENT ON COLUMN public."CCD - MANPOWER".id IS 'المعرف الفريد للسجل';
COMMENT ON COLUMN public."CCD - MANPOWER"."Date" IS 'تاريخ السجل (مهم جداً)';
COMMENT ON COLUMN public."CCD - MANPOWER"."PROJECT CODE" IS 'رمز المشروع (مطلوب)';
COMMENT ON COLUMN public."CCD - MANPOWER"."LABOUR CODE" IS 'رمز العامل/الموظف';
COMMENT ON COLUMN public."CCD - MANPOWER"."Designation" IS 'المسمى الوظيفي';
COMMENT ON COLUMN public."CCD - MANPOWER"."START" IS 'تاريخ البدء';
COMMENT ON COLUMN public."CCD - MANPOWER"."FINISH" IS 'تاريخ الانتهاء';
COMMENT ON COLUMN public."CCD - MANPOWER"."OVERTIME" IS 'ساعات العمل الإضافية';
COMMENT ON COLUMN public."CCD - MANPOWER"."Total Hours" IS 'إجمالي الساعات';
COMMENT ON COLUMN public."CCD - MANPOWER"."Cost" IS 'التكلفة (بالعملة المحلية)';
COMMENT ON COLUMN public."CCD - MANPOWER".created_at IS 'تاريخ إنشاء السجل';
COMMENT ON COLUMN public."CCD - MANPOWER".updated_at IS 'تاريخ آخر تحديث للسجل';
COMMENT ON COLUMN public."CCD - MANPOWER".created_by IS 'المستخدم الذي أنشأ السجل';

-- ============================================================
-- PART 4: Triggers
-- ============================================================

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_manpower_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS trigger_update_manpower_updated_at ON public."CCD - MANPOWER";
CREATE TRIGGER trigger_update_manpower_updated_at
  BEFORE UPDATE ON public."CCD - MANPOWER"
  FOR EACH ROW
  EXECUTE FUNCTION update_manpower_updated_at();

-- ============================================================
-- PART 5: Row Level Security (RLS)
-- ============================================================

-- تفعيل RLS
ALTER TABLE public."CCD - MANPOWER" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (with CASCADE to handle dependencies)
DROP POLICY IF EXISTS "Users can view manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Users can insert manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Users can update manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Users can delete manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Admins can manage manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Admins can delete manpower data" ON public."CCD - MANPOWER" CASCADE;

-- Policy: All authenticated users can view MANPOWER data
CREATE POLICY "Users can view manpower data"
  ON public."CCD - MANPOWER"
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Policy: Authenticated users can insert MANPOWER data
CREATE POLICY "Users can insert manpower data"
  ON public."CCD - MANPOWER"
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Policy: Authenticated users can update MANPOWER data
CREATE POLICY "Users can update manpower data"
  ON public."CCD - MANPOWER"
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Policy: Only admins can delete MANPOWER data
CREATE POLICY "Admins can delete manpower data"
  ON public."CCD - MANPOWER"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================
-- PART 5.5: Grant explicit table permissions
-- ============================================================

-- Grant SELECT, INSERT, UPDATE permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON public."CCD - MANPOWER" TO authenticated;

-- Note: DELETE is controlled by RLS policy only (admins only)

-- ============================================================
-- PART 6: Helper Functions
-- ============================================================

-- Drop existing functions if any
DROP FUNCTION IF EXISTS get_manpower_stats(TEXT);
DROP FUNCTION IF EXISTS get_all_manpower_totals();
DROP FUNCTION IF EXISTS clear_manpower_data();

-- دالة للحصول على إحصائيات MANPOWER لمشروع معين
CREATE OR REPLACE FUNCTION get_manpower_stats(p_project_code TEXT)
RETURNS TABLE (
  total_records BIGINT,
  total_hours NUMERIC,
  total_cost NUMERIC,
  unique_labour_codes BIGINT,
  unique_designations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_records,
    COALESCE(SUM("Total Hours"), 0) AS total_hours,
    COALESCE(SUM("Cost"), 0) AS total_cost,
    COUNT(DISTINCT "LABOUR CODE")::BIGINT AS unique_labour_codes,
    COUNT(DISTINCT "Designation")::BIGINT AS unique_designations
  FROM public."CCD - MANPOWER"
  WHERE "PROJECT CODE" ILIKE '%' || p_project_code || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على إجمالي التكاليف لجميع المشاريع
CREATE OR REPLACE FUNCTION get_all_manpower_totals()
RETURNS TABLE (
  total_records BIGINT,
  total_hours NUMERIC,
  total_cost NUMERIC,
  unique_projects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_records,
    COALESCE(SUM("Total Hours"), 0) AS total_hours,
    COALESCE(SUM("Cost"), 0) AS total_cost,
    COUNT(DISTINCT "PROJECT CODE")::BIGINT AS unique_projects
  FROM public."CCD - MANPOWER";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحذف جميع بيانات MANPOWER (للاستخدام في وضع Replace)
-- تسمح للمستخدمين المسجلين بحذف البيانات (للاستيراد الجديد)
CREATE OR REPLACE FUNCTION clear_manpower_data()
RETURNS TABLE (
  deleted_count BIGINT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- حذف جميع البيانات
  -- ✅ Supabase يتطلب WHERE clause في DELETE statements
  DELETE FROM public."CCD - MANPOWER"
  WHERE TRUE; -- ✅ WHERE clause دائماً صحيح (يحذف كل الصفوف)
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT 
    v_count AS deleted_count,
    TRUE AS success,
    format('Successfully deleted %s records from MANPOWER table', v_count) AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clear_manpower_data() TO authenticated;

-- ============================================================
-- PART 7: Verification
-- ============================================================

-- التحقق من إنشاء الجدول
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'CCD - MANPOWER'
  ) THEN
    RAISE NOTICE '✅ Table "CCD - MANPOWER" created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create table "CCD - MANPOWER"';
  END IF;
END $$;

-- عرض معلومات الجدول
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'CCD - MANPOWER'
ORDER BY ordinal_position;

-- ============================================================
-- PART 8: Sample Data (Optional - for testing)
-- ============================================================

-- يمكنك إضافة بيانات تجريبية هنا للاختبار
-- INSERT INTO public."CCD - MANPOWER" (
--   "Date",
--   "PROJECT CODE",
--   "LABOUR CODE",
--   "Designation",
--   "START",
--   "FINISH",
--   "OVERTIME",
--   "Total Hours",
--   "Cost"
-- ) VALUES
--   ('12/1/2024', 'P4110-P', 'L001', 'Engineer', '2024-01-01', '2024-01-31', '0', 160, 8000),
--   ('12/1/2024', 'P4110-P', 'L002', 'Technician', '2024-01-01', '2024-01-31', '10', 170, 5100)
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF SCRIPT
-- ============================================================

-- ملاحظات:
-- 1. هذا الجدول يستخدم أسماء أعمدة مع مسافات لتطابق CSV الأصلي
-- 2. RLS مفعل - جميع المستخدمين المسجلين يمكنهم القراءة والإضافة والتحديث
-- 3. فقط Admins يمكنهم الحذف
-- 4. Indexes تم إنشاؤها للبحث السريع
-- 5. Triggers لتحديث updated_at تلقائياً
-- 6. Helper functions للإحصائيات

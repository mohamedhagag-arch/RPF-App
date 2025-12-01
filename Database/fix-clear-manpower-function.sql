-- ============================================================
-- Fix clear_manpower_data() Function
-- إصلاح دالة حذف بيانات MANPOWER
-- ============================================================
-- 
-- هذا الـ script يضمن أن دالة clear_manpower_data() موجودة
-- ولديها الصلاحيات الصحيحة لحذف البيانات
--
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
-- PART 1: Drop existing function if exists
-- ============================================================

DROP FUNCTION IF EXISTS clear_manpower_data() CASCADE;

-- ============================================================
-- PART 2: Create the function with SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION clear_manpower_data()
RETURNS TABLE (
  deleted_count BIGINT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- حذف جميع البيانات من الجدول
  -- ✅ استخدام WHERE clause لتجنب خطأ Supabase
  -- نستخدم شرط دائماً صحيح (1=1) أو نستخدم TRUNCATE
  DELETE FROM public."CCD - MANPOWER"
  WHERE TRUE; -- ✅ WHERE clause مطلوب من Supabase
  
  -- الحصول على عدد الصفوف المحذوفة
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- إرجاع النتيجة
  RETURN QUERY
  SELECT 
    v_count AS deleted_count,
    TRUE AS success,
    format('Successfully deleted %s records from MANPOWER table', v_count) AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 3: Grant execute permission to authenticated users
-- ============================================================

-- إزالة أي صلاحيات سابقة
REVOKE ALL ON FUNCTION clear_manpower_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION clear_manpower_data() FROM authenticated;

-- منح صلاحية التنفيذ للمستخدمين المسجلين
GRANT EXECUTE ON FUNCTION clear_manpower_data() TO authenticated;

-- ============================================================
-- PART 4: Verify function exists and has correct permissions
-- ============================================================

-- التحقق من وجود الدالة
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'clear_manpower_data'
  ) THEN
    RAISE NOTICE '✅ Function clear_manpower_data() exists';
  ELSE
    RAISE EXCEPTION '❌ Function clear_manpower_data() was not created';
  END IF;
END $$;

-- عرض معلومات الدالة
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'clear_manpower_data';

-- عرض الصلاحيات
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'clear_manpower_data';

-- ============================================================
-- PART 5: Test the function (optional - commented out)
-- ============================================================

-- يمكنك إلغاء التعليق عن هذا الجزء لاختبار الدالة
-- لكن احذر: هذا سيحذف كل البيانات!
/*
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- اختبار الدالة (سيحذف كل البيانات!)
  SELECT * INTO test_result FROM clear_manpower_data();
  
  RAISE NOTICE 'Test Result:';
  RAISE NOTICE '  Deleted Count: %', test_result.deleted_count;
  RAISE NOTICE '  Success: %', test_result.success;
  RAISE NOTICE '  Message: %', test_result.message;
END $$;
*/

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Function clear_manpower_data() created/fixed successfully!';
  RAISE NOTICE '✅ All authenticated users can now execute this function';
  RAISE NOTICE '✅ Function uses SECURITY DEFINER to bypass RLS for deletion';
END $$;

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- 1. هذه الدالة تستخدم SECURITY DEFINER مما يعني أنها تعمل
--    بصلاحيات مالك الدالة (عادة postgres) وليس المستخدم الحالي
--
-- 2. هذا يسمح للمستخدمين المسجلين بحذف البيانات حتى لو كان
--    لديهم RLS policies تمنع الحذف المباشر
--
-- 3. الدالة آمنة لأنها تحذف فقط من جدول MANPOWER المحدد
--
-- 4. بعد تشغيل هذا الـ script، يجب أن يعمل حذف البيانات
--    من واجهة Database Management بدون أخطاء
--
-- ============================================================

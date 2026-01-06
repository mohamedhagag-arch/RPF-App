-- ============================================================
-- Clear All KPI Data from Supabase
-- مسح كل البيانات من جدول KPI
-- ============================================================
-- 
-- ⚠️  تحذير: هذا الـ script سيحذف كل البيانات من جدول KPI!
-- ⚠️  Warning: This script will delete ALL data from KPI table!
--
-- الاستخدام / Usage:
-- 1. افتح Supabase SQL Editor
-- 2. الصق هذا الكود
-- 3. اضغط Run
--
-- ============================================================

-- التحقق من وجود الجدول
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'Planning Database - KPI'
  ) THEN
    RAISE EXCEPTION 'Table "Planning Database - KPI" does not exist.';
  END IF;
END $$;

-- عرض عدد الصفوف قبل الحذف
DO $$
DECLARE
  row_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO row_count
  FROM public."Planning Database - KPI";
  
  RAISE NOTICE '📊 Total rows before deletion: %', row_count;
  
  IF row_count = 0 THEN
    RAISE NOTICE '✅ Table is already empty!';
    RETURN;
  END IF;
END $$;

-- ============================================================
-- الطريقة 1: حذف مباشر (سريع لكن قد يسبب timeout للجداول الكبيرة)
-- Method 1: Direct delete (fast but may timeout for large tables)
-- ============================================================

-- TRUNCATE TABLE - أسرع طريقة (يحذف كل البيانات فوراً)
-- ⚠️  ملاحظة: TRUNCATE لا يعمل إذا كان هناك Foreign Keys
-- ⚠️  Note: TRUNCATE won't work if there are Foreign Keys

-- TRUNCATE TABLE public."Planning Database - KPI" CASCADE;

-- أو استخدام DELETE (أبطأ لكن يعمل دائماً)
-- Or use DELETE (slower but always works)

DELETE FROM public."Planning Database - KPI";

-- ============================================================
-- الطريقة 2: حذف مجزأ (للتأكد من الحذف الكامل للجداول الكبيرة)
-- Method 2: Batch deletion (to ensure complete deletion for large tables)
-- ============================================================

-- إذا كانت الطريقة 1 لم تعمل بسبب timeout، استخدم هذه الطريقة:

/*
DO $$
DECLARE
  deleted_count BIGINT;
  total_deleted BIGINT := 0;
  batch_size INTEGER := 10000;
  iteration INTEGER := 0;
BEGIN
  LOOP
    -- حذف batch من البيانات
    DELETE FROM public."Planning Database - KPI"
    WHERE id IN (
      SELECT id 
      FROM public."Planning Database - KPI"
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    iteration := iteration + 1;
    
    -- عرض التقدم
    RAISE NOTICE 'Batch %: Deleted % rows (Total: %)', iteration, deleted_count, total_deleted;
    
    -- إذا لم يتم حذف أي صف، توقف
    EXIT WHEN deleted_count = 0;
    
    -- حد أقصى للسلامة (1000 iteration = 10 مليون صف)
    IF iteration >= 1000 THEN
      RAISE NOTICE '⚠️  Reached maximum iterations. Please run the script again if needed.';
      EXIT;
    END IF;
    
    -- تأخير صغير لتجنب الضغط على قاعدة البيانات
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RAISE NOTICE '✅ Deletion complete! Total deleted: % rows', total_deleted;
END $$;
*/

-- ============================================================
-- التحقق من النتيجة
-- Verify the result
-- ============================================================

DO $$
DECLARE
  remaining_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public."Planning Database - KPI";
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All data deleted! Table is now empty.';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % rows still remain. You may need to run the batch deletion method above.', remaining_count;
  END IF;
END $$;

-- ============================================================
-- ملاحظات إضافية / Additional Notes
-- ============================================================
-- 
-- إذا كان الجدول كبير جداً (مثل 300,000+ صف):
-- If the table is very large (like 300,000+ rows):
--
-- 1. استخدم الطريقة 2 (Batch deletion) بدلاً من DELETE المباشر
--    Use Method 2 (Batch deletion) instead of direct DELETE
--
-- 2. أو قم بتشغيل هذا الكود عدة مرات حتى يتم حذف كل البيانات
--    Or run this code multiple times until all data is deleted
--
-- 3. أو استخدم الـ script Node.js: node scripts/clear-kpi-data.js
--    Or use the Node.js script: node scripts/clear-kpi-data.js
--
-- ============================================================


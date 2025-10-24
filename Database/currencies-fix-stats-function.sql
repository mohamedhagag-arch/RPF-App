-- ============================================
-- إصلاح دالة إحصائيات العملات
-- Fix for get_currency_stats() function
-- ============================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_currency_stats();

-- إنشاء الدالة المحدثة (بدون ربط بجدول المشاريع مؤقتاً)
CREATE OR REPLACE FUNCTION get_currency_stats()
RETURNS TABLE (
  currency_code VARCHAR(3),
  currency_name VARCHAR(100),
  currency_symbol VARCHAR(10),
  projects_count BIGINT,
  total_contract_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.code AS currency_code,
    c.name AS currency_name,
    c.symbol AS currency_symbol,
    c.usage_count AS projects_count,
    0 AS total_contract_value
  FROM currencies c
  WHERE c.is_active = TRUE
  ORDER BY c.usage_count DESC;
END;
$$ LANGUAGE plpgsql;

-- اختبار الدالة
SELECT * FROM get_currency_stats();

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. تم إصلاح دالة get_currency_stats() لتجنب خطأ العمود المفقود
-- 2. الدالة تعرض الآن usage_count بدلاً من عدد المشاريع الفعلي
-- 3. total_contract_value = 0 مؤقتاً حتى يتم إضافة عمود Currency
-- 4. لتفعيل الإحصائيات الكاملة، نفذ ملف: add-currency-column-to-projects.sql

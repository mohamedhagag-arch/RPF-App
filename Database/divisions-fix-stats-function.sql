-- ============================================
-- إصلاح دالة إحصائيات الأقسام
-- Fix for get_division_stats() function
-- ============================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_division_stats();

-- إنشاء الدالة المحدثة بأسماء الأعمدة الصحيحة وتحويل النوع
CREATE OR REPLACE FUNCTION get_division_stats()
RETURNS TABLE (
  division_name VARCHAR(255),
  projects_count BIGINT,
  total_contract_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.name AS division_name,
    COUNT(p.id) AS projects_count,
    COALESCE(
      SUM(
        CASE 
          WHEN p."Contract Amount" IS NOT NULL AND p."Contract Amount" ~ '^[0-9]+\.?[0-9]*$'
          THEN CAST(p."Contract Amount" AS NUMERIC)
          ELSE 0
        END
      ), 
      0
    ) AS total_contract_value
  FROM divisions d
  LEFT JOIN "Planning Database - ProjectsList" p ON p."Responsible Division" = d.name
  WHERE d.is_active = TRUE
  GROUP BY d.name
  ORDER BY projects_count DESC;
END;
$$ LANGUAGE plpgsql;

-- اختبار الدالة
SELECT * FROM get_division_stats();

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. تم تغيير p.responsible_division إلى p."Responsible Division"
-- 2. تم تغيير p.contract_amount إلى p."Contract Amount"
-- 3. أسماء الأعمدة في جدول ProjectsList تحتوي على مسافات ويجب وضعها بين علامات التنصيص
-- 4. عمود "Contract Amount" من نوع TEXT - يتم تحويله إلى NUMERIC باستخدام CAST
-- 5. يتم التحقق من أن القيمة رقم صحيح قبل التحويل باستخدام regex (^[0-9]+\.?[0-9]*$)
-- 6. القيم غير الرقمية يتم معاملتها كـ 0


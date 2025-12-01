-- ============================================
-- إضافة عمود Currency إلى جدول المشاريع
-- Add Currency column to Projects table
-- ============================================

-- إضافة عمود Currency إلى جدول المشاريع
ALTER TABLE "Planning Database - ProjectsList" 
ADD COLUMN IF NOT EXISTS "Currency" VARCHAR(3) DEFAULT 'AED';

-- إضافة تعليق للعمود
COMMENT ON COLUMN "Planning Database - ProjectsList"."Currency" IS 'عملة المشروع (افتراضي: AED)';

-- تحديث المشاريع الموجودة لتستخدم العملة الافتراضية
UPDATE "Planning Database - ProjectsList" 
SET "Currency" = 'AED' 
WHERE "Currency" IS NULL;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_projects_currency ON "Planning Database - ProjectsList"("Currency");

-- ============================================
-- تحديث دالة إحصائيات العملات
-- ============================================

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_currency_stats();

-- إنشاء الدالة المحدثة
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
  FROM currencies c
  LEFT JOIN "Planning Database - ProjectsList" p ON p."Currency" = c.code
  WHERE c.is_active = TRUE
  GROUP BY c.code, c.name, c.symbol
  ORDER BY projects_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- اختبار التحديثات
-- ============================================

-- عرض عمود Currency الجديد
SELECT 
  "Project Code",
  "Project Name", 
  "Currency",
  "Contract Amount"
FROM "Planning Database - ProjectsList" 
LIMIT 5;

-- اختبار دالة إحصائيات العملات
SELECT * FROM get_currency_stats();

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. تم إضافة عمود "Currency" إلى جدول المشاريع
-- 2. القيمة الافتراضية هي 'AED' (العملة الإماراتية)
-- 3. تم تحديث المشاريع الموجودة لتستخدم AED
-- 4. تم تحديث دالة get_currency_stats() لتعمل مع العمود الجديد
-- 5. يمكن الآن ربط المشاريع بالعملات المختلفة

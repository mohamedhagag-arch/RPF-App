-- ============================================
-- إعداد كامل لنظام العملات
-- Complete Currencies System Setup
-- ============================================

-- ============================================
-- الخطوة 1: إنشاء جدول العملات
-- ============================================

-- إنشاء جدول العملات
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(3) NOT NULL UNIQUE, -- مثل: AED, USD, SAR
  name VARCHAR(100) NOT NULL, -- مثل: UAE Dirham, US Dollar
  symbol VARCHAR(10) NOT NULL, -- مثل: د.إ, $, ر.س
  exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1.0, -- سعر الصرف مقابل AED
  is_default BOOLEAN DEFAULT FALSE, -- العملة الافتراضية
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_currencies_is_active ON currencies(is_active);
CREATE INDEX IF NOT EXISTS idx_currencies_is_default ON currencies(is_default);

-- إضافة تعليقات للتوضيح
COMMENT ON TABLE currencies IS 'جدول العملات مع تحديد تلقائي للعملة الإماراتية';
COMMENT ON COLUMN currencies.id IS 'المعرف الفريد للعملة';
COMMENT ON COLUMN currencies.code IS 'رمز العملة (3 أحرف)';
COMMENT ON COLUMN currencies.name IS 'اسم العملة';
COMMENT ON COLUMN currencies.symbol IS 'رمز العملة للعرض';
COMMENT ON COLUMN currencies.exchange_rate IS 'سعر الصرف مقابل الدرهم الإماراتي';
COMMENT ON COLUMN currencies.is_default IS 'هل هذه العملة الافتراضية؟';
COMMENT ON COLUMN currencies.is_active IS 'هل العملة نشطة؟';
COMMENT ON COLUMN currencies.usage_count IS 'عدد المرات التي تم استخدام العملة في المشاريع';
COMMENT ON COLUMN currencies.created_at IS 'تاريخ إنشاء العملة';
COMMENT ON COLUMN currencies.updated_at IS 'تاريخ آخر تحديث للعملة';

-- ============================================
-- الخطوة 2: إضافة عمود Currency إلى جدول المشاريع
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
-- الخطوة 3: إدراج العملات الافتراضية
-- ============================================

-- إدراج العملات الافتراضية
INSERT INTO currencies (code, name, symbol, exchange_rate, is_default, is_active) VALUES
  ('AED', 'UAE Dirham', 'د.إ', 1.000000, TRUE, TRUE),
  ('USD', 'US Dollar', '$', 0.272294, FALSE, TRUE),
  ('SAR', 'Saudi Riyal', 'ر.س', 1.020000, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- الخطوة 4: إنشاء الدوال والـ Triggers
-- ============================================

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_currencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS currencies_updated_at_trigger ON currencies;
CREATE TRIGGER currencies_updated_at_trigger
  BEFORE UPDATE ON currencies
  FOR EACH ROW
  EXECUTE FUNCTION update_currencies_updated_at();

-- ============================================
-- الخطوة 5: دالة تحديد العملة تلقائياً
-- ============================================

-- دالة لتحديد العملة حسب موقع المشروع
CREATE OR REPLACE FUNCTION get_currency_for_location(project_location TEXT DEFAULT NULL)
RETURNS VARCHAR(3) AS $$
DECLARE
  location_lower TEXT;
  default_currency VARCHAR(3);
BEGIN
  -- الحصول على العملة الافتراضية
  SELECT code INTO default_currency
  FROM currencies
  WHERE is_default = TRUE AND is_active = TRUE
  LIMIT 1;
  
  -- إذا لم يتم تحديد الموقع، استخدم العملة الافتراضية
  IF project_location IS NULL OR project_location = '' THEN
    RETURN COALESCE(default_currency, 'AED');
  END IF;
  
  location_lower := LOWER(project_location);
  
  -- تحديد العملة حسب الموقع
  IF location_lower ~ 'uae|emirates|dubai|abu dhabi' THEN
    RETURN COALESCE(default_currency, 'AED');
  ELSIF location_lower ~ 'saudi|riyadh|jeddah' THEN
    RETURN 'SAR';
  ELSIF location_lower ~ 'usa|america|dollar' THEN
    RETURN 'USD';
  ELSE
    RETURN COALESCE(default_currency, 'AED');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- الخطوة 6: دالة إحصائيات العملات الكاملة
-- ============================================

-- دالة للحصول على إحصائيات العملات
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
-- الخطوة 7: Row Level Security (RLS)
-- ============================================

-- تفعيل RLS
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة العملات النشطة
CREATE POLICY "Anyone can view active currencies"
  ON currencies
  FOR SELECT
  USING (is_active = TRUE);

-- سياسة الإضافة: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can add currencies"
  ON currencies
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- سياسة التحديث: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can update currencies"
  ON currencies
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- سياسة الحذف: المستخدمون المصرح لهم فقط
CREATE POLICY "Authenticated users can delete currencies"
  ON currencies
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- ============================================
-- الخطوة 8: تحديث المشاريع الموجودة
-- ============================================

-- تحديث المشاريع الموجودة لتستخدم العملة الافتراضية (AED)
UPDATE "Planning Database - ProjectsList" 
SET "Currency" = 'AED'
WHERE "Currency" IS NULL OR "Currency" = '';

-- ملاحظة: يمكن تحديث العملة لاحقاً حسب الموقع عند إضافة عمود Project Location

-- ============================================
-- الخطوة 9: الاختبار والتحقق
-- ============================================

-- عرض جميع العملات
SELECT 
  code,
  name,
  symbol,
  exchange_rate,
  is_default,
  usage_count
FROM currencies 
WHERE is_active = TRUE
ORDER BY is_default DESC, name;

-- عرض إحصائيات العملات
SELECT * FROM get_currency_stats();

-- اختبار دالة تحديد العملة
SELECT 
  'UAE Project' as project_location,
  get_currency_for_location('UAE') as currency_code
UNION ALL
SELECT 
  'Saudi Project' as project_location,
  get_currency_for_location('Saudi Arabia') as currency_code
UNION ALL
SELECT 
  'US Project' as project_location,
  get_currency_for_location('USA') as currency_code
UNION ALL
SELECT 
  'Unknown Location' as project_location,
  get_currency_for_location(NULL) as currency_code;

-- عرض عينة من المشاريع مع العملات
SELECT 
  "Project Code",
  "Project Name", 
  "Currency",
  "Contract Amount"
FROM "Planning Database - ProjectsList" 
LIMIT 10;

-- ============================================
-- إكمال الإعداد
-- ============================================

-- رسالة نجاح
DO $$
BEGIN
  RAISE NOTICE '✅ Currencies system setup completed successfully!';
  RAISE NOTICE '📊 Default currencies: AED (UAE), USD (US), SAR (Saudi)';
  RAISE NOTICE '🔧 Auto-detection: UAE→AED, Saudi→SAR, US→USD, Others→AED';
  RAISE NOTICE '💰 Currency column added to projects table';
  RAISE NOTICE '📈 Statistics function ready';
END $$;

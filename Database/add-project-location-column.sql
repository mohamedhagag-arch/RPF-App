-- ============================================
-- إضافة عمود Project Location لتحديد العملة تلقائياً
-- Add Project Location column for automatic currency detection
-- ============================================

-- إضافة عمود Project Location إلى جدول المشاريع
ALTER TABLE "Planning Database - ProjectsList" 
ADD COLUMN IF NOT EXISTS "Project Location" TEXT;

-- إضافة تعليق للعمود
COMMENT ON COLUMN "Planning Database - ProjectsList"."Project Location" IS 'موقع المشروع لتحديد العملة تلقائياً';

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_projects_location ON "Planning Database - ProjectsList"("Project Location");

-- ============================================
-- تحديث المشاريع الموجودة
-- ============================================

-- تحديث المشاريع الموجودة لتحديد العملة حسب الموقع
UPDATE "Planning Database - ProjectsList" 
SET "Currency" = get_currency_for_location("Project Location")
WHERE "Project Location" IS NOT NULL;

-- ============================================
-- اختبار التحديث
-- ============================================

-- عرض عينة من المشاريع مع الموقع والعملة
SELECT 
  "Project Code",
  "Project Name", 
  "Project Location",
  "Currency",
  "Contract Amount"
FROM "Planning Database - ProjectsList" 
WHERE "Project Location" IS NOT NULL
LIMIT 10;

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
  get_currency_for_location('USA') as currency_code;

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. تم إضافة عمود "Project Location" إلى جدول المشاريع
-- 2. يمكن الآن تحديد العملة تلقائياً حسب الموقع
-- 3. المشاريع في الإمارات تستخدم AED
-- 4. المشاريع في السعودية تستخدم SAR
-- 5. المشاريع في أمريكا تستخدم USD
-- 6. أي مكان آخر يستخدم AED (افتراضي)

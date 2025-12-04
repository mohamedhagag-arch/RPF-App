-- ============================================================
-- Machinery Day Rates Table Creation Script
-- سكريبت إنشاء جدول معدلات الآلات اليومية
-- ============================================================

-- ============================================================
-- PART 1: Create Table
-- ============================================================

-- إنشاء جدول machinery_day_rates
CREATE TABLE IF NOT EXISTS public.machinery_day_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL, -- كود الآلة (مرتبط بـ machine_list.code)
  description TEXT, -- وصف الآلة
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0, -- المعدل اليومي
  efficiency NUMERIC(5, 2) DEFAULT 100.00, -- الكفاءة (نسبة مئوية)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_code_rate UNIQUE(code) -- كود فريد لكل آلة
);

-- إضافة تعليقات توضيحية للجدول والأعمدة
COMMENT ON TABLE public.machinery_day_rates IS 'Stores daily rates for machinery with efficiency ratings.';
COMMENT ON COLUMN public.machinery_day_rates.code IS 'Machine code (linked to machine_list.code).';
COMMENT ON COLUMN public.machinery_day_rates.description IS 'Machine description.';
COMMENT ON COLUMN public.machinery_day_rates.rate IS 'Daily rate for the machinery.';
COMMENT ON COLUMN public.machinery_day_rates.efficiency IS 'Efficiency percentage (default 100%).';
COMMENT ON COLUMN public.machinery_day_rates.created_by IS 'ID of the user who created the record.';
COMMENT ON COLUMN public.machinery_day_rates.updated_by IS 'ID of the user who last updated the record.';
COMMENT ON COLUMN public.machinery_day_rates.updated_at IS 'Timestamp of the last update.';

-- ============================================================
-- PART 2: Indexes for Performance
-- ============================================================

-- Indexes for fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_machinery_day_rates_code ON public.machinery_day_rates(code);
CREATE INDEX IF NOT EXISTS idx_machinery_day_rates_created_at ON public.machinery_day_rates(created_at DESC);

-- ============================================================
-- PART 3: Row Level Security (RLS)
-- ============================================================

-- تمكين RLS
ALTER TABLE public.machinery_day_rates ENABLE ROW LEVEL SECURITY;

-- سياسة SELECT: السماح لجميع المستخدمين المصادق عليهم بقراءة البيانات
DROP POLICY IF EXISTS "Allow authenticated users to view machinery day rates" ON public.machinery_day_rates;
CREATE POLICY "Allow authenticated users to view machinery day rates"
ON public.machinery_day_rates FOR SELECT
TO authenticated
USING (TRUE);

-- سياسة INSERT: السماح للمستخدمين المصادق عليهم بإضافة سجلات
DROP POLICY IF EXISTS "Allow authenticated users to insert machinery day rates" ON public.machinery_day_rates;
CREATE POLICY "Allow authenticated users to insert machinery day rates"
ON public.machinery_day_rates FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- سياسة UPDATE: السماح للمستخدمين المصادق عليهم بتحديث سجلاتهم
DROP POLICY IF EXISTS "Allow authenticated users to update machinery day rates" ON public.machinery_day_rates;
CREATE POLICY "Allow authenticated users to update machinery day rates"
ON public.machinery_day_rates FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- سياسة DELETE: السماح للمستخدمين المصادق عليهم بحذف سجلاتهم
DROP POLICY IF EXISTS "Allow authenticated users to delete machinery day rates" ON public.machinery_day_rates;
CREATE POLICY "Allow authenticated users to delete machinery day rates"
ON public.machinery_day_rates FOR DELETE
TO authenticated
USING (TRUE);

-- ============================================================
-- PART 4: Triggers
-- ============================================================

-- دالة لتحديث عمود updated_at تلقائياً عند كل تحديث
CREATE OR REPLACE FUNCTION public.update_machinery_day_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتشغيل الدالة قبل كل تحديث
DROP TRIGGER IF EXISTS set_machinery_day_rates_updated_at ON public.machinery_day_rates;
CREATE TRIGGER set_machinery_day_rates_updated_at
BEFORE UPDATE ON public.machinery_day_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_machinery_day_rates_updated_at();

-- ============================================================
-- PART 5: Grant Permissions
-- ============================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON machinery_day_rates TO authenticated;

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Machinery day rates table created successfully.';
END $$;


-- ============================================================
-- Machine List Table Creation Script
-- سكريبت إنشاء جدول قائمة الآلات في قسم Cost Control
-- ============================================================

-- ============================================================
-- PART 1: Create Table
-- ============================================================

-- إنشاء جدول machine_list
CREATE TABLE IF NOT EXISTS public.machine_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- كود الآلة (يجب أن يكون فريداً)
  name TEXT NOT NULL, -- اسم الآلة
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0, -- المعدل/السعر
  machine_full_name TEXT, -- الاسم الكامل للآلة
  rental NUMERIC(10, 2) DEFAULT NULL, -- تكلفة الإيجار
  category TEXT, -- فئة الآلة
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- إضافة تعليقات توضيحية للجدول والأعمدة
COMMENT ON TABLE public.machine_list IS 'Stores machine information for cost control.';
COMMENT ON COLUMN public.machine_list.code IS 'Unique machine code.';
COMMENT ON COLUMN public.machine_list.name IS 'Machine name.';
COMMENT ON COLUMN public.machine_list.rate IS 'Machine rate/price.';
COMMENT ON COLUMN public.machine_list.machine_full_name IS 'Full name of the machine.';
COMMENT ON COLUMN public.machine_list.rental IS 'Rental cost for the machine.';
COMMENT ON COLUMN public.machine_list.category IS 'Machine category/type.';
COMMENT ON COLUMN public.machine_list.created_by IS 'ID of the user who created the record.';
COMMENT ON COLUMN public.machine_list.updated_by IS 'ID of the user who last updated the record.';
COMMENT ON COLUMN public.machine_list.updated_at IS 'Timestamp of the last update.';

-- ============================================================
-- PART 2: Indexes for Performance
-- ============================================================

-- Indexes for fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_machine_list_code ON public.machine_list(code);
CREATE INDEX IF NOT EXISTS idx_machine_list_name ON public.machine_list(name);
CREATE INDEX IF NOT EXISTS idx_machine_list_created_at ON public.machine_list(created_at DESC);

-- ============================================================
-- PART 3: Row Level Security (RLS)
-- ============================================================

-- تمكين RLS
ALTER TABLE public.machine_list ENABLE ROW LEVEL SECURITY;

-- سياسة SELECT: السماح لجميع المستخدمين المصادق عليهم بقراءة البيانات
DROP POLICY IF EXISTS "Allow authenticated users to view machine list" ON public.machine_list;
CREATE POLICY "Allow authenticated users to view machine list"
ON public.machine_list FOR SELECT
TO authenticated
USING (TRUE);

-- سياسة INSERT: السماح للمستخدمين المصادق عليهم بإضافة سجلات
DROP POLICY IF EXISTS "Allow authenticated users to insert machine list" ON public.machine_list;
CREATE POLICY "Allow authenticated users to insert machine list"
ON public.machine_list FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- سياسة UPDATE: السماح للمستخدمين المصادق عليهم بتحديث سجلاتهم
DROP POLICY IF EXISTS "Allow authenticated users to update machine list" ON public.machine_list;
CREATE POLICY "Allow authenticated users to update machine list"
ON public.machine_list FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- سياسة DELETE: السماح للمستخدمين المصادق عليهم بحذف سجلاتهم
DROP POLICY IF EXISTS "Allow authenticated users to delete machine list" ON public.machine_list;
CREATE POLICY "Allow authenticated users to delete machine list"
ON public.machine_list FOR DELETE
TO authenticated
USING (TRUE);

-- ============================================================
-- PART 4: Triggers
-- ============================================================

-- دالة لتحديث عمود updated_at تلقائياً عند كل تحديث
CREATE OR REPLACE FUNCTION public.update_machine_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتشغيل الدالة قبل كل تحديث
DROP TRIGGER IF EXISTS set_machine_list_updated_at ON public.machine_list;
CREATE TRIGGER set_machine_list_updated_at
BEFORE UPDATE ON public.machine_list
FOR EACH ROW
EXECUTE FUNCTION public.update_machine_list_updated_at();

-- ============================================================
-- PART 5: Grant Permissions
-- ============================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON machine_list TO authenticated;

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Machine list table created successfully.';
END $$;


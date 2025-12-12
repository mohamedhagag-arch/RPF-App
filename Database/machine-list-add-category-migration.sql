-- ============================================================
-- Machine List: Add Category Column Migration Script
-- سكريبت إضافة عمود Category إلى جدول machine_list
-- ============================================================

-- Add category column to machine_list table
ALTER TABLE IF EXISTS public.machine_list
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add comment for the new column
COMMENT ON COLUMN public.machine_list.category IS 'Machine category/type.';

-- Create index for category if needed (optional, for better search performance)
CREATE INDEX IF NOT EXISTS idx_machine_list_category ON public.machine_list(category);

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Category column added to machine_list table successfully.';
END $$;


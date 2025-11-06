-- ============================================================
-- Fix Companies Table RLS Policies
-- إصلاح سياسات الأمان لجدول Companies
-- ============================================================
-- Use this script if the table already exists and you need to fix RLS policies
-- استخدم هذا السكريبت إذا كان الجدول موجوداً بالفعل وتحتاج لإصلاح الـ policies

-- ============================================================
-- Step 1: Drop all existing policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Admins and managers can insert companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Admins and managers can update companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Admins can delete companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Users can insert companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Users can update companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Users can delete companies" ON public."Planning Database - Companies";

-- ============================================================
-- Step 2: Enable RLS (if not already enabled)
-- ============================================================
ALTER TABLE public."Planning Database - Companies" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Create new simplified policies
-- ============================================================

-- Policy: All authenticated users can view companies
CREATE POLICY "Users can view companies" ON public."Planning Database - Companies"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: All authenticated users can insert companies
CREATE POLICY "Users can insert companies" ON public."Planning Database - Companies"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: All authenticated users can update companies
CREATE POLICY "Users can update companies" ON public."Planning Database - Companies"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: All authenticated users can delete companies
CREATE POLICY "Users can delete companies" ON public."Planning Database - Companies"
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- Step 4: Verify policies
-- ============================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'Planning Database - Companies'
ORDER BY policyname;

-- Success message
SELECT '✅ Companies table RLS policies fixed successfully!' as status;



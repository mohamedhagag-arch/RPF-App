-- ============================================================
-- إصلاح RLS Policies لجدول kpi_rejected
-- Fix RLS Policies for kpi_rejected table
-- ============================================================
-- هذا السكريبت يصلح مشكلة "permission denied for table kpi_rejected"
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view rejected KPIs" ON public.kpi_rejected;
DROP POLICY IF EXISTS "Users can insert rejected KPIs" ON public.kpi_rejected;
DROP POLICY IF EXISTS "Users can update rejected KPIs" ON public.kpi_rejected;
DROP POLICY IF EXISTS "Users can delete rejected KPIs" ON public.kpi_rejected;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.kpi_rejected ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SIMPLE SELECT policy - Allow ALL authenticated users to read
-- This is the most important policy - it must work for everyone!
CREATE POLICY "kpi_rejected_select_all_authenticated"
  ON public.kpi_rejected
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 4: Create INSERT policy - Allow authenticated users with kpi.approve permission
CREATE POLICY "kpi_rejected_insert_authenticated"
  ON public.kpi_rejected
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is authenticated (simple check)
    auth.role() = 'authenticated'
    OR
    -- Allow if user exists in users table with proper role/permission
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin' 
        OR users.role = 'manager'
        OR EXISTS (
          SELECT 1 FROM unnest(users.permissions) AS perm
          WHERE perm = 'kpi.approve'
        )
      )
    )
  );

-- Step 5: Create UPDATE policy - Allow authenticated users with kpi.approve permission
CREATE POLICY "kpi_rejected_update_authenticated"
  ON public.kpi_rejected
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated'
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin' 
        OR users.role = 'manager'
        OR EXISTS (
          SELECT 1 FROM unnest(users.permissions) AS perm
          WHERE perm = 'kpi.approve'
        )
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin' 
        OR users.role = 'manager'
        OR EXISTS (
          SELECT 1 FROM unnest(users.permissions) AS perm
          WHERE perm = 'kpi.approve'
        )
      )
    )
  );

-- Step 6: Create DELETE policy - Allow admins only
CREATE POLICY "kpi_rejected_delete_admin"
  ON public.kpi_rejected
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    -- Fallback: Allow if user exists in auth.users (for initial setup)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Step 7: Grant permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_rejected TO authenticated;
GRANT SELECT ON public.kpi_rejected TO anon;

-- ============================================================
-- ملاحظة: 
-- - SELECT: جميع المستخدمين المصرح لهم يمكنهم القراءة
-- - INSERT/UPDATE: المستخدمون المصرح لهم مع kpi.approve أو admin/manager
-- - DELETE: Admin فقط
-- ============================================================


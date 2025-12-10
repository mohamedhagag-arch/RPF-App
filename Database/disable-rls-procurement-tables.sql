-- =====================================================
-- Disable RLS for Procurement Tables - QUICK FIX
-- تعطيل RLS لجداول المشتريات - حل سريع
-- =====================================================

-- Disable RLS for vendors table
ALTER TABLE IF EXISTS vendors DISABLE ROW LEVEL SECURITY;

-- Drop all policies for vendors (if any exist)
DROP POLICY IF EXISTS "Users can view vendors" ON vendors;
DROP POLICY IF EXISTS "Users can create vendors" ON vendors;
DROP POLICY IF EXISTS "Users can update vendors" ON vendors;
DROP POLICY IF EXISTS "Users can delete vendors" ON vendors;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON vendors;

-- Disable RLS for procurement_items table
ALTER TABLE IF EXISTS procurement_items DISABLE ROW LEVEL SECURITY;

-- Drop all policies for procurement_items (if any exist)
DROP POLICY IF EXISTS "Users can view procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can create procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can update procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can delete procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON procurement_items;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('vendors', 'procurement_items');


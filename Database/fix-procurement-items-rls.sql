-- =====================================================
-- Fix Procurement Items RLS Policies
-- إصلاح سياسات الأمان للجدول
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can create procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can update procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can delete procurement items" ON procurement_items;

-- Temporarily disable RLS to check if that's the issue
ALTER TABLE procurement_items DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;

-- Create new policies with better permissions
CREATE POLICY "Enable read access for all authenticated users"
ON procurement_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for all authenticated users"
ON procurement_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users"
ON procurement_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for all authenticated users"
ON procurement_items
FOR DELETE
TO authenticated
USING (true);

-- Alternative: If you want to disable RLS completely (for testing)
-- ALTER TABLE procurement_items DISABLE ROW LEVEL SECURITY;


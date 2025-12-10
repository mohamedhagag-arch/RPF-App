-- =====================================================
-- Create Complete Procurement Tables
-- إنشاء جداول المشتريات الكاملة
-- =====================================================

-- ============================================
-- 1. Create Vendors Table
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_id TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vendors
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at DESC);

-- Drop any existing RLS policies for vendors
DROP POLICY IF EXISTS "Users can view vendors" ON vendors;
DROP POLICY IF EXISTS "Users can create vendors" ON vendors;
DROP POLICY IF EXISTS "Users can update vendors" ON vendors;
DROP POLICY IF EXISTS "Users can delete vendors" ON vendors;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON vendors;

-- Disable RLS for vendors completely
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Fix Procurement Items Table
-- ============================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can create procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can update procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Users can delete procurement items" ON procurement_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON procurement_items;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON procurement_items;

-- Disable RLS completely for procurement_items
ALTER TABLE procurement_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Create update triggers for both tables
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vendors
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for procurement_items
DROP TRIGGER IF EXISTS update_procurement_items_updated_at ON procurement_items;
CREATE TRIGGER update_procurement_items_updated_at
BEFORE UPDATE ON procurement_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Verify tables exist
-- ============================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('vendors', 'procurement_items')
ORDER BY table_name;

-- ============================================
-- 5. Test inserts (optional - remove after testing)
-- ============================================
-- Test vendor insert
INSERT INTO vendors (name, code, status)
VALUES ('Test Vendor', 'TV001', 'active')
ON CONFLICT DO NOTHING;

-- Test item insert
INSERT INTO procurement_items (item_description)
VALUES ('Test Item')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Clean up test data (run this after verifying)
-- ============================================
-- DELETE FROM vendors WHERE code = 'TV001';
-- DELETE FROM procurement_items WHERE item_description = 'Test Item';


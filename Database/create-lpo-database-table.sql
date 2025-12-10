-- =====================================================
-- Create LPO Database Table
-- إنشاء جدول قاعدة بيانات أوامر التوريد
-- =====================================================

-- Create lpo_database table
CREATE TABLE IF NOT EXISTS lpo_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lpo_no TEXT NOT NULL, -- Purchase Order Number from Vendor (Very Important)
    vendor TEXT,
    lpo_date DATE,
    project_code TEXT,
    project_name TEXT,
    lpo_category TEXT,
    item_description TEXT,
    unit TEXT,
    item_quantity NUMERIC(15,2),
    unit_rate NUMERIC(15,2),
    total_amount NUMERIC(15,2),
    currency TEXT DEFAULT 'AED',
    status TEXT DEFAULT 'Issued',
    delivery_date DATE,
    payment_terms TEXT,
    price_before_negotiation NUMERIC(15,2),
    saving_amount_aed NUMERIC(15,2) DEFAULT 0,
    saving_percentage NUMERIC(5,2) DEFAULT 0,
    column_21 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
-- Index on lpo_no (رقم أمر التوريد - مهم جداً للبحث والفلترة)
CREATE INDEX IF NOT EXISTS idx_lpo_database_lpo_no ON lpo_database(lpo_no);
-- Composite index for lpo_no and vendor (للبحث السريع عن أوامر التوريد)
CREATE INDEX IF NOT EXISTS idx_lpo_database_lpo_no_vendor ON lpo_database(lpo_no, vendor);
CREATE INDEX IF NOT EXISTS idx_lpo_database_vendor ON lpo_database(vendor);
CREATE INDEX IF NOT EXISTS idx_lpo_database_project_code ON lpo_database(project_code);
CREATE INDEX IF NOT EXISTS idx_lpo_database_status ON lpo_database(status);
CREATE INDEX IF NOT EXISTS idx_lpo_database_lpo_date ON lpo_database(lpo_date DESC);
CREATE INDEX IF NOT EXISTS idx_lpo_database_category ON lpo_database(lpo_category);

-- Disable RLS for lpo_database
ALTER TABLE lpo_database DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view LPO database" ON lpo_database;
DROP POLICY IF EXISTS "Users can create LPO records" ON lpo_database;
DROP POLICY IF EXISTS "Users can update LPO records" ON lpo_database;
DROP POLICY IF EXISTS "Users can delete LPO records" ON lpo_database;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON lpo_database;

-- Grant permissions
GRANT ALL ON TABLE lpo_database TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_lpo_database_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lpo_database_updated_at
    BEFORE UPDATE ON lpo_database
    FOR EACH ROW
    EXECUTE FUNCTION update_lpo_database_updated_at();

-- Add comment to lpo_no column to clarify its importance
COMMENT ON COLUMN lpo_database.lpo_no IS 'Purchase Order Number from Vendor - Very Important';

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lpo_database'
ORDER BY ordinal_position;


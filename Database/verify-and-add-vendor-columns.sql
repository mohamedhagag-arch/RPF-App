-- =====================================================
-- Verify and Add Vendor Columns
-- التحقق من وإضافة أعمدة الموردين
-- =====================================================

-- Add all new columns to vendors table (if they don't exist)
ALTER TABLE vendors 
  ADD COLUMN IF NOT EXISTS prices_rate NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS delivery TEXT,
  ADD COLUMN IF NOT EXISTS quality TEXT,
  ADD COLUMN IF NOT EXISTS facility TEXT,
  ADD COLUMN IF NOT EXISTS capacity TEXT,
  ADD COLUMN IF NOT EXISTS total_rate NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS date TEXT;

-- Create indexes for new columns (optional, for better query performance)
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_prices_rate ON vendors(prices_rate);
CREATE INDEX IF NOT EXISTS idx_vendors_total_rate ON vendors(total_rate);
CREATE INDEX IF NOT EXISTS idx_vendors_facility ON vendors(facility);
CREATE INDEX IF NOT EXISTS idx_vendors_capacity ON vendors(capacity);

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vendors'
ORDER BY ordinal_position;

-- Show count of columns
SELECT 
    COUNT(*) as total_columns,
    COUNT(CASE WHEN column_name IN ('facility', 'capacity', 'prices_rate', 'delivery', 'quality', 'total_rate', 'category', 'date') THEN 1 END) as new_columns_count
FROM information_schema.columns
WHERE table_name = 'vendors';


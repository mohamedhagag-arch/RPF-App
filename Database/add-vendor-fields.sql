-- =====================================================
-- Add New Fields to Vendors Table
-- إضافة حقول جديدة لجدول الموردين
-- =====================================================

-- Add new columns to vendors table (if they don't exist)
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

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendors'
ORDER BY ordinal_position;


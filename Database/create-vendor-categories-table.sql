-- =====================================================
-- Create Vendor Categories Table
-- إنشاء جدول فئات الموردين
-- =====================================================

-- Create vendor_categories table
CREATE TABLE IF NOT EXISTS vendor_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_categories_name ON vendor_categories(name);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_is_active ON vendor_categories(is_active);

-- Add comments for documentation
COMMENT ON TABLE vendor_categories IS 'جدول فئات الموردين - Vendor Categories';
COMMENT ON COLUMN vendor_categories.id IS 'المعرف الفريد للفئة';
COMMENT ON COLUMN vendor_categories.name IS 'اسم الفئة';
COMMENT ON COLUMN vendor_categories.description IS 'وصف الفئة';
COMMENT ON COLUMN vendor_categories.is_active IS 'هل الفئة نشطة؟';
COMMENT ON COLUMN vendor_categories.usage_count IS 'عدد المرات التي تم استخدام الفئة في الموردين';

-- ============================================
-- Disable RLS and Drop ALL policies
-- ============================================
-- Drop ALL existing policies (comprehensive cleanup)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_categories' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON vendor_categories';
    END LOOP;
END $$;

-- Disable RLS for vendor_categories (similar to vendors table)
ALTER TABLE vendor_categories DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE vendor_categories TO authenticated;
GRANT ALL ON TABLE vendor_categories TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Insert some default categories (optional)
INSERT INTO vendor_categories (name, description, is_active) VALUES
  ('Construction Materials', 'Construction materials and supplies', TRUE),
  ('Equipment Rental', 'Construction equipment rental services', TRUE),
  ('Professional Services', 'Professional consulting and services', TRUE),
  ('Transportation', 'Transportation and logistics services', TRUE),
  ('Utilities', 'Utilities and infrastructure services', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_vendor_categories_updated_at ON vendor_categories;
CREATE TRIGGER trigger_update_vendor_categories_updated_at
    BEFORE UPDATE ON vendor_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_categories_updated_at();

-- Create function to update usage_count for categories
CREATE OR REPLACE FUNCTION update_vendor_category_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage count for the old category (if changed)
    IF OLD.category IS NOT NULL AND OLD.category != NEW.category THEN
        UPDATE vendor_categories
        SET usage_count = (
            SELECT COUNT(*) 
            FROM vendors 
            WHERE category = OLD.category
        )
        WHERE name = OLD.category;
    END IF;
    
    -- Update usage count for the new category
    IF NEW.category IS NOT NULL THEN
        UPDATE vendor_categories
        SET usage_count = (
            SELECT COUNT(*) 
            FROM vendors 
            WHERE category = NEW.category
        )
        WHERE name = NEW.category;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update usage_count when vendor category changes
DROP TRIGGER IF EXISTS trigger_update_vendor_category_usage ON vendors;
CREATE TRIGGER trigger_update_vendor_category_usage
    AFTER INSERT OR UPDATE OR DELETE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_category_usage_count();

-- Initial update of usage_count for existing categories
UPDATE vendor_categories
SET usage_count = (
    SELECT COUNT(*) 
    FROM vendors 
    WHERE category = vendor_categories.name
);

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vendor_categories'
ORDER BY ordinal_position;


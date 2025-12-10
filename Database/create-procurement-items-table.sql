-- =====================================================
-- Create Procurement Items Table
-- جدول قائمة العناصر في قسم المشتريات
-- =====================================================

-- Create the procurement_items table
CREATE TABLE IF NOT EXISTS procurement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on item_description for faster searches
CREATE INDEX IF NOT EXISTS idx_procurement_items_description 
ON procurement_items(item_description);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_procurement_items_created_at 
ON procurement_items(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view items
CREATE POLICY "Users can view procurement items"
ON procurement_items
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to insert items
CREATE POLICY "Users can create procurement items"
ON procurement_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to update items
CREATE POLICY "Users can update procurement items"
ON procurement_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to delete items
CREATE POLICY "Users can delete procurement items"
ON procurement_items
FOR DELETE
TO authenticated
USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_procurement_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_procurement_items_updated_at
BEFORE UPDATE ON procurement_items
FOR EACH ROW
EXECUTE FUNCTION update_procurement_items_updated_at();

-- Add comments for documentation
COMMENT ON TABLE procurement_items IS 'Stores procurement items with their descriptions';
COMMENT ON COLUMN procurement_items.id IS 'Unique identifier for each item';
COMMENT ON COLUMN procurement_items.item_description IS 'Description of the procurement item (required)';
COMMENT ON COLUMN procurement_items.created_at IS 'Timestamp when the item was created';
COMMENT ON COLUMN procurement_items.updated_at IS 'Timestamp when the item was last updated';


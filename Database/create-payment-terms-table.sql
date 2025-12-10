-- =====================================================
-- Create Payment Terms Table
-- إنشاء جدول شروط الدفع
-- =====================================================

-- Create payment_terms table
CREATE TABLE IF NOT EXISTS payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_term TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_terms_term ON payment_terms(payment_term);
CREATE INDEX IF NOT EXISTS idx_payment_terms_created_at ON payment_terms(created_at DESC);

-- Disable RLS for payment_terms
ALTER TABLE payment_terms DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view payment terms" ON payment_terms;
DROP POLICY IF EXISTS "Users can create payment terms" ON payment_terms;
DROP POLICY IF EXISTS "Users can update payment terms" ON payment_terms;
DROP POLICY IF EXISTS "Users can delete payment terms" ON payment_terms;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON payment_terms;

-- Grant permissions
GRANT ALL ON TABLE payment_terms TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_terms_updated_at
    BEFORE UPDATE ON payment_terms
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_terms_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_terms'
ORDER BY ordinal_position;


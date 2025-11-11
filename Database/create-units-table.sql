-- ============================================================
-- Create Units Table for Measurement Units Management
-- ============================================================

-- Create units table
CREATE TABLE IF NOT EXISTS public.units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.units IS 'Measurement units used in activities and KPIs';

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_units_name ON public.units(name);
CREATE INDEX IF NOT EXISTS idx_units_code ON public.units(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_active ON public.units(is_active) WHERE is_active = TRUE;

-- Enable RLS (Row Level Security)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS to allow initial setup (optional - for testing)
-- ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Allow authenticated users to view active units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to view all units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to insert units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to update units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to delete units" ON public.units;
DROP POLICY IF EXISTS "Allow service role full access" ON public.units;
DROP POLICY IF EXISTS "Fallback: Allow all authenticated users to view units" ON public.units;

-- ✅ SIMPLE POLICY: Allow all authenticated users to view ALL units
-- This is the simplest and most reliable policy
CREATE POLICY "Allow authenticated users to view units"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow admins and managers to view all units (including inactive)
-- This policy allows viewing ALL units (including inactive) for admins/managers
-- Note: This is redundant with the above policy but kept for clarity
CREATE POLICY "Allow admins and managers to view all units"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Policy: Allow admins and managers to insert units
CREATE POLICY "Allow admins and managers to insert units"
  ON public.units
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Policy: Allow admins and managers to update units
CREATE POLICY "Allow admins and managers to update units"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Policy: Allow admins and managers to delete units
CREATE POLICY "Allow admins and managers to delete units"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Insert default units
INSERT INTO public.units (name, code, description, is_active) VALUES
  ('No.', 'No.', 'Number/Count', TRUE),
  ('Meter', 'm', 'Meter - Linear measurement', TRUE),
  ('Running Meter', 'rm', 'Running Meter - Continuous linear measurement', TRUE),
  ('Square Meter', 'm²', 'Square Meter - Area measurement', TRUE),
  ('Cubic Meter', 'm³', 'Cubic Meter - Volume measurement', TRUE),
  ('m²', 'm²', 'Square Meter (abbreviated)', TRUE),
  ('m³', 'm³', 'Cubic Meter (abbreviated)', TRUE),
  ('Lump Sum', 'LS', 'Lump Sum - Fixed price', TRUE),
  ('Ton', 't', 'Ton - Weight measurement', TRUE),
  ('Kilogram', 'kg', 'Kilogram - Weight measurement', TRUE),
  ('Day', 'd', 'Day - Time measurement', TRUE),
  ('Week', 'wk', 'Week - Time measurement', TRUE),
  ('Month', 'mo', 'Month - Time measurement', TRUE),
  ('Set', 'set', 'Set - Collection of items', TRUE),
  ('Linear Meter', 'lm', 'Linear Meter - Linear measurement', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for re-running the script)
DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION update_units_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Units table created successfully!';
  RAISE NOTICE '✅ Default units inserted!';
  RAISE NOTICE '✅ RLS policies created!';
END $$;


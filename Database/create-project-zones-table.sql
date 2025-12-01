-- ============================================================
-- Create Project Zones Table
-- إنشاء جدول Zones للمشاريع
-- ============================================================
-- هذا الجدول يحتوي على Zones لكل مشروع
-- كل مشروع له Zones خاصة به (مفصولة بفاصلة)
-- ============================================================

-- Step 1: Create project_zones table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL,
  zones TEXT NOT NULL,  -- Zones separated by comma (e.g., "Zone A, Zone B, Zone C")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Ensure one record per project
  UNIQUE(project_code)
);

COMMENT ON TABLE public.project_zones IS 'Stores zones for each project. Each project can have multiple zones stored as comma-separated text';
COMMENT ON COLUMN public.project_zones.project_code IS 'Project Code from Planning Database - ProjectsList';
COMMENT ON COLUMN public.project_zones.zones IS 'Comma-separated list of zone names (e.g., "Zone A, Zone B, Zone C")';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_zones_project_code ON public.project_zones(project_code);
CREATE INDEX IF NOT EXISTS idx_project_zones_created_by ON public.project_zones(created_by);

-- Enable RLS
ALTER TABLE public.project_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read project zones" ON public.project_zones;
DROP POLICY IF EXISTS "Allow authenticated users to create project zones" ON public.project_zones;
DROP POLICY IF EXISTS "Allow authenticated users to update project zones" ON public.project_zones;
DROP POLICY IF EXISTS "Allow authenticated users to delete project zones" ON public.project_zones;

-- Allow authenticated users to read all project zones
CREATE POLICY "Allow authenticated users to read project zones"
  ON public.project_zones
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create project zones
CREATE POLICY "Allow authenticated users to create project zones"
  ON public.project_zones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update project zones
CREATE POLICY "Allow authenticated users to update project zones"
  ON public.project_zones
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete project zones
CREATE POLICY "Allow authenticated users to delete project zones"
  ON public.project_zones
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT ALL ON public.project_zones TO authenticated;
GRANT SELECT ON public.project_zones TO anon;

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_project_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_project_zones_updated_at_trigger ON public.project_zones;
CREATE TRIGGER update_project_zones_updated_at_trigger
  BEFORE UPDATE ON public.project_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_zones_updated_at();

-- Step 2: Verification
-- ============================================================
SELECT 
  '✅ Project zones table created successfully!' AS status,
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_zones'
  ) AS table_exists;

-- ============================================================
-- ملاحظات مهمة / Important Notes:
-- ============================================================
-- ✅ هيكل الجدول:
--    - id: معرف فريد
--    - project_code: كود المشروع
--    - zones: أسماء الـ Zones مفصولة بفاصلة (مثلاً: "Zone A, Zone B, Zone C")
--    - created_at, updated_at: تواريخ الإنشاء والتحديث
--    - created_by: المستخدم الذي أنشأ الـ Zones
--
-- ✅ كل مشروع له سجل واحد فقط في الجدول
-- ✅ Zones مخزنة كنص مفصول بفاصلة لتسهيل التخزين والاسترجاع
-- ============================================================


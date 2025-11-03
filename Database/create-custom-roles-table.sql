-- ============================================================
-- Create Custom Roles Table
-- إنشاء جدول الأدوار المخصصة
-- ============================================================

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,  -- e.g., 'custom_manager', 'project_lead'
  role_name TEXT NOT NULL,        -- Display name: 'Custom Manager', 'Project Lead'
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.custom_roles IS 'Custom roles created by administrators with specific permission sets';
COMMENT ON COLUMN public.custom_roles.role_key IS 'Unique key for the role (lowercase with underscores)';
COMMENT ON COLUMN public.custom_roles.role_name IS 'Display name for the role';
COMMENT ON COLUMN public.custom_roles.permissions IS 'Array of permission IDs assigned to this role';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_roles_role_key ON public.custom_roles(role_key);
CREATE INDEX IF NOT EXISTS idx_custom_roles_created_by ON public.custom_roles(created_by);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admins and managers to read custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Allow admins and managers to create custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Allow admins and managers to update custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Allow admins and managers to delete custom roles" ON public.custom_roles;

-- Allow authenticated users to read all custom roles
CREATE POLICY "Allow authenticated users to read custom roles"
  ON public.custom_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to create custom roles
CREATE POLICY "Allow admins and managers to create custom roles"
  ON public.custom_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager' OR 'users.permissions' = ANY(COALESCE(users.permissions, ARRAY[]::TEXT[])))
    )
  );

-- Allow admins and managers to update custom roles
CREATE POLICY "Allow admins and managers to update custom roles"
  ON public.custom_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager' OR 'users.permissions' = ANY(COALESCE(users.permissions, ARRAY[]::TEXT[])))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager' OR 'users.permissions' = ANY(COALESCE(users.permissions, ARRAY[]::TEXT[])))
    )
  );

-- Allow admins and managers to delete custom roles
CREATE POLICY "Allow admins and managers to delete custom roles"
  ON public.custom_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager' OR 'users.permissions' = ANY(COALESCE(users.permissions, ARRAY[]::TEXT[])))
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.custom_roles TO authenticated;
GRANT SELECT ON public.custom_roles TO anon;

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_custom_roles_updated_at_trigger ON public.custom_roles;
CREATE TRIGGER update_custom_roles_updated_at_trigger
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_updated_at();


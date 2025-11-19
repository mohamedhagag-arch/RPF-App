-- ============================================================
-- ✅ Fix User Guide Permissions
-- This script fixes permission issues with user_guides table
-- ============================================================

-- ============================================================
-- 1. Drop existing policies
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view active guides" ON user_guides;
DROP POLICY IF EXISTS "Only admins can manage guides" ON user_guides;
DROP POLICY IF EXISTS "Users can track their own views" ON user_guide_views;
DROP POLICY IF EXISTS "Users can view their own views" ON user_guide_views;

-- ============================================================
-- 2. Grant Permissions
-- ============================================================

-- Grant SELECT to authenticated users (everyone can view)
GRANT SELECT ON user_guides TO authenticated;
GRANT SELECT ON user_guide_views TO authenticated;

-- Grant ALL to service_role (for admin operations)
GRANT ALL ON user_guides TO service_role;
GRANT ALL ON user_guide_views TO service_role;

-- Grant INSERT, UPDATE, DELETE to authenticated (will be controlled by RLS)
GRANT INSERT, UPDATE, DELETE ON user_guides TO authenticated;
GRANT INSERT, SELECT ON user_guide_views TO authenticated;

-- ============================================================
-- 3. Create/Update RLS Policies
-- ============================================================

-- Policy: Everyone can view active guides
CREATE POLICY "Anyone can view active guides"
  ON user_guides
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Admins can view all guides (including inactive)
CREATE POLICY "Admins can view all guides"
  ON user_guides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can insert
CREATE POLICY "Only admins can insert guides"
  ON user_guides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can update
CREATE POLICY "Only admins can update guides"
  ON user_guides
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can delete
CREATE POLICY "Only admins can delete guides"
  ON user_guides
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Users can insert their own views
CREATE POLICY "Users can track their own views"
  ON user_guide_views
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text 
    OR user_email = (SELECT email FROM users WHERE id::text = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Users can view their own views
CREATE POLICY "Users can view their own views"
  ON user_guide_views
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text 
    OR user_email = (SELECT email FROM users WHERE id::text = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Users can update their own views (for completion tracking)
CREATE POLICY "Users can update their own views"
  ON user_guide_views
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::text 
    OR user_email = (SELECT email FROM users WHERE id::text = auth.uid()::text)
  )
  WITH CHECK (
    user_id = auth.uid()::text 
    OR user_email = (SELECT email FROM users WHERE id::text = auth.uid()::text)
  );

-- ============================================================
-- 4. Alternative: Disable RLS if policies don't work
-- (Uncomment if needed)
-- ============================================================

-- ALTER TABLE user_guides DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_guide_views DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_guides', 'user_guide_views')
ORDER BY tablename, policyname;


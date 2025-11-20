-- ============================================================
-- ✅ Update Permissions for New Features
-- This script updates user permissions to include new features:
-- - Audit Log (audit_log.view, audit_log.export)
-- - User Guide (user_guide.view, user_guide.manage)
-- - Activity Log (activity_log.view, activity_log.export)
-- - Active Users (active_users.view)
-- ============================================================

-- ============================================================
-- 1. Update Manager Role Permissions
-- ============================================================
UPDATE users 
SET 
  permissions = array_cat(
    COALESCE(permissions, ARRAY[]::TEXT[]),
    ARRAY[
      'audit_log.view',
      'audit_log.export',
      'user_guide.view',
      'activity_log.view',
      'activity_log.export',
      'active_users.view'
    ]
  )
WHERE role = 'manager'
  AND (custom_permissions_enabled = FALSE OR custom_permissions_enabled IS NULL)
  AND (
    -- Only add if not already present
    NOT (permissions && ARRAY['audit_log.view', 'audit_log.export', 'user_guide.view', 'activity_log.view', 'activity_log.export', 'active_users.view'])
    OR permissions IS NULL
  );

-- ============================================================
-- 2. Update Engineer Role Permissions
-- ============================================================
UPDATE users 
SET 
  permissions = array_cat(
    COALESCE(permissions, ARRAY[]::TEXT[]),
    ARRAY[
      'user_guide.view',
      'active_users.view'
    ]
  )
WHERE role = 'engineer'
  AND (custom_permissions_enabled = FALSE OR custom_permissions_enabled IS NULL)
  AND (
    NOT (permissions && ARRAY['user_guide.view', 'active_users.view'])
    OR permissions IS NULL
  );

-- ============================================================
-- 3. Update Viewer Role Permissions
-- ============================================================
UPDATE users 
SET 
  permissions = array_cat(
    COALESCE(permissions, ARRAY[]::TEXT[]),
    ARRAY[
      'user_guide.view',
      'active_users.view'
    ]
  )
WHERE role = 'viewer'
  AND (custom_permissions_enabled = FALSE OR custom_permissions_enabled IS NULL)
  AND (
    NOT (permissions && ARRAY['user_guide.view', 'active_users.view'])
    OR permissions IS NULL
  );

-- ============================================================
-- 4. Update Planner Role Permissions
-- ============================================================
UPDATE users 
SET 
  permissions = array_cat(
    COALESCE(permissions, ARRAY[]::TEXT[]),
    ARRAY[
      'user_guide.view',
      'active_users.view'
    ]
  )
WHERE role = 'planner'
  AND (custom_permissions_enabled = FALSE OR custom_permissions_enabled IS NULL)
  AND (
    NOT (permissions && ARRAY['user_guide.view', 'active_users.view'])
    OR permissions IS NULL
  );

-- ============================================================
-- 5. Admin Role - No update needed (already has all permissions)
-- ============================================================
-- Admin role automatically gets all permissions, so no update needed

-- ============================================================
-- 6. Verify Updates
-- ============================================================
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(CASE WHEN permissions && ARRAY['audit_log.view'] THEN 1 END) as has_audit_log_view,
  COUNT(CASE WHEN permissions && ARRAY['user_guide.view'] THEN 1 END) as has_user_guide_view,
  COUNT(CASE WHEN permissions && ARRAY['activity_log.view'] THEN 1 END) as has_activity_log_view,
  COUNT(CASE WHEN permissions && ARRAY['active_users.view'] THEN 1 END) as has_active_users_view
FROM users
WHERE custom_permissions_enabled = FALSE OR custom_permissions_enabled IS NULL
GROUP BY role
ORDER BY role;

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================
-- 
-- Note: Users with custom_permissions_enabled = TRUE are not updated
-- to preserve their custom permission configurations.
-- Admins can manually add these permissions to custom users if needed.


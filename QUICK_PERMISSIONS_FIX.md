# 🚀 Quick Permissions Fix

## Problem
Getting "cannot cast type text[] to jsonb" error when trying to check/clean permissions data.

## ✅ Simple Solution (3 Steps)

### Step 1: Check Column Type
Run this first to verify the column is TEXT[]:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'permissions';
```

Expected result: `text[]`

---

### Step 2: Reset All Permissions (Recommended)
Use the **simple_reset_permissions.sql** file:

```sql
-- Step 1: Clear everything
UPDATE users 
SET 
  permissions = NULL,
  custom_permissions_enabled = FALSE,
  updated_at = NOW();

-- Step 2: Set defaults
UPDATE users 
SET 
  permissions = CASE 
    WHEN role = 'admin' THEN ARRAY[]::TEXT[]
    WHEN role = 'manager' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
      'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays',
      'system.export', 'system.backup',
      'database.view', 'database.export', 'database.backup'
    ]
    WHEN role = 'engineer' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print'
    ]
    WHEN role = 'viewer' THEN ARRAY[
      'projects.view',
      'boq.view',
      'kpi.view',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly'
    ]
    ELSE ARRAY[]::TEXT[]
  END,
  custom_permissions_enabled = FALSE,
  updated_at = NOW();

-- Step 3: Verify
SELECT 
  id,
  email,
  role,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled
FROM users 
ORDER BY role, email;
```

---

### Step 3: Test in Browser
1. Open your website
2. Go to **Settings** → **User Management**
3. Click **Manage Permissions** for any user
4. Select/deselect some permissions
5. Click **Save Changes**
6. ✅ Should see success message!

---

## 🔍 Alternative: Test One User First

If you want to be careful, test with one user first using **test_single_user_permissions.sql**:

```sql
-- Find a user email first
SELECT email, role FROM users LIMIT 3;

-- Test update on one user (replace with real email)
UPDATE users 
SET 
  permissions = ARRAY['projects.view', 'projects.create', 'boq.view']::TEXT[],
  custom_permissions_enabled = FALSE,
  updated_at = NOW()
WHERE email = 'your_email@example.com'
RETURNING id, email, permissions;
```

If this works without errors, then apply the full reset to all users.

---

## 📋 Files Available

1. **simple_reset_permissions.sql** - Clean reset for all users (recommended)
2. **test_single_user_permissions.sql** - Test with one user first (safer)
3. **verify_permissions_column.sql** - Check column type and structure
4. **QUICK_PERMISSIONS_FIX.md** - This guide

---

## 🎯 Expected Result

After running the reset:
- ✅ All users have proper TEXT[] permissions
- ✅ Permissions match their role
- ✅ Save button works in UI
- ✅ No more casting errors

---

## 🔧 Code Already Fixed

The code has been updated to work with TEXT[]:

```typescript
// In UserManagement.tsx
const { data, error } = await (supabase as any)
  .from('users')
  .update({
    permissions: permissions, // Direct TEXT[] array
    custom_permissions_enabled: customEnabled,
    updated_at: new Date().toISOString()
  })
  .eq('id', userId)
  .select()
```

---

## 🚨 If You Still Get Errors

1. **Check if column exists:**
   ```sql
   \d users
   ```

2. **Verify column type:**
   ```sql
   SELECT column_name, data_type, udt_name 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'permissions';
   ```
   Should show: `ARRAY` and `_text`

3. **Try simple insert:**
   ```sql
   UPDATE users 
   SET permissions = ARRAY['test']::TEXT[]
   WHERE id = (SELECT id FROM users LIMIT 1);
   ```

---

## 🎉 Success!

Once you run **simple_reset_permissions.sql**:
- Database is clean ✅
- All users have defaults ✅
- Permissions manager works ✅
- No more errors ✅

Your Advanced Permissions Manager is ready to use! 🚀


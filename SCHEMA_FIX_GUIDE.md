# 🔧 Database Schema Fix - Missing Columns

## 🚨 **Problem Identified:**
Error: "Could not find the 'first_name' column of 'users' in the schema cache"

**Root Cause**: The `users` table in your database doesn't have `first_name` and `last_name` columns, but the code is trying to access them.

---

## ✅ **Solution Options:**

### **Option 1: Add Missing Columns (Recommended)**
Run the `Database/add_missing_columns.sql` script to add the missing columns:

```sql
-- Add first_name and last_name columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update existing users to populate from full_name
UPDATE users 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE 
        WHEN position(' ' in full_name) > 0 THEN
          split_part(full_name, ' ', 1)
        ELSE full_name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE 
        WHEN position(' ' in full_name) > 0 THEN
          substring(full_name from position(' ' in full_name) + 1)
        ELSE NULL
      END
    ELSE NULL
  END,
  updated_at = NOW()
WHERE first_name IS NULL OR last_name IS NULL;
```

### **Option 2: Fix Schema Only**
Run the `Database/fix_user_schema_alternative.sql` script to ensure all required columns exist:

```sql
-- Ensure all required columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions_enabled BOOLEAN DEFAULT FALSE;
-- ... other columns
```

---

## 🚀 **Recommended Solution:**

### **Step 1: Run the Schema Fix**
Execute `Database/add_missing_columns.sql` in Supabase SQL Editor:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `add_missing_columns.sql`
3. Click **Run**

### **Step 2: Verify the Fix**
After running the script, verify with this query:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;
```

You should see:
- ✅ `first_name` (TEXT)
- ✅ `last_name` (TEXT)
- ✅ `full_name` (TEXT)
- ✅ `permissions` (ARRAY)
- ✅ `custom_permissions_enabled` (BOOLEAN)

### **Step 3: Test the Application**
1. **Refresh your application**
2. **Go to Settings → User Management**
3. **The error should be gone**

---

## 🔍 **What the Fix Does:**

### **1. Adds Missing Columns:**
- `first_name` (TEXT) - User's first name
- `last_name` (TEXT) - User's last name

### **2. Populates Existing Data:**
- Extracts first name from `full_name` (text before first space)
- Extracts last name from `full_name` (text after first space)
- Updates `updated_at` timestamp

### **3. Examples:**
- `full_name: "ahmed mohamed"` → `first_name: "ahmed"`, `last_name: "mohamed"`
- `full_name: "Marwan Wahman"` → `first_name: "Marwan"`, `last_name: "Wahman"`
- `full_name: "admin"` → `first_name: "admin"`, `last_name: NULL`

---

## 📋 **Files Available:**

1. **`Database/add_missing_columns.sql`** - Complete fix with data population
2. **`Database/fix_user_schema_alternative.sql`** - Schema-only fix
3. **`SCHEMA_FIX_GUIDE.md`** - This guide

---

## 🎯 **Expected Result:**

After running the fix:

### **✅ Database:**
- All required columns exist
- Existing users have first_name/last_name populated
- No more schema cache errors

### **✅ Application:**
- User Management loads without errors
- Permission system works correctly
- All user data displays properly

### **✅ Console:**
- No more "Could not find the 'first_name' column" errors
- All debug logs work correctly

---

## 🚨 **If You Still Get Errors:**

### **Check Column Names:**
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

### **Check Sample Data:**
```sql
SELECT id, email, full_name, first_name, last_name FROM users LIMIT 3;
```

### **Check Permissions:**
```sql
SELECT email, permissions, array_length(permissions, 1) as count FROM users LIMIT 3;
```

---

## 🎉 **Success Indicators:**

- ✅ **No schema errors** in console
- ✅ **User Management loads** without issues
- ✅ **Permission system works** correctly
- ✅ **All user data displays** properly
- ✅ **Database queries work** without errors

---

## 🚀 **Next Steps:**

1. **Run the SQL script** in Supabase
2. **Refresh your application**
3. **Test the User Management** page
4. **Verify permissions system** works
5. **Report back** with results

**This should resolve the schema cache error completely!** 🎯

---

## 📝 **Alternative Quick Fix:**

If you want to keep using only `full_name`, you can also update the code to not use `first_name`/`last_name`, but the recommended approach is to add the missing columns as shown above.

**Run the SQL script and test!** 🚀


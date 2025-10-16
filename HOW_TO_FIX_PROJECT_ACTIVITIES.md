# 🔧 How to Fix Project Type Activities - Complete Guide

## 🚨 Problem
The Project Type Activities page shows "No project types found" or "No activities found".

## 🎯 Root Cause
The `project_type_activities` table either:
1. Doesn't exist in Supabase
2. Has incorrect RLS (Row Level Security) policies
3. Has no data

## ✅ Complete Solution

### Step 1: Create the Table and Insert Data

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com → Your Project → SQL Editor
   ```

2. **Copy and Run SQL Script**
   - Open file: `Database/project_type_activities_table.sql`
   - Copy ALL content (Ctrl+A, Ctrl+C)
   - Paste in Supabase SQL Editor
   - Click **RUN**

3. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check Table Editor → Look for `project_type_activities` table
   - Should have 66 rows of data

### Step 2: Fix RLS Policies (If Step 1 Doesn't Work)

If you still get "permission denied" errors:

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com → Your Project → SQL Editor
   ```

2. **Copy and Run RLS Fix Script**
   - Open file: `URGENT_RLS_FIX.sql`
   - Copy ALL content
   - Paste in Supabase SQL Editor
   - Click **RUN**

3. **What This Does**
   - Temporarily disables RLS to check data
   - Re-enables RLS with correct policies
   - Grants proper permissions to authenticated users

### Step 3: Test in Your App

1. **Refresh the App**
   - Go to: Settings → Project Activities
   - Click the **Refresh** button

2. **What You Should See**
   ```
   ✅ 6 Project Types in left sidebar:
      - Piling
      - Shoring
      - Dewatering
      - Ground Improvement
      - Infrastructure
      - General Construction
   
   ✅ Statistics at top:
      - Total Activities: 66
      - Active: 66
      - Inactive: 0
      - Default: 66
      - Custom: 0
   
   ✅ Activities List:
      - Click any project type
      - See its activities
   ```

## 🔍 Debugging

### Check Browser Console
```
1. Press F12 in your browser
2. Go to Console tab
3. Look for errors (red lines)
4. Check these messages:
   - 🔍 Loading project type activities...
   - 📊 Loaded data: { activities: X, types: Y, ... }
```

### Check Supabase Logs
```
1. Go to Supabase Dashboard
2. Navigate to: Logs → Postgres Logs
3. Look for:
   - SELECT errors
   - Permission denied errors
   - RLS policy failures
```

### Manual Database Check
```sql
-- Run in Supabase SQL Editor

-- Check if table exists
SELECT * FROM project_type_activities LIMIT 5;

-- Check row count
SELECT COUNT(*) FROM project_type_activities;

-- Check project types
SELECT DISTINCT project_type FROM project_type_activities;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'project_type_activities';
```

## 📋 Expected Data After Setup

### Project Types (6 total)
1. **Piling** - 12 activities
2. **Shoring** - 10 activities
3. **Dewatering** - 11 activities
4. **Ground Improvement** - 11 activities
5. **Infrastructure** - 11 activities
6. **General Construction** - 11 activities

### Sample Activities
```
Piling:
- Mobilization & Demobilization
- Bored Pile (Various Diameters: 600mm, 800mm, 1000mm, 1200mm, 1500mm)
- Pile Testing
- Pile Cap Construction
- etc.

Shoring:
- Soldier Pile Installation
- Sheet Pile Installation
- Lagging/Waling Installation
- Tie-Back Anchors
- etc.
```

## 🎯 Success Criteria

✅ No errors in browser console  
✅ 6 project types visible  
✅ 66 total activities  
✅ Can add new activities  
✅ Can edit existing activities  
✅ Can delete/restore activities  
✅ Search and filter work correctly  

## 🆘 Still Not Working?

### Common Issues:

1. **"permission denied for table project_type_activities"**
   - Run `URGENT_RLS_FIX.sql`
   - Check if you're logged in as admin/manager

2. **"No project types found"**
   - Run `Database/project_type_activities_table.sql`
   - Check if data was inserted

3. **UI shows loading forever**
   - Check browser console for errors
   - Check Supabase logs
   - Verify network connection

4. **Data shows but can't add/edit**
   - Check user role (must be admin or manager)
   - Check permission: `settings.activities`

## 📞 Need Help?

If none of the above works:
1. Take screenshot of browser console errors
2. Take screenshot of Supabase logs
3. Check your user role in database
4. Verify `.env.local` has correct Supabase credentials

---

**Last Updated:** October 16, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready

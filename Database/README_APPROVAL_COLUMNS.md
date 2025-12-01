# ✅ KPI Tracking Columns Setup Guide

## 📋 Overview

This guide explains how to ensure all tracking columns exist in your KPI table for accurate history tracking.

## 🎯 Required Columns

The following columns must exist in the `Planning Database - KPI` table:

### **User Tracking:**
1. **`created_by`** (TEXT) - Email or ID of the user who created the KPI
2. **`updated_by`** (TEXT) - Email or ID of the user who last updated the KPI

### **Approval Tracking:**
3. **`Approval Status`** (TEXT) - Status: `null`, `pending`, `approved`, or `rejected`
4. **`Approved By`** (TEXT) - Email or ID of the person who approved/rejected
5. **`Approval Date`** (TEXT) - Date when approved/rejected (format: YYYY-MM-DD)

## 🚀 Quick Setup

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Login and select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Complete Script** (Recommended)
   - Open file: `Database/add-all-tracking-columns.sql`
   - Copy ALL the content
   - Paste into SQL Editor
   - Click **RUN** or press `Ctrl+Enter`
   
   **OR** run individual scripts:
   - `Database/add-created-by-columns.sql` - For created_by and updated_by only
   - `Database/ensure-approval-columns-safe.sql` - For approval columns only

4. **Verify Success**
   - You should see success messages like:
     - `✅ Added "created_by" column`
     - `✅ Added "updated_by" column`
     - `✅ Added "Approval Status" column`
     - `✅ Added "Approved By" column`
     - `✅ Added "Approval Date" column`
   - Or: `✅ Column already exists` (if columns were already there)

5. **Check the Results**
   - The script will show a table with all 5 columns at the end
   - Verify all columns are listed

### Method 2: Using Supabase CLI

```bash
# Make sure you have Supabase CLI installed
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db execute --file Database/ensure-approval-columns-safe.sql
```

## ✅ What the Script Does

1. **Checks if columns exist** - Uses `information_schema` to verify
2. **Adds missing columns** - Only adds columns that don't exist (safe!)
3. **Adds comments** - Documents what each column is for
4. **Creates index** - Improves query performance on `Approval Status`
5. **Shows results** - Displays the final column structure

## 🔍 Verify Columns Exist

After running the script, you can verify by running this query in Supabase SQL Editor:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - KPI' 
AND column_name IN ('created_by', 'updated_by', 'Approval Status', 'Approved By', 'Approval Date')
ORDER BY column_name;
```

You should see all 5 columns listed.

## 🐛 Troubleshooting

### Problem: Columns still not showing in History Modal

**Solution 1: Refresh the KPI data**
- After approving a KPI, refresh the page or reload the KPI list
- The History Modal reads from the latest data

**Solution 2: Check Console Logs**
- Open Developer Console (F12)
- Look for: `🔍 [KPI History] Approval Info (Final):`
- This shows what data is being read

**Solution 3: Verify Data in Database**
- Go to Supabase Table Editor
- Open `Planning Database - KPI` table
- Find your KPI and check:
  - `Approval Status` column should be `approved`
  - `Approved By` should have the user email/ID
  - `Approval Date` should have the date

### Problem: "Column does not exist" error (created_by, updated_by, etc.)

**Solution:**
- Run the `add-all-tracking-columns.sql` script (recommended)
- OR run `add-created-by-columns.sql` for user tracking columns only
- OR run `ensure-approval-columns-safe.sql` for approval columns only
- These scripts will add the missing columns safely

## 📝 Notes

- The script uses `IF NOT EXISTS` so it's safe to run multiple times
- Existing data is preserved (no data loss!)
- The script creates an index for better performance
- If columns don't exist, the system falls back to using the `Notes` field

## 🎯 After Setup

Once the columns are added:

1. ✅ New KPIs will save `created_by` with the creator's email/ID
2. ✅ Updated KPIs will save `updated_by` with the updater's email/ID
3. ✅ New approvals will save to the proper columns
4. ✅ History Modal will show accurate user and approval information
5. ✅ You'll see who created, updated, and approved each KPI
6. ✅ All history will be tracked correctly

---

**Need Help?** Check the console logs for detailed debugging information.


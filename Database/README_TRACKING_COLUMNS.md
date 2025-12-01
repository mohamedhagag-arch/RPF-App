# ✅ Tracking Columns Setup Guide (KPI, BOQ, Projects)

## 📋 Overview

This guide explains how to ensure all tracking columns (`created_by` and `updated_by`) exist in your database tables for accurate history tracking.

## 🎯 Required Columns

The following columns must exist in these tables:

### **1. KPI Table: `Planning Database - KPI`**
- `created_by` (TEXT) - Email or ID of the user who created the KPI
- `updated_by` (TEXT) - Email or ID of the user who last updated the KPI
- `Approval Status` (TEXT) - Status: `null`, `pending`, `approved`, or `rejected`
- `Approved By` (TEXT) - Email or ID of the person who approved/rejected
- `Approval Date` (TEXT) - Date when approved/rejected (format: YYYY-MM-DD)

### **2. BOQ Table: `Planning Database - BOQ Rates`**
- `created_by` (TEXT) - Email or ID of the user who created the BOQ activity
- `updated_by` (TEXT) - Email or ID of the user who last updated the BOQ activity

### **3. Projects Table: `Planning Database - ProjectsList`**
- `created_by` (TEXT) - Email or ID of the user who created the project
- `updated_by` (TEXT) - Email or ID of the user who last updated the project

## 🚀 Quick Setup

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Login and select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Scripts** (Run in this order)

   **Step 1: Add KPI tracking columns**
   - Open file: `Database/add-all-tracking-columns.sql`
   - Copy ALL the content
   - Paste into SQL Editor
   - Click **RUN** or press `Ctrl+Enter`

   **Step 2: Add BOQ and Projects tracking columns**
   - Open file: `Database/add-tracking-columns-boq-projects.sql`
   - Copy ALL the content
   - Paste into SQL Editor
   - Click **RUN** or press `Ctrl+Enter`

4. **Verify Success**
   - You should see success messages like:
     - `✅ Added "created_by" column`
     - `✅ Added "updated_by" column`
   - Or: `✅ Column already exists` (if columns were already there)

5. **Check the Results**
   - The scripts will show tables with the columns at the end
   - Verify all columns are listed

### Method 2: Using Supabase CLI

```bash
# Make sure you have Supabase CLI installed
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migrations
supabase db execute --file Database/add-all-tracking-columns.sql
supabase db execute --file Database/add-tracking-columns-boq-projects.sql
```

## ✅ What the Scripts Do

1. **Check if columns exist** - Uses `information_schema` to verify
2. **Add missing columns** - Only adds columns that don't exist (safe!)
3. **Add comments** - Documents what each column is for
4. **Shows results** - Displays the final column structure

## 🔍 Verify Columns Exist

After running the scripts, you can verify by running these queries in Supabase SQL Editor:

### Check KPI columns:
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

### Check BOQ columns:
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - BOQ Rates' 
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;
```

### Check Projects columns:
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - ProjectsList' 
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;
```

You should see all columns listed.

## 🐛 Troubleshooting

### Problem: "Column does not exist" error

**Solution:**
- Run the appropriate script:
  - `Database/add-all-tracking-columns.sql` - For KPI table
  - `Database/add-tracking-columns-boq-projects.sql` - For BOQ and Projects tables
- These scripts will add the missing columns safely

### Problem: Columns still not showing in History/Forms

**Solution 1: Refresh the page**
- After adding columns, refresh the page or reload the data
- The application reads from the latest schema

**Solution 2: Check Console Logs**
- Open Developer Console (F12)
- Look for: `✅ Setting created_by` or `✅ Setting updated_by`
- This shows what data is being saved

**Solution 3: Verify Data in Database**
- Go to Supabase Table Editor
- Open the relevant table
- Find your record and check:
  - `created_by` should have the user email/ID
  - `updated_by` should have the user email/ID (if updated)

## 📝 Notes

- The scripts use `IF NOT EXISTS` so they're safe to run multiple times
- Existing data is preserved (no data loss!)
- The scripts add comments to document each column
- If columns don't exist, the system may fall back to using other fields

## 🎯 After Setup

Once the columns are added:

1. ✅ New KPIs will save `created_by` with the creator's email/ID
2. ✅ Updated KPIs will save `updated_by` with the updater's email/ID
3. ✅ New BOQ activities will save `created_by` with the creator's email/ID
4. ✅ Updated BOQ activities will save `updated_by` with the updater's email/ID
5. ✅ New projects will save `created_by` with the creator's email/ID
6. ✅ Updated projects will save `updated_by` with the updater's email/ID
7. ✅ History Modals will show accurate user information
8. ✅ You'll see who created, updated, and approved each record
9. ✅ All history will be tracked correctly

---

**Need Help?** Check the console logs for detailed debugging information.


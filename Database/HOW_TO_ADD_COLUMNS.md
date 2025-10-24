# 📋 How to Add Missing Columns to Supabase

This guide will help you add all the missing columns to your Supabase database.

## 🎯 Why We Need This

Currently, the BOQ Rates table uses generic column names like `Column 44` and `Column 45`. We need to add proper column names like `Planned Units`, `Deadline`, etc.

## 📝 Steps to Execute

### **Method 1: Using Supabase SQL Editor (Recommended)**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Login to your account
   - Select your project

2. **Open SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy the SQL Script**
   - Open the file `Database/add-missing-columns.sql`
   - Copy ALL the content

4. **Paste and Run**
   - Paste the SQL into the SQL Editor
   - Click **RUN** button
   - Wait for completion (should take 5-10 seconds)

5. **Verify Success**
   - You should see success messages
   - Check the last two SELECT queries to see all columns

### **Method 2: Using Supabase CLI**

```bash
# Make sure you have Supabase CLI installed
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db execute --file Database/add-missing-columns.sql
```

## ✅ What This Script Does

### **1. Adds Columns to BOQ Rates Table**

All these columns will be added:
- ✅ `Planned Units` - Planned quantity for the activity
- ✅ `Actual Units` - Actual completed quantity
- ✅ `Total Units` - Total quantity
- ✅ `Deadline` - Activity deadline date
- ✅ `Rate` - Unit rate/cost
- ✅ `Planned Value` - Planned financial value
- ✅ `Earned Value` - Earned value based on actual progress
- ✅ `Difference` - Difference between planned and actual
- ✅ `Variance Units` - Variance in units
- ✅ `Calendar Duration` - Duration in days
- ✅ `Activity Progress %` - Progress percentage
- ✅ `Activity Completed` - Completion flag
- ✅ `Activity Delayed?` - Delay flag
- ✅ `Activity On Track?` - On track flag
- ✅ `Delay %` - Delay percentage
- ✅ `Planned Progress %` - Planned progress percentage
- ✅ `Project Full Name` - Full project name
- ✅ `Project Status` - Project status
- ✅ And more...

### **2. Migrates Existing Data**

- Copies data from `Column 44` → `Planned Units`
- Copies data from `Column 45` → `Deadline`
- Preserves all existing data

### **3. Adds Columns to KPI Table**

- ✅ `Target Date` - Target date for planned KPIs
- ✅ `Actual Date` - Actual achievement date
- ✅ `Activity Date` - Unified date field
- ✅ `Project Code` - Project reference
- ✅ `Project Sub Code` - Sub-project code
- ✅ `Unit` - Measurement unit
- ✅ `Day` - Day reference (e.g., "Day 1 - Monday")
- ✅ `Value` - Financial value
- ✅ `Zone` - Zone/area
- ✅ `Recorded By` - Who recorded the data

### **4. Creates Performance Indexes**

Adds indexes for faster queries on:
- Project Full Code
- Activity Name
- Activity Division
- Planned Start Date
- Input Type
- Target Date

## 🔍 After Running the Script

### **Test the Changes:**

1. **Refresh Supabase Dashboard**
   - Go to **Table Editor**
   - Select `Planning Database - BOQ Rates`
   - You should see all the new columns

2. **Test the Application**
   - Restart your Next.js dev server (Ctrl+C, then `npm run dev`)
   - Go to http://localhost:3000/boq
   - Add a new activity with Planned Units
   - **The Planned Units should now save correctly!** ✅

3. **Verify in Console**
   - Open Developer Console (F12)
   - Look for logs:
     ```
     📊 Mapping BOQ - Column 44 (Planned Units): 100 for activity: ...
     📊 Verify Column 44 (Planned Units): 100
     ```

## ⚠️ Important Notes

- **Backup First**: This script is safe and uses `IF NOT EXISTS`, but it's always good to backup
- **No Data Loss**: The script only ADDS columns, it doesn't remove anything
- **Migration**: Existing data in `Column 44` and `Column 45` will be copied to the new columns
- **Keep Old Columns**: `Column 44` and `Column 45` will remain for backward compatibility

## 🆘 Troubleshooting

### **If you get permission errors:**
Make sure you're logged in as the project owner or have admin rights.

### **If columns already exist:**
The script uses `IF NOT EXISTS`, so it's safe to run multiple times.

### **If migration doesn't work:**
You can manually copy data using:
```sql
UPDATE public."Planning Database - BOQ Rates"
SET "Planned Units" = "Column 44"
WHERE "Planned Units" IS NULL;
```

## 📞 Need Help?

If you encounter any issues, check:
1. Supabase logs in the dashboard
2. Application console logs
3. Your Supabase project permissions

---

**After running this script, your application will work perfectly with clear column names!** ✨



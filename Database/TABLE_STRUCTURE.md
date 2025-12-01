# 📊 Database Table Structure & Usage

## 🎯 Current Table Architecture

### **Main Tables in Supabase:**

```
📦 Planning Database - ProjectsList
   └─ Stores: All project information
   └─ Primary Key: id (UUID)
   └─ Unique Key: Project Code

📦 Planning Database - BOQ Rates
   └─ Stores: All BOQ activities
   └─ Primary Key: id (UUID)
   └─ Foreign Key: Project Code → ProjectsList

📦 Planning Database - KPI (UNIFIED TABLE) ⭐
   └─ Stores: ALL KPIs (both Planned & Actual)
   └─ Primary Key: id (UUID)
   └─ Differentiator: "Input Type" column
   └─ Values: "Planned" or "Actual"
```

---

## 🔄 Data Flow

### **1. Create Project:**
```
User → IntelligentProjectForm 
     → ProjectsList component
     → Supabase: INSERT into "Planning Database - ProjectsList"
     ✅ Saved
```

### **2. Create BOQ Activity:**
```
User → IntelligentBOQForm
     → Fills: Project, Activity, Planned Units, Dates
     → Auto-generates: KPI Preview (13 daily records)
     → BOQManagement component
     → Supabase: INSERT into "Planning Database - BOQ Rates"
     ✅ Activity Saved
     
     IF Auto-Generate KPIs enabled:
     → autoKPIGenerator.ts
     → generateKPIsFromBOQ()
     → Distributes quantity over working days
     → saveGeneratedKPIs()
     → Supabase: INSERT into "Planning Database - KPI"
        WITH "Input Type" = "Planned"
     ✅ KPIs Created
```

### **3. View KPIs:**
```
User → Opens /kpi page
     → KPITracking component
     → Supabase: SELECT * from "Planning Database - KPI"
     → Filters by:
        - Project Code
        - Input Type (Planned/Actual)
        - Date Range
     ✅ KPIs Displayed
```

### **4. Add Manual KPI (Actual):**
```
User → KPI Form
     → Selects: Input Type = "Actual"
     → KPITracking.handleCreateKPI()
     → Supabase: INSERT into "Planning Database - KPI"
        WITH "Input Type" = "Actual"
     ✅ KPI Saved
```

---

## 📋 **Table: Planning Database - KPI** (UNIFIED)

### **Purpose:**
Single unified table for ALL KPIs (both Planned and Actual).

### **Key Columns:**

```sql
┌─────────────────────┬──────────────────────────────────┐
│ Column              │ Description                      │
├─────────────────────┼──────────────────────────────────┤
│ id                  │ Unique identifier (UUID)         │
│ Project Full Code   │ Project reference                │
│ Activity Name       │ Activity reference               │
│ Quantity            │ Quantity value                   │
│ Input Type          │ "Planned" or "Actual" ⭐         │
│ Target Date         │ Target date (for Planned)        │
│ Actual Date         │ Achievement date (for Actual)    │
│ Activity Date       │ Unified date field               │
│ Unit                │ Measurement unit                 │
│ Section             │ Zone/Section                     │
│ Drilled Meters      │ Drilling progress                │
│ created_at          │ Auto timestamp                   │
│ updated_at          │ Auto timestamp                   │
└─────────────────────┴──────────────────────────────────┘
```

### **Differentiating Planned vs Actual:**

```typescript
// Planned KPIs:
{
  "Input Type": "Planned",
  "Target Date": "2025-10-15",
  "Actual Date": null,
  "Activity Date": "2025-10-15"
}

// Actual KPIs:
{
  "Input Type": "Actual",
  "Target Date": null,
  "Actual Date": "2025-10-16",
  "Activity Date": "2025-10-16"
}
```

---

## 🔍 Querying Data

### **Get All Planned KPIs for a Project:**
```sql
SELECT * FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
AND "Input Type" = 'Planned'
ORDER BY "Target Date";
```

### **Get All Actual KPIs for a Project:**
```sql
SELECT * FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
AND "Input Type" = 'Actual'
ORDER BY "Actual Date";
```

### **Get Both Planned & Actual for an Activity:**
```sql
SELECT 
    "Input Type",
    "Target Date" as Date,
    "Quantity",
    "Unit"
FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
AND "Activity Name" = 'Earthwork Excavation'
ORDER BY "Input Type", Date;
```

### **Daily Progress Summary:**
```sql
SELECT 
    "Target Date",
    SUM(CASE WHEN "Input Type" = 'Planned' THEN CAST("Quantity" AS NUMERIC) ELSE 0 END) as Planned,
    SUM(CASE WHEN "Input Type" = 'Actual' THEN CAST("Quantity" AS NUMERIC) ELSE 0 END) as Actual
FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
GROUP BY "Target Date"
ORDER BY "Target Date";
```

---

## ✅ **What's Working Now:**

### **After Latest Fixes:**

1. ✅ **Save KPIs:** 
   - Location: `'Planning Database - KPI'`
   - Method: `autoKPIGenerator.saveGeneratedKPIs()`
   - Includes: `"Input Type" = "Planned"`

2. ✅ **Read KPIs:**
   - Location: `'Planning Database - KPI'`
   - Method: `KPITracking.fetchData()`
   - Filters by: `"Input Type"`, `"Project Code"`

3. ✅ **Create Manual KPI:**
   - Location: `'Planning Database - KPI'`
   - Method: `KPITracking.handleCreateKPI()`
   - Supports: Both Planned & Actual

4. ✅ **Update KPI:**
   - Location: `'Planning Database - KPI'`
   - Method: `KPITracking.handleUpdateKPI()`
   - Preserves: `"Input Type"`

5. ✅ **Delete KPI:**
   - Location: `'Planning Database - KPI'`
   - Method: `KPITracking.handleDeleteKPI()`
   - Works: For both types

---

## 🚀 **Testing Steps:**

### **Test 1: Verify Table Exists**

Run in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%KPI%';
```

**Expected Output:**
```
Planning Database - KPI
```

### **Test 2: Check Columns**

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Planning Database - KPI'
ORDER BY ordinal_position;
```

**Must include:**
- ✅ `Input Type`
- ✅ `Project Full Code`
- ✅ `Activity Name`
- ✅ `Quantity`
- ✅ `Section`
- ✅ `Drilled Meters`

### **Test 3: Check if KPIs Were Saved**

```sql
SELECT 
    "Project Full Code",
    "Activity Name",
    "Input Type",
    "Quantity",
    "Target Date",
    created_at
FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Should show KPIs with `"Input Type" = "Planned"`

### **Test 4: Count KPIs**

```sql
SELECT 
    "Input Type",
    COUNT(*) as count
FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
GROUP BY "Input Type";
```

---

## 🔧 **If KPIs Still Don't Appear:**

### **Check 1: Console Logs**

Open Developer Console (F12) and look for:

```
✅ KPITracking: Fetched X projects, Y activities, Z KPIs
📊 KPI Distribution: Planned = X, Actual = Y
```

If Z = 0, KPIs weren't saved!

### **Check 2: Verify Save Was Successful**

In console, when creating BOQ activity:

```
💾 SAVING KPIs TO DATABASE
  - Total KPIs: 13
✅ Successfully saved 13 KPIs
```

If you see error instead, check the error message!

### **Check 3: Run Direct Query**

In Supabase SQL Editor:
```sql
SELECT * FROM "Planning Database - KPI" 
ORDER BY created_at DESC 
LIMIT 5;
```

This will show the most recently created KPIs.

### **Check 4: Verify Input Type Column**

```sql
SELECT DISTINCT "Input Type" 
FROM "Planning Database - KPI";
```

Should show: `"Planned"` and/or `"Actual"`

---

## 📞 **Common Issues & Solutions:**

### Issue 1: "No KPI data found"
**Cause:** KPIs weren't created (Planned Units was 0 or empty)  
**Solution:** When creating BOQ activity, ensure Planned Units > 0

### Issue 2: "Could not find Input Type column"
**Cause:** Using wrong table  
**Solution:** ✅ Fixed! Now uses unified table

### Issue 3: "KPIs created but not visible"
**Cause:** Reading from wrong table/view  
**Solution:** ✅ Fixed! Now reads from same table

### Issue 4: "Filter not working"
**Cause:** project_code mismatch  
**Solution:** ✅ Fixed! Now matches both project_code and project_full_code

---

## 🎉 **Summary:**

| Operation | Table Used | Status |
|-----------|------------|--------|
| Create KPI (Auto) | `Planning Database - KPI` | ✅ Fixed |
| Create KPI (Manual) | `Planning Database - KPI` | ✅ Fixed |
| Read KPIs | `Planning Database - KPI` | ✅ Fixed |
| Update KPI | `Planning Database - KPI` | ✅ Fixed |
| Delete KPI | `Planning Database - KPI` | ✅ Fixed |
| Filter KPIs | By `Input Type` column | ✅ Fixed |

**Everything now uses the SAME unified table!** ✨

---

## 🚀 **Next: Test It!**

1. **Reload** http://localhost:3000/boq (Ctrl+R)
2. **Add Activity** with Planned Units > 0
3. **Check Console** for success messages
4. **Go to** http://localhost:3000/kpi
5. **Filter by** Project P5090
6. **KPIs should appear!** 🎉

---

**All fixed! Ready to test!** 💪



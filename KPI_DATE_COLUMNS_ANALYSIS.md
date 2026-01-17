# Analysis: KPI Date Columns in "Planning Database - KPI" Table

## Overview
The table "Planning Database - KPI" contains three main date columns: **Target Date**, **Actual Date**, and **Activity Date**. This document explains how each column is calculated, what fields are linked to them, and how they're used throughout the application.

---

## 📅 Column Definitions

### 1. **Target Date**
- **Purpose**: Stores the planned/target date for activities (used for "Planned" KPIs)
- **Data Type**: `TEXT` (stored as date string)
- **When Used**: Only populated when `Input Type = "Planned"`

### 2. **Actual Date**
- **Purpose**: Stores the actual completion/achievement date for activities (used for "Actual" KPIs)
- **Data Type**: `TEXT` (stored as date string)
- **When Used**: Only populated when `Input Type = "Actual"`

### 3. **Activity Date**
- **Purpose**: **Unified date field** that automatically contains either Target Date or Actual Date based on Input Type
- **Data Type**: `TEXT` (stored as date string)
- **When Used**: Always populated as a unified reference point

---

## 🔄 Calculation Logic

### Activity Date Calculation (Unified Field)

The **Activity Date** is calculated automatically in the web application using the following priority logic:

```typescript
// From: components/kpi/KPITracking.tsx (lines 1238-1240, 1472-1474)

const activityDateValue = 
  kpiData['Activity Date'] || kpiData.activity_date || 
  (inputType === 'Actual' 
    ? (kpiData['Actual Date'] || kpiData.actual_date) 
    : (kpiData['Target Date'] || kpiData.target_date)) 
  || ''
```

**Priority Order:**
1. Direct `Activity Date` value (if provided)
2. If `Input Type = "Actual"`: Use `Actual Date`
3. If `Input Type = "Planned"`: Use `Target Date`
4. Fallback to empty string

### Data Mapping (From Database to Application)

```typescript
// From: lib/dataMappers.ts (lines 719-721)

activity_date: row['Activity Date'] || row['Target Date'] || row['Actual Date'] || '',
target_date: row['Target Date'] || '',
actual_date: row['Actual Date'] || '',
```

**Priority for Activity Date:**
1. `Activity Date` column
2. `Target Date` column (fallback)
3. `Actual Date` column (fallback)

---

## 🔗 Linked Fields and Calculations

### 1. **Day Column** (Derived from Activity Date)

The `Day` column is **automatically calculated** from `Activity Date` when creating/updating KPIs:

```typescript
// From: components/kpi/KPITracking.tsx (lines 1242-1254, 1476-1488)

let dayValue = kpiData['Day'] || kpiData.day || ''
if (!dayValue && activityDateValue) {
  try {
    const date = new Date(activityDateValue)
    if (!isNaN(date.getTime())) {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
      dayValue = `${formatDate(activityDateValue)} - ${weekday}`
      // Example: "2025-01-15 - Monday"
    }
  } catch (e) {
    console.warn('⚠️ Could not calculate Day from date:', activityDateValue)
  }
}
```

**Format**: `"YYYY-MM-DD - Weekday"` (e.g., "2025-01-15 - Monday")

### 2. **BOQ Table Date Calculations**

The date columns are used to calculate **Planned Start/End Dates** and **Actual Start/End Dates** in the BOQ table:

#### Planned Dates (from Target Date):
```typescript
// From: components/boq/BOQTableWithCustomization.tsx (lines 645-656)

// Priority: target_date > activity_date > raw['Target Date'] > raw['Activity Date']
const getPlannedStartDate = (activity) => {
  // Gets FIRST Target Date from Planned KPIs for the activity
  // Sorted by date, returns earliest
}

const getPlannedEndDate = (activity) => {
  // Gets LAST Target Date from Planned KPIs for the activity
  // Sorted by date, returns latest
}
```

#### Actual Dates (from Actual Date):
```typescript
// From: components/boq/BOQTableWithCustomization.tsx (lines 945-960, 1178-1192)

// Priority: actual_date > activity_date > target_date > raw['Actual Date'] > raw['Activity Date']
const getActualStartDate = (activity) => {
  // Gets FIRST Actual Date from Actual KPIs for the activity
  // Sorted by date, returns earliest
}

const getActualEndDate = (activity) => {
  // Gets LAST Actual Date from Actual KPIs for the activity
  // Sorted by date, returns latest
}
```

### 3. **Monthly Work Revenue Reports**

Dates are used to filter KPIs by time period:

```typescript
// From: components/reports/tabs/MonthlyWorkRevenueTab.tsx (lines 619-639)

// For Actual KPIs:
const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''

// Priority logic:
if (kpi.input_type === 'Actual' && actualDateValue) {
  kpiDateStr = actualDateValue
} else if (dayValue) {
  kpiDateStr = activityDateValue || dayValue
} else {
  kpiDateStr = activityDateValue || actualDateValue
}
```

### 4. **Project Details Panel**

Dates are used to calculate activity start/completion dates:

```typescript
// From: components/projects/ProjectDetailsPanel.tsx (lines 508-542)

const calculateActivityStartDate = (activity) => {
  // Gets dates from Planned KPIs
  // Priority: Activity Date > Target Date > Day
  // Returns earliest date
}
```

---

## 🗄️ Database Structure

### Column Definitions (Supabase)

```sql
-- From: Database/add-all-columns-complete.sql (lines 238-240)

ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Target Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Date" TEXT;
```

### Indexes

```sql
-- From: Database/PRODUCTION_SCHEMA_COMPLETE.sql (lines 396-398)

CREATE INDEX IF NOT EXISTS idx_kpi_target_date 
  ON public."Planning Database - KPI" ("Target Date");
CREATE INDEX IF NOT EXISTS idx_kpi_actual_date 
  ON public."Planning Database - KPI" ("Actual Date");
CREATE INDEX IF NOT EXISTS idx_kpi_activity_date 
  ON public."Planning Database - KPI" ("Activity Date");
```

### Database Triggers

**⚠️ No database triggers or computed columns** automatically calculate these dates in Supabase. All calculations are performed in the **web application layer** (TypeScript/React).

---

## 📊 Usage Throughout Application

### 1. **KPI Creation/Update** (`components/kpi/KPITracking.tsx`)
- Calculates `Activity Date` from `Target Date` or `Actual Date` based on `Input Type`
- Calculates `Day` from `Activity Date`
- Saves all three date fields to database

### 2. **KPI Forms** (`components/kpi/IntelligentKPIForm.tsx`, `EnhancedSmartActualKPIForm.tsx`)
- User inputs `Target Date` (for Planned) or `Actual Date` (for Actual)
- `Activity Date` is automatically calculated and saved
- `Day` is calculated from `Activity Date`

### 3. **BOQ Table** (`components/boq/BOQTableWithCustomization.tsx`)
- Uses dates to calculate:
  - **Planned Start Date**: First `Target Date` from Planned KPIs
  - **Planned End Date**: Last `Target Date` from Planned KPIs
  - **Actual Start Date**: First `Actual Date` from Actual KPIs
  - **Actual End Date**: Last `Actual Date` from Actual KPIs

### 4. **Reports** (`components/reports/tabs/MonthlyWorkRevenueTab.tsx`)
- Filters KPIs by date range using `Actual Date` or `Activity Date`
- Groups revenue by month based on these dates

### 5. **Data Mapping** (`lib/dataMappers.ts`)
- Maps database columns to application format
- Provides fallback logic for date fields

---

## 🔍 Query Patterns

### Filtering by Date Range

```typescript
// From: components/kpi/KPITracking.tsx (lines 279-294)

// Filter by Activity Date
.eq('Input Type', 'Planned')
.gte('"Activity Date"', startDate.toISOString().split('T')[0])
.lte('"Activity Date"', today.toISOString().split('T')[0])

// Filter by Actual Date
.eq('Input Type', 'Actual')
.gte('"Actual Date"', startDate.toISOString().split('T')[0])
.lte('"Actual Date"', today.toISOString().split('T')[0])

// Filter by Target Date
.eq('Input Type', 'Planned')
.gte('"Target Date"', startDate.toISOString().split('T')[0])
.lte('"Target Date"', today.toISOString().split('T')[0])
```

---

## 📝 Summary

### Target Date
- **Stored**: Directly from user input (Planned KPIs)
- **Calculated**: No automatic calculation
- **Linked Fields**: `Activity Date` (copied to), `Day` (derived from Activity Date)
- **Used In**: Planned date calculations, BOQ table planned dates

### Actual Date
- **Stored**: Directly from user input (Actual KPIs)
- **Calculated**: No automatic calculation
- **Linked Fields**: `Activity Date` (copied to), `Day` (derived from Activity Date)
- **Used In**: Actual date calculations, BOQ table actual dates, revenue reports

### Activity Date
- **Stored**: Calculated automatically from `Target Date` or `Actual Date`
- **Calculated**: Yes - based on `Input Type`:
  - If `Input Type = "Planned"`: Uses `Target Date`
  - If `Input Type = "Actual"`: Uses `Actual Date`
- **Linked Fields**: `Day` (calculated from this), used in all date-based queries
- **Used In**: All date filtering, sorting, and display operations

---

## ⚠️ Important Notes

1. **No Database-Level Calculations**: All date calculations happen in the application layer (TypeScript), not in Supabase triggers or functions.

2. **Activity Date is the Primary Field**: Most queries and calculations use `Activity Date` as the unified date reference, with `Target Date` and `Actual Date` serving as source fields.

3. **Day Column Dependency**: The `Day` column is always calculated from `Activity Date`, not directly from `Target Date` or `Actual Date`.

4. **Input Type Determines Behavior**: The `Input Type` field ("Planned" or "Actual") determines which date field is used and how `Activity Date` is calculated.

---

## 📚 Related Files

- `components/kpi/KPITracking.tsx` - Main KPI creation/update logic
- `lib/dataMappers.ts` - Database to application mapping
- `components/boq/BOQTableWithCustomization.tsx` - Date calculations for BOQ table
- `components/reports/tabs/MonthlyWorkRevenueTab.tsx` - Date filtering for reports
- `Database/PRODUCTION_SCHEMA_COMPLETE.sql` - Database schema and indexes

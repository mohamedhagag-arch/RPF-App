# Activity Date Column Type Migration Summary

## Overview
This migration converts the "Activity Date" column in the "Planning Database - KPI" table from TEXT to DATE type, with comprehensive data conversion and code updates.

## Migration Files

### 1. Migration Script
**File:** `Database/migrate-activity-date-to-date-type.sql`

**What it does:**
- Creates backup table: `Planning Database - KPI_backup_activity_date`
- Converts existing TEXT dates to DATE type
- Handles multiple date formats:
  - YYYY-MM-DD (ISO format)
  - MM/DD/YYYY or M/D/YYYY
  - DD/MM/YYYY or D/M/YYYY
  - YYYYMMDD (8 digits)
  - Excel serial dates (numeric)
- Sets NULL/empty values to '2025-12-31' (default date)
- Logs conversion errors to `date_conversion_log_activity_date` table
- Creates index on Activity Date for better query performance
- Sets NOT NULL constraint with default value

**To run:**
```sql
-- Execute in Supabase SQL Editor
\i Database/migrate-activity-date-to-date-type.sql
```

### 2. Rollback Script
**File:** `Database/rollback-activity-date-to-date-type.sql`

**What it does:**
- Converts DATE back to TEXT
- Converts DATE values to YYYY-MM-DD string format
- Can restore from backup table if needed

**To run (if needed):**
```sql
-- Execute in Supabase SQL Editor
\i Database/rollback-activity-date-to-date-type.sql
```

## Code Updates

### 1. Date Parsing Utility
**File:** `lib/dateParsingUtils.ts`

New utility functions for handling multiple date formats:
- `parseDateToYYYYMMDD()` - Converts any date format to YYYY-MM-DD
- `formatDateForSupabase()` - Formats dates for Supabase DATE columns

**Supported formats:**
- YYYY-MM-DD (ISO)
- MM/DD/YYYY
- DD/MM/YYYY
- YYYYMMDD
- DD-MMM-YY (e.g., "6-Jan-25")
- Excel serial dates
- JavaScript Date objects

### 2. Data Mappers
**File:** `lib/dataMappers.ts`

**Changes:**
- `mapKPIFromDB()`: Extracts date part from ISO string (handles DATE type returned as ISO)
- `mapKPIToDB()`: Ensures Activity Date is in YYYY-MM-DD format, defaults to '2025-12-31' if empty

### 3. KPI Creation/Update
**File:** `components/kpi/KPITracking.tsx`

**Changes:**
- `handleCreateKPI()`: Formats Activity Date to YYYY-MM-DD before saving
- `handleUpdateKPI()`: Formats Activity Date to YYYY-MM-DD before updating
- Defaults to '2025-12-31' if date is empty or invalid

### 4. Date Filters
**Files:**
- `components/kpi/KPITracking.tsx`
- `app/(authenticated)/kpi/pending-approval/page.tsx`

**Changes:**
- Date filters use YYYY-MM-DD format (compatible with DATE type)
- `.gte()` and `.lte()` queries work with DATE type
- `.eq()` queries ensure date format is correct

### 5. Import Scripts
**Files:**
- `scripts/import-data.js`
- `scripts/import-kpi-only.js`
- `scripts/import-kpi-fixed.js`
- `scripts/import-latest-kpi-data.js`

**Changes:**
- Enhanced `cleanValue()` function for 'date' type
- Handles multiple date formats during import
- Converts all dates to YYYY-MM-DD format
- Defaults to '2025-12-31' for NULL/invalid dates

## Key Requirements Met

✅ **1. Standardize to YYYY-MM-DD**
- All dates converted to YYYY-MM-DD format
- DATE type in PostgreSQL uses this format

✅ **2. Skip invalid dates and log them**
- Invalid dates logged to `date_conversion_log_activity_date` table
- Migration script logs all conversion errors

✅ **3. Don't allow NULL - use 2025-12-31**
- All NULL/empty values set to '2025-12-31'
- NOT NULL constraint with default value

✅ **4. DATE only (no time)**
- Column type is DATE (not TIMESTAMP)
- No time component stored

✅ **5. Keep "Day" column as TEXT**
- "Day" column remains TEXT type
- No changes to "Day" column

✅ **6. Backup/rollback script created**
- Backup table created before migration
- Rollback script available

✅ **7. Verify all date filters**
- All date filters updated to work with DATE type
- Queries use YYYY-MM-DD format

✅ **8. Import handles multiple formats**
- All import scripts updated
- Multiple date formats supported and converted

## Testing Checklist

Before running migration:
- [ ] Backup database
- [ ] Test migration on development/staging environment
- [ ] Verify date conversion accuracy
- [ ] Check conversion log for errors

After migration:
- [ ] Verify Activity Date column is DATE type
- [ ] Check that all dates are in YYYY-MM-DD format
- [ ] Test KPI creation with various date formats
- [ ] Test KPI updates
- [ ] Test date filters (gte, lte, eq)
- [ ] Test CSV imports with various date formats
- [ ] Verify reports still work correctly
- [ ] Check that default date (2025-12-31) is used for empty dates

## Important Notes

1. **Default Date**: Empty or invalid dates will be set to '2025-12-31'. This is intentional to satisfy the NOT NULL constraint.

2. **Date Format**: All dates must be in YYYY-MM-DD format when saving to the database. The code automatically handles conversion from other formats.

3. **Supabase DATE Type**: Supabase returns DATE type as ISO string (YYYY-MM-DD), so the code extracts the date part to avoid timezone issues.

4. **Backward Compatibility**: The migration maintains backward compatibility by converting existing data properly.

5. **Performance**: An index is created on Activity Date for better query performance.

## Rollback Procedure

If you need to rollback:
1. Run `Database/rollback-activity-date-to-date-type.sql`
2. Or restore from backup table: `Planning Database - KPI_backup_activity_date`

## Support

If you encounter issues:
1. Check the conversion log: `date_conversion_log_activity_date` table
2. Verify date formats in the backup table
3. Review error messages in Supabase logs

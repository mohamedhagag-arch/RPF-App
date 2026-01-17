# KPI Activity Columns Merge Summary

## Overview
This document summarizes the migration of "Activity" and "Activity Name" columns in the `Planning Database - KPI` table into a single merged column called "Activity Description".

## Migration Details

### Column Merge Strategy
- **New Column Name**: `Activity Description`
- **Data Priority**: 
  1. `Activity Name` (preferred - more reliable)
  2. `Activity` (fallback)
  3. Empty string (if both are empty)

### Migration Script
- **File**: `Database/migrate-merge-kpi-activity-columns.sql`
- **Steps**:
  1. Create backup table: `Planning Database - KPI_backup_activity_merge`
  2. Add new `Activity Description` column
  3. Merge data with priority: Activity Name > Activity > empty string
  4. Verify all records have Activity Description populated
  5. Drop old columns: `Activity` and `Activity Name`

## Code Updates

### TypeScript Interfaces
- **`lib/supabase.ts`**: Updated `KPIRecord` interface
  - Added `activity_description: string` (required)
  - Kept `activity_name?: string` and `activity?: string` for backward compatibility (deprecated)

### Data Mappers
- **`lib/dataMappers.ts`**:
  - `mapKPIFromDB`: Updated to extract `activity_description` with priority: Activity Description > Activity Name > Activity
  - `mapKPIToDB`: Updated to map `activity_description` to `'Activity Description'` column

### Form Components
- **`components/kpi/SmartActualKPIForm.tsx`**: Updated to use `activity_description` with fallbacks
- **`components/kpi/IntelligentKPIForm.tsx`**: Updated to use `activity_description` with fallbacks
- Forms now submit with both `'Activity Description'` (primary) and `'Activity Name'` (backward compatibility)

### Table Components
- **`components/kpi/KPITableWithCustomization.tsx`**: Updated all activity name references to use `activity_description` with fallbacks

### Calculation Logic
- **`lib/workValueCalculator.ts`**: Updated to prioritize `activity_description` when matching KPIs to activities
- **`lib/databaseManager.ts`**: Updated normalization and validation to use `Activity Description`

## Backward Compatibility

All code maintains backward compatibility by checking multiple sources in this order:
1. `activity_description` / `'Activity Description'` (merged column - preferred)
2. `activity_name` / `'Activity Name'` (old column - fallback)
3. `activity` / `'Activity'` (old column - fallback)

This ensures the application continues to work during and after the migration.

## Testing Checklist

- [ ] Run migration script on development database
- [ ] Verify all KPI records have Activity Description populated
- [ ] Test KPI form submissions (both Planned and Actual)
- [ ] Test KPI table display and filtering
- [ ] Test KPI calculations and work value calculations
- [ ] Test KPI import/export functionality
- [ ] Verify backward compatibility with old data formats

## Notes

- The migration follows the same pattern as the BOQ Activity columns merge
- Activity Name is preferred over Activity because it's more reliable according to user requirements
- Both old columns are dropped after migration to maintain clean database schema

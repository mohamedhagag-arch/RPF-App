# Date Column Migration Summary

## ✅ Completed Tasks

### 1. SQL Migration Scripts
- ✅ Created `Database/migrate-merge-date-columns.sql` - Merges Actual Date and Target Date into Activity Date
- ✅ Created `Database/rollback-merge-date-columns.sql` - Rollback script if needed
- ✅ Verified SQL syntax

### 2. TypeScript Interfaces
- ✅ Updated `lib/supabase.ts` - Removed `actual_date` and `target_date` from `KPIRecord` interface

### 3. Data Mappers
- ✅ Updated `lib/dataMappers.ts` - Removed Actual Date and Target Date references, use Activity Date only

### 4. Core KPI Logic
- ✅ Updated `components/kpi/KPITracking.tsx` - All date operations use Activity Date with Input Type filtering
- ✅ Updated `components/kpi/IntelligentKPIForm.tsx` - Single Activity Date field

### 5. Forms
- ✅ Updated `components/kpi/IntelligentKPIForm.tsx` - Single Activity Date field
- ✅ Updated `components/kpi/EnhancedSmartActualKPIForm.tsx` - Maps separate fields to Activity Date on submit
- ✅ Updated `components/kpi/AddKPIForm.tsx` - Maps to Activity Date on submit

### 6. BOQ Table
- ✅ Updated `components/boq/BOQTableWithCustomization.tsx` - All date calculations use Activity Date with Input Type filter

### 7. Reports (In Progress)
- ✅ Updated `components/reports/tabs/MonthlyWorkRevenueTab.tsx` - Use Activity Date with Input Type filter
- ⏳ Remaining: 7 more report files

### 8. CSV Import/Export
- ✅ Updated `lib/databaseManager.ts` - Removed Actual Date and Target Date from column lists
- ⏳ Remaining: Import scripts in `scripts/` folder

### 9. Database Indexes
- ✅ Migration script includes dropping indexes on Actual Date and Target Date

---

## ⏳ Remaining Tasks

### Reports (7 files)
1. `components/reports/tabs/KPICChartTab.tsx`
2. `components/reports/tabs/ActivityPeriodicalProgressTab.tsx`
3. `components/reports/tabs/ActivitiesTab.tsx`
4. `components/reports/KPICChartReportView.tsx`
5. `components/reports/ReportsManager.tsx`
6. `components/reports/LookAheadHelper.ts`
7. `components/reports/ActivityPeriodicalProgressReportView.tsx`

### Import Scripts (Multiple files in `scripts/` folder)
- `scripts/import-kpi-only.js`
- `scripts/import-kpi-fixed.js`
- `scripts/import-data.js`
- `scripts/import-latest-kpi-data.js`
- `scripts/import-clear-data.js`
- And others...

### Other Files
- Various utility files, hooks, and components that may reference these fields

### Deprecation Warnings
- Add console warnings when deprecated fields are accessed

---

## 📋 Migration Steps

### Before Running SQL Migration:
1. ✅ Backup database
2. ✅ Review migration script
3. ✅ Test on development/staging environment first

### Running SQL Migration:
```sql
-- Run this in Supabase SQL Editor or psql
\i Database/migrate-merge-date-columns.sql
```

### After Migration:
1. Verify data integrity
2. Test application functionality
3. Monitor for any errors

---

## 🔍 Key Changes

### Database Schema
- **Removed Columns**: `Actual Date`, `Target Date`
- **Unified Column**: `Activity Date` (use with `Input Type` filter)
- **Removed Indexes**: `idx_kpi_actual_date`, `idx_kpi_target_date`

### Code Patterns
- **Old**: `kpi.actual_date` or `kpi.target_date`
- **New**: `kpi.activity_date` with `kpi.input_type === 'Actual'` or `kpi.input_type === 'Planned'` filter

### Query Examples
```typescript
// For Actual KPIs
.eq('Input Type', 'Actual')
.gte('Activity Date', startDate)

// For Planned KPIs
.eq('Input Type', 'Planned')
.gte('Activity Date', startDate)
```

---

## ⚠️ Important Notes

1. **Input Type Filter**: Always use `Input Type` column to filter between Actual and Planned KPIs when querying by Activity Date
2. **Backward Compatibility**: Forms may still show separate fields, but they map to Activity Date on submit
3. **Data Migration**: The SQL script preserves data by copying from Actual Date/Target Date to Activity Date before dropping columns
4. **Rollback**: Use `rollback-merge-date-columns.sql` if needed, but note that data may be duplicated

---

## 📝 Files Needing Manual Review

After automatic updates, these files may need manual review:
- Files with complex date logic
- Files with custom date calculations
- Files that export/import data in custom formats

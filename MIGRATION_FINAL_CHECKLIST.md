# Date Column Migration - Final Checklist

## ✅ Completed Updates

### Core Files (100% Complete)
- ✅ `lib/supabase.ts` - TypeScript interfaces
- ✅ `lib/dataMappers.ts` - Data mapping functions
- ✅ `lib/databaseManager.ts` - CSV import/export columns
- ✅ `components/kpi/KPITracking.tsx` - Main KPI logic
- ✅ `components/kpi/IntelligentKPIForm.tsx` - Single Activity Date field
- ✅ `components/kpi/EnhancedSmartActualKPIForm.tsx` - Maps to Activity Date
- ✅ `components/kpi/AddKPIForm.tsx` - Maps to Activity Date
- ✅ `components/boq/BOQTableWithCustomization.tsx` - Date calculations

### Reports (100% Complete)
- ✅ `components/reports/tabs/MonthlyWorkRevenueTab.tsx`
- ✅ `components/reports/tabs/KPICChartTab.tsx`
- ✅ `components/reports/tabs/ActivityPeriodicalProgressTab.tsx`
- ✅ `components/reports/tabs/ActivitiesTab.tsx`
- ✅ `components/reports/KPICChartReportView.tsx`
- ✅ `components/reports/ActivityPeriodicalProgressReportView.tsx`
- ✅ `components/reports/LookAheadHelper.ts`

### Import Scripts (Updated)
- ✅ `scripts/import-kpi-only.js`
- ✅ `scripts/import-kpi-fixed.js`
- ✅ `scripts/import-data.js`
- ✅ `scripts/import-latest-kpi-data.js`

### SQL Scripts
- ✅ `Database/migrate-merge-date-columns.sql` - Main migration
- ✅ `Database/rollback-merge-date-columns.sql` - Rollback script

### Utilities
- ✅ `lib/deprecationWarnings.ts` - Deprecation warning utilities

---

## ✅ Additional Files Updated

### Utility Files
- ✅ `hooks/useReportsData.ts` - Updated date references
- ✅ `lib/kpiProcessor.ts` - Updated interface and processing
- ✅ `lib/projectStatusUpdater.ts` - Updated date fields
- ✅ `lib/kpi-data-consistency-fix.ts` - Updated interface
- ✅ `lib/dateHelpers.ts` - Updated date field references
- ✅ `components/projects/ProjectDetailsPanel.tsx` - Updated date calculations
- ✅ `components/boq/IntelligentBOQForm.tsx` - Updated date references
- ✅ `components/boq/BOQManagement.tsx` - Updated date logic

## ⚠️ Files Needing Manual Review

### Scripts (Utility/Check Scripts)
These scripts may reference the old columns for schema checking or compatibility testing. Review and update as needed:

1. **`scripts/verify-database-schema.js`**
   - **Purpose**: Verifies database schema
   - **Action**: Update to check for Activity Date instead of Actual Date/Target Date
   - **Priority**: Medium

2. **`scripts/update-kpi-view-with-dates.js`**
   - **Purpose**: Updates KPI views
   - **Action**: Update date column references
   - **Priority**: Medium

3. **`scripts/test-import-compatibility.js`**
   - **Purpose**: Tests import compatibility
   - **Action**: Update test cases to use Activity Date
   - **Priority**: Low

4. **`scripts/reset-database.js`**
   - **Purpose**: Resets database
   - **Action**: Update column references if any
   - **Priority**: Low

5. **`scripts/reset-data-keep-users.js`**
   - **Purpose**: Resets data but keeps users
   - **Action**: Update column references if any
   - **Priority**: Low

6. **`scripts/migrate-kpi-to-split-tables.js`**
   - **Purpose**: Migrates to split tables (may be legacy)
   - **Action**: Review if still needed, update if used
   - **Priority**: Low

7. **`scripts/fix-import-issues.js`**
   - **Purpose**: Fixes import issues
   - **Action**: Update date column references
   - **Priority**: Medium

8. **`scripts/debug-kpi-data.js`**
   - **Purpose**: Debugs KPI data
   - **Action**: Update to use Activity Date
   - **Priority**: Low

9. **`scripts/compare-schema.js`**
   - **Purpose**: Compares schemas
   - **Action**: Update to check Activity Date
   - **Priority**: Low

10. **`scripts/clean-and-migrate-kpi.js`**
    - **Purpose**: Cleans and migrates KPI data
    - **Action**: Update date column references
    - **Priority**: Medium

11. **`scripts/check-table-structure.js`**
    - **Purpose**: Checks table structure
    - **Action**: Update to check for Activity Date
    - **Priority**: Medium

12. **`scripts/check-import-compatibility.js`**
    - **Purpose**: Checks import compatibility
    - **Action**: Update test cases
    - **Priority**: Low

### Other Files (May Need Review)
These files may have references that need manual review:

1. **`components/reports/ReportsManager.tsx`**
   - Check if it has any date filtering logic
   - **Priority**: Low

2. **`hooks/useReportsData.ts`**
   - Check date filtering logic
   - **Priority**: Medium

3. **`lib/kpiProcessor.ts`**
   - Check if it processes dates
   - **Priority**: Medium

4. **`lib/projectStatusUpdater.ts`**
   - Check if it uses dates for status updates
   - **Priority**: Medium

5. **`components/projects/ProjectDetailsPanel.tsx`**
   - Check date calculations
   - **Priority**: Medium

6. **`components/projects/ProjectsTableWithCustomization.tsx`**
   - Check if it displays dates
   - **Priority**: Low

7. **`components/dashboard/*`**
   - Check dashboard components for date references
   - **Priority**: Low

8. **`lib/kpi-data-consistency-fix.ts`**
   - Check if it fixes date consistency
   - **Priority**: Medium

9. **`lib/dateHelpers.ts`**
   - Check date helper functions
   - **Priority**: Medium

10. **`components/kpi/*` (Other KPI components)**
    - Check remaining KPI components
    - **Priority**: Medium

---

## 📋 Pre-Migration Checklist

Before running the SQL migration:

- [ ] **Backup Database**: Create a full backup of your Supabase database
- [ ] **Test Environment**: Run migration on test/staging environment first
- [ ] **Review SQL Script**: Verify the migration script matches your needs
- [ ] **Check Data**: Verify that Activity Date column has data (or will be populated by migration)
- [ ] **Notify Team**: Inform team about the migration
- [ ] **Schedule Downtime**: Plan for potential brief downtime if needed

---

## 🚀 Migration Steps

### Step 1: Run SQL Migration
```sql
-- In Supabase SQL Editor or psql
\i Database/migrate-merge-date-columns.sql
```

### Step 2: Verify Migration
- Check that columns are dropped
- Verify Activity Date has data
- Check that indexes are removed

### Step 3: Test Application
- Test KPI creation (Planned and Actual)
- Test KPI editing
- Test reports
- Test BOQ table date calculations
- Test CSV import/export

### Step 4: Monitor
- Watch for any errors in console
- Check for deprecation warnings
- Monitor application performance

---

## 🔄 Rollback Plan

If issues occur, use the rollback script:

```sql
-- In Supabase SQL Editor or psql
\i Database/rollback-merge-date-columns.sql
```

**Note**: Rollback will restore columns but may duplicate data if Activity Date was the only source.

---

## 📊 Migration Statistics

After migration, check:
- Total KPI records
- Records with Activity Date populated
- Records without Activity Date (should be minimal)

---

## ⚠️ Important Notes

1. **Input Type Filter**: Always use `Input Type` column when querying by Activity Date:
   ```typescript
   // For Actual KPIs
   .eq('Input Type', 'Actual')
   .gte('Activity Date', date)
   
   // For Planned KPIs
   .eq('Input Type', 'Planned')
   .gte('Activity Date', date)
   ```

2. **Deprecation Warnings**: The `lib/deprecationWarnings.ts` utility can be used to add warnings for deprecated field access.

3. **Forms**: Some forms may still show separate fields in the UI, but they map to Activity Date on submit.

4. **CSV Imports**: CSV imports should use Activity Date column. Old CSV files with Actual Date/Target Date will be mapped automatically.

---

## 🐛 Known Issues / Edge Cases

1. **Legacy Data**: If old CSV files are imported with Actual Date/Target Date, they will be mapped to Activity Date automatically.

2. **Forms with Separate Fields**: Forms like `EnhancedSmartActualKPIForm` may still show separate fields but map to Activity Date on submit.

3. **Reports**: All reports now use Activity Date with Input Type filtering.

---

## ✅ Post-Migration Verification

After migration, verify:

- [ ] All KPI creation works
- [ ] All KPI editing works
- [ ] Reports display correct dates
- [ ] BOQ table shows correct planned/actual dates
- [ ] CSV import works
- [ ] CSV export works
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Application runs without issues

---

## 📞 Support

If you encounter issues:
1. Check console for deprecation warnings
2. Review the rollback script
3. Check that Activity Date is populated
4. Verify Input Type is set correctly

---

**Last Updated**: After completing all automatic updates
**Migration Status**: Ready for SQL execution (pending manual review of utility scripts)

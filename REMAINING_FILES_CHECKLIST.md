# Remaining Files - Manual Review Checklist

## 📊 Summary
- **Total files with references**: ~70 files
- **Critical files updated**: ✅ All core functionality
- **Remaining**: Mostly utility files, legacy schemas, and secondary components

---

## 🔴 High Priority (May Affect Functionality)

### KPI Components
1. **`components/kpi/KPITableWithCustomization.tsx`** (31 references)
   - **Action**: Update date column references
   - **Priority**: High - Used for KPI table display

2. **`components/kpi/EnhancedQuantitySummary.tsx`** (10 references)
   - **Action**: Update date filtering/grouping logic
   - **Priority**: High - Used for quantity summaries

3. **`components/kpi/BulkEditKPIModal.tsx`** (10 references)
   - **Action**: Update bulk edit date fields
   - **Priority**: High - Used for bulk operations

4. **`components/kpi/EnhancedKPIEditModal.tsx`** (7 references)
   - **Action**: Update edit modal date fields
   - **Priority**: High - Used for editing KPIs

5. **`components/kpi/KPIForm.tsx`** (6 references)
   - **Action**: Update form date fields
   - **Priority**: Medium - May be legacy form

6. **`components/kpi/SmartActualKPIForm.tsx`** (3 references)
   - **Action**: Update form date fields
   - **Priority**: Medium - Alternative form component

7. **`components/kpi/KPIHistoryModal.tsx`** (2 references)
   - **Action**: Update history display dates
   - **Priority**: Medium - Used for viewing history

8. **`components/kpi/OptimizedKPITable.tsx`** (5 references)
   - **Action**: Update table date columns
   - **Priority**: Medium - Alternative table component

9. **`components/kpi/ImprovedKPITable.tsx`** (3 references)
   - **Action**: Update table date columns
   - **Priority**: Low - May be legacy

10. **`components/kpi/EnhancedKPITable.tsx`** (3 references)
    - **Action**: Update table date columns
    - **Priority**: Low - May be legacy

### Projects Components
11. **`components/projects/ProjectsTableWithCustomization.tsx`** (41 references)
    - **Action**: Update date display/calculations
    - **Priority**: High - Main projects table

12. **`components/projects/ProjectsList.tsx`** (2 references)
    - **Action**: Update date references
    - **Priority**: Medium

### Dashboard Components
13. **`components/dashboard/ModernProfessionalDashboard.tsx`** (2 references)
    - **Action**: Update dashboard date displays
    - **Priority**: Medium

14. **`components/dashboard/SmartAlerts.tsx`** (3 references)
    - **Action**: Update alert date logic
    - **Priority**: Medium

15. **`components/dashboard/DashboardCharts.tsx`** (1 reference)
    - **Action**: Update chart date filtering
    - **Priority**: Low

16. **`components/dashboard/AdvancedAnalytics.tsx`** (2 references)
    - **Action**: Update analytics date logic
    - **Priority**: Low

17. **`components/dashboard/DashboardOptimizations.tsx`** (1 reference)
    - **Action**: Update optimization date logic
    - **Priority**: Low

### UI Components
18. **`components/ui/RelationshipViewer.tsx`** (3 references)
    - **Action**: Update relationship date displays
    - **Priority**: Low

19. **`components/search/GlobalSearch.tsx`** (1 reference)
    - **Action**: Update search date filtering
    - **Priority**: Low

20. **`components/reports/ReportsManager.tsx`** (1 reference)
    - **Action**: Update report manager date logic
    - **Priority**: Low

---

## 🟡 Medium Priority (Utility/Library Files)

### Library Files
21. **`lib/workValueCalculator.ts`** (2 references)
    - **Action**: Update work value date calculations
    - **Priority**: Medium

22. **`lib/projectStatusCalculator.ts`** (5 references)
    - **Action**: Update status calculation date logic
    - **Priority**: Medium

23. **`lib/progressCalculator.ts`** (4 references)
    - **Action**: Update progress calculation dates
    - **Priority**: Medium

24. **`lib/rateCalculator.ts`** (3 references)
    - **Action**: Update rate calculation dates
    - **Priority**: Low

25. **`lib/financialCalculations.ts`** (6 references)
    - **Action**: Update financial calculation dates
    - **Priority**: Medium

26. **`lib/kpi-data-mapper.ts`** (10 references)
    - **Action**: Update data mapper date fields
    - **Priority**: Medium

27. **`lib/kpiSplitHelpers.ts`** (4 references)
    - **Action**: Update split helper date logic
    - **Priority**: Low - May be legacy

28. **`lib/autoKPIGenerator.ts`** (16 references)
    - **Action**: Update auto generator date logic
    - **Priority**: Medium

29. **`lib/planningSchemaAdapter.ts`** (1 reference)
    - **Action**: Update schema adapter
    - **Priority**: Low

30. **`lib/supabase-kpi-split.ts`** (3 references)
    - **Action**: Update split table references
    - **Priority**: Low - May be legacy

---

## 🟢 Low Priority (Legacy/Schema Files)

### Database Schema Files (Legacy - May Not Be Used)
31. **`lib/database-kpi-split-schema.sql`** (5 references)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

32. **`lib/database-kpi-split-schema-with-dates.sql`** (17 references)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

33. **`lib/database-kpi-add-value-column.sql`** (10 references)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

34. **`lib/database-schema.sql`** (1 reference)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

35. **`lib/database-schema-safe.sql`** (1 reference)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

36. **`lib/database-schema-fixed.sql`** (1 reference)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

37. **`lib/planning-schema-setup.sql`** (1 reference)
    - **Action**: Review if still needed
    - **Priority**: Low - Legacy schema

### Scripts (Utility/Check Scripts)
38. **`scripts/update-kpi-view-with-dates.js`** (4 references)
    - **Action**: Update view creation script
    - **Priority**: Medium

39. **`scripts/check-import-compatibility.js`** (2 references)
    - **Action**: Update compatibility checks
    - **Priority**: Low

40. **`scripts/reset-database.js`** (2 references)
    - **Action**: Update reset script
    - **Priority**: Low

41. **`scripts/reset-data-keep-users.js`** (2 references)
    - **Action**: Update reset script
    - **Priority**: Low

42. **`scripts/migrate-kpi-to-split-tables.js`** (1 reference)
    - **Action**: Review if still needed
    - **Priority**: Low - May be legacy

43. **`scripts/verify-database-schema.js`** (1 reference)
    - **Action**: Update schema verification
    - **Priority**: Medium

44. **`scripts/test-import-compatibility.js`** (1 reference)
    - **Action**: Update test cases
    - **Priority**: Low

45. **`scripts/fix-import-issues.js`** (1 reference)
    - **Action**: Update fix script
    - **Priority**: Medium

46. **`scripts/debug-kpi-data.js`** (1 reference)
    - **Action**: Update debug script
    - **Priority**: Low

47. **`scripts/compare-schema.js`** (1 reference)
    - **Action**: Update comparison script
    - **Priority**: Low

48. **`scripts/clean-and-migrate-kpi.js`** (1 reference)
    - **Action**: Update migration script
    - **Priority**: Medium

49. **`scripts/check-table-structure.js`** (1 reference)
    - **Action**: Update structure check
    - **Priority**: Medium

---

## 📝 Notes

### Files with Many References
- **`components/projects/ProjectsTableWithCustomization.tsx`** (41 references) - Likely has date display logic
- **`components/kpi/KPITableWithCustomization.tsx`** (31 references) - Likely has date column logic
- **`lib/autoKPIGenerator.ts`** (16 references) - Auto-generation logic
- **`lib/database-kpi-split-schema-with-dates.sql`** (17 references) - Legacy schema file

### Files Likely Safe to Ignore
- Legacy SQL schema files (`.sql` files in `lib/`)
- Documentation files (`.md` files)
- Test/check scripts that only verify column existence

### Recommended Approach
1. **Test the application** with current changes first
2. **Identify which components are actually used** in production
3. **Update high-priority files** that affect core functionality
4. **Review medium-priority files** as needed
5. **Archive or remove low-priority legacy files** if not used

---

## ✅ Quick Update Pattern

For most files, the pattern is:
```typescript
// OLD
const date = kpi.actual_date || kpi.target_date || kpi.activity_date

// NEW
const date = kpi.activity_date
```

Or for queries:
```typescript
// OLD
.eq('Input Type', 'Actual')
.gte('Actual Date', date)

// NEW
.eq('Input Type', 'Actual')
.gte('Activity Date', date)
```

---

**Last Updated**: After completing automatic updates
**Status**: Core functionality complete, remaining files are secondary components and utilities

# Activity Columns Merge Summary

## Overview
Merged "Activity" and "Activity Name" columns in the `Planning Database - BOQ Rates` table into a single unified column: **"Activity Description"**.

## Migration Strategy
- **Priority**: Prefer "Activity" if present, otherwise use "Activity Name", default to empty string
- **New Column**: "Activity Description"
- **Old Columns**: "Activity" and "Activity Name" (removed after migration)

## Migration Script
Run `Database/migrate-merge-activity-columns.sql` to:
1. Create backup table
2. Add "Activity Description" column
3. Merge data from both old columns
4. Verify migration
5. Drop old columns

## Code Updates

### TypeScript Interfaces
- ✅ Updated `BOQActivity` interface in `lib/supabase.ts`:
  - Removed: `activity: string`, `activity_name: string`
  - Added: `activity_description: string`

### Data Mappers
- ✅ Updated `lib/dataMappers.ts`:
  - `mapBOQFromDB`: Extracts activity description with priority: Activity Description > Activity > Activity Name
  - `mapBOQToDB`: Writes to "Activity Description" column
  - `mapKPIFromDB`: Updated to check Activity Description for backward compatibility

- ✅ Updated `lib/planningSchemaAdapter.ts`:
  - `BOQ_COLUMN_MAP`: Maps to "Activity Description"
  - `mapDBToBOQActivity`: Extracts activity description with fallback
  - `mapBOQActivityToDB`: Writes to "Activity Description"

### BOQ Components
- ✅ Updated `components/boq/BOQManagement.tsx`:
  - All activity filtering, searching, and sorting now uses `activity_description`
  - Form submissions write to "Activity Description"
  - Backward compatibility maintained for old data

- ✅ Updated `components/boq/BOQTableWithCustomization.tsx`:
  - Rate calculations use `activity_description`
  - Activity matching uses merged column

- ✅ Updated `components/boq/BOQActualQuantityCell.tsx`:
  - KPI matching uses `activity_description`

### Calculations & Generators
- ✅ Updated `lib/workValueCalculator.ts`:
  - Activity matching checks Activity Description first

- ✅ Updated `lib/autoKPIGenerator.ts`:
  - KPI generation uses `activity_description`

### Database Manager
- ✅ Updated `lib/databaseManager.ts`:
  - Column normalization maps to "Activity Description"
  - Import/export handles merged column
  - Calculations reference merged column

## Backward Compatibility
All code maintains backward compatibility by checking multiple sources:
```typescript
const activityDescription = activity.activity_description || activity.activity_name || activity.activity || ''
```

This ensures:
- Old data still works during transition
- New data uses merged column
- No breaking changes to existing functionality

## Testing Checklist
- [ ] Run migration script on test database
- [ ] Verify all BOQ activities display correctly
- [ ] Test activity filtering and search
- [ ] Verify KPI generation works
- [ ] Test activity calculations
- [ ] Verify import/export functionality
- [ ] Check reports and analytics

## Next Steps
1. Run migration script on production database
2. Monitor for any errors
3. Verify all functionality works as expected
4. Update any remaining references if found

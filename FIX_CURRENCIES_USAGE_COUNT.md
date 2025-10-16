# 🔧 Fix Currencies Usage Count Error

## 🎯 Problem
Error: `Could not find the 'usage_count' column of 'currencies' in the schema cache`

## 🔍 Root Cause
The `currencies` table exists in the database, but it's missing the `usage_count` column. This column is used to track how many projects use each currency.

The issue occurred because:
1. The initial production schema (`Database/PRODUCTION_SCHEMA_COMPLETE.sql`) didn't include `usage_count`
2. The detailed schema (`Database/currencies-table-schema.sql`) includes it
3. The application code expects this column to exist

## ✅ Solution

### Created `Database/fix_currencies_usage_count.sql`
This script safely adds the missing column and sets up proper RLS policies.

### Key Features:
1. **Idempotent** - Safe to run multiple times
2. **Adds missing column** - `usage_count INTEGER DEFAULT 0`
3. **Creates index** - For better query performance
4. **Updates existing data** - Calculates usage from projects (if applicable)
5. **Fixes RLS policies** - Ensures proper admin/manager access
6. **Verifies success** - Shows column details after execution

## 🔧 Technical Details

### 1. **Add Missing Column**
```sql
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'currencies' 
        AND column_name = 'usage_count'
    ) THEN
        ALTER TABLE currencies ADD COLUMN usage_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN currencies.usage_count IS 'Number of projects using this currency';
    END IF;
END $$;
```

### 2. **Create Index**
```sql
CREATE INDEX IF NOT EXISTS idx_currencies_usage_count ON currencies(usage_count);
```

### 3. **Update Usage Count**
```sql
-- Update usage count based on existing projects
UPDATE currencies c
SET usage_count = (
    SELECT COUNT(DISTINCT p.id)
    FROM "Planning Database - ProjectsList" p
    WHERE p.currency = c.code OR p.currency_code = c.code
);
```

### 4. **Fix RLS Policies**
```sql
-- Allow admins and managers to insert currencies
CREATE POLICY "Admins and managers can insert currencies" ON currencies
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Allow admins and managers to update currencies
CREATE POLICY "Admins and managers can update currencies" ON currencies
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Allow admins to delete currencies
CREATE POLICY "Admins can delete currencies" ON currencies
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );
```

## 📊 Usage Count Feature

### **What It Does:**
- **Tracks currency usage** - Counts how many projects use each currency
- **Displays in UI** - Shows "Used in X projects" under each currency
- **Prevents deletion** - Currencies in use cannot be easily deleted
- **Provides insights** - Helps admins see which currencies are popular

### **How It Works:**
1. **Automatic tracking** - Incremented when a currency is used in a project
2. **Safe display** - Only shows if count > 0
3. **Query optimization** - Indexed for fast lookups
4. **Accurate counting** - Based on actual project data

### **Where It Appears:**
```typescript
// In CurrenciesManager.tsx
{currency.usage_count !== undefined && currency.usage_count > 0 && (
  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
    Used in {currency.usage_count} project{currency.usage_count !== 1 ? 's' : ''}
  </p>
)}
```

## 📋 Complete Table Schema

### **After Fix:**
```sql
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1.0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,  -- ✅ ADDED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Instructions

### **1. Run the Fix Script:**
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Paste contents of `Database/fix_currencies_usage_count.sql`
4. Click **Run**
5. Verify success message

### **2. Verify the Fix:**
```sql
-- Check if column exists
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'currencies' 
AND column_name = 'usage_count';

-- Should return:
-- column_name | data_type | column_default
-- usage_count | integer   | 0
```

### **3. Test in Application:**
1. **Go to Settings > Currencies**
2. **View existing currencies** - Should load without errors
3. **Add a new currency** - Should work properly
4. **Check usage count** - Should display for currencies in use

## 🎯 Expected Results

### **Before Fix:**
- ❌ **Schema cache error** - Column not found
- ❌ **Currencies page broken** - Cannot load data
- ❌ **No usage tracking** - Missing feature
- ❌ **Console errors** - Column missing warnings

### **After Fix:**
- ✅ **No errors** - Schema properly cached
- ✅ **Currencies page working** - Loads all data
- ✅ **Usage tracking enabled** - Shows project counts
- ✅ **Clean console** - No warnings or errors

## 🔍 Related Files

### **Database:**
- ✅ `Database/fix_currencies_usage_count.sql` - **NEW** - Fix script
- ✅ `Database/currencies-table-schema.sql` - Original detailed schema
- ✅ `Database/PRODUCTION_SCHEMA_COMPLETE.sql` - Production schema (missing column)

### **Application:**
- ✅ `lib/currenciesManager.ts` - Uses `usage_count` in queries
- ✅ `components/settings/CurrenciesManager.tsx` - Displays usage count in UI

## 📊 Benefits

### **1. Data Integrity:**
- ✅ **Complete schema** - All expected columns present
- ✅ **Proper indexing** - Fast query performance
- ✅ **Accurate tracking** - Real usage data

### **2. User Experience:**
- ✅ **No errors** - Smooth currency management
- ✅ **Usage insights** - See which currencies are popular
- ✅ **Safe operations** - Prevent accidental deletions

### **3. System Health:**
- ✅ **Schema consistency** - Database matches application expectations
- ✅ **Performance optimized** - Indexed columns
- ✅ **Proper RLS** - Secure access control

---

**Status:** ✅ Fix Ready to Apply  
**Impact:** Critical - Fixes broken Currencies Management page  
**Risk:** Low - Idempotent script, safe to run  
**Last Updated:** October 16, 2025

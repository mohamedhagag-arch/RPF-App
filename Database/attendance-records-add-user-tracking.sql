-- =====================================================
-- Add User Tracking Fields to Attendance Records Table
-- =====================================================
-- This script adds fields to track who created and updated attendance records
-- Created: 2025-01-12
-- =====================================================

-- Step 1: Add new columns to attendance_records table
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Add comments to columns for documentation
COMMENT ON COLUMN attendance_records.created_by IS 'User ID who created this attendance record';
COMMENT ON COLUMN attendance_records.updated_by IS 'User ID who last updated this attendance record';
COMMENT ON COLUMN attendance_records.updated_at IS 'Timestamp of last update';

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_created_by ON attendance_records(created_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_updated_by ON attendance_records(updated_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_updated_at ON attendance_records(updated_at);

-- Step 4: Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER trigger_update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_records_updated_at();

-- Step 5: Update existing records (optional - set created_by to a default user if needed)
-- Uncomment and modify the user ID if you want to set a default creator for existing records
-- UPDATE attendance_records
-- SET created_by = 'YOUR_DEFAULT_USER_ID_HERE'
-- WHERE created_by IS NULL;

-- Step 6: Grant permissions (if using Row Level Security)
-- Make sure authenticated users can read and write these fields
-- This is usually handled by RLS policies, but ensure the policies allow access

-- =====================================================
-- Verification Queries (Run these to verify the changes)
-- =====================================================

-- Check if columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
    AND column_name IN ('created_by', 'updated_by', 'updated_at')
ORDER BY column_name;

-- Check if indexes were created
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'attendance_records'
    AND indexname LIKE '%created_by%' OR indexname LIKE '%updated_by%' OR indexname LIKE '%updated_at%';

-- Check if trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'attendance_records'
    AND trigger_name LIKE '%updated_at%';

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added user tracking fields to attendance_records table!';
    RAISE NOTICE '✅ Columns added: created_by, updated_by, updated_at';
    RAISE NOTICE '✅ Indexes created for better performance';
    RAISE NOTICE '✅ Trigger created to auto-update updated_at timestamp';
END $$;


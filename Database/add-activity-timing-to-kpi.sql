-- Add Activity Timing column to Planning Database - KPI table
-- Run this script if this column doesn't exist in your database

DO $$ 
BEGIN
    -- Add Activity Timing column (with space in name to match Supabase schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Activity Timing'
    ) THEN
        ALTER TABLE public."Planning Database - KPI" 
        ADD COLUMN "Activity Timing" TEXT DEFAULT 'post-commencement';
        RAISE NOTICE '✅ Added Activity Timing column to KPI table';
    ELSE
        RAISE NOTICE 'ℹ️ Activity Timing column already exists in KPI table';
    END IF;
END $$;

-- Create index for Activity Timing if needed
CREATE INDEX IF NOT EXISTS idx_kpi_activity_timing 
ON public."Planning Database - KPI"("Activity Timing");

-- Update existing records with default values if column was just added
UPDATE public."Planning Database - KPI"
SET "Activity Timing" = COALESCE("Activity Timing", 'post-commencement')
WHERE "Activity Timing" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public."Planning Database - KPI"."Activity Timing" IS 
'Activity timing: pre-commencement, post-commencement, or post-completion. Inherited from BOQ Activity.';

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'Planning Database - KPI'
AND column_name = 'Activity Timing';

-- Success message
SELECT '✅ Activity Timing column added successfully to KPI table!' as status;


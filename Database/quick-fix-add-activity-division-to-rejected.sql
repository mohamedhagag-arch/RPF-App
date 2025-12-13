-- ============================================================
-- Quick Fix: Add Activity Division column to kpi_rejected table
-- This fixes the error: "Could not find the 'Activity Division' column of 'kpi_rejected'"
-- ============================================================

-- Add Activity Division column if it doesn't exist
DO $$ 
BEGIN
    -- Check if Activity Division exists in main KPI table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Activity Division'
    ) THEN
        -- Add to rejected table if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'kpi_rejected' 
            AND column_name = 'Activity Division'
        ) THEN
            ALTER TABLE public.kpi_rejected 
            ADD COLUMN "Activity Division" TEXT;
            
            RAISE NOTICE '✅ Added "Activity Division" column to kpi_rejected table';
        ELSE
            RAISE NOTICE 'ℹ️ "Activity Division" column already exists in kpi_rejected table';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ "Activity Division" column does not exist in main KPI table - skipping';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity_division 
  ON public.kpi_rejected("Activity Division");

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'kpi_rejected'
AND column_name = 'Activity Division';

-- Success message
SELECT '✅ Activity Division column added successfully to kpi_rejected table!' as status;


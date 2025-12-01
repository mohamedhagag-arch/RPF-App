-- Add Activity Timing, Has Value, and Affects Timeline columns to BOQ Rates table
-- Run this script if these columns don't exist in your database

DO $$ 
BEGIN
    -- Add Activity Timing column (with space in name to match Supabase schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - BOQ Rates' 
        AND column_name = 'Activity Timing'
    ) THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Activity Timing" TEXT DEFAULT 'post-commencement';
        RAISE NOTICE 'Added Activity Timing column';
    ELSE
        RAISE NOTICE 'Activity Timing column already exists';
    END IF;
    
    -- Add Has Value column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - BOQ Rates' 
        AND column_name = 'Has Value'
    ) THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Has Value" TEXT DEFAULT 'TRUE';
        RAISE NOTICE 'Added Has Value column';
    ELSE
        RAISE NOTICE 'Has Value column already exists';
    END IF;
    
    -- Add Affects Timeline column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - BOQ Rates' 
        AND column_name = 'Affects Timeline'
    ) THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Affects Timeline" TEXT DEFAULT 'FALSE';
        RAISE NOTICE 'Added Affects Timeline column';
    ELSE
        RAISE NOTICE 'Affects Timeline column already exists';
    END IF;
END $$;

-- Create index for Activity Timing if needed
CREATE INDEX IF NOT EXISTS idx_boq_activity_timing 
ON "Planning Database - BOQ Rates"("Activity Timing");

-- Update existing records with default values if columns were just added
UPDATE "Planning Database - BOQ Rates"
SET "Activity Timing" = COALESCE("Activity Timing", 'post-commencement')
WHERE "Activity Timing" IS NULL;

UPDATE "Planning Database - BOQ Rates"
SET "Has Value" = COALESCE("Has Value", 'TRUE')
WHERE "Has Value" IS NULL;

UPDATE "Planning Database - BOQ Rates"
SET "Affects Timeline" = COALESCE("Affects Timeline", 'FALSE')
WHERE "Affects Timeline" IS NULL;



















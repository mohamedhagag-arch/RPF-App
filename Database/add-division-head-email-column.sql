-- Add Division Head Email column to Planning Database - ProjectsList table
-- This script adds the Division Head Email field to store the email address of the division head responsible for the project

-- Check if column exists before adding
DO $$ 
BEGIN
    -- Add Division Head Email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Division Head Email'
    ) THEN
        ALTER TABLE "Planning Database - ProjectsList"
        ADD COLUMN "Division Head Email" TEXT;
        
        RAISE NOTICE 'Division Head Email column added successfully';
    ELSE
        RAISE NOTICE 'Division Head Email column already exists';
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN "Planning Database - ProjectsList"."Division Head Email" IS 'Email address of the division head responsible for the project';


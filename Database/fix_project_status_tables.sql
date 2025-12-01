-- ============================================
-- 🔧 Fix Project Status Tables
-- ============================================
-- This script fixes the table names for project status fields
-- Using the correct Supabase table names

-- Check if tables exist first
DO $$
BEGIN
    -- Check if Planning Database - ProjectsList exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Planning Database - ProjectsList') THEN
        RAISE NOTICE 'Table "Planning Database - ProjectsList" does not exist';
    ELSE
        RAISE NOTICE 'Table "Planning Database - ProjectsList" exists';
    END IF;
    
    -- Check if Planning Database - BOQ Rates exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Planning Database - BOQ Rates') THEN
        RAISE NOTICE 'Table "Planning Database - BOQ Rates" does not exist';
    ELSE
        RAISE NOTICE 'Table "Planning Database - BOQ Rates" exists';
    END IF;
    
    -- Check if Planning Database - KPI exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Planning Database - KPI') THEN
        RAISE NOTICE 'Table "Planning Database - KPI" does not exist';
    ELSE
        RAISE NOTICE 'Table "Planning Database - KPI" exists';
    END IF;
END $$;

-- Add status fields to Planning Database - ProjectsList
DO $$
BEGIN
    -- Add project_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'project_status') THEN
        ALTER TABLE "Planning Database - ProjectsList" ADD COLUMN project_status TEXT DEFAULT 'upcoming';
        RAISE NOTICE 'Added project_status column';
    ELSE
        RAISE NOTICE 'project_status column already exists';
    END IF;
    
    -- Add status_confidence column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'status_confidence') THEN
        ALTER TABLE "Planning Database - ProjectsList" ADD COLUMN status_confidence DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added status_confidence column';
    ELSE
        RAISE NOTICE 'status_confidence column already exists';
    END IF;
    
    -- Add status_reason column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'status_reason') THEN
        ALTER TABLE "Planning Database - ProjectsList" ADD COLUMN status_reason TEXT;
        RAISE NOTICE 'Added status_reason column';
    ELSE
        RAISE NOTICE 'status_reason column already exists';
    END IF;
    
    -- Add status_updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'status_updated_at') THEN
        ALTER TABLE "Planning Database - ProjectsList" ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added status_updated_at column';
    ELSE
        RAISE NOTICE 'status_updated_at column already exists';
    END IF;
END $$;

-- Add status fields to Planning Database - BOQ Rates
DO $$
BEGIN
    -- Add activity_timing column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - BOQ Rates' AND column_name = 'activity_timing') THEN
        ALTER TABLE "Planning Database - BOQ Rates" ADD COLUMN activity_timing TEXT DEFAULT 'post-commencement';
        RAISE NOTICE 'Added activity_timing column';
    ELSE
        RAISE NOTICE 'activity_timing column already exists';
    END IF;
    
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - BOQ Rates' AND column_name = 'status') THEN
        ALTER TABLE "Planning Database - BOQ Rates" ADD COLUMN status TEXT DEFAULT 'not_started';
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON "Planning Database - ProjectsList"(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated ON "Planning Database - ProjectsList"(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_boq_activities_timing ON "Planning Database - BOQ Rates"(activity_timing);
CREATE INDEX IF NOT EXISTS idx_boq_activities_status ON "Planning Database - BOQ Rates"(status);

-- Update existing records with default values
UPDATE "Planning Database - ProjectsList" 
SET 
  project_status = 'upcoming',
  status_confidence = 0,
  status_reason = 'Initial status',
  status_updated_at = NOW()
WHERE project_status IS NULL;

UPDATE "Planning Database - BOQ Rates" 
SET 
  activity_timing = 'post-commencement',
  status = 'not_started'
WHERE activity_timing IS NULL OR status IS NULL;

-- Log success
SELECT 'Project status fields added successfully!' AS status;

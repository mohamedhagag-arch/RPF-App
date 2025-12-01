-- ============================================================
-- Add Project Details Columns to Planning Database - ProjectsList
-- إضافة أعمدة تفاصيل المشروع إلى جدول المشاريع
-- ============================================================

-- Check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add Client Name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Client Name'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Client Name" TEXT;
    END IF;

    -- Add Consultant Name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Consultant Name'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Consultant Name" TEXT;
    END IF;

    -- Add First Party name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'First Party name'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "First Party name" TEXT;
    END IF;

    -- Add Project Manager Email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Project Manager Email'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Project Manager Email" TEXT;
    END IF;

    -- Add Area Manager Email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Area Manager Email'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Area Manager Email" TEXT;
    END IF;

    -- Add Date Project Awarded column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Date Project Awarded'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Date Project Awarded" TEXT;
    END IF;

    -- Add Work Programme column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Work Programme'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Work Programme" TEXT;
    END IF;

    -- Add Latitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Latitude'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Latitude" TEXT;
    END IF;

    -- Add Longitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Longitude'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Longitude" TEXT;
    END IF;

    -- Add Contract Status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Contract Status'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Contract Status" TEXT;
    END IF;

    -- Add Currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Currency'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Currency" TEXT DEFAULT 'AED';
    END IF;

    -- Add Workmanship only? column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Workmanship only?'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Workmanship only?" TEXT;
    END IF;

    -- Add Advance Payment Required column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Advnace Payment Required'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Advnace Payment Required" TEXT;
    END IF;

    -- Add Virtual Material Value column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'Virtual Material Value'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Virtual Material Value" TEXT;
    END IF;

END $$;

-- Add comments to the new columns
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Client Name" IS 'Name of the client for this project';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Consultant Name" IS 'Name of the consultant for this project';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."First Party name" IS 'Name of the first party for this project';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Project Manager Email" IS 'Email of the project manager';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Area Manager Email" IS 'Email of the area manager';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Date Project Awarded" IS 'Date when the project was awarded';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Work Programme" IS 'Work programme details';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Latitude" IS 'Latitude coordinate of the project location';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Longitude" IS 'Longitude coordinate of the project location';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Contract Status" IS 'Current status of the contract';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Currency" IS 'Currency used for this project (default: AED)';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Workmanship only?" IS 'Whether this is workmanship only project';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Advnace Payment Required" IS 'Whether advance payment is required';
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Virtual Material Value" IS 'Virtual material value for this project';

-- Create indexes for better performance on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_projects_client_name ON public."Planning Database - ProjectsList"("Client Name");
CREATE INDEX IF NOT EXISTS idx_projects_consultant_name ON public."Planning Database - ProjectsList"("Consultant Name");
CREATE INDEX IF NOT EXISTS idx_projects_first_party_name ON public."Planning Database - ProjectsList"("First Party name");
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_email ON public."Planning Database - ProjectsList"("Project Manager Email");
CREATE INDEX IF NOT EXISTS idx_projects_area_manager_email ON public."Planning Database - ProjectsList"("Area Manager Email");
CREATE INDEX IF NOT EXISTS idx_projects_contract_status ON public."Planning Database - ProjectsList"("Contract Status");
CREATE INDEX IF NOT EXISTS idx_projects_currency ON public."Planning Database - ProjectsList"("Currency");

-- Update RLS policies to include new columns
-- (The existing policies should already cover these columns, but let's make sure)

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList' 
AND table_schema = 'public'
ORDER BY ordinal_position;


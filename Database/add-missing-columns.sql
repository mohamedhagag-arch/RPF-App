-- ============================================================
-- Add Missing Columns to BOQ Rates Table
-- This script adds all the important columns we need for BOQ management
-- ============================================================

-- Add columns to Planning Database - BOQ Rates
ALTER TABLE public."Planning Database - BOQ Rates"
ADD COLUMN IF NOT EXISTS "Planned Units" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Units" TEXT,
ADD COLUMN IF NOT EXISTS "Total Units" TEXT,
ADD COLUMN IF NOT EXISTS "Deadline" TEXT,
ADD COLUMN IF NOT EXISTS "Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Value" TEXT,
ADD COLUMN IF NOT EXISTS "Earned Value" TEXT,
ADD COLUMN IF NOT EXISTS "Difference" TEXT,
ADD COLUMN IF NOT EXISTS "Variance Units" TEXT,
ADD COLUMN IF NOT EXISTS "Calendar Duration" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Completed" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Delayed?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity On Track?" TEXT,
ADD COLUMN IF NOT EXISTS "Delay %" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Project Full Name" TEXT,
ADD COLUMN IF NOT EXISTS "Project Status" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Work Value" TEXT,
ADD COLUMN IF NOT EXISTS "Variance Works Value" TEXT,
ADD COLUMN IF NOT EXISTS "Productivity Daily Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Drilled Meters Planned Progress" TEXT,
ADD COLUMN IF NOT EXISTS "Drilled Meters Actual Progress" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Meters" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Status" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Actual Status" TEXT,
ADD COLUMN IF NOT EXISTS "Reported on Data Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Completion Date" TEXT,
ADD COLUMN IF NOT EXISTS "Lookahead Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Lookahead Activity Completion Date" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Lookahead Duration for Activity Completion" TEXT;

-- ============================================================
-- Migrate data from Column 44 and Column 45 to new columns
-- ============================================================

-- Copy Column 44 to Planned Units (if not already set)
UPDATE public."Planning Database - BOQ Rates"
SET "Planned Units" = "Column 44"
WHERE "Planned Units" IS NULL OR "Planned Units" = '';

-- Copy Column 45 to Deadline (if not already set)
UPDATE public."Planning Database - BOQ Rates"
SET "Deadline" = "Column 45"
WHERE "Deadline" IS NULL OR "Deadline" = '';

-- ============================================================
-- Add Missing Columns to KPI Table
-- ============================================================

ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Target Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Date" TEXT,
ADD COLUMN IF NOT EXISTS "Project Code" TEXT,
ADD COLUMN IF NOT EXISTS "Project Sub Code" TEXT,
ADD COLUMN IF NOT EXISTS "Unit" TEXT,
ADD COLUMN IF NOT EXISTS "Day" TEXT,
ADD COLUMN IF NOT EXISTS "Value" TEXT,
ADD COLUMN IF NOT EXISTS "Zone" TEXT,
ADD COLUMN IF NOT EXISTS "Recorded By" TEXT;

-- ============================================================
-- Create Indexes for Better Performance
-- ============================================================

-- BOQ Rates Indexes
CREATE INDEX IF NOT EXISTS idx_boq_project_full_code 
ON public."Planning Database - BOQ Rates"("Project Full Code");

CREATE INDEX IF NOT EXISTS idx_boq_activity 
ON public."Planning Database - BOQ Rates"("Activity");

CREATE INDEX IF NOT EXISTS idx_boq_activity_division 
ON public."Planning Database - BOQ Rates"("Activity Division");

CREATE INDEX IF NOT EXISTS idx_boq_planned_start 
ON public."Planning Database - BOQ Rates"("Planned Activity Start Date");

-- KPI Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_project_activity 
ON public."Planning Database - KPI"("Project Full Code", "Activity Name");

CREATE INDEX IF NOT EXISTS idx_kpi_input_type 
ON public."Planning Database - KPI"("Input Type");

CREATE INDEX IF NOT EXISTS idx_kpi_target_date 
ON public."Planning Database - KPI"("Target Date");

CREATE INDEX IF NOT EXISTS idx_kpi_activity_name 
ON public."Planning Database - KPI"("Activity Name");

-- ============================================================
-- Verify Columns
-- ============================================================

-- Query to verify BOQ columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- Query to verify KPI columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - KPI'
ORDER BY ordinal_position;

-- ============================================================
-- END
-- ============================================================



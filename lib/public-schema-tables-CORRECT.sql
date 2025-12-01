-- ============================================================
-- Create Tables in Public Schema for Planning Data
-- UPDATED TO MATCH ACTUAL CSV FILES
-- ============================================================

-- Table 1: Planning Database - ProjectsList
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - ProjectsList" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Code" TEXT,
  "Project Sub-Code" TEXT,
  "Project Name" TEXT,
  "Project Type" TEXT,
  "Responsible Division" TEXT,
  "Plot Number" TEXT,
  "KPI Completed" TEXT,
  "Project Status" TEXT,
  "Contract Amount" TEXT,
  "Contract Status" TEXT,
  "Work Programme" TEXT,
  "Latitude" TEXT,
  "Longitude" TEXT,
  "Project Manager Email" TEXT,
  "Area Manager Email" TEXT,
  "Date Project Awarded" TEXT,
  "Workmanship only?" TEXT,
  "Advnace Payment Required" TEXT,
  "Client Name" TEXT,
  "Consultant Name" TEXT,
  "First Party name" TEXT,
  "Virtual Material Value" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Planning Database - BOQ Rates
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - BOQ Rates" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Code" TEXT,
  "Project Sub Code" TEXT,
  "Project Full Code" TEXT,
  "Activity" TEXT,
  "Activity Division" TEXT,
  "Unit" TEXT,
  "Zone Ref" TEXT,
  "Column 45" TEXT,
  "Column 44" TEXT,
  "Total Value" TEXT,
  "Planned Activity Start Date" TEXT,
  "Total Drilling Meters" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Planning Database - KPI
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Full Code" TEXT,
  "Activity Name" TEXT,
  "Quantity" TEXT,
  "Input Type" TEXT,
  "Section" TEXT,
  "Drilled Meters" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Grant Permissions
-- ============================================================
GRANT ALL ON public."Planning Database - ProjectsList" TO authenticated, anon;
GRANT ALL ON public."Planning Database - BOQ Rates" TO authenticated, anon;
GRANT ALL ON public."Planning Database - KPI" TO authenticated, anon;

-- ============================================================
-- Create Indexes for Performance (IF NOT EXISTS already included)
-- ============================================================
DROP INDEX IF EXISTS idx_projects_code;
DROP INDEX IF EXISTS idx_boq_project;
DROP INDEX IF EXISTS idx_kpi_project;

CREATE INDEX idx_projects_code ON public."Planning Database - ProjectsList"("Project Code");
CREATE INDEX idx_boq_project ON public."Planning Database - BOQ Rates"("Project Code");
CREATE INDEX idx_kpi_project ON public."Planning Database - KPI"("Project Full Code");

-- ============================================================
-- END
-- ============================================================

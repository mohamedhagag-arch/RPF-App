-- ============================================================
-- Create Tables in Public Schema for Planning Data
-- ============================================================

-- Table 1: Planning Database - ProjectsList
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - ProjectsList" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Project Full Code" TEXT,
  "Project Code" TEXT,
  "Project Sub-Code" TEXT,
  "Project Name" TEXT,
  "Project Type" TEXT,
  "Responsible Division" TEXT,
  "Plot Number" TEXT,
  "KPI Completed" TEXT,  -- Using TEXT instead of BOOLEAN
  "Project Status" TEXT,
  "Contract Amount" TEXT,
  "Variations" TEXT,
  "Total Contract Amount" TEXT,
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
  "Zone #" TEXT,
  "Activity Name" TEXT,
  "Total Units" TEXT,
  "Planned Units" TEXT,
  "Actual Units" TEXT,
  "Diffrence" TEXT,
  "Variance Units" TEXT,
  "Rate" TEXT,
  "Total Value" TEXT,
  "Planned Activity Start Date" TEXT,
  "Deadline" TEXT,
  "Calendar Duration" TEXT,
  "Activity Progress %" TEXT,
  "Productivity Daily Rate" TEXT,
  "Total Drilling Meters" TEXT,
  "Drilled Meters Planned Progress" TEXT,
  "Drilled Meters Actual Progress" TEXT,
  "Remaining Meters" TEXT,
  "Activity Planned Status" TEXT,
  "Activity Actual Status" TEXT,
  "Reported on Data Date?" TEXT,
  "Planned Value" TEXT,
  "Earned Value" TEXT,
  "Delay %" TEXT,
  "Planned Progress %" TEXT,
  "Activity Planned Start Date" TEXT,
  "Activity Planned Completion Date" TEXT,
  "Activity Delayed?" TEXT,
  "Activity On Track?" TEXT,
  "Activity Completed" TEXT,
  "Project Full Name" TEXT,
  "Project Status" TEXT,
  "Remaining Work Value" TEXT,
  "Variance Works Value" TEXT,
  "LookAhead Start Date" TEXT,
  "LookAhead Activity Completion Date" TEXT,
  "Remaining LookAhead Duration For Activity Completion" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Planning Database - KPI
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI" (
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
  "Zone #" TEXT,
  "Activity Name" TEXT,
  "Total Units" TEXT,
  "Planned Units" TEXT,
  "Actual Units" TEXT,
  "Diffrence" TEXT,
  "Variance Units" TEXT,
  "Rate" TEXT,
  "Total Value" TEXT,
  "Planned Activity Start Date" TEXT,
  "Deadline" TEXT,
  "Calendar Duration" TEXT,
  "Activity Progress %" TEXT,
  "Productivity Daily Rate" TEXT,
  "Total Drilling Meters" TEXT,
  "Drilled Meters Planned Progress" TEXT,
  "Drilled Meters Actual Progress" TEXT,
  "Remaining Meters" TEXT,
  "Activity Planned Status" TEXT,
  "Activity Actual Status" TEXT,
  "Reported on Data Date?" TEXT,
  "Planned Value" TEXT,
  "Earned Value" TEXT,
  "Delay %" TEXT,
  "Planned Progress %" TEXT,
  "Activity Planned Start Date" TEXT,
  "Activity Planned Completion Date" TEXT,
  "Activity Delayed?" TEXT,
  "Activity On Track?" TEXT,
  "Activity Completed" TEXT,
  "Project Full Name" TEXT,
  "Project Status" TEXT,
  "Remaining Work Value" TEXT,
  "Variance Works Value" TEXT,
  "LookAhead Start Date" TEXT,
  "LookAhead Activity Completion Date" TEXT,
  "Remaining LookAhead Duration For Activity Completion" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_code 
  ON public."Planning Database - ProjectsList"("Project Code");

CREATE INDEX IF NOT EXISTS idx_boq_project_code 
  ON public."Planning Database - BOQ Rates"("Project Code");

CREATE INDEX IF NOT EXISTS idx_kpi_project_code 
  ON public."Planning Database - KPI"("Project Code");

-- Enable Row Level Security
-- ============================================================
ALTER TABLE public."Planning Database - ProjectsList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - BOQ Rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - KPI" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (allow authenticated users)
-- ============================================================
CREATE POLICY "Allow authenticated read" ON public."Planning Database - ProjectsList"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read" ON public."Planning Database - BOQ Rates"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read" ON public."Planning Database - KPI"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
-- ============================================================
GRANT ALL ON public."Planning Database - ProjectsList" TO authenticated, anon;
GRANT ALL ON public."Planning Database - BOQ Rates" TO authenticated, anon;
GRANT ALL ON public."Planning Database - KPI" TO authenticated, anon;

-- ============================================================
-- ✅ Tables created successfully in public schema!
-- ============================================================

-- To verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'Planning%';


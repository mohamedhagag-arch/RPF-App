-- ============================================================
-- COMPLETE DATABASE SCHEMA UPDATE - FIXED VERSION
-- Column names shortened to fit PostgreSQL 63-character limit
-- ============================================================

-- ============================================================
-- PART 1: BOQ Rates Table - Essential Columns
-- ============================================================

ALTER TABLE public."Planning Database - BOQ Rates"

-- ✅ Basic Quantities
ADD COLUMN IF NOT EXISTS "Planned Units" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Units" TEXT,
ADD COLUMN IF NOT EXISTS "Total Units" TEXT,
ADD COLUMN IF NOT EXISTS "Deadline" TEXT,

-- 💰 Financial
ADD COLUMN IF NOT EXISTS "Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Value" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Value" TEXT,
ADD COLUMN IF NOT EXISTS "Earned Value" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Value" TEXT,
ADD COLUMN IF NOT EXISTS "Variance Value" TEXT,
ADD COLUMN IF NOT EXISTS "Budget At Completion" TEXT,
ADD COLUMN IF NOT EXISTS "Cost Variance" TEXT,
ADD COLUMN IF NOT EXISTS "CPI" TEXT,

-- 📊 Progress
ADD COLUMN IF NOT EXISTS "Activity Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "SPI" TEXT,
ADD COLUMN IF NOT EXISTS "Delay %" TEXT,
ADD COLUMN IF NOT EXISTS "Difference" TEXT,
ADD COLUMN IF NOT EXISTS "Variance Units" TEXT,

-- 📅 Dates
ADD COLUMN IF NOT EXISTS "Calendar Duration" TEXT,
ADD COLUMN IF NOT EXISTS "Working Days" TEXT,
ADD COLUMN IF NOT EXISTS "Elapsed Days" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Days" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Start" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned End" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Actual Start" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Actual End" TEXT,
ADD COLUMN IF NOT EXISTS "Baseline Start" TEXT,
ADD COLUMN IF NOT EXISTS "Baseline End" TEXT,
ADD COLUMN IF NOT EXISTS "Forecast End" TEXT,

-- ✅ Status
ADD COLUMN IF NOT EXISTS "Activity Completed" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Delayed?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity On Track?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity At Risk?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Started?" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Status" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Status" TEXT,

-- 📈 Productivity
ADD COLUMN IF NOT EXISTS "Daily Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Target Production" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Production" TEXT,
ADD COLUMN IF NOT EXISTS "Productivity Index" TEXT,
ADD COLUMN IF NOT EXISTS "Efficiency %" TEXT,

-- 👥 Resources
ADD COLUMN IF NOT EXISTS "Resources" TEXT,
ADD COLUMN IF NOT EXISTS "Team" TEXT,
ADD COLUMN IF NOT EXISTS "Equipment" TEXT,
ADD COLUMN IF NOT EXISTS "Manpower" TEXT,
ADD COLUMN IF NOT EXISTS "Contractor" TEXT,
ADD COLUMN IF NOT EXISTS "Subcontractor" TEXT,

-- 🔧 Drilling
ADD COLUMN IF NOT EXISTS "Drilled Planned" TEXT,
ADD COLUMN IF NOT EXISTS "Drilled Actual" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Meters" TEXT,
ADD COLUMN IF NOT EXISTS "Drilling Rate" TEXT,

-- 📍 Location
ADD COLUMN IF NOT EXISTS "Zone" TEXT,
ADD COLUMN IF NOT EXISTS "Area" TEXT,
ADD COLUMN IF NOT EXISTS "Block" TEXT,
ADD COLUMN IF NOT EXISTS "Chainage From" TEXT,
ADD COLUMN IF NOT EXISTS "Chainage To" TEXT,
ADD COLUMN IF NOT EXISTS "Latitude" TEXT,
ADD COLUMN IF NOT EXISTS "Longitude" TEXT,

-- 🎨 Quality & Safety
ADD COLUMN IF NOT EXISTS "Quality Status" TEXT,
ADD COLUMN IF NOT EXISTS "Quality Score" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Status" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Incidents" TEXT,
ADD COLUMN IF NOT EXISTS "Inspection" TEXT,
ADD COLUMN IF NOT EXISTS "Approval" TEXT,

-- 📋 Lookahead
ADD COLUMN IF NOT EXISTS "Lookahead Start" TEXT,
ADD COLUMN IF NOT EXISTS "Lookahead End" TEXT,
ADD COLUMN IF NOT EXISTS "Lookahead Days" TEXT,
ADD COLUMN IF NOT EXISTS "Next Week Plan" TEXT,
ADD COLUMN IF NOT EXISTS "Week Status" TEXT,

-- 🚧 Issues
ADD COLUMN IF NOT EXISTS "Constraints" TEXT,
ADD COLUMN IF NOT EXISTS "Issues" TEXT,
ADD COLUMN IF NOT EXISTS "Risks" TEXT,
ADD COLUMN IF NOT EXISTS "Mitigation" TEXT,
ADD COLUMN IF NOT EXISTS "Dependencies" TEXT,
ADD COLUMN IF NOT EXISTS "Predecessors" TEXT,
ADD COLUMN IF NOT EXISTS "Successors" TEXT,

-- 📝 Documentation
ADD COLUMN IF NOT EXISTS "Notes" TEXT,
ADD COLUMN IF NOT EXISTS "Remarks" TEXT,
ADD COLUMN IF NOT EXISTS "Change Orders" TEXT,
ADD COLUMN IF NOT EXISTS "Variations" TEXT,
ADD COLUMN IF NOT EXISTS "Attachments" TEXT,
ADD COLUMN IF NOT EXISTS "Photos" TEXT,

-- 👥 People
ADD COLUMN IF NOT EXISTS "Reported" TEXT,
ADD COLUMN IF NOT EXISTS "Updated By" TEXT,
ADD COLUMN IF NOT EXISTS "Created By" TEXT,
ADD COLUMN IF NOT EXISTS "Approved By" TEXT,
ADD COLUMN IF NOT EXISTS "Reviewed By" TEXT,
ADD COLUMN IF NOT EXISTS "Supervisor" TEXT,
ADD COLUMN IF NOT EXISTS "Engineer" TEXT,

-- 📊 Project Info
ADD COLUMN IF NOT EXISTS "Project Full Name" TEXT,
ADD COLUMN IF NOT EXISTS "Project Status" TEXT,
ADD COLUMN IF NOT EXISTS "Project Type" TEXT,
ADD COLUMN IF NOT EXISTS "Project Division" TEXT,

-- 🔄 Workflow
ADD COLUMN IF NOT EXISTS "Needs Approval" TEXT,
ADD COLUMN IF NOT EXISTS "Approval Date" TEXT,
ADD COLUMN IF NOT EXISTS "Submission Date" TEXT,
ADD COLUMN IF NOT EXISTS "Review Status" TEXT,
ADD COLUMN IF NOT EXISTS "Payment Status" TEXT,
ADD COLUMN IF NOT EXISTS "Invoice Number" TEXT;

-- ============================================================
-- PART 2: Projects Table - Essential Columns
-- ============================================================

ALTER TABLE public."Planning Database - ProjectsList"

-- 📅 Dates
ADD COLUMN IF NOT EXISTS "Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "End Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Start" TEXT,
ADD COLUMN IF NOT EXISTS "Actual End" TEXT,
ADD COLUMN IF NOT EXISTS "Expected End" TEXT,
ADD COLUMN IF NOT EXISTS "Handover Date" TEXT,
ADD COLUMN IF NOT EXISTS "Warranty Start" TEXT,
ADD COLUMN IF NOT EXISTS "Warranty End" TEXT,
ADD COLUMN IF NOT EXISTS "DLP Days" TEXT,

-- 💰 Financial
ADD COLUMN IF NOT EXISTS "Original Value" TEXT,
ADD COLUMN IF NOT EXISTS "Revised Value" TEXT,
ADD COLUMN IF NOT EXISTS "Paid To Date" TEXT,
ADD COLUMN IF NOT EXISTS "Payment %" TEXT,
ADD COLUMN IF NOT EXISTS "Retention Amount" TEXT,
ADD COLUMN IF NOT EXISTS "Retention %" TEXT,
ADD COLUMN IF NOT EXISTS "Advance Amount" TEXT,
ADD COLUMN IF NOT EXISTS "Advance %" TEXT,
ADD COLUMN IF NOT EXISTS "Invoice Amount" TEXT,
ADD COLUMN IF NOT EXISTS "Total Invoiced" TEXT,
ADD COLUMN IF NOT EXISTS "Outstanding" TEXT,

-- 👥 Team
ADD COLUMN IF NOT EXISTS "Director" TEXT,
ADD COLUMN IF NOT EXISTS "Coordinator" TEXT,
ADD COLUMN IF NOT EXISTS "Site Engineer" TEXT,
ADD COLUMN IF NOT EXISTS "QC Engineer" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Officer" TEXT,
ADD COLUMN IF NOT EXISTS "Planner" TEXT,

-- 📊 Performance
ADD COLUMN IF NOT EXISTS "Overall %" TEXT,
ADD COLUMN IF NOT EXISTS "Physical %" TEXT,
ADD COLUMN IF NOT EXISTS "Financial %" TEXT,
ADD COLUMN IF NOT EXISTS "Schedule Variance" TEXT,
ADD COLUMN IF NOT EXISTS "Cost Variance Value" TEXT,
ADD COLUMN IF NOT EXISTS "Project SPI" TEXT,
ADD COLUMN IF NOT EXISTS "Project CPI" TEXT,

-- 🏗️ Details
ADD COLUMN IF NOT EXISTS "Scope" TEXT,
ADD COLUMN IF NOT EXISTS "Description" TEXT,
ADD COLUMN IF NOT EXISTS "Category" TEXT,
ADD COLUMN IF NOT EXISTS "Priority" TEXT,
ADD COLUMN IF NOT EXISTS "Phase" TEXT,
ADD COLUMN IF NOT EXISTS "Delivery Method" TEXT,
ADD COLUMN IF NOT EXISTS "Contract Type" TEXT,

-- 📍 Location
ADD COLUMN IF NOT EXISTS "Emirate" TEXT,
ADD COLUMN IF NOT EXISTS "City" TEXT,
ADD COLUMN IF NOT EXISTS "District" TEXT,
ADD COLUMN IF NOT EXISTS "Street" TEXT,
ADD COLUMN IF NOT EXISTS "Landmark" TEXT,
ADD COLUMN IF NOT EXISTS "Coordinates" TEXT,

-- 🎯 KPIs
ADD COLUMN IF NOT EXISTS "Target %" TEXT,
ADD COLUMN IF NOT EXISTS "Quality Target" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Target" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Quality" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Safety" TEXT,

-- 📝 Tracking
ADD COLUMN IF NOT EXISTS "Weather Delays" TEXT,
ADD COLUMN IF NOT EXISTS "Material Delays" TEXT,
ADD COLUMN IF NOT EXISTS "Design Changes" TEXT,
ADD COLUMN IF NOT EXISTS "RFI Count" TEXT,
ADD COLUMN IF NOT EXISTS "VO Count" TEXT,
ADD COLUMN IF NOT EXISTS "NCR Count" TEXT,
ADD COLUMN IF NOT EXISTS "Tags" TEXT;

-- ============================================================
-- PART 3: KPI Table - Essential Columns
-- ============================================================

ALTER TABLE public."Planning Database - KPI"

-- 📅 Dates
ADD COLUMN IF NOT EXISTS "Target Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Date" TEXT,
ADD COLUMN IF NOT EXISTS "Recorded Date" TEXT,

-- 🎯 Reference
ADD COLUMN IF NOT EXISTS "Project Code" TEXT,
ADD COLUMN IF NOT EXISTS "Project Sub Code" TEXT,
ADD COLUMN IF NOT EXISTS "Project Name" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Code" TEXT,
ADD COLUMN IF NOT EXISTS "Unit" TEXT,
ADD COLUMN IF NOT EXISTS "Day" TEXT,
ADD COLUMN IF NOT EXISTS "Week" TEXT,
ADD COLUMN IF NOT EXISTS "Month" TEXT,

-- 💰 Values
ADD COLUMN IF NOT EXISTS "Value" TEXT,
ADD COLUMN IF NOT EXISTS "Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Cost" TEXT,
ADD COLUMN IF NOT EXISTS "Cumulative Qty" TEXT,
ADD COLUMN IF NOT EXISTS "Cumulative Value" TEXT,

-- 📍 Location
ADD COLUMN IF NOT EXISTS "Zone" TEXT,
ADD COLUMN IF NOT EXISTS "Area" TEXT,
ADD COLUMN IF NOT EXISTS "Chainage" TEXT,
ADD COLUMN IF NOT EXISTS "Location" TEXT,

-- 👥 People
ADD COLUMN IF NOT EXISTS "Recorded By" TEXT,
ADD COLUMN IF NOT EXISTS "Verified By" TEXT,
ADD COLUMN IF NOT EXISTS "Approved By" TEXT,

-- 📊 Performance
ADD COLUMN IF NOT EXISTS "Productivity" TEXT,
ADD COLUMN IF NOT EXISTS "Efficiency" TEXT,
ADD COLUMN IF NOT EXISTS "Variance" TEXT,
ADD COLUMN IF NOT EXISTS "Variance %" TEXT,

-- 🔧 Resources
ADD COLUMN IF NOT EXISTS "Equipment Used" TEXT,
ADD COLUMN IF NOT EXISTS "Workers" TEXT,
ADD COLUMN IF NOT EXISTS "Hours" TEXT,
ADD COLUMN IF NOT EXISTS "Overtime" TEXT,

-- 🌦️ Conditions
ADD COLUMN IF NOT EXISTS "Weather" TEXT,
ADD COLUMN IF NOT EXISTS "Temperature" TEXT,
ADD COLUMN IF NOT EXISTS "Conditions" TEXT,
ADD COLUMN IF NOT EXISTS "Downtime" TEXT,

-- 📝 Documentation
ADD COLUMN IF NOT EXISTS "Notes" TEXT,
ADD COLUMN IF NOT EXISTS "Issues" TEXT,
ADD COLUMN IF NOT EXISTS "Photos" TEXT,
ADD COLUMN IF NOT EXISTS "Attachments" TEXT;

-- ============================================================
-- PART 4: Migrate Existing Data
-- ============================================================

-- Copy Column 44 to Planned Units
UPDATE public."Planning Database - BOQ Rates"
SET "Planned Units" = "Column 44"
WHERE ("Planned Units" IS NULL OR "Planned Units" = '') 
AND "Column 44" IS NOT NULL 
AND "Column 44" != '';

-- Copy Column 45 to Deadline
UPDATE public."Planning Database - BOQ Rates"
SET "Deadline" = "Column 45"
WHERE ("Deadline" IS NULL OR "Deadline" = '') 
AND "Column 45" IS NOT NULL 
AND "Column 45" != '';

-- ============================================================
-- PART 5: Create Indexes
-- ============================================================

-- BOQ Indexes
CREATE INDEX IF NOT EXISTS idx_boq_proj_full ON public."Planning Database - BOQ Rates"("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_boq_proj ON public."Planning Database - BOQ Rates"("Project Code");
CREATE INDEX IF NOT EXISTS idx_boq_activity ON public."Planning Database - BOQ Rates"("Activity");
CREATE INDEX IF NOT EXISTS idx_boq_division ON public."Planning Database - BOQ Rates"("Activity Division");
CREATE INDEX IF NOT EXISTS idx_boq_start ON public."Planning Database - BOQ Rates"("Planned Activity Start Date");
CREATE INDEX IF NOT EXISTS idx_boq_deadline ON public."Planning Database - BOQ Rates"("Deadline");

-- Project Indexes
CREATE INDEX IF NOT EXISTS idx_proj_status ON public."Planning Database - ProjectsList"("Project Status");
CREATE INDEX IF NOT EXISTS idx_proj_division ON public."Planning Database - ProjectsList"("Responsible Division");

-- KPI Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_proj_full ON public."Planning Database - KPI"("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_kpi_activity ON public."Planning Database - KPI"("Activity Name");
CREATE INDEX IF NOT EXISTS idx_kpi_type ON public."Planning Database - KPI"("Input Type");
CREATE INDEX IF NOT EXISTS idx_kpi_target ON public."Planning Database - KPI"("Target Date");

-- ============================================================
-- PART 6: Create Useful Views
-- ============================================================

-- Active Projects Summary
CREATE OR REPLACE VIEW public."vw_Active_Projects" AS
SELECT 
    "Project Code",
    "Project Name",
    "Responsible Division",
    "Project Status",
    "Contract Amount",
    "Start Date",
    "End Date"
FROM public."Planning Database - ProjectsList"
WHERE "Project Status" IN ('active', 'Active');

-- BOQ Summary
CREATE OR REPLACE VIEW public."vw_BOQ_Summary" AS
SELECT 
    "Project Code",
    "Activity",
    "Planned Units",
    "Actual Units",
    "Unit",
    "Activity Progress %",
    "Deadline"
FROM public."Planning Database - BOQ Rates";

-- Daily KPI Summary
CREATE OR REPLACE VIEW public."vw_KPI_Daily" AS
SELECT 
    "Project Full Code",
    "Activity Name",
    "Input Type",
    "Target Date",
    "Quantity",
    "Unit"
FROM public."Planning Database - KPI"
WHERE "Target Date" IS NOT NULL;

-- ============================================================
-- Grant Permissions
-- ============================================================

GRANT SELECT ON public."vw_Active_Projects" TO authenticated, anon;
GRANT SELECT ON public."vw_BOQ_Summary" TO authenticated, anon;
GRANT SELECT ON public."vw_KPI_Daily" TO authenticated, anon;

-- ============================================================
-- Verification Queries
-- ============================================================

-- Count columns in BOQ table
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates';

-- Count columns in Projects table
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList';

-- Count columns in KPI table
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'Planning Database - KPI';

-- Show sample BOQ data
SELECT 
    "Project Code",
    "Activity",
    "Planned Units",
    "Column 44",
    "Deadline",
    "Column 45"
FROM public."Planning Database - BOQ Rates"
LIMIT 3;

-- ============================================================
-- END - Script Complete!
-- ============================================================



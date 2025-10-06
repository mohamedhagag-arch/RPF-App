-- ============================================================
-- COMPLETE DATABASE SCHEMA UPDATE
-- Adds ALL important columns for a professional construction management system
-- Based on full project understanding and future requirements
-- ============================================================

-- ============================================================
-- PART 1: BOQ Rates Table - Complete Columns
-- ============================================================

ALTER TABLE public."Planning Database - BOQ Rates"

-- ✅ Basic Activity Information (if not exists)
ADD COLUMN IF NOT EXISTS "Planned Units" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Units" TEXT,
ADD COLUMN IF NOT EXISTS "Total Units" TEXT,
ADD COLUMN IF NOT EXISTS "Unit Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Deadline" TEXT,

-- 💰 Financial Columns
ADD COLUMN IF NOT EXISTS "Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Value" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Value" TEXT,
ADD COLUMN IF NOT EXISTS "Earned Value" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Work Value" TEXT,
ADD COLUMN IF NOT EXISTS "Variance Works Value" TEXT,
ADD COLUMN IF NOT EXISTS "Budget At Completion" TEXT,
ADD COLUMN IF NOT EXISTS "Cost Variance" TEXT,
ADD COLUMN IF NOT EXISTS "Cost Performance Index" TEXT,

-- 📊 Progress & Status Columns
ADD COLUMN IF NOT EXISTS "Activity Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Planned Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Schedule Performance Index" TEXT,
ADD COLUMN IF NOT EXISTS "Delay %" TEXT,
ADD COLUMN IF NOT EXISTS "Difference" TEXT,
ADD COLUMN IF NOT EXISTS "Variance Units" TEXT,

-- 📅 Date & Duration Columns
ADD COLUMN IF NOT EXISTS "Calendar Duration" TEXT,
ADD COLUMN IF NOT EXISTS "Working Days" TEXT,
ADD COLUMN IF NOT EXISTS "Elapsed Days" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Days" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Completion Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Actual Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Actual Completion Date" TEXT,
ADD COLUMN IF NOT EXISTS "Baseline Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Baseline End Date" TEXT,
ADD COLUMN IF NOT EXISTS "Forecast Completion Date" TEXT,

-- ✅ Activity Status Flags
ADD COLUMN IF NOT EXISTS "Activity Completed" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Delayed?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity On Track?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity At Risk?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Started?" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Planned Status" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Actual Status" TEXT,

-- 📈 Productivity & Performance
ADD COLUMN IF NOT EXISTS "Productivity Daily Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Target Daily Production" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Daily Production" TEXT,
ADD COLUMN IF NOT EXISTS "Productivity Index" TEXT,
ADD COLUMN IF NOT EXISTS "Efficiency %" TEXT,

-- 🔧 Resource & Equipment
ADD COLUMN IF NOT EXISTS "Required Resources" TEXT,
ADD COLUMN IF NOT EXISTS "Assigned Team" TEXT,
ADD COLUMN IF NOT EXISTS "Equipment Required" TEXT,
ADD COLUMN IF NOT EXISTS "Manpower Count" TEXT,
ADD COLUMN IF NOT EXISTS "Contractor Name" TEXT,
ADD COLUMN IF NOT EXISTS "Subcontractor Name" TEXT,

-- 🎯 Drilling Specific (for drilling projects)
ADD COLUMN IF NOT EXISTS "Drilled Meters Planned Progress" TEXT,
ADD COLUMN IF NOT EXISTS "Drilled Meters Actual Progress" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Meters" TEXT,
ADD COLUMN IF NOT EXISTS "Drilling Rate Per Day" TEXT,

-- 📍 Location & Reference
ADD COLUMN IF NOT EXISTS "Zone" TEXT,
ADD COLUMN IF NOT EXISTS "Area" TEXT,
ADD COLUMN IF NOT EXISTS "Block" TEXT,
ADD COLUMN IF NOT EXISTS "Chainage From" TEXT,
ADD COLUMN IF NOT EXISTS "Chainage To" TEXT,
ADD COLUMN IF NOT EXISTS "GPS Latitude" TEXT,
ADD COLUMN IF NOT EXISTS "GPS Longitude" TEXT,

-- 🎨 Quality & Safety
ADD COLUMN IF NOT EXISTS "Quality Status" TEXT,
ADD COLUMN IF NOT EXISTS "Quality Score" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Status" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Incidents" TEXT,
ADD COLUMN IF NOT EXISTS "Inspection Status" TEXT,
ADD COLUMN IF NOT EXISTS "Approval Status" TEXT,

-- 📋 Lookahead & Planning
ADD COLUMN IF NOT EXISTS "Lookahead Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Lookahead Activity Completion Date" TEXT,
ADD COLUMN IF NOT EXISTS "Remaining Lookahead Duration for Activity Completion" TEXT,
ADD COLUMN IF NOT EXISTS "Next Week Plan" TEXT,
ADD COLUMN IF NOT EXISTS "Current Week Status" TEXT,

-- 🚧 Constraints & Issues
ADD COLUMN IF NOT EXISTS "Constraints" TEXT,
ADD COLUMN IF NOT EXISTS "Issues" TEXT,
ADD COLUMN IF NOT EXISTS "Risks" TEXT,
ADD COLUMN IF NOT EXISTS "Mitigation Actions" TEXT,
ADD COLUMN IF NOT EXISTS "Dependencies" TEXT,
ADD COLUMN IF NOT EXISTS "Predecessor Activities" TEXT,
ADD COLUMN IF NOT EXISTS "Successor Activities" TEXT,

-- 📝 Notes & Documentation
ADD COLUMN IF NOT EXISTS "Notes" TEXT,
ADD COLUMN IF NOT EXISTS "Remarks" TEXT,
ADD COLUMN IF NOT EXISTS "Change Orders" TEXT,
ADD COLUMN IF NOT EXISTS "Variation Orders" TEXT,
ADD COLUMN IF NOT EXISTS "Attachments" TEXT,
ADD COLUMN IF NOT EXISTS "Photos URL" TEXT,

-- 👥 People & Tracking
ADD COLUMN IF NOT EXISTS "Reported on Data Date" TEXT,
ADD COLUMN IF NOT EXISTS "Last Updated By" TEXT,
ADD COLUMN IF NOT EXISTS "Created By User" TEXT,
ADD COLUMN IF NOT EXISTS "Approved By" TEXT,
ADD COLUMN IF NOT EXISTS "Reviewed By" TEXT,
ADD COLUMN IF NOT EXISTS "Supervisor" TEXT,
ADD COLUMN IF NOT EXISTS "Engineer In Charge" TEXT,

-- 📊 Project Reference
ADD COLUMN IF NOT EXISTS "Project Full Name" TEXT,
ADD COLUMN IF NOT EXISTS "Project Status" TEXT,
ADD COLUMN IF NOT EXISTS "Project Type" TEXT,
ADD COLUMN IF NOT EXISTS "Project Division" TEXT,

-- 🔄 Workflow & Approval
ADD COLUMN IF NOT EXISTS "Approval Required" TEXT,
ADD COLUMN IF NOT EXISTS "Approval Date" TEXT,
ADD COLUMN IF NOT EXISTS "Submission Date" TEXT,
ADD COLUMN IF NOT EXISTS "Review Status" TEXT,
ADD COLUMN IF NOT EXISTS "Payment Status" TEXT,
ADD COLUMN IF NOT EXISTS "Invoice Number" TEXT;

-- ============================================================
-- PART 2: Projects Table - Additional Columns
-- ============================================================

ALTER TABLE public."Planning Database - ProjectsList"

-- 📅 Important Dates
ADD COLUMN IF NOT EXISTS "Project Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Project End Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual End Date" TEXT,
ADD COLUMN IF NOT EXISTS "Expected Completion Date" TEXT,
ADD COLUMN IF NOT EXISTS "Handover Date" TEXT,
ADD COLUMN IF NOT EXISTS "Warranty Start Date" TEXT,
ADD COLUMN IF NOT EXISTS "Warranty End Date" TEXT,
ADD COLUMN IF NOT EXISTS "Defect Liability Period" TEXT,

-- 💰 Financial Details
ADD COLUMN IF NOT EXISTS "Original Contract Value" TEXT,
ADD COLUMN IF NOT EXISTS "Revised Contract Value" TEXT,
ADD COLUMN IF NOT EXISTS "Paid To Date" TEXT,
ADD COLUMN IF NOT EXISTS "Payment Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Retention Amount" TEXT,
ADD COLUMN IF NOT EXISTS "Retention %" TEXT,
ADD COLUMN IF NOT EXISTS "Advance Payment" TEXT,
ADD COLUMN IF NOT EXISTS "Advance Payment %" TEXT,
ADD COLUMN IF NOT EXISTS "Current Invoice Amount" TEXT,
ADD COLUMN IF NOT EXISTS "Total Invoiced" TEXT,
ADD COLUMN IF NOT EXISTS "Outstanding Amount" TEXT,

-- 👥 Key Personnel
ADD COLUMN IF NOT EXISTS "Project Director" TEXT,
ADD COLUMN IF NOT EXISTS "Project Coordinator" TEXT,
ADD COLUMN IF NOT EXISTS "Site Engineer" TEXT,
ADD COLUMN IF NOT EXISTS "QA/QC Engineer" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Officer" TEXT,
ADD COLUMN IF NOT EXISTS "Planning Engineer" TEXT,

-- 📊 Performance Metrics
ADD COLUMN IF NOT EXISTS "Overall Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Physical Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Financial Progress %" TEXT,
ADD COLUMN IF NOT EXISTS "Schedule Variance Days" TEXT,
ADD COLUMN IF NOT EXISTS "Cost Variance Amount" TEXT,
ADD COLUMN IF NOT EXISTS "SPI Schedule Performance Index" TEXT,
ADD COLUMN IF NOT EXISTS "CPI Cost Performance Index" TEXT,

-- 🏗️ Project Details
ADD COLUMN IF NOT EXISTS "Project Scope" TEXT,
ADD COLUMN IF NOT EXISTS "Project Description" TEXT,
ADD COLUMN IF NOT EXISTS "Project Category" TEXT,
ADD COLUMN IF NOT EXISTS "Project Priority" TEXT,
ADD COLUMN IF NOT EXISTS "Project Phase" TEXT,
ADD COLUMN IF NOT EXISTS "Delivery Method" TEXT,
ADD COLUMN IF NOT EXISTS "Contract Type" TEXT,
ADD COLUMN IF NOT EXISTS "Procurement Method" TEXT,

-- 📍 Location Details
ADD COLUMN IF NOT EXISTS "Emirate" TEXT,
ADD COLUMN IF NOT EXISTS "City" TEXT,
ADD COLUMN IF NOT EXISTS "District" TEXT,
ADD COLUMN IF NOT EXISTS "Street" TEXT,
ADD COLUMN IF NOT EXISTS "Nearest Landmark" TEXT,
ADD COLUMN IF NOT EXISTS "GPS Coordinates" TEXT,

-- 🎯 KPIs & Targets
ADD COLUMN IF NOT EXISTS "Target Completion %" TEXT,
ADD COLUMN IF NOT EXISTS "Quality Target %" TEXT,
ADD COLUMN IF NOT EXISTS "Safety Target Score" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Quality %" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Safety Score" TEXT,

-- 📝 Additional Info
ADD COLUMN IF NOT EXISTS "Weather Delays Days" TEXT,
ADD COLUMN IF NOT EXISTS "Material Delays Days" TEXT,
ADD COLUMN IF NOT EXISTS "Design Changes Count" TEXT,
ADD COLUMN IF NOT EXISTS "RFI Count" TEXT,
ADD COLUMN IF NOT EXISTS "Variation Orders Count" TEXT,
ADD COLUMN IF NOT EXISTS "NCR Count" TEXT,
ADD COLUMN IF NOT EXISTS "Project Tags" TEXT,
ADD COLUMN IF NOT EXISTS "Custom Field 1" TEXT,
ADD COLUMN IF NOT EXISTS "Custom Field 2" TEXT,
ADD COLUMN IF NOT EXISTS "Custom Field 3" TEXT;

-- ============================================================
-- PART 3: KPI Table - Complete Columns
-- ============================================================

ALTER TABLE public."Planning Database - KPI"

-- 📅 Date Fields
ADD COLUMN IF NOT EXISTS "Target Date" TEXT,
ADD COLUMN IF NOT EXISTS "Actual Date" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Date" TEXT,
ADD COLUMN IF NOT EXISTS "Recorded Date" TEXT,
ADD COLUMN IF NOT EXISTS "Submission Date" TEXT,
ADD COLUMN IF NOT EXISTS "Approval Date" TEXT,

-- 🎯 Reference Fields
ADD COLUMN IF NOT EXISTS "Project Code" TEXT,
ADD COLUMN IF NOT EXISTS "Project Sub Code" TEXT,
ADD COLUMN IF NOT EXISTS "Project Name" TEXT,
ADD COLUMN IF NOT EXISTS "Activity Code" TEXT,
ADD COLUMN IF NOT EXISTS "Unit" TEXT,
ADD COLUMN IF NOT EXISTS "Day" TEXT,
ADD COLUMN IF NOT EXISTS "Week" TEXT,
ADD COLUMN IF NOT EXISTS "Month" TEXT,
ADD COLUMN IF NOT EXISTS "Quarter" TEXT,

-- 💰 Value Fields
ADD COLUMN IF NOT EXISTS "Value" TEXT,
ADD COLUMN IF NOT EXISTS "Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Cost" TEXT,
ADD COLUMN IF NOT EXISTS "Budget" TEXT,

-- 📍 Location Fields
ADD COLUMN IF NOT EXISTS "Zone" TEXT,
ADD COLUMN IF NOT EXISTS "Area" TEXT,
ADD COLUMN IF NOT EXISTS "Block" TEXT,
ADD COLUMN IF NOT EXISTS "Chainage" TEXT,
ADD COLUMN IF NOT EXISTS "Location" TEXT,

-- 👥 People Fields
ADD COLUMN IF NOT EXISTS "Recorded By" TEXT,
ADD COLUMN IF NOT EXISTS "Verified By" TEXT,
ADD COLUMN IF NOT EXISTS "Approved By" TEXT,
ADD COLUMN IF NOT EXISTS "Engineer Name" TEXT,
ADD COLUMN IF NOT EXISTS "Supervisor Name" TEXT,

-- 🎨 Quality & Status
ADD COLUMN IF NOT EXISTS "Quality Rating" TEXT,
ADD COLUMN IF NOT EXISTS "Completion Status" TEXT,
ADD COLUMN IF NOT EXISTS "Approval Status" TEXT,
ADD COLUMN IF NOT EXISTS "Inspection Status" TEXT,
ADD COLUMN IF NOT EXISTS "Test Results" TEXT,

-- 📊 Performance Metrics
ADD COLUMN IF NOT EXISTS "Productivity Rate" TEXT,
ADD COLUMN IF NOT EXISTS "Efficiency %" TEXT,
ADD COLUMN IF NOT EXISTS "Variance" TEXT,
ADD COLUMN IF NOT EXISTS "Variance %" TEXT,
ADD COLUMN IF NOT EXISTS "Cumulative Quantity" TEXT,
ADD COLUMN IF NOT EXISTS "Cumulative Value" TEXT,

-- 🔧 Equipment & Resources
ADD COLUMN IF NOT EXISTS "Equipment Used" TEXT,
ADD COLUMN IF NOT EXISTS "Manpower Count" TEXT,
ADD COLUMN IF NOT EXISTS "Working Hours" TEXT,
ADD COLUMN IF NOT EXISTS "Overtime Hours" TEXT,
ADD COLUMN IF NOT EXISTS "Equipment Hours" TEXT,

-- 🌦️ Weather & Conditions
ADD COLUMN IF NOT EXISTS "Weather Condition" TEXT,
ADD COLUMN IF NOT EXISTS "Temperature" TEXT,
ADD COLUMN IF NOT EXISTS "Working Conditions" TEXT,
ADD COLUMN IF NOT EXISTS "Downtime Hours" TEXT,
ADD COLUMN IF NOT EXISTS "Delay Reason" TEXT,

-- 📝 Documentation
ADD COLUMN IF NOT EXISTS "Notes" TEXT,
ADD COLUMN IF NOT EXISTS "Remarks" TEXT,
ADD COLUMN IF NOT EXISTS "Issues" TEXT,
ADD COLUMN IF NOT EXISTS "Corrective Actions" TEXT,
ADD COLUMN IF NOT EXISTS "Photos" TEXT,
ADD COLUMN IF NOT EXISTS "Attachments" TEXT,
ADD COLUMN IF NOT EXISTS "Reference Document" TEXT,

-- 🎯 Material Tracking
ADD COLUMN IF NOT EXISTS "Material Type" TEXT,
ADD COLUMN IF NOT EXISTS "Material Quantity" TEXT,
ADD COLUMN IF NOT EXISTS "Material Source" TEXT,
ADD COLUMN IF NOT EXISTS "Delivery Status" TEXT,
ADD COLUMN IF NOT EXISTS "Material Quality" TEXT,

-- 🔄 Workflow
ADD COLUMN IF NOT EXISTS "Submitted" TEXT,
ADD COLUMN IF NOT EXISTS "Reviewed" TEXT,
ADD COLUMN IF NOT EXISTS "Approved" TEXT,
ADD COLUMN IF NOT EXISTS "Revision Number" TEXT,
ADD COLUMN IF NOT EXISTS "Previous Value" TEXT,
ADD COLUMN IF NOT EXISTS "Change Reason" TEXT;

-- ============================================================
-- PART 4: Migrate Existing Data
-- ============================================================

-- Copy Column 44 to Planned Units (if not already set)
UPDATE public."Planning Database - BOQ Rates"
SET "Planned Units" = "Column 44"
WHERE ("Planned Units" IS NULL OR "Planned Units" = '') AND "Column 44" IS NOT NULL;

-- Copy Column 45 to Deadline (if not already set)
UPDATE public."Planning Database - BOQ Rates"
SET "Deadline" = "Column 45"
WHERE ("Deadline" IS NULL OR "Deadline" = '') AND "Column 45" IS NOT NULL;

-- ============================================================
-- PART 5: Create Comprehensive Indexes
-- ============================================================

-- BOQ Rates Indexes
CREATE INDEX IF NOT EXISTS idx_boq_project_full_code ON public."Planning Database - BOQ Rates"("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_boq_project_code ON public."Planning Database - BOQ Rates"("Project Code");
CREATE INDEX IF NOT EXISTS idx_boq_activity ON public."Planning Database - BOQ Rates"("Activity");
CREATE INDEX IF NOT EXISTS idx_boq_activity_division ON public."Planning Database - BOQ Rates"("Activity Division");
CREATE INDEX IF NOT EXISTS idx_boq_planned_start ON public."Planning Database - BOQ Rates"("Planned Activity Start Date");
CREATE INDEX IF NOT EXISTS idx_boq_deadline ON public."Planning Database - BOQ Rates"("Deadline");
CREATE INDEX IF NOT EXISTS idx_boq_status ON public."Planning Database - BOQ Rates"("Activity Completed", "Activity Delayed?");
CREATE INDEX IF NOT EXISTS idx_boq_zone ON public."Planning Database - BOQ Rates"("Zone Ref");

-- Projects Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON public."Planning Database - ProjectsList"("Project Status");
CREATE INDEX IF NOT EXISTS idx_projects_division ON public."Planning Database - ProjectsList"("Responsible Division");
CREATE INDEX IF NOT EXISTS idx_projects_type ON public."Planning Database - ProjectsList"("Project Type");
CREATE INDEX IF NOT EXISTS idx_projects_dates ON public."Planning Database - ProjectsList"("Project Start Date", "Project End Date");

-- KPI Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_project_code ON public."Planning Database - KPI"("Project Code");
CREATE INDEX IF NOT EXISTS idx_kpi_project_full_code ON public."Planning Database - KPI"("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_kpi_activity ON public."Planning Database - KPI"("Activity Name");
CREATE INDEX IF NOT EXISTS idx_kpi_input_type ON public."Planning Database - KPI"("Input Type");
CREATE INDEX IF NOT EXISTS idx_kpi_target_date ON public."Planning Database - KPI"("Target Date");
CREATE INDEX IF NOT EXISTS idx_kpi_actual_date ON public."Planning Database - KPI"("Actual Date");
CREATE INDEX IF NOT EXISTS idx_kpi_zone ON public."Planning Database - KPI"("Zone");
CREATE INDEX IF NOT EXISTS idx_kpi_recorded_by ON public."Planning Database - KPI"("Recorded By");
CREATE INDEX IF NOT EXISTS idx_kpi_dates ON public."Planning Database - KPI"("Activity Date", "Input Type");

-- Composite Indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_boq_project_activity ON public."Planning Database - BOQ Rates"("Project Full Code", "Activity");
CREATE INDEX IF NOT EXISTS idx_kpi_project_activity ON public."Planning Database - KPI"("Project Full Code", "Activity Name", "Input Type");

-- ============================================================
-- PART 6: Create Useful Views
-- ============================================================

-- View: Active Projects Summary
CREATE OR REPLACE VIEW public."Active Projects Summary" AS
SELECT 
    "Project Code",
    "Project Name",
    "Responsible Division",
    "Project Status",
    "Contract Amount",
    "Overall Progress %" as "Progress",
    "Project Start Date",
    "Expected Completion Date",
    "Project Manager Email"
FROM public."Planning Database - ProjectsList"
WHERE "Project Status" = 'active' OR "Project Status" = 'Active';

-- View: BOQ Activities Summary
CREATE OR REPLACE VIEW public."BOQ Activities Summary" AS
SELECT 
    "Project Code",
    "Project Full Code",
    "Activity",
    "Activity Division",
    "Planned Units",
    "Actual Units",
    "Unit",
    "Activity Progress %",
    "Activity Completed",
    "Activity Delayed?",
    "Deadline",
    "Planned Activity Start Date"
FROM public."Planning Database - BOQ Rates"
ORDER BY "Project Code", "Planned Activity Start Date";

-- View: Daily KPI Summary
CREATE OR REPLACE VIEW public."Daily KPI Summary" AS
SELECT 
    "Project Full Code",
    "Activity Name",
    "Input Type",
    "Target Date" as "Date",
    SUM(CAST(NULLIF("Quantity", '') AS NUMERIC)) as "Total Quantity",
    "Unit",
    "Section"
FROM public."Planning Database - KPI"
GROUP BY "Project Full Code", "Activity Name", "Input Type", "Target Date", "Unit", "Section"
ORDER BY "Project Full Code", "Target Date";

-- View: Project Progress Dashboard
CREATE OR REPLACE VIEW public."Project Progress Dashboard" AS
SELECT 
    p."Project Code",
    p."Project Name",
    p."Responsible Division",
    p."Contract Amount",
    COUNT(DISTINCT b.id) as "Total Activities",
    COUNT(DISTINCT CASE WHEN b."Activity Completed" = 'TRUE' THEN b.id END) as "Completed Activities",
    COUNT(DISTINCT CASE WHEN b."Activity Delayed?" = 'TRUE' THEN b.id END) as "Delayed Activities",
    SUM(CAST(NULLIF(b."Planned Units", '') AS NUMERIC)) as "Total Planned",
    SUM(CAST(NULLIF(b."Actual Units", '') AS NUMERIC)) as "Total Actual",
    CASE 
        WHEN SUM(CAST(NULLIF(b."Planned Units", '') AS NUMERIC)) > 0 
        THEN ROUND((SUM(CAST(NULLIF(b."Actual Units", '') AS NUMERIC)) / SUM(CAST(NULLIF(b."Planned Units", '') AS NUMERIC))) * 100, 2)
        ELSE 0 
    END as "Overall Progress %"
FROM public."Planning Database - ProjectsList" p
LEFT JOIN public."Planning Database - BOQ Rates" b ON p."Project Code" = b."Project Code"
GROUP BY p."Project Code", p."Project Name", p."Responsible Division", p."Contract Amount";

-- ============================================================
-- PART 7: Grant Permissions to Views
-- ============================================================

GRANT SELECT ON public."Active Projects Summary" TO authenticated, anon;
GRANT SELECT ON public."BOQ Activities Summary" TO authenticated, anon;
GRANT SELECT ON public."Daily KPI Summary" TO authenticated, anon;
GRANT SELECT ON public."Project Progress Dashboard" TO authenticated, anon;

-- ============================================================
-- PART 8: Verify All Columns
-- ============================================================

-- Query to verify BOQ columns (will show in output)
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- Query to verify Projects columns
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- Query to verify KPI columns
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - KPI'
ORDER BY ordinal_position;

-- ============================================================
-- PART 9: Performance Statistics
-- ============================================================

-- Show table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'Planning Database%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show index information
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'Planning Database%'
ORDER BY tablename, indexname;

-- ============================================================
-- END OF SCRIPT
-- ============================================================

-- 🎉 SUCCESS! All columns and indexes have been added!
-- 📊 Check the output above to verify all columns
-- 🚀 Your application is now ready for professional construction management!



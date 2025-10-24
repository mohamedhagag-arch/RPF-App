# 📊 Complete Database Schema Documentation

This document describes all columns added to the Rabat MVP database for comprehensive construction project management.

---

## 🏗️ TABLE 1: BOQ Rates (Activities)

### Basic Activity Information
| Column | Description | Example |
|--------|-------------|---------|
| `Activity` | Activity name | "Earthwork Excavation" |
| `Activity Division` | Division responsible | "Civil Division" |
| `Unit` | Measurement unit | "Cu.M", "Running Meter" |
| `Zone Ref` | Zone/area reference | "Zone A", "Block 1" |

### 📏 Quantities
| Column | Description | Example |
|--------|-------------|---------|
| `Total Units` | Total quantity planned | "1000" |
| `Planned Units` | Planned quantity for period | "500" |
| `Actual Units` | Actually completed quantity | "450" |
| `Difference` | Actual - Planned | "-50" |
| `Variance Units` | Total - Actual | "550" |

### 💰 Financial Data
| Column | Description | Example |
|--------|-------------|---------|
| `Rate` / `Unit Rate` | Price per unit | "150.00" |
| `Total Value` | Total budget | "150,000.00" |
| `Planned Value` | Planned budget | "75,000.00" |
| `Actual Value` | Actual spent | "67,500.00" |
| `Earned Value` | Value earned based on progress | "70,000.00" |
| `Remaining Work Value` | Remaining budget | "80,000.00" |
| `Variance Works Value` | Budget variance | "7,500.00" |
| `Cost Variance` | Planned - Actual cost | "5,000.00" |
| `Cost Performance Index` | CPI ratio | "1.05" |
| `Budget At Completion` | Final expected cost | "145,000.00" |

### 📅 Dates & Duration
| Column | Description | Example |
|--------|-------------|---------|
| `Planned Activity Start Date` | Planned start | "2025-01-15" |
| `Activity Planned Start Date` | Baseline start | "2025-01-15" |
| `Activity Actual Start Date` | Actual start | "2025-01-16" |
| `Deadline` / `Column 45` | Planned end | "2025-02-15" |
| `Activity Planned Completion Date` | Baseline end | "2025-02-15" |
| `Activity Actual Completion Date` | Actual end | "2025-02-18" |
| `Baseline Start Date` | Original baseline | "2025-01-15" |
| `Baseline End Date` | Original baseline | "2025-02-15" |
| `Forecast Completion Date` | Predicted completion | "2025-02-20" |
| `Calendar Duration` | Total days | "30" |
| `Working Days` | Working days only | "22" |
| `Elapsed Days` | Days passed | "15" |
| `Remaining Days` | Days left | "7" |

### 📊 Progress & Performance
| Column | Description | Example |
|--------|-------------|---------|
| `Activity Progress %` | Current progress | "85.5" |
| `Planned Progress %` | Should be at | "90.0" |
| `Actual Progress %` | Real progress | "85.5" |
| `Delay %` | Delay percentage | "5.0" |
| `Schedule Performance Index` | SPI ratio | "0.95" |
| `Productivity Daily Rate` | Units per day | "45.5" |
| `Target Daily Production` | Target rate | "50.0" |
| `Actual Daily Production` | Actual rate | "45.5" |
| `Productivity Index` | Efficiency ratio | "0.91" |
| `Efficiency %` | Efficiency percent | "91.0" |

### ✅ Status Flags
| Column | Description | Values |
|--------|-------------|--------|
| `Activity Completed` | Is completed? | "TRUE" / "FALSE" |
| `Activity Delayed?` | Is delayed? | "TRUE" / "FALSE" |
| `Activity On Track?` | On schedule? | "TRUE" / "FALSE" |
| `Activity At Risk?` | At risk? | "TRUE" / "FALSE" |
| `Activity Started?` | Has started? | "TRUE" / "FALSE" |
| `Activity Planned Status` | Planned status | "Not Started", "In Progress" |
| `Activity Actual Status` | Actual status | "In Progress", "Completed" |
| `Quality Status` | Quality rating | "Good", "Excellent", "Poor" |
| `Safety Status` | Safety rating | "Safe", "At Risk" |
| `Inspection Status` | Inspection result | "Passed", "Failed", "Pending" |
| `Approval Status` | Approval state | "Approved", "Pending", "Rejected" |

### 👥 Resources & Team
| Column | Description | Example |
|--------|-------------|---------|
| `Required Resources` | Resources needed | "2 Excavators, 5 Workers" |
| `Assigned Team` | Team assigned | "Team A - Civil" |
| `Equipment Required` | Equipment list | "Excavator, Loader, Truck" |
| `Manpower Count` | Number of workers | "15" |
| `Contractor Name` | Main contractor | "ABC Construction LLC" |
| `Subcontractor Name` | Subcontractor | "XYZ Excavation" |
| `Supervisor` | Supervisor name | "Eng. Ahmed Ali" |
| `Engineer In Charge` | Responsible engineer | "Eng. Mohamed Hassan" |

### 🔧 Drilling Specific
| Column | Description | Example |
|--------|-------------|---------|
| `Total Drilling Meters` | Total meters to drill | "500.0" |
| `Drilled Meters Planned Progress` | Planned meters drilled | "250.0" |
| `Drilled Meters Actual Progress` | Actual meters drilled | "230.0" |
| `Remaining Meters` | Meters left | "270.0" |
| `Drilling Rate Per Day` | Meters per day | "12.5" |

### 📍 Location Details
| Column | Description | Example |
|--------|-------------|---------|
| `Zone` | Zone identifier | "Zone A" |
| `Area` | Area name | "North Sector" |
| `Block` | Block number | "Block 5" |
| `Chainage From` | Start chainage | "0+000" |
| `Chainage To` | End chainage | "0+500" |
| `GPS Latitude` | Latitude coordinate | "25.2048" |
| `GPS Longitude` | Longitude coordinate | "55.2708" |

### 🎨 Quality & Safety
| Column | Description | Example |
|--------|-------------|---------|
| `Quality Score` | Quality rating | "95" |
| `Safety Incidents` | Number of incidents | "0" |

### 📋 Lookahead Planning
| Column | Description | Example |
|--------|-------------|---------|
| `Lookahead Start Date` | Lookahead start | "2025-02-01" |
| `Lookahead Activity Completion Date` | Lookahead end | "2025-02-15" |
| `Remaining Lookahead Duration for Activity Completion` | Days in lookahead | "14" |
| `Next Week Plan` | Next week targets | "Complete 50 Cu.M" |
| `Current Week Status` | This week status | "On track" |

### 🚧 Constraints & Risks
| Column | Description | Example |
|--------|-------------|---------|
| `Constraints` | Limiting factors | "Weather, Material delay" |
| `Issues` | Current issues | "Awaiting approval" |
| `Risks` | Identified risks | "Rain forecast next week" |
| `Mitigation Actions` | Risk responses | "Prepare covered area" |
| `Dependencies` | Activity dependencies | "Depends on excavation" |
| `Predecessor Activities` | Must complete before | "Site clearance" |
| `Successor Activities` | Can start after | "Concrete pouring" |

### 📝 Documentation & Changes
| Column | Description | Example |
|--------|-------------|---------|
| `Notes` | General notes | "Good progress today" |
| `Remarks` | Additional remarks | "Need more equipment" |
| `Change Orders` | Change order refs | "CO-001, CO-002" |
| `Variation Orders` | VO references | "VO-2024-05" |
| `Attachments` | File references | "report_001.pdf" |
| `Photos URL` | Photo links | "https://..." |

### 🔄 Workflow & Approval
| Column | Description | Example |
|--------|-------------|---------|
| `Reported on Data Date` | Reported? | "TRUE" / "FALSE" |
| `Last Updated By` | Who updated | "admin@company.com" |
| `Created By User` | Who created | "engineer@company.com" |
| `Approved By` | Who approved | "manager@company.com" |
| `Reviewed By` | Who reviewed | "supervisor@company.com" |
| `Approval Required` | Needs approval? | "TRUE" / "FALSE" |
| `Approval Date` | When approved | "2025-02-10" |
| `Submission Date` | When submitted | "2025-02-09" |
| `Review Status` | Review state | "Approved", "Pending" |
| `Payment Status` | Payment state | "Paid", "Pending" |
| `Invoice Number` | Invoice reference | "INV-2025-001" |

### 📊 Project Reference
| Column | Description | Example |
|--------|-------------|---------|
| `Project Full Name` | Full project name | "Dubai Infrastructure Project" |
| `Project Status` | Project state | "active", "completed" |
| `Project Type` | Type of project | "Infrastructure" |
| `Project Division` | Division | "Civil Division" |

---

## 🏢 TABLE 2: Projects List

### 📅 Project Timeline
| Column | Description | Example |
|--------|-------------|---------|
| `Date Project Awarded` | Award date | "2024-06-15" |
| `Project Start Date` | Planned start | "2024-07-01" |
| `Project End Date` | Planned end | "2025-12-31" |
| `Actual Start Date` | Real start | "2024-07-05" |
| `Actual End Date` | Real end | "2026-01-15" |
| `Expected Completion Date` | Forecast end | "2026-01-10" |
| `Handover Date` | Handover date | "2026-01-20" |
| `Warranty Start Date` | Warranty begins | "2026-01-20" |
| `Warranty End Date` | Warranty ends | "2027-01-20" |
| `Defect Liability Period` | DLP duration | "365 days" |

### 💰 Financial Management
| Column | Description | Example |
|--------|-------------|---------|
| `Contract Amount` | Original value | "50,000,000.00" |
| `Original Contract Value` | First contract | "50,000,000.00" |
| `Revised Contract Value` | After changes | "52,500,000.00" |
| `Paid To Date` | Total paid | "30,000,000.00" |
| `Payment Progress %` | Payment % | "60.0" |
| `Retention Amount` | Held amount | "2,500,000.00" |
| `Retention %` | Retention rate | "5.0" |
| `Advance Payment` | Advance paid | "5,000,000.00" |
| `Advance Payment %` | Advance rate | "10.0" |
| `Current Invoice Amount` | Latest invoice | "2,500,000.00" |
| `Total Invoiced` | Total invoiced | "32,000,000.00" |
| `Outstanding Amount` | To be paid | "20,500,000.00" |

### 👥 Project Team
| Column | Description | Example |
|--------|-------------|---------|
| `Project Manager Email` | PM contact | "pm@company.com" |
| `Area Manager Email` | Area manager | "am@company.com" |
| `Project Director` | Director name | "Eng. Ali Ahmed" |
| `Project Coordinator` | Coordinator | "Eng. Sara Mohamed" |
| `Site Engineer` | Site engineer | "Eng. Hassan Ali" |
| `QA/QC Engineer` | Quality engineer | "Eng. Fatima Ahmed" |
| `Safety Officer` | Safety officer | "Mohamed Ibrahim" |
| `Planning Engineer` | Planner | "Eng. Ahmed Hassan" |
| `Client Name` | Client/owner | "Dubai Municipality" |
| `Consultant Name` | Consultant | "ABC Consultants" |
| `First Party name` | First party | "XYZ Construction" |

### 📊 Performance Metrics
| Column | Description | Example |
|--------|-------------|---------|
| `Overall Progress %` | Total progress | "65.5" |
| `Physical Progress %` | Physical work | "68.0" |
| `Financial Progress %` | Money spent | "62.0" |
| `Schedule Variance Days` | Days ahead/behind | "-5" (delayed) |
| `Cost Variance Amount` | Cost difference | "+500,000" (over) |
| `SPI Schedule Performance Index` | Schedule efficiency | "0.95" |
| `CPI Cost Performance Index` | Cost efficiency | "1.05" |

### 🏗️ Project Classification
| Column | Description | Example |
|--------|-------------|---------|
| `Project Type` | Type of work | "Infrastructure" |
| `Project Category` | Category | "Public Works" |
| `Project Priority` | Priority level | "High", "Medium", "Low" |
| `Project Phase` | Current phase | "Execution", "Planning" |
| `Delivery Method` | Delivery type | "Design-Build", "EPC" |
| `Contract Type` | Contract method | "Lump Sum", "Unit Rate" |
| `Procurement Method` | Procurement type | "Open Tender", "Negotiation" |
| `Project Scope` | Scope description | "Complete road construction..." |
| `Project Description` | Full description | "This project involves..." |

### 📍 Location Information
| Column | Description | Example |
|--------|-------------|---------|
| `Latitude` | GPS latitude | "25.2048" |
| `Longitude` | GPS longitude | "55.2708" |
| `Emirate` | Emirate | "Dubai" |
| `City` | City | "Dubai City" |
| `District` | District/area | "Al Barsha" |
| `Street` | Street name | "Sheikh Zayed Road" |
| `Plot Number` | Plot number | "123-456" |
| `Nearest Landmark` | Landmark | "Near Mall of Emirates" |
| `GPS Coordinates` | Combined coords | "25.2048, 55.2708" |

### 🎯 KPIs & Quality
| Column | Description | Example |
|--------|-------------|---------|
| `KPI Completed` | All KPIs done? | "TRUE" / "FALSE" |
| `Target Completion %` | Target progress | "100" |
| `Quality Target %` | Quality goal | "95" |
| `Safety Target Score` | Safety goal | "100" |
| `Actual Quality %` | Achieved quality | "97" |
| `Actual Safety Score` | Achieved safety | "98" |

### 📝 Issues & Tracking
| Column | Description | Example |
|--------|-------------|---------|
| `Weather Delays Days` | Days lost to weather | "5" |
| `Material Delays Days` | Days waiting materials | "3" |
| `Design Changes Count` | Number of changes | "8" |
| `RFI Count` | Request For Info count | "12" |
| `Variation Orders Count` | VO count | "4" |
| `NCR Count` | Non-conformance count | "2" |
| `Project Tags` | Custom tags | "urgent, high-priority" |

### 💼 Contract Details
| Column | Description | Example |
|--------|-------------|---------|
| `Contract Status` | Contract state | "Active", "Closed" |
| `Work Programme` | Work schedule | "24 months" |
| `Workmanship only?` | Labor only? | "TRUE" / "FALSE" |
| `Advnace Payment Required` | Need advance? | "TRUE" / "FALSE" |
| `Virtual Material Value` | Material estimate | "15,000,000.00" |

### 🔧 Custom Fields
| Column | Description | Use |
|--------|-------------|-----|
| `Custom Field 1` | Flexible field | Any custom data |
| `Custom Field 2` | Flexible field | Any custom data |
| `Custom Field 3` | Flexible field | Any custom data |

---

## 🎯 TABLE 3: KPI Records

### 📅 Date Fields
| Column | Description | Example |
|--------|-------------|---------|
| `Target Date` | Target for planned | "2025-02-15" |
| `Actual Date` | When achieved | "2025-02-16" |
| `Activity Date` | Unified date | "2025-02-15" |
| `Recorded Date` | When recorded | "2025-02-16 14:30" |
| `Submission Date` | When submitted | "2025-02-16" |
| `Approval Date` | When approved | "2025-02-17" |

### 🎯 Reference & Identification
| Column | Description | Example |
|--------|-------------|---------|
| `Project Full Code` | Full project code | "P5074" |
| `Project Code` | Short code | "P5074" |
| `Project Sub Code` | Sub code | "P5074-01" |
| `Project Name` | Project name | "Dubai Road Project" |
| `Activity Name` | Activity reference | "Earthwork Excavation" |
| `Activity Code` | Activity code | "CIV-001" |
| `Input Type` | Type of KPI | "Planned" / "Actual" |
| `Section` | Section/zone | "Zone A" |
| `Day` | Day reference | "Day 5 - Monday" |
| `Week` | Week number | "Week 3" |
| `Month` | Month | "February 2025" |
| `Quarter` | Quarter | "Q1 2025" |

### 📏 Quantities & Values
| Column | Description | Example |
|--------|-------------|---------|
| `Quantity` | Quantity achieved | "45.5" |
| `Unit` | Measurement unit | "Cu.M" |
| `Value` | Financial value | "6,825.00" |
| `Rate` | Unit rate | "150.00" |
| `Cost` | Actual cost | "6,500.00" |
| `Budget` | Allocated budget | "7,000.00" |
| `Cumulative Quantity` | Running total qty | "230.5" |
| `Cumulative Value` | Running total value | "34,575.00" |
| `Drilled Meters` | Meters drilled | "12.5" |

### 📍 Location
| Column | Description | Example |
|--------|-------------|---------|
| `Zone` | Zone/area | "Zone A" |
| `Area` | Area name | "North Section" |
| `Block` | Block number | "Block 3" |
| `Chainage` | Road chainage | "0+250" |
| `Location` | Description | "Near Gate 5" |

### 👥 People & Responsibility
| Column | Description | Example |
|--------|-------------|---------|
| `Recorded By` | Who recorded | "eng.ahmed@company.com" |
| `Verified By` | Who verified | "supervisor@company.com" |
| `Approved By` | Who approved | "manager@company.com" |
| `Engineer Name` | Engineer | "Eng. Ahmed Ali" |
| `Supervisor Name` | Supervisor | "Mohamed Hassan" |

### 📊 Performance & Quality
| Column | Description | Example |
|--------|-------------|---------|
| `Productivity Rate` | Production rate | "45.5 Cu.M/day" |
| `Efficiency %` | Efficiency | "91.0" |
| `Variance` | Quantity variance | "-4.5" |
| `Variance %` | Variance percent | "-9.0" |
| `Quality Rating` | Quality score | "Excellent", "Good" |
| `Completion Status` | Status | "Completed", "In Progress" |
| `Test Results` | Test outcome | "Passed", "Failed" |

### 🔧 Resources Used
| Column | Description | Example |
|--------|-------------|---------|
| `Equipment Used` | Equipment list | "Excavator EX-01" |
| `Manpower Count` | Workers count | "12" |
| `Working Hours` | Normal hours | "8.0" |
| `Overtime Hours` | Extra hours | "2.0" |
| `Equipment Hours` | Machine hours | "9.5" |

### 🌦️ Conditions & Delays
| Column | Description | Example |
|--------|-------------|---------|
| `Weather Condition` | Weather | "Sunny", "Rainy" |
| `Temperature` | Temperature | "32°C" |
| `Working Conditions` | Conditions | "Normal", "Difficult" |
| `Downtime Hours` | Lost hours | "2.0" |
| `Delay Reason` | Why delayed | "Material not delivered" |

### 📝 Documentation
| Column | Description | Example |
|--------|-------------|---------|
| `Notes` | General notes | "Good progress" |
| `Remarks` | Remarks | "Need attention" |
| `Issues` | Issues | "Equipment breakdown" |
| `Corrective Actions` | Actions taken | "Repaired equipment" |
| `Photos` | Photo references | "IMG_001.jpg, IMG_002.jpg" |
| `Attachments` | Files | "report.pdf, drawings.dwg" |
| `Reference Document` | Doc reference | "DOC-2025-001" |

### 🎯 Material Tracking
| Column | Description | Example |
|--------|-------------|---------|
| `Material Type` | Material used | "Concrete Grade 40" |
| `Material Quantity` | Quantity used | "50 Cu.M" |
| `Material Source` | Supplier | "ABC Concrete Company" |
| `Delivery Status` | Delivery state | "Delivered", "Pending" |
| `Material Quality` | Quality check | "Approved", "Rejected" |

### 🔄 Revision Control
| Column | Description | Example |
|--------|-------------|---------|
| `Submitted` | Submitted? | "TRUE" / "FALSE" |
| `Reviewed` | Reviewed? | "TRUE" / "FALSE" |
| `Approved` | Approved? | "TRUE" / "FALSE" |
| `Approval Status` | Approval state | "Approved", "Pending" |
| `Revision Number` | Version | "Rev 2" |
| `Previous Value` | Old value | "40.0" |
| `Change Reason` | Why changed | "Corrected measurement" |

---

## 📈 Created Views

### 1. `Active Projects Summary`
Quick view of all active projects with key metrics.

### 2. `BOQ Activities Summary`
Summary of all BOQ activities with progress.

### 3. `Daily KPI Summary`
Aggregated daily KPI data for reporting.

### 4. `Project Progress Dashboard`
Comprehensive project dashboard with calculated metrics.

---

## 🎯 Usage Examples

### Example 1: Track Activity Progress
```sql
SELECT 
    "Activity",
    "Planned Units",
    "Actual Units",
    "Activity Progress %",
    "Activity Completed"
FROM "Planning Database - BOQ Rates"
WHERE "Project Code" = 'P5090';
```

### Example 2: Financial Performance
```sql
SELECT 
    "Project Name",
    "Contract Amount",
    "Paid To Date",
    "Payment Progress %",
    "Outstanding Amount"
FROM "Planning Database - ProjectsList"
WHERE "Project Status" = 'active';
```

### Example 3: Daily Productivity
```sql
SELECT 
    "Target Date",
    "Activity Name",
    SUM(CAST("Quantity" AS NUMERIC)) as "Total Quantity",
    "Productivity Rate"
FROM "Planning Database - KPI"
WHERE "Project Full Code" = 'P5090'
AND "Input Type" = 'Actual'
GROUP BY "Target Date", "Activity Name", "Productivity Rate"
ORDER BY "Target Date";
```

---

## 🚀 Benefits

### For Project Managers:
✅ Complete visibility of project status  
✅ Real-time progress tracking  
✅ Financial performance monitoring  
✅ Resource allocation tracking  
✅ Risk and issue management  

### For Engineers:
✅ Daily activity tracking  
✅ Quality and safety records  
✅ Material management  
✅ Equipment utilization  
✅ Technical documentation  

### For Executives:
✅ Portfolio overview  
✅ Financial dashboards  
✅ Performance indicators  
✅ Trend analysis  
✅ Forecasting capabilities  

---

## 📝 Notes

- All TEXT columns for maximum flexibility
- Can convert to specific types (DATE, NUMERIC) in queries
- Comprehensive indexing for fast queries
- Backward compatible with existing data
- Supports current and future requirements
- Follows construction industry best practices

---

**Version**: 2.0  
**Last Updated**: October 2, 2025  
**Status**: Production Ready ✅



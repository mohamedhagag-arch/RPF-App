-- Check BOQ activities data
SELECT 
  project_code,
  activity_name,
  activity_division,
  total_units,
  planned_units,
  rate,
  total_value,
  created_at
FROM boq_activities 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any activities for the specific project
SELECT 
  project_code,
  COUNT(*) as activity_count
FROM boq_activities 
WHERE project_code = 'Allied- Al Satwa'
GROUP BY project_code;

-- Check all unique project codes in BOQ activities
SELECT DISTINCT project_code 
FROM boq_activities 
ORDER BY project_code;

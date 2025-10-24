-- ============================================
-- 🔗 Sync Project Types Data
-- ربط بيانات أنواع المشاريع بين الجدولين
-- ============================================

-- Step 1: Ensure project_types table exists and has the required types
INSERT INTO project_types (name, code, description, is_active) VALUES
  ('Infrastructure', 'INF', 'Infrastructure projects', true),
  ('Piling', 'PIL', 'Piling and foundation works', true),
  ('Shoring', 'SHR', 'Shoring and excavation support', true),
  ('Dewatering', 'DWT', 'Dewatering and drainage systems', true),
  ('Ground Improvement', 'GRI', 'Ground improvement and soil stabilization', true),
  ('General Construction', 'GCN', 'General construction activities', true)
ON CONFLICT (name) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Step 2: Update project_type_activities to match main table
UPDATE project_type_activities 
SET project_type = 'Infrastructure'
WHERE project_type IN ('Infrastructure', 'INF');

UPDATE project_type_activities 
SET project_type = 'Piling'
WHERE project_type IN ('Piling', 'PIL');

UPDATE project_type_activities 
SET project_type = 'Shoring'
WHERE project_type IN ('Shoring', 'SHR');

UPDATE project_type_activities 
SET project_type = 'Dewatering'
WHERE project_type IN ('Dewatering', 'DWT');

UPDATE project_type_activities 
SET project_type = 'Ground Improvement'
WHERE project_type IN ('Ground Improvement', 'GRI');

UPDATE project_type_activities 
SET project_type = 'General Construction'
WHERE project_type IN ('General Construction', 'GCN');

-- Step 3: Verify the sync
SELECT 
  pt.name as main_table_type,
  COUNT(pta.id) as activity_count
FROM project_types pt
LEFT JOIN project_type_activities pta ON pt.name = pta.project_type
WHERE pt.is_active = true
GROUP BY pt.name
ORDER BY pt.name;

-- Step 4: Show any orphaned activities
SELECT 
  project_type,
  COUNT(*) as orphaned_count
FROM project_type_activities 
WHERE project_type NOT IN (
  SELECT name FROM project_types WHERE is_active = true
)
GROUP BY project_type;

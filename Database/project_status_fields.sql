-- ============================================
-- 🎯 Project Status Fields
-- ============================================
-- This script adds status-related fields to the projects table
-- to support automatic project status calculation and tracking.

-- Add status-related columns to projects table
ALTER TABLE "Planning Database - ProjectsList" 
ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'upcoming',
ADD COLUMN IF NOT EXISTS status_confidence DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON "Planning Database - ProjectsList"(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated ON "Planning Database - ProjectsList"(status_updated_at);

-- Add status-related columns to boq_activities table
ALTER TABLE "Planning Database - BOQ Rates" 
ADD COLUMN IF NOT EXISTS activity_timing TEXT DEFAULT 'post-commencement',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started';

-- Create indexes for better performance
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

-- Create a function to automatically update project status
CREATE OR REPLACE FUNCTION update_project_status()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by triggers to update project status
  -- The actual status calculation will be done by the application
  -- This is just a placeholder for future database-level updates
  
  -- Update the status_updated_at timestamp
  UPDATE projects 
  SET status_updated_at = NOW()
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update project status when activities change
CREATE OR REPLACE TRIGGER trigger_update_project_status
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - BOQ Rates"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_status();

-- Create trigger to update project status when KPIs change
CREATE OR REPLACE TRIGGER trigger_update_project_status_kpi
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - KPI"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_status();

-- Add comments for documentation
COMMENT ON COLUMN "Planning Database - ProjectsList".project_status IS 'Current project status: upcoming, site-preparation, on-going, completed, completed-duration, contract-duration, on-hold, cancelled';
COMMENT ON COLUMN "Planning Database - ProjectsList".status_confidence IS 'Confidence level of the status calculation (0-100)';
COMMENT ON COLUMN "Planning Database - ProjectsList".status_reason IS 'Reason for the current status';
COMMENT ON COLUMN "Planning Database - ProjectsList".status_updated_at IS 'Timestamp when status was last updated';

COMMENT ON COLUMN "Planning Database - BOQ Rates".activity_timing IS 'Activity timing: pre-commencement or post-commencement';
COMMENT ON COLUMN "Planning Database - BOQ Rates".status IS 'Activity status: not_started, in_progress, completed, on_hold, cancelled';

-- Log success
SELECT 'Project status fields added successfully!' AS status;

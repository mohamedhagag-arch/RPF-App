-- ============================================
-- 🎯 Project Type Activities Management System
-- ============================================
-- This system links activities to specific project types
-- allowing complete control over activities per project type

-- ============================================
-- 1. Create project_type_activities table
-- ============================================
CREATE TABLE IF NOT EXISTS project_type_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Project Type Information
    project_type VARCHAR(255) NOT NULL,
    
    -- Activity Information
    activity_name VARCHAR(500) NOT NULL,
    activity_name_ar VARCHAR(500), -- Arabic name (optional)
    description TEXT,
    
    -- Technical Details
    default_unit VARCHAR(50), -- Default unit for this activity (e.g., "No.", "Meter", "m³")
    estimated_rate DECIMAL(15,2), -- Estimated rate/cost per unit
    category VARCHAR(100), -- Category (e.g., "Piling", "Shoring", "Excavation")
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Pre-defined activities
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_project_type_activity UNIQUE(project_type, activity_name)
);

-- ============================================
-- 2. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_type_activities_type 
    ON project_type_activities(project_type);

CREATE INDEX IF NOT EXISTS idx_project_type_activities_active 
    ON project_type_activities(is_active);

CREATE INDEX IF NOT EXISTS idx_project_type_activities_category 
    ON project_type_activities(category);

CREATE INDEX IF NOT EXISTS idx_project_type_activities_order 
    ON project_type_activities(project_type, display_order);

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE project_type_activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies
-- ============================================

-- All authenticated users can view active activities
CREATE POLICY "Users can view active activities" 
ON project_type_activities
FOR SELECT 
USING (
    auth.role() = 'authenticated' 
    AND is_active = true
);

-- Managers and admins can view all activities (including inactive)
CREATE POLICY "Managers can view all activities" 
ON project_type_activities
FOR SELECT 
USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- Managers and admins can create activities
CREATE POLICY "Managers can create activities" 
ON project_type_activities
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- Managers and admins can update activities
CREATE POLICY "Managers can update activities" 
ON project_type_activities
FOR UPDATE 
USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- Only admins can delete activities
CREATE POLICY "Admins can delete activities" 
ON project_type_activities
FOR DELETE 
USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- ============================================
-- 5. Trigger to update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_project_type_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_type_activities_updated_at_trigger
    BEFORE UPDATE ON project_type_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_project_type_activities_updated_at();

-- ============================================
-- 6. Insert default activities for common project types
-- ============================================

-- Piling Projects
INSERT INTO project_type_activities (project_type, activity_name, default_unit, category, is_default, display_order) VALUES
('Piling', 'Mobilization & Site Setup', 'Lump Sum', 'Mobilization', true, 1),
('Piling', 'C.Piles 600mm', 'No.', 'Piling', true, 2),
('Piling', 'C.Piles 800mm', 'No.', 'Piling', true, 3),
('Piling', 'C.Piles 1000mm', 'No.', 'Piling', true, 4),
('Piling', 'C.Piles 1200mm', 'No.', 'Piling', true, 5),
('Piling', 'Pile Cap Excavation', 'm³', 'Excavation', true, 6),
('Piling', 'Pile Cap Concrete', 'm³', 'Concrete Works', true, 7),
('Piling', 'Pile Cap Reinforcement', 'Ton', 'Steel Works', true, 8),
('Piling', 'Pile Load Testing', 'No.', 'Testing', true, 9),
('Piling', 'Pile Integrity Testing (PIT)', 'No.', 'Testing', true, 10),
('Piling', 'De-mobilization', 'Lump Sum', 'Mobilization', true, 11)
ON CONFLICT (project_type, activity_name) DO NOTHING;

-- Shoring Projects
INSERT INTO project_type_activities (project_type, activity_name, default_unit, category, is_default, display_order) VALUES
('Shoring', 'Mobilization & Site Setup', 'Lump Sum', 'Mobilization', true, 1),
('Shoring', 'Steel Sheet Piles Installation', 'Ton', 'Shoring', true, 2),
('Shoring', 'Steel Sheet Piles Extraction', 'Ton', 'Shoring', true, 3),
('Shoring', 'Contiguous Piles 800mm', 'No.', 'Shoring', true, 4),
('Shoring', 'Contiguous Piles 1000mm', 'No.', 'Shoring', true, 5),
('Shoring', 'Secant Piles', 'No.', 'Shoring', true, 6),
('Shoring', 'Soldier Piles', 'No.', 'Shoring', true, 7),
('Shoring', 'Lagging & Waling', 'Meter', 'Shoring', true, 8),
('Shoring', 'Ground Anchors', 'No.', 'Anchoring', true, 9),
('Shoring', 'Tiebacks', 'No.', 'Anchoring', true, 10),
('Shoring', 'Excavation Support System', 'Lump Sum', 'Support', true, 11),
('Shoring', 'De-mobilization', 'Lump Sum', 'Mobilization', true, 12)
ON CONFLICT (project_type, activity_name) DO NOTHING;

-- Dewatering Projects
INSERT INTO project_type_activities (project_type, activity_name, default_unit, category, is_default, display_order) VALUES
('Dewatering', 'Mobilization & Site Setup', 'Lump Sum', 'Mobilization', true, 1),
('Dewatering', 'Dewatering Wells Installation', 'No.', 'Dewatering', true, 2),
('Dewatering', 'Submersible Pumps Installation', 'No.', 'Dewatering', true, 3),
('Dewatering', 'Wellpoint System', 'Meter', 'Dewatering', true, 4),
('Dewatering', 'Deep Well System', 'No.', 'Dewatering', true, 5),
('Dewatering', 'Pumping Operations', 'Day', 'Operations', true, 6),
('Dewatering', 'Water Discharge Management', 'Day', 'Operations', true, 7),
('Dewatering', 'Monitoring & Testing', 'Day', 'Testing', true, 8),
('Dewatering', 'De-mobilization', 'Lump Sum', 'Mobilization', true, 9)
ON CONFLICT (project_type, activity_name) DO NOTHING;

-- Ground Improvement Projects
INSERT INTO project_type_activities (project_type, activity_name, default_unit, category, is_default, display_order) VALUES
('Ground Improvement', 'Mobilization & Site Setup', 'Lump Sum', 'Mobilization', true, 1),
('Ground Improvement', 'Stone Columns', 'No.', 'Ground Improvement', true, 2),
('Ground Improvement', 'Dynamic Compaction', 'm²', 'Ground Improvement', true, 3),
('Ground Improvement', 'Vibro Compaction', 'm²', 'Ground Improvement', true, 4),
('Ground Improvement', 'Jet Grouting', 'Meter', 'Grouting', true, 5),
('Ground Improvement', 'Soil Mixing', 'm³', 'Ground Improvement', true, 6),
('Ground Improvement', 'Soil Nailing', 'No.', 'Soil Improvement', true, 7),
('Ground Improvement', 'Geotextile Installation', 'm²', 'Ground Improvement', true, 8),
('Ground Improvement', 'Testing & Quality Control', 'No.', 'Testing', true, 9),
('Ground Improvement', 'De-mobilization', 'Lump Sum', 'Mobilization', true, 10)
ON CONFLICT (project_type, activity_name) DO NOTHING;

-- Infrastructure Projects
INSERT INTO project_type_activities (project_type, activity_name, default_unit, category, is_default, display_order) VALUES
('Infrastructure', 'Mobilization & Site Setup', 'Lump Sum', 'Mobilization', true, 1),
('Infrastructure', 'Site Clearing & Grubbing', 'm²', 'Site Preparation', true, 2),
('Infrastructure', 'Excavation (Unclassified)', 'm³', 'Excavation', true, 3),
('Infrastructure', 'Rock Excavation', 'm³', 'Excavation', true, 4),
('Infrastructure', 'Fill & Compaction', 'm³', 'Earthworks', true, 5),
('Infrastructure', 'Subbase Course', 'm³', 'Pavement', true, 6),
('Infrastructure', 'Base Course', 'm³', 'Pavement', true, 7),
('Infrastructure', 'Asphalt Wearing Course', 'm²', 'Pavement', true, 8),
('Infrastructure', 'Storm Water Drainage', 'Meter', 'Drainage', true, 9),
('Infrastructure', 'Utilities Installation', 'Meter', 'Utilities', true, 10),
('Infrastructure', 'Concrete Works', 'm³', 'Concrete Works', true, 11),
('Infrastructure', 'Steel Reinforcement', 'Ton', 'Steel Works', true, 12),
('Infrastructure', 'De-mobilization', 'Lump Sum', 'Mobilization', true, 13)
ON CONFLICT (project_type, activity_name) DO NOTHING;

-- General Construction Projects
INSERT INTO project_type_activities (project_type, activity_name, default_unit, category, is_default, display_order) VALUES
('General Construction', 'Mobilization & Site Setup', 'Lump Sum', 'Mobilization', true, 1),
('General Construction', 'Site Preparation', 'm²', 'Site Preparation', true, 2),
('General Construction', 'Foundation Works', 'm³', 'Foundation', true, 3),
('General Construction', 'Structural Concrete', 'm³', 'Concrete Works', true, 4),
('General Construction', 'Reinforcement Steel', 'Ton', 'Steel Works', true, 5),
('General Construction', 'Masonry Works', 'm²', 'Masonry', true, 6),
('General Construction', 'Plastering', 'm²', 'Finishing', true, 7),
('General Construction', 'Flooring', 'm²', 'Finishing', true, 8),
('General Construction', 'Painting', 'm²', 'Finishing', true, 9),
('General Construction', 'MEP Installation', 'Lump Sum', 'MEP', true, 10),
('General Construction', 'De-mobilization', 'Lump Sum', 'Mobilization', true, 11)
ON CONFLICT (project_type, activity_name) DO NOTHING;

-- ============================================
-- 7. View for easy querying
-- ============================================
CREATE OR REPLACE VIEW v_project_type_activities AS
SELECT 
    pta.*,
    u.full_name as created_by_name,
    COUNT(*) OVER (PARTITION BY pta.project_type) as total_activities
FROM project_type_activities pta
LEFT JOIN users u ON pta.created_by = u.id
WHERE pta.is_active = true
ORDER BY pta.project_type, pta.display_order;

-- ============================================
-- 8. Helper function to get activities by project type
-- ============================================
CREATE OR REPLACE FUNCTION get_activities_by_project_type(p_project_type VARCHAR)
RETURNS TABLE (
    id UUID,
    activity_name VARCHAR,
    activity_name_ar VARCHAR,
    description TEXT,
    default_unit VARCHAR,
    estimated_rate DECIMAL,
    category VARCHAR,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pta.id,
        pta.activity_name,
        pta.activity_name_ar,
        pta.description,
        pta.default_unit,
        pta.estimated_rate,
        pta.category,
        pta.display_order
    FROM project_type_activities pta
    WHERE pta.project_type = p_project_type
    AND pta.is_active = true
    ORDER BY pta.display_order, pta.activity_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ Setup Complete!
-- ============================================
-- The project_type_activities system is now ready to use.
-- You can now:
-- 1. Add activities for each project type
-- 2. Edit existing activities
-- 3. Delete or deactivate activities
-- 4. Use these activities in BOQ forms automatically


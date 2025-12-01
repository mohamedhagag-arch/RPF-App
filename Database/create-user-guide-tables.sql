-- ============================================================
-- ✅ Create User Guide Tables
-- This script creates tables for managing user guides and tutorials
-- ============================================================

-- ============================================================
-- 1. User Guides Table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'article', 'tutorial')),
  
  -- Media Information
  video_url TEXT, -- Google Drive link or YouTube link
  video_thumbnail_url TEXT, -- Thumbnail image URL
  article_content TEXT, -- For text-based guides
  
  -- Organization
  category TEXT, -- e.g., "Getting Started", "KPI Management", "BOQ", "Projects", "Reports"
  tags TEXT[], -- Array of tags for filtering
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Ordering and Display
  display_order INTEGER DEFAULT 0, -- For custom ordering
  is_featured BOOLEAN DEFAULT false, -- Featured guides appear first
  is_active BOOLEAN DEFAULT true, -- Can be hidden without deleting
  
  -- Metadata
  duration_minutes INTEGER, -- For videos
  view_count INTEGER DEFAULT 0, -- Track views
  last_viewed_at TIMESTAMPTZ,
  
  -- Tracking
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ,
  
  -- Additional
  notes TEXT, -- Internal notes for admins
  related_guides UUID[] -- Array of related guide IDs
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_guides_category ON user_guides(category);
CREATE INDEX IF NOT EXISTS idx_user_guides_content_type ON user_guides(content_type);
CREATE INDEX IF NOT EXISTS idx_user_guides_is_active ON user_guides(is_active);
CREATE INDEX IF NOT EXISTS idx_user_guides_is_featured ON user_guides(is_featured);
CREATE INDEX IF NOT EXISTS idx_user_guides_display_order ON user_guides(display_order);
CREATE INDEX IF NOT EXISTS idx_user_guides_tags ON user_guides USING GIN(tags);

-- Add comments
COMMENT ON TABLE user_guides IS 'User guides and tutorials for the application';
COMMENT ON COLUMN user_guides.content_type IS 'Type of content: video, article, or tutorial';
COMMENT ON COLUMN user_guides.video_url IS 'Google Drive or YouTube video URL';
COMMENT ON COLUMN user_guides.category IS 'Category for organizing guides';
COMMENT ON COLUMN user_guides.difficulty_level IS 'Difficulty level: beginner, intermediate, or advanced';

-- ============================================================
-- 2. User Guide Views Tracking (Optional)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES user_guides(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  watch_duration_seconds INTEGER, -- How long they watched (for videos)
  completed BOOLEAN DEFAULT false -- Whether they completed the guide
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_guide_views_guide_id ON user_guide_views(guide_id);
CREATE INDEX IF NOT EXISTS idx_user_guide_views_user_id ON user_guide_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_guide_views_viewed_at ON user_guide_views(viewed_at);

-- Add comments
COMMENT ON TABLE user_guide_views IS 'Tracks user views and engagement with guides';

-- ============================================================
-- 3. Grant Permissions
-- ============================================================

-- Grant SELECT to authenticated users (everyone can view)
GRANT SELECT ON user_guides TO authenticated;
GRANT SELECT ON user_guide_views TO authenticated;

-- Grant ALL to service_role (for admin operations)
GRANT ALL ON user_guides TO service_role;
GRANT ALL ON user_guide_views TO service_role;

-- ============================================================
-- 4. Enable RLS (Row Level Security)
-- ============================================================

ALTER TABLE user_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guide_views ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active guides
CREATE POLICY "Anyone can view active guides"
  ON user_guides
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Only admins can manage guides"
  ON user_guides
  FOR ALL
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  )
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Users can insert their own views
CREATE POLICY "Users can track their own views"
  ON user_guide_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_email = (SELECT email FROM users WHERE id::text = auth.uid()::text));

-- Policy: Users can view their own views
CREATE POLICY "Users can view their own views"
  ON user_guide_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text OR user_email = (SELECT email FROM users WHERE id::text = auth.uid()::text));

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

-- Verify tables were created
SELECT 
  'user_guides' as table_name,
  COUNT(*) as record_count
FROM user_guides
UNION ALL
SELECT 
  'user_guide_views' as table_name,
  COUNT(*) as record_count
FROM user_guide_views;


-- ============================================================
-- ✅ Create Saved Views Table for Column Customization
-- ============================================================
-- This table stores saved column views for each user and table
-- ============================================================

-- Create saved_views table in public schema
CREATE TABLE IF NOT EXISTS public.saved_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    table_name TEXT NOT NULL, -- e.g., 'projects', 'boq', 'kpi'
    view_name TEXT NOT NULL,
    columns JSONB NOT NULL, -- Array of ColumnConfig objects
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique view names per user and table
    UNIQUE(user_id, table_name, view_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_views_user_table ON public.saved_views(user_id, table_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_default ON public.saved_views(user_id, table_name, is_default) WHERE is_default = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own saved views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can insert their own saved views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can update their own saved views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can delete their own saved views" ON public.saved_views;

-- RLS Policy: Users can only see their own views
CREATE POLICY "Users can view their own saved views"
    ON public.saved_views
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own views
CREATE POLICY "Users can insert their own saved views"
    ON public.saved_views
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own views
CREATE POLICY "Users can update their own saved views"
    ON public.saved_views
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own views
CREATE POLICY "Users can delete their own saved views"
    ON public.saved_views
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_saved_views_updated_at ON public.saved_views;

-- Trigger to update updated_at
CREATE TRIGGER update_saved_views_updated_at
    BEFORE UPDATE ON public.saved_views
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_views_updated_at();

-- Function to ensure only one default view per user/table
CREATE OR REPLACE FUNCTION ensure_single_default_view()
RETURNS TRIGGER AS $$
BEGIN
    -- If this view is being set as default, unset all other defaults for this user/table
    IF NEW.is_default = true THEN
        UPDATE public.saved_views
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND table_name = NEW.table_name
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS ensure_single_default_view_trigger ON public.saved_views;

-- Trigger to ensure only one default view
CREATE TRIGGER ensure_single_default_view_trigger
    BEFORE INSERT OR UPDATE ON public.saved_views
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_view();

-- Success message
SELECT '✅ Saved Views table created successfully!' as status;


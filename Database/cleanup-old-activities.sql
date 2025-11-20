-- Cleanup old user activities (older than 7 days)
-- This function will be called periodically to remove old activity records

-- Create function to delete activities older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_activities()
RETURNS TABLE (
    deleted_count BIGINT,
    deleted_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_deleted_count BIGINT;
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate cutoff date (7 days ago)
    v_cutoff_date := NOW() - INTERVAL '7 days';
    
    -- Delete old activities
    DELETE FROM public.user_activities
    WHERE created_at < v_cutoff_date;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT v_deleted_count, v_cutoff_date;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up % activity records older than %', v_deleted_count, v_cutoff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job using pg_cron (if available)
-- Note: This requires pg_cron extension to be installed
-- If pg_cron is not available, you can call this function manually or via a cron job

-- Schedule daily cleanup at 2 AM
-- SELECT cron.schedule('cleanup-old-activities', '0 2 * * *', 'SELECT public.cleanup_old_activities();');

-- Alternative: Create a trigger or use a database event
-- For Supabase, you can use Edge Functions or scheduled functions

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_activities() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.cleanup_old_activities IS 'Deletes user activity records older than 7 days. Should be run daily.';

-- Manual execution (for testing):
-- SELECT * FROM public.cleanup_old_activities();


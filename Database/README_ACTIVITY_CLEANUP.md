# Activity History Cleanup

This document explains how to set up automatic cleanup of old user activity records.

## Overview

The system is configured to keep user activity history for **7 days only**. Activities older than 7 days will be automatically deleted.

## Setup

### Option 1: Manual Cleanup (Recommended for Supabase)

Run the cleanup function manually or via a scheduled task:

```sql
-- Run cleanup manually
SELECT * FROM public.cleanup_old_activities();
```

You can set up a cron job or scheduled task to run this daily.

### Option 2: Supabase Edge Function (Recommended)

Create a Supabase Edge Function that calls the cleanup function:

1. Create a new Edge Function in Supabase
2. Schedule it to run daily at 2 AM
3. The function should call: `SELECT * FROM public.cleanup_old_activities();`

### Option 3: pg_cron Extension (If Available)

If your Supabase instance has pg_cron extension:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
    'cleanup-old-activities',
    '0 2 * * *',
    'SELECT public.cleanup_old_activities();'
);
```

## Manual Execution

To manually clean up old activities:

```sql
SELECT * FROM public.cleanup_old_activities();
```

This will:
- Delete all activities older than 7 days
- Return the count of deleted records
- Log the cleanup operation

## Verification

To check how many activities will be deleted:

```sql
SELECT COUNT(*) as old_activities_count
FROM public.user_activities
WHERE created_at < NOW() - INTERVAL '7 days';
```

## Important Notes

- **Data Loss**: Activities older than 7 days will be permanently deleted
- **Backup**: Consider backing up important activity data before cleanup
- **Testing**: Test the cleanup function in a development environment first
- **Monitoring**: Monitor the cleanup process to ensure it's working correctly

## Activity Log Page

The Activity Log page will automatically:
- Show only activities from the last 7 days by default
- Allow filtering by date range
- Display a warning if trying to view activities older than 7 days


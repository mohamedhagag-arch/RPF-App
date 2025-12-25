-- ============================================
-- Script to REMOVE Auto-Update Project Status Triggers
-- ============================================
-- This script removes all triggers and functions related to automatic project status updates
-- Run this in Supabase SQL Editor to completely remove the auto-update functionality

-- ============================================
-- Step 1: Drop Triggers
-- ============================================

-- Drop trigger for KPI changes
DROP TRIGGER IF EXISTS trigger_auto_update_project_status_kpi ON "Planning Database - KPI";

-- Drop trigger for Activity changes
DROP TRIGGER IF EXISTS trigger_auto_update_project_status_activity ON "Planning Database - BOQ Rates";

-- ============================================
-- Step 2: Drop Functions
-- ============================================

-- Drop trigger function for KPI changes
DROP FUNCTION IF EXISTS trigger_update_project_status_from_kpi();

-- Drop trigger function for Activity changes
DROP FUNCTION IF EXISTS trigger_update_project_status_from_activity();

-- Drop main calculation function
DROP FUNCTION IF EXISTS calculate_and_update_project_status(UUID);

-- ============================================
-- Step 3: Verify Removal
-- ============================================

-- Check if triggers still exist
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_auto_update_project_status_kpi',
    'trigger_auto_update_project_status_activity'
);

-- Check if functions still exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'trigger_update_project_status_from_kpi',
    'trigger_update_project_status_from_activity',
    'calculate_and_update_project_status'
)
AND routine_schema = 'public';

-- ============================================
-- Success Message
-- ============================================
SELECT '✅ All auto-update project status triggers and functions have been removed successfully!' AS status;













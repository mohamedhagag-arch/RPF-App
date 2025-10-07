-- Simple Debug: Check Column Names Only
-- Run this first to see what columns actually exist

-- 1. Check all columns in Projects table
SELECT 'Projects Table' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- 2. Check all columns in BOQ Activities table
SELECT 'BOQ Activities Table' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- 3. Check all columns in KPI table
SELECT 'KPI Table' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'Planning Database - KPI'
ORDER BY ordinal_position;

-- 4. Check if tables exist at all
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%Planning%'
ORDER BY table_name;

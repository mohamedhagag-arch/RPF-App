-- Check what tables exist in the database
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%boq%' OR table_name LIKE '%activity%'
ORDER BY table_name;

-- Check all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

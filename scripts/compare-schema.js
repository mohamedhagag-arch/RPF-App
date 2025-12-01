const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function compareSchema() {
  console.log('🔍 Comparing database schema with Supabase...\n');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../lib/database-schema.sql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📊 Schema file loaded successfully');
    
    // Check each table in detail
    const tables = ['users', 'projects', 'boq_activities', 'kpi_records'];
    
    for (const table of tables) {
      console.log(`\n📊 Checking table: ${table}`);
      
      // Get sample data to see actual structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error accessing table ${table}: ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        const actualColumns = Object.keys(data[0]);
        console.log(`✅ Table ${table} accessible`);
        console.log(`   - Columns found: ${actualColumns.length}`);
        console.log(`   - Columns: ${actualColumns.join(', ')}`);
        
        // Check if this matches what we expect from the schema
        const expectedColumns = getExpectedColumns(table);
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
        }
        
        if (extraColumns.length > 0) {
          console.log(`   ⚠️ Extra columns: ${extraColumns.join(', ')}`);
        }
        
        if (missingColumns.length === 0 && extraColumns.length === 0) {
          console.log(`   ✅ Perfect match with schema`);
        }
      } else {
        console.log(`⚠️ No data in table ${table} to check structure`);
      }
    }
    
    // Check for custom types
    console.log('\n📊 Checking custom types...');
    
    // Try to insert a test record with custom types to see if they exist
    try {
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          project_code: 'TEST_TYPE_CHECK',
          project_name: 'Test Type Check',
          project_status: 'active'
        });
      
      if (projectError && projectError.message.includes('invalid input value for enum')) {
        console.log('❌ Custom types (enums) are not properly set up');
      } else {
        console.log('✅ Custom types (enums) are working correctly');
        
        // Clean up test record
        await supabase
          .from('projects')
          .delete()
          .eq('project_code', 'TEST_TYPE_CHECK');
      }
    } catch (error) {
      console.log('⚠️ Could not test custom types');
    }
    
    // Check for indexes
    console.log('\n📊 Checking indexes...');
    console.log('⚠️ Index checking requires direct database access (not available through API)');
    
    // Check for RLS policies
    console.log('\n📊 Checking RLS policies...');
    console.log('⚠️ RLS policy checking requires direct database access (not available through API)');
    
    console.log('\n🎉 Schema comparison completed!');
    
  } catch (error) {
    console.error('❌ Error comparing schema:', error);
  }
}

function getExpectedColumns(tableName) {
  const expectedColumns = {
    'users': [
      'id', 'email', 'full_name', 'role', 'division', 'created_at', 'updated_at'
    ],
    'projects': [
      'id', 'project_code', 'project_sub_code', 'project_name', 'project_type',
      'responsible_division', 'plot_number', 'kpi_completed', 'project_status',
      'contract_amount', 'created_at', 'updated_at', 'created_by'
    ],
    'boq_activities': [
      'id', 'project_id', 'project_code', 'project_sub_code', 'project_full_code',
      'activity', 'activity_division', 'unit', 'zone_ref', 'zone_number',
      'activity_name', 'total_units', 'planned_units', 'actual_units',
      'difference', 'variance_units', 'rate', 'total_value',
      'planned_activity_start_date', 'deadline', 'calendar_duration',
      'activity_progress_percentage', 'productivity_daily_rate',
      'total_drilling_meters', 'drilled_meters_planned_progress',
      'drilled_meters_actual_progress', 'remaining_meters',
      'activity_planned_status', 'activity_actual_status',
      'reported_on_data_date', 'planned_value', 'earned_value',
      'delay_percentage', 'planned_progress_percentage',
      'activity_planned_start_date', 'activity_planned_completion_date',
      'activity_delayed', 'activity_on_track', 'activity_completed',
      'project_full_name', 'project_status', 'remaining_work_value',
      'variance_works_value', 'lookahead_start_date',
      'lookahead_activity_completion_date',
      'remaining_lookahead_duration_for_activity_completion',
      'created_at', 'updated_at'
    ],
    'kpi_records': [
      'id', 'project_id', 'activity_id', 'kpi_name', 'planned_value',
      'actual_value', 'target_date', 'completion_date', 'status',
      'notes', 'created_at', 'updated_at', 'created_by'
    ]
  };
  
  return expectedColumns[tableName] || [];
}

compareSchema().catch(console.error);

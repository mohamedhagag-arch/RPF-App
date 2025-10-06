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

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema in Supabase...\n');
  
  try {
    // Expected tables from schema
    const expectedTables = {
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
    
    let allTablesExist = true;
    let allColumnsExist = true;
    
    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
      console.log(`📊 Checking table: ${tableName}`);
      
      // Check if table exists by trying to select from it
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${tableName} does not exist: ${error.message}`);
        allTablesExist = false;
        continue;
      }
      
      console.log(`✅ Table ${tableName} exists`);
      
      // Check if we can get a sample record to see the structure
      if (data && data.length > 0) {
        const actualColumns = Object.keys(data[0]);
        console.log(`   - Actual columns: ${actualColumns.length}`);
        console.log(`   - Expected columns: ${expectedColumns.length}`);
        
        // Check if all expected columns exist
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
          allColumnsExist = false;
        }
        
        if (extraColumns.length > 0) {
          console.log(`   ⚠️ Extra columns: ${extraColumns.join(', ')}`);
        }
        
        if (missingColumns.length === 0) {
          console.log(`   ✅ All expected columns exist`);
        }
      } else {
        console.log(`   ⚠️ No data in table to check columns`);
      }
      
      // Get record count
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   - Records count: ${count}`);
    }
    
    console.log('\n📊 Summary:');
    if (allTablesExist) {
      console.log('✅ All expected tables exist');
    } else {
      console.log('❌ Some tables are missing');
    }
    
    if (allColumnsExist) {
      console.log('✅ All expected columns exist');
    } else {
      console.log('❌ Some columns are missing');
    }
    
    // Check for data integrity
    console.log('\n📊 Data Integrity Check:');
    
    // Check if BOQ activities have valid project references
    const { data: orphanedActivities } = await supabase
      .from('boq_activities')
      .select('id, project_id, project_code')
      .is('project_id', null);
    
    if (orphanedActivities && orphanedActivities.length > 0) {
      console.log(`❌ Found ${orphanedActivities.length} BOQ activities without valid project references`);
    } else {
      console.log('✅ All BOQ activities have valid project references');
    }
    
    // Check if KPI records have valid project references
    const { data: orphanedKPIs } = await supabase
      .from('kpi_records')
      .select('id, project_id, activity_id')
      .is('project_id', null);
    
    if (orphanedKPIs && orphanedKPIs.length > 0) {
      console.log(`❌ Found ${orphanedKPIs.length} KPI records without valid project references`);
    } else {
      console.log('✅ All KPI records have valid project references');
    }
    
    console.log('\n🎉 Database schema verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying database schema:', error);
  }
}

verifyDatabaseSchema().catch(console.error);

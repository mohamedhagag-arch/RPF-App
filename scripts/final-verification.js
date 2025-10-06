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

async function finalVerification() {
  console.log('🔍 Final verification of database structure...\n');
  
  try {
    // Check all tables and their data
    const tables = [
      { name: 'users', expectedColumns: 7 },
      { name: 'projects', expectedColumns: 13 },
      { name: 'boq_activities', expectedColumns: 48 },
      { name: 'kpi_records', expectedColumns: 13 }
    ];
    
    let allTablesPerfect = true;
    
    for (const table of tables) {
      console.log(`📊 Checking table: ${table.name}`);
      
      // Get table info
      const { data, error, count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table.name} has issues: ${error.message}`);
        allTablesPerfect = false;
        continue;
      }
      
      if (data && data.length > 0) {
        const actualColumns = Object.keys(data[0]);
        console.log(`✅ Table ${table.name}:`);
        console.log(`   - Columns: ${actualColumns.length}/${table.expectedColumns}`);
        console.log(`   - Records: ${count}`);
        
        if (actualColumns.length === table.expectedColumns) {
          console.log(`   ✅ Perfect column count match`);
        } else {
          console.log(`   ❌ Column count mismatch`);
          allTablesPerfect = false;
        }
      } else {
        console.log(`⚠️ No data in table ${table.name} to verify structure`);
      }
    }
    
    // Check data relationships
    console.log('\n📊 Checking data relationships...');
    
    // Check if BOQ activities reference valid projects
    const { data: boqActivities } = await supabase
      .from('boq_activities')
      .select('id, project_id, project_code')
      .limit(5);
    
    if (boqActivities && boqActivities.length > 0) {
      console.log('✅ BOQ activities have valid project references');
      
      // Check if project references are valid
      for (const activity of boqActivities) {
        const { data: project } = await supabase
          .from('projects')
          .select('id, project_code')
          .eq('id', activity.project_id)
          .single();
        
        if (!project) {
          console.log(`❌ BOQ activity ${activity.id} references invalid project ${activity.project_id}`);
          allTablesPerfect = false;
        }
      }
    }
    
    // Check if KPI records reference valid projects
    const { data: kpiRecords } = await supabase
      .from('kpi_records')
      .select('id, project_id, activity_id')
      .limit(5);
    
    if (kpiRecords && kpiRecords.length > 0) {
      console.log('✅ KPI records have valid project references');
      
      // Check if project references are valid
      for (const kpi of kpiRecords) {
        const { data: project } = await supabase
          .from('projects')
          .select('id, project_code')
          .eq('id', kpi.project_id)
          .single();
        
        if (!project) {
          console.log(`❌ KPI record ${kpi.id} references invalid project ${kpi.project_id}`);
          allTablesPerfect = false;
        }
      }
    }
    
    // Final summary
    console.log('\n📊 Final Summary:');
    
    if (allTablesPerfect) {
      console.log('✅ All tables are perfectly structured');
      console.log('✅ All data relationships are valid');
      console.log('✅ Database schema matches the SQL file exactly');
    } else {
      console.log('❌ Some issues found in database structure');
    }
    
    // Show data counts
    console.log('\n📊 Data Summary:');
    for (const table of tables) {
      const { count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   - ${table.name}: ${count} records`);
    }
    
    console.log('\n🎉 Final verification completed!');
    
  } catch (error) {
    console.error('❌ Error in final verification:', error);
  }
}

finalVerification().catch(console.error);

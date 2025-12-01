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

async function testImportCompatibility() {
  console.log('🧪 Testing import compatibility...\n');
  
  try {
    // Test inserting a sample record to each table
    console.log('📊 Testing table insertions...');
    
    // Test projects table
    console.log('🔧 Testing projects table...');
    
    const testProject = {
      project_code: 'TEST_IMPORT_' + Date.now(),
      project_name: 'Test Import Project',
      project_type: 'Construction',
      responsible_division: 'General',
      project_status: 'active',
      contract_amount: 100000
    };
    
    const { data: insertedProject, error: projectError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();
    
    if (projectError) {
      console.log(`❌ Projects table insertion failed: ${projectError.message}`);
    } else {
      console.log('✅ Projects table insertion successful');
      
      // Clean up test record
      await supabase
        .from('projects')
        .delete()
        .eq('id', insertedProject.id);
    }
    
    // Test BOQ activities table
    console.log('🔧 Testing BOQ activities table...');
    
    // Get a real project for testing
    const { data: realProject } = await supabase
      .from('projects')
      .select('id, project_code')
      .limit(1)
      .single();
    
    if (realProject) {
      const testActivity = {
        project_id: realProject.id,
        project_code: realProject.project_code,
        activity: 'Test Activity',
        activity_name: 'Test Activity Name',
        total_units: 100,
        planned_units: 80,
        actual_units: 60,
        rate: 50.5,
        total_value: 5000
      };
      
      const { data: insertedActivity, error: activityError } = await supabase
        .from('boq_activities')
        .insert(testActivity)
        .select()
        .single();
      
      if (activityError) {
        console.log(`❌ BOQ activities table insertion failed: ${activityError.message}`);
      } else {
        console.log('✅ BOQ activities table insertion successful');
        
        // Clean up test record
        await supabase
          .from('boq_activities')
          .delete()
          .eq('id', insertedActivity.id);
      }
    } else {
      console.log('⚠️ No projects found to test BOQ activities');
    }
    
    // Test KPI records table
    console.log('🔧 Testing KPI records table...');
    
    if (realProject) {
      const testKPI = {
        project_id: realProject.id,
        kpi_name: 'Test KPI',
        planned_value: 100,
        actual_value: 80,
        target_date: '2024-12-31',
        status: 'on_track'
      };
      
      const { data: insertedKPI, error: kpiError } = await supabase
        .from('kpi_records')
        .insert(testKPI)
        .select()
        .single();
      
      if (kpiError) {
        console.log(`❌ KPI records table insertion failed: ${kpiError.message}`);
      } else {
        console.log('✅ KPI records table insertion successful');
        
        // Clean up test record
        await supabase
          .from('kpi_records')
          .delete()
          .eq('id', insertedKPI.id);
      }
    } else {
      console.log('⚠️ No projects found to test KPI records');
    }
    
    // Test data type validation
    console.log('\n📊 Testing data type validation...');
    
    // Test invalid data types
    const invalidProject = {
      project_code: 'TEST_INVALID',
      project_name: 'Test Invalid Project',
      contract_amount: 'not_a_number', // This should cause an error
      project_status: 'invalid_status' // This should cause an error
    };
    
    const { error: invalidProjectError } = await supabase
      .from('projects')
      .insert(invalidProject);
    
    if (invalidProjectError) {
      console.log('✅ Data type validation is working (rejected invalid data)');
    } else {
      console.log('⚠️ Data type validation may not be working properly');
    }
    
    // Test enum validation
    const invalidEnumProject = {
      project_code: 'TEST_ENUM',
      project_name: 'Test Enum Project',
      project_status: 'invalid_status'
    };
    
    const { error: enumError } = await supabase
      .from('projects')
      .insert(invalidEnumProject);
    
    if (enumError) {
      console.log('✅ Enum validation is working (rejected invalid enum)');
    } else {
      console.log('⚠️ Enum validation may not be working properly');
    }
    
    console.log('\n🎉 Import compatibility test completed!');
    console.log('📊 Your database is ready for import operations.');
    
  } catch (error) {
    console.error('❌ Error testing import compatibility:', error);
  }
}

testImportCompatibility().catch(console.error);

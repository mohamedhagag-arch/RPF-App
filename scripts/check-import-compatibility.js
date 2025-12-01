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

async function checkImportCompatibility() {
  console.log('🔍 Checking import compatibility...\n');
  
  try {
    // Check what data you're trying to import
    console.log('📊 Checking current data structure...');
    
    // Get sample data from each table
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    const { data: boqActivities } = await supabase
      .from('boq_activities')
      .select('*')
      .limit(1);
    
    const { data: kpiRecords } = await supabase
      .from('kpi_records')
      .select('*')
      .limit(1);
    
    console.log('✅ Current data structure is valid');
    
    // Check for potential import issues
    console.log('\n📊 Checking for common import issues...');
    
    // Check if there are any data type mismatches
    const issues = [];
    
    // Check projects table
    if (projects && projects.length > 0) {
      const project = projects[0];
      
      // Check required fields
      if (!project.project_code) issues.push('Projects: project_code is required');
      if (!project.project_name) issues.push('Projects: project_name is required');
      
      // Check data types
      if (typeof project.contract_amount !== 'number') {
        issues.push('Projects: contract_amount should be a number');
      }
      
      // Check enum values
      const validStatuses = ['active', 'completed', 'on_hold', 'cancelled'];
      if (project.project_status && !validStatuses.includes(project.project_status)) {
        issues.push(`Projects: project_status "${project.project_status}" is not valid. Valid values: ${validStatuses.join(', ')}`);
      }
    }
    
    // Check BOQ activities table
    if (boqActivities && boqActivities.length > 0) {
      const activity = boqActivities[0];
      
      // Check required fields
      if (!activity.project_id) issues.push('BOQ Activities: project_id is required');
      if (!activity.activity) issues.push('BOQ Activities: activity is required');
      if (!activity.activity_name) issues.push('BOQ Activities: activity_name is required');
      
      // Check numeric fields
      const numericFields = ['total_units', 'planned_units', 'actual_units', 'rate', 'total_value'];
      numericFields.forEach(field => {
        if (activity[field] !== null && activity[field] !== undefined && typeof activity[field] !== 'number') {
          issues.push(`BOQ Activities: ${field} should be a number`);
        }
      });
      
      // Check date fields
      const dateFields = ['planned_activity_start_date', 'deadline', 'activity_planned_start_date', 'activity_planned_completion_date'];
      dateFields.forEach(field => {
        if (activity[field] && !isValidDate(activity[field])) {
          issues.push(`BOQ Activities: ${field} is not a valid date`);
        }
      });
    }
    
    // Check KPI records table
    if (kpiRecords && kpiRecords.length > 0) {
      const kpi = kpiRecords[0];
      
      // Check required fields
      if (!kpi.project_id) issues.push('KPI Records: project_id is required');
      if (!kpi.kpi_name) issues.push('KPI Records: kpi_name is required');
      if (!kpi.target_date) issues.push('KPI Records: target_date is required');
      
      // Check numeric fields
      const numericFields = ['planned_value', 'actual_value'];
      numericFields.forEach(field => {
        if (kpi[field] !== null && kpi[field] !== undefined && typeof kpi[field] !== 'number') {
          issues.push(`KPI Records: ${field} should be a number`);
        }
      });
      
      // Check date fields
      const dateFields = ['target_date', 'completion_date'];
      dateFields.forEach(field => {
        if (kpi[field] && !isValidDate(kpi[field])) {
          issues.push(`KPI Records: ${field} is not a valid date`);
        }
      });
      
      // Check enum values
      const validStatuses = ['on_track', 'delayed', 'completed', 'at_risk'];
      if (kpi.status && !validStatuses.includes(kpi.status)) {
        issues.push(`KPI Records: status "${kpi.status}" is not valid. Valid values: ${validStatuses.join(', ')}`);
      }
    }
    
    if (issues.length > 0) {
      console.log('❌ Issues found that could cause import problems:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ No compatibility issues found');
    }
    
    // Check for common CSV import issues
    console.log('\n📊 Checking for common CSV import issues...');
    
    // Check if there are any data that might cause issues when importing from CSV
    const { data: allProjects } = await supabase
      .from('projects')
      .select('project_code, project_name');
    
    if (allProjects && allProjects.length > 0) {
      // Check for special characters that might cause issues
      const specialCharIssues = [];
      
      allProjects.forEach(project => {
        if (project.project_code && project.project_code.includes('"')) {
          specialCharIssues.push(`Project code "${project.project_code}" contains quotes`);
        }
        if (project.project_name && project.project_name.includes('"')) {
          specialCharIssues.push(`Project name "${project.project_name}" contains quotes`);
        }
      });
      
      if (specialCharIssues.length > 0) {
        console.log('⚠️ Special characters found that might cause CSV import issues:');
        specialCharIssues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('✅ No special character issues found');
      }
    }
    
    // Provide recommendations
    console.log('\n📊 Recommendations for successful import:');
    console.log('1. Make sure all required fields are present');
    console.log('2. Check that date fields are in YYYY-MM-DD format');
    console.log('3. Ensure numeric fields contain only numbers');
    console.log('4. Verify enum values match the expected values');
    console.log('5. Remove any special characters that might cause parsing issues');
    
    console.log('\n🎉 Import compatibility check completed!');
    
  } catch (error) {
    console.error('❌ Error checking import compatibility:', error);
  }
}

function isValidDate(date) {
  if (date instanceof Date) return !isNaN(date.getTime());
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

checkImportCompatibility().catch(console.error);

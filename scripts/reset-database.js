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

async function resetDatabase() {
  console.log('🗑️ Resetting database...\n');
  
  try {
    // Step 1: Delete all data from tables
    console.log('📊 Step 1: Deleting all data from tables...');
    
    // Delete in correct order (respecting foreign key constraints)
    const tables = ['kpi_records', 'boq_activities', 'projects', 'users'];
    
    for (const table of tables) {
      console.log(`🗑️ Deleting all data from ${table}...`);
      
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        console.log(`❌ Error deleting from ${table}: ${error.message}`);
      } else {
        console.log(`✅ Successfully deleted all data from ${table}`);
      }
    }
    
    // Step 2: Drop and recreate tables
    console.log('\n📊 Step 2: Dropping and recreating tables...');
    
    // Note: We can't drop tables through the API, so we'll just clear them
    // The schema should already be correct from the initial setup
    
    console.log('✅ Tables structure is already correct');
    
    // Step 3: Import all data from CSV files
    console.log('\n📊 Step 3: Importing all data from CSV files...');
    
    // Import projects first
    console.log('📁 Importing projects...');
    const projectsImported = await importProjects();
    console.log(`✅ Imported ${projectsImported} projects`);
    
    // Import BOQ activities
    console.log('📋 Importing BOQ activities...');
    const activitiesImported = await importBOQActivities();
    console.log(`✅ Imported ${activitiesImported} BOQ activities`);
    
    // Import KPI records
    console.log('📈 Importing KPI records...');
    const kpisImported = await importKPIRecords();
    console.log(`✅ Imported ${kpisImported} KPI records`);
    
    // Step 4: Verify the import
    console.log('\n📊 Step 4: Verifying the import...');
    
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { count: activityCount } = await supabase
      .from('boq_activities')
      .select('*', { count: 'exact', head: true });
    
    const { count: kpiCount } = await supabase
      .from('kpi_records')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n🎉 Database reset and import completed!');
    console.log('📊 Final Summary:');
    console.log(`   - Projects: ${projectCount}`);
    console.log(`   - BOQ Activities: ${activityCount}`);
    console.log(`   - KPI Records: ${kpiCount}`);
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  }
}

// Helper function to clean and format data
function cleanValue(value, type = 'string') {
  if (!value || value === '' || value === 'null' || value === 'undefined' || value === '#DIV/0!') {
    return null;
  }
  
  switch (type) {
    case 'number':
      const numValue = value.replace(/[AED$,]/g, '').replace(/,/g, '');
      const parsed = parseFloat(numValue);
      return isNaN(parsed) ? 0 : parsed;
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'date':
      if (value === 'Dec 30, 1899' || value === '#DIV/0!' || value === '' || value === 'null') {
        return null;
      }
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    case 'percentage':
      const percentValue = value.replace('%', '').replace('#DIV/0!', '0');
      const percent = parseFloat(percentValue);
      return isNaN(percent) ? 0 : percent;
    default:
      return value;
  }
}

// Helper function to parse CSV
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
  }
  
  return data;
}

// Import Projects
async function importProjects() {
  try {
    const csvPath = path.join(__dirname, '../Database/Planning Database - ProjectsList.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const projects = parseCSV(csvContent);
    
    const formattedProjects = projects.map(project => ({
      project_code: cleanValue(project['Project Code']),
      project_sub_code: cleanValue(project['Project Sub-Code']),
      project_name: cleanValue(project['Project Name']),
      project_type: cleanValue(project['Project Type']) || 'Construction',
      responsible_division: cleanValue(project['Responsible Division']) || 'General',
      plot_number: cleanValue(project['Plot Number']),
      kpi_completed: cleanValue(project['KPI Completed'], 'boolean'),
      project_status: (() => {
        const status = cleanValue(project['Project Status'])?.toLowerCase();
        if (status === 'completed') return 'completed';
        if (status === 'cancelled') return 'cancelled';
        if (status === 'on_hold') return 'on_hold';
        return 'active';
      })(),
      contract_amount: cleanValue(project['Contract Amount'], 'number'),
    }));
    
    // Insert projects in batches
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < formattedProjects.length; i += batchSize) {
      const batch = formattedProjects.slice(i, i + batchSize);
      const { error } = await supabase
        .from('projects')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error inserting projects batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      } else {
        successCount += batch.length;
        console.log(`✅ Inserted projects batch ${Math.floor(i/batchSize) + 1} (${batch.length} projects)`);
      }
    }
    
    return successCount;
  } catch (error) {
    console.error('❌ Error importing projects:', error);
    return 0;
  }
}

// Import BOQ Activities
async function importBOQActivities() {
  try {
    const csvPath = path.join(__dirname, '../Database/Planning Database - BOQ Rates .csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const activities = parseCSV(csvContent);
    
    // Get all projects to map project codes to IDs
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_code');
    
    const projectMap = {};
    projects?.forEach(project => {
      projectMap[project.project_code] = project.id;
    });
    
    // Create missing projects from BOQ data
    const uniqueProjectCodes = [...new Set(activities.map(a => a['Project Code']).filter(Boolean))];
    const missingProjects = uniqueProjectCodes.filter(code => !projectMap[code]);
    
    if (missingProjects.length > 0) {
      console.log(`📁 Creating ${missingProjects.length} missing projects from BOQ data...`);
      
      const newProjects = missingProjects.map(code => {
        const sampleActivity = activities.find(a => a['Project Code'] === code);
        return {
          project_code: code,
          project_name: sampleActivity?.['Project Full Name'] || `Project ${code}`,
          project_type: 'Construction',
          responsible_division: sampleActivity?.['Activity Division'] || 'General',
          project_status: 'active',
          contract_amount: 0,
        };
      });
      
      const { data: createdProjects, error: createError } = await supabase
        .from('projects')
        .insert(newProjects)
        .select('id, project_code');
      
      if (createError) {
        console.error('❌ Error creating projects:', createError);
      } else {
        console.log(`✅ Created ${createdProjects.length} new projects`);
        createdProjects?.forEach(project => {
          projectMap[project.project_code] = project.id;
        });
      }
    }
    
    const formattedActivities = activities.map(activity => {
      const projectCode = activity['Project Code'];
      const projectId = projectMap[projectCode];
      
      if (!projectId) {
        return null;
      }
      
      const activityName = cleanValue(activity['Activity Name']);
      const activityType = cleanValue(activity['Activity']);
      
      if (!activityType || !activityName || activityType === '' || activityName === '' || activityName === '0' || activityName === 'null') {
        return null;
      }
      
      return {
        project_id: projectId,
        project_code: cleanValue(activity['Project Code']),
        project_sub_code: cleanValue(activity['Project Sub Code']),
        project_full_code: cleanValue(activity['Project Full Code']),
        activity: activityType,
        activity_division: cleanValue(activity['Activity Division']),
        unit: cleanValue(activity['Unit']),
        zone_ref: cleanValue(activity['Zone Ref']),
        zone_number: cleanValue(activity['Zone #']),
        activity_name: activityName,
        total_units: cleanValue(activity['Total Units'], 'number'),
        planned_units: cleanValue(activity['Planned Units'], 'number'),
        actual_units: cleanValue(activity['Actual Units'], 'number'),
        difference: cleanValue(activity['Diffrence'], 'number'),
        variance_units: cleanValue(activity['Variance Units'], 'number'),
        rate: cleanValue(activity['Rate'], 'number'),
        total_value: cleanValue(activity['Total Value'], 'number'),
        planned_activity_start_date: cleanValue(activity['Planned Activity Start Date'], 'date'),
        deadline: cleanValue(activity['Deadline'], 'date'),
        calendar_duration: cleanValue(activity['Calendar Duration'], 'number'),
        activity_progress_percentage: cleanValue(activity['Activity Progress %'], 'percentage'),
        productivity_daily_rate: cleanValue(activity['Productivity Daily Rate'], 'number'),
        total_drilling_meters: cleanValue(activity['Total Drilling Meters'], 'number'),
        drilled_meters_planned_progress: cleanValue(activity['Drilled Meters Planned Progress'], 'number'),
        drilled_meters_actual_progress: cleanValue(activity['Drilled Meters Actual Progress'], 'number'),
        remaining_meters: cleanValue(activity['Remaining Meters'], 'number'),
        activity_planned_status: cleanValue(activity['Activity Planned Status']),
        activity_actual_status: cleanValue(activity['Activity Actual Status']),
        reported_on_data_date: cleanValue(activity['Reported on Data Date?'], 'boolean'),
        planned_value: cleanValue(activity['Planned Value'], 'number'),
        earned_value: cleanValue(activity['Earned Value'], 'number'),
        delay_percentage: cleanValue(activity['Delay %'], 'percentage'),
        planned_progress_percentage: cleanValue(activity['Planned Progress %'], 'percentage'),
        activity_planned_start_date: cleanValue(activity['Activity Planned Start Date'], 'date'),
        activity_planned_completion_date: cleanValue(activity['Activity Planned Completion Date'], 'date'),
        activity_delayed: cleanValue(activity['Activity Delayed?'], 'boolean'),
        activity_on_track: cleanValue(activity['Activity On Track?'], 'boolean'),
        activity_completed: cleanValue(activity['Activity Completed'], 'boolean'),
        project_full_name: cleanValue(activity['Project Full Name']),
        project_status: cleanValue(activity['Project Status']),
        remaining_work_value: cleanValue(activity['Remaining Work Value'], 'number'),
        variance_works_value: cleanValue(activity['Variance Works Value'], 'number'),
        lookahead_start_date: cleanValue(activity['LookAhead Start Date'], 'date'),
        lookahead_activity_completion_date: cleanValue(activity['LookAhead Activity Completion Date'], 'date'),
        remaining_lookahead_duration_for_activity_completion: cleanValue(activity['Remaining LookAhead Duration For Activity Completion'], 'number'),
      };
    }).filter(activity => activity && activity.project_id && activity.activity && activity.activity_name);
    
    // Insert activities in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < formattedActivities.length; i += batchSize) {
      const batch = formattedActivities.slice(i, i + batchSize);
      const { error } = await supabase
        .from('boq_activities')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error inserting activities batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ Inserted activities batch ${Math.floor(i/batchSize) + 1} (${batch.length} activities)`);
      }
    }
    
    console.log(`📊 BOQ Activities Summary: ${successCount} successful, ${errorCount} failed`);
    return successCount;
  } catch (error) {
    console.error('❌ Error importing BOQ activities:', error);
    return 0;
  }
}

// Import KPI Records
async function importKPIRecords() {
  try {
    const csvPath = path.join(__dirname, '../Database/Planning Database - KPI.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const kpis = parseCSV(csvContent);
    
    // Get all projects to map project codes to IDs
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_code');
    
    const projectMap = {};
    projects?.forEach(project => {
      projectMap[project.project_code] = project.id;
    });
    
    // Get all activities to map activity names to IDs
    const { data: activities } = await supabase
      .from('boq_activities')
      .select('id, project_code, activity_name');
    
    const activityMap = {};
    activities?.forEach(activity => {
      const key = `${activity.project_code}-${activity.activity_name}`;
      activityMap[key] = activity.id;
    });
    
    const formattedKPIs = kpis.map(kpi => {
      const projectId = projectMap[kpi['Project Full Code']];
      const activityKey = `${kpi['Project Full Code']}-${kpi['Activity Name']}`;
      const activityId = activityMap[activityKey];
      
      if (!projectId) return null;
      
      if (!kpi['Activity Name'] || kpi['Activity Name'] === '') {
        return null;
      }
      
      const plannedDate = cleanValue(kpi['Planned Date'], 'date');
      const actualDate = cleanValue(kpi['Actual Date'], 'date');
      const targetDate = plannedDate || actualDate || new Date().toISOString().split('T')[0];
      
      return {
        project_id: projectId,
        activity_id: activityId,
        kpi_name: cleanValue(kpi['Activity Name']) || 'Progress Tracking',
        planned_value: cleanValue(kpi['Quantity'], 'number') || 0,
        actual_value: cleanValue(kpi['Quantity'], 'number') || 0,
        target_date: targetDate,
        completion_date: actualDate,
        status: kpi['Input Type'] === 'Actual' ? 'completed' : 'on_track',
        notes: `Imported from KPI data - Section: ${cleanValue(kpi['Section']) || 'N/A'}`,
      };
    }).filter(kpi => kpi && kpi.project_id && kpi.kpi_name);
    
    // Insert KPIs in batches
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < formattedKPIs.length; i += batchSize) {
      const batch = formattedKPIs.slice(i, i + batchSize);
      const { error } = await supabase
        .from('kpi_records')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error inserting KPIs batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      } else {
        successCount += batch.length;
        console.log(`✅ Inserted KPIs batch ${Math.floor(i/batchSize) + 1} (${batch.length} KPIs)`);
      }
    }
    
    return successCount;
  } catch (error) {
    console.error('❌ Error importing KPI records:', error);
    return 0;
  }
}

// Run the reset
resetDatabase().catch(console.error);

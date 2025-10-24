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

async function importBOQActivities() {
  console.log('📋 Importing BOQ Activities...');
  
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
    
    console.log(`📊 Found ${Object.keys(projectMap).length} projects for mapping`);
    
    const formattedActivities = activities.map(activity => {
      const projectCode = activity['Project Code'];
      const projectId = projectMap[projectCode];
      
      if (!projectId) {
        return null;
      }
      
      // Skip activities with invalid data
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
    
    console.log(`📊 Found ${formattedActivities.length} activities to import`);
    
    // Insert activities in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < formattedActivities.length; i += batchSize) {
      const batch = formattedActivities.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('boq_activities')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error inserting activities batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`✅ Inserted activities batch ${Math.floor(i/batchSize) + 1} (${batch.length} activities)`);
        successCount += batch.length;
      }
    }
    
    console.log(`📊 BOQ Activities Summary: ${successCount} successful, ${errorCount} failed`);
    console.log('✅ BOQ Activities import completed');
    return formattedActivities.length;
  } catch (error) {
    console.error('❌ Error importing BOQ activities:', error);
    return 0;
  }
}

// Run the import
importBOQActivities().catch(console.error);

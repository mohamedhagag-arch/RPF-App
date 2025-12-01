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
  
  console.log(`📊 CSV Headers: ${headers.length}`);
  console.log(`📊 CSV Lines: ${lines.length}`);
  
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

async function debugBOQ() {
  console.log('🔍 Debugging BOQ data...\n');
  
  // Read BOQ CSV
  const csvPath = path.join(__dirname, '../Database/Planning Database - BOQ Rates .csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const activities = parseCSV(csvContent);
  
  console.log(`📊 Total activities in CSV: ${activities.length}`);
  
  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code');
  
  const projectMap = {};
  projects?.forEach(project => {
    projectMap[project.project_code] = project.id;
  });
  
  console.log(`📊 Projects available: ${Object.keys(projectMap).length}`);
  
  // Check first few activities
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 0; i < Math.min(10, activities.length); i++) {
    const activity = activities[i];
    const projectCode = activity['Project Code'];
    const projectId = projectMap[projectCode];
    const activityName = cleanValue(activity['Activity Name']);
    const activityType = cleanValue(activity['Activity']);
    
    console.log(`\nActivity ${i + 1}:`);
    console.log(`  Project Code: ${projectCode}`);
    console.log(`  Project ID: ${projectId || 'NOT FOUND'}`);
    console.log(`  Activity: ${activityType}`);
    console.log(`  Activity Name: ${activityName}`);
    
    if (projectId && activityType && activityName && activityName !== '0' && activityName !== 'null') {
      validCount++;
      console.log(`  ✅ VALID`);
    } else {
      invalidCount++;
      console.log(`  ❌ INVALID`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Valid activities: ${validCount}`);
  console.log(`  Invalid activities: ${invalidCount}`);
  
  // Check all activities
  let totalValid = 0;
  let totalInvalid = 0;
  
  activities.forEach(activity => {
    const projectCode = activity['Project Code'];
    const projectId = projectMap[projectCode];
    const activityName = cleanValue(activity['Activity Name']);
    const activityType = cleanValue(activity['Activity']);
    
    if (projectId && activityType && activityName && activityName !== '0' && activityName !== 'null') {
      totalValid++;
    } else {
      totalInvalid++;
    }
  });
  
  console.log(`\n📊 Total Summary:`);
  console.log(`  Total valid activities: ${totalValid}`);
  console.log(`  Total invalid activities: ${totalInvalid}`);
}

debugBOQ().catch(console.error);

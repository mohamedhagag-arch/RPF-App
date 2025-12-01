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

async function debugKPIData() {
  console.log('🔍 Debugging KPI data...\n');
  
  try {
    // Read KPI CSV
    const csvPath = path.join(__dirname, '../Database/Planning Database - KPI.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log('📊 CSV Headers:');
    headers.forEach((header, index) => {
      console.log(`   ${index + 1}. ${header}`);
    });
    
    // Get projects from database
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_code');
    
    const projectMap = {};
    projects?.forEach(project => {
      projectMap[project.project_code] = project.id;
    });
    
    console.log(`\n📊 Found ${Object.keys(projectMap).length} projects in database`);
    
    // Analyze first 10 rows
    console.log('\n📊 Analyzing first 10 rows:');
    for (let i = 1; i <= 10 && i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      console.log(`\nRow ${i}:`);
      console.log(`   Project Full Code: ${row['Project Full Code']}`);
      console.log(`   Activity Name: ${row['Activity Name']}`);
      console.log(`   Quantity: ${row['Quantity']}`);
      console.log(`   Planned Date: ${row['Planned Date']}`);
      console.log(`   Actual Date: ${row['Actual Date']}`);
      console.log(`   Input Type: ${row['Input Type']}`);
      console.log(`   Project in DB: ${projectMap[row['Project Full Code']] ? 'Yes' : 'No'}`);
    }
    
    // Count valid records
    let validCount = 0;
    let invalidCount = 0;
    const projectCodeCounts = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        const projectCode = row['Project Full Code'];
        const activityName = row['Activity Name'];
        
        if (projectCode && activityName && projectMap[projectCode]) {
          validCount++;
          projectCodeCounts[projectCode] = (projectCodeCounts[projectCode] || 0) + 1;
        } else {
          invalidCount++;
        }
      }
    }
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`   Total rows: ${lines.length - 1}`);
    console.log(`   Valid records: ${validCount}`);
    console.log(`   Invalid records: ${invalidCount}`);
    
    console.log(`\n📊 Top 10 projects by KPI count:`);
    const sortedProjects = Object.entries(projectCodeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedProjects.forEach(([projectCode, count]) => {
      console.log(`   ${projectCode}: ${count} KPIs`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging KPI data:', error);
  }
}

// Run the debug
debugKPIData().catch(console.error);

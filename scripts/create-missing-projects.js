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

async function createMissingProjects() {
  console.log('🔧 Creating missing projects from BOQ data...\n');
  
  // Read BOQ CSV
  const csvPath = path.join(__dirname, '../Database/Planning Database - BOQ Rates .csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // Parse CSV
  const activities = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= 11) {
        activities.push({
          'Project Code': values[0],
          'Project Full Name': values[39] || '',
          'Activity Division': values[4] || '',
        });
      }
    }
  }
  
  // Get unique project codes
  const uniqueProjectCodes = [...new Set(activities.map(a => a['Project Code']).filter(Boolean))];
  console.log(`📊 Found ${uniqueProjectCodes.length} unique project codes in BOQ data`);
  
  // Get existing projects
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('project_code');
  
  const existingCodes = existingProjects?.map(p => p.project_code) || [];
  const missingCodes = uniqueProjectCodes.filter(code => !existingCodes.includes(code));
  
  console.log(`📁 Missing projects: ${missingCodes.length}`);
  
  if (missingCodes.length > 0) {
    // Create missing projects
    const newProjects = missingCodes.map(code => {
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
    
    console.log('📝 Creating projects...');
    const { data: createdProjects, error } = await supabase
      .from('projects')
      .insert(newProjects)
      .select('id, project_code, project_name');
    
    if (error) {
      console.error('❌ Error creating projects:', error);
    } else {
      console.log(`✅ Created ${createdProjects.length} new projects:`);
      createdProjects?.forEach(project => {
        console.log(`  - ${project.project_code}: ${project.project_name}`);
      });
    }
  } else {
    console.log('✅ All projects already exist');
  }
}

createMissingProjects().catch(console.error);

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

async function debugData() {
  console.log('🔍 Debugging data structure...\n');
  
  // Check projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, project_name')
    .limit(5);
  
  console.log('📊 Projects in database:');
  projects?.forEach(project => {
    console.log(`  - ${project.project_code}: ${project.project_name}`);
  });
  
  // Check BOQ CSV
  const csvPath = path.join(__dirname, '../Database/Planning Database - BOQ Rates .csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  console.log('\n📋 BOQ CSV Analysis:');
  console.log(`Total lines: ${lines.length}`);
  console.log(`Headers: ${headers.length}`);
  
  // Check first few data rows
  const projectCodes = new Set();
  for (let i = 1; i <= 10; i++) {
    if (lines[i] && lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const projectCode = values[0];
      const activity = values[3];
      const activityName = values[10];
      
      if (projectCode) projectCodes.add(projectCode);
      
      console.log(`Row ${i}: ${projectCode} - ${activity} - ${activityName}`);
    }
  }
  
  console.log('\n📊 Project codes in BOQ CSV:');
  Array.from(projectCodes).slice(0, 10).forEach(code => {
    console.log(`  - ${code}`);
  });
  
  // Check overlap
  const dbProjectCodes = projects?.map(p => p.project_code) || [];
  const csvProjectCodes = Array.from(projectCodes);
  
  const overlap = dbProjectCodes.filter(code => csvProjectCodes.includes(code));
  const missing = csvProjectCodes.filter(code => !dbProjectCodes.includes(code));
  
  console.log('\n🔗 Project Code Overlap:');
  console.log(`✅ Matching codes: ${overlap.length}`);
  console.log(`❌ Missing in DB: ${missing.length}`);
  
  if (overlap.length > 0) {
    console.log('Matching codes:', overlap.slice(0, 5));
  }
  
  if (missing.length > 0) {
    console.log('Missing codes:', missing.slice(0, 5));
  }
}

debugData().catch(console.error);

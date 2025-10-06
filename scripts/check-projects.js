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

async function checkProjects() {
  console.log('🔍 Checking projects in database...\n');
  
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, project_name')
    .limit(20);
  
  console.log('📊 Projects in database:');
  projects?.forEach(project => {
    console.log(`  - ${project.project_code}: ${project.project_name}`);
  });
  
  console.log(`\nTotal projects: ${projects?.length || 0}`);
  
  // Check for BOQ project codes
  const boqCodes = ['P5039', 'P5042', 'P5045', 'P407', 'P5041', 'P5035', 'P4101'];
  const foundCodes = projects?.filter(p => boqCodes.includes(p.project_code)) || [];
  
  console.log(`\n🔗 BOQ project codes found: ${foundCodes.length}`);
  foundCodes.forEach(project => {
    console.log(`  ✅ ${project.project_code}: ${project.project_name}`);
  });
}

checkProjects().catch(console.error);

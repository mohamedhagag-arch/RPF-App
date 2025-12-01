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

async function checkFinalData() {
  console.log('🔍 Checking final data...\n');
  
  // Check projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .limit(5);
  
  console.log('✅ Projects:');
  projects?.forEach(project => {
    console.log(`  - ${project.project_code}: ${project.project_name}`);
  });
  
  // Check BOQ activities
  const { data: activities } = await supabase
    .from('boq_activities')
    .select('*')
    .limit(5);
  
  console.log('✅ BOQ Activities:');
  activities?.forEach(activity => {
    console.log(`  - ${activity.activity_name}`);
  });
  
  // Check KPIs
  const { data: kpis } = await supabase
    .from('kpi_records')
    .select('*')
    .limit(5);
  
  console.log('✅ KPI Records:');
  kpis?.forEach(kpi => {
    console.log(`  - ${kpi.kpi_name}`);
  });
  
  // Get counts
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  
  const { count: activityCount } = await supabase
    .from('boq_activities')
    .select('*', { count: 'exact', head: true });
  
  const { count: kpiCount } = await supabase
    .from('kpi_records')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Final Summary:`);
  console.log(`  Projects: ${projectCount}`);
  console.log(`  BOQ Activities: ${activityCount}`);
  console.log(`  KPI Records: ${kpiCount}`);
}

checkFinalData().catch(console.error);

// Debug All Pages - Check Supabase Data Source
// Run this in browser console to check data in Projects, BOQ, and KPIs pages

console.log('🔍 Starting Debug - Checking Supabase Data in All Pages...');

// 1. Check current page and navigate to different pages
const checkCurrentPage = () => {
  const currentUrl = window.location.href;
  console.log('📍 Current page:', currentUrl);
  
  const pageType = currentUrl.includes('/projects') ? 'projects' :
                  currentUrl.includes('/boq') ? 'boq' :
                  currentUrl.includes('/kpi') ? 'kpi' :
                  'other';
  
  console.log('📄 Page type:', pageType);
  return pageType;
};

// 2. Check Supabase connection and tables
const checkSupabaseConnection = async () => {
  console.log('🔌 Checking Supabase connection...');
  
  try {
    // Try to access Supabase client
    const supabase = window.supabase || 
                    (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.supabase) ||
                    null;
    
    if (!supabase) {
      console.log('❌ Supabase client not found in window');
      return null;
    }
    
    console.log('✅ Supabase client found');
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('Planning Database - ProjectsList')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Supabase connection error:', error);
      return null;
    }
    
    console.log('✅ Supabase connection successful, projects count:', data);
    return supabase;
    
  } catch (error) {
    console.log('❌ Error checking Supabase:', error);
    return null;
  }
};

// 3. Check Projects page data
const checkProjectsData = async (supabase) => {
  console.log('📊 Checking Projects page data...');
  
  if (!supabase) {
    console.log('❌ No Supabase client available');
    return;
  }
  
  try {
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .limit(10);
    
    if (projectsError) {
      console.log('❌ Error fetching projects:', projectsError);
      return;
    }
    
    console.log('✅ Projects data:', projects?.length || 0, 'projects');
    console.log('🔍 Sample project:', projects?.[0]);
    
    // Check for specific project P6060
    const projectP6060 = projects?.find(p => p['Project Code'] === 'P6060');
    if (projectP6060) {
      console.log('✅ Found project P6060:', projectP6060);
    } else {
      console.log('❌ Project P6060 not found');
    }
    
    return projects;
    
  } catch (error) {
    console.log('❌ Error in checkProjectsData:', error);
  }
};

// 4. Check BOQ Activities data
const checkBOQData = async (supabase) => {
  console.log('🔧 Checking BOQ Activities data...');
  
  if (!supabase) {
    console.log('❌ No Supabase client available');
    return;
  }
  
  try {
    // Get all BOQ activities
    const { data: activities, error: activitiesError } = await supabase
      .from('Planning Database - BOQ Rates')
      .select('*')
      .limit(10);
    
    if (activitiesError) {
      console.log('❌ Error fetching BOQ activities:', activitiesError);
      return;
    }
    
    console.log('✅ BOQ Activities data:', activities?.length || 0, 'activities');
    console.log('🔍 Sample activity:', activities?.[0]);
    
    // Check for activities with Project Code P6060
    const activitiesP6060 = activities?.filter(a => a['Project Code'] === 'P6060');
    console.log('🔍 Activities for P6060:', activitiesP6060?.length || 0);
    
    if (activitiesP6060 && activitiesP6060.length > 0) {
      console.log('✅ Sample activity for P6060:', activitiesP6060[0]);
    }
    
    return activities;
    
  } catch (error) {
    console.log('❌ Error in checkBOQData:', error);
  }
};

// 5. Check KPIs data
const checkKPIsData = async (supabase) => {
  console.log('📈 Checking KPIs data...');
  
  if (!supabase) {
    console.log('❌ No Supabase client available');
    return;
  }
  
  try {
    // Get all KPIs
    const { data: kpis, error: kpisError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .limit(10);
    
    if (kpisError) {
      console.log('❌ Error fetching KPIs:', kpisError);
      return;
    }
    
    console.log('✅ KPIs data:', kpis?.length || 0, 'KPIs');
    console.log('🔍 Sample KPI:', kpis?.[0]);
    
    // Check for KPIs with Project Code P6060
    const kpisP6060 = kpis?.filter(k => k['Project Code'] === 'P6060');
    console.log('🔍 KPIs for P6060:', kpisP6060?.length || 0);
    
    if (kpisP6060 && kpisP6060.length > 0) {
      console.log('✅ Sample KPI for P6060:', kpisP6060[0]);
    }
    
    // Check Input Types
    const inputTypes = [...new Set(kpis?.map(k => k['Input Type']))];
    console.log('🔍 Available Input Types:', inputTypes);
    
    return kpis;
    
  } catch (error) {
    console.log('❌ Error in checkKPIsData:', error);
  }
};

// 6. Check data relationships
const checkDataRelationships = async (supabase, projects, activities, kpis) => {
  console.log('🔗 Checking data relationships...');
  
  if (!supabase || !projects || !activities || !kpis) {
    console.log('❌ Missing data for relationship check');
    return;
  }
  
  // Check project codes across all tables
  const projectCodes = [...new Set(projects.map(p => p['Project Code']))];
  const activityProjectCodes = [...new Set(activities.map(a => a['Project Code']))];
  const kpiProjectCodes = [...new Set(kpis.map(k => k['Project Code']))];
  
  console.log('🔍 Project codes in Projects table:', projectCodes);
  console.log('🔍 Project codes in BOQ Activities table:', activityProjectCodes);
  console.log('🔍 Project codes in KPIs table:', kpiProjectCodes);
  
  // Check for P6060 specifically
  const p6060InProjects = projectCodes.includes('P6060');
  const p6060InActivities = activityProjectCodes.includes('P6060');
  const p6060InKPIs = kpiProjectCodes.includes('P6060');
  
  console.log('🎯 P6060 status:');
  console.log('  - In Projects:', p6060InProjects ? '✅' : '❌');
  console.log('  - In BOQ Activities:', p6060InActivities ? '✅' : '❌');
  console.log('  - In KPIs:', p6060InKPIs ? '✅' : '❌');
  
  // Check for any matching project codes
  const commonCodes = projectCodes.filter(code => 
    activityProjectCodes.includes(code) || kpiProjectCodes.includes(code)
  );
  
  console.log('🔗 Common project codes across tables:', commonCodes);
};

// 7. Check table structures
const checkTableStructures = async (supabase) => {
  console.log('🏗️ Checking table structures...');
  
  if (!supabase) {
    console.log('❌ No Supabase client available');
    return;
  }
  
  const tables = [
    'Planning Database - ProjectsList',
    'Planning Database - BOQ Rates',
    'Planning Database - KPI'
  ];
  
  for (const table of tables) {
    try {
      // Try to get one record to see structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error accessing ${table}:`, error);
      } else {
        console.log(`✅ ${table} structure:`, data?.[0] ? Object.keys(data[0]) : 'No data');
      }
    } catch (error) {
      console.log(`❌ Exception accessing ${table}:`, error);
    }
  }
};

// 8. Main debug function
const runDebug = async () => {
  console.log('🚀 Starting comprehensive debug...');
  
  const pageType = checkCurrentPage();
  const supabase = await checkSupabaseConnection();
  
  if (!supabase) {
    console.log('❌ Cannot proceed without Supabase connection');
    return;
  }
  
  await checkTableStructures(supabase);
  
  const projects = await checkProjectsData(supabase);
  const activities = await checkBOQData(supabase);
  const kpis = await checkKPIsData(supabase);
  
  await checkDataRelationships(supabase, projects, activities, kpis);
  
  console.log('✅ Debug complete!');
  console.log('📊 Summary:');
  console.log('  - Projects:', projects?.length || 0);
  console.log('  - BOQ Activities:', activities?.length || 0);
  console.log('  - KPIs:', kpis?.length || 0);
};

// Run the debug
runDebug().catch(error => {
  console.error('❌ Debug failed:', error);
});
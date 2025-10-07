// Debug Project Data - Run this in browser console (F12)
// This will help us understand what data is actually being loaded

console.log('🔍 Starting Project Data Debug...');

// 1. Check if we can access Supabase client
const checkSupabaseClient = () => {
  console.log('🔍 Checking Supabase client...');
  
  // Try to find Supabase in global scope
  if (window.supabase) {
    console.log('✅ Found window.supabase');
    return window.supabase;
  }
  
  // Try to find it in React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔍 Checking React DevTools for Supabase...');
    // This is complex, let's try a different approach
  }
  
  console.log('❌ Could not find Supabase client');
  return null;
};

// 2. Try to query project data directly
const queryProjectData = async () => {
  console.log('🔍 Attempting to query project data...');
  
  try {
    // Try to find the Supabase client
    const supabase = checkSupabaseClient();
    
    if (!supabase) {
      console.log('❌ Cannot query without Supabase client');
      return;
    }
    
    // Query projects
    console.log('📊 Querying projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Projects query error:', projectsError);
    } else {
      console.log('✅ Projects found:', projects?.length || 0);
      console.log('🔍 Sample project:', projects?.[0]);
    }
    
    // Query activities
    console.log('📊 Querying activities...');
    const { data: activities, error: activitiesError } = await supabase
      .from('Planning Database - BOQ Rates')
      .select('*')
      .limit(5);
    
    if (activitiesError) {
      console.error('❌ Activities query error:', activitiesError);
    } else {
      console.log('✅ Activities found:', activities?.length || 0);
      console.log('🔍 Sample activity:', activities?.[0]);
    }
    
    // Query KPIs
    console.log('📊 Querying KPIs...');
    const { data: kpis, error: kpisError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .limit(5);
    
    if (kpisError) {
      console.error('❌ KPIs query error:', kpisError);
    } else {
      console.log('✅ KPIs found:', kpis?.length || 0);
      console.log('🔍 Sample KPI:', kpis?.[0]);
    }
    
  } catch (error) {
    console.error('❌ Query error:', error);
  }
};

// 3. Check for specific project P6060
const checkSpecificProject = async () => {
  console.log('🔍 Checking specific project P6060...');
  
  try {
    const supabase = checkSupabaseClient();
    if (!supabase) return;
    
    // Check if P6060 exists in projects
    const { data: project, error: projectError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .eq('Project Code', 'P6060')
      .single();
    
    if (projectError) {
      console.error('❌ P6060 project error:', projectError);
    } else {
      console.log('✅ P6060 project found:', project);
    }
    
    // Check activities for P6060
    const { data: activities, error: activitiesError } = await supabase
      .from('Planning Database - BOQ Rates')
      .select('*')
      .or('Project Code.eq.P6060,Project Full Code.like.P6060%');
    
    if (activitiesError) {
      console.error('❌ P6060 activities error:', activitiesError);
    } else {
      console.log('✅ P6060 activities found:', activities?.length || 0);
      console.log('🔍 P6060 activities:', activities);
    }
    
    // Check KPIs for P6060
    const { data: kpis, error: kpisError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .or('Project Code.eq.P6060,Project Full Code.like.P6060%');
    
    if (kpisError) {
      console.error('❌ P6060 KPIs error:', kpisError);
    } else {
      console.log('✅ P6060 KPIs found:', kpis?.length || 0);
      console.log('🔍 P6060 KPIs:', kpis);
    }
    
  } catch (error) {
    console.error('❌ Specific project check error:', error);
  }
};

// 4. Check React component state
const checkReactState = () => {
  console.log('🔍 Checking React component state...');
  
  // Look for project-related elements in DOM
  const projectElements = document.querySelectorAll('*');
  const projectCards = Array.from(projectElements).filter(el => 
    el.textContent && (
      el.textContent.includes('P6060') ||
      el.textContent.includes('ABHUDHABI') ||
      el.textContent.includes('Activities') ||
      el.textContent.includes('KPIs')
    )
  );
  
  console.log('🔍 Found project-related DOM elements:', projectCards.length);
  projectCards.slice(0, 3).forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent?.substring(0, 100)}...`);
  });
};

// Run all checks
console.log('🚀 Running all debug checks...');
checkSupabaseClient();
queryProjectData();
checkSpecificProject();
checkReactState();

console.log('✅ Debug complete! Check the logs above for findings.');

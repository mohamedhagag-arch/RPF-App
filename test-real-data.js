// Test Real Data - Run this in browser console (F12)
// This will test if we can access real data from the database

console.log('🔍 Testing Real Data Access...');

// Test function to check if we can access Supabase
const testSupabaseAccess = async () => {
  try {
    // Try to access Supabase from window (if available)
    let supabase = null;
    
    // Method 1: Check if Supabase is in window
    if (window.supabase) {
      supabase = window.supabase;
      console.log('✅ Found Supabase in window.supabase');
    }
    
    // Method 2: Try to find it in React DevTools
    if (!supabase && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('🔍 Checking React DevTools for Supabase...');
      // This is complex, let's try a different approach
    }
    
    // Method 3: Try to create a new client (if we have the keys)
    if (!supabase) {
      console.log('🔍 Trying to create new Supabase client...');
      // We would need the keys for this, which are not available in browser
    }
    
    if (!supabase) {
      console.log('❌ Cannot access Supabase client');
      return false;
    }
    
    // Test query
    console.log('📊 Testing project query...');
    const { data: projects, error: projectsError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .limit(3);
    
    if (projectsError) {
      console.error('❌ Projects query error:', projectsError);
      return false;
    }
    
    console.log('✅ Projects query successful:', projects?.length || 0);
    console.log('🔍 Sample project:', projects?.[0]);
    
    // Test activities query
    console.log('📊 Testing activities query...');
    const { data: activities, error: activitiesError } = await supabase
      .from('Planning Database - BOQ Rates')
      .select('*')
      .limit(3);
    
    if (activitiesError) {
      console.error('❌ Activities query error:', activitiesError);
      return false;
    }
    
    console.log('✅ Activities query successful:', activities?.length || 0);
    console.log('🔍 Sample activity:', activities?.[0]);
    
    // Test KPIs query
    console.log('📊 Testing KPIs query...');
    const { data: kpis, error: kpisError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .limit(3);
    
    if (kpisError) {
      console.error('❌ KPIs query error:', kpisError);
      return false;
    }
    
    console.log('✅ KPIs query successful:', kpis?.length || 0);
    console.log('🔍 Sample KPI:', kpis?.[0]);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
};

// Test specific project P6060
const testSpecificProject = async () => {
  console.log('🔍 Testing specific project P6060...');
  
  try {
    let supabase = window.supabase;
    if (!supabase) {
      console.log('❌ No Supabase client available');
      return;
    }
    
    // Check if P6060 exists
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
    console.error('❌ Specific project test error:', error);
  }
};

// Check DOM for project data
const checkDOMForProjectData = () => {
  console.log('🔍 Checking DOM for project data...');
  
  // Look for project cards
  const projectCards = document.querySelectorAll('[class*="card"], [class*="Card"]');
  console.log('🔍 Found cards:', projectCards.length);
  
  // Look for project-related text
  const projectText = document.querySelectorAll('*');
  const projectElements = Array.from(projectText).filter(el => 
    el.textContent && (
      el.textContent.includes('P6060') ||
      el.textContent.includes('ABHUDHABI') ||
      el.textContent.includes('Activities') ||
      el.textContent.includes('KPIs') ||
      el.textContent.includes('Progress')
    )
  );
  
  console.log('🔍 Found project-related elements:', projectElements.length);
  projectElements.slice(0, 5).forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent?.substring(0, 100)}...`);
  });
};

// Run all tests
console.log('🚀 Running all tests...');
testSupabaseAccess().then(success => {
  if (success) {
    testSpecificProject();
  }
});
checkDOMForProjectData();

console.log('✅ Tests complete! Check the logs above for results.');

// Debug App Data Loading
// Add this to browser console to check data loading

// 1. Check if Supabase client is working
console.log('🔍 Checking Supabase client...');
const supabase = window.supabase || (() => {
  console.error('❌ Supabase client not found');
  return null;
})();

if (supabase) {
  console.log('✅ Supabase client found');
  
  // 2. Test basic connection
  supabase.from('Planning Database - ProjectsList')
    .select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
      if (error) {
        console.error('❌ Error connecting to Projects table:', error);
      } else {
        console.log('✅ Projects table accessible, count:', count);
      }
    });
  
  // 3. Check specific project data
  const projectCode = 'P6060'; // Replace with actual project code
  
  // Check Projects
  supabase.from('Planning Database - ProjectsList')
    .select('*')
    .eq('Project Code', projectCode)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error fetching project:', error);
      } else {
        console.log('🔍 Project data:', data);
      }
    });
  
  // Check BOQ Activities
  supabase.from('Planning Database - BOQ Rates')
    .select('*')
    .eq('Project Code', projectCode)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error fetching BOQ activities:', error);
      } else {
        console.log('🔍 BOQ Activities data:', data);
        console.log('📊 BOQ Activities count:', data?.length || 0);
      }
    });
  
  // Check KPIs
  supabase.from('Planning Database - KPI')
    .select('*')
    .eq('Project Code', projectCode)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error fetching KPIs:', error);
      } else {
        console.log('🔍 KPIs data:', data);
        console.log('📊 KPIs count:', data?.length || 0);
      }
    });
  
  // 4. Check all project codes in each table
  Promise.all([
    supabase.from('Planning Database - ProjectsList').select('Project Code'),
    supabase.from('Planning Database - BOQ Rates').select('Project Code'),
    supabase.from('Planning Database - KPI').select('Project Code')
  ]).then(([projects, boq, kpis]) => {
    console.log('🔍 All Project Codes:');
    console.log('  Projects:', projects.data?.map(p => p['Project Code']) || []);
    console.log('  BOQ Activities:', boq.data?.map(b => b['Project Code']) || []);
    console.log('  KPIs:', kpis.data?.map(k => k['Project Code']) || []);
  });
  
} else {
  console.error('❌ Supabase client not available');
}


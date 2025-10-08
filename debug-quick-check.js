// Quick Debug Check - Run this in browser console for fast results
// This will quickly check the most important data points

console.log('⚡ Quick Debug Check - Supabase Data Source');

// Quick check function
const quickCheck = async () => {
  try {
    // 1. Check if we can access Supabase
    console.log('🔌 Checking Supabase access...');
    
    // Try different ways to access Supabase
    let supabase = null;
    
    // Method 1: Direct window access
    if (window.supabase) {
      supabase = window.supabase;
      console.log('✅ Found Supabase in window.supabase');
    }
    // Method 2: Next.js data
    else if (window.__NEXT_DATA__?.props?.supabase) {
      supabase = window.__NEXT_DATA__.props.supabase;
      console.log('✅ Found Supabase in Next.js data');
    }
    // Method 3: Try to import (if available)
    else {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        // This won't work in browser, but let's try
        console.log('⚠️ Supabase import attempted');
      } catch (e) {
        console.log('❌ Cannot access Supabase client');
      }
    }
    
    if (!supabase) {
      console.log('❌ No Supabase client found');
      console.log('🔍 Available window properties:', Object.keys(window).filter(k => k.includes('supabase')));
      return;
    }
    
    // 2. Quick table check
    console.log('📊 Quick table check...');
    
    const tables = [
      'Planning Database - ProjectsList',
      'Planning Database - BOQ Rates', 
      'Planning Database - KPI'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}:`, error.message);
        } else {
          console.log(`✅ ${table}: ${count} records`);
        }
      } catch (e) {
        console.log(`❌ ${table}: Exception -`, e.message);
      }
    }
    
    // 3. Quick P6060 check
    console.log('🎯 Quick P6060 check...');
    
    try {
      // Check projects
      const { data: projects, error: pError } = await supabase
        .from('Planning Database - ProjectsList')
        .select('*')
        .eq('Project Code', 'P6060');
      
      if (pError) {
        console.log('❌ Projects P6060 error:', pError.message);
      } else {
        console.log(`✅ Projects P6060: ${projects?.length || 0} found`);
        if (projects?.length > 0) {
          console.log('📄 Project data:', projects[0]);
        }
      }
      
      // Check BOQ activities
      const { data: activities, error: aError } = await supabase
        .from('Planning Database - BOQ Rates')
        .select('*')
        .eq('Project Code', 'P6060');
      
      if (aError) {
        console.log('❌ BOQ P6060 error:', aError.message);
      } else {
        console.log(`✅ BOQ P6060: ${activities?.length || 0} found`);
        if (activities?.length > 0) {
          console.log('📄 Activity data:', activities[0]);
        }
      }
      
      // Check KPIs
      const { data: kpis, error: kError } = await supabase
        .from('Planning Database - KPI')
        .select('*')
        .eq('Project Code', 'P6060');
      
      if (kError) {
        console.log('❌ KPIs P6060 error:', kError.message);
      } else {
        console.log(`✅ KPIs P6060: ${kpis?.length || 0} found`);
        if (kpis?.length > 0) {
          console.log('📄 KPI data:', kpis[0]);
        }
      }
      
    } catch (e) {
      console.log('❌ P6060 check exception:', e.message);
    }
    
    // 4. Check current page data
    console.log('📄 Current page check...');
    console.log('📍 URL:', window.location.href);
    
    // Look for any data in the page
    const pageText = document.body.textContent || '';
    const hasP6060 = pageText.includes('P6060');
    const hasABHUDHABI = pageText.includes('ABHUDHABI');
    const hasActivities = pageText.includes('Activities');
    const hasKPIs = pageText.includes('KPIs');
    
    console.log('🔍 Page content check:');
    console.log('  - Contains P6060:', hasP6060 ? '✅' : '❌');
    console.log('  - Contains ABHUDHABI:', hasABHUDHABI ? '✅' : '❌');
    console.log('  - Contains Activities:', hasActivities ? '✅' : '❌');
    console.log('  - Contains KPIs:', hasKPIs ? '✅' : '❌');
    
    console.log('✅ Quick check complete!');
    
  } catch (error) {
    console.error('❌ Quick check failed:', error);
  }
};

// Run quick check
quickCheck();


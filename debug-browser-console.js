// Debug Browser Console - Run this in browser console (F12)
// This will check the actual data being loaded in the website

console.log('🔍 Starting Debug - Checking Website Data Source...');

// 1. Check if we can access the current project data
const checkCurrentProject = () => {
  console.log('📊 Checking current project data...');
  
  // Try to find project data in the DOM or React state
  const projectCards = document.querySelectorAll('[data-project-code]');
  console.log('🔍 Found project cards:', projectCards.length);
  
  // Check for any project-related elements
  const projectElements = document.querySelectorAll('*');
  const projectRelated = Array.from(projectElements).filter(el => 
    el.textContent && (
      el.textContent.includes('P6060') || 
      el.textContent.includes('ABHUDHABI') ||
      el.textContent.includes('Activities') ||
      el.textContent.includes('KPIs')
    )
  );
  
  console.log('🔍 Project-related elements found:', projectRelated.length);
  projectRelated.slice(0, 5).forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent?.substring(0, 100)}...`);
  });
};

// 2. Check React DevTools if available
const checkReactDevTools = () => {
  console.log('⚛️ Checking React DevTools...');
  
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detected');
    
    // Try to find React components
    const reactRoots = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
    console.log('🔍 React renderers:', Object.keys(reactRoots));
  } else {
    console.log('❌ React DevTools not available');
  }
};

// 3. Check for any console logs from the app
const checkConsoleLogs = () => {
  console.log('📝 Checking for app console logs...');
  
  // Override console.log to capture logs
  const originalLog = console.log;
  const logs = [];
  
  console.log = function(...args) {
    logs.push(args.join(' '));
    originalLog.apply(console, args);
  };
  
  // Restore after a short delay
  setTimeout(() => {
    console.log = originalLog;
    console.log('🔍 Captured logs:', logs.length);
    logs.forEach((log, i) => {
      if (log.includes('Activities') || log.includes('KPIs') || log.includes('P6060')) {
        console.log(`  ${i + 1}. ${log}`);
      }
    });
  }, 2000);
};

// 4. Check network requests
const checkNetworkRequests = () => {
  console.log('🌐 Checking network requests...');
  
  // Override fetch to capture requests
  const originalFetch = window.fetch;
  const requests = [];
  
  window.fetch = function(...args) {
    requests.push(args[0]);
    return originalFetch.apply(this, args);
  };
  
  // Restore after a short delay
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('🔍 Captured requests:', requests.length);
    requests.forEach((req, i) => {
      if (req.includes('Planning') || req.includes('BOQ') || req.includes('KPI')) {
        console.log(`  ${i + 1}. ${req}`);
      }
    });
  }, 2000);
};

// 5. Check localStorage and sessionStorage
const checkStorage = () => {
  console.log('💾 Checking storage...');
  
  console.log('🔍 localStorage keys:', Object.keys(localStorage));
  console.log('🔍 sessionStorage keys:', Object.keys(sessionStorage));
  
  // Check for any project-related data
  Object.keys(localStorage).forEach(key => {
    if (key.includes('project') || key.includes('activity') || key.includes('kpi')) {
      console.log(`  localStorage.${key}:`, localStorage.getItem(key)?.substring(0, 100));
    }
  });
};

// 6. Check for any global variables
const checkGlobalVariables = () => {
  console.log('🌍 Checking global variables...');
  
  const globals = Object.keys(window).filter(key => 
    key.includes('project') || 
    key.includes('activity') || 
    key.includes('kpi') ||
    key.includes('supabase')
  );
  
  console.log('🔍 Relevant global variables:', globals);
  globals.forEach(key => {
    try {
      const value = window[key];
      console.log(`  window.${key}:`, typeof value === 'object' ? '[Object]' : value);
    } catch (e) {
      console.log(`  window.${key}: [Error accessing]`);
    }
  });
};

// Run all checks
console.log('🚀 Running all debug checks...');
checkCurrentProject();
checkReactDevTools();
checkConsoleLogs();
checkNetworkRequests();
checkStorage();
checkGlobalVariables();

console.log('✅ Debug complete! Check the logs above for findings.');

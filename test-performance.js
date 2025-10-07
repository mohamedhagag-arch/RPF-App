// Test Performance - Run this in browser console (F12)
// This will help us understand why data is taking time to appear

console.log('🔍 Testing Performance Issues...');

// 1. Check loading times
const checkLoadingTimes = () => {
  console.log('🔍 Checking loading times...');
  
  // Check if there are any loading indicators
  const loadingElements = document.querySelectorAll('*');
  const loadingIndicators = Array.from(loadingElements).filter(el => 
    el.textContent && (
      el.textContent.includes('Loading') ||
      el.textContent.includes('Syncing') ||
      el.textContent.includes('Spinner') ||
      el.className.includes('animate-spin')
    )
  );
  
  console.log('🔍 Found loading indicators:', loadingIndicators.length);
  loadingIndicators.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent || el.className}`);
  });
};

// 2. Check network requests
const checkNetworkRequests = () => {
  console.log('🔍 Checking network requests...');
  
  // Check if we can access performance API
  if (window.performance && window.performance.getEntriesByType) {
    const networkEntries = window.performance.getEntriesByType('resource');
    const supabaseRequests = networkEntries.filter(entry => 
      entry.name.includes('supabase') || 
      entry.name.includes('Planning Database')
    );
    
    console.log('🔍 Found Supabase requests:', supabaseRequests.length);
    supabaseRequests.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  } else {
    console.log('❌ Performance API not available');
  }
};

// 3. Check for console errors
const checkConsoleErrors = () => {
  console.log('🔍 Checking for console errors...');
  
  // Override console.error to capture errors
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // Restore after a short delay
  setTimeout(() => {
    console.error = originalError;
    console.log('🔍 Captured errors:', errors.length);
    errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }, 2000);
};

// 4. Check React component rendering
const checkReactRendering = () => {
  console.log('🔍 Checking React component rendering...');
  
  // Look for project cards
  const projectCards = document.querySelectorAll('[class*="card"], [class*="Card"]');
  console.log('🔍 Found project cards:', projectCards.length);
  
  // Check if cards have data
  projectCards.forEach((card, i) => {
    const text = card.textContent || '';
    const hasRealData = (
      text.includes('Activities') && !text.includes('0 Activities') ||
      text.includes('KPIs') && !text.includes('0 KPIs') ||
      text.includes('Progress') && !text.includes('0.0%')
    );
    
    console.log(`  Card ${i + 1}: ${hasRealData ? '✅ Has real data' : '❌ No real data'}`);
  });
};

// 5. Check for slow operations
const checkSlowOperations = () => {
  console.log('🔍 Checking for slow operations...');
  
  // Check if there are any long-running operations
  const startTime = performance.now();
  
  // Simulate a check
  setTimeout(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`🔍 Check duration: ${duration.toFixed(2)}ms`);
    
    if (duration > 100) {
      console.warn('⚠️ Slow operation detected!');
    } else {
      console.log('✅ Operations are fast');
    }
  }, 100);
};

// Run all checks
console.log('🚀 Running performance tests...');
checkLoadingTimes();
checkNetworkRequests();
checkConsoleErrors();
checkReactRendering();
checkSlowOperations();

console.log('✅ Performance test complete!');
console.log('🔍 Expected results:');
console.log('  - Loading indicators should be minimal');
console.log('  - Network requests should be fast (< 1000ms)');
console.log('  - No console errors');
console.log('  - Project cards should show real data');
console.log('  - Operations should be fast (< 100ms)');

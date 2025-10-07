// Test Project Card Fix - Run this in browser console (F12)
// This will help us verify that the project card fix is working

console.log('🔍 Testing Project Card Fix...');

// 1. Check if project cards are showing real data
const checkProjectCards = () => {
  console.log('🔍 Checking project cards for real data...');
  
  // Look for project cards in the DOM
  const projectCards = document.querySelectorAll('[class*="card"], [class*="Card"]');
  console.log('🔍 Found project cards:', projectCards.length);
  
  // Look for specific project P6060
  const p6060Elements = document.querySelectorAll('*');
  const p6060Cards = Array.from(p6060Elements).filter(el => 
    el.textContent && el.textContent.includes('P6060')
  );
  
  console.log('🔍 Found P6060 elements:', p6060Cards.length);
  
  // Check for real data indicators
  const realDataIndicators = [
    'Activities',
    'KPIs', 
    'Progress',
    'ABHUDHABI'
  ];
  
  realDataIndicators.forEach(indicator => {
    const elements = Array.from(p6060Elements).filter(el => 
      el.textContent && el.textContent.includes(indicator)
    );
    console.log(`🔍 Found "${indicator}" elements:`, elements.length);
    
    if (elements.length > 0) {
      elements.slice(0, 2).forEach((el, i) => {
        console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent?.substring(0, 100)}...`);
      });
    }
  });
};

// 2. Check console logs for analytics
const checkConsoleLogs = () => {
  console.log('🔍 Checking for analytics console logs...');
  
  // Look for recent console logs (this is a simplified check)
  console.log('🔍 Look for these log patterns in the console:');
  console.log('  - "🔍 ProjectCard Analytics for P6060"');
  console.log('  - "✅ Analytics available for P6060"');
  console.log('  - "📊 Fetching analytics directly for P6060"');
  console.log('  - "✅ Direct fetch: X activities, Y KPIs for P6060"');
};

// 3. Check for loading states
const checkLoadingStates = () => {
  console.log('🔍 Checking for loading states...');
  
  const loadingElements = document.querySelectorAll('*');
  const loadingIndicators = Array.from(loadingElements).filter(el => 
    el.textContent && (
      el.textContent.includes('Loading analytics') ||
      el.textContent.includes('Syncing') ||
      el.textContent.includes('Loading...')
    )
  );
  
  console.log('🔍 Found loading indicators:', loadingIndicators.length);
  loadingIndicators.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent}`);
  });
};

// 4. Check for error messages
const checkErrorMessages = () => {
  console.log('🔍 Checking for error messages...');
  
  const errorElements = document.querySelectorAll('*');
  const errorIndicators = Array.from(errorElements).filter(el => 
    el.textContent && (
      el.textContent.includes('Error') ||
      el.textContent.includes('Failed') ||
      el.textContent.includes('No analytics available')
    )
  );
  
  console.log('🔍 Found error indicators:', errorIndicators.length);
  errorIndicators.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent}`);
  });
};

// 5. Check for real data values (not zeros)
const checkRealDataValues = () => {
  console.log('🔍 Checking for real data values (not zeros)...');
  
  const allElements = document.querySelectorAll('*');
  const realDataElements = Array.from(allElements).filter(el => {
    const text = el.textContent || '';
    return (
      text.includes('Activities') && !text.includes('0 Activities') ||
      text.includes('KPIs') && !text.includes('0 KPIs') ||
      text.includes('Progress') && !text.includes('0.0%')
    );
  });
  
  console.log('🔍 Found elements with real data (not zeros):', realDataElements.length);
  realDataElements.slice(0, 5).forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent?.substring(0, 100)}...`);
  });
};

// Run all checks
console.log('🚀 Running all checks...');
checkProjectCards();
checkConsoleLogs();
checkLoadingStates();
checkErrorMessages();
checkRealDataValues();

console.log('✅ Test complete!');
console.log('🔍 Expected results:');
console.log('  - Project cards should show real data (not 0 Activities, 0 KPIs, 0.0% Progress)');
console.log('  - Console should show analytics logs for P6060');
console.log('  - No error messages should be present');
console.log('  - Loading states should be minimal');

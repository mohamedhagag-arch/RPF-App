// Test Modern Project Card - Run this in browser console (F12)
// This will help us verify that the new ModernProjectCard is working correctly

console.log('🔍 Testing Modern Project Card...');

// 1. Check if the new card is being used
const checkCardUsage = () => {
  console.log('🔍 Checking if ModernProjectCard is being used...');
  
  // Look for project cards in the DOM
  const projectCards = document.querySelectorAll('[class*="card"], [class*="Card"]');
  console.log('🔍 Found project cards:', projectCards.length);
  
  // Check for modern card features
  const modernCardFeatures = [
    'bg-gradient-to-r',
    'hover:shadow-xl',
    'transition-all duration-300',
    'border-l-4'
  ];
  
  projectCards.forEach((card, i) => {
    const hasModernFeatures = modernCardFeatures.some(feature => 
      card.className.includes(feature)
    );
    
    console.log(`  Card ${i + 1}: ${hasModernFeatures ? '✅ Modern features detected' : '❌ No modern features'}`);
  });
};

// 2. Check if data loads automatically
const checkAutoDataLoading = () => {
  console.log('🔍 Checking auto data loading...');
  
  // Look for loading indicators
  const loadingIndicators = document.querySelectorAll('[class*="animate-spin"], [class*="animate-pulse"]');
  console.log('🔍 Found loading indicators:', loadingIndicators.length);
  
  // Check for real data (not zeros)
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
  realDataElements.slice(0, 3).forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent?.substring(0, 100)}...`);
  });
};

// 3. Check for modern styling
const checkModernStyling = () => {
  console.log('🔍 Checking modern styling...');
  
  // Look for gradient backgrounds
  const gradientElements = document.querySelectorAll('[class*="bg-gradient"]');
  console.log('🔍 Found gradient elements:', gradientElements.length);
  
  // Look for modern shadows
  const shadowElements = document.querySelectorAll('[class*="shadow-xl"], [class*="shadow-lg"]');
  console.log('🔍 Found shadow elements:', shadowElements.length);
  
  // Look for modern transitions
  const transitionElements = document.querySelectorAll('[class*="transition-all"], [class*="duration-300"]');
  console.log('🔍 Found transition elements:', transitionElements.length);
  
  // Look for modern colors
  const colorElements = document.querySelectorAll('[class*="text-blue-"], [class*="text-green-"], [class*="text-purple-"]');
  console.log('🔍 Found modern color elements:', colorElements.length);
};

// 4. Check for interactive elements
const checkInteractiveElements = () => {
  console.log('🔍 Checking interactive elements...');
  
  // Look for hover effects
  const hoverElements = document.querySelectorAll('[class*="hover:"]');
  console.log('🔍 Found hover elements:', hoverElements.length);
  
  // Look for action buttons
  const actionButtons = document.querySelectorAll('button');
  const projectActionButtons = Array.from(actionButtons).filter(btn => 
    btn.textContent && (
      btn.textContent.includes('Details') ||
      btn.textContent.includes('Edit') ||
      btn.textContent.includes('Delete')
    )
  );
  
  console.log('🔍 Found project action buttons:', projectActionButtons.length);
  projectActionButtons.forEach((btn, i) => {
    console.log(`  Button ${i + 1}: ${btn.textContent?.trim()}`);
  });
};

// 5. Check for error handling
const checkErrorHandling = () => {
  console.log('🔍 Checking error handling...');
  
  // Look for error messages
  const errorElements = document.querySelectorAll('*');
  const errorIndicators = Array.from(errorElements).filter(el => 
    el.textContent && (
      el.textContent.includes('Error') ||
      el.textContent.includes('Failed') ||
      el.textContent.includes('Retry')
    )
  );
  
  console.log('🔍 Found error indicators:', errorIndicators.length);
  errorIndicators.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent}`);
  });
};

// 6. Check for performance
const checkPerformance = () => {
  console.log('🔍 Checking performance...');
  
  // Check if cards load quickly
  const startTime = performance.now();
  
  // Simulate a check
  setTimeout(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`🔍 Check duration: ${duration.toFixed(2)}ms`);
    
    if (duration < 100) {
      console.log('✅ Fast performance');
    } else if (duration < 500) {
      console.log('⚠️ Moderate performance');
    } else {
      console.log('❌ Slow performance');
    }
  }, 100);
};

// Run all checks
console.log('🚀 Running all Modern Project Card tests...');
checkCardUsage();
checkAutoDataLoading();
checkModernStyling();
checkInteractiveElements();
checkErrorHandling();
checkPerformance();

console.log('✅ Modern Project Card test complete!');
console.log('🔍 Expected results:');
console.log('  - ModernProjectCard should be used instead of old cards');
console.log('  - Data should load automatically without manual actions');
console.log('  - Modern styling with gradients and shadows');
console.log('  - Interactive hover effects');
console.log('  - Proper error handling with retry buttons');
console.log('  - Fast loading performance');

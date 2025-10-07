// Test BOQ Filters and Multi-Select - Run this in browser console (F12)
// This will help us identify issues with filtering and multi-select in BOQ page

console.log('🔍 Testing BOQ Filters and Multi-Select...');

// 1. Check if SmartFilter component is present
const checkSmartFilter = () => {
  console.log('🔍 Checking SmartFilter component...');
  
  // Look for filter buttons
  const filterButtons = document.querySelectorAll('button');
  const smartFilterButtons = Array.from(filterButtons).filter(btn => 
    btn.textContent && (
      btn.textContent.includes('Projects') ||
      btn.textContent.includes('Activities') ||
      btn.textContent.includes('Type') ||
      btn.textContent.includes('Status')
    )
  );
  
  console.log('🔍 Found Smart Filter buttons:', smartFilterButtons.length);
  
  // Check if buttons are clickable
  smartFilterButtons.forEach((btn, i) => {
    const isDisabled = btn.disabled;
    const hasClickHandler = btn.onclick !== null;
    console.log(`  Button ${i + 1} (${btn.textContent?.trim()}): ${isDisabled ? '❌ Disabled' : '✅ Enabled'} - ${hasClickHandler ? 'Has click handler' : 'No click handler'}`);
  });
};

// 2. Check if dropdowns work
const checkDropdowns = () => {
  console.log('🔍 Checking dropdown functionality...');
  
  // Look for dropdown containers
  const dropdowns = document.querySelectorAll('[class*="absolute"], [class*="z-50"]');
  console.log('🔍 Found dropdown containers:', dropdowns.length);
  
  // Check if dropdowns have proper styling
  dropdowns.forEach((dropdown, i) => {
    const isVisible = dropdown.offsetParent !== null;
    const hasShadow = dropdown.className.includes('shadow');
    const hasBorder = dropdown.className.includes('border');
    
    console.log(`  Dropdown ${i + 1}: ${isVisible ? '✅ Visible' : '❌ Hidden'} - ${hasShadow ? 'Has shadow' : 'No shadow'} - ${hasBorder ? 'Has border' : 'No border'}`);
  });
};

// 3. Check if multi-select checkboxes work
const checkMultiSelect = () => {
  console.log('🔍 Checking multi-select checkboxes...');
  
  // Look for checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  console.log('🔍 Found checkboxes:', checkboxes.length);
  
  // Check table checkboxes specifically
  const tableCheckboxes = Array.from(checkboxes).filter(cb => 
    cb.closest('table') !== null
  );
  
  console.log('🔍 Found table checkboxes:', tableCheckboxes.length);
  
  // Check if checkboxes are functional
  tableCheckboxes.forEach((checkbox, i) => {
    const isChecked = checkbox.checked;
    const isDisabled = checkbox.disabled;
    const hasChangeHandler = checkbox.onchange !== null;
    
    console.log(`  Checkbox ${i + 1}: ${isChecked ? '✅ Checked' : '❌ Unchecked'} - ${isDisabled ? '❌ Disabled' : '✅ Enabled'} - ${hasChangeHandler ? 'Has handler' : 'No handler'}`);
  });
};

// 4. Check if bulk actions toolbar appears
const checkBulkActions = () => {
  console.log('🔍 Checking bulk actions toolbar...');
  
  // Look for bulk actions toolbar
  const bulkToolbars = document.querySelectorAll('[class*="bg-blue-50"], [class*="selected"]');
  const bulkActionElements = Array.from(bulkToolbars).filter(el => 
    el.textContent && (
      el.textContent.includes('selected') ||
      el.textContent.includes('Delete Selected') ||
      el.textContent.includes('Clear Selection')
    )
  );
  
  console.log('🔍 Found bulk action elements:', bulkActionElements.length);
  
  if (bulkActionElements.length > 0) {
    console.log('✅ Bulk actions toolbar is present');
    bulkActionElements.forEach((el, i) => {
      console.log(`  Toolbar ${i + 1}: ${el.textContent?.substring(0, 100)}...`);
    });
  } else {
    console.log('❌ No bulk actions toolbar found');
  }
};

// 5. Check if filter state is maintained
const checkFilterState = () => {
  console.log('🔍 Checking filter state...');
  
  // Look for active filter pills
  const filterPills = document.querySelectorAll('[class*="inline-flex"], [class*="px-2"], [class*="py-1"]');
  const activePills = Array.from(filterPills).filter(pill => 
    pill.textContent && (
      pill.textContent.includes('P6060') ||
      pill.textContent.includes('Active') ||
      pill.textContent.includes('Planned') ||
      pill.textContent.includes('Infrastructure')
    )
  );
  
  console.log('🔍 Found active filter pills:', activePills.length);
  
  activePills.forEach((pill, i) => {
    const hasCloseButton = pill.querySelector('button, svg');
    console.log(`  Pill ${i + 1}: ${pill.textContent?.trim()} - ${hasCloseButton ? '✅ Has close button' : '❌ No close button'}`);
  });
};

// 6. Check if data updates when filters change
const checkDataUpdates = () => {
  console.log('🔍 Checking data updates...');
  
  // Look for table rows
  const tableRows = document.querySelectorAll('tbody tr');
  console.log('🔍 Found table rows:', tableRows.length);
  
  // Check if rows have proper data
  tableRows.forEach((row, i) => {
    const cells = row.querySelectorAll('td');
    const hasData = cells.length > 0;
    const hasCheckbox = row.querySelector('input[type="checkbox"]') !== null;
    
    console.log(`  Row ${i + 1}: ${hasData ? '✅ Has data' : '❌ No data'} - ${hasCheckbox ? '✅ Has checkbox' : '❌ No checkbox'}`);
  });
};

// 7. Test filter interactions
const testFilterInteractions = () => {
  console.log('🔍 Testing filter interactions...');
  
  // Try to click on filter buttons
  const filterButtons = document.querySelectorAll('button');
  const smartFilterButtons = Array.from(filterButtons).filter(btn => 
    btn.textContent && btn.textContent.includes('Projects')
  );
  
  if (smartFilterButtons.length > 0) {
    console.log('🔍 Testing Projects filter button...');
    const projectsButton = smartFilterButtons[0];
    
    // Simulate click
    try {
      projectsButton.click();
      console.log('✅ Projects filter button clicked successfully');
      
      // Check if dropdown opened
      setTimeout(() => {
        const dropdowns = document.querySelectorAll('[class*="absolute"], [class*="z-50"]');
        const visibleDropdowns = Array.from(dropdowns).filter(d => d.offsetParent !== null);
        console.log(`🔍 Dropdowns visible after click: ${visibleDropdowns.length}`);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error clicking Projects filter button:', error);
    }
  } else {
    console.log('❌ No Projects filter button found');
  }
};

// 8. Check for console errors
const checkConsoleErrors = () => {
  console.log('🔍 Checking for console errors...');
  
  // This will be visible in the console
  console.log('✅ Console check complete - any errors above this line are from the application');
};

// Run all tests
console.log('🚀 Running all BOQ filter and multi-select tests...');
checkSmartFilter();
checkDropdowns();
checkMultiSelect();
checkBulkActions();
checkFilterState();
checkDataUpdates();
testFilterInteractions();
checkConsoleErrors();

console.log('✅ BOQ filter and multi-select tests complete!');
console.log('🔍 Expected results:');
console.log('  - Smart Filter buttons should be clickable');
console.log('  - Dropdowns should open and close properly');
console.log('  - Checkboxes should work for multi-select');
console.log('  - Bulk actions toolbar should appear when items are selected');
console.log('  - Filter state should be maintained');
console.log('  - Data should update when filters change');
console.log('  - No console errors should be present');

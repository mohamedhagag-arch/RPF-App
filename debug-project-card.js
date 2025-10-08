// Debug Project Card Data - Run this in browser console
// This will specifically check the project card data and analytics

console.log('🎯 Debugging Project Card Data...');

// 1. Find the project card element
const findProjectCard = () => {
  console.log('🔍 Looking for project card...');
  
  // Look for elements containing project info
  const possibleSelectors = [
    '[data-project-code]',
    '.project-card',
    '.card',
    '[class*="project"]',
    '[class*="card"]'
  ];
  
  let projectCard = null;
  
  for (const selector of possibleSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found elements with selector: ${selector} (${elements.length} elements)`);
      projectCard = elements[0];
      break;
    }
  }
  
  if (!projectCard) {
    // Try to find by text content
    const allElements = document.querySelectorAll('*');
    projectCard = Array.from(allElements).find(el => 
      el.textContent && (
        el.textContent.includes('ABHUDHABI') || 
        el.textContent.includes('P6060')
      )
    );
  }
  
  if (projectCard) {
    console.log('✅ Found project card:', projectCard);
    console.log('📄 Card HTML:', projectCard.outerHTML.substring(0, 500) + '...');
    return projectCard;
  } else {
    console.log('❌ Project card not found');
    return null;
  }
};

// 2. Extract data from the card
const extractCardData = (card) => {
  if (!card) return null;
  
  console.log('📊 Extracting data from card...');
  
  const data = {
    projectName: null,
    projectCode: null,
    activities: null,
    kpis: null,
    progress: null,
    contractAmount: null
  };
  
  // Look for project name
  const nameElements = card.querySelectorAll('*');
  const nameElement = Array.from(nameElements).find(el => 
    el.textContent && el.textContent.includes('ABHUDHABI')
  );
  if (nameElement) {
    data.projectName = nameElement.textContent.trim();
    console.log('✅ Project name found:', data.projectName);
  }
  
  // Look for project code
  const codeElement = Array.from(nameElements).find(el => 
    el.textContent && el.textContent.includes('P6060')
  );
  if (codeElement) {
    data.projectCode = codeElement.textContent.trim();
    console.log('✅ Project code found:', data.projectCode);
  }
  
  // Look for activities count
  const activitiesElements = Array.from(nameElements).filter(el => 
    el.textContent && el.textContent.includes('Activities')
  );
  if (activitiesElements.length > 0) {
    const activitiesText = activitiesElements[0].textContent;
    const match = activitiesText.match(/(\d+)\s*Activities/);
    if (match) {
      data.activities = parseInt(match[1]);
      console.log('✅ Activities count found:', data.activities);
    }
  }
  
  // Look for KPIs count
  const kpisElements = Array.from(nameElements).filter(el => 
    el.textContent && el.textContent.includes('KPIs')
  );
  if (kpisElements.length > 0) {
    const kpisText = kpisElements[0].textContent;
    const match = kpisText.match(/(\d+)\s*KPIs/);
    if (match) {
      data.kpis = parseInt(match[1]);
      console.log('✅ KPIs count found:', data.kpis);
    }
  }
  
  // Look for progress
  const progressElements = Array.from(nameElements).filter(el => 
    el.textContent && el.textContent.includes('%')
  );
  if (progressElements.length > 0) {
    const progressText = progressElements[0].textContent;
    const match = progressText.match(/(\d+\.?\d*)%/);
    if (match) {
      data.progress = parseFloat(match[1]);
      console.log('✅ Progress found:', data.progress + '%');
    }
  }
  
  // Look for contract amount
  const contractElements = Array.from(nameElements).filter(el => 
    el.textContent && el.textContent.includes('$')
  );
  if (contractElements.length > 0) {
    const contractText = contractElements[0].textContent;
    const match = contractText.match(/\$([\d,]+)/);
    if (match) {
      data.contractAmount = match[1];
      console.log('✅ Contract amount found:', '$' + data.contractAmount);
    }
  }
  
  return data;
};

// 3. Check for React props/state
const checkReactData = (card) => {
  console.log('⚛️ Checking React data...');
  
  if (!card) return;
  
  // Try to find React fiber
  const reactKey = Object.keys(card).find(key => key.startsWith('__reactFiber'));
  if (reactKey) {
    console.log('✅ React fiber found');
    const fiber = card[reactKey];
    
    // Try to traverse React tree
    let current = fiber;
    let depth = 0;
    const maxDepth = 10;
    
    while (current && depth < maxDepth) {
      if (current.memoizedProps) {
        const props = current.memoizedProps;
        if (props.project || props.analytics || props.activities || props.kpis) {
          console.log(`🔍 React props at depth ${depth}:`, props);
        }
      }
      
      if (current.memoizedState) {
        const state = current.memoizedState;
        if (state.project || state.analytics || state.activities || state.kpis) {
          console.log(`🔍 React state at depth ${depth}:`, state);
        }
      }
      
      current = current.child;
      depth++;
    }
  } else {
    console.log('❌ React fiber not found');
  }
};

// 4. Check for any data attributes
const checkDataAttributes = (card) => {
  console.log('🏷️ Checking data attributes...');
  
  if (!card) return;
  
  const dataAttrs = {};
  for (let i = 0; i < card.attributes.length; i++) {
    const attr = card.attributes[i];
    if (attr.name.startsWith('data-')) {
      dataAttrs[attr.name] = attr.value;
    }
  }
  
  console.log('🔍 Data attributes:', dataAttrs);
  
  // Check all elements for data attributes
  const allElements = card.querySelectorAll('*');
  allElements.forEach(el => {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name.startsWith('data-') && (
        attr.name.includes('project') || 
        attr.name.includes('activity') || 
        attr.name.includes('kpi')
      )) {
        console.log(`🔍 Found data attribute: ${attr.name} = ${attr.value}`);
      }
    }
  });
};

// Run the debug
console.log('🚀 Starting project card debug...');

const card = findProjectCard();
const cardData = extractCardData(card);
checkReactData(card);
checkDataAttributes(card);

console.log('📊 Final card data:', cardData);
console.log('✅ Project card debug complete!');


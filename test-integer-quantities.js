// Test Integer Quantities - Run this in browser console (F12)
// This will help us verify that KPI quantities are now integers

console.log('🔍 Testing Integer Quantities in KPI Generation...');

// Test scenarios
const testScenarios = [
  {
    name: 'Perfect Division',
    totalQuantity: 100,
    workdays: 5,
    expected: [20, 20, 20, 20, 20],
    totalExpected: 100
  },
  {
    name: 'With Remainder',
    totalQuantity: 100,
    workdays: 3,
    expected: [34, 33, 33], // 34 + 33 + 33 = 100
    totalExpected: 100
  },
  {
    name: 'Small Quantity',
    totalQuantity: 5,
    workdays: 3,
    expected: [2, 2, 1], // 2 + 2 + 1 = 5
    totalExpected: 5
  },
  {
    name: 'Single Day',
    totalQuantity: 50,
    workdays: 1,
    expected: [50],
    totalExpected: 50
  },
  {
    name: 'Large Remainder',
    totalQuantity: 1000,
    workdays: 7,
    expected: [143, 143, 143, 143, 143, 143, 142], // 143*6 + 142 = 1000
    totalExpected: 1000
  }
];

// Function to test quantity distribution
function testQuantityDistribution(totalQuantity, workdays) {
  const baseQuantityPerDay = Math.round(totalQuantity / workdays);
  const remainder = totalQuantity - (baseQuantityPerDay * workdays);
  
  const distribution = [];
  for (let i = 0; i < workdays; i++) {
    const extraQuantity = i < remainder ? 1 : 0;
    const finalQuantity = baseQuantityPerDay + extraQuantity;
    distribution.push(finalQuantity);
  }
  
  return {
    distribution,
    total: distribution.reduce((sum, qty) => sum + qty, 0),
    baseQuantityPerDay,
    remainder
  };
}

// Run tests
console.log('🧪 Running quantity distribution tests...');

testScenarios.forEach((scenario, index) => {
  console.log(`\n📊 Test ${index + 1}: ${scenario.name}`);
  console.log(`   Input: ${scenario.totalQuantity} units over ${scenario.workdays} days`);
  
  const result = testQuantityDistribution(scenario.totalQuantity, scenario.workdays);
  
  console.log(`   Distribution: [${result.distribution.join(', ')}]`);
  console.log(`   Total: ${result.total} (expected: ${scenario.totalExpected})`);
  console.log(`   Base per day: ${result.baseQuantityPerDay}, Remainder: ${result.remainder}`);
  
  // Verify results
  const totalCorrect = result.total === scenario.totalExpected;
  const allIntegers = result.distribution.every(qty => Number.isInteger(qty));
  const distributionCorrect = JSON.stringify(result.distribution) === JSON.stringify(scenario.expected);
  
  console.log(`   ✅ Total correct: ${totalCorrect ? 'YES' : 'NO'}`);
  console.log(`   ✅ All integers: ${allIntegers ? 'YES' : 'NO'}`);
  console.log(`   ✅ Distribution correct: ${distributionCorrect ? 'YES' : 'NO'}`);
  
  if (totalCorrect && allIntegers && distributionCorrect) {
    console.log(`   🎉 Test PASSED!`);
  } else {
    console.log(`   ❌ Test FAILED!`);
  }
});

// Test edge cases
console.log('\n🔍 Testing edge cases...');

const edgeCases = [
  { total: 0, days: 5, description: 'Zero quantity' },
  { total: 1, days: 10, description: 'Small quantity, many days' },
  { total: 100, days: 100, description: 'One per day' },
  { total: 999, days: 3, description: 'Large remainder' }
];

edgeCases.forEach((testCase, index) => {
  console.log(`\n📊 Edge Case ${index + 1}: ${testCase.description}`);
  console.log(`   Input: ${testCase.total} units over ${testCase.days} days`);
  
  const result = testQuantityDistribution(testCase.total, testCase.days);
  
  console.log(`   Distribution: [${result.distribution.join(', ')}]`);
  console.log(`   Total: ${result.total}`);
  console.log(`   All integers: ${result.distribution.every(qty => Number.isInteger(qty)) ? 'YES' : 'NO'}`);
  console.log(`   Total matches: ${result.total === testCase.total ? 'YES' : 'NO'}`);
});

console.log('\n✅ Integer quantity tests complete!');
console.log('🔍 Expected results:');
console.log('  - All quantities should be integers (no decimals)');
console.log('  - Total should always match the original quantity');
console.log('  - Remainder should be distributed to first few days');
console.log('  - No quantity should be 0 unless total is 0');

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkDistribution() {
  console.log('📊 Checking KPI Distribution...\n')
  
  // Get all KPIs from Combined view
  const { data: allKPIs, error } = await supabase
    .from('Planning Database - KPI Combined')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100) // Get first 100
  
  if (error) {
    console.log('❌ Error:', error.message)
    return
  }
  
  console.log(`✅ Fetched ${allKPIs.length} records\n`)
  
  // Count by Input Type
  const byType = allKPIs.reduce((acc, kpi) => {
    const type = kpi['Input Type'] || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  
  console.log('📈 Distribution in first 100 records:')
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count} (${((count/allKPIs.length)*100).toFixed(1)}%)`)
  }
  
  console.log('\n🔍 Sample records:')
  console.log('First 5 Planned:')
  const planned = allKPIs.filter(k => k['Input Type'] === 'Planned').slice(0, 5)
  planned.forEach((k, i) => {
    console.log(`   ${i+1}. ${k['Activity Name']} - ${k['Project Full Code']} - Qty: ${k['Quantity']}`)
  })
  
  console.log('\nFirst 5 Actual:')
  const actual = allKPIs.filter(k => k['Input Type'] === 'Actual').slice(0, 5)
  actual.forEach((k, i) => {
    console.log(`   ${i+1}. ${k['Activity Name']} - ${k['Project Full Code']} - Qty: ${k['Quantity']}`)
  })
  
  // Check total counts
  console.log('\n📊 Total counts in database:')
  const { count: plannedCount } = await supabase
    .from('Planning Database - KPI Planned')
    .select('*', { count: 'exact', head: true })
  const { count: actualCount } = await supabase
    .from('Planning Database - KPI Actual')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Planned: ${plannedCount}`)
  console.log(`   Actual: ${actualCount}`)
  console.log(`   Total: ${plannedCount + actualCount}`)
}

checkDistribution()


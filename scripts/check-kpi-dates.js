const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkDates() {
  console.log('📅 Checking Date Fields in KPI Tables...\n')
  
  // Check Planned table structure
  console.log('🔍 KPI Planned Table:')
  const { data: plannedSample } = await supabase
    .from('Planning Database - KPI Planned')
    .select('*')
    .limit(1)
  
  if (plannedSample && plannedSample[0]) {
    console.log('   Columns:', Object.keys(plannedSample[0]))
    console.log('   Sample:', plannedSample[0])
  }
  
  console.log('\n🔍 KPI Actual Table:')
  const { data: actualSample } = await supabase
    .from('Planning Database - KPI Actual')
    .select('*')
    .limit(1)
  
  if (actualSample && actualSample[0]) {
    console.log('   Columns:', Object.keys(actualSample[0]))
    console.log('   Sample:', actualSample[0])
  }
  
  console.log('\n🔍 KPI Combined View:')
  const { data: combinedSample } = await supabase
    .from('Planning Database - KPI Combined')
    .select('*')
    .limit(1)
  
  if (combinedSample && combinedSample[0]) {
    console.log('   Columns:', Object.keys(combinedSample[0]))
    console.log('   Sample:', combinedSample[0])
  }
  
  // Check if old KPI table still exists
  console.log('\n🔍 Checking Old KPI Table:')
  const { data: oldSample, error: oldError } = await supabase
    .from('Planning Database - KPI')
    .select('*')
    .limit(1)
  
  if (oldError) {
    console.log('   ❌ Table not accessible or not found')
  } else if (oldSample && oldSample[0]) {
    console.log('   ✅ Old table still exists!')
    console.log('   Columns:', Object.keys(oldSample[0]))
    console.log('   Has date fields?', Object.keys(oldSample[0]).filter(k => k.toLowerCase().includes('date')))
  }
}

checkDates()


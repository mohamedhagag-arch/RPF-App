const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

console.log('📁 Env file check...')
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing')
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing')
console.log('')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('❌ Missing environment variables!')
  console.log('Please check .env.local file')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTables() {
  console.log('🔍 Checking KPI tables in Supabase...\n')
  
  const tables = [
    'Planning Database - KPI Planned',
    'Planning Database - KPI Actual', 
    'Planning Database - KPI Combined'
  ]
  
  for (const tableName of tables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ ${tableName}:`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ ${tableName}: ${count || 0} records`)
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`)
    }
  }
  
  // Also check if view returns Input Type
  console.log('\n🔍 Checking if Combined view has Input Type field...')
  try {
    const { data, error } = await supabase
      .from('Planning Database - KPI Combined')
      .select('*')
      .limit(5)
    
    if (error) {
      console.log('❌ Error:', error.message)
    } else if (data && data.length > 0) {
      console.log('✅ Sample record columns:', Object.keys(data[0]))
      console.log('✅ Has Input Type?', data[0]['Input Type'] ? 'YES' : 'NO')
      if (data[0]['Input Type']) {
        const types = data.map(r => r['Input Type'])
        console.log('✅ Input Types found:', [...new Set(types)].join(', '))
      }
    } else {
      console.log('⚠️ No data in Combined view')
    }
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

checkTables()


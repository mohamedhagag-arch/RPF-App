const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function updateView() {
  console.log('📅 Updating KPI Combined View to include dates...\n')
  
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'lib', 'database-kpi-split-schema-with-dates.sql'),
    'utf8'
  )
  
  console.log('📝 SQL to execute:')
  console.log(sql)
  console.log('\n⚠️  Note: This requires admin/service role access')
  console.log('Run this SQL manually in Supabase SQL Editor if this script fails.\n')
  
  try {
    // Note: This might fail if using anon key
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.log('❌ Error executing SQL:', error.message)
      console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:')
      console.log('1. Go to Supabase Dashboard')
      console.log('2. Open SQL Editor')
      console.log('3. Copy and paste the SQL from: lib/database-kpi-split-schema-with-dates.sql')
      console.log('4. Run it')
    } else {
      console.log('✅ View updated successfully!')
    }
  } catch (err) {
    console.log('❌ Error:', err.message)
    console.log('\n📋 Please run the SQL manually in Supabase SQL Editor')
    console.log('File: lib/database-kpi-split-schema-with-dates.sql')
  }
  
  console.log('\n🔍 Verifying updated view...')
  try {
    const { data: sample } = await supabase
      .from('Planning Database - KPI Combined')
      .select('*')
      .limit(1)
    
    if (sample && sample[0]) {
      console.log('\n✅ View columns:', Object.keys(sample[0]))
      const hasActivityDate = 'Activity Date' in sample[0]
      const hasTargetDate = 'Target Date' in sample[0]
      const hasActualDate = 'Actual Date' in sample[0]
      
      console.log('\n📊 Date fields check:')
      console.log('   Activity Date:', hasActivityDate ? '✅ Found' : '❌ Missing')
      console.log('   Target Date:', hasTargetDate ? '✅ Found' : '❌ Missing')
      console.log('   Actual Date:', hasActualDate ? '✅ Found' : '❌ Missing')
      
      if (hasActivityDate && hasTargetDate && hasActualDate) {
        console.log('\n🎉 All date fields are present!')
      } else {
        console.log('\n⚠️  Some date fields are missing. Please run SQL manually.')
      }
    }
  } catch (err) {
    console.log('❌ Error verifying:', err.message)
  }
}

updateView()


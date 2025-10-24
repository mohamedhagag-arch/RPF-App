/**
 * Clean and Migrate KPI data properly
 * 1. Clear existing data in new tables
 * 2. Fetch ALL records from old table (no limit)
 * 3. Migrate to new tables
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TABLES = {
  KPI_OLD: 'Planning Database - KPI',
  KPI_PLANNED: 'Planning Database - KPI Planned',
  KPI_ACTUAL: 'Planning Database - KPI Actual'
}

async function cleanAndMigrate() {
  console.log('\n==============================================')
  console.log('🔄 Clean & Migrate KPI Data')
  console.log('==============================================\n')
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    // Step 1: Clean existing data in new tables
    console.log('1️⃣ Cleaning existing data in new tables...')
    
    const [deleteP, deleteA] = await Promise.all([
      supabase.from(TABLES.KPI_PLANNED).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from(TABLES.KPI_ACTUAL).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ])
    
    console.log('✅ Cleaned old data')
    
    // Step 2: Fetch ALL KPI data (using pagination to get all records)
    console.log('\n2️⃣ Fetching ALL data from old KPI table...')
    
    let allKPIs = []
    let from = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error } = await supabase
        .from(TABLES.KPI_OLD)
        .select('*')
        .range(from, from + pageSize - 1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        allKPIs = allKPIs.concat(data)
        console.log(`   Fetched ${allKPIs.length} records so far...`)
        from += pageSize
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    console.log(`✅ Fetched total: ${allKPIs.length} KPI records`)
    
    // Step 3: Separate Planned and Actual
    console.log('\n3️⃣ Separating Planned and Actual...')
    
    const plannedKPIs = allKPIs.filter(k => k['Input Type'] === 'Planned')
    const actualKPIs = allKPIs.filter(k => k['Input Type'] === 'Actual')
    
    console.log(`📊 Planned KPIs: ${plannedKPIs.length}`)
    console.log(`📊 Actual KPIs: ${actualKPIs.length}`)
    console.log(`📊 Sum: ${plannedKPIs.length + actualKPIs.length}`)
    
    // Step 4: Insert Planned KPIs
    if (plannedKPIs.length > 0) {
      console.log('\n4️⃣ Inserting Planned KPIs...')
      
      const plannedData = plannedKPIs.map(k => ({
        'Project Full Code': k['Project Full Code'],
        'Activity Name': k['Activity Name'],
        'Quantity': k['Quantity'],
        'Section': k['Section'],
        'Drilled Meters': k['Drilled Meters']
      }))
      
      // Insert in batches of 1000
      const batchSize = 1000
      let insertedCount = 0
      
      for (let i = 0; i < plannedData.length; i += batchSize) {
        const batch = plannedData.slice(i, i + batchSize)
        const { error, data } = await supabase
          .from(TABLES.KPI_PLANNED)
          .insert(batch)
          .select()
        
        if (error) {
          console.error(`   ❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message)
        } else {
          insertedCount += batch.length
          console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)
        }
      }
      
      console.log(`✅ Total Planned inserted: ${insertedCount}`)
    }
    
    // Step 5: Insert Actual KPIs
    if (actualKPIs.length > 0) {
      console.log('\n5️⃣ Inserting Actual KPIs...')
      
      const actualData = actualKPIs.map(k => ({
        'Project Full Code': k['Project Full Code'],
        'Activity Name': k['Activity Name'],
        'Quantity': k['Quantity'],
        'Section': k['Section'],
        'Drilled Meters': k['Drilled Meters'],
        'Actual Date': k.created_at
      }))
      
      // Insert in batches of 1000
      const batchSize = 1000
      let insertedCount = 0
      
      for (let i = 0; i < actualData.length; i += batchSize) {
        const batch = actualData.slice(i, i + batchSize)
        const { error, data } = await supabase
          .from(TABLES.KPI_ACTUAL)
          .insert(batch)
          .select()
        
        if (error) {
          console.error(`   ❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message)
        } else {
          insertedCount += batch.length
          console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)
        }
      }
      
      console.log(`✅ Total Actual inserted: ${insertedCount}`)
    }
    
    // Step 6: Final verification
    console.log('\n6️⃣ Final Verification...')
    
    const [plannedCount, actualCount, oldCount] = await Promise.all([
      supabase.from(TABLES.KPI_PLANNED).select('*', { count: 'exact', head: true }),
      supabase.from(TABLES.KPI_ACTUAL).select('*', { count: 'exact', head: true }),
      supabase.from(TABLES.KPI_OLD).select('*', { count: 'exact', head: true })
    ])
    
    console.log(`\n📊 Final Counts:`)
    console.log(`   Old Table: ${oldCount.count || 0} records`)
    console.log(`   Planned Table: ${plannedCount.count || 0} records`)
    console.log(`   Actual Table: ${actualCount.count || 0} records`)
    console.log(`   New Total: ${(plannedCount.count || 0) + (actualCount.count || 0)}`)
    
    const newTotal = (plannedCount.count || 0) + (actualCount.count || 0)
    const oldTotal = oldCount.count || 0
    
    if (newTotal === oldTotal) {
      console.log('\n✅✅✅ Migration SUCCESS! All records migrated correctly!')
      console.log('\n📋 Next Steps:')
      console.log('   1. Test the application')
      console.log('   2. Update TABLES constant in lib/supabase.ts')
      console.log('   3. (Optional) Rename old table as backup')
    } else {
      console.log(`\n⚠️  Count difference: ${newTotal - oldTotal}`)
      console.log('   This might be due to duplicates or data cleanup')
      console.log('   Please verify manually')
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  }
  
  console.log('\n==============================================')
  console.log('✅ Process Complete')
  console.log('==============================================\n')
}

// Run
cleanAndMigrate().catch(console.error)


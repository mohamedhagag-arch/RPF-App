/**
 * Migrate KPI data from single table to split tables
 * Splits "Planning Database - KPI" into:
 * - "Planning Database - KPI Planned"
 * - "Planning Database - KPI Actual"
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

async function migrateKPIData() {
  console.log('\n==============================================')
  console.log('🔄 Migrating KPI Data to Split Tables')
  console.log('==============================================\n')
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    // Step 1: Fetch all KPI data from old table
    console.log('1️⃣ Fetching data from old KPI table...')
    const { data: allKPIs, error: fetchError } = await supabase
      .from(TABLES.KPI_OLD)
      .select('*')
    
    if (fetchError) throw fetchError
    
    console.log(`✅ Fetched ${allKPIs.length} KPI records`)
    
    // Step 2: Separate Planned and Actual
    console.log('\n2️⃣ Separating Planned and Actual...')
    
    const plannedKPIs = allKPIs.filter(k => k['Input Type'] === 'Planned')
    const actualKPIs = allKPIs.filter(k => k['Input Type'] === 'Actual')
    
    console.log(`📊 Planned KPIs: ${plannedKPIs.length}`)
    console.log(`📊 Actual KPIs: ${actualKPIs.length}`)
    
    // Step 3: Insert Planned KPIs
    if (plannedKPIs.length > 0) {
      console.log('\n3️⃣ Inserting Planned KPIs...')
      
      const plannedData = plannedKPIs.map(k => ({
        'Project Full Code': k['Project Full Code'],
        'Activity Name': k['Activity Name'],
        'Quantity': k['Quantity'],
        'Section': k['Section'],
        'Drilled Meters': k['Drilled Meters']
      }))
      
      // Insert in batches of 1000
      const batchSize = 1000
      for (let i = 0; i < plannedData.length; i += batchSize) {
        const batch = plannedData.slice(i, i + batchSize)
        const { error } = await supabase
          .from(TABLES.KPI_PLANNED)
          .insert(batch)
        
        if (error) {
          console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error)
        } else {
          console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} records)`)
        }
      }
    }
    
    // Step 4: Insert Actual KPIs
    if (actualKPIs.length > 0) {
      console.log('\n4️⃣ Inserting Actual KPIs...')
      
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
      for (let i = 0; i < actualData.length; i += batchSize) {
        const batch = actualData.slice(i, i + batchSize)
        const { error } = await supabase
          .from(TABLES.KPI_ACTUAL)
          .insert(batch)
        
        if (error) {
          console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error)
        } else {
          console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} records)`)
        }
      }
    }
    
    // Step 5: Verify counts
    console.log('\n5️⃣ Verifying migration...')
    
    const [plannedCount, actualCount] = await Promise.all([
      supabase.from(TABLES.KPI_PLANNED).select('*', { count: 'exact', head: true }),
      supabase.from(TABLES.KPI_ACTUAL).select('*', { count: 'exact', head: true })
    ])
    
    console.log(`\n📊 Final Counts:`)
    console.log(`   Planned KPIs: ${plannedCount.count}`)
    console.log(`   Actual KPIs: ${actualCount.count}`)
    console.log(`   Original Total: ${allKPIs.length}`)
    console.log(`   Sum: ${(plannedCount.count || 0) + (actualCount.count || 0)}`)
    
    if ((plannedCount.count || 0) + (actualCount.count || 0) === allKPIs.length) {
      console.log('\n✅ Migration completed successfully!')
      console.log('\n⚠️  NOTE: You can now safely delete or rename the old "Planning Database - KPI" table')
      console.log('   Or keep it as backup')
    } else {
      console.log('\n⚠️  Warning: Count mismatch! Please verify data')
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  }
  
  console.log('\n==============================================')
  console.log('✅ Migration Process Complete')
  console.log('==============================================\n')
}

// Run migration
migrateKPIData().catch(console.error)


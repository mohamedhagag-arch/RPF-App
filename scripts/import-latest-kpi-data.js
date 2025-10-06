const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Parse CSV with proper handling of quoted values with commas
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

async function importData() {
  console.log('📊 Importing Latest KPI Data...\n')
  
  const csvPath = path.join(__dirname, '..', 'Database', 'clear data', 'Planning Database - KPI leatest.csv')
  
  // Read file
  const content = fs.readFileSync(csvPath, 'utf8')
  const lines = content.split('\n').filter(line => line.trim())
  
  // Parse header
  const headers = parseCSVLine(lines[0])
  console.log('📋 Columns:', headers)
  console.log('')
  
  // Parse all rows
  const allRows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    allRows.push(row)
  }
  
  console.log(`✅ Parsed ${allRows.length} rows\n`)
  
  // Separate Planned and Actual
  const plannedRows = allRows.filter(r => r['Input Type'] === 'Planned')
  const actualRows = allRows.filter(r => r['Input Type'] === 'Actual')
  
  console.log(`📊 Planned: ${plannedRows.length}`)
  console.log(`📊 Actual: ${actualRows.length}\n`)
  
  // Step 1: Clear existing data
  console.log('🗑️  Clearing existing KPI data...')
  
  const { error: clearPlannedError } = await supabase
    .from('Planning Database - KPI Planned')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  const { error: clearActualError } = await supabase
    .from('Planning Database - KPI Actual')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (clearPlannedError) console.log('⚠️  Planned clear:', clearPlannedError.message)
  if (clearActualError) console.log('⚠️  Actual clear:', clearActualError.message)
  
  console.log('✅ Existing data cleared\n')
  
  // Step 2: Insert Planned records
  console.log('📤 Inserting Planned KPIs...')
  
  const plannedInserts = plannedRows.map(row => ({
    'Project Full Code': row['Project Full Code'] || '',
    'Project Code': row['Project Code'] || '',
    'Project Sub Code': row['Project Sub-Code'] || '',
    'Activity Name': row['Activity Name'] || '',
    'Activity': row['Activity Name'] || '',
    'Quantity': row['Quantity'] || '0',
    'Section': row['Zone #'] || '',
    'Drilled Meters': row['Drilled Meters'] || '0',
    'Unit': '',
    'Target Date': parseDate(row['Planned Date']),
    'Value': parseFloat(row['Value'].replace(/[^0-9.-]/g, '')) || 0,
    'Notes': `Day: ${row['Day'] || ''}`
  }))
  
  // Insert in batches of 500
  const plannedBatchSize = 500
  let plannedInserted = 0
  
  for (let i = 0; i < plannedInserts.length; i += plannedBatchSize) {
    const batch = plannedInserts.slice(i, i + plannedBatchSize)
    const { error } = await supabase
      .from('Planning Database - KPI Planned')
      .insert(batch)
    
    if (error) {
      console.log(`❌ Batch ${Math.floor(i/plannedBatchSize)+1} error:`, error.message)
    } else {
      plannedInserted += batch.length
      console.log(`   Inserted ${plannedInserted}/${plannedInserts.length}`)
    }
  }
  
  console.log(`✅ Planned KPIs inserted: ${plannedInserted}\n`)
  
  // Step 3: Insert Actual records
  console.log('📤 Inserting Actual KPIs...')
  
  const actualInserts = actualRows.map(row => ({
    'Project Full Code': row['Project Full Code'] || '',
    'Project Code': row['Project Code'] || '',
    'Project Sub Code': row['Project Sub-Code'] || '',
    'Activity Name': row['Activity Name'] || '',
    'Activity': row['Activity Name'] || '',
    'Quantity': row['Quantity'] || '0',
    'Section': row['Zone #'] || '',
    'Drilled Meters': row['Drilled Meters'] || '0',
    'Unit': '',
    'Actual Date': parseDate(row['Actual Date']),
    'Value': parseFloat(row['Value'].replace(/[^0-9.-]/g, '')) || 0,
    'Recorded By': '',
    'Notes': `Day: ${row['Day'] || ''}`
  }))
  
  const actualBatchSize = 500
  let actualInserted = 0
  
  for (let i = 0; i < actualInserts.length; i += actualBatchSize) {
    const batch = actualInserts.slice(i, i + actualBatchSize)
    const { error } = await supabase
      .from('Planning Database - KPI Actual')
      .insert(batch)
    
    if (error) {
      console.log(`❌ Batch ${Math.floor(i/actualBatchSize)+1} error:`, error.message)
    } else {
      actualInserted += batch.length
      console.log(`   Inserted ${actualInserted}/${actualInserts.length}`)
    }
  }
  
  console.log(`✅ Actual KPIs inserted: ${actualInserted}\n`)
  
  // Verify
  console.log('🔍 Verifying...')
  const { count: plannedCount } = await supabase
    .from('Planning Database - KPI Planned')
    .select('*', { count: 'exact', head: true })
  
  const { count: actualCount } = await supabase
    .from('Planning Database - KPI Actual')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 Final Counts:`)
  console.log(`   Planned: ${plannedCount}`)
  console.log(`   Actual: ${actualCount}`)
  console.log(`   Total: ${plannedCount + actualCount}`)
  console.log(`\n🎉 Import Complete!`)
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'Actual' || dateStr === 'Planned') return null
  
  // Format: "6-Jan-25" or "18-Jun-25"
  try {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return null
    
    const day = parts[0].padStart(2, '0')
    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    const month = monthMap[parts[1]]
    const year = '20' + parts[2]
    
    if (!month) return null
    return `${year}-${month}-${day}`
  } catch (err) {
    return null
  }
}

importData()


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
    'Activity Date': parseDate(row['Planned Date'] || row['Activity Date'] || row['Target Date']) || '2025-12-31', // ✅ Map to Activity Date (unified field, DATE type)
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
    'Activity Date': parseDate(row['Actual Date'] || row['Activity Date'] || row['Target Date']) || '2025-12-31', // ✅ Map to Activity Date (unified field, DATE type)
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

// ✅ Enhanced date parsing for DATE type column - handles multiple formats
function parseDate(dateStr) {
  const defaultValue = '2025-12-31'; // Default date for NULL values (DATE type requires non-null)
  
  if (!dateStr || dateStr === 'Actual' || dateStr === 'Planned' || dateStr === 'N/A' || dateStr === '#ERROR!') {
    return defaultValue;
  }
  
  const dateValue = String(dateStr).trim();
  
  // Format 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(dateValue)) {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const yearNum = parseInt(year, 10);
      if (yearNum >= 1900 && yearNum <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }
  }
  
  // Format 2: DD-MMM-YY (e.g., "6-Jan-25", "18-Jun-25")
  const ddmmyyMatch = dateValue.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (ddmmyyMatch) {
    try {
      const [, day, monthStr, yearStr] = ddmmyyMatch;
      const monthMap = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = monthMap[monthStr];
      const year = '20' + yearStr;
      
      if (month) {
        return `${year}-${month}-${String(parseInt(day, 10)).padStart(2, '0')}`;
      }
    } catch (err) {
      // Fall through
    }
  }
  
  // Format 3: MM/DD/YYYY or M/D/YYYY
  const mmddyyyyMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const yearNum = parseInt(year, 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }
  }
  
  // Format 4: YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(dateValue)) {
    const year = dateValue.substring(0, 4);
    const month = dateValue.substring(4, 6);
    const day = dateValue.substring(6, 8);
    const yearNum = parseInt(year, 10);
    if (yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Format 5: Try JavaScript Date parsing as fallback
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      return date.toISOString().split('T')[0];
    }
  } catch (err) {
    // Fall through to default
  }
  
  // Default: return default date if all parsing fails
  return defaultValue;
}

importData()


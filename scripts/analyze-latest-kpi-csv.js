const fs = require('fs')
const path = require('path')

const csvPath = path.join(__dirname, '..', 'Database', 'clear data', 'Planning Database - KPI leatest.csv')

console.log('📊 Analyzing Latest KPI CSV File...\n')
console.log('File:', csvPath)
console.log('')

// Read and parse CSV manually
const content = fs.readFileSync(csvPath, 'utf8')
const lines = content.split('\n').filter(line => line.trim())
const headers = lines[0].split(',').map(h => h.trim())
const rows = []

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',')
  const row = {}
  headers.forEach((header, index) => {
    row[header] = values[index] ? values[index].trim() : ''
  })
  rows.push(row)
}

console.log('📋 Columns found:', headers.length)
console.log('')
headers.forEach((h, i) => console.log(`   ${i+1}. ${h}`))
console.log('')

;(function analyzeData() {
    console.log(`✅ Total rows: ${rows.length}\n`)
    
    // Check Input Types
    const types = {}
    rows.forEach(row => {
      const type = row['Input Type'] || 'Unknown'
      types[type] = (types[type] || 0) + 1
    })
    
    console.log('📊 Distribution by Input Type:')
    for (const [type, count] of Object.entries(types)) {
      console.log(`   ${type}: ${count} (${((count/rows.length)*100).toFixed(1)}%)`)
    }
    console.log('')
    
    // Check date fields
    console.log('📅 Date Fields Check:')
    const dateFields = headers.filter(h => 
      h.toLowerCase().includes('date') || 
      h.toLowerCase().includes('تاريخ')
    )
    console.log('   Date columns:', dateFields)
    console.log('')
    
    // Sample records
    console.log('🔍 Sample Planned Record:')
    const plannedSample = rows.find(r => r['Input Type'] === 'Planned')
    if (plannedSample) {
      console.log(JSON.stringify(plannedSample, null, 2))
    }
    console.log('')
    
    console.log('🔍 Sample Actual Record:')
    const actualSample = rows.find(r => r['Input Type'] === 'Actual')
    if (actualSample) {
      console.log(JSON.stringify(actualSample, null, 2))
    }
    console.log('')
    
    // Check for date values
    console.log('📅 Date Values Sample:')
    dateFields.forEach(field => {
      const withValues = rows.filter(r => r[field] && r[field].trim() !== '').length
      console.log(`   ${field}: ${withValues}/${rows.length} records have values`)
    })
})()



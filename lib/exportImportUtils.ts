/**
 * Export/Import Utilities
 * Tools for exporting and importing data in multiple formats
 */

export type ExportFormat = 'csv' | 'excel' | 'json'

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], columns?: string[]): string {
  if (data.length === 0) {
    return ''
  }

  // Get column headers
  const headers = columns || Object.keys(data[0])
  
  // Create CSV content
  const csvRows: string[] = []
  
  // Add headers
  csvRows.push(headers.map(header => `"${header}"`).join(','))
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header]
      // Handle null/undefined
      if (value === null || value === undefined) return '""'
      // Handle objects/arrays
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      // Handle strings with commas or quotes
      const stringValue = String(value).replace(/"/g, '""')
      return `"${stringValue}"`
    })
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(data: any[], filename: string, columns?: string[]): void {
  const csv = convertToCSV(data, columns)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for UTF-8
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  console.log(`✅ Downloaded: ${filename}.csv (${data.length} rows)`)
}

/**
 * Download Excel file using SheetJS (xlsx)
 * Note: You need to install: npm install xlsx
 */
export async function downloadExcel(data: any[], filename: string, sheetName?: string): Promise<void> {
  try {
    // Dynamically import xlsx to reduce bundle size
    const XLSX = await import('xlsx')
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data)
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1')
    
    // Generate Excel file
    XLSX.writeFile(wb, `${filename}.xlsx`)
    
    console.log(`✅ Downloaded: ${filename}.xlsx (${data.length} rows)`)
  } catch (error) {
    console.error('❌ Error creating Excel file:', error)
    // Fallback to CSV if Excel fails
    console.log('⚠️ Falling back to CSV export...')
    downloadCSV(data, filename)
  }
}

/**
 * Download JSON file
 */
export function downloadJSON(data: any[], filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  console.log(`✅ Downloaded: ${filename}.json (${data.length} rows)`)
}

/**
 * Export data with format selection
 */
export async function exportData(
  data: any[],
  filename: string,
  format: ExportFormat = 'csv',
  options?: {
    columns?: string[]
    sheetName?: string
  }
): Promise<void> {
  if (data.length === 0) {
    console.warn('⚠️ No data to export')
    alert('No data to export')
    return
  }

  console.log(`📤 Exporting ${data.length} rows as ${format.toUpperCase()}...`)

  switch (format) {
    case 'csv':
      downloadCSV(data, filename, options?.columns)
      break
    case 'excel':
      await downloadExcel(data, filename, options?.sheetName)
      break
    case 'json':
      downloadJSON(data, filename)
      break
    default:
      console.error('❌ Unsupported format:', format)
  }
}

/**
 * Parse CSV file
 */
export function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  
  // Parse rows
  const data: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  return data
}

/**
 * Parse Excel file
 */
export async function parseExcel(file: File): Promise<any[]> {
  try {
    const XLSX = await import('xlsx')
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          console.log(`✅ Parsed Excel file: ${jsonData.length} rows`)
          resolve(jsonData)
        } catch (error) {
          console.error('❌ Error parsing Excel:', error)
          reject(error)
        }
      }
      
      reader.onerror = () => {
        console.error('❌ Error reading file')
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsArrayBuffer(file)
    })
  } catch (error) {
    console.error('❌ Error importing Excel library:', error)
    throw error
  }
}

/**
 * Import data from file
 */
export async function importFromFile(
  file: File,
  onSuccess?: (data: any[]) => void,
  onError?: (error: Error) => void
): Promise<any[]> {
  try {
    console.log(`📥 Importing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
    
    const extension = file.name.split('.').pop()?.toLowerCase()
    let data: any[] = []
    
    if (extension === 'csv') {
      const text = await file.text()
      data = parseCSV(text)
    } else if (extension === 'xlsx' || extension === 'xls') {
      data = await parseExcel(file)
    } else if (extension === 'json') {
      const text = await file.text()
      data = JSON.parse(text)
    } else {
      throw new Error(`Unsupported file format: ${extension}`)
    }
    
    console.log(`✅ Imported ${data.length} rows from ${file.name}`)
    
    if (onSuccess) {
      onSuccess(data)
    }
    
    return data
  } catch (error: any) {
    console.error('❌ Error importing file:', error)
    if (onError) {
      onError(error)
    }
    throw error
  }
}

/**
 * Validate imported data structure
 */
export function validateImportedData(
  data: any[],
  requiredColumns: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!Array.isArray(data) || data.length === 0) {
    errors.push('File is empty or format is incorrect')
    return { isValid: false, errors }
  }
  
  // Check if all required columns exist
  const firstRow = data[0]
  const availableColumns = Object.keys(firstRow)
  
  requiredColumns.forEach(col => {
    if (!availableColumns.includes(col)) {
      errors.push(`Required column not found: ${col}`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create template file for import
 */
export async function downloadTemplate(
  templateName: string,
  columns: string[],
  format: 'csv' | 'excel' = 'excel'
): Promise<void> {
  // Create sample row with empty values
  const sampleData = [
    columns.reduce((obj, col) => {
      obj[col] = ''
      return obj
    }, {} as any)
  ]
  
  if (format === 'excel') {
    await downloadExcel(sampleData, `${templateName}_template`, templateName)
  } else {
    downloadCSV(sampleData, `${templateName}_template`, columns)
  }
  
  console.log(`✅ Downloaded template: ${templateName}_template.${format === 'excel' ? 'xlsx' : 'csv'}`)
}

/**
 * Get current date string for filename
 */
export function getDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0].replace(/-/g, '')
}

/**
 * Generate filename with date
 */
export function generateFilename(baseName: string): string {
  return `${baseName}_${getDateString()}`
}

/**
 * Format data for export (clean up internal fields)
 */
export function formatDataForExport(data: any[]): any[] {
  return data.map(row => {
    const cleaned = { ...row }
    // Remove internal fields
    delete cleaned.id
    delete cleaned.created_at
    delete cleaned.updated_at
    delete cleaned.created_by
    return cleaned
  })
}

/**
 * Convert database format to display format
 */
export function mapDatabaseToDisplay(data: any[], columnMap: Record<string, string>): any[] {
  return data.map(row => {
    const mapped: any = {}
    Object.entries(columnMap).forEach(([dbColumn, displayColumn]) => {
      mapped[displayColumn] = row[dbColumn]
    })
    return mapped
  })
}

/**
 * Convert display format to database format
 */
export function mapDisplayToDatabase(data: any[], columnMap: Record<string, string>): any[] {
  const reverseMap = Object.entries(columnMap).reduce((acc, [db, display]) => {
    acc[display] = db
    return acc
  }, {} as Record<string, string>)
  
  return data.map(row => {
    const mapped: any = {}
    Object.entries(reverseMap).forEach(([displayColumn, dbColumn]) => {
      if (row[displayColumn] !== undefined) {
        mapped[dbColumn] = row[displayColumn]
      }
    })
    return mapped
  })
}


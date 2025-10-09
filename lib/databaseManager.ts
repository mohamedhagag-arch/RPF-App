/**
 * 🗄️ Database Manager - Professional Database Operations
 * 
 * مدير قاعدة البيانات الاحترافي
 * يوفر عمليات متقدمة لإدارة الجداول والبيانات في Supabase
 */

import { getSupabaseClient } from './simpleConnectionManager'
import { TABLES } from './supabase'

// تعريف الجداول المتاحة في النظام
export const DATABASE_TABLES = {
  PROJECTS: {
    name: TABLES.PROJECTS,
    displayName: 'Projects',
    description: 'Main projects table',
    icon: '🏗️',
    color: 'blue',
    hasSensitiveData: false
  },
  BOQ_ACTIVITIES: {
    name: TABLES.BOQ_ACTIVITIES,
    displayName: 'BOQ Activities',
    description: 'BOQ activities table',
    icon: '📋',
    color: 'purple',
    hasSensitiveData: false
  },
  KPI: {
    name: TABLES.KPI,
    displayName: 'KPI Records',
    description: 'Unified KPI table',
    icon: '📊',
    color: 'green',
    hasSensitiveData: false
  },
  USERS: {
    name: TABLES.USERS,
    displayName: 'Users',
    description: 'Users table',
    icon: '👥',
    color: 'orange',
    hasSensitiveData: true
  },
  DIVISIONS: {
    name: 'divisions',
    displayName: 'Divisions',
    description: 'Divisions table',
    icon: '🏢',
    color: 'indigo',
    hasSensitiveData: false
  },
  PROJECT_TYPES: {
    name: 'project_types',
    displayName: 'Project Types',
    description: 'Project types table',
    icon: '📁',
    color: 'pink',
    hasSensitiveData: false
  },
  CURRENCIES: {
    name: 'currencies',
    displayName: 'Currencies',
    description: 'Currencies table',
    icon: '💰',
    color: 'yellow',
    hasSensitiveData: false
  },
  ACTIVITIES: {
    name: 'activities',
    displayName: 'Activities Database',
    description: 'Available activities database',
    icon: '🎯',
    color: 'teal',
    hasSensitiveData: false
  },
  COMPANY_SETTINGS: {
    name: TABLES.COMPANY_SETTINGS,
    displayName: 'Company Settings',
    description: 'Company settings table',
    icon: '⚙️',
    color: 'gray',
    hasSensitiveData: false
  }
} as const

export type TableKey = keyof typeof DATABASE_TABLES
export type TableInfo = typeof DATABASE_TABLES[TableKey]

// إحصائيات الجدول
export interface TableStats {
  tableName: string
  totalRows: number
  lastUpdated: string | null
  estimatedSize: string
  hasData: boolean
}

// نتيجة العملية
export interface OperationResult {
  success: boolean
  message: string
  data?: any
  error?: string
  affectedRows?: number
}

/**
 * الحصول على قائمة كل الجداول المتاحة
 */
export function getAllTables(): TableInfo[] {
  return Object.values(DATABASE_TABLES)
}

/**
 * الحصول على معلومات جدول محدد
 */
export function getTableInfo(tableKey: TableKey): TableInfo {
  return DATABASE_TABLES[tableKey]
}

/**
 * الحصول على إحصائيات جدول
 */
export async function getTableStats(tableName: string): Promise<TableStats | null> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`📊 Getting stats for table: ${tableName}`)
    
    // عد الصفوف
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error(`❌ Error counting rows in ${tableName}:`, countError)
      return null
    }
    
    // الحصول على آخر تحديث
    const { data: latestRow, error: latestError } = await supabase
      .from(tableName)
      .select('updated_at, created_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .single()
    
    const lastUpdated = (latestRow as any)?.updated_at || (latestRow as any)?.created_at || null
    
    // تقدير الحجم (تقريبي)
    const estimatedSizeKB = (count || 0) * 0.5 // تقدير تقريبي
    const estimatedSize = estimatedSizeKB < 1024 
      ? `${estimatedSizeKB.toFixed(2)} KB`
      : `${(estimatedSizeKB / 1024).toFixed(2)} MB`
    
    const stats: TableStats = {
      tableName,
      totalRows: count || 0,
      lastUpdated,
      estimatedSize,
      hasData: (count || 0) > 0
    }
    
    console.log(`✅ Stats for ${tableName}:`, stats)
    return stats
    
  } catch (error: any) {
    console.error(`❌ Error getting stats for ${tableName}:`, error)
    return null
  }
}

/**
 * الحصول على إحصائيات كل الجداول
 */
export async function getAllTablesStats(): Promise<Record<string, TableStats | null>> {
  console.log('📊 Getting stats for all tables...')
  
  const stats: Record<string, TableStats | null> = {}
  const tables = getAllTables()
  
  // تحميل إحصائيات كل الجداول بالتوازي
  const promises = tables.map(async (table) => {
    const tableStats = await getTableStats(table.name)
    return { name: table.name, stats: tableStats }
  })
  
  const results = await Promise.all(promises)
  
  results.forEach(({ name, stats: tableStats }) => {
    stats[name] = tableStats
  })
  
  console.log('✅ All tables stats loaded')
  return stats
}

/**
 * مسح كل البيانات من جدول (خطير!)
 */
export async function clearTableData(tableName: string): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`🗑️ Clearing all data from table: ${tableName}`)
    
    // التحقق من وجود بيانات
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (!count || count === 0) {
      return {
        success: true,
        message: `Table ${tableName} is already empty`,
        affectedRows: 0
      }
    }
    
    // حذف كل البيانات
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // حذف كل شيء
    
    if (error) {
      console.error(`❌ Error clearing ${tableName}:`, error)
      return {
        success: false,
        message: `Failed to clear table: ${error.message}`,
        error: error.message
      }
    }
    
    console.log(`✅ Successfully cleared ${count} rows from ${tableName}`)
    return {
      success: true,
      message: `Successfully cleared ${count} rows from ${tableName}`,
      affectedRows: count
    }
    
  } catch (error: any) {
    console.error(`❌ Error clearing table ${tableName}:`, error)
    return {
      success: false,
      message: error.message || 'Failed to clear table',
      error: error.message
    }
  }
}

/**
 * تصدير بيانات جدول إلى JSON
 */
export async function exportTableData(tableName: string): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`📤 Exporting data from table: ${tableName}`)
    
    // جلب كل البيانات باستخدام pagination
    let allData: any[] = []
    let from = 0
    const limit = 1000 // Supabase max limit per request
    
    while (true) {
      const currentBatch = Math.floor(from / limit) + 1
      console.log(`📤 Fetching batch ${currentBatch} (rows ${from + 1} to ${from + limit})...`)
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1)
      
      if (error) {
        console.error(`❌ Error exporting ${tableName}:`, error)
        return {
          success: false,
          message: `Failed to export table: ${error.message}`,
          error: error.message
        }
      }
      
      if (!data || data.length === 0) {
        console.log(`📤 No more data found. Total fetched: ${allData.length} rows`)
        break // No more data
      }
      
      allData = [...allData, ...data]
      console.log(`📤 Batch ${currentBatch} completed: ${data.length} rows (Total: ${allData.length})`)
      
      if (data.length < limit) {
        console.log(`📤 Last batch completed. Total exported: ${allData.length} rows`)
        break // Last page
      }
      
      from += limit
      
      // Add a small delay to prevent overwhelming the server
      if (from > 0 && from % 5000 === 0) {
        console.log(`📤 Processed ${from} rows, taking a short break...`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`✅ Successfully exported ${allData.length} rows from ${tableName}`)
    return {
      success: true,
      message: `Successfully exported ${allData.length} rows`,
      data: allData,
      affectedRows: allData.length
    }
    
  } catch (error: any) {
    console.error(`❌ Error exporting table ${tableName}:`, error)
    return {
      success: false,
      message: error.message || 'Failed to export table',
      error: error.message
    }
  }
}

/**
 * استيراد بيانات إلى جدول
 */
export async function importTableData(
  tableName: string, 
  data: any[],
  mode: 'append' | 'replace' = 'append'
): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`📥 Importing ${data.length} rows to table: ${tableName} (mode: ${mode})`)
    
    // إذا كان الوضع "replace"، نحذف البيانات القديمة أولاً
    if (mode === 'replace') {
      console.log('🗑️ Clearing existing data first...')
      const clearResult = await clearTableData(tableName)
      if (!clearResult.success) {
        return clearResult
      }
    }
    
    // Clean and validate data before importing
    const cleanedData = data.map((row, index) => {
      const cleanedRow: any = {}
      
      Object.keys(row).forEach(key => {
        let value = row[key]
        
        // Skip empty or null values
        if (value === '' || value === 'null' || value === 'NULL' || value === null || value === undefined) {
          cleanedRow[key] = null
          return
        }
        
        // Handle different data types
        if (typeof value === 'string') {
          // Try to convert date strings
          if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
            // Skip if it's clearly not a date (contains letters that shouldn't be in dates)
            if (/[a-zA-Z]{3,}/.test(value) && !value.match(/^\d{4}-\d{2}-\d{2}/)) {
              console.warn(`⚠️ Skipping invalid date value in row ${index + 1}, column ${key}: "${value}"`)
              cleanedRow[key] = null
              return
            }
          }
        }
        
        cleanedRow[key] = value
      })
      
      // Log first few cleaned rows for debugging
      if (index < 3) {
        console.log(`📋 Cleaned Row ${index + 1}:`, cleanedRow)
      }
      
      return cleanedRow
    })
    
    console.log(`📋 Data cleaned, importing ${cleanedData.length} rows...`)
    
    // إدراج البيانات الجديدة
    const { error } = await supabase
      .from(tableName)
      .insert(cleanedData as any)
    
    if (error) {
      console.error(`❌ Error importing to ${tableName}:`, error)
      
      // Try to provide more helpful error message
      let errorMessage = error.message
      if (error.message.includes('invalid input syntax for type timestamp')) {
        errorMessage = 'Invalid date format detected. Please check your CSV file for proper date formatting (YYYY-MM-DD) and ensure no text data is in date columns.'
      }
      
      return {
        success: false,
        message: `Failed to import data: ${errorMessage}`,
        error: error.message
      }
    }
    
    console.log(`✅ Successfully imported ${cleanedData.length} rows to ${tableName}`)
    return {
      success: true,
      message: `Successfully imported ${cleanedData.length} rows`,
      affectedRows: cleanedData.length
    }
    
  } catch (error: any) {
    console.error(`❌ Error importing to table ${tableName}:`, error)
    return {
      success: false,
      message: error.message || 'Failed to import data',
      error: error.message
    }
  }
}

/**
 * الحصول على نموذج (template) فارغ للجدول
 */
export async function getTableTemplate(tableName: string): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`📋 Getting template for table: ${tableName}`)
    
    // جلب صف واحد للحصول على الأعمدة
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.error(`❌ Error getting template for ${tableName}:`, error)
      return {
        success: false,
        message: `Failed to get template: ${error.message}`,
        error: error.message
      }
    }
    
    // إنشاء كائن فارغ بنفس الأعمدة مع قيم افتراضية مناسبة
    const template: any = {}
    if (data && data.length > 0) {
      Object.keys(data[0]).forEach(key => {
        const value = data[0][key]
        
        // Set appropriate default values based on column type
        if (value === null || value === undefined) {
          template[key] = ''
        } else if (typeof value === 'number') {
          template[key] = 0
        } else if (typeof value === 'boolean') {
          template[key] = false
        } else if ((value as any) instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
          // Date fields - provide example format
          template[key] = 'YYYY-MM-DD'
        } else {
          // String fields
          template[key] = ''
        }
      })
    }
    
    console.log(`✅ Successfully generated template for ${tableName}`)
    return {
      success: true,
      message: 'Template generated successfully',
      data: template
    }
    
  } catch (error: any) {
    console.error(`❌ Error getting template for ${tableName}:`, error)
    return {
      success: false,
      message: error.message || 'Failed to get template',
      error: error.message
    }
  }
}

/**
 * التحقق من صلاحيات المستخدم لإدارة قاعدة البيانات
 */
/**
 * تنظيف البيانات القديمة لتحسين الأداء
 */
export async function cleanupOldData(options: {
  kpiDaysOld?: number
  boqDaysOld?: number
  projectsDaysOld?: number
} = {}): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    const {
      kpiDaysOld = 180, // 6 أشهر
      boqDaysOld = 365, // سنة
      projectsDaysOld = 730 // سنتين
    } = options

    console.log('🧹 Starting data cleanup...')
    
    const results: any = {
      kpi: { deleted: 0, error: null },
      boq: { deleted: 0, error: null },
      projects: { deleted: 0, error: null }
    }

    // تنظيف KPIs القديمة
    if (kpiDaysOld > 0) {
      try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - kpiDaysOld)
        
        const { error: kpiError, count: kpiCount } = await supabase
          .from(TABLES.KPI)
          .delete({ count: 'exact' })
          .lt('created_at', cutoffDate.toISOString())
        
        if (kpiError) {
          console.error('❌ Error cleaning KPI data:', kpiError)
          results.kpi.error = kpiError.message
        } else {
          results.kpi.deleted = kpiCount || 0
          console.log(`✅ Cleaned ${kpiCount || 0} old KPI records`)
        }
      } catch (error: any) {
        results.kpi.error = error.message
      }
    }

    // تنظيف BOQ Activities القديمة (مكتملة)
    if (boqDaysOld > 0) {
      try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - boqDaysOld)
        
        const { error: boqError, count: boqCount } = await supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .delete({ count: 'exact' })
          .lt('created_at', cutoffDate.toISOString())
          .eq('Status', 'Completed') // فقط المكتملة
        
        if (boqError) {
          console.error('❌ Error cleaning BOQ data:', boqError)
          results.boq.error = boqError.message
        } else {
          results.boq.deleted = boqCount || 0
          console.log(`✅ Cleaned ${boqCount || 0} old completed BOQ activities`)
        }
      } catch (error: any) {
        results.boq.error = error.message
      }
    }

    // تنظيف المشاريع القديمة (مكتملة)
    if (projectsDaysOld > 0) {
      try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - projectsDaysOld)
        
        const { error: projectsError, count: projectsCount } = await supabase
          .from(TABLES.PROJECTS)
          .delete({ count: 'exact' })
          .lt('created_at', cutoffDate.toISOString())
          .in('Status', ['Completed', 'Cancelled']) // فقط المكتملة أو الملغية
        
        if (projectsError) {
          console.error('❌ Error cleaning Projects data:', projectsError)
          results.projects.error = projectsError.message
        } else {
          results.projects.deleted = projectsCount || 0
          console.log(`✅ Cleaned ${projectsCount || 0} old completed/cancelled projects`)
        }
      } catch (error: any) {
        results.projects.error = error.message
      }
    }

    const totalDeleted = results.kpi.deleted + results.boq.deleted + results.projects.deleted
    const hasErrors = results.kpi.error || results.boq.error || results.projects.error

    console.log(`🧹 Cleanup completed: ${totalDeleted} records deleted`)
    
    return {
      success: !hasErrors,
      message: hasErrors 
        ? `Cleanup completed with some errors. Deleted ${totalDeleted} records.`
        : `Successfully cleaned up ${totalDeleted} old records`,
      data: results,
      affectedRows: totalDeleted,
      error: hasErrors ? 'Some operations failed' : undefined
    }

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error)
    return {
      success: false,
      message: `Cleanup failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * التحقق من حجم البيانات وإعطاء توصيات
 */
export async function getDataSizeAnalysis(): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log('📊 Analyzing data size...')
    
    const tables = getAllTables()
    const analysis: any = {}
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Error counting ${table.name}:`, error)
        continue
      }
      
      const estimatedSize = (count || 0) * 0.5 // تقدير تقريبي
      const sizeKB = estimatedSize < 1024 ? estimatedSize : estimatedSize / 1024
      const sizeMB = sizeKB < 1024 ? sizeKB : sizeKB / 1024
      
      analysis[table.name] = {
        displayName: table.displayName,
        totalRows: count || 0,
        estimatedSize: sizeMB < 1 ? `${sizeKB.toFixed(2)} KB` : `${sizeMB.toFixed(2)} MB`,
        recommendation: getRecommendation(count || 0, table.name)
      }
    }
    
    const totalRows = Object.values(analysis).reduce((sum: number, table: any) => sum + table.totalRows, 0)
    const needsCleanup = totalRows > 10000 // أكثر من 10,000 سجل
    
    console.log(`📊 Analysis complete: ${totalRows} total rows`)
    
    return {
      success: true,
      message: `Analysis complete. ${totalRows} total rows across all tables.`,
      data: {
        tables: analysis,
        totalRows,
        needsCleanup,
        recommendations: getOverallRecommendations(totalRows)
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error analyzing data size:', error)
    return {
      success: false,
      message: `Analysis failed: ${error.message}`,
      error: error.message
    }
  }
}

function getRecommendation(count: number, tableName: string): string {
  if (tableName.includes('KPI') && count > 5000) {
    return 'Consider cleaning KPI records older than 6 months'
  }
  if (tableName.includes('BOQ') && count > 3000) {
    return 'Consider cleaning completed BOQ activities older than 1 year'
  }
  if (tableName.includes('Projects') && count > 1000) {
    return 'Consider archiving completed projects older than 2 years'
  }
  if (count > 10000) {
    return 'Large dataset - consider data archiving'
  }
  return 'Size is acceptable'
}

function getOverallRecommendations(totalRows: number): string[] {
  const recommendations = []
  
  if (totalRows > 20000) {
    recommendations.push('Database is very large - consider immediate cleanup')
    recommendations.push('Archive old data to improve performance')
  } else if (totalRows > 10000) {
    recommendations.push('Database is large - consider cleanup')
    recommendations.push('Monitor performance and clean old data regularly')
  } else if (totalRows > 5000) {
    recommendations.push('Database size is moderate')
    recommendations.push('Consider periodic cleanup of old records')
  } else {
    recommendations.push('Database size is optimal')
    recommendations.push('Continue regular maintenance')
  }
  
  return recommendations
}

export async function canManageDatabase(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    
    // الحصول على المستخدم الحالي
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return false
    }
    
    // الحصول على بيانات المستخدم من جدول users
    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (appUserError || !appUser) {
      return false
    }
    
    // فقط Admin يمكنه إدارة قاعدة البيانات
    return (appUser as any).role === 'admin'
    
  } catch (error) {
    console.error('Error checking database permissions:', error)
    return false
  }
}

/**
 * تنزيل البيانات كملف JSON
 */
export function downloadAsJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * تنزيل البيانات كملف CSV
 */
export function downloadAsCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }
  
  // استخراج الأعمدة
  const headers = Object.keys(data[0])
  
  // إنشاء محتوى CSV
  const csvRows = [
    headers.join(','), // الرأس
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // تنظيف القيمة
        const cleaned = value?.toString().replace(/"/g, '""') || ''
        return `"${cleaned}"`
      }).join(',')
    )
  ]
  
  const csv = csvRows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * تحميل template CSV فارغ مع أسماء الأعمدة الصحيحة
 */
export function downloadCSVTemplate(template: any, filename: string): void {
  const headers = Object.keys(template)
  
  // Create template with example values
  const csvRows = [
    headers.join(','), // Headers
    headers.map(header => {
      const value = template[header]
      if (value === null || value === undefined) return ''
      
      // Add quotes if needed
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',') // Example row
  ]
  
  const csv = csvRows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_template.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * قراءة ملف JSON
 */
export function readJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        resolve(json)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * قراءة ملف CSV
 */
export function readCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        
        // Improved CSV parser that handles commas in quoted fields
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
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
          return result.map(field => field.replace(/^"|"$/g, ''))
        }
        
        const lines = csv.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          reject(new Error('CSV file is empty or invalid'))
          return
        }
        
        // قراءة الرأس
        const headers = parseCSVLine(lines[0])
        
        console.log('📋 CSV Headers:', headers)
        
        // قراءة البيانات
        const data = lines.slice(1).map((line, index) => {
          const values = parseCSVLine(line)
          const row: any = {}
          
          headers.forEach((header, colIndex) => {
            let value = values[colIndex] || ''
            
            // Clean and validate data
            if (value === '' || value === 'null' || value === 'NULL') {
              row[header] = null
            } else {
              row[header] = value
            }
          })
          
          // Log first few rows for debugging
          if (index < 3) {
            console.log(`📋 Row ${index + 1}:`, row)
          }
          
          return row
        })
        
        console.log(`📋 Parsed ${data.length} rows from CSV`)
        resolve(data)
      } catch (error) {
        console.error('❌ CSV parsing error:', error)
        reject(new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'UTF-8')
  })
}


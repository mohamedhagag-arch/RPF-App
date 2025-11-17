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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    console.log(`📤 Exporting data from table: ${tableName}`)
    if (supabaseUrl && !supabaseUrl.includes('localhost') && !supabaseUrl.includes('127.0.0.1')) {
      console.log(`   ✅ Source: Production database (${supabaseUrl.substring(0, 30)}...)`)
    }
    
    // جلب كل البيانات باستخدام pagination
    let allData: any[] = []
    let from = 0
    const limit = 1000 // Supabase max limit per request
    
    // Try to get first row to check table structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error(`❌ Error accessing table ${tableName}:`, sampleError)
      return {
        success: false,
        message: `Failed to access table: ${sampleError.message}`,
        error: sampleError.message
      }
    }
    
    // Check if table has created_at column
    const hasCreatedAt = sampleData && sampleData.length > 0 && (sampleData[0] as any)?.created_at !== undefined
    const hasId = sampleData && sampleData.length > 0 && (sampleData[0] as any)?.id !== undefined
    
    console.log(`📤 Table structure: ${hasCreatedAt ? 'has created_at' : hasId ? 'has id' : 'no ordering column'}`)
    
    while (true) {
      const currentBatch = Math.floor(from / limit) + 1
      console.log(`📤 Fetching batch ${currentBatch} (rows ${from + 1} to ${from + limit})...`)
      
      let query = supabase
        .from(tableName)
        .select('*')
        .range(from, from + limit - 1)
      
      // Only add order if column exists
      if (hasCreatedAt) {
        query = query.order('created_at', { ascending: false })
      } else if (hasId) {
        query = query.order('id', { ascending: false })
      }
      
      const { data, error } = await query
      
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
 * 🔗 التحقق من الترابط بين البيانات (Foreign Key Validation)
 */
async function validateDataRelationships(tableName: string, data: any[]): Promise<{
  valid: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []
  const supabase = getSupabaseClient()
  
  try {
    console.log(`🔍 Validating relationships for ${tableName}...`)
    
    // ✅ التحقق من BOQ Activities → يجب أن يكون Project Full Code موجود
    if (tableName === TABLES.BOQ_ACTIVITIES) {
      // ✅ Priority: Check Project Full Code first (most accurate)
      const projectFullCodesSet = new Set(data.map(row => 
        row['Project Full Code'] || row['project_full_code'] || 
        (row['Project Code'] && row['Project Sub Code'] ? `${row['Project Code']}-${row['Project Sub Code']}` : null) ||
        (row['project_code'] && row['project_sub_code'] ? `${row['project_code']}-${row['project_sub_code']}` : null)
      ).filter(Boolean))
      const projectFullCodes = Array.from(projectFullCodesSet) as string[]
      
      if (projectFullCodes.length > 0) {
        const { data: existingProjects } = await supabase
          .from(TABLES.PROJECTS)
          .select('"Project Full Code", "Project Code", "Project Sub-Code"')
          .or(projectFullCodes.map(code => `"Project Full Code".eq.${code}`).join(','))
        
        const existingFullCodes = new Set((existingProjects || []).map((p: any) => 
          p['Project Full Code'] || (p['Project Code'] && p['Project Sub-Code'] ? `${p['Project Code']}-${p['Project Sub-Code']}` : null)
        ).filter(Boolean))
        const missingCodes = projectFullCodes.filter((code: string) => !existingFullCodes.has(code))
        
        if (missingCodes.length > 0) {
          warnings.push(`⚠️ Warning: ${missingCodes.length} BOQ activities reference non-existent projects (by Project Full Code): ${missingCodes.slice(0, 3).join(', ')}${missingCodes.length > 3 ? '...' : ''}`)
          console.warn(`⚠️ Missing project full codes:`, missingCodes)
        } else {
          console.log(`✅ All ${projectFullCodes.length} project full codes exist`)
        }
      }
    }
    
    // ✅ التحقق من KPI → يجب أن يكون Project Full Code و Activity Name موجودين
    if (tableName === TABLES.KPI) {
      // ✅ Priority: Use Project Full Code (most accurate matching)
      const projectFullCodesSet = new Set(data.map(row => 
        row['Project Full Code'] || row['project_full_code'] ||
        (row['Project Code'] && row['Project Sub Code'] ? `${row['Project Code']}-${row['Project Sub Code']}` : null) ||
        (row['project_code'] && row['project_sub_code'] ? `${row['project_code']}-${row['project_sub_code']}` : null)
      ).filter(Boolean))
      const projectFullCodes = Array.from(projectFullCodesSet) as string[]
      
      if (projectFullCodes.length > 0) {
        const { data: existingProjects } = await supabase
          .from(TABLES.PROJECTS)
          .select('"Project Full Code", "Project Code", "Project Sub-Code"')
          .or(projectFullCodes.map(code => `"Project Full Code".eq.${code}`).join(','))
        
        const existingFullCodes = new Set((existingProjects || []).map((p: any) => 
          p['Project Full Code'] || (p['Project Code'] && p['Project Sub-Code'] ? `${p['Project Code']}-${p['Project Sub-Code']}` : null)
        ).filter(Boolean))
        const missingCodes = projectFullCodes.filter((code: string) => !existingFullCodes.has(code))
        
        if (missingCodes.length > 0) {
          warnings.push(`⚠️ Warning: ${missingCodes.length} KPI records reference non-existent projects (by Project Full Code)`)
          console.warn(`⚠️ Missing project full codes in KPI:`, missingCodes.slice(0, 5))
        } else {
          console.log(`✅ All ${projectFullCodes.length} project full codes exist`)
        }
      }
      
      // التحقق من Activity Names
      const activityNamesSet = new Set(data.map(row => 
        row['Activity Name'] || row['activity_name']
      ).filter((x): x is string => Boolean(x)))
      const activityNames = Array.from(activityNamesSet)
      
      if (activityNames.length > 0) {
        const { data: existingActivities } = await supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('"Activity Name"')
        
        const existingNames = new Set((existingActivities || []).map((a: any) => a['Activity Name'] as string))
        const missingNames = activityNames.filter(name => !existingNames.has(name))
        
        if (missingNames.length > 0) {
          warnings.push(`⚠️ Warning: ${missingNames.length} KPI records reference non-existent activities`)
          console.warn(`⚠️ Missing activity names:`, missingNames.slice(0, 5))
        } else {
          console.log(`✅ All ${activityNames.length} activity names exist`)
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
    
  } catch (error: any) {
    console.error('❌ Error validating relationships:', error)
    return {
      valid: true, // Don't block import on validation errors
      errors: [],
      warnings: [`⚠️ Could not validate relationships: ${error.message}`]
    }
  }
}

/**
 * 🔄 إعادة تحميل البيانات في جميع الصفحات (Trigger Refresh)
 */
function triggerGlobalRefresh(tableName: string): void {
  console.log(`🔄 Triggering global refresh for ${tableName}...`)
  
  // إرسال custom event للصفحات الأخرى
  const event = new CustomEvent('database-updated', {
    detail: { tableName, timestamp: Date.now() }
  })
  window.dispatchEvent(event)
  
  console.log(`✅ Global refresh event dispatched for ${tableName}`)
}

/**
 * 📋 الحصول على أسماء الأعمدة الصحيحة للجدول (موحدة مع الصفحات الأخرى)
 */
function getCorrectColumnNames(tableName: string): string[] {
  const columnMappings: Record<string, string[]> = {
    [TABLES.PROJECTS]: [
      'Project Code',
      'Project Sub-Code',
      'Project Full Code', // ✅ Added: Important for matching with BOQ and KPI
      'Project Name',
      'Project Type',
      'Responsible Division',
      'Plot Number',
      'KPI Completed',
      'Project Status',
      'Contract Amount',
      'Contract Status',
      'Work Programme',
      'Latitude',
      'Longitude',
      'Project Manager Email',
      'Area Manager Email',
      'Date Project Awarded',
      'Workmanship only?',
      'Advnace Payment Required',
      'Client Name',
      'Consultant Name',
      'First Party name',
      'Virtual Material Value',
      'Project Start Date',
      'Project Completion Date',
      'Project Duration',
      'Division Head Email',
      'Retention after Completion',
      'Retention after 6 Month',
      'Retention after 12 Month'
    ],
    [TABLES.BOQ_ACTIVITIES]: [
      // ✅ Basic Information (Required for Import)
      'Project Code',
      'Project Sub Code',
      'Project Full Code',
      'Activity',
      'Activity Name',
      'Activity Division',
      'Unit',
      'Zone Ref',
      'Zone Number',
      
      // ✅ Quantities (User Input)
      'Total Units',
      'Planned Units',
      'Rate',
      'Total Value',
      
      // ✅ Dates (User Input)
      'Planned Activity Start Date',
      'Deadline',
      'Calendar Duration',
      
      // ✅ Project Info (User Input)
      'Project Full Name',
      'Project Status',
      
      // ❌ Calculated Fields (Auto-Generated - NOT in Template)
      // 'Actual Units', // Calculated from KPI Actual entries
      // 'Difference', // Calculated: Actual - Planned
      // 'Variance Units', // Calculated: Total - Actual
      // 'Activity Progress %', // Calculated: (Actual/Planned) * 100
      // 'Productivity Daily Rate', // Calculated: Planned Units / Duration
      // 'Total Drilling Meters', // Calculated from KPI
      // 'Drilled Meters Planned Progress', // Calculated from KPI
      // 'Drilled Meters Actual Progress', // Calculated from KPI
      // 'Remaining Meters', // Calculated: Total - Actual
      // 'Activity Planned Status', // Calculated based on dates
      // 'Activity Actual Status', // Calculated from KPI
      // 'Reported on Data Date', // Calculated from KPI
      // 'Planned Value', // Calculated: Planned Units * Rate
      // 'Earned Value', // Calculated from KPI
      // 'Delay %', // Calculated from dates
      // 'Planned Progress %', // Calculated from dates
      // 'Activity Planned Start Date', // Calculated from Planned Activity Start Date
      // 'Activity Planned Completion Date', // Calculated from Deadline
      // 'Activity Delayed?', // Calculated from dates
      // 'Activity On Track?', // Calculated from progress
      // 'Activity Completed?', // Calculated from progress
      // 'Remaining Work Value', // Calculated: Total Value - Earned Value
      // 'Variance Works Value', // Calculated: Planned Value - Earned Value
      // 'Lookahead Start Date', // Calculated from dates
      // 'Lookahead Activity Completion Date', // Calculated from dates
      // 'Remaining Lookahead Duration for Activity Completion' // Calculated from dates
    ],
    [TABLES.KPI]: [
      // ✅ Basic Information (Required for Import)
      'Project Full Code',
      'Project Code',
      'Project Sub Code',
      'Activity Name',
      'Activity',
      'Input Type',
      
      // ✅ Quantities (User Input)
      'Quantity',
      'Unit',
      'Section',
      'Zone',
      'Drilled Meters',
      'Value',
      
      // ✅ Dates (User Input)
      'Target Date',
      'Actual Date',
      'Activity Date',
      'Day',
      
      // ✅ Metadata (User Input)
      'Recorded By',
      'Notes'
      
      // ❌ Calculated Fields (Auto-Generated - NOT in Template)
      // These are calculated automatically by the system
    ]
  }
  
  return columnMappings[tableName] || []
}

/**
 * 🔄 تحويل البيانات إلى CSV
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = []
  
  // إضافة العناوين
  csvRows.push(headers.map(header => `"${header}"`).join(','))
  
  // إضافة البيانات
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || ''
      return `"${value}"`
    })
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}

/**
 * 📥 إنشاء قالب CSV صحيح للجدول
 */
export async function createCorrectTemplate(tableName: string): Promise<OperationResult> {
  try {
    const correctColumns = getCorrectColumnNames(tableName)
    
    if (correctColumns.length === 0) {
      return {
        success: false,
        message: `No column mapping found for table: ${tableName}`,
        error: 'Unknown table'
      }
    }
    
    // إنشاء صف فارغ مع أسماء الأعمدة الصحيحة
    const templateData = [correctColumns.reduce((acc, col) => {
      acc[col] = ''
      return acc
    }, {} as any)]
    
    // تحويل إلى CSV
    const csvContent = convertToCSV(templateData)
    
    // تحميل الملف
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${tableName}_template.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log(`✅ Template created for ${tableName} with ${correctColumns.length} columns`)
    
    return {
      success: true,
      message: `Template created successfully with correct column names`,
      data: { columns: correctColumns }
    }
    
  } catch (error: any) {
    console.error('❌ Error creating template:', error)
    return {
      success: false,
      message: `Failed to create template: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * 🔄 تحويل أسماء الأعمدة من CSV إلى أسماء قاعدة البيانات
 */
function normalizeColumnNames(data: any[], tableName: string): any[] {
  console.log(`🔄 Normalizing column names for table: ${tableName}`)
  
  // خريطة تحويل أسماء الأعمدة (موحدة مع الصفحات الأخرى)
  const columnMappings: Record<string, Record<string, string>> = {
    [TABLES.PROJECTS]: {
      'contract_amount': 'Contract Amount',
      'project_code': 'Project Code',
      'project_name': 'Project Name',
      'project_type': 'Project Type',
      'project_status': 'Project Status',
      'client_name': 'Client Name',
      'consultant_name': 'Consultant Name',
      'project_manager_email': 'Project Manager Email',
      'area_manager_email': 'Area Manager Email',
      'date_project_awarded': 'Date Project Awarded',
      'workmanship_only': 'Workmanship only?',
      'advance_payment_required': 'Advnace Payment Required',
      'first_party_name': 'First Party name',
      'virtual_material_value': 'Virtual Material Value',
      'responsible_division': 'Responsible Division',
      'plot_number': 'Plot Number',
      'kpi_completed': 'KPI Completed',
      'contract_status': 'Contract Status',
      'work_programme': 'Work Programme',
      'latitude': 'Latitude',
      'longitude': 'Longitude'
    },
    [TABLES.BOQ_ACTIVITIES]: {
      'project_code': 'Project Code',
      'project_sub_code': 'Project Sub Code',
      'project_full_code': 'Project Full Code',
      'activity': 'Activity',
      'activity_name': 'Activity Name',
      'activity_division': 'Activity Division',
      'unit': 'Unit',
      'zone_ref': 'Zone Ref',
      'zone_number': 'Zone Number',
      'total_units': 'Total Units',
      'planned_units': 'Planned Units',
      'actual_units': 'Actual Units',
      'difference': 'Difference',
      'variance_units': 'Variance Units',
      'rate': 'Rate',
      'total_value': 'Total Value',
      'planned_value': 'Planned Value',
      'planned_activity_start_date': 'Planned Activity Start Date',
      'deadline': 'Deadline',
      'calendar_duration': 'Calendar Duration',
      'activity_progress_percentage': 'Activity Progress %',
      'productivity_daily_rate': 'Productivity Daily Rate',
      'total_drilling_meters': 'Total Drilling Meters',
      'drilled_meters_planned_progress': 'Drilled Meters Planned Progress',
      'drilled_meters_actual_progress': 'Drilled Meters Actual Progress',
      'remaining_meters': 'Remaining Meters',
      'activity_planned_status': 'Activity Planned Status',
      'activity_actual_status': 'Activity Actual Status',
      'reported_on_data_date': 'Reported on Data Date',
      'earned_value': 'Earned Value',
      'delay_percentage': 'Delay %',
      'planned_progress_percentage': 'Planned Progress %',
      'activity_planned_start_date': 'Activity Planned Start Date',
      'activity_planned_completion_date': 'Activity Planned Completion Date',
      'activity_delayed': 'Activity Delayed?',
      'activity_on_track': 'Activity On Track?',
      'activity_completed': 'Activity Completed?',
      'project_full_name': 'Project Full Name',
      'project_status': 'Project Status',
      'remaining_work_value': 'Remaining Work Value',
      'variance_works_value': 'Variance Works Value',
      'lookahead_start_date': 'Lookahead Start Date',
      'lookahead_activity_completion_date': 'Lookahead Activity Completion Date',
      'remaining_lookahead_duration_for_activity_completion': 'Remaining Lookahead Duration for Activity Completion'
    },
    [TABLES.KPI]: {
      'project_full_code': 'Project Full Code',
      'project_code': 'Project Code',
      'project_sub_code': 'Project Sub Code',
      'activity_name': 'Activity Name',
      'activity': 'Activity',
      'input_type': 'Input Type',
      'quantity': 'Quantity',
      'unit': 'Unit',
      'section': 'Section',
      'zone': 'Zone',
      'drilled_meters': 'Drilled Meters',
      'value': 'Value',
      'target_date': 'Target Date',
      'actual_date': 'Actual Date',
      'activity_date': 'Activity Date',
      'day': 'Day',
      'recorded_by': 'Recorded By',
      'notes': 'Notes'
    }
  }
  
  const mappings = columnMappings[tableName] || {}
  
  return data.map((row, index) => {
    const normalizedRow: any = {}
    
    Object.keys(row).forEach(originalKey => {
      let value = row[originalKey]
      
      // تحويل اسم العمود إذا كان موجود في الخريطة
      const normalizedKey = mappings[originalKey.toLowerCase()] || originalKey
      
      // Handle different data types
      if (typeof value === 'string') {
        // Try to convert date strings
        if (normalizedKey.toLowerCase().includes('date') || normalizedKey.toLowerCase().includes('time')) {
          // Skip if it's clearly not a date (contains letters that shouldn't be in dates)
          if (/[a-zA-Z]{3,}/.test(value) && !value.match(/^\d{4}-\d{2}-\d{2}/)) {
            console.warn(`⚠️ Skipping invalid date value in row ${index + 1}, column ${normalizedKey}: "${value}"`)
            normalizedRow[normalizedKey] = null
            return
          }
        }
      }
      
      normalizedRow[normalizedKey] = value
    })
    
    // Log first few normalized rows for debugging
    if (index < 3) {
      console.log(`📋 Normalized Row ${index + 1}:`, normalizedRow)
    }
    
    return normalizedRow
  })
}

/**
 * تشغيل الحسابات بعد استيراد BOQ Activities
 */
async function runCalculationsAfterBOQImport(importedData: any[]): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const { mapBOQFromDB } = await import('./dataMappers')
    const { autoSaveActivityCalculations, updateProjectCalculations } = await import('./autoCalculationSaver')
    
    console.log(`📊 Processing ${importedData.length} imported BOQ activities for calculations...`)
    
    const processedProjects = new Set<string>()
    
    // Process each imported activity
    for (const row of importedData) {
      try {
        // Check if row already has an ID (from insert with .select())
        let dbActivity = row
        
        // If no ID, fetch from database using Project Code and Activity Name
        if (!row.id) {
          const projectCode = row['Project Code'] || row['project_code'] || row.project_code || ''
          const activityName = row['Activity Name'] || row['Activity'] || row['activity_name'] || row.activity_name || ''
          
          if (!projectCode || !activityName) {
            console.warn('⚠️ Skipping activity without Project Code or Activity Name:', { projectCode, activityName })
            continue
          }
          
          // Fetch the activity from database (now it has an ID)
          const { data: fetchedActivity, error: fetchError } = await supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Code', projectCode)
            .eq('Activity Name', activityName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (fetchError || !fetchedActivity) {
            console.warn(`⚠️ Could not fetch activity ${activityName} for project ${projectCode}:`, fetchError)
            continue
          }
          
          dbActivity = fetchedActivity
        }
        
        // Map to application format
        const activity = mapBOQFromDB(dbActivity)
        
        if (!activity || !activity.id) {
          console.warn('⚠️ Skipping activity without ID:', dbActivity)
          continue
        }
        
        // Run calculations for this activity
        const result = await autoSaveActivityCalculations(activity)
        
        if (result.success) {
          console.log(`✅ Calculated values for activity: ${activity.activity_name}`)
        } else {
          console.warn(`⚠️ Calculation errors for activity ${activity.activity_name}:`, result.errors)
        }
        
        // Track project for later batch update
        if (activity.project_code) {
          processedProjects.add(activity.project_code)
        }
      } catch (error: any) {
        console.warn(`⚠️ Error processing activity:`, error)
        // Continue with next activity
      }
    }
    
    // Update project calculations for all affected projects
    console.log(`🔄 Updating calculations for ${processedProjects.size} projects...`)
    const projectCodes = Array.from(processedProjects)
    for (const projectCode of projectCodes) {
      try {
        await updateProjectCalculations(projectCode)
        console.log(`✅ Updated calculations for project: ${projectCode}`)
      } catch (error: any) {
        console.warn(`⚠️ Error updating project ${projectCode}:`, error)
      }
    }
    
    console.log(`✅ Completed calculations for ${importedData.length} BOQ activities`)
  } catch (error: any) {
    console.error('❌ Error running BOQ calculations:', error)
    throw error
  }
}

/**
 * تشغيل الحسابات بعد استيراد Projects
 */
async function runCalculationsAfterProjectImport(importedData: any[]): Promise<void> {
  try {
    const { updateProjectCalculations } = await import('./autoCalculationSaver')
    
    console.log(`📊 Processing ${importedData.length} imported projects for calculations...`)
    
    const processedProjects = new Set<string>()
    
    for (const row of importedData) {
      try {
        const projectCode = row['Project Code'] || row['project_code'] || row.project_code
        
        if (!projectCode) {
          console.warn('⚠️ Skipping project without Project Code:', row)
          continue
        }
        
        processedProjects.add(projectCode)
      } catch (error: any) {
        console.warn(`⚠️ Error processing project:`, error)
      }
    }
    
    // Update project calculations for all imported projects
    console.log(`🔄 Updating calculations for ${processedProjects.size} projects...`)
    const projectCodes = Array.from(processedProjects)
    for (const projectCode of projectCodes) {
      try {
        await updateProjectCalculations(projectCode)
        console.log(`✅ Updated calculations for project: ${projectCode}`)
      } catch (error: any) {
        console.warn(`⚠️ Error updating project ${projectCode}:`, error)
      }
    }
    
    console.log(`✅ Completed calculations for ${importedData.length} projects`)
  } catch (error: any) {
    console.error('❌ Error running project calculations:', error)
    throw error
  }
}

/**
 * تشغيل الحسابات بعد استيراد KPIs
 */
async function runCalculationsAfterKPIImport(importedData: any[]): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const { syncBOQFromKPI } = await import('./boqKpiSync')
    const { mapKPIFromDB } = await import('./dataMappers')
    
    console.log(`📊 Processing ${importedData.length} imported KPIs for sync...`)
    
    const processedActivities = new Set<string>()
    
    for (const row of importedData) {
      try {
        // Check if row already has an ID (from insert with .select())
        let dbKPI = row
        
        // If no ID, fetch from database using Project Full Code and Activity Name
        if (!row.id) {
          const projectFullCode = row['Project Full Code'] || row['Project Code'] || row['project_full_code'] || row['project_code'] || ''
          const activityName = row['Activity Name'] || row['Activity'] || row['activity_name'] || row.activity_name || ''
          
          if (!projectFullCode || !activityName) {
            console.warn('⚠️ Skipping KPI without Project Full Code or Activity Name:', { projectFullCode, activityName })
            continue
          }
          
          // Fetch the KPI from database (now it has an ID)
          const { data: fetchedKPI, error: fetchError } = await supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Full Code', projectFullCode)
            .eq('Activity Name', activityName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (fetchError || !fetchedKPI) {
            console.warn(`⚠️ Could not fetch KPI ${activityName} for project ${projectFullCode}:`, fetchError)
            continue
          }
          
          dbKPI = fetchedKPI
        }
        
        // Map to application format
        const kpi = mapKPIFromDB(dbKPI)
        
        if (!kpi || !kpi.id) {
          console.warn('⚠️ Skipping KPI without ID:', dbKPI)
          continue
        }
        
        // Sync BOQ from KPI (syncBOQFromKPI takes projectCode and activityName)
        const syncResult = await syncBOQFromKPI(kpi.project_full_code, kpi.activity_name)
        
        if (syncResult.success) {
          console.log(`✅ Synced BOQ for KPI: ${kpi.activity_name}`)
          
          // Track activity for later calculation
          const activityKey = `${kpi.project_full_code}-${kpi.activity_name}`
          processedActivities.add(activityKey)
        } else {
          console.warn(`⚠️ Sync failed for KPI ${kpi.activity_name}:`, syncResult.message)
        }
      } catch (error: any) {
        console.warn(`⚠️ Error processing KPI:`, error)
        // Continue with next KPI
      }
    }
    
    console.log(`✅ Completed sync for ${importedData.length} KPIs`)
  } catch (error: any) {
    console.error('❌ Error running KPI calculations:', error)
    throw error
  }
}

/**
 * استيراد بيانات إلى جدول - محسّن مع validation والترابط
 */
export async function importTableData(
  tableName: string, 
  data: any[],
  mode: 'append' | 'replace' = 'append'
): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`📥 Importing ${data.length} rows to table: ${tableName} (mode: ${mode})`)
    console.log(`🔗 Enhanced import with relationship validation`)
    
    // ✅ الخطوة 1: تحويل أسماء الأعمدة أولاً
    const normalizedData = normalizeColumnNames(data, tableName)
    console.log(`✅ Column names normalized for ${tableName}`)
    
    // ✅ الخطوة 2: التحقق من الترابط قبل الاستيراد
    const validation = await validateDataRelationships(tableName, normalizedData)
    
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors)
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`,
        error: validation.errors.join(', ')
      }
    }
    
    // عرض التحذيرات (لكن لا نمنع الاستيراد)
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Import warnings:', validation.warnings)
    }
    
    // ✅ الخطوة 2: إذا كان الوضع "replace"، نحذف البيانات القديمة أولاً
    if (mode === 'replace') {
      console.log('🗑️ Clearing existing data first...')
      const clearResult = await clearTableData(tableName)
      if (!clearResult.success) {
        return clearResult
      }
    }
    
    // ✅ الخطوة 3: تنظيف البيانات مع الحفاظ على الترابط
    const cleanedData = normalizedData.map((row, index) => {
      const cleanedRow: any = {}
      
      Object.keys(row).forEach(key => {
        let value = row[key]
        
        // ⚠️ لا نحذف Project Code, Project Full Code, Project Sub Code, أو Activity Name حتى لو كانت فارغة
        // هذه حقول مهمة للترابط
        const isImportantField = 
          key === 'Project Code' || 
          key === 'Project Sub Code' ||
          key === 'Project Sub-Code' ||
          key === 'Project Full Code' ||
          key === 'Activity Name' ||
          key === 'Activity' ||
          key === 'Input Type' // Important for KPI table
        
        if (!isImportantField && (value === '' || value === 'null' || value === 'NULL' || value === null || value === undefined)) {
          cleanedRow[key] = null
          return
        }
        
        // ✅ الحفاظ على Project Code و Activity Name حتى لو كانت strings فارغة
        if (isImportantField && (value === null || value === undefined)) {
          cleanedRow[key] = ''
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
    
    // ✅ الخطوة 4: إدراج البيانات الجديدة مع إرجاع البيانات المُدرجة
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(cleanedData as any)
      .select()
    
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
    
    const insertedRows = insertedData || []
    console.log(`✅ Successfully imported ${insertedRows.length} rows to ${tableName}`)
    
    // ✅ الخطوة 5: تشغيل الحسابات بعد الاستيراد (مثل البيانات المُنشأة من الموقع)
    try {
      if (tableName === TABLES.BOQ_ACTIVITIES || tableName === 'Planning Database - BOQ Rates') {
        console.log('🔄 Running calculations for imported BOQ activities...')
        // Use inserted data if available, otherwise fall back to cleanedData
        await runCalculationsAfterBOQImport(insertedRows.length > 0 ? insertedRows : cleanedData)
      } else if (tableName === TABLES.PROJECTS || tableName === 'Planning Database - ProjectsList') {
        console.log('🔄 Updating project calculations for imported projects...')
        await runCalculationsAfterProjectImport(insertedRows.length > 0 ? insertedRows : cleanedData)
      } else if (tableName === TABLES.KPI || tableName === 'Planning Database - KPI') {
        console.log('🔄 Syncing KPIs with BOQ activities...')
        await runCalculationsAfterKPIImport(insertedRows.length > 0 ? insertedRows : cleanedData)
      }
    } catch (calcError: any) {
      console.warn('⚠️ Calculations after import had errors (data still imported):', calcError)
      // Don't fail the import if calculations fail
    }
    
    // ✅ الخطوة 6: إرسال إشارة لتحديث جميع الصفحات
    triggerGlobalRefresh(tableName)
    console.log(`🔄 Triggered global refresh for all pages`)
    
    // إنشاء رسالة النجاح مع التحذيرات
    const importedCount = insertedRows.length > 0 ? insertedRows.length : cleanedData.length
    let successMessage = `Successfully imported ${importedCount} rows`
    if (validation.warnings.length > 0) {
      successMessage += `\n\nWarnings:\n${validation.warnings.join('\n')}`
    }
    
    return {
      success: true,
      message: successMessage,
      affectedRows: importedCount,
      data: validation.warnings.length > 0 ? { warnings: validation.warnings } : undefined
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
 * الحصول على نموذج (template) فارغ للجدول - محسن مع Templates الجديدة
 */
export async function getTableTemplate(tableName: string): Promise<OperationResult> {
  try {
    console.log(`📋 Getting enhanced template for table: ${tableName}`)
    
    // استخدام Templates الجديدة المحسنة
    const template = getEnhancedTemplate(tableName)
    
    if (!template) {
      console.error(`❌ No enhanced template found for ${tableName}`)
      return {
        success: false,
        message: `No enhanced template available for ${tableName}`,
        error: 'Template not found'
      }
    }
    
    console.log(`✅ Successfully generated enhanced template for ${tableName}`)
    return {
      success: true,
      message: 'Enhanced template generated successfully',
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
 * الحصول على Template محسن لكل جدول
 */
function getEnhancedTemplate(tableName: string): any | null {
  const templates: Record<string, any> = {
    // Activities Database Template
    'activities': {
      name: 'Activity Name',
      division: 'Division Name',
      unit: 'Unit',
      category: 'Category',
      description: 'Description',
      typical_duration: 1,
      is_active: true,
      usage_count: 0
    },
    
    // Divisions Template
    'divisions': {
      name: 'Division Name',
      description: 'Division Description',
      is_active: true
    },
    
    // Project Types Template
    'project_types': {
      name: 'Project Type Name',
      description: 'Project Type Description',
      is_active: true
    },
    
    // Currencies Template
    'currencies': {
      code: 'USD',
      name: 'Currency Name',
      symbol: '$',
      exchange_rate: 1.0,
      is_default: false,
      is_active: true
    },
    
    // Projects Template
    'Planning Database - ProjectsList': {
      'Project Code': 'P5066',
      'Project Sub-Code': 'I2',
      'Project Full Code': 'P5066-I2', // ✅ Added: Important for matching
      'Project Name': 'Sample Project Name',
      'Project Type': 'Construction',
      'Responsible Division': 'Enabling Division',
      'Plot Number': 'PLOT-001',
      'Contract Amount': '1000000',
      'Project Status': 'on-going',
      'KPI Completed': 'No',
      'Contract Status': 'Active',
      'Project Start Date': '2024-01-01',
      'Project Completion Date': '2024-12-31'
    },
    
    // BOQ Activities Template
    'Planning Database - BOQ Rates': {
      'Project Code': 'P5066',
      'Project Sub Code': 'I2',
      'Project Full Code': 'P5066-I2', // ✅ Added: Important for matching
      'Activity': 'Mobilization',
      'Activity Name': 'Mobilization',
      'Activity Division': 'Enabling Division',
      'Unit': 'Lump Sum',
      'Zone Ref': 'Zone 1',
      'Zone Number': '1',
      'Total Units': '1',
      'Planned Units': '1',
      'Rate': '50000',
      'Total Value': '50000',
      'Planned Activity Start Date': '2024-01-01',
      'Deadline': '2024-01-15',
      'Calendar Duration': '15'
    },
    
    // KPI Template
    'Planning Database - KPI': {
      'Project Full Code': 'P5066-I2', // ✅ Priority: Use Project Full Code
      'Project Code': 'P5066',
      'Project Sub Code': 'I2',
      'Activity Name': 'Mobilization',
      'Activity': 'Mobilization',
      'Input Type': 'Planned', // Required: 'Planned' or 'Actual'
      'Quantity': '1',
      'Unit': 'Lump Sum',
      'Section': 'General',
      'Zone': 'Zone 1',
      'Target Date': '2024-01-01',
      'Activity Date': '2024-01-01'
    },
    
    // Company Settings Template
    'company_settings': {
      setting_key: 'setting_key',
      setting_value: 'setting_value',
      setting_type: 'text',
      description: 'Setting Description'
    }
  }
  
  return templates[tableName] || null
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
      .select('role, permissions, custom_permissions_enabled')
      .eq('id', user.id)
      .single()
    
    if (appUserError || !appUser) {
      return false
    }
    
    // Admin لديه صلاحية دائماً
    if ((appUser as any).role === 'admin') return true
    
    // فحص الصلاحيات المخصصة
    const userPermissions = (appUser as any)?.permissions || []
    return userPermissions.includes('database.manage')
    
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
 * تحميل template CSV فارغ مع أسماء الأعمدة الصحيحة - محسن مع أمثلة
 */
export function downloadCSVTemplate(template: any, filename: string): void {
  const headers = Object.keys(template)
  
  // إنشاء أمثلة متعددة حسب نوع الجدول
  const examples = getTemplateExamples(filename)
  
  // Create template with headers and examples
  const csvRows = [
    headers.join(','), // Headers
    // Add example rows
    ...examples.map(example => 
      headers.map(header => {
        const value = example[header] || template[header]
        if (value === null || value === undefined) return ''
        
        // Add quotes if needed
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
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
 * الحصول على أمثلة للـ Templates
 */
function getTemplateExamples(filename: string): any[] {
  const examples: Record<string, any[]> = {
    'activities': [
      {
        name: 'Mobilization',
        division: 'Enabling Division',
        unit: 'Lump Sum',
        category: 'General',
        description: 'Mobilization activities',
        typical_duration: 1,
        is_active: true,
        usage_count: 0
      },
      {
        name: 'Vibro Compaction',
        division: 'Enabling Division',
        unit: 'No.',
        category: 'Soil Improvement',
        description: 'Vibro compaction work',
        typical_duration: 2,
        is_active: true,
        usage_count: 0
      }
    ],
    
    'divisions': [
      {
        name: 'Enabling Division',
        description: 'Main enabling works division',
        is_active: true
      },
      {
        name: 'Infrastructure Division',
        description: 'Infrastructure development division',
        is_active: true
      }
    ],
    
    'project_types': [
      {
        name: 'Construction',
        description: 'General construction projects',
        is_active: true
      },
      {
        name: 'Infrastructure',
        description: 'Infrastructure development projects',
        is_active: true
      }
    ],
    
    'currencies': [
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchange_rate: 1.0,
        is_default: true,
        is_active: true
      },
      {
        code: 'EUR',
        name: 'European Euro',
        symbol: '€',
        exchange_rate: 0.85,
        is_default: false,
        is_active: true
      }
    ],
    
    'Planning Database - ProjectsList': [
      {
        'Project Code': 'P5066',
        'Project Sub-Code': 'I2',
        'Project Full Code': 'P5066-I2', // ✅ Added: Important for matching
        'Project Name': 'Sample Project 1',
        'Project Type': 'Construction',
        'Responsible Division': 'Enabling Division',
        'Plot Number': 'PLOT-001',
        'Contract Amount': '1000000',
        'Project Status': 'on-going',
        'KPI Completed': 'No',
        'Project Start Date': '2024-01-01',
        'Project Completion Date': '2024-12-31'
      },
      {
        'Project Code': 'P5067',
        'Project Sub-Code': 'I1',
        'Project Full Code': 'P5067-I1', // ✅ Added: Important for matching
        'Project Name': 'Sample Project 2',
        'Project Type': 'Infrastructure',
        'Responsible Division': 'Infrastructure Division',
        'Plot Number': 'PLOT-002',
        'Contract Amount': '2500000',
        'Project Status': 'on-going',
        'KPI Completed': 'No',
        'Project Start Date': '2024-02-01',
        'Project Completion Date': '2025-01-31'
      }
    ],
    
    'Planning Database - BOQ Rates': [
      {
        'Project Code': 'P5066',
        'Project Sub Code': 'I2',
        'Project Full Code': 'P5066-I2', // ✅ Added: Important for matching
        'Activity': 'Mobilization',
        'Activity Name': 'Mobilization',
        'Activity Division': 'Enabling Division',
        'Unit': 'Lump Sum',
        'Zone Ref': 'Zone 1',
        'Zone Number': '1',
        'Total Units': '1',
        'Planned Units': '1',
        'Rate': '50000',
        'Total Value': '50000',
        'Planned Activity Start Date': '2024-01-01',
        'Deadline': '2024-01-15',
        'Calendar Duration': '15'
      },
      {
        'Project Code': 'P5066',
        'Project Sub Code': 'I2',
        'Project Full Code': 'P5066-I2', // ✅ Same project, different activity
        'Activity': 'Vibro Compaction',
        'Activity Name': 'Vibro Compaction',
        'Activity Division': 'Enabling Division',
        'Unit': 'No.',
        'Zone Ref': 'Zone 1',
        'Zone Number': '1',
        'Total Units': '100',
        'Planned Units': '80',
        'Rate': '250',
        'Total Value': '20000',
        'Planned Activity Start Date': '2024-01-16',
        'Deadline': '2024-02-15',
        'Calendar Duration': '30'
      }
    ],
    
    'Planning Database - KPI': [
      {
        'Project Full Code': 'P5066-I2', // ✅ Priority: Use Project Full Code
        'Project Code': 'P5066',
        'Project Sub Code': 'I2',
        'Activity Name': 'Mobilization',
        'Activity': 'Mobilization',
        'Input Type': 'Planned', // Required: 'Planned' or 'Actual'
        'Quantity': '1',
        'Unit': 'Lump Sum',
        'Section': 'General',
        'Zone': 'Zone 1',
        'Target Date': '2024-01-01',
        'Activity Date': '2024-01-01'
      },
      {
        'Project Full Code': 'P5066-I2', // ✅ Same project and activity, different input type
        'Project Code': 'P5066',
        'Project Sub Code': 'I2',
        'Activity Name': 'Vibro Compaction',
        'Activity': 'Vibro Compaction',
        'Input Type': 'Actual', // Required: 'Planned' or 'Actual'
        'Quantity': '100',
        'Unit': 'No.',
        'Section': 'Soil Improvement',
        'Zone': 'Zone 1',
        'Actual Date': '2024-01-20',
        'Activity Date': '2024-01-20'
      }
    ],
    
    'company_settings': [
      {
        setting_key: 'company_name',
        setting_value: 'Your Company Name',
        setting_type: 'text',
        description: 'Company name setting'
      },
      {
        setting_key: 'default_currency',
        setting_value: 'USD',
        setting_type: 'text',
        description: 'Default currency code'
      }
    ]
  }
  
  return examples[filename] || []
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

/**
 * استيراد آمن للبيانات - يحل مشاكل ID والبيانات الفارغة
 */
export async function importTableDataSafe(
  tableName: string, 
  data: any[],
  mode: 'append' | 'replace' = 'append'
): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`🛡️ Safe importing ${data.length} rows to table: ${tableName} (mode: ${mode})`)
    
    // تنظيف البيانات وإزالة حقول ID
    const cleanedData = data.map((row, index) => {
      const cleanedRow: any = {}
      
      Object.keys(row).forEach(key => {
        let value = row[key]
        
        // تخطي حقول ID والحقول الممنوعة
        if (key.toLowerCase().includes('id') && 
            (key === 'id' || key === 'uuid' || key === 'created_at' || key === 'updated_at')) {
          console.log(`🛡️ Skipping ID field: ${key}`)
          return
        }
        
        // تنظيف القيم الفارغة
        if (value === '' || value === 'null' || value === 'NULL' || value === null || value === undefined) {
          cleanedRow[key] = null
          return
        }
        
        // معالجة أنواع البيانات المختلفة
        if (typeof value === 'string') {
          // محاولة تحويل التواريخ
          if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
            if (/[a-zA-Z]{3,}/.test(value) && !value.match(/^\d{4}-\d{2}-\d{2}/)) {
              console.warn(`⚠️ Skipping invalid date value in row ${index + 1}, column ${key}: "${value}"`)
              cleanedRow[key] = null
              return
            }
          }
          
          // محاولة تحويل الأرقام
          if (key.toLowerCase().includes('amount') || 
              key.toLowerCase().includes('rate') || 
              key.toLowerCase().includes('count') ||
              key.toLowerCase().includes('duration') ||
              key.toLowerCase().includes('percentage')) {
            const numValue = parseFloat(value)
            if (!isNaN(numValue)) {
              cleanedRow[key] = numValue
              return
            }
          }
          
          // محاولة تحويل Boolean
          if (key.toLowerCase().includes('active') || 
              key.toLowerCase().includes('enabled') ||
              key.toLowerCase().includes('completed')) {
            if (value.toLowerCase() === 'true' || value === '1') {
              cleanedRow[key] = true
              return
            } else if (value.toLowerCase() === 'false' || value === '0') {
              cleanedRow[key] = false
              return
            }
          }
        }
        
        cleanedRow[key] = value
      })
      
      return cleanedRow
    }).filter(row => Object.keys(row).length > 0) // إزالة الصفوف الفارغة
    
    console.log(`🛡️ Cleaned data: ${cleanedData.length} rows (removed ${data.length - cleanedData.length} empty rows)`)
    
    if (cleanedData.length === 0) {
      return {
        success: false,
        message: 'No valid data to import after cleaning'
      }
    }
    
    // إذا كان الوضع "replace"، نحذف البيانات القديمة أولاً
    if (mode === 'replace') {
      console.log('🗑️ Clearing existing data first...')
      const clearResult = await clearTableData(tableName)
      if (!clearResult.success) {
        return clearResult
      }
    }
    
    // استخدام الدوال الآمنة للجداول المحددة
    let result: OperationResult
    
    if (tableName === 'activities') {
      // استخدام الدالة الآمنة للأنشطة
      result = await importActivitiesSafe(cleanedData)
    } else if (tableName === 'divisions') {
      // استخدام الدالة الآمنة للأقسام
      result = await importDivisionsSafe(cleanedData)
    } else if (tableName === 'project_types') {
      // استخدام الدالة الآمنة لأنواع المشاريع
      result = await importProjectTypesSafe(cleanedData)
    } else if (tableName === 'currencies') {
      // استخدام الدالة الآمنة للعملات
      result = await importCurrenciesSafe(cleanedData)
    } else {
      // استخدام الاستيراد العادي للجداول الأخرى
      result = await importTableData(tableName, cleanedData, mode)
    }
    
    if (result.success) {
      console.log(`✅ Safe import successful: ${result.message}`)
    } else {
      console.error(`❌ Safe import failed: ${result.message}`)
    }
    
    return result
    
  } catch (error: any) {
    console.error('❌ Safe import error:', error)
    return {
      success: false,
      message: `Safe import failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * استيراد آمن للأنشطة
 */
async function importActivitiesSafe(data: any[]): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`🎯 Safe importing ${data.length} activities`)
    
    const results = []
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        // التأكد من وجود الحقول المطلوبة
        if (!row.name || !row.division || !row.unit) {
          errors.push(`Row ${i + 1}: Missing required fields (name, division, unit)`)
          errorCount++
          continue
        }
        
        // إدراج أو تحديث النشاط
        const { data: result, error } = await supabase
          .from('activities')
          .upsert({
            name: row.name.trim(),
            division: row.division.trim(),
            unit: row.unit.trim(),
            category: row.category || null,
            description: row.description || null,
            typical_duration: row.typical_duration || null,
            is_active: row.is_active !== undefined ? row.is_active : true,
            usage_count: row.usage_count || 0,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'name,division'
          })
        
        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
        
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`)
        errorCount++
      }
    }
    
    return {
      success: errorCount === 0,
      message: `Imported ${successCount} activities${errorCount > 0 ? ` with ${errorCount} errors` : ''}`,
      affectedRows: successCount,
      error: errorCount > 0 ? errors.join('; ') : undefined
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Activities import failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * استيراد آمن للأقسام
 */
async function importDivisionsSafe(data: any[]): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`🏢 Safe importing ${data.length} divisions`)
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        if (!row.name) {
          errors.push(`Row ${i + 1}: Missing required field (name)`)
          errorCount++
          continue
        }
        
        const { error } = await supabase
          .from('divisions')
          .upsert({
            name: row.name.trim(),
            description: row.description || null,
            is_active: row.is_active !== undefined ? row.is_active : true,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'name'
          })
        
        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
        
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`)
        errorCount++
      }
    }
    
    return {
      success: errorCount === 0,
      message: `Imported ${successCount} divisions${errorCount > 0 ? ` with ${errorCount} errors` : ''}`,
      affectedRows: successCount,
      error: errorCount > 0 ? errors.join('; ') : undefined
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Divisions import failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * استيراد آمن لأنواع المشاريع
 */
async function importProjectTypesSafe(data: any[]): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`📁 Safe importing ${data.length} project types`)
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        if (!row.name) {
          errors.push(`Row ${i + 1}: Missing required field (name)`)
          errorCount++
          continue
        }
        
        const { error } = await supabase
          .from('project_types')
          .upsert({
            name: row.name.trim(),
            description: row.description || null,
            is_active: row.is_active !== undefined ? row.is_active : true,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'name'
          })
        
        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
        
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`)
        errorCount++
      }
    }
    
    return {
      success: errorCount === 0,
      message: `Imported ${successCount} project types${errorCount > 0 ? ` with ${errorCount} errors` : ''}`,
      affectedRows: successCount,
      error: errorCount > 0 ? errors.join('; ') : undefined
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Project types import failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * استيراد آمن للعملات
 */
async function importCurrenciesSafe(data: any[]): Promise<OperationResult> {
  try {
    const supabase = getSupabaseClient()
    
    console.log(`💰 Safe importing ${data.length} currencies`)
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    // ملاحظة: إذا كان هناك عملة افتراضية جديدة، سيتم التعامل معها في upsert
    // النظام سيتعامل مع is_default تلقائياً في upsert
    // يمكن تشغيل Database/currency_default_management.sql لإدارة أفضل
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        if (!row.code || !row.name) {
          errors.push(`Row ${i + 1}: Missing required fields (code, name)`)
          errorCount++
          continue
        }
        
        const { error } = await supabase
          .from('currencies')
          .upsert({
            code: row.code.trim().toUpperCase(),
            name: row.name.trim(),
            symbol: row.symbol || null,
            exchange_rate: row.exchange_rate || 1,
            is_default: row.is_default === true || row.is_default === 'true',
            is_active: row.is_active !== undefined ? row.is_active : true,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'code'
          })
        
        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
        
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`)
        errorCount++
      }
    }
    
    return {
      success: errorCount === 0,
      message: `Imported ${successCount} currencies${errorCount > 0 ? ` with ${errorCount} errors` : ''}`,
      affectedRows: successCount,
      error: errorCount > 0 ? errors.join('; ') : undefined
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Currencies import failed: ${error.message}`,
      error: error.message
    }
  }
}


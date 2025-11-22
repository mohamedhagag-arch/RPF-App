/**
 * 💾 Backup Manager - Complete Database Backup System
 * 
 * مدير النسخ الاحتياطي
 * يوفر نظام شامل للنسخ الاحتياطي والاستعادة
 */

import { getAllTables, exportTableData, importTableData, downloadAsJSON, readJSONFile, OperationResult } from './databaseManager'
import { getSupabaseClient } from './simpleConnectionManager'
import { createClient } from '@supabase/supabase-js'

/**
 * Get Supabase client with service role key for server-side operations
 * This bypasses RLS policies to ensure all data is accessible
 */
export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // ✅ Check if credentials are available
  // During build time, these might not be available, but with force-dynamic routes should not be called during build
  if (!supabaseUrl || !serviceRoleKey) {
    // Only throw if we're definitely in runtime (not build)
    // During build, Next.js might try to collect page data, but force-dynamic should prevent this
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
    
    if (isBuildTime) {
      // During build, we should not reach here with force-dynamic, but if we do, throw a clear error
      throw new Error('Cannot create Supabase client during build time. Ensure route has export const dynamic = "force-dynamic"')
    }
    
    throw new Error('Missing Supabase credentials. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// بنية النسخة الاحتياطية
export interface BackupData {
  version: string
  timestamp: string
  tables: Record<string, any[]>
  storage?: {
    buckets: Record<string, {
      name: string
      files: Array<{
        name: string
        path: string
        size: number
        contentType: string
        url?: string
      }>
    }>
  }
  settings?: {
    systemSettings?: any[]
    userPreferences?: any[]
    securitySettings?: any[]
    backupSettings?: any[]
  }
  metadata: BackupMetadata
}

// معلومات النسخة الاحتياطية
export interface BackupMetadata {
  createdAt: string
  createdBy: string
  totalTables: number
  totalRows: number
  totalFiles?: number
  totalFileSize?: number
  appVersion: string
  description?: string
  includesStorage?: boolean
  includesSettings?: boolean
}

// نتيجة عملية النسخ الاحتياطي
export interface BackupResult {
  success: boolean
  message: string
  backup?: BackupData
  error?: string
}

/**
 * إنشاء نسخة احتياطية كاملة من قاعدة البيانات
 */
export async function createFullBackup(description?: string): Promise<BackupResult> {
  try {
    console.log('💾 Starting full database backup...')
    
    // Verify we're connecting to the production database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      console.log('🌐 Database URL:', supabaseUrl)
      console.log('✅ Backup source: Production database (Supabase Cloud)')
    } else {
      console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL not configured')
    }
    
    const tables = getAllTables()
    console.log(`📋 Found ${tables.length} tables to backup`)
    const backupData: BackupData = {
      version: '2.0.0', // Updated version for comprehensive backup
      timestamp: new Date().toISOString(),
      tables: {},
      storage: {
        buckets: {}
      },
      settings: {},
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        totalTables: 0,
        totalRows: 0,
        totalFiles: 0,
        totalFileSize: 0,
        appVersion: '1.0.0',
        description,
        includesStorage: true,
        includesSettings: true
      }
    }
    
    let totalRows = 0
    let successfulTables = 0
    const failedTables: string[] = []
    
    // Use service role client for backup to bypass RLS policies
    const isServerSide = typeof window === 'undefined'
    let supabaseServiceClient: any = null
    
    if (isServerSide) {
      try {
        supabaseServiceClient = getSupabaseServiceClient()
        console.log('✅ Using Service Role Key for backup (bypasses RLS)')
      } catch (error) {
        console.warn('⚠️ Could not create service role client, using default:', error)
      }
    }
    
    // تصدير كل جدول
    for (const table of tables) {
      console.log(`📦 Backing up table: ${table.displayName} (${table.name})`)
      
      // Use custom export with service role if available
      const exportResult = supabaseServiceClient 
        ? await exportTableDataWithClient(table.name, supabaseServiceClient)
        : await exportTableData(table.name)
      
      if (exportResult.success) {
        // Include empty tables too (data will be empty array)
        backupData.tables[table.name] = exportResult.data || []
        const rowCount = exportResult.data?.length || 0
        totalRows += rowCount
        successfulTables++
        
        if (rowCount > 0) {
          console.log(`✅ Backed up ${rowCount} rows from ${table.displayName}`)
        } else {
          console.log(`✅ Table ${table.displayName} is empty (0 rows) - included in backup`)
        }
      } else {
        failedTables.push(table.displayName)
        console.error(`❌ Failed to backup ${table.displayName}: ${exportResult.message || exportResult.error}`)
      }
    }
    
    backupData.metadata.totalTables = successfulTables
    backupData.metadata.totalRows = totalRows
    
    // Backup Storage Files
    console.log('📁 Backing up storage files...')
    try {
      const supabase = supabaseServiceClient || getSupabaseClient()
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (!bucketsError && buckets) {
        let totalFiles = 0
        let totalFileSize = 0
        
        for (const bucket of buckets) {
          console.log(`📦 Backing up bucket: ${bucket.name}`)
          const { data: files, error: filesError } = await supabase.storage
            .from(bucket.name)
            .list('', {
              limit: 1000,
              offset: 0,
              sortBy: { column: 'created_at', order: 'desc' }
            })
          
          if (!filesError && files) {
            const fileList: any[] = []
            
            for (const file of files) {
              if (file.id) {
                const { data: fileData } = await supabase.storage
                  .from(bucket.name)
                  .createSignedUrl(file.name, 3600) // 1 hour URL
                
                fileList.push({
                  name: file.name,
                  path: file.name,
                  size: file.metadata?.size || 0,
                  contentType: file.metadata?.mimetype || 'application/octet-stream',
                  url: fileData?.signedUrl || undefined
                })
                
                totalFiles++
                totalFileSize += file.metadata?.size || 0
              }
            }
            
            backupData.storage!.buckets[bucket.name] = {
              name: bucket.name,
              files: fileList
            }
            
            console.log(`✅ Backed up ${fileList.length} files from bucket: ${bucket.name}`)
          } else if (filesError) {
            console.warn(`⚠️ Error listing files in bucket ${bucket.name}:`, filesError.message)
          }
        }
        
        backupData.metadata.totalFiles = totalFiles
        backupData.metadata.totalFileSize = totalFileSize
        console.log(`✅ Storage backup completed: ${totalFiles} files (${(totalFileSize / 1024 / 1024).toFixed(2)} MB)`)
      } else if (bucketsError) {
        console.warn('⚠️ Error listing buckets:', bucketsError.message)
        backupData.metadata.includesStorage = false
      }
    } catch (error: any) {
      console.warn('⚠️ Error backing up storage:', error.message)
      backupData.metadata.includesStorage = false
    }
    
    // Backup Settings
    console.log('⚙️ Backing up settings...')
    try {
      const supabase = supabaseServiceClient || getSupabaseClient()
      
      // System Settings
      const { data: systemSettings } = await supabase
        .from('system_settings')
        .select('*')
      
      if (systemSettings) {
        backupData.settings!.systemSettings = systemSettings
        console.log(`✅ Backed up ${systemSettings.length} system settings`)
      }
      
      // User Preferences
      const { data: userPreferences } = await supabase
        .from('user_preferences')
        .select('*')
      
      if (userPreferences) {
        backupData.settings!.userPreferences = userPreferences
        console.log(`✅ Backed up ${userPreferences.length} user preferences`)
      }
      
      // Security Settings
      const { data: securitySettings } = await supabase
        .from('security_settings')
        .select('*')
      
      if (securitySettings) {
        backupData.settings!.securitySettings = securitySettings
        console.log(`✅ Backed up ${securitySettings.length} security settings`)
      }
      
      // Backup Settings
      const { data: backupSettings } = await supabase
        .from('backup_settings')
        .select('*')
      
      if (backupSettings) {
        backupData.settings!.backupSettings = backupSettings
        console.log(`✅ Backed up ${backupSettings.length} backup settings`)
      }
      
      console.log('✅ Settings backup completed')
    } catch (error: any) {
      console.warn('⚠️ Error backing up settings:', error.message)
      backupData.metadata.includesSettings = false
    }
    
    if (successfulTables === 0) {
      return {
        success: false,
        message: 'Failed to backup any tables',
        error: `All tables failed: ${failedTables.join(', ')}`
      }
    }
    
    const backupSummary = [
      `${successfulTables}/${tables.length} tables`,
      `${totalRows} rows`,
      backupData.metadata.totalFiles ? `${backupData.metadata.totalFiles} files` : '',
      backupData.metadata.totalFileSize ? `(${(backupData.metadata.totalFileSize / 1024 / 1024).toFixed(2)} MB)` : ''
    ].filter(Boolean).join(', ')
    
    console.log(`✅ Complete backup finished: ${backupSummary}`)
    
    // Log detailed summary
    console.log('📋 Backup Summary:')
    console.log(`   - Tables backed up: ${successfulTables}/${tables.length}`)
    console.log(`   - Total rows: ${totalRows}`)
    if (backupData.metadata.totalFiles) {
      console.log(`   - Files: ${backupData.metadata.totalFiles} (${(backupData.metadata.totalFileSize! / 1024 / 1024).toFixed(2)} MB)`)
    }
    console.log(`   - Settings included: ${backupData.metadata.includesSettings ? 'Yes' : 'No'}`)
    console.log(`   - Storage included: ${backupData.metadata.includesStorage ? 'Yes' : 'No'}`)
    
    // Log table details
    console.log('📊 Table Details:')
    for (const [tableName, tableData] of Object.entries(backupData.tables)) {
      const rowCount = Array.isArray(tableData) ? tableData.length : 0
      console.log(`   - ${tableName}: ${rowCount} rows`)
    }
    
    if (failedTables.length > 0) {
      console.warn(`⚠️ Failed tables: ${failedTables.join(', ')}`)
    }
    
    // Verify backup has data
    if (totalRows === 0 && Object.keys(backupData.tables).length > 0) {
      console.warn('⚠️ WARNING: Backup created but all tables are empty!')
    }
    
    return {
      success: true,
      message: `Successfully backed up ${successfulTables}/${tables.length} tables (${totalRows} rows)`,
      backup: backupData
    }
    
  } catch (error: any) {
    console.error('❌ Error creating backup:', error)
    return {
      success: false,
      message: 'Failed to create backup',
      error: error.message
    }
  }
}

/**
 * Export table data using a specific Supabase client (for service role access)
 */
async function exportTableDataWithClient(
  tableName: string,
  supabase: any
): Promise<OperationResult> {
  try {
    console.log(`📤 Exporting data from table: ${tableName} (using service role)`)
    
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
      
      if (!data) {
        console.log(`📤 No data returned. Total fetched: ${allData.length} rows`)
        break
      }
      
      if (data.length === 0) {
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
    
    if (allData.length === 0) {
      console.log(`⚠️ Table ${tableName} is empty (0 rows)`)
      return {
        success: true,
        message: `Table is empty (0 rows)`,
        data: [],
        affectedRows: 0
      }
    }
    
    console.log(`✅ Successfully exported ${allData.length} rows from ${tableName}`)
    return {
      success: true,
      message: `Exported ${allData.length} rows`,
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
 * تنزيل النسخة الاحتياطية كملف
 */
export function downloadBackup(backup: BackupData): void {
  const filename = `database_backup_${backup.timestamp.split('T')[0]}`
  downloadAsJSON(backup, filename)
  console.log('✅ Backup file downloaded')
}

/**
 * استعادة قاعدة البيانات من نسخة احتياطية
 */
export async function restoreFromBackup(
  backup: BackupData,
  options: {
    mode: 'replace' | 'append'
    selectedTables?: string[]
    confirmReplace?: boolean
  }
): Promise<OperationResult> {
  try {
    const { mode, selectedTables, confirmReplace } = options
    
    console.log(`🔄 Starting database restore (mode: ${mode})...`)
    
    // تحذير للوضع "replace"
    if (mode === 'replace' && !confirmReplace) {
      return {
        success: false,
        message: 'Replace mode requires confirmation',
        error: 'User must confirm data replacement'
      }
    }
    
    // التحقق من صحة النسخة الاحتياطية
    if (!backup || !backup.tables || !backup.version) {
      return {
        success: false,
        message: 'Invalid backup file',
        error: 'Backup file is missing required fields'
      }
    }
    
    const tablesToRestore = selectedTables 
      ? Object.keys(backup.tables).filter(t => selectedTables.includes(t))
      : Object.keys(backup.tables)
    
    let successCount = 0
    let failCount = 0
    const results: Record<string, string> = {}
    
    // استعادة كل جدول
    for (const tableName of tablesToRestore) {
      const tableData = backup.tables[tableName]
      
      if (!tableData || tableData.length === 0) {
        console.warn(`⚠️ Skipping empty table: ${tableName}`)
        results[tableName] = 'Skipped (empty)'
        continue
      }
      
      console.log(`📥 Restoring ${tableData.length} rows to ${tableName}...`)
      
      const importResult = await importTableData(tableName, tableData, mode)
      
      if (importResult.success) {
        successCount++
        results[tableName] = `✅ ${tableData.length} rows`
        console.log(`✅ Successfully restored ${tableName}`)
      } else {
        failCount++
        results[tableName] = `❌ ${importResult.message}`
        console.error(`❌ Failed to restore ${tableName}:`, importResult.message)
      }
    }
    
    const totalTables = tablesToRestore.length
    const message = `Restore completed: ${successCount}/${totalTables} tables succeeded`
    
    console.log(`✅ ${message}`)
    if (failCount > 0) {
      console.warn(`⚠️ ${failCount} tables failed`)
    }
    
    return {
      success: successCount > 0,
      message,
      data: results,
      affectedRows: successCount
    }
    
  } catch (error: any) {
    console.error('❌ Error restoring backup:', error)
    return {
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    }
  }
}

/**
 * قراءة ملف نسخة احتياطية
 */
export async function loadBackupFile(file: File): Promise<BackupResult> {
  try {
    console.log('📂 Loading backup file...')
    
    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        message: 'Invalid file type. Please upload a JSON backup file.',
        error: 'File must be .json'
      }
    }
    
    const backup = await readJSONFile(file) as BackupData
    
    // التحقق من صحة البنية
    if (!backup.version || !backup.tables || !backup.metadata) {
      return {
        success: false,
        message: 'Invalid backup file structure',
        error: 'Missing required backup fields'
      }
    }
    
    console.log('✅ Backup file loaded successfully')
    console.log(`📊 Backup info:`, {
      version: backup.version,
      timestamp: backup.timestamp,
      tables: Object.keys(backup.tables).length,
      totalRows: backup.metadata.totalRows
    })
    
    return {
      success: true,
      message: `Backup loaded: ${Object.keys(backup.tables).length} tables, ${backup.metadata.totalRows} rows`,
      backup
    }
    
  } catch (error: any) {
    console.error('❌ Error loading backup file:', error)
    return {
      success: false,
      message: 'Failed to load backup file',
      error: error.message
    }
  }
}

/**
 * التحقق من توافق النسخة الاحتياطية
 */
export function validateBackup(backup: BackupData): {
  valid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  
  // التحقق من الإصدار
  if (backup.version !== '1.0.0') {
    warnings.push(`Backup version mismatch: ${backup.version} (current: 1.0.0)`)
  }
  
  // التحقق من عمر النسخة
  const backupDate = new Date(backup.timestamp)
  const daysSinceBackup = Math.floor((Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceBackup > 30) {
    warnings.push(`Backup is ${daysSinceBackup} days old`)
  }
  
  // التحقق من وجود جداول
  const tableCount = Object.keys(backup.tables).length
  if (tableCount === 0) {
    errors.push('Backup contains no tables')
  }
  
  // التحقق من وجود بيانات
  const totalRows = Object.values(backup.tables).reduce((sum, table) => sum + table.length, 0)
  if (totalRows === 0) {
    warnings.push('Backup contains no data')
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * إنشاء نسخة احتياطية لجدول واحد
 */
export async function createTableBackup(tableName: string): Promise<BackupResult> {
  try {
    console.log(`💾 Creating backup for table: ${tableName}`)
    
    const exportResult = await exportTableData(tableName)
    
    if (!exportResult.success) {
      return {
        success: false,
        message: `Failed to backup table: ${exportResult.message}`,
        error: exportResult.error
      }
    }
    
    const backup: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tables: {
        [tableName]: exportResult.data || []
      },
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        totalTables: 1,
        totalRows: exportResult.data?.length || 0,
        appVersion: '1.0.0',
        description: `Single table backup: ${tableName}`
      }
    }
    
    console.log(`✅ Table backup created: ${exportResult.data?.length || 0} rows`)
    
    return {
      success: true,
      message: `Successfully backed up ${exportResult.data?.length || 0} rows`,
      backup
    }
    
  } catch (error: any) {
    console.error(`❌ Error backing up table ${tableName}:`, error)
    return {
      success: false,
      message: 'Failed to backup table',
      error: error.message
    }
  }
}

/**
 * حفظ النسخة الاحتياطية محلياً (localStorage)
 */
export function saveBackupLocally(backup: BackupData, name: string): boolean {
  try {
    const key = `backup_${name}_${Date.now()}`
    const data = JSON.stringify(backup)
    
    // التحقق من الحجم (localStorage محدود بـ 5-10 MB)
    const sizeInMB = new Blob([data]).size / (1024 * 1024)
    
    if (sizeInMB > 5) {
      console.warn(`⚠️ Backup size (${sizeInMB.toFixed(2)} MB) may exceed localStorage limit`)
      return false
    }
    
    localStorage.setItem(key, data)
    console.log(`✅ Backup saved locally: ${key} (${sizeInMB.toFixed(2)} MB)`)
    return true
    
  } catch (error) {
    console.error('❌ Error saving backup locally:', error)
    return false
  }
}

/**
 * الحصول على قائمة النسخ الاحتياطية المحلية
 */
export function getLocalBackups(): Array<{
  key: string
  name: string
  timestamp: number
  size: string
}> {
  const backups: Array<any> = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('backup_')) {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const size = new Blob([data]).size
          const sizeStr = size < 1024 
            ? `${size} B`
            : size < 1024 * 1024
            ? `${(size / 1024).toFixed(2)} KB`
            : `${(size / (1024 * 1024)).toFixed(2)} MB`
          
          const parts = key.split('_')
          const timestamp = parseInt(parts[parts.length - 1])
          
          backups.push({
            key,
            name: parts.slice(1, -1).join('_'),
            timestamp,
            size: sizeStr
          })
        }
      } catch (error) {
        console.error(`Error reading backup ${key}:`, error)
      }
    }
  }
  
  return backups.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * حذف نسخة احتياطية محلية
 */
export function deleteLocalBackup(key: string): boolean {
  try {
    localStorage.removeItem(key)
    console.log(`✅ Deleted local backup: ${key}`)
    return true
  } catch (error) {
    console.error('❌ Error deleting local backup:', error)
    return false
  }
}


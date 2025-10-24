/**
 * 💾 Backup Manager - Complete Database Backup System
 * 
 * مدير النسخ الاحتياطي
 * يوفر نظام شامل للنسخ الاحتياطي والاستعادة
 */

import { getAllTables, exportTableData, importTableData, downloadAsJSON, readJSONFile, OperationResult } from './databaseManager'

// بنية النسخة الاحتياطية
export interface BackupData {
  version: string
  timestamp: string
  tables: Record<string, any[]>
  metadata: BackupMetadata
}

// معلومات النسخة الاحتياطية
export interface BackupMetadata {
  createdAt: string
  createdBy: string
  totalTables: number
  totalRows: number
  appVersion: string
  description?: string
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
    
    const tables = getAllTables()
    const backupData: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tables: {},
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        totalTables: 0,
        totalRows: 0,
        appVersion: '1.0.0',
        description
      }
    }
    
    let totalRows = 0
    let successfulTables = 0
    const failedTables: string[] = []
    
    // تصدير كل جدول
    for (const table of tables) {
      console.log(`📦 Backing up table: ${table.displayName}`)
      
      const exportResult = await exportTableData(table.name)
      
      if (exportResult.success && exportResult.data) {
        backupData.tables[table.name] = exportResult.data
        totalRows += exportResult.data.length
        successfulTables++
        console.log(`✅ Backed up ${exportResult.data.length} rows from ${table.displayName}`)
      } else {
        failedTables.push(table.displayName)
        console.warn(`⚠️ Failed to backup ${table.displayName}: ${exportResult.message}`)
      }
    }
    
    backupData.metadata.totalTables = successfulTables
    backupData.metadata.totalRows = totalRows
    
    if (successfulTables === 0) {
      return {
        success: false,
        message: 'Failed to backup any tables',
        error: `All tables failed: ${failedTables.join(', ')}`
      }
    }
    
    console.log(`✅ Backup completed: ${successfulTables}/${tables.length} tables, ${totalRows} total rows`)
    
    if (failedTables.length > 0) {
      console.warn(`⚠️ Failed tables: ${failedTables.join(', ')}`)
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


/**
 * 🔄 Google Drive Backup API Route
 * 
 * API endpoint for automated backups to Google Drive
 * Can be called from cron job or manually
 */

import { NextRequest, NextResponse } from 'next/server'
import { createFullBackup } from '@/lib/backupManager'
import { uploadBackupToGoogleDrive, refreshGoogleDriveToken, cleanupOldBackups } from '@/lib/googleDriveBackup'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max
export const dynamic = 'force-dynamic' // Prevent static generation during build

/**
 * Get Supabase client with service role key for API routes
 * This bypasses RLS policies for server-side operations
 */
function getSupabaseServiceClient() {
  // ✅ التحقق من أننا في runtime وليس build time
  if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Cannot create Supabase client during build time. This function should only be called at runtime.')
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * POST /api/backup/google-drive
 * 
 * Creates a backup and uploads it to Google Drive
 * 
 * Headers:
 * - Authorization: Bearer <token> (optional, for cron jobs)
 * - X-Cron-Secret: <secret> (required for cron jobs)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify permissions (for scheduled tasks)
    const cronSecret = req.headers.get('X-Cron-Secret')
    const expectedSecret = process.env.CRON_SECRET

    if (cronSecret && expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting automated Google Drive backup...')
    console.log('🕐 Backup request time:', new Date().toISOString())
    console.log('📋 Request info:', {
      isCronRequest: !!req.headers.get('X-Cron-Secret') || !!req.headers.get('x-vercel-signature'),
      hasCronSecret: !!req.headers.get('X-Cron-Secret'),
      hasVercelSignature: !!req.headers.get('x-vercel-signature'),
      frequency: req.nextUrl.searchParams.get('frequency')
    })

    // Get Google Drive settings from database
    // Note: We don't filter by is_active for manual backups - allow manual backup even if auto-backup is disabled
    const supabase = getSupabaseServiceClient()
    const { data: settings, error: settingsError } = await supabase
      .from('backup_settings')
      .select('*')
      .eq('storage_location', 'google_drive')
      .single()

    if (settingsError || !settings) {
      console.error('❌ Error fetching backup settings:', settingsError)
      return NextResponse.json({
        success: false,
        error: 'Google Drive backup not configured',
        message: 'Please configure Google Drive backup in Database Management settings',
        details: settingsError?.message || 'No settings found'
      }, { status: 400 })
    }
    
    console.log('✅ Backup settings found:', { 
      id: settings.id, 
      is_active: (settings as any).is_active,
      frequency: (settings as any).frequency,
      folder_id: (settings as any).folder_id
    })

    // Type assertion for settings
    const backupSettings = settings as {
      id: string
      retention_days?: number | null
      last_backup_at?: string | null
      next_backup_at?: string | null
      folder_id?: string | null
      is_active?: boolean
      frequency?: string
      [key: string]: any
    }

    // Check if auto-backup is enabled (for cron jobs)
    const isCronRequest = !!req.headers.get('X-Cron-Secret') || !!req.headers.get('x-vercel-signature')
    if (isCronRequest && backupSettings.is_active === false) {
      console.log('⏸️ Auto-backup is disabled, skipping scheduled backup')
      return NextResponse.json({
        success: false,
        error: 'Auto-backup is disabled',
        message: 'Automatic backups are currently disabled in settings. Enable auto-backup to run scheduled backups.'
      }, { status: 200 }) // Return 200 to prevent cron job from retrying
    }

     // Note: Frequency check is now handled in the cron job endpoint
    // This endpoint will only be called if the cron job determines backup should run
    if (isCronRequest) {
      console.log(`✅ Cron job approved backup execution for frequency: ${backupSettings.frequency}`)
    }

    // Get credentials from environment variables or database
    const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET
    // Use folder_id from database first, then from environment variable
    // Note: Empty string is treated as no folder (use root)
    console.log('🔍 Checking folder_id from backup settings:', {
      fromDatabase: backupSettings.folder_id,
      fromEnv: process.env.GOOGLE_DRIVE_FOLDER_ID,
      databaseType: typeof backupSettings.folder_id,
      databaseIsNull: backupSettings.folder_id === null,
      databaseIsEmpty: backupSettings.folder_id === ''
    })
    
    let folderId = backupSettings.folder_id || process.env.GOOGLE_DRIVE_FOLDER_ID || undefined
    if (folderId === '' || folderId === null) {
      folderId = undefined
    }
    console.log('📁 Final Folder ID:', folderId || 'root (not specified)')
    console.log('📁 Folder ID type:', typeof folderId)
    console.log('📁 Folder ID length:', folderId?.length || 0)

    if (!accessToken && !refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'Google Drive credentials not configured',
        message: 'Please set GOOGLE_DRIVE_ACCESS_TOKEN or GOOGLE_DRIVE_REFRESH_TOKEN in environment variables'
      }, { status: 400 })
    }

    // Refresh access token if needed
    let validAccessToken = accessToken
    if (!validAccessToken && refreshToken && clientId && clientSecret) {
      console.log('🔄 Access token missing, refreshing...')
      const tokenData = await refreshGoogleDriveToken(refreshToken, clientId, clientSecret)
      if (!tokenData) {
        console.error('❌ Failed to refresh Google Drive token')
        return NextResponse.json({
          success: false,
          error: 'Failed to refresh Google Drive token',
          message: 'Please re-authenticate Google Drive access. Check your GOOGLE_DRIVE_REFRESH_TOKEN in .env.local'
        }, { status: 401 })
      }
      validAccessToken = tokenData.accessToken
      console.log('✅ Access token refreshed successfully')
    }

    if (!validAccessToken) {
      console.error('❌ No valid access token available')
      return NextResponse.json({
        success: false,
        error: 'No valid Google Drive access token',
        message: 'Please configure Google Drive authentication. Set GOOGLE_DRIVE_REFRESH_TOKEN in .env.local'
      }, { status: 401 })
    }
    
    console.log('✅ Using access token:', validAccessToken.substring(0, 20) + '...')

    // Create backup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    console.log('💾 Creating database backup...')
    console.log('🌐 Database URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not configured')
    console.log('📊 Backup source: Production database (Supabase)')
    
    const backupResult = await createFullBackup('Automated daily backup to Google Drive')

    if (!backupResult.success || !backupResult.backup) {
      console.error('❌ Backup creation failed:', backupResult.message, backupResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create backup',
        message: backupResult.message || backupResult.error || 'Unknown error'
      }, { status: 500 })
    }
    
    // Verify backup data
    const backup = backupResult.backup
    console.log('📊 Backup created successfully:')
    console.log(`   - Version: ${backup.version}`)
    console.log(`   - Tables: ${Object.keys(backup.tables).length}`)
    console.log(`   - Total rows: ${backup.metadata.totalRows}`)
    console.log(`   - Total files: ${backup.metadata.totalFiles || 0}`)
    console.log(`   - Tables included: ${Object.keys(backup.tables).join(', ')}`)
    
    // Log table details
    for (const [tableName, tableData] of Object.entries(backup.tables)) {
      const rowCount = Array.isArray(tableData) ? tableData.length : 0
      console.log(`   - ${tableName}: ${rowCount} rows`)
    }

    // Upload backup to Google Drive
    console.log('📁 Uploading backup to Google Drive...')
    console.log('📤 Uploading backup to Google Drive with config:', {
      hasAccessToken: !!validAccessToken,
      hasRefreshToken: !!refreshToken,
      folderId: folderId || 'root (not specified)',
      folderIdType: typeof folderId,
      folderIdLength: folderId?.length || 0
    })
    
    const uploadResult = await uploadBackupToGoogleDrive(backupResult.backup, {
      accessToken: validAccessToken,
      refreshToken: refreshToken,
      folderId: folderId
    })

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to upload backup',
        message: uploadResult.message,
        backupCreated: true // Backup was created but upload failed
      }, { status: 500 })
    }

    // Cleanup old backups if enabled
    if (backupSettings.retention_days && backupSettings.retention_days > 0) {
      console.log(`🧹 Cleaning up backups older than ${backupSettings.retention_days} days...`)
      await cleanupOldBackups(
        { accessToken: validAccessToken, folderId: folderId },
        backupSettings.retention_days
      )
    }

    // تحديث last_backup_at في الإعدادات
    // Note: Using RPC or direct SQL would be better, but for now we use type assertion
    try {
      await (supabase as any)
        .from('backup_settings')
        .update({
          last_backup_at: new Date().toISOString(),
          next_backup_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next day
        })
        .eq('id', backupSettings.id)
    } catch (updateError) {
      console.warn('⚠️ Could not update backup settings timestamp:', updateError)
      // Non-critical error, continue
    }

    console.log('✅ Automated backup completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Backup uploaded successfully to Google Drive',
      backup: {
        timestamp: backupResult.backup.timestamp,
        totalTables: backupResult.backup.metadata.totalTables,
        totalRows: backupResult.backup.metadata.totalRows
      },
      googleDrive: {
        fileId: uploadResult.fileId,
        fileUrl: uploadResult.fileUrl,
        folderId: folderId || 'root',
        folderUrl: folderId 
          ? `https://drive.google.com/drive/folders/${folderId}`
          : 'https://drive.google.com/drive/my-drive'
      }
    })

  } catch (error: any) {
    console.error('❌ Error in automated backup:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * GET /api/backup/google-drive
 * 
 * Get backup status and configuration
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient()
    const { data: settings, error } = await supabase
      .from('backup_settings')
      .select('*')
      .eq('storage_location', 'google_drive')
      .single()

    if (error || !settings) {
      return NextResponse.json({
        configured: false,
        message: 'Google Drive backup not configured'
      })
    }

    // Type assertion for settings
    const backupSettings = settings as {
      frequency?: string
      last_backup_at?: string | null
      next_backup_at?: string | null
      retention_days?: number | null
      [key: string]: any
    }

    return NextResponse.json({
      configured: true,
      settings: {
        frequency: backupSettings.frequency,
        lastBackupAt: backupSettings.last_backup_at,
        nextBackupAt: backupSettings.next_backup_at,
        retentionDays: backupSettings.retention_days
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      error: error.message
    }, { status: 500 })
  }
}


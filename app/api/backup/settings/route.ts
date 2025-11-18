/**
 * ⚙️ Backup Settings API Route
 * 
 * API endpoint for managing backup settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
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
 * GET /api/backup/settings
 * 
 * Get current backup settings
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

    const backupSettings = settings as {
      id: string
      backup_type?: string
      frequency?: string
      retention_days?: number | null
      last_backup_at?: string | null
      next_backup_at?: string | null
      is_active?: boolean
      folder_id?: string | null
      [key: string]: any
    }

    return NextResponse.json({
      configured: true,
      settings: {
        id: backupSettings.id,
        backupType: backupSettings.backup_type || 'full',
        frequency: backupSettings.frequency || 'daily',
        retentionDays: backupSettings.retention_days || 30,
        lastBackupAt: backupSettings.last_backup_at,
        nextBackupAt: backupSettings.next_backup_at,
        isActive: backupSettings.is_active ?? true,
        folderId: backupSettings.folder_id || ''
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * PUT /api/backup/settings
 * 
 * Update backup settings
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { frequency, retentionDays, folderId, isActive } = body

    console.log('📝 PUT /api/backup/settings - Request body:', { frequency, retentionDays, folderId, isActive })

    const supabase = getSupabaseServiceClient()
    
    // Get current settings (don't filter by is_active to allow editing disabled settings)
    const { data: currentSettings, error: fetchError } = await (supabase as any)
      .from('backup_settings')
      .select('*')
      .eq('storage_location', 'google_drive')
      .single()

    console.log('🔍 Current settings fetch result:', { 
      hasData: !!currentSettings, 
      error: fetchError?.message,
      errorCode: fetchError?.code 
    })

    if (fetchError || !currentSettings) {
      // Create new settings if they don't exist
      // Note: Not including created_by/updated_by to avoid foreign key issues with auth.users
      const insertData: Record<string, any> = {
        backup_type: 'full',
        frequency: frequency || 'daily',
        retention_days: retentionDays || 30,
        include_files: true,
        include_database: true,
        compression: true,
        encryption: false,
        storage_location: 'google_drive',
        is_active: isActive !== undefined ? isActive : true,
        folder_id: folderId || null
      }
      // Only add created_by/updated_by if we have a valid user session
      // For API routes, we skip these to avoid permission issues
      
      console.log('➕ Creating new backup settings:', insertData)
      
      const { data: newSettings, error: createError } = await (supabase as any)
        .from('backup_settings')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating backup settings:', createError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create backup settings',
          message: createError.message || 'Unknown error',
          details: createError.code || createError.hint || ''
        }, { status: 500 })
      }

      console.log('✅ Backup settings created successfully:', newSettings?.id)

      return NextResponse.json({
        success: true,
        message: 'Backup settings created successfully',
        settings: newSettings as any
      })
    }

    // Update existing settings
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (frequency !== undefined) {
      updateData.frequency = frequency
    }
    if (retentionDays !== undefined) {
      updateData.retention_days = retentionDays
    }
    if (folderId !== undefined) {
      updateData.folder_id = folderId
    }
    if (isActive !== undefined) {
      updateData.is_active = isActive
    }

    console.log('🔄 Updating backup settings:', { id: currentSettings.id, updateData })
    
    const { data: updatedSettings, error: updateError } = await (supabase as any)
      .from('backup_settings')
      .update(updateData)
      .eq('id', currentSettings.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating backup settings:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update backup settings',
        message: updateError.message || 'Unknown error',
        details: updateError.code || updateError.hint || ''
      }, { status: 500 })
    }

    console.log('✅ Backup settings updated successfully')

    // Update environment variable for folder ID if provided
    if (folderId !== undefined) {
      // Note: This would need to be handled at deployment level
      // For now, we just store it in the database
    }

    return NextResponse.json({
      success: true,
      message: 'Backup settings updated successfully',
      settings: updatedSettings
    })

  } catch (error: any) {
    console.error('❌ Unexpected error in PUT /api/backup/settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}


/**
 * 🧪 Test Backup API (Local Development)
 * 
 * Simple endpoint to test backup functionality locally
 * 
 * Usage:
 *   POST http://localhost:3000/api/test-backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createFullBackup } from '@/lib/backupManager'
import { uploadBackupToGoogleDrive, refreshGoogleDriveToken } from '@/lib/googleDriveBackup'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    console.log('🧪 Starting local backup test...')

    // Step 1: Create backup
    console.log('📦 Creating backup...')
    const backupResult = await createFullBackup('Local test backup')
    
    if (!backupResult.success || !backupResult.backup) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create backup',
        message: backupResult.message
      }, { status: 500 })
    }

    console.log(`✅ Backup created: ${backupResult.backup.metadata.totalTables} tables`)

    // Step 2: Check if Google Drive is configured
    const hasGoogleDrive = 
      process.env.GOOGLE_DRIVE_CLIENT_ID && 
      process.env.GOOGLE_DRIVE_CLIENT_SECRET

    if (!hasGoogleDrive) {
      return NextResponse.json({
        success: true,
        message: 'Backup created successfully (Google Drive not configured)',
        backup: {
          timestamp: backupResult.backup.timestamp,
          totalTables: backupResult.backup.metadata.totalTables,
          totalRows: backupResult.backup.metadata.totalRows
        },
        googleDrive: {
          configured: false,
          message: 'Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to test Google Drive upload'
        }
      })
    }

    // Step 3: Get/Refresh access token
    let accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN
    
    if (!accessToken && process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      console.log('🔄 Refreshing token...')
      const tokenData = await refreshGoogleDriveToken(
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        process.env.GOOGLE_DRIVE_CLIENT_ID!,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET!
      )
      
      if (tokenData) {
        accessToken = tokenData.accessToken
        console.log('✅ Token refreshed')
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        success: true,
        message: 'Backup created successfully',
        backup: {
          timestamp: backupResult.backup.timestamp,
          totalTables: backupResult.backup.metadata.totalTables,
          totalRows: backupResult.backup.metadata.totalRows
        },
        googleDrive: {
          configured: true,
          authenticated: false,
          message: 'Set GOOGLE_DRIVE_ACCESS_TOKEN or GOOGLE_DRIVE_REFRESH_TOKEN to upload to Google Drive'
        }
      })
    }

    // Step 4: Upload to Google Drive
    console.log('📁 Uploading to Google Drive...')
    const uploadResult = await uploadBackupToGoogleDrive(backupResult.backup, {
      accessToken: accessToken,
      refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
    })

    if (!uploadResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Backup created but upload failed',
        backup: {
          timestamp: backupResult.backup.timestamp,
          totalTables: backupResult.backup.metadata.totalTables,
          totalRows: backupResult.backup.metadata.totalRows
        },
        googleDrive: {
          success: false,
          error: uploadResult.message
        }
      })
    }

    console.log('✅ Upload successful!')

    return NextResponse.json({
      success: true,
      message: 'Backup created and uploaded successfully',
      backup: {
        timestamp: backupResult.backup.timestamp,
        totalTables: backupResult.backup.metadata.totalTables,
        totalRows: backupResult.backup.metadata.totalRows
      },
      googleDrive: {
        success: true,
        fileId: uploadResult.fileId,
        fileUrl: uploadResult.fileUrl
      }
    })

  } catch (error: any) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}



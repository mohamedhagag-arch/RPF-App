/**
 * ⏰ Daily Backup Cron Job
 * 
 * Vercel Cron Job endpoint for daily automated backups
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-backup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

export async function GET(req: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    // Vercel Cron sends 'x-vercel-signature' header, but we can also check for CRON_SECRET
    const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('X-Cron-Secret')
    const vercelSignature = req.headers.get('x-vercel-signature')
    const expectedSecret = process.env.CRON_SECRET

    // Allow if:
    // 1. CRON_SECRET is set and matches, OR
    // 2. Request has Vercel signature (from Vercel Cron), OR
    // 3. No CRON_SECRET is set (for development/testing)
    const isAuthorized = 
      (expectedSecret && cronSecret === expectedSecret) ||
      vercelSignature !== null ||
      !expectedSecret

    if (!isAuthorized) {
      console.warn('⚠️ Unauthorized cron job request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('⏰ Backup cron job triggered at:', new Date().toISOString())
    console.log('📋 Request headers:', {
      hasCronSecret: !!cronSecret,
      hasVercelSignature: !!vercelSignature,
      userAgent: req.headers.get('user-agent'),
      allHeaders: Object.fromEntries(req.headers.entries())
    })

    // Call Google Drive backup API
    // Use VERCEL_URL in production, or NEXT_PUBLIC_APP_URL if set
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    console.log('🌐 Environment check:', {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      baseUrl: baseUrl
    })

    // Get frequency from database settings instead of query parameter
    // This is more reliable as Vercel Cron may not support query parameters
    console.log('🔍 Fetching backup settings to determine frequency...')
    const settingsResponse = await fetch(`${baseUrl}/api/backup/settings`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    const settingsData = await settingsResponse.json()
    
    if (!settingsData.configured || !settingsData.settings) {
      console.warn('⚠️ Backup settings not configured, skipping backup')
      return NextResponse.json({
        success: true,
        message: 'Backup settings not configured',
        skipped: true
      })
    }

    const configuredFrequency = settingsData.settings.frequency || 'daily'
    const isActive = settingsData.settings.isActive !== false
    
    console.log('📅 Configured frequency:', configuredFrequency)
    console.log('✅ Is active:', isActive)

    if (!isActive) {
      console.log('⏸️ Auto-backup is disabled, skipping backup')
      return NextResponse.json({
        success: true,
        message: 'Auto-backup is disabled',
        skipped: true
      })
    }

    // Determine if backup should run based on current time and frequency
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentDay = now.getUTCDay() // 0 = Sunday
    const currentDate = now.getUTCDate()
    
    let shouldRun = false
    
    switch (configuredFrequency) {
      case 'hourly':
        shouldRun = true // Run every hour
        break
      case 'every-6-hours':
        shouldRun = currentHour % 6 === 0 // Run at 0, 6, 12, 18
        break
      case 'every-12-hours':
        shouldRun = currentHour === 0 || currentHour === 12 // Run at 0 and 12
        break
      case 'twice-daily':
        shouldRun = currentHour === 0 || currentHour === 12 // Run at 0 and 12
        break
      case 'daily':
        shouldRun = currentHour === 2 // Run at 2:00 AM UTC
        break
      case 'weekly':
        shouldRun = currentDay === 0 && currentHour === 2 // Run Sunday at 2:00 AM UTC
        break
      case 'monthly':
        shouldRun = currentDate === 1 && currentHour === 2 // Run 1st of month at 2:00 AM UTC
        break
      case 'manual':
        shouldRun = false // Never run automatically
        break
      default:
        shouldRun = currentHour === 2 // Default: daily at 2:00 AM
    }

    if (!shouldRun) {
      console.log(`⏸️ Backup skipped: frequency=${configuredFrequency}, current time=${now.toISOString()}`)
      return NextResponse.json({
        success: true,
        message: `Backup skipped: not scheduled for this time (frequency: ${configuredFrequency})`,
        skipped: true,
        currentTime: now.toISOString(),
        frequency: configuredFrequency
      })
    }

    console.log('✅ Backup should run based on schedule, proceeding...')
    console.log('🌐 Calling backup API:', `${baseUrl}/api/backup/google-drive`)

    const response = await fetch(`${baseUrl}/api/backup/google-drive`, {
      method: 'POST',
      headers: {
        'X-Cron-Secret': process.env.CRON_SECRET || '',
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json().catch((error) => {
      console.error('❌ Failed to parse response:', error)
      return { error: 'Failed to parse response', status: response.status }
    })

    if (!response.ok) {
      console.error('❌ Backup failed:', result)
      // If backup is disabled, return success (200) to prevent cron retries
      if (result.error === 'Auto-backup is disabled') {
        console.log('ℹ️ Auto-backup is disabled, this is expected')
        return NextResponse.json({
          success: true,
          message: 'Auto-backup is disabled',
          details: result
        })
      }
      return NextResponse.json(result, { status: response.status })
    }

    console.log('✅ Daily backup completed:', result.message || result)

    // Also cleanup old activities (older than 7 days)
    try {
      console.log('🧹 Starting cleanup of old user activities...')
      const backupManager = await import('@/lib/backupManager')
      const supabase = backupManager.getSupabaseServiceClient()
      
      const { data: cleanupData, error: cleanupError } = await (supabase as any).rpc('cleanup_old_activities')
      
      if (cleanupError) {
        console.error('❌ Error cleaning up old activities:', cleanupError)
      } else {
        const deletedCount = cleanupData?.[0]?.deleted_count || 0
        console.log(`✅ Cleaned up ${deletedCount} old activity records`)
      }
    } catch (cleanupErr: any) {
      console.error('❌ Error in cleanup process:', cleanupErr)
      // Don't fail the backup if cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: 'Daily backup completed successfully',
      details: result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}



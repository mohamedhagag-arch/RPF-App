import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/backupManager'

export const dynamic = 'force-dynamic'

/**
 * Cron job endpoint to cleanup old user activities (older than 7 days)
 * Scheduled to run daily at 3 AM UTC
 * 
 * Vercel Cron: This endpoint is called automatically by Vercel cron jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel adds a special header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Verify cron secret if set
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('🧹 Starting cleanup of old user activities...')
    
    const supabase = getSupabaseServiceClient()
    
    // Call the cleanup function
    const { data, error } = await (supabase as any).rpc('cleanup_old_activities')
    
    if (error) {
      console.error('❌ Error cleaning up old activities:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error
        },
        { status: 500 }
      )
    }

    const deletedCount = data?.[0]?.deleted_count || 0
    const cutoffDate = data?.[0]?.deleted_date || null

    console.log(`✅ Cleaned up ${deletedCount} activity records older than 7 days`)

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount,
      cutoff_date: cutoffDate,
      message: `Successfully deleted ${deletedCount} old activity records`,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Error in cleanup cron job:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/backupManager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API endpoint to cleanup old user activities (older than 7 days)
 * This should be called daily via a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access (optional - you can add authentication here)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // If cron secret is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServiceClient()
    
    // Call the cleanup function
    const { data, error } = await (supabase as any).rpc('cleanup_old_activities')
    
    if (error) {
      console.error('Error cleaning up old activities:', error)
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
      message: `Successfully deleted ${deletedCount} old activity records`
    })
  } catch (error: any) {
    console.error('Error in cleanup endpoint:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check how many records would be deleted
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient()
    
    // Count activities older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { count, error } = await (supabase as any)
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', sevenDaysAgo)
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      old_records_count: count || 0,
      cutoff_date: sevenDaysAgo,
      message: `Found ${count || 0} activity records older than 7 days`
    })
  } catch (error: any) {
    console.error('Error checking old activities:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}


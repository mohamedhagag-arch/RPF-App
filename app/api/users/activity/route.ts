import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/users/activity
 * Get online users and today's users
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'online' // 'online' or 'today'

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (type === 'online') {
      // First, mark inactive users as offline (cleanup)
      try {
        await (supabase as any).rpc('mark_inactive_users_offline')
      } catch (cleanupError) {
        // Log but don't fail if cleanup fails
        if (process.env.NODE_ENV === 'development') {
          console.warn('Warning: Failed to mark inactive users offline:', cleanupError)
        }
      }

      // Get currently online users
      const { data, error } = await supabase.rpc('get_online_users') as { data: any[] | null, error: any }
      
      if (error) {
        console.error('Error fetching online users:', error)
        return NextResponse.json(
          { error: 'Failed to fetch online users', details: error.message },
          { status: 500 }
        )
      }

      const users = Array.isArray(data) ? data : []
      
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 [Online Users] Found ${users.length} online users`)
      }
      
      return NextResponse.json({
        success: true,
        users: users,
        count: users.length
      })
    } else if (type === 'today') {
      // Get users who visited today
      const { data, error } = await supabase.rpc('get_today_users') as { data: any[] | null, error: any }
      
      if (error) {
        console.error('Error fetching today users:', error)
        return NextResponse.json(
          { error: 'Failed to fetch today users', details: error.message },
          { status: 500 }
        )
      }

      const users = Array.isArray(data) ? data : []
      return NextResponse.json({
        success: true,
        users: users,
        count: users.length
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid type parameter. Use "online" or "today"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error in GET /api/users/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/activity
 * Update user activity (heartbeat)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Parse request body
    let body: any = {}
    try {
      body = await request.json()
    } catch (parseError) {
      // If body parsing fails (e.g., from sendBeacon), use defaults
      body = { is_online: true }
    }
    
    const { is_online = true, session_id, user_agent, ip_address } = body

    // ✅ FIX: For heartbeat requests (is_online: true), silently succeed if no user
    // This prevents 403 errors when session is still being established
    if (authError || !user) {
      // If it's a heartbeat request (keeping user online), silently succeed
      // This is normal during session initialization
      if (is_online) {
        return NextResponse.json({
          success: true,
          message: 'Heartbeat received (session not ready)'
        })
      }
      
      // For explicit offline requests or other operations, return 401
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get IP address from request if not provided
    const clientIp = ip_address || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      '0.0.0.0'

    // Update user activity
    const { error } = await (supabase as any).rpc('update_user_activity', {
      p_user_id: user.id,
      p_is_online: is_online,
      p_session_id: session_id || null,
      p_user_agent: user_agent || request.headers.get('user-agent') || null,
      p_ip_address: clientIp
    })

    if (error) {
      // Log error but don't fail heartbeat requests - they're not critical
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [User Activity] Failed to update activity:', error.message)
      }
      
      // For heartbeat requests, still return success to prevent error spam
      if (is_online) {
        return NextResponse.json({
          success: true,
          message: 'Heartbeat received (update failed)'
        })
      }
      
      // For other requests, return error
      return NextResponse.json(
        { error: 'Failed to update user activity', details: error.message },
        { status: 500 }
      )
    }

    // Log successful update in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [User Activity] Updated user ${user.id} - is_online: ${is_online}`)
    }

    return NextResponse.json({
      success: true,
      message: 'User activity updated'
    })
  } catch (error: any) {
    // For heartbeat requests, silently succeed even on errors
    try {
      const body = await request.json().catch(() => ({}))
      if (body.is_online !== false) {
        return NextResponse.json({
          success: true,
          message: 'Heartbeat received (error handled)'
        })
      }
    } catch {
      // If we can't parse body, assume it's a heartbeat
      return NextResponse.json({
        success: true,
        message: 'Heartbeat received (error handled)'
      })
    }
    
    console.error('Error in POST /api/users/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


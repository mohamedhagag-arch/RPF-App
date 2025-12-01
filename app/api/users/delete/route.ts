import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * API Route to delete a user
 * This route uses Service Role Key to delete users from Supabase Auth
 * DELETE /api/users/delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // ✅ Check if current user has permission to delete users
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user: currentUser }, error: currentUserAuthError } = await supabase.auth.getUser()
    
    if (currentUserAuthError || !currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user's role from users table
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role, custom_permissions_enabled, permissions')
      .eq('id', currentUser.id)
      .single()

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 403 }
      )
    }

    // ✅ Allow Admin to delete users always (even with custom_permissions_enabled)
    // ✅ Other users need users.delete permission
    const isAdmin = currentUserData.role === 'admin'
    
    // Check if user has users.delete permission
    let hasDeletePermission = false
    if (currentUserData.custom_permissions_enabled) {
      // If custom permissions enabled, check custom permissions
      hasDeletePermission = currentUserData.permissions?.includes('users.delete') || false
    } else {
      // If using default role permissions, check if role has users.delete
      // Admin always has all permissions by default
      hasDeletePermission = isAdmin || currentUserData.permissions?.includes('users.delete') || false
    }
    
    if (!isAdmin && !hasDeletePermission) {
      return NextResponse.json(
        { error: 'User not allowed to delete users' },
        { status: 403 }
      )
    }

    // Get Service Role Key from environment
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create Supabase client with Service Role Key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Delete from auth users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('❌ Error deleting user from auth:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to delete user from authentication' },
        { status: 500 }
      )
    }

    // Delete from users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Error deleting user from users table:', profileError)
      // Note: Auth user is already deleted, so we continue
      return NextResponse.json(
        { 
          error: profileError.message || 'Failed to delete user profile',
          warning: 'User was deleted from authentication but profile deletion failed'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'User deleted successfully'
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('❌ Error in delete user API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


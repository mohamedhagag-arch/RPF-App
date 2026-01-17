import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Middleware for handling authentication and route protection
 * 
 * ✅ Fix: Does not redirect on refresh for protected routes
 * - If user is on protected route with session → stays on same page
 * - If user is on home page with session → redirects to dashboard
 * - If user is on protected route without session → redirects to login
 * - ✅ Added: Check maintenance mode and redirect non-admin users
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return res
  }

  // Skip maintenance page itself
  if (pathname === '/maintenance') {
    return res
  }

  // Check maintenance mode
  try {
    // Create Supabase client for settings check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // Try using the public function first (if it exists)
      let isMaintenanceEnabled = false
      try {
        const { data: functionResult, error: functionError } = await (supabase as any)
          .rpc('get_maintenance_mode_status')
        
        if (!functionError && functionResult !== null && functionResult !== undefined) {
          isMaintenanceEnabled = functionResult === true || functionResult === 'true'
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Maintenance mode (from function):', isMaintenanceEnabled)
          }
        } else {
          // Fallback to direct query
          const { data: maintenanceSetting, error: maintenanceError } = await supabase
            .from('system_settings')
            .select('setting_value, setting_type')
            .eq('setting_key', 'maintenance_mode_enabled')
            .eq('is_public', true) // Only get public settings
            .single()

          if (maintenanceError && maintenanceError.code !== 'PGRST116') {
            console.log('Error fetching maintenance mode:', maintenanceError)
          }

          // Handle JSONB values - extract actual boolean value
          const settingValue = maintenanceSetting?.setting_value
          
          if (settingValue !== null && settingValue !== undefined) {
            // Handle different JSONB formats
            if (typeof settingValue === 'boolean') {
              isMaintenanceEnabled = settingValue
            } else if (typeof settingValue === 'string') {
              isMaintenanceEnabled = settingValue === 'true' || settingValue === 'True' || settingValue === 'TRUE'
            } else if (typeof settingValue === 'object') {
              // Handle JSONB object formats like {"bool": true} or {"value": true}
              if ('bool' in settingValue) {
                isMaintenanceEnabled = settingValue.bool === true
              } else if ('value' in settingValue) {
                isMaintenanceEnabled = settingValue.value === true || settingValue.value === 'true'
              } else if ('boolean' in settingValue) {
                isMaintenanceEnabled = settingValue.boolean === true
              } else if (Object.keys(settingValue).length === 1) {
                // Single key object, might be the value itself
                const firstValue = Object.values(settingValue)[0]
                isMaintenanceEnabled = firstValue === true || firstValue === 'true' || firstValue === 'True'
              } else {
                // Try to parse as boolean
                const stringValue = JSON.stringify(settingValue)
                isMaintenanceEnabled = stringValue.includes('true') && !stringValue.includes('false')
              }
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Maintenance mode check (direct query):', {
              settingValue,
              isMaintenanceEnabled,
              type: typeof settingValue
            })
          }
        }
      } catch (funcErr) {
        // Function might not exist, try direct query
        console.log('Function get_maintenance_mode_status not available, using direct query:', funcErr)
        
        const { data: maintenanceSetting, error: maintenanceError } = await supabase
          .from('system_settings')
          .select('setting_value, setting_type')
          .eq('setting_key', 'maintenance_mode_enabled')
          .eq('is_public', true) // Only get public settings
          .single()

        if (maintenanceError && maintenanceError.code !== 'PGRST116') {
          console.log('Error fetching maintenance mode:', maintenanceError)
        }

        const settingValue = maintenanceSetting?.setting_value
        if (settingValue !== null && settingValue !== undefined) {
          if (typeof settingValue === 'boolean') {
            isMaintenanceEnabled = settingValue
          } else if (typeof settingValue === 'string') {
            isMaintenanceEnabled = settingValue === 'true' || settingValue === 'True'
          } else if (typeof settingValue === 'object') {
            const stringValue = JSON.stringify(settingValue)
            isMaintenanceEnabled = stringValue.includes('true') && !stringValue.includes('false')
          }
        }
      }

      if (isMaintenanceEnabled) {
        // Check if user is admin
        const supabaseAuth = createMiddlewareClient({ req, res })
        let isAdmin = false

        try {
          const { data: { session } } = await supabaseAuth.auth.getSession()
          
          if (session?.user) {
            // Get user role from users table
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single()

            isAdmin = userData?.role === 'admin'
            
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 User admin check:', {
                userId: session.user.id,
                role: userData?.role,
                isAdmin
              })
            }
          } else {
            // No session - user is not logged in
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 No session found - redirecting to maintenance page')
            }
          }
        } catch (error) {
          // If error checking user, assume not admin
          console.log('Error checking admin status:', error)
        }

        // If maintenance is enabled and user is not admin (or not logged in), redirect to maintenance page
        if (!isAdmin) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🛠️ Maintenance mode enabled - redirecting to /maintenance')
          }
          return NextResponse.redirect(new URL('/maintenance', req.url))
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Admin user - allowing access despite maintenance mode')
          }
        }
      }
    }
  } catch (error) {
    // If error checking maintenance mode, continue normally
    console.log('Error checking maintenance mode:', error)
  }

  try {
    // Create Supabase client
    const supabase = createMiddlewareClient({ 
      req, 
      res
    })
    
    // Get session with timeout
    let session = null
    
    try {
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 800)
      )
      
      const result = await Promise.race([sessionPromise, timeoutPromise]) as any
      session = result.data?.session || null
    } catch (error) {
      // Timeout or error - continue without session (client will handle)
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Middleware: Session check timeout/error, allowing client-side recovery')
      }
    }
    
    // Helper function to check if session is valid
    const isSessionValid = (session: any): boolean => {
      if (!session?.user) return false
      
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000)
        if (expiresAt < new Date()) {
          return false
        }
      }
      
      if (!session.access_token || !session.refresh_token) {
        return false
      }
      
      return true
    }
    
    // Protected routes
    const protectedRoutes = [
      '/dashboard',
      '/projects',
      '/boq',
      '/kpi',
      '/reports',
      '/cost-control',
      '/settings',
      '/profile',
      '/directory',
      '/hr',
      '/procurement'
    ]
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // ✅ Case 1: Authenticated user on home page → redirect to dashboard
    if (pathname === '/' && session?.user && isSessionValid(session)) {
      // Check referer - if coming from internal redirect, don't redirect again
      const referer = req.headers.get('referer')
      const isFromInternalRedirect = referer && 
                                     referer.includes(req.nextUrl.origin) && 
                                     referer !== req.url &&
                                     !referer.endsWith('/')
      
      if (!isFromInternalRedirect) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Middleware: Authenticated user on home page, redirecting to dashboard')
        }
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    
    // ✅ Case 2: Unauthenticated user on protected route → redirect to login
    if (isProtectedRoute && pathname !== '/') {
      const hasValidSession = session && isSessionValid(session)
      
      if (!hasValidSession) {
        // Check if we have refresh token (might be recovering)
        const allCookies = req.cookies.getAll()
        const hasRefreshToken = allCookies.some(cookie => 
          cookie.name.includes('sb-') && cookie.name.includes('refresh-token')
        )
        
        if (!hasRefreshToken) {
          // No session and no refresh token → redirect to login
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Middleware: No valid session on protected route, redirecting to login', {
              pathname
            })
          }
          const redirectResponse = NextResponse.redirect(new URL('/', req.url))
          redirectResponse.headers.set('X-Middleware-Redirect', 'true')
          return redirectResponse
        } else {
          // Has refresh token → allow access (client-side will handle recovery)
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Middleware: Has refresh token, allowing access for client-side recovery')
          }
          res.headers.set('X-Has-Refresh-Token', 'true')
        }
      }
      // ✅ If user has valid session on protected route → stays on same page (no redirect)
    }
    
    // Add session info to headers
    if (session) {
      res.headers.set('X-Session-Exists', 'true')
      res.headers.set('X-User-Email', session.user?.email || '')
    } else {
      res.headers.set('X-Session-Exists', 'false')
    }
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Middleware error:', error)
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for handling authentication and route protection
 * 
 * Improved logic:
 * 1. Check session from Supabase
 * 2. If authenticated user on home page (/) → redirect to dashboard
 * 3. If unauthenticated user on protected route → check for refresh token before redirecting
 * 4. Otherwise → allow access (client-side will handle session recovery)
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

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
        setTimeout(() => reject(new Error('Session check timeout')), 2000)
      )
      
      const result = await Promise.race([sessionPromise, timeoutPromise]) as any
      session = result.data?.session || null
    } catch (error) {
      // Timeout or error - continue without session (client will handle)
      console.log('⚠️ Middleware: Session check timeout/error, allowing client-side recovery')
    }
    
    // Helper function to check if session is valid
    const isSessionValid = (session: any): boolean => {
      if (!session?.user) return false
      
      // Check if session is expired
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000)
        if (expiresAt < new Date()) {
          return false // Session expired
        }
      }
      
      // Check if we have valid tokens
      if (!session.access_token || !session.refresh_token) {
        return false // Missing tokens
      }
      
      return true
    }
    
    // Protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/projects',
      '/boq',
      '/kpi',
      '/reports',
      '/cost-control',
      '/settings',
      '/profile',
      '/directory'
    ]
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // Case 1: Authenticated user on home page → redirect to dashboard
    if (pathname === '/' && session?.user && isSessionValid(session)) {
      // Check referer to see if user came from another page
      const referer = req.headers.get('referer')
      const isFromInternalRedirect = referer && 
                                     referer.includes(req.nextUrl.origin) && 
                                     referer !== req.url &&
                                     !referer.endsWith('/')
      
      // Only redirect if user directly accessed home page (not from internal redirect)
      if (!isFromInternalRedirect) {
        console.log('✅ Middleware: Authenticated user on home page, redirecting to dashboard')
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    
    // Case 2: Unauthenticated user on protected route
    if (isProtectedRoute && pathname !== '/') {
      const hasValidSession = session && isSessionValid(session)
      
      if (!hasValidSession) {
        // Check if we have refresh token in cookies (might be recovering)
        const allCookies = req.cookies.getAll()
        const hasRefreshToken = allCookies.some(cookie => 
          cookie.name.includes('sb-') && cookie.name.includes('refresh-token')
        )
        
        if (!hasRefreshToken) {
          // No session and no refresh token → redirect to login
          // But add a header to indicate this was a middleware redirect
          console.log('⚠️ Middleware: No valid session on protected route, redirecting to login', {
            pathname,
            hasSession: !!session,
            hasRefreshToken: false
          })
          const redirectResponse = NextResponse.redirect(new URL('/', req.url))
          redirectResponse.headers.set('X-Middleware-Redirect', 'true')
          return redirectResponse
        } else {
          // Has refresh token → allow access (client-side will handle recovery)
          console.log('🔄 Middleware: Has refresh token, allowing access for client-side recovery')
          res.headers.set('X-Has-Refresh-Token', 'true')
        }
      }
    }
    
    // Add session info to headers for client-side use
    if (session) {
      res.headers.set('X-Session-Exists', 'true')
      res.headers.set('X-User-Email', session.user?.email || '')
    } else {
      res.headers.set('X-Session-Exists', 'false')
    }
    
  } catch (error) {
    console.log('⚠️ Middleware error:', error)
    // Don't fail the request, just log the error
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}

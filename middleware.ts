import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for handling authentication and route protection
 * 
 * Logic:
 * 1. Check session from Supabase
 * 2. If authenticated user on home page (/) → redirect to dashboard
 * 3. If unauthenticated user on protected route → redirect to login
 * 4. Otherwise → allow access
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
    
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession()
    
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
    // BUT: Only redirect if user explicitly navigated to home page (not from a redirect)
    if (pathname === '/' && session?.user && isSessionValid(session)) {
      // Check referer to see if user came from another page
      const referer = req.headers.get('referer')
      const isFromInternalRedirect = referer && 
                                     referer.includes(req.nextUrl.origin) && 
                                     referer !== req.url &&
                                     !referer.endsWith('/')
      
      // Only redirect if user directly accessed home page (not from internal redirect)
      // This prevents redirecting users who were on other pages and got redirected to login
      if (!isFromInternalRedirect) {
        console.log('✅ Middleware: Authenticated user on home page, redirecting to dashboard')
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else {
        // User came from internal redirect - don't redirect to dashboard
        // Let them stay on login page or go back to their original page
        console.log('🔄 Middleware: User on home page from internal redirect, not redirecting to dashboard')
      }
    }
    
    // Case 2: Unauthenticated user on protected route → redirect to login
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
          console.log('⚠️ Middleware: No valid session on protected route, redirecting to login', {
            pathname,
            hasSession: !!session,
            hasRefreshToken: false
          })
          return NextResponse.redirect(new URL('/', req.url))
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

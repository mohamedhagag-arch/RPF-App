import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for handling authentication and route protection
 * 
 * ✅ إصلاح: لا يعيد التوجيه عند refresh على protected route
 * - إذا كان المستخدم على protected route وله session → يبقى على نفس الصفحة
 * - إذا كان المستخدم على home page وله session → يوجه إلى dashboard
 * - إذا كان المستخدم على protected route بدون session → يوجه إلى login
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return res
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
      // ✅ إذا كان له session صالحة على protected route → يبقى على نفس الصفحة (لا redirect)
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

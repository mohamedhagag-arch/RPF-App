import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  
  try {
    // Create Supabase client
    const supabase = createMiddlewareClient({ 
      req, 
      res
    })
    
    // ✅ IMPROVED: Better reload detection
    const referer = req.headers.get('referer')
    const cacheControl = req.headers.get('cache-control')
    const secFetchMode = req.headers.get('sec-fetch-mode')
    const secFetchDest = req.headers.get('sec-fetch-dest')
    
    // Check if this is a reload by looking at multiple indicators
    const isReload = referer === req.url ||
                     cacheControl === 'max-age=0' ||
                     (secFetchMode === 'navigate' && secFetchDest === 'document') ||
                     req.headers.get('x-reload-detected') === 'true'
    
    // Set reload flag in response headers for client-side detection
    if (isReload) {
      res.headers.set('X-Reload-Detected', 'true')
    }
    
    // ✅ CRITICAL: Check session with retry mechanism
    let session = null
    let sessionRetries = 3
    
    while (sessionRetries > 0) {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.log('⚠️ Middleware: Session error, retrying...', error.message)
          sessionRetries--
          if (sessionRetries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100))
            continue
          }
        } else {
          session = currentSession
          break
        }
      } catch (error) {
        console.log('⚠️ Middleware: Session fetch error, retrying...', error)
        sessionRetries--
        if (sessionRetries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }
      }
    }
    
    // ✅ CRITICAL: If no session but we have cookies, try to refresh
    if (!session && !isReload) {
      // Check if we have auth cookies that might indicate an existing session
      const hasAuthCookies = req.cookies.has('sb-access-token') || 
                            req.cookies.has('sb-refresh-token') ||
                            req.cookies.has('sb-') // Supabase cookies usually start with 'sb-'
      
      if (hasAuthCookies) {
        console.log('🔄 Middleware: Found auth cookies but no session, attempting refresh...')
        try {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (!refreshError && refreshedSession) {
            console.log('✅ Middleware: Session refreshed successfully')
            session = refreshedSession
          } else {
            console.log('⚠️ Middleware: Session refresh failed:', refreshError?.message)
          }
        } catch (refreshErr) {
          console.log('⚠️ Middleware: Error during session refresh:', refreshErr)
        }
      }
    }
    
    // Add session info to headers for client-side use
    if (session) {
      res.headers.set('X-Session-Exists', 'true')
      res.headers.set('X-User-Email', session.user?.email || '')
      res.headers.set('X-Session-Expires-At', session.expires_at?.toString() || '')
    } else {
      res.headers.set('X-Session-Exists', 'false')
    }
    
    // Add connection headers to prevent disconnection
    res.headers.set('Connection', 'keep-alive')
    res.headers.set('Keep-Alive', 'timeout=30, max=1000')
    
    // ✅ ROOT FIX: Handle home page redirect at middleware level
    // If user is authenticated and on home page, redirect to dashboard
    if (pathname === '/' && session?.user) {
      // User is authenticated and on login page - redirect to dashboard
      console.log('✅ Middleware: Authenticated user on home page, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // ✅ CRITICAL FIX: Improved protected route handling
    // Don't redirect immediately - give client-side a chance to recover session
    const protectedRoutes = ['/dashboard', '/projects', '/boq', '/kpi', '/reports', '/settings', '/profile', '/directory']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // Only redirect to login if:
    // 1. No session found (even after refresh attempt)
    // 2. NOT a reload (to allow session recovery)
    // 3. User is trying to access protected route
    // 4. NOT already on login page (to avoid redirect loop)
    if (!session && !isReload && isProtectedRoute && pathname !== '/') {
      // Check cookies one more time - if we have refresh token, allow access
      const hasRefreshToken = req.cookies.has('sb-refresh-token')
      
      if (!hasRefreshToken) {
        // No session and no refresh token - redirect to login
        console.log('⚠️ Middleware: No session and no refresh token, redirecting to login')
        return NextResponse.redirect(new URL('/', req.url))
      } else {
        // We have a refresh token but no session - let client-side handle it
        console.log('🔄 Middleware: Has refresh token but no session, allowing client-side recovery')
        res.headers.set('X-Has-Refresh-Token', 'true')
      }
    }
    
    // ✅ FIX: Always allow access during reload to let client-side recover session
    if (isReload && isProtectedRoute) {
      console.log('🔄 Middleware: Reload detected on protected route, allowing access')
      return res
    }
    
  } catch (error) {
    console.log('Middleware error:', error)
    // Don't fail the request, just log the error
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths including home page (/)
     * This allows middleware to handle redirect for authenticated users on home page
     * Excludes:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}

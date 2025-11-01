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
    
    // Check if this is a reload by looking at the referer and other indicators
    const isReload = req.headers.get('referer') === req.url ||
                     req.headers.get('cache-control') === 'max-age=0' ||
                     req.headers.get('sec-fetch-mode') === 'navigate' ||
                     req.headers.get('sec-fetch-dest') === 'document'
    
    // Set reload flag in response headers for client-side detection
    if (isReload) {
      res.headers.set('X-Reload-Detected', 'true')
    }
    
    // ✅ CRITICAL: Check session
    const { data: { session } } = await supabase.auth.getSession()
    
    // Add session info to headers for client-side use
    if (session) {
      res.headers.set('X-Session-Exists', 'true')
      res.headers.set('X-User-Email', session.user?.email || '')
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
    
    // ✅ FIX: Only redirect to login if user is trying to access protected routes without session
    // and it's NOT a reload
    const protectedRoutes = ['/dashboard', '/projects', '/boq', '/kpi', '/reports', '/settings', '/profile', '/directory']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    if (!session && !isReload && isProtectedRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    // ✅ FIX: Allow access to authenticated routes during reload
    if (isReload && isProtectedRoute) {
      // Let the client-side handle the session recovery
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

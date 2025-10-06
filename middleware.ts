import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    // Create Supabase client with better connection settings
    const supabase = createMiddlewareClient({ 
      req, 
      res,
      options: {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    })
    
    // Refresh session if expired - this is critical for maintaining session
    await supabase.auth.getSession()
    
    // Add connection headers to prevent disconnection
    res.headers.set('Connection', 'keep-alive')
    res.headers.set('Keep-Alive', 'timeout=30, max=1000')
    
    // The response must be returned to ensure cookies are set properly
  } catch (error) {
    console.log('Middleware error:', error)
    // Don't fail the request, just log the error
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - / (login page)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|$).*)',
  ],
}

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    // Create Supabase client
    const supabase = createMiddlewareClient({ req, res })
    
    // Refresh session if expired - this is critical for maintaining session
    await supabase.auth.getSession()
    
    // The response must be returned to ensure cookies are set properly
  } catch (error) {
    console.log('Middleware error:', error)
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

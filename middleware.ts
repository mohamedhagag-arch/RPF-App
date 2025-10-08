import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    // Create Supabase client
    const supabase = createMiddlewareClient({ 
      req, 
      res
    })
    
    // فقط تحقق من الجلسة بدون إعادة توجيه
    const { data: { session } } = await supabase.auth.getSession()
    
    // Add connection headers to prevent disconnection
    res.headers.set('Connection', 'keep-alive')
    res.headers.set('Keep-Alive', 'timeout=30, max=1000')
    
    // لا نقوم بأي إعادة توجيه هنا - نترك للمكونات التعامل مع ذلك
    
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

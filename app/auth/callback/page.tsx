'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { TABLES } from '@/lib/supabase'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(15)
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to authenticate. Please try again.')
          setLoading(false)
          setTimeout(() => router.push('/'), 3000)
          return
        }

        if (!session?.user) {
          console.error('No session found')
          setError('No session found. Please try again.')
          setLoading(false)
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // Validate email domain - STRICT: Only company emails allowed
        const userEmail = session.user.email?.toLowerCase().trim() || ''
        const isCompanyEmail = userEmail.endsWith('@rabatpfc.com')
        
        console.log('🔍 Auth Callback: Validating email:', {
          email: userEmail,
          isCompanyEmail,
          userId: session.user.id
        })

        // Check if user exists in users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // STRICT VALIDATION: Block all non-company emails, even for existing users
        if (!isCompanyEmail) {
          console.error('❌ Non-company email detected:', userEmail)
          
          // Sign out the user immediately
          await supabase.auth.signOut()
          
          // If user exists in database, delete the auth record to prevent future logins
          if (existingUser) {
            console.warn('⚠️ Existing user with non-company email - blocking access:', userEmail)
            // Note: We can't delete the auth user from client side, but we've signed them out
          }
          
          setError('Company email required / يلزم إيميل الشركة. Only @rabatpfc.com emails are allowed for Google Sign-In. Please use a company email address.')
          setLoading(false)
          
          // Start countdown timer
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval)
                router.push('/')
                return 0
              }
              return prev - 1
            })
          }, 1000)
          
          // Fallback redirect after 15 seconds
          setTimeout(() => {
            clearInterval(countdownInterval)
            router.push('/')
          }, 15000)
          return
        }

        // If user exists and has company email, allow login
        if (existingUser) {
          console.log('✅ Existing user with company email, allowing login:', userEmail)
          router.push('/dashboard')
          return
        }

        // New user with company email - create user profile
        if (isCompanyEmail && !existingUser) {
          console.log('✅ New user with company email, creating profile:', userEmail)
          
          // Extract name from user metadata
          const fullName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email?.split('@')[0] || 
                          'User'
          const nameParts = fullName.split(' ')
          const firstName = nameParts[0] || 'User'
          const lastName = nameParts.slice(1).join(' ') || ''

          // Create user profile
          const { error: insertError } = await supabase
            .from(TABLES.USERS)
            // @ts-ignore
            .insert({
              id: session.user.id,
              email: session.user.email,
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              role: 'viewer', // Default role for new users
              created_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error('Error creating user profile:', insertError)
            // Don't block login if profile creation fails - user can update later
          }

          router.push('/dashboard')
          return
        }

        // Fallback: redirect to dashboard
        router.push('/dashboard')
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setError(error.message || 'An error occurred during authentication.')
        setLoading(false)
        setTimeout(() => router.push('/'), 5000)
      }
    }

    handleAuthCallback()
  }, [router, supabase])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="max-w-md w-full mx-4">
          <Alert variant="error" className="flex items-center space-x-2 bg-red-500/20 border-red-500/50 text-red-200 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-semibold mb-3 text-lg">{error}</p>
              <div className="space-y-2">
                <p className="text-sm text-red-300/80">
                  سيتم إعادة التوجيه خلال <span className="font-bold text-red-200">{countdown}</span> ثانية...
                </p>
                <p className="text-sm text-red-300/80">
                  Redirecting in <span className="font-bold text-red-200">{countdown}</span> seconds...
                </p>
              </div>
            </div>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto" />
        <p className="text-white text-lg font-semibold">Authenticating...</p>
        <p className="text-blue-200 text-sm">Please wait while we verify your account</p>
      </div>
    </div>
  )
}


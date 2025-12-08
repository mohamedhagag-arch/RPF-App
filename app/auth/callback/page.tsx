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

        // Validate email domain for new users
        const userEmail = session.user.email?.toLowerCase().trim() || ''
        const isCompanyEmail = userEmail.endsWith('@rabatpfc.com')
        
        console.log('🔍 Auth Callback: Validating email:', {
          email: userEmail,
          isCompanyEmail,
          isNewUser: !session.user.user_metadata?.email_verified
        })

        // Check if user exists in users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // If user doesn't exist in users table, it's a new registration
        if (!existingUser && !isCompanyEmail) {
          console.error('❌ New user with non-company email:', userEmail)
          
          // Sign out the user
          await supabase.auth.signOut()
          
          setError('Company email required / يلزم إيميل الشركة. Only @rabatpfc.com emails are allowed for new registrations.')
          setLoading(false)
          setTimeout(() => router.push('/register'), 5000)
          return
        }

        // If user exists, allow login regardless of email domain (for backward compatibility)
        if (existingUser) {
          console.log('✅ Existing user, allowing login:', userEmail)
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
              <p className="font-semibold mb-2">{error}</p>
              <p className="text-sm text-red-300/80">Redirecting in a few seconds...</p>
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


'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { 
  Eye, EyeOff, Mail, Lock, User, Building2, CheckCircle, AlertCircle, 
  Sparkles, Shield, ArrowRight, Loader2
} from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [isFocused, setIsFocused] = useState({ email: false, password: false })
  const [isSubmitting, setIsSubmitting] = useState(false) // ✅ حماية من الطلبات المتعددة
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0) // ✅ Cooldown timer
  const [lastAttemptTime, setLastAttemptTime] = useState(0) // ✅ Track last attempt time
  
  const supabase = getSupabaseClient()
  const router = useRouter()

  // ✅ Rate limiting cooldown timer
  useEffect(() => {
    if (rateLimitCooldown > 0) {
      const timer = setInterval(() => {
        setRateLimitCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [rateLimitCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ منع الطلبات المتعددة
    if (isSubmitting || loading) {
      console.log('⚠️ Login request already in progress, ignoring duplicate submission')
      return
    }

    // ✅ Check rate limit cooldown
    if (rateLimitCooldown > 0) {
      setError(`Too many login attempts. Please wait ${rateLimitCooldown} seconds before trying again.`)
      return
    }

    // ✅ Local rate limiting: Prevent requests faster than 2 seconds
    const now = Date.now()
    if (lastAttemptTime > 0 && (now - lastAttemptTime) < 2000) {
      setError('Please wait a moment before trying again.')
      return
    }
    
    setIsSubmitting(true)
    setLoading(true)
    setError('')
    setSuccess('')
    setLastAttemptTime(now)

    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        
        if (error) throw error
        
        setSuccess('Password reset email sent! Check your inbox.')
        setForgotPassword(false)
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
            },
          },
        })
        
        if (error) throw error
        
        setSuccess('Account created successfully! Please check your email to verify your account.')
        setIsSignUp(false)
      } else {
        // ✅ Retry logic with exponential backoff for rate limit errors
        let retries = 0
        const maxRetries = 2
        let lastError: any = null

        while (retries <= maxRetries) {
          try {
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            })
            
            if (error) throw error
            
            // Success - redirect
            router.push('/dashboard')
            return
          } catch (err: any) {
            lastError = err
            
            // ✅ Check if it's a rate limit error
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Too Many Requests') || err.message?.includes('rate limit')) {
              if (retries < maxRetries) {
                // Exponential backoff: wait 2^retries seconds
                const waitTime = Math.pow(2, retries) * 1000
                console.log(`⚠️ Rate limit hit, retrying after ${waitTime}ms (attempt ${retries + 1}/${maxRetries + 1})`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
                retries++
                continue
              } else {
                // Max retries reached, set cooldown
                setRateLimitCooldown(300) // 5 minutes cooldown
                throw err
              }
            } else {
              // Not a rate limit error, throw immediately
              throw err
            }
          }
        }
        
        // If we get here, all retries failed
        throw lastError
      }
    } catch (error: any) {
      // ✅ معالجة خاصة لخطأ 429 (Too Many Requests)
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('rate limit')) {
        const cooldownMinutes = Math.ceil(rateLimitCooldown / 60)
        setError(`Too many login attempts. Please wait ${cooldownMinutes} minute${cooldownMinutes > 1 ? 's' : ''} before trying again.`)
        console.error('❌ Rate limit exceeded:', error)
        
        // Set cooldown if not already set
        if (rateLimitCooldown === 0) {
          setRateLimitCooldown(300) // 5 minutes
        }
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else {
        setError(error.message || 'An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
      setIsSubmitting(false)
      
      // ✅ إعادة تعيين isSubmitting بعد تأخير قصير
      setTimeout(() => {
        setIsSubmitting(false)
      }, 2000)
    }
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Clean Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950">
        {/* Subtle animated gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                AlRabat RPF
              </span>
              <p className="text-xs text-blue-300/70 font-medium">Foundation of Success</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        
        {/* Welcome Section */}
        <div className="text-center">
          <div className="inline-block mb-6">
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-4 rounded-2xl shadow-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-3">
            {forgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-lg text-blue-200/80 font-medium">
            {forgotPassword 
              ? 'Enter your email to receive a password reset link'
              : isSignUp 
                ? 'Join AlRabat RPF - Foundation of your Success'
                : 'Sign in to your account to continue'
            }
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/10 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl">
          <form className="space-y-6 p-8" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" className="flex items-center space-x-2 bg-red-500/20 border-red-500/50 text-red-200 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <div className="flex-1">
                  <span>{error}</span>
                  {rateLimitCooldown > 0 && (
                    <div className="mt-2 text-xs text-red-300/80">
                      Cooldown: {Math.floor(rateLimitCooldown / 60)}:{(rateLimitCooldown % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="flex items-center space-x-2 bg-green-500/20 border-green-500/50 text-green-200 backdrop-blur-sm">
                <CheckCircle className="h-4 w-4" />
                <span>{success}</span>
              </Alert>
            )}

            {isSignUp && !forgotPassword && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-white/90 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                    <Input
                      id="firstName"
                      type="text"
                      required={isSignUp}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-12 bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm"
                      placeholder="Enter your first name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-white/90 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                    <Input
                      id="lastName"
                      type="text"
                      required={isSignUp}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-12 bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-white/90 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused({ ...isFocused, email: true })}
                  onBlur={() => setIsFocused({ ...isFocused, email: false })}
                  className={`pl-12 pr-12 bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all ${email && !validateEmail(email) ? 'border-red-400 ring-2 ring-red-500/50' : ''}`}
                  placeholder="Enter your email address"
                />
                {email && validateEmail(email) && (
                  <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-400" />
                )}
              </div>
              {email && !validateEmail(email) && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Please enter a valid email address
                </p>
              )}
            </div>

            {!forgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFocused({ ...isFocused, password: true })}
                    onBlur={() => setIsFocused({ ...isFocused, password: false })}
                    className={`pl-12 pr-12 bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all ${password && !validatePassword(password) ? 'border-red-400 ring-2 ring-red-500/50' : ''}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  {password && validatePassword(password) && (
                    <CheckCircle className="absolute right-12 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-400" />
                  )}
                </div>
                {password && !validatePassword(password) && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Password must be at least 6 characters
                  </p>
                )}
              </div>
            )}

            {!isSignUp && !forgotPassword && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setForgotPassword(true)}
                  className="text-sm text-blue-300 hover:text-blue-200 font-medium transition-colors flex items-center gap-2"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Forgot your password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || loading || Boolean(email && !validateEmail(email)) || Boolean(password && !validatePassword(password))}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{forgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-4">
          {!forgotPassword && (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setForgotPassword(false)
                  setError('')
                  setSuccess('')
                }}
                className="text-sm text-blue-300 hover:text-blue-200 font-medium transition-colors flex items-center gap-2"
              >
                {isSignUp ? (
                  <>
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    <span>Already have an account? Sign In</span>
                  </>
                ) : (
                  <>
                    <span>Need an account? Sign Up</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {forgotPassword && (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(false)
                  setError('')
                  setSuccess('')
                }}
                className="text-sm text-blue-300 hover:text-blue-200 font-medium transition-colors flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          <div className="border-t border-white/10 dark:border-gray-700/50 pt-6 space-y-2">
            <p className="text-xs text-white/60 font-medium">
              © 2025 AlRabat RPF - Foundation of your Success
            </p>
            <p className="text-xs text-white/50 font-medium">
              Masters of Foundation Construction
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

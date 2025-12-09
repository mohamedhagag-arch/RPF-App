'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { getCachedCompanySettings } from '@/lib/companySettings'
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
  
  // ✅ Company Settings
  const [companyName, setCompanyName] = useState('AlRabat RPF')
  const [companySlogan, setCompanySlogan] = useState('Masters of Foundation Construction')
  const [logoUrl, setLogoUrl] = useState('')
  
  const supabase = getSupabaseClient()
  const router = useRouter()
  
  // ✅ Load company settings
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        console.log('🔄 Loading company settings for login form...')
        const settings = await getCachedCompanySettings()
        
        setCompanyName(settings.company_name)
        setCompanySlogan(settings.company_slogan)
        setLogoUrl(settings.company_logo_url || '')
        
        console.log('✅ Company settings loaded for login form:', settings)
      } catch (error) {
        console.error('❌ Error loading company settings for login form:', error)
        // استخدام القيم الافتراضية في حالة الخطأ
        setCompanyName('AlRabat RPF')
        setCompanySlogan('Masters of Foundation Construction')
        setLogoUrl('')
      }
    }
    
    loadCompanySettings()
    
    // إضافة مستمع لتحديثات إعدادات الشركة
    const handleStorageChange = () => {
      loadCompanySettings()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('companySettingsUpdated', handleStorageChange)
    window.addEventListener('companySettingsCacheCleared', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('companySettingsUpdated', handleStorageChange)
      window.removeEventListener('companySettingsCacheCleared', handleStorageChange)
    }
  }, [])

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
        // ✅ Validate company email for sign up
        if (!validateCompanyEmail(email)) {
          setError('Company email required / يلزم إيميل الشركة')
          setIsSubmitting(false)
          setLoading(false)
          return
        }
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
        // ✅ LOGIN: Allow any email (including old emails) to login
        // Only new registrations require @rabatpfc.com email
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

  // ✅ Validate company email domain
  const validateCompanyEmail = (email: string) => {
    const emailLower = email.toLowerCase().trim()
    // Only allow emails ending with @rabatpfc.com
    return emailLower.endsWith('@rabatpfc.com')
  }

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Redirect to a callback page that will validate email domain
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      
      if (error) throw error
    } catch (error: any) {
      console.error('Google sign in error:', error)
      setError(error.message || 'Failed to sign in with Google. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx>{`
        .star-point {
          position: absolute;
          background: rgba(59, 130, 246, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(59, 130, 246, 0.8), 0 0 8px rgba(59, 130, 246, 0.6);
          animation: twinkle 1s ease-in-out infinite;
          transform: translate(-50%, -50%);
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
        }
      `}</style>
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
      <div className="relative z-10 max-w-md w-full space-y-8 mx-auto">
        {/* Theme Toggle - Top Right */}
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        
        {/* Logo Section - Simple and Clean */}
        <div className="text-center mb-8">
          {/* Logo - No Frame, Natural Size with Stars Effect */}
          {logoUrl ? (
            <div 
              className="mx-auto mb-6 relative group"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                const stars = e.currentTarget.querySelector('.stars-effect') as HTMLElement
                
                if (stars) {
                  const starPositions = [
                    { x: x, y: y, size: 2 },
                    { x: x - 5, y: y - 5, size: 1.5 },
                    { x: x + 5, y: y + 5, size: 1.5 },
                    { x: x - 8, y: y + 3, size: 1 },
                    { x: x + 8, y: y - 3, size: 1 },
                    { x: x - 3, y: y + 8, size: 1 },
                    { x: x + 3, y: y - 8, size: 1 },
                  ]
                  
                  const starsHTML = starPositions.map((star, i) => 
                    `<div class="star-point" style="left: ${star.x}%; top: ${star.y}%; width: ${star.size}px; height: ${star.size}px; animation-delay: ${i * 0.1}s;"></div>`
                  ).join('')
                  
                  stars.innerHTML = starsHTML
                  stars.style.opacity = '1'
                }
              }}
              onMouseLeave={(e) => {
                const stars = e.currentTarget.querySelector('.stars-effect') as HTMLElement
                if (stars) {
                  stars.style.opacity = '0'
                  setTimeout(() => {
                    stars.innerHTML = ''
                  }, 200)
                }
              }}
            >
              <div className="relative inline-block">
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto object-contain relative z-10"
                />
                <div className="stars-effect absolute inset-0 pointer-events-none transition-opacity duration-200 rounded-lg z-20"></div>
              </div>
            </div>
          ) : (
            <div 
              className="mx-auto mb-6 relative group"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                const stars = e.currentTarget.querySelector('.stars-effect') as HTMLElement
                
                if (stars) {
                  const starPositions = [
                    { x: x, y: y, size: 2 },
                    { x: x - 5, y: y - 5, size: 1.5 },
                    { x: x + 5, y: y + 5, size: 1.5 },
                    { x: x - 8, y: y + 3, size: 1 },
                    { x: x + 8, y: y - 3, size: 1 },
                  ]
                  
                  const starsHTML = starPositions.map((star, i) => 
                    `<div class="star-point" style="left: ${star.x}%; top: ${star.y}%; width: ${star.size}px; height: ${star.size}px; animation-delay: ${i * 0.1}s;"></div>`
                  ).join('')
                  
                  stars.innerHTML = starsHTML
                  stars.style.opacity = '1'
                }
              }}
              onMouseLeave={(e) => {
                const stars = e.currentTarget.querySelector('.stars-effect') as HTMLElement
                if (stars) {
                  stars.style.opacity = '0'
                  setTimeout(() => {
                    stars.innerHTML = ''
                  }, 200)
                }
              }}
            >
              <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg relative z-10" />
                <div className="stars-effect absolute inset-0 pointer-events-none transition-opacity duration-200 rounded-full z-20"></div>
              </div>
            </div>
          )}
          
          {/* Company Name - Normal Size */}
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
            {companyName}
          </h1>
          
          {/* Slogan - Normal Size */}
          <p className="text-base sm:text-lg text-blue-200/80 dark:text-blue-300 mb-6">
            {companySlogan}
          </p>
        </div>
        
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            {forgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-lg sm:text-xl text-blue-200/80 font-medium">
            {forgotPassword 
              ? 'Enter your email to receive a password reset link'
              : isSignUp 
                ? `Join ${companyName} - ${companySlogan}`
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
                  className={`pl-12 pr-12 bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all ${email && (!validateEmail(email) || (isSignUp && !validateCompanyEmail(email))) ? 'border-red-400 ring-2 ring-red-500/50' : ''}`}
                  placeholder={isSignUp ? "example@rabatpfc.com" : "Enter your email address"}
                />
                {email && validateEmail(email) && (!isSignUp || validateCompanyEmail(email)) && (
                  <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-400" />
                )}
              </div>
              {isSignUp && email && validateEmail(email) && !validateCompanyEmail(email) && (
                <div className="mt-3 p-4 bg-gradient-to-r from-red-500/30 to-orange-500/20 dark:from-red-900/40 dark:to-orange-900/30 border-2 border-red-400/70 dark:border-red-600/70 rounded-lg backdrop-blur-sm shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertCircle className="h-6 w-6 text-red-300 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-100 dark:text-red-200 mb-2">
                        Company Email Required / يلزم إيميل الشركة
                      </p>
                      <p className="text-sm text-red-50/90 dark:text-red-300/90 mb-2 leading-relaxed">
                        Only company email addresses (@rabatpfc.com) are allowed for registration.
                      </p>
                      <p className="text-sm text-red-50/90 dark:text-red-300/90 mb-3 leading-relaxed">
                        يُسمح فقط بإيميلات الشركة (@rabatpfc.com) للتسجيل.
                      </p>
                      <div className="flex items-center gap-2 mt-3 p-2 bg-white/20 dark:bg-gray-800/50 rounded border border-red-300/50 dark:border-red-700/50 backdrop-blur-sm">
                        <Mail className="h-4 w-4 text-blue-300 dark:text-blue-400 flex-shrink-0" />
                        <p className="text-sm text-white dark:text-gray-200">
                          <span className="font-semibold">Example / مثال:</span>{' '}
                          <span className="font-mono text-blue-200 dark:text-blue-400 font-bold">firstname.lastname@rabatpfc.com</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              disabled={isSubmitting || loading || Boolean(email && !validateEmail(email)) || Boolean(isSignUp && email && !validateCompanyEmail(email)) || Boolean(password && !validatePassword(password))}
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

            {/* Google Sign In Button - TEMPORARILY DISABLED */}
            {false && !forgotPassword && (
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20 dark:border-gray-700/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950 text-white/70">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={true}
                  className="w-full mt-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>{isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
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
              © {new Date().getFullYear()} {companyName} - {companySlogan}
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

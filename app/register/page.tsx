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
import { Eye, EyeOff, Mail, Lock, User, Building2, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
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
        console.log('🔄 Loading company settings for register page...')
        const settings = await getCachedCompanySettings()
        
        setCompanyName(settings.company_name)
        setCompanySlogan(settings.company_slogan)
        setLogoUrl(settings.company_logo_url || '')
        
        console.log('✅ Company settings loaded for register page:', settings)
      } catch (error) {
        console.error('❌ Error loading company settings for register page:', error)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    // ✅ Validate company email domain - Only new registrations require @rabatpfc.com
    // Old users can still login with their existing emails, but new registrations must use company email
    if (!validateCompanyEmail(formData.email)) {
      setError('Company email required / يلزم إيميل الشركة')
      return false
    }
    if (!formData.password) {
      setError('Password is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!formData.company.trim()) {
      setError('Company name is required')
      return false
    }
    return true
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

  // Handle Google Sign Up
  const handleGoogleSignUp = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Use Supabase's built-in callback URL which handles OAuth redirects
      // The redirectTo should point to your app's callback page
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
      
      if (error) {
        console.error('Google OAuth error:', error)
        // Check if it's a redirect_uri_mismatch error
        if (error.message?.includes('redirect_uri_mismatch') || error.message?.includes('redirect')) {
          setError('OAuth configuration error. Please contact the administrator. Error: redirect_uri_mismatch')
        } else {
          throw error
        }
      }
    } catch (error: any) {
      console.error('Google sign up error:', error)
      setError(error.message || 'Failed to sign up with Google. Please try again.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
            company: formData.company,
            phone: formData.phone,
            role: 'viewer' // Default role for new users
          },
        },
      })
      
      if (error) throw error
      
      setSuccess('Account created successfully! Please check your email to verify your account.')
      
      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        company: '',
        phone: ''
      })
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx>{`
        .star-point {
          position: absolute;
          background: rgba(34, 197, 94, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(34, 197, 94, 0.8), 0 0 8px rgba(34, 197, 94, 0.6);
          animation: twinkle 1s ease-in-out infinite;
          transform: translate(-50%, -50%);
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      <div className="max-w-lg w-full space-y-8 relative z-10 mx-auto">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Login</span>
          </Link>
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
                  // Create multiple small star points around mouse
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
              <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 bg-gradient-to-br from-green-600 via-green-500 to-green-700 dark:from-green-700 dark:via-green-600 dark:to-green-800 rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg relative z-10" />
                <div className="stars-effect absolute inset-0 pointer-events-none transition-opacity duration-200 rounded-full z-20"></div>
              </div>
            </div>
          )}
          
          {/* Company Name - Normal Size */}
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            Join {companyName}
          </h1>
          
          {/* Slogan - Normal Size */}
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            {companySlogan}
          </p>
        </div>

        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-green-500/20 hover:border-green-300/50 dark:hover:border-green-600/50">
          <form className="space-y-6 p-8" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>{success}</span>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your first name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-10 ${formData.email && (!validateEmail(formData.email) || !validateCompanyEmail(formData.email)) ? 'border-red-500' : ''}`}
                    placeholder="example@rabatpfc.com"
                  />
                </div>
                {formData.email && !validateEmail(formData.email) && (
                  <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
                )}
                {formData.email && validateEmail(formData.email) && !validateCompanyEmail(formData.email) && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 border-2 border-red-400 dark:border-red-600 rounded-lg shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">
                          Company Email Required / يلزم إيميل الشركة
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-2 leading-relaxed">
                          Only company email addresses (@rabatpfc.com) are allowed for registration.
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-3 leading-relaxed">
                          يُسمح فقط بإيميلات الشركة (@rabatpfc.com) للتسجيل.
                        </p>
                        <div className="flex items-center gap-2 mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700">
                          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">Example / مثال:</span>{' '}
                            <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">firstname.lastname@rabatpfc.com</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  name="company"
                  type="text"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Enter your company name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`pl-10 pr-10 ${formData.password && formData.password.length < 6 ? 'border-red-500' : ''}`}
                    placeholder="Create password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && formData.password.length < 6 && (
                  <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`pl-10 pr-10 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> New accounts start with "Viewer" permissions. Contact your administrator to upgrade your access level.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 hover:from-green-700 hover:via-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform-gpu active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>

            {/* Google Sign Up Button */}
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
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
                    <span>Sign up with Google</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              Sign in here
            </Link>
          </p>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} {companyName} - {companySlogan}
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

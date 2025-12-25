'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { loginSecuritySettingsManager, LoginSecuritySettings, DEFAULT_LOGIN_SECURITY_SETTINGS } from '@/lib/loginSecuritySettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Shield,
  Save,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  KeyRound,
  Mail,
  Clock,
  Users,
  Settings,
  Zap,
  Ban,
  Globe,
  UserPlus,
  RotateCcw,
  Timer,
  Activity
} from 'lucide-react'

export function LoginSecuritySettingsManager() {
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<LoginSecuritySettings>(DEFAULT_LOGIN_SECURITY_SETTINGS)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
    
    // Listen for settings updates
    const handleUpdate = () => {
      loadSettings()
    }
    window.addEventListener('loginSecuritySettingsUpdated', handleUpdate)
    
    return () => {
      window.removeEventListener('loginSecuritySettingsUpdated', handleUpdate)
    }
  }, [])

  const loadSettings = async (forceReload: boolean = false) => {
    try {
      setLoading(true)
      setError('')
      
      // Force reload from database to get latest values
      const loadedSettings = await loginSecuritySettingsManager.getSettings(forceReload)
      console.log('📥 Loaded settings in UI:', loadedSettings)
      setSettings(loadedSettings)
      setHasChanges(false)
    } catch (error: any) {
      setError('فشل تحميل إعدادات الأمان')
      console.error('Error loading login security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = <K extends keyof LoginSecuritySettings>(
    key: K,
    value: LoginSecuritySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleArrayChange = (key: 'allowedEmailDomains', value: string) => {
    const domains = value.split(',').map(d => d.trim()).filter(d => d.length > 0)
    handleSettingChange(key, domains)
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      console.log('💾 Saving settings:', settings)
      
      // Save all settings (not partial)
      const success = await loginSecuritySettingsManager.saveSettings(settings)
      
      if (success) {
        console.log('✅ Save successful, reloading...')
        setSuccess('تم حفظ إعدادات الأمان بنجاح')
        setHasChanges(false)
        
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Force reload from database to verify and update UI
        await loadSettings(true)
        
        setTimeout(() => setSuccess(''), 3000)
      } else {
        console.error('❌ Save failed')
        setError('فشل حفظ إعدادات الأمان')
      }
    } catch (error: any) {
      console.error('❌ Error saving login security settings:', error)
      setError('حدث خطأ أثناء حفظ الإعدادات: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) {
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const success = await loginSecuritySettingsManager.resetToDefaults()
      
      if (success) {
        // Force reload from database
        await loadSettings(true)
        setSuccess('تم إعادة تعيين الإعدادات إلى القيم الافتراضية')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('فشل إعادة تعيين الإعدادات')
      }
    } catch (error: any) {
      setError('حدث خطأ أثناء إعادة تعيين الإعدادات')
      console.error('Error resetting login security settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!guard.hasAccess('settings.login_security') && !guard.hasAccess('settings.manage') && !guard.isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to manage login security settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6" />
            إعدادات أمان تسجيل الدخول
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تحكم كامل في جميع إعدادات الأمان الخاصة بصفحة تسجيل الدخول
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => loadSettings(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" className="flex items-center space-x-2">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
        </Alert>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Rate Limiting Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="h-5 w-5" />
              <span>Rate Limiting / تحديد معدل المحاولات</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل Rate Limiting
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  منع محاولات تسجيل الدخول المتكررة من نفس المستخدم
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableRateLimiting}
                  onChange={(e) => handleSettingChange('enableRateLimiting', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enableRateLimiting && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مدة Cooldown (بالثواني)
                  </label>
                  <Input
                    type="number"
                    min="30"
                    max="3600"
                    value={settings.rateLimitCooldownSeconds}
                    onChange={(e) => handleSettingChange('rateLimitCooldownSeconds', parseInt(e.target.value) || 120)}
                    className="max-w-32"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الوقت الذي يجب أن ينتظره المستخدم بعد تجاوز الحد المسموح
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل Local Rate Limiting
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  منع الطلبات المتكررة بسرعة من نفس المتصفح
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableLocalRateLimiting}
                  onChange={(e) => handleSettingChange('enableLocalRateLimiting', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enableLocalRateLimiting && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الحد الأدنى للوقت بين المحاولات (بالثواني)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.localRateLimitSeconds}
                    onChange={(e) => handleSettingChange('localRateLimitSeconds', parseInt(e.target.value) || 2)}
                    className="max-w-32"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Protection Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>ميزات الحماية / Protection Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  حماية من الطلبات المتعددة
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  منع إرسال طلبات متعددة في نفس الوقت
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableMultipleSubmissionProtection}
                  onChange={(e) => handleSettingChange('enableMultipleSubmissionProtection', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل Retry Logic
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  إعادة المحاولة تلقائياً عند فشل الطلب
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableRetryLogic}
                  onChange={(e) => handleSettingChange('enableRetryLogic', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enableRetryLogic && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الحد الأقصى للمحاولات
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.maxRetries}
                    onChange={(e) => handleSettingChange('maxRetries', parseInt(e.target.value) || 2)}
                    className="max-w-32"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      Exponential Backoff
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      زيادة وقت الانتظار تدريجياً بين المحاولات
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableExponentialBackoff}
                      onChange={(e) => handleSettingChange('enableExponentialBackoff', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authentication Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <KeyRound className="h-5 w-5" />
              <span>طرق المصادقة / Authentication Methods</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل OTP Login
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  تسجيل الدخول برمز التحقق المرسل عبر البريد الإلكتروني
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableOTPLogin}
                  onChange={(e) => handleSettingChange('enableOTPLogin', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enableOTPLogin && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مدة Cooldown لإعادة الإرسال (بالثواني)
                  </label>
                  <Input
                    type="number"
                    min="30"
                    max="300"
                    value={settings.otpCooldownSeconds}
                    onChange={(e) => handleSettingChange('otpCooldownSeconds', parseInt(e.target.value) || 60)}
                    className="max-w-32"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل Google OAuth
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  تسجيل الدخول باستخدام حساب Google
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableGoogleOAuth}
                  onChange={(e) => handleSettingChange('enableGoogleOAuth', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Email Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>التحقق من البريد الإلكتروني / Email Validation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل التحقق من إيميل الشركة
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  السماح فقط بإيميلات الشركة المسموحة
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableCompanyEmailValidation}
                  onChange={(e) => handleSettingChange('enableCompanyEmailValidation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enableCompanyEmailValidation && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    النطاقات المسموحة (مفصولة بفواصل)
                  </label>
                  <Input
                    type="text"
                    value={settings.allowedEmailDomains.join(', ')}
                    onChange={(e) => handleArrayChange('allowedEmailDomains', e.target.value)}
                    placeholder="@rabatpfc.com, @example.com"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    أدخل النطاقات المسموحة مفصولة بفواصل (مثال: @rabatpfc.com, @example.com)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>التحقق من كلمة المرور / Password Validation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل التحقق من كلمة المرور
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  التحقق من قوة كلمة المرور
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enablePasswordValidation}
                  onChange={(e) => handleSettingChange('enablePasswordValidation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enablePasswordValidation && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الحد الأدنى لطول كلمة المرور
                  </label>
                  <Input
                    type="number"
                    min="4"
                    max="32"
                    value={settings.passwordMinLength}
                    onChange={(e) => handleSettingChange('passwordMinLength', parseInt(e.target.value) || 6)}
                    className="max-w-32"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      يتطلب أحرف كبيرة
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireUppercase}
                        onChange={(e) => handleSettingChange('passwordRequireUppercase', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      يتطلب أحرف صغيرة
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireLowercase}
                        onChange={(e) => handleSettingChange('passwordRequireLowercase', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      يتطلب أرقام
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireNumbers}
                        onChange={(e) => handleSettingChange('passwordRequireNumbers', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      يتطلب أحرف خاصة
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireSpecialChars}
                        onChange={(e) => handleSettingChange('passwordRequireSpecialChars', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>الميزات / Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل التسجيل
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  السماح للمستخدمين الجدد بالتسجيل
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableSignUp}
                  onChange={(e) => handleSettingChange('enableSignUp', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل نسيان كلمة المرور
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  السماح للمستخدمين بإعادة تعيين كلمة المرور
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableForgotPassword}
                  onChange={(e) => handleSettingChange('enableForgotPassword', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل إظهار/إخفاء كلمة المرور
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  السماح للمستخدمين بإظهار كلمة المرور أثناء الكتابة
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableShowPasswordToggle}
                  onChange={(e) => handleSettingChange('enableShowPasswordToggle', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>إعدادات الجلسة / Session Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                انتهاء صلاحية الجلسة (بالدقائق)
              </label>
              <Input
                type="number"
                min="5"
                max="1440"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => handleSettingChange('sessionTimeoutMinutes', parseInt(e.target.value) || 30)}
                className="max-w-32"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  تفعيل مراقبة الجلسات
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  مراقبة الجلسات النشطة
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableSessionMonitoring}
                  onChange={(e) => handleSettingChange('enableSessionMonitoring', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={saving}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>إعادة تعيين إلى القيم الافتراضية</span>
        </Button>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              لديك تغييرات غير محفوظة
            </span>
          )}
          <Button
            onClick={saveSettings}
            disabled={saving || !hasChanges}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>حفظ التغييرات</span>
          </Button>
        </div>
      </div>
    </div>
  )
}


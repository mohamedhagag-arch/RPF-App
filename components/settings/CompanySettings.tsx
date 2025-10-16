'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { 
  getCompanySettings, 
  updateCompanySettings, 
  canUpdateCompanySettings,
  clearCompanySettingsCache,
  type CompanySettings
} from '@/lib/companySettings'
import { 
  Building2, 
  Palette, 
  Upload, 
  Save, 
  RotateCcw,
  Image as ImageIcon,
  Type,
  Globe,
  Shield,
  Database
} from 'lucide-react'

interface CompanySettingsProps {
  onClose?: () => void
}

export function CompanySettings({ onClose }: CompanySettingsProps) {
  const guard = usePermissionGuard()
  const [companyName, setCompanyName] = useState('AlRabat RPF')
  const [companySlogan, setCompanySlogan] = useState('Masters of Foundation Construction')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  
  // Auto-save states
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // تحميل الإعدادات الحالية من قاعدة البيانات
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true)
        console.log('🔄 Loading company settings from database...')
        
        // ✅ استخدام guard مباشرة بدلاً من canUpdateCompanySettings()
        const hasPermission = guard.hasAccess('settings.company')
        console.log('✅ Permission check result:', hasPermission)
        setCanEdit(hasPermission)
        
        if (!hasPermission) {
          console.log('❌ User does not have settings.company permission')
          setError('You do not have permission to edit company settings. Only administrators can edit.')
          setLoadingSettings(false)
          return
        }
        
        console.log('✅ User has permission, loading settings...')
        
        // جلب الإعدادات من قاعدة البيانات
        const settings = await getCompanySettings()
        if (settings) {
          setCompanyName(settings.company_name)
          setCompanySlogan(settings.company_slogan)
          setLogoUrl(settings.company_logo_url || '')
          console.log('✅ Company settings loaded from database')
        } else {
          console.log('⚠️ No company settings found, using defaults')
        }
      } catch (error: any) {
        console.error('❌ Error loading company settings:', error)
        setError('Error loading company settings: ' + error.message)
      } finally {
        setLoadingSettings(false)
      }
    }
    
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!canEdit || isAutoSaving) return

    setIsAutoSaving(true)
    setAutoSaveStatus('saving')

    try {
      console.log('💾 Auto-saving company settings...')
      
      const result = await updateCompanySettings(companyName, companySlogan, logoUrl)
      
      if (result.success) {
        clearCompanySettingsCache()
        setAutoSaveStatus('saved')
        setLastSaved(new Date())
        setError('') // Clear any previous errors
        
        // ✅ No reload - just update the state and show success
        // Hide "saved" status after 3 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle')
        }, 3000)
      } else {
        setAutoSaveStatus('error')
        setError('Auto-save failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('❌ Auto-save error:', error)
      setAutoSaveStatus('error')
      setError('Auto-save failed: ' + error.message)
    } finally {
      setIsAutoSaving(false)
    }
  }, [companyName, companySlogan, logoUrl, canEdit, isAutoSaving])

  // Trigger auto-save when any field changes
  useEffect(() => {
    if (!canEdit) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save (500ms delay)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 500)

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, companySlogan, logoUrl, canEdit])

  const handleSave = async () => {
    if (!canEdit) {
      setError('You do not have permission to edit company settings')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('💾 Saving company settings to database...')
      
      // حفظ في قاعدة البيانات
      const result = await updateCompanySettings(companyName, companySlogan, logoUrl)
      
      if (result.success) {
        // مسح التخزين المؤقت
        clearCompanySettingsCache()
        
        setSuccess('Company settings saved successfully to database!')
        
        // ✅ No reload - changes are already applied
      } else {
        setError('Error saving settings: ' + (result.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('❌ Error saving company settings:', error)
      setError('Error saving settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!canEdit) {
      setError('You do not have permission to edit company settings')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🔄 Resetting company settings to defaults...')
      
      // إعادة تعيين إلى القيم الافتراضية في قاعدة البيانات
      const result = await updateCompanySettings(
        'AlRabat RPF',
        'Masters of Foundation Construction',
        ''
      )
      
      if (result.success) {
        // مسح التخزين المؤقت
        clearCompanySettingsCache()
        
        // تحديث الحقول المحلية
        setCompanyName('AlRabat RPF')
        setCompanySlogan('Masters of Foundation Construction')
        setLogoUrl('')
        
        setSuccess('Company settings reset to default values successfully!')
        
        // ✅ No reload - state is already updated
      } else {
        setError('Error resetting settings: ' + (result.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('❌ Error resetting company settings:', error)
      setError('Error resetting settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setLogoUrl(result)
      }
      reader.readAsDataURL(file)
    }
  }

  // إذا كان التحميل جارياً
  if (loadingSettings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-blue-600 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Loading Company Settings...
          </h2>
        </div>
        <Card className="card-modern">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading company settings from database...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Company Settings
        </h2>
        {canEdit ? (
          <div className="flex items-center gap-2 text-green-600">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Edit Permission Available</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">No Edit Permission</span>
          </div>
        )}
        
        {/* Auto-save indicator */}
        {canEdit && (
          <div className="flex items-center gap-2 ml-auto">
            {autoSaveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Auto-saving...</span>
              </div>
            )}
            {autoSaveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-green-600">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Auto-saved</span>
              </div>
            )}
            {autoSaveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Auto-save failed</span>
              </div>
            )}
            {lastSaved && autoSaveStatus === 'idle' && (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-xs">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      <Card className="card-modern">
        <div className="p-6 space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Type className="w-4 h-4" />
              Company Name
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="w-full"
            />
          </div>

          {/* Company Slogan */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4" />
              Company Slogan
            </label>
            <Input
              value={companySlogan}
              onChange={(e) => setCompanySlogan(e.target.value)}
              placeholder="Enter company slogan"
              className="w-full"
            />
          </div>

          {/* Company Logo */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <ImageIcon className="w-4 h-4" />
              Company Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Image URL or upload image"
                  className="w-full"
                />
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="btn-primary flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </label>
              </div>
            </div>
            {logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}
          </div>

          {/* معاينة التغييرات */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview Changes
            </h3>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="icon-circle cyan" style={{ width: '48px', height: '48px' }}>
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {companyName}
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {companySlogan}
                </p>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={loading || !canEdit}
              className={`flex items-center gap-2 ${
                canEdit 
                  ? 'btn-primary' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save to Database'}
            </button>
            
            <button
              onClick={handleReset}
              disabled={loading || !canEdit}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                canEdit
                  ? 'border-gray-300 hover:bg-gray-50'
                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* معلومات إضافية */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Auto-Save Enabled
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All changes are automatically saved to the database after 500ms of inactivity.
                  {canEdit ? ' No need to click Save manually!' : ' Only administrators can modify these settings.'}
                </p>
                {canEdit && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    💡 Auto-save triggers when you stop typing for 0.5 seconds
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

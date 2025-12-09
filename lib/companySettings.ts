import { supabase } from './supabase'

export interface CompanySettings {
  company_name: string
  company_slogan: string
  company_logo_url?: string
  updated_at?: string
}

/**
 * الحصول على إعدادات الشركة الحالية
 */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    console.log('🔍 Fetching company settings from database...')
    
    const { data, error } = await supabase
      .rpc('get_company_settings')
    
    if (error) {
      console.error('❌ Error fetching company settings:', error)
      return null
    }
    
    if (!data || (Array.isArray(data) && (data as any[]).length === 0)) {
      console.log('⚠️ No company settings found in database')
      return null // Return null to indicate no data, not defaults
    }
    
    const settings = Array.isArray(data) ? (data as any[])[0] : data
    console.log('✅ Company settings loaded from database:', settings)
    
    // Validate that we have actual data
    if (!settings || (!(settings as any)?.company_name && !(settings as any)?.company_slogan)) {
      console.log('⚠️ Invalid company settings data')
      return null
    }
    
    return {
      company_name: (settings as any)?.company_name || 'AlRabat RPF',
      company_slogan: (settings as any)?.company_slogan || 'Masters of Foundation Construction',
      company_logo_url: (settings as any)?.company_logo_url || undefined,
      updated_at: (settings as any)?.updated_at
    }
  } catch (error) {
    console.error('❌ Exception in getCompanySettings:', error)
    return null // Return null on error, not defaults
  }
}

/**
 * تحديث إعدادات الشركة
 */
export async function updateCompanySettings(
  companyName: string,
  companySlogan: string,
  companyLogoUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💾 Updating company settings in database...', {
      companyName,
      companySlogan,
      companyLogoUrl
    })
    
    const { data, error } = await supabase
      .rpc('update_company_settings', {
        p_company_name: companyName,
        p_company_slogan: companySlogan,
        p_company_logo_url: companyLogoUrl || null
      } as any)
    
    if (error) {
      console.error('❌ Error updating company settings:', error)
      return {
        success: false,
        error: error.message
      }
    }
    
    console.log('✅ Company settings updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('❌ Exception in updateCompanySettings:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
  }
}

/**
 * الحصول على إعدادات الشركة مع التخزين المؤقت
 */
let cachedSettings: CompanySettings | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 دقائق
const CACHE_KEY = 'company_settings_cache'

// Default settings - only used as fallback
const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'AlRabat RPF',
  company_slogan: 'Masters of Foundation Construction',
  company_logo_url: undefined
}

export async function getCachedCompanySettings(): Promise<CompanySettings> {
  const now = Date.now()
  
  // Try to load from localStorage first (persistent cache)
  try {
    const storedCache = localStorage.getItem(CACHE_KEY)
    if (storedCache) {
      const parsedCache = JSON.parse(storedCache)
      if (parsedCache.settings && parsedCache.timestamp && (now - parsedCache.timestamp) < CACHE_DURATION) {
        console.log('📦 Using localStorage cached company settings')
        cachedSettings = parsedCache.settings
        cacheTimestamp = parsedCache.timestamp
        return parsedCache.settings
      }
    }
  } catch (e) {
    console.warn('⚠️ Failed to load from localStorage cache:', e)
  }
  
  // إذا كانت البيانات في التخزين المؤقت في الذاكرة ولم تنته صلاحيتها
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 Using memory cached company settings')
    return cachedSettings
  }
  
  // جلب البيانات من قاعدة البيانات
  const settings = await getCompanySettings()
  
  // Only cache if we got valid settings from database (not defaults)
  // Check both company_name and company_slogan to ensure it's not default
  const isDefaultSettings = settings && (
    settings.company_name === DEFAULT_SETTINGS.company_name &&
    settings.company_slogan === DEFAULT_SETTINGS.company_slogan
  )
  
  if (settings && !isDefaultSettings) {
    cachedSettings = settings
    cacheTimestamp = now
    
    // Also save to localStorage for persistence
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        settings,
        timestamp: now
      }))
      console.log('💾 Company settings cached to memory and localStorage')
    } catch (e) {
      console.warn('⚠️ Failed to save to localStorage cache:', e)
      console.log('💾 Company settings cached to memory only')
    }
    
    return settings
  }
  
  // If we got null or defaults, try to use cached values if available
  if (cachedSettings) {
    console.log('⚠️ Database returned null/defaults, using cached settings')
    return cachedSettings
  }
  
  // Last resort: return defaults
  console.log('⚠️ No cached settings available, using defaults')
  return DEFAULT_SETTINGS
}

/**
 * مسح التخزين المؤقت لإعدادات الشركة
 */
export function clearCompanySettingsCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
  
  // Also clear localStorage cache
  try {
    localStorage.removeItem(CACHE_KEY)
    console.log('🗑️ Company settings cache cleared (memory + localStorage)')
  } catch (e) {
    console.warn('⚠️ Failed to clear localStorage cache:', e)
    console.log('🗑️ Company settings cache cleared (memory only)')
  }
  
  // Dispatch event to notify all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('companySettingsCacheCleared'))
  }
}

/**
 * التحقق من صلاحيات المستخدم لتعديل إعدادات الشركة
 */
export async function canUpdateCompanySettings(): Promise<boolean> {
  try {
    console.log('🔍 Checking company settings permissions...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ No authenticated user')
      return false
    }
    
    console.log('👤 User ID:', user.id, 'Email:', user.email)
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('role, permissions, custom_permissions_enabled')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('❌ Error fetching user data:', error.message)
      console.error('❌ Error details:', error)
      return false
    }
    
    if (!userData) {
      console.log('❌ No user data found')
      return false
    }
    
    console.log('📊 User data:', {
      role: (userData as any)?.role,
      permissions: (userData as any)?.permissions,
      custom_enabled: (userData as any)?.custom_permissions_enabled
    })
    
    // Admin لديه صلاحية دائماً
    if ((userData as any)?.role === 'admin') {
      console.log('✅ User is admin - access granted')
      return true
    }
    
    // فحص الصلاحيات المخصصة
    const userPermissions = (userData as any)?.permissions || []
    const hasPermission = userPermissions.includes('settings.company')
    console.log(`${hasPermission ? '✅' : '❌'} User has settings.company permission:`, hasPermission)
    return hasPermission
  } catch (error) {
    console.error('❌ Exception checking user permissions:', error)
    return false
  }
}

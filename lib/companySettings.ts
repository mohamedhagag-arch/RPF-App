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
      console.log('⚠️ No company settings found, using defaults')
      return {
        company_name: 'AlRabat RPF',
        company_slogan: 'Masters of Foundation Construction',
        company_logo_url: undefined
      }
    }
    
    const settings = Array.isArray(data) ? (data as any[])[0] : data
    console.log('✅ Company settings loaded:', settings)
    
    return {
      company_name: (settings as any)?.company_name || 'AlRabat RPF',
      company_slogan: (settings as any)?.company_slogan || 'Masters of Foundation Construction',
      company_logo_url: (settings as any)?.company_logo_url || undefined,
      updated_at: (settings as any)?.updated_at
    }
  } catch (error) {
    console.error('❌ Exception in getCompanySettings:', error)
    return {
      company_name: 'AlRabat RPF',
      company_slogan: 'Masters of Foundation Construction',
      company_logo_url: undefined
    }
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

export async function getCachedCompanySettings(): Promise<CompanySettings> {
  const now = Date.now()
  
  // إذا كانت البيانات في التخزين المؤقت ولم تنته صلاحيتها
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 Using cached company settings')
    return cachedSettings
  }
  
  // جلب البيانات من قاعدة البيانات
  const settings = await getCompanySettings()
  if (settings) {
    cachedSettings = settings
    cacheTimestamp = now
    console.log('💾 Company settings cached')
  }
  
  return settings || {
    company_name: 'AlRabat RPF',
    company_slogan: 'Masters of Foundation Construction',
    company_logo_url: undefined
  }
}

/**
 * مسح التخزين المؤقت لإعدادات الشركة
 */
export function clearCompanySettingsCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
  console.log('🗑️ Company settings cache cleared')
}

/**
 * التحقق من صلاحيات المستخدم لتعديل إعدادات الشركة
 */
export async function canUpdateCompanySettings(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (error || !userData) return false
    
    return (userData as any)?.role === 'admin'
  } catch (error) {
    console.error('❌ Error checking user permissions:', error)
    return false
  }
}

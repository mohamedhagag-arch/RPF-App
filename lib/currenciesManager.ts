/**
 * Currencies Manager
 * إدارة العملات مع تحديد تلقائي للعملة الإماراتية (AED)
 */

import { getSupabaseClient, executeQuery } from './simpleConnectionManager'

export interface Currency {
  id?: string
  code: string // مثل: AED, USD, SAR
  name: string // مثل: UAE Dirham, US Dollar
  symbol: string // مثل: د.إ, $, ر.س
  exchange_rate: number // سعر الصرف مقابل AED
  is_default: boolean // العملة الافتراضية
  is_active: boolean
  created_at?: string
  updated_at?: string
  usage_count?: number
}

// العملات الافتراضية
export const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    exchange_rate: 1.0, // العملة الأساسية
    is_default: true,
    is_active: true
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    exchange_rate: 0.27, // 1 AED = 0.27 USD
    is_default: false,
    is_active: true
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'ر.س',
    exchange_rate: 1.02, // 1 AED = 1.02 SAR
    is_default: false,
    is_active: true
  }
]

/**
 * تهيئة جدول العملات في Supabase
 */
export async function initializeCurrenciesTable(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من وجود الجدول
    const { data: existingCurrencies } = await executeQuery(async () =>
      supabase
        .from('currencies')
        .select('id')
        .limit(1)
    )
    
    // إذا كان الجدول فارغًا، أضف العملات الافتراضية
    if (!existingCurrencies || (existingCurrencies as any[]).length === 0) {
      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('currencies')
          .insert(DEFAULT_CURRENCIES)
      )
      
      if (error) {
        console.error('Error initializing currencies:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Currencies table initialized with default currencies')
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error initializing currencies table:', error)
    return { success: false, error: error.message }
  }
}

/**
 * جلب جميع العملات النشطة
 */
export async function getAllCurrencies(): Promise<Currency[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })
    )
    
    if (error) {
      console.error('Error fetching currencies:', error)
      return DEFAULT_CURRENCIES
    }
    
    return (data as Currency[]) || DEFAULT_CURRENCIES
  } catch (error) {
    console.error('Error fetching currencies:', error)
    return DEFAULT_CURRENCIES
  }
}

/**
 * جلب العملة الافتراضية (AED)
 */
export async function getDefaultCurrency(): Promise<Currency> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('currencies')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single()
    )
    
    if (error || !data) {
      console.error('Error fetching default currency:', error)
      return DEFAULT_CURRENCIES[0] // AED
    }
    
    return data as Currency
  } catch (error) {
    console.error('Error fetching default currency:', error)
    return DEFAULT_CURRENCIES[0] // AED
  }
}

/**
 * تحديد العملة تلقائياً حسب موقع المشروع
 */
export async function getCurrencyForProject(projectLocation?: string): Promise<Currency> {
  try {
    // إذا لم يتم تحديد الموقع، استخدم العملة الافتراضية (AED)
    if (!projectLocation) {
      return await getDefaultCurrency()
    }
    
    // تحديد العملة حسب الموقع
    const location = projectLocation.toLowerCase()
    
    if (location.includes('uae') || location.includes('emirates') || location.includes('dubai') || location.includes('abu dhabi')) {
      // الإمارات - العملة الافتراضية AED
      return await getDefaultCurrency()
    } else if (location.includes('saudi') || location.includes('riyadh') || location.includes('jeddah')) {
      // السعودية - الريال السعودي
      const currencies = await getAllCurrencies()
      const sarCurrency = currencies.find(c => c.code === 'SAR')
      return sarCurrency || await getDefaultCurrency()
    } else if (location.includes('usa') || location.includes('america') || location.includes('dollar')) {
      // أمريكا - الدولار الأمريكي
      const currencies = await getAllCurrencies()
      const usdCurrency = currencies.find(c => c.code === 'USD')
      return usdCurrency || await getDefaultCurrency()
    } else {
      // أي مكان آخر - العملة الافتراضية (AED)
      return await getDefaultCurrency()
    }
  } catch (error) {
    console.error('Error determining currency for project:', error)
    return await getDefaultCurrency()
  }
}

/**
 * إضافة عملة جديدة
 */
export async function addCurrency(currency: Omit<Currency, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; data?: Currency }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من عدم وجود عملة بنفس الكود
    const { data: existing } = await executeQuery(async () =>
      supabase
        .from('currencies')
        .select('id')
        .eq('code', currency.code)
        .single()
    )
    
    if (existing) {
      return { success: false, error: 'Currency with this code already exists' }
    }
    
    // إذا كانت العملة الجديدة هي الافتراضية، قم بإلغاء الافتراضية من العملات الأخرى
    if (currency.is_default) {
      await executeQuery(async () =>
        (supabase as any)
          .from('currencies')
          .update({ is_default: false })
          .eq('is_default', true)
      )
    }
    
    // أضف العملة الجديدة
    const { data, error } = await executeQuery(async () =>
      (supabase as any)
        .from('currencies')
        .insert([{
          ...currency,
          usage_count: 0
        }])
        .select()
        .single()
    )
    
    if (error) {
      console.error('Error adding currency:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Currency added successfully:', data)
    return { success: true, data: data as unknown as Currency }
  } catch (error: any) {
    console.error('Error adding currency:', error)
    return { success: false, error: error.message }
  }
}

/**
 * تحديث عملة
 */
export async function updateCurrency(id: string, updates: Partial<Currency>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // إذا كانت العملة ستكون الافتراضية، قم بإلغاء الافتراضية من العملات الأخرى
    if (updates.is_default) {
      await executeQuery(async () =>
        (supabase as any)
          .from('currencies')
          .update({ is_default: false })
          .eq('is_default', true)
      )
    }
    
    const { error } = await executeQuery(async () =>
      (supabase as any)
        .from('currencies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    )
    
    if (error) {
      console.error('Error updating currency:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Currency updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating currency:', error)
    return { success: false, error: error.message }
  }
}

/**
 * حذف (تعطيل) عملة
 */
export async function deleteCurrency(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // لا يمكن حذف العملة الافتراضية
    const { data: currency } = await executeQuery(async () =>
      supabase
        .from('currencies')
        .select('is_default')
        .eq('id', id)
        .single()
    )
    
    if (currency && (currency as any).is_default) {
      return { success: false, error: 'Cannot delete default currency' }
    }
    
    // تعطيل بدلاً من الحذف
    const { error } = await executeQuery(async () =>
      (supabase as any)
        .from('currencies')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    )
    
    if (error) {
      console.error('Error deleting currency:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Currency deactivated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting currency:', error)
    return { success: false, error: error.message }
  }
}

/**
 * تحويل العملة
 */
export function convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
  if (fromCurrency.code === toCurrency.code) {
    return amount
  }
  
  // تحويل إلى AED أولاً
  const amountInAED = amount / fromCurrency.exchange_rate
  
  // ثم تحويل إلى العملة المطلوبة
  const convertedAmount = amountInAED * toCurrency.exchange_rate
  
  return Math.round(convertedAmount * 100) / 100 // تقريب إلى منزلتين عشريتين
}

/**
 * تنسيق المبلغ مع رمز العملة
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
  
  return `${currency.symbol} ${formattedAmount}`
}

/**
 * تنسيق المبلغ بناءً على كود العملة فقط (دالة مساعدة للاستخدام في المكونات)
 * Format amount based on currency code (helper function for components)
 */
export async function formatCurrencyByCode(amount: number, currencyCode?: string): Promise<string> {
  try {
    let currency: Currency
    
    if (currencyCode) {
      // جلب العملة المحددة
      const currencies = await getAllCurrencies()
      currency = currencies.find(c => c.code === currencyCode) || await getDefaultCurrency()
    } else {
      // استخدام العملة الافتراضية
      currency = await getDefaultCurrency()
    }
    
    return formatCurrency(amount, currency)
  } catch (error) {
    console.error('Error formatting currency:', error)
    // Fallback إلى العملة الافتراضية
    const defaultCurrency = DEFAULT_CURRENCIES[0] // AED
    return formatCurrency(amount, defaultCurrency)
  }
}

/**
 * تنسيق المبلغ بناءً على كود العملة (نسخة متزامنة - تستخدم cache)
 * Format amount based on currency code (synchronous version - uses cache)
 */
let currencyCache: Map<string, Currency> = new Map()
let currencyCacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 دقائق

export async function refreshCurrencyCache(): Promise<void> {
  try {
    const currencies = await getAllCurrencies()
    currencyCache.clear()
    currencies.forEach(c => currencyCache.set(c.code, c))
    currencyCacheTimestamp = Date.now()
  } catch (error) {
    console.error('Error refreshing currency cache:', error)
  }
}

export function formatCurrencyByCodeSync(amount: number, currencyCode?: string): string {
  // Handle NaN, null, undefined, and invalid values
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    amount = 0
  }
  
  // تحديث الـ cache إذا كان قديم
  if (Date.now() - currencyCacheTimestamp > CACHE_DURATION || currencyCache.size === 0) {
    refreshCurrencyCache().catch(console.error)
  }
  
  let currency: Currency
  
  if (currencyCode && currencyCache.has(currencyCode)) {
    currency = currencyCache.get(currencyCode)!
  } else {
    // استخدام العملة الافتراضية من الـ cache أو fallback
    currency = currencyCache.get('AED') || DEFAULT_CURRENCIES[0]
  }
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
  
  return `${currency.symbol} ${formattedAmount}`
}

/**
 * زيادة عداد الاستخدام عند استخدام العملة في مشروع
 */
export async function incrementCurrencyUsage(currencyCode: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { data: currency } = await executeQuery(async () =>
      supabase
        .from('currencies')
        .select('id, usage_count')
        .eq('code', currencyCode)
        .single()
    )
    
    if (currency) {
      await executeQuery(async () =>
        (supabase as any)
          .from('currencies')
          .update({ 
            usage_count: ((currency as any).usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', (currency as any).id)
      )
    }
  } catch (error) {
    console.error('Error incrementing currency usage:', error)
  }
}

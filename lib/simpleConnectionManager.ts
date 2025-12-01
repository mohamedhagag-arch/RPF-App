/**
 * Simple Connection Manager - مدير اتصال بسيط ومستقر
 * 
 * نظام مبسط لإدارة الاتصال مع Supabase بدون تعقيدات
 * يركز على الاستقرار بدلاً من المراقبة المفرطة
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ✅ عميل واحد فقط
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null
let isInitialized = false
let sessionRefreshInterval: NodeJS.Timeout | null = null

/**
 * الحصول على عميل Supabase
 */
export function getSupabaseClient() {
  // ✅ التحقق من أننا في runtime وليس build time
  if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
    // أثناء البناء، لا نحاول إنشاء client
    throw new Error('Cannot create Supabase client during build time')
  }
  
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      // ✅ في build time، لا نرمي خطأ - فقط نرجع null أو نستخدم fallback
      if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️ Supabase credentials not available during build - this is expected')
        // Return a mock client or throw a more descriptive error
        throw new Error('Supabase credentials are required but not available during build. This route should only be called at runtime.')
      }
      throw new Error('Missing Supabase credentials')
    }
    
    console.log('🔧 Creating Supabase client...')
    supabaseClient = createClientComponentClient({
      supabaseUrl,
      supabaseKey,
    })
    isInitialized = true
    console.log('✅ Supabase client created successfully')
    
    // ✅ إعداد auto-refresh للـ session كل 50 دقيقة (قبل انتهاء الساعة)
    setupSessionRefresh()
  }
  return supabaseClient
}

/**
 * إعداد auto-refresh للـ session
 */
function setupSessionRefresh() {
  // تجنب إعداد متعدد
  if (sessionRefreshInterval) {
    return
  }
  
  // refresh كل 30 دقيقة (أكثر تكراراً لضمان الاستقرار)
  sessionRefreshInterval = setInterval(async () => {
    try {
      const client = getSupabaseClient()
      
      // التحقق من الـ session الحالي أولاً
      const { data: { session }, error: sessionError } = await client.auth.getSession()
      
      if (sessionError) {
        console.warn('⚠️ Session check failed:', sessionError.message)
        return
      }
      
      if (!session) {
        // ✅ Only log in development mode to reduce console noise
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.warn('⚠️ No session to refresh')
        }
        return
      }
      
      // التحقق من انتهاء الـ session
      const expiresAt = session.expires_at
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0
      
      // إذا كان الـ session سينتهي خلال 15 دقيقة، قم بالتحديث
      if (timeUntilExpiry < 15 * 60) {
        console.log('🔄 Session expires soon, refreshing...')
        const { data, error } = await client.auth.refreshSession()
        
        if (error) {
          console.warn('⚠️ Session refresh failed:', error.message)
          // محاولة إعادة إنشاء العميل
          supabaseClient = null
          getSupabaseClient()
        } else if (data.session) {
          console.log('✅ Session refreshed successfully')
        }
      } else {
        console.log(`✅ Session valid for ${Math.floor(timeUntilExpiry / 60)} more minutes`)
      }
    } catch (error) {
      console.warn('⚠️ Session refresh error:', error)
      // محاولة إعادة إنشاء العميل
      supabaseClient = null
      getSupabaseClient()
    }
  }, 30 * 60 * 1000) // 30 دقيقة
  
  console.log('🔄 Session auto-refresh enabled (every 30 minutes)')
}

/**
 * تنفيذ استعلام مع معالجة الأخطاء البسيطة
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  let retryCount = 0
  const maxRetries = 3
  
  while (retryCount < maxRetries) {
    try {
      const result = await queryFn()
      
      // إذا نجح الاستعلام، إرجاع النتيجة
      if (!result.error) {
        return result
      }
      
      // إذا كان خطأ اتصال، محاولة إعادة إنشاء العميل
      const isConnectionError = 
        result.error.message?.includes('connection') ||
        result.error.message?.includes('network') ||
        result.error.message?.includes('timeout') ||
        result.error.message?.includes('fetch') ||
        result.error.message?.includes('Failed to fetch') ||
        result.error.message?.includes('NetworkError')
      
      if (isConnectionError) {
        console.warn(`⚠️ Connection error detected (attempt ${retryCount + 1}/${maxRetries}), recreating client...`)
        
        // إعادة إنشاء العميل
        supabaseClient = null
        getSupabaseClient()
        
        // انتظار قليل قبل المحاولة مرة أخرى
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        retryCount++
        continue
      }
      
      // إذا لم يكن خطأ اتصال، إرجاع الخطأ
      return result
    } catch (error: any) {
      console.warn(`⚠️ Query exception (attempt ${retryCount + 1}/${maxRetries}):`, error.message)
      
      // محاولة إعادة إنشاء العميل
      supabaseClient = null
      getSupabaseClient()
      
      // انتظار قليل قبل المحاولة مرة أخرى
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      retryCount++
    }
  }
  
  // إذا فشلت جميع المحاولات
  console.error('❌ All query attempts failed')
  return { data: null, error: new Error('All query attempts failed') }
}

/**
 * فحص بسيط للاتصال
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    
    // ✅ التحقق من الـ session أولاً
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    
    if (sessionError) {
      console.warn('⚠️ Session error:', sessionError.message)
      // محاولة إعادة إنشاء العميل
      supabaseClient = null
      getSupabaseClient()
      return false
    }
    
    if (!session) {
      console.warn('⚠️ No active session found - but not redirecting immediately')
      // لا نقوم بإعادة توجيه فورية - نترك للمستخدم اختيار تسجيل الدخول
      return false
    }
    
    console.log('✅ Session found:', session.user.email)
    console.log('📊 Session details:', {
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      access_token: session.access_token ? 'Present' : 'Missing',
      refresh_token: session.refresh_token ? 'Present' : 'Missing'
    })
    
    // ✅ التحقق من أن الـ session لم ينتهِ
    const expiresAt = session.expires_at
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0
    
    if (expiresAt && expiresAt < now) {
      console.warn('⚠️ Session expired, refreshing...')
      const { error: refreshError } = await client.auth.refreshSession()
      if (refreshError) {
        console.error('❌ Failed to refresh session:', refreshError.message)
        // محاولة إعادة إنشاء العميل
        supabaseClient = null
        getSupabaseClient()
        return false
      }
      console.log('✅ Session refreshed successfully')
    } else if (timeUntilExpiry < 5 * 60) {
      // إذا كان الـ session سينتهي خلال 5 دقائق، قم بالتحديث فوراً
      console.log('🔄 Session expires soon, refreshing immediately...')
      const { error: refreshError } = await client.auth.refreshSession()
      if (refreshError) {
        console.error('❌ Failed to refresh session:', refreshError.message)
        return false
      }
      console.log('✅ Session refreshed successfully')
    }
    
    console.log(`✅ Connection check passed - Session valid for ${Math.floor(timeUntilExpiry / 60)} minutes`)
    return true
  } catch (error: any) {
    console.warn('⚠️ Connection check error:', error.message)
    // محاولة إعادة إنشاء العميل
    supabaseClient = null
    getSupabaseClient()
    return false
  }
}

/**
 * إعادة تعيين العميل
 */
export function resetClient(): void {
  console.log('🔄 Resetting Supabase client...')
  
  // تنظيف الـ interval
  if (sessionRefreshInterval) {
    clearInterval(sessionRefreshInterval)
    sessionRefreshInterval = null
  }
  
  supabaseClient = null
  isInitialized = false
}

/**
 * الحصول على حالة الاتصال
 */
export function getConnectionInfo() {
  return {
    isInitialized,
    hasClient: !!supabaseClient
  }
}

export default {
  getSupabaseClient,
  executeQuery,
  checkConnection,
  resetClient,
  getConnectionInfo
}
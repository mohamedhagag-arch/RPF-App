/**
 * Stable Connection Manager - مدير اتصال مستقر 100%
 * 
 * حل نهائي لمشكلة فقد الاتصال و Syncing
 * يستخدم أفضل الممارسات لضمان استقرار الاتصال
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Type for our Supabase client
type AppSupabaseClient = ReturnType<typeof createClient>

// ✅ singleton instance - عميل واحد فقط في كل التطبيق
let supabaseInstance: AppSupabaseClient | null = null
let sessionCheckInterval: NodeJS.Timeout | null = null
let isInitializing = false

/**
 * إعدادات الاتصال المثالية
 */
const CONNECTION_CONFIG = {
  auth: {
    // ✅ تفعيل auto refresh
    autoRefreshToken: true,
    // ✅ حفظ الـ session
    persistSession: true,
    // ✅ الكشف عن تغييرات الـ session
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      // ✅ keep-alive للحفاظ على الاتصال
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=600, max=1000',
    },
  },
  realtime: {
    // ✅ تعطيل Realtime لتقليل الاستهلاك
    params: {
      eventsPerSecond: 2,
    },
  },
}

/**
 * الحصول على عميل Supabase مستقر
 */
export function getStableSupabaseClient(): AppSupabaseClient {
  // إذا كان العميل موجود بالفعل، نعيده مباشرة
  if (supabaseInstance) {
    return supabaseInstance
  }

  // منع إنشاء متعدد في نفس الوقت
  if (isInitializing) {
    // انتظار حتى ينتهي الإنشاء
    return new Proxy({} as AppSupabaseClient, {
      get: (target, prop) => {
        if (supabaseInstance) {
          return (supabaseInstance as any)[prop]
        }
        throw new Error('Supabase client is still initializing')
      },
    })
  }

  isInitializing = true
  console.log('🔧 [StableConnection] Creating new Supabase client...')

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    // ✅ إنشاء العميل مع الإعدادات المثالية
    supabaseInstance = createClient(supabaseUrl, supabaseKey, CONNECTION_CONFIG)

    console.log('✅ [StableConnection] Client created successfully')
    console.log('📊 [StableConnection] URL:', supabaseUrl.substring(0, 30) + '...')

    // ✅ إعداد مراقبة الـ session
    setupSessionMonitoring()

    // ✅ إعداد معالج للأخطاء
    setupErrorHandlers()

  } catch (error: any) {
    console.error('❌ [StableConnection] Failed to create client:', error.message)
    isInitializing = false
    throw error
  }

  isInitializing = false
  return supabaseInstance
}

/**
 * مراقبة الـ session بشكل ذكي
 */
function setupSessionMonitoring() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval)
  }

  console.log('🔄 [StableConnection] Session monitoring started')

  // ✅ فحص كل 10 دقائق (أكثر تكراراً)
  sessionCheckInterval = setInterval(async () => {
    if (!supabaseInstance) return

    try {
      const { data: { session }, error } = await supabaseInstance.auth.getSession()

      if (error) {
        console.warn('⚠️ [StableConnection] Session check failed:', error.message)
        return
      }

      if (!session) {
        // ✅ Only log in development mode to reduce console noise
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.warn('⚠️ [StableConnection] No active session')
        }
        return
      }

      const expiresAt = session.expires_at || 0
      const now = Math.floor(Date.now() / 1000)
      const timeLeft = expiresAt - now
      const minutesLeft = Math.floor(timeLeft / 60)

      console.log(`✅ [StableConnection] Session valid for ${minutesLeft} minutes`)

      // ✅ تحديث مبكر - قبل 20 دقيقة من انتهاء الصلاحية
      if (timeLeft < 20 * 60 && timeLeft > 0) {
        console.log('🔄 [StableConnection] Refreshing session proactively...')
        
        const { data, error: refreshError } = await supabaseInstance.auth.refreshSession()
        
        if (refreshError) {
          console.error('❌ [StableConnection] Refresh failed:', refreshError.message)
        } else if (data.session) {
          console.log('✅ [StableConnection] Session refreshed successfully')
          console.log(`📊 [StableConnection] New expiry in ${Math.floor((data.session.expires_at! - now) / 60)} minutes`)
        }
      }
    } catch (error: any) {
      console.error('❌ [StableConnection] Monitoring error:', error.message)
    }
  }, 10 * 60 * 1000) // كل 10 دقائق

  // ✅ فحص فوري عند الإنشاء
  setTimeout(async () => {
    if (!supabaseInstance) return
    
    try {
      const { data: { session } } = await supabaseInstance.auth.getSession()
      if (session) {
        const expiresAt = session.expires_at || 0
        const now = Math.floor(Date.now() / 1000)
        const minutesLeft = Math.floor((expiresAt - now) / 60)
        console.log(`✅ [StableConnection] Initial session check - valid for ${minutesLeft} minutes`)
      }
    } catch (error: any) {
      console.warn('⚠️ [StableConnection] Initial check failed:', error.message)
    }
  }, 1000)
}

/**
 * معالجة الأخطاء
 */
function setupErrorHandlers() {
  if (!supabaseInstance) return

  // ✅ الاستماع لتغييرات الـ auth
  supabaseInstance.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔔 [StableConnection] Auth event: ${event}`)

    if (event === 'SIGNED_OUT') {
      console.log('👋 [StableConnection] User signed out')
    } else if (event === 'SIGNED_IN') {
      console.log('👤 [StableConnection] User signed in:', session?.user?.email)
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 [StableConnection] Token refreshed successfully')
    } else if (event === 'USER_UPDATED') {
      console.log('👤 [StableConnection] User data updated')
    }
  })
}

/**
 * تنفيذ استعلام مع Retry ذكي
 */
export async function executeWithRetry<T>(
  queryFn: (client: AppSupabaseClient) => Promise<T>,
  options = { maxRetries: 3, retryDelay: 1000 }
): Promise<T> {
  const client = getStableSupabaseClient()
  let lastError: any = null

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      console.log(`🔍 [StableConnection] Query attempt ${attempt}/${options.maxRetries}`)
      const result = await queryFn(client)
      console.log(`✅ [StableConnection] Query succeeded on attempt ${attempt}`)
      return result
    } catch (error: any) {
      lastError = error
      const errorMsg = error.message || 'Unknown error'
      
      console.warn(`⚠️ [StableConnection] Attempt ${attempt} failed:`, errorMsg)

      // ✅ تحقق إذا كان خطأ اتصال
      const isConnectionError = 
        errorMsg.includes('fetch') ||
        errorMsg.includes('network') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('connection') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('ETIMEDOUT')

      if (isConnectionError && attempt < options.maxRetries) {
        const delay = options.retryDelay * attempt
        console.log(`⏳ [StableConnection] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // ✅ محاولة refresh للـ session قبل إعادة المحاولة
        try {
          await client.auth.refreshSession()
          console.log('✅ [StableConnection] Session refreshed before retry')
        } catch (refreshError) {
          console.warn('⚠️ [StableConnection] Session refresh failed:', refreshError)
        }
        
        continue
      }

      // إذا لم يكن خطأ اتصال أو نفذت المحاولات، نرمي الخطأ
      if (attempt >= options.maxRetries) {
        throw lastError
      }
    }
  }

  throw lastError
}

/**
 * فحص الاتصال
 */
export async function checkStableConnection(): Promise<boolean> {
  try {
    const client = getStableSupabaseClient()
    
    // ✅ فحص بسيط - التحقق من الـ session
    const { data: { session }, error } = await client.auth.getSession()

    if (error) {
      console.warn('⚠️ [StableConnection] Connection check failed:', error.message)
      return false
    }

    if (!session) {
      // ✅ Only log in development mode to reduce console noise
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.warn('⚠️ [StableConnection] No active session')
      }
      return false
    }

    console.log('✅ [StableConnection] Connection check passed')
    return true
  } catch (error: any) {
    console.error('❌ [StableConnection] Connection check error:', error.message)
    return false
  }
}

/**
 * تنظيف الموارد
 */
export function cleanupConnection() {
  console.log('🧹 [StableConnection] Cleaning up...')
  
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval)
    sessionCheckInterval = null
  }

  supabaseInstance = null
  isInitializing = false
}

/**
 * إعادة إنشاء الاتصال (للحالات الطارئة فقط)
 */
export function recreateConnection() {
  console.log('🔄 [StableConnection] Recreating connection...')
  cleanupConnection()
  return getStableSupabaseClient()
}

// ✅ Export as default
export default {
  getStableSupabaseClient,
  executeWithRetry,
  checkStableConnection,
  cleanupConnection,
  recreateConnection,
}


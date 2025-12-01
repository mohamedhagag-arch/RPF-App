/**
 * Ultimate Connection Manager - الحل الجذري لمشكلة "Syncing..."
 * 
 * نظام موحد لإدارة الاتصال مع Supabase يمنع قطع الاتصال نهائياً
 * يحل جميع مشاكل "Syncing..." ويضمن استقرار الاتصال
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ✅ SINGLETON PATTERN - عميل واحد فقط
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null
let isMonitoring = false
let monitorInterval: NodeJS.Timeout | null = null
let keepAliveInterval: NodeJS.Timeout | null = null
let lastSuccessfulPing = Date.now()

// ✅ إعدادات الاتصال المحسّنة
const CONNECTION_CONFIG = {
  // فحص صحة الاتصال كل 30 ثانية (أقل تكراراً لتقليل الضغط)
  healthCheckInterval: 30000,
  
  // إرسال keep-alive كل 20 ثانية (أقل من 30 ثانية)
  keepAliveInterval: 20000,
  
  // إعادة المحاولة عند الفشل
  maxRetries: 2, // تقليل عدد المحاولات
  retryDelay: 5000, // زيادة التأخير بين المحاولات
  
  // مهلة زمنية أطول للاستعلامات
  queryTimeout: 30000, // 30 ثانية بدلاً من 10
  
  // مهلة زمنية أقصر لـ keep-alive
  keepAliveTimeout: 10000 // 10 ثواني لـ keep-alive فقط
}

/**
 * الحصول على عميل Supabase (Singleton)
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    console.log('🔧 Creating new Supabase client instance')
    supabaseClient = createClientComponentClient()
  }
  return supabaseClient
}

/**
 * فحص صحة الاتصال
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    
    // استعلام خفيف جداً للتحقق من الاتصال
    const { data, error } = await Promise.race([
      client
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle(), // استخدام maybeSingle بدلاً من single لتجنب الأخطاء
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), CONNECTION_CONFIG.queryTimeout)
      )
    ]) as any
    
    const isHealthy = !error || error.code === 'PGRST116' // PGRST116 = no rows (طبيعي)
    
    if (isHealthy) {
      lastSuccessfulPing = Date.now()
      console.log('✅ Connection health check passed')
    } else {
      console.warn('⚠️ Connection health check failed:', error?.message)
    }
    
    return isHealthy
  } catch (error: any) {
    console.warn('⚠️ Connection health check error:', error.message)
    return false
  }
}

/**
 * إعادة الاتصال
 */
export async function reconnect(): Promise<boolean> {
  console.log('🔄 Attempting to reconnect to Supabase...')
  
  try {
    // إعادة تعيين العميل
    supabaseClient = null
    
    // الحصول على عميل جديد
    const client = getSupabaseClient()
    
    // اختبار الاتصال
    const isHealthy = await checkConnectionHealth()
    
    if (isHealthy) {
      console.log('✅ Reconnection successful')
      return true
    } else {
      console.error('❌ Reconnection failed - connection still unhealthy')
      return false
    }
  } catch (error: any) {
    console.error('❌ Reconnection error:', error.message)
    return false
  }
}

/**
 * إرسال keep-alive ping
 */
async function sendKeepAlivePing(): Promise<void> {
  try {
    const client = getSupabaseClient()
    
    // استعلام خفيف جداً للحفاظ على الاتصال
    await Promise.race([
      client
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle(), // استخدام maybeSingle لتجنب الأخطاء
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Keep-alive timeout')), CONNECTION_CONFIG.keepAliveTimeout)
      )
    ])
    
    lastSuccessfulPing = Date.now()
    console.log('💓 Keep-alive ping sent successfully')
  } catch (error: any) {
    console.warn('⚠️ Keep-alive ping failed:', error.message)
    
    // لا نحاول إعادة الاتصال فوراً عند فشل keep-alive
    // سنترك health check يتعامل مع ذلك
  }
}

/**
 * بدء مراقبة الاتصال
 */
export function startConnectionMonitoring(): void {
  if (isMonitoring) {
    console.log('🔍 Connection monitoring already running')
    return
  }
  
  isMonitoring = true
  console.log('🔍 Starting ultimate connection monitoring...')
  
  // فحص صحة الاتصال كل 30 ثانية (أقل تكراراً)
  monitorInterval = setInterval(async () => {
    const isHealthy = await checkConnectionHealth()
    
    if (!isHealthy) {
      console.warn('⚠️ Connection unhealthy, attempting to reconnect...')
      // محاولة إعادة الاتصال مرة واحدة فقط
      const reconnected = await reconnect()
      if (!reconnected) {
        console.warn('⚠️ Reconnection failed, will try again in next cycle')
      }
    }
  }, CONNECTION_CONFIG.healthCheckInterval)
  
  // إرسال keep-alive كل 20 ثانية
  keepAliveInterval = setInterval(() => {
    sendKeepAlivePing()
  }, CONNECTION_CONFIG.keepAliveInterval)
  
  // فحص أولي فوري
  checkConnectionHealth()
  
  console.log('✅ Ultimate connection monitoring started')
  console.log(`   - Health checks every ${CONNECTION_CONFIG.healthCheckInterval / 1000}s`)
  console.log(`   - Keep-alive pings every ${CONNECTION_CONFIG.keepAliveInterval / 1000}s`)
  console.log(`   - Query timeout: ${CONNECTION_CONFIG.queryTimeout / 1000}s`)
  console.log(`   - Keep-alive timeout: ${CONNECTION_CONFIG.keepAliveTimeout / 1000}s`)
}

/**
 * إيقاف مراقبة الاتصال
 */
export function stopConnectionMonitoring(): void {
  if (!isMonitoring) return
  
  isMonitoring = false
  console.log('🔍 Stopping ultimate connection monitoring...')
  
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
  
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
  
  console.log('✅ Ultimate connection monitoring stopped')
}

/**
 * تنفيذ استعلام مع إعادة المحاولة التلقائية
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries: number = CONNECTION_CONFIG.maxRetries
): Promise<{ data: T | null; error: any }> {
  let lastError: any
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await queryFn()
      
      // إذا نجح الاستعلام، إرجاع النتيجة
      if (!result.error) {
        return result
      }
      
      // إذا كان خطأ اتصال، محاولة إعادة الاتصال
      const isConnectionError = 
        result.error.message?.includes('connection') ||
        result.error.message?.includes('network') ||
        result.error.message?.includes('timeout') ||
        result.error.message?.includes('fetch') ||
        result.error.code === 'PGRST301' || // Connection timeout
        result.error.code === 'PGRST302' || // Connection refused
        result.error.code === 'PGRST303'    // Connection reset
      
      if (isConnectionError && attempt < retries) {
        console.log(`🔄 Connection error detected (attempt ${attempt}/${retries}), retrying...`)
        
        // إعادة الاتصال
        await reconnect()
        
        // انتظار قبل المحاولة التالية
        await new Promise(resolve => setTimeout(resolve, CONNECTION_CONFIG.retryDelay))
        
        lastError = result.error
        continue
      }
      
      return result
    } catch (error: any) {
      lastError = error
      
      // إذا كان خطأ اتصال، محاولة إعادة الاتصال
      const isConnectionError = 
        error.message?.includes('connection') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('fetch')
      
      if (isConnectionError && attempt < retries) {
        console.log(`🔄 Connection exception (attempt ${attempt}/${retries}), retrying...`)
        
        // إعادة الاتصال
        await reconnect()
        
        // انتظار قبل المحاولة التالية
        await new Promise(resolve => setTimeout(resolve, CONNECTION_CONFIG.retryDelay))
        
        continue
      }
      
      return { data: null, error }
    }
  }
  
  return { data: null, error: lastError }
}

/**
 * الحصول على حالة الاتصال
 */
export function getConnectionStatus() {
  const timeSinceLastPing = Date.now() - lastSuccessfulPing
  const isHealthy = timeSinceLastPing < CONNECTION_CONFIG.keepAliveInterval * 2 // ضعف فترة keep-alive
  
  return {
    isMonitoring,
    isHealthy,
    timeSinceLastPing,
    lastSuccessfulPing: new Date(lastSuccessfulPing).toLocaleTimeString()
  }
}

/**
 * تنظيف الموارد
 */
export function cleanup(): void {
  stopConnectionMonitoring()
  supabaseClient = null
  console.log('🧹 Ultimate connection manager cleaned up')
}

// ✅ بدء المراقبة تلقائياً عند تحميل الوحدة (في المتصفح فقط)
if (typeof window !== 'undefined') {
  // تأخير بسيط لضمان تحميل البيئة
  setTimeout(() => {
    startConnectionMonitoring()
  }, 1000)
}

// ✅ تنظيف عند إغلاق الصفحة
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanup()
  })
}

export default {
  getSupabaseClient,
  checkConnectionHealth,
  reconnect,
  startConnectionMonitoring,
  stopConnectionMonitoring,
  executeWithRetry,
  getConnectionStatus,
  cleanup
}

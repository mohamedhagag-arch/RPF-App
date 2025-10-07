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

/**
 * الحصول على عميل Supabase
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    console.log('🔧 Creating Supabase client...')
    supabaseClient = createClientComponentClient()
    isInitialized = true
    console.log('✅ Supabase client created successfully')
  }
  return supabaseClient
}

/**
 * تنفيذ استعلام مع معالجة الأخطاء البسيطة
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
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
      result.error.message?.includes('fetch')
    
    if (isConnectionError) {
      console.warn('⚠️ Connection error detected, recreating client...')
      
      // إعادة إنشاء العميل
      supabaseClient = null
      const newClient = getSupabaseClient()
      
      // محاولة الاستعلام مرة أخرى
      return await queryFn()
    }
    
    return result
  } catch (error: any) {
    console.warn('⚠️ Query exception:', error.message)
    
    // محاولة إعادة إنشاء العميل
    supabaseClient = null
    const newClient = getSupabaseClient()
    
    // محاولة الاستعلام مرة أخرى
    try {
      return await queryFn()
    } catch (retryError: any) {
      return { data: null, error: retryError }
    }
  }
}

/**
 * فحص بسيط للاتصال
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    
    // استعلام بسيط جداً
    const { error } = await client
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    const isConnected = !error || error.code === 'PGRST116'
    
    if (isConnected) {
      console.log('✅ Connection check passed')
    } else {
      console.warn('⚠️ Connection check failed:', error?.message)
    }
    
    return isConnected
  } catch (error: any) {
    console.warn('⚠️ Connection check error:', error.message)
    return false
  }
}

/**
 * إعادة تعيين العميل
 */
export function resetClient(): void {
  console.log('🔄 Resetting Supabase client...')
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
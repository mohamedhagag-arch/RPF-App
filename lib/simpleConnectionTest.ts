/**
 * Simple Connection Test - اختبار النظام البسيط
 * 
 * هذا الملف يختبر النظام البسيط للتأكد من عمله بشكل صحيح
 */

// إعلان TypeScript للـ window object
declare global {
  interface Window {
    __connectionTestRun?: boolean
    __connectionMonitorActive?: boolean
  }
}

import { 
  getSupabaseClient, 
  checkConnection,
  getConnectionInfo,
  executeQuery
} from './simpleConnectionManager'

export async function testSimpleConnectionSystem() {
  console.log('🧪 Testing Simple Connection System...')
  
  try {
    // 1. اختبار الحصول على العميل
    console.log('1️⃣ Testing client creation...')
    const client = getSupabaseClient()
    console.log('✅ Client created successfully')
    
    // 2. اختبار معلومات الاتصال
    console.log('2️⃣ Testing connection info...')
    const info = getConnectionInfo()
    console.log('📊 Connection Info:', info)
    
    // 3. اختبار فحص الاتصال
    console.log('3️⃣ Testing connection check...')
    const isConnected = await checkConnection()
    console.log(`✅ Connection status: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`)
    
    // 4. اختبار استعلام بسيط
    console.log('4️⃣ Testing simple query...')
    const { data, error } = await executeQuery(async () => {
      const result = await client
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle()
      return result
    })
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Query test failed:', error)
      return false
    }
    console.log('✅ Simple query successful')
    
    console.log('✅ All simple connection tests passed!')
    return true
    
  } catch (error: any) {
    console.error('❌ Simple connection test failed:', error)
    return false
  }
}

// ✅ تشغيل الاختبار تلقائياً في بيئة التطوير (مرة واحدة فقط)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // تأخير لضمان تحميل النظام
  setTimeout(() => {
    // تشغيل الاختبار مرة واحدة فقط
    if (!window.__connectionTestRun) {
      window.__connectionTestRun = true
      testSimpleConnectionSystem()
    }
  }, 2000)
}

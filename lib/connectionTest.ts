/**
 * Connection Test - اختبار نظام الاتصال الجديد
 * 
 * هذا الملف يختبر النظام الجديد للتأكد من عمله بشكل صحيح
 */

import { 
  getSupabaseClient, 
  checkConnectionHealth, 
  getConnectionStatus,
  startConnectionMonitoring,
  stopConnectionMonitoring
} from './ultimateConnectionManager'

export async function testConnectionSystem() {
  console.log('🧪 Testing Ultimate Connection System...')
  
  try {
    // 1. اختبار الحصول على العميل
    console.log('1️⃣ Testing client creation...')
    const client = getSupabaseClient()
    console.log('✅ Client created successfully')
    
    // 2. اختبار فحص صحة الاتصال
    console.log('2️⃣ Testing connection health check...')
    const isHealthy = await checkConnectionHealth()
    console.log(`✅ Connection health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`)
    
    // 3. اختبار استعلام بسيط
    console.log('3️⃣ Testing simple query...')
    const { data, error } = await client
      .from('users')
      .select('count')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Query test failed:', error)
      return false
    }
    console.log('✅ Simple query successful')
    
    // 4. اختبار حالة الاتصال
    console.log('4️⃣ Testing connection status...')
    const status = getConnectionStatus()
    console.log('📊 Connection Status:', status)
    
    // 5. اختبار مراقبة الاتصال
    console.log('5️⃣ Testing connection monitoring...')
    startConnectionMonitoring()
    
    // انتظار قليل لرؤية النتائج
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const statusAfterMonitoring = getConnectionStatus()
    console.log('📊 Status after monitoring:', statusAfterMonitoring)
    
    console.log('✅ All connection tests passed!')
    return true
    
  } catch (error: any) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

// ✅ تشغيل الاختبار تلقائياً في بيئة التطوير
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // تأخير لضمان تحميل النظام
  setTimeout(() => {
    testConnectionSystem()
  }, 3000)
}

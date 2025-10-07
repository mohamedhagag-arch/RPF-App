/**
 * Connection Cleanup - تنظيف ملفات الاتصال القديمة
 * 
 * هذا الملف يوقف جميع أنظمة إدارة الاتصال القديمة
 * لمنع التضارب مع النظام الجديد
 */

// ✅ إيقاف جميع أنظمة الاتصال القديمة
export function cleanupOldConnectionSystems() {
  console.log('🧹 Cleaning up old connection systems...')
  
  try {
    // إيقاف ConnectionKeepAlive
    const { connectionKeepAlive } = require('./connectionKeepAlive')
    if (connectionKeepAlive && connectionKeepAlive.stop) {
      connectionKeepAlive.stop()
      console.log('✅ Stopped ConnectionKeepAlive')
    }
  } catch (error) {
    console.log('ℹ️ ConnectionKeepAlive not found or already stopped')
  }
  
  try {
    // إيقاف ConnectionFixMonitor
    const { connectionFixMonitor } = require('./connectionFix')
    if (connectionFixMonitor && connectionFixMonitor.stop) {
      connectionFixMonitor.stop()
      console.log('✅ Stopped ConnectionFixMonitor')
    }
  } catch (error) {
    console.log('ℹ️ ConnectionFixMonitor not found or already stopped')
  }
  
  try {
    // إيقاف ConnectionManager
    const { ConnectionManager } = require('./connectionManager')
    if (ConnectionManager && ConnectionManager.getInstance) {
      const manager = ConnectionManager.getInstance()
      if (manager && manager.stop) {
        manager.stop()
        console.log('✅ Stopped ConnectionManager')
      }
    }
  } catch (error) {
    console.log('ℹ️ ConnectionManager not found or already stopped')
  }
  
  try {
    // إيقاف ConnectionStabilizer
    const { ConnectionStabilizer } = require('./connectionStabilizer')
    if (ConnectionStabilizer && ConnectionStabilizer.getInstance) {
      const stabilizer = ConnectionStabilizer.getInstance()
      if (stabilizer && stabilizer.stop) {
        stabilizer.stop()
        console.log('✅ Stopped ConnectionStabilizer')
      }
    }
  } catch (error) {
    console.log('ℹ️ ConnectionStabilizer not found or already stopped')
  }
  
  try {
    // إيقاف ConnectionGuard
    const { ConnectionGuard } = require('./connectionGuard')
    if (ConnectionGuard && ConnectionGuard.getInstance) {
      const guard = ConnectionGuard.getInstance()
      if (guard && guard.stop) {
        guard.stop()
        console.log('✅ Stopped ConnectionGuard')
      }
    }
  } catch (error) {
    console.log('ℹ️ ConnectionGuard not found or already stopped')
  }
  
  console.log('✅ Old connection systems cleanup completed')
}

// ✅ تنظيف تلقائي عند تحميل الوحدة
if (typeof window !== 'undefined') {
  // تأخير بسيط لضمان تحميل جميع الأنظمة أولاً
  setTimeout(() => {
    cleanupOldConnectionSystems()
  }, 2000)
}

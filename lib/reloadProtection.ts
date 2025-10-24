/**
 * حماية من الـ reload المتكرر
 */

let reloadCount = 0
let lastReloadTime = 0
const MAX_RELOADS = 3
const RELOAD_WINDOW = 5000 // 5 ثوان

export function checkReloadProtection(): boolean {
  const now = Date.now()
  
  // إعادة تعيين العداد إذا مر أكثر من 5 ثوان
  if (now - lastReloadTime > RELOAD_WINDOW) {
    reloadCount = 0
  }
  
  reloadCount++
  lastReloadTime = now
  
  console.log(`🔄 Reload count: ${reloadCount}/${MAX_RELOADS}`)
  
  if (reloadCount > MAX_RELOADS) {
    console.warn('⚠️ Too many reloads detected, stopping automatic redirects')
    return false
  }
  
  return true
}

export function resetReloadProtection(): void {
  reloadCount = 0
  lastReloadTime = 0
  console.log('✅ Reload protection reset')
}

// منع الـ reload المتكرر في المتصفح
if (typeof window !== 'undefined') {
  let isReloading = false
  
  window.addEventListener('beforeunload', () => {
    if (!isReloading) {
      isReloading = true
      console.log('🔄 Page is reloading...')
    }
  })
  
  window.addEventListener('load', () => {
    if (isReloading) {
      isReloading = false
      console.log('✅ Page reloaded successfully')
    }
  })
}

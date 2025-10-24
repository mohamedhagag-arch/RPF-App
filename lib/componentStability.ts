/**
 * Component Stability Manager
 * 
 * Prevents unnecessary re-mounting and re-rendering that causes "Syncing..." issues
 */

import { useRef, useCallback } from 'react'

// ✅ GLOBAL STABILITY TRACKER
const componentStabilityTracker = new Map<string, number>()

/**
 * Hook to prevent unnecessary re-mounting
 */
export function useComponentStability(componentName: string) {
  const mountCountRef = useRef(0)
  const isStableRef = useRef(false)

  const trackMount = useCallback(() => {
    mountCountRef.current += 1
    const currentCount = componentStabilityTracker.get(componentName) || 0
    componentStabilityTracker.set(componentName, currentCount + 1)
    
    console.log(`🟡 ${componentName}: Mount #${mountCountRef.current} (Total: ${currentCount + 1})`)
    
    // Consider component stable after first mount
    if (mountCountRef.current === 1) {
      isStableRef.current = true
      console.log(`✅ ${componentName}: Component is now stable`)
    } else {
      console.warn(`⚠️ ${componentName}: Component re-mounted! This may cause "Syncing..." issues`)
    }
  }, [componentName])

  const trackUnmount = useCallback(() => {
    console.log(`🔴 ${componentName}: Unmounting (was stable: ${isStableRef.current})`)
    isStableRef.current = false
  }, [componentName])

  return {
    trackMount,
    trackUnmount,
    isStable: () => isStableRef.current,
    mountCount: () => mountCountRef.current
  }
}

/**
 * Get stability report for all components
 */
export function getStabilityReport() {
  const report = Array.from(componentStabilityTracker.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by mount count descending
  
  console.log('📊 Component Stability Report:')
  report.forEach(([name, count]) => {
    const status = count === 1 ? '✅ Stable' : count > 5 ? '🔴 Unstable' : '⚠️ Multiple mounts'
    console.log(`  ${name}: ${count} mounts ${status}`)
  })
  
  return report
}

/**
 * Reset stability tracker (for testing)
 */
export function resetStabilityTracker() {
  componentStabilityTracker.clear()
  console.log('🧹 Component stability tracker reset')
}

export default useComponentStability

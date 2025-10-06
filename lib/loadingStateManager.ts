/**
 * Loading State Manager
 * 
 * Prevents "Syncing..." issues by ensuring loading states are properly managed
 * and never get stuck in loading state.
 */

import { useRef, useCallback } from 'react'

interface LoadingStateManagerOptions {
  timeout?: number // Timeout in milliseconds (default: 30 seconds)
  onTimeout?: () => void // Callback when timeout occurs
}

/**
 * Hook to manage loading states with automatic timeout
 * Prevents "Syncing..." from getting stuck indefinitely
 */
export function useLoadingStateManager(options: LoadingStateManagerOptions = {}) {
  const { timeout = 30000, onTimeout } = options
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const startLoading = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached - forcing loading to stop')
      if (onTimeout) {
        onTimeout()
      }
    }, timeout)
  }, [timeout, onTimeout])

  const stopLoading = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    isMountedRef.current = false
    stopLoading()
  }, [stopLoading])

  return {
    startLoading,
    stopLoading,
    cleanup,
    isMounted: () => isMountedRef.current
  }
}

/**
 * Safe setState wrapper that prevents state updates on unmounted components
 * and automatically manages loading states
 */
export function createSafeStateSetter<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  loadingManager: ReturnType<typeof useLoadingStateManager>
) {
  return (value: T | ((prev: T) => T)) => {
    if (loadingManager.isMounted()) {
      setState(value)
    }
  }
}

export default useLoadingStateManager

/**
 * Custom Hook for Supabase Client Management
 * 
 * This hook provides a stable Supabase client instance that prevents
 * infinite loops in useEffect dependencies.
 */

import { useMemo } from 'react'
import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Hook that returns a stable Supabase client instance
 * Use this instead of createClientComponentClient() in components
 * to prevent infinite loops in useEffect dependencies
 */
export function useSupabaseClient() {
  // ✅ MEMOIZED: Client instance is stable across re-renders
  const supabase = useMemo(() => {
    return getSupabaseClient()
  }, [])

  return supabase
}

export default useSupabaseClient

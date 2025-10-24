/**
 * Supabase Connection Manager
 * 
 * This utility helps manage Supabase connections and prevents
 * infinite loops and connection issues that cause "Syncing..." problems.
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ✅ SINGLETON PATTERN: Create supabase client once and reuse
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    console.log('🔧 Creating new Supabase client instance')
    supabaseClient = createClientComponentClient()
  }
  return supabaseClient
}

// ✅ CONNECTION HEALTH CHECK
export async function checkSupabaseConnection() {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (normal)
      console.error('❌ Supabase connection issue:', error)
      return false
    }
    
    console.log('✅ Supabase connection healthy')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

// ✅ CLEANUP FUNCTION
export function cleanupSupabaseConnections() {
  console.log('🧹 Cleaning up Supabase connections')
  // Note: Supabase client doesn't need explicit cleanup
  // but we can reset our singleton if needed
  supabaseClient = null
}

// ✅ CONNECTION MONITORING
export function monitorSupabaseHealth() {
  const checkInterval = setInterval(async () => {
    const isHealthy = await checkSupabaseConnection()
    if (!isHealthy) {
      console.warn('⚠️ Supabase connection unhealthy - attempting recovery')
      // Reset client to force reconnection
      supabaseClient = null
      // Try to reconnect immediately
      getSupabaseClient()
    }
  }, 10000) // Check every 10 seconds for faster recovery

  return () => {
    clearInterval(checkInterval)
  }
}

// ✅ RECONNECTION FUNCTION
export async function reconnectSupabase() {
  console.log('🔄 Attempting to reconnect to Supabase...')
  try {
    // Reset the client
    supabaseClient = null
    
    // Get a new client
    const client = getSupabaseClient()
    
    // Test the connection
    const { data, error } = await client
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Reconnection failed:', error)
      return false
    }
    
    console.log('✅ Supabase reconnected successfully')
    return true
  } catch (error) {
    console.error('❌ Reconnection error:', error)
    return false
  }
}

export default getSupabaseClient

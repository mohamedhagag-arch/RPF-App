/**
 * Supabase Client Configuration with Planning Schema
 * 
 * This file provides Supabase clients configured to use the "planning" schema
 * instead of the default "public" schema.
 */

import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient as createOriginalClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Server-side Supabase client with planning schema
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'planning'
  }
})

/**
 * Create a client component Supabase client with planning schema
 * Use this in React components instead of the default createClientComponentClient
 */
export function createPlanningClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'planning'
    }
  })
}

/**
 * Helper function to get configured Supabase client for components
 * This maintains compatibility with existing code
 */
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side
    return supabase
  } else {
    // Client-side
    return createPlanningClient()
  }
}

// Export types from the original supabase file
export * from './supabase'


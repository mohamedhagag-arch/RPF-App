/**
 * Planning Schema Tables Configuration
 * 
 * This file maps the actual table names in the planning schema
 * to the application's expected table names
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client with planning schema
export const planningClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'planning'
  }
})

// Actual table names in planning schema
export const PLANNING_TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ_ACTIVITIES: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI',  // ✅ Single source of truth - main KPI table
  USERS: 'users'
} as const

// Helper functions to query planning schema tables
export const PlanningDB = {
  // Projects queries
  projects: {
    getAll: () => planningClient.from(PLANNING_TABLES.PROJECTS).select('*'),
    getById: (id: string) => planningClient.from(PLANNING_TABLES.PROJECTS).select('*').eq('id', id).single(),
    getByCode: (code: string) => planningClient.from(PLANNING_TABLES.PROJECTS).select('*').eq('Project Code', code),
    insert: (data: any) => planningClient.from(PLANNING_TABLES.PROJECTS).insert(data),
    update: (id: string, data: any) => planningClient.from(PLANNING_TABLES.PROJECTS).update(data).eq('id', id),
    delete: (id: string) => planningClient.from(PLANNING_TABLES.PROJECTS).delete().eq('id', id)
  },
  
  // BOQ Activities queries
  boqActivities: {
    getAll: () => planningClient.from(PLANNING_TABLES.BOQ_ACTIVITIES).select('*'),
    getById: (id: string) => planningClient.from(PLANNING_TABLES.BOQ_ACTIVITIES).select('*').eq('id', id).single(),
    getByProject: (projectCode: string) => planningClient.from(PLANNING_TABLES.BOQ_ACTIVITIES).select('*').eq('Project Code', projectCode),
    insert: (data: any) => planningClient.from(PLANNING_TABLES.BOQ_ACTIVITIES).insert(data),
    update: (id: string, data: any) => planningClient.from(PLANNING_TABLES.BOQ_ACTIVITIES).update(data).eq('id', id),
    delete: (id: string) => planningClient.from(PLANNING_TABLES.BOQ_ACTIVITIES).delete().eq('id', id)
  },
  
  // KPI Records queries (✅ Using single main KPI table)
  kpiRecords: {
    getAll: () => planningClient.from(PLANNING_TABLES.KPI).select('*'),
    getById: (id: string) => planningClient.from(PLANNING_TABLES.KPI).select('*').eq('id', id).single(),
    getByProject: (projectCode: string) => planningClient.from(PLANNING_TABLES.KPI).select('*').eq('Project Code', projectCode),
    getPlanned: (projectCode?: string) => {
      let query = planningClient.from(PLANNING_TABLES.KPI).select('*').eq('Input Type', 'Planned')
      if (projectCode) query = query.eq('Project Code', projectCode)
      return query
    },
    getActual: (projectCode?: string) => {
      let query = planningClient.from(PLANNING_TABLES.KPI).select('*').eq('Input Type', 'Actual')
      if (projectCode) query = query.eq('Project Code', projectCode)
      return query
    },
    insert: (data: any) => planningClient.from(PLANNING_TABLES.KPI).insert(data),
    update: (id: string, data: any) => planningClient.from(PLANNING_TABLES.KPI).update(data).eq('id', id),
    delete: (id: string) => planningClient.from(PLANNING_TABLES.KPI).delete().eq('id', id)
  },
  
  // Users queries (if exists in planning schema)
  users: {
    getAll: () => planningClient.from(PLANNING_TABLES.USERS).select('*'),
    getById: (id: string) => planningClient.from(PLANNING_TABLES.USERS).select('*').eq('id', id).single(),
    getByEmail: (email: string) => planningClient.from(PLANNING_TABLES.USERS).select('*').eq('email', email).single(),
  }
}

// Export client for direct use
export { planningClient as supabase }
export default planningClient


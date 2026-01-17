/**
 * Supabase Configuration with Split KPI Tables
 * Updated to use separate tables for Planned and Actual KPIs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ NEW: Separate table names for split KPI system
export const TABLES_SPLIT_KPI = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ_ACTIVITIES: 'Planning Database - BOQ Rates',
  KPI_PLANNED: 'Planning Database - KPI Planned',    // ✅ NEW
  KPI_ACTUAL: 'Planning Database - KPI Actual',      // ✅ NEW
  KPI_COMBINED: 'Planning Database - KPI Combined',  // ✅ View for compatibility
  USERS: 'users'
} as const

// Keep old TABLES for backward compatibility
export const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ_ACTIVITIES: 'Planning Database - BOQ Rates',
  KPI_RECORDS: 'Planning Database - KPI',
  USERS: 'users'
} as const

// Export types
export interface Project {
  id: string
  project_code: string
  project_sub_code: string
  project_name: string
  project_type: string
  responsible_division: string
  plot_number: string
  kpi_completed: boolean
  project_status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  contract_amount: number
  created_at: string
  updated_at: string
  created_by: string
}

export interface BOQActivity {
  id: string
  project_id: string
  project_code: string
  project_sub_code: string
  project_full_code: string
  activity: string
  activity_division: string
  unit: string
  zone_ref: string
  zone_number: string
  activity_name: string
  total_units: number
  planned_units: number
  actual_units: number
  difference: number
  variance_units: number
  rate: number
  total_value: number
  planned_activity_start_date: string
  deadline: string
  calendar_duration: number
  activity_progress_percentage: number
  productivity_daily_rate: number
  total_drilling_meters: number
  drilled_meters_planned_progress: number
  drilled_meters_actual_progress: number
  remaining_meters: number
  activity_planned_status: string
  activity_actual_status: string
  reported_on_data_date: boolean
  planned_value: number
  earned_value: number
  delay_percentage: number
  planned_progress_percentage: number
  activity_planned_start_date: string
  activity_planned_completion_date: string
  activity_delayed: boolean
  activity_on_track: boolean
  activity_completed: boolean
  project_full_name: string
  project_status: string
  remaining_work_value: number
  variance_works_value: number
  lookahead_start_date: string
  lookahead_activity_completion_date: string
  remaining_lookahead_duration_for_activity_completion: number
  created_at: string
  updated_at: string
}

// ✅ NEW: Separate KPI types
export interface KPIPlanned {
  id: string
  project_full_code: string
  project_code: string
  project_sub_code: string
  activity_description: string // ✅ Merged from Activity Name and Activity
  activity_name?: string // ✅ Deprecated - kept for backward compatibility
  activity?: string // ✅ Deprecated - kept for backward compatibility
  quantity: number
  section: string
  drilled_meters: number
  unit: string
  target_date: string
  notes: string
  created_at: string
  updated_at: string
}

export interface KPIActual {
  id: string
  project_full_code: string
  project_code: string
  project_sub_code: string
  activity_description: string // ✅ Merged from Activity Name and Activity
  activity_name?: string // ✅ Deprecated - kept for backward compatibility
  activity?: string // ✅ Deprecated - kept for backward compatibility
  quantity: number
  section: string
  drilled_meters: number
  unit: string
  actual_date: string
  recorded_by: string
  notes: string
  created_at: string
  updated_at: string
}

// Combined KPI for analytics
export interface KPICombined {
  id: string
  project_full_code: string
  activity_name: string
  planned_quantity: number
  actual_quantity: number
  progress_percentage: number
  variance: number
  variance_percentage: number
  status: 'completed' | 'on_track' | 'at_risk' | 'delayed'
  planned_drilled_meters: number
  actual_drilled_meters: number
  section: string
}

export interface KPIRecord {
  id: string
  project_id: string
  activity_id: string
  kpi_name: string
  planned_value: number
  actual_value: number
  target_date: string
  completion_date?: string
  status: 'on_track' | 'delayed' | 'completed' | 'at_risk'
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'engineer' | 'viewer'
  division?: string
  created_at: string
  updated_at: string
}


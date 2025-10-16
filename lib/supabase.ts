import { getStableSupabaseClient } from './stableConnection'

// ✅ Use the STABLE connection manager - حل نهائي لمشكلة فقد الاتصال
export const supabase = getStableSupabaseClient()

// ✅ NEW: Table names with split KPI system
export const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ_ACTIVITIES: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI',                      // ✅ MAIN TABLE - Single source of truth!
  USERS: 'users',
  COMPANY_SETTINGS: 'company_settings',                // ✅ NEW: Company settings table
  HOLIDAYS: 'holidays'                                  // ✅ NEW: Holidays table
} as const

// Backward compatibility alias
export const PLANNING_TABLES = TABLES

// Database Types
export interface Project {
  id: string
  project_code: string
  project_sub_code: string
  project_name: string
  project_type: string
  responsible_division: string
  plot_number: string
  kpi_completed: boolean
  project_status: 'upcoming' | 'site-preparation' | 'on-going' | 'completed' | 'completed-duration' | 'contract-duration' | 'on-hold' | 'cancelled'
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
  activity_timing?: 'pre-commencement' | 'post-commencement'
  remaining_lookahead_duration_for_activity_completion: number
  created_at: string
  updated_at: string
}

export interface KPIRecord {
  id: string
  project_id?: string
  activity_id?: string
  project_full_code: string
  project_code?: string
  project_sub_code?: string
  activity_name: string
  activity?: string
  kpi_name?: string
  quantity: number
  input_type: 'Planned' | 'Actual'
  section?: string
  drilled_meters?: number
  unit?: string
  
  // 💰 Financial Fields
  value?: number                    // Financial value of activity
  
  // 📅 Date Fields
  activity_date?: string            // Unified activity date (Target or Actual)
  target_date?: string              // Planned date (for Planned only)
  actual_date?: string              // Actual date (for Actual only)
  day?: string                      // Reference day
  
  // 📍 Location Fields
  zone?: string                     // Zone/Area
  recorded_by?: string              // Who recorded the data (for Actual only)
  
  // Calculated Fields
  planned_value?: number
  actual_value?: number
  progress_percentage?: number
  variance?: number
  variance_percentage?: number
  status?: 'on_track' | 'delayed' | 'completed' | 'at_risk'
  
  // Metadata
  completion_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface User {
  id: string
  email: string
  first_name?: string // Optional - may not exist in database
  last_name?: string // Optional - may not exist in database
  full_name: string
  role: 'admin' | 'manager' | 'engineer' | 'viewer'
  division?: string
  permissions?: string[] // TEXT[] array of permission IDs
  custom_permissions_enabled?: boolean
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Holiday {
  id: string
  date: string
  name: string
  description?: string | null
  is_recurring: boolean
  is_active: boolean
  created_by: string
  created_at?: string
  updated_at?: string
}

import { getStableSupabaseClient } from './stableConnection'
import { fastQueryExecutor } from './fastConnectionManager'

// ✅ Use the STABLE connection manager - حل نهائي لمشكلة فقد الاتصال
export const supabase = getStableSupabaseClient()

// ✅ Fast connection for performance-critical operations
export const fastSupabase = fastQueryExecutor

// ✅ NEW: Table names with split KPI system
export const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ_ACTIVITIES: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI',                      // ✅ MAIN TABLE - Single source of truth!
  USERS: 'users',
  COMPANY_SETTINGS: 'company_settings',                // ✅ NEW: Company settings table
  HOLIDAYS: 'holidays',                                 // ✅ NEW: Holidays table
  MANPOWER: 'CCD - MANPOWER'                           // ✅ NEW: MANPOWER table for Cost Control
} as const

// Backward compatibility alias
export const PLANNING_TABLES = TABLES

// Database Types
export interface Project {
  id: string
  project_code: string
  project_sub_code: string
  project_full_code?: string // ✅ Auto-built from project_code and project_sub_code
  project_name: string
  project_description?: string
  project_type: string
  responsible_division: string
  plot_number: string
  kpi_completed: boolean
  kpi_added?: string // ✅ Auto-calculated: 'Yes' if has KPI Planned, 'No' otherwise
  project_status: 'upcoming' | 'site-preparation' | 'on-going' | 'completed-duration' | 'contract-completed' | 'on-hold' | 'cancelled'
  contract_amount: number
  // Additional project details
  client_name?: string
  consultant_name?: string
  first_party_name?: string
  project_manager_email?: string
  area_manager_email?: string
  division_head_email?: string
  date_project_awarded?: string
  work_programme?: string
  latitude?: string
  longitude?: string
  contract_status?: string
  currency?: string
  workmanship_only?: string
  advance_payment_required?: string
  advance_payment_percentage?: number // Percentage of advance payment
  virtual_material_value?: string
  project_start_date?: string
  project_completion_date?: string
  project_duration?: number // Calculated in days
  retention_after_completion?: number // Percentage
  retention_after_6_month?: number // Percentage
  retention_after_12_month?: number // Percentage
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
  activity_timing?: 'pre-commencement' | 'post-commencement' | 'post-completion'
  has_value?: boolean
  affects_timeline?: boolean
  use_virtual_material?: boolean // ✅ If true, auto-generate KPIs and use Virtual Material in calculations
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
  
  // ✅ Activity Timing (inherited from BOQ Activity)
  activity_timing?: 'pre-commencement' | 'post-commencement' | 'post-completion'
  
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

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
  MANPOWER: 'CCD - MANPOWER',                          // ✅ NEW: MANPOWER table for Cost Control
  // ✅ Attendance System Tables
  ATTENDANCE_EMPLOYEES: 'attendance_employees',        // ✅ Employees for attendance
  ATTENDANCE_RECORDS: 'attendance_records',            // ✅ Attendance records
  ATTENDANCE_LOCATIONS: 'attendance_locations',        // ✅ Locations for GPS tracking
  ATTENDANCE_SETTINGS: 'attendance_settings',          // ✅ Attendance system settings
  ATTENDANCE_DAILY_STATUSES: 'attendance_daily_statuses', // ✅ Daily attendance review statuses
  ABSENT_COSTS: 'absent_costs',                        // ✅ Absent costs tracking table
  HR_MANPOWER: 'hr_manpower',                          // ✅ HR Manpower table
  DEPARTMENTS: 'departments',                          // ✅ Departments master data
  JOB_TITLES: 'job_titles',                            // ✅ Job titles master data
  DESIGNATION_RATES: 'designation_rates',              // ✅ Designation hourly rates table (includes daily rate fields)
  DESIGNATION_DAILY_RATE_HISTORY: 'designation_daily_rate_history', // ✅ Daily rate history with time periods
  MACHINE_LIST: 'machine_list',                        // ✅ Machine list table
  MACHINERY_DAY_RATES: 'machinery_day_rates',          // ✅ Machinery day rates table
  MACHINE_DAILY_RATE_HISTORY: 'machine_daily_rate_history', // ✅ Machine daily rate history with time periods
  KPI_REJECTED: 'kpi_rejected',                        // ✅ Rejected KPIs table (temporary storage)
  KPI_IGNORED_REPORTING: 'kpi_ignored_reporting_dates', // ✅ Ignored KPI reporting dates (shared across users)
  COMMERCIAL_BOQ_ITEMS: 'BOQ items',                   // ✅ Commercial BOQ items table
  CONTRACT_VARIATIONS: 'Contract Variations'          // ✅ Contract Variations table
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

// ✅ Attendance System Interfaces
export interface AttendanceEmployee {
  id: string
  employee_code: string
  name: string
  job_title?: string
  department?: string
  phone_number?: string
  email?: string
  profile_pic_url?: string
  status: 'Active' | 'Inactive'
  user_id?: string // Link to auth.users if employee has login
  qr_code?: string // Unique QR code for employee (format: EMP-XXXXXXXX)
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  check_time: string // Time only (HH:mm)
  date: string // Date (YYYY-MM-DD)
  type: 'Check-In' | 'Check-Out'
  location_id?: string
  latitude?: number
  longitude?: number
  notes?: string
  work_duration_hours?: number
  is_late: boolean
  is_early: boolean
  created_at: string
  created_by?: string // User ID who created the record
  updated_by?: string // User ID who last updated the record
  updated_at?: string // Last update timestamp
  employee?: AttendanceEmployee
  location?: AttendanceLocation
  created_by_user?: User // User who created the record
  updated_by_user?: User // User who last updated the record
}

export interface AttendanceDailyStatus {
  id: string
  employee_id: string
  date: string
  status: 'attended' | 'vacation' | 'cancelled' | 'excused_absent' | 'absent'
  notes?: string | null
  recorded_by?: string | null
  created_at: string
  updated_at?: string
  employee?: AttendanceEmployee
  recorded_by_user?: User
}

export interface AbsentCost {
  id: string
  employee_id: string
  attendance_status_id: string
  date: string
  status: 'absent' | 'excused_absent'
  designation_id?: string | null
  designation?: string | null
  overhead_hourly_rate: number
  hours: number
  cost: number
  notes?: string | null
  created_at: string
  updated_at?: string
  created_by?: string | null
  employee?: AttendanceEmployee
  designation_rate?: DesignationRate
}

export interface AttendanceLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  description?: string
  is_active: boolean
  is_favorite?: boolean // ✅ Mark location as favorite/highlighted
  created_at: string
}

export interface DesignationRate {
  id: string
  designation: string
  hourly_rate: number
  overtime_hourly_rate?: number | null
  off_day_hourly_rate?: number | null
  overhead_hourly_rate?: number | null // Overhead hourly rate (default: 5.3)
  total_hourly_rate?: number | null // Auto-calculated: hourly_rate + overhead_hourly_rate
  daily_rate?: number | null // Auto-calculated: total_hourly_rate * 8
  authority?: string | null // General Authority or specific authority
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface DesignationDailyRateHistory {
  id: string
  designation_id: string
  name: string // Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
  hourly_rate: number // Hourly rate for this period
  daily_rate: number // Auto-calculated: hourly_rate * 8
  start_date: string // Start date of this rate period
  end_date?: string | null // End date of this rate period (NULL means it's the current active rate)
  is_active: boolean // Whether this is the currently active rate
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}


export interface AttendanceSettings {
  id: string
  key: string
  value: string
  description?: string
  created_at: string
  updated_at: string
}

export interface AttendanceStats {
  total_employees: number
  present_today: number
  absent_today: number
  late_today: number
  on_time_today: number
  attendance_rate: number
  average_hours: number
}

// ✅ HR Manpower Interface
export interface HRManpower {
  id: string
  employee_code: string
  employee_name: string
  designation: string
  status: 'Active' | 'Inactive' | 'On Leave'
  department?: string
  phone_number?: string
  email?: string
  hire_date?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface Machine {
  id: string
  code: string
  name: string
  rate: number
  machine_full_name?: string | null
  rental?: string | null // "R" for rented, or rental cost as text
  category?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface MachineryDayRate {
  id: string
  code: string
  description?: string | null
  rate: number
  efficiency?: number | null // Percentage (default 100)
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
  machine?: Machine // Joined machine data
}

export interface MachineDailyRateHistory {
  id: string
  machine_id: string
  name: string // Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
  daily_rate: number // Daily rate for this period
  start_date: string // Start date of this rate period
  end_date?: string | null // End date of this rate period (NULL means it's the current active rate)
  is_active: boolean // Whether this is the currently active rate
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
  machine?: Machine // Joined machine data
}

// ✅ Commercial BOQ Items Interface
export interface CommercialBOQItem {
  id: string
  auto_generated_unique_reference_number: string // Auto-generated unique reference number
  project_full_code: string
  project_name: string
  item_description: string
  unit?: string
  quantity: number
  rate: number // Currency
  total_value: number // Currency (calculated: quantity * rate)
  remeasurable: boolean
  planning_assigned_amount: number // Currency
  units_variation: number // Units variation
  variations_amount: number // Currency (renamed from variations)
  total_units: number // Calculated: quantity + units_variation
  total_including_variations: number // Currency (calculated: total_value + variations_amount)
  created_at: string
  updated_at: string
}

// ✅ Contract Variations Interface
export type VariationStatus = 
  | 'Pending'
  | 'Var Notice Sent'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Internal Variation'

export interface ContractVariation {
  id: string
  auto_generated_unique_reference_number: string // Auto-generated unique reference number (VAR-YYYY-XXX)
  project_full_code: string // References Project Sub-Code from Planning Database - ProjectsList
  project_name: string // Auto-populated from ProjectsList
  variation_ref_no?: string // Variation reference number
  item_description: string // Single BOQ item UUID
  quantity_changes: number // Quantity changes (2 decimal places)
  variation_amount: number // Variation amount in currency (2 decimal places)
  date_of_submission?: string // Date of submission (nullable)
  variation_status: VariationStatus // Variation status enum
  date_of_approval?: string // Date of approval (nullable)
  remarks?: string // Remarks
  created_at: string
  updated_at: string
  created_by?: string // User ID who created the variation
  updated_by?: string // User ID who last updated the variation
}

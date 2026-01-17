/**
 * Planning Schema Adapter
 * 
 * This adapter maps between the application's expected data structure
 * and the actual structure in the planning schema tables
 */

import { Project, BOQActivity, KPIRecord } from './supabase'

// Column mappings for Planning Database - ProjectsList
export const PROJECT_COLUMN_MAP = {
  // Application field -> Database column
  id: 'id',
  project_code: 'Project Code',
  project_sub_code: 'Project Sub-Code',
  project_name: 'Project Name',
  project_type: 'Project Type',
  responsible_division: 'Responsible Division',
  plot_number: 'Plot Number',
  kpi_completed: 'KPI Completed',
  project_status: 'Project Status',
  contract_amount: 'Contract Amount',
  created_at: 'created_at',
  updated_at: 'updated_at'
}

// Column mappings for Planning Database - BOQ Rates
export const BOQ_COLUMN_MAP = {
  id: 'id',
  project_code: 'Project Code',
  project_sub_code: 'Project Sub Code',
  project_full_code: 'Project Full Code',
  activity_description: 'Activity Description', // ✅ Merged from Activity and Activity Name
  activity_division: 'Activity Division',
  unit: 'Unit',
  zone_ref: 'Zone Ref',
  zone_number: 'Zone #',
  total_units: 'Total Units',
  planned_units: 'Planned Units',
  actual_units: 'Actual Units',
  difference: 'Diffrence', // Note: typo in original
  variance_units: 'Variance Units',
  rate: 'Rate',
  total_value: 'Total Value',
  planned_activity_start_date: 'Planned Activity Start Date',
  deadline: 'Deadline',
  calendar_duration: 'Calendar Duration',
  activity_progress_percentage: 'Activity Progress %',
  activity_completed: 'Activity Completed',
  activity_delayed: 'Activity Delayed?',
  activity_on_track: 'Activity On Track?',
  planned_value: 'Planned Value',
  earned_value: 'Earned Value',
  delay_percentage: 'Delay %',
  planned_progress_percentage: 'Planned Progress %',
  project_full_name: 'Project Full Name',
  project_status: 'Project Status',
  remaining_work_value: 'Remaining Work Value',
  variance_works_value: 'Variance Works Value'
}

// Column mappings for Planning Database - KPI
export const KPI_COLUMN_MAP = {
  id: 'id',
  project_code: 'Project Code',
  activity: 'Activity',
  kpi_name: 'KPI Name',
  planned_value: 'Planned Value',
  actual_value: 'Actual Value',
  target_date: 'Target Date',
  completion_date: 'Completion Date',
  status: 'Status',
  notes: 'Notes',
  created_at: 'created_at',
  updated_at: 'updated_at'
}

/**
 * Convert database row to application Project format
 */
export function mapDBToProject(dbRow: any): Project {
  if (!dbRow) return dbRow
  
  return {
    id: dbRow['id'] || dbRow['ID'],
    project_code: dbRow['Project Code'] || dbRow['project_code'] || '',
    project_sub_code: dbRow['Project Sub-Code'] || dbRow['project_sub_code'] || '',
    project_name: dbRow['Project Name'] || dbRow['project_name'] || '',
    project_type: dbRow['Project Type'] || dbRow['project_type'] || '',
    responsible_division: dbRow['Responsible Division'] || dbRow['responsible_division'] || '',
    plot_number: dbRow['Plot Number'] || dbRow['plot_number'] || '',
    kpi_completed: dbRow['KPI Completed'] || dbRow['kpi_completed'] || false,
    project_status: (dbRow['Project Status'] || dbRow['project_status'] || 'active').toLowerCase() as any,
    contract_amount: parseFloat(dbRow['Contract Amount'] || dbRow['contract_amount'] || 0),
    created_at: dbRow['created_at'] || new Date().toISOString(),
    updated_at: dbRow['updated_at'] || new Date().toISOString(),
    created_by: dbRow['created_by'] || ''
  }
}

/**
 * Convert application Project to database format
 */
export function mapProjectToDB(project: Partial<Project>): any {
  return {
    'Project Code': project.project_code,
    'Project Sub-Code': project.project_sub_code,
    'Project Name': project.project_name,
    'Project Type': project.project_type,
    'Responsible Division': project.responsible_division,
    'Plot Number': project.plot_number,
    'KPI Completed': project.kpi_completed,
    'Project Status': project.project_status,
    'Contract Amount': project.contract_amount
  }
}

/**
 * Convert database row to application BOQActivity format
 */
export function mapDBToBOQActivity(dbRow: any): BOQActivity {
  if (!dbRow) return dbRow
  
  // Extract activity description (merged from Activity and Activity Name)
  // Priority: Activity Description > Activity > Activity Name (for backward compatibility)
  const activityDescription = dbRow['Activity Description'] || 
                              dbRow['Activity'] || 
                              dbRow['Activity Name'] || 
                              dbRow['activity_description'] || 
                              dbRow['activity'] || 
                              dbRow['activity_name'] || 
                              ''
  
  return {
    id: dbRow['id'] || dbRow['ID'],
    project_id: dbRow['project_id'] || '',
    project_code: dbRow['Project Code'] || dbRow['project_code'] || '',
    project_sub_code: dbRow['Project Sub Code'] || dbRow['project_sub_code'] || '',
    project_full_code: dbRow['Project Full Code'] || dbRow['project_full_code'] || '',
    activity_description: activityDescription, // ✅ Merged column
    activity_division: dbRow['Activity Division'] || dbRow['activity_division'] || '',
    unit: dbRow['Unit'] || dbRow['unit'] || '',
    zone_number: dbRow['Zone #'] || dbRow['Zone Number'] || dbRow['zone_number'] || '0',
    total_units: parseFloat(dbRow['Total Units'] || dbRow['total_units'] || 0),
    planned_units: parseFloat(dbRow['Planned Units'] || dbRow['planned_units'] || 0),
    actual_units: parseFloat(dbRow['Actual Units'] || dbRow['actual_units'] || 0),
    difference: parseFloat(dbRow['Diffrence'] || dbRow['difference'] || 0),
    variance_units: parseFloat(dbRow['Variance Units'] || dbRow['variance_units'] || 0),
    rate: parseFloat(dbRow['Rate'] || dbRow['rate'] || 0),
    total_value: parseFloat(dbRow['Total Value'] || dbRow['total_value'] || 0),
    planned_activity_start_date: dbRow['Planned Activity Start Date'] || dbRow['planned_activity_start_date'] || '',
    deadline: dbRow['Deadline'] || dbRow['deadline'] || '',
    calendar_duration: parseInt(dbRow['Calendar Duration'] || dbRow['calendar_duration'] || 0),
    activity_progress_percentage: parseFloat(dbRow['Activity Progress %'] || dbRow['activity_progress_percentage'] || 0),
    activity_completed: dbRow['Activity Completed'] || dbRow['activity_completed'] || false,
    activity_delayed: dbRow['Activity Delayed?'] || dbRow['activity_delayed'] || false,
    activity_on_track: dbRow['Activity On Track?'] || dbRow['activity_on_track'] || true,
    planned_value: parseFloat(dbRow['Planned Value'] || dbRow['planned_value'] || 0),
    earned_value: parseFloat(dbRow['Earned Value'] || dbRow['earned_value'] || 0),
    delay_percentage: parseFloat(dbRow['Delay %'] || dbRow['delay_percentage'] || 0),
    planned_progress_percentage: parseFloat(dbRow['Planned Progress %'] || dbRow['planned_progress_percentage'] || 0),
    project_full_name: dbRow['Project Full Name'] || dbRow['project_full_name'] || '',
    project_status: dbRow['Project Status'] || dbRow['project_status'] || '',
    remaining_work_value: parseFloat(dbRow['Remaining Work Value'] || dbRow['remaining_work_value'] || 0),
    variance_works_value: parseFloat(dbRow['Variance Works Value'] || dbRow['variance_works_value'] || 0),
    // Additional fields with defaults
    productivity_daily_rate: 0,
    total_drilling_meters: 0,
    drilled_meters_planned_progress: 0,
    drilled_meters_actual_progress: 0,
    remaining_meters: 0,
    activity_planned_status: '',
    activity_actual_status: '',
    reported_on_data_date: false,
    activity_planned_start_date: '',
    activity_planned_completion_date: '',
    lookahead_start_date: '',
    lookahead_activity_completion_date: '',
    remaining_lookahead_duration_for_activity_completion: 0,
    created_at: dbRow['created_at'] || new Date().toISOString(),
    updated_at: dbRow['updated_at'] || new Date().toISOString()
  }
}

/**
 * Convert application BOQActivity to database format
 */
export function mapBOQActivityToDB(activity: Partial<BOQActivity>): any {
  return {
    'Project Code': activity.project_code,
    'Project Sub Code': activity.project_sub_code,
    'Project Full Code': activity.project_full_code,
    'Activity Description': activity.activity_description || '', // ✅ Merged column
    'Activity Division': activity.activity_division,
    'Unit': activity.unit,
    'Zone #': activity.zone_number || '0',
    'Total Units': activity.total_units,
    'Planned Units': activity.planned_units,
    'Actual Units': activity.actual_units,
    'Diffrence': activity.difference,
    'Variance Units': activity.variance_units,
    'Rate': activity.rate,
    'Total Value': activity.total_value,
    'Planned Activity Start Date': activity.planned_activity_start_date,
    'Deadline': activity.deadline,
    'Calendar Duration': activity.calendar_duration,
    'Activity Progress %': activity.activity_progress_percentage,
    'Activity Completed': activity.activity_completed,
    'Activity Delayed?': activity.activity_delayed,
    'Activity On Track?': activity.activity_on_track,
    'Planned Value': activity.planned_value,
    'Earned Value': activity.earned_value,
    'Delay %': activity.delay_percentage,
    'Planned Progress %': activity.planned_progress_percentage,
    'Project Full Name': activity.project_full_name,
    'Project Status': activity.project_status,
    'Remaining Work Value': activity.remaining_work_value,
    'Variance Works Value': activity.variance_works_value
  }
}

/**
 * Convert array of DB rows to application format
 */
export function mapDBToProjects(dbRows: any[]): Project[] {
  return dbRows?.map(mapDBToProject) || []
}

export function mapDBToBOQActivities(dbRows: any[]): BOQActivity[] {
  return dbRows?.map(mapDBToBOQActivity) || []
}


/**
 * Data Mappers for Database Columns
 * Maps between database column names (with spaces) and application field names (snake_case)
 */

import { Project, BOQActivity, KPIRecord } from './supabase'

/**
 * Map database project row to application format
 */
export function mapProjectFromDB(row: any): Project {
  if (!row) return row
  
  return {
    id: row.id,
    project_code: row['Project Code'] || '',
    project_sub_code: row['Project Sub-Code'] || '',
    project_name: row['Project Name'] || '',
    project_type: row['Project Type'] || '',
    responsible_division: row['Responsible Division'] || '',
    plot_number: row['Plot Number'] || '',
    kpi_completed: row['KPI Completed'] === 'TRUE' || row['KPI Completed'] === true,
    project_status: (row['Project Status'] || 'active').toLowerCase() as any,
    contract_amount: parseFloat((row['Contract Amount'] || '0').replace(/,/g, '')),
    // Additional project details
    client_name: row['Client Name'] || '',
    consultant_name: row['Consultant Name'] || '',
    first_party_name: row['First Party name'] || '',
    project_manager_email: row['Project Manager Email'] || '',
    area_manager_email: row['Area Manager Email'] || '',
    date_project_awarded: row['Date Project Awarded'] || '',
    work_programme: row['Work Programme'] || '',
    latitude: row['Latitude'] || '',
    longitude: row['Longitude'] || '',
    contract_status: row['Contract Status'] || '',
    currency: row['Currency'] || 'AED',
    workmanship_only: row['Workmanship only?'] || '',
    advance_payment_required: row['Advnace Payment Required'] || '',
    virtual_material_value: row['Virtual Material Value'] || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    created_by: row.created_by || ''
  }
}

/**
 * Map application project to database format
 */
export function mapProjectToDB(project: Partial<Project>): any {
  return {
    'Project Code': project.project_code,
    'Project Sub-Code': project.project_sub_code,
    'Project Name': project.project_name,
    'Project Type': project.project_type,
    'Responsible Division': project.responsible_division,
    'Plot Number': project.plot_number,
    'KPI Completed': project.kpi_completed ? 'TRUE' : 'FALSE',
    'Project Status': project.project_status,
    'Contract Amount': project.contract_amount?.toString()
  }
}

/**
 * Map database BOQ row to application format
 */
export function mapBOQFromDB(row: any): any {
  if (!row) return row
  
  // Helper to parse numbers from strings with commas
  const parseNum = (val: any) => {
    if (val === null || val === undefined || val === '') return 0
    if (typeof val === 'number') return val
    const str = String(val).trim()
    if (!str) return 0
    const match = str.match(/-?[0-9]+[0-9,\.\s]*/)
    if (!match) return 0
    const numeric = match[0]
      .replace(/[^0-9,\.\-]/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '')
    const parsed = parseFloat(numeric)
    return Number.isFinite(parsed) ? parsed : 0
  }
  
  // Extract activity name from Activity field or Zone Ref
  // Handle both old and new database formats
  const activityName = row['Activity Name'] || row['Activity'] || 
                       (row['Zone Ref'] ? row['Zone Ref'].split('‣')[1]?.trim() : '') || 
                       row['activity_name'] || row['activity'] || ''
  
  // Normalize project codes - handle both old and new formats
  const projectCode = (row['Project Code'] || row['project_code'] || '').toString().trim()
  const projectSubCode = (row['Project Sub Code'] || row['project_sub_code'] || '').toString().trim()
  const projectFullCode = (row['Project Full Code'] || row['project_full_code'] || projectCode || '').toString().trim()
  
  return {
    id: row.id,
    project_code: projectCode,
    project_sub_code: projectSubCode,
    project_full_code: projectFullCode || projectCode,
    activity: row['Activity'] || '',
    activity_division: row['Activity Division'] || '',
    unit: row['Unit'] || '',
    zone_ref: row['Zone Ref'] || '',
    zone_number: row['Zone Number'] || row['Zone #'] || '',
    activity_name: activityName,
    total_units: parseNum(row['Total Units']),
    // ✅ Use new column names only
    planned_units: parseNum(row['Planned Units']),
    actual_units: parseNum(row['Actual Units']),
    difference: parseNum(row['Difference']),
    variance_units: parseNum(row['Variance Units']),
    rate: parseNum(row['Rate']),
    total_value: parseNum(row['Total Value']),
    planned_activity_start_date: row['Planned Activity Start Date'] || '',
    deadline: row['Deadline'] || row['Planned Activity Start Date'] || '',
    calendar_duration: parseNum(row['Calendar Duration']),
    activity_progress_percentage: parseNum(row['Activity Progress %']),
    activity_completed: row['Activity Completed'] === 'TRUE' || row['Activity Completed'] === true || false,
    activity_delayed: row['Activity Delayed?'] === 'TRUE' || row['Activity Delayed?'] === true || false,
    activity_on_track: row['Activity On Track?'] === 'TRUE' || row['Activity On Track?'] === true || true,
    planned_value: parseNum(row['Planned Value']),
    earned_value: parseNum(row['Earned Value']),
    delay_percentage: parseNum(row['Delay %']),
    planned_progress_percentage: parseNum(row['Planned Progress %']),
    project_full_name: row['Project Full Name'] || '',
    project_status: row['Project Status'] || 'active',
    remaining_work_value: parseNum(row['Remaining Work Value']),
    variance_works_value: parseNum(row['Variance Works Value']),
    total_drilling_meters: parseNum(row['Total Drilling Meters']),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  }
}

/**
 * Map application BOQ to database format
 */
export function mapBOQToDB(boq: any): any {
  return {
    'Project Code': boq.project_code,
    'Project Sub Code': boq.project_sub_code,
    'Project Full Code': boq.project_full_code,
    'Activity': boq.activity,
    'Activity Division': boq.activity_division,
    'Unit': boq.unit,
    'Zone Ref': boq.zone_ref,
    'Zone Number': boq.zone_number,
    'Activity Name': boq.activity_name,
    // ✅ Removed Column 44 and Column 45 - use new column names only
    'Total Units': boq.total_units?.toString(),
    'Planned Units': boq.planned_units?.toString(),
    'Actual Units': boq.actual_units?.toString(),
    'Difference': boq.difference?.toString(),
    'Variance Units': boq.variance_units?.toString(),
    'Rate': boq.rate?.toString(),
    'Total Value': boq.total_value?.toString(),
    'Planned Activity Start Date': boq.planned_activity_start_date,
    'Deadline': boq.deadline,
    'Calendar Duration': boq.calendar_duration?.toString(),
    'Activity Progress %': boq.activity_progress_percentage?.toString(),
    'Activity Completed?': boq.activity_completed ? 'TRUE' : 'FALSE',
    'Activity Delayed?': boq.activity_delayed ? 'TRUE' : 'FALSE',
    'Activity On Track?': boq.activity_on_track ? 'TRUE' : 'FALSE',
    'Planned Value': boq.planned_value?.toString(),
    'Earned Value': boq.earned_value?.toString(),
    'Delay %': boq.delay_percentage?.toString(),
    'Planned Progress %': boq.planned_progress_percentage?.toString(),
    'Project Full Name': boq.project_full_name,
    'Project Status': boq.project_status,
    'Remaining Work Value': boq.remaining_work_value?.toString(),
    'Variance Works Value': boq.variance_works_value?.toString(),
    'Total Drilling Meters': boq.total_drilling_meters?.toString()
  }
}

/**
 * Calculate KPI status based on planned vs actual quantities
 */
function calculateKPIStatus(plannedValue: number, actualValue: number): {
  status: 'completed' | 'on_track' | 'at_risk' | 'delayed'
  progress: number
  variance: number
  variancePercentage: number
} {
  if (plannedValue === 0) {
    return {
      status: 'on_track',
      progress: 0,
      variance: 0,
      variancePercentage: 0
    }
  }
  
  const progress = (actualValue / plannedValue) * 100
  const variance = actualValue - plannedValue
  const variancePercentage = (variance / plannedValue) * 100
  
  let status: 'completed' | 'on_track' | 'at_risk' | 'delayed'
  
  if (progress >= 100) {
    status = 'completed'
  } else if (progress >= 80) {
    status = 'on_track'
  } else if (progress >= 50) {
    status = 'at_risk'
  } else {
    status = 'delayed'
  }
  
  return {
    status,
    progress,
    variance,
    variancePercentage
  }
}

/**
 * Map database KPI row to application format
 * Now includes: Value, Target Date, Actual Date, Day, Zone, and all other fields
 */
export function mapKPIFromDB(row: any): any {
  if (!row) return row
  
  const parseNum = (val: any) => {
    if (val === null || val === undefined || val === '') return 0
    if (typeof val === 'number') return val
    const str = String(val).trim()
    if (!str) return 0
    const match = str.match(/-?[0-9]+[0-9,\.\s]*/)
    if (!match) return 0
    const numeric = match[0]
      .replace(/[^0-9,\.\-]/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '')
    const parsed = parseFloat(numeric)
    return Number.isFinite(parsed) ? parsed : 0
  }
  
  const quantity = parseNum(row['Quantity'])
  const inputType = row['Input Type'] || ''
  let value = parseNum(row['Value']) // 💰 Financial value
  
  // ✅ If Value is missing or zero, calculate it from Quantity × Rate (from activity)
  // This fixes the issue where newly created KPIs don't have Value field
  if (!value || value === 0) {
    // Try to get rate from related activity if available
    // Note: This is a fallback - ideally Value should be saved when creating KPI
    const activityRate = parseNum(row['Rate']) || 0
    if (activityRate > 0 && quantity > 0) {
      value = quantity * activityRate
      console.log(`💰 Calculated Value for KPI: ${quantity} × ${activityRate} = ${value}`)
    } else {
      // Use quantity as fallback (1:1 ratio)
      value = quantity
    }
  }
  
  // For backward compatibility
  const plannedValue = inputType === 'Planned' ? value : 0
  const actualValue = inputType === 'Actual' ? value : 0
  
  // Calculate smart status based on value, not just quantity
  const statusCalc = calculateKPIStatus(plannedValue, actualValue)
  
  return {
    id: row.id,
    project_id: row.project_id || '',
    activity_id: row.activity_id || '',
    project_full_code: row['Project Full Code'] || '',
    project_code: row['Project Code'] || '',
    project_sub_code: row['Project Sub Code'] || '',
    activity_name: row['Activity Name'] || '',
    activity: row['Activity'] || row['Activity Name'] || '',
    kpi_name: row['Activity Name'] || '', // Using activity name as KPI name
    quantity: quantity,
    input_type: inputType,
    section: row['Section'] || '',
    drilled_meters: parseNum(row['Drilled Meters']),
    unit: row['Unit'] || '',
    
    // 💰 Financial
    value: value,
    
    // 📅 Dates
    activity_date: row['Activity Date'] || row['Target Date'] || row['Actual Date'] || '',
    target_date: row['Target Date'] || '',
    actual_date: row['Actual Date'] || '',
    day: row['Day'] || '',
    
    // 📍 Location
    zone: row['Zone'] || row['Section'] || '',
    recorded_by: row['Recorded By'] || '',
    
    // Planned and Actual values (for backward compatibility)
    planned_value: plannedValue,
    actual_value: actualValue,
    
    // Smart calculations
    progress_percentage: statusCalc.progress,
    variance: statusCalc.variance,
    variance_percentage: statusCalc.variancePercentage,
    status: row.status || statusCalc.status, // Use calculated status if not provided
    
    // Metadata
    completion_date: statusCalc.status === 'completed' ? (row.completion_date || new Date().toISOString()) : row.completion_date || '',
    notes: row['Notes'] || row.notes || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    created_by: row.created_by || ''
  }
}

/**
 * Map application KPI to database format
 * Note: Don't include 'Input Type' - it's determined by the table (Planned or Actual)
 */
export function mapKPIToDB(kpi: any): any {
  return {
    'Project Full Code': kpi.project_full_code,
    'Project Code': kpi.project_code,
    'Project Sub Code': kpi.project_sub_code,
    'Activity Name': kpi.activity_name,
    'Activity': kpi.activity || kpi.activity_name,
    'Quantity': kpi.quantity?.toString(),
    'Section': kpi.section || kpi.zone,
    'Drilled Meters': kpi.drilled_meters?.toString(),
    'Unit': kpi.unit,
    'Value': kpi.value,
    'Day': kpi.day,
    'Zone': kpi.zone || kpi.section,
    'Target Date': kpi.target_date, // For Planned
    'Actual Date': kpi.actual_date, // For Actual
    'Recorded By': kpi.recorded_by,
    'Notes': kpi.notes,
    project_id: kpi.project_id,
    activity_id: kpi.activity_id,
    completion_date: kpi.completion_date,
    status: kpi.status,
    created_by: kpi.created_by
  }
}

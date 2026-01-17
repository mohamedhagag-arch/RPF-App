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
  
  // ✅ FIX: Get project_type from multiple sources (for uploaded data compatibility)
  // Support both database column names (with spaces) and application field names (snake_case)
  // This ensures compatibility with both manually created projects and uploaded data
  const projectType = row['Project Type'] || 
                     row['project_type'] || 
                     row.project_type || 
                     (row as any)?.raw?.['Project Type'] ||
                     ''
  
  // ✅ FIX: Get responsible_division from multiple sources
  const responsibleDivision = row['Responsible Division'] || 
                             row['responsible_division'] || 
                             row.responsible_division || 
                             (row as any)?.raw?.['Responsible Division'] ||
                             ''
  
  // ✅ DEBUG: Log for first few projects to diagnose uploaded data issues
  if (Math.random() < 0.05) { // Log 5% of projects randomly
    console.log('🔍 mapProjectFromDB - Project Type sources:', {
      projectCode: row['Project Code'] || row['project_code'] || row.project_code,
      'Project Type (DB)': row['Project Type'],
      'project_type (snake_case)': row['project_type'],
      project_type_direct: row.project_type,
      rawProjectType: (row as any)?.raw?.['Project Type'],
      finalProjectType: projectType,
      hasProjectType: !!projectType && projectType.trim() !== ''
    })
  }
  
  // ✅ PRIORITY: Always use Project Full Code from database if it exists
  // Only build it if it's NOT in the database
  const projectCode = (row['Project Code'] || row['project_code'] || row.project_code || '').toString().trim()
  const projectSubCode = (row['Project Sub-Code'] || row['Project Sub Code'] || row['project_sub_code'] || row.project_sub_code || '').toString().trim()
  
  // ✅ CRITICAL: Check ALL possible column names for Project Full Code
  const projectFullCodeFromDB = (
    row['Project Full Code'] || 
    row['project_full_code'] || 
    row.project_full_code ||
    (row as any)?.['Project Full Code'] ||
    ''
  ).toString().trim()
  
  // ✅ DEBUG: Always log Project Full Code for first few projects to diagnose issues
  // This helps identify if Project Full Code is being read correctly from database
  if (process.env.NODE_ENV === 'development') {
    const projectId = row.id || row['Project Code'] || 'unknown'
    // Log for projects that match common patterns (like P9999)
    if (projectCode.includes('P9999') || projectCode.includes('P5066') || Math.random() < 0.05) {
      console.log('🔍 mapProjectFromDB - Project Full Code check:', {
        projectId,
        projectCode,
        projectSubCode,
        'Project Full Code (DB column)': row['Project Full Code'],
        'project_full_code (snake_case)': row['project_full_code'],
        project_full_code_direct: row.project_full_code,
        finalProjectFullCodeFromDB: projectFullCodeFromDB || 'NOT FOUND',
        willUse: projectFullCodeFromDB || projectCode,
        allFullCodeKeys: Object.keys(row).filter(k => k.toLowerCase().includes('full')),
        warning: projectFullCodeFromDB ? '✅ Using Project Full Code from DB' : '⚠️ Project Full Code missing, will use Project Code only'
      })
    }
  }
  
  // ✅ CRITICAL: Use Project Full Code from database if it exists
  // If not available, build it from Project Code + Project Sub Code
  let projectFullCode = projectFullCodeFromDB
  
  // ✅ BUILD: If Project Full Code is missing, build it from Project Code + Project Sub Code
  if (!projectFullCode && projectCode) {
    if (projectSubCode) {
      // Check if sub_code already starts with project_code (case-insensitive)
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        // Sub_code already contains project_code (e.g., "P9999-R1" or "P9999R1")
        projectFullCode = projectSubCode.trim()
      } else {
        // Build full code: project_code + project_sub_code
        if (projectSubCode.startsWith('-')) {
          projectFullCode = `${projectCode}${projectSubCode}`.trim()
        } else {
          projectFullCode = `${projectCode}-${projectSubCode}`.trim()
        }
      }
    } else {
      // No sub_code: use project_code only
      projectFullCode = projectCode
    }
    
    // ✅ DEBUG: Only log when building project_full_code for specific projects (reduced noise)
    if (process.env.NODE_ENV === 'development' && (projectCode.includes('P9999') || projectCode.includes('P10001') || Math.random() < 0.01)) {
      console.log('🔧 mapProjectFromDB: Built project_full_code from project_code + project_sub_code:', {
        projectCode,
        projectSubCode,
        builtProjectFullCode: projectFullCode
      })
    }
  }
  
  return {
    id: row.id,
    project_code: projectCode,
    project_sub_code: projectSubCode,
    project_full_code: projectFullCode, // ✅ Always include project_full_code
    project_name: row['Project Name'] || row['project_name'] || row.project_name || '',
    project_description: row['Project Description'] || row['project_description'] || row.project_description || '',
    project_type: projectType,
    responsible_division: responsibleDivision,
    plot_number: row['Plot Number'] || row['plot_number'] || row.plot_number || '',
    kpi_completed: row['KPI Completed'] === 'TRUE' || row['KPI Completed'] === true,
    kpi_added: row['KPI Added'] || row['kpi_added'] || undefined, // ✅ Read KPI Added from database
    project_status: (row['Project Status'] || 'active').toLowerCase() as any,
    contract_amount: parseFloat((row['Contract Amount'] || '0').replace(/,/g, '')),
    // Additional project details
    client_name: row['Client Name'] || '',
    consultant_name: row['Consultant Name'] || '',
    first_party_name: row['First Party name'] || '',
    project_manager_email: row['Project Manager Email'] || '',
    area_manager_email: row['Area Manager Email'] || '',
    division_head_email: row['Division Head Email'] || '',
    date_project_awarded: row['Date Project Awarded'] || '',
    work_programme: row['Work Programme'] || '',
    latitude: row['Latitude'] || '',
    longitude: row['Longitude'] || '',
    contract_status: row['Contract Status'] || '',
    currency: row['Currency'] || 'AED',
    workmanship_only: row['Workmanship only?'] || '',
    advance_payment_required: row['Advnace Payment Required'] || '',
    advance_payment_percentage: (() => {
      const value = row['Advance Payment Percentage'] || row['Advance Payment %'] || row['advance_payment_percentage']
      if (value !== undefined && value !== null && value !== '') {
        const parsed = parseFloat(String(value))
        return isNaN(parsed) ? undefined : parsed
      }
      return undefined
    })(),
    virtual_material_value: row['Virtual Material Value'] || '',
    project_start_date: row['Project Start Date'] || '',
    project_completion_date: row['Project Completion Date'] || '',
    project_duration: (() => {
      // ✅ CRITICAL: Check multiple possible column names for Project Duration
      const duration = row['Project Duration'] || row['project_duration'] || row.project_duration
      const projectCode = row['Project Code'] || row['project_code'] || row.project_code || row.id
      
      // ✅ DEBUG: Always log for debugging (can be removed later)
      console.log('🔍 mapProjectFromDB: Checking Project Duration for', projectCode, ':', {
        rawValue: duration,
        type: typeof duration,
        isNull: duration === null,
        isUndefined: duration === undefined,
        isEmpty: duration === '',
        fromProjectDuration: row['Project Duration'],
        fromproject_duration: row['project_duration'],
        fromproject_duration_direct: row.project_duration,
        rowKeys: Object.keys(row).filter(k => k.toLowerCase().includes('duration')),
        allRowKeys: Object.keys(row)
      })
      
      if (duration !== undefined && duration !== null && duration !== '') {
        // Convert to number - handle both string and number types
        // ✅ CRITICAL: Use parseInt with radix 10 to ensure proper parsing
        let parsed: number | undefined
        if (typeof duration === 'number') {
          parsed = duration
        } else {
          const strValue = String(duration).trim()
          parsed = strValue === '' ? undefined : parseInt(strValue, 10)
        }
        
        // ✅ Validate parsed value
        if (parsed !== undefined && parsed !== null && !isNaN(parsed) && parsed > 0) {
          console.log('✅ mapProjectFromDB: Successfully parsed Project Duration =', parsed, 'for project:', projectCode, '(raw:', duration, ', type:', typeof duration, ')')
          return parsed
        } else {
          console.warn('⚠️ mapProjectFromDB: Failed to parse Project Duration. Raw:', duration, 'Parsed:', parsed, 'for project:', projectCode)
        }
      } else {
        console.warn('⚠️ mapProjectFromDB: Project Duration is missing (undefined/null/empty) for project:', projectCode, {
          rowKeys: Object.keys(row),
          durationKeys: Object.keys(row).filter(k => k.toLowerCase().includes('duration'))
        })
      }
      return undefined
    })(),
    retention_after_completion: row['Retention after Completion'] ? parseFloat(String(row['Retention after Completion'])) : undefined,
    retention_after_6_month: row['Retention after 6 Month'] ? parseFloat(String(row['Retention after 6 Month'])) : undefined,
    retention_after_12_month: row['Retention after 12 Month'] ? parseFloat(String(row['Retention after 12 Month'])) : undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    created_by: row.created_by || ''
  }
}

/**
 * Map application project to database format
 */
export function mapProjectToDB(project: Partial<Project>): any {
  // ✅ BUILD: Build project_full_code from project_code + project_sub_code if not provided
  let projectFullCode = project.project_full_code
  if (!projectFullCode && project.project_code) {
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (projectSubCode) {
      // Check if sub_code already starts with project_code (case-insensitive)
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        // Sub_code already contains project_code (e.g., "P9999-01")
        projectFullCode = projectSubCode.trim()
      } else {
        // Build full code: project_code + project_sub_code
        if (projectSubCode.startsWith('-')) {
          projectFullCode = `${projectCode}${projectSubCode}`.trim()
        } else {
          projectFullCode = `${projectCode}-${projectSubCode}`.trim()
        }
      }
    } else {
      projectFullCode = projectCode
    }
  }
  
  const dbData: any = {
    'Project Code': project.project_code,
    'Project Sub-Code': project.project_sub_code,
    'Project Name': project.project_name,
    'Project Description': project.project_description,
    'Project Type': project.project_type,
    'Responsible Division': project.responsible_division,
    'Plot Number': project.plot_number,
    'KPI Completed': project.kpi_completed ? 'TRUE' : 'FALSE',
    'KPI Added': project.kpi_added || undefined, // ✅ Save KPI Added to database
    'Project Status': project.project_status || 'active',
    'Contract Amount': project.contract_amount?.toString() || '0'
  }
  
  // ❌ REMOVED: Do NOT save Project Full Code to database
  // The database only has 'Project Code' and 'Project Sub-Code' columns
  // project_full_code is built in the application code from these two columns
  
  // Add optional fields if they exist
  if (project.project_description) dbData['Project Description'] = project.project_description
  if (project.client_name) dbData['Client Name'] = project.client_name
  if (project.consultant_name) dbData['Consultant Name'] = project.consultant_name
  if (project.first_party_name) dbData['First Party name'] = project.first_party_name
  if (project.project_manager_email) dbData['Project Manager Email'] = project.project_manager_email
  if (project.area_manager_email) dbData['Area Manager Email'] = project.area_manager_email
  if (project.division_head_email) dbData['Division Head Email'] = project.division_head_email
  if (project.date_project_awarded) dbData['Date Project Awarded'] = project.date_project_awarded
  if (project.work_programme) dbData['Work Programme'] = project.work_programme
  if (project.latitude) dbData['Latitude'] = project.latitude
  if (project.longitude) dbData['Longitude'] = project.longitude
  if (project.contract_status) dbData['Contract Status'] = project.contract_status
  if (project.currency) dbData['Currency'] = project.currency
  if (project.workmanship_only) dbData['Workmanship only?'] = project.workmanship_only
  if (project.advance_payment_required) dbData['Advnace Payment Required'] = project.advance_payment_required
  if (project.advance_payment_percentage !== undefined && project.advance_payment_percentage !== null) {
    dbData['Advance Payment Percentage'] = project.advance_payment_percentage.toString()
  }
  if (project.virtual_material_value) dbData['Virtual Material Value'] = project.virtual_material_value
  if (project.project_start_date) dbData['Project Start Date'] = project.project_start_date
  if (project.project_completion_date) dbData['Project Completion Date'] = project.project_completion_date
  // ✅ CRITICAL: Always save project_duration if it exists
  // IMPORTANT: Save as number, not string, to ensure proper database storage
  // CRITICAL: Save duration AFTER dates so trigger sees it and doesn't override
  // The trigger checks if duration > 0 and preserves it, so we must send it
  if (project.project_duration !== undefined && project.project_duration !== null && project.project_duration > 0) {
    const durationValue = typeof project.project_duration === 'number' 
      ? project.project_duration 
      : parseInt(String(project.project_duration), 10) || 0
    if (durationValue > 0 && !isNaN(durationValue)) {
      // ✅ CRITICAL: Set duration AFTER dates in the object to ensure it's processed last
      // This way the trigger will see the duration value and preserve it
      dbData['Project Duration'] = durationValue
      console.log('💾 mapProjectToDB: Saving Project Duration =', durationValue, '(type:', typeof durationValue, ', will override trigger)')
    } else {
      console.warn('⚠️ mapProjectToDB: project_duration is 0 or invalid, not saving. Value:', project.project_duration, 'Parsed:', durationValue)
    }
  } else {
    console.warn('⚠️ mapProjectToDB: project_duration is undefined, null, or <= 0, not saving. Value:', project.project_duration)
  }
  if (project.retention_after_completion !== undefined) dbData['Retention after Completion'] = project.retention_after_completion
  if (project.retention_after_6_month !== undefined) dbData['Retention after 6 Month'] = project.retention_after_6_month
  if (project.retention_after_12_month !== undefined) dbData['Retention after 12 Month'] = project.retention_after_12_month
  
  return dbData
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
  
  // Extract activity description (merged from Activity and Activity Name)
  // Priority: Activity Description > Activity > Activity Name > Zone Ref > fallback
  // Handle both old and new database formats for backward compatibility
  const activityDescription = row['Activity Description'] || 
                              row['Activity'] || 
                              row['Activity Name'] || 
                              (row['Zone Ref'] ? row['Zone Ref'].split('‣')[1]?.trim() : '') || 
                              row['activity_description'] || 
                              row['activity_name'] || 
                              row['activity'] || 
                              ''
  
  // Normalize project codes - handle both old and new formats
  const projectCode = (row['Project Code'] || row['project_code'] || '').toString().trim()
  const projectSubCode = (row['Project Sub Code'] || row['project_sub_code'] || '').toString().trim()
  const projectFullCodeFromDB = (row['Project Full Code'] || row['project_full_code'] || '').toString().trim()
  
  // ✅ BUILD: Build project_full_code from project_code + project_sub_code
  // ✅ CRITICAL: Handle both NEW projects (with Project Full Code in DB) and OLD projects (without)
  let projectFullCode = projectFullCodeFromDB
  
  // ✅ PRIORITY: If Project Full Code exists in DB and contains sub_code, use it (NEW projects)
  // ✅ FALLBACK: If Project Full Code doesn't contain sub_code, rebuild from project_code + project_sub_code (OLD projects)
  if (projectSubCode && projectCode) {
    const normalizedSubCode = projectSubCode.toUpperCase().trim()
    const normalizedCode = projectCode.toUpperCase().trim()
    const normalizedFullCode = projectFullCodeFromDB.toUpperCase().trim()
    
    // Check if sub_code contains project_code (e.g., "P9999-01" contains "P9999")
    const subCodeContainsCode = normalizedSubCode.includes(normalizedCode)
    
    // Check if full_code from DB matches just the code (e.g., "P9999" = "P9999")
    const fullCodeIsJustCode = normalizedFullCode === normalizedCode
    
    // Check if full_code from DB already contains sub_code (e.g., "P9999-01" contains "01")
    const fullCodeContainsSubCode = normalizedFullCode.includes(normalizedSubCode.replace(normalizedCode, '').replace(/^-+/, ''))
    
    // ✅ NEW PROJECTS: If Project Full Code exists and contains sub_code, use it
    if (projectFullCodeFromDB && fullCodeContainsSubCode) {
      // Project Full Code is correct (e.g., "P9999-01"), use it
      projectFullCode = projectFullCodeFromDB.trim()
    }
    // ✅ OLD PROJECTS: If sub_code contains project_code but full_code is just the code, rebuild it
    else if (subCodeContainsCode && fullCodeIsJustCode) {
      // Sub_code already contains full code (e.g., "P9999-01")
      projectFullCode = projectSubCode.trim()
    } 
    // ✅ OLD PROJECTS: If sub_code is just the suffix (e.g., "01" or "-01")
    else if (!subCodeContainsCode && projectSubCode) {
      if (projectSubCode.startsWith('-')) {
        projectFullCode = `${projectCode}${projectSubCode}`.trim()
      } else {
        projectFullCode = `${projectCode}-${projectSubCode}`.trim()
      }
    } 
    // ✅ FALLBACK: No full_code in DB, build it
    else if (!projectFullCode && projectCode) {
      if (projectSubCode) {
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode.trim()
        } else {
          if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`.trim()
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`.trim()
          }
        }
      } else {
        projectFullCode = projectCode
      }
    }
  } else if (!projectFullCode && projectCode) {
    // No sub_code, use project_code only
    projectFullCode = projectCode
  }
  
  // ✅ DEBUG: Log project_full_code mapping ONLY in development and VERY rarely (0.01% = 1 in 10000)
  // ✅ PERFORMANCE: Reduced logging frequency to prevent console spam
  if (process.env.NODE_ENV === 'development' && (projectCode.includes('P9999') || projectCode.includes('9999') || Math.random() < 0.0001)) {
    console.log('🔍 mapBOQFromDB - Project Full Code:', {
      activityDescription: activityDescription,
      projectCode,
      projectSubCode,
      projectFullCodeFromDB: projectFullCodeFromDB || 'NOT IN DB',
      subCodeContainsCode: projectSubCode ? projectSubCode.toUpperCase().includes(projectCode.toUpperCase()) : false,
      fullCodeIsJustCode: projectFullCodeFromDB ? projectFullCodeFromDB.toUpperCase() === projectCode.toUpperCase() : false,
      builtProjectFullCode: projectFullCode,
      finalProjectFullCode: projectFullCode || projectCode
    })
  }
  
  return {
    id: row.id,
    project_code: projectCode,
    project_sub_code: projectSubCode,
    project_full_code: projectFullCode || projectCode,
    activity_description: activityDescription, // ✅ Merged from Activity and Activity Name
    activity_division: row['Activity Division'] || '',
    unit: row['Unit'] || '',
    zone_number: row['Zone Number'] || row['Zone #'] || '0',
    total_units: parseNum(row['Total Units']),
    // ✅ Use new column names only
    planned_units: parseNum(row['Planned Units']),
    actual_units: parseNum(row['Actual Units']),
    difference: parseNum(row['Difference']),
    variance_units: parseNum(row['Variance Units']),
    rate: parseNum(row['Rate']),
    total_value: parseNum(row['Total Value']),
    activity_value: parseNum(row['Activity Value']), // ✅ Activity Value from BOQ
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
    // ✅ Activity Timing
    activity_timing: row['Activity Timing'] || row['activity_timing'] || 'post-commencement',
    has_value: row['Has Value'] === 'TRUE' || row['has_value'] === true || row['Has Value'] === true || true,
    affects_timeline: row['Affects Timeline'] === 'TRUE' || row['affects_timeline'] === true || row['Affects Timeline'] === true || false,
    use_virtual_material: row['Use Virtual Material'] === 'TRUE' || row['use_virtual_material'] === true || row['Use Virtual Material'] === true || false,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    created_by: row.created_by || row['created_by'] || '',
    updated_by: row.updated_by || row['updated_by'] || '',
    // ✅ CRITICAL: Preserve raw database row for direct column access (same as mapProjectFromDB)
    raw: row
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
    'Activity Description': boq.activity_description || boq.activity || boq.activity_name || '', // ✅ Merged column (prefer Activity Description)
    'Activity Division': boq.activity_division,
    'Unit': boq.unit,
    'Zone Number': boq.zone_number || '0',
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
    'Total Drilling Meters': boq.total_drilling_meters?.toString(),
    // ✅ Activity Timing
    'Activity Timing': boq.activity_timing || 'post-commencement',
    'Has Value': boq.has_value !== undefined ? (boq.has_value ? 'TRUE' : 'FALSE') : 'TRUE',
    'Affects Timeline': boq.affects_timeline !== undefined ? (boq.affects_timeline ? 'TRUE' : 'FALSE') : 'FALSE',
    'Use Virtual Material': boq.use_virtual_material !== undefined ? (boq.use_virtual_material ? 'TRUE' : 'FALSE') : 'FALSE'
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
  
  // ✅ FIX: Build project_full_code correctly (same logic as mapBOQFromDB)
  const projectCode = (row['Project Code'] || row['project_code'] || '').toString().trim()
  const projectSubCode = (row['Project Sub Code'] || row['Project Sub-Code'] || row['project_sub_code'] || '').toString().trim()
  const projectFullCodeFromDB = (row['Project Full Code'] || row['project_full_code'] || '').toString().trim()
  
  // ✅ BUILD: Build project_full_code from project_code + project_sub_code
  // ✅ CRITICAL: Handle both NEW projects (with Project Full Code in DB) and OLD projects (without)
  let projectFullCode = projectFullCodeFromDB
  
  // ✅ PRIORITY: If Project Full Code exists in DB and contains sub_code, use it (NEW projects)
  // ✅ FALLBACK: If Project Full Code doesn't contain sub_code, rebuild from project_code + project_sub_code (OLD projects)
  if (projectSubCode && projectCode) {
    const normalizedSubCode = projectSubCode.toUpperCase().trim()
    const normalizedCode = projectCode.toUpperCase().trim()
    const normalizedFullCode = projectFullCodeFromDB.toUpperCase().trim()
    
    // Check if sub_code contains project_code (e.g., "P9999-01" contains "P9999")
    const subCodeContainsCode = normalizedSubCode.includes(normalizedCode)
    
    // Check if full_code from DB matches just the code (e.g., "P9999" = "P9999")
    const fullCodeIsJustCode = normalizedFullCode === normalizedCode
    
    // Check if full_code from DB already contains sub_code (e.g., "P9999-01" contains "01")
    const fullCodeContainsSubCode = normalizedFullCode.includes(normalizedSubCode.replace(normalizedCode, '').replace(/^-+/, ''))
    
    // ✅ NEW PROJECTS: If Project Full Code exists and contains sub_code, use it
    if (projectFullCodeFromDB && fullCodeContainsSubCode) {
      // Project Full Code is correct (e.g., "P9999-01"), use it
      projectFullCode = projectFullCodeFromDB.trim()
    }
    // ✅ OLD PROJECTS: If sub_code contains project_code but full_code is just the code, rebuild it
    else if (subCodeContainsCode && fullCodeIsJustCode) {
      // Sub_code already contains full code (e.g., "P9999-01")
      projectFullCode = projectSubCode.trim()
    } 
    // ✅ OLD PROJECTS: If sub_code is just the suffix (e.g., "01" or "-01")
    else if (!subCodeContainsCode && projectSubCode) {
      if (projectSubCode.startsWith('-')) {
        projectFullCode = `${projectCode}${projectSubCode}`.trim()
      } else {
        projectFullCode = `${projectCode}-${projectSubCode}`.trim()
      }
    } 
    // ✅ FALLBACK: No full_code in DB, build it
    else if (!projectFullCode && projectCode) {
      if (projectSubCode) {
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode.trim()
        } else {
          if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`.trim()
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`.trim()
          }
        }
      } else {
        projectFullCode = projectCode
      }
    }
  } else if (!projectFullCode && projectCode) {
    // No sub_code, use project_code only
    projectFullCode = projectCode
  }
  
  // ✅ Extract Activity Description (merged from Activity Name and Activity in KPI table)
  // Priority: Activity Description > Activity Name > Activity > fallback
  // Activity Name is preferred over Activity (as per user requirement)
  const activityDescription = (
    row['Activity Description'] || // ✅ Merged column (preferred)
    row['Activity Name'] || // ✅ Activity Name preferred over Activity
    row['Activity'] || 
    row.activity_description || 
    row.activity_name || 
    row.activity ||
    (row as any)?.raw?.['Activity Description'] ||
    (row as any)?.raw?.['Activity Name'] ||
    (row as any)?.raw?.['Activity'] ||
    ''
  ).toString().trim()
  
  // Keep activityName for backward compatibility
  const activityName = activityDescription

  // ✅ DEBUG: Log KPIs with missing data (first 10 only to avoid spam)
  if (!activityDescription || !projectFullCode) {
    const logCount = (globalThis as any).__kpiMissingDataLogCount || 0
    if (logCount < 10) {
      (globalThis as any).__kpiMissingDataLogCount = logCount + 1
      console.warn('⚠️ KPI with missing data:', {
        id: row.id,
        hasActivityDescription: !!activityDescription,
        activityDescription: activityDescription || 'MISSING',
        hasProjectCode: !!projectCode,
        projectCode: projectCode || 'MISSING',
        hasProjectFullCode: !!projectFullCode,
        projectFullCode: projectFullCode || 'MISSING',
        rawRowKeys: Object.keys(row).slice(0, 20), // First 20 keys
        activityDescriptionSources: {
          'Activity Description': row['Activity Description'],
          'Activity Name': row['Activity Name'],
          'Activity': row['Activity'],
          activity_description: row.activity_description,
          activity_name: row.activity_name,
          activity: row.activity
        },
        projectCodeSources: {
          'Project Code': row['Project Code'],
          'Project Full Code': row['Project Full Code'],
          project_code: row.project_code,
          project_full_code: row.project_full_code
        }
      })
    }
  }

  const mapped = {
    id: row.id,
    project_id: row.project_id || '',
    activity_id: row.activity_id || '',
    project_full_code: projectFullCode || projectCode || 'N/A',
    project_code: projectCode || 'N/A',
    project_sub_code: projectSubCode,
    activity_description: activityDescription || 'N/A', // ✅ Merged column (preferred)
    activity_name: activityDescription || 'N/A', // ✅ Backward compatibility
    activity: activityDescription || 'N/A', // ✅ Backward compatibility
    activity_division: row['Activity Division'] || '', // ✅ Activity Division field
    kpi_name: activityDescription || 'N/A', // Using activity description as KPI name
    quantity: quantity,
    input_type: inputType,
    section: row['Section'] || '',
    drilled_meters: parseNum(row['Drilled Meters']),
    unit: row['Unit'] || '',
    
    // 💰 Financial
    value: value,
    
    // 📅 Dates - Activity Date is the unified date field (DATE type in DB, returned as ISO string)
    // Supabase returns DATE type as ISO string (YYYY-MM-DD), so we can use it directly
    activity_date: row['Activity Date'] ? String(row['Activity Date']).split('T')[0] : '',
    day: row['Day'] || '',
    'Day': row['Day'] || '', // Keep both formats for compatibility
    
    // 📍 Location
    // ✅ NOT from Section - Section is separate from Zone
    zone: row['Zone'] || '',
    recorded_by: row['Recorded By'] || '',
    
    // ✅ Activity Timing (inherited from BOQ Activity)
    // ✅ FIX: Read Activity Timing from database - check multiple column name formats
    activity_timing: (row['Activity Timing'] || row['activity_timing'] || '').toString().trim() || undefined,
    
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
    // Approval fields
    approval_status: row['Approval Status'] || null,
    'Approval Status': row['Approval Status'] || null, // Keep both for compatibility
    approved_by: row['Approved By'] || null,
    approval_date: row['Approval Date'] || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    created_by: row.created_by || '',
    
    // ✅ CRITICAL: Preserve raw database row for direct column access
    raw: row
  }
  
  return mapped
}

/**
 * Map application KPI to database format
 * Note: Don't include 'Input Type' - it's determined by the table (Planned or Actual)
 */
export function mapKPIToDB(kpi: any): any {
  // Get activity description (merged column) with fallbacks for backward compatibility
  const activityDescription = kpi.activity_description || kpi.activity_name || kpi.activity || ''
  
  return {
    'Project Full Code': kpi.project_full_code,
    'Project Code': kpi.project_code,
    'Project Sub Code': kpi.project_sub_code,
    'Activity Description': activityDescription, // ✅ Merged column (preferred)
    'Activity Division': kpi.activity_division || '', // ✅ Division field
    'Quantity': kpi.quantity?.toString(),
    // ✅ Section and Zone are separate fields
    'Section': kpi.section || '',
    'Drilled Meters': kpi.drilled_meters?.toString(),
    'Unit': kpi.unit,
    'Value': kpi.value,
    'Day': kpi.day,
    // ✅ NOT from Section - Section is separate from Zone
    'Zone': kpi.zone || '',
    'Activity Date': kpi.activity_date || '2025-12-31', // Unified date field (DATE type, must be YYYY-MM-DD format, default if empty)
    'Recorded By': kpi.recorded_by,
    'Notes': kpi.notes,
    // ✅ Activity Timing
    'Activity Timing': kpi.activity_timing || undefined,
    project_id: kpi.project_id,
    activity_id: kpi.activity_id,
    completion_date: kpi.completion_date,
    status: kpi.status,
    created_by: kpi.created_by
  }
}

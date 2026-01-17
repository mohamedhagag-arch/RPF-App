/**
 * KPI Data Consistency Fix
 * 
 * This module ensures all KPI data (both manual and auto-generated) 
 * follows the same format and can be properly displayed across all pages
 */

import { KPIDataMapper, KPIRecord } from './kpi-data-mapper'

export interface ConsistentKPIRecord extends KPIRecord {
  // Ensure all records have consistent field names
  project_full_code: string
  project_code: string
  project_sub_code: string
  project_full_name: string
  activity_name: string
  activity_division: string
  quantity: number
  unit: string
  input_type: 'Planned' | 'Actual'
  activity_date: string // ✅ Unified date field (replaces target_date and actual_date)
  zone_number: string
  created_at: string
  updated_at: string
}

export class KPIConsistencyManager {
  /**
   * Normalize all KPI records to ensure consistent format
   */
  static normalizeAllKPIs(rawKPIs: any[]): ConsistentKPIRecord[] {
    return rawKPIs.map(record => this.normalizeSingleKPI(record))
  }

  /**
   * Normalize a single KPI record with enhanced mapping
   */
  static normalizeSingleKPI(record: any): ConsistentKPIRecord {
    // Use the existing KPIDataMapper but enhance it
    const normalized = KPIDataMapper.normalize(record)
    
    // Ensure all required fields are present with proper types
    return {
      // Project fields
      project_full_code: this.ensureString(normalized.project_full_code || record['Project Full Code'] || ''),
      project_code: this.ensureString(normalized.project_code || record['Project Code'] || ''),
      project_sub_code: this.ensureString(normalized.project_sub_code || record['Project Sub Code'] || ''),
      project_full_name: this.ensureString(normalized.project_full_name || record['Project Full Name'] || ''),
      
      // Activity fields
      activity_name: this.ensureString(normalized.activity_name || record['Activity Name'] || ''),
      activity_division: this.ensureString(normalized.activity_division || record['Activity Division'] || ''),
      
      // KPI fields
      quantity: this.ensureNumber(normalized.quantity || record['Quantity'] || 0),
      unit: this.ensureString(normalized.unit || record['Unit'] || ''),
      input_type: this.ensureInputType(normalized.input_type || record['Input Type'] || 'Planned'),
      
      // Date fields
      activity_date: this.ensureString((normalized as any).activity_date || record['Activity Date'] || ''),
      
      // Zone fields
      zone_number: this.ensureString(normalized.zone_number || record['Zone Number'] || '0'),
      
      // Timestamps
      created_at: this.ensureString(record.created_at || new Date().toISOString()),
      updated_at: this.ensureString(record.updated_at || new Date().toISOString())
    }
  }

  /**
   * Ensure string value with proper trimming
   */
  private static ensureString(value: any): string {
    if (value === null || value === undefined) return ''
    return String(value).trim()
  }

  /**
   * Ensure number value with proper parsing
   */
  private static ensureNumber(value: any): number {
    if (value === null || value === undefined) return 0
    const parsed = parseFloat(String(value))
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Ensure input type is valid
   */
  private static ensureInputType(value: any): 'Planned' | 'Actual' {
    const type = String(value).trim().toLowerCase()
    if (type === 'actual' || type === '✓ actual') return 'Actual'
    return 'Planned'
  }

  /**
   * Filter KPIs by project and activity with enhanced matching
   */
  static filterKPIsByProjectAndActivity(
    kpis: ConsistentKPIRecord[],
    projectCode: string,
    activityName: string
  ): ConsistentKPIRecord[] {
    return kpis.filter(kpi => {
      // Enhanced project matching
      const projectMatch = 
        kpi.project_full_code === projectCode ||
        kpi.project_code === projectCode ||
        kpi.project_full_code?.includes(projectCode) ||
        projectCode.includes(kpi.project_full_code || '')
      
      // Enhanced activity matching
      const activityMatch = 
        kpi.activity_name === activityName ||
        kpi.activity_name?.includes(activityName) ||
        activityName.includes(kpi.activity_name || '')
      
      return projectMatch && activityMatch
    })
  }

  /**
   * Group KPIs by type (Planned vs Actual)
   */
  static groupKPIsByType(kpis: ConsistentKPIRecord[]) {
    return {
      planned: kpis.filter(kpi => kpi.input_type === 'Planned'),
      actual: kpis.filter(kpi => kpi.input_type === 'Actual')
    }
  }

  /**
   * Calculate progress metrics for consistent display
   */
  static calculateProgressMetrics(kpis: ConsistentKPIRecord[]) {
    const { planned, actual } = this.groupKPIsByType(kpis)
    
    const totalPlanned = planned.reduce((sum, kpi) => sum + kpi.quantity, 0)
    const totalActual = actual.reduce((sum, kpi) => sum + kpi.quantity, 0)
    
    return {
      totalPlanned,
      totalActual,
      remaining: Math.max(0, totalPlanned - totalActual),
      progress: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
      plannedCount: planned.length,
      actualCount: actual.length
    }
  }

  /**
   * Create a standardized KPI record for saving
   */
  static createStandardKPIForSave(data: {
    projectCode: string
    projectSubCode?: string
    projectName?: string
    activityName: string
    activityDivision?: string
    quantity: number
    unit: string
    inputType: 'Planned' | 'Actual'
    activityDate?: string // ✅ Unified date field (replaces targetDate and actualDate)
    zoneNumber?: string
  }): any {
    // ✅ Only include columns that exist in the unified KPI table
    // ✅ Activity Date is the unified date field (DATE type, YYYY-MM-DD format, default if empty)
    const activityDate = data.activityDate || '2025-12-31'
    
    return {
      'Project Full Code': data.projectCode,
      'Project Code': data.projectCode,
      'Project Sub Code': data.projectSubCode || '',
      // ❌ Removed 'Project Full Name' - not a column in unified KPI table
      'Activity Description': data.activityName, // ✅ Use Activity Description (merged from Activity and Activity Name)
      // ❌ Removed 'Activity Division' - not a column in unified KPI table
      'Quantity': data.quantity.toString(),
      'Unit': data.unit,
      'Input Type': data.inputType,
      // ✅ Section and Zone are separate fields
      // Section should be empty for auto-created KPIs (only filled by site engineer in Actual KPIs)
      'Section': '', // ✅ Section is separate from Zone - leave empty for auto-created KPIs
      // ✅ Zone Number is the unified zone field (merged from Zone and Zone Number)
      'Zone Number': data.zoneNumber || '0',
      // ❌ Removed 'Zone Ref' - not a column in unified KPI table
      'Activity Date': String(activityDate).split('T')[0] // ✅ Unified date field (DATE type, YYYY-MM-DD format, default if empty)
    }
  }

  /**
   * Debug helper to log consistency issues
   */
  static debugConsistency(records: any[], label: string = 'KPI Records') {
    console.log(`🔍 ${label} Consistency Check:`, {
      totalRecords: records.length,
      fieldVariations: {
        projectCode: Array.from(new Set(records.map(r => Object.keys(r).filter(k => k.toLowerCase().includes('project'))).flat())),
        activityName: Array.from(new Set(records.map(r => Object.keys(r).filter(k => k.toLowerCase().includes('activity'))).flat())),
        inputType: Array.from(new Set(records.map(r => Object.keys(r).filter(k => k.toLowerCase().includes('input'))).flat()))
      },
      sampleRecord: records[0] ? Object.keys(records[0]) : 'No records'
    })
  }
}

export default KPIConsistencyManager

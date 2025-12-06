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
  target_date: string
  actual_date: string
  zone_ref: string
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
      target_date: this.ensureString(normalized.target_date || record['Target Date'] || ''),
      actual_date: this.ensureString(normalized.actual_date || record['Actual Date'] || ''),
      
      // Zone fields
      zone_ref: this.ensureString(normalized.zone_ref || record['Zone Ref'] || record['Zone'] || ''),
      zone_number: this.ensureString(normalized.zone_number || record['Zone Number'] || ''),
      
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
    targetDate?: string
    actualDate?: string
    zoneRef?: string
    zoneNumber?: string
    section?: string // ✅ Section field (user input for Actual KPIs)
    drilledMeters?: string | number // ✅ Drilled Meters field (for drilling activities)
  }): any {
    // ✅ Only include columns that exist in the unified KPI table
    return {
      'Project Full Code': data.projectCode,
      'Project Code': data.projectCode,
      'Project Sub Code': data.projectSubCode || '',
      // ❌ Removed 'Project Full Name' - not a column in unified KPI table
      'Activity Name': data.activityName,
      // ❌ Removed 'Activity Division' - not a column in unified KPI table
      'Quantity': data.quantity.toString(),
      'Unit': data.unit,
      'Input Type': data.inputType,
      'Target Date': data.targetDate || '',
      'Actual Date': data.actualDate || '',
      // ✅ Section and Zone are separate fields
      // Section should be empty for auto-created KPIs (only filled by site engineer in Actual KPIs)
      'Section': data.section || '', // ✅ Section is separate from Zone - user input for Actual KPIs
      // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
      'Zone': (() => {
        const projectFullCode = data.projectCode || ''
        const activityZone = data.zoneRef || data.zoneNumber || ''
        if (activityZone && projectFullCode) {
          // If zone already contains project code, use it as is
          if (activityZone.includes(projectFullCode)) {
            return activityZone
          }
          // Otherwise, format as: full code + zone
          return `${projectFullCode}-${activityZone}`
        }
        return activityZone || ''
      })(),
      'Zone Number': data.zoneNumber || '', // ✅ Zone Number is separate field
      // ❌ Removed 'Zone Ref' - not a column in unified KPI table
      'Activity Date': data.inputType === 'Actual' ? data.actualDate : data.targetDate,
      // ✅ Drilled Meters field (for drilling activities)
      'Drilled Meters': data.drilledMeters?.toString() || '0'
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

/**
 * KPI Data Mapper - Unified Column Mapping System
 * 
 * This module provides a unified way to handle KPI data column names
 * across different data sources (BOQ-generated vs Manual entry)
 */

export interface KPIRecord {
  // Project fields
  project_full_code?: string
  project_code?: string
  project_sub_code?: string
  project_full_name?: string
  
  // Activity fields
  activity_name?: string
  activity_division?: string
  
  // KPI fields
  quantity?: string | number
  unit?: string
  input_type?: string
  
  // Date fields
  target_date?: string
  actual_date?: string
  
  // Zone fields
  zone_ref?: string
  zone_number?: string
  
  // Legacy field mappings (for backward compatibility)
  'Project Full Code'?: string
  'Project Code'?: string
  'Project Sub Code'?: string
  'Project Full Name'?: string
  'Activity Name'?: string
  'Activity Division'?: string
  'Quantity'?: string | number
  'Unit'?: string
  'Input Type'?: string
  'Target Date'?: string
  'Actual Date'?: string
  'Zone Ref'?: string
  'Zone Number'?: string
}

export class KPIDataMapper {
  /**
   * Clean zone value to extract only valid zone information
   */
  static cleanZoneValue(zoneValue: string): string {
    if (!zoneValue || zoneValue.trim() === '') return ''
    
    // Remove "Enabling Division" and similar text
    let cleaned = zoneValue
      .replace(/Enabling Division/gi, '')
      .replace(/Enabling D/gi, '')
      .replace(/Division/gi, '')
      .trim()
    
    // Extract Zone A, Zone B, etc.
    const zoneMatch = cleaned.match(/Zone\s*[A-Z0-9]+/i)
    if (zoneMatch) {
      return zoneMatch[0]
    }
    
    // If no zone pattern found, return original if it's not "Enabling Division"
    if (!cleaned.toLowerCase().includes('enabling')) {
      return cleaned
    }
    
    return ''
  }

  /**
   * Normalize KPI record to unified format
   */
  static normalize(record: any): KPIRecord {
    const normalized = {
      // Project fields - Support multiple variations
      project_full_code: record['Project Full Code'] || 
                        record['Project Ful Project Code'] || 
                        record.project_full_code || 
                        record['Project Code'] || 
                        record.project_code || '',
      project_code: record['Project Code'] || 
                   record['Project Ful Project Code'] || 
                   record.project_code || '',
      project_sub_code: record['Project Sub Code'] || 
                       record.project_sub_code || '',
      project_full_name: record['Project Full Name'] || 
                        record.project_full_name || '',
      
      // Activity fields
      activity_name: record['Activity Name'] || 
                    record.activity_name || 
                    record['Activity / KPI'] || '',
      activity_division: record['Activity Division'] || 
                        record.activity_division || '',
      
      // KPI fields
      quantity: record['Quantity'] || 
                record.quantity || 
                record['QUANTITY'] || 0,
      unit: record['Unit'] || 
            record.unit || 
            record['UNIT'] || '',
      input_type: record['Input Type'] || 
                 record.input_type || 
                 record['TYPE'] || 'Planned',
      
      // Date fields
      target_date: record['Target Date'] || 
                  record.target_date || 
                  record['TARGET DATE'] || '',
      actual_date: record['Actual Date'] || 
                  record.actual_date || 
                  record['ACTUAL DATE'] || '',
      
      // Zone fields - Use only Zone Number (merged from Zone and Zone Number)
      zone_number: record['Zone Number'] || 
                  record.zone_number || 
                  record['ZONE NUMBER'] || 
                  '0',
      
      // Keep original record for debugging
      ...record
    }
    
    // Debug logging for normalization
    console.log('🔍 KPI Normalization:', {
      originalKeys: Object.keys(record),
      normalized: {
        activity_name: normalized.activity_name,
        project_full_code: normalized.project_full_code,
        input_type: normalized.input_type,
        quantity: normalized.quantity
      }
    })
    
    return normalized
  }

  /**
   * Get normalized value for a specific field
   */
  static getValue(record: any, field: keyof KPIRecord): string | number {
    const normalized = this.normalize(record)
    return normalized[field] || ''
  }

  /**
   * Check if record matches activity and project
   */
  static matchesActivityAndProject(
    record: any, 
    activityName: string, 
    projectCode: string
  ): boolean {
    const normalized = this.normalize(record)
    
    // More flexible matching for activity names
    const activityMatch = normalized.activity_name === activityName ||
                         normalized.activity_name?.includes(activityName) ||
                         activityName.includes(normalized.activity_name || '')
    
    // More flexible matching for project codes
    const projectMatch = normalized.project_full_code === projectCode || 
                        normalized.project_code === projectCode ||
                        normalized.project_full_code?.includes(projectCode) ||
                        projectCode.includes(normalized.project_full_code || '')
    
    // Debug logging
    console.log('🔍 KPI Match Check:', {
      originalRecord: Object.keys(record),
      normalized: {
        activity_name: normalized.activity_name,
        project_full_code: normalized.project_full_code,
        project_code: normalized.project_code
      },
      searchFor: {
        activityName,
        projectCode
      },
      matches: {
        activity: activityMatch,
        project: projectMatch,
        both: activityMatch && projectMatch
      }
    })
    
    return activityMatch && projectMatch
  }

  /**
   * Filter records by activity and project
   */
  static filterByActivityAndProject(
    records: any[], 
    activityName: string, 
    projectCode: string
  ): KPIRecord[] {
    return records
      .filter(record => this.matchesActivityAndProject(record, activityName, projectCode))
      .map(record => this.normalize(record))
  }

  /**
   * Calculate totals for planned/actual quantities
   */
  static calculateTotals(records: KPIRecord[]) {
    const planned = records
      .filter(record => {
        const inputType = record.input_type?.toLowerCase()
        return inputType === 'planned' || inputType === '⦿ planned'
      })
      .reduce((sum, record) => sum + (parseFloat(String(record.quantity)) || 0), 0)

    const actual = records
      .filter(record => {
        const inputType = record.input_type?.toLowerCase()
        return inputType === 'actual' || inputType === '✓ actual'
      })
      .reduce((sum, record) => sum + (parseFloat(String(record.quantity)) || 0), 0)

    return {
      planned,
      actual,
      remaining: Math.max(0, planned - actual),
      progress: planned > 0 ? Math.round((actual / planned) * 100) : 0
    }
  }

  /**
   * Create standardized KPI data for saving
   */
  static createStandardKPI(data: {
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
  }) {
    return {
      'Project Full Code': data.projectCode,
      'Project Code': data.projectCode,
      'Project Sub Code': data.projectSubCode || '',
      'Project Full Name': data.projectName || '',
      'Activity Description': data.activityName,
      'Activity Name': data.activityName, // Backward compatibility
      'Activity Division': data.activityDivision || '',
      'Quantity': data.quantity,
      'Unit': data.unit,
      'Input Type': data.inputType,
      'Target Date': data.targetDate || '',
      'Actual Date': data.actualDate || '',
      'Zone Number': data.zoneNumber || '0'
    }
  }

  /**
   * Debug helper to log record structure
   */
  static debugRecord(record: any, label: string = 'KPI Record') {
    console.log(`🔍 ${label}:`, {
      original: Object.keys(record),
      normalized: this.normalize(record),
      activity: this.getValue(record, 'activity_name'),
      project: this.getValue(record, 'project_full_code'),
      inputType: this.getValue(record, 'input_type'),
      quantity: this.getValue(record, 'quantity')
    })
  }
}

export default KPIDataMapper

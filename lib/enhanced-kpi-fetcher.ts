/**
 * Enhanced KPI Fetcher
 * 
 * This module provides a unified way to fetch and process KPI data
 * across all components, ensuring consistency
 */

import { getSupabaseClient, executeQuery } from './simpleConnectionManager'
import { TABLES } from './supabase'
import { mapKPIFromDB } from './dataMappers'
import { KPIConsistencyManager, ConsistentKPIRecord } from './kpi-data-consistency-fix'

export interface KPIQueryOptions {
  projectCodes?: string[]
  activityNames?: string[]
  inputTypes?: ('Planned' | 'Actual')[]
  dateRange?: {
    start: string
    end: string
  }
  limit?: number
  offset?: number
}

export interface KPIFetchResult {
  kpis: ConsistentKPIRecord[]
  totalCount: number
  plannedCount: number
  actualCount: number
  error?: string
}

export class EnhancedKPIFetcher {
  private supabase = getSupabaseClient()

  /**
   * Fetch KPIs with enhanced consistency and filtering
   */
  async fetchKPIs(options: KPIQueryOptions = {}): Promise<KPIFetchResult> {
    try {
      console.log('🔄 Enhanced KPI Fetch: Starting...', options)
      
      // Build the base query
      let query = this.supabase
        .from(TABLES.KPI)
        .select('*', { count: 'exact' })

      // Apply filters
      if (options.projectCodes && options.projectCodes.length > 0) {
        query = query.in('Project Full Code', options.projectCodes)
      }

      if (options.activityNames && options.activityNames.length > 0) {
        query = query.in('Activity Name', options.activityNames)
      }

      if (options.inputTypes && options.inputTypes.length > 0) {
        query = query.in('Input Type', options.inputTypes)
      }

      if (options.dateRange?.start) {
        query = query.gte('created_at', options.dateRange.start)
      }

      if (options.dateRange?.end) {
        query = query.lte('created_at', options.dateRange.end)
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1)
      }

      // Execute query
      const { data, error, count } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Enhanced KPI Fetch Error:', error)
        return {
          kpis: [],
          totalCount: 0,
          plannedCount: 0,
          actualCount: 0,
          error: error.message
        }
      }

      console.log('📊 Enhanced KPI Fetch: Raw data received', {
        count: data?.length || 0,
        totalCount: count || 0
      })

      // Normalize all records for consistency
      const rawKPIs = data || []
      const normalizedKPIs = KPIConsistencyManager.normalizeAllKPIs(rawKPIs)

      // Calculate statistics
      const plannedCount = normalizedKPIs.filter(kpi => kpi.input_type === 'Planned').length
      const actualCount = normalizedKPIs.filter(kpi => kpi.input_type === 'Actual').length

      console.log('✅ Enhanced KPI Fetch: Success', {
        totalKPIs: normalizedKPIs.length,
        plannedCount,
        actualCount,
        sampleRecord: normalizedKPIs[0] ? {
          project_full_code: normalizedKPIs[0].project_full_code,
          activity_name: normalizedKPIs[0].activity_name,
          input_type: normalizedKPIs[0].input_type,
          quantity: normalizedKPIs[0].quantity
        } : 'No records'
      })

      return {
        kpis: normalizedKPIs,
        totalCount: count || 0,
        plannedCount,
        actualCount
      }

    } catch (error: any) {
      console.error('❌ Enhanced KPI Fetch: Critical Error', error)
      return {
        kpis: [],
        totalCount: 0,
        plannedCount: 0,
        actualCount: 0,
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  /**
   * Fetch KPIs for a specific project
   */
  async fetchKPIsForProject(projectCode: string, options: Omit<KPIQueryOptions, 'projectCodes'> = {}): Promise<KPIFetchResult> {
    return this.fetchKPIs({
      ...options,
      projectCodes: [projectCode]
    })
  }

  /**
   * Fetch KPIs for a specific activity
   */
  async fetchKPIsForActivity(projectCode: string, activityName: string, options: Omit<KPIQueryOptions, 'projectCodes' | 'activityNames'> = {}): Promise<KPIFetchResult> {
    return this.fetchKPIs({
      ...options,
      projectCodes: [projectCode],
      activityNames: [activityName]
    })
  }

  /**
   * Fetch only Planned KPIs
   */
  async fetchPlannedKPIs(options: Omit<KPIQueryOptions, 'inputTypes'> = {}): Promise<KPIFetchResult> {
    return this.fetchKPIs({
      ...options,
      inputTypes: ['Planned']
    })
  }

  /**
   * Fetch only Actual KPIs
   */
  async fetchActualKPIs(options: Omit<KPIQueryOptions, 'inputTypes'> = {}): Promise<KPIFetchResult> {
    return this.fetchKPIs({
      ...options,
      inputTypes: ['Actual']
    })
  }

  /**
   * Get KPI statistics for dashboard
   */
  async getKPIStatistics(): Promise<{
    totalKPIs: number
    plannedKPIs: number
    actualKPIs: number
    todayKPIs: number
    overdueKPIs: number
  }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const [allKPIs, todayKPIs] = await Promise.all([
        this.fetchKPIs(),
        this.fetchKPIs({
          dateRange: { start: today, end: today }
        })
      ])

      return {
        totalKPIs: allKPIs.totalCount,
        plannedKPIs: allKPIs.plannedCount,
        actualKPIs: allKPIs.actualCount,
        todayKPIs: todayKPIs.kpis.length,
        overdueKPIs: 0 // TODO: Implement overdue calculation
      }
    } catch (error) {
      console.error('❌ KPI Statistics Error:', error)
      return {
        totalKPIs: 0,
        plannedKPIs: 0,
        actualKPIs: 0,
        todayKPIs: 0,
        overdueKPIs: 0
      }
    }
  }

  /**
   * Debug method to check data consistency
   */
  async debugDataConsistency(): Promise<void> {
    try {
      const result = await this.fetchKPIs({ limit: 10 })
      
      console.log('🔍 KPI Data Consistency Debug:', {
        totalRecords: result.kpis.length,
        plannedCount: result.plannedCount,
        actualCount: result.actualCount,
        sampleRecords: result.kpis.slice(0, 3).map(kpi => ({
          project_full_code: kpi.project_full_code,
          activity_name: kpi.activity_name,
          input_type: kpi.input_type,
          quantity: kpi.quantity
        }))
      })

      // Check for consistency issues
      const inconsistentRecords = result.kpis.filter(kpi => 
        !kpi.project_full_code || !kpi.activity_name || !kpi.input_type
      )

      if (inconsistentRecords.length > 0) {
        console.warn('⚠️ Found inconsistent records:', inconsistentRecords.length)
      } else {
        console.log('✅ All records are consistent')
      }

    } catch (error) {
      console.error('❌ Debug consistency error:', error)
    }
  }
}

// Export singleton instance
export const enhancedKPIFetcher = new EnhancedKPIFetcher()
export default enhancedKPIFetcher

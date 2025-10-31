/**
 * Enhanced Quantity Summary Component
 * 
 * This component provides accurate quantity calculations
 * for both manual and auto-generated KPI data
 */

'use client'

import React, { useState, useEffect } from 'react'
import { KPIConsistencyManager, ConsistentKPIRecord } from '@/lib/kpi-data-consistency-fix'
import { enhancedKPIFetcher } from '@/lib/enhanced-kpi-fetcher'
import { BOQActivity, Project } from '@/lib/supabase'
import { AlertCircle, CheckCircle, TrendingUp, Target, Clock } from 'lucide-react'

interface EnhancedQuantitySummaryProps {
  selectedActivity: BOQActivity
  selectedProject: Project
  newQuantity?: number
  unit?: string
  showDebug?: boolean
}

export function EnhancedQuantitySummary({
  selectedActivity,
  selectedProject,
  newQuantity = 0,
  unit = '',
  showDebug = false
}: EnhancedQuantitySummaryProps) {
  const [kpiData, setKpiData] = useState<ConsistentKPIRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totals, setTotals] = useState({
    totalPlanned: 0,
    totalActual: 0,
    remaining: 0,
    progress: 0
  })

  useEffect(() => {
    fetchKPIData()
  }, [selectedActivity, selectedProject])

  const fetchKPIData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch KPIs for this specific activity and project
      const result = await enhancedKPIFetcher.fetchKPIsForActivity(
        selectedProject.project_code,
        selectedActivity.activity_name
      )

      if (result.error) {
        throw new Error(result.error)
      }

      setKpiData(result.kpis)
      
      // Calculate totals using consistent data
      const { planned, actual } = KPIConsistencyManager.groupKPIsByType(result.kpis)
      const metrics = KPIConsistencyManager.calculateProgressMetrics(result.kpis)

      setTotals({
        totalPlanned: metrics.totalPlanned,
        totalActual: metrics.totalActual,
        remaining: metrics.remaining,
        progress: metrics.progress
      })

      if (showDebug) {
        console.log('🔍 Enhanced Quantity Summary Debug:', {
          activity: selectedActivity.activity_name,
          project: selectedProject.project_code,
          kpiRecords: result.kpis.length,
          plannedRecords: planned.length,
          actualRecords: actual.length,
          metrics,
          sampleRecords: result.kpis.slice(0, 3).map(kpi => ({
            inputType: kpi.input_type,
            quantity: kpi.quantity,
            project: kpi.project_full_code,
            activity: kpi.activity_name
          }))
        })
      }

    } catch (err: any) {
      console.error('❌ Error fetching KPI data for quantity summary:', err)
      setError(err.message || 'Failed to load KPI data')
      
      // Fallback to activity data
      setTotals({
        totalPlanned: selectedActivity.planned_units || 0,
        totalActual: selectedActivity.actual_units || 0,
        remaining: Math.max(0, (selectedActivity.planned_units || 0) - (selectedActivity.actual_units || 0)),
        progress: (selectedActivity.planned_units || 0) > 0 
          ? Math.round(((selectedActivity.actual_units || 0) / (selectedActivity.planned_units || 0)) * 100)
          : 0
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateWithNewQuantity = () => {
    const newActual = totals.totalActual + newQuantity
    const newRemaining = Math.max(0, totals.totalPlanned - newActual)
    const newProgress = totals.totalPlanned > 0 ? Math.round((newActual / totals.totalPlanned) * 100) : 0

    return {
      newActual,
      newRemaining,
      newProgress
    }
  }

  const { newActual, newRemaining, newProgress } = calculateWithNewQuantity()

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading quantity data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 p-2 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-1 mb-1">
          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
          <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Quantity Summary</h3>
        </div>

        {/* Compact Layout - 3 columns */}
        <div className="grid grid-cols-3 gap-1">
          {/* Total Planned Quantity */}
          <div className="text-center py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {totals.totalPlanned.toLocaleString()}
            </div>
          </div>

          {/* Completed So Far */}
          <div className="text-center py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-400">Done</div>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
              {totals.totalActual.toLocaleString()}
            </div>
          </div>

          {/* Remaining */}
          <div className="text-center py-1 px-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
            <div className="text-xs text-gray-600 dark:text-gray-400">Left</div>
            <div className="text-xs font-bold text-green-700 dark:text-green-300">
              {totals.remaining.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar - Compact */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Progress:</span>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, totals.progress)}%` }}
            ></div>
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">{totals.progress}%</span>
        </div>

      </div>
    </div>
  )
}

export default EnhancedQuantitySummary

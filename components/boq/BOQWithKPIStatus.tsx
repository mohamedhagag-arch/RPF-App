'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { BOQActivity } from '@/lib/supabase'
import { TABLES } from '@/lib/supabase'
import { mapKPIFromDB } from '@/lib/dataMappers'
import { Target, TrendingUp, CheckCircle2, AlertCircle, Link2, Eye, Clock, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BOQWithKPIStatusProps {
  activity: BOQActivity
  allKPIs?: any[] // Pre-loaded KPIs (optional for backward compatibility)
}

export function BOQWithKPIStatus({ activity, allKPIs }: BOQWithKPIStatusProps) {
  const [kpiData, setKpiData] = useState<{
    plannedCount: number
    actualCount: number
    totalPlanned: number
    totalActual: number
    hasData: boolean
  }>({
    plannedCount: 0,
    actualCount: 0,
    totalPlanned: 0,
    totalActual: 0,
    hasData: false
  })
  const [showDetails, setShowDetails] = useState(false)
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('boq-kpi-status')

  useEffect(() => {
    // If allKPIs is provided, use it (no fetching!)
    if (allKPIs && allKPIs.length > 0) {
      processKPIData(allKPIs)
      return
    }
    
    // Otherwise, fetch (backward compatibility)
    let isCancelled = false

    const fetchKPIData = async () => {
      try {
        console.log('🔍 Fetching KPI for:', {
          project_code: activity.project_code,
          activity_name: activity.activity_name
        })

        // Try exact match first from MAIN TABLE
        let { data: kpiRecords } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Full Code', activity.project_code)
          .eq('Activity Name', activity.activity_name)

        if (isCancelled) return

        console.log('📊 Exact match results:', kpiRecords?.length || 0)

        // If no exact match, try flexible match
        if (!kpiRecords || kpiRecords.length === 0) {
          console.log('🔄 Trying flexible match...')
          const { data: allProjectKPIs } = await supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Full Code', activity.project_code)
          
          if (isCancelled) return
          
          console.log('📋 All KPIs for project:', allProjectKPIs?.length || 0)
          
          // Try to match by activity name (case insensitive, partial match)
          if (allProjectKPIs && allProjectKPIs.length > 0) {
            const activityNameLower = (activity.activity_name || '').toLowerCase().trim()
            kpiRecords = allProjectKPIs.filter(kpi => {
              const kpiActivityName = (kpi['Activity Name'] || '').toLowerCase().trim()
              return kpiActivityName.includes(activityNameLower) || 
                     activityNameLower.includes(kpiActivityName)
            })
            console.log('🎯 Flexible match results:', kpiRecords.length)
          }
        }

        if (isCancelled) return

        if (kpiRecords && kpiRecords.length > 0) {
          const mapped = kpiRecords.map(mapKPIFromDB)
          
          const planned = mapped.filter(k => k.input_type === 'Planned')
          const actual = mapped.filter(k => k.input_type === 'Actual')
          
          const totalPlanned = planned.reduce((sum, k) => sum + (k.quantity || 0), 0)
          const totalActual = actual.reduce((sum, k) => sum + (k.quantity || 0), 0)

          console.log('✅ KPI Data found:', {
            planned: totalPlanned,
            actual: totalActual,
            plannedCount: planned.length,
            actualCount: actual.length
          })

          if (!isCancelled) {
            setKpiData({
              plannedCount: planned.length,
              actualCount: actual.length,
              totalPlanned,
              totalActual,
              hasData: true
            })
          }
        } else {
          console.log('⚠️ No KPI data found')
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('❌ Error fetching KPI data:', error)
        }
      }
    }

    fetchKPIData()

    return () => {
      isCancelled = true
    }
  }, [activity.project_code, activity.activity_name, allKPIs])
  
  // Helper function to process KPI data
  const processKPIData = (kpiRecords: any[]) => {
    // Filter KPIs for this activity
    const activityNameLower = (activity.activity_name || '').toLowerCase().trim()
    const activityKPIs = kpiRecords.filter(kpi => {
      const matchesProject = kpi.project_full_code === activity.project_code ||
                            kpi.project_full_code?.startsWith(activity.project_code)
      if (!matchesProject) return false
      
      const kpiActivityName = (kpi.activity_name || '').toLowerCase().trim()
      return kpiActivityName.includes(activityNameLower) || 
             activityNameLower.includes(kpiActivityName)
    })
    
    if (activityKPIs.length > 0) {
      const planned = activityKPIs.filter(k => k.input_type === 'Planned')
      const actual = activityKPIs.filter(k => k.input_type === 'Actual')
      
      const totalPlanned = planned.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
      const totalActual = actual.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)

      console.log(`📊 KPI Data for ${activity.activity_name}:`, {
        planned: { count: planned.length, quantity: totalPlanned },
        actual: { count: actual.length, quantity: totalActual }
      })

      setKpiData({
        plannedCount: planned.length,
        actualCount: actual.length,
        totalPlanned,
        totalActual,
        hasData: true
      })
    }
  }

  // Calculate KPI-based progress
  const kpiProgress = kpiData.totalPlanned > 0 
    ? (kpiData.totalActual / kpiData.totalPlanned) * 100 
    : 0

  const boqProgress = (activity.planned_units || 0) > 0
    ? ((activity.actual_units || 0) / (activity.planned_units || 0)) * 100
    : 0

  // Determine status based on KPI progress
  let status: 'excellent' | 'good' | 'warning' | 'critical'
  let statusText: string
  let statusColor: string

  if (kpiData.hasData && kpiData.actualCount > 0) {
    if (kpiProgress >= 100) {
      status = 'excellent'
      statusText = 'Completed'
      statusColor = 'text-green-600 bg-green-50 border-green-200'
    } else if (kpiProgress >= 80) {
      status = 'good'
      statusText = 'On Track'
      statusColor = 'text-blue-600 bg-blue-50 border-blue-200'
    } else if (kpiProgress >= 50) {
      status = 'warning'
      statusText = 'In Progress'
      statusColor = 'text-yellow-600 bg-yellow-50 border-yellow-200'
    } else {
      status = 'critical'
      statusText = 'Behind Schedule'
      statusColor = 'text-red-600 bg-red-50 border-red-200'
    }
  } else {
    status = 'warning'
    statusText = 'Not Started'
    statusColor = 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const isInSync = Math.abs(kpiData.totalActual - (activity.actual_units || 0)) < 0.01

  if (!kpiData.hasData) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <AlertCircle className="w-3 h-3" />
          <span>No KPI data yet</span>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${statusColor}`}>
          <Clock className="w-3 h-3" />
          <span>{statusText}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Progress and Status from KPI */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Progress Badge */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${
          kpiProgress >= 100 ? 'bg-green-50 text-green-700 border-green-300' :
          kpiProgress >= 80 ? 'bg-blue-50 text-blue-700 border-blue-300' :
          kpiProgress >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
          'bg-red-50 text-red-700 border-red-300'
        }`}>
          <BarChart3 className="w-3 h-3" />
          <span>{kpiProgress.toFixed(1)}%</span>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${statusColor}`}>
          {status === 'excellent' && <CheckCircle2 className="w-3 h-3" />}
          {status === 'good' && <TrendingUp className="w-3 h-3" />}
          {status === 'warning' && <Clock className="w-3 h-3" />}
          {status === 'critical' && <AlertCircle className="w-3 h-3" />}
          <span>{statusText}</span>
        </div>

        {/* KPI Records Count */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          isInSync 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <Link2 className="w-3 h-3" />
          <span>{kpiData.actualCount} days</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="h-6 px-2 text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          {showDetails ? 'Hide' : 'Details'}
        </Button>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs space-y-2">
          <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            KPI Records for this Activity:
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* KPI Planned */}
            <div className="bg-white dark:bg-gray-800 rounded p-2">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Target className="w-3 h-3 text-blue-500" />
                <span>KPI Planned</span>
              </div>
              <div className="font-bold text-blue-600">
                {kpiData.totalPlanned.toLocaleString()}
              </div>
              <div className="text-gray-500">
                {kpiData.plannedCount} records
              </div>
            </div>

            {/* KPI Actual */}
            <div className="bg-white dark:bg-gray-800 rounded p-2">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span>KPI Actual</span>
              </div>
              <div className="font-bold text-green-600">
                {kpiData.totalActual.toLocaleString()}
              </div>
              <div className="text-gray-500">
                {kpiData.actualCount} records
              </div>
            </div>

            {/* BOQ Planned */}
            <div className="bg-white dark:bg-gray-800 rounded p-2">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Target className="w-3 h-3 text-blue-500" />
                <span>BOQ Planned</span>
              </div>
              <div className="font-bold text-blue-600">
                {(activity.planned_units || 0).toLocaleString()}
              </div>
            </div>

            {/* BOQ Actual */}
            <div className="bg-white dark:bg-gray-800 rounded p-2">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>BOQ Actual</span>
              </div>
              <div className="font-bold text-green-600">
                {(activity.actual_units || 0).toLocaleString()}
              </div>
              {isInSync ? (
                <div className="text-green-600 text-xs">✓ Synced</div>
              ) : (
                <div className="text-yellow-600 text-xs">⚠ Out of sync</div>
              )}
            </div>
          </div>

          {/* Status Summary - KPI Based */}
          <div className="bg-white dark:bg-gray-800 rounded p-2 mt-2">
            <div className="font-semibold mb-2">KPI-Based Analysis:</div>
            <div className="space-y-2">
              {/* Progress from KPI */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Progress from KPI:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        kpiProgress >= 100 ? 'bg-green-500' :
                        kpiProgress >= 80 ? 'bg-blue-500' :
                        kpiProgress >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(kpiProgress, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{kpiProgress.toFixed(1)}%</span>
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Status:</div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${statusColor}`}>
                  {status === 'excellent' && <CheckCircle2 className="w-3 h-3" />}
                  {status === 'good' && <TrendingUp className="w-3 h-3" />}
                  {status === 'warning' && <Clock className="w-3 h-3" />}
                  {status === 'critical' && <AlertCircle className="w-3 h-3" />}
                  <span>{statusText}</span>
                </div>
              </div>

              {/* Work Info */}
              {kpiData.actualCount > 0 ? (
                <div className="flex items-center gap-2 text-green-600 text-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Work started - {kpiData.actualCount} days recorded</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>Planned only - No actual work yet</span>
                </div>
              )}

              {/* Comparison */}
              {Math.abs(kpiProgress - boqProgress) > 1 && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  ⚠️ Note: BOQ Progress ({boqProgress.toFixed(1)}%) differs from KPI ({kpiProgress.toFixed(1)}%)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

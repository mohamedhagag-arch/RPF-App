'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BOQActivity } from '@/lib/supabase'
import { TABLES } from '@/lib/supabase'
import { mapKPIFromDB } from '@/lib/dataMappers'

interface BOQProgressCellProps {
  activity: BOQActivity
  allKPIs?: any[] // Pre-loaded KPIs
}

export function BOQProgressCell({ activity, allKPIs }: BOQProgressCellProps) {
  const [kpiProgress, setKpiProgress] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()
  const mountedRef = useRef(true)
  const lastFetchRef = useRef<string>('')

  useEffect(() => {
    mountedRef.current = true
    
    // If allKPIs provided, use it (no fetching!)
    if (allKPIs && allKPIs.length > 0) {
      calculateProgressFromKPIs(allKPIs)
      return
    }
    
    // Otherwise, fetch (backward compatibility)
    let isCancelled = false

    const fetchKPIProgress = async () => {
      // Prevent duplicate requests
      const fetchKey = `${activity.project_code}-${activity.activity_name}`
      if (loading || lastFetchRef.current === fetchKey) return
      
      lastFetchRef.current = fetchKey
      setLoading(true)

      try {
        // Get KPI data for this activity from MAIN TABLE
        let { data: kpiRecords } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Full Code', activity.project_code)
          .eq('Activity Name', activity.activity_name)

        if (isCancelled) return

        // Flexible match if needed
        if (!kpiRecords || kpiRecords.length === 0) {
          const { data: allKPIs } = await supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Full Code', activity.project_code)
          
          if (isCancelled) return
          
          if (allKPIs && allKPIs.length > 0) {
            const activityNameLower = (activity.activity_name || '').toLowerCase().trim()
            kpiRecords = allKPIs.filter(kpi => {
              const kpiActivityName = (kpi['Activity Name'] || '').toLowerCase().trim()
              return kpiActivityName.includes(activityNameLower) || 
                     activityNameLower.includes(kpiActivityName)
            })
          }
        }

        if (!isCancelled && kpiRecords && kpiRecords.length > 0) {
          const mapped = kpiRecords.map(mapKPIFromDB)
          const planned = mapped.filter(k => k.input_type === 'Planned')
          const actual = mapped.filter(k => k.input_type === 'Actual')
          
          const totalPlanned = planned.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
          const totalActual = actual.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)

          const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
          
          console.log(`📊 Progress for ${activity.activity_name}:`, {
            plannedKPIs: planned.length,
            actualKPIs: actual.length,
            totalPlanned,
            totalActual,
            progress: progress.toFixed(1) + '%'
          })
          
          // ✅ ALWAYS update state (React handles unmounted safely)
          setKpiProgress(progress)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching KPI progress:', error)
        }
      } finally {
        // ✅ ALWAYS stop loading (React handles unmounted safely)
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchKPIProgress()

    return () => {
      mountedRef.current = false
      isCancelled = true
    }
  }, [activity.project_code, activity.activity_name, allKPIs])
  
  // Helper to calculate progress from pre-loaded KPIs
  const calculateProgressFromKPIs = (kpis: any[]) => {
    const activityNameLower = (activity.activity_name || '').toLowerCase().trim()
    const activityKPIs = kpis.filter(kpi => {
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
      
      const totalPlanned = planned.reduce((sum, k) => sum + (k.quantity || 0), 0)
      const totalActual = actual.reduce((sum, k) => sum + (k.quantity || 0), 0)

      const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
      setKpiProgress(progress)
    }
  }

  const getProgressColor = () => {
    if (kpiProgress >= 100) return 'bg-green-500'
    if (kpiProgress >= 80) return 'bg-blue-500'
    if (kpiProgress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2 relative overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all ${getProgressColor()}`}
          style={{ width: `${Math.min(kpiProgress, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-medium min-w-[3rem] ${
        kpiProgress >= 100 ? 'text-green-600' :
        kpiProgress >= 80 ? 'text-blue-600' :
        kpiProgress >= 50 ? 'text-yellow-600' :
        'text-gray-600'
      }`}>
        {kpiProgress.toFixed(1)}%
      </span>
    </div>
  )
}


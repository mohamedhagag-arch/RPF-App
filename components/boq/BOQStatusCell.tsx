'use client'

import { useState, useEffect, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { BOQActivity } from '@/lib/supabase'
import { TABLES } from '@/lib/supabase'
import { mapKPIFromDB } from '@/lib/dataMappers'
import { CheckCircle2, TrendingUp, Clock, AlertCircle } from 'lucide-react'

interface BOQStatusCellProps {
  activity: BOQActivity
}

export function BOQStatusCell({ activity }: BOQStatusCellProps) {
  const guard = usePermissionGuard()
  const [status, setStatus] = useState<{
    text: string
    color: string
    icon: any
  }>({
    text: 'Not Started',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock
  })
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('boq-status')
  const mountedRef = useRef(true)
  const lastFetchRef = useRef<string>('')

  useEffect(() => {
    mountedRef.current = true
    let isCancelled = false

    const fetchKPIStatus = async () => {
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
              const kpiActivityName = (kpi['Activity Name'] as string || '').toLowerCase().trim()
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

          console.log(`📊 Status for ${activity.activity_name}:`, {
            plannedKPIs: planned.length,
            actualKPIs: actual.length,
            totalPlanned,
            totalActual,
            progress: progress.toFixed(1) + '%'
          })

          // Only update if still mounted and not cancelled
          if (mountedRef.current && !isCancelled) {
            // Determine status based on progress
            if (actual.length === 0) {
              setStatus({
                text: 'Not Started',
                color: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: Clock
              })
            } else if (progress >= 100) {
              setStatus({
                text: 'Completed',
                color: 'bg-green-100 text-green-800 border-green-300',
                icon: CheckCircle2
              })
            } else if (progress >= 80) {
              setStatus({
                text: 'On Track',
                color: 'bg-blue-100 text-blue-800 border-blue-300',
                icon: TrendingUp
              })
            } else if (progress >= 50) {
              setStatus({
                text: 'In Progress',
                color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: Clock
              })
            } else {
              setStatus({
                text: 'Behind Schedule',
                color: 'bg-red-100 text-red-800 border-red-300',
                icon: AlertCircle
              })
            }
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching KPI status:', error)
        }
      } finally {
        // ✅ ALWAYS stop loading (React handles unmounted safely)
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchKPIStatus()

    return () => {
      mountedRef.current = false
      isCancelled = true
    }
  }, [activity.project_code, activity.activity_name])

  const Icon = status.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
      <Icon className="w-3 h-3" />
      {status.text}
    </span>
  )
}


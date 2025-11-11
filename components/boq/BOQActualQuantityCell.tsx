'use client'

import { useEffect, useState, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { BOQActivity } from '@/lib/supabase'
import { calculateActualFromKPI } from '@/lib/boqKpiSync'
import { calculateBOQValues, formatCurrency, calculateProjectProgressFromValues } from '@/lib/boqValueCalculator'
import { calculateActivityRate } from '@/lib/rateCalculator'

interface BOQActualQuantityCellProps {
  activity: BOQActivity
  allKPIs?: any[] // Pre-loaded KPIs (optional)
}

export function BOQActualQuantityCell({ activity, allKPIs }: BOQActualQuantityCellProps) {
  const guard = usePermissionGuard()
  const [actualQuantity, setActualQuantity] = useState<number>(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    // If allKPIs is provided, use it (no fetching!)
    if (allKPIs && allKPIs.length > 0) {
      calculateActualFromKPIs(allKPIs)
    } else {
      // Calculate from KPI database if no pre-loaded KPIs
      calculateActualFromDatabase()
    }

    return () => {
      mountedRef.current = false
    }
  }, [activity.project_code, activity.activity_name, allKPIs])
  
  const calculateActualFromKPIs = (kpis: any[]) => {
    // Filter for this activity with Zone matching
    const activityNameLower = (activity.activity_name || '').toLowerCase().trim()
    
    // ✅ Extract Activity Zone from multiple sources
    const activityZone = (
      activity.zone_ref || 
      activity.zone_number || 
      (activity as any).raw?.['Zone Ref'] || 
      (activity as any).raw?.['Zone Number'] || 
      ''
    ).toString().toLowerCase().trim()
    
    // ✅ Normalize activity zone (remove project code prefix if exists)
    let normalizedActivityZone = activityZone
    if (normalizedActivityZone && activity.project_code) {
      const projectCodeUpper = (activity.project_code || '').toUpperCase()
      normalizedActivityZone = normalizedActivityZone
        .replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '')
        .replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '')
        .replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '')
        .trim()
    }
    
    const activityKPIs = kpis.filter(kpi => {
      // ✅ Project matching
      const matchesProject = kpi.project_full_code === activity.project_code ||
                            kpi.project_full_code?.startsWith(activity.project_code) ||
                            kpi.project_code === activity.project_code
      if (!matchesProject) return false
      
      // ✅ Activity name matching
      const kpiActivityName = (kpi.activity_name || '').toLowerCase().trim()
      const activityNameMatch = kpiActivityName.includes(activityNameLower) || 
             activityNameLower.includes(kpiActivityName)
      if (!activityNameMatch) return false
      
      // ✅ Zone matching (if both have zones, they must match)
      const rawKPI = (kpi as any).raw || {}
      const kpiZoneRaw = (kpi.zone || kpi.section || rawKPI['Zone'] || rawKPI['Zone Number'] || '').toString().trim()
      let kpiZone = kpiZoneRaw.toLowerCase().trim()
      
      // Normalize KPI zone (remove project code prefix if exists)
      if (kpiZone && kpi.project_code) {
        const projectCodeUpper = (kpi.project_code || '').toUpperCase()
        kpiZone = kpiZone
          .replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '')
          .replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '')
          .replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '')
          .trim()
      }
      
      // If both have zones, they must match for precision
      if (normalizedActivityZone && kpiZone) {
        const zoneMatch = (
          normalizedActivityZone === kpiZone ||
          normalizedActivityZone.includes(kpiZone) ||
          kpiZone.includes(normalizedActivityZone)
        )
        if (!zoneMatch) return false
      }
      
      // If activity has zone but KPI doesn't, or vice versa, still allow match (flexible)
      return true
    })
    
    // Sum only ACTUAL KPIs
    const actual = activityKPIs.filter(k => k.input_type === 'Actual')
    const totalActual = actual.reduce((sum, k) => {
      const qty = parseFloat(k.quantity?.toString() || '0') || 0
      return sum + qty
    }, 0)
    
    setActualQuantity(totalActual)
  }

  // Calculate Actual from KPI database
  const calculateActualFromDatabase = async () => {
    try {
      const actual = await calculateActualFromKPI(
        activity.project_code || '',
        activity.activity_name || ''
      )
      
      if (mountedRef.current) {
        setActualQuantity(actual)
      }
    } catch (error) {
      if (mountedRef.current) {
        setActualQuantity(0)
      }
    }
  }

  // ✅ Calculate values using correct business logic
  const values = calculateBOQValues(
    activity.total_units || 0,
    activity.planned_units || 0,
    actualQuantity,
    activity.total_value || 0
  )

  return (
    <div>
      <div className="text-gray-900 dark:text-gray-100 font-semibold text-base">
        {actualQuantity > 0 ? (
          <span className="text-blue-600 font-bold">
            {actualQuantity.toLocaleString()} {activity.unit || ''}
          </span>
        ) : (
          <span className="text-gray-500">
            0 {activity.unit || ''}
          </span>
        )}
      </div>
      {actualQuantity > 0 && (
        <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Auto-synced from KPI</span>
        </div>
      )}
      
      {/* ✅ Show calculated value */}
      {actualQuantity > 0 && (
        <div className="mt-2 text-xs">
          <div className="text-gray-600 dark:text-gray-400">
            Value: <span className="font-semibold text-green-600">{formatCurrency(values.value)}</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Rate: <span className="font-semibold text-yellow-600">{formatCurrency(values.rate)}</span>
          </div>
        </div>
      )}
    </div>
  )
}


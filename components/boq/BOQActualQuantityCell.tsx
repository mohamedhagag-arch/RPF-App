'use client'

import { useEffect, useState, useRef } from 'react'
import { BOQActivity } from '@/lib/supabase'

interface BOQActualQuantityCellProps {
  activity: BOQActivity
  allKPIs?: any[] // Pre-loaded KPIs (optional)
}

export function BOQActualQuantityCell({ activity, allKPIs }: BOQActualQuantityCellProps) {
  const [actualQuantity, setActualQuantity] = useState<number>(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    // ✅ If allKPIs is provided, use it (no fetching!)
    if (allKPIs && allKPIs.length > 0) {
      console.log(`🔍 BOQActualQuantityCell: Using pre-loaded KPIs for ${activity.activity_name}`, {
        totalKPIs: allKPIs.length,
        activityProjectCode: activity.project_code
      })
      calculateActualFromKPIs(allKPIs)
    } else {
      // If no allKPIs provided, show 0
      console.log(`⚠️ BOQActualQuantityCell: No pre-loaded KPIs for ${activity.activity_name}`)
      setActualQuantity(0)
    }

    return () => {
      mountedRef.current = false
    }
  }, [activity.project_code, activity.activity_name, allKPIs])
  
  const calculateActualFromKPIs = (kpis: any[]) => {
    // Filter for this activity
    const activityNameLower = (activity.activity_name || '').toLowerCase().trim()
    
    console.log(`🔎 Calculating actual for "${activity.activity_name}"`, {
      totalKPIs: kpis.length,
      activityProject: activity.project_code
    })
    
    const activityKPIs = kpis.filter(kpi => {
      const matchesProject = kpi.project_full_code === activity.project_code ||
                            kpi.project_full_code?.startsWith(activity.project_code) ||
                            kpi.project_code === activity.project_code
      if (!matchesProject) return false
      
      const kpiActivityName = (kpi.activity_name || '').toLowerCase().trim()
      const matches = kpiActivityName.includes(activityNameLower) || 
                      activityNameLower.includes(kpiActivityName)
      
      if (matches) {
        console.log(`  ✅ Matched KPI:`, {
          kpiActivity: kpi.activity_name,
          inputType: kpi.input_type,
          quantity: kpi.quantity
        })
      }
      
      return matches
    })
    
    // ✅ Sum only ACTUAL KPIs
    const actual = activityKPIs.filter(k => k.input_type === 'Actual')
    const totalActual = actual.reduce((sum, k) => {
      const qty = parseFloat(k.quantity?.toString() || '0') || 0
      return sum + qty
    }, 0)
    
    console.log(`📊 Final Actual Quantity for "${activity.activity_name}":`, {
      matchedKPIs: activityKPIs.length,
      actualKPIs: actual.length,
      totalActual,
      unit: activity.unit
    })
    
    setActualQuantity(totalActual)
  }

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
    </div>
  )
}


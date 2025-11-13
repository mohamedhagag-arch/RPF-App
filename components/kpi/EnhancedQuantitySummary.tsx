/**
 * Enhanced Quantity Summary Component
 * 
 * Calculates and displays quantity summary for a selected activity:
 * - Total: Sum of all Planned KPIs (filtered by Project Full Code, Activity Name, and Zone)
 * - Done: Sum of all Actual KPIs (filtered by Project Full Code, Activity Name, and Zone)
 * - Left: Total - Done
 * - Progress: (Done / Total) × 100%
 * 
 * Key Features:
 * - Supports multiple projects with same code but different sub codes (e.g., P5066-A, P5066-B)
 * - Filters by Project Full Code for accurate project matching
 * - Filters by Activity Name (flexible matching)
 * - Filters by Zone if provided (or shows all zones if not provided)
 */

'use client'

import React, { useState, useEffect } from 'react'
import { BOQActivity, Project } from '@/lib/supabase'
import { AlertCircle, Clock, Target } from 'lucide-react'

interface EnhancedQuantitySummaryProps {
  selectedActivity: BOQActivity
  selectedProject: Project
  newQuantity?: number
  unit?: string
  showDebug?: boolean
  zone?: string // Zone filter - if provided, only show KPIs for this zone
  projectFullCode?: string // Project Full Code override - if provided, use this instead of project.project_full_code
  onTotalsChange?: (totals: {totalPlanned: number, totalActual: number, remaining: number, progress: number}) => void // ✅ Callback to pass totals to parent
}

export function EnhancedQuantitySummary({
  selectedActivity,
  selectedProject,
  newQuantity = 0,
  unit = '',
  showDebug = process.env.NODE_ENV === 'development', // Auto-enable in development
  zone,
  projectFullCode,
  onTotalsChange // ✅ Callback to pass totals to parent
}: EnhancedQuantitySummaryProps) {
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
  }, [selectedActivity, selectedProject, zone, projectFullCode])

  /**
   * Normalize zone string by removing project code prefix
   * Examples: 
   * - "P5066 - 1" -> "1"
   * - "P5066-2" -> "2"
   * - "P5066-I2 - 1" -> "1" (P5066-I2 is Project Full Code, not Zone!)
   * - "P5066-I2-1" -> "1"
   * 
   * IMPORTANT: P5066-I2 means:
   * - P5066 = Project Code
   * - I2 = Sub Code (NOT Zone 2!)
   * - So Project Full Code = "P5066-I2"
   * - Zone = "1" (the part after Project Full Code)
   */
  const normalizeZone = (zoneStr: string, projectFullCode: string, projectCode: string): string => {
    if (!zoneStr) return ''
    
    let normalized = zoneStr.trim()
    if (!normalized) return ''
    
    // ✅ FIRST: Try to remove Project Full Code (e.g., "P5066-I2 - 1" -> "1")
    if (projectFullCode) {
      const fullCodeUpper = projectFullCode.toUpperCase()
      const normalizedUpper = normalized.toUpperCase()
      
      // If zone starts with Project Full Code, remove it
      if (normalizedUpper.startsWith(fullCodeUpper)) {
        const afterFullCode = normalized.substring(projectFullCode.length).trim()
        // Remove leading dashes or spaces
        normalized = afterFullCode.replace(/^[\s-]+/, '').trim()
        if (normalized) {
          return normalized.toLowerCase()
        }
      }
    }
    
    // ✅ SECOND: If Project Full Code didn't match, try Project Code only
    if (projectCode) {
      const codeUpper = projectCode.toUpperCase()
      
      // Remove project code prefix in various formats
      // 1. "P5066 - " or "P5066 -" at start
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      // 2. "P5066 " at start
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      // 3. "P5066-" at start
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
    }
    
    // Clean up any remaining " - " or "- " at the start
    normalized = normalized.replace(/^\s*-\s*/, '').trim()
    
    return normalized.toLowerCase()
  }

  /**
   * Extract all numbers from zone string and join them
   * Example: "12 - 1" -> "121", "12 - 2" -> "122"
   * This creates a unique identifier for zones
   */
  const extractZoneNumber = (zoneStr: string): string => {
    if (!zoneStr || zoneStr.trim() === '') return ''
    
    const numbers = zoneStr.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      return numbers.join('') // Join all numbers to create unique identifier
    }
    
    return zoneStr.toLowerCase().trim()
  }

  /**
   * Check if two zones match using multiple strategies
   */
  const zonesMatch = (zone1: string, zone2: string, projectFullCode: string, projectCode: string): boolean => {
    if (!zone1 || !zone2) return false
    
    const z1 = zone1.trim()
    const z2 = zone2.trim()
    
    // Strategy 1: Exact match (case-insensitive)
    if (z1.toLowerCase() === z2.toLowerCase()) {
      if (showDebug) console.log(`✅ Zone exact match: "${z1}" === "${z2}"`)
      return true
    }
    
    // Strategy 2: Normalize both and compare (using Project Full Code first!)
    const normalized1 = normalizeZone(zone1, projectFullCode, projectCode)
    const normalized2 = normalizeZone(zone2, projectFullCode, projectCode)
    if (normalized1 && normalized2 && normalized1 === normalized2) {
      if (showDebug) console.log(`✅ Zone normalized match: "${normalized1}" === "${normalized2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    // Strategy 3: Extract zone numbers and compare
    const zoneNum1 = extractZoneNumber(normalized1 || z1)
    const zoneNum2 = extractZoneNumber(normalized2 || z2)
    if (zoneNum1 && zoneNum2 && zoneNum1 === zoneNum2) {
      if (showDebug) console.log(`✅ Zone number match: "${zoneNum1}" === "${zoneNum2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    // Strategy 4: Extract zone numbers from original strings (before normalization)
    const originalZoneNum1 = extractZoneNumber(z1)
    const originalZoneNum2 = extractZoneNumber(z2)
    if (originalZoneNum1 && originalZoneNum2 && originalZoneNum1 === originalZoneNum2) {
      if (showDebug) console.log(`✅ Zone original number match: "${originalZoneNum1}" === "${originalZoneNum2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    // Strategy 5: Check if one zone contains the other (after normalization)
    if (normalized1 && normalized2) {
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        if (showDebug) console.log(`✅ Zone contains match: "${normalized1}" contains "${normalized2}" or vice versa`)
        return true
      }
    }
    
    if (showDebug) console.log(`❌ Zone no match: "${z1}" vs "${z2}" (normalized: "${normalized1}" vs "${normalized2}")`)
    return false
  }

  /**
   * Parse quantity from KPI record
   */
  const parseQuantity = (kpi: any): number => {
    const quantity = kpi['Quantity']
    if (quantity === null || quantity === undefined || quantity === '') return 0
    
    const qty = parseFloat(String(quantity).replace(/,/g, ''))
    return isNaN(qty) ? 0 : qty
  }

  /**
   * Fetch and calculate KPI data
   */
  const fetchKPIData = async () => {
    try {
      setLoading(true)
      setError('')

      const { getSupabaseClient, executeQuery } = await import('@/lib/simpleConnectionManager')
      const { TABLES } = await import('@/lib/supabase')
      const supabase = getSupabaseClient()

      // ✅ Get Project Full Code (critical for projects with same code but different sub codes)
      const projectFullCodeToUse = projectFullCode || 
                                   selectedProject.project_full_code || 
                                   selectedProject.project_code || ''
      
      const projectCode = selectedProject.project_code || ''
      
      // ✅ Get Activity Name
      const activityName = (selectedActivity.activity_name || 
                           selectedActivity.activity || 
                           '').toLowerCase().trim()
      
      if (!activityName) {
        throw new Error('Activity name is required')
      }

      // ✅ Prepare zone matching data
      // IMPORTANT: P5066-I2 means:
      // - P5066 = Project Code
      // - I2 = Sub Code (NOT Zone 2!)
      // - So Project Full Code = "P5066-I2"
      // - Zone = "1" (the part after Project Full Code)
      const originalZone = zone ? zone.trim() : ''
      // ✅ Use Project Full Code FIRST to normalize zone (this handles "P5066-I2 - 1" correctly)
      const normalizedZone = zone ? normalizeZone(zone, projectFullCodeToUse, projectCode) : ''
      const zoneNumber = normalizedZone ? extractZoneNumber(normalizedZone) : ''
      
      if (showDebug && zone) {
        console.log(`🔍 Zone normalization:`, {
          original: originalZone,
          projectFullCode: projectFullCodeToUse,
          projectCode: projectCode,
          normalized: normalizedZone,
          zoneNumber: zoneNumber
        })
      }

      // ============================================
      // Fetch Planned KPIs
      // ============================================
      let plannedKPIs: any[] = []
      try {
        // ✅ Fetch all Planned KPIs first (we'll filter client-side for better control)
        let query = supabase
          .from(TABLES.KPI)
          .select('id, "Quantity", "Input Type", "Zone", "Zone Number", "Activity Name", "Project Full Code", "Project Code"')
          .eq('Input Type', 'Planned')
        
        // Try to filter by Project Full Code in query (but don't rely on it alone)
        if (projectFullCodeToUse) {
          query = query.eq('Project Full Code', projectFullCodeToUse)
        }
        
        const result = await executeQuery(async () => query)
        plannedKPIs = result.data || []

        console.log(`📊 Planned KPIs before filtering: ${plannedKPIs.length}`, {
          projectFullCodeToUse,
          activityName,
          zone: originalZone
        })

        // ✅ Filter by Project Full Code (client-side - more reliable)
        if (projectFullCodeToUse) {
          const beforeCount = plannedKPIs.length
          const targetFullCode = projectFullCodeToUse.toString().trim().toUpperCase()
          plannedKPIs = plannedKPIs.filter((kpi: any) => {
            const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
            const matches = kpiFullCode === targetFullCode
            if (!matches && showDebug) {
              console.log(`❌ Project Full Code mismatch: KPI="${kpiFullCode}" vs Target="${targetFullCode}"`)
            }
            return matches
          })
          console.log(`📊 After Project Full Code filter: ${plannedKPIs.length} (was ${beforeCount})`)
        }

        // ✅ Filter by Activity Name (flexible matching)
        const beforeActivityCount = plannedKPIs.length
        plannedKPIs = plannedKPIs.filter((kpi: any) => {
          const kpiActivityName = (kpi['Activity Name'] || '').toLowerCase().trim()
          const matches = kpiActivityName === activityName ||
                         kpiActivityName.includes(activityName) ||
                         activityName.includes(kpiActivityName)
          if (!matches && showDebug) {
            console.log(`❌ Activity Name mismatch: KPI="${kpiActivityName}" vs Target="${activityName}"`)
          }
          return matches
        })
        console.log(`📊 After Activity Name filter: ${plannedKPIs.length} (was ${beforeActivityCount})`)

        // ✅ Filter by Zone (if provided)
        if (zone && zone.trim() !== '') {
          const beforeZoneCount = plannedKPIs.length
          plannedKPIs = plannedKPIs.filter((kpi: any) => {
            const kpiZoneRaw = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
            
            // Exclude KPIs without zone if zone filter is active
            if (!kpiZoneRaw || kpiZoneRaw === '') {
              if (showDebug) console.log(`❌ KPI has no zone, excluding`)
              return false
            }
            
            // ✅ Use Project Full Code for zone matching (important for correct normalization)
            const matches = zonesMatch(originalZone, kpiZoneRaw, projectFullCodeToUse, projectCode)
            
            if (!matches && showDebug) {
              console.log(`❌ Zone mismatch: KPI="${kpiZoneRaw}" vs Target="${originalZone}" (normalized="${normalizedZone}")`)
            }
            return matches
          })
          console.log(`📊 After Zone filter: ${plannedKPIs.length} (was ${beforeZoneCount})`)
        }
        // If zone is empty, keep all KPIs (no zone filtering)

      } catch (err: any) {
        console.error('❌ Error fetching Planned KPIs:', err)
        // Continue with empty array
      }

      // ============================================
      // Fetch Actual KPIs
      // ============================================
      let actualKPIs: any[] = []
      try {
        // ✅ Fetch all Actual KPIs first (we'll filter client-side for better control)
        let query = supabase
          .from(TABLES.KPI)
          .select('id, "Quantity", "Input Type", "Zone", "Zone Number", "Activity Name", "Project Full Code", "Project Code"')
          .eq('Input Type', 'Actual')
        
        // Try to filter by Project Full Code in query (but don't rely on it alone)
        if (projectFullCodeToUse) {
          query = query.eq('Project Full Code', projectFullCodeToUse)
        }
        
        const result = await executeQuery(async () => query)
        actualKPIs = result.data || []

        console.log(`📊 Actual KPIs before filtering: ${actualKPIs.length}`, {
          projectFullCodeToUse,
          activityName,
          zone: originalZone
        })

        // ✅ Filter by Project Full Code (client-side - more reliable)
        if (projectFullCodeToUse) {
          const beforeCount = actualKPIs.length
          const targetFullCode = projectFullCodeToUse.toString().trim().toUpperCase()
          actualKPIs = actualKPIs.filter((kpi: any) => {
            const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
            const matches = kpiFullCode === targetFullCode
            if (!matches && showDebug) {
              console.log(`❌ Project Full Code mismatch: KPI="${kpiFullCode}" vs Target="${targetFullCode}"`)
            }
            return matches
          })
          console.log(`📊 After Project Full Code filter: ${actualKPIs.length} (was ${beforeCount})`)
        }

        // ✅ Filter by Activity Name (flexible matching)
        const beforeActivityCount = actualKPIs.length
        actualKPIs = actualKPIs.filter((kpi: any) => {
          const kpiActivityName = (kpi['Activity Name'] || '').toLowerCase().trim()
          const matches = kpiActivityName === activityName ||
                         kpiActivityName.includes(activityName) ||
                         activityName.includes(kpiActivityName)
          if (!matches && showDebug) {
            console.log(`❌ Activity Name mismatch: KPI="${kpiActivityName}" vs Target="${activityName}"`)
          }
          return matches
        })
        console.log(`📊 After Activity Name filter: ${actualKPIs.length} (was ${beforeActivityCount})`)

        // ✅ Filter by Zone (if provided)
        if (zone && zone.trim() !== '') {
          const beforeZoneCount = actualKPIs.length
          actualKPIs = actualKPIs.filter((kpi: any) => {
            const kpiZoneRaw = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
            
            // Exclude KPIs without zone if zone filter is active
            if (!kpiZoneRaw || kpiZoneRaw === '') {
              if (showDebug) console.log(`❌ KPI has no zone, excluding`)
              return false
            }
            
            // ✅ Use Project Full Code for zone matching (important for correct normalization)
            const matches = zonesMatch(originalZone, kpiZoneRaw, projectFullCodeToUse, projectCode)
            
            if (!matches && showDebug) {
              console.log(`❌ Zone mismatch: KPI="${kpiZoneRaw}" vs Target="${originalZone}" (normalized="${normalizedZone}")`)
            }
            return matches
          })
          console.log(`📊 After Zone filter: ${actualKPIs.length} (was ${beforeZoneCount})`)
        }
        // If zone is empty, keep all KPIs (no zone filtering)

      } catch (err: any) {
        console.error('❌ Error fetching Actual KPIs:', err)
        // Continue with empty array
      }

      // ============================================
      // Calculate Totals
      // ============================================
      const totalPlanned = plannedKPIs.reduce((sum, kpi) => {
        return sum + parseQuantity(kpi)
      }, 0)
      
      const totalActual = actualKPIs.reduce((sum, kpi) => {
        return sum + parseQuantity(kpi)
      }, 0)
      
      const remaining = Math.max(0, totalPlanned - totalActual)
      const progress = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

      setTotals({
        totalPlanned,
        totalActual,
        remaining,
        progress
      })

      // ✅ Pass totals to parent component if callback provided
      if (onTotalsChange) {
        onTotalsChange({
          totalPlanned,
          totalActual,
          remaining,
          progress
        })
      }

      // ✅ Always log in development mode for debugging
      console.log('🔍 Enhanced Quantity Summary - Final Results:', {
        activity: selectedActivity.activity_name,
        activityName: activityName,
        project: selectedProject.project_code,
        projectFullCode: projectFullCodeToUse,
        zone: zone || 'N/A (showing all zones)',
        normalizedZone: normalizedZone || 'N/A',
        zoneNumber: zoneNumber || 'N/A',
        originalZone: originalZone || 'N/A',
        plannedKPIsCount: plannedKPIs.length,
        actualKPIsCount: actualKPIs.length,
        totalPlanned,
        totalActual,
        remaining,
        progress,
        samplePlanned: plannedKPIs.slice(0, 5).map(kpi => ({
          quantity: kpi['Quantity'],
          activityName: kpi['Activity Name'] || 'N/A',
          projectFullCode: kpi['Project Full Code'] || 'N/A',
          projectCode: kpi['Project Code'] || 'N/A',
          zone: kpi['Zone'] || 'N/A',
          zoneNumber: kpi['Zone Number'] || 'N/A'
        })),
        sampleActual: actualKPIs.slice(0, 5).map(kpi => ({
          quantity: kpi['Quantity'],
          activityName: kpi['Activity Name'] || 'N/A',
          projectFullCode: kpi['Project Full Code'] || 'N/A',
          projectCode: kpi['Project Code'] || 'N/A',
          zone: kpi['Zone'] || 'N/A',
          zoneNumber: kpi['Zone Number'] || 'N/A'
        }))
      })

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

  // Calculate with new quantity (if provided)
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

  // Loading state
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

  // Error state
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

  // Main display
  return (
    <div className="mt-2 p-2 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-1 mb-1">
          <Target className="h-3 w-3 text-blue-600" />
          <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Quantity Summary</h3>
          {zone && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
              Zone: {zone}
            </span>
          )}
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

        {/* Progress Bar */}
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

        {/* Unit display */}
        {unit && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Unit: {unit}
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedQuantitySummary

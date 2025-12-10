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
  allKPIs?: any[] // ✅ Optional: Pre-fetched KPIs from parent (to avoid duplicate fetching)
  onTotalsChange?: (totals: {totalPlanned: number, totalActual: number, remaining: number, progress: number}) => void // ✅ Callback to pass totals to parent
  // ✅ CRITICAL FIX: Accept pre-calculated values from parent to ensure consistency
  preCalculatedDone?: number
  preCalculatedTotal?: number
  preCalculatedPlanned?: number
}

export function EnhancedQuantitySummary({
  selectedActivity,
  selectedProject,
  newQuantity = 0,
  unit = '',
  showDebug = process.env.NODE_ENV === 'development', // Auto-enable in development
  zone,
  projectFullCode,
  allKPIs: providedKPIs, // ✅ Optional: Pre-fetched KPIs from parent
  onTotalsChange, // ✅ Callback to pass totals to parent
  preCalculatedDone, // ✅ Pre-calculated Done from parent (getActivityQuantities)
  preCalculatedTotal, // ✅ Pre-calculated Total from parent (getActivityQuantities)
  preCalculatedPlanned // ✅ Pre-calculated Planned from parent (getActivityQuantities)
}: EnhancedQuantitySummaryProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totals, setTotals] = useState({
    total: 0, // ✅ Total from BOQ Activity (total_units or planned_units)
    totalPlanned: 0, // Planned from Planned KPIs until yesterday
    totalActual: 0, // Actual from Actual KPIs until yesterday
    remaining: 0,
    progress: 0
  })

  useEffect(() => {
    // ✅ If pre-calculated values are provided, use them directly (no need to fetch)
    if (preCalculatedTotal !== undefined && preCalculatedDone !== undefined && preCalculatedPlanned !== undefined) {
      const totalActual = preCalculatedDone + (newQuantity > 0 ? newQuantity : 0)
      const remaining = Math.max(0, preCalculatedTotal - totalActual)
      const progress = preCalculatedTotal > 0 ? Math.round((totalActual / preCalculatedTotal) * 100) : 0
      
      setTotals({
        total: preCalculatedTotal,
        totalPlanned: preCalculatedPlanned,
        totalActual: preCalculatedDone, // Base done (will add newQuantity in display)
        remaining,
        progress
      })
      
      // Pass totals to parent if callback provided
      if (onTotalsChange) {
        onTotalsChange({
          totalPlanned: preCalculatedTotal,
          totalActual: preCalculatedDone,
          remaining,
          progress
        })
      }
      
      setLoading(false)
      setError('')
    } else {
      // Fallback: Fetch and calculate locally
      fetchKPIData()
    }
  }, [selectedActivity, selectedProject, zone, projectFullCode, providedKPIs, preCalculatedTotal, preCalculatedDone, preCalculatedPlanned, newQuantity, onTotalsChange])

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
   * ✅ ENHANCED for P5073: Handles zones like "P5073 - Parking", "Parking-Side-A", etc.
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
    
    // ✅ Strategy 2: Extract FULL zone name after removing project code
    // ✅ CRITICAL: "Parking-Side-A" is the FULL zone name - don't split it!
    // For P5073: "P5073 - Parking-Side-A" -> "Parking-Side-A" (FULL zone name, not split!)
    const extractFullZoneName = (zoneStr: string, projCode: string, projFullCode: string): string => {
      let zone = zoneStr.trim()
      
      // ✅ CRITICAL: Remove project code prefix ONLY, keep the FULL zone name
      // Handle "P5073 - Parking-Side-A" -> "Parking-Side-A" (keep FULL zone name)
      if (projFullCode) {
        // Try "P5073 - " pattern first (most common format)
        const fullCodePattern1 = new RegExp(`^${projFullCode}\\s*-\\s*`, 'i')
        if (fullCodePattern1.test(zone)) {
          const extracted = zone.replace(fullCodePattern1, '').trim()
          if (showDebug) console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projFullCode} - ")`)
          return extracted.toLowerCase().trim()
        }
        // Try "P5073 " pattern
        const fullCodePattern2 = new RegExp(`^${projFullCode}\\s+`, 'i')
        if (fullCodePattern2.test(zone)) {
          const extracted = zone.replace(fullCodePattern2, '').trim()
          if (showDebug) console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projFullCode} ")`)
          return extracted.toLowerCase().trim()
        }
        // Try "P5073-" pattern
        const fullCodePattern3 = new RegExp(`^${projFullCode}-`, 'i')
        if (fullCodePattern3.test(zone)) {
          const extracted = zone.replace(fullCodePattern3, '').trim()
          if (showDebug) console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projFullCode}-")`)
          return extracted.toLowerCase().trim()
        }
      }
      
      // Try with project code only
      if (projCode) {
        const codePattern1 = new RegExp(`^${projCode}\\s*-\\s*`, 'i')
        if (codePattern1.test(zone)) {
          const extracted = zone.replace(codePattern1, '').trim()
          if (showDebug) console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projCode} - ")`)
          return extracted.toLowerCase().trim()
        }
        const codePattern2 = new RegExp(`^${projCode}\\s+`, 'i')
        if (codePattern2.test(zone)) {
          const extracted = zone.replace(codePattern2, '').trim()
          if (showDebug) console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projCode} ")`)
          return extracted.toLowerCase().trim()
        }
        const codePattern3 = new RegExp(`^${projCode}-`, 'i')
        if (codePattern3.test(zone)) {
          const extracted = zone.replace(codePattern3, '').trim()
          if (showDebug) console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projCode}-")`)
          return extracted.toLowerCase().trim()
        }
      }
      
      // If no project code found, return zone as-is (it's already the full zone name)
      if (showDebug) console.log(`🔍 [extractFullZoneName] No project code found in "${zone}", using as-is`)
      return zone.toLowerCase().trim()
    }
    
    // ✅ Extract FULL zone names (e.g., "Parking-Side-A" stays as "Parking-Side-A", not split!)
    const fullZoneName1 = extractFullZoneName(z1, projectCode, projectFullCode)
    const fullZoneName2 = extractFullZoneName(z2, projectCode, projectFullCode)
    
    // ✅ Strategy 3: Compare FULL zone names after removing project code
    // This handles "P5073 - Parking-Side-A" vs "Parking-Side-A" -> both become "Parking-Side-A"
    if (fullZoneName1 && fullZoneName2 && fullZoneName1 === fullZoneName2) {
      if (showDebug) console.log(`✅ Zone full name match: "${fullZoneName1}" === "${fullZoneName2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    // Strategy 3: Normalize both and compare (using Project Full Code first!)
    const normalized1 = normalizeZone(zone1, projectFullCode, projectCode)
    const normalized2 = normalizeZone(zone2, projectFullCode, projectCode)
    if (normalized1 && normalized2 && normalized1 === normalized2) {
      if (showDebug) console.log(`✅ Zone normalized match: "${normalized1}" === "${normalized2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    
    // Strategy 5: Extract zone numbers and compare
    const zoneNum1 = extractZoneNumber(normalized1 || z1)
    const zoneNum2 = extractZoneNumber(normalized2 || z2)
    if (zoneNum1 && zoneNum2 && zoneNum1 === zoneNum2) {
      if (showDebug) console.log(`✅ Zone number match: "${zoneNum1}" === "${zoneNum2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    // Strategy 6: Check if one zone contains the other (after normalization)
    // ⚠️ CRITICAL: Only match if they're exactly the same after normalization
    // Disable "contains" matching to avoid false matches (e.g., "Parking" should NOT match "Parking-Side-B")
    // if (normalized1 && normalized2) {
    //   if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    //     if (showDebug) console.log(`✅ Zone contains match: "${normalized1}" contains "${normalized2}" or vice versa (from "${z1}" and "${z2}")`)
    //     return true
    //   }
    // }
    
    // ✅ Strategy 7: Check if zone names contain each other (for P5073 - Parking-Side-A vs Parking)
    // ⚠️ CRITICAL: This strategy is DISABLED for P5073 to avoid false matches
    // For example, "Parking" should NOT match "Parking-Side-B" - they are different zones!
    // Only use exact matches or normalized matches to ensure zone-specific filtering works correctly
    // if (zoneName1 && zoneName2) {
    //   if (zoneName1.includes(zoneName2) || zoneName2.includes(zoneName1)) {
    //     // But only if they're not too different (avoid false matches)
    //     const minLength = Math.min(zoneName1.length, zoneName2.length)
    //     const maxLength = Math.max(zoneName1.length, zoneName2.length)
    //     // Only match if the shorter one is at least 50% of the longer one
    //     if (minLength >= maxLength * 0.5) {
    //       if (showDebug) console.log(`✅ Zone name contains match: "${zoneName1}" contains "${zoneName2}" or vice versa (from "${z1}" and "${z2}")`)
    //       return true
    //     }
    //   }
    // }
    
    if (showDebug) console.log(`❌ Zone no match: "${z1}" vs "${z2}" (full zone names: "${fullZoneName1}" vs "${fullZoneName2}", normalized: "${normalized1}" vs "${normalized2}")`)
    return false
  }

  /**
   * Parse quantity from KPI record (SAME as getKPIQuantity in EnhancedSmartActualKPIForm)
   */
  const parseQuantity = (kpi: any): number => {
    const raw = (kpi as any).raw || {}
    const quantityStr = String(
      kpi.quantity || 
      kpi['Quantity'] || 
      kpi.Quantity ||
      raw['Quantity'] || 
      raw.Quantity ||
      '0'
    ).replace(/,/g, '').trim()
    return parseFloat(quantityStr) || 0
  }

  /**
   * Check if KPI date is until yesterday (like BOQ)
   */
  const isKPIUntilYesterday = (kpi: any, inputType: 'planned' | 'actual'): boolean => {
    const rawKPI = (kpi as any).raw || {}
    
    // Calculate yesterday date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999) // End of yesterday
    
    // Get date based on input type
    let kpiDateStr = ''
    if (inputType === 'planned') {
      kpiDateStr = rawKPI['Date'] ||
                  kpi.date ||
                  kpi.target_date || 
                  kpi.activity_date || 
                  rawKPI['Target Date'] || 
                  rawKPI['Activity Date'] ||
                  kpi['Target Date'] || 
                  kpi['Activity Date'] ||
                  kpi.created_at ||
                  ''
    } else {
      kpiDateStr = kpi.actual_date || 
                  kpi.activity_date || 
                  kpi['Actual Date'] || 
                  kpi['Activity Date'] || 
                  rawKPI['Actual Date'] || 
                  rawKPI['Activity Date'] ||
                  kpi.created_at ||
                  ''
    }
    
    // If no date, include it (assume valid)
    if (!kpiDateStr) return true
    
    try {
      const kpiDate = new Date(kpiDateStr)
      if (isNaN(kpiDate.getTime())) return true // Include if invalid date
      return kpiDate <= yesterday
    } catch {
      return true // Include if date parsing fails
    }
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
      
      // ✅ Get Activity Name (EXACT match - case-insensitive)
      const activityName = (selectedActivity.activity_name || 
                           selectedActivity.activity || 
                           '').toLowerCase().trim() // ✅ Normalize to lowercase for consistent matching
      
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
      
      // ✅ Get zone to use for matching (use prop zone if provided, otherwise use activity zone)
      // This should be defined early so it's available throughout the function
      const zoneToUseForMatching = zone || (selectedActivity.zone_ref || selectedActivity.zone_number || '').toString().trim()
      
      console.log(`🔍 [EnhancedQuantitySummary] Activity: "${activityName}"`, {
        projectFullCode: projectFullCodeToUse,
        zone: originalZone,
        zoneToUseForMatching: zoneToUseForMatching,
        activityId: selectedActivity.id
      })
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
      // ✅ UPDATED: Fetch Planned KPIs - Calculate Planned from Planned KPIs until yesterday (like BOQ)
      // ============================================
      let plannedKPIs: any[] = []
      try {
        // ✅ Fetch all Planned KPIs first (we'll filter client-side for better control)
        let query = supabase
          .from(TABLES.KPI)
          .select('id, "Quantity", "Input Type", "Zone", "Zone Number", "Activity Name", "Project Full Code", "Project Code", "Date", "Target Date", "Activity Date", created_at, input_type, quantity, date, target_date, activity_date, project_code, project_full_code, activity_name')
          .eq('Input Type', 'Planned')
        
        // Try to filter by Project Full Code in query (but don't rely on it alone)
        if (projectFullCodeToUse) {
          query = query.eq('Project Full Code', projectFullCodeToUse)
        }
        
        const result = await executeQuery(async () => query)
        plannedKPIs = result.data || []

        // ✅ Filter by Project Full Code (client-side - more reliable)
        if (projectFullCodeToUse) {
          const targetFullCode = projectFullCodeToUse.toString().trim().toUpperCase()
          plannedKPIs = plannedKPIs.filter((kpi: any) => {
            const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
            return kpiFullCode === targetFullCode
          })
        }

        // ✅ Filter by Activity Name (STRICT matching - exact match only, case-insensitive)
        plannedKPIs = plannedKPIs.filter((kpi: any) => {
          const kpiActivityName = (kpi['Activity Name'] || '').toLowerCase().trim() // ✅ Normalize to lowercase
          // ✅ CRITICAL FIX: Use EXACT match (case-insensitive) to prevent matching different activities
          const activityNameMatch = kpiActivityName === activityName
          if (!activityNameMatch) return false
          
          // ✅ Additional check: Verify KPI belongs to this specific activity by checking project
          const kpiProjectFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
          const targetProjectFullCode = projectFullCodeToUse.toString().trim().toUpperCase()
          return kpiProjectFullCode === targetProjectFullCode
        })

        // ✅ CRITICAL FIX: Filter by Zone (if provided) - MUST filter for zone-specific quantities
        // For project P5073 and others, if zone is provided, ONLY show KPIs for that zone
        // If zone is not provided (undefined), show all zones (project totals)
        if (zone && zone.trim() !== '') {
          const beforeZoneFilter = plannedKPIs.length
          plannedKPIs = plannedKPIs.filter((kpi: any) => {
            const kpiZoneRaw = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
            if (!kpiZoneRaw || kpiZoneRaw === '') {
              // ✅ CRITICAL: If zone is provided but KPI has no zone, exclude it
              // This ensures zone-specific filtering works correctly
              if (showDebug) {
                console.log(`❌ [EnhancedQuantitySummary] Planned KPI excluded: Zone provided="${zone}" but KPI has no zone`)
              }
              return false
            }
            // ✅ Use zone prop (formatted) for matching - zonesMatch will normalize internally
            const matches = zonesMatch(zone, kpiZoneRaw, projectFullCodeToUse, projectCode)
            if (showDebug && !matches) {
              console.log(`❌ [EnhancedQuantitySummary] Planned KPI zone mismatch: Target="${zone}" vs KPI="${kpiZoneRaw}"`)
            }
            return matches
          })
          if (showDebug) {
            console.log(`🔍 [EnhancedQuantitySummary] Zone filter for Planned KPIs: ${beforeZoneFilter} → ${plannedKPIs.length} (zone="${zone}")`)
          }
        } else {
          if (showDebug) {
            console.log(`ℹ️ [EnhancedQuantitySummary] No zone filter applied for Planned KPIs - showing all zones (project totals)`)
          }
        }
      } catch (err: any) {
        console.error('❌ Error fetching Planned KPIs:', err)
        // Continue with empty array
      }

      // ============================================
      // ✅ COMPLETELY REWRITTEN: Fetch and Filter Actual KPIs for DONE calculation
      // Uses EXACT same logic as kpiMatchesActivityStrict from EnhancedSmartActualKPIForm
      // ============================================
      let actualKPIs: any[] = []
      
      try {
        // Step 1: Use provided KPIs if available, otherwise fetch from database
        let allKPIs: any[] = []
        
        if (providedKPIs && providedKPIs.length > 0) {
          // ✅ Use pre-fetched KPIs from parent (EnhancedSmartActualKPIForm)
          allKPIs = providedKPIs
          console.log(`📊 [EnhancedQuantitySummary] Using ${allKPIs.length} pre-fetched KPIs from parent`, {
            sampleKPIs: allKPIs.slice(0, 3).map((kpi: any) => ({
              id: kpi.id,
              inputType: kpi['Input Type'] || kpi.input_type,
              activityName: kpi['Activity Name'] || kpi.activity_name,
              projectFullCode: kpi['Project Full Code'] || kpi.project_full_code,
              zone: kpi['Zone'] || kpi['Zone Number']
            }))
          })
        } else {
          // Fetch KPIs from database (same approach as EnhancedSmartActualKPIForm)
          let query = supabase
            .from(TABLES.KPI)
            .select('id, "Quantity", "Input Type", "Zone", "Zone Number", "Activity Name", "Project Full Code", "Project Code", "Date", "Target Date", "Activity Date", "Actual Date", created_at, input_type, quantity, date, target_date, activity_date, actual_date, project_code, project_full_code, activity_name')
          
          // Optional: Filter by Project Full Code in query (but we'll verify client-side)
          if (projectFullCodeToUse) {
            query = query.eq('Project Full Code', projectFullCodeToUse)
          }
          
          const result = await executeQuery(async () => query)
          allKPIs = result.data || []
          
          console.log(`📊 [EnhancedQuantitySummary] Fetched ${allKPIs.length} KPIs from database`, {
            projectFullCodeToUse,
            hasData: !!result.data,
            error: result.error
          })
          
          // Client-side filter to ensure exact Project Full Code match (if provided)
          if (projectFullCodeToUse && allKPIs.length > 0) {
            const targetFullCode = projectFullCodeToUse.toString().trim().toUpperCase()
            const beforeFilter = allKPIs.length
            allKPIs = allKPIs.filter((kpi: any) => {
              const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
              return kpiFullCode === targetFullCode
            })
            console.log(`📊 [EnhancedQuantitySummary] After Project Full Code filter: ${allKPIs.length} (from ${beforeFilter})`)
          }
        }
        
        // Step 2: Filter Actual KPIs and match to activity (EXACT same logic as getActivityQuantities)
        // ✅ Use EXACT same approach as EnhancedSmartActualKPIForm.getActivityQuantities
        const allActualKPIs = allKPIs.filter((kpi: any) => {
          const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
          return inputType === 'actual'
        })
        
        console.log(`📊 [EnhancedQuantitySummary] Found ${allActualKPIs.length} Actual KPIs (from ${allKPIs.length} total KPIs)`)
        
        // ✅ CRITICAL: Use EXACT same matching logic as kpiMatchesActivityStrict
        // Create helper function that matches kpiMatchesActivityStrict from EnhancedSmartActualKPIForm
        const projectFullCode = projectFullCodeToUse.toString().trim().toUpperCase()
        const projectCodeValue = projectCode.toString().trim().toUpperCase()
        
        // ✅ zoneToUseForMatching is already defined above
        
        const kpiMatchesActivity = (kpi: any): boolean => {
          const rawKPI = (kpi as any).raw || {}
          
          // 1. Project Code Matching (EXACT same as kpiMatchesActivityStrict)
          const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
          const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
          const activityProjectCode = (selectedActivity.project_code || '').toString().trim().toUpperCase()
          const activityProjectFullCode = (selectedActivity.project_full_code || selectedActivity.project_code || '').toString().trim().toUpperCase()
          
          let projectMatch = false
          if (activityProjectFullCode && activityProjectFullCode.includes('-')) {
            // Activity has sub-code - KPI MUST have EXACT Project Full Code match
            if (kpiProjectFullCode && kpiProjectFullCode === activityProjectFullCode) {
              projectMatch = true
            }
          } else {
            // Activity has no sub-code - Match by Project Code or Project Full Code
            projectMatch = (
              (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
              (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
              (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
              (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
            )
          }
          
          if (!projectMatch) {
            if (showDebug) {
              console.log(`❌ [EnhancedQuantitySummary] Project mismatch:`, {
                kpiProjectCode,
                kpiProjectFullCode,
                activityProjectCode,
                activityProjectFullCode
              })
            }
            return false
          }
          
          // 2. Activity Name Matching (EXACT same as kpiMatchesActivityStrict)
          const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
          const activityMatch = kpiActivityName && activityName && kpiActivityName === activityName
          if (!activityMatch) {
            if (showDebug) {
              console.log(`❌ [EnhancedQuantitySummary] Activity name mismatch: KPI="${kpiActivityName}" vs Activity="${activityName}"`)
            }
            return false
          }
          
          // 3. Zone Matching (EXACT same as kpiMatchesActivityStrict)
          // ✅ CRITICAL FIX: Use zone prop if provided (from parent), otherwise use activity.zone_ref || activity.zone_number
          // This ensures zone-specific filtering works correctly for project P5073 and others
          // ✅ CRITICAL: Use Zone column ONLY, NOT Section column!
          // Zone is stored in "Zone" or "Zone Number" columns in database
          // Section is a separate field and should NOT be used for zone matching
          const kpiZoneRaw = (kpi['Zone'] || kpi['Zone Number'] || rawKPI['Zone'] || rawKPI['Zone Number'] || kpi.zone || kpi.zone_number || '').toString().trim()
          
          // ✅ Priority: Use zone prop (from parent) if provided, otherwise use activity zone
          const zoneToMatch = zone ? zone : (selectedActivity.zone_ref || selectedActivity.zone_number || '').toString().trim()
          
          // ✅ DEBUG: Log zone values to ensure we're using Zone and not Section
          if (showDebug) {
            console.log(`🔍 [EnhancedQuantitySummary] Zone matching:`, {
              kpiId: kpi.id,
              kpiZoneFromZone: kpi['Zone'] || 'NONE',
              kpiZoneFromZoneNumber: kpi['Zone Number'] || 'NONE',
              kpiZoneFromRaw: rawKPI['Zone'] || 'NONE',
              kpiZoneFromRawZoneNumber: rawKPI['Zone Number'] || 'NONE',
              kpiZoneFinal: kpiZoneRaw || 'NONE',
              kpiSection: kpi['Section'] || kpi.section || 'NONE (not used)',
              zoneToMatch: zoneToMatch || 'NONE',
              activityZone: (selectedActivity.zone_ref || selectedActivity.zone_number || '').toString().trim() || 'NONE'
            })
          }
          
          if (zoneToMatch && zoneToMatch.trim() !== '' && zoneToMatch !== '0' && zoneToMatch !== 'Enabling Division') {
            // ✅ CRITICAL: Zone is specified - KPI MUST have zone and they MUST match
            // This ensures zone-specific filtering (for project P5073 and others)
            if (!kpiZoneRaw || kpiZoneRaw.trim() === '') {
              if (showDebug) {
                console.log(`❌ [EnhancedQuantitySummary] Zone mismatch: Zone specified="${zoneToMatch}" but KPI has no zone`, {
                  kpiId: kpi.id,
                  kpiActivityName: (kpi.activity_name || kpi['Activity Name'] || '').toLowerCase().trim(),
                  kpiProjectFullCode: (kpi.project_full_code || kpi['Project Full Code'] || '').toString().trim().toUpperCase()
                })
              }
              return false
            }
            // Use zonesMatch for accurate zone matching (EXACT same as kpiMatchesActivityStrict)
            const zoneMatch = zonesMatch(zoneToMatch, kpiZoneRaw, projectFullCode, projectCodeValue)
            if (!zoneMatch) {
              if (showDebug) {
                console.log(`❌ [EnhancedQuantitySummary] Zone mismatch: Target="${zoneToMatch}" vs KPI="${kpiZoneRaw}"`, {
                  kpiId: kpi.id,
                  kpiActivityName: (kpi.activity_name || kpi['Activity Name'] || '').toLowerCase().trim(),
                  projectFullCode,
                  projectCode: projectCodeValue,
                  normalizedTarget: normalizeZone(zoneToMatch, projectFullCode, projectCodeValue),
                  normalizedKPI: normalizeZone(kpiZoneRaw, projectFullCode, projectCodeValue)
                })
              }
            } else if (showDebug) {
              console.log(`✅ [EnhancedQuantitySummary] Zone match: Target="${zoneToMatch}" === KPI="${kpiZoneRaw}"`)
            }
            return zoneMatch
          }
          
          // ✅ If no zone specified, accept KPI (with or without zone) - shows project totals
          if (showDebug && kpiZoneRaw) {
            console.log(`ℹ️ [EnhancedQuantitySummary] No zone specified, accepting KPI with zone="${kpiZoneRaw}" (showing project totals)`)
          }
          return true
        }
        
        // Filter KPIs to match THIS activity only (strict matching - EXACT same as getActivityQuantities)
        // ✅ Add detailed logging to understand why KPIs are not matching
        const matchingResults: any[] = []
        actualKPIs = allActualKPIs.filter((kpi: any) => {
          const matches = kpiMatchesActivity(kpi)
          if (!matches && showDebug && allActualKPIs.length <= 10) {
            // Log why this KPI didn't match (only for first 10 KPIs to avoid spam)
            const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || '').toString().trim().toUpperCase()
            const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || '').toLowerCase().trim()
            const kpiZoneRaw = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
            
            matchingResults.push({
              kpiId: kpi.id,
              kpiActivityName,
              kpiProjectCode,
              kpiProjectFullCode,
              kpiZone: kpiZoneRaw,
              targetActivityName: activityName,
              targetProjectFullCode: projectFullCodeToUse,
              targetZone: zoneToUseForMatching || 'N/A',
              quantity: parseQuantity(kpi)
            })
          }
          return matches
        })
        
        console.log(`✅ [EnhancedQuantitySummary] Filtered to ${actualKPIs.length} matching Actual KPIs (from ${allActualKPIs.length} total Actual KPIs)`, {
          activityName,
          projectFullCode: projectFullCodeToUse,
          zone: zoneToUseForMatching || 'N/A',
          totalKPIs: allKPIs.length,
          actualKPIsBeforeFilter: allActualKPIs.length,
          actualKPIsAfterFilter: actualKPIs.length
        })
        
        // Log sample of filtered KPIs
        if (actualKPIs.length > 0) {
          console.log(`📋 ✅ Matching KPIs (${actualKPIs.length} total):`, actualKPIs.slice(0, 5).map((kpi: any) => ({
            id: kpi.id,
            activityName: kpi['Activity Name'],
            quantity: parseQuantity(kpi),
            projectFullCode: kpi['Project Full Code'],
            zone: kpi['Zone'],
            actualDate: kpi['Actual Date'] || kpi.actual_date || 'N/A'
          })))
        } else if (allActualKPIs.length > 0) {
          console.log(`⚠️ [EnhancedQuantitySummary] No KPIs matched!`, {
            totalActualKPIs: allActualKPIs.length,
            sampleKPIs: allActualKPIs.slice(0, 5).map((kpi: any) => ({
              id: kpi.id,
              activityName: kpi['Activity Name'] || kpi.activity_name,
              projectFullCode: kpi['Project Full Code'] || kpi.project_full_code,
              projectCode: kpi['Project Code'] || kpi.project_code,
              zone: kpi['Zone'] || kpi['Zone Number'],
              quantity: parseQuantity(kpi),
              inputType: kpi['Input Type'] || kpi.input_type
            })),
            targetCriteria: {
              activityName,
              projectFullCode: projectFullCodeToUse,
              zone: zoneToUseForMatching || 'N/A'
            },
            nonMatchingDetails: matchingResults.slice(0, 5)
          })
        } else {
          console.log(`⚠️ [EnhancedQuantitySummary] No Actual KPIs found at all!`, {
            totalKPIs: allKPIs.length,
            allKPIsInputTypes: allKPIs.map((kpi: any) => ({
              id: kpi.id,
              inputType: kpi['Input Type'] || kpi.input_type,
              activityName: kpi['Activity Name'] || kpi.activity_name
            }))
          })
        }
        
      } catch (err: any) {
        console.error('❌ Error fetching Actual KPIs:', err)
        actualKPIs = []
      }

      // ============================================
      // Calculate Totals (LIKE BOQ Quantities column)
      // ============================================
      // ✅ CRITICAL FIX: Use pre-calculated values from parent if provided (ensures consistency with left panel)
      // Otherwise, calculate locally (fallback for when parent doesn't provide values)
      let total = 0
      let totalPlanned = 0
      let totalActual = 0
      
      if (preCalculatedTotal !== undefined && preCalculatedDone !== undefined && preCalculatedPlanned !== undefined) {
        // ✅ Use pre-calculated values from parent (getActivityQuantities) - ensures 100% consistency
        total = preCalculatedTotal
        totalPlanned = preCalculatedPlanned
        totalActual = preCalculatedDone
        
        console.log(`✅ [EnhancedQuantitySummary] Using pre-calculated values from parent:`, {
          total,
          totalPlanned,
          totalActual,
          note: 'These values match the left panel exactly'
        })
      } else {
        // Fallback: Calculate locally (should not happen if parent passes values correctly)
        console.log(`⚠️ [EnhancedQuantitySummary] Pre-calculated values not provided, calculating locally...`)
        
        // ✅ Total: From BOQ Activity (total_units or planned_units)
        const rawActivityQuantities = (selectedActivity as any).raw || {}
        total = selectedActivity.total_units || 
                parseFloat(String(rawActivityQuantities['Total Units'] || '0').replace(/,/g, '')) || 
                selectedActivity.planned_units ||
                parseFloat(String(rawActivityQuantities['Planned Units'] || '0').replace(/,/g, '')) || 
                0
        
        // ✅ Planned: Sum of Planned KPIs until yesterday (with Zone matching) - LIKE BOQ
        if (plannedKPIs.length > 0) {
          const plannedKPIsUntilYesterday = plannedKPIs.filter((kpi: any) => isKPIUntilYesterday(kpi, 'planned'))
          totalPlanned = plannedKPIsUntilYesterday.reduce((sum, kpi) => {
            return sum + parseQuantity(kpi)
          }, 0)
        }
        
        // If no Planned KPIs, use planned_units from BOQ Activity as fallback
        if (totalPlanned === 0) {
          totalPlanned = parseFloat(String(selectedActivity.planned_units || '0')) || 0
        }
        
        // ============================================
        // ✅ Calculate DONE (totalActual) - Simple and clear
        // ============================================
        if (actualKPIs.length > 0) {
          // Filter KPIs until yesterday only
          const actualKPIsUntilYesterday = actualKPIs.filter((kpi: any) => {
            const isUntilYesterday = isKPIUntilYesterday(kpi, 'actual')
            if (showDebug && !isUntilYesterday) {
              const kpiDate = kpi['Actual Date'] || kpi.actual_date || kpi['Activity Date'] || kpi.activity_date || 'N/A'
              console.log(`⏰ [EnhancedQuantitySummary] KPI ${kpi.id} excluded (future date): ${kpiDate}`)
            }
            return isUntilYesterday
          })
          
          console.log(`📊 [EnhancedQuantitySummary] Done calculation:`, {
            totalMatchingKPIs: actualKPIs.length,
            kpisUntilYesterday: actualKPIsUntilYesterday.length,
            excludedFutureKPIs: actualKPIs.length - actualKPIsUntilYesterday.length
          })
          
          // Sum quantities
          totalActual = actualKPIsUntilYesterday.reduce((sum, kpi) => {
            const qty = parseQuantity(kpi)
            if (showDebug) {
              console.log(`  ✅ [EnhancedQuantitySummary] Adding KPI ${kpi.id}: +${qty} (Total: ${sum} + ${qty} = ${sum + qty})`)
            }
            return sum + qty
          }, 0)
          
          console.log(`📊 [EnhancedQuantitySummary] Total Done calculated: ${totalActual} (from ${actualKPIsUntilYesterday.length} KPIs)`)
        } else {
          console.log(`⚠️ [EnhancedQuantitySummary] No matching Actual KPIs found, Done = 0`)
        }
      }
      
      // Add new quantity if provided (for preview - represents today's entry not yet saved)
      if (newQuantity > 0) {
        totalActual += newQuantity
      }
      
      // ✅ Use total (from BOQ) for remaining calculation (like BOQ)
      const remaining = Math.max(0, total - totalActual)
      const progress = total > 0 ? Math.round((totalActual / total) * 100) : 0
      
      if (showDebug) {
        console.log(`📊 Quantities (like BOQ):`, {
          total, // From BOQ Activity
          totalPlanned, // From Planned KPIs until yesterday
          totalActual, // From Actual KPIs until yesterday
          remaining,
          progress
        })
      }

      setTotals({
        total, // ✅ Total from BOQ Activity
        totalPlanned, // Planned from Planned KPIs until yesterday
        totalActual, // Actual from Actual KPIs until yesterday
        remaining,
        progress
      })

      // ✅ Pass totals to parent component if callback provided
      if (onTotalsChange) {
        onTotalsChange({
          totalPlanned: total, // Pass total (from BOQ) as totalPlanned for backward compatibility
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
        zoneUsedForMatching: zoneToUseForMatching || 'N/A',
        normalizedZone: normalizedZone || 'N/A',
        zoneNumber: zoneNumber || 'N/A',
        originalZone: originalZone || 'N/A',
        plannedKPIsCount: plannedKPIs.length,
        actualKPIsCount: actualKPIs.length,
        totalPlanned, // ✅ From BOQ Activity (planned_units or total_units)
        totalActual,
        remaining,
        progress,
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
      const fallbackTotal = selectedActivity.total_units || selectedActivity.planned_units || 0
      const fallbackActual = selectedActivity.actual_units || 0
      setTotals({
        total: fallbackTotal,
        totalPlanned: selectedActivity.planned_units || 0,
        totalActual: fallbackActual,
        remaining: Math.max(0, fallbackTotal - fallbackActual),
        progress: fallbackTotal > 0 
          ? Math.round((fallbackActual / fallbackTotal) * 100)
          : 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate with new quantity (if provided)
  // ✅ Note: When using pre-calculated values, newQuantity is already included in totals.totalActual
  // Otherwise, we add it here for display preview
  const calculateWithNewQuantity = () => {
    // If pre-calculated values are used, newQuantity was already added in useEffect
    // Otherwise, add it here for preview
    const baseActual = totals.totalActual
    const shouldAddNewQuantity = preCalculatedDone === undefined // Only add if not using pre-calculated
    const newActual = baseActual + (shouldAddNewQuantity && newQuantity > 0 ? newQuantity : 0)
    const newRemaining = Math.max(0, totals.total - newActual)
    const newProgress = totals.total > 0 ? Math.round((newActual / totals.total) * 100) : 0

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
          {/* Total Quantity (from BOQ Activity) */}
          <div className="text-center py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {totals.total.toLocaleString()}
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

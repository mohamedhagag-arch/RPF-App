'use client'

import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { BOQActivity } from '@/lib/supabase'
import { ProcessedKPI } from '@/lib/kpiProcessor'
import { formatDate } from '@/lib/dateHelpers'
import { Activity, DollarSign, TrendingUp, Download, AlertTriangle } from 'lucide-react'

interface ActivitiesTabProps {
  activities: BOQActivity[]
  kpis?: ProcessedKPI[]
  formatCurrency: (amount: number, currencyCode?: string) => string
}

export const ActivitiesTab = memo(function ActivitiesTab({ activities, kpis = [], formatCurrency }: ActivitiesTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  // ✅ PERFORMANCE: Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])
  
  // Get project currency for each activity
  const getActivityCurrency = (activity: BOQActivity): string => {
    // Try to get currency from project if available
    return (activity as any).project?.currency || 'AED'
  }
  
  // Calculate Actual Units from KPIs for an activity
  const calculateActualUnits = useCallback((activity: BOQActivity): number => {
    if (!kpis || kpis.length === 0) {
      return activity.actual_units || 0
    }
    
    try {
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      const projectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim()
      const zoneRef = (activity.zone_ref || '').toString().trim().toLowerCase()
      const zoneNumber = (activity.zone_number || '').toString().trim().toLowerCase()
      
      // Filter KPIs for this activity
      const activityKPIs = kpis.filter((kpi: any) => {
        const kpiActivityName = String(kpi.activity_name || kpi['Activity Name'] || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
        const kpiProjectFullCode = String(kpi.project_full_code || kpi['Project Full Code'] || (kpi as any).raw?.['Project Full Code'] || '').toString().trim()
        const kpiProjectCode = String(kpi.project_code || kpi['Project Code'] || (kpi as any).raw?.['Project Code'] || '').toString().trim()
        const kpiZone = String(kpi.zone || kpi['Zone'] || (kpi as any).raw?.['Zone'] || '').toString().trim().toLowerCase()
        
        // Match activity name
        const activityMatch = kpiActivityName === activityName || 
                              kpiActivityName.includes(activityName) || 
                              activityName.includes(kpiActivityName)
        
        if (!activityMatch) return false
        
        // Match project
        const projectMatch = kpiProjectFullCode === projectFullCode || 
                            kpiProjectCode === projectFullCode ||
                            kpiProjectFullCode === activity.project_code ||
                            kpiProjectCode === activity.project_code
        
        if (!projectMatch) return false
        
        // Match zone if available
        if (zoneRef && zoneRef !== 'enabling division' && zoneNumber) {
          const zoneMatch = kpiZone === zoneRef || 
                           kpiZone === zoneNumber ||
                           kpiZone.includes(zoneRef) ||
                           kpiZone.includes(zoneNumber)
          if (!zoneMatch) return false
        }
        
        return true
      })
      
      // Sum only ACTUAL KPIs
      const actualKPIs = activityKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'actual'
      })
      
      const totalActual = actualKPIs.reduce((sum: number, kpi: any) => {
        const qty = parseFloat(String(kpi.quantity || kpi['Quantity'] || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
        return sum + qty
      }, 0)
      
      return totalActual
    } catch (error) {
      console.error('Error calculating actual units:', error)
      return activity.actual_units || 0
    }
  }, [kpis])
  
  // Calculate Earned Value from KPIs for an activity
  const calculateEarnedValue = useCallback((activity: BOQActivity): number => {
    if (!kpis || kpis.length === 0) {
      return activity.earned_value || 0
    }
    
    try {
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      const projectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim()
      const zoneRef = (activity.zone_ref || '').toString().trim().toLowerCase()
      const zoneNumber = (activity.zone_number || '').toString().trim().toLowerCase()
      
      // Filter KPIs for this activity (same logic as calculateActualUnits)
      const activityKPIs = kpis.filter((kpi: any) => {
        const kpiActivityName = String(kpi.activity_name || kpi['Activity Name'] || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
        const kpiProjectFullCode = String(kpi.project_full_code || kpi['Project Full Code'] || (kpi as any).raw?.['Project Full Code'] || '').toString().trim()
        const kpiProjectCode = String(kpi.project_code || kpi['Project Code'] || (kpi as any).raw?.['Project Code'] || '').toString().trim()
        const kpiZone = String(kpi.zone || kpi['Zone'] || (kpi as any).raw?.['Zone'] || '').toString().trim().toLowerCase()
        
        // Match activity name
        const activityMatch = kpiActivityName === activityName || 
                              kpiActivityName.includes(activityName) || 
                              activityName.includes(kpiActivityName)
        
        if (!activityMatch) return false
        
        // Match project
        const projectMatch = kpiProjectFullCode === projectFullCode || 
                            kpiProjectCode === projectFullCode ||
                            kpiProjectFullCode === activity.project_code ||
                            kpiProjectCode === activity.project_code
        
        if (!projectMatch) return false
        
        // Match zone if available
        if (zoneRef && zoneRef !== 'enabling division' && zoneNumber) {
          const zoneMatch = kpiZone === zoneRef || 
                           kpiZone === zoneNumber ||
                           kpiZone.includes(zoneRef) ||
                           kpiZone.includes(zoneNumber)
          if (!zoneMatch) return false
        }
        
        return true
      })
      
      // Sum only ACTUAL KPIs
      const actualKPIs = activityKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'actual'
      })
      
      // Calculate Earned Value using unified logic (same as workValueCalculator.ts)
      let earnedValue = 0
      
      actualKPIs.forEach((kpi: any) => {
        const rawKpi = (kpi as any).raw || {}
        const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
        
        // Get activity rate
        let rate = 0
        const rawActivity = (activity as any).raw || {}
        
        // Priority 1: Calculate Rate = Total Value / Total Units
        const totalValueFromActivity = activity.total_value || 
                                     parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                     0
        
        const totalUnits = activity.total_units || 
                        activity.planned_units ||
                        parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                        0
        
        if (totalUnits > 0 && totalValueFromActivity > 0) {
          rate = totalValueFromActivity / totalUnits
        } else {
          // Priority 2: Use rate directly from activity
          rate = activity.rate || 
                parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                0
        }
        
        // Priority 1: Calculate from Rate × Quantity
        let calculatedValue = 0
        if (rate > 0 && quantity > 0) {
          calculatedValue = rate * quantity
          if (calculatedValue > 0) {
            earnedValue += calculatedValue
            return // Move to next KPI
          }
        }
        
        // Priority 2: Use Value directly from KPI
        let kpiValue = 0
        
        // Try raw['Value'] (from database with capital V)
        if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
          const val = rawKpi['Value']
          kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
        }
        
        // Try raw.value (from database with lowercase v)
        if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
          const val = rawKpi.value
          kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
        }
        
        // Try k.value (direct property from ProcessedKPI)
        if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
          const val = kpi.value
          kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
        }
        
        if (kpiValue > 0) {
          earnedValue += kpiValue
          return // Move to next KPI
        }
        
        // Priority 3: Try Actual Value
        const actualValue = (kpi.actual_value ?? 
                           parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, ''))) || 
                           0
        
        if (actualValue > 0) {
          earnedValue += actualValue
          return // Move to next KPI
        }
      })
      
      return earnedValue
    } catch (error) {
      console.error('Error calculating earned value:', error)
      return activity.earned_value || 0
    }
  }, [kpis])
  
  // Calculate pagination
  const totalPages = Math.ceil(activities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedActivities = activities.slice(startIndex, endIndex)
  
  // Calculate totals
  const totals = useMemo(() => {
    return activities.reduce((acc: any, activity: BOQActivity) => {
      acc.totalUnits += activity.total_units || 0
      acc.plannedUnits += activity.planned_units || 0
      acc.actualUnits += calculateActualUnits(activity)
      acc.totalValue += activity.total_value || 0
      acc.plannedValue += activity.planned_value || 0
      acc.earnedValue += calculateEarnedValue(activity)
      return acc
    }, {
      totalUnits: 0,
      plannedUnits: 0,
      actualUnits: 0,
      totalValue: 0,
      plannedValue: 0,
      earnedValue: 0
    })
  }, [activities, calculateActualUnits, calculateEarnedValue])
  
  // Helper: Get activity field (same as BOQTableWithCustomization)
  const getActivityField = (activity: BOQActivity, fieldName: string): any => {
    const raw = (activity as any).raw || activity
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (activity as any)[fieldName] || ''
  }
  
  // Helper: Normalize zone (remove project code prefix)
  const normalizeZone = (zone: string, projectCode: string): string => {
    if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
    let normalized = zone.trim()
    const codeUpper = projectCode.toUpperCase()
    normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
    normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
    normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
    return normalized.toLowerCase()
  }
  
  // Helper: Extract zone from activity
  const getActivityZone = (activity: BOQActivity): string => {
    const rawActivity = (activity as any).raw || {}
    let zoneValue = activity.zone_number || 
                   activity.zone_ref || 
                   rawActivity['Zone Number'] ||
                   rawActivity['Zone Ref'] ||
                   rawActivity['Zone #'] ||
                   ''
    
    if (zoneValue && activity.project_code) {
      const projectCodeUpper = activity.project_code.toUpperCase().trim()
      let zoneStr = zoneValue.toString()
      zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
      zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
      zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
      zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
      zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
      zoneValue = zoneStr || ''
    }
    
    return (zoneValue || '').toString().toLowerCase().trim()
  }
  
  // Helper: Extract zone from KPI
  const getKPIZone = (kpi: any): string => {
    const rawKPI = (kpi as any).raw || {}
    // ✅ NOT from Section - Section is separate from Zone
    const zoneRaw = (
      kpi.zone || 
      rawKPI['Zone'] || 
      rawKPI['Zone Number'] || 
      rawKPI['Zone Ref'] ||
      ''
    ).toString().trim()
    const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
    return normalizeZone(zoneRaw, projectCode)
  }
  
  // Helper: Extract zone number for exact matching
  const extractZoneNumber = (zone: string): string => {
    if (!zone || zone.trim() === '') return ''
    
    const normalizedZone = zone.toLowerCase().trim()
    
    // Try to match "zone X" or "zone-X" pattern first
    const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
    if (zonePatternMatch && zonePatternMatch[1]) {
      return zonePatternMatch[1]
    }
    
    // Try to match standalone number at the end
    const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
    if (endNumberMatch && endNumberMatch[1]) {
      return endNumberMatch[1]
    }
    
    // Fallback: extract first number
    const numberMatch = normalizedZone.match(/\d+/)
    if (numberMatch) return numberMatch[0]
    
    return normalizedZone
  }
  
  // Helper: Parse date string to YYYY-MM-DD format
  const parseDateToYYYYMMDD = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
    
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      return `${year}-${month}-${day}`
    } catch {
      return null
    }
  }
  
  // Get Planned Start Date (same logic as BOQTableWithCustomization)
  const getPlannedStartDate = useCallback((activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from first Planned KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Planned KPIs
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Planned
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'planned') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Activity Date column (for Planned KPIs, filtered by Input Type = 'Planned')
          let kpiDateStr = ''
          if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return earliest
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[0].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields
    const directStart = activity.planned_activity_start_date || 
                       activity.activity_planned_start_date ||
                       getActivityField(activity, 'Planned Activity Start Date') ||
                       getActivityField(activity, 'Planned Start Date') ||
                       getActivityField(activity, 'Activity Planned Start Date') ||
                       raw['Planned Activity Start Date'] ||
                       raw['Planned Start Date'] ||
                       raw['Activity Planned Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    return ''
  }, [kpis])
  
  // Get Planned End Date (last date from Planned KPIs)
  const getPlannedEndDate = useCallback((activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from last Planned KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Planned KPIs (same logic as getPlannedStartDate)
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'planned') return false
        
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          let kpiDateStr = ''
          if (kpi.target_date && kpi.target_date.toString().trim() !== '' && kpi.target_date !== 'N/A') {
            kpiDateStr = kpi.target_date.toString().trim()
          } else if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          } else if (rawKPI['Target Date'] && rawKPI['Target Date'].toString().trim() !== '' && rawKPI['Target Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Target Date'].toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return latest (LAST date)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[validDates.length - 1].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields
    const directEnd = activity.deadline || 
                      activity.activity_planned_completion_date ||
                      getActivityField(activity, 'Deadline') ||
                      getActivityField(activity, 'Planned Completion Date') ||
                      getActivityField(activity, 'Activity Planned Completion Date') ||
                      raw['Deadline'] ||
                      raw['Planned Completion Date'] ||
                      raw['Activity Planned Completion Date'] ||
                      ''
    
    if (directEnd && directEnd.trim() !== '' && directEnd !== 'N/A') {
      return directEnd
    }
    
    return ''
  }, [kpis])
  
  // Get Actual Start Date (first date from Actual KPIs)
  const getActualStartDate = useCallback((activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from first Actual KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Actual KPIs
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Actual
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'actual') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Activity Date column (for Actual KPIs, filtered by Input Type = 'Actual')
          let kpiDateStr = ''
          if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return earliest (FIRST date)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[0].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields
    const directStart = getActivityField(activity, 'Actual Start Date') ||
                       getActivityField(activity, 'Actual Start') ||
                       getActivityField(activity, 'Activity Actual Start Date') ||
                       raw['Actual Start Date'] ||
                       raw['Actual Start'] ||
                       raw['Activity Actual Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    return ''
  }, [kpis])
  
  // Get Actual End Date (last date from Actual KPIs)
  // ✅ IMPORTANT: If activity hasn't started (no Actual Start Date), return empty string
  const getActualEndDate = useCallback((activity: BOQActivity): string => {
    // ✅ FIRST: Check if activity has started (has Actual Start Date)
    const actualStart = getActualStartDate(activity)
    if (!actualStart || actualStart.trim() === '' || actualStart === 'N/A') {
      // Activity hasn't started yet, so no Actual End Date
      return ''
    }
    
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from last Actual KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Actual KPIs (same logic as getActualStartDate)
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'actual') return false
        
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          let kpiDateStr = ''
          if (kpi.actual_date && kpi.actual_date.toString().trim() !== '' && kpi.actual_date !== 'N/A') {
            kpiDateStr = kpi.actual_date.toString().trim()
          } else if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (kpi.target_date && kpi.target_date.toString().trim() !== '' && kpi.target_date !== 'N/A') {
            kpiDateStr = kpi.target_date.toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          } else if (rawKPI['Actual Date'] && rawKPI['Actual Date'].toString().trim() !== '' && rawKPI['Actual Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Actual Date'].toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return latest (LAST date)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[validDates.length - 1].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields (ONLY if activity has started)
    // Note: We already checked that actualStart exists at the beginning of the function
    const directEnd = getActivityField(activity, 'Actual Completion Date') ||
                      getActivityField(activity, 'Actual Completion') ||
                      getActivityField(activity, 'Activity Actual Completion Date') ||
                      raw['Actual Completion Date'] ||
                      raw['Actual Completion'] ||
                      raw['Activity Actual Completion Date'] ||
                      ''
    
    // ✅ Don't use deadline as fallback for Actual End Date - it's a planned date
    if (directEnd && directEnd.trim() !== '' && directEnd !== 'N/A') {
      return directEnd
    }
    
    return ''
  }, [kpis, getActualStartDate])
  
  // Calculate Progress from Actual Units / Planned Units
  const calculateProgress = useCallback((activity: BOQActivity): number => {
    const plannedUnits = activity.planned_units || 0
    if (plannedUnits <= 0) return 0
    
    const actualUnits = calculateActualUnits(activity)
    const progress = (actualUnits / plannedUnits) * 100
    return Math.max(0, progress) // Allow values over 100%
  }, [calculateActualUnits])
  
  // Export to Excel function (moved here to use date functions)
  const handleExportActivities = useCallback(async () => {
    if (activities.length === 0) {
      alert('No data to export')
      return
    }

    try {
      // Dynamically import xlsx-js-style for advanced formatting
      const XLSX = await import('xlsx-js-style')
      
      // Prepare data for Excel export
      const exportData: any[] = []

      // Add header row
      const headerRow: any = {
        'Activity Name': 'Activity Name',
        'Project': 'Project',
        'Zone': 'Zone',
        'Division': 'Division',
        'Unit': 'Unit',
        'Total Units': 'Total Units',
        'Planned Units': 'Planned Units',
        'Actual Units': 'Actual Units',
        'Rate': 'Rate',
        'Total Value': 'Total Value',
        'Planned Value': 'Planned Value',
        'Earned Value': 'Earned Value',
        'Progress %': 'Progress %',
        'Planned Start Date': 'Planned Start Date',
        'Planned End Date': 'Planned End Date',
        'Actual Start Date': 'Actual Start Date',
        'Actual End Date': 'Actual End Date',
        'Status': 'Status'
      }
      exportData.push(headerRow)

      // Add data rows
      activities.forEach((activity: BOQActivity) => {
        const currency = getActivityCurrency(activity)
        const progressValue = calculateProgress(activity)
        const zoneDisplay = activity.zone_ref && activity.zone_ref !== 'Enabling Division' 
          ? `${activity.zone_ref}${activity.zone_number ? ` - ${activity.zone_number}` : ''}`
          : activity.zone_number || 'N/A'
        
        const plannedStartDate = getPlannedStartDate(activity)
        const plannedEndDate = getPlannedEndDate(activity)
        const actualStartDate = getActualStartDate(activity)
        const actualEndDate = getActualEndDate(activity)
        
        // ✅ Calculate Status based on Progress percentage (same logic as table)
        let status = 'In Progress'
        if ((progressValue === 0 || progressValue < 0.1) && (!actualStartDate || actualStartDate.trim() === '' || actualStartDate === 'N/A')) {
          status = 'Not Started'
        } else if (progressValue >= 100) {
          status = 'Completed'
        } else if (progressValue < 50 && actualStartDate) {
          status = 'Delayed'
        } else if (progressValue >= 50 && progressValue < 100) {
          status = 'On Track'
        } else {
          status = 'In Progress'
        }
        
        // ✅ If activity hasn't started, show "Not Started" instead of date
        const actualEndDateDisplay = actualStartDate 
          ? (actualEndDate ? formatDate(actualEndDate) : 'N/A')
          : 'Not Started'
        
        const row: any = {
          'Activity Name': activity.activity_name || activity.activity || 'N/A',
          'Project': activity.project_full_code || activity.project_code || 'N/A',
          'Zone': zoneDisplay,
          'Division': activity.activity_division || 'N/A',
          'Unit': activity.unit || 'N/A',
          'Total Units': activity.total_units || 0,
          'Planned Units': activity.planned_units || 0,
          'Actual Units': calculateActualUnits(activity),
          'Rate': activity.rate || 0,
          'Total Value': activity.total_value || 0,
          'Planned Value': activity.planned_value || 0,
          'Earned Value': calculateEarnedValue(activity),
          'Progress %': progressValue,
          'Planned Start Date': plannedStartDate ? formatDate(plannedStartDate) : 'N/A',
          'Planned End Date': plannedEndDate ? formatDate(plannedEndDate) : 'N/A',
          'Actual Start Date': actualStartDate ? formatDate(actualStartDate) : 'N/A',
          'Actual End Date': actualEndDateDisplay,
          'Status': status
        }
        exportData.push(row)
      })

      // Add totals row
      const totals = activities.reduce((acc: any, activity: BOQActivity) => {
        acc.totalUnits += activity.total_units || 0
        acc.plannedUnits += activity.planned_units || 0
        acc.actualUnits += calculateActualUnits(activity)
        acc.totalValue += activity.total_value || 0
        acc.plannedValue += activity.planned_value || 0
        acc.earnedValue += calculateEarnedValue(activity)
        return acc
      }, {
        totalUnits: 0,
        plannedUnits: 0,
        actualUnits: 0,
        totalValue: 0,
        plannedValue: 0,
        earnedValue: 0
      })
      
      const totalsRow: any = {
        'Activity Name': 'TOTAL',
        'Project': '',
        'Zone': '',
        'Division': '',
        'Unit': '',
        'Total Units': totals.totalUnits,
        'Planned Units': totals.plannedUnits,
        'Actual Units': totals.actualUnits,
        'Rate': '',
        'Total Value': totals.totalValue,
        'Planned Value': totals.plannedValue,
        'Earned Value': totals.earnedValue,
        'Progress %': '',
        'Planned Start Date': '',
        'Planned End Date': '',
        'Actual Start Date': '',
        'Actual End Date': '',
        'Status': ''
      }
      exportData.push(totalsRow)

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Define column widths
      const colWidths = [
        { wch: 40 }, // Activity Name
        { wch: 20 }, // Project
        { wch: 18 }, // Zone
        { wch: 20 }, // Division
        { wch: 12 }, // Unit
        { wch: 15 }, // Total Units
        { wch: 15 }, // Planned Units
        { wch: 15 }, // Actual Units
        { wch: 15 }, // Rate
        { wch: 18 }, // Total Value
        { wch: 18 }, // Planned Value
        { wch: 18 }, // Earned Value
        { wch: 12 }, // Progress %
        { wch: 18 }, // Planned Start Date
        { wch: 18 }, // Planned End Date
        { wch: 18 }, // Actual Start Date
        { wch: 18 }, // Actual End Date
        { wch: 15 }  // Status
      ]
      ws['!cols'] = colWidths
      
      // Freeze first row
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      const numberStyle = {
        numFmt: '#,##0.00',
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const textStyle = {
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const totalsStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '#,##0.00',
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const totalsTextStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      // Apply styles to cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      const getColLetter = (colIndex: number): string => {
        try {
          return XLSX.utils.encode_col(colIndex)
        } catch {
          let result = ''
          let num = colIndex
          while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result
            num = Math.floor(num / 26) - 1
          }
          return result
        }
      }
      
      // Style header row (row 0)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (!ws[cellAddress]) continue
        ws[cellAddress].s = headerStyle
      }
      
      // Style data rows
      for (let row = 1; row <= range.e.r; row++) {
        const isTotalsRow = row === range.e.r
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!ws[cellAddress]) continue
          
          const colIndex = col
          // Number columns: 5-11 (Total Units through Earned Value), 12 (Progress %)
          const isNumberColumn = (colIndex >= 5 && colIndex <= 11) || colIndex === 12
          
          if (isTotalsRow) {
            if (colIndex === 0) {
              ws[cellAddress].s = totalsTextStyle
            } else if (isNumberColumn) {
              ws[cellAddress].s = totalsStyle
            } else {
              ws[cellAddress].s = totalsTextStyle
            }
          } else {
            const evenRowStyle = row % 2 === 0 
              ? { ...textStyle, fill: { fgColor: { rgb: 'F2F2F2' } } }
              : textStyle
            
            if (isNumberColumn) {
              ws[cellAddress].s = row % 2 === 0 
                ? { ...numberStyle, fill: { fgColor: { rgb: 'F2F2F2' } } }
                : numberStyle
            } else {
              ws[cellAddress].s = evenRowStyle
            }
          }
        }
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Activities Report')
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0]
      
      // Write file
      XLSX.writeFile(wb, `Activities_Report_${dateStr}.xlsx`)
      
      console.log(`✅ Downloaded formatted Excel: Activities_Report_${dateStr}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export data. Please try again.')
    }
  }, [activities, formatCurrency, calculateActualUnits, calculateEarnedValue, calculateProgress, getPlannedStartDate, getPlannedEndDate, getActualStartDate, getActualEndDate])
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activities.length}</p>
              </div>
              <Activity className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.totalValue)}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Earned Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.earnedValue)}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Activities Table */}
    <Card>
      <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Activities Report
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length} activities
              </p>
            </div>
            <Button
              onClick={handleExportActivities}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
      </CardHeader>
      <CardContent>
          <div className="relative">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)', scrollbarWidth: 'auto' }}>
              <table className="border-collapse text-sm" style={{ tableLayout: 'auto', width: 'auto', minWidth: '100%' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '300px' }}>Activity Name</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '180px' }}>Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '150px' }}>Zone</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '180px' }}>Division</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Unit</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Total Units</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Planned Units</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Actual Units</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Rate</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Total Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Planned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Earned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Progress</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Planned Start Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Planned End Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Actual Start Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Actual End Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-center font-semibold whitespace-nowrap">Status</th>
            </tr>
          </thead>
            <tbody>
                {                  paginatedActivities.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                        <p>No activities found</p>
                      </div>
                </td>
                  </tr>
                ) : (
                  paginatedActivities.map((activity: BOQActivity) => {
                    const currency = getActivityCurrency(activity)
                    const progress = calculateProgress(activity)
                    const zoneDisplay = activity.zone_ref && activity.zone_ref !== 'Enabling Division' 
                      ? `${activity.zone_ref}${activity.zone_number ? ` - ${activity.zone_number}` : ''}`
                      : activity.zone_number || 'N/A'
                    const plannedStartDate = getPlannedStartDate(activity)
                    const plannedEndDate = getPlannedEndDate(activity)
                    const actualStartDate = getActualStartDate(activity)
                    const actualEndDate = getActualEndDate(activity)
                    
                    // ✅ Calculate Status based on Progress percentage
                    let status = 'In Progress'
                    let statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    
                    // Priority 1: Check if activity hasn't started (Progress = 0% and no Actual Start Date)
                    if ((progress === 0 || progress < 0.1) && (!actualStartDate || actualStartDate.trim() === '' || actualStartDate === 'N/A')) {
                      status = 'Not Started'
                      statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }
                    // Priority 2: Check if activity is completed (Progress >= 100%)
                    else if (progress >= 100) {
                      status = 'Completed'
                      statusColor = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }
                    // Priority 3: Check if activity is behind schedule (Progress < 50% and has started)
                    else if (progress < 50 && actualStartDate) {
                      status = 'Delayed'
                      statusColor = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }
                    // Priority 4: Check if activity is on track (Progress >= 50% and < 100%)
                    else if (progress >= 50 && progress < 100) {
                      status = 'On Track'
                      statusColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }
                    // Default: In Progress (Progress > 0% and < 50%)
                    else {
                      status = 'In Progress'
                      statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }
                    
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '300px' }}>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {activity.activity_name || activity.activity || 'N/A'}
                          </div>
                          {activity.activity_timing && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {activity.activity_timing}
                            </div>
                          )}
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '180px' }}>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {activity.project_full_code || activity.project_code || 'N/A'}
                          </div>
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '150px' }}>
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded">
                            {zoneDisplay}
                          </span>
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '180px' }}>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {activity.activity_division || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {activity.unit || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(activity.total_units || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(activity.planned_units || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {calculateActualUnits(activity).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(activity.rate || 0, currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(activity.total_value || 0, currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(activity.planned_value || 0, currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(calculateEarnedValue(activity), currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                                className={`h-2 rounded-full ${
                                  progress >= 100 ? 'bg-green-500' :
                                  progress >= 75 ? 'bg-blue-500' :
                                  progress >= 50 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                        />
        </div>
                            <span className="text-sm font-semibold text-right">
                              {progress.toFixed(1)}%
                            </span>
      </div>
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {plannedStartDate ? formatDate(plannedStartDate) : 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {plannedEndDate ? formatDate(plannedEndDate) : 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {actualStartDate ? formatDate(actualStartDate) : 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className={`text-xs ${!actualStartDate ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                            {actualStartDate 
                              ? (actualEndDate ? formatDate(actualEndDate) : 'N/A') 
                              : 'Not Started'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                            {status}
                  </span>
                </td>
              </tr>
                    )
                  })
                )}
          </tbody>
              {paginatedActivities.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={5} className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">TOTAL:</td>
                    <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-5 py-4"></td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {totals.totalUnits.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {totals.plannedUnits.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {totals.actualUnits.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">-</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {formatCurrency(totals.totalValue)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {formatCurrency(totals.plannedValue)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {formatCurrency(totals.earnedValue)}
                    </td>
                    <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-5 py-4"></td>
                  </tr>
                </tfoot>
              )}
        </table>
    </div>
          </div>
          
          {/* Pagination */}
          {activities.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={activities.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
      </CardContent>
    </Card>
    </div>
  )
})


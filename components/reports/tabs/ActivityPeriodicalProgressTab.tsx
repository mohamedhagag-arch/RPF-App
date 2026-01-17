'use client'

import { useState, useMemo, useRef, useEffect, memo } from 'react'
import { Project, BOQActivity } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CalendarRange, Download, ChevronDown, FileSpreadsheet, FileText, Image as ImageIcon, File, Search } from 'lucide-react'
import { downloadExcel, downloadCSV } from '@/lib/exportImportUtils'

interface ActivityPeriodicalProgressTabProps {
  activities: BOQActivity[]
  projects: Project[]
  kpis: any[]
  formatCurrency: (value: number, currency?: string) => string
}

type PeriodType = 'weekly' | 'monthly' | 'custom'

export const ActivityPeriodicalProgressTab = memo(function ActivityPeriodicalProgressTab({ 
  activities, 
  projects, 
  kpis, 
  formatCurrency 
}: ActivityPeriodicalProgressTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [periodType, setPeriodType] = useState<PeriodType>('weekly')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }
  
  // Helper to get KPI date
  const getKPIDate = (kpi: any): Date | null => {
    const raw = (kpi as any).raw || {}
    const dayValue = (kpi as any).day || raw['Day'] || ''
    const activityDateValue = kpi.activity_date || raw['Activity Date'] || ''
    
    // Use Activity Date (filtered by Input Type in queries)
    let dateStr = activityDateValue || dayValue
    
    if (!dateStr) return null
    
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      return date
    } catch {
      return null
    }
  }
  
  // Helper to extract zone number
  const extractZoneNumber = (zoneStr: string): string => {
    if (!zoneStr || zoneStr.trim() === '') return ''
    const normalized = zoneStr.toLowerCase().trim()
    
    // Try to match "zone X" or "zone-X" pattern first (most common)
    const zonePatternMatch = normalized.match(/zone\s*[-_]?\s*(\d+)/i)
    if (zonePatternMatch && zonePatternMatch[1]) {
      return zonePatternMatch[1]
    }
    
    // Try to match standalone number at the end
    const endNumberMatch = normalized.match(/(\d+)\s*$/)
    if (endNumberMatch && endNumberMatch[1]) {
      return endNumberMatch[1]
    }
    
    // Fallback: extract first number
    const numberMatch = normalized.match(/\d+/)
    if (numberMatch) return numberMatch[0]
    
    return normalized
  }
  
  // CRITICAL: Function to match KPI to Activity with STRICT Project + Activity + Zone matching
  const kpiMatchesActivity = (kpi: any, activity: BOQActivity, targetZone: string): boolean => {
    const rawKPI = (kpi as any).raw || {}
    const rawActivity = (activity as any).raw || {}
    
    // 1. Project Full Code Matching (ULTRA STRICT)
    const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
    const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
    const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
    const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
    
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
    
    if (!projectMatch) return false
    
    // 2. Activity Name Matching
    const kpiActivityName = (kpi.activity_description || (kpi as any).activity_name || kpi['Activity Description'] || kpi['Activity Name'] || (kpi as any).activity || rawKPI['Activity Description'] || rawKPI['Activity Name'] || '').toLowerCase().trim()
    const activityName = (activity.activity_description || '').toLowerCase().trim()
    const activityMatch = kpiActivityName && activityName && (
      kpiActivityName === activityName || 
      kpiActivityName.includes(activityName) || 
      activityName.includes(kpiActivityName)
    )
    
    if (!activityMatch) return false
    
    // 3. Zone Matching (ULTRA STRICT - must match zone exactly)
    // ✅ NOT from Section - Section is separate from Zone
    const kpiZoneRaw = ((kpi as any).zone_number || (kpi as any).zone || kpi['Zone Number'] || kpi['Zone'] || rawKPI['Zone Number'] || rawKPI['Zone'] || '').toString().trim()
    const activityZoneNumber = (activity.zone_number || rawActivity['Zone Number'] || '0').toString().trim()
    
    // Use targetZone (from grouped data) or activity zone
    const zoneToMatch = targetZone && targetZone !== 'N/A' && targetZone !== 'n/a' 
      ? targetZone 
      : (activityZoneNumber || '0')
    
    if (zoneToMatch && zoneToMatch !== 'N/A' && zoneToMatch !== 'n/a') {
      // Activity is in a specific zone - KPI MUST have zone (no exceptions)
      if (!kpiZoneRaw || kpiZoneRaw.trim() === '') {
        return false // KPI has no zone, reject it immediately
      }
      
      // Extract zone numbers for exact matching
      const zoneToMatchNum = extractZoneNumber(zoneToMatch)
      const kpiZoneNum = extractZoneNumber(kpiZoneRaw)
      
      // CRITICAL: Zone numbers MUST match EXACTLY
      if (zoneToMatchNum && kpiZoneNum) {
        if (zoneToMatchNum !== kpiZoneNum) {
          return false // Zone numbers don't match, reject
        }
      } else {
        // If we can't extract zone numbers, try exact text match (case-insensitive)
        const normalizedZoneToMatch = zoneToMatch.toLowerCase().trim()
        const normalizedKpiZone = kpiZoneRaw.toLowerCase().trim()
        
        if (normalizedKpiZone !== normalizedZoneToMatch) {
          return false // Zone text doesn't match exactly, reject
        }
      }
    } else {
      // If activity has no zone but KPI has zone, that's OK (include it)
      // But if activity has zone info in zone_number, try to match
      if (activityZoneNumber) {
        const activityZoneNumberNum = activityZoneNumber ? extractZoneNumber(activityZoneNumber) : ''
        const kpiZoneNum = kpiZoneRaw ? extractZoneNumber(kpiZoneRaw) : ''
        
        // If KPI has zone, it should match activity zone
        if (kpiZoneNum && activityZoneNumberNum && activityZoneNumberNum !== kpiZoneNum) {
          return false
        }
      }
    }
    
    return true
  }
  
  // Helper to get KPI quantity
  const getKPIQuantity = (kpi: any): number => {
    const raw = (kpi as any).raw || {}
    return parseFloat(String(kpi.quantity || kpi['Quantity'] || raw['Quantity'] || 0)) || 0
  }
  
  // Helper to get KPI input type
  const getKPIInputType = (kpi: any): string => {
    const raw = (kpi as any).raw || {}
    return String(kpi.input_type || raw['Input Type'] || '').trim().toLowerCase()
  }
  
  // Get selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null
    return projects.find((p: Project) => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])
  
  // Filter projects for search
  const filteredProjectsForDropdown = useMemo(() => {
    if (!projectSearch.trim()) return projects
    
    const searchLower = projectSearch.toLowerCase().trim()
    return projects.filter((project: Project) => {
      const projectCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().toLowerCase()
      const projectName = (project.project_name || '').toLowerCase()
      return projectCode.includes(searchLower) || projectName.includes(searchLower)
    })
  }, [projects, projectSearch])
  
  // Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    
    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectDropdown])
  
  // Get project activities
  const projectActivities = useMemo(() => {
    if (!selectedProject) return []
    
    const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    
    return activities.filter((activity: BOQActivity) => {
      const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      return activityFullCode === projectFullCode || activity.project_id === selectedProject.id
    })
  }, [activities, selectedProject])
  
  // Get available periods based on period type
  const availablePeriods = useMemo(() => {
    if (!selectedProject || projectActivities.length === 0) return []
    
    const periods: Array<{ label: string; start: Date; end: Date; key: string }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (periodType === 'weekly') {
      // Get last 12 weeks (from current week going back)
      for (let i = 0; i < 12; i++) {
        const weekEnd = new Date(today)
        weekEnd.setDate(today.getDate() - (i * 7))
        const weekStart = new Date(weekEnd)
        weekStart.setDate(weekEnd.getDate() - 6)
        weekStart.setHours(0, 0, 0, 0)
        weekEnd.setHours(23, 59, 59, 999)
        
        const weekNumber = getWeekNumber(weekEnd)
        const year = weekEnd.getFullYear()
        
        periods.push({
          label: `Week ${weekNumber}, ${year} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
          start: weekStart,
          end: weekEnd,
          key: `week-${year}-${weekNumber}`
        })
      }
    } else if (periodType === 'monthly') {
      // Get last 12 months
      for (let i = 0; i < 12; i++) {
        const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        
        periods.push({
          label: monthName,
          start: monthStart,
          end: monthEnd,
          key: `month-${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`
        })
      }
    } else if (periodType === 'custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        periods.push({
          label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          start,
          end,
          key: `custom-${customStartDate}-${customEndDate}`
        })
      }
    }
    
    return periods.reverse() // Show oldest first
  }, [selectedProject, projectActivities, periodType, customStartDate, customEndDate, getWeekNumber])
  
  // Get selected period
  const selectedPeriodData = useMemo(() => {
    if (!selectedPeriod) return null
    return availablePeriods.find(p => p.key === selectedPeriod) || null
  }, [availablePeriods, selectedPeriod])
  
  // Calculate project summary statistics
  const projectSummary = useMemo(() => {
    if (!selectedProject || !selectedPeriodData || projectActivities.length === 0) return null
    
    const periodStart = selectedPeriodData.start
    const periodEnd = selectedPeriodData.end
    periodEnd.setHours(23, 59, 59, 999)
    
    // Get all KPIs for this project
    const projectKPIs = kpis.filter((kpi: any) => {
      const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || '').toString().trim().toUpperCase()
      const projectCode = (selectedProject.project_code || '').toString().trim().toUpperCase()
      const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
      
      return (
        kpiProjectCode === projectCode ||
        kpiProjectFullCode === projectFullCode ||
        kpiProjectCode === projectFullCode ||
        kpiProjectFullCode === projectCode
      )
    })
    
    // Calculate totals
    const totalActivities = projectActivities.length
    const totalPlannedUnits = projectActivities.reduce((sum, a) => sum + (a.planned_units || a.total_units || 0), 0)
    const totalActualUnits = projectActivities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
    
    // Calculate period KPIs
    const periodKPIs = projectKPIs.filter((kpi: any) => {
      const kpiDate = getKPIDate(kpi)
      return kpiDate && kpiDate >= periodStart && kpiDate <= periodEnd
    })
    
    const periodPlanned = periodKPIs
      .filter((kpi: any) => getKPIInputType(kpi) === 'planned')
      .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
    
    const periodActual = periodKPIs
      .filter((kpi: any) => getKPIInputType(kpi) === 'actual')
      .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
    
    // Calculate cumulative
    const cumulativePlanned = projectKPIs
      .filter((kpi: any) => getKPIInputType(kpi) === 'planned')
      .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
    
    const cumulativeActual = projectKPIs
      .filter((kpi: any) => getKPIInputType(kpi) === 'actual')
      .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
    
    // Calculate financial values
    const totalValue = projectActivities.reduce((sum, a) => sum + (a.total_value || 0), 0)
    const plannedValue = projectActivities.reduce((sum, a) => sum + (a.planned_value || 0), 0)
    const earnedValue = projectActivities.reduce((sum, a) => sum + (a.earned_value || 0), 0)
    
    // Calculate progress percentages
    const overallProgress = totalPlannedUnits > 0 ? (totalActualUnits / totalPlannedUnits) * 100 : 0
    const periodProgress = periodPlanned > 0 ? (periodActual / periodPlanned) * 100 : 0
    const cumulativeProgress = cumulativePlanned > 0 ? (cumulativeActual / cumulativePlanned) * 100 : 0
    const valueProgress = totalValue > 0 ? (earnedValue / totalValue) * 100 : 0
    
    // Count activities by status
    const completedActivities = projectActivities.filter(a => a.activity_completed).length
    const delayedActivities = projectActivities.filter(a => a.activity_delayed).length
    const onTrackActivities = projectActivities.filter(a => a.activity_on_track).length
    
    // Count zones
    const uniqueZones = new Set(projectActivities.map(a => a.zone_number || '0'))
    const totalZones = uniqueZones.size
    
    // Count divisions
    const uniqueDivisions = new Set(projectActivities.map(a => a.activity_division || 'Other').filter(Boolean))
    const totalDivisions = uniqueDivisions.size
    
    return {
      totalActivities,
      totalPlannedUnits,
      totalActualUnits,
      periodPlanned,
      periodActual,
      cumulativePlanned,
      cumulativeActual,
      totalValue,
      plannedValue,
      earnedValue,
      overallProgress,
      periodProgress,
      cumulativeProgress,
      valueProgress,
      completedActivities,
      delayedActivities,
      onTrackActivities,
      totalZones,
      totalDivisions
    }
  }, [selectedProject, selectedPeriodData, projectActivities, kpis, getKPIDate, getKPIQuantity, getKPIInputType])
  
  // Group activities by zone and work type, then calculate all metrics
  const groupedData = useMemo(() => {
    if (!selectedProject || !selectedPeriodData || projectActivities.length === 0) return []
    
    const periodStart = selectedPeriodData.start
    const periodEnd = selectedPeriodData.end
    periodEnd.setHours(23, 59, 59, 999)
    
    // Group by zone
    const zonesMap = new Map<string, Map<string, BOQActivity[]>>()
    
    projectActivities.forEach((activity: BOQActivity) => {
      const zone = (activity.zone_number || '0').toString().trim()
      const workType = activity.activity_division || 'Other'
      
      if (!zonesMap.has(zone)) {
        zonesMap.set(zone, new Map())
      }
      
      const workTypesMap = zonesMap.get(zone)!
      if (!workTypesMap.has(workType)) {
        workTypesMap.set(workType, [])
      }
      
      workTypesMap.get(workType)!.push(activity)
    })
    
    // Process each zone and work type
    const result: Array<{
      zone: string
      workType: string
      activities: Array<{
        activity: BOQActivity
        total: number
        previousPeriodDone: number
        beforePeriodDone: number
        thisPeriodPlanned: number
        thisPeriodDone: number
        thisPeriodDonePercent: number
        cumPlanned: number
        cumPlannedProgressPercent: number
        cumDone: number
        cumDonePercent: number
        balance: number
        unit: string
      }>
    }> = []
    
    zonesMap.forEach((workTypesMap, zone) => {
      workTypesMap.forEach((zoneActivities, workType) => {
        const processedActivities = zoneActivities.map((activity: BOQActivity) => {
          // Get KPIs for this activity (STRICT matching: Project + Activity + Zone)
          const activityKPIs = kpis.filter((kpi: any) => kpiMatchesActivity(kpi, activity, zone))
          
          // Get total units
          const total = activity.total_units || activity.planned_units || 0
          const unit = activity.unit || 'N/A'
          
          // Calculate previous period dates
          let previousPeriodStart: Date | null = null
          let previousPeriodEnd: Date | null = null
          
          if (periodType === 'weekly') {
            previousPeriodEnd = new Date(periodStart)
            previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
            previousPeriodEnd.setHours(23, 59, 59, 999)
            previousPeriodStart = new Date(previousPeriodEnd)
            previousPeriodStart.setDate(previousPeriodStart.getDate() - 6)
            previousPeriodStart.setHours(0, 0, 0, 0)
          } else if (periodType === 'monthly') {
            previousPeriodEnd = new Date(periodStart)
            previousPeriodEnd.setDate(0)
            previousPeriodEnd.setHours(23, 59, 59, 999)
            previousPeriodStart = new Date(previousPeriodEnd.getFullYear(), previousPeriodEnd.getMonth(), 1)
            previousPeriodStart.setHours(0, 0, 0, 0)
          } else if (periodType === 'custom') {
            const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
            previousPeriodEnd = new Date(periodStart)
            previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
            previousPeriodEnd.setHours(23, 59, 59, 999)
            previousPeriodStart = new Date(previousPeriodEnd)
            previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff)
            previousPeriodStart.setHours(0, 0, 0, 0)
          }
          
          // Previous Period Done = مجموع الكمية الفعلية في الفترة السابقة مباشرة
          const previousPeriodDone = previousPeriodStart && previousPeriodEnd
            ? activityKPIs
                .filter((kpi: any) => {
                  const kpiDate = getKPIDate(kpi)
                  if (!kpiDate) return false
                  if (kpiDate < previousPeriodStart! || kpiDate > previousPeriodEnd!) return false
                  return getKPIInputType(kpi) === 'actual'
                })
                .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
            : 0
          
          // Before Period Done = مجموع كل الكمية الفعلية قبل بداية الفترة المحددة
          const beforePeriodDone = activityKPIs
            .filter((kpi: any) => {
              const kpiDate = getKPIDate(kpi)
              if (!kpiDate) return false
              if (kpiDate >= periodStart) return false
              return getKPIInputType(kpi) === 'actual'
            })
            .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
          
          // Get KPIs in period
          const periodKPIs = activityKPIs.filter((kpi: any) => {
            const kpiDate = getKPIDate(kpi)
            return kpiDate && kpiDate >= periodStart && kpiDate <= periodEnd
          })
          
          // Current Period Planned = مجموع الكمية المخططة في الفترة المحددة
          const thisPeriodPlanned = periodKPIs
            .filter((kpi: any) => getKPIInputType(kpi) === 'planned')
            .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
          
          // Period Done = مجموع الكمية الفعلية في الفترة المحددة
          const thisPeriodDone = periodKPIs
            .filter((kpi: any) => getKPIInputType(kpi) === 'actual')
            .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
          
          // Calculate percentages
          const thisPeriodDonePercent = thisPeriodPlanned > 0 ? (thisPeriodDone / thisPeriodPlanned) * 100 : 0
          
          // Cum. Planned = مجموع كل الكمية المخططة
          const cumPlanned = activityKPIs
            .filter((kpi: any) => getKPIInputType(kpi) === 'planned')
            .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
          
          // Cum. Done = مجموع كل الكمية الفعلية
          const cumDone = activityKPIs
            .filter((kpi: any) => getKPIInputType(kpi) === 'actual')
            .reduce((sum: number, kpi: any) => sum + getKPIQuantity(kpi), 0)
          
          // Cum. % Done = (Cum. Done / Cum. Planned) × 100
          const cumDonePercent = cumPlanned > 0 ? (cumDone / cumPlanned) * 100 : 0
          
          // Cum. Planned Progress % = (Cum. Planned / Total) × 100
          const cumPlannedProgressPercent = total > 0 ? (cumPlanned / total) * 100 : 0
          
          // Balance = Total - Cum. Done
          const balance = total - cumDone
          
          return {
            activity,
            total,
            previousPeriodDone,
            beforePeriodDone,
            thisPeriodPlanned,
            thisPeriodDone,
            thisPeriodDonePercent,
            cumPlanned,
            cumPlannedProgressPercent,
            cumDone,
            cumDonePercent,
            balance,
            unit
          }
        })
        
        if (processedActivities.length > 0) {
          result.push({
            zone,
            workType,
            activities: processedActivities
          })
        }
      })
    })
    
    // Sort by zone, then by work type
    return result.sort((a, b) => {
      if (a.zone !== b.zone) {
        return a.zone.localeCompare(b.zone)
      }
      return a.workType.localeCompare(b.workType)
    })
  }, [selectedProject, selectedPeriodData, projectActivities, kpis, periodType, kpiMatchesActivity, getKPIDate, getKPIQuantity, getKPIInputType])
  
  // Refs for export
  const tableRefs = useRef<Map<string, HTMLTableElement>>(new Map())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [showZoneExportMenus, setShowZoneExportMenus] = useState<Set<number>>(new Set())
  const zoneExportMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  
  // Close export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close main export menu
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
      
      // Close zone export menus
      let clickedInsideAnyZoneMenu = false
      zoneExportMenuRefs.current.forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          clickedInsideAnyZoneMenu = true
        }
      })
      
      if (!clickedInsideAnyZoneMenu) {
        setShowZoneExportMenus(new Set())
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Prepare data for export
  const prepareExportData = useMemo(() => {
    if (!selectedProject || !selectedPeriodData || groupedData.length === 0) return []
    
    const exportData: any[] = []
    
    groupedData.forEach((group) => {
      // Add zone header row
      exportData.push({
        'Zone': `ZONE - ${group.zone} - ${group.workType}`,
        'Description': '',
        'Unit': '',
        'Total': '',
        'Last Period Actual': '',
        'Before Period Done': '',
        'Current Period Planned': '',
        'Period Done': '',
        'Period Done %': '',
        'Cum. Planned': '',
        'Cum. Done': '',
        'Cum. % Done': '',
        'Balance': ''
      })
      
      // Add column headers
      exportData.push({
        'Zone': '',
        'Description': 'Description',
        'Unit': 'Unit',
        'Total': 'Total',
        'Last Period Actual': `Last ${periodType === 'weekly' ? 'week' : periodType === 'monthly' ? 'Month' : 'Period'} progres`,
        'Before Period Done': 'Cum Previouly Complated',
        'Current Period Planned': `${periodType === 'weekly' ? 'Current Week' : periodType === 'monthly' ? 'Current Month' : 'Current Period'} Planned progres`,
        'Period Done': `${periodType === 'weekly' ? 'Current Week progres' : periodType === 'monthly' ? 'Month Done' : 'Period Done'}`,
        'Period Done %': `${periodType === 'weekly' ? 'Current Week progres %' : periodType === 'monthly' ? 'Month Done %' : 'Period Done %'}`,
        'Cum. Planned': 'Cum. Planned progres',
        'Cum. Planned progres %': 'Cum. Planned progres %',
        'Cum. Done': 'Cum. Acual progres',
        'Cum. % Done': 'Cum. Acual progres %',
        'Balance': 'remaining'
      })
      
      // Add activity rows
      group.activities.forEach((item) => {
        exportData.push({
          'Zone': '',
          'Description': item.activity.activity_description || 'Unknown',
          'Unit': item.unit,
          'Total': item.total,
          'Last Period Actual': item.previousPeriodDone,
          'Before Period Done': item.beforePeriodDone,
          'Current Period Planned': item.thisPeriodPlanned,
          'Period Done': item.thisPeriodDone,
          'Period Done %': `${item.thisPeriodDonePercent.toFixed(1)}%`,
          'Cum. Planned': item.cumPlanned,
          'Cum. Planned progres %': `${item.cumPlannedProgressPercent.toFixed(1)}%`,
          'Cum. Done': item.cumDone,
          'Cum. % Done': `${item.cumDonePercent.toFixed(1)}%`,
          'Balance': item.balance
        })
      })
      
      // Add empty row between zones
      exportData.push({
        'Zone': '',
        'Description': '',
        'Unit': '',
        'Total': '',
        'Last Period Actual': '',
        'Before Period Done': '',
        'Current Period Planned': '',
        'Period Done': '',
        'Period Done %': '',
        'Cum. Planned': '',
        'Cum. Done': '',
        'Cum. % Done': '',
        'Balance': ''
      })
    })
    
    return exportData
  }, [groupedData, selectedProject, selectedPeriodData, periodType])
  
  // Export functions
  const handleExportExcel = async () => {
    if (prepareExportData.length === 0) {
      alert('No data to export')
      return
    }
    
    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
    const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
    const filename = `Activity_Periodical_Progress_${projectCode}_${periodLabel}`
    
    await downloadExcel(prepareExportData, filename, 'Activity Periodical Progress')
    setShowExportMenu(false)
  }
  
  const handleExportCSV = () => {
    if (prepareExportData.length === 0) {
      alert('No data to export')
      return
    }
    
    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
    const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
    const filename = `Activity_Periodical_Progress_${projectCode}_${periodLabel}`
    
    downloadCSV(prepareExportData, filename)
    setShowExportMenu(false)
  }
  
  const handleExportPDF = async () => {
    if (groupedData.length === 0) {
      alert('No data to export')
      return
    }
    
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
      const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
      
      // Create PDF in landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = 297 // A4 landscape width in mm
      const pdfHeight = 210 // A4 landscape height in mm
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)
      
      // Add title
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Activity Periodical Progress Report', margin, margin + 10)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Project: ${projectCode}`, margin, margin + 18)
      pdf.text(`Period: ${selectedPeriodData?.label || ''}`, margin, margin + 24)
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 30)
      
      let yPosition = margin + 40
      
      // Capture each zone table
      for (let i = 0; i < groupedData.length; i++) {
        const group = groupedData[i]
        const tableId = `table-${group.zone}-${group.workType}-${i}`
        
        // Find table element
        const tableElement = document.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement
        if (!tableElement) continue
        
        // Check if we need a new page
        if (yPosition > pdfHeight - 60) {
          pdf.addPage()
          yPosition = margin
        }
        
        // Add zone header
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`ZONE - ${group.zone} - ${group.workType}`, margin, yPosition)
        yPosition += 8
        
        // Capture table as image
        const canvas = await html2canvas(tableElement, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          logging: false,
          useCORS: true,
          width: tableElement.scrollWidth,
          height: tableElement.scrollHeight
        })
        
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = contentWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        // Check if image fits on current page
        if (yPosition + imgHeight > pdfHeight - margin) {
          pdf.addPage()
          yPosition = margin
        }
        
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
        yPosition += imgHeight + 10
      }
      
      const filename = `Activity_Periodical_Progress_${projectCode}_${periodLabel}.pdf`
      pdf.save(filename)
      setShowExportMenu(false)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
    }
  }
  
  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (groupedData.length === 0) {
      alert('No data to export')
      return
    }
    
    try {
      const html2canvas = (await import('html2canvas')).default
      
      const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
      const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
      
      // Get all tables container
      const tablesContainer = document.querySelector('[data-tables-container]') as HTMLElement
      if (!tablesContainer) {
        alert('Tables not found')
        return
      }
      
      // Capture as image
      const canvas = await html2canvas(tablesContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        width: tablesContainer.scrollWidth,
        height: tablesContainer.scrollHeight
      })
      
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image')
          return
        }
        
        const url = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = `Activity_Periodical_Progress_${projectCode}_${periodLabel}.${format}`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
      }, `image/${format}`, 0.95)
      
      setShowExportMenu(false)
    } catch (error) {
      console.error('Error exporting image:', error)
      alert('Failed to export image')
    }
  }
  
  // Export functions for individual zones
  const prepareZoneExportData = (group: typeof groupedData[0]) => {
    const exportData: any[] = []
    
    // Add zone header row
    exportData.push({
      'Zone': `ZONE - ${group.zone} - ${group.workType}`,
      'Description': '',
      'Unit': '',
      'Total': '',
      'Last Period Actual': '',
      'Before Period Done': '',
      'Current Period Planned': '',
      'Period Done': '',
        'Period Done %': '',
        'Cum. Planned': '',
        'Cum. Planned progres %': '',
        'Cum. Done': '',
        'Cum. % Done': '',
        'Balance': ''
      })
      
      // Add column headers
      exportData.push({
        'Zone': '',
        'Description': 'Description',
        'Unit': 'Unit',
        'Total': 'Total',
        'Last Period Actual': `Last ${periodType === 'weekly' ? 'week' : periodType === 'monthly' ? 'Month' : 'Period'} progres`,
        'Before Period Done': 'Cum Previouly Complated',
        'Current Period Planned': `${periodType === 'weekly' ? 'Current Week' : periodType === 'monthly' ? 'Current Month' : 'Current Period'} Planned progres`,
        'Period Done': `${periodType === 'weekly' ? 'Current Week progres' : periodType === 'monthly' ? 'Month Done' : 'Period Done'}`,
        'Period Done %': `${periodType === 'weekly' ? 'Current Week progres %' : periodType === 'monthly' ? 'Month Done %' : 'Period Done %'}`,
        'Cum. Planned': 'Cum. Planned progres',
        'Cum. Planned progres %': 'Cum. Planned progres %',
        'Cum. Done': 'Cum. Acual progres',
        'Cum. % Done': 'Cum. Acual progres %',
        'Balance': 'remaining'
      })
      
      // Add activity rows
      group.activities.forEach((item) => {
        exportData.push({
          'Zone': '',
          'Description': item.activity.activity_description || 'Unknown',
          'Unit': item.unit,
          'Total': item.total,
          'Last Period Actual': item.previousPeriodDone,
          'Before Period Done': item.beforePeriodDone,
          'Current Period Planned': item.thisPeriodPlanned,
          'Period Done': item.thisPeriodDone,
          'Period Done %': `${item.thisPeriodDonePercent.toFixed(1)}%`,
          'Cum. Planned': item.cumPlanned,
          'Cum. Planned progres %': `${item.cumPlannedProgressPercent.toFixed(1)}%`,
          'Cum. Done': item.cumDone,
          'Cum. % Done': `${item.cumDonePercent.toFixed(1)}%`,
          'Balance': item.balance
        })
      })
    
    return exportData
  }
  
  const handleExportZoneExcel = async (group: typeof groupedData[0], groupIndex: number) => {
    const exportData = prepareZoneExportData(group)
    
    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
    const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
    const zoneLabel = `${group.zone}_${group.workType}`.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Activity_Periodical_Progress_${projectCode}_${periodLabel}_Zone_${zoneLabel}`
    
    await downloadExcel(exportData, filename, `Zone ${group.zone} - ${group.workType}`)
  }
  
  const handleExportZoneCSV = (group: typeof groupedData[0], groupIndex: number) => {
    const exportData = prepareZoneExportData(group)
    
    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
    const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
    const zoneLabel = `${group.zone}_${group.workType}`.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Activity_Periodical_Progress_${projectCode}_${periodLabel}_Zone_${zoneLabel}`
    
    downloadCSV(exportData, filename)
  }
  
  const handleExportZonePDF = async (group: typeof groupedData[0], groupIndex: number) => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
      const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
      const zoneLabel = `${group.zone}_${group.workType}`.replace(/[^a-zA-Z0-9]/g, '_')
      
      // Find table element
      const tableId = `table-${group.zone}-${group.workType}-${groupIndex}`
      const tableElement = document.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement
      if (!tableElement) {
        alert('Table not found')
        return
      }
      
      // Create PDF in landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = 297 // A4 landscape width in mm
      const pdfHeight = 210 // A4 landscape height in mm
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)
      
      // Add title
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Activity Periodical Progress Report', margin, margin + 10)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Project: ${projectCode}`, margin, margin + 18)
      pdf.text(`Period: ${selectedPeriodData?.label || ''}`, margin, margin + 24)
      pdf.text(`Zone: ${group.zone} - ${group.workType}`, margin, margin + 30)
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 36)
      
      let yPosition = margin + 46
      
      // Add zone header
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`ZONE - ${group.zone} - ${group.workType}`, margin, yPosition)
      yPosition += 8
      
      // Capture table as image
      const canvas = await html2canvas(tableElement, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
        useCORS: true,
        width: tableElement.scrollWidth,
        height: tableElement.scrollHeight
      })
      
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Check if image fits on current page
      if (yPosition + imgHeight > pdfHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }
      
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
      
      const filename = `Activity_Periodical_Progress_${projectCode}_${periodLabel}_Zone_${zoneLabel}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('Error exporting zone PDF:', error)
      alert('Failed to export PDF')
    }
  }
  
  const handleExportZoneImage = async (group: typeof groupedData[0], groupIndex: number, format: 'png' | 'jpeg') => {
    try {
      const html2canvas = (await import('html2canvas')).default
      
      const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
      const periodLabel = selectedPeriodData?.label.replace(/[^a-zA-Z0-9]/g, '_') || 'Period'
      const zoneLabel = `${group.zone}_${group.workType}`.replace(/[^a-zA-Z0-9]/g, '_')
      
      // Find table element
      const tableId = `table-${group.zone}-${group.workType}-${groupIndex}`
      const tableElement = document.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement
      if (!tableElement) {
        alert('Table not found')
        return
      }
      
      // Get the card container for better capture
      const cardElement = tableElement.closest('.overflow-x-auto')?.parentElement
      const elementToCapture = cardElement || tableElement
      
      // Capture as image
      const canvas = await html2canvas(elementToCapture, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        width: elementToCapture.scrollWidth,
        height: elementToCapture.scrollHeight
      })
      
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image')
          return
        }
        
        const url = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = `Activity_Periodical_Progress_${projectCode}_${periodLabel}_Zone_${zoneLabel}.${format}`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
      }, `image/${format}`, 0.95)
    } catch (error) {
      console.error('Error exporting zone image:', error)
      alert('Failed to export image')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Periodical Progress Report</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Weekly, Monthly, or Custom Period Progress Report
          </p>
        </div>
        
        {/* Export Button */}
        {groupedData.length > 0 && (
          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as Excel
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <File className="h-4 w-4" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExportImage('png')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Export as PNG
                  </button>
                  <button
                    onClick={() => handleExportImage('jpeg')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Export as JPEG
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Project Selection with Search */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Project:
              </label>
              <div className="relative" ref={projectDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedProject 
                      ? `${selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`} - ${selectedProject.project_name}`
                      : projectSearch || 'All Projects'}
                    onChange={(e) => {
                      if (!selectedProjectId) {
                        setProjectSearch(e.target.value)
                      }
                    }}
                    onFocus={() => {
                      setShowProjectDropdown(true)
                      if (selectedProjectId) {
                        setProjectSearch('')
                      }
                    }}
                    onClick={() => setShowProjectDropdown(true)}
                    readOnly={!!selectedProjectId}
                    placeholder="Search or select project..."
                    className="px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ChevronDown 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                  />
                </div>
                
                {showProjectDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          placeholder="Search project..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Project List */}
                    <div className="max-h-48 overflow-auto">
                      {/* Clear Selection Option */}
                      <button
                        onClick={() => {
                          setSelectedProjectId('')
                          setProjectSearch('')
                          setShowProjectDropdown(false)
                          setSelectedPeriod('')
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        All Projects
                      </button>
                      
                      {filteredProjectsForDropdown.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No projects found
                        </div>
                      ) : (
                        filteredProjectsForDropdown.map((project: Project) => {
                          const projectCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
                          const isSelected = selectedProjectId === project.id
                          
                          return (
                            <button
                              key={project.id}
                              onClick={() => {
                                setSelectedProjectId(project.id)
                                setProjectSearch('')
                                setShowProjectDropdown(false)
                                setSelectedPeriod('')
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                isSelected 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="font-medium">{projectCode}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{project.project_name}</div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedProjectId && (
                <Button
                  onClick={() => {
                    setSelectedProjectId('')
                    setProjectSearch('')
                    setSelectedPeriod('')
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>
            
            {/* Period Type */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Period Type:
              </label>
              <select
                value={periodType}
                onChange={(e) => {
                  setPeriodType(e.target.value as PeriodType)
                  setSelectedPeriod('')
                  setCustomStartDate('')
                  setCustomEndDate('')
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            {/* Custom Date Range */}
            {periodType === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Start Date:
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value)
                      setSelectedPeriod('')
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    End Date:
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value)
                      setSelectedPeriod('')
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}
            
            {/* Period Selection */}
            {availablePeriods.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Period:
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[300px]"
                >
                  <option value="">Select Period</option>
                  {availablePeriods.map((period) => (
                    <option key={period.key} value={period.key}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Report Content */}
      {!selectedProject ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <CalendarRange className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Please select a project</p>
            </div>
          </CardContent>
        </Card>
      ) : !selectedPeriodData ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <CalendarRange className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Please select a period</p>
            </div>
          </CardContent>
        </Card>
      ) : groupedData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <CalendarRange className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data available for the selected period</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6" data-tables-container>
          {/* Project Overview Section */}
          {selectedProject && projectSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Project Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Project Code</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedProject.project_name}</div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Activities</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{projectSummary.totalActivities}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {projectSummary.completedActivities} Completed, {projectSummary.onTrackActivities} On Track
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Zones & Divisions</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {projectSummary.totalZones} Zones
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {projectSummary.totalDivisions} Divisions
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Project Status</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                      {selectedProject.project_status || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {projectSummary.delayedActivities} Delayed
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Overall Progress Summary */}
          {projectSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Overall Progress Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Planned Units</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projectSummary.totalPlannedUnits.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Actual: {projectSummary.totalActualUnits.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(projectSummary.overallProgress, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {projectSummary.overallProgress.toFixed(1)}% Complete
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {periodType === 'weekly' ? 'Current Week' : periodType === 'monthly' ? 'Current Month' : 'Current Period'} Progress
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projectSummary.periodActual.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Planned: {projectSummary.periodPlanned.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(projectSummary.periodProgress, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {projectSummary.periodProgress.toFixed(1)}% of Planned
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cumulative Progress</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projectSummary.cumulativeActual.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Planned: {projectSummary.cumulativePlanned.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(projectSummary.cumulativeProgress, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {projectSummary.cumulativeProgress.toFixed(1)}% of Planned
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Financial Progress</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(projectSummary.earnedValue, selectedProject?.currency)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Total: {formatCurrency(projectSummary.totalValue, selectedProject?.currency)}
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(projectSummary.valueProgress, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {projectSummary.valueProgress.toFixed(1)}% Complete
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Activity Status Summary */}
          {projectSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Activity Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {projectSummary.completedActivities}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Completed Activities</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {projectSummary.totalActivities > 0 
                          ? ((projectSummary.completedActivities / projectSummary.totalActivities) * 100).toFixed(1)
                          : 0}% of total
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {projectSummary.onTrackActivities}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">On Track Activities</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {projectSummary.totalActivities > 0 
                          ? ((projectSummary.onTrackActivities / projectSummary.totalActivities) * 100).toFixed(1)
                          : 0}% of total
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {projectSummary.delayedActivities}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Delayed Activities</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {projectSummary.totalActivities > 0 
                          ? ((projectSummary.delayedActivities / projectSummary.totalActivities) * 100).toFixed(1)
                          : 0}% of total
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Period Information */}
          {selectedPeriodData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Period Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Period Type</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{periodType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Period Range</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedPeriodData.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {selectedPeriodData.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Detailed Progress Tables */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Progress by Zone and Work Type</h4>
          {groupedData.map((group, groupIndex) => (
              <Card key={`${group.zone}-${group.workType}-${groupIndex}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      ZONE - {group.zone} - {group.workType}
                    </CardTitle>
                    <div 
                      className="relative" 
                      ref={(el) => {
                        if (el) zoneExportMenuRefs.current.set(groupIndex, el)
                        else zoneExportMenuRefs.current.delete(groupIndex)
                      }}
                    >
                      <Button
                        onClick={() => {
                          const newSet = new Set(showZoneExportMenus)
                          if (newSet.has(groupIndex)) {
                            newSet.delete(groupIndex)
                          } else {
                            newSet.clear()
                            newSet.add(groupIndex)
                          }
                          setShowZoneExportMenus(newSet)
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Zone
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      
                      {showZoneExportMenus.has(groupIndex) && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                handleExportZoneExcel(group, groupIndex)
                                setShowZoneExportMenus(new Set())
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                              Export as Excel
                            </button>
                            <button
                              onClick={() => {
                                handleExportZoneCSV(group, groupIndex)
                                setShowZoneExportMenus(new Set())
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Export as CSV
                            </button>
                            <button
                              onClick={() => {
                                handleExportZonePDF(group, groupIndex)
                                setShowZoneExportMenus(new Set())
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <File className="h-4 w-4" />
                              Export as PDF
                            </button>
                            <button
                              onClick={() => {
                                handleExportZoneImage(group, groupIndex, 'png')
                                setShowZoneExportMenus(new Set())
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <ImageIcon className="h-4 w-4" />
                              Export as PNG
                            </button>
                            <button
                              onClick={() => {
                                handleExportZoneImage(group, groupIndex, 'jpeg')
                                setShowZoneExportMenus(new Set())
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <ImageIcon className="h-4 w-4" />
                              Export as JPEG
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table 
                    className="w-full border-collapse text-sm"
                    data-table-id={`table-${group.zone}-${group.workType}-${groupIndex}`}
                  >
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white">
                          Description
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                          Unit
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Total
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Last {periodType === 'weekly' ? 'week' : periodType === 'monthly' ? 'Month' : 'Period'} progres
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Cum Previouly Complated
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          {periodType === 'weekly' ? 'Current Week' : periodType === 'monthly' ? 'Current Month' : 'Current Period'} Planned progres
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          {periodType === 'weekly' ? 'Current Week progres' : periodType === 'monthly' ? 'Month Done' : 'Period Done'}
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          {periodType === 'weekly' ? 'Current Week progres %' : periodType === 'monthly' ? 'Month Done %' : 'Period Done %'}
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Cum. Planned progres
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Cum. Planned progres %
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Cum. Acual progres
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          Cum. Acual progres %
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          remaining
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.activities.map((item, index) => (
                        <tr
                          key={`${item.activity.id || index}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">
                            {item.activity.activity_description || 'Unknown Activity'}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                            {item.unit}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.previousPeriodDone.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.beforePeriodDone.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.thisPeriodPlanned.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.thisPeriodDone.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.thisPeriodDonePercent.toFixed(1)}%
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.cumPlanned.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.cumPlannedProgressPercent.toFixed(1)}%
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.cumDone.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.cumDonePercent.toFixed(1)}%
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-white">
                            {item.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}
    </div>
  )
})

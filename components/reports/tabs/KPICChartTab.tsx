'use client'

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { Project, BOQActivity } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Activity, BarChart3, AlertTriangle, Search, ChevronDown, Download, FileSpreadsheet, Image as ImageIcon, FileText, X, CheckSquare } from 'lucide-react'
import { formatDate, formatDateShort } from '@/lib/dateHelpers'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface KPICChartTabProps {
  activities: BOQActivity[]
  projects: Project[]
  kpis: any[]
  formatCurrency: (value: number, currency?: string) => string
}

export const KPICChartTab = memo(function KPICChartTab({ activities, projects, kpis, formatCurrency }: KPICChartTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [cutOffDate, setCutOffDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set())
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [showCombinedView, setShowCombinedView] = useState<boolean>(false)
  
  // Bulk export states
  const [showBulkExportModal, setShowBulkExportModal] = useState(false)
  const [selectedActivitiesForExport, setSelectedActivitiesForExport] = useState<Set<string>>(new Set())
  const [selectedZonesForExport, setSelectedZonesForExport] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  
  // Search states for dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [activitySearch, setActivitySearch] = useState('')
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [zoneSearch, setZoneSearch] = useState('')
  
  // Refs for chart and table export
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const tableRefs = useRef<Map<string, HTMLTableElement>>(new Map())
  
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const activityDropdownRef = useRef<HTMLDivElement>(null)
  const zoneDropdownRef = useRef<HTMLDivElement>(null)
  
  // Filter KPIs and activities for selected project
  const selectedProject = useMemo(() => {
    return projects.find((p: Project) => p.id === selectedProjectId)
  }, [projects, selectedProjectId])
  
  const projectActivities = useMemo(() => {
    if (!selectedProject) return []
    
    const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    
    let filtered = activities.filter((activity: BOQActivity) => {
      const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      return activityFullCode === projectFullCode || activity.project_id === selectedProject.id
    })
    
    // Filter by selected activities (multiple selection)
    if (selectedActivityIds.size > 0) {
      // Get all selected activity names
      // First, try to find activities by ID in the filtered list
      const selectedActivityNames = new Set<string>()
      selectedActivityIds.forEach((activityId) => {
        // Try to find in filtered list first
        let selectedActivity = filtered.find((activity: BOQActivity) => activity.id === activityId)
        
        // If not found, try to find in all project activities
        if (!selectedActivity) {
          const projectFullCode = (selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
          const projectActivities = activities.filter((activity: BOQActivity) => {
            const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            return activityFullCode === projectFullCode || activity.project_id === selectedProject?.id
          })
          selectedActivity = projectActivities.find((activity: BOQActivity) => activity.id === activityId)
        }
        
        // If still not found, try to find by matching with availableActivities
        if (!selectedActivity) {
          const availableActivity = availableActivities.find((a) => a.id === activityId)
          if (availableActivity) {
            // Use the name from availableActivities
            selectedActivityNames.add(availableActivity.name.toLowerCase().trim())
          }
        } else {
          // Use the activity name from the found activity
          const activityName = (selectedActivity.activity_description || '').toLowerCase().trim()
          selectedActivityNames.add(activityName)
        }
      })
      
      // Filter by activity names (to include all zones for selected activities)
      if (selectedActivityNames.size > 0) {
        filtered = filtered.filter((activity: BOQActivity) => {
          const activityName = (activity.activity_description || '').toLowerCase().trim()
          return selectedActivityNames.has(activityName)
        })
      }
    }
    
    // Filter by selected zones (multiple selection) - but ignore zones if combined view is enabled
    if (selectedZones.size > 0 && !showCombinedView) {
      filtered = filtered.filter((activity: BOQActivity) => {
        const rawActivity = (activity as any).raw || {}
        const activityZone = (activity.zone_number || rawActivity['Zone Number'] || '0').toString().trim().toUpperCase()
        return Array.from(selectedZones).some((selectedZone) => {
          const zoneUpper = selectedZone.toUpperCase()
          return activityZone === zoneUpper || activityZone.includes(zoneUpper)
        })
      })
    }
    
    return filtered
  }, [activities, selectedProject, selectedActivityIds, selectedZones, showCombinedView])
  
  // Get unique activities for dropdown
  const availableActivities = useMemo(() => {
    if (!selectedProject) return []
    
    const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    
    const projectActivities = activities.filter((activity: BOQActivity) => {
      const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      return activityFullCode === projectFullCode || activity.project_id === selectedProject.id
    })
    
    // Use Map to store unique activities by name (normalized)
    // This ensures each activity appears only once in the filter, even if it exists in multiple zones
    const uniqueActivitiesMap = new Map<string, { id: string; name: string; zone: string }>()
    
    projectActivities.forEach((activity: BOQActivity) => {
      const activityName = (activity.activity_description || 'Unknown Activity').trim()
      const zone = (activity as any).zone_number || ((activity as any).raw || {})['Zone Number'] || '0'
      
      // Use normalized activity name as key to ensure uniqueness
      const normalizedName = activityName.toLowerCase().trim()
      
      // If activity doesn't exist in map, add it
      // If it exists, we keep the first occurrence (or you could keep the one with the first ID)
      if (!uniqueActivitiesMap.has(normalizedName)) {
        uniqueActivitiesMap.set(normalizedName, {
          id: activity.id, // Use the first activity ID found
          name: activityName,
          zone: zone // This will be the zone of the first occurrence, but it doesn't matter for the filter
        })
      }
    })
    
    // Convert Map values to array and sort by name
    return Array.from(uniqueActivitiesMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    )
  }, [activities, selectedProject])
  
  // Get unique zones for dropdown
  const availableZones = useMemo(() => {
    if (!selectedProject) return []
    
    const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    
    const projectActivities = activities.filter((activity: BOQActivity) => {
      const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      return activityFullCode === projectFullCode || activity.project_id === selectedProject.id
    })
    
    const zones = new Set<string>()
    projectActivities.forEach((activity: BOQActivity) => {
      const rawActivity = (activity as any).raw || {}
      const zone = (activity.zone_number || rawActivity['Zone Number'] || '0').toString().trim()
      if (zone) {
        zones.add(zone)
      }
    })
    
    return Array.from(zones).sort()
  }, [activities, selectedProject])
  
  // Reset filters when project changes
  useEffect(() => {
    setSelectedActivityIds(new Set())
    setSelectedZones(new Set())
    setActivitySearch('')
    setZoneSearch('')
  }, [selectedProjectId])
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(event.target as Node)) {
        setShowActivityDropdown(false)
      }
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setShowZoneDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects
    const searchLower = projectSearch.toLowerCase()
    return projects.filter((project: Project) => {
      const projectCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toLowerCase()
      const projectName = (project.project_name || '').toLowerCase()
      return projectCode.includes(searchLower) || projectName.includes(searchLower)
    })
  }, [projects, projectSearch])
  
  // Filter activities by search
  const filteredActivities = useMemo(() => {
    if (!activitySearch.trim()) return availableActivities
    const searchLower = activitySearch.toLowerCase()
    return availableActivities.filter((activity: { id: string; name: string; zone: string }) => {
      const name = activity.name.toLowerCase()
      return name.includes(searchLower) // ✅ Search only in activity name, not zone
    })
  }, [availableActivities, activitySearch])
  
  // Filter zones by search
  const filteredZones = useMemo(() => {
    if (!zoneSearch.trim()) return availableZones
    const searchLower = zoneSearch.toLowerCase()
    return availableZones.filter((zone: string) => zone.toLowerCase().includes(searchLower))
  }, [availableZones, zoneSearch])
  
  // Get selected project/activity/zone names for display
  const selectedProjectName = useMemo(() => {
    if (!selectedProjectId) return '-- All Projects --'
    const project = projects.find((p: Project) => p.id === selectedProjectId)
    if (!project) return '-- All Projects --'
    return `${project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`} - ${project.project_name}`
  }, [projects, selectedProjectId])
  
  const selectedActivityNames = useMemo(() => {
    if (selectedActivityIds.size === 0) return '-- All Activities --'
    const names = Array.from(selectedActivityIds)
      .map((id) => {
        const activity = availableActivities.find((a) => a.id === id)
        return activity ? activity.name : null
      })
      .filter((name): name is string => name !== null)
    
    if (names.length === 0) return '-- All Activities --'
    if (names.length === 1) return names[0]
    return `${names.length} Activities Selected`
  }, [availableActivities, selectedActivityIds])
  
  // Helper function to normalize zone strings
  const normalizeZone = useCallback((zone: string | null | undefined): string => {
    if (!zone) return ''
    return zone.toString().trim().toUpperCase().replace(/\s+/g, ' ')
  }, [])
  
  // Helper function to extract zone number
  const extractZoneNumber = useCallback((zone: string): string | null => {
    if (!zone) return null
    const match = zone.match(/\d+/)
    return match ? match[0] : null
  }, [])
  
  // Helper function to match zones (FLEXIBLE)
  const zonesMatch = useCallback((zone1: string, zone2: string): boolean => {
    if (!zone1 || !zone2) return false
    
    const norm1 = normalizeZone(zone1)
    const norm2 = normalizeZone(zone2)
    
    // Exact match (case-insensitive)
    if (norm1 === norm2) return true
    
    // Extract numbers and compare (strict equality on number)
    const num1 = extractZoneNumber(norm1)
    const num2 = extractZoneNumber(norm2)
    
    if (num1 && num2 && num1 === num2) {
      return true
    }
    
    return false
  }, [normalizeZone, extractZoneNumber])
  
  // Helper function to match KPI to Activity (includes Zone matching)
  const kpiMatchesActivity = useCallback((kpi: any, activity: BOQActivity): boolean => {
    const rawKPI = (kpi as any).raw || {}
    
    // 1. Project Code Matching
    const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
    const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
    const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
    const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
    
    // Strict project match: prefer full code, otherwise code, no startsWith
    const projectMatch =
      (activityProjectFullCode && kpiProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
      (!activityProjectFullCode && activityProjectCode && kpiProjectCode === activityProjectCode)
    
    if (!projectMatch) return false
    
    // 2. Activity Name Matching (strict normalized match to avoid false positives)
    const normalizeName = (val: string) => val.toString().trim().toLowerCase()
    const kpiActivityName = normalizeName(kpi.activity_description || (kpi as any).activity_name || kpi['Activity Description'] || kpi['Activity Name'] || rawKPI['Activity Description'] || rawKPI['Activity Name'] || '')
    const activityName = normalizeName(activity.activity_description || '')
    const activityMatch = kpiActivityName && activityName && kpiActivityName === activityName
    
    if (!activityMatch) return false
    
    // 3. Zone Matching (FLEXIBLE - only enforce if both have zones AND they don't match)
    const rawActivity = (activity as any).raw || {}
    const activityZone = (activity.zone_number || rawActivity['Zone Number'] || '').toString().trim()
    const kpiZone = ((kpi as any).zone_number || (kpi as any).zone || kpi['Zone Number'] || rawKPI['Zone Number'] || rawKPI['Zone'] || '0').toString().trim()
    
    // Only enforce zone matching if BOTH activity and KPI have zones
    // If either doesn't have a zone, allow the match (flexible)
    if (activityZone && kpiZone) {
      // Both have zones - check if they match
      // If they don't match, reject (different zones)
      if (!zonesMatch(activityZone, kpiZone)) {
        return false
      }
    }
    // If activity has zone but KPI doesn't, allow it (KPI might be general)
    // If activity doesn't have zone, allow all KPIs (activity is general)
    // If KPI has zone but activity doesn't, allow it (activity might be general)
    
    return true
  }, [zonesMatch])
  
  // Helper function to match KPI to activity (ignoring zone for combined view)
  const kpiMatchesActivityCombined = useCallback((kpi: any, activityName: string, projectFullCode: string): boolean => {
    const rawKPI = (kpi as any).raw || {}
    
    // 1. Project Code Matching
    const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
    const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
    
    // Strict project match for combined view
    const projectMatch =
      (projectFullCode && kpiProjectFullCode === projectFullCode) ||
      (!projectFullCode && kpiProjectCode === projectFullCode)
    
    if (!projectMatch) return false
    
    // 2. Activity Name Matching (case-insensitive, ignore zone)
    const normalizeName = (val: string) => val.toString().trim().toLowerCase()
    const kpiActivityName = normalizeName(kpi.activity_description || (kpi as any).activity_name || kpi['Activity Description'] || kpi['Activity Name'] || rawKPI['Activity Description'] || rawKPI['Activity Name'] || rawKPI['Activity'] || '')
    const normalizedActivityName = normalizeName(activityName)
    
    if (!kpiActivityName || !normalizedActivityName) return false
    if (kpiActivityName !== normalizedActivityName) return false
    
    // ✅ For combined view, we ignore zone matching completely
    return true
  }, [])

  // Calculate chart data for each activity
  const activitiesChartData = useMemo(() => {
    if (!selectedProject || projectActivities.length === 0) return []
    
    const cutOff = new Date(cutOffDate)
    cutOff.setHours(23, 59, 59, 999)
    
    const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    
    // If combined view is enabled, group activities by name
    if (showCombinedView) {
      // Group activities by name
      const activitiesByName = new Map<string, BOQActivity[]>()
      projectActivities.forEach((activity: BOQActivity) => {
        const activityName = (activity.activity_description || 'Unknown Activity').toLowerCase().trim()
        if (!activitiesByName.has(activityName)) {
          activitiesByName.set(activityName, [])
        }
        activitiesByName.get(activityName)!.push(activity)
      })
      
      // Process each unique activity name
      return Array.from(activitiesByName.entries()).map(([activityName, activitiesWithSameName]) => {
        // Get all KPIs for this activity name (from all zones)
        const activityKPIs = kpis.filter((kpi: any) => {
          try {
            return kpiMatchesActivityCombined(kpi, activityName, projectFullCode)
          } catch (error) {
            console.error('Error matching KPI to activity (combined):', error, { kpi, activityName })
            return false
          }
        })
        
        // Use the first activity as the representative activity
        const representativeActivity = activitiesWithSameName[0]
        
        // Continue with the same logic for processing KPIs...
        // Separate Planned and Actual KPIs
        const plannedKPIs = activityKPIs.filter((kpi: any) => {
          const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
          return inputType === 'planned'
        })
        
        const actualKPIs = activityKPIs.filter((kpi: any) => {
          const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
          return inputType === 'actual'
        })
        
        // Get dates from KPIs and filter by cut-off date
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
            return date <= cutOff ? date : null
          } catch {
            return null
          }
        }
        
        // Helper function to get week number (ISO week)
        const getWeekNumber = (date: Date): number => {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
          const dayNum = d.getUTCDay() || 7
          d.setUTCDate(d.getUTCDate() + 4 - dayNum)
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
          return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        }
        
        // Helper function to get period key based on groupBy (LOCAL date, avoid UTC shift)
        const getPeriodKey = (date: Date): string => {
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          
          if (groupBy === 'daily') {
            // Use local date components instead of toISOString
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          } else if (groupBy === 'weekly') {
            // Get week number and year using ISO week calculation
            const weekNumber = getWeekNumber(date)
            return `${year}-W${weekNumber}`
          } else { // monthly
            return `${year}-${month.toString().padStart(2, '0')}`
          }
        }
        
        // Helper function to format period label
        const formatPeriodLabel = (periodKey: string, startDate: Date, endDate: Date): string => {
          if (groupBy === 'daily') {
            return formatDate(startDate.toISOString())
          } else if (groupBy === 'weekly') {
            return `Week ${periodKey.split('-W')[1]} (${formatDateShort(startDate.toISOString())} - ${formatDateShort(endDate.toISOString())})`
          } else { // monthly
            return formatDate(startDate.toISOString())
          }
        }
        
        // Helper function to get period start and end dates (parse as LOCAL components)
        const getPeriodDates = (periodKey: string): { start: Date; end: Date } => {
          if (groupBy === 'daily') {
            const [y, m, d] = periodKey.split('-').map(Number)
            const date = new Date(y, (m || 1) - 1, d || 1)
            date.setHours(0, 0, 0, 0)
            return { start: date, end: date }
          } else if (groupBy === 'weekly') {
            const [year, weekStr] = periodKey.split('-W')
            const weekNumber = parseInt(weekStr)
            const yearNum = parseInt(year)
            
            // Calculate ISO week start (Monday)
            const simple = new Date(yearNum, 0, 1 + (weekNumber - 1) * 7)
            const dayOfWeek = simple.getDay()
            const weekStart = new Date(simple)
            weekStart.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Monday
            weekStart.setHours(0, 0, 0, 0)
            
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            weekEnd.setHours(23, 59, 59, 999)
            return { start: weekStart, end: weekEnd }
          } else { // monthly
            const [year, month] = periodKey.split('-')
            const start = new Date(parseInt(year), parseInt(month) - 1, 1)
            start.setHours(0, 0, 0, 0)
            const end = new Date(parseInt(year), parseInt(month), 0)
            end.setHours(23, 59, 59, 999)
            return { start, end }
          }
        }
        
        // Group KPIs by period (daily/weekly/monthly)
        const periodMap = new Map<string, { planned: number; actual: number; startDate: Date; endDate: Date }>()
        
        plannedKPIs.forEach((kpi: any) => {
          const date = getKPIDate(kpi)
          if (!date) return
          
          const periodKey = getPeriodKey(date)
          const quantity = parseFloat(String(kpi.quantity || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
          
          if (!periodMap.has(periodKey)) {
            const periodDates = getPeriodDates(periodKey)
            periodMap.set(periodKey, { planned: 0, actual: 0, startDate: periodDates.start, endDate: periodDates.end })
          }
          const current = periodMap.get(periodKey)!
          current.planned += quantity
        })
        
        actualKPIs.forEach((kpi: any) => {
          const date = getKPIDate(kpi)
          if (!date) return
          
          const periodKey = getPeriodKey(date)
          const quantity = parseFloat(String(kpi.quantity || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
          
          if (!periodMap.has(periodKey)) {
            const periodDates = getPeriodDates(periodKey)
            periodMap.set(periodKey, { planned: 0, actual: 0, startDate: periodDates.start, endDate: periodDates.end })
          }
          const current = periodMap.get(periodKey)!
          current.actual += quantity
        })
        
        // Convert to array and sort by period start date
        const chartData = Array.from(periodMap.entries())
          .map(([periodKey, values]) => {
            const periodDates = getPeriodDates(periodKey)
            const startDate = periodDates.start
            const endDate = periodDates.end
            
            // Validate dates before formatting
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.warn(`Invalid dates for periodKey: ${periodKey}`, { startDate, endDate })
              return null // Skip invalid dates
            }
            
            return {
              date: startDate,
              dateStr: periodKey,
              periodLabel: formatPeriodLabel(periodKey, startDate, endDate),
              periodStartDate: startDate, // Store the actual date for chart formatting
              planned: values.planned,
              actual: values.actual,
              cumPlanned: 0,
              cumActual: 0
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null) // Filter out null values
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        // Calculate cumulative values
        let cumPlanned = 0
        let cumActual = 0
        chartData.forEach((item) => {
          cumPlanned += item.planned
          cumActual += item.actual
          item.cumPlanned = cumPlanned
          item.cumActual = cumActual
        })
        
        return {
          activity: {
            ...representativeActivity,
            activity_name: activitiesWithSameName[0].activity_description || 'Unknown Activity', // Backward compatibility
            activity_description: activitiesWithSameName[0].activity_description || 'Unknown Activity',
            // Mark as combined
            _isCombined: true,
            _allZones: activitiesWithSameName.map(a => {
              const rawActivity = (a as any).raw || {}
              return (a.zone_number || rawActivity['Zone Number'] || '0').toString().trim()
            }).filter(z => z).join(', ')
          },
          chartData,
          tableData: chartData.map(item => ({
            date: item.date,
            dateStr: item.periodLabel,
            planned: item.planned,
            actual: item.actual,
            cumPlanned: item.cumPlanned,
            cumActual: item.cumActual
          }))
        }
      })
    }
    
    // Original logic for non-combined view
    return projectActivities.map((activity: BOQActivity) => {
      // Get KPIs for this activity
      const activityKPIs = kpis.filter((kpi: any) => {
        try {
          return kpiMatchesActivity(kpi, activity)
        } catch (error) {
          console.error('Error matching KPI to activity:', error, { kpi, activity })
          return false
        }
      })
      
      // Separate Planned and Actual KPIs
      const plannedKPIs = activityKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'planned'
      })
      
      const actualKPIs = activityKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'actual'
      })
      
      // Get dates from KPIs and filter by cut-off date
      const getKPIDate = (kpi: any): Date | null => {
        const raw = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || raw['Day'] || ''
        // Use activity_date which is the unified date field
        const activityDateValue = kpi.activity_date || raw['Activity Date'] || raw['Actual Date'] || raw['Target Date'] || ''
        
        // Use activity_date as the unified date field
        let dateStr = activityDateValue || dayValue
        
        if (!dateStr) return null
        
        try {
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return null
          return date <= cutOff ? date : null
        } catch {
          return null
        }
      }
      
      // Helper function to get week number (ISO week)
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      }
      
      // Helper function to get period key based on groupBy
      const getPeriodKey = (date: Date): string => {
        if (groupBy === 'daily') {
          return date.toISOString().split('T')[0]
        } else if (groupBy === 'weekly') {
          // Get week number and year using ISO week calculation
          const year = date.getFullYear()
          const weekNumber = getWeekNumber(date)
          return `${year}-W${weekNumber}`
        } else { // monthly
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          return `${year}-${month.toString().padStart(2, '0')}`
        }
      }
      
      // Helper function to format period label
      const formatPeriodLabel = (periodKey: string, startDate: Date, endDate: Date): string => {
        if (groupBy === 'daily') {
          return formatDate(startDate.toISOString())
        } else if (groupBy === 'weekly') {
          return `Week ${periodKey.split('-W')[1]} (${formatDateShort(startDate.toISOString())} - ${formatDateShort(endDate.toISOString())})`
        } else { // monthly
          return formatDate(startDate.toISOString())
        }
      }
      
      // Helper function to get period start and end dates
      const getPeriodDates = (periodKey: string): { start: Date; end: Date } => {
        if (groupBy === 'daily') {
          const date = new Date(periodKey)
          date.setHours(0, 0, 0, 0)
          return { start: date, end: date }
        } else if (groupBy === 'weekly') {
          const [year, weekStr] = periodKey.split('-W')
          const weekNumber = parseInt(weekStr)
          const yearNum = parseInt(year)
          
          // Calculate ISO week start (Monday)
          const simple = new Date(yearNum, 0, 1 + (weekNumber - 1) * 7)
          const dayOfWeek = simple.getDay()
          const weekStart = new Date(simple)
          weekStart.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Monday
          weekStart.setHours(0, 0, 0, 0)
          
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          weekEnd.setHours(23, 59, 59, 999)
          return { start: weekStart, end: weekEnd }
        } else { // monthly
          const [year, month] = periodKey.split('-')
          const start = new Date(parseInt(year), parseInt(month) - 1, 1)
          start.setHours(0, 0, 0, 0)
          const end = new Date(parseInt(year), parseInt(month), 0)
          end.setHours(23, 59, 59, 999)
          return { start, end }
        }
      }
      
      // Group KPIs by period (daily/weekly/monthly)
      const periodMap = new Map<string, { planned: number; actual: number; startDate: Date; endDate: Date }>()
      
      plannedKPIs.forEach((kpi: any) => {
        const date = getKPIDate(kpi)
        if (!date) return
        
        const periodKey = getPeriodKey(date)
        const quantity = parseFloat(String(kpi.quantity || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
        
        if (!periodMap.has(periodKey)) {
          const periodDates = getPeriodDates(periodKey)
          periodMap.set(periodKey, { planned: 0, actual: 0, startDate: periodDates.start, endDate: periodDates.end })
        }
        const current = periodMap.get(periodKey)!
        current.planned += quantity
      })
      
      actualKPIs.forEach((kpi: any) => {
        const date = getKPIDate(kpi)
        if (!date) return
        
        const periodKey = getPeriodKey(date)
        const quantity = parseFloat(String(kpi.quantity || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
        
        if (!periodMap.has(periodKey)) {
          const periodDates = getPeriodDates(periodKey)
          periodMap.set(periodKey, { planned: 0, actual: 0, startDate: periodDates.start, endDate: periodDates.end })
        }
        const current = periodMap.get(periodKey)!
        current.actual += quantity
      })
      
      // Convert to array and sort by period start date
      const chartData = Array.from(periodMap.entries())
        .map(([periodKey, values]) => {
          const periodDates = getPeriodDates(periodKey)
          const startDate = periodDates.start
          const endDate = periodDates.end
          
          // Validate dates before formatting
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn(`Invalid dates for periodKey: ${periodKey}`, { startDate, endDate })
            return null // Skip invalid dates
          }
          
          return {
            date: startDate,
            dateStr: periodKey,
            periodLabel: formatPeriodLabel(periodKey, startDate, endDate),
            periodStartDate: startDate, // Store the actual date for chart formatting
            planned: values.planned,
            actual: values.actual,
            cumPlanned: 0,
            cumActual: 0
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null) // Filter out null values
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      
      // Calculate cumulative values
      let cumPlanned = 0
      let cumActual = 0
      chartData.forEach((item) => {
        cumPlanned += item.planned
        cumActual += item.actual
        item.cumPlanned = cumPlanned
        item.cumActual = cumActual
      })
      
      return {
        activity,
        chartData,
        tableData: chartData.map(item => ({
          date: item.date,
          dateStr: item.periodLabel,
          planned: item.planned,
          actual: item.actual,
          cumPlanned: item.cumPlanned,
          cumActual: item.cumActual
        }))
      }
    })
  }, [selectedProject, projectActivities, kpis, cutOffDate, kpiMatchesActivity, kpiMatchesActivityCombined, groupBy, showCombinedView])
  
  // Export Chart as Image
  const handleExportChart = useCallback(async (activityId: string, activityName: string, format: 'png' | 'jpeg' = 'png') => {
    const chartElement = chartRefs.current.get(activityId)
    if (!chartElement) {
      alert('Chart not found')
      return
    }
    
    try {
      const html2canvas = (await import('html2canvas')).default
      
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2.5,
        logging: false,
        useCORS: true
      })
      
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image')
          return
        }
        
        const url = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')
        const sanitizedName = activityName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const dateStr = new Date().toISOString().split('T')[0]
        downloadLink.href = url
        downloadLink.download = `KPI_Chart_${sanitizedName}_${dateStr}.${format}`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
      }, `image/${format}`, 0.95)
    } catch (error) {
      console.error('Error exporting chart:', error)
      alert('Failed to export chart. Please try again.')
    }
  }, [])
  
  // Export Table as Excel
  const handleExportTable = useCallback(async (activityId: string, activityName: string, tableData: any[]) => {
    if (!tableData || tableData.length === 0) {
      alert('No data to export')
      return
    }
    
    try {
      const XLSX = await import('xlsx-js-style')
      
      // Prepare data for Excel
      const excelData: any[] = []
      
      // Add header row
      const headerRow: any = { 'Metric': 'Metric' }
      tableData.forEach((row: any) => {
        headerRow[row.dateStr] = row.dateStr
      })
      excelData.push(headerRow)
      
      // Add data rows: Planned, Actual, Cum. Planned, Cum. Actual
      const metrics = [
        { key: 'planned', label: 'Planned' },
        { key: 'actual', label: 'Actual' },
        { key: 'cumPlanned', label: 'Cum. Planned' },
        { key: 'cumActual', label: 'Cum. Actual' }
      ]
      
      metrics.forEach((metric) => {
        const row: any = { 'Metric': metric.label }
        tableData.forEach((dataRow: any) => {
          row[dataRow.dateStr] = dataRow[metric.key] || 0
        })
        excelData.push(row)
      })
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)
      
      // Set column widths
      const colWidths = [{ wch: 20 }, ...tableData.map(() => ({ wch: 15 }))]
      ws['!cols'] = colWidths
      
      // Style header row
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      // Style data rows
      const dataStyle = {
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      const metricStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F2F2F2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      // Apply styles
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Style header row (row 0)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (ws[cellAddress]) {
          ws[cellAddress].s = headerStyle
        }
      }
      
      // Style data rows
      for (let row = 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!ws[cellAddress]) continue
          
          if (col === 0) {
            // Metric column
            ws[cellAddress].s = metricStyle
          } else {
            // Data columns
            ws[cellAddress].s = dataStyle
            // Format numbers
            if (typeof ws[cellAddress].v === 'number') {
              ws[cellAddress].z = '#,##0.00'
            }
          }
        }
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      const sanitizedName = activityName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      XLSX.utils.book_append_sheet(wb, ws, 'KPI Data')
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `KPI_Table_${sanitizedName}_${dateStr}.xlsx`)
      
      console.log(`✅ Downloaded: KPI_Table_${sanitizedName}_${dateStr}.xlsx`)
    } catch (error) {
      console.error('Error exporting table:', error)
      alert('Failed to export table. Please try again.')
    }
  }, [])
  
  // Export Chart and Table together as PDF (Landscape)
  const handleExportPDF = useCallback(async (activityId: string, activityName: string, tableData: any[], activity?: BOQActivity) => {
    const chartElement = chartRefs.current.get(activityId)
    const tableElement = tableRefs.current.get(activityId)
    
    if (!chartElement || !tableElement) {
      alert('Chart or table not found')
      return
    }
    
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      // Capture chart as image with better quality
      const chartCanvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2.5, // Higher quality scale for better image clarity
        logging: false,
        useCORS: true,
        foreignObjectRendering: false,
        allowTaint: false
      })
      
      // Capture table as image with better quality
      const tableCanvas = await html2canvas(tableElement, {
        backgroundColor: '#ffffff',
        scale: 2.5, // Higher quality scale for better image clarity
        logging: false,
        useCORS: true,
        width: tableElement.scrollWidth,
        height: tableElement.scrollHeight,
        foreignObjectRendering: false,
        allowTaint: false
      })
      
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
      
      // Get zone information
      const rawActivity = activity ? ((activity as any).raw || {}) : {}
      const zone = activity ? (activity.zone_number || rawActivity['Zone Number'] || '0').toString().trim() : '0'
      const zoneInfo = zone ? ` - Zone: ${zone}` : ''
      
      // Add title and project info
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(activityName, margin, margin + 10)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const projectInfo = `${selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`}${zoneInfo} - Cut off Date: ${formatDate(cutOffDate)}`
      pdf.text(projectInfo, margin, margin + 18)
      
      // Helper to compress image with high quality
      const compressImageForPDF = (canvas: HTMLCanvasElement, quality: number = 0.95): Promise<string> => {
        return new Promise((resolve) => {
          // Only reduce if extremely large, otherwise keep full quality
          const maxWidth = 3000
          const maxHeight = 2400
          let finalCanvas = canvas
          
          if (canvas.width > maxWidth || canvas.height > maxHeight) {
            const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
            const newWidth = Math.round(canvas.width * ratio)
            const newHeight = Math.round(canvas.height * ratio)
            
            const resizedCanvas = document.createElement('canvas')
            resizedCanvas.width = newWidth
            resizedCanvas.height = newHeight
            const ctx = resizedCanvas.getContext('2d')
            if (ctx) {
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(canvas, 0, 0, newWidth, newHeight)
              finalCanvas = resizedCanvas
            }
          }
          
          finalCanvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(finalCanvas.toDataURL('image/png'))
                return
              }
              const reader = new FileReader()
              reader.onloadend = () => {
                resolve(reader.result as string)
              }
              reader.readAsDataURL(blob)
            },
            'image/jpeg',
            quality
          )
        })
      }
      
      // Calculate chart dimensions with high quality
      const chartImgData = await compressImageForPDF(chartCanvas, 0.9)
      const chartImgWidth = contentWidth
      const chartImgHeight = (chartCanvas.height * chartImgWidth) / chartCanvas.width
      
      // Add chart to PDF
      let currentY = margin + 25
      pdf.addImage(chartImgData, 'JPEG', margin, currentY, chartImgWidth, chartImgHeight)
      
      // Add table to PDF (on same page if space allows, otherwise new page)
      currentY += chartImgHeight + 10
      
      const tableImgData = await compressImageForPDF(tableCanvas, 0.95)
      const tableImgWidth = contentWidth
      const tableImgHeight = (tableCanvas.height * tableImgWidth) / tableCanvas.width
      
      // Check if table fits on current page
      if (currentY + tableImgHeight > pdfHeight - margin) {
        // Add new page for table
        pdf.addPage()
        currentY = margin
      }
      
      pdf.addImage(tableImgData, 'PNG', margin, currentY, tableImgWidth, tableImgHeight)
      
      // Save PDF
      const sanitizedName = activityName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const dateStr = new Date().toISOString().split('T')[0]
      pdf.save(`KPI_Report_${sanitizedName}_${dateStr}.pdf`)
      
      console.log(`✅ Downloaded: KPI_Report_${sanitizedName}_${dateStr}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }, [selectedProject, cutOffDate])
  
  // Helper function to get activity zone
  const getActivityZone = useCallback((activity: BOQActivity): string => {
    const rawActivity = (activity as any).raw || {}
    return (activity.zone_number || rawActivity['Zone Number'] || '0').toString().trim()
  }, [])
  
  // Helper function to generate a stable unique ID for an activity
  const getActivityStableId = useCallback((activity: BOQActivity, activityData?: any): string => {
    // Use activity.id if available
    if (activity.id) {
      return activity.id
    }
    
    // Otherwise, create a stable ID based on activity properties
    const activityName = (activity.activity_description || 'Unknown Activity').trim()
    const zone = activityData ? getActivityZone(activityData.activity || activity) : getActivityZone(activity)
    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || ''
    
    // Create a unique ID from activity name, zone, and project
    const baseId = `${projectCode}_${activityName}_${zone || 'nozone'}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase()
    return baseId
  }, [selectedProject, getActivityZone])
  
  // Export multiple activities as PDF
  const handleExportAllPDF = useCallback(async () => {
    if (!selectedProject || activitiesChartData.length === 0) {
      alert('No activities to export')
      return
    }
    
    // Filter activities based on selection
    let activitiesToExport = activitiesChartData
    
    // Filter by selected activities (by activity name, not ID)
    if (selectedActivitiesForExport.size > 0) {
      activitiesToExport = activitiesToExport.filter((activityData: any) => {
        const activity = activityData.activity
        const activityName = (activity.activity_description || 'Unknown Activity').trim()
        return selectedActivitiesForExport.has(activityName)
      })
    }
    
    // Filter by selected zones (skip if combined view is enabled)
    if (selectedZonesForExport.size > 0 && !showCombinedView) {
      activitiesToExport = activitiesToExport.filter((activityData: any) => {
        const zone = getActivityZone(activityData.activity)
        return zone && selectedZonesForExport.has(zone)
      })
    }
    
    if (activitiesToExport.length === 0) {
      alert('No activities match the selected criteria')
      return
    }
    
    // Warn if exporting many activities
    if (activitiesToExport.length > 20) {
      const proceed = confirm(`You are about to export ${activitiesToExport.length} activities. This may take a few minutes. Continue?`)
      if (!proceed) return
    }
    
    setIsExporting(true)
    
    // Disable UI interactions during export to improve performance
    document.body.style.pointerEvents = 'none'
    document.body.style.cursor = 'wait'
    
    // Verify all activities to export have their elements in DOM
    const missingElements: string[] = []
    for (const activityData of activitiesToExport) {
      const activity = activityData.activity
      const activityId = getActivityStableId(activity, activityData)
      const chartElement = chartRefs.current.get(activityId)
      const tableElement = tableRefs.current.get(activityId)
      
      if (!chartElement || !tableElement) {
        // Try with activity.id
        const chartById = activity.id ? chartRefs.current.get(activity.id) : null
        const tableById = activity.id ? tableRefs.current.get(activity.id) : null
        
        if (!chartById || !tableById) {
          const activityName = activity.activity_description || 'Unknown Activity'
          missingElements.push(activityName)
        }
      }
    }
    
    if (missingElements.length > 0) {
      console.warn('Some activities are missing from DOM:', missingElements)
      console.log('Available chart refs:', Array.from(chartRefs.current.keys()))
      console.log('Available table refs:', Array.from(tableRefs.current.keys()))
      
      // Try to wait a bit and check again (in case elements are still rendering)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Re-check after waiting
      const stillMissing: string[] = []
      for (const activityData of activitiesToExport) {
        const activity = activityData.activity
        const activityId = getActivityStableId(activity, activityData)
        let chartElement = chartRefs.current.get(activityId)
        let tableElement = tableRefs.current.get(activityId)
        
        if (!chartElement || !tableElement) {
          chartElement = activity.id ? chartRefs.current.get(activity.id) || chartElement : chartElement
          tableElement = activity.id ? tableRefs.current.get(activity.id) || tableElement : tableElement
        }
        
        if (!chartElement || !tableElement) {
          const activityName = activity.activity_description || 'Unknown Activity'
          stillMissing.push(activityName)
        }
      }
      
      if (stillMissing.length > 0) {
        alert(`Cannot export: Some activities are not visible in the page. Please make sure all selected activities are displayed.\n\nMissing: ${stillMissing.join(', ')}`)
        setIsExporting(false)
        document.body.style.pointerEvents = ''
        document.body.style.cursor = ''
        return
      }
    }
    
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
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
      
      // ✅ Optimized helper function to compress image - keep high quality with performance improvements
      const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.95): Promise<string> => {
        return new Promise((resolve) => {
          // Only reduce canvas size if extremely large
          const maxWidth = 3000
          const maxHeight = 2400
          let finalCanvas = canvas
          
          if (canvas.width > maxWidth || canvas.height > maxHeight) {
            const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
            const newWidth = Math.round(canvas.width * ratio)
            const newHeight = Math.round(canvas.height * ratio)
            
            const resizedCanvas = document.createElement('canvas')
            resizedCanvas.width = newWidth
            resizedCanvas.height = newHeight
            const ctx = resizedCanvas.getContext('2d', { 
              willReadFrequently: false,
              alpha: false, // Disable alpha for better performance
              desynchronized: true // Allow async rendering
            })
            if (ctx) {
              // Use high quality smoothing
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(canvas, 0, 0, newWidth, newHeight)
              finalCanvas = resizedCanvas
            }
          }
          
          // ✅ Use toBlob directly with optimized settings (faster than FileReader)
          finalCanvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(finalCanvas.toDataURL('image/png'))
                return
              }
              // ✅ Direct conversion to data URL (faster)
              const reader = new FileReader()
              reader.onloadend = () => {
                resolve(reader.result as string)
                // Clear blob reference immediately
                URL.revokeObjectURL(URL.createObjectURL(blob))
              }
              reader.readAsDataURL(blob)
            },
            'image/jpeg',
            quality
          )
        })
      }
      
      // ✅ Helper function to yield to browser using requestIdleCallback (if available)
      const yieldToBrowser = (): Promise<void> => {
        return new Promise((resolve) => {
          if ('requestIdleCallback' in window) {
            // Use requestIdleCallback to process during browser idle time
            requestIdleCallback(() => {
              requestAnimationFrame(() => resolve())
            }, { timeout: 100 })
          } else {
            // Fallback to requestAnimationFrame
            requestAnimationFrame(() => resolve())
          }
        })
      }
      
      // ✅ Process activities in batches to prevent blocking
      const processBatch = async (batch: typeof activitiesToExport, batchIndex: number) => {
        for (let i = 0; i < batch.length; i++) {
          const globalIndex = batchIndex * 5 + i
          const activityData = batch[i]
          const activity = activityData.activity
          // Use stable ID that matches the one used when setting refs
          const activityId = getActivityStableId(activity, activityData)
          const activityName = activity.activity_description || 'Unknown Activity'
          
          // Update progress
          setExportProgress({ current: globalIndex + 1, total: activitiesToExport.length })
          
          // Yield to browser periodically
          if (i > 0 && i % 2 === 0) {
            await yieldToBrowser()
          }
          
          // Try to find elements by stable ID first
          let chartElement = chartRefs.current.get(activityId)
          let tableElement = tableRefs.current.get(activityId)
          
          // If not found, try with activity.id or fallback IDs
          if (!chartElement || !tableElement) {
            // Try with activity.id if different from stable ID
            if (activity.id && activity.id !== activityId) {
              chartElement = chartRefs.current.get(activity.id) || chartElement
              tableElement = tableRefs.current.get(activity.id) || tableElement
            }
            
            // Try to find by searching all refs for matching activity
            if (!chartElement || !tableElement) {
              // Search through all refs to find matching elements
              const chartRefsArray = Array.from(chartRefs.current.entries())
              for (const [refId, refElement] of chartRefsArray) {
                if (refElement) {
                  // Check if this element contains the activity name
                  const textContent = refElement.textContent || ''
                  if (textContent.includes(activityName)) {
                    chartElement = refElement
                    // Try to find corresponding table
                    const tableRefsArray = Array.from(tableRefs.current.entries())
                    for (const [tableRefId, tableRefElement] of tableRefsArray) {
                      if (tableRefElement && tableRefElement.textContent?.includes(activityName)) {
                        tableElement = tableRefElement
                        break
                      }
                    }
                    break
                  }
                }
              }
            }
          }
          
          if (!chartElement || !tableElement) {
            console.warn(`Skipping activity ${activityName} (ID: ${activityId}): chart or table not found in DOM. Available refs:`, {
              chartRefs: Array.from(chartRefs.current.keys()),
              tableRefs: Array.from(tableRefs.current.keys())
            })
            continue
          }
          
          // Ensure elements are visible and in viewport before capturing
          try {
            // Make sure parent containers are visible
            let parent = chartElement.parentElement
            while (parent && parent !== document.body) {
              if (parent.style.display === 'none' || parent.style.visibility === 'hidden') {
                parent.style.display = ''
                parent.style.visibility = 'visible'
              }
              parent = parent.parentElement
            }
            
            parent = tableElement.parentElement
            while (parent && parent !== document.body) {
              if (parent.style.display === 'none' || parent.style.visibility === 'hidden') {
                parent.style.display = ''
                parent.style.visibility = 'visible'
              }
              parent = parent.parentElement
            }
            
            // Ensure elements themselves are visible
            chartElement.style.visibility = 'visible'
            chartElement.style.opacity = '1'
            tableElement.style.visibility = 'visible'
            tableElement.style.opacity = '1'
            
            // Scroll element into view smoothly
            chartElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
            await yieldToBrowser()
            await new Promise(resolve => setTimeout(resolve, 200))
            
            tableElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
            await yieldToBrowser()
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Additional wait for rendering to complete
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (scrollError) {
            console.warn('Error preparing elements for capture:', scrollError)
          }
          
          // Add new page for each activity (except the first one)
          if (globalIndex > 0) {
            pdf.addPage()
          }
          
          // ✅ Process with high quality settings
          let chartCanvas: HTMLCanvasElement
          let tableCanvas: HTMLCanvasElement
          
          try {
            // Verify element is still in DOM before capturing
            if (!document.body.contains(chartElement)) {
              throw new Error(`Chart element for ${activityName} is not in DOM`)
            }
            
            chartCanvas = await html2canvas(chartElement, {
              ...canvasOptions,
              onclone: (clonedDoc: Document, element: HTMLElement) => {
                try {
                  // Hide any animations or transitions
                  const style = clonedDoc.createElement('style')
                  style.textContent = `
                    * { 
                      animation: none !important; 
                      transition: none !important;
                    }
                    svg, canvas {
                      visibility: visible !important;
                      opacity: 1 !important;
                    }
                  `
                  clonedDoc.head.appendChild(style)
                  
                  // Ensure the cloned element and all children are visible
                  if (element) {
                    element.style.visibility = 'visible'
                    element.style.opacity = '1'
                    element.style.display = 'block'
                    
                    // Make sure all child elements are visible
                    const allChildren = element.querySelectorAll('*')
                    allChildren.forEach((child: any) => {
                      if (child.style) {
                        child.style.visibility = 'visible'
                        child.style.opacity = '1'
                      }
                    })
                  }
                } catch (cloneError) {
                  console.warn('Error in onclone for chart:', cloneError)
                }
              }
            })
          } catch (chartError: any) {
            console.error(`Error capturing chart for ${activityName}:`, chartError)
            // Try with simpler options if the first attempt fails
            try {
              chartCanvas = await html2canvas(chartElement, {
                backgroundColor: '#ffffff',
                scale: 1.5,
                logging: false,
                useCORS: true,
                foreignObjectRendering: false,
                allowTaint: false
              })
            } catch (retryError) {
              console.error(`Failed to capture chart for ${activityName} after retry:`, retryError)
              throw new Error(`Unable to capture chart for ${activityName}: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`)
            }
          }
          
          // Yield between captures
          await yieldToBrowser()
          
          try {
            // Verify element is still in DOM before capturing
            if (!document.body.contains(tableElement)) {
              throw new Error(`Table element for ${activityName} is not in DOM`)
            }
            
            tableCanvas = await html2canvas(tableElement, {
              backgroundColor: '#ffffff',
              scale: 2.5,
              logging: false,
              useCORS: true,
              width: tableElement.scrollWidth,
              height: tableElement.scrollHeight,
              foreignObjectRendering: false,
              allowTaint: false,
              removeContainer: true,
              onclone: (clonedDoc: Document, element: HTMLElement) => {
                try {
                  const style = clonedDoc.createElement('style')
                  style.textContent = `
                    * { 
                      animation: none !important; 
                      transition: none !important;
                    }
                    table, thead, tbody, tr, td, th {
                      visibility: visible !important;
                      opacity: 1 !important;
                      display: table !important;
                    }
                  `
                  clonedDoc.head.appendChild(style)
                  
                  // Ensure the cloned element and all children are visible
                  if (element) {
                    element.style.visibility = 'visible'
                    element.style.opacity = '1'
                    element.style.display = 'table'
                    
                    // Make sure all child elements are visible
                    const allChildren = element.querySelectorAll('*')
                    allChildren.forEach((child: any) => {
                      if (child.style) {
                        child.style.visibility = 'visible'
                        child.style.opacity = '1'
                      }
                    })
                  }
                } catch (cloneError) {
                  console.warn('Error in onclone for table:', cloneError)
                }
              }
            })
          } catch (tableError: any) {
            console.error(`Error capturing table for ${activityName}:`, tableError)
            // Try with simpler options if the first attempt fails
            try {
              tableCanvas = await html2canvas(tableElement, {
                backgroundColor: '#ffffff',
                scale: 1.5,
                logging: false,
                useCORS: true,
                width: tableElement.scrollWidth,
                height: tableElement.scrollHeight,
                foreignObjectRendering: false,
                allowTaint: false
              })
            } catch (retryError) {
              console.error(`Failed to capture table for ${activityName} after retry:`, retryError)
              throw new Error(`Unable to capture table for ${activityName}: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`)
            }
          }
          
          // Get zone information
          const zone = getActivityZone(activity)
          const isCombined = (activity as any)._isCombined === true
          const allZones = (activity as any)._allZones || ''
          
          let zoneInfo = ''
          if (isCombined && allZones) {
            zoneInfo = ` - Combined View (All Zones: ${allZones})`
          } else if (zone) {
            zoneInfo = ` - Zone: ${zone}`
          }
          
          // Add title and project info
          pdf.setFontSize(16)
          pdf.setFont('helvetica', 'bold')
          pdf.text(activityName, margin, margin + 10)
          
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          const projectInfo = `${selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`}${zoneInfo} - Cut off Date: ${formatDate(cutOffDate)}`
          pdf.text(projectInfo, margin, margin + 18)
          
          // Process compression with high quality
          const chartImgData = await compressImage(chartCanvas, 0.95)
          await yieldToBrowser()
          const tableImgData = await compressImage(tableCanvas, 0.95)
          
          // Calculate image dimensions
          const chartImgWidth = contentWidth
          const chartImgHeight = (chartCanvas.height * chartImgWidth) / chartCanvas.width
          const tableImgWidth = contentWidth
          const tableImgHeight = (tableCanvas.height * tableImgWidth) / tableCanvas.width
          
          // Add chart to PDF
          let currentY = margin + 25
          if (currentY + chartImgHeight > pdfHeight - margin) {
            pdf.addPage()
            currentY = margin + 10
          }
          pdf.addImage(chartImgData, 'JPEG', margin, currentY, chartImgWidth, chartImgHeight)
          
          // Add table to PDF
          currentY += chartImgHeight + 10
          if (currentY + tableImgHeight > pdfHeight - margin) {
            pdf.addPage()
            currentY = margin
          }
          pdf.addImage(tableImgData, 'JPEG', margin, currentY, tableImgWidth, tableImgHeight)
          
          // Clear canvas references immediately
          if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
            }
            chartCanvas.width = 0
            chartCanvas.height = 0
          }
          if (tableCanvas) {
            const ctx = tableCanvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, tableCanvas.width, tableCanvas.height)
            }
            tableCanvas.width = 0
            tableCanvas.height = 0
          }
          
          // Yield after each activity
          if (i < batch.length - 1) {
            await yieldToBrowser()
          }
        }
      }
      
      // Export each activity
      setExportProgress({ current: 0, total: activitiesToExport.length })
      
      // ✅ High quality settings - keep original quality
      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 2.5, // Keep high quality
        logging: false,
        useCORS: true,
        foreignObjectRendering: false,
        allowTaint: false,
        removeContainer: true, // Remove container after capture to free memory
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document, element: HTMLElement) => {
          try {
            // Hide any animations or transitions that might slow down rendering
            const style = clonedDoc.createElement('style')
            style.textContent = `
              * { 
                animation: none !important; 
                transition: none !important;
              }
              svg, canvas, img {
                visibility: visible !important;
                opacity: 1 !important;
              }
            `
            clonedDoc.head.appendChild(style)
            
            // Ensure element is visible in cloned document
            if (element) {
              element.style.visibility = 'visible'
              element.style.opacity = '1'
              element.style.display = 'block'
            }
          } catch (error) {
            console.warn('Error in canvasOptions onclone:', error)
          }
        }
      }
      
      // ✅ Process activities in batches of 5 for better performance
      const batchSize = 5
      const batches: typeof activitiesToExport[] = []
      for (let i = 0; i < activitiesToExport.length; i += batchSize) {
        batches.push(activitiesToExport.slice(i, i + batchSize))
      }
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        await processBatch(batches[batchIndex], batchIndex)
        
        // Yield between batches to keep UI responsive
        if (batchIndex < batches.length - 1) {
          await yieldToBrowser()
          // Additional yield for larger batches
          if (batches[batchIndex].length >= batchSize) {
            await yieldToBrowser()
          }
        }
      }
      
      // Save PDF
      const projectCode = selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const dateStr = new Date().toISOString().split('T')[0]
      pdf.save(`KPI_Report_All_${projectCode}_${dateStr}.pdf`)
      
      console.log(`✅ Downloaded: KPI_Report_All_${projectCode}_${dateStr}.pdf (${activitiesToExport.length} activities)`)
      
      // Close modal and reset selections
      setShowBulkExportModal(false)
      setSelectedActivitiesForExport(new Set())
      setSelectedZonesForExport(new Set())
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      // Re-enable UI interactions
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
      setIsExporting(false)
    }
  }, [selectedProject, activitiesChartData, selectedActivitiesForExport, selectedZonesForExport, cutOffDate, getActivityZone, getActivityStableId, showCombinedView])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">KPI Chart by Activity</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chart showing Planned vs Actual quantities with cumulative values for each activity
          </p>
        </div>
        
        {/* Bulk Export Button */}
        {selectedProject && activitiesChartData.length > 0 && (
          <Button
            onClick={() => setShowBulkExportModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckSquare className="h-4 w-4" />
            Export All as PDF
          </Button>
        )}
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Project Selection - Searchable Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Project:
            </label>
            <div className="relative min-w-[250px]" ref={projectDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProjectDropdown(!showProjectDropdown)
                  setShowActivityDropdown(false)
                  setShowZoneDropdown(false)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <span className="truncate">{selectedProjectName}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showProjectDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId('')
                        setShowProjectDropdown(false)
                        setProjectSearch('')
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        !selectedProjectId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      -- All Projects --
                    </button>
                    {filteredProjects.map((project: Project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(project.id)
                          setShowProjectDropdown(false)
                          setProjectSearch('')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedProjectId === project.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`} - {project.project_name}
                      </button>
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No projects found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Activity Selection - Searchable Dropdown */}
          {selectedProject && availableActivities.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Activity:
              </label>
              <div className="relative min-w-[250px]" ref={activityDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowActivityDropdown(!showActivityDropdown)
                    setShowProjectDropdown(false)
                    setShowZoneDropdown(false)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <span className="truncate">{selectedActivityNames}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showActivityDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showActivityDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search activities..."
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedActivityIds(new Set())
                          setShowActivityDropdown(false)
                          setActivitySearch('')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedActivityIds.size === 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        -- All Activities --
                      </button>
                      {filteredActivities.map((activity) => {
                        // Check if this activity is selected by checking if any activity with the same name is selected
                        // Since we filter by name, we need to check if the activity name matches any selected activity name
                        const isSelected = (() => {
                          if (selectedActivityIds.size === 0) return false
                          
                          // Get all selected activity names
                          const selectedActivityNames = new Set<string>()
                          selectedActivityIds.forEach((activityId) => {
                            // Try to find the activity in availableActivities
                            const selectedActivity = availableActivities.find((a) => a.id === activityId)
                            if (selectedActivity) {
                              selectedActivityNames.add(selectedActivity.name.toLowerCase().trim())
                            } else {
                              // If not found in availableActivities, try to find in all activities
                              const projectFullCode = (selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
                              const projectActivities = activities.filter((a: BOQActivity) => {
                                const activityFullCode = (a.project_full_code || a.project_code || '').toString().trim().toUpperCase()
                                return activityFullCode === projectFullCode || a.project_id === selectedProject?.id
                              })
                              const foundActivity = projectActivities.find((a: BOQActivity) => a.id === activityId)
                              if (foundActivity) {
                                const activityName = (foundActivity.activity_description || '').toLowerCase().trim()
                                selectedActivityNames.add(activityName)
                              }
                            }
                          })
                          
                          // Check if current activity name matches any selected activity name
                          return selectedActivityNames.has(activity.name.toLowerCase().trim())
                        })()
                        
                        return (
                          <label
                            key={activity.id}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSet = new Set(selectedActivityIds)
                                const activityName = activity.name.toLowerCase().trim()
                                const projectFullCode = (selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
                                const projectActivities = activities.filter((a: BOQActivity) => {
                                  const activityFullCode = (a.project_full_code || a.project_code || '').toString().trim().toUpperCase()
                                  return activityFullCode === projectFullCode || a.project_id === selectedProject?.id
                                })
                                
                                if (e.target.checked) {
                                  // Add all activity IDs that have the same name (all zones)
                                  projectActivities.forEach((a: BOQActivity) => {
                                    const aName = (a.activity_description || '').toLowerCase().trim()
                                    if (aName === activityName) {
                                      newSet.add(a.id)
                                    }
                                  })
                                } else {
                                  // Remove all activity IDs that have the same name
                                  projectActivities.forEach((a: BOQActivity) => {
                                    const aName = (a.activity_description || '').toLowerCase().trim()
                                    if (aName === activityName) {
                                      newSet.delete(a.id)
                                    }
                                  })
                                }
                                setSelectedActivityIds(newSet)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span>{activity.name}</span> {/* ✅ Show activity name only, without zone */}
                          </label>
                        )
                      })}
                      {filteredActivities.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No activities found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Zone Selection - Searchable Dropdown */}
          {selectedProject && availableZones.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Zone:
              </label>
              <div className="relative min-w-[150px]" ref={zoneDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowZoneDropdown(!showZoneDropdown)
                    setShowProjectDropdown(false)
                    setShowActivityDropdown(false)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <span className="truncate">
                    {selectedZones.size === 0 
                      ? '-- All Zones --' 
                      : selectedZones.size === 1 
                        ? Array.from(selectedZones)[0] 
                        : `${selectedZones.size} Zones Selected`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showZoneDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showZoneDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search zones..."
                          value={zoneSearch}
                          onChange={(e) => setZoneSearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <label
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${
                          selectedZones.size === 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedZones.size === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedZones(new Set())
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>-- All Zones --</span>
                      </label>
                      {filteredZones.map((zone) => {
                        const isSelected = selectedZones.has(zone)
                        return (
                          <label
                            key={zone}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSet = new Set(selectedZones)
                                if (e.target.checked) {
                                  newSet.add(zone)
                                } else {
                                  newSet.delete(zone)
                                }
                                setSelectedZones(newSet)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span>{zone}</span>
                          </label>
                        )
                      })}
                      {filteredZones.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No zones found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Combined View Checkbox */}
          {selectedProject && availableActivities.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCombinedView}
                  onChange={(e) => setShowCombinedView(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Combined View (All Zones)
                </span>
              </label>
            </div>
          )}
          
          {/* Group By Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Group By:
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          {/* Cut-off Date */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Cut-off Date:
            </label>
            <input
              type="date"
              value={cutOffDate}
              onChange={(e) => setCutOffDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Clear Filters Button */}
          {(selectedActivityIds.size > 0 || selectedZones.size > 0) && (
            <Button
              onClick={() => {
                setSelectedActivityIds(new Set())
                setSelectedZones(new Set())
              }}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      
      {!selectedProject ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Please select a project to view KPI charts</p>
            </div>
          </CardContent>
        </Card>
      ) : activitiesChartData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found for this project</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        activitiesChartData.map((activityData: any, index: number) => {
          const activity = activityData.activity
          const activityName = activity.activity_description || 'Unknown Activity'
          
          return (
            <Card key={activity.id || index} className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  {activityName}
                  {(activity as any)._isCombined ? (
                    <span className="text-sm font-normal text-blue-600 dark:text-blue-400 ml-2 font-semibold">
                      (Combined - All Zones: {(activity as any)._allZones || 'N/A'})
                    </span>
                  ) : getActivityZone(activity) ? (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      (Zone: {getActivityZone(activity)})
                    </span>
                  ) : null}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`} - Cut off Date: {formatDate(cutOffDate)}
                </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportChart(getActivityStableId(activity, activityData), activityName, 'png')}
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Export Chart
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportTable(getActivityStableId(activity, activityData), activityName, activityData.tableData)}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Export Table
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(getActivityStableId(activity, activityData), activityName, activityData.tableData)}
                      className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                    >
                      <FileText className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Chart */}
                {activityData.chartData.length > 0 ? (
                  <>
                    <div 
                      ref={(el) => {
                        if (el) {
                          const stableId = getActivityStableId(activity, activityData)
                          chartRefs.current.set(stableId, el)
                          // Also set with activity.id if different for backward compatibility
                          if (activity.id && activity.id !== stableId) {
                            chartRefs.current.set(activity.id, el)
                          }
                        }
                      }}
                      className="mb-6" 
                      style={{ height: '400px' }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={activityData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="periodLabel" 
                            tickFormatter={(value, index) => {
                              // If value is invalid or empty, try to get from chart data
                              if (!value || value === 'Invalid Date' || value === 'NaN' || value === 'undefined') {
                                const dataPoint = activityData.chartData[index]
                                if (dataPoint) {
                                  // Try periodStartDate first
                                  if (dataPoint.periodStartDate) {
                                    return formatDateShort(dataPoint.periodStartDate)
                                  }
                                  // Fallback to date
                                  if (dataPoint.date) {
                                    return formatDateShort(dataPoint.date)
                                  }
                                }
                                return ''
                              }
                              
                              if (groupBy === 'daily') {
                                // periodLabel is already formatted as "Oct 28, 25", use it directly
                                return value
                              } else if (groupBy === 'weekly') {
                                // Extract week number from "Week 1 (Oct 29 - Nov 4)"
                                return value.split('(')[0].trim()
                              } else {
                                // Monthly: already formatted as "Oct 2025"
                                return value
                              }
                            }}
                            angle={groupBy === 'daily' ? -45 : groupBy === 'weekly' ? -45 : 0}
                            textAnchor={groupBy === 'daily' || groupBy === 'weekly' ? 'end' : 'middle'}
                            height={groupBy === 'daily' || groupBy === 'weekly' ? 80 : 60}
                          />
                          <YAxis 
                            yAxisId="left"
                            label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            label={{ value: 'Cumulative', angle: 90, position: 'insideRight' }}
                          />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'Planned' || name === 'Actual') {
                                return [value.toFixed(2), name]
                              }
                              return [value.toFixed(2), name]
                            }}
                            labelFormatter={(label, payload) => {
                              // If label is invalid, try to get from payload
                              if (!label || label === 'Invalid Date' || label === 'NaN' || label === 'undefined') {
                                if (payload && payload.length > 0 && payload[0].payload) {
                                  const dataPoint = payload[0].payload
                                  // Try periodStartDate first
                                  if (dataPoint.periodStartDate) {
                                    return formatDate(dataPoint.periodStartDate)
                                  }
                                  // Fallback to date
                                  if (dataPoint.date) {
                                    return formatDate(dataPoint.date)
                                  }
                                  // Fallback to periodLabel
                                  return dataPoint.periodLabel || 'Unknown Date'
                                }
                                return 'Unknown Date'
                              }
                              
                              // Label is already formatted periodLabel
                              return label
                            }}
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="planned" fill="#ff9800" name="Planned" />
                          <Bar yAxisId="left" dataKey="actual" fill="#4caf50" name="Actual" />
                          <Line yAxisId="right" type="monotone" dataKey="cumPlanned" stroke="#ff9800" strokeWidth={2} name="Cum. Planned" />
                          <Line yAxisId="right" type="monotone" dataKey="cumActual" stroke="#4caf50" strokeWidth={2} name="Cum. Actual" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Data Table - Transposed Format */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{ maxHeight: '500px' }}>
                      <table 
                        ref={(el) => {
                          if (el) {
                            const stableId = getActivityStableId(activity, activityData)
                            tableRefs.current.set(stableId, el)
                            // Also set with activity.id if different for backward compatibility
                            if (activity.id && activity.id !== stableId) {
                              tableRefs.current.set(activity.id, el)
                            }
                          }
                        }}
                        className="w-full border-collapse text-sm bg-white dark:bg-gray-900"
                      >
                        <thead className="sticky top-0 z-10">
                          <tr>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold bg-gray-200 dark:bg-gray-700 sticky left-0 z-20 min-w-[120px]">
                              Values
                            </th>
                            {activityData.tableData.map((row: any, index: number) => {
                              // Format the header text for clean vertical display
                              const formatHeaderText = (dateStr: string) => {
                                if (groupBy === 'weekly') {
                                  // Parse "Week 43 (Oct 26 - Nov 3)" format
                                  const weekMatch = dateStr.match(/Week\s+(\d+)\s+\(([^)]+)\)/)
                                  if (weekMatch) {
                                    const weekNum = weekMatch[1]
                                    const dateRange = weekMatch[2]
                                    const [startDate, endDate] = dateRange.split(' - ')
                                    return (
                                      <div className="text-white" style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        height: '100%',
                                        padding: '8px 4px',
                                        color: 'white'
                                      }}>
                                        <div className="text-white" style={{ fontSize: '0.75em', fontWeight: '600', whiteSpace: 'nowrap', color: 'white' }}>Week</div>
                                        <div className="text-white" style={{ fontSize: '1.1em', fontWeight: 'bold', whiteSpace: 'nowrap', color: 'white' }}>{weekNum}</div>
                                        <div className="text-white" style={{ fontSize: '0.7em', whiteSpace: 'nowrap', marginTop: '2px', color: 'white' }}>{startDate}</div>
                                        <div className="text-white" style={{ fontSize: '0.65em', whiteSpace: 'nowrap', color: 'white' }}>-</div>
                                        <div className="text-white" style={{ fontSize: '0.7em', whiteSpace: 'nowrap', color: 'white' }}>{endDate}</div>
                                      </div>
                                    )
                                  }
                                } else if (groupBy === 'daily') {
                                  // For daily, show date in a simple format
                                  return (
                                    <div className="text-white" style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      height: '100%',
                                      padding: '8px 4px',
                                      lineHeight: '1.4',
                                      color: 'white'
                                    }}>
                                      <div className="text-white" style={{ fontSize: '0.85em', whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center', color: 'white' }}>{dateStr}</div>
                                    </div>
                                  )
                                } else {
                                  // Monthly format
                                  return (
                                    <div className="text-white" style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      height: '100%',
                                      padding: '8px 4px',
                                      lineHeight: '1.4',
                                      color: 'white'
                                    }}>
                                      <div className="text-white" style={{ fontSize: '0.85em', whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center', color: 'white' }}>{dateStr}</div>
                                    </div>
                                  )
                                }
                              }
                              
                              return (
                                <th 
                                  key={index}
                                  className="border border-gray-300 dark:border-gray-600 px-2 py-3 text-center font-semibold bg-gray-600 dark:bg-gray-800 text-white min-w-[80px]"
                                  style={{ 
                                    height: '120px',
                                    verticalAlign: 'middle',
                                    padding: '0'
                                  }}
                                >
                                  {formatHeaderText(row.dateStr)}
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Planned Row */}
                          <tr className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 sticky left-0 z-10">
                              Planned
                            </td>
                            {activityData.tableData.map((row: any, index: number) => (
                              <td 
                                key={index}
                                className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center font-medium text-orange-600 dark:text-orange-400"
                              >
                                {row.planned > 0 ? row.planned.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                              </td>
                            ))}
                          </tr>
                          {/* Actual Row */}
                          <tr className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 sticky left-0 z-10">
                              Actual
                            </td>
                            {activityData.tableData.map((row: any, index: number) => (
                              <td 
                                key={index}
                                className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center font-medium text-green-600 dark:text-green-400"
                              >
                                {row.actual > 0 ? row.actual.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                              </td>
                            ))}
                          </tr>
                          {/* Cum. Planned Row */}
                          <tr className="bg-orange-50/30 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 sticky left-0 z-10">
                              Cum. Planned
                            </td>
                            {activityData.tableData.map((row: any, index: number) => (
                              <td 
                                key={index}
                                className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center font-bold text-orange-700 dark:text-orange-300"
                              >
                                {row.cumPlanned.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            ))}
                          </tr>
                          {/* Cum. Actual Row */}
                          <tr className="bg-green-50/30 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 sticky left-0 z-10">
                              Cum. Actual
                            </td>
                            {activityData.tableData.map((row: any, index: number) => (
                              <td 
                                key={index}
                                className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center font-bold text-green-700 dark:text-green-300"
                              >
                                {row.cumActual.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>No KPI data available for this activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
      
      {/* Bulk Export Modal */}
      {showBulkExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex items-center justify-between border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export Multiple Activities as PDF
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBulkExportModal(false)
                  setSelectedActivitiesForExport(new Set())
                  setSelectedZonesForExport(new Set())
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {showCombinedView ? (
                      <>
                        <strong>Combined View (All Zones) is enabled.</strong> Activities will be exported with all zones combined. Zone selection is disabled.
                      </>
                    ) : (
                      <>
                        Select activities and zones to export. Leave all unchecked to export all activities.
                      </>
                    )}
                  </p>
                </div>
                
                {/* Activities Selection - Top Section */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Select Activities:</h4>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                    <div className="p-2">
                      {(() => {
                        // Get unique activity names (without zones)
                        const uniqueActivityNames = Array.from(new Set(
                          activitiesChartData.map((activityData: any) => {
                            const activity = activityData.activity
                            return (activity.activity_description || 'Unknown Activity').trim()
                          })
                        )).sort()
                        
                        return (
                          <>
                            <label className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded">
                              <input
                                type="checkbox"
                                checked={selectedActivitiesForExport.size === 0 || selectedActivitiesForExport.size === uniqueActivityNames.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Select all activities
                                    setSelectedActivitiesForExport(new Set(uniqueActivityNames))
                                  } else {
                                    // Deselect all
                                    setSelectedActivitiesForExport(new Set())
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">Select All</span>
                            </label>
                            {uniqueActivityNames.map((activityName) => {
                              const isSelected = selectedActivitiesForExport.has(activityName)
                              return (
                                <label
                                  key={activityName}
                                  className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newSet = new Set(selectedActivitiesForExport)
                                      if (e.target.checked) {
                                        newSet.add(activityName)
                                      } else {
                                        newSet.delete(activityName)
                                      }
                                      setSelectedActivitiesForExport(newSet)
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-900 dark:text-white flex-1">
                                    {activityName}
                                  </span>
                                </label>
                              )
                            })}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Zones Selection - Bottom Section (Filtered by selected activities) */}
                {!showCombinedView && (() => {
                  // Get zones for selected activities only
                  let zonesToShow = availableZones
                  
                  if (selectedActivitiesForExport.size > 0) {
                    const zonesForSelectedActivities = new Set<string>()
                    
                    activitiesChartData.forEach((activityData: any) => {
                      const activity = activityData.activity
                      const activityName = (activity.activity_description || 'Unknown Activity').trim()
                      
                      // Only include zones for selected activities
                      if (selectedActivitiesForExport.has(activityName)) {
                        const zone = getActivityZone(activity)
                        if (zone) {
                          zonesForSelectedActivities.add(zone)
                        }
                      }
                    })
                    
                    zonesToShow = Array.from(zonesForSelectedActivities).sort()
                  }
                  
                  if (zonesToShow.length === 0) {
                    return null
                  }
                  
                  return (
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                        Select Zones:
                        {selectedActivitiesForExport.size > 0 && (
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                            (Zones for selected activities only)
                          </span>
                        )}
                      </h4>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                        <div className="p-2">
                          <label className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded">
                            <input
                              type="checkbox"
                              checked={selectedZonesForExport.size === 0 || (zonesToShow.length > 0 && zonesToShow.every(z => selectedZonesForExport.has(z)))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedZonesForExport(new Set(zonesToShow))
                                } else {
                                  setSelectedZonesForExport(new Set())
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Select All</span>
                          </label>
                          {zonesToShow.map((zone: string) => {
                            const isSelected = selectedZonesForExport.has(zone)
                            return (
                              <label
                                key={zone}
                                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedZonesForExport)
                                    if (e.target.checked) {
                                      newSet.add(zone)
                                    } else {
                                      newSet.delete(zone)
                                    }
                                    setSelectedZonesForExport(newSet)
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-900 dark:text-white">{zone}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Selected:</strong> {selectedActivitiesForExport.size === 0 ? 'All activities' : `${selectedActivitiesForExport.size} activity(ies)`}
                    {showCombinedView ? (
                      <> | <strong>Combined View (All Zones)</strong></>
                    ) : (
                      availableZones.length > 0 && (
                        <> | {selectedZonesForExport.size === 0 ? 'All zones' : `${selectedZonesForExport.size} zone(s)`}</>
                      )
                    )}
                  </p>
                  {isExporting && exportProgress.total > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Exporting: {exportProgress.current} / {exportProgress.total}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <div className="border-t p-4 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkExportModal(false)
                  setSelectedActivitiesForExport(new Set())
                  setSelectedZonesForExport(new Set())
                }}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportAllPDF}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
})


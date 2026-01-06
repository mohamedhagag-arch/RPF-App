'use client'

import React, { useState, useEffect, useMemo, useCallback, memo, useRef, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { Project, BOQActivity } from '@/lib/supabase'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { formatDate } from '@/lib/dateHelpers'
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  X,
  CheckSquare,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Search,
  Minus,
  Plus
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface MonthlyWorkRevenueTabProps {
  activities: BOQActivity[]
  projects: Project[]
  kpis: any[]
  allAnalytics: any[]
  formatCurrency: (amount: number, currencyCode?: string) => string
}

type PeriodType = 'daily' | 'weekly' | 'month' | 'quarterly' | 'yearly'

export const MonthlyWorkRevenueTab = memo(function MonthlyWorkRevenueTab({ 
  activities, 
  projects, 
  kpis, 
  allAnalytics: _providedAnalytics, 
  formatCurrency 
}: MonthlyWorkRevenueTabProps) {
  // State management
  const [periodType, setPeriodType] = useState<PeriodType>('weekly')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  // ? PERFORMANCE: Debounced values to prevent UI freezing when changing date range
  const [debouncedDateRange, setDebouncedDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [debouncedPeriodType, setDebouncedPeriodType] = useState<PeriodType>('weekly')
  const [isCalculating, setIsCalculating] = useState(false)
  
  // ✅ PERFORMANCE: Debounce dateRange changes to prevent UI freezing
  useEffect(() => {
    setIsCalculating(true)
    const timer = setTimeout(() => {
      setDebouncedDateRange(dateRange)
      // ✅ PERFORMANCE: Use requestIdleCallback to finish calculations when browser is idle
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setIsCalculating(false)
        }, { timeout: 1000 })
      } else {
        setTimeout(() => setIsCalculating(false), 100)
      }
    }, 500) // ✅ PERFORMANCE: Increased debounce to 500ms for heavy calculations
    
    return () => clearTimeout(timer)
  }, [dateRange])
  
  // ✅ PERFORMANCE: Debounce periodType changes
  useEffect(() => {
    setIsCalculating(true)
    const timer = setTimeout(() => {
      setDebouncedPeriodType(periodType)
      // ✅ PERFORMANCE: Use requestIdleCallback to finish calculations when browser is idle
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setIsCalculating(false)
        }, { timeout: 1000 })
      } else {
        setTimeout(() => setIsCalculating(false), 100)
      }
    }, 500) // ✅ PERFORMANCE: Increased debounce to 500ms for heavy calculations
    
    return () => clearTimeout(timer)
  }, [periodType])
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [debouncedSelectedDivisions, setDebouncedSelectedDivisions] = useState<string[]>([])
  
  // ✅ PERFORMANCE: Debounce selectedDivisions changes to prevent UI freezing
  useEffect(() => {
    setIsCalculating(true)
    const timer = setTimeout(() => {
      setDebouncedSelectedDivisions(selectedDivisions)
      // ✅ PERFORMANCE: Use requestIdleCallback to finish calculations when browser is idle
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setIsCalculating(false)
        }, { timeout: 1000 })
      } else {
        setTimeout(() => setIsCalculating(false), 100)
      }
    }, 500) // ✅ PERFORMANCE: Increased debounce to 500ms for heavy calculations
    
    return () => clearTimeout(timer)
  }, [selectedDivisions])
  
  const [hideZeroProjects, setHideZeroProjects] = useState(false)
  const [viewPlannedValue, setViewPlannedValue] = useState(false)
  const [showVirtualMaterialValues, setShowVirtualMaterialValues] = useState(false)
  const [hideVirtualMaterialColumn, setHideVirtualMaterialColumn] = useState(false)
  const [showOuterRangeColumn, setShowOuterRangeColumn] = useState(false)
  const [outerRangeStart, setOuterRangeStart] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [isChangingPage, setIsChangingPage] = useState(false)
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'composed'>('composed')
  const [showChartExportMenu, setShowChartExportMenu] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  const [divisionSearch, setDivisionSearch] = useState('')
  const [hideDivisionsColumn, setHideDivisionsColumn] = useState(false)
  const [hideTotalContractColumn, setHideTotalContractColumn] = useState(false)
  const [useVirtualValueInChart, setUseVirtualValueInChart] = useState(false)
  
  const chartRef = useRef<HTMLDivElement>(null)
  const chartExportMenuRef = useRef<HTMLDivElement>(null)
  const divisionDropdownRef = useRef<HTMLDivElement>(null)
  
  const today = useMemo(() => new Date(), [])
  
  // ✅ PERFORMANCE: Pre-build map of project ID to activities for O(1) lookup
  const projectActivitiesMap = useMemo(() => {
    const map = new Map<string, BOQActivity[]>()
    projects.forEach((project: Project) => {
      const projectId = project.id
      const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
      const projectActivities = activities.filter((activity: BOQActivity) => {
        const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
        return activityFullCode === projectFullCode || activity.project_id === project.id
      })
      map.set(projectId, projectActivities)
    })
    return map
  }, [projects, activities])
  
  // ✅ PERFORMANCE: Pre-build map of division to project IDs for O(1) lookup
  const divisionToProjectIdsMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    
    // First, add projects by their own division
    projects.forEach((project: Project) => {
      const projectDivision = (project as any).division || (project as any).raw?.['Division'] || ''
      if (projectDivision && projectDivision.trim() !== '') {
        const normalizedDivision = projectDivision.trim().toLowerCase()
        if (!map.has(normalizedDivision)) {
          map.set(normalizedDivision, new Set())
        }
        map.get(normalizedDivision)!.add(project.id)
      }
    })
    
    // Then, add projects by their activities' divisions
    // ✅ PERFORMANCE: Build project code/id to activities map first
    const projectToActivitiesMap = new Map<string, BOQActivity[]>()
    activities.forEach((activity: BOQActivity) => {
      const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const projectId = activity.project_id || ''
      
      // Add by project full code
      if (activityFullCode) {
        if (!projectToActivitiesMap.has(activityFullCode)) {
          projectToActivitiesMap.set(activityFullCode, [])
        }
        projectToActivitiesMap.get(activityFullCode)!.push(activity)
      }
      
      // Add by project id
      if (projectId) {
        if (!projectToActivitiesMap.has(projectId)) {
          projectToActivitiesMap.set(projectId, [])
        }
        projectToActivitiesMap.get(projectId)!.push(activity)
      }
    })
    
    // Now, for each project, get its activities and extract divisions
    projects.forEach((project: Project) => {
      const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
      const projectActivities = projectToActivitiesMap.get(projectFullCode) || 
                               projectToActivitiesMap.get(project.id) || 
                               []
      
      // Extract unique divisions from activities
      const projectDivisions = new Set<string>()
      projectActivities.forEach((activity: BOQActivity) => {
        const rawActivity = (activity as any).raw || {}
        const activityDivision = activity.activity_division || 
                               (activity as any)['Activity Division'] || 
                               rawActivity['Activity Division'] || 
                               rawActivity['activity_division'] || ''
        
        if (activityDivision && activityDivision.trim() !== '') {
          projectDivisions.add(activityDivision.trim().toLowerCase())
        }
      })
      
      // Add project to each division's set
      projectDivisions.forEach((division: string) => {
        if (!map.has(division)) {
          map.set(division, new Set())
        }
        map.get(division)!.add(project.id)
      })
    })
    
    return map
  }, [projects, activities])
  
  // ✅ PERFORMANCE: Filter projects using pre-built map (O(1) lookup instead of O(n*m))
  const filteredProjects = useMemo(() => {
    if (debouncedSelectedDivisions.length === 0) return projects
    
    // ✅ PERFORMANCE: Collect all project IDs that match any selected division
    const matchingProjectIds = new Set<string>()
    debouncedSelectedDivisions.forEach((selectedDiv: string) => {
      const normalizedDiv = selectedDiv.trim().toLowerCase()
      const projectIds = divisionToProjectIdsMap.get(normalizedDiv)
      if (projectIds) {
        projectIds.forEach((projectId: string) => matchingProjectIds.add(projectId))
      }
    })
    
    // ✅ PERFORMANCE: Filter projects using Set lookup (O(1) per project)
    return projects.filter((project: Project) => matchingProjectIds.has(project.id))
  }, [projects, debouncedSelectedDivisions, divisionToProjectIdsMap])
  
  // ✅ PERFORMANCE: Use provided analytics if available, otherwise calculate only for filtered projects
  const allAnalytics = useMemo(() => {
    // ✅ DEBUG: Log analytics calculation
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 MonthlyWorkRevenueTab allAnalytics calculation:', {
        _providedAnalyticsCount: _providedAnalytics?.length || 0,
        filteredProjectsCount: filteredProjects.length,
        projectsCount: projects.length,
        activitiesCount: activities.length,
        kpisCount: kpis.length,
        debouncedSelectedDivisionsCount: debouncedSelectedDivisions.length
      })
    }
    
    // ✅ FIX: If _providedAnalytics exists and has data, use it (respecting division filter)
    if (_providedAnalytics && _providedAnalytics.length > 0) {
      // If no division filter is applied, return all provided analytics
      if (debouncedSelectedDivisions.length === 0) {
        return _providedAnalytics
      }
      // Otherwise, filter by selected divisions
      // ✅ FIX: Use projects (not filteredProjects) to get all project IDs, then filter analytics
      const allProjectIds = new Set(projects.map((p: any) => p.id))
      const filteredProjectIds = new Set(filteredProjects.map((p: any) => p.id))
      const filteredAnalytics = _providedAnalytics.filter((a: any) => {
        // Include if project is in filteredProjects OR if no division filter matches
        return filteredProjectIds.has(a.project.id) || (filteredProjectIds.size === 0 && allProjectIds.has(a.project.id))
      })
      // ✅ FIX: Return filtered analytics, or calculate new if filter results in empty but we have projects
      if (filteredAnalytics.length > 0) {
        return filteredAnalytics
      }
      // ✅ FIX: If filtered analytics is empty but we have projects, calculate new analytics
      if (filteredProjects.length > 0) {
        console.log('⚠️ Provided analytics filtered to empty, calculating new analytics...')
        return getAllProjectsAnalytics(filteredProjects, activities, kpis)
      }
      return _providedAnalytics
    }
    // ✅ FIX: If no provided analytics, calculate from filtered projects or all projects
    if (filteredProjects.length === 0) {
      // ✅ FIX: If no division filter, use all projects
      if (debouncedSelectedDivisions.length === 0 && projects.length > 0) {
        console.log('⚠️ No filtered projects but have projects, calculating analytics from all projects...')
        return getAllProjectsAnalytics(projects, activities, kpis)
      }
      return []
    }
    console.log('⚠️ Calculating analytics from filtered projects...')
    return getAllProjectsAnalytics(filteredProjects, activities, kpis)
  }, [_providedAnalytics, filteredProjects, projects, activities, kpis, debouncedSelectedDivisions])
  
  // Pre-filter KPIs by project for performance
  // ✅ FIX: Use exact matching with project_full_code to differentiate similar projects
  const projectKPIsMap = useMemo(() => {
    const map = new Map<string, { actual: any[]; planned: any[] }>()
    projects.forEach((project: Project) => {
      // ✅ Build project_full_code exactly as it should be
      const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
      const projectCode = (project.project_code || '').toString().trim().toUpperCase()
      const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
      const projectId = project.id
      
      const projectKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
        const kpiProjectId = (kpi as any).project_id || ''
        
        // ✅ PRIORITY 1: Exact match by project_full_code (most accurate)
        if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
          return true
        }
        
        // ✅ PRIORITY 2: Match by project_id (if available)
        if (projectId && kpiProjectId && projectId === kpiProjectId) {
          return true
        }
        
        // ✅ PRIORITY 3: Match by project_code + project_sub_code (for projects with sub codes)
        if (projectSubCode && kpiProjectSubCode) {
          if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
            return true
          }
        }
        
        // ✅ PRIORITY 4: Match by project_code only (fallback for projects without sub codes)
        if (!projectSubCode && kpiProjectCode === projectCode && !kpiProjectSubCode) {
          return true
        }
        
        return false
      })
      
      const actualKPIs = projectKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'actual'
      })
      const plannedKPIs = projectKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'planned'
      })
      map.set(project.id, { actual: actualKPIs, planned: plannedKPIs })
    })
    return map
  }, [projects, kpis])
  
  // Get periods in range
  const getPeriodsInRange = useCallback((): Array<{ start: Date; end: Date; label: string }> => {
    if (!debouncedDateRange.start || !debouncedDateRange.end) return []
    const start = new Date(debouncedDateRange.start)
    const end = new Date(debouncedDateRange.end)
    const periods: Array<{ start: Date; end: Date; label: string }> = []
    
    if (debouncedPeriodType === 'daily') {
      let current = new Date(start)
      while (current <= end) {
        const periodStart = new Date(current)
        periodStart.setHours(0, 0, 0, 0)
        const periodEnd = new Date(current)
        periodEnd.setHours(23, 59, 59, 999)
        periods.push({
          start: periodStart,
          end: periodEnd,
          label: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
        current = new Date(current)
        current.setDate(current.getDate() + 1)
      }
    } else if (debouncedPeriodType === 'weekly') {
      let current = new Date(start)
      while (current <= end) {
        // Get Monday of the week
        const dayOfWeek = current.getDay()
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
        const periodStart = new Date(current.setDate(diff))
        periodStart.setHours(0, 0, 0, 0)
        const periodEnd = new Date(periodStart)
        periodEnd.setDate(periodEnd.getDate() + 6)
        periodEnd.setHours(23, 59, 59, 999)
        periods.push({
          start: new Date(periodStart),
          end: periodEnd,
          label: `W${Math.ceil((periodStart.getDate() + periodStart.getDay()) / 7)} ${periodStart.toLocaleDateString('en-US', { month: 'short' })}`
        })
        current = new Date(periodEnd)
        current.setDate(current.getDate() + 1)
      }
    } else if (debouncedPeriodType === 'month') {
      let current = new Date(start)
      while (current <= end) {
        const periodStart = new Date(current.getFullYear(), current.getMonth(), 1)
        const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999)
        periods.push({
          start: periodStart,
          end: periodEnd,
          label: periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
      }
    } else if (debouncedPeriodType === 'quarterly') {
      let current = new Date(start)
      while (current <= end) {
        const quarter = Math.floor(current.getMonth() / 3)
        const periodStart = new Date(current.getFullYear(), quarter * 3, 1)
        const periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
        periods.push({
          start: periodStart,
          end: periodEnd,
          label: `Q${quarter + 1} ${current.getFullYear()}`
        })
        current = new Date(current.getFullYear(), (quarter + 1) * 3, 1)
      }
    } else if (debouncedPeriodType === 'yearly') {
      let current = new Date(start)
      while (current <= end) {
        const periodStart = new Date(current.getFullYear(), 0, 1)
        const periodEnd = new Date(current.getFullYear(), 11, 31, 23, 59, 59, 999)
        periods.push({
          start: periodStart,
          end: periodEnd,
          label: current.getFullYear().toString()
        })
        current = new Date(current.getFullYear() + 1, 0, 1)
      }
    }
    return periods
  }, [debouncedDateRange, debouncedPeriodType])
  
  // ? PERFORMANCE: Memoize periods to avoid recalculation on every render
  const periods = useMemo(() => getPeriodsInRange(), [getPeriodsInRange])
  
  // Extract divisions from activities
  const divisions = useMemo(() => {
    const divSet = new Set<string>()
    activities.forEach((activity: BOQActivity) => {
      const rawActivity = (activity as any).raw || {}
      const division = activity.activity_division || 
                     (activity as any)['Activity Division'] || 
                     rawActivity['Activity Division'] || 
                     rawActivity['activity_division'] || ''
      if (division && division.trim() !== '') {
        divSet.add(division.trim())
      }
    })
    return Array.from(divSet).sort()
  }, [activities])
  
  // Helper functions
  const getActivityZone = useCallback((activity: BOQActivity, projectFullCode: string): string => {
    const rawActivity = (activity as any).raw || {}
    const zone = activity.zone_ref || 
                 activity.zone_number || 
                 rawActivity['Zone Ref'] || 
                 rawActivity['Zone Number'] || 
                 ''
    if (!zone) return ''
    const zoneStr = String(zone).trim()
    const projectCodeUpper = projectFullCode.toUpperCase()
    return zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '')
                  .replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '')
                  .replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '')
                  .trim()
  }, [])
  
  const getActivityScope = useCallback((activity: BOQActivity): string => {
    const rawActivity = (activity as any).raw || {}
    return (activity as any).scope || 
           rawActivity['Scope'] || 
           rawActivity['scope'] || 
           ''
  }, [])
  
  // Divisions data map - using unique key (project_full_code + project_name) to differentiate similar projects
  // ✅ FIX: Use projectActivitiesMap instead of analytics.activities for accurate activity matching
  const divisionsDataMap = useMemo(() => {
    const map = new Map<string, { divisionAmounts: Record<string, number>, divisionNames: Record<string, string> }>()
    
    // Use projects directly and match activities using projectActivitiesMap
    projects.forEach((project: Project) => {
      const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
      const projectName = (project.project_name || '').toString().trim()
      // ✅ Use unique key combining project_full_code and project_name for exact matching
      const uniqueKey = `${projectFullCode}|${projectName}`
      
      // ✅ FIX: Get activities from projectActivitiesMap using project.id for accurate matching
      // Also verify activity matches project_full_code to ensure correct matching
      const projectActivitiesFromMap = projectActivitiesMap.get(project.id) || []
      
      // ✅ DOUBLE CHECK: Filter activities to ensure they match this specific project's full code
      const projectActivities = projectActivitiesFromMap.filter((activity: BOQActivity) => {
        const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
        return activityFullCode === projectFullCode || activity.project_id === project.id
      })
      
      const divisionAmounts: Record<string, number> = {}
      const divisionNames: Record<string, string> = {}
      
      projectActivities.forEach((activity: BOQActivity) => {
        const rawActivity = (activity as any).raw || {}
        const division = activity.activity_division || 
                       (activity as any)['Activity Division'] || 
                       rawActivity['Activity Division'] || 
                       rawActivity['activity_division'] || ''
        if (division && division.trim() !== '') {
          const divKey = division.trim().toLowerCase()
          const divName = division.trim()
          divisionNames[divKey] = divName
          
          const totalValue = activity.total_value || 
                           parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                           0
          divisionAmounts[divKey] = (divisionAmounts[divKey] || 0) + totalValue
        }
      })
      
      map.set(uniqueKey, { divisionAmounts, divisionNames })
    })
    return map
  }, [projects, projectActivitiesMap])
  
  // Weeks data (for weekly period type)
  const weeks = useMemo(() => {
    if (periodType !== 'month' || !dateRange.start || !dateRange.end) return []
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    const weeksList: Array<{ start: Date; end: Date; label: string }> = []
    let current = new Date(start)
    while (current <= end) {
      const weekStart = new Date(current)
      weekStart.setDate(current.getDate() - current.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      if (weekEnd > end) weekEnd.setTime(end.getTime())
      weeksList.push({
        start: weekStart,
        end: weekEnd,
        label: `Week ${weeksList.length + 1}`
      })
      current = new Date(weekEnd)
      current.setDate(current.getDate() + 1)
    }
    return weeksList
  }, [periodType, dateRange])
  
  // Calculate period earned value
  // ✅ FIX: analytics.activities is already filtered by divisions in getCachedPeriodValues
  // So we should use analytics.activities directly without filtering again
  const calculatePeriodEarnedValue = useCallback((project: Project, analytics: any): number[] => {
    // ✅ FIX: Get KPIs from projectKPIsMap, but also verify they match this specific project
    const projectKPIs = projectKPIsMap.get(project.id)
    let allProjectKPIs = projectKPIs?.actual || []
    
    // ✅ DOUBLE CHECK: Filter KPIs to ensure they match this specific project's full code
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
    const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
    const projectId = project.id
    
    allProjectKPIs = allProjectKPIs.filter((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
      const kpiProjectId = (kpi as any).project_id || ''
      
      // ✅ PRIORITY 1: Exact match by project_full_code
      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
        return true
      }
      
      // ✅ PRIORITY 2: Match by project_id
      if (projectId && kpiProjectId && projectId === kpiProjectId) {
        return true
      }
      
      // ✅ PRIORITY 3: Match by project_code + project_sub_code
      if (projectSubCode && kpiProjectSubCode) {
        if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
          return true
        }
      }
      
      return false
    })
    
    // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
    const projectActivities = analytics.activities || []
    
    return periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd
      
      const actualKPIsInPeriod = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') return false
        
        const rawKPIDate = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          kpiDateStr = actualDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || actualDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999)
          
          return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
        } catch {
          return false
        }
      })
      
      return actualKPIsInPeriod.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          let financialValue = 0
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            
            if (rate > 0 && quantityValue > 0) {
              financialValue = quantityValue * rate
              if (financialValue > 0) {
                return sum + financialValue
              }
            }
          }
          
          // ✅ FIX: Only add value if relatedActivity was found in filtered activities
          // If relatedActivity is not found, it means this KPI belongs to an activity that was filtered out
          // So we should NOT add its value to the sum
          if (!relatedActivity) {
            return sum
          }
          
          if (financialValue === 0) {
            let kpiValue = 0
            
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue > 0) {
              financialValue = kpiValue
              return sum + financialValue
            }
          }
          
          // ✅ CRITICAL: If no value found and no rate, skip (NEVER use quantity as value!)
          if (financialValue === 0) {
          return sum
          }
          
          // ✅ Always return the base financialValue (Actual value remains constant)
          // Virtual Material will be calculated and displayed separately in the UI
          return sum + financialValue
        } catch (error) {
          // ✅ PERFORMANCE: Only log critical errors
          if (process.env.NODE_ENV === 'development') console.error('[Monthly Revenue] Error calculating KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    })
  }, [kpis, periods, activities, today, projectKPIsMap, showVirtualMaterialValues, debouncedSelectedDivisions])

  // ✅ Calculate Virtual Material Amount per period from KPIs for activities with use_virtual_material
  // ✅ FIX: analytics.activities is already filtered by divisions in getCachedPeriodValues
  // So we should use analytics.activities directly without filtering again
  const calculatePeriodVirtualMaterialAmount = useCallback((project: Project, analytics: any): number[] => {
    // ✅ FIX: Get KPIs from projectKPIsMap, but also verify they match this specific project
    const projectKPIs = projectKPIsMap.get(project.id)
    let allProjectKPIs = projectKPIs?.actual || []
    
    // ✅ DOUBLE CHECK: Filter KPIs to ensure they match this specific project's full code
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
    const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
    const projectId = project.id
    
    allProjectKPIs = allProjectKPIs.filter((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
      const kpiProjectId = (kpi as any).project_id || ''
      
      // ✅ PRIORITY 1: Exact match by project_full_code
      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
        return true
      }
      
      // ✅ PRIORITY 2: Match by project_id
      if (projectId && kpiProjectId && projectId === kpiProjectId) {
        return true
      }
      
      // ✅ PRIORITY 3: Match by project_code + project_sub_code
      if (projectSubCode && kpiProjectSubCode) {
        if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
          return true
        }
      }
      
      return false
    })
    // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
    const projectActivities = analytics.activities || []
    
    // Get Virtual Material Percentage from project
    let virtualMaterialPercentage = 0
    const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
    
    if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
      let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
      const parsedValue = parseFloat(cleanedValue)
      if (!isNaN(parsedValue)) {
        if (parsedValue > 0 && parsedValue <= 1) {
          virtualMaterialPercentage = parsedValue * 100
        } else {
          virtualMaterialPercentage = parsedValue
        }
      }
    }
    
    if (virtualMaterialPercentage === 0) {
      return periods.map(() => 0)
    }
    
    return periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd
      
      // Get KPI Actual for this period (same logic as calculatePeriodEarnedValue)
      const actualKPIsInPeriod = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') return false
        
        const rawKPIDate = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          kpiDateStr = actualDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || actualDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999)
          
          return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
        } catch {
          return false
        }
      })
      
      return actualKPIsInPeriod.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          // Find related activity (same logic as calculatePeriodEarnedValue)
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectCode === kpiProjectCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (!relatedActivity && kpiActivityName) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              return activityName === kpiActivityName
            })
          }
          
          // ✅ CRITICAL: Calculate Virtual Material ONLY for activities with use_virtual_material === true
          // Check if activity uses virtual material
          const useVirtualMaterial = relatedActivity?.use_virtual_material ?? false
          if (!useVirtualMaterial) return sum
          
          // Calculate base value (same logic as calculatePeriodEarnedValue)
          let baseValue = 0
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            if (rate > 0 && quantityValue > 0) {
              baseValue = quantityValue * rate
            }
          }
          
          if (baseValue === 0) {
            let kpiValue = 0
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            if (kpiValue > 0) {
              baseValue = kpiValue
            }
          }
          
          if (baseValue === 0) {
            const actualValue = kpi.actual_value || parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, '')) || 0
            if (actualValue > 0) {
              baseValue = actualValue
            }
          }
          
          // Calculate Virtual Material Amount = Base Value × (Virtual Material Percentage / 100)
          if (baseValue > 0) {
            const virtualMaterialAmount = baseValue * (virtualMaterialPercentage / 100)
            return sum + virtualMaterialAmount
          }
          
          return sum
        } catch (error) {
          return sum
        }
      }, 0)
    })
  }, [kpis, periods, activities, today, projectKPIsMap, debouncedSelectedDivisions])

  // Calculate period planned value
  // ✅ FIX: analytics.activities is already filtered by divisions in getCachedPeriodValues
  // So we should use analytics.activities directly without filtering again
  const calculatePeriodPlannedValue = useCallback((project: Project, analytics: any): number[] => {
    // ✅ FIX: Get KPIs from projectKPIsMap, but also verify they match this specific project
    const projectKPIs = projectKPIsMap.get(project.id)
    let allProjectKPIs = projectKPIs?.planned || []
    
    // ✅ DOUBLE CHECK: Filter KPIs to ensure they match this specific project's full code
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
    const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
    const projectId = project.id
    
    allProjectKPIs = allProjectKPIs.filter((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
      const kpiProjectId = (kpi as any).project_id || ''
      
      // ✅ PRIORITY 1: Exact match by project_full_code
      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
        return true
      }
      
      // ✅ PRIORITY 2: Match by project_id
      if (projectId && kpiProjectId && projectId === kpiProjectId) {
        return true
      }
      
      // ✅ PRIORITY 3: Match by project_code + project_sub_code
      if (projectSubCode && kpiProjectSubCode) {
        if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
          return true
        }
      }
      
      return false
    })
    
    // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
    const projectActivities = analytics.activities || []
    
    return periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd
      
      const plannedKPIsInPeriod = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') return false
        
        const rawKPIDate = (kpi as any).raw || {}
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else {
          kpiDateStr = activityDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999)
          
          return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
        } catch {
          return false
        }
      })
      
      return plannedKPIsInPeriod.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          let financialValue = 0
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            
            if (rate > 0 && quantityValue > 0) {
              financialValue = quantityValue * rate
              if (financialValue > 0) {
                return sum + financialValue
              }
            }
          }
          
          // ✅ FIX: Only add value if relatedActivity was found in filtered activities
          // If relatedActivity is not found, it means this KPI belongs to an activity that was filtered out
          // So we should NOT add its value to the sum
          if (!relatedActivity) {
            return sum
          }
          
          if (financialValue === 0) {
            let kpiValue = 0
            
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue > 0) {
              financialValue = kpiValue
              return sum + financialValue
            }
          }
          
          if (financialValue === 0) {
            const plannedValue = (kpi.planned_value ?? parseFloat(String(rawKpi['Planned Value'] || '0').replace(/,/g, ''))) || 0
            if (plannedValue > 0) {
              financialValue = plannedValue
              return sum + financialValue
            }
          }
          
          return sum
        } catch (error) {
          if (process.env.NODE_ENV === 'development') console.error('[Monthly Revenue] Error calculating Planned KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    })
  }, [kpis, periods, activities, today, projectKPIsMap, debouncedSelectedDivisions])

  // Helper function to match KPI with activity
  const kpiMatchesActivity = useCallback((kpi: any, activity: BOQActivity): boolean => {
    const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
    const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
    const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
    
    const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
    const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toLowerCase().trim()
    const activityProjectCode = (activity.project_code || '').toLowerCase().trim()
    
    return (kpiActivityName === activityName && kpiProjectFullCode === activityProjectFullCode) ||
           (kpiActivityName === activityName && kpiProjectCode === activityProjectCode)
  }, [])

  // ✅ PERFORMANCE: Pre-calculate period values for all projects once
  // ✅ Calculate value before the selected date range (Outer Range)
  const calculateOuterRangeValue = useCallback((project: Project, analytics: any): number => {
    // If outer range is not configured, return 0
    if (!outerRangeStart) return 0
    
    // ✅ Get periods to use first period start as fallback if dateRange.start is not set
    const periods = getPeriodsInRange()
    const outerRangeEndDate = dateRange.start || (periods.length > 0 ? periods[0].start.toISOString().split('T')[0] : null)
    
    if (!outerRangeEndDate) return 0
    
    // ✅ PERFORMANCE: Use pre-filtered KPIs instead of filtering every time
    const projectKPIs = projectKPIsMap.get(project.id)
    let allProjectKPIs = projectKPIs?.actual || []
    
    // ✅ DOUBLE CHECK: Filter KPIs to ensure they match this specific project's full code
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
    const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
    const projectId = project.id
    
    allProjectKPIs = allProjectKPIs.filter((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
      const kpiProjectId = (kpi as any).project_id || ''
      
      // ✅ PRIORITY 1: Exact match by project_full_code
      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
        return true
      }
      
      // ✅ PRIORITY 2: Match by project_id
      if (projectId && kpiProjectId && projectId === kpiProjectId) {
        return true
      }
      
      // ✅ PRIORITY 3: Match by project_code + project_sub_code
      if (projectSubCode && kpiProjectSubCode) {
        if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
          return true
        }
      }
      
      return false
    })
    
    try {
      const outerStart = new Date(outerRangeStart)
      const outerEnd = new Date(outerRangeEndDate)
      outerStart.setHours(0, 0, 0, 0)
      outerEnd.setHours(23, 59, 59, 999)
      
      // ✅ For current/future periods, use today as the end date instead of outerEnd
      const effectiveOuterEnd = outerEnd > today ? today : outerEnd
      
      // Get KPI Actual for outer range period
      const actualKPIsInOuterRange = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') return false
        
        // ✅ Use EXACT SAME LOGIC as calculatePeriodEarnedValue
        const rawKPIDate = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          kpiDateStr = actualDateValue
        } else if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || actualDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          
          const normalizedOuterStart = new Date(outerStart)
          normalizedOuterStart.setHours(0, 0, 0, 0)
          
          const normalizedOuterEnd = new Date(effectiveOuterEnd)
          normalizedOuterEnd.setHours(23, 59, 59, 999)
          
          // Check if KPI date is within outer range
          const inRange = kpiDate >= normalizedOuterStart && kpiDate <= normalizedOuterEnd
          
          return inRange
        } catch {
          return false
        }
      })
      
      // ✅ Calculate value using EXACT SAME LOGIC as calculatePeriodEarnedValue
      // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
      const projectActivities = analytics.activities || []
      
      return actualKPIsInOuterRange.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          let financialValue = 0
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            
            if (rate > 0 && quantityValue > 0) {
              financialValue = quantityValue * rate
              if (financialValue > 0) {
                return sum + financialValue
              }
            }
          }
          
          // ✅ FIX: Only add value if relatedActivity was found in filtered activities
          // If relatedActivity is not found, it means this KPI belongs to an activity that was filtered out
          // So we should NOT add its value to the sum
          if (!relatedActivity) {
            return sum
          }
          
          if (financialValue === 0) {
            let kpiValue = 0
            
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue > 0) {
              financialValue = kpiValue
              return sum + financialValue
            }
          }
          
          if (financialValue === 0) {
            const actualValue = (kpi.actual_value ?? 
                               parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, ''))) || 
                               0
            
            if (actualValue > 0) {
              financialValue = actualValue
              return sum + financialValue
            }
          }
          
          return sum
        } catch (error) {
          console.error('[Outer Range] Error calculating KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    } catch (error) {
      console.error('[Outer Range] Error calculating outer range value:', error)
      return 0
    }
  }, [outerRangeStart, debouncedDateRange.start, today, projectKPIsMap, getPeriodsInRange, debouncedSelectedDivisions])

  // ✅ Calculate Planned value before the selected date range (Outer Range)
  const calculateOuterRangePlannedValue = useCallback((project: Project, analytics: any): number => {
    // If outer range is not configured, return 0
    if (!outerRangeStart) return 0
    
    // ✅ Get periods to use first period start as fallback if dateRange.start is not set
    const periods = getPeriodsInRange()
    const outerRangeEndDate = dateRange.start || (periods.length > 0 ? periods[0].start.toISOString().split('T')[0] : null)
    
    if (!outerRangeEndDate) return 0
    
    // ✅ PERFORMANCE: Use pre-filtered KPIs instead of filtering every time
    const projectKPIs = projectKPIsMap.get(project.id)
    let allProjectKPIs = projectKPIs?.planned || []
    
    // ✅ DOUBLE CHECK: Filter KPIs to ensure they match this specific project's full code
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
    const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
    const projectId = project.id
    
    allProjectKPIs = allProjectKPIs.filter((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
      const kpiProjectId = (kpi as any).project_id || ''
      
      // ✅ PRIORITY 1: Exact match by project_full_code
      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
        return true
      }
      
      // ✅ PRIORITY 2: Match by project_id
      if (projectId && kpiProjectId && projectId === kpiProjectId) {
        return true
      }
      
      // ✅ PRIORITY 3: Match by project_code + project_sub_code
      if (projectSubCode && kpiProjectSubCode) {
        if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
          return true
        }
      }
      
      return false
    })
    
    try {
      const outerStart = new Date(outerRangeStart)
      const outerEnd = new Date(outerRangeEndDate)
      outerStart.setHours(0, 0, 0, 0)
      outerEnd.setHours(23, 59, 59, 999)
      
      // ✅ For current/future periods, use today as the end date instead of outerEnd
      const effectiveOuterEnd = outerEnd > today ? today : outerEnd
      
      // Get KPI Planned for outer range period
      const plannedKPIsInOuterRange = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') return false
        
        // ✅ Use EXACT SAME LOGIC as calculatePeriodPlannedValue
        const rawKPIDate = (kpi as any).raw || {}
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else {
          kpiDateStr = activityDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          
          const normalizedOuterStart = new Date(outerStart)
          normalizedOuterStart.setHours(0, 0, 0, 0)
          
          const normalizedOuterEnd = new Date(effectiveOuterEnd)
          normalizedOuterEnd.setHours(23, 59, 59, 999)
          
          // Check if KPI date is within outer range
          const inRange = kpiDate >= normalizedOuterStart && kpiDate <= normalizedOuterEnd
          
          return inRange
        } catch {
          return false
        }
      })
      
      // ✅ Calculate value using EXACT SAME LOGIC as calculatePeriodPlannedValue
      // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
      const projectActivities = analytics.activities || []
      
      return plannedKPIsInOuterRange.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          let financialValue = 0
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            
            if (rate > 0 && quantityValue > 0) {
              financialValue = quantityValue * rate
              if (financialValue > 0) {
                return sum + financialValue
              }
            }
          }
          
          // ✅ FIX: Only add value if relatedActivity was found in filtered activities
          // If relatedActivity is not found, it means this KPI belongs to an activity that was filtered out
          // So we should NOT add its value to the sum
          if (!relatedActivity) {
            return sum
          }
          
          if (financialValue === 0) {
            let kpiValue = 0
            
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue > 0) {
              financialValue = kpiValue
              return sum + financialValue
            }
          }
          
          return sum
        } catch (error) {
          console.error('[Outer Range Planned] Error calculating KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    } catch (error) {
      console.error('[Outer Range Planned] Error calculating outer range planned value:', error)
      return 0
    }
  }, [outerRangeStart, dateRange.start, today, projectKPIsMap, getPeriodsInRange])

  // ✅ Calculate Virtual Material Amount for Outer Range (Actual)
  // ✅ FIX: analytics.activities is already filtered by divisions in getCachedPeriodValues
  // So we should use analytics.activities directly without filtering again
  const calculateOuterRangeVirtualMaterialAmount = useCallback((project: Project, analytics: any): number => {
    if (!outerRangeStart || !showVirtualMaterialValues) return 0
    
    const periods = getPeriodsInRange()
    const outerRangeEndDate = dateRange.start || (periods.length > 0 ? periods[0].start.toISOString().split('T')[0] : null)
    
    if (!outerRangeEndDate) return 0
    
    const projectKPIs = projectKPIsMap.get(project.id)
    const allProjectKPIs = projectKPIs?.actual || []
    // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
    const projectActivities = analytics.activities || []
    
    // Get Virtual Material Percentage from project
    let virtualMaterialPercentage = 0
    const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
    
    if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
      let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
      const parsedValue = parseFloat(cleanedValue)
      if (!isNaN(parsedValue)) {
        if (parsedValue > 0 && parsedValue <= 1) {
          virtualMaterialPercentage = parsedValue * 100
        } else {
          virtualMaterialPercentage = parsedValue
        }
      }
    }
    
    if (virtualMaterialPercentage === 0) return 0
    
    try {
      const outerStart = new Date(outerRangeStart)
      const outerEnd = new Date(outerRangeEndDate)
      outerStart.setHours(0, 0, 0, 0)
      outerEnd.setHours(23, 59, 59, 999)
      
      const effectiveOuterEnd = outerEnd > today ? today : outerEnd
      
      // Get Actual KPIs for outer range period where activity uses virtual material
      const actualKPIsInOuterRange = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') return false
        
        const rawKPIDate = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          kpiDateStr = actualDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || actualDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          
          const normalizedOuterStart = new Date(outerStart)
          normalizedOuterStart.setHours(0, 0, 0, 0)
          
          const normalizedOuterEnd = new Date(effectiveOuterEnd)
          normalizedOuterEnd.setHours(23, 59, 59, 999)
          
          const inRange = kpiDate >= normalizedOuterStart && kpiDate <= normalizedOuterEnd
          
          if (!inRange) return false
          
          // Check if activity uses virtual material
          const rawKpi = (kpi as any).raw || {}
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          return relatedActivity?.use_virtual_material === true
        } catch {
          return false
        }
      })
      
      // Calculate Virtual Material Amount
      return actualKPIsInOuterRange.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (!relatedActivity || !relatedActivity.use_virtual_material) return sum
          
          const rawActivity = (relatedActivity as any).raw || {}
          const totalValueFromActivity = relatedActivity.total_value || 
                                       parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                       0
          
          const totalUnits = relatedActivity.total_units || 
                          relatedActivity.planned_units ||
                          parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
          
          let rate = 0
          if (totalUnits > 0 && totalValueFromActivity > 0) {
            rate = totalValueFromActivity / totalUnits
          } else {
            rate = relatedActivity.rate || 
                  parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                  0
          }
          
          let baseValue = 0
          if (rate > 0 && quantityValue > 0) {
            baseValue = quantityValue * rate
          } else {
            const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
            if (kpiValue > 0) {
              baseValue = kpiValue
            }
          }
          
          if (baseValue > 0) {
            return sum + (baseValue * (virtualMaterialPercentage / 100))
          }
          
          return sum
        } catch {
          return sum
        }
      }, 0)
    } catch (error) {
      console.error('[Outer Range VM] Error calculating outer range virtual material amount:', error)
      return 0
    }
  }, [outerRangeStart, debouncedDateRange.start, today, projectKPIsMap, getPeriodsInRange, showVirtualMaterialValues, debouncedSelectedDivisions])

  // ✅ Calculate Virtual Material Amount for Outer Range (Planned)
  // ✅ FIX: analytics.activities is already filtered by divisions in getCachedPeriodValues
  // So we should use analytics.activities directly without filtering again
  const calculateOuterRangePlannedVirtualMaterialAmount = useCallback((project: Project, analytics: any): number => {
    if (!outerRangeStart || !showVirtualMaterialValues || !viewPlannedValue) return 0
    
    const periods = getPeriodsInRange()
    const outerRangeEndDate = dateRange.start || (periods.length > 0 ? periods[0].start.toISOString().split('T')[0] : null)
    
    if (!outerRangeEndDate) return 0
    
    const projectKPIs = projectKPIsMap.get(project.id)
    const allProjectKPIs = projectKPIs?.planned || []
    // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
    const projectActivities = analytics.activities || []
    
    // Get Virtual Material Percentage from project
    let virtualMaterialPercentage = 0
    const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
    
    if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
      let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
      const parsedValue = parseFloat(cleanedValue)
      if (!isNaN(parsedValue)) {
        if (parsedValue > 0 && parsedValue <= 1) {
          virtualMaterialPercentage = parsedValue * 100
        } else {
          virtualMaterialPercentage = parsedValue
        }
      }
    }
    
    if (virtualMaterialPercentage === 0) return 0
    
    try {
      const outerStart = new Date(outerRangeStart)
      const outerEnd = new Date(outerRangeEndDate)
      outerStart.setHours(0, 0, 0, 0)
      outerEnd.setHours(23, 59, 59, 999)
      
      const effectiveOuterEnd = outerEnd > today ? today : outerEnd
      
      // Get Planned KPIs for outer range period where activity uses virtual material
      const plannedKPIsInOuterRange = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') return false
        
        const rawKPIDate = (kpi as any).raw || {}
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else {
          kpiDateStr = activityDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          
          const normalizedOuterStart = new Date(outerStart)
          normalizedOuterStart.setHours(0, 0, 0, 0)
          
          const normalizedOuterEnd = new Date(effectiveOuterEnd)
          normalizedOuterEnd.setHours(23, 59, 59, 999)
          
          const inRange = kpiDate >= normalizedOuterStart && kpiDate <= normalizedOuterEnd
          
          if (!inRange) return false
          
          // Check if activity uses virtual material
          const rawKpi = (kpi as any).raw || {}
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          return relatedActivity?.use_virtual_material === true
        } catch {
          return false
        }
      })
      
      // Calculate Planned Virtual Material Amount
      return plannedKPIsInOuterRange.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (!relatedActivity || !relatedActivity.use_virtual_material) return sum
          
          const rawActivity = (relatedActivity as any).raw || {}
          const totalValueFromActivity = relatedActivity.total_value || 
                                       parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                       0
          
          const totalUnits = relatedActivity.total_units || 
                          relatedActivity.planned_units ||
                          parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
          
          let rate = 0
          if (totalUnits > 0 && totalValueFromActivity > 0) {
            rate = totalValueFromActivity / totalUnits
          } else {
            rate = relatedActivity.rate || 
                  parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                  0
          }
          
          let baseValue = 0
          if (rate > 0 && quantityValue > 0) {
            baseValue = quantityValue * rate
          } else {
            const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
            if (kpiValue > 0) {
              baseValue = kpiValue
            }
          }
          
          if (baseValue > 0) {
            return sum + (baseValue * (virtualMaterialPercentage / 100))
          }
          
          return sum
        } catch {
          return sum
        }
      }, 0)
    } catch (error) {
      console.error('[Outer Range Planned VM] Error calculating outer range planned virtual material amount:', error)
      return 0
    }
  }, [outerRangeStart, debouncedDateRange.start, today, projectKPIsMap, getPeriodsInRange, showVirtualMaterialValues, viewPlannedValue, debouncedSelectedDivisions])

  // ✅ Calculate Virtual Material Amount for Planned KPIs
  // ✅ FIX: analytics.activities is already filtered by divisions in getCachedPeriodValues
  // So we should use analytics.activities directly without filtering again
  const calculatePeriodPlannedVirtualMaterialAmount = useCallback((project: Project, analytics: any): number[] => {
    // ✅ FIX: Get KPIs from projectKPIsMap, but also verify they match this specific project
    const projectKPIs = projectKPIsMap.get(project.id)
    let allProjectKPIs = projectKPIs?.planned || []
    
    // ✅ DOUBLE CHECK: Filter KPIs to ensure they match this specific project's full code
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
    const projectSubCode = (project.project_sub_code || '').toString().trim().toUpperCase()
    const projectId = project.id
    
    allProjectKPIs = allProjectKPIs.filter((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectSubCode = (kpi.project_sub_code || rawKPI['Project Sub Code'] || '').toString().trim().toUpperCase()
      const kpiProjectId = (kpi as any).project_id || ''
      
      // ✅ PRIORITY 1: Exact match by project_full_code
      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
        return true
      }
      
      // ✅ PRIORITY 2: Match by project_id
      if (projectId && kpiProjectId && projectId === kpiProjectId) {
        return true
      }
      
      // ✅ PRIORITY 3: Match by project_code + project_sub_code
      if (projectSubCode && kpiProjectSubCode) {
        if (kpiProjectCode === projectCode && kpiProjectSubCode === projectSubCode) {
          return true
        }
      }
      
      return false
    })
    // ✅ FIX: Use analytics.activities directly (already filtered by divisions in getCachedPeriodValues)
    const projectActivities = analytics.activities || []
    
    // Get Virtual Material Percentage from project
    let virtualMaterialPercentage = 0
    const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
    
    if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
      let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
      const parsedValue = parseFloat(cleanedValue)
      if (!isNaN(parsedValue)) {
        if (parsedValue > 0 && parsedValue <= 1) {
          virtualMaterialPercentage = parsedValue * 100
        } else {
          virtualMaterialPercentage = parsedValue
        }
      }
    }
    
    if (virtualMaterialPercentage === 0) {
      return periods.map(() => 0)
    }
    
    return periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd
      
      // Get KPI Planned for this period (same logic as calculatePeriodPlannedValue)
      const plannedKPIsInPeriod = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') return false
        
        const rawKPIDate = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999)
          
          return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
        } catch {
          return false
        }
      })
      
      return plannedKPIsInPeriod.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          let baseValue = 0
          
          // Find related activity (same logic as calculatePeriodPlannedValue)
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          let relatedActivity: BOQActivity | undefined = undefined
          
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName &&
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          if (!relatedActivity && kpiActivityName && kpiProjectCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName &&
                     activityProjectCode === kpiProjectCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          if (!relatedActivity && kpiActivityName) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              return activityName === kpiActivityName
            })
          }
          
          // Check if activity uses virtual material
          const useVirtualMaterial = relatedActivity?.use_virtual_material ?? false
          
          if (!useVirtualMaterial) {
            return sum
          }
          
          // Calculate base value (same logic as calculatePeriodPlannedValue)
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            const totalValueFromActivity = relatedActivity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
            const totalUnits = relatedActivity.total_units || relatedActivity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
            }
            if (rate > 0 && quantityValue > 0) {
              baseValue = quantityValue * rate
            }
          }
          
          if (baseValue === 0) {
            let kpiValue = 0
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            if (kpiValue > 0) {
              baseValue = kpiValue
            }
          }
          
          if (baseValue === 0) {
            const plannedValue = (kpi.planned_value ?? parseFloat(String(rawKpi['Planned Value'] || '0').replace(/,/g, ''))) || 0
            if (plannedValue > 0) {
              baseValue = plannedValue
            }
          }
          
          if (baseValue === 0) {
            return sum
          }
          
          // Calculate Virtual Material Amount
          if (virtualMaterialPercentage > 0) {
            const virtualMaterialAmount = baseValue * (virtualMaterialPercentage / 100)
            return sum + virtualMaterialAmount
          }
          
          return sum
        } catch (error) {
          if (process.env.NODE_ENV === 'development') console.error('[Monthly Revenue] Error calculating Planned Virtual Material KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    })
  }, [kpis, periods, activities, today, projectKPIsMap, kpiMatchesActivity, debouncedSelectedDivisions])

  // ✅ PERFORMANCE: Use existing optimized functions instead of recalculating
  // These functions are already optimized and use projectKPIsMap for fast lookups
  // ✅ PERFORMANCE: Use debouncedSelectedDivisions as a string key to ensure cache recalculation
  const selectedDivisionsKey = useMemo(() => debouncedSelectedDivisions.sort().join(','), [debouncedSelectedDivisions])
  
  // ? PERFORMANCE: Use useRef for caches to persist across renders without triggering re-renders
  // This prevents blocking the UI with heavy calculations for all projects
  const periodValuesCache = useRef(new Map<string, { earned: number[], planned: number[], outerRangeValue: number, outerRangePlannedValue: number, outerRangeVirtualMaterialAmount: number, outerRangePlannedVirtualMaterialAmount: number, virtualMaterialAmount: number[], plannedVirtualMaterialAmount: number[] }>())
  
  // ? PERFORMANCE: Cache for activity period values to avoid recalculation when opening Details
  const activityPeriodValuesCache = useRef(new Map<string, { earned: number[], planned: number[], virtualMaterial: number[], plannedVirtualMaterial: number[] }>())
  
  // ? PERFORMANCE: Clear caches when debounced dateRange or periodType changes
  useEffect(() => {
    periodValuesCache.current.clear()
    activityPeriodValuesCache.current.clear()
  }, [debouncedDateRange.start, debouncedDateRange.end, debouncedPeriodType, selectedDivisionsKey])
  
  // ? PERFORMANCE: Helper to get cached activity period values
  const getCachedActivityPeriodValues = useCallback((activityId: string, activity: BOQActivity, project: Project, projectFullCode: string): { earned: number[], planned: number[], virtualMaterial: number[], plannedVirtualMaterial: number[] } => {
    const cacheKey = `${activityId}-${selectedDivisionsKey}`
    
    // Check if already cached
    if (activityPeriodValuesCache.current.has(cacheKey)) {
      return activityPeriodValuesCache.current.get(cacheKey)!
    }
    
    // Calculate and cache
    const rawActivity = (activity as any).raw || {}
    
    // Calculate Actual period values
    const activityPeriodValues = periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd
      
      // ✅ PERFORMANCE: Pre-filter KPIs by project and input type to reduce iterations
      const projectKPIs = projectKPIsMap.get(project.id)
      let allProjectKPIs = projectKPIs?.actual || []
      
      // Fallback to filtering all KPIs if projectKPIsMap doesn't have this project
      if (allProjectKPIs.length === 0) {
        allProjectKPIs = kpis.filter((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
          if (inputType !== 'actual') return false
          
          // Match project
          const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
          const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
          const kpiProjectId = (kpi as any).project_id || ''
          
          if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) return true
          if (project.id && kpiProjectId && project.id === kpiProjectId) return true
          if (kpiProjectCode && projectFullCode.includes(kpiProjectCode)) {
            const projectCode = (project.project_code || '').toString().trim().toUpperCase()
            if (kpiProjectCode === projectCode) return true
          }
          return false
        })
      }
      
      // Get Actual KPIs for this activity in this period
      const actualKPIs = allProjectKPIs.filter((kpi: any) => {
        // 1. Match activity and zone using helper function
        if (!kpiMatchesActivity(kpi, activity)) {
          return false
        }
        
        // 2. Match date (must be within period)
        const rawKPIDate = (kpi as any).raw || {}
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        let kpiDateStr = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          kpiDateStr = actualDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || actualDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0)
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999)
          
          return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
        } catch {
          return false
        }
      })
      
      // Calculate earned value for this period
      return actualKPIs.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          let financialValue = 0
          const totalValueFromActivity = activity.total_value || 
                                       parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                       0
          const totalUnits = activity.total_units || 
                      activity.planned_units ||
                      parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                      0
          let rate = 0
          if (totalUnits > 0 && totalValueFromActivity > 0) {
            rate = totalValueFromActivity / totalUnits
          } else {
            rate = activity.rate || 
                  parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                  0
          }
          
          if (rate > 0 && quantityValue > 0) {
            financialValue = quantityValue * rate
            if (financialValue > 0) {
              return sum + financialValue
            }
          }
          
          let kpiValue = 0
          if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
            const val = rawKpi['Value']
            kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
          }
          if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
            const val = rawKpi.value
            kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
          }
          if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
            const val = kpi.value
            kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
          }
          if (kpiValue > 0) {
            return sum + kpiValue
          }
          
          const actualValue = kpi.actual_value || parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, '')) || 0
          if (actualValue > 0) {
            return sum + actualValue
          }
          
          return sum
        } catch {
          return sum
        }
      }, 0)
    })
    
    // Calculate Planned period values (if enabled)
    const activityPlannedValues = viewPlannedValue ? periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd
      
      const projectKPIs = projectKPIsMap.get(project.id)
      let allProjectKPIs = projectKPIs?.planned || []
      
      // Fallback to filtering all KPIs if projectKPIsMap doesn't have this project
      if (allProjectKPIs.length === 0) {
        allProjectKPIs = kpis.filter((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
          if (inputType !== 'planned') return false
          
          // Match project
          const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
          const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
          const kpiProjectId = (kpi as any).project_id || ''
          
          if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) return true
          if (project.id && kpiProjectId && project.id === kpiProjectId) return true
          if (kpiProjectCode && projectFullCode.includes(kpiProjectCode)) {
            const projectCode = (project.project_code || '').toString().trim().toUpperCase()
            if (kpiProjectCode === projectCode) return true
          }
          return false
        })
      }
      
      const plannedKPIs = allProjectKPIs.filter((kpi: any) => {
        if (!kpiMatchesActivity(kpi, activity)) {
          return false
        }
        
        const kpiDate = kpi.target_date || (kpi as any).raw?.['Target Date'] || ''
        if (!kpiDate) return false
        
        try {
          const date = new Date(kpiDate)
          if (isNaN(date.getTime())) return false
          date.setHours(0, 0, 0, 0)
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999)
          return date >= normalizedPeriodStart && date <= normalizedPeriodEnd
        } catch {
          return false
        }
      })
      
      let plannedValue = 0
      plannedKPIs.forEach((kpi: any) => {
        const rawKpi = (kpi as any).raw || {}
        const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
        
        const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
        const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
        
        let rate = 0
        if (totalUnits > 0 && totalValue > 0) {
          rate = totalValue / totalUnits
        } else {
          rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
        }
        
        if (rate > 0 && quantity > 0) {
          plannedValue += rate * quantity
        } else {
          const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
          if (kpiValue > 0) {
            plannedValue += kpiValue
          }
        }
      })
      
      return plannedValue
    }) : []
    
    // Calculate Virtual Material values
    let virtualMaterialPercentage = 0
    if (activity.use_virtual_material) {
      const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
      if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
        let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
        const parsedValue = parseFloat(cleanedValue)
        if (!isNaN(parsedValue)) {
          if (parsedValue > 0 && parsedValue <= 1) {
            virtualMaterialPercentage = parsedValue * 100
          } else {
            virtualMaterialPercentage = parsedValue
          }
        }
      }
    }
    
    const activityVirtualMaterialValues = showVirtualMaterialValues && virtualMaterialPercentage > 0
      ? activityPeriodValues.map((baseValue: number) => baseValue * (virtualMaterialPercentage / 100))
      : []
    
    const activityPlannedVirtualMaterialValues = showVirtualMaterialValues && viewPlannedValue && virtualMaterialPercentage > 0
      ? activityPlannedValues.map((baseValue: number) => baseValue * (virtualMaterialPercentage / 100))
      : []
    
    const values = {
      earned: activityPeriodValues,
      planned: activityPlannedValues,
      virtualMaterial: activityVirtualMaterialValues,
      plannedVirtualMaterial: activityPlannedVirtualMaterialValues
    }
    
    activityPeriodValuesCache.current.set(cacheKey, values)
    return values
  }, [periods, today, projectKPIsMap, kpis, kpiMatchesActivity, viewPlannedValue, showVirtualMaterialValues, selectedDivisionsKey])
  
  // ✅ PERFORMANCE: Calculate values lazily only for projects that need to be displayed
  // This function is called when we need a project's values
  // ✅ FIX: Use unique key (project_full_code + project_name) instead of projectId for exact matching
  const getCachedPeriodValues = useCallback((projectId: string, analytics: any): { earned: number[], planned: number[], outerRangeValue: number, outerRangePlannedValue: number, outerRangeVirtualMaterialAmount: number, outerRangePlannedVirtualMaterialAmount: number, virtualMaterialAmount: number[], plannedVirtualMaterialAmount: number[] } => {
    const project = analytics.project
    // ✅ FIX: Use unique key combining project_full_code and project_name for exact matching
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectName = (project.project_name || '').toString().trim()
    const uniqueProjectKey = `${projectFullCode}|${projectName}`
    
    // ✅ PERFORMANCE: Include debouncedSelectedDivisions in cache key
    const periodCacheKey = `${uniqueProjectKey}-${debouncedSelectedDivisions.sort().join(',')}`
    // Check if already cached
    if (periodValuesCache.current.has(periodCacheKey)) {
      return periodValuesCache.current.get(periodCacheKey)!
    }
    
    // ✅ PERFORMANCE: Calculate and cache with debounced divisions
    // ✅ FIX: Use projectActivitiesMap to get accurate activities for this specific project
    const projectActivities = projectActivitiesMap.get(project.id) || []
    // ✅ DOUBLE CHECK: Filter activities to ensure they match this specific project's full code
    const filteredProjectActivities = projectActivities.filter((activity: BOQActivity) => {
      const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      return activityFullCode === projectFullCode || activity.project_id === project.id
    })
    
    let filteredAnalytics = {
      ...analytics,
      activities: filteredProjectActivities
    }
    
    if (debouncedSelectedDivisions.length > 0) {
      const filteredActivities = filteredProjectActivities.filter((activity: BOQActivity) => {
        const rawActivity = (activity as any).raw || {}
        const division = activity.activity_division || 
                       (activity as any)['Activity Division'] || 
                       rawActivity['Activity Division'] || 
                       rawActivity['activity_division'] || ''
        
        if (!division || division.trim() === '') {
          return false
        }
        
        const normalizedDivision = division.trim().toLowerCase()
        return debouncedSelectedDivisions.some(selectedDiv => 
          selectedDiv.trim().toLowerCase() === normalizedDivision
        )
      })
      
      filteredAnalytics = {
        ...analytics,
        activities: filteredActivities
      }
    }
    
    const earnedValues = calculatePeriodEarnedValue(analytics.project, filteredAnalytics)
    const plannedValues = viewPlannedValue ? calculatePeriodPlannedValue(analytics.project, filteredAnalytics) : []
    const outerRangeValue = showOuterRangeColumn ? calculateOuterRangeValue(analytics.project, filteredAnalytics) : 0
    const outerRangePlannedValue = showOuterRangeColumn && viewPlannedValue ? calculateOuterRangePlannedValue(analytics.project, filteredAnalytics) : 0
    const outerRangeVirtualMaterialAmount = showOuterRangeColumn && showVirtualMaterialValues ? calculateOuterRangeVirtualMaterialAmount(analytics.project, filteredAnalytics) : 0
    const outerRangePlannedVirtualMaterialAmount = showOuterRangeColumn && showVirtualMaterialValues && viewPlannedValue ? calculateOuterRangePlannedVirtualMaterialAmount(analytics.project, filteredAnalytics) : 0
    const virtualMaterialAmount = showVirtualMaterialValues ? calculatePeriodVirtualMaterialAmount(analytics.project, filteredAnalytics) : []
    const plannedVirtualMaterialAmount = showVirtualMaterialValues && viewPlannedValue ? calculatePeriodPlannedVirtualMaterialAmount(analytics.project, filteredAnalytics) : []
    
    const values = { earned: earnedValues, planned: plannedValues, outerRangeValue, outerRangePlannedValue, outerRangeVirtualMaterialAmount, outerRangePlannedVirtualMaterialAmount, virtualMaterialAmount, plannedVirtualMaterialAmount }
    // ✅ PERFORMANCE: Include debouncedSelectedDivisions in cache key
    const periodCacheKeyFinal = `${uniqueProjectKey}-${debouncedSelectedDivisions.sort().join(',')}`
    periodValuesCache.current.set(periodCacheKeyFinal, values)
    return values
  }, [debouncedSelectedDivisions, calculatePeriodEarnedValue, calculatePeriodPlannedValue, viewPlannedValue, showOuterRangeColumn, calculateOuterRangeValue, calculateOuterRangePlannedValue, calculateOuterRangeVirtualMaterialAmount, calculateOuterRangePlannedVirtualMaterialAmount, showVirtualMaterialValues, calculatePeriodVirtualMaterialAmount, calculatePeriodPlannedVirtualMaterialAmount, projectActivitiesMap])

  // ✅ PERFORMANCE: Show ALL projects from allAnalytics, regardless of date range or KPIs
  // The date range filter only affects which periods show data in the table, not which projects are displayed
  // This ensures ALL active projects are always visible, even if they don't have KPIs in the selected period
  const projectsWithWorkInRange = useMemo(() => {
    // ✅ allAnalytics already contains only filtered projects (from filteredProjects)
    // filteredProjects is already filtered by debouncedSelectedDivisions, so allAnalytics is also filtered
    // The date range is only used for calculating period values, not for filtering projects
    let filtered = allAnalytics
    
    // ✅ PERFORMANCE: Filter out projects with Grand Total = 0 if checkbox is checked
    // Note: This filter is applied AFTER division filter (which is already in allAnalytics)
    // ✅ PERFORMANCE: Use lazy evaluation - only calculate when needed (for visible projects)
    if (hideZeroProjects) {
      // ✅ PERFORMANCE: Don't calculate for all projects at once - filter will be applied lazily in render
      // The actual filtering will happen when projects are rendered, not here
      filtered = filtered
    }
    
    return filtered
  }, [allAnalytics, hideZeroProjects])
  
  // ✅ PERFORMANCE: Paginate projects for display with lazy filtering
  const paginatedProjects = useMemo(() => {
    let filtered = projectsWithWorkInRange
    
    // ✅ PERFORMANCE: Apply hideZeroProjects filter lazily only to visible projects
    if (hideZeroProjects) {
      filtered = filtered.filter((analytics: any) => {
        const projectId = analytics.project.id
        const cachedValues = getCachedPeriodValues(projectId, analytics)
        const periodValues = cachedValues?.earned || []
        const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
        return grandTotal > 0
      })
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }, [projectsWithWorkInRange, currentPage, itemsPerPage, hideZeroProjects, getCachedPeriodValues])
  
  // ✅ PERFORMANCE: Calculate total pages with lazy filtering
  const totalPages = useMemo(() => {
    let filtered = projectsWithWorkInRange
    if (hideZeroProjects) {
      filtered = filtered.filter((analytics: any) => {
        const projectId = analytics.project.id
        const cachedValues = getCachedPeriodValues(projectId, analytics)
        const periodValues = cachedValues?.earned || []
        const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
        return grandTotal > 0
      })
    }
    return Math.ceil(filtered.length / itemsPerPage)
  }, [projectsWithWorkInRange, itemsPerPage, hideZeroProjects, getCachedPeriodValues])
  
  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSelectedDivisions, hideZeroProjects, debouncedDateRange.start, debouncedDateRange.end, debouncedPeriodType])
  
  // ✅ PERFORMANCE: Clear activity cache when debounced filters change
  useEffect(() => {
    activityPeriodValuesCache.current.clear()
  }, [debouncedSelectedDivisions, debouncedDateRange.start, debouncedDateRange.end, debouncedPeriodType, viewPlannedValue, showVirtualMaterialValues])
  
  // ✅ Smooth page change with loading state
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage) return
    
    setIsChangingPage(true)
    setCurrentPage(newPage)
    
    // ✅ Scroll to top of table smoothly
    setTimeout(() => {
      const tableElement = document.querySelector('table')
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setIsChangingPage(false)
    }, 100)
  }, [currentPage])
  
  // ✅ Handle items per page change
  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page
    setIsChangingPage(true)
    
    setTimeout(() => {
      setIsChangingPage(false)
    }, 100)
  }, [])
  
  // ✅ PERFORMANCE: Pre-calculate values for visible projects + buffer (for smooth scrolling)
  // ✅ Calculate for current page + next page for instant navigation
  useEffect(() => {
    if (allAnalytics.length === 0 || projectsWithWorkInRange.length === 0) return
    
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage * 2 // ✅ Pre-calculate current + next page for instant navigation
    const projectsToPrecalculate = projectsWithWorkInRange.slice(startIndex, endIndex)
    
    // ✅ Use requestIdleCallback for non-blocking calculation
    const calculateInBackground = () => {
      projectsToPrecalculate.forEach((analytics: any) => {
        if (!periodValuesCache.current.has(analytics.project.id)) {
          getCachedPeriodValues(analytics.project.id, analytics)
        }
      })
    }
    
    // Use setTimeout for immediate calculation, or requestIdleCallback if available
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(calculateInBackground, { timeout: 1000 })
    } else {
      setTimeout(calculateInBackground, 0)
    }
  }, [currentPage, itemsPerPage, projectsWithWorkInRange, periodValuesCache, getCachedPeriodValues, allAnalytics.length])

  // ✅ PERFORMANCE: Removed debug logging useEffect for production


  // Close chart export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartExportMenuRef.current && !chartExportMenuRef.current.contains(event.target as Node)) {
        setShowChartExportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Export Chart function
  const handleExportChart = useCallback(async (format: 'png' | 'jpeg' | 'svg' | 'pdf') => {
    if (!chartRef.current) {
      alert('Chart not found')
      return
    }

    setShowChartExportMenu(false)

    try {
      const dateStr = dateRange.start && dateRange.end
        ? `${dateRange.start}_to_${dateRange.end}`
        : new Date().toISOString().split('T')[0]
      
      const baseFilename = `Weekly_Revenue_Chart_${dateStr}`

      if (format === 'svg') {
        // Export as SVG (direct from recharts)
        const svgElement = chartRef.current.querySelector('svg')
        if (!svgElement) {
          alert('SVG element not found')
          return
        }

        const svgData = new XMLSerializer().serializeToString(svgElement)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)
        const downloadLink = document.createElement('a')
        downloadLink.href = svgUrl
        downloadLink.download = `${baseFilename}.svg`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(svgUrl)
        
        console.log(`✅ Downloaded: ${baseFilename}.svg`)
        return
      }

      if (format === 'png' || format === 'jpeg') {
        // Export as PNG/JPEG using html2canvas
        const html2canvas = (await import('html2canvas')).default
        
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
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
          downloadLink.href = url
          downloadLink.download = `${baseFilename}.${format}`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          URL.revokeObjectURL(url)
          
          console.log(`✅ Downloaded: ${baseFilename}.${format}`)
        }, `image/${format}`, 0.95)
        return
      }

      if (format === 'pdf') {
        // Export as PDF using jspdf
        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')

        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        })

        const imgWidth = 297 // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`${baseFilename}.pdf`)
        
        console.log(`✅ Downloaded: ${baseFilename}.pdf`)
        return
      }
    } catch (error) {
      console.error('Error exporting chart:', error)
      alert('Failed to export chart. Please try again.')
    }
  }, [dateRange])

  // ✅ FIXED: Calculate totals directly from periodValuesCache (same as Grand Total column in table)
  // This ensures Summary Card values match exactly with the table's Grand Total column
  const totals = useMemo(() => {
    // ✅ Total Contract Value = Sum of contract_amount from all filtered projects
    const totalContractValue = filteredProjects.reduce((sum: number, project: Project) => {
      const contractAmount = parseFloat(String(project.contract_amount || '0').replace(/,/g, '')) || 0
      return sum + contractAmount
    }, 0)
    
    // ✅ PERFORMANCE: Total Earned Value = Sum of Grand Total from ALL projects using cached values
    // This uses the EXACT SAME LOGIC as the table's Grand Total column: periodValues.reduce((sum, val) => sum + val, 0)
    let totalEarnedValue = 0
    allAnalytics.forEach((analytics: any) => {
      const projectId = analytics.project.id
      // ✅ PERFORMANCE: Use getCachedPeriodValues to ensure cache is populated
      const cachedValues = getCachedPeriodValues(projectId, analytics)
      const periodValues = cachedValues?.earned || []
      // Calculate Grand Total for this project (same as table row)
      const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
      totalEarnedValue += grandTotal
    })
    
    // ✅ PERFORMANCE: Calculate period earned value totals using cached values (much faster)
    // ✅ FIX: Use cached period values instead of recalculating from activities/KPIs
    const periodEarnedValueTotals = periods.map((_, periodIndex) => {
      let sum = 0
      
      // ✅ PERFORMANCE: Sum from cached values (O(n) instead of O(n*m*k))
      projectsWithWorkInRange.forEach((analytics: any) => {
        const projectId = analytics.project.id
        const cachedValues = getCachedPeriodValues(projectId, analytics)
        const periodValues = cachedValues?.earned || []
        sum += periodValues[periodIndex] || 0
      })
      
      return sum
    })
    
    // ✅ PERFORMANCE: Calculate period planned value totals using cached values
    const periodPlannedValueTotals = periods.map((_, periodIndex) => {
      let sum = 0
      
      // ✅ PERFORMANCE: Sum from cached values (O(n) instead of O(n*m*k))
      projectsWithWorkInRange.forEach((analytics: any) => {
        const projectId = analytics.project.id
        const cachedValues = getCachedPeriodValues(projectId, analytics)
        const periodPlannedValues = cachedValues?.planned || []
        sum += periodPlannedValues[periodIndex] || 0
      })
      
      return sum
    })
    
    // ✅ Calculate grand totals from period totals (sum of all periods)
    const grandTotalEarnedValue = periodEarnedValueTotals.reduce((sum, val) => sum + val, 0)
    const grandTotalPlannedValue = periodPlannedValueTotals.reduce((sum, val) => sum + val, 0)
    
    // ✅ Calculate total Virtual Material Amount from PROJECT ROWS ONLY (not from expanded activities)
    const totalVirtualMaterialAmount = showVirtualMaterialValues 
      ? (() => {
          let sum = 0
          // ✅ Sum ONLY from project rows (not from expanded activities)
          // ✅ Use allAnalytics instead of projectsWithWorkInRange so chart values don't change when hideZeroProjects is toggled
          allAnalytics.forEach((analytics: any) => {
            const isExpanded = expandedProjects.has(analytics.project.id)
            
            if (isExpanded) {
              // ✅ Project is expanded: calculate sum of activities' VM (which is what the project row displays)
              const project = analytics.project
              const projectId = project.id
              // ✅ PERFORMANCE: Use pre-computed map instead of filtering activities repeatedly
              const projectActivities = projectActivitiesMap.get(projectId) || []
              
              // Calculate sum of activities' VM for all periods
              projectActivities.forEach((activity: BOQActivity) => {
                const rawActivity = (activity as any).raw || {}
                
                // Calculate VM for all periods for this activity
                periods.forEach((period) => {
                  const periodStart = period.start
                  const periodEnd = period.end
                  const effectivePeriodEnd = periodEnd > today ? today : periodEnd
                  
                  // Get Actual KPIs for this activity in this period
                  const actualKPIs = kpis.filter((kpi: any) => {
                    const rawKPI = (kpi as any).raw || {}
                    const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                    if (inputType !== 'actual') return false
                    
                    // Match date
                    const rawKPIDate = (kpi as any).raw || {}
                    const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
                    const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
                    const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
                    
                    let kpiDateStr = ''
                    if (kpi.input_type === 'Actual' && actualDateValue) {
                      kpiDateStr = actualDateValue
                    } else if (dayValue) {
                      kpiDateStr = activityDateValue || dayValue
                    } else {
                      kpiDateStr = activityDateValue || actualDateValue
                    }
                    
                    if (!kpiDateStr) return false
                    
                    try {
                      const kpiDate = new Date(kpiDateStr)
                      if (isNaN(kpiDate.getTime())) return false
                      kpiDate.setHours(0, 0, 0, 0)
                      const normalizedPeriodStart = new Date(periodStart)
                      normalizedPeriodStart.setHours(0, 0, 0, 0)
                      const normalizedPeriodEnd = new Date(effectivePeriodEnd)
                      normalizedPeriodEnd.setHours(23, 59, 59, 999)
                      if (!(kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd)) {
                        return false
                      }
                    } catch {
                      return false
                    }
                    
                    // Match activity (same logic as activity rows)
                    const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
                    const kpiProjectFullCodeRaw = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim()
                    const kpiProjectCodeRaw = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim()
                    const kpiProjectFullCode = kpiProjectFullCodeRaw.toLowerCase().trim()
                    const kpiProjectCode = kpiProjectCodeRaw.toLowerCase().trim()
                    
                    const kpiZoneRaw = (kpi.zone || rawKPI['Zone'] || rawKPI['Zone Ref'] || rawKPI['Zone Number'] || '').toString().trim()
                    let kpiZone = kpiZoneRaw.toLowerCase().trim()
                    if (kpiZone && kpiProjectCode) {
                      const projectCodeUpper = kpiProjectCode.toUpperCase()
                      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
                      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
                      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
                    }
                    if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
                    
                    const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
                    const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toLowerCase()
                    const activityProjectCode = (activity.project_code || '').toString().trim().toLowerCase()
                    const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
                    
                    // Try multiple matching strategies
                    if (kpiActivityName && kpiProjectFullCode && kpiZone && activityZone) {
                      if (activityName === kpiActivityName && 
                          activityProjectFullCode === kpiProjectFullCode &&
                          (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))) {
                        return true
                      }
                    }
                    if (kpiActivityName && kpiProjectFullCode) {
                      if (activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode) {
                        return true
                      }
                    }
                    if (kpiActivityName && kpiProjectCode && kpiZone && activityZone) {
                      if (activityName === kpiActivityName && 
                          activityProjectCode === kpiProjectCode &&
                          (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))) {
                        return true
                      }
                    }
                    if (kpiActivityName && kpiProjectCode) {
                      if (activityName === kpiActivityName && activityProjectCode === kpiProjectCode) {
                        return true
                      }
                    }
                    if (kpiActivityName) {
                      const projectMatch = (
                        (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
                        (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
                        (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode) ||
                        (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode)
                      )
                      if (projectMatch && (activityName === kpiActivityName || 
                          activityName.includes(kpiActivityName) || 
                          kpiActivityName.includes(activityName))) {
                        return true
                      }
                    }
                    
                    return false
                  })
                  
                  // Get Virtual Material Percentage from project
      let virtualMaterialPercentage = 0
      const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
      
      if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
        let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
                    const parsedValue = parseFloat(cleanedValue)
                    if (!isNaN(parsedValue)) {
                      if (parsedValue > 0 && parsedValue <= 1) {
                        virtualMaterialPercentage = parsedValue * 100
                      } else {
                        virtualMaterialPercentage = parsedValue
                      }
                    }
                  }
                  
                  if (virtualMaterialPercentage === 0) return
                  
                  // Calculate Virtual Material Amount for this activity in this period
                  actualKPIs.forEach((kpi: any) => {
                    const rawKpi = (kpi as any).raw || {}
                    const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                    
                    const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                    const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                    
                    let rate = 0
                    if (totalUnits > 0 && totalValue > 0) {
                      rate = totalValue / totalUnits
                    } else {
                      rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                    }
                    
                    let baseValue = 0
                    if (rate > 0 && quantity > 0) {
                      baseValue = rate * quantity
                    } else {
                      const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
                      if (kpiValue > 0) {
                        baseValue = kpiValue
                      }
                    }
                    
                    if (baseValue > 0) {
                      sum += baseValue * (virtualMaterialPercentage / 100)
                    }
                  })
                })
              })
            } else {
              // ✅ Project is NOT expanded: use cached value
              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
              const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
              sum += virtualMaterialAmounts.reduce((s, val) => s + val, 0)
            }
          })
          
          return sum
        })()
      : 0
    
    // ✅ Calculate total Planned Virtual Material Amount from PROJECT ROWS ONLY (not from expanded activities)
    const totalPlannedVirtualMaterialAmount = showVirtualMaterialValues && viewPlannedValue
      ? (() => {
          let sum = 0
          // ✅ Sum ONLY from project rows (not from expanded activities)
          // ✅ Use allAnalytics instead of projectsWithWorkInRange so chart values don't change when hideZeroProjects is toggled
          allAnalytics.forEach((analytics: any) => {
            const isExpanded = expandedProjects.has(analytics.project.id)
            
            if (isExpanded) {
              // ✅ Project is expanded: calculate sum of activities' Planned VM (which is what the project row displays)
              const project = analytics.project
              const projectId = project.id
              // ✅ PERFORMANCE: Use pre-computed map instead of filtering activities repeatedly
              const projectActivities = projectActivitiesMap.get(projectId) || []
              const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
              
              // Calculate sum of activities' Planned VM for all periods
              projectActivities.forEach((activity: BOQActivity) => {
                const rawActivity = (activity as any).raw || {}
                
                // Calculate Planned VM for all periods for this activity
                periods.forEach((period) => {
                  const periodStart = period.start
                  const periodEnd = period.end
                  const effectivePeriodEnd = periodEnd > today ? today : periodEnd
                  
                  // Get Planned KPIs for this activity in this period
                  const plannedKPIs = kpis.filter((kpi: any) => {
                    const rawKPI = (kpi as any).raw || {}
                    const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
                    const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
                    const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
                    const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
                    const kpiZone = (kpi.zone || rawKPI['Zone'] || rawKPI['Zone Ref'] || rawKPI['Zone Number'] || '').toString().toLowerCase().trim()
                    
                    if (kpiProjectFullCode !== projectFullCode && kpiProjectCode !== projectFullCode) return false
                    if (!kpiActivityName || !activityName || 
                        (kpiActivityName !== activityName && 
                         !kpiActivityName.includes(activityName) && 
                         !activityName.includes(kpiActivityName))) {
                      return false
                    }
                    
                    const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
                    if (activityZone && kpiZone && activityZone !== kpiZone && !activityZone.includes(kpiZone) && !kpiZone.includes(activityZone)) {
                      return false
                    }
                    
                    const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                    if (inputType !== 'planned') return false
                    
                    const kpiDate = kpi.target_date || rawKPI['Target Date'] || ''
                    if (!kpiDate) return false
                    
                    try {
                      const date = new Date(kpiDate)
                      if (isNaN(date.getTime())) return false
                      date.setHours(0, 0, 0, 0)
                      const normalizedPeriodStart = new Date(periodStart)
                      normalizedPeriodStart.setHours(0, 0, 0, 0)
                      const normalizedPeriodEnd = new Date(effectivePeriodEnd)
                      normalizedPeriodEnd.setHours(23, 59, 59, 999)
                      return date >= normalizedPeriodStart && date <= normalizedPeriodEnd
                    } catch {
                      return false
                    }
                  })
                  
                  // Get Virtual Material Percentage from project
                  let virtualMaterialPercentage = 0
                  const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
                  
                  if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
                    let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
        const parsedValue = parseFloat(cleanedValue)
        if (!isNaN(parsedValue)) {
          if (parsedValue > 0 && parsedValue <= 1) {
            virtualMaterialPercentage = parsedValue * 100
          } else {
            virtualMaterialPercentage = parsedValue
          }
        }
      }
      
                  if (virtualMaterialPercentage === 0) return
                  
                  // Calculate Planned Virtual Material Amount for this activity in this period
                  plannedKPIs.forEach((kpi: any) => {
                    const rawKpi = (kpi as any).raw || {}
                    const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                    
                    const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                    const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                    
                    let rate = 0
                    if (totalUnits > 0 && totalValue > 0) {
                      rate = totalValue / totalUnits
                    } else {
                      rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                    }
                    
                    let baseValue = 0
                    if (rate > 0 && quantity > 0) {
                      baseValue = rate * quantity
                    } else {
                      const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
                      if (kpiValue > 0) {
                        baseValue = kpiValue
                      }
                    }
                    
                    if (baseValue > 0) {
                      sum += baseValue * (virtualMaterialPercentage / 100)
                    }
                  })
                })
              })
            } else {
              // ✅ Project is NOT expanded: use cached value
              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
              const plannedVirtualMaterialAmounts = cachedValues?.plannedVirtualMaterialAmount || []
              sum += plannedVirtualMaterialAmounts.reduce((s, val) => s + val, 0)
            }
          })
      
      return sum
        })()
      : 0
    
    return { 
      totalContractValue, 
      totalEarnedValue,
      totalPlannedValue: grandTotalPlannedValue,
      periodEarnedValueTotals, 
      periodPlannedValueTotals,
      grandTotalEarnedValue,
      grandTotalPlannedValue,
      totalVirtualMaterialAmount,
      totalPlannedVirtualMaterialAmount
    }
  }, [filteredProjects, periods, allAnalytics, projectsWithWorkInRange, showVirtualMaterialValues, viewPlannedValue, expandedProjects, activities, kpis, today, getCachedPeriodValues, debouncedSelectedDivisions])

  // Export to Excel function with advanced formatting
  const handleExportPeriodRevenue = useCallback(async () => {
    // ✅ FIX: Filter projects based on hideZeroProjects setting
    let projectsToExport = projectsWithWorkInRange
    if (hideZeroProjects) {
      projectsToExport = projectsWithWorkInRange.filter((analytics: any) => {
        const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
        const periodValues = cachedValues?.earned || []
        const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
        return grandTotal > 0
      })
    }
    
    if (projectsToExport.length === 0) {
      alert('No data to export')
      return
    }

    try {
      // Dynamically import xlsx-js-style for advanced formatting
      const XLSX = await import('xlsx-js-style')
      
      // Prepare data for Excel export
      const exportData: any[] = []

      // Build header row array for manual header setting (to avoid double headers)
      // ✅ FIX: Apply column visibility settings
      const headerValues: string[] = [
        'Project Full Name'
      ]
      
      // Add Scope column only if not hidden
      if (!hideDivisionsColumn) {
        headerValues.push('Scope')
      }
      
      headerValues.push('Workmanship?')
      
      // Add Total Contract Amount column only if not hidden
      if (!hideTotalContractColumn) {
        headerValues.push('Total Contract Amount')
      }
      
      headerValues.push('Division Contract Amount')
      
      // Add Virtual Material column only if not hidden
      if (!hideVirtualMaterialColumn) {
        headerValues.push('Virtual Material')
      }
      
      // ✅ Add Outer Range column(s) if enabled
      if (showOuterRangeColumn && outerRangeStart) {
        const outerRangeEndDate = dateRange.start || (periods.length > 0 ? periods[0].start.toISOString().split('T')[0] : null)
        const outerRangeLabel = outerRangeEndDate 
          ? `Outer Range (${new Date(outerRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(outerRangeEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          : 'Outer Range (Before Period)'
        if (viewPlannedValue) {
          headerValues.push(`${outerRangeLabel} - Actual`)
          headerValues.push(`${outerRangeLabel} - Planned`)
        } else {
          headerValues.push(outerRangeLabel)
        }
      }
      
      // Add period columns (Actual and Planned if viewPlannedValue is enabled)
      const periodHeaders: string[] = []
      periods.forEach((period, index) => {
        const periodLabel = period.label || `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} ${index + 1} (${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
        periodHeaders.push(periodLabel)
        if (viewPlannedValue) {
          headerValues.push(`${periodLabel} - Actual`)
          headerValues.push(`${periodLabel} - Planned`)
        } else {
          headerValues.push(periodLabel)
        }
      })
      
      // Add Grand Total column(s)
      if (viewPlannedValue) {
        headerValues.push('Grand Total - Actual')
        headerValues.push('Grand Total - Planned')
      } else {
        headerValues.push('Grand Total')
      }
      
      // Build header keys object for data rows (to match column order)
      // ✅ FIX: Apply column visibility settings
      const headerKeys: string[] = [
        'Project Full Name'
      ]
      
      // Add Scope column only if not hidden
      if (!hideDivisionsColumn) {
        headerKeys.push('Scope')
      }
      
      headerKeys.push('Workmanship?')
      
      // Add Total Contract Amount column only if not hidden
      if (!hideTotalContractColumn) {
        headerKeys.push('Total Contract Amount')
      }
      
      headerKeys.push('Division Contract Amount')
      
      // Add Virtual Material column only if not hidden
      if (!hideVirtualMaterialColumn) {
        headerKeys.push('Virtual Material')
      }
      if (showOuterRangeColumn && outerRangeStart) {
        if (viewPlannedValue) {
          headerKeys.push('Outer Range - Actual')
          headerKeys.push('Outer Range - Planned')
        } else {
          headerKeys.push('Outer Range')
        }
      }
      periodHeaders.forEach(periodLabel => {
        if (viewPlannedValue) {
          headerKeys.push(`${periodLabel} - Actual`)
          headerKeys.push(`${periodLabel} - Planned`)
        } else {
          headerKeys.push(periodLabel)
        }
      })
      if (viewPlannedValue) {
        headerKeys.push('Grand Total - Actual')
        headerKeys.push('Grand Total - Planned')
      } else {
        headerKeys.push('Grand Total')
      }

      // Add data rows - use filtered projects based on hideZeroProjects
      projectsToExport.forEach((analytics: any) => {
        const project = analytics.project
        
        // Calculate Total Contract Amount
        const contractAmt = analytics.totalContractValue || 
                          parseFloat(String(project.contract_amount || '0').replace(/,/g, '')) || 0
        const variationsAmt = parseFloat(String(
          (project as any).raw?.['Variations Amount'] || 
          (project as any).raw?.['Variations'] || 
          '0'
        ).replace(/,/g, '')) || 0
        const totalContractAmount = contractAmt + variationsAmt
        
        // Get Division Contract Amount data - using unique key for exact matching
        const projectFullCodeUpper = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
        const projectName = (project.project_name || '').toString().trim()
        const uniqueKey = `${projectFullCodeUpper}|${projectName}`
        const divisionsData = divisionsDataMap.get(uniqueKey)
        const divisionAmounts = divisionsData?.divisionAmounts || {}
        const divisionNames = divisionsData?.divisionNames || {}
        
        // Build divisions list
        let divisionsList = Object.keys(divisionAmounts)
          .map(key => ({
            key: key.toLowerCase().trim(),
            name: divisionNames[key] || key,
            amount: divisionAmounts[key] || 0
          }))
          .sort((a, b) => b.amount - a.amount)
        
        // ✅ FIX: Filter divisions by selected divisions if filter is applied
        if (selectedDivisions.length > 0) {
          divisionsList = divisionsList.filter(div => {
            const normalizedDivName = div.name.trim().toLowerCase()
            return selectedDivisions.some(selectedDiv => 
              selectedDiv.trim().toLowerCase() === normalizedDivName
            )
          })
        }
        
        const divisionContractAmount = divisionsList.reduce((sum, div) => sum + div.amount, 0)
        const divisionsText = divisionsList.length > 0 
          ? divisionsList.map(d => `${d.name}: ${formatCurrency(d.amount, project.currency)}`).join('; ')
          : (project.responsible_division || 'N/A')
        
        // Get Workmanship
        const workmanship = project.workmanship_only || 
                          (project as any).raw?.['Workmanship only?'] || 
                          (project as any).raw?.['Workmanship?'] || 
                          'No'
        const isWorkmanship = workmanship === 'Yes' || workmanship === 'TRUE' || workmanship === true
        
        // ✅ PERFORMANCE: Get period values from cache
        const cachedValues = getCachedPeriodValues(project.id, analytics)
        const periodValues = cachedValues?.earned || []
        const periodPlannedValues = viewPlannedValue ? (cachedValues?.planned || []) : []
        const virtualMaterialAmounts = showVirtualMaterialValues ? (cachedValues?.virtualMaterialAmount || []) : []
        const plannedVirtualMaterialAmounts = showVirtualMaterialValues && viewPlannedValue ? (cachedValues?.plannedVirtualMaterialAmount || []) : []
        
        // ✅ FIX: Calculate Grand Total with Virtual Material if showVirtualMaterialValues is enabled
        let grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
        if (showVirtualMaterialValues) {
          const totalVirtualMaterial = virtualMaterialAmounts.reduce((sum: number, val: number) => sum + val, 0)
          grandTotal = grandTotal + totalVirtualMaterial
        }
        
        let grandTotalPlanned = viewPlannedValue ? periodPlannedValues.reduce((sum: number, val: number) => sum + val, 0) : 0
        if (showVirtualMaterialValues && viewPlannedValue) {
          const totalPlannedVirtualMaterial = plannedVirtualMaterialAmounts.reduce((sum: number, val: number) => sum + val, 0)
          grandTotalPlanned = grandTotalPlanned + totalPlannedVirtualMaterial
        }
        
        // Get project full code for display (without uppercase)
        const projectFullCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
        const projectDisplayName = `${projectFullCode} - ${project.project_name}`
        
        // Calculate Virtual Material (for Virtual Material column if not hidden)
        let virtualMaterialPercentage = 0
        const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
        
        if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
          let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
          const parsedValue = parseFloat(cleanedValue)
          if (!isNaN(parsedValue)) {
            if (parsedValue > 0 && parsedValue <= 1) {
              virtualMaterialPercentage = parsedValue * 100
            } else {
              virtualMaterialPercentage = parsedValue
            }
          }
        }
        
        const virtualMaterialAmount = grandTotal > 0 && virtualMaterialPercentage > 0
          ? grandTotal * (virtualMaterialPercentage / 100)
          : 0
        
        // Create row object using headerKeys to maintain column order
        const row: any = {}
        row['Project Full Name'] = projectDisplayName
        
        // Add Scope column only if not hidden
        if (!hideDivisionsColumn) {
          row['Scope'] = divisionsText
        }
        
        row['Workmanship?'] = isWorkmanship ? 'Yes' : 'No'
        
        // Add Total Contract Amount column only if not hidden
        if (!hideTotalContractColumn) {
          row['Total Contract Amount'] = totalContractAmount
        }
        
        row['Division Contract Amount'] = divisionContractAmount
        
        // Add Virtual Material column only if not hidden
        if (!hideVirtualMaterialColumn) {
          row['Virtual Material'] = virtualMaterialAmount
        }
        
        // ✅ Add Outer Range value(s) if enabled
        if (showOuterRangeColumn && outerRangeStart) {
          const outerRangeValue = cachedValues?.outerRangeValue || 0
          const outerRangePlannedValue = viewPlannedValue ? (cachedValues?.outerRangePlannedValue || 0) : 0
          if (viewPlannedValue) {
            row['Outer Range - Actual'] = outerRangeValue
            row['Outer Range - Planned'] = outerRangePlannedValue
          } else {
            row['Outer Range'] = outerRangeValue
          }
        }
        
        // Add period values (Actual and Planned if enabled)
        // ✅ FIX: Add Virtual Material values if showVirtualMaterialValues is enabled
        periodHeaders.forEach((periodLabel, index) => {
          if (viewPlannedValue) {
            let actualValue = periodValues[index] || 0
            let plannedValue = periodPlannedValues[index] || 0
            
            // Add Virtual Material values if enabled
            if (showVirtualMaterialValues) {
              actualValue += (virtualMaterialAmounts[index] || 0)
              plannedValue += (plannedVirtualMaterialAmounts[index] || 0)
            }
            
            row[`${periodLabel} - Actual`] = actualValue
            row[`${periodLabel} - Planned`] = plannedValue
          } else {
            let actualValue = periodValues[index] || 0
            
            // Add Virtual Material values if enabled
            if (showVirtualMaterialValues) {
              actualValue += (virtualMaterialAmounts[index] || 0)
            }
            
            row[periodLabel] = actualValue
          }
        })
        
        // Add Grand Total
        if (viewPlannedValue) {
          row['Grand Total - Actual'] = grandTotal
          row['Grand Total - Planned'] = grandTotalPlanned
        } else {
          row['Grand Total'] = grandTotal
        }
        exportData.push(row)
      })

      // ✅ FIX: Add totals row with correct values from totals object
      const totalsRow: any = {}
      totalsRow['Project Full Name'] = 'GRAND TOTAL'
      
      // Add Scope column only if not hidden
      if (!hideDivisionsColumn) {
        totalsRow['Scope'] = ''
      }
      
      totalsRow['Workmanship?'] = ''
      
      // Add Total Contract Amount column only if not hidden
      if (!hideTotalContractColumn) {
        totalsRow['Total Contract Amount'] = totals.totalContractValue
      }
      
      totalsRow['Division Contract Amount'] = 0 // Will be replaced with formula
      
      // Add Virtual Material column only if not hidden
      if (!hideVirtualMaterialColumn) {
        totalsRow['Virtual Material'] = totals.totalVirtualMaterialAmount
      }
      
      // ✅ Add Outer Range total(s) if enabled
      if (showOuterRangeColumn && outerRangeStart) {
        const totalOuterRangeValue = projectsToExport.reduce((sum: number, analytics: any) => {
          const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
          let outerRangeValue = cachedValues?.outerRangeValue || 0
          // Add Virtual Material if enabled
          if (showVirtualMaterialValues) {
            outerRangeValue += (cachedValues?.outerRangeVirtualMaterialAmount || 0)
          }
          return sum + outerRangeValue
        }, 0)
        const totalOuterRangePlannedValue = viewPlannedValue ? projectsToExport.reduce((sum: number, analytics: any) => {
          const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
          let outerRangePlannedValue = cachedValues?.outerRangePlannedValue || 0
          // Add Virtual Material if enabled
          if (showVirtualMaterialValues) {
            outerRangePlannedValue += (cachedValues?.outerRangePlannedVirtualMaterialAmount || 0)
          }
          return sum + outerRangePlannedValue
        }, 0) : 0
        if (viewPlannedValue) {
          totalsRow['Outer Range - Actual'] = totalOuterRangeValue // Will be replaced with formula
          totalsRow['Outer Range - Planned'] = totalOuterRangePlannedValue // Will be replaced with formula
        } else {
          totalsRow['Outer Range'] = totalOuterRangeValue // Will be replaced with formula
        }
      }
      
      // ✅ FIX: Use period totals from totals object (Actual and Planned if enabled)
      // ✅ FIX: Add Virtual Material values if showVirtualMaterialValues is enabled
      periodHeaders.forEach((periodLabel, index) => {
        if (viewPlannedValue) {
          let actualTotal = totals.periodEarnedValueTotals[index] || 0
          let plannedTotal = totals.periodPlannedValueTotals?.[index] || 0
          
          // Add Virtual Material totals if enabled
          if (showVirtualMaterialValues) {
            const periodVirtualMaterialTotal = projectsToExport.reduce((sum: number, analytics: any) => {
              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
              return sum + (cachedValues?.virtualMaterialAmount?.[index] || 0)
            }, 0)
            const periodPlannedVirtualMaterialTotal = projectsToExport.reduce((sum: number, analytics: any) => {
              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
              return sum + (cachedValues?.plannedVirtualMaterialAmount?.[index] || 0)
            }, 0)
            actualTotal += periodVirtualMaterialTotal
            plannedTotal += periodPlannedVirtualMaterialTotal
          }
          
          totalsRow[`${periodLabel} - Actual`] = actualTotal
          totalsRow[`${periodLabel} - Planned`] = plannedTotal
        } else {
          let actualTotal = totals.periodEarnedValueTotals[index] || 0
          
          // Add Virtual Material totals if enabled
          if (showVirtualMaterialValues) {
            const periodVirtualMaterialTotal = projectsToExport.reduce((sum: number, analytics: any) => {
              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
              return sum + (cachedValues?.virtualMaterialAmount?.[index] || 0)
            }, 0)
            actualTotal += periodVirtualMaterialTotal
          }
          
          totalsRow[periodLabel] = actualTotal
        }
      })
      
      // Add Grand Total(s) - with Virtual Material if enabled
      if (viewPlannedValue) {
        let grandTotalActual = totals.grandTotalEarnedValue
        let grandTotalPlanned = totals.grandTotalPlannedValue || 0
        
        // Add Virtual Material totals if enabled
        if (showVirtualMaterialValues) {
          const totalVirtualMaterial = projectsToExport.reduce((sum: number, analytics: any) => {
            const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
            const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
            return sum + virtualMaterialAmounts.reduce((s: number, v: number) => s + v, 0)
          }, 0)
          const totalPlannedVirtualMaterial = projectsToExport.reduce((sum: number, analytics: any) => {
            const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
            const plannedVirtualMaterialAmounts = cachedValues?.plannedVirtualMaterialAmount || []
            return sum + plannedVirtualMaterialAmounts.reduce((s: number, v: number) => s + v, 0)
          }, 0)
          grandTotalActual += totalVirtualMaterial
          grandTotalPlanned += totalPlannedVirtualMaterial
        }
        
        totalsRow['Grand Total - Actual'] = grandTotalActual
        totalsRow['Grand Total - Planned'] = grandTotalPlanned
      } else {
        let grandTotalActual = totals.grandTotalEarnedValue
        
        // Add Virtual Material totals if enabled
        if (showVirtualMaterialValues) {
          const totalVirtualMaterial = projectsToExport.reduce((sum: number, analytics: any) => {
            const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
            const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
            return sum + virtualMaterialAmounts.reduce((s: number, v: number) => s + v, 0)
          }, 0)
          grandTotalActual += totalVirtualMaterial
        }
        
        totalsRow['Grand Total'] = grandTotalActual
      }
      exportData.push(totalsRow)

      // Create worksheet from data only (no header row in data)
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // ✅ FIX: Manually set header row to avoid double headers
      // Replace the auto-generated header row (row 0) with our custom headers
      headerValues.forEach((headerValue, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex })
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: headerValue }
        } else {
          ws[cellAddress].v = headerValue
          ws[cellAddress].t = 's'
        }
      })
      
      // Calculate row numbers (0-based: row 0 is header, row 1+ are data rows)
      const dataStartRow = 1 // Row 1 is first data row (after header row 0)
      const dataEndRow = dataStartRow + projectsToExport.length - 1
      const totalsRowNum = dataEndRow + 1
      
      // Excel uses 1-based row numbers in formulas, so add 1 to 0-based row numbers
      const excelDataStartRow = dataStartRow + 1
      const excelDataEndRow = dataEndRow + 1
      const excelTotalsRowNum = totalsRowNum + 1
      
      // Get column letters (A, B, ..., Z, AA, AB, ...)
      const getColumnLetter = (colIndex: number): string => {
        let result = ''
        let num = colIndex
        while (num >= 0) {
          result = String.fromCharCode(65 + (num % 26)) + result
          num = Math.floor(num / 26) - 1
        }
        return result
      }
      
      // Alternative: Use XLSX utility if available
      const getColLetter = (colIndex: number): string => {
        try {
          return XLSX.utils.encode_col(colIndex)
        } catch {
          return getColumnLetter(colIndex)
        }
      }
      
      // ✅ FIX: Calculate column indices dynamically based on visible columns
      let currentColIndex = 0
      const colIndices: { [key: string]: number } = {}
      
      // Project Full Name (always visible)
      colIndices['Project Full Name'] = currentColIndex++
      
      // Scope (conditional)
      if (!hideDivisionsColumn) {
        colIndices['Scope'] = currentColIndex++
      }
      
      // Workmanship? (always visible)
      colIndices['Workmanship?'] = currentColIndex++
      
      // Total Contract Amount (conditional)
      if (!hideTotalContractColumn) {
        colIndices['Total Contract Amount'] = currentColIndex++
      }
      
      // Division Contract Amount (always visible)
      colIndices['Division Contract Amount'] = currentColIndex++
      
      // Virtual Material (conditional)
      if (!hideVirtualMaterialColumn) {
        colIndices['Virtual Material'] = currentColIndex++
      }
      
      // ✅ FIX: Add formulas to totals row (formulas ensure Excel calculates correctly)
      // Total Contract Amount - only if visible
      if (!hideTotalContractColumn && colIndices['Total Contract Amount'] !== undefined) {
        const totalContractCol = getColLetter(colIndices['Total Contract Amount'])
        const totalContractCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: colIndices['Total Contract Amount'] })
        if (ws[totalContractCell]) {
          ws[totalContractCell] = {
            ...ws[totalContractCell],
            v: totals.totalContractValue,
            f: `SUM(${totalContractCol}${excelDataStartRow}:${totalContractCol}${excelDataEndRow})`,
            t: 'n'
          }
        }
      }
      
      // Division Contract Amount
      if (colIndices['Division Contract Amount'] !== undefined) {
        const divisionContractCol = getColLetter(colIndices['Division Contract Amount'])
        const divisionContractCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: colIndices['Division Contract Amount'] })
        if (ws[divisionContractCell]) {
          ws[divisionContractCell] = {
            ...ws[divisionContractCell],
            f: `SUM(${divisionContractCol}${excelDataStartRow}:${divisionContractCol}${excelDataEndRow})`,
            t: 'n'
          }
        }
      }
      
      // Virtual Material - only if visible
      if (!hideVirtualMaterialColumn && colIndices['Virtual Material'] !== undefined) {
        const virtualMaterialCol = getColLetter(colIndices['Virtual Material'])
        const virtualMaterialCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: colIndices['Virtual Material'] })
        if (ws[virtualMaterialCell]) {
          ws[virtualMaterialCell] = {
            ...ws[virtualMaterialCell],
            v: totals.totalVirtualMaterialAmount,
            f: `SUM(${virtualMaterialCol}${excelDataStartRow}:${virtualMaterialCol}${excelDataEndRow})`,
            t: 'n'
          }
        }
      }
      
      // ✅ Column: Outer Range - if enabled
      let periodStartCol = currentColIndex // Start after all base columns
      if (showOuterRangeColumn && outerRangeStart) {
        if (viewPlannedValue) {
          // Outer Range - Actual
          const outerRangeActualColIndex = currentColIndex
          const outerRangeActualCol = getColLetter(outerRangeActualColIndex)
          const outerRangeActualCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: outerRangeActualColIndex })
          if (ws[outerRangeActualCell]) {
            ws[outerRangeActualCell] = {
              ...ws[outerRangeActualCell],
              f: `SUM(${outerRangeActualCol}${excelDataStartRow}:${outerRangeActualCol}${excelDataEndRow})`,
              t: 'n'
            }
          }
          // Outer Range - Planned
          const outerRangePlannedColIndex = currentColIndex + 1
          const outerRangePlannedCol = getColLetter(outerRangePlannedColIndex)
          const outerRangePlannedCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: outerRangePlannedColIndex })
          if (ws[outerRangePlannedCell]) {
            ws[outerRangePlannedCell] = {
              ...ws[outerRangePlannedCell],
              v: totals.periodPlannedValueTotals ? (totalsRow['Outer Range - Planned'] || 0) : 0,
              f: `SUM(${outerRangePlannedCol}${excelDataStartRow}:${outerRangePlannedCol}${excelDataEndRow})`,
              t: 'n'
            }
          }
          periodStartCol = currentColIndex + 2 // Period columns start after Outer Range columns
        } else {
          const outerRangeColIndex = currentColIndex
          const outerRangeCol = getColLetter(outerRangeColIndex)
          const outerRangeCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: outerRangeColIndex })
          if (ws[outerRangeCell]) {
            ws[outerRangeCell] = {
              ...ws[outerRangeCell],
              f: `SUM(${outerRangeCol}${excelDataStartRow}:${outerRangeCol}${excelDataEndRow})`,
              t: 'n'
            }
          }
          periodStartCol = currentColIndex + 1 // Period columns start after Outer Range column
        }
      }
      
      // ✅ FIX: Period columns (Actual and Planned if enabled)
      periodHeaders.forEach((_, periodIndex) => {
        if (viewPlannedValue) {
          // Actual column
          const actualColIndex = periodStartCol + (periodIndex * 2)
          const actualCol = getColLetter(actualColIndex)
          const actualCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: actualColIndex })
          if (ws[actualCell]) {
            ws[actualCell] = {
              ...ws[actualCell],
              v: totals.periodEarnedValueTotals[periodIndex] || 0,
              f: `SUM(${actualCol}${excelDataStartRow}:${actualCol}${excelDataEndRow})`,
              t: 'n'
            }
          }
          // Planned column
          const plannedColIndex = periodStartCol + (periodIndex * 2) + 1
          const plannedCol = getColLetter(plannedColIndex)
          const plannedCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: plannedColIndex })
          if (ws[plannedCell]) {
            ws[plannedCell] = {
              ...ws[plannedCell],
              v: totals.periodPlannedValueTotals?.[periodIndex] || 0,
              f: `SUM(${plannedCol}${excelDataStartRow}:${plannedCol}${excelDataEndRow})`,
              t: 'n'
            }
          }
        } else {
          const colIndex = periodStartCol + periodIndex
          const periodCol = getColLetter(colIndex)
          const periodCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: colIndex })
          if (ws[periodCell]) {
            ws[periodCell] = {
              ...ws[periodCell],
              v: totals.periodEarnedValueTotals[periodIndex] || 0,
              f: `SUM(${periodCol}${excelDataStartRow}:${periodCol}${excelDataEndRow})`,
              t: 'n'
            }
          }
        }
      })
      
      // ✅ FIX: Grand Total column(s) - Use actual value from totals
      if (viewPlannedValue) {
        // Grand Total - Actual
        const grandTotalActualColIndex = periodStartCol + (periodHeaders.length * 2)
        const grandTotalActualCol = getColLetter(grandTotalActualColIndex)
        const grandTotalActualCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: grandTotalActualColIndex })
        if (ws[grandTotalActualCell]) {
          ws[grandTotalActualCell] = {
            ...ws[grandTotalActualCell],
            v: totals.grandTotalEarnedValue,
            f: `SUM(${grandTotalActualCol}${excelDataStartRow}:${grandTotalActualCol}${excelDataEndRow})`,
            t: 'n'
          }
        }
        // Grand Total - Planned
        const grandTotalPlannedColIndex = periodStartCol + (periodHeaders.length * 2) + 1
        const grandTotalPlannedCol = getColLetter(grandTotalPlannedColIndex)
        const grandTotalPlannedCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: grandTotalPlannedColIndex })
        if (ws[grandTotalPlannedCell]) {
          ws[grandTotalPlannedCell] = {
            ...ws[grandTotalPlannedCell],
            v: totals.grandTotalPlannedValue || 0,
            f: `SUM(${grandTotalPlannedCol}${excelDataStartRow}:${grandTotalPlannedCol}${excelDataEndRow})`,
            t: 'n'
          }
        }
        
        // Also add formulas for Grand Total in each data row (Actual and Planned)
        projectsToExport.forEach((_: any, projectIndex: number) => {
          const rowNum = dataStartRow + projectIndex
          const excelRowNum = rowNum + 1 // Convert to 1-based for Excel formula
          
          // Grand Total - Actual
          const grandTotalActualCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: grandTotalActualColIndex })
          if (ws[grandTotalActualCellAddr]) {
            const firstPeriodCol = getColLetter(periodStartCol)
            const lastPeriodActualCol = getColLetter(periodStartCol + (periodHeaders.length * 2) - 2)
            ws[grandTotalActualCellAddr] = {
              ...ws[grandTotalActualCellAddr],
              f: `SUM(${firstPeriodCol}${excelRowNum}:${lastPeriodActualCol}${excelRowNum})`,
              t: 'n'
            }
          }
          
          // Grand Total - Planned
          const grandTotalPlannedCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: grandTotalPlannedColIndex })
          if (ws[grandTotalPlannedCellAddr]) {
            const firstPeriodPlannedCol = getColLetter(periodStartCol + 1)
            const lastPeriodPlannedCol = getColLetter(periodStartCol + (periodHeaders.length * 2) - 1)
            ws[grandTotalPlannedCellAddr] = {
              ...ws[grandTotalPlannedCellAddr],
              f: `SUM(${firstPeriodPlannedCol}${excelRowNum}:${lastPeriodPlannedCol}${excelRowNum})`,
              t: 'n'
            }
          }
        })
      } else {
        const grandTotalColIndex = periodStartCol + periodHeaders.length
        const grandTotalCol = getColLetter(grandTotalColIndex)
        const grandTotalCell = XLSX.utils.encode_cell({ r: totalsRowNum, c: grandTotalColIndex })
        if (ws[grandTotalCell]) {
          ws[grandTotalCell] = {
            ...ws[grandTotalCell],
            v: totals.grandTotalEarnedValue,
            f: `SUM(${grandTotalCol}${excelDataStartRow}:${grandTotalCol}${excelDataEndRow})`,
            t: 'n'
          }
        }
        
        // Also add formulas for Grand Total in each data row
        projectsToExport.forEach((_: any, projectIndex: number) => {
          const rowNum = dataStartRow + projectIndex
          const excelRowNum = rowNum + 1 // Convert to 1-based for Excel formula
          const grandTotalCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: grandTotalColIndex })
          
          if (ws[grandTotalCellAddr]) {
            const firstPeriodCol = getColLetter(periodStartCol)
            const lastPeriodCol = getColLetter(periodStartCol + periodHeaders.length - 1)
            ws[grandTotalCellAddr] = {
              ...ws[grandTotalCellAddr],
              f: `SUM(${firstPeriodCol}${excelRowNum}:${lastPeriodCol}${excelRowNum})`,
              t: 'n'
            }
          }
        })
      }
      
      // ✅ FIX: Define column widths (including Planned columns if enabled, respecting hidden columns)
      const colWidths: Array<{ wch: number }> = [
        { wch: 35 }, // Project Full Name (always visible)
      ]
      
      // Add Scope column width only if not hidden
      if (!hideDivisionsColumn) {
        colWidths.push({ wch: 30 })
      }
      
      colWidths.push({ wch: 12 }) // Workmanship? (always visible)
      
      // Add Total Contract Amount column width only if not hidden
      if (!hideTotalContractColumn) {
        colWidths.push({ wch: 20 })
      }
      
      colWidths.push({ wch: 25 }) // Division Contract Amount (always visible)
      
      // Add Virtual Material column width only if not hidden
      if (!hideVirtualMaterialColumn) {
        colWidths.push({ wch: 20 })
      }
      
      // Outer Range column(s)
      if (showOuterRangeColumn && outerRangeStart) {
        if (viewPlannedValue) {
          colWidths.push({ wch: 20 }, { wch: 20 })
        } else {
          colWidths.push({ wch: 20 })
        }
      }
      
      // Period columns
      if (viewPlannedValue) {
        periodHeaders.forEach(() => {
          colWidths.push({ wch: 18 }, { wch: 18 })
        })
      } else {
        periodHeaders.forEach(() => {
          colWidths.push({ wch: 18 })
        })
      }
      
      // Grand Total column(s)
      if (viewPlannedValue) {
        colWidths.push({ wch: 18 }, { wch: 18 })
      } else {
        colWidths.push({ wch: 18 })
      }
      
      ws['!cols'] = colWidths
      
      // ✅ FIX: Freeze first row and first 3 columns for better navigation
      ws['!freeze'] = { xSplit: 3, ySplit: 1, topLeftCell: 'D2', activePane: 'bottomRight', state: 'frozen' }
      
      // ✅ FIX: Define styles with improved appearance
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 }, // ✅ Increased font size
        fill: { fgColor: { rgb: '4472C4' } }, // Blue background
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } }, // ✅ Medium border for better visibility
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'FFFFFF' } }, // ✅ White border for better contrast
          right: { style: 'thin', color: { rgb: 'FFFFFF' } }
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
        font: { bold: true, sz: 12, color: { rgb: '000000' } }, // ✅ Increased font size and black color
        fill: { fgColor: { rgb: 'D9E1F2' } }, // Light blue background
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '#,##0.00', // ✅ Currency format with 2 decimal places
        border: {
          top: { style: 'thick', color: { rgb: '000000' } }, // ✅ Thick border for totals row
          bottom: { style: 'thick', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } }, // ✅ Black border for better visibility
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      const totalsTextStyle = {
        font: { bold: true, sz: 12, color: { rgb: '000000' } }, // ✅ Increased font size and black color
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thick', color: { rgb: '000000' } }, // ✅ Thick border for totals row
          bottom: { style: 'thick', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } }, // ✅ Black border for better visibility
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      // Apply styles to cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
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
          // ✅ FIX: Determine if column is numeric based on header name (respects hidden columns)
          const headerName = headerValues[colIndex] || ''
          const isNumberColumn = 
            headerName === 'Total Contract Amount' ||
            headerName === 'Division Contract Amount' ||
            headerName === 'Virtual Material' ||
            headerName.includes('Outer Range') ||
            headerName.includes('Actual') ||
            headerName.includes('Planned') ||
            headerName === 'Grand Total' ||
            headerName === 'Grand Total - Actual' ||
            headerName === 'Grand Total - Planned' ||
            (periodHeaders.some(periodLabel => 
              headerName === periodLabel || 
              headerName === `${periodLabel} - Actual` || 
              headerName === `${periodLabel} - Planned`
            ))
          
          if (isTotalsRow) {
            if (colIndex === 0) {
              ws[cellAddress].s = totalsTextStyle
            } else if (isNumberColumn) {
              ws[cellAddress].s = totalsStyle
            } else {
              ws[cellAddress].s = totalsTextStyle
            }
          } else {
            // Alternate row colors
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
      
      // ✅ FIX: Create workbook with dynamic sheet name based on period type
      const wb = XLSX.utils.book_new()
      const periodTypeLabel = periodType === 'daily' ? 'Daily' : 
                             periodType === 'weekly' ? 'Weekly' : 
                             periodType === 'month' ? 'Monthly' : 
                             periodType === 'quarterly' ? 'Quarterly' : 
                             periodType === 'yearly' ? 'Yearly' : 'Period'
      const sheetName = `${periodTypeLabel} Work Revenue`
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      
      // ✅ FIX: Generate filename with period type and date range
      const dateStr = dateRange.start && dateRange.end
        ? `${dateRange.start}_to_${dateRange.end}`
        : new Date().toISOString().split('T')[0]
      const filename = `${periodTypeLabel}_Work_Revenue_${dateStr}.xlsx`
      
      // Write file
      XLSX.writeFile(wb, filename)
      
      console.log(`✅ Downloaded formatted Excel: ${filename}`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export data. Please try again.')
    }
  }, [projectsWithWorkInRange, periods, totals, divisionsDataMap, dateRange, formatCurrency, periodType, showOuterRangeColumn, outerRangeStart, getCachedPeriodValues, selectedDivisions, viewPlannedValue, hideZeroProjects, hideDivisionsColumn, hideTotalContractColumn, hideVirtualMaterialColumn, showVirtualMaterialValues])

  // ✅ Calculate chart data using useMemo (moved from IIFE in JSX)
  const chartData = useMemo(() => {
    if (periods.length === 0) return []
    
    // Calculate period Virtual Material Amount totals for chart (Actual)
    const periodVirtualMaterialAmountTotals = useVirtualValueInChart
      ? periods.map((_, periodIndex) => {
          let sum = 0
          allAnalytics.forEach((analytics: any) => {
            const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
            const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
            sum += virtualMaterialAmounts[periodIndex] || 0
          })
          // ✅ PERFORMANCE: Sum from expanded activities using projectActivitiesMap
          allAnalytics.forEach((analytics: any) => {
            if (!expandedProjects.has(analytics.project.id)) return
            
            const project = analytics.project
            const projectId = project.id
            // ✅ PERFORMANCE: Use pre-computed map instead of filtering activities repeatedly
            const projectActivities = projectActivitiesMap.get(projectId) || []
            
            projectActivities.forEach((activity: BOQActivity) => {
              if (!activity.use_virtual_material) return
              
              const rawActivity = (activity as any).raw || {}
              const period = periods[periodIndex]
              const periodStart = period.start
              const periodEnd = period.end
              const effectivePeriodEnd = periodEnd > today ? today : periodEnd
              
              // Get Virtual Material Percentage from project
              let virtualMaterialPercentage = 0
              const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
              
              if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
                let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
                const parsedValue = parseFloat(cleanedValue)
                if (!isNaN(parsedValue)) {
                  if (parsedValue > 0 && parsedValue <= 1) {
                    virtualMaterialPercentage = parsedValue * 100
                  } else {
                    virtualMaterialPercentage = parsedValue
                  }
                }
              }
              
              if (virtualMaterialPercentage === 0) return
              
              // ✅ PERFORMANCE: Pre-filter KPIs by date range once per period, then match activities
              // This reduces the number of kpiMatchesActivity calls
              const periodStartTime = periodStart.getTime()
              const periodEndTime = effectivePeriodEnd.getTime()
              
              // Get Actual KPIs for this activity in this period
              const actualKPIs = kpis.filter((kpi: any) => {
                const rawKPI = (kpi as any).raw || {}
                const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                if (inputType !== 'actual') return false
                
                const rawKPIDate = (kpi as any).raw || {}
                const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
                const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
                const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
                
                let kpiDateStr = ''
                if (kpi.input_type === 'Actual' && actualDateValue) {
                  kpiDateStr = actualDateValue
                } else if (dayValue) {
                  kpiDateStr = activityDateValue || dayValue
                } else {
                  kpiDateStr = activityDateValue || actualDateValue
                }
                
                if (!kpiDateStr) return false
                
                try {
                  const kpiDate = new Date(kpiDateStr)
                  if (isNaN(kpiDate.getTime())) return false
                  kpiDate.setHours(0, 0, 0, 0)
                  const kpiDateTime = kpiDate.getTime()
                  // ✅ PERFORMANCE: Use numeric comparison instead of Date objects
                  if (kpiDateTime < periodStartTime || kpiDateTime > periodEndTime) {
                    return false
                  }
                } catch {
                  return false
                }
                
                // Match activity using kpiMatchesActivity helper
                return kpiMatchesActivity(kpi, activity)
              })
              
              // Calculate Virtual Material Amount for this activity in this period
              actualKPIs.forEach((kpi: any) => {
                const rawKpi = (kpi as any).raw || {}
                const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                
                const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                
                let rate = 0
                if (totalUnits > 0 && totalValue > 0) {
                  rate = totalValue / totalUnits
                } else {
                  rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                }
                
                let baseValue = 0
                if (rate > 0 && quantity > 0) {
                  baseValue = rate * quantity
                } else {
                  const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
                  if (kpiValue > 0) {
                    baseValue = kpiValue
                  }
                }
                
                if (baseValue > 0) {
                  sum += baseValue * (virtualMaterialPercentage / 100)
                }
              })
            })
          })
          return sum
        })
      : periods.map(() => 0)
    
    // Calculate period Planned Virtual Material Amount totals for chart
    const periodPlannedVirtualMaterialAmountTotals = useVirtualValueInChart && viewPlannedValue
      ? periods.map((_, periodIndex) => {
          let sum = 0
          allAnalytics.forEach((analytics: any) => {
            const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
            const plannedVirtualMaterialAmounts = cachedValues?.plannedVirtualMaterialAmount || []
            sum += plannedVirtualMaterialAmounts[periodIndex] || 0
          })
          return sum
        })
      : periods.map(() => 0)
    
    // Calculate cumulative values (running total) for line chart
    let cumulativeEarned = 0
    let cumulativePlanned = 0
    
    return periods.map((period, index) => {
      let periodShort = period.label
      if (periodType === 'month') {
        periodShort = period.start.toLocaleDateString('en-US', { month: 'short' })
      } else if (debouncedPeriodType === 'quarterly') {
        periodShort = period.label
      } else if (debouncedPeriodType === 'yearly') {
        periodShort = period.start.getFullYear().toString()
      } else if (periodType === 'daily') {
        periodShort = period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (debouncedPeriodType === 'weekly') {
        periodShort = `W${Math.ceil((period.start.getDate() + period.start.getDay()) / 7)} ${period.start.toLocaleDateString('en-US', { month: 'short' })}`
      }
      
      // Calculate earned value: base value + virtual material amount (if useVirtualValueInChart is enabled)
      const baseEarned = totals.periodEarnedValueTotals[index] || 0
      const virtualMaterialAmount = periodVirtualMaterialAmountTotals[index] || 0
      const periodEarned = useVirtualValueInChart 
        ? baseEarned + virtualMaterialAmount 
        : baseEarned
      
      // Calculate planned value: base value + planned virtual material amount (if useVirtualValueInChart is enabled)
      const basePlanned = viewPlannedValue ? (totals.periodPlannedValueTotals[index] || 0) : 0
      const plannedVirtualMaterialAmount = periodPlannedVirtualMaterialAmountTotals[index] || 0
      const periodPlanned = viewPlannedValue && useVirtualValueInChart
        ? basePlanned + plannedVirtualMaterialAmount
        : basePlanned
      
      // Calculate cumulative values (running total) for line chart
      cumulativeEarned += periodEarned
      cumulativePlanned += periodPlanned
      
      return {
        period: period.label,
        periodShort: periodShort,
        // Bars: individual period values
        earnedBar: periodEarned,
        plannedBar: viewPlannedValue ? periodPlanned : undefined,
        // Line: cumulative values (running sum)
        earnedLine: cumulativeEarned,
        plannedLine: viewPlannedValue ? cumulativePlanned : undefined
      }
    })
  }, [periods, periodType, totals, useVirtualValueInChart, viewPlannedValue, allAnalytics, expandedProjects, projectActivitiesMap, kpis, today, getCachedPeriodValues, kpiMatchesActivity])

  // ✅ Common chart props
  const commonChartProps = useMemo(() => ({
    data: chartData,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  }), [chartData])

  // ✅ Common axis and tooltip components
  const commonAxis = useMemo(() => (
    <>
      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
      <XAxis 
        dataKey="periodShort" 
        className="text-xs"
        tick={{ fill: 'currentColor' }}
        angle={periodType === 'daily' ? -45 : 0}
        textAnchor={periodType === 'daily' ? 'end' : 'middle'}
        height={periodType === 'daily' ? 80 : 30}
      />
      <YAxis 
        className="text-xs"
        tick={{ fill: 'currentColor' }}
        tickFormatter={(value) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
          return value.toString()
        }}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px'
        }}
        formatter={(value: number, name: string) => {
          const currency = projectsWithWorkInRange.length > 0 
            ? (projectsWithWorkInRange[0]?.project?.currency || 'AED')
            : 'AED'
          if (name === 'earnedBar' || name === 'earned-bar') {
            return [formatCurrency(value, currency), 'Earned Value (Period)']
          }
          if (name === 'earnedLine' || name === 'earned-line' || name === 'earned') {
            return [formatCurrency(value, currency), 'Earned Value (Cumulative)']
          }
          if (name === 'plannedBar' || name === 'planned-bar') {
            return [formatCurrency(value, currency), 'Planned Value (Period)']
          }
          if (name === 'plannedLine' || name === 'planned-line' || name === 'planned') {
            return [formatCurrency(value, currency), 'Planned Value (Cumulative)']
          }
          return [formatCurrency(value, currency), name]
        }}
        labelFormatter={(label) => {
          if (periodType === 'daily') return `Day: ${label}`
          if (periodType === 'weekly') return `Week: ${label}`
          if (periodType === 'month') return `Month: ${label}`
          if (periodType === 'quarterly') return `Quarter: ${label}`
          if (periodType === 'yearly') return `Year: ${label}`
          return label
        }}
      />
      <Legend 
        formatter={(value) => {
          if (value === 'earnedBar' || value === 'earned-bar') return 'Earned Value (Period)'
          if (value === 'earnedLine' || value === 'earned-line' || value === 'earned') return 'Earned Value (Cumulative)'
          if (value === 'plannedBar' || value === 'planned-bar') return 'Planned Value (Period)'
          if (value === 'plannedLine' || value === 'planned-line' || value === 'planned') return 'Planned Value (Cumulative)'
          return value
        }}
      />
    </>
  ), [periodType, projectsWithWorkInRange, formatCurrency])

  // ✅ Render chart component based on type
  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart {...commonChartProps}>
          {commonAxis}
          <Line 
            type="monotone" 
            dataKey="earnedLine" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5 }}
            activeDot={{ r: 7 }}
            name="earnedLine"
          />
          {viewPlannedValue && (
            <Line 
              type="monotone" 
              dataKey="plannedLine" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
              name="plannedLine"
            />
          )}
        </LineChart>
      )
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...commonChartProps}>
          {commonAxis}
          <Bar 
            dataKey="earnedBar" 
            fill="#10b981" 
            name="earnedBar"
            radius={[4, 4, 0, 0]}
          />
          {viewPlannedValue && (
            <Bar 
              dataKey="plannedBar" 
              fill="#3b82f6" 
              name="plannedBar"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      )
    }

    if (chartType === 'area') {
      return (
        <AreaChart {...commonChartProps}>
          {commonAxis}
          <Area 
            type="monotone" 
            dataKey="earnedLine" 
            stroke="#10b981" 
            fill="#10b981"
            fillOpacity={0.6}
            strokeWidth={3}
            name="earnedLine"
          />
          {viewPlannedValue && (
            <Area 
              type="monotone" 
              dataKey="plannedLine" 
              stroke="#3b82f6" 
              fill="#3b82f6"
              fillOpacity={0.4}
              strokeWidth={3}
              name="plannedLine"
            />
          )}
        </AreaChart>
      )
    }

    if (chartType === 'composed') {
      return (
        <ComposedChart {...commonChartProps}>
          {commonAxis}
          {/* Earned Value - Bar (Period Value) */}
          <Bar 
            dataKey="earnedBar" 
            fill="#10b981" 
            name="earnedBar"
            radius={[4, 4, 0, 0]}
            opacity={0.7}
          />
          {/* Earned Value - Line (Cumulative Value) */}
          <Line 
            type="monotone" 
            dataKey="earnedLine" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5 }}
            activeDot={{ r: 7 }}
            name="earnedLine"
          />
          {viewPlannedValue && (
            <>
              {/* Planned Value - Bar (Period Value) */}
              <Bar 
                dataKey="plannedBar" 
                fill="#3b82f6" 
                name="plannedBar"
                radius={[4, 4, 0, 0]}
                opacity={0.5}
              />
              {/* Planned Value - Line (Cumulative Value) */}
              <Line 
                type="monotone" 
                dataKey="plannedLine" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                name="plannedLine"
              />
            </>
          )}
        </ComposedChart>
      )
    }

    // Default to LineChart if unknown type
    return (
      <LineChart {...commonChartProps}>
        {commonAxis}
        <Line 
          type="monotone" 
          dataKey="earnedLine" 
          stroke="#10b981" 
          strokeWidth={3}
          dot={{ fill: '#10b981', r: 5 }}
          activeDot={{ r: 7 }}
          name="earnedLine"
        />
        {viewPlannedValue && (
          <Line 
            type="monotone" 
            dataKey="plannedLine" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            activeDot={{ r: 7 }}
            name="plannedLine"
          />
        )}
      </LineChart>
    )
  }

  return (
    <div className="space-y-6 relative">
      {isCalculating && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner />
            <p className="text-sm text-gray-600 dark:text-gray-400">Calculating...</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">MONTHLY WORK REVENUE (Excl VAT)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ما تم تنفيذه حتى الآن - Weekly Earned Value Report</p>
                    </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative" ref={divisionDropdownRef}>
            <button
              type="button"
              onClick={() => setShowDivisionDropdown(!showDivisionDropdown)}
              className={`px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-between min-w-[200px] ${
                selectedDivisions.length > 0
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-300 dark:border-gray-600'
              } hover:border-gray-400 dark:hover:border-gray-500`}
            >
              <span className="text-sm truncate">
                {selectedDivisions.length === 0
                  ? 'All Divisions'
                  : selectedDivisions.length === 1
                  ? selectedDivisions[0]
                  : `${selectedDivisions.length} divisions selected`
                }
              </span>
              <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${showDivisionDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDivisionDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search divisions..."
                      value={divisionSearch}
                      onChange={(e) => setDivisionSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  {selectedDivisions.length > 0 && (
                    <button
                      onClick={() => setSelectedDivisions([])}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {(() => {
                    const filteredDivisions = divisionSearch
                      ? divisions.filter((div: string) => 
                          div.toLowerCase().includes(divisionSearch.toLowerCase())
                        )
                      : divisions
                    
                    return filteredDivisions.length > 0 ? (
                      filteredDivisions.map((div: string) => {
                        const isSelected = selectedDivisions.includes(div)
                        
                        return (
                          <label
                            key={div}
                            className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedDivisions(selectedDivisions.filter(d => d !== div))
                                } else {
                                  setSelectedDivisions([...selectedDivisions, div])
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                              {div}
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No divisions found
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          {/* ✅ Outer Range: للفترة قبل الفترة المحددة */}
          <div className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showOuterRangeColumn"
                checked={showOuterRangeColumn}
                onChange={(e) => setShowOuterRangeColumn(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showOuterRangeColumn" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Show Outer Range Column (Before Period)
              </label>
            </div>
            {showOuterRangeColumn && (
              <div className="flex items-center gap-2 ml-6">
                <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Outer Range Start:
                </label>
                <input
                  type="date"
                  value={outerRangeStart}
                  onChange={(e) => setOuterRangeStart(e.target.value)}
                  max={dateRange.start || undefined}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                  placeholder="e.g., 1/1 (Start of Year)"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  to {dateRange.start ? new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Period Start'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="viewPlannedValue"
              checked={viewPlannedValue}
              onChange={(e) => setViewPlannedValue(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="viewPlannedValue" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              View Planned Value
            </label>
          </div>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'area' | 'composed')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            title="Chart Type"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="composed">Composed Chart</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideZeroProjects"
              checked={hideZeroProjects}
              onChange={(e) => setHideZeroProjects(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideZeroProjects" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide projects with 0 AED Grand Total
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideDivisionsColumn"
              checked={hideDivisionsColumn}
              onChange={(e) => setHideDivisionsColumn(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideDivisionsColumn" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide Scope Column
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideTotalContractColumn"
              checked={hideTotalContractColumn}
              onChange={(e) => setHideTotalContractColumn(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideTotalContractColumn" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide Total Contract Amount Column
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideVirtualMaterialColumn"
              checked={hideVirtualMaterialColumn}
              onChange={(e) => setHideVirtualMaterialColumn(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideVirtualMaterialColumn" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide Virtual Material Column
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showVirtualMaterialValues"
              checked={showVirtualMaterialValues}
              onChange={(e) => setShowVirtualMaterialValues(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="showVirtualMaterialValues" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Show Virtual Material Values
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useVirtualValueInChart"
              checked={useVirtualValueInChart}
              onChange={(e) => setUseVirtualValueInChart(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="useVirtualValueInChart" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Use Virtual Value in Chart
            </label>
          </div>
        </div>
      </div>

      {/* Period Revenue Chart */}
      <Card>
        {isCalculating && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner />
              <p className="text-sm text-gray-600 dark:text-gray-400">Calculating...</p>
            </div>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Revenue Trend
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {viewPlannedValue ? `Earned vs Planned Value per ${periodType.charAt(0).toUpperCase() + periodType.slice(1)}` : `Earned Value per ${periodType.charAt(0).toUpperCase() + periodType.slice(1)}`}
              </p>
            </div>
            <div className="relative" ref={chartExportMenuRef}>
              <Button
                onClick={() => setShowChartExportMenu(!showChartExportMenu)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Chart
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showChartExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleExportChart('png')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      PNG Image
                    </button>
                    <button
                      onClick={() => handleExportChart('jpeg')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      JPEG Image
                    </button>
                    <button
                      onClick={() => handleExportChart('svg')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      SVG Image
                    </button>
                    <button
                      onClick={() => handleExportChart('pdf')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      PDF Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="h-80 w-full">
            {periods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>Please select a date range to view the chart</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Contract Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totals.totalContractValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{filteredProjects.length} projects</p>
              </div>
              <DollarSign className="h-12 w-12 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earned Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totals.totalEarnedValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {totals.totalContractValue > 0 ? ((totals.totalEarnedValue / totals.totalContractValue) * 100).toFixed(1) : 0}% completed
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Planned Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totals.totalPlannedValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {totals.totalContractValue > 0 ? ((totals.totalPlannedValue / totals.totalContractValue) * 100).toFixed(1) : 0}% planned
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        {isCalculating && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner />
              <p className="text-sm text-gray-600 dark:text-gray-400">Calculating...</p>
            </div>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Work Revenue by Project
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue earned per {periodType} based on KPI Actual values</p>
            </div>
            <Button
              onClick={handleExportPeriodRevenue}
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
          {/* Color Legend */}
          {showVirtualMaterialValues && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Actual Value</span>
                </div>
                {viewPlannedValue && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">Planned Value</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-600 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Virtual Material</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 dark:bg-gray-100 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Total (Base + VM)</span>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto overflow-y-auto print-table-container" style={{ maxHeight: '70vh' }}>
            <table className="border-collapse text-sm print-table" style={{ tableLayout: 'fixed', minWidth: '100%', width: `${200 + (hideDivisionsColumn ? 0 : 180) + 120 + (hideTotalContractColumn ? 0 : 180) + 220 + (hideVirtualMaterialColumn ? 0 : 180) + (showOuterRangeColumn && outerRangeStart ? (viewPlannedValue ? 320 : 160) : 0) + (periods.length * (viewPlannedValue ? 280 : 140)) + (viewPlannedValue ? 300 : 150)}px` }}>
              <thead className="sticky top-0 z-20">
                {/* First row: Main headers with period headers spanning sub-columns */}
                <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold" style={{ width: '50px' }}>
                    <div className="text-xs">Details</div>
                  </th>
                  <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold sticky left-0 z-30 bg-gray-100 dark:bg-gray-800" style={{ width: '200px' }}>Project Full Name</th>
                  {!hideDivisionsColumn && (
                    <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold" style={{ width: '180px' }}>Scope</th>
                  )}
                  <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold" style={{ width: '120px' }}>Workmanship?</th>
                  {!hideTotalContractColumn && (
                    <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '180px' }}>Total Contract Amount</th>
                  )}
                  <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '220px' }}>Division Contract Amount</th>
                  {!hideVirtualMaterialColumn && (
                    <th rowSpan={viewPlannedValue ? 2 : 1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '180px' }}>Virtual Material</th>
                  )}
                  {showOuterRangeColumn && outerRangeStart && (
                    viewPlannedValue ? (
                      <th colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold bg-blue-50 dark:bg-blue-900/20" style={{ width: '320px' }}>
                        <div className="font-bold text-blue-700 dark:text-blue-300">Outer Range</div>
                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                          {outerRangeStart && dateRange.start ? (
                            <>
                              {new Date(outerRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </>
                          ) : (
                            <span>Before Period</span>
                          )}
                        </div>
                      </th>
                    ) : (
                      <th rowSpan={1} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}>
                        <div className="font-bold text-blue-700 dark:text-blue-300">Outer Range</div>
                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                          {outerRangeStart && dateRange.start ? (
                            <>
                              {new Date(outerRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </>
                          ) : (
                            <span>Before Period</span>
                          )}
                        </div>
                      </th>
                    )
                  )}
                  {periods.map((period, index) => {
                    if (viewPlannedValue) {
                      return (
                        <th key={index} colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold" style={{ width: '280px' }}>
                          <div className="font-bold text-gray-900 dark:text-white">{period.label}</div>
                          <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </th>
                      )
                    } else {
                      return (
                        <th key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '140px' }}>
                          <div>{period.label}</div>
                          <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </th>
                      )
                    }
                  })}
                  {viewPlannedValue ? (
                    <th colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold" style={{ width: '300px' }}>
                      <div className="font-bold text-gray-900 dark:text-white">Grand Total</div>
                    </th>
                  ) : (
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '150px' }}>Grand Total</th>
                  )}
                </tr>
                {/* Second row: Sub-headers for Actual and Planned (only when viewPlannedValue is enabled) */}
                {viewPlannedValue && (
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                    {showOuterRangeColumn && outerRangeStart && (
                      <>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20" style={{ width: '160px' }}>
                          <div className="text-xs font-medium text-green-600 dark:text-green-400">Actual</div>
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}>
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Planned</div>
                        </th>
                      </>
                    )}
                    {periods.map((period, index) => (
                      <>
                        <th key={`${index}-actual`} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20" style={{ width: '140px' }}>
                          <div className="text-xs font-medium text-green-600 dark:text-green-400">Actual</div>
                        </th>
                        <th key={`${index}-planned`} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-900/20" style={{ width: '140px' }}>
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Planned</div>
                        </th>
                      </>
                    ))}
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20" style={{ width: '150px' }}>
                      <div className="text-xs font-medium text-green-600 dark:text-green-400">Actual</div>
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-900/20" style={{ width: '150px' }}>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Planned</div>
                    </th>
                  </tr>
                )}
              </thead>
              <tbody>
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={1 + 1 + (hideDivisionsColumn ? 0 : 1) + 1 + (hideTotalContractColumn ? 0 : 1) + 1 + (hideVirtualMaterialColumn ? 0 : 1) + (showOuterRangeColumn && outerRangeStart ? (viewPlannedValue ? 2 : 1) : 0) + (periods.length * (viewPlannedValue ? 2 : 1)) + (viewPlannedValue ? 2 : 1)} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                        <p>No projects found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((analytics: any) => {
                    const project = analytics.project
                    const projectId = project.id
                    const cachedValues = getCachedPeriodValues(projectId, analytics)
                    const periodValues = cachedValues?.earned || []
                    const periodPlannedValues = cachedValues?.planned || []
                    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
                    const isExpanded = expandedProjects.has(projectId)
                    
                    return (
                      <>
                        <tr key={projectId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-3 text-center" style={{ width: '50px' }}>
                          {(() => {
                            // ✅ PERFORMANCE: Use pre-computed map instead of filtering activities repeatedly
                            const projectActivities = projectActivitiesMap.get(projectId) || []
                            return projectActivities.length > 0 ? (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedProjects)
                                  if (expandedProjects.has(projectId)) {
                                    newExpanded.delete(projectId)
                                  } else {
                                    newExpanded.add(projectId)
                                  }
                                  setExpandedProjects(newExpanded)
                                }}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title={expandedProjects.has(projectId) ? 'Hide activities' : 'Show activities'}
                              >
                                {expandedProjects.has(projectId) ? (
                                  <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                )}
                              </button>
                            ) : null
                          })()}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 sticky left-0 z-10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ width: '200px', overflow: 'hidden' }}>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{project.project_name}</p>
                          </div>
                        </td>
                        {!hideDivisionsColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" style={{ width: '180px', overflow: 'hidden' }}>
                            {(() => {
                              // ✅ Use unique key (project_full_code + project_name) for exact matching
                              const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
                              const projectName = (project.project_name || '').toString().trim()
                              const uniqueKey = `${projectFullCode}|${projectName}`
                              const divisionsData = divisionsDataMap.get(uniqueKey)
                              const divisionAmounts = divisionsData?.divisionAmounts || {}
                              const divisionNames = divisionsData?.divisionNames || {}
                              const divisionsList = Object.keys(divisionAmounts)
                                .map(key => ({
                                  key: key.toLowerCase().trim(),
                                  name: divisionNames[key] || key,
                                  amount: divisionAmounts[key] || 0
                                }))
                                .sort((a, b) => b.amount - a.amount)
                                .filter(div => {
                                  if (selectedDivisions.length === 0) return true
                                  const normalizedDivName = div.name.trim().toLowerCase()
                                  return selectedDivisions.some(selectedDiv => 
                                    selectedDiv.trim().toLowerCase() === normalizedDivName
                                  )
                                })
                              
                              return divisionsList.length === 0 ? (
                                <span className="text-sm text-gray-400 dark:text-gray-500 truncate block">{project.responsible_division || 'N/A'}</span>
                              ) : (
                                <div className="space-y-1 min-w-0">
                                  {divisionsList.map((division, index) => (
                                    <div 
                                      key={`${project.id}-div-${division.key}-${index}`} 
                                      className="text-xs text-gray-700 dark:text-gray-300 truncate"
                                    >
                                      {division.name}
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </td>
                        )}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center" style={{ width: '120px' }}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            (() => {
                              const workmanship = project.workmanship_only || 
                                                (project as any).raw?.['Workmanship only?'] || 
                                                (project as any).raw?.['Workmanship?'] || 
                                                'No'
                              return workmanship === 'Yes' || workmanship === 'TRUE' || workmanship === true
                            })() 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {(() => {
                              const workmanship = project.workmanship_only || 
                                                (project as any).raw?.['Workmanship only?'] || 
                                                (project as any).raw?.['Workmanship?'] || 
                                                'No'
                              return workmanship === 'Yes' || workmanship === 'TRUE' || workmanship === true ? 'Yes' : 'No'
                            })()}
                          </span>
                        </td>
                        {!hideTotalContractColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '180px' }}>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency((() => {
                                const contractAmt = analytics.totalContractValue || 
                                                  parseFloat(String(project.contract_amount || '0').replace(/,/g, '')) || 0
                                const variationsAmt = parseFloat(String(
                                  (project as any).raw?.['Variations Amount'] || 
                                  (project as any).raw?.['Variations'] || 
                                  '0'
                                ).replace(/,/g, '')) || 0
                                return contractAmt + variationsAmt
                              })(), project.currency)}
                            </span>
                          </td>
                        )}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" style={{ width: '220px', overflow: 'hidden' }}>
                          {(() => {
                            // ✅ Use unique key (project_full_code + project_name) for exact matching
                            const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
                            const projectName = (project.project_name || '').toString().trim()
                            const uniqueKey = `${projectFullCode}|${projectName}`
                            const divisionsData = divisionsDataMap.get(uniqueKey)
                            const divisionAmounts = divisionsData?.divisionAmounts || {}
                            const divisionNames = divisionsData?.divisionNames || {}
                            const divisionsList = Object.keys(divisionAmounts)
                              .map(key => ({
                                key: key.toLowerCase().trim(),
                                name: divisionNames[key] || key,
                                amount: divisionAmounts[key] || 0
                              }))
                              .sort((a, b) => b.amount - a.amount)
                              .filter(div => {
                                if (selectedDivisions.length === 0) return true
                                const normalizedDivName = div.name.trim().toLowerCase()
                                return selectedDivisions.some(selectedDiv => 
                                  selectedDiv.trim().toLowerCase() === normalizedDivName
                                )
                              })
                            const divisionContractAmount = divisionsList.reduce((sum, div) => sum + div.amount, 0)
                            
                            return divisionsList.length === 0 ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">No data available</span>
                            ) : (
                              <div className="space-y-1.5">
                                {divisionsList.map((division, index) => (
                                  <div 
                                    key={`${project.id}-${division.key}-${index}`} 
                                    className="flex items-center justify-between text-xs py-0.5"
                                  >
                                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0 mr-2">
                                      {division.name}:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                      {formatCurrency(division.amount, project.currency)}
                                    </span>
                                  </div>
                                ))}
                                {divisionsList.length > 1 && (
                                  <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                                    <span className="text-gray-900 dark:text-white">Total:</span>
                                    <span className="text-gray-900 dark:text-white">
                                      {formatCurrency(divisionContractAmount, project.currency)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        {!hideVirtualMaterialColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '180px' }}>
                            {(() => {
                              let virtualMaterialPercentage = 0
                              const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
                              
                              if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
                                let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
                                const parsedValue = parseFloat(cleanedValue)
                                if (!isNaN(parsedValue)) {
                                  if (parsedValue > 0 && parsedValue <= 1) {
                                    virtualMaterialPercentage = parsedValue * 100
                                  } else {
                                    virtualMaterialPercentage = parsedValue
                                  }
                                }
                              }
                              
                              return virtualMaterialPercentage > 0 ? (
                                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                  {virtualMaterialPercentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                              )
                            })()}
                          </td>
                        )}
                        {showOuterRangeColumn && outerRangeStart && (
                          viewPlannedValue ? (
                            <>
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}>
                                <div className="space-y-1">
                                  {(() => {
                                    const outerRangeValue = cachedValues?.outerRangeValue || 0
                                    return outerRangeValue > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-bold">
                                        {formatCurrency(outerRangeValue, project.currency)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )
                                  })()}
                                </div>
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}>
                                <div className="space-y-1">
                                  {(() => {
                                    const outerRangePlannedValue = cachedValues?.outerRangePlannedValue || 0
                                    return outerRangePlannedValue > 0 ? (
                                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                                        {formatCurrency(outerRangePlannedValue, project.currency)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )
                                  })()}
                                </div>
                              </td>
                            </>
                          ) : (
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}>
                              {(() => {
                                const outerRangeValue = cachedValues?.outerRangeValue || 0
                                return outerRangeValue > 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-bold">
                                    {formatCurrency(outerRangeValue, project.currency)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )
                              })()}
                            </td>
                          )
                        )}
                        {periods.map((period, periodIndex) => {
                          const periodValue = periodValues[periodIndex] || 0
                          const periodPlannedValue = viewPlannedValue ? (periodPlannedValues[periodIndex] || 0) : 0
                          const periodVirtualMaterialAmount = showVirtualMaterialValues ? (cachedValues?.virtualMaterialAmount?.[periodIndex] || 0) : 0
                          const periodPlannedVirtualMaterialAmount = showVirtualMaterialValues && viewPlannedValue ? (cachedValues?.plannedVirtualMaterialAmount?.[periodIndex] || 0) : 0
                          
                          if (viewPlannedValue) {
                            return (
                              <Fragment key={periodIndex}>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-green-50 dark:bg-green-900/20" style={{ width: '140px' }}>
                                  <div className="space-y-1">
                                    {periodValue > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-bold">
                                        {formatCurrency(periodValue, project.currency)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodVirtualMaterialAmount > 0 && (
                                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                        {formatCurrency(periodVirtualMaterialAmount, project.currency)}
                                      </div>
                                    )}
                                    {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodValue > 0 && periodVirtualMaterialAmount > 0 && (
                                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(periodValue + periodVirtualMaterialAmount, project.currency)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '140px' }}>
                                  <div className="space-y-1">
                                    {periodPlannedValue > 0 ? (
                                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                                        {formatCurrency(periodPlannedValue, project.currency)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodPlannedVirtualMaterialAmount > 0 && (
                                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                        {formatCurrency(periodPlannedVirtualMaterialAmount, project.currency)}
                                      </div>
                                    )}
                                    {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodPlannedValue > 0 && periodPlannedVirtualMaterialAmount > 0 && (
                                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(periodPlannedValue + periodPlannedVirtualMaterialAmount, project.currency)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </Fragment>
                            )
                          } else {
                            return (
                              <td key={periodIndex} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '140px' }}>
                                <div className="space-y-1">
                                  {periodValue > 0 ? (
                                    <span className="text-green-600 dark:text-green-400 font-bold">
                                      {formatCurrency(periodValue, project.currency)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                  {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodVirtualMaterialAmount > 0 && (
                                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                      {formatCurrency(periodVirtualMaterialAmount, project.currency)}
                                    </div>
                                  )}
                                  {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodValue > 0 && periodVirtualMaterialAmount > 0 && (
                                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                                      {formatCurrency(periodValue + periodVirtualMaterialAmount, project.currency)}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          }
                        })}
                        {viewPlannedValue ? (
                          <>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-green-50 dark:bg-green-900/20" style={{ width: '150px' }}>
                              <div className="space-y-1">
                                {(() => {
                                  const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0) + (cachedValues?.outerRangeValue || 0)
                                  const totalVirtualMaterialAmount = showVirtualMaterialValues ? (cachedValues?.virtualMaterialAmount?.reduce((sum: number, val: number) => sum + val, 0) || 0) : 0
                                  const totalGrandTotal = grandTotal + totalVirtualMaterialAmount
                                  
                                  if (!hideVirtualMaterialColumn && showVirtualMaterialValues) {
                                    return (
                                      <>
                                        {grandTotal > 0 ? (
                                          <span className="text-green-600 dark:text-green-400 font-bold">
                                            {formatCurrency(grandTotal, project.currency)}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                        {totalVirtualMaterialAmount > 0 && (
                                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                            {formatCurrency(totalVirtualMaterialAmount, project.currency)}
                                          </div>
                                        )}
                                        {totalVirtualMaterialAmount > 0 && totalGrandTotal > 0 && (
                                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(totalGrandTotal, project.currency)}
                                          </div>
                                        )}
                                      </>
                                    )
                                  } else {
                                    return (
                                      <span className="text-gray-900 dark:text-white font-bold">
                                        {formatCurrency(grandTotal, project.currency)}
                                      </span>
                                    )
                                  }
                                })()}
                              </div>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '150px' }}>
                              <div className="space-y-1">
                                {(() => {
                                  const grandTotalPlanned = periodPlannedValues.reduce((sum: number, val: number) => sum + val, 0) + (cachedValues?.outerRangePlannedValue || 0)
                                  const totalPlannedVirtualMaterialAmount = showVirtualMaterialValues && viewPlannedValue ? (cachedValues?.plannedVirtualMaterialAmount?.reduce((sum: number, val: number) => sum + val, 0) || 0) : 0
                                  const totalPlannedGrandTotal = grandTotalPlanned + totalPlannedVirtualMaterialAmount
                                  
                                  if (!hideVirtualMaterialColumn && showVirtualMaterialValues) {
                                    return (
                                      <>
                                        {grandTotalPlanned > 0 ? (
                                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                                            {formatCurrency(grandTotalPlanned, project.currency)}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                        {totalPlannedVirtualMaterialAmount > 0 && (
                                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                            {formatCurrency(totalPlannedVirtualMaterialAmount, project.currency)}
                                          </div>
                                        )}
                                        {totalPlannedVirtualMaterialAmount > 0 && totalPlannedGrandTotal > 0 && (
                                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(totalPlannedGrandTotal, project.currency)}
                                          </div>
                                        )}
                                      </>
                                    )
                                  } else {
                                    return grandTotalPlanned > 0 ? (
                                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                                        {formatCurrency(grandTotalPlanned, project.currency)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )
                                  }
                                })()}
                              </div>
                            </td>
                          </>
                        ) : (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '150px' }}>
                            <div className="space-y-1">
                              {(() => {
                                const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0) + (cachedValues?.outerRangeValue || 0)
                                const totalVirtualMaterialAmount = showVirtualMaterialValues ? (cachedValues?.virtualMaterialAmount?.reduce((sum: number, val: number) => sum + val, 0) || 0) : 0
                                
                                return (
                                  <>
                                    <span className="text-gray-900 dark:text-white font-bold">
                                      {formatCurrency(grandTotal, project.currency)}
                                    </span>
                                    {!hideVirtualMaterialColumn && showVirtualMaterialValues && totalVirtualMaterialAmount > 0 && (
                                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                        {formatCurrency(totalVirtualMaterialAmount, project.currency)}
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (() => {
                        const project = analytics.project
                        const projectId = project.id
                        const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
                        // ✅ PERFORMANCE: Use pre-computed map instead of filtering activities repeatedly
                        const projectActivitiesFromMap = projectActivitiesMap.get(projectId) || []
                        
                        // ✅ FIX: Filter activities to ensure they match this specific project's full code for exact matching
                        let projectActivities = projectActivitiesFromMap.filter((activity: BOQActivity) => {
                          const activityFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
                          return activityFullCode === projectFullCode || activity.project_id === project.id
                        })
                        
                        // ✅ FIX: Use debouncedSelectedDivisions to match getCachedPeriodValues filtering
                        if (debouncedSelectedDivisions.length > 0) {
                          projectActivities = projectActivities.filter((activity: BOQActivity) => {
                            const rawActivity = (activity as any).raw || {}
                            const division = activity.activity_division || 
                                           (activity as any)['Activity Division'] || 
                                           rawActivity['Activity Division'] || 
                                           rawActivity['activity_division'] || ''
                            
                            if (!division || division.trim() === '') {
                              return false
                            }
                            
                            const normalizedDivision = division.trim().toLowerCase()
                            return debouncedSelectedDivisions.some(selectedDiv => 
                              selectedDiv.trim().toLowerCase() === normalizedDivision
                            )
                          })
                        }
                        
                        return (
                          <>
                            {projectActivities.map((activity: BOQActivity) => {
                              const rawActivity = (activity as any).raw || {}
                              const activityPeriodValues = new Array(periods.length).fill(0)
                              const activityPeriodPlannedValues = viewPlannedValue ? new Array(periods.length).fill(0) : []
                              const activityPeriodVirtualMaterialAmounts = showVirtualMaterialValues ? new Array(periods.length).fill(0) : []
                              const activityPeriodPlannedVirtualMaterialAmounts = showVirtualMaterialValues && viewPlannedValue ? new Array(periods.length).fill(0) : []
                              
                              periods.forEach((period, periodIndex) => {
                                const periodStart = period.start
                                const periodEnd = period.end
                                const effectivePeriodEnd = periodEnd > today ? today : periodEnd
                                
                                const actualKPIs = kpis.filter((kpi: any) => {
                                  const rawKPI = (kpi as any).raw || {}
                                  const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
                                  const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
                                  const kpiProjectId = (kpi as any).project_id || ''
                                  
                                  let projectMatches = false
                                  if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
                                    projectMatches = true
                                  } else if (project.id && kpiProjectId && project.id === kpiProjectId) {
                                    projectMatches = true
                                  } else if (kpiProjectCode && projectFullCode.includes(kpiProjectCode)) {
                                    const projectCode = (project.project_code || '').toString().trim().toUpperCase()
                                    if (kpiProjectCode === projectCode) {
                                      projectMatches = true
                                    }
                                  }
                                  
                                  if (!projectMatches) return false
                                  
                                  const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                                  if (inputType !== 'actual') return false
                                  
                                  if (!kpiMatchesActivity(kpi, activity)) {
                                    return false
                                  }
                                  
                                  const rawKPIDate = (kpi as any).raw || {}
                                  const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
                                  const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
                                  const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
                                  
                                  let kpiDateStr = ''
                                  if (kpi.input_type === 'Actual' && actualDateValue) {
                                    kpiDateStr = actualDateValue
                                  } else if (dayValue) {
                                    kpiDateStr = activityDateValue || dayValue
                                  } else {
                                    kpiDateStr = activityDateValue || actualDateValue
                                  }
                                  
                                  if (!kpiDateStr) return false
                                  
                                  try {
                                    const kpiDate = new Date(kpiDateStr)
                                    if (isNaN(kpiDate.getTime())) return false
                                    kpiDate.setHours(0, 0, 0, 0)
                                    const normalizedPeriodStart = new Date(periodStart)
                                    normalizedPeriodStart.setHours(0, 0, 0, 0)
                                    const normalizedPeriodEnd = new Date(effectivePeriodEnd)
                                    normalizedPeriodEnd.setHours(23, 59, 59, 999)
                                    return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
                                  } catch {
                                    return false
                                  }
                                })
                                
                                const periodValue = actualKPIs.reduce((sum: number, kpi: any) => {
                                  try {
                                    const rawKpi = (kpi as any).raw || {}
                                    const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                                    
                                    let financialValue = 0
                                    const totalValueFromActivity = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                                    const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                                    let rate = 0
                                    if (totalUnits > 0 && totalValueFromActivity > 0) {
                                      rate = totalValueFromActivity / totalUnits
                                    } else {
                                      rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                                    }
                                    
                                    if (rate > 0 && quantityValue > 0) {
                                      financialValue = quantityValue * rate
                                      if (financialValue > 0) return sum + financialValue
                                    }
                                    
                                    let kpiValue = 0
                                    if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
                                      const val = rawKpi['Value']
                                      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
                                    }
                                    if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
                                      const val = rawKpi.value
                                      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
                                    }
                                    if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
                                      const val = kpi.value
                                      kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
                                    }
                                    if (kpiValue > 0) return sum + kpiValue
                                    
                                    const actualValue = kpi.actual_value || parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, '')) || 0
                                    if (actualValue > 0) return sum + actualValue
                                    
                                    return sum
                                  } catch {
                                    return sum
                                  }
                                }, 0)
                                
                                activityPeriodValues[periodIndex] = periodValue
                                
                                if (viewPlannedValue) {
                                  const plannedKPIs = kpis.filter((kpi: any) => {
                                    const rawKPI = (kpi as any).raw || {}
                                    const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
                                    const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
                                    const kpiProjectId = (kpi as any).project_id || ''
                                    
                                    let projectMatches = false
                                    if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
                                      projectMatches = true
                                    } else if (project.id && kpiProjectId && project.id === kpiProjectId) {
                                      projectMatches = true
                                    } else if (kpiProjectCode && projectFullCode.includes(kpiProjectCode)) {
                                      const projectCode = (project.project_code || '').toString().trim().toUpperCase()
                                      if (kpiProjectCode === projectCode) {
                                        projectMatches = true
                                      }
                                    }
                                    
                                    if (!projectMatches) return false
                                    
                                    const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                                    if (inputType !== 'planned') return false
                                    
                                    if (!kpiMatchesActivity(kpi, activity)) {
                                      return false
                                    }
                                    
                                    const kpiDate = kpi.target_date || rawKPI['Target Date'] || ''
                                    if (!kpiDate) return false
                                    
                                    try {
                                      const date = new Date(kpiDate)
                                      if (isNaN(date.getTime())) return false
                                      date.setHours(0, 0, 0, 0)
                                      const normalizedPeriodStart = new Date(periodStart)
                                      normalizedPeriodStart.setHours(0, 0, 0, 0)
                                      const normalizedPeriodEnd = new Date(effectivePeriodEnd)
                                      normalizedPeriodEnd.setHours(23, 59, 59, 999)
                                      return date >= normalizedPeriodStart && date <= normalizedPeriodEnd
                                    } catch {
                                      return false
                                    }
                                  })
                                  
                                  const plannedValue = plannedKPIs.reduce((s: number, kpi: any) => {
                                    const rawKpi = (kpi as any).raw || {}
                                    const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                                    
                                    const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                                    const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                                    
                                    let rate = 0
                                    if (totalUnits > 0 && totalValue > 0) {
                                      rate = totalValue / totalUnits
                                    } else {
                                      rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                                    }
                                    
                                    if (rate > 0 && quantity > 0) {
                                      return s + rate * quantity
                                    } else {
                                      const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
                                      if (kpiValue > 0) {
                                        return s + kpiValue
                                      }
                                    }
                                    
                                    return s
                                  }, 0)
                                  
                                  activityPeriodPlannedValues[periodIndex] = plannedValue
                                }
                                
                                if (showVirtualMaterialValues && activity.use_virtual_material) {
                                  let virtualMaterialPercentage = 0
                                  const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
                                  
                                  if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
                                    let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
                                    const parsedValue = parseFloat(cleanedValue)
                                    if (!isNaN(parsedValue)) {
                                      if (parsedValue > 0 && parsedValue <= 1) {
                                        virtualMaterialPercentage = parsedValue * 100
                                      } else {
                                        virtualMaterialPercentage = parsedValue
                                      }
                                    }
                                  }
                                  
                                  if (virtualMaterialPercentage > 0) {
                                    const actualKPIsForVM = kpis.filter((kpi: any) => {
                                      const rawKPI = (kpi as any).raw || {}
                                      const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
                                      const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
                                      const kpiProjectId = (kpi as any).project_id || ''
                                      
                                      let projectMatches = false
                                      if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
                                        projectMatches = true
                                      } else if (project.id && kpiProjectId && project.id === kpiProjectId) {
                                        projectMatches = true
                                      } else if (kpiProjectCode && projectFullCode.includes(kpiProjectCode)) {
                                        const projectCode = (project.project_code || '').toString().trim().toUpperCase()
                                        if (kpiProjectCode === projectCode) {
                                          projectMatches = true
                                        }
                                      }
                                      
                                      if (!projectMatches) return false
                                      
                                      const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                                      if (inputType !== 'actual') return false
                                      
                                      if (!kpiMatchesActivity(kpi, activity)) {
                                        return false
                                      }
                                      
                                      const rawKPIDate = (kpi as any).raw || {}
                                      const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
                                      const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
                                      const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
                                      
                                      let kpiDateStr = ''
                                      if (kpi.input_type === 'Actual' && actualDateValue) {
                                        kpiDateStr = actualDateValue
                                      } else if (dayValue) {
                                        kpiDateStr = activityDateValue || dayValue
                                      } else {
                                        kpiDateStr = activityDateValue || actualDateValue
                                      }
                                      
                                      if (!kpiDateStr) return false
                                      
                                      try {
                                        const kpiDate = new Date(kpiDateStr)
                                        if (isNaN(kpiDate.getTime())) return false
                                        kpiDate.setHours(0, 0, 0, 0)
                                        const normalizedPeriodStart = new Date(periodStart)
                                        normalizedPeriodStart.setHours(0, 0, 0, 0)
                                        const normalizedPeriodEnd = new Date(effectivePeriodEnd)
                                        normalizedPeriodEnd.setHours(23, 59, 59, 999)
                                        return kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
                                      } catch {
                                        return false
                                      }
                                    })
                                    
                                    actualKPIsForVM.forEach((kpi: any) => {
                                      const rawKpi = (kpi as any).raw || {}
                                      const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                                      
                                      const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                                      const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                                      
                                      let rate = 0
                                      if (totalUnits > 0 && totalValue > 0) {
                                        rate = totalValue / totalUnits
                                      } else {
                                        rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                                      }
                                      
                                      let baseValue = 0
                                      if (rate > 0 && quantity > 0) {
                                        baseValue = rate * quantity
                                      } else {
                                        const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
                                        if (kpiValue > 0) {
                                          baseValue = kpiValue
                                        }
                                      }
                                      
                                      if (baseValue > 0) {
                                        activityPeriodVirtualMaterialAmounts[periodIndex] += baseValue * (virtualMaterialPercentage / 100)
                                      }
                                    })
                                    
                                    if (viewPlannedValue) {
                                      const plannedKPIsForVM = kpis.filter((kpi: any) => {
                                        const rawKPI = (kpi as any).raw || {}
                                        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
                                        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
                                        const kpiProjectId = (kpi as any).project_id || ''
                                        
                                        let projectMatches = false
                                        if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode === projectFullCode) {
                                          projectMatches = true
                                        } else if (project.id && kpiProjectId && project.id === kpiProjectId) {
                                          projectMatches = true
                                        } else if (kpiProjectCode && projectFullCode.includes(kpiProjectCode)) {
                                          const projectCode = (project.project_code || '').toString().trim().toUpperCase()
                                          if (kpiProjectCode === projectCode) {
                                            projectMatches = true
                                          }
                                        }
                                        
                                        if (!projectMatches) return false
                                        
                                        const inputType = String(kpi.input_type || rawKPI['Input Type'] || '').trim().toLowerCase()
                                        if (inputType !== 'planned') return false
                                        
                                        if (!kpiMatchesActivity(kpi, activity)) {
                                          return false
                                        }
                                        
                                        const kpiDate = kpi.target_date || rawKPI['Target Date'] || ''
                                        if (!kpiDate) return false
                                        
                                        try {
                                          const date = new Date(kpiDate)
                                          if (isNaN(date.getTime())) return false
                                          date.setHours(0, 0, 0, 0)
                                          const normalizedPeriodStart = new Date(periodStart)
                                          normalizedPeriodStart.setHours(0, 0, 0, 0)
                                          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
                                          normalizedPeriodEnd.setHours(23, 59, 59, 999)
                                          return date >= normalizedPeriodStart && date <= normalizedPeriodEnd
                                        } catch {
                                          return false
                                        }
                                      })
                                      
                                      plannedKPIsForVM.forEach((kpi: any) => {
                                        const rawKpi = (kpi as any).raw || {}
                                        const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
                                        
                                        const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                                        const totalUnits = activity.total_units || activity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                                        
                                        let rate = 0
                                        if (totalUnits > 0 && totalValue > 0) {
                                          rate = totalValue / totalUnits
                                        } else {
                                          rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
                                        }
                                        
                                        let baseValue = 0
                                        if (rate > 0 && quantity > 0) {
                                          baseValue = rate * quantity
                                        } else {
                                          const kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
                                          if (kpiValue > 0) {
                                            baseValue = kpiValue
                                          }
                                        }
                                        
                                        if (baseValue > 0) {
                                          activityPeriodPlannedVirtualMaterialAmounts[periodIndex] += baseValue * (virtualMaterialPercentage / 100)
                                        }
                                      })
                                    }
                                  }
                                }
                              })
                              
                              const activityGrandTotal = activityPeriodValues.reduce((sum: number, val: number) => sum + val, 0)
                              const activityGrandTotalPlanned = viewPlannedValue ? activityPeriodPlannedValues.reduce((sum: number, val: number) => sum + val, 0) : 0
                              const activityTotalVirtualMaterialAmount = showVirtualMaterialValues ? activityPeriodVirtualMaterialAmounts.reduce((sum: number, val: number) => sum + val, 0) : 0
                              const activityTotalPlannedVirtualMaterialAmount = showVirtualMaterialValues && viewPlannedValue ? activityPeriodPlannedVirtualMaterialAmounts.reduce((sum: number, val: number) => sum + val, 0) : 0
                              
                              return (
                                <tr key={`${activity.id || activity.activity_name}-${project.id}`} className="bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2"></td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/30" style={{ width: '200px' }}>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                      <p className="font-medium">{activity.activity_name || activity.activity || 'N/A'}</p>
                                      {(() => {
                                        const activityZone = activity.zone_ref || activity.zone_number || (rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '')
                                        return activityZone ? (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Zone: {activityZone}</p>
                                        ) : null
                                      })()}
                                    </div>
                                  </td>
                                  {!hideDivisionsColumn && (
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" style={{ width: '180px' }}>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {activity.activity_division || (rawActivity['Activity Division'] || 'N/A')}
                                      </span>
                                    </td>
                                  )}
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center" style={{ width: '120px' }}></td>
                                  {!hideTotalContractColumn && (
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right" style={{ width: '180px' }}></td>
                                  )}
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" style={{ width: '220px' }}></td>
                                  {!hideVirtualMaterialColumn && (
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right" style={{ width: '180px' }}>
                                      {(() => {
                                        let virtualMaterialPercentage = 0
                                        const virtualMaterialValueStr = String(project.virtual_material_value || '0').trim()
                                        
                                        if (virtualMaterialValueStr && virtualMaterialValueStr !== '0' && virtualMaterialValueStr !== '0%') {
                                          let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
                                          const parsedValue = parseFloat(cleanedValue)
                                          if (!isNaN(parsedValue)) {
                                            if (parsedValue > 0 && parsedValue <= 1) {
                                              virtualMaterialPercentage = parsedValue * 100
                                            } else {
                                              virtualMaterialPercentage = parsedValue
                                            }
                                          }
                                        }
                                        
                                        return activity.use_virtual_material && virtualMaterialPercentage > 0 ? (
                                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                            {virtualMaterialPercentage.toFixed(1)}%
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                        )
                                      })()}
                                    </td>
                                  )}
                                  {showOuterRangeColumn && outerRangeStart && (
                                    viewPlannedValue ? (
                                      <>
                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}></td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}></td>
                                      </>
                                    ) : (
                                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '160px' }}></td>
                                    )
                                  )}
                                  {periods.map((period, periodIndex) => {
                                    const periodValue = activityPeriodValues[periodIndex] || 0
                                    const periodPlannedValue = viewPlannedValue ? (activityPeriodPlannedValues[periodIndex] || 0) : 0
                                    const periodVirtualMaterialAmount = activityPeriodVirtualMaterialAmounts[periodIndex] || 0
                                    const periodPlannedVirtualMaterialAmount = activityPeriodPlannedVirtualMaterialAmounts[periodIndex] || 0
                                    
                                    if (viewPlannedValue) {
                                      return (
                                        <Fragment key={periodIndex}>
                                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-green-50 dark:bg-green-900/20" style={{ width: '140px' }}>
                                            <div className="space-y-1">
                                              {periodValue > 0 ? (
                                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                  {formatCurrency(periodValue, project.currency)}
                                                </span>
                                              ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                              )}
                                              {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodVirtualMaterialAmount > 0 && (
                                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                                  {formatCurrency(periodVirtualMaterialAmount, project.currency)}
                                                </div>
                                              )}
                                              {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodValue > 0 && periodVirtualMaterialAmount > 0 && (
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                  {formatCurrency(periodValue + periodVirtualMaterialAmount, project.currency)}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '140px' }}>
                                            <div className="space-y-1">
                                              {periodPlannedValue > 0 ? (
                                                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                  {formatCurrency(periodPlannedValue, project.currency)}
                                                </span>
                                              ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                              )}
                                              {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodPlannedVirtualMaterialAmount > 0 && (
                                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                                  {formatCurrency(periodPlannedVirtualMaterialAmount, project.currency)}
                                                </div>
                                              )}
                                              {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodPlannedValue > 0 && periodPlannedVirtualMaterialAmount > 0 && (
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                  {formatCurrency(periodPlannedValue + periodPlannedVirtualMaterialAmount, project.currency)}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </Fragment>
                                      )
                                    } else {
                                      return (
                                        <td key={periodIndex} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right" style={{ width: '140px' }}>
                                          <div className="space-y-1">
                                            {periodValue > 0 ? (
                                              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                {formatCurrency(periodValue, project.currency)}
                                              </span>
                                            ) : (
                                              <span className="text-sm text-gray-400">-</span>
                                            )}
                                            {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodVirtualMaterialAmount > 0 && (
                                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                                {formatCurrency(periodVirtualMaterialAmount, project.currency)}
                                              </div>
                                            )}
                                            {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodValue > 0 && periodVirtualMaterialAmount > 0 && (
                                              <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(periodValue + periodVirtualMaterialAmount, project.currency)}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      )
                                    }
                                  })}
                                  {viewPlannedValue ? (
                                    <>
                                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-green-50 dark:bg-green-900/20" style={{ width: '150px' }}>
                                        <div className="space-y-1">
                                          {activityGrandTotal > 0 ? (
                                            <span className="text-sm text-green-600 dark:text-green-400 font-bold">
                                              {formatCurrency(activityGrandTotal, project.currency)}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                          )}
                                          {!hideVirtualMaterialColumn && showVirtualMaterialValues && activityTotalVirtualMaterialAmount > 0 && (
                                            <div className="text-xs text-purple-600 dark:text-purple-400">
                                              {formatCurrency(activityTotalVirtualMaterialAmount, project.currency)}
                                            </div>
                                          )}
                                          {!hideVirtualMaterialColumn && showVirtualMaterialValues && activityGrandTotal > 0 && activityTotalVirtualMaterialAmount > 0 && (
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                                              {formatCurrency(activityGrandTotal + activityTotalVirtualMaterialAmount, project.currency)}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '150px' }}>
                                        <div className="space-y-1">
                                          {activityGrandTotalPlanned > 0 ? (
                                            <span className="text-sm text-blue-600 dark:text-blue-400 font-bold">
                                              {formatCurrency(activityGrandTotalPlanned, project.currency)}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                          )}
                                          {!hideVirtualMaterialColumn && showVirtualMaterialValues && activityTotalPlannedVirtualMaterialAmount > 0 && (
                                            <div className="text-xs text-purple-600 dark:text-purple-400">
                                              {formatCurrency(activityTotalPlannedVirtualMaterialAmount, project.currency)}
                                            </div>
                                          )}
                                          {!hideVirtualMaterialColumn && showVirtualMaterialValues && activityGrandTotalPlanned > 0 && activityTotalPlannedVirtualMaterialAmount > 0 && (
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                                              {formatCurrency(activityGrandTotalPlanned + activityTotalPlannedVirtualMaterialAmount, project.currency)}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right" style={{ width: '150px' }}>
                                      <div className="space-y-1">
                                        {activityGrandTotal > 0 ? (
                                          <span className="text-sm text-green-600 dark:text-green-400 font-bold">
                                            {formatCurrency(activityGrandTotal, project.currency)}
                                          </span>
                                        ) : (
                                          <span className="text-sm text-gray-400">-</span>
                                        )}
                                        {!hideVirtualMaterialColumn && showVirtualMaterialValues && activityTotalVirtualMaterialAmount > 0 && (
                                          <div className="text-xs text-purple-600 dark:text-purple-400">
                                            {formatCurrency(activityTotalVirtualMaterialAmount, project.currency)}
                                          </div>
                                        )}
                                        {!hideVirtualMaterialColumn && showVirtualMaterialValues && activityGrandTotal > 0 && activityTotalVirtualMaterialAmount > 0 && (
                                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(activityGrandTotal + activityTotalVirtualMaterialAmount, project.currency)}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </>
                        )
                      })()}
                      </>
                    )
                  })
                )}
              </tbody>
              {projectsWithWorkInRange.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={1 + 1 + (hideDivisionsColumn ? 0 : 1) + 1 + (hideTotalContractColumn ? 0 : 1) + 1 + (hideVirtualMaterialColumn ? 0 : 1) + (showOuterRangeColumn && outerRangeStart ? (viewPlannedValue ? 2 : 1) : 0)} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                      <span className="text-gray-900 dark:text-white">Grand Total</span>
                    </td>
                    {periods.map((period, periodIndex) => {
                      // ✅ FIX: Calculate totals from paginatedProjects (visible rows) only
                      const periodTotal = paginatedProjects.reduce((sum: number, analytics: any) => {
                        const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                        const periodValues = cachedValues?.earned || []
                        return sum + (periodValues[periodIndex] || 0)
                      }, 0)
                      const periodPlannedTotal = viewPlannedValue ? paginatedProjects.reduce((sum: number, analytics: any) => {
                        const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                        const periodPlannedValues = cachedValues?.planned || []
                        return sum + (periodPlannedValues[periodIndex] || 0)
                      }, 0) : 0
                      const periodVirtualMaterialTotal = showVirtualMaterialValues ? paginatedProjects.reduce((sum: number, analytics: any) => {
                        const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                        const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
                        return sum + (virtualMaterialAmounts[periodIndex] || 0)
                      }, 0) : 0
                      const periodPlannedVirtualMaterialTotal = showVirtualMaterialValues && viewPlannedValue ? paginatedProjects.reduce((sum: number, analytics: any) => {
                        const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                        const plannedVirtualMaterialAmounts = cachedValues?.plannedVirtualMaterialAmount || []
                        return sum + (plannedVirtualMaterialAmounts[periodIndex] || 0)
                      }, 0) : 0
                      
                      if (viewPlannedValue) {
                        return (
                          <React.Fragment key={periodIndex}>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-green-50 dark:bg-green-900/20" style={{ width: '140px' }}>
                              <div className="space-y-1">
                                {periodTotal > 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-bold">
                                    {formatCurrency(periodTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                                {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodVirtualMaterialTotal > 0 && (
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                    {formatCurrency(periodVirtualMaterialTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </div>
                                )}
                                {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodTotal > 0 && periodVirtualMaterialTotal > 0 && (
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(periodTotal + periodVirtualMaterialTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '140px' }}>
                              <div className="space-y-1">
                                {periodPlannedTotal > 0 ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                                    {formatCurrency(periodPlannedTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                                {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodPlannedVirtualMaterialTotal > 0 && (
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                    {formatCurrency(periodPlannedVirtualMaterialTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </div>
                                )}
                                {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodPlannedTotal > 0 && periodPlannedVirtualMaterialTotal > 0 && (
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(periodPlannedTotal + periodPlannedVirtualMaterialTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        )
                      } else {
                        return (
                          <td key={periodIndex} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '140px' }}>
                            <div className="space-y-1">
                              {periodTotal > 0 ? (
                                <span className="text-green-600 dark:text-green-400 font-bold">
                                  {formatCurrency(periodTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodVirtualMaterialTotal > 0 && (
                                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                  {formatCurrency(periodVirtualMaterialTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                </div>
                              )}
                              {!hideVirtualMaterialColumn && showVirtualMaterialValues && periodTotal > 0 && periodVirtualMaterialTotal > 0 && (
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(periodTotal + periodVirtualMaterialTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      }
                    })}
                    {viewPlannedValue ? (
                      <>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-green-50 dark:bg-green-900/20" style={{ width: '150px' }}>
                          <div className="space-y-1">
                            {!hideVirtualMaterialColumn && showVirtualMaterialValues ? (
                              <>
                                {(() => {
                                  // ✅ FIX: Calculate Grand Total from paginatedProjects (visible rows) only
                                  const grandTotalEarnedValue = paginatedProjects.reduce((sum: number, analytics: any) => {
                                    const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                                    const periodValues = cachedValues?.earned || []
                                    return sum + periodValues.reduce((s: number, val: number) => s + val, 0)
                                  }, 0)
                                  const totalVirtualMaterialAmount = paginatedProjects.reduce((sum: number, analytics: any) => {
                                    const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                                    const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
                                    return sum + virtualMaterialAmounts.reduce((s: number, val: number) => s + val, 0)
                                  }, 0)
                                  const totalGrandTotal = grandTotalEarnedValue + totalVirtualMaterialAmount
                                  return (
                                    <>
                                      {grandTotalEarnedValue > 0 ? (
                                        <span className="text-green-600 dark:text-green-400 font-bold">
                                          {formatCurrency(grandTotalEarnedValue, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                      {totalVirtualMaterialAmount > 0 && (
                                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                          {formatCurrency(totalVirtualMaterialAmount, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                        </div>
                                      )}
                                      {totalVirtualMaterialAmount > 0 && totalGrandTotal > 0 && (
                                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(totalGrandTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                              </>
                            ) : (
                              <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(paginatedProjects.reduce((sum: number, analytics: any) => {
                                const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                                const periodValues = cachedValues?.earned || []
                                return sum + periodValues.reduce((s: number, val: number) => s + val, 0)
                              }, 0), projectsWithWorkInRange[0]?.project?.currency || 'AED')}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20" style={{ width: '150px' }}>
                          <div className="space-y-1">
                            {!hideVirtualMaterialColumn && showVirtualMaterialValues ? (
                              <>
                                {(() => {
                                  // ✅ FIX: Calculate Grand Total Planned from paginatedProjects (visible rows) only
                                  const grandTotalPlannedValue = paginatedProjects.reduce((sum: number, analytics: any) => {
                                    const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                                    const periodPlannedValues = cachedValues?.planned || []
                                    return sum + periodPlannedValues.reduce((s: number, val: number) => s + val, 0)
                                  }, 0)
                                  const totalPlannedVirtualMaterialAmount = paginatedProjects.reduce((sum: number, analytics: any) => {
                                    const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                                    const plannedVirtualMaterialAmounts = cachedValues?.plannedVirtualMaterialAmount || []
                                    return sum + plannedVirtualMaterialAmounts.reduce((s: number, val: number) => s + val, 0)
                                  }, 0)
                                  const totalPlannedGrandTotal = grandTotalPlannedValue + totalPlannedVirtualMaterialAmount
                                  return (
                                    <>
                                      {grandTotalPlannedValue > 0 ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                                          {formatCurrency(grandTotalPlannedValue, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                      {totalPlannedVirtualMaterialAmount > 0 && (
                                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                          {formatCurrency(totalPlannedVirtualMaterialAmount, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                        </div>
                                      )}
                                      {totalPlannedVirtualMaterialAmount > 0 && totalPlannedGrandTotal > 0 && (
                                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(totalPlannedGrandTotal, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                              </>
                            ) : (
                                (() => {
                                  const grandTotalPlannedValue = paginatedProjects.reduce((sum: number, analytics: any) => {
                                    const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                                    const periodPlannedValues = cachedValues?.planned || []
                                    return sum + periodPlannedValues.reduce((s: number, val: number) => s + val, 0)
                                  }, 0)
                                  return grandTotalPlannedValue > 0 ? (
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(grandTotalPlannedValue, projectsWithWorkInRange[0]?.project?.currency || 'AED')}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )
                                })()
                              )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '150px' }}>
                        <div className="space-y-1">
                          {(() => {
                            // ✅ FIX: Calculate Grand Total from paginatedProjects (visible rows) only
                            const grandTotalEarnedValue = paginatedProjects.reduce((sum: number, analytics: any) => {
                              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                              const periodValues = cachedValues?.earned || []
                              return sum + periodValues.reduce((s: number, val: number) => s + val, 0)
                            }, 0)
                            const totalVirtualMaterialAmount = showVirtualMaterialValues ? paginatedProjects.reduce((sum: number, analytics: any) => {
                              const cachedValues = getCachedPeriodValues(analytics.project.id, analytics)
                              const virtualMaterialAmounts = cachedValues?.virtualMaterialAmount || []
                              return sum + virtualMaterialAmounts.reduce((s: number, val: number) => s + val, 0)
                            }, 0) : 0
                            return (
                              <>
                                <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(grandTotalEarnedValue, projectsWithWorkInRange[0]?.project?.currency || 'AED')}</span>
                                {!hideVirtualMaterialColumn && showVirtualMaterialValues && totalVirtualMaterialAmount > 0 && (
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                    {formatCurrency(totalVirtualMaterialAmount, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </div>
                                )}
                                {!hideVirtualMaterialColumn && showVirtualMaterialValues && totalVirtualMaterialAmount > 0 && (grandTotalEarnedValue + totalVirtualMaterialAmount) > 0 && (
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(grandTotalEarnedValue + totalVirtualMaterialAmount, projectsWithWorkInRange[0]?.project?.currency || 'AED')}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          
          {projectsWithWorkInRange.length > 0 && (
            <div className="mt-4">
              {isChangingPage && (
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Loading...
                </div>
              )}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                totalItems={hideZeroProjects ? paginatedProjects.length * totalPages : projectsWithWorkInRange.length}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

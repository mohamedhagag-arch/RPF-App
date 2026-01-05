'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { processKPIRecord, ProcessedKPI } from '@/lib/kpiProcessor'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import { processAnalyticsInChunks } from '@/lib/analyticsProcessor'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import type { ReportStats, FilteredData } from '@/components/reports/types'

const CACHE_KEYS = {
  projects: 'reports_cache_projects',
  activities: 'reports_cache_activities',
  kpis: 'reports_cache_kpis',
  analytics: 'reports_cache_analytics',
  timestamp: 'reports_cache_timestamp'
}
const CACHE_EXPIRATION_MS = 30 * 60 * 1000 // 30 minutes

export function useReportsData() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [kpis, setKpis] = useState<ProcessedKPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFromCache, setIsFromCache] = useState(false)
  const [cachedAnalytics, setCachedAnalytics] = useState<any[] | null>(null)
  const [computedAnalytics, setComputedAnalytics] = useState<any[]>([])
  const [isComputingAnalytics, setIsComputingAnalytics] = useState(false)
  
  // Filter states
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  // Multi-select dropdown states
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  // Debounced filter values
  const [debouncedDivision, setDebouncedDivision] = useState<string>('')
  const [debouncedProjects, setDebouncedProjects] = useState<string[]>([])
  const [debouncedDateRange, setDebouncedDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('modern-reports')
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessedDataRef = useRef<string>('')
  const loadingFunctionsRef = useRef({ startSmartLoading, stopSmartLoading })
  
  useEffect(() => {
    loadingFunctionsRef.current = { startSmartLoading, stopSmartLoading }
  }, [startSmartLoading, stopSmartLoading])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounce filter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    const debounceTime = dateRange.start || dateRange.end ? 500 : 200
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedDivision(selectedDivision)
      setDebouncedProjects(selectedProjects)
      setDebouncedDateRange(dateRange)
    }, debounceTime)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [selectedDivision, selectedProjects, dateRange])

  // Cache functions
  const clearCache = useCallback(() => {
    try {
      Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key))
      console.log('🗑️ Cache cleared')
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
    }
  }, [])

  const loadFromCache = useCallback(() => {
    try {
      const timestamp = localStorage.getItem(CACHE_KEYS.timestamp)
      if (!timestamp) return null
      
      const cacheAge = Date.now() - parseInt(timestamp, 10)
      if (cacheAge > CACHE_EXPIRATION_MS) {
        console.log('⏰ Cache expired, will fetch fresh data')
        return null
      }
      
      const cachedProjects = localStorage.getItem(CACHE_KEYS.projects)
      const cachedActivities = localStorage.getItem(CACHE_KEYS.activities)
      const cachedKPIs = localStorage.getItem(CACHE_KEYS.kpis)
      const cachedAnalytics = localStorage.getItem(CACHE_KEYS.analytics)
      
      if (!cachedProjects || !cachedKPIs) {
        return null
      }
      
      const projects = JSON.parse(cachedProjects)
      const kpis = JSON.parse(cachedKPIs)
      const activities = cachedActivities ? JSON.parse(cachedActivities) : []
      const analytics = cachedAnalytics ? JSON.parse(cachedAnalytics) : null
      
      console.log(`✅ Loaded from cache: ${projects.length} projects, ${activities.length} activities, ${kpis.length} KPIs${analytics ? `, ${analytics.length} analytics` : ''} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`)
      
      return { projects, activities, kpis, analytics }
    } catch (error) {
      console.error('❌ Error loading from cache:', error)
      try {
        clearCache()
      } catch (e) {
        // Ignore errors when clearing
      }
      return null
    }
  }, [clearCache])

  const saveToCache = useCallback((projects: Project[], activities: BOQActivity[], kpis: ProcessedKPI[], analytics?: any[]) => {
    try {
      try {
        Object.values(CACHE_KEYS).forEach(key => {
          if (key !== CACHE_KEYS.timestamp) localStorage.removeItem(key)
        })
      } catch (e) {
        // Ignore errors when clearing
      }

      try {
        localStorage.setItem(CACHE_KEYS.projects, JSON.stringify(projects))
        localStorage.setItem(CACHE_KEYS.kpis, JSON.stringify(kpis))
        localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString())
        console.log('💾 Essential data saved to cache')
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          console.warn('⚠️ localStorage full, skipping cache save')
          return
        }
        throw error
      }

      try {
        localStorage.setItem(CACHE_KEYS.activities, JSON.stringify(activities))
        console.log('💾 Activities saved to cache')
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          console.warn('⚠️ Activities too large for cache, skipping activities')
        } else {
          throw error
        }
      }

      if (analytics) {
        try {
          const compactAnalytics = analytics.map((a: any) => ({
            project: { id: a.project.id, project_code: a.project.project_code, project_full_code: a.project.project_full_code },
            totalValue: a.totalValue,
            totalEarnedValue: a.totalEarnedValue,
            totalPlannedValue: a.totalPlannedValue,
            totalRemainingValue: a.totalRemainingValue,
            variance: a.variance,
            variancePercentage: a.variancePercentage,
            projectStatus: a.projectStatus
          }))
          localStorage.setItem(CACHE_KEYS.analytics, JSON.stringify(compactAnalytics))
          console.log(`💾 Analytics saved to cache (compact format: ${analytics.length} items)`)
        } catch (error: any) {
          if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ Analytics too large for cache, skipping analytics')
          } else {
            throw error
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error saving to cache:', error)
      try {
        clearCache()
        localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString())
        console.log('💾 Cache cleared and timestamp saved')
      } catch (finalError) {
        console.error('❌ Failed to save even timestamp:', finalError)
      }
    }
  }, [clearCache])

  // Fetch all records with pagination
  const fetchAllRecords = useCallback(async (table: string) => {
    let allData: any[] = []
    let offset = 0
    const chunkSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + chunkSize - 1)
      
      if (error) {
        console.error(`❌ Error fetching ${table}:`, error)
        throw error
      }
      
      if (!data || data.length === 0) {
        hasMore = false
        break
      }
      
      allData = [...allData, ...data]
      console.log(`📥 Fetched ${table} chunk: ${data.length} records (total so far: ${allData.length})`)
      
      if (data.length < chunkSize) {
        hasMore = false
      } else {
        offset += chunkSize
      }
    }
    
    console.log(`✅ Total ${table} records fetched: ${allData.length}`)
    return allData
  }, [supabase])

  const fetchAllData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh) {
        const cachedData = loadFromCache()
        if (cachedData) {
          if (isMountedRef.current) {
            setProjects(cachedData.projects)
            setActivities(cachedData.activities)
            setKpis(cachedData.kpis)
            if (cachedData.analytics) {
              setCachedAnalytics(cachedData.analytics)
            }
            setLoading(false)
            setIsFromCache(true)
          }
          return
        }
      }
      
      setIsFromCache(false)
      setCachedAnalytics(null)

      loadingFunctionsRef.current.startSmartLoading(setLoading)
      setError('')

      const [projectsData, activitiesData, kpisData] = await Promise.all([
        fetchAllRecords(TABLES.PROJECTS),
        fetchAllRecords(TABLES.BOQ_ACTIVITIES),
        fetchAllRecords(TABLES.KPI)
      ])

      const mappedProjects = (projectsData || []).map(mapProjectFromDB)
      const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      const mappedKPIs = (kpisData || []).map(mapKPIFromDB)
      const processedKPIs = mappedKPIs.map(processKPIRecord)

      const calculatedAnalytics = getAllProjectsAnalytics(mappedProjects, mappedActivities, processedKPIs)

      if (isMountedRef.current) {
        setProjects(mappedProjects)
        setActivities(mappedActivities)
        setKpis(processedKPIs)
        setCachedAnalytics(calculatedAnalytics)
        saveToCache(mappedProjects, mappedActivities, processedKPIs, calculatedAnalytics)
      }
      
      console.log(`✅ Reports data loaded: ${mappedProjects.length} projects, ${mappedActivities.length} activities, ${processedKPIs.length} KPIs`)
    } catch (error: any) {
      console.error('Error loading data:', error)
      if (isMountedRef.current) {
        setError('Failed to load report data: ' + (error.message || 'Unknown error'))
      }
    } finally {
      if (isMountedRef.current) {
        loadingFunctionsRef.current.stopSmartLoading(setLoading)
      }
    }
  }, [fetchAllRecords, loadFromCache, saveToCache])

  // Load data on mount
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
    
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      fetchAllData()
    }
    
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter data
  const filteredData = useMemo((): FilteredData => {
    const hasFilters = debouncedDivision || debouncedProjects.length > 0 || debouncedDateRange.start || debouncedDateRange.end
    
    if (!hasFilters) {
      return { filteredProjects: projects, filteredActivities: activities, filteredKPIs: kpis }
    }

    let filteredProjects = projects
    let filteredActivities = activities
    let filteredKPIs = kpis

    if (debouncedDivision) {
      const divisionSet = new Set([debouncedDivision])
      filteredProjects = filteredProjects.filter(p => {
        const division = p.responsible_division
        if (!division) return false
        const divisionsList = division.split(',').map(d => d.trim())
        return divisionsList.some(d => divisionSet.has(d))
      })
    }

    if (debouncedProjects.length > 0) {
      const debouncedProjectsSet = new Set(debouncedProjects)
      filteredProjects = filteredProjects.filter(p => 
        (p.project_full_code && debouncedProjectsSet.has(p.project_full_code)) || 
        debouncedProjectsSet.has(p.id)
      )
    }

    if (debouncedDivision || debouncedProjects.length > 0) {
      const projectFullCodesSet = new Set(filteredProjects.map(p => p.project_full_code).filter(Boolean))
      const projectIdsSet = new Set(filteredProjects.map(p => p.id))
      
      filteredActivities = filteredActivities.filter(a => {
        const activityFullCode = a.project_full_code || ''
        return projectFullCodesSet.has(activityFullCode) ||
               projectIdsSet.has(a.project_id)
      })
      
      filteredKPIs = filteredKPIs.filter(k => {
        const kpiProjectFullCode = (k as any).project_full_code || (k as any)['Project Full Code'] || ''
        return projectFullCodesSet.has(kpiProjectFullCode) ||
               ((k as any).project_id && projectIdsSet.has((k as any).project_id))
      })
    }

    const startDateTimestamp = debouncedDateRange.start ? new Date(debouncedDateRange.start).getTime() : null
    const endDateTimestamp = debouncedDateRange.end ? new Date(debouncedDateRange.end).getTime() : null
    
    if (startDateTimestamp !== null) {
      filteredActivities = filteredActivities.filter(a => {
        return new Date(a.created_at).getTime() >= startDateTimestamp
      })
      filteredKPIs = filteredKPIs.filter(k => {
        return new Date(k.created_at).getTime() >= startDateTimestamp
      })
    }

    if (endDateTimestamp !== null) {
      filteredActivities = filteredActivities.filter(a => {
        return new Date(a.created_at).getTime() <= endDateTimestamp
      })
      filteredKPIs = filteredKPIs.filter(k => {
        return new Date(k.created_at).getTime() <= endDateTimestamp
      })
    }

    return { filteredProjects, filteredActivities, filteredKPIs }
  }, [projects, activities, kpis, debouncedDivision, debouncedProjects, debouncedDateRange.start, debouncedDateRange.end])

  // Analytics computation
  const allAnalytics = useMemo(() => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData
    
    if (filteredProjects.length === 0) {
      return []
    }
    
    if (!debouncedDivision && debouncedProjects.length === 0 && !debouncedDateRange.start && !debouncedDateRange.end) {
      if (cachedAnalytics && cachedAnalytics.length > 0) {
        const filteredProjectIds = new Set(filteredProjects.map(p => p.id))
        const filteredProjectFullCodes = new Set(filteredProjects.map(p => p.project_full_code).filter(Boolean))
        
        const filtered = cachedAnalytics.filter((a: any) => {
          const project = a.project
          return filteredProjectIds.has(project.id) || 
                 (project.project_full_code && filteredProjectFullCodes.has(project.project_full_code))
        })
        return filtered
      }
    }
    
    if (computedAnalytics && computedAnalytics.length > 0) {
      return computedAnalytics
    }
    
    if (cachedAnalytics && cachedAnalytics.length > 0) {
      const filteredProjectIds = new Set(filteredProjects.map(p => p.id))
      const filteredProjectFullCodes = new Set(filteredProjects.map(p => p.project_full_code).filter(Boolean))
      
      return cachedAnalytics.filter((a: any) => {
        const project = a.project
        return filteredProjectIds.has(project.id) || 
               (project.project_full_code && filteredProjectFullCodes.has(project.project_full_code))
      })
    }
    
    return []
  }, [filteredData, cachedAnalytics, computedAnalytics, debouncedDivision, debouncedProjects, debouncedDateRange.start, debouncedDateRange.end])
  
  // Process analytics in chunks
  useEffect(() => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData
    
    if (filteredProjects.length === 0) {
      setComputedAnalytics([])
      lastProcessedDataRef.current = ''
      return
    }
    
    const dataHash = JSON.stringify({
      projects: filteredProjects.length,
      activities: filteredActivities.length,
      kpis: filteredKPIs.length,
      division: debouncedDivision,
      projectsList: debouncedProjects.sort().join(','),
      dateRange: `${debouncedDateRange.start}-${debouncedDateRange.end}`
    })
    
    if (dataHash === lastProcessedDataRef.current) {
      return
    }
    
    if (!debouncedDivision && debouncedProjects.length === 0 && !debouncedDateRange.start && !debouncedDateRange.end) {
      if (cachedAnalytics && cachedAnalytics.length > 0) {
        lastProcessedDataRef.current = dataHash
        return
      }
    }
    
    let cancelled = false
    
    const processAnalytics = async () => {
      setIsComputingAnalytics(true)
      
      try {
        const results = await processAnalyticsInChunks(
          filteredProjects,
          filteredActivities,
          filteredKPIs,
          {
            chunkSize: 50,
            onProgress: (processed, total) => {
              if (process.env.NODE_ENV === 'development') {
                console.log(`Processing analytics: ${processed}/${total}`)
              }
            }
          }
        )
        
        if (!cancelled && isMountedRef.current) {
          setComputedAnalytics(results)
          lastProcessedDataRef.current = dataHash
        }
      } catch (error) {
        console.error('Error processing analytics:', error)
        if (!cancelled && isMountedRef.current) {
          setComputedAnalytics(getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs))
          lastProcessedDataRef.current = dataHash
        }
      } finally {
        if (!cancelled) {
          setIsComputingAnalytics(false)
        }
      }
    }
    
    const timeoutId = setTimeout(() => {
      processAnalytics()
    }, 100)
    
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, debouncedDivision, debouncedProjects, debouncedDateRange.start, debouncedDateRange.end, cachedAnalytics])

  // Calculate stats (simplified version - full version in separate utility)
  const stats = useMemo((): ReportStats => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData
    
    let activeProjects = 0
    let completedProjects = 0
    for (const p of filteredProjects) {
      if (p.project_status === 'on-going' || p.project_status === 'site-preparation') {
        activeProjects++
      } else if (p.project_status === 'completed-duration' || p.project_status === 'contract-completed') {
        completedProjects++
      }
    }
    const totalProjects = filteredProjects.length

    let completedActivities = 0
    let delayedActivities = 0
    const now = Date.now()
    for (const a of filteredActivities) {
      if (a.activity_progress_percentage >= 100 || a.activity_completed) {
        completedActivities++
      }
      if (a.activity_delayed || (a.deadline && new Date(a.deadline).getTime() < now && a.activity_progress_percentage < 100)) {
        delayedActivities++
      }
    }
    const totalActivities = filteredActivities.length

    let plannedKPIs = 0
    let actualKPIs = 0
    for (const k of filteredKPIs) {
      if (k.input_type === 'Planned') {
        plannedKPIs++
      } else if (k.input_type === 'Actual') {
        actualKPIs++
      }
    }
    const totalKPIs = filteredKPIs.length

    // Financial stats calculation (simplified - full version needed)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)
    
    const parseDateString = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
        return null
      }
      try {
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? null : date
      } catch {
        return null
      }
    }
    
    const extractProjectCodes = (item: any): string[] => {
      const codes: string[] = []
      const raw = (item as any).raw || {}
      
      const fullCodeSources = [
        item.project_full_code,
        (item as any)['Project Full Code'],
        raw['Project Full Code']
      ]
      
      for (const source of fullCodeSources) {
        if (source) {
          const code = source.toString().trim()
          if (code) {
            codes.push(code)
            codes.push(code.toUpperCase())
            return Array.from(new Set(codes))
          }
        }
      }
      
      const codeSources = [
        item.project_code,
        (item as any)['Project Code'],
        raw['Project Code']
      ]
      
      for (const source of codeSources) {
        if (source) {
          const code = source.toString().trim()
          if (code) {
            codes.push(code)
            codes.push(code.toUpperCase())
          }
        }
      }
      
      return Array.from(new Set(codes))
    }
    
    const codesMatch = (itemCodes: string[], targetCodes: string[]): boolean => {
      const targetCodesUpper = targetCodes.map(c => c.toUpperCase().trim())
      const itemCodesUpper = itemCodes.map(c => c.toUpperCase().trim())
      
      for (const itemCode of itemCodesUpper) {
        if (targetCodesUpper.includes(itemCode)) {
          return true
        }
      }
      
      for (const itemCode of itemCodesUpper) {
        for (const targetCode of targetCodesUpper) {
          const itemHasDash = itemCode.includes('-')
          const targetHasDash = targetCode.includes('-')
          
          if (itemHasDash || targetHasDash) {
            if (itemCode === targetCode) {
              return true
            }
          } else {
            if (itemCode.startsWith(targetCode) || targetCode.startsWith(itemCode)) {
              return true
            }
          }
        }
      }
      
      return false
    }
    
    const selectedProjectCodesList: string[] = []
    filteredProjects.forEach((project: Project) => {
      const projectCodes = extractProjectCodes(project)
      selectedProjectCodesList.push(...projectCodes)
    })
    const selectedProjectCodes = Array.from(new Set(selectedProjectCodesList))
    
    const kpiMatchesProjects = (kpi: any): boolean => {
      if (selectedProjectCodes.length === 0) {
        return true
      }
      
      const kpiCodes = extractProjectCodes(kpi)
      return codesMatch(kpiCodes, selectedProjectCodes)
    }
    
    let totalValue = 0
    let totalPlannedValue = 0
    let totalEarnedValue = 0
    
    const getKPIValue = (kpi: any, valueType: 'planned' | 'actual'): number => {
      const rawKPI = (kpi as any).raw || {}
      
      if (valueType === 'planned') {
        const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
        if (plannedValue > 0) return plannedValue
      } else {
        const actualValue = kpi.actual_value || parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, '')) || 0
        if (actualValue > 0) return actualValue
      }
      
      let kpiValue = 0
      if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
        const val = rawKPI['Value']
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
        const val = rawKPI.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
        const val = kpi.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      return kpiValue
    }
    
    for (const kpi of kpis) {
      const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || (kpi as any).raw?.['input_type'] || '').trim().toLowerCase()
      
      if (!kpiMatchesProjects(kpi)) continue
      
      if (inputType === 'planned') {
        const kpiValue = getKPIValue(kpi, 'planned')
        if (kpiValue > 0) {
          totalValue += kpiValue
          
          const rawKPI = (kpi as any).raw || {}
          const kpiDateStr = kpi.activity_date ||
                            kpi.target_date ||
                            rawKPI['Activity Date'] ||
                            rawKPI['Target Date'] ||
                            rawKPI['Day'] ||
                            (kpi as any).day ||
                            ''
          
          if (kpiDateStr) {
            const kpiDate = parseDateString(kpiDateStr)
            if (!kpiDate || kpiDate <= yesterday) {
              totalPlannedValue += kpiValue
            }
          } else {
            totalPlannedValue += kpiValue
          }
        }
      } else if (inputType === 'actual') {
        const kpiValue = getKPIValue(kpi, 'actual')
        if (kpiValue > 0) {
          totalEarnedValue += kpiValue
        }
      }
    }
    
    const variance = totalEarnedValue - totalPlannedValue
    const overallProgress = totalValue > 0 ? (totalEarnedValue / totalValue) * 100 : 0

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalActivities,
      completedActivities,
      delayedActivities,
      totalKPIs,
      plannedKPIs,
      actualKPIs,
      totalValue,
      earnedValue: totalEarnedValue,
      plannedValue: totalPlannedValue,
      variance,
      overallProgress
    }
  }, [filteredData, kpis])

  // Formatting functions
  const formatCurrency = useCallback((amount: number, currencyCode?: string) => {
    return formatCurrencyByCodeSync(amount || 0, currencyCode || 'AED')
  }, [])

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }, [])

  const formatPercentage = useCallback((num: number) => {
    return `${num.toFixed(1)}%`
  }, [])

  // Get unique divisions
  const divisions = useMemo(() => {
    const allDivisions = new Set<string>()
    
    projects.forEach((p: Project) => {
      const division = p.responsible_division
      if (division) {
        const divisionsList = division.split(',').map(d => d.trim()).filter(Boolean)
        divisionsList.forEach(d => allDivisions.add(d))
      }
    })
    
    return Array.from(allDivisions).sort()
  }, [projects])

  return {
    projects,
    activities,
    kpis,
    loading,
    error,
    isFromCache,
    stats,
    filteredData,
    allAnalytics,
    isComputingAnalytics,
    formatCurrency,
    formatNumber,
    formatPercentage,
    divisions,
    selectedDivision,
    setSelectedDivision,
    selectedProjects,
    setSelectedProjects,
    dateRange,
    setDateRange,
    showProjectDropdown,
    setShowProjectDropdown,
    projectSearch,
    setProjectSearch,
    projectDropdownRef,
    refreshData: fetchAllData
  }
}


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

// ============================================================================
// Constants
// ============================================================================

const CACHE_KEYS = {
  projects: 'reports_cache_projects',
  activities: 'reports_cache_activities',
  kpis: 'reports_cache_kpis',
  analytics: 'reports_cache_analytics',
  timestamp: 'reports_cache_timestamp'
} as const

const CACHE_EXPIRATION_MS = 30 * 60 * 1000 // 30 minutes
const DEBOUNCE_DELAY_MS = 200 // Default debounce delay
const DEBOUNCE_DELAY_WITH_DATE_MS = 500 // Longer delay when date filters are active
const FETCH_CHUNK_SIZE = 5000 // Records per fetch chunk
const ANALYTICS_CHUNK_SIZE = 50 // Projects per analytics chunk

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all cached data
 */
function clearCache(): void {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Cache cleared')
    }
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
  }
}

/**
 * Load data from cache if available and not expired
 * ✅ FIX: Also validates cache completeness (rejects incomplete caches)
 */
function loadFromCache(): {
  projects: Project[]
  activities: BOQActivity[]
  kpis: ProcessedKPI[]
  analytics: any[] | null
} | null {
  try {
    const timestamp = localStorage.getItem(CACHE_KEYS.timestamp)
    if (!timestamp) {
      return null
    }

    const cacheAge = Date.now() - parseInt(timestamp, 10)
    if (cacheAge > CACHE_EXPIRATION_MS) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏰ Cache expired, will fetch fresh data')
      }
      return null
    }

    const cachedProjects = localStorage.getItem(CACHE_KEYS.projects)
    const cachedActivities = localStorage.getItem(CACHE_KEYS.activities)
    const cachedKPIs = localStorage.getItem(CACHE_KEYS.kpis)
    const cachedAnalytics = localStorage.getItem(CACHE_KEYS.analytics)

    if (!cachedProjects || !cachedKPIs) {
      return null
    }

    const projects = JSON.parse(cachedProjects) as Project[]
    const kpis = JSON.parse(cachedKPIs) as ProcessedKPI[]
    const activities = cachedActivities ? (JSON.parse(cachedActivities) as BOQActivity[]) : []
    const analytics = cachedAnalytics ? (JSON.parse(cachedAnalytics) as any[]) : null

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Cache validation:', {
        projectsCount: projects.length,
        activitiesCount: activities.length,
        kpisCount: kpis.length,
        analyticsCount: analytics?.length || 0
      })
    }

    // ✅ FIX: Validate cache completeness - reject incomplete caches
    // If activities or KPIs are suspiciously low (exactly 1000 or less), it might be incomplete
    // This handles old caches that were saved with limited data
    const MIN_EXPECTED_ACTIVITIES = 2000 // Minimum expected activities (adjust based on your data)
    const MIN_EXPECTED_KPIS = 2000 // Minimum expected KPIs (adjust based on your data)
    
    // Check if cache looks incomplete (exactly 1000 is suspicious - might be old limit)
    const activitiesLookIncomplete = activities.length > 0 && activities.length <= 1000 && activities.length < MIN_EXPECTED_ACTIVITIES
    const kpisLookIncomplete = kpis.length > 0 && kpis.length <= 1000 && kpis.length < MIN_EXPECTED_KPIS
    
    if (activitiesLookIncomplete || kpisLookIncomplete) {
      console.warn(
        `⚠️ Cache appears incomplete: ${activities.length} activities, ${kpis.length} KPIs. Clearing cache and fetching ALL data from database...`
      )
      console.warn('   This usually means the cache was saved with incomplete data (e.g., only 1000 records).')
      clearCache()
      return null
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ Loaded from cache: ${projects.length} projects, ${activities.length} activities, ${kpis.length} KPIs${analytics ? `, ${analytics.length} analytics` : ''} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`
      )
    }

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
}

/**
 * Save data to cache with error handling for quota exceeded
 */
function saveToCache(
  projects: Project[],
  activities: BOQActivity[],
  kpis: ProcessedKPI[],
  analytics?: any[]
): void {
  try {
    // Clear old cache first
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        if (key !== CACHE_KEYS.timestamp) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      // Ignore errors when clearing
    }

    // Save essential data (projects and KPIs)
    try {
      const projectsJson = JSON.stringify(projects)
      const kpisJson = JSON.stringify(kpis)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Attempting to save to cache:', {
          projectsSize: `${(projectsJson.length / 1024).toFixed(2)} KB`,
          kpisSize: `${(kpisJson.length / 1024).toFixed(2)} KB`,
          kpisCount: kpis.length,
          activitiesCount: activities.length
        })
      }
      
      localStorage.setItem(CACHE_KEYS.projects, projectsJson)
      localStorage.setItem(CACHE_KEYS.kpis, kpisJson)
      localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString())
      
      // ✅ VERIFY: Check that data was actually saved
      const savedKPIs = localStorage.getItem(CACHE_KEYS.kpis)
      if (savedKPIs) {
        const parsedKPIs = JSON.parse(savedKPIs)
        if (parsedKPIs.length !== kpis.length) {
          console.error(`❌ CRITICAL: KPIs cache mismatch! Tried to save ${kpis.length}, but only ${parsedKPIs.length} were saved!`)
          // Clear cache and don't save incomplete data
          clearCache()
          return
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Essential data saved to cache: ${projects.length} projects, ${kpis.length} KPIs`)
      }
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.error('❌ localStorage QUOTA EXCEEDED! Cannot save cache. Data will be fetched fresh next time.')
        console.error(`   KPIs size: ${(JSON.stringify(kpis).length / 1024 / 1024).toFixed(2)} MB`)
        clearCache()
        return
      }
      console.error('❌ Error saving essential data to cache:', error)
      throw error
    }

    // Save activities (may be large)
    try {
      const activitiesJson = JSON.stringify(activities)
      localStorage.setItem(CACHE_KEYS.activities, activitiesJson)
      
      // ✅ VERIFY: Check that data was actually saved
      const savedActivities = localStorage.getItem(CACHE_KEYS.activities)
      if (savedActivities) {
        const parsedActivities = JSON.parse(savedActivities)
        if (parsedActivities.length !== activities.length) {
          console.error(`❌ CRITICAL: Activities cache mismatch! Tried to save ${activities.length}, but only ${parsedActivities.length} were saved!`)
          // Remove activities from cache but keep other data
          localStorage.removeItem(CACHE_KEYS.activities)
        } else if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Activities saved to cache: ${activities.length} activities`)
        }
      }
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.warn(`⚠️ Activities too large for cache (${activities.length} items), skipping activities`)
        // Remove activities from cache but keep other data
        try {
          localStorage.removeItem(CACHE_KEYS.activities)
        } catch (e) {
          // Ignore
        }
      } else {
        console.error('❌ Error saving activities to cache:', error)
        throw error
      }
    }

    // Save analytics in compact format
    if (analytics && analytics.length > 0) {
      try {
        const compactAnalytics = analytics.map((a: any) => ({
          project: {
            id: a.project.id,
            project_code: a.project.project_code,
            project_full_code: a.project.project_full_code
          },
          totalValue: a.totalValue,
          totalEarnedValue: a.totalEarnedValue,
          totalPlannedValue: a.totalPlannedValue,
          totalRemainingValue: a.totalRemainingValue,
          variance: a.variance,
          variancePercentage: a.variancePercentage,
          projectStatus: a.projectStatus
        }))
        localStorage.setItem(CACHE_KEYS.analytics, JSON.stringify(compactAnalytics))
        if (process.env.NODE_ENV === 'development') {
          console.log(`💾 Analytics saved to cache (compact format: ${analytics.length} items)`)
        }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Cache cleared and timestamp saved')
      }
    } catch (finalError) {
      console.error('❌ Failed to save even timestamp:', finalError)
    }
  }
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch all records from a table with pagination
 * ✅ FIX: Fetches ALL records regardless of size, using 1000 per chunk (Supabase limit) and 3 chunks in parallel
 */
async function fetchAllRecords(supabase: any, table: string): Promise<any[]> {
  const allData: any[] = []
  let offset = 0
  let hasMore = true
  let chunkNumber = 0
  
  // ✅ FIX: Use 1000 as actual chunk size (Supabase's hard limit per request)
  // Fetch 3 chunks in parallel for better performance
  const CHUNK_SIZE = 1000 // Supabase's actual limit - don't request more than this
  const PARALLEL_CHUNKS = 3 // Fetch 3 chunks in parallel (3000 records per batch)

  while (hasMore) {
    // ✅ Fetch 3 chunks in parallel (each 1000 records)
    const parallelPromises: Promise<any>[] = []
    const chunkOffsets: number[] = []
    
    for (let i = 0; i < PARALLEL_CHUNKS; i++) {
      const currentOffset = offset + (i * CHUNK_SIZE)
      chunkOffsets.push(currentOffset)
      
      parallelPromises.push(
        supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + CHUNK_SIZE - 1)
      )
    }

    // Wait for all parallel requests to complete
    const results = await Promise.all(parallelPromises)
    
    let anyDataReceived = false
    let totalReceivedInBatch = 0
    let allChunksComplete = true // Track if all chunks returned full data

    for (let i = 0; i < results.length; i++) {
      const { data, error } = results[i]
      const currentChunkNumber = chunkNumber + i + 1

      if (error) {
        console.error(`❌ Error fetching ${table} chunk ${currentChunkNumber}:`, error)
        // If it's a range error (out of bounds), we've reached the end
        if (error.code === 'PGRST116' || error.message?.includes('range')) {
          allChunksComplete = false
        }
        continue
      }

      if (!data || data.length === 0) {
        // No data means we've reached the end for this chunk
        allChunksComplete = false
        continue
      }

      anyDataReceived = true
      totalReceivedInBatch += data.length
      allData.push(...data)

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `📥 Fetched ${table} chunk ${currentChunkNumber}: ${data.length} records (offset: ${chunkOffsets[i]}, total so far: ${allData.length})`
        )
      }

      // ✅ CRITICAL: If we got less than CHUNK_SIZE (1000), this chunk is complete
      // But we continue with other chunks in the batch
      if (data.length < CHUNK_SIZE) {
        allChunksComplete = false
      }
    }

    // ✅ FIX: Stop only if we got no data at all, or all chunks returned less than full size
    if (!anyDataReceived) {
      hasMore = false
      break
    }

    // ✅ FIX: Continue fetching if we got any data
    // Increment offset by the number of chunks we fetched in parallel
    offset += CHUNK_SIZE * PARALLEL_CHUNKS
    chunkNumber += PARALLEL_CHUNKS
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   → Batch complete: ${totalReceivedInBatch} records in this batch (${allChunksComplete ? 'more data available' : 'reaching end'}), continuing...`)
    }

    // ✅ FIX: Stop if all chunks returned less than full size (we've reached the end)
    if (!allChunksComplete) {
      hasMore = false
      break
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Total ${table} records fetched: ${allData.length} (in ${chunkNumber} chunk(s))`)
  }

  return allData
}

// ============================================================================
// Main Hook
// ============================================================================

export function useReportsData() {
  // ============================================================================
  // State Management
  // ============================================================================

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
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })

  // Multi-select dropdown states
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const projectDropdownRef = useRef<HTMLDivElement>(null)

  // Debounced filter values
  const [debouncedDivision, setDebouncedDivision] = useState<string>('')
  const [debouncedProjects, setDebouncedProjects] = useState<string[]>([])
  const [debouncedDateRange, setDebouncedDateRange] = useState<{
    start: string
    end: string
  }>({ start: '', end: '' })

  // ============================================================================
  // Refs and External Dependencies
  // ============================================================================

  const { startSmartLoading, stopSmartLoading } = useSmartLoading('modern-reports')
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessedDataRef = useRef<string>('')
  const loadingFunctionsRef = useRef({ startSmartLoading, stopSmartLoading })
  const hasLoadedRef = useRef(false)

  // Update loading functions ref when they change
  useEffect(() => {
    loadingFunctionsRef.current = { startSmartLoading, stopSmartLoading }
  }, [startSmartLoading, stopSmartLoading])

  // ============================================================================
  // Dropdown Click Outside Handler
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ============================================================================
  // Debounce Filter Changes
  // ============================================================================

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const debounceTime =
      dateRange.start || dateRange.end ? DEBOUNCE_DELAY_WITH_DATE_MS : DEBOUNCE_DELAY_MS

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

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchAllData = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        // Try to load from cache first (unless force refresh)
        if (!forceRefresh) {
          const cachedData = loadFromCache()
          if (cachedData) {
            if (isMountedRef.current) {
              console.log('📊 Setting data from cache to state:', {
                projects: cachedData.projects.length,
                activities: cachedData.activities.length,
                kpis: cachedData.kpis.length,
                analytics: cachedData.analytics?.length || 0
              })
              
              setProjects(cachedData.projects)
              setActivities(cachedData.activities)
              setKpis(cachedData.kpis)
              if (cachedData.analytics) {
                setCachedAnalytics(cachedData.analytics)
              }
              setLoading(false)
              setIsFromCache(true)
              
              console.log('✅ Data from cache set to state successfully')
            }
            return
          }
        }

        // Fetch fresh data from database
        setIsFromCache(false)
        setCachedAnalytics(null)

        console.log('🔄 Fetching ALL data from database (this may take a moment)...')
        loadingFunctionsRef.current.startSmartLoading(setLoading)
        setError('')

        // Fetch all data in parallel
        const [projectsData, activitiesData, kpisData] = await Promise.all([
          fetchAllRecords(supabase, TABLES.PROJECTS),
          fetchAllRecords(supabase, TABLES.BOQ_ACTIVITIES),
          fetchAllRecords(supabase, TABLES.KPI)
        ])

        // Map and process data
        const mappedProjects = (projectsData || []).map(mapProjectFromDB)
        const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
        const mappedKPIs = (kpisData || []).map(mapKPIFromDB)
        
        // ✅ FIX: Fill missing Activity Name and Project Code from Activities and Projects
        // Create lookup maps for fast access
        const activitiesMap = new Map<string, BOQActivity>()
        const projectsMap = new Map<string, Project>()
        
        mappedActivities.forEach((activity: BOQActivity) => {
          if (activity.id) {
            activitiesMap.set(activity.id, activity)
          }
          // Also index by activity_name for matching
          if (activity.activity_name) {
            const key = `${activity.project_full_code || activity.project_code}_${activity.activity_name}`
            activitiesMap.set(key, activity)
          }
        })
        
        mappedProjects.forEach((project: Project) => {
          if (project.id) {
            projectsMap.set(project.id, project)
          }
          if (project.project_full_code) {
            projectsMap.set(project.project_full_code, project)
          }
        })
        
        // ✅ Fill missing data in KPIs
        let fixedCount = 0
        mappedKPIs.forEach((kpi: any) => {
          let needsFix = false
          
          // Fix Activity Name from activity_id
          if ((!kpi.activity_name || kpi.activity_name === 'N/A' || kpi.activity_name === '') && kpi.activity_id) {
            const activity = activitiesMap.get(kpi.activity_id)
            if (activity && activity.activity_name) {
              kpi.activity_name = activity.activity_name
              kpi.activity = activity.activity_name
              kpi.kpi_name = activity.activity_name
              needsFix = true
            }
          }
          
          // Fix Project Code from project_id
          if ((!kpi.project_full_code || kpi.project_full_code === 'N/A' || kpi.project_full_code === '') && kpi.project_id) {
            const project = projectsMap.get(kpi.project_id)
            if (project) {
              kpi.project_full_code = project.project_full_code || project.project_code || 'N/A'
              kpi.project_code = project.project_code || 'N/A'
              kpi.project_sub_code = project.project_sub_code || ''
              needsFix = true
            }
          }
          
          // Fix Project Code from project_full_code lookup
          if ((!kpi.project_full_code || kpi.project_full_code === 'N/A' || kpi.project_full_code === '') && kpi.project_code) {
            const project = projectsMap.get(kpi.project_code)
            if (project) {
              kpi.project_full_code = project.project_full_code || project.project_code || 'N/A'
              needsFix = true
            }
          }
          
          // Try to match Activity by project + activity name pattern
          if ((!kpi.activity_name || kpi.activity_name === 'N/A' || kpi.activity_name === '') && kpi.project_full_code) {
            // Try to find activity by matching project and any activity name
            activitiesMap.forEach((activity, key) => {
              if (key.includes('_') && activity.project_full_code === kpi.project_full_code && !needsFix) {
                // Use first matching activity as fallback
                kpi.activity_name = activity.activity_name || 'N/A'
                kpi.activity = activity.activity_name || 'N/A'
                kpi.kpi_name = activity.activity_name || 'N/A'
                needsFix = true
              }
            })
          }
          
          if (needsFix) {
            fixedCount++
          }
        })
        
        if (process.env.NODE_ENV === 'development' && fixedCount > 0) {
          console.log(`✅ Fixed ${fixedCount} KPIs with missing Activity Name or Project Code`)
        }
        
        const processedKPIs = mappedKPIs.map(processKPIRecord)

        // Calculate analytics
        const calculatedAnalytics = getAllProjectsAnalytics(
          mappedProjects,
          mappedActivities,
          processedKPIs
        )

        if (isMountedRef.current) {
          console.log('📊 Setting data to state:', {
            projects: mappedProjects.length,
            activities: mappedActivities.length,
            kpis: processedKPIs.length,
            analytics: calculatedAnalytics.length,
            rawProjectsData: projectsData.length,
            rawActivitiesData: activitiesData.length,
            rawKPIsData: kpisData.length
          })
          
          // ✅ CRITICAL: Set data to state FIRST (before cache)
          // This ensures data is available even if cache fails
          setProjects(mappedProjects)
          setActivities(mappedActivities)
          setKpis(processedKPIs)
          setCachedAnalytics(calculatedAnalytics)
          
          // ✅ VERIFY: Check that state was set correctly
          // Note: We can't verify immediately due to React's async state updates,
          // but we log the data we're setting
          console.log('✅ Data set to state successfully:', {
            projectsSet: mappedProjects.length,
            activitiesSet: mappedActivities.length,
            kpisSet: processedKPIs.length
          })
          
          // Save to cache AFTER setting state (so data is available even if cache fails)
          try {
            saveToCache(mappedProjects, mappedActivities, processedKPIs, calculatedAnalytics)
          } catch (cacheError) {
            console.error('❌ Cache save failed, but data is in state:', cacheError)
            // Data is already in state, so we continue
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `✅ Reports data loaded: ${mappedProjects.length} projects, ${mappedActivities.length} activities, ${processedKPIs.length} KPIs, ${calculatedAnalytics.length} analytics`
          )
        }
      } catch (error: any) {
        console.error('❌ Error loading data:', error)
        if (isMountedRef.current) {
          setError('Failed to load report data: ' + (error.message || 'Unknown error'))
        }
      } finally {
        if (isMountedRef.current) {
          loadingFunctionsRef.current.stopSmartLoading(setLoading)
        }
      }
    },
    [supabase]
  )

  // ============================================================================
  // Initial Data Load
  // ============================================================================

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

  // ============================================================================
  // Data Filtering
  // ============================================================================

  const filteredData = useMemo((): FilteredData => {
    // ✅ DEBUG: Log data availability
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 FilteredData calculation:', {
        projectsCount: projects.length,
        activitiesCount: activities.length,
        kpisCount: kpis.length,
        hasFilters: debouncedDivision || debouncedProjects.length > 0 || debouncedDateRange.start || debouncedDateRange.end,
        debouncedDivision,
        debouncedProjects: debouncedProjects.length,
        dateRange: debouncedDateRange
      })
    }

    const hasFilters =
      debouncedDivision ||
      debouncedProjects.length > 0 ||
      debouncedDateRange.start ||
      debouncedDateRange.end

    if (!hasFilters) {
      return {
        filteredProjects: projects,
        filteredActivities: activities,
        filteredKPIs: kpis
      }
    }

    let filteredProjects = projects
    let filteredActivities = activities
    let filteredKPIs = kpis

    // Filter by division
    if (debouncedDivision) {
      const divisionSet = new Set([debouncedDivision])
      filteredProjects = filteredProjects.filter(p => {
        const division = p.responsible_division
        if (!division) return false
        const divisionsList = division.split(',').map(d => d.trim())
        return divisionsList.some(d => divisionSet.has(d))
      })
    }

    // Filter by selected projects
    if (debouncedProjects.length > 0) {
      const debouncedProjectsSet = new Set(debouncedProjects)
      filteredProjects = filteredProjects.filter(
        p =>
          (p.project_full_code && debouncedProjectsSet.has(p.project_full_code)) ||
          debouncedProjectsSet.has(p.id)
      )
    }

    // Filter activities and KPIs based on filtered projects
    if (debouncedDivision || debouncedProjects.length > 0) {
      const projectFullCodesSet = new Set(
        filteredProjects.map(p => p.project_full_code).filter(Boolean)
      )
      const projectIdsSet = new Set(filteredProjects.map(p => p.id))

      filteredActivities = filteredActivities.filter(a => {
        const activityFullCode = a.project_full_code || ''
        return (
          projectFullCodesSet.has(activityFullCode) || projectIdsSet.has(a.project_id)
        )
      })

      filteredKPIs = filteredKPIs.filter(k => {
        const kpiProjectFullCode =
          (k as any).project_full_code || (k as any)['Project Full Code'] || ''
        return (
          projectFullCodesSet.has(kpiProjectFullCode) ||
          ((k as any).project_id && projectIdsSet.has((k as any).project_id))
        )
      })
    }

    // Filter by date range
    const startDateTimestamp = debouncedDateRange.start
      ? new Date(debouncedDateRange.start).getTime()
      : null
    const endDateTimestamp = debouncedDateRange.end
      ? new Date(debouncedDateRange.end).getTime()
      : null

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

    // ✅ DEBUG: Log filtered results
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ FilteredData result:', {
        filteredProjectsCount: filteredProjects.length,
        filteredActivitiesCount: filteredActivities.length,
        filteredKPIsCount: filteredKPIs.length
      })
    }

    return { filteredProjects, filteredActivities, filteredKPIs }
  }, [
    projects,
    activities,
    kpis,
    debouncedDivision,
    debouncedProjects,
    debouncedDateRange.start,
    debouncedDateRange.end
  ])

  // ============================================================================
  // Analytics Computation
  // ============================================================================

  const allAnalytics = useMemo(() => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData

    if (filteredProjects.length === 0) {
      return []
    }

    const hasFilters =
      debouncedDivision ||
      debouncedProjects.length > 0 ||
      debouncedDateRange.start ||
      debouncedDateRange.end

    // If no filters, use cached analytics if available
    if (!hasFilters) {
      if (cachedAnalytics && cachedAnalytics.length > 0) {
        const filteredProjectIds = new Set(filteredProjects.map(p => p.id))
        const filteredProjectFullCodes = new Set(
          filteredProjects.map(p => p.project_full_code).filter(Boolean)
        )

        const filtered = cachedAnalytics.filter((a: any) => {
          const project = a.project
          return (
            filteredProjectIds.has(project.id) ||
            (project.project_full_code &&
              filteredProjectFullCodes.has(project.project_full_code))
          )
        })

        if (filtered.length === 0 && filteredProjects.length > 0) {
          // Recalculate if filtered to empty
          return getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs)
        }
        return filtered
      }

      // Calculate if no cached analytics
      if (filteredProjects.length > 0) {
        return getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs)
      }
    }

    // Use computed analytics if available (for filtered data)
    if (computedAnalytics && computedAnalytics.length > 0) {
      return computedAnalytics
    }

    // Use cached analytics with filters applied
    if (cachedAnalytics && cachedAnalytics.length > 0) {
      const filteredProjectIds = new Set(filteredProjects.map(p => p.id))
      const filteredProjectFullCodes = new Set(
        filteredProjects.map(p => p.project_full_code).filter(Boolean)
      )

      const filtered = cachedAnalytics.filter((a: any) => {
        const project = a.project
        return (
          filteredProjectIds.has(project.id) ||
          (project.project_full_code &&
            filteredProjectFullCodes.has(project.project_full_code))
        )
      })

      if (filtered.length === 0 && filteredProjects.length > 0) {
        // Recalculate if filtered to empty
        return getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs)
      }
      return filtered
    }

    // Calculate from filtered data if no cached or computed analytics
    if (filteredProjects.length > 0) {
      return getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs)
    }

    return []
  }, [
    filteredData,
    cachedAnalytics,
    computedAnalytics,
    debouncedDivision,
    debouncedProjects,
    debouncedDateRange.start,
    debouncedDateRange.end
  ])

  // Process analytics in chunks when filters change
  useEffect(() => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData

    if (filteredProjects.length === 0) {
      setComputedAnalytics([])
      lastProcessedDataRef.current = ''
      return
    }

    const hasFilters =
      debouncedDivision ||
      debouncedProjects.length > 0 ||
      debouncedDateRange.start ||
      debouncedDateRange.end

    // Create data hash to detect changes
    const dataHash = JSON.stringify({
      projects: filteredProjects.length,
      activities: filteredActivities.length,
      kpis: filteredKPIs.length,
      division: debouncedDivision,
      projectsList: debouncedProjects.sort().join(','),
      dateRange: `${debouncedDateRange.start}-${debouncedDateRange.end}`
    })

    // Skip if data hasn't changed
    if (dataHash === lastProcessedDataRef.current) {
      return
    }

    // Skip computation if no filters and cached analytics available
    if (!hasFilters && cachedAnalytics && cachedAnalytics.length > 0) {
      lastProcessedDataRef.current = dataHash
      return
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
            chunkSize: ANALYTICS_CHUNK_SIZE,
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
        console.error('❌ Error processing analytics:', error)
        if (!cancelled && isMountedRef.current) {
          setComputedAnalytics(
            getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs)
          )
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

  // ============================================================================
  // Stats Calculation
  // ============================================================================

  const stats = useMemo((): ReportStats => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData

    // Project stats
    let activeProjects = 0
    let completedProjects = 0
    for (const p of filteredProjects) {
      if (p.project_status === 'on-going' || p.project_status === 'site-preparation') {
        activeProjects++
      } else if (
        p.project_status === 'completed-duration' ||
        p.project_status === 'contract-completed'
      ) {
        completedProjects++
      }
    }
    const totalProjects = filteredProjects.length

    // Activity stats
    let completedActivities = 0
    let delayedActivities = 0
    const now = Date.now()
    for (const a of filteredActivities) {
      if (a.activity_progress_percentage >= 100 || a.activity_completed) {
        completedActivities++
      }
      if (
        a.activity_delayed ||
        (a.deadline &&
          new Date(a.deadline).getTime() < now &&
          a.activity_progress_percentage < 100)
      ) {
        delayedActivities++
      }
    }
    const totalActivities = filteredActivities.length

    // KPI stats
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

    // Financial stats calculation
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
        const plannedValue =
          kpi.planned_value ||
          parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) ||
          0
        if (plannedValue > 0) return plannedValue
      } else {
        const actualValue =
          kpi.actual_value ||
          parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, '')) ||
          0
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

    // ✅ FIX: Use filteredKPIs instead of all kpis for financial calculations
    for (const kpi of filteredKPIs) {
      const inputType = String(
        kpi.input_type ||
          (kpi as any).raw?.['Input Type'] ||
          (kpi as any).raw?.['input_type'] ||
          ''
      )
        .trim()
        .toLowerCase()

      // ✅ FIX: Only check project matching if we have filtered projects
      // If no filters, all KPIs should be included
      if (selectedProjectCodes.length > 0 && !kpiMatchesProjects(kpi)) continue

      if (inputType === 'planned') {
        const kpiValue = getKPIValue(kpi, 'planned')
        if (kpiValue > 0) {
          totalValue += kpiValue

          const rawKPI = (kpi as any).raw || {}
          const kpiDateStr =
            kpi.activity_date ||
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

    // ✅ DEBUG: Log stats calculation in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Stats calculated:', {
        totalProjects,
        totalActivities,
        totalKPIs,
        totalValue,
        earnedValue: totalEarnedValue,
        plannedValue: totalPlannedValue,
        variance,
        overallProgress,
        filteredProjectsCount: filteredProjects.length,
        filteredActivitiesCount: filteredActivities.length,
        filteredKPIsCount: filteredKPIs.length,
        allKPIsCount: kpis.length
      })
    }

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

  // ============================================================================
  // Formatting Functions
  // ============================================================================

  const formatCurrency = useCallback((amount: number, currencyCode?: string) => {
    return formatCurrencyByCodeSync(amount || 0, currencyCode || 'AED')
  }, [])

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }, [])

  const formatPercentage = useCallback((num: number) => {
    return `${num.toFixed(1)}%`
  }, [])

  // ============================================================================
  // Derived Data
  // ============================================================================

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

  // ============================================================================
  // Return Values
  // ============================================================================

  return {
    // Data
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

    // Formatting
    formatCurrency,
    formatNumber,
    formatPercentage,

    // Filters
    divisions,
    selectedDivision,
    setSelectedDivision,
    selectedProjects,
    setSelectedProjects,
    dateRange,
    setDateRange,

    // Project dropdown
    showProjectDropdown,
    setShowProjectDropdown,
    projectSearch,
    setProjectSearch,
    projectDropdownRef,

    // Actions
    refreshData: fetchAllData
  }
}

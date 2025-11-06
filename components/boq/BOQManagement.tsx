'use client'

import { useEffect, useState, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { BOQActivity, Project, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapProjectFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateActivityRate, ActivityRate } from '@/lib/rateCalculator'
import { calculateActivityProgress, ActivityProgress } from '@/lib/progressCalculator'
import { autoSaveActivityCalculations, autoSaveOnBOQUpdate } from '@/lib/autoCalculationSaver'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { IntelligentBOQForm } from './IntelligentBOQForm'
import { BOQTable } from './BOQTable'
import { BOQTableWithCustomization } from './BOQTableWithCustomization'
import { Pagination } from '@/components/ui/Pagination'
import { Plus, ClipboardList, CheckCircle, Clock, AlertCircle, Filter, X, Search, Lock, Building2, ChevronDown } from 'lucide-react'
import { ExportButton } from '@/components/ui/ExportButton'
import { ImportButton } from '@/components/ui/ImportButton'
import { PrintButton } from '@/components/ui/PrintButton'
import { PermissionButton } from '@/components/ui/PermissionButton'

interface BOQManagementProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function BOQManagement({ globalSearchTerm = '', globalFilters = { project: '', status: '', division: '', dateRange: '' } }: BOQManagementProps = {}) {
  const guard = usePermissionGuard()
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [allKPIs, setAllKPIs] = useState<any[]>([]) // Store all KPIs to pass to sub-components
  const [activityRates, setActivityRates] = useState<ActivityRate[]>([])
  const [activityProgresses, setActivityProgresses] = useState<ActivityProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<BOQActivity | null>(null)
  // ✅ Standard View - only enable if user has permission
  const [useCustomizedTable, setUseCustomizedTable] = useState(false)
  const [hasInitializedView, setHasInitializedView] = useState(false)
  
  // Ensure Standard View is only enabled if user has permission (only on initial load)
  useEffect(() => {
    // Only set initial value once, not on every guard change
    if (!hasInitializedView) {
      if (guard.hasAccess('boq.view')) {
        setUseCustomizedTable(true)
      } else {
        setUseCustomizedTable(false)
      }
      setHasInitializedView(true)
    }
  }, [guard, hasInitializedView])
  
  // Zone Management
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [availableZones, setAvailableZones] = useState<string[]>([])
  
  // ✅ Simple Filter State
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    project: [] as string[], // ✅ Changed to array to support multiple projects
    division: '',
    status: '',
    zone: ''
  })
  const [filteredActivities, setFilteredActivities] = useState<BOQActivity[]>([])
  
  // ✅ Project Searchable Dropdown State
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50) // 50 items per page for better performance
  
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('boq') // ✅ Smart loading
  
  // ✅ Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // ✅ Get selected projects names for display
  const getSelectedProjectsNames = () => {
    if (!filters.project || filters.project.length === 0) return ''
    if (filters.project.length === 1) {
      const selectedProject = projects.find(p => p.project_code === filters.project[0])
      return selectedProject ? `${selectedProject.project_code} - ${selectedProject.project_name}` : filters.project[0]
    }
    return `${filters.project.length} projects selected`
  }
  
  // ✅ Toggle project selection
  const toggleProject = (projectCode: string) => {
    setFilters(prev => {
      const currentProjects = prev.project || []
      if (currentProjects.includes(projectCode)) {
        // Remove project
        return { ...prev, project: currentProjects.filter(p => p !== projectCode) }
      } else {
        // Add project
        return { ...prev, project: [...currentProjects, projectCode] }
      }
    })
  }
  
  // ✅ Apply filters automatically when project selection changes (via toggleProject)
  // Note: handleFilterChange already calls applyFiltersToDatabase, so we only need to handle toggleProject
  const prevProjectsRef = useRef<string[]>([])
  useEffect(() => {
    // Only trigger if project selection actually changed (not from handleFilterChange)
    const projectsChanged = JSON.stringify(prevProjectsRef.current) !== JSON.stringify(filters.project)
    if (projectsChanged) {
      prevProjectsRef.current = [...filters.project] // Deep copy
      
      // Only apply if projects are selected (toggleProject was used)
      // handleFilterChange already handles other filter changes
      if (filters.project.length > 0) {
        console.log('🔄 Project selection changed via toggleProject, applying filters...')
        applyFiltersToDatabase(filters)
        setCurrentPage(1)
      } else if (filters.project.length === 0 && !filters.search && !filters.division && !filters.status && !filters.zone) {
        // Clear activities if no filters are applied
        console.log('🧹 No filters applied, clearing activities...')
        setActivities([])
        setFilteredActivities([])
        setTotalCount(0)
      }
    }
  }, [filters.project]) // Only trigger when project selection changes
  
  // ✅ Filter projects based on search
  const getFilteredProjects = () => {
    if (!projectSearch.trim()) return projects
    
    const searchTerm = projectSearch.toLowerCase().trim()
    return projects.filter(project => {
      const matchesCode = project.project_code?.toLowerCase().includes(searchTerm)
      const matchesName = project.project_name?.toLowerCase().includes(searchTerm)
      const matchesSubCode = project.project_sub_code?.toLowerCase().includes(searchTerm)
      const fullCode = `${project.project_code || ''}${project.project_sub_code || ''}`.toLowerCase()
      const matchesFullCode = fullCode.includes(searchTerm)
      
      return matchesCode || matchesName || matchesSubCode || matchesFullCode
    })
  }
  
  // ✅ Permission check - return access denied if user doesn't have permission
  if (!guard.hasAccess('boq.view')) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Access Denied</h3>
              <p className="text-sm">You do not have permission to view BOQ. Please contact your administrator.</p>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  // ✅ Apply filters to activities
  const applyFilters = (activitiesList: BOQActivity[]) => {
    let filtered = [...activitiesList]
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(activity => 
        activity.activity_name?.toLowerCase().includes(searchTerm) ||
        activity.project_code?.toLowerCase().includes(searchTerm) ||
        activity.project_full_name?.toLowerCase().includes(searchTerm)
      )
    }
    
    // Project filter (supports multiple projects)
    if (filters.project && filters.project.length > 0) {
      filtered = filtered.filter(activity => 
        filters.project.includes(activity.project_code || '')
      )
    }
    
    // Division filter
    if (filters.division) {
      filtered = filtered.filter(activity => 
        activity.activity_division === filters.division
      )
    }
    
    // Status filter (based on progress)
    if (filters.status) {
      filtered = filtered.filter(activity => {
        const progress = activity.activity_progress_percentage || 0
        switch (filters.status) {
          case 'completed':
            return progress >= 100
          case 'in_progress':
            return progress > 0 && progress < 100
          case 'not_started':
            return progress === 0
          default:
            return true
        }
      })
    }
    
    // Zone filter
    if (filters.zone) {
      filtered = filtered.filter(activity => 
        activity.zone_ref === filters.zone
      )
    }
    
    console.log('🔍 Filter applied:', {
      original: activitiesList.length,
      filtered: filtered.length,
      filters,
      searchTerm: filters.search,
      projectFilter: filters.project,
      divisionFilter: filters.division,
      statusFilter: filters.status
    })
    
    // ✅ Debug: Show sample of filtered results
    if (filtered.length > 0) {
      console.log('📋 Sample filtered activities:', filtered.slice(0, 3).map((a: BOQActivity) => ({
        name: a.activity_name,
        project: a.project_code,
        division: a.activity_division,
        progress: a.activity_progress_percentage
      })))
    }
    
    return filtered
  }

  // ✅ Handle filter changes
  const handleFilterChange = (key: string, value: string | string[]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // ✅ Apply filters immediately to database
    console.log('🔄 Filter changed:', { key, value, newFilters })
    
    // Reset to first page
    setCurrentPage(1)
    
    // ✅ Apply filters immediately with new values
    applyFiltersToDatabase(newFilters)
  }

  // ✅ Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      project: [],
      division: '',
      status: '',
      zone: ''
    })
    setFilteredActivities([])
    setActivities([])
    setTotalCount(0)
    setCurrentPage(1)
    console.log('🧹 All filters cleared - showing empty state')
  }

  // ✅ Get unique divisions from activities
  const getUniqueDivisions = () => {
    const divisionSet = new Set<string>()
    activities.forEach(a => {
      if (a.activity_division) {
        divisionSet.add(a.activity_division)
      }
    })
    return Array.from(divisionSet).sort()
  }

  // ✅ Apply filters to database immediately
  const applyFiltersToDatabase = async (filtersToApply: any) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      console.log('🔄 Applying filters to database:', filtersToApply)
      
      // ✅ Check if any filters are applied
      if (!filtersToApply.search && (!filtersToApply.project || filtersToApply.project.length === 0) && !filtersToApply.division && !filtersToApply.status) {
        console.log('💡 No filters applied - showing empty state')
        setActivities([])
        setFilteredActivities([])
        setTotalCount(0)
        stopSmartLoading(setLoading)
        return
      }
      
      // ✅ Build query with filters
      let activitiesQuery = supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // ✅ Apply database-level filters
      if (filtersToApply.project && filtersToApply.project.length > 0) {
        // Use 'in' filter for multiple projects
        if (filtersToApply.project.length === 1) {
          activitiesQuery = activitiesQuery.eq('Project Code', filtersToApply.project[0])
        } else {
          activitiesQuery = activitiesQuery.in('Project Code', filtersToApply.project)
        }
        console.log('🔍 Applied project filter:', filtersToApply.project)
      }
      
      if (filtersToApply.division) {
        activitiesQuery = activitiesQuery.eq('Activity Division', filtersToApply.division)
        console.log('🔍 Applied division filter:', filtersToApply.division)
      }
      
      if (filtersToApply.zone) {
        activitiesQuery = activitiesQuery.eq('Zone Ref', filtersToApply.zone)
        console.log('🔍 Applied zone filter:', filtersToApply.zone)
      }
      
      // ✅ Note: Status filter not available in BOQ Rates table
      if (filtersToApply.status) {
        console.log('⚠️ Status filter not available in BOQ Rates table - skipping')
      }
      
      console.log('🔍 Final query filters:', {
        project: filtersToApply.project && filtersToApply.project.length > 0 ? filtersToApply.project.join(', ') : 'none',
        division: filtersToApply.division || 'none', 
        status: filtersToApply.status || 'none',
        search: filtersToApply.search || 'none'
      })
      
      const { data: activitiesData, error: activitiesError, count } = await activitiesQuery
      
      if (activitiesError) throw activitiesError
      
      console.log(`✅ Fetched ${activitiesData?.length || 0} activities from database`)
      console.log(`📊 Database count: ${count || 0}`)
      
      let mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      
      // ✅ Apply client-side search filter if needed
      let filtered = mappedActivities
      if (filtersToApply.search) {
        const searchTerm = filtersToApply.search.toLowerCase()
        filtered = mappedActivities.filter((activity: BOQActivity) => 
          activity.activity_name?.toLowerCase().includes(searchTerm) ||
          activity.project_code?.toLowerCase().includes(searchTerm) ||
          activity.project_full_name?.toLowerCase().includes(searchTerm)
        )
        console.log('🔍 Applied search filter:', { searchTerm, results: filtered.length })
      }
      
      setActivities(mappedActivities)
      setFilteredActivities(filtered)
      setTotalCount(count || 0)
      
      // ✅ Load KPIs for Actual Dates calculation
      console.log('📊 Loading KPIs for Actual Dates (applyFilters)...')
      try {
        // Get unique project codes from activities
        const projectCodes = Array.from(new Set(mappedActivities.map((a: BOQActivity) => 
          a.project_code || a.project_full_code
        ).filter(Boolean)))
        
        if (projectCodes.length > 0) {
          // Load KPIs for all project codes
          const kpisQuery = supabase
            .from(TABLES.KPI)
            .select('*')
            .or(projectCodes.map((code) => 
              `Project Full Code.eq.${code},Project Code.eq.${code},Project Full Code.like.${code}%,Project Code.like.${code}%`
            ).join(','))
            .limit(5000) // Limit to prevent huge queries
          
          const { data: kpisData, error: kpisError } = await kpisQuery
          
          if (kpisError) {
            console.error('❌ KPIs query error:', kpisError)
            setAllKPIs([])
          } else {
            const mappedKPIs = (kpisData || []).map(mapKPIFromDB)
            setAllKPIs(mappedKPIs)
            console.log(`✅ Loaded ${mappedKPIs.length} KPIs for Actual Dates calculation`)
          }
        } else {
          setAllKPIs([])
          console.log('💡 No project codes found, skipping KPI loading')
        }
      } catch (kpiError) {
        console.error('❌ Error loading KPIs:', kpiError)
        setAllKPIs([])
      }
      
      // Calculate Rate-based metrics for activities
      try {
        console.log('📊 Calculating Rate-based metrics for activities...')
        
        // Calculate rates for all activities
        const rates = mappedActivities.map(activity => 
          calculateActivityRate(activity)
        )
        setActivityRates(rates)
        
        // Calculate progress for all activities (use updated allKPIs)
        const progresses = mappedActivities.map(activity => 
          calculateActivityProgress(activity, allKPIs)
        )
        setActivityProgresses(progresses)
        
        console.log('✅ Rate-based metrics calculated successfully')
      } catch (rateError) {
        console.log('⚠️ Rate calculation not available:', rateError)
      }
      
      console.log('🎯 Final result:', {
        totalActivities: mappedActivities.length,
        filteredActivities: filtered.length,
        shouldShow: `${filtered.length} activities`
      })
      
    } catch (error: any) {
      console.error('❌ Error applying filters:', error)
      setError(error.message || 'Failed to apply filters')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const fetchData = async (page: number = 1, applyFilters: boolean = false) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      console.log(`📄 BOQManagement: Fetching activities (page ${page}, applyFilters: ${applyFilters})...`)
      
      // ✅ Smart loading: Only load data when filters are applied
      if (!applyFilters && !filters.search && (!filters.project || filters.project.length === 0) && !filters.division && !filters.status) {
        console.log('💡 No filters applied - showing empty state')
        setActivities([])
        setFilteredActivities([])
        setTotalCount(0)
        stopSmartLoading(setLoading)
        return
      }
      
      // ✅ Load activities with filters applied
      console.log('📄 BOQManagement: Loading activities with filters...')
      
      // ✅ تحميل متوازي مع timeout أطول
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('BOQ fetch timeout')), 60000)
      )
      
      // ✅ Build query with filters
      let activitiesQuery = supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        // ✅ NO LIMIT - Let database filters handle the limiting
      
      // ✅ Apply database-level filters
      console.log('🔍 Current filters:', filters)
      
      if (filters.project && filters.project.length > 0) {
        // Use 'in' filter for multiple projects
        if (filters.project.length === 1) {
          activitiesQuery = activitiesQuery.eq('Project Code', filters.project[0])
        } else {
          activitiesQuery = activitiesQuery.in('Project Code', filters.project)
        }
        console.log('🔍 Applied project filter:', filters.project)
      }
      
      if (filters.division) {
        activitiesQuery = activitiesQuery.eq('Activity Division', filters.division)
        console.log('🔍 Applied division filter:', filters.division)
      }
      
      // ✅ Note: Status filter not available in BOQ Rates table
      if (filters.status) {
        console.log('⚠️ Status filter not available in BOQ Rates table - skipping')
      }
      
      // ✅ Debug: Show final query
      console.log('🔍 Final query filters:', {
        project: filters.project && filters.project.length > 0 ? filters.project.join(', ') : 'none',
        division: filters.division || 'none', 
        status: filters.status || 'none',
        search: filters.search || 'none'
      })
      
      // ✅ Debug: Show what will be queried
      console.log('🔍 Database query will filter by:', {
        project_code: filters.project && filters.project.length > 0 ? filters.project.join(', ') : 'ALL',
        activity_division: filters.division || 'ALL',
        activity_progress_percentage: filters.status || 'ALL'
      })
      
      console.log('🔍 BOQ: Loading activities with database filters')
      
      const { data: activitiesData, error: activitiesError, count } = await Promise.race([
        activitiesQuery,
        timeoutPromise
      ]) as any

      // ✅ ALWAYS update state (React handles unmounted safely)

      if (activitiesError) throw activitiesError

      console.log(`✅ BOQManagement: Fetched ${activitiesData?.length || 0} activities from database`)
      console.log(`📊 Database count: ${count || 0}`)
      
      let mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      
      // ✅ Load activities with database filters applied
      console.log(`✅ BOQ: Loaded ${mappedActivities.length} activities with database filters`)
      console.log(`📊 Expected: Only activities matching filters`)
      
      setActivities(mappedActivities)
      setTotalCount(count || 0)
      
      // ✅ Apply client-side search filter if needed
      let filtered = mappedActivities
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filtered = mappedActivities.filter((activity: BOQActivity) => 
          activity.activity_name?.toLowerCase().includes(searchTerm) ||
          activity.project_code?.toLowerCase().includes(searchTerm) ||
          activity.project_full_name?.toLowerCase().includes(searchTerm)
        )
        console.log('🔍 Applied search filter:', { searchTerm, results: filtered.length })
      }
      
      setFilteredActivities(filtered)
      
      console.log('🎯 Final BOQ state:', {
        activitiesSet: mappedActivities.length,
        totalCount: count || 0,
        filteredCount: filtered.length,
        hasData: mappedActivities.length > 0,
        currentPage: currentPage,
        itemsPerPage: itemsPerPage,
        appliedFilters: filters
      })
      
      // ✅ Debug: Show what should be displayed
      console.log('📋 What should be displayed:', {
        totalActivities: mappedActivities.length,
        filteredActivities: filtered.length,
        shouldShow: filtered.length > 0 ? `${filtered.length} activities` : 'No activities'
      })
      
      // ✅ Debug: Show first few activities
      if (mappedActivities.length > 0) {
        console.log('📋 First few activities:', mappedActivities.slice(0, 3).map((a: BOQActivity) => ({
          name: a.activity_name,
          project: a.project_code,
          division: a.activity_division
        })))
      }
      
      // ✅ رسالة واضحة عند عدم وجود بيانات
      if (mappedActivities.length === 0) {
        console.log('💡 No activities found in database')
        console.log('💡 Check if BOQ activities exist in the database')
      } else {
        console.log(`✅ Successfully loaded ${mappedActivities.length} activities`)
      }
      
      // ✅ Load KPIs for Actual Dates calculation
      console.log('📊 Loading KPIs for Actual Dates...')
      try {
        // Get unique project codes from activities
        const projectCodes = Array.from(new Set(mappedActivities.map((a: BOQActivity) => 
          a.project_code || a.project_full_code
        ).filter(Boolean)))
        
        if (projectCodes.length > 0) {
          // Load KPIs for all project codes
          const kpisQuery = supabase
            .from(TABLES.KPI)
            .select('*')
            .or(projectCodes.map((code) => 
              `Project Full Code.eq.${code},Project Code.eq.${code},Project Full Code.like.${code}%,Project Code.like.${code}%`
            ).join(','))
            .limit(5000) // Limit to prevent huge queries
          
          const { data: kpisData, error: kpisError } = await kpisQuery
          
          if (kpisError) {
            console.error('❌ KPIs query error:', kpisError)
            setAllKPIs([])
          } else {
            const mappedKPIs = (kpisData || []).map(mapKPIFromDB)
            setAllKPIs(mappedKPIs)
            console.log(`✅ Loaded ${mappedKPIs.length} KPIs for Actual Dates calculation`)
          }
        } else {
          setAllKPIs([])
          console.log('💡 No project codes found, skipping KPI loading')
        }
      } catch (kpiError) {
        console.error('❌ Error loading KPIs:', kpiError)
        setAllKPIs([])
      }
      
      console.log('✅ BOQManagement: Page data loaded successfully!')
    } catch (error: any) {
      console.error('❌ BOQManagement: Error:', error)
      setError(error.message)
      
      // ✅ Try to reconnect if connection failed
      if (error.message?.includes('connection') || error.message?.includes('network')) {
        console.log('🔄 Connection error detected, attempting to reconnect...')
        const { resetClient } = await import('@/lib/simpleConnectionManager')
        resetClient()
        console.log('✅ Client reset, retrying data fetch...')
        // Retry the fetch after reset
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchData(page)
          }
        }, 1000)
        return
      }
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    console.log('🟡 BOQ: Component mounted')
    
    // ✅ الاستماع للتحديثات من Database Management
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName } = event.detail
      console.log(`🔔 BOQ: Database updated event received for ${tableName}`)
      
      // ✅ Don't auto-reload - let user apply filters
      if (tableName === TABLES.BOQ_ACTIVITIES) {
        console.log(`🔄 BOQ: Database updated - apply filters to see new data`)
      } else if (tableName === TABLES.PROJECTS) {
        console.log(`🔄 BOQ: Projects updated - apply filters to see new data`)
      }
    }
    
    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    console.log('👂 BOQ: Listening for database updates')
    
    // Connection monitoring is handled by simpleConnectionManager
    
    // ✅ Initial load: Only fetch projects list (lightweight)
    const fetchInitialData = async () => {
      try {
        startSmartLoading(setLoading)
        console.log('🟡 BOQ: Fetching initial data (projects list only)...')
        
        const { data: projectsData, error: projectsError } = await executeQuery(async () =>
          supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .order('created_at', { ascending: false })
        )
        
        // ✅ ALWAYS update state (React handles unmounted safely)
        
        if (projectsError) {
          console.error('❌ Supabase Error fetching projects:', projectsError)
          setError(`Failed to load projects: ${projectsError.message || 'Unknown error'}`)
          return
        }
        
        if (projectsData && Array.isArray(projectsData)) {
          const mappedProjects = projectsData.map(mapProjectFromDB)
          setProjects(mappedProjects)
          console.log('✅ BOQ: Projects list loaded -', mappedProjects.length, 'projects')
          
          // ✅ Load available zones
          try {
            const { data: zonesData, error: zonesError } = await executeQuery(async () =>
              supabase
                .from(TABLES.BOQ_ACTIVITIES)
                .select('Zone Ref')
                .not('Zone Ref', 'is', null)
                .not('Zone Ref', 'eq', '')
            )
            
            if (!zonesError && zonesData) {
              const zones = new Set<string>()
              zonesData.forEach((item: any) => {
                if (item['Zone Ref']) {
                  zones.add(item['Zone Ref'])
                }
              })
              const zoneList = Array.from(zones).sort()
              setAvailableZones(zoneList)
              console.log(`✅ Loaded ${zoneList.length} available zones`)
            }
          } catch (zonesError) {
            console.error('❌ Error loading zones:', zonesError)
          }
          
          // ✅ Projects loaded - ready for filtering
          console.log('✅ Projects loaded - ready for filtering')
          // ✅ Don't auto-fetch BOQ activities - wait for filters to be applied
        }
      } catch (error: any) {
        console.error('❌ Exception in BOQ initial load:', error)
        setError(error.message || 'Failed to load initial data')
      } finally {
        // ✅ ALWAYS stop loading (React handles unmounted safely)
        stopSmartLoading(setLoading)
      }
    }
    
    fetchInitialData()
    
    // Cleanup to prevent memory leaks and hanging
    return () => {
      console.log('🔴 BOQ: Cleanup - component unmounting')
      isMountedRef.current = false
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
      console.log('👋 BOQ: Stopped listening for database updates')
      // Connection monitoring is handled globally
    }
  }, []) // Run ONCE only!
  
  // ✅ Fetch data when page changes
  useEffect(() => {
    if (projects.length > 0) {
      console.log('🔄 Projects loaded, ready for filtering...')
      // ✅ Don't auto-fetch data - wait for filters to be applied
    }
  }, [projects.length])

  // ✅ Removed auto-apply filters - now filters are applied at database level
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // ✅ Only fetch data if filters are applied
    if (filters.search || (filters.project && filters.project.length > 0) || filters.division || filters.status || filters.zone) {
      console.log('🔄 Page changed with filters applied - fetching data...')
      fetchData(page, true)
    }
  }

  // ✅ Get current page data (filtered)
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredActivities.slice(startIndex, endIndex)
  }

  // ✅ Get total pages for filtered data
  const getTotalPages = () => {
    return Math.ceil(filteredActivities.length / itemsPerPage)
  }

  const handleCreateActivity = async (activityData: any) => {
    try {
      setShowForm(false)
      console.log('========================================')
      console.log('🆕 CREATE BOQ ACTIVITY STARTED')
      console.log('Form Data:', activityData)
      console.log('========================================')
      
      // Map to database format - Use BOTH old (Column 44/45) and new column names
      const dbData = {
        'Project Code': activityData.project_code || '',
        'Project Sub Code': activityData.project_sub_code || '',
        'Project Full Code': activityData.project_full_code || activityData.project_code || '',
        'Activity': activityData.activity_name || '', // Column is "Activity" not "Activity Name"
        'Activity Division': activityData.activity_division || activityData.zone_ref || '',
        'Unit': activityData.unit || '',
        'Zone Ref': activityData.zone_ref || activityData.activity_division || '',
        
        // ✅ Use BOTH old and new column names for compatibility
        'Planned Units': activityData.planned_units?.toString() || '0',
        'Deadline': activityData.deadline || '',
        
        'Total Units': activityData.total_units?.toString() || '0',
        'Actual Units': activityData.actual_units?.toString() || '0',
        'Total Value': activityData.planned_value?.toString() || '0',
        'Planned Value': activityData.planned_value?.toString() || '0',
        'Planned Activity Start Date': activityData.planned_activity_start_date || '',
        'Total Drilling Meters': activityData.total_drilling_meters?.toString() || '0',
        'Calendar Duration': activityData.calendar_duration?.toString() || '0',
        'Project Full Name': activityData.project_full_name || '',
        'Project Status': activityData.project_status || 'upcoming',
        // ✅ Activity Timing, Has Value, and Affects Timeline
        // Note: These columns must exist in the database (run add-activity-timing-column.sql first)
        'Activity Timing': activityData.activity_timing || 'post-commencement',
        'Has Value': activityData.has_value !== undefined ? (activityData.has_value ? 'TRUE' : 'FALSE') : 'TRUE',
        'Affects Timeline': activityData.affects_timeline !== undefined ? (activityData.affects_timeline ? 'TRUE' : 'FALSE') : 'FALSE'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))

      const { data, error } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .insert([dbData] as any)
        .select()
        .single()

      if (error) {
        console.error('❌ CREATE ERROR:', error)
        throw error
      }
      
      console.log('✅ CREATE SUCCESS!')
      console.log('Created Data:', data)
      console.log('📊 Verify Planned Units:', data?.['Planned Units'])
      console.log('📊 Verify Deadline:', data?.['Deadline'])
      
      // ✅ Auto-save calculations for the new activity
      try {
        const mappedActivity = mapBOQFromDB(data)
        const autoSaveResult = await autoSaveActivityCalculations(mappedActivity)
        
        if (autoSaveResult.success) {
          console.log('✅ Auto-save calculations completed:', {
            updatedActivities: autoSaveResult.updatedActivities,
            updatedProjects: autoSaveResult.updatedProjects
          })
        } else {
          console.warn('⚠️ Auto-save calculations had errors:', autoSaveResult.errors)
        }
      } catch (autoSaveError) {
        console.warn('⚠️ Auto-save calculations failed:', autoSaveError)
      }
      
      // Close form and refresh
      setShowForm(false)
      // ✅ Don't auto-refresh - let user apply filters
      console.log('✅ Activity created - apply filters to see new data')
      
      console.log('✅ DATA REFRESHED')
      
    } catch (error: any) {
      console.error('❌ CREATE FAILED:', error)
      setError(`Create failed: ${error.message}`)
      alert(`Failed to create activity: ${error.message}`)
    }
  }

  const handleUpdateActivity = async (id: string, activityData: any) => {
    try {
      console.log('========================================')
      console.log('🔄 UPDATE BOQ ACTIVITY STARTED')
      console.log('ID:', id)
      console.log('Form Data:', activityData)
      console.log('========================================')
      
      // Map to database format - Use BOTH old (Column 44/45) and new column names
      const dbData = {
        'Project Code': activityData.project_code || '',
        'Project Sub Code': activityData.project_sub_code || '',
        'Project Full Code': activityData.project_full_code || activityData.project_code || '',
        'Activity': activityData.activity_name || '', // Column is "Activity" not "Activity Name"
        'Activity Division': activityData.activity_division || activityData.zone_ref || '',
        'Unit': activityData.unit || '',
        'Zone Ref': activityData.zone_ref || activityData.activity_division || '',
        
        // ✅ Use BOTH old and new column names for compatibility
        'Planned Units': activityData.planned_units?.toString() || '0',
        'Deadline': activityData.deadline || '',
        
        'Total Units': activityData.total_units?.toString() || '0',
        'Actual Units': activityData.actual_units?.toString() || '0',
        'Total Value': activityData.planned_value?.toString() || '0',
        'Planned Value': activityData.planned_value?.toString() || '0',
        'Planned Activity Start Date': activityData.planned_activity_start_date || '',
        'Total Drilling Meters': activityData.total_drilling_meters?.toString() || '0',
        'Calendar Duration': activityData.calendar_duration?.toString() || '0',
        'Project Full Name': activityData.project_full_name || '',
        'Project Status': activityData.project_status || 'upcoming',
        // ✅ Activity Timing, Has Value, and Affects Timeline
        // Note: These columns must exist in the database (run add-activity-timing-column.sql first)
        'Activity Timing': activityData.activity_timing || 'post-commencement',
        'Has Value': activityData.has_value !== undefined ? (activityData.has_value ? 'TRUE' : 'FALSE') : 'TRUE',
        'Affects Timeline': activityData.affects_timeline !== undefined ? (activityData.affects_timeline ? 'TRUE' : 'FALSE') : 'FALSE'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))

      const { data, error } = await (supabase as any)
        .from(TABLES.BOQ_ACTIVITIES)
        .update(dbData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ UPDATE ERROR:', error)
        throw error
      }
      
      console.log('✅ UPDATE SUCCESS!')
      console.log('Updated Data:', data)
      console.log('========================================')
      
      // ✅ Auto-save calculations for the updated activity
      try {
        const mappedActivity = mapBOQFromDB(data)
        const autoSaveResult = await autoSaveOnBOQUpdate(mappedActivity)
        
        if (autoSaveResult.success) {
          console.log('✅ Auto-save calculations completed:', {
            updatedActivities: autoSaveResult.updatedActivities,
            updatedProjects: autoSaveResult.updatedProjects
          })
        } else {
          console.warn('⚠️ Auto-save calculations had errors:', autoSaveResult.errors)
        }
      } catch (autoSaveError) {
        console.warn('⚠️ Auto-save calculations failed:', autoSaveError)
      }
      
      // Close form and refresh
      setEditingActivity(null)
      // ✅ Don't auto-refresh - let user apply filters
      console.log('✅ Activity updated - apply filters to see updated data')
      
    } catch (error: any) {
      console.error('❌ UPDATE FAILED:', error)
      setError(`Update failed: ${error.message}`)
      alert(`Failed to update activity: ${error.message}`)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    // Find the activity to get its details for KPI deletion
    const activityToDelete = activities.find(a => a.id === id)
    
    if (!activityToDelete) {
      setError('Activity not found')
      return
    }
    
    if (!confirm(`Are you sure you want to delete this activity?\n\nThis will also delete all associated KPIs (Planned).`)) return

    try {
      console.log('========================================')
      console.log('🗑️ DELETE BOQ ACTIVITY STARTED')
      console.log('  - Activity ID:', id)
      console.log('  - Activity Name:', activityToDelete.activity_name)
      console.log('  - Project Full Code:', activityToDelete.project_full_code)
      console.log('========================================')
      
      // Step 1: Delete associated KPIs first
      console.log('🗑️ Step 1: Deleting associated KPIs...')
      const { data: kpiDeleteData, error: kpiError, count: kpiCount } = await supabase
        .from(TABLES.KPI)
        .delete({ count: 'exact' })
        .eq('Project Full Code', activityToDelete.project_full_code || activityToDelete.project_code)
        .eq('Activity Name', activityToDelete.activity_name)
        .eq('Input Type', 'Planned')
      
      if (kpiError) {
        console.error('❌ Error deleting KPIs:', kpiError)
        throw new Error(`Failed to delete associated KPIs: ${kpiError.message}`)
      }
      
      console.log(`✅ Deleted ${kpiCount || 0} associated KPIs`)
      
      // Step 2: Delete the BOQ activity
      console.log('🗑️ Step 2: Deleting BOQ activity...')
      const { error: boqError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .delete()
        .eq('id', id)

      if (boqError) {
        console.error('❌ Error deleting BOQ activity:', boqError)
        throw boqError
      }
      
      console.log('✅ BOQ activity deleted successfully')
      console.log('========================================')
      console.log('✅ DELETE COMPLETE!')
      console.log(`  - Deleted activity: ${activityToDelete.activity_name}`)
      console.log(`  - Deleted ${kpiCount || 0} associated KPIs`)
      console.log('========================================')
      
      // Update local state
      setActivities(activities.filter(a => a.id !== id))
      
      // Show success message
      alert(`✅ Activity deleted successfully!\nDeleted ${kpiCount || 0} associated KPIs`)
      
    } catch (error: any) {
      console.error('❌ DELETE FAILED:', error)
      setError(error.message)
      alert(`Failed to delete activity: ${error.message}`)
    }
  }

  const handleBulkDeleteActivity = async (ids: string[]) => {
    if (ids.length === 0) return
    
    try {
      console.log('========================================')
      console.log('🗑️ BULK DELETE BOQ ACTIVITIES STARTED')
      console.log(`Deleting ${ids.length} activities`)
      console.log('========================================')
      
      let totalKPIsDeleted = 0
      
      // Delete each activity and its KPIs
      for (const id of ids) {
        const activityToDelete = activities.find(a => a.id === id)
        if (!activityToDelete) continue
        
        // Delete associated KPIs
        const { count: kpiCount } = await supabase
          .from(TABLES.KPI)
          .delete({ count: 'exact' })
          .eq('Project Full Code', activityToDelete.project_full_code || activityToDelete.project_code)
          .eq('Activity Name', activityToDelete.activity_name)
          .eq('Input Type', 'Planned')
        
        totalKPIsDeleted += (kpiCount || 0)
      }
      
      console.log(`🗑️ Deleted ${totalKPIsDeleted} associated KPIs`)
      
      // Delete all activities
      const { error: boqError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .delete()
        .in('id', ids)
      
      if (boqError) throw boqError
      
      console.log('========================================')
      console.log('✅ BULK DELETE COMPLETE!')
      console.log(`  - Deleted ${ids.length} activities`)
      console.log(`  - Deleted ${totalKPIsDeleted} associated KPIs`)
      console.log('========================================')
      
      // ✅ Don't auto-refresh - let user apply filters
      console.log('✅ Activities deleted - apply filters to see updated data')
      
      // Show success message
      alert(`✅ Successfully deleted ${ids.length} activity(ies) and ${totalKPIsDeleted} associated KPIs!`)
      
    } catch (error: any) {
      console.error('❌ BULK DELETE FAILED:', error)
      setError(error.message)
      alert(`Failed to delete activities: ${error.message}`)
    }
  }

  // ✅ Removed duplicate filteredActivities declaration
  
  // Handle import BOQ data
  const handleImportBOQ = async (importedData: any[]) => {
    try {
      console.log(`📥 Importing ${importedData.length} BOQ activities...`)
      
      // Map imported data to database format
      const activitiesToInsert = importedData.map(row => ({
        'Project Code': row['Project Code'] || row['project_code'] || '',
        'Project Sub Code': row['Project Sub Code'] || row['project_sub_code'] || '',
        'Project Full Code': row['Project Full Code'] || row['project_full_code'] || row['Project Code'] || '',
        'Activity': row['Activity'] || row['activity'] || '',
        'Activity Division': row['Activity Division'] || row['activity_division'] || '',
        'Unit': row['Unit'] || row['unit'] || '',
        'Zone Ref': row['Zone Ref'] || row['zone_ref'] || '',
        'Activity Name': row['Activity Name'] || row['activity_name'] || row['Activity'] || '',
        'Total Units': row['Total Units'] || row['total_units'] || '0',
        'Planned Units': row['Planned Units'] || row['planned_units'] || '0',
        'Actual Units': row['Actual Units'] || row['actual_units'] || '0',
        'Rate': row['Rate'] || row['rate'] || '0',
        'Total Value': row['Total Value'] || row['total_value'] || '0',
        'Planned Activity Start Date': row['Planned Activity Start Date'] || row['planned_activity_start_date'] || '',
        'Deadline': row['Deadline'] || row['deadline'] || '',
        'Calendar Duration': row['Calendar Duration'] || row['calendar_duration'] || '0'
      }))
      
      // Insert into database
      const { data, error } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .insert(activitiesToInsert as any)
        .select()
      
      if (error) {
        console.error('❌ Error importing BOQ activities:', error)
        throw error
      }
      
      console.log(`✅ Successfully imported ${data?.length || 0} BOQ activities`)
      
      // ✅ Don't auto-refresh - let user apply filters
      console.log('✅ Activities imported - apply filters to see new data')
    } catch (error: any) {
      console.error('❌ Import failed:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  // Prepare data for export
  const getExportData = () => {
    return filteredActivities.map(activity => ({
      'Project Code': activity.project_code,
      'Project Sub Code': activity.project_sub_code,
      'Project Full Code': activity.project_full_code,
      'Activity': activity.activity,
      'Activity Name': activity.activity_name,
      'Activity Division': activity.activity_division,
      'Unit': activity.unit,
      'Zone Ref': activity.zone_ref,
      'Total Units': activity.total_units,
      'Planned Units': activity.planned_units,
      'Actual Units': activity.actual_units,
      'Difference': activity.difference,
      'Rate': activity.rate,
      'Total Value': activity.total_value,
      'Planned Value': activity.planned_value,
      'Earned Value': activity.earned_value,
      'Activity Progress %': activity.activity_progress_percentage,
      'Planned Activity Start Date': activity.planned_activity_start_date,
      'Deadline': activity.deadline,
      'Calendar Duration': activity.calendar_duration,
      'Activity Status': activity.activity_actual_status,
      'Completed': activity.activity_completed ? 'YES' : 'NO',
      'Delayed': activity.activity_delayed ? 'YES' : 'NO',
      'On Track': activity.activity_on_track ? 'YES' : 'NO'
    }))
  }

  // Template columns for import
  const importTemplateColumns = [
    'Project Code',
    'Project Sub Code',
    'Project Full Code',
    'Activity',
    'Activity Name',
    'Activity Division',
    'Unit',
    'Zone Ref',
    'Total Units',
    'Planned Units',
    'Actual Units',
    'Rate',
    'Total Value',
    'Planned Activity Start Date',
    'Deadline',
    'Calendar Duration'
  ]

  // Calculate statistics
  const totalActivities = activities.length
  const completedActivities = activities.filter(a => a.activity_completed).length
  const delayedActivities = activities.filter(a => a.activity_delayed).length
  const onTrackActivities = activities.filter(a => a.activity_on_track).length

  // Don't show full-page loading spinner - show skeleton instead
  const isInitialLoad = loading && activities.length === 0

  return (
    <div className="space-y-6 max-w-full overflow-hidden boq-container">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Bill of Quantities (BOQ)</h2>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full animate-pulse">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Manage and track project activities and quantities</p>
          </div>
          
          {/* Add New Activity Button */}
          {guard.hasAccess('boq.create') && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowForm(true)} 
                className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Activity</span>
              </Button>
              <PermissionButton
                permission="boq.view"
                onClick={() => setUseCustomizedTable(!useCustomizedTable)}
                variant="outline"
                className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
              >
                <Filter className="h-4 w-4" />
                <span>{useCustomizedTable ? 'Standard View' : 'Customize Columns'}</span>
              </PermissionButton>
            </div>
          )}
        </div>
        
        {/* ✅ Simple Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({filteredActivities.length} of {activities.length} activities)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              {(filters.search || (filters.project && filters.project.length > 0) || filters.division || filters.status || filters.zone) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search activities..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              {/* Project Filter - Searchable Dropdown */}
              <div className="relative" ref={projectDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => {
                        const value = e.target.value
                        setProjectSearch(value)
                        setShowProjectDropdown(true)
                      }}
                      onFocus={() => {
                        setShowProjectDropdown(true)
                      }}
                      onClick={() => setShowProjectDropdown(true)}
                      placeholder={filters.project && filters.project.length > 0 ? `${filters.project.length} project(s) selected` : "Search projects..."}
                      className="pl-10 pr-10 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowProjectDropdown(!showProjectDropdown)
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {showProjectDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div
                        onClick={() => {
                          handleFilterChange('project', [])
                          setProjectSearch('')
                          setShowProjectDropdown(false)
                        }}
                        className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${(!filters.project || filters.project.length === 0) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className={(!filters.project || filters.project.length === 0) ? 'font-medium text-blue-600 dark:text-blue-400' : ''}>
                          All Projects
                        </span>
                      </div>
                      {getFilteredProjects().map((project) => {
                        const isSelected = filters.project && filters.project.includes(project.project_code)
                        return (
                          <div
                            key={project.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleProject(project.project_code)
                              setProjectSearch('')
                            }}
                            className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || false}
                              onChange={() => toggleProject(project.project_code)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <div className={`text-sm ${isSelected ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                {project.project_code} - {project.project_name}
                              </div>
                              {project.project_sub_code && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Sub: {project.project_sub_code}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        )
                      })}
                      {getFilteredProjects().length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No projects found matching "{projectSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Division Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Division
                </label>
                <select
                  value={filters.division}
                  onChange={(e) => handleFilterChange('division', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Divisions</option>
                  {getUniqueDivisions().map(division => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="not_started">Not Started (0%)</option>
                  <option value="in_progress">In Progress (1-99%)</option>
                  <option value="completed">Completed (100%)</option>
                </select>
              </div>
              
              {/* Zone Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zone
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => handleFilterChange('zone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Zones</option>
                  {availableZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* ✅ Display selected projects as pills - moved to after Zone filter */}
        {filters.project && filters.project.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-1">
              {filters.project.map((projectCode) => {
                const project = projects.find(p => p.project_code === projectCode)
                if (!project) return null
                return (
                  <div
                    key={projectCode}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-normal"
                  >
                    <Building2 className="h-2.5 w-2.5" />
                    <span className="max-w-[120px] truncate">
                      {project.project_code} - {project.project_name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleProject(projectCode)
                      }}
                      className="ml-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"
                      title="Remove project"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Data Actions:</span>
          <PermissionGuard permission="boq.export">
            <ExportButton
              data={getExportData()}
              filename="BOQ_Activities"
              formats={['csv', 'excel']}
              label="Export"
              variant="outline"
            />
          </PermissionGuard>
          
          <PermissionGuard permission="boq.print">
            <PrintButton
              label="Print"
              variant="outline"
              printTitle="BOQ Activities Report"
              printSettings={{
                fontSize: '10px',
                compactMode: true
              }}
            />
          </PermissionGuard>
          
          <PermissionGuard permission="boq.import">
            <ImportButton
              onImport={handleImportBOQ}
              requiredColumns={['Project Code', 'Activity Name', 'Unit']}
              templateName="BOQ_Activities"
              templateColumns={importTemplateColumns}
              label="Import"
              variant="outline"
            />
          </PermissionGuard>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {/* ✅ Removed all filters - Simple BOQ without filtering */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              BOQ Activities
              <span className="text-sm font-normal text-gray-500">
                ({filteredActivities.length} activities)
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-blue-600 rounded-full">
                    <ClipboardList className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                      🔍 Apply Filters to View BOQ Activities
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 max-w-md mx-auto">
                      Use the filters above to search and view BOQ activities. 
                      This ensures fast loading by only fetching relevant data.
                    </p>
                  </div>
                  <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                    💡 Tip: Apply any filter (Search, Project, Division, or Status) to load activities!
                  </div>
                </div>
              </div>
            </div>
          ) : guard.hasAccess('boq.view') ? (
            guard.hasAccess('boq.view') && useCustomizedTable ? (
              <BOQTableWithCustomization
                activities={getCurrentPageData()}
                projects={projects}
                onEdit={setEditingActivity}
                onDelete={handleDeleteActivity}
                onBulkDelete={handleBulkDeleteActivity}
                allKPIs={allKPIs}
              />
            ) : (
              <BOQTable
                activities={getCurrentPageData()}
                projects={projects}
                allKPIs={allKPIs}
                onEdit={setEditingActivity}
                onDelete={handleDeleteActivity}
                onBulkDelete={handleBulkDeleteActivity}
              />
            )
          ) : null}
        </CardContent>
        
        {/* Pagination */}
        {filteredActivities.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={getTotalPages()}
            totalItems={filteredActivities.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            loading={loading}
          />
        )}
      </Card>

      {showForm && (
        <IntelligentBOQForm
          activity={null}
          projects={projects}
          onSubmit={handleCreateActivity}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingActivity && (
        <IntelligentBOQForm
          activity={editingActivity}
          projects={projects}
          onSubmit={async (data: any) => {
            console.log('📝 BOQ Form onSubmit called with:', data)
            await handleUpdateActivity(editingActivity.id, data)
          }}
          onCancel={() => {
            console.log('❌ BOQ Form cancelled')
            setEditingActivity(null)
          }}
        />
      )}
    </div>
  )
}

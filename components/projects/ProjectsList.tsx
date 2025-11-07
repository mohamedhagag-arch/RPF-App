'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { withSafeLoading, createSafeLoadingSetter } from '@/lib/loadingStateManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { useAuth } from '@/app/providers'
import { hasPermission } from '@/lib/permissionsSystem'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getGridClasses, shouldLoadAnalytics, getViewModeIcon, getViewModeName } from '@/lib/viewModeOptimizer'
import { getCardGridClasses, shouldLoadCardAnalytics, getCardViewName, getCardViewDescription } from '@/lib/cardViewOptimizer'
import { Project, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapProjectToDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics } from '@/lib/projectAnalytics'
import { getProjectStatusColor, getProjectStatusText } from '@/lib/projectStatusManager'
import { loadAllDataWithProgress } from '@/lib/lazyLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { IntelligentProjectForm } from './IntelligentProjectForm'
import { ProjectCard } from './ProjectCard'
import { ProjectCardWithAnalytics } from './ProjectCardWithAnalytics'
import { ModernProjectCard } from './ModernProjectCard'
import { ProjectDetailsPanel } from './ProjectDetailsPanel'
import { ProjectsTableWithCustomization } from './ProjectsTableWithCustomization'
import { AdvancedSorting, SortOption, FilterOption } from '@/components/ui/AdvancedSorting'
import { Pagination } from '@/components/ui/Pagination'
import { Plus, Search, Building, Calendar, DollarSign, Percent, Hash, CheckCircle, Clock, AlertCircle, Folder, Grid, MapPin, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { SmartFilter } from '@/components/ui/SmartFilter'
import { ExportButton } from '@/components/ui/ExportButton'
import { ImportButton } from '@/components/ui/ImportButton'
import { PrintButton } from '@/components/ui/PrintButton'

interface ProjectsListProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function ProjectsList({ globalSearchTerm = '', globalFilters = { project: '', status: '', division: '', dateRange: '' } }: ProjectsListProps = {}) {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const router = useRouter()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [allKPIs, setAllKPIs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  // ✅ Standard View - only enable if user has permission
  // Load from localStorage or default to false (cards view)
  const [useCustomizedTable, setUseCustomizedTable] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('projects-view-mode')
      return saved === 'table'
    }
    return false
  })
  
  // ✅ Additional safety check: Never allow table view without permission
  // Always check permission at render time, don't rely on state
  const hasPermission = guard.hasAccess('projects.view')
  const canUseCustomizedTable = hasPermission && useCustomizedTable
  
  // Save view preference to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('projects-view-mode', useCustomizedTable ? 'table' : 'cards')
    }
  }, [useCustomizedTable])
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'cards'>('cards') // Default to cards view
  
  // Smart Filter State
  const [selectedProjectCodes, setSelectedProjectCodes] = useState<string[]>([])
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [selectedDivisionsFilter, setSelectedDivisionsFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [valueRange, setValueRange] = useState<{ min?: number; max?: number }>({})
  const [quantityRange, setQuantityRange] = useState<{ min?: number; max?: number }>({})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12) // 12 items per page (1 row of 12 cards)
  
  // Advanced sorting and filtering states
  const [currentSort, setCurrentSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const [currentProjectCode, setCurrentProjectCode] = useState<string>('')
  
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('projects') // ✅ Smart loading
  
  // ✅ Permission check - return access denied if user doesn't have permission
  if (!guard.hasAccess('projects.view')) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Access Denied</h3>
              <p className="text-sm">You do not have permission to view projects. Please contact your administrator.</p>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  // Sort options for projects
  const sortOptions: SortOption[] = [
    { key: 'project_name', label: 'Project Name', icon: Folder, type: 'string' },
    { key: 'project_code', label: 'Project Code', icon: Hash, type: 'string' },
    { key: 'project_type', label: 'Project Scope', icon: Building, type: 'string' },
    { key: 'responsible_division', label: 'Responsible Division', icon: Building, type: 'string' },
    { key: 'project_status', label: 'Project Status', icon: CheckCircle, type: 'string' },
    { key: 'contract_amount', label: 'Contract Amount', icon: DollarSign, type: 'number' },
    { key: 'created_at', label: 'Created Date', icon: Calendar, type: 'date' },
    { key: 'updated_at', label: 'Updated Date', icon: Calendar, type: 'date' }
  ]

  // Filter options for projects
  const filterOptions: FilterOption[] = [
    {
      key: 'project_status',
      label: 'Project Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    {
      key: 'project_type',
      label: 'Project Scope',
      type: 'select',
      options: Array.from(new Set(projects.map(p => p.project_type).filter(Boolean))).map(type => ({
        value: type,
        label: type
      }))
    },
    {
      key: 'responsible_division',
      label: 'Responsible Division',
      type: 'select',
      options: Array.from(new Set(projects.map(p => p.responsible_division).filter(Boolean))).map(division => ({
        value: division,
        label: division
      }))
    },
    {
      key: 'contract_amount',
      label: 'Contract Amount (Greater than)',
      type: 'number',
      placeholder: 'Example: 100000'
    }
  ]

  // Handle sorting
  const handleSortChange = (sortKey: string, direction: 'asc' | 'desc') => {
    setCurrentSort({ key: sortKey, direction })
  }

  // Handle filtering
  const handleFilterChange = (filters: Record<string, any>) => {
    setCurrentFilters(filters)
  }

  // Handle project code filtering
  const handleProjectCodeFilter = (projectCode: string) => {
    setCurrentProjectCode(projectCode)
  }

  // Apply sorting and filtering to projects
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects]

    // Apply project code filter
    if (currentProjectCode) {
      filtered = filtered.filter(project => 
        project.project_code?.toLowerCase().includes(currentProjectCode.toLowerCase())
      )
    }

    // Apply other filters
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        filtered = filtered.filter(project => {
          const projectValue = project[key as keyof Project]
          
          if (typeof value === 'string' && typeof projectValue === 'string') {
            return projectValue.toLowerCase().includes(value.toLowerCase())
          }
          
          if (typeof value === 'number' && typeof projectValue === 'number') {
            return projectValue >= value
          }
          
          if (typeof value === 'string' && typeof projectValue === 'boolean') {
            return projectValue === (value === 'true')
          }
          
          return projectValue === value
        })
      }
    })

    // Apply sorting
    if (currentSort) {
      filtered.sort((a, b) => {
        const aValue = a[currentSort.key as keyof Project]
        const bValue = b[currentSort.key as keyof Project]
        
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return currentSort.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return currentSort.direction === 'asc' 
            ? aValue - bValue
            : bValue - aValue
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string' && 
            !isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
          const aDate = new Date(aValue)
          const bDate = new Date(bValue)
          return currentSort.direction === 'asc' 
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime()
        }
        
        return 0
      })
    } else {
      // ✅ Default sorting: By project code descending (newest projects first, e.g., P5096, P5095, ...)
      filtered.sort((a, b) => {
        const aCode = (a.project_code || '').toString().trim()
        const bCode = (b.project_code || '').toString().trim()
        
        // Extract numeric part for numeric comparison
        const aMatch = aCode.match(/(\d+)/)
        const bMatch = bCode.match(/(\d+)/)
        
        if (aMatch && bMatch) {
          const aNum = parseInt(aMatch[1], 10)
          const bNum = parseInt(bMatch[1], 10)
          // Descending order: higher numbers first (P5096 before P5095)
          return bNum - aNum
        }
        
        // Fallback to alphabetical comparison if no numbers found
        return bCode.localeCompare(aCode)
      })
    }

    return filtered
  }

  // Fetch projects with pagination
  const fetchProjects = useCallback(async (page: number) => {
    try {
      startSmartLoading(setLoading)
      setError('')
      
      console.log(`📄 Fetching page ${page} (${itemsPerPage} items per page)`)
      
      // ✅ تحسين: إضافة timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Projects fetch timeout')), 30000)
      )
      
      // Calculate range for pagination
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      // Get total count
      const { count } = await supabase
        .from(TABLES.PROJECTS)
        .select('*', { count: 'exact', head: true })
      
      // Fetch paginated projects with timeout protection
      // ✅ FIXED: ALWAYS use created_at for database ordering to avoid column name issues
      // We'll sort the data client-side if needed for other columns
      // Never use project_code or any column with spaces in .order()!
      const orderColumn = 'created_at' // ✅ ALWAYS use created_at - safe column without spaces
      const ascending = false // Always descending for newest first
      
      console.log('🔍 Order column (forced to created_at):', orderColumn, 'ascending:', ascending, 'currentSort:', currentSort)
      
      const { data: projectsData, error: projectsError } = await Promise.race([
        supabase
          .from(TABLES.PROJECTS)
          .select('*')
          .order(orderColumn, { ascending }) // ✅ ALWAYS use created_at - never project_code!
          .range(from, to),
        timeoutPromise
      ]) as any

      // ✅ ALWAYS update state (React handles unmounted safely)

      if (projectsError) {
        console.error('❌ Error fetching projects:', projectsError)
        setError(projectsError.message)
        setProjects([])
      } else {
        console.log(`✅ Fetched ${projectsData?.length || 0} projects (page ${page})`)
        
        let mappedProjects = (projectsData || []).map(mapProjectFromDB)
        
        // ✅ FIXED: Apply client-side sorting for ALL columns except created_at/updated_at
        // This ensures we never use columns with spaces in database queries
        if (currentSort) {
          if (currentSort.key === 'created_at' || currentSort.key === 'updated_at') {
            // Already sorted by database, just ensure direction is correct
            if (currentSort.direction === 'asc') {
              mappedProjects.reverse()
            }
          } else {
            // Client-side sorting for all other columns (including project_code)
            mappedProjects.sort((a: Project, b: Project) => {
              const aValue = a[currentSort.key as keyof Project]
              const bValue = b[currentSort.key as keyof Project]
              
              if (aValue === null || aValue === undefined) return 1
              if (bValue === null || bValue === undefined) return -1
              
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                return currentSort.direction === 'asc' 
                  ? aValue.localeCompare(bValue)
                  : bValue.localeCompare(aValue)
              }
              
              if (typeof aValue === 'number' && typeof bValue === 'number') {
                return currentSort.direction === 'asc' 
                  ? aValue - bValue
                  : bValue - aValue
              }
              
              return 0
            })
          }
        } else {
          // Default: sort by project_code descending (newest projects first)
          mappedProjects.sort((a: Project, b: Project) => {
            const aCode = (a.project_code || '').toString().trim()
            const bCode = (b.project_code || '').toString().trim()
            
            // Extract numeric part for numeric comparison
            const aMatch = aCode.match(/(\d+)/)
            const bMatch = bCode.match(/(\d+)/)
            
            if (aMatch && bMatch) {
              const aNum = parseInt(aMatch[1], 10)
              const bNum = parseInt(bMatch[1], 10)
              // Descending order: higher numbers first (P5096 before P5095)
              return bNum - aNum
            }
            
            // Fallback to alphabetical comparison if no numbers found
            return bCode.localeCompare(aCode)
          })
        }
        
        setProjects(mappedProjects)
        setTotalCount(count || 0)
        
        // ✅ Note: Activities and KPIs are loaded in fetchAllData() on component mount
        // This ensures analytics work correctly without blocking the initial page load
        // No need to load here again - fetchAllData handles it
      }
    } catch (error: any) {
      console.error('❌ Exception:', error)
      setError('Failed to fetch data. Please check your connection.')
      setProjects([])
      
      // ✅ Try to reconnect if connection failed
      console.log('🔄 Connection error detected, attempting to reconnect...')
      const { resetClient } = await import('@/lib/simpleConnectionManager')
      resetClient()
      console.log('✅ Client reset, retrying data fetch...')
      // Retry the fetch after reset
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchProjects(page)
        }
      }, 1000)
      return
    } finally {
      // ✅ ALWAYS stop loading (React handles unmounted safely)
      stopSmartLoading(setLoading)
      console.log('🟡 Projects: Loading finished')
    }
  }, [itemsPerPage, viewMode, currentSort]) // ✅ FIXED: Added currentSort to dependencies

  useEffect(() => {
    isMountedRef.current = true
    console.log('🟡 Projects: Component mounted')
    
    // ✅ الاستماع للتحديثات من Database Management
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName } = event.detail
      console.log(`🔔 Projects: Database updated event received for ${tableName}`)
      
      // إعادة تحميل البيانات إذا كان الجدول ذو صلة
      if (tableName === TABLES.PROJECTS || tableName === TABLES.BOQ_ACTIVITIES || tableName === TABLES.KPI) {
        console.log(`🔄 Projects: Reloading data due to ${tableName} update...`)
        fetchAllData()
      }
    }
    
    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    console.log('👂 Projects: Listening for database updates')
    
    // Connection monitoring is handled by simpleConnectionManager
    
    // ✅ Initial load: Fetch projects, activities, and KPIs in parallel
    const fetchAllData = async () => {
      try {
        startSmartLoading(setLoading)
        console.log('🟡 Projects: Fetching all data in parallel...')
        
        // Fetch LIMITED data in parallel for better performance
        console.log('📊 Loading all data with enhanced lazy loading...')
        
        let projectsResult: any, activitiesResult: any, kpisResult: any;
        
        // ✅ تحسين الأداء: تحميل Projects أولاً، ثم Activities و KPIs بشكل lazy
        console.log('📊 Loading projects first (lazy loading activities/KPIs)...')
        
        // Load projects first (always needed)
        projectsResult = await supabase
            .from(TABLES.PROJECTS)
            .select('*')
          .order('created_at', { ascending: false })
        
        // ✅ ALWAYS load Activities and KPIs - Cards need them for analytics!
        // Both Card View and Table View need Activities and KPIs to calculate analytics
        console.log('📊 Loading activities and KPIs for analytics...')
        const [activitiesRes, kpisRes] = await Promise.all([
          supabase.from(TABLES.BOQ_ACTIVITIES).select('*'),
          supabase.from(TABLES.KPI).select('*')
        ])
        activitiesResult = activitiesRes
        kpisResult = kpisRes
        
        console.log('✅ Direct queries successful:', { 
          projects: projectsResult.data?.length || 0, 
          activities: activitiesResult.data?.length || 0, 
          kpis: kpisResult.data?.length || 0 
        })
        
        // Check for errors in any result
        if (projectsResult?.error) {
          console.error('❌ Projects Error:', projectsResult.error)
          setError(`Failed to load projects: ${(projectsResult.error as any)?.message || 'Unknown error'}`)
          return
        }
        
        if (activitiesResult?.error) {
          console.warn('⚠️ Activities Error:', activitiesResult.error)
        }
        
        if (kpisResult?.error) {
          console.warn('⚠️ KPIs Error:', kpisResult.error)
        }
        
        // ✅ تحسين: التحقق من البيانات قبل المعالجة
        const rawProjects = projectsResult?.data || []
        const rawActivities = activitiesResult?.data || []
        const rawKPIs = kpisResult?.data || []
        
        console.log('🔍 Raw data check:', {
          rawProjects: rawProjects.length,
          rawActivities: rawActivities.length,
          rawKPIs: rawKPIs.length,
          firstProject: rawProjects[0] ? 'exists' : 'null',
          projectsError: projectsResult?.error ? 'yes' : 'no',
          kpisError: kpisResult?.error ? 'yes' : 'no',
          // ✅ Show sample KPI structure from database
          sampleRawKPI: rawKPIs[0] ? {
            id: rawKPIs[0].id,
            'Project Code': rawKPIs[0]['Project Code'],
            'Project Sub Code': rawKPIs[0]['Project Sub Code'],
            'Project Full Code': rawKPIs[0]['Project Full Code'],
            'Activity Name': rawKPIs[0]['Activity Name'],
            'Input Type': rawKPIs[0]['Input Type']
          } : null
        })
        
        // Map all data
        const mappedProjects = rawProjects.map(mapProjectFromDB)
        const mappedActivities = rawActivities.map(mapBOQFromDB)
        const mappedKPIs = rawKPIs.map(mapKPIFromDB)
        
        console.log('📊 Data mapping results:', {
          projects: mappedProjects.length,
          activities: mappedActivities.length,
          kpis: mappedKPIs.length,
          // ✅ Show sample mapped KPI structure
          sampleMappedKPI: mappedKPIs[0] ? {
            id: mappedKPIs[0].id,
            project_code: mappedKPIs[0].project_code,
            project_sub_code: mappedKPIs[0].project_sub_code,
            project_full_code: mappedKPIs[0].project_full_code,
            activity_name: mappedKPIs[0].activity_name,
            input_type: mappedKPIs[0].input_type
          } : null
        })
        
        // ✅ تحسين: التأكد من تحديث الحالة حتى لو كانت فارغة
        setProjects(mappedProjects)
        setAllActivities(mappedActivities)
        setAllKPIs(mappedKPIs)
        setTotalCount(mappedProjects.length)
        
        console.log('🎯 Final state update:', {
          projectsSet: mappedProjects.length,
          activitiesSet: mappedActivities.length,
          kpisSet: mappedKPIs.length,
          totalCount: mappedProjects.length
        })
        
        if (mappedProjects.length === 0) {
          console.log('⚠️ No projects found in database')
        } else {
          console.log('✅ Projects: Loaded', mappedProjects.length, 'projects')
        }
        console.log('✅ Activities: Loaded', mappedActivities.length, 'activities')
        console.log('✅ KPIs: Loaded', mappedKPIs.length, 'KPIs')
        console.log('💡 All data loaded - analytics ready!')
        
      } catch (error: any) {
        console.error('❌ Exception loading data:', error)
        setError(error.message || 'Failed to load data')
      } finally {
        stopSmartLoading(setLoading)
      }
    }
    
    fetchAllData()
    
    // Cleanup function to prevent memory leaks and hanging
    return () => {
      console.log('🔴 Projects: Cleanup - component unmounting')
      isMountedRef.current = false
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
      console.log('👋 Projects: Stopped listening for database updates')
      // Connection monitoring is handled globally
    }
  }, [canUseCustomizedTable]) // ✅ Re-fetch when view mode changes
  
  // ✅ Lazy load Activities and KPIs when switching to table view
  useEffect(() => {
    if (canUseCustomizedTable && allActivities.length === 0 && allKPIs.length === 0) {
      console.log('📊 Lazy loading activities and KPIs for table view...')
      const loadAnalyticsData = async () => {
        try {
          const [activitiesRes, kpisRes] = await Promise.all([
            supabase.from(TABLES.BOQ_ACTIVITIES).select('*'),
            supabase.from(TABLES.KPI).select('*')
          ])
          
          if (activitiesRes.data) {
            const mappedActivities = activitiesRes.data.map(mapBOQFromDB)
            setAllActivities(mappedActivities)
            console.log('✅ Activities loaded:', mappedActivities.length)
          }
          
          if (kpisRes.data) {
            const mappedKPIs = kpisRes.data.map(mapKPIFromDB)
            setAllKPIs(mappedKPIs)
            console.log('✅ KPIs loaded:', mappedKPIs.length)
          }
        } catch (error) {
          console.error('❌ Error loading analytics data:', error)
        }
      }
      
      loadAnalyticsData()
    }
  }, [canUseCustomizedTable, allActivities.length, allKPIs.length])
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCreateProject = async (projectData: Partial<Project>) => {
    try {
      const dbData = mapProjectToDB(projectData)

      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .insert([dbData] as any)
        .select()
        .single()

      if (error) throw error
      
      // ✅ Success! Project created successfully
      console.log('✅ Project created successfully:', data)
      
      // Show success message
      const projectName = data?.['Project Name'] || projectData.project_name || 'Project'
      setSuccessMessage(`✅ Project "${projectName}" created successfully!`)
      setError('') // Clear any previous errors
      
      // Add the new project to the list immediately (optimistic update)
      const newProject = mapProjectFromDB(data)
      setProjects(prev => {
        const updated = [newProject, ...prev]
        // Sort by project_code descending
        return updated.sort((a: Project, b: Project) => {
          const aCode = (a.project_code || '').toString().trim()
          const bCode = (b.project_code || '').toString().trim()
          const aMatch = aCode.match(/(\d+)/)
          const bMatch = bCode.match(/(\d+)/)
          if (aMatch && bMatch) {
            return parseInt(bMatch[1], 10) - parseInt(aMatch[1], 10)
          }
          return bCode.localeCompare(aCode)
        })
      })
      setTotalCount(prev => prev + 1)
      
      setShowForm(false)
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
      
      // ✅ Reload projects in background safely (using created_at only)
      // This ensures we have the latest data without errors
      setTimeout(async () => {
        try {
          // Reset currentSort to null to force using created_at
          setCurrentSort(null)
          
          // Fetch fresh data using safe created_at ordering
          const { data: freshProjects, error: fetchError } = await supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .order('created_at', { ascending: false }) // ✅ ALWAYS use created_at - safe!
          
          if (!fetchError && freshProjects) {
            const mappedProjects = freshProjects.map(mapProjectFromDB)
            
            // Sort by project_code descending on client-side
            mappedProjects.sort((a: Project, b: Project) => {
              const aCode = (a.project_code || '').toString().trim()
              const bCode = (b.project_code || '').toString().trim()
              const aMatch = aCode.match(/(\d+)/)
              const bMatch = bCode.match(/(\d+)/)
              if (aMatch && bMatch) {
                return parseInt(bMatch[1], 10) - parseInt(aMatch[1], 10)
              }
              return bCode.localeCompare(aCode)
            })
            
            setProjects(mappedProjects)
            setTotalCount(mappedProjects.length)
            console.log('✅ Projects reloaded successfully after creation')
          }
        } catch (reloadError) {
          console.warn('⚠️ Background reload failed (not critical):', reloadError)
        }
      }, 500) // Small delay to ensure database consistency
    } catch (error: any) {
      console.error('❌ Error creating project:', error)
      setError(error.message)
    }
  }

  const handleUpdateProject = async (id: string, projectData: Partial<Project>) => {
    try {
      const dbData = mapProjectToDB(projectData)

      const { data, error } = await (supabase as any)
        .from(TABLES.PROJECTS)
        .update(dbData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setEditingProject(null)
      // Reload current page
      fetchProjects(currentPage)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const { error } = await supabase
        .from(TABLES.PROJECTS)
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Reload current page
      fetchProjects(currentPage)
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Get filtered and sorted projects with Smart Filter
  const allFilteredProjects = getFilteredAndSortedProjects().filter(project => {
    // Search filter
    const matchesSearch = (project.project_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (project.project_code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    
    // Multi-Project Code filter (Smart Filter)
    // ✅ FIX: Use project_full_code for matching instead of project_code only
    if (selectedProjectCodes.length > 0) {
      // Build project_full_code for comparison
      const projectCode = (project.project_code || '').trim()
      const projectSubCode = (project.project_sub_code || '').trim()
      
      let projectFullCode = projectCode
      if (projectSubCode) {
        // Check if sub_code already starts with project_code (case-insensitive)
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode
        } else {
          if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`
          }
        }
      }
      
      // Match using project_full_code
      if (!selectedProjectCodes.includes(projectFullCode)) return false
    }
    
    
    // Multi-Division filter (Smart Filter)
    if (selectedDivisions.length > 0) {
      const matchesDivision = selectedDivisions.some(division =>
        project.responsible_division?.toLowerCase() === division.toLowerCase()
      )
      if (!matchesDivision) return false
    }
    
    return true
  })
  
  // ✅ Apply pagination to filtered results
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const filteredProjects = allFilteredProjects.slice(startIndex, endIndex)
  
  // ✅ Update total count based on filtered results
  const filteredTotalCount = allFilteredProjects.length

  const getStatusColor = getProjectStatusColor
  const getStatusText = getProjectStatusText

  // Handle import data
  const handleImportProjects = async (importedData: any[]) => {
    try {
      console.log(`📥 Importing ${importedData.length} projects...`)
      
      // Map imported data to database format
      const projectsToInsert = importedData.map(row => ({
        'Project Code': row['Project Code'] || row['project_code'] || '',
        'Project Sub-Code': row['Project Sub-Code'] || row['project_sub_code'] || '',
        'Project Name': row['Project Name'] || row['project_name'] || '',
        'Project Type': row['Project Type'] || row['project_type'] || '',
        'Responsible Division': row['Responsible Division'] || row['responsible_division'] || '',
        'Plot Number': row['Plot Number'] || row['plot_number'] || '',
        'KPI Completed': row['KPI Completed'] || row['kpi_completed'] || 'FALSE',
        'Project Status': row['Project Status'] || row['project_status'] || 'upcoming',
        'Contract Amount': row['Contract Amount'] || row['contract_amount'] || '0',
        'Currency': row['Currency'] || row['currency'] || 'AED'
      }))
      
      // Insert into database
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .insert(projectsToInsert as any)
        .select()
      
      if (error) {
        console.error('❌ Error importing projects:', error)
        throw error
      }
      
      console.log(`✅ Successfully imported ${data?.length || 0} projects`)
      
      // Refresh projects list
      await fetchProjects(currentPage)
    } catch (error: any) {
      console.error('❌ Import failed:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  // Prepare data for export
  const getExportData = () => {
    const filtered = getFilteredAndSortedProjects()
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    
    // Map to user-friendly format
    return paginated.map(project => ({
      'Project Code': project.project_code,
      'Project Sub-Code': project.project_sub_code,
      'Project Name': project.project_name,
      'Project Type': project.project_type,
      'Responsible Division': project.responsible_division,
      'Plot Number': project.plot_number,
      'KPI Completed': project.kpi_completed ? 'YES' : 'NO',
      'Project Status': project.project_status,
      'Contract Amount': project.contract_amount,
      'Currency': 'AED',
      'Created At': project.created_at,
      'Updated At': project.updated_at
    }))
  }

  // Template columns for import
  const importTemplateColumns = [
    'Project Code',
    'Project Sub-Code',
    'Project Name',
    'Project Type',
    'Responsible Division',
    'Plot Number',
    'KPI Completed',
    'Project Status',
    'Contract Amount',
    'Currency'
  ]

  // Don't show full-page loading - show inline indicator instead
  const isInitialLoad = loading && projects.length === 0

  return (
    <div className="space-y-6 projects-container min-h-screen">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Management</h2>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full animate-pulse">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Masters of Foundation Construction - Manage and track all projects with smart analytics</p>
          </div>
          
          {/* Action Buttons - Enhanced Design with Equal Sizing */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Manage Zones Button - Dark Gray */}
            <PermissionButton
              permission="projects.zones"
              onClick={() => router.push('/projects/zones')}
              className="group relative flex items-center justify-center gap-2 min-w-[170px] h-11 px-6 py-2.5 bg-gradient-to-r from-[#363b45] to-[#3d424a] dark:from-[#4a5059] dark:to-[#525862] hover:from-[#2d3138] hover:to-[#343842] dark:hover:from-[#3a3f47] dark:hover:to-[#41464f] text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#363b45]/30 hover:scale-[1.03] active:scale-[0.97] border-0 focus:outline-none focus:ring-2 focus:ring-[#363b45] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <MapPin className="h-4 w-4 flex-shrink-0 relative z-10" />
              <span className="whitespace-nowrap relative z-10">Manage Zones</span>
            </PermissionButton>
          
            {/* Add New Project Button - Purple */}
          {guard.hasAccess('projects.create') && (
              <button 
                onClick={() => setShowForm(true)} 
                className="group relative flex items-center justify-center gap-2 min-w-[170px] h-11 px-6 py-2.5 bg-gradient-to-r from-[#6a4ee4] to-[#7a5ef4] dark:from-[#7a5ef4] dark:to-[#8a6ef4] hover:from-[#5a3ed4] hover:to-[#6a4ee4] dark:hover:from-[#6a4ee4] dark:hover:to-[#7a5ef4] text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#6a4ee4]/40 hover:scale-[1.03] active:scale-[0.97] border-0 focus:outline-none focus:ring-2 focus:ring-[#6a4ee4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <Plus className="h-4 w-4 flex-shrink-0 relative z-10" />
                <span className="whitespace-nowrap relative z-10">Add New Project</span>
              </button>
            )}

            {/* Standard View Button - Blue */}
            <PermissionButton
              permission="projects.view"
              onClick={() => {
                // Only toggle if user has permission
                if (hasPermission) {
                  setUseCustomizedTable(!useCustomizedTable)
                }
              }}
              className="group relative flex items-center justify-center gap-2 min-w-[170px] h-11 px-6 py-2.5 bg-gradient-to-r from-[#2962ff] to-[#3573ff] dark:from-[#3d72ff] dark:to-[#4d82ff] hover:from-[#1e53e6] hover:to-[#2d62ff] dark:hover:from-[#2d62ff] dark:hover:to-[#3d72ff] text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#2962ff]/40 hover:scale-[1.03] active:scale-[0.97] border-0 focus:outline-none focus:ring-2 focus:ring-[#2962ff] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md overflow-hidden"
              >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <Grid className="h-4 w-4 flex-shrink-0 relative z-10" />
              <span className="whitespace-nowrap relative z-10">{useCustomizedTable ? 'Standard View' : 'Customize Columns'}</span>
            </PermissionButton>
            </div>
        </div>
        
        {/* Action Buttons and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Data Actions Group */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Data Actions:</span>
            <PermissionGuard permission="projects.export">
              <ExportButton
                data={getExportData()}
                filename="Projects"
                formats={['csv', 'excel']}
                label="Export"
                variant="outline"
              />
            </PermissionGuard>
            
            <PermissionGuard permission="projects.print">
            <PrintButton
              label="Print"
              variant="outline"
              printTitle="Projects Report"
              printSettings={{
                fontSize: 'medium',
                compactMode: true
              }}
            />
            </PermissionGuard>
            
            <PermissionGuard permission="projects.import">
              <ImportButton
                onImport={handleImportProjects}
                requiredColumns={['Project Code', 'Project Name']}
                templateName="Projects"
                templateColumns={importTemplateColumns}
                label="Import"
                variant="outline"
              />
            </PermissionGuard>
          </div>
          
        </div>
      </div>
      
      {/* Smart Filter */}
      <SmartFilter
        projects={projects.map(p => {
          // ✅ FIX: Build project_full_code correctly, avoiding duplication
          // Check if project_sub_code already contains project_code
          const projectCode = (p.project_code || '').trim()
          const projectSubCode = (p.project_sub_code || '').trim()
          
          let projectFullCode = projectCode
          if (projectSubCode) {
            // Check if sub_code already starts with project_code (case-insensitive)
            if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
              // project_sub_code already contains project_code (e.g., "P5066-R1")
              projectFullCode = projectSubCode
            } else {
              // project_sub_code is just the suffix (e.g., "R1" or "-R1")
              if (projectSubCode.startsWith('-')) {
                projectFullCode = `${projectCode}${projectSubCode}`
              } else {
                projectFullCode = `${projectCode}-${projectSubCode}`
              }
            }
          }
          
          return {
            project_code: projectCode,
            project_sub_code: projectSubCode,
            project_full_code: projectFullCode,
            project_name: p.project_name 
          }
        })}
        activities={[]} // No activities filter for projects page
        selectedProjects={selectedProjectCodes}
        selectedActivities={selectedDivisions} // Use divisions as "activities"
        selectedTypes={selectedTypes}
        onProjectsChange={(projectCodes) => {
          console.log(`🔍 Filter: Selected ${projectCodes.length} project(s)`)
          setSelectedProjectCodes(projectCodes)
          setCurrentPage(1)
          // ✅ No re-fetch! Filtering happens client-side via filteredProjects
        }}
        onActivitiesChange={(divisions) => {
          console.log(`🔍 Filter: Selected divisions:`, divisions)
          setSelectedDivisions(divisions)
          setCurrentPage(1)
        }}
        onTypesChange={(types) => {
          console.log(`🔍 Filter: Selected types:`, types)
          setSelectedTypes(types)
          setCurrentPage(1)
        }}
        selectedZones={selectedZones}
        selectedUnits={selectedUnits}
        selectedDivisions={selectedDivisionsFilter}
        dateRange={dateRange}
        valueRange={valueRange}
        quantityRange={quantityRange}
        onZonesChange={(zones) => {
          setSelectedZones(zones)
          setCurrentPage(1)
        }}
        onUnitsChange={(units) => {
          setSelectedUnits(units)
          setCurrentPage(1)
        }}
        onDivisionsChange={(divisions) => {
          setSelectedDivisionsFilter(divisions)
          setCurrentPage(1)
        }}
        onDateRangeChange={(range) => {
          setDateRange(range)
          setCurrentPage(1)
        }}
        onValueRangeChange={(range) => {
          setValueRange(range)
          setCurrentPage(1)
        }}
        onQuantityRangeChange={(range) => {
          setQuantityRange(range)
          setCurrentPage(1)
        }}
        onClearAll={() => {
          console.log('🔄 Clearing all project filters...')
          setSelectedProjectCodes([])
          setSelectedDivisions([])
          setSelectedTypes([])
          setSelectedZones([])
          setSelectedUnits([])
          setSelectedDivisionsFilter([])
          setDateRange({})
          setValueRange({})
          setQuantityRange({})
          setCurrentPage(1)
        }}
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success">
          {successMessage}
        </Alert>
      )}

      {guard.hasAccess('projects.view') && (
      <Card className="card-modern transition-opacity duration-300">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1) // ✅ Reset to first page when searching
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-auto">
              <AdvancedSorting
                sortOptions={sortOptions}
                filterOptions={filterOptions}
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                onProjectCodeFilter={handleProjectCodeFilter}
                projects={projects.map(p => ({ project_code: p.project_code, project_name: p.project_name }))}
                currentSort={currentSort || undefined}
                currentFilters={currentFilters}
                currentProjectCode={currentProjectCode}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Show "no results" message only if filters are applied but no matches */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div>
                {projects.length === 0 ? (
                  <>
                    <p className="text-gray-500 dark:text-gray-400">No projects found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first project to get started</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 dark:text-gray-400">No projects match your filters</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or search terms</p>
                  </>
                )}
              </div>
            </div>
          ) : hasPermission ? (
            canUseCustomizedTable ? (
              // Table View with Customization - Triple check permission
              (() => {
                // ✅ DEBUG: Log data being passed to table
                console.log('📊 ProjectsList: Passing data to ProjectsTableWithCustomization', {
                  projectsCount: filteredProjects.length,
                  allActivitiesCount: allActivities.length,
                  allKPIsCount: allKPIs.length,
                  firstProjectCode: filteredProjects[0]?.project_code,
                  sampleActivity: allActivities[0] ? {
                    projectCode: allActivities[0].project_code || allActivities[0]['Project Code'] || (allActivities[0] as any).raw?.['Project Code'],
                    activityName: allActivities[0].activity_name
                  } : null,
                  sampleKPI: allKPIs[0] ? {
                    projectCode: allKPIs[0].project_code || allKPIs[0]['Project Code'] || (allKPIs[0] as any).raw?.['Project Code'],
                    activityName: allKPIs[0].activity_name,
                    inputType: allKPIs[0].input_type || allKPIs[0]['Input Type']
                  } : null
                })
                return (
                  <ProjectsTableWithCustomization
                    projects={filteredProjects}
                    onEdit={setEditingProject}
                    onDelete={handleDeleteProject}
                    allKPIs={allKPIs}
                    allActivities={allActivities}
                  />
                )
              })()
            ) : (
              // Card View - Only show if user has permission
              <div className={`grid gap-6 ${getCardGridClasses(viewMode)} transition-all duration-300 ease-in-out`}>
                {filteredProjects.map((project) => {
                  // ✅ ALL CALCULATIONS HAPPEN OUTSIDE THE CARD (in ProjectsList)
                  // Calculate analytics ONCE per project here, NOT inside ModernProjectCard
                  // This ensures better performance - calculations happen once, card just displays
                  // ✅ ALWAYS calculate analytics for cards (don't skip based on viewMode)
                  // Cards need analytics to display progress, activities, and KPIs
                  
                  // ✅ Calculate analytics - simplified and more reliable
                  // ✅ DEBUG: Log BEFORE calculation to see input data
                  if (project === filteredProjects[0] || project.project_code === 'P5096') {
                    console.log(`🔍 [${project.project_code}] BEFORE calculateProjectAnalytics:`, {
                      projectCode: project.project_code,
                      projectSubCode: project.project_sub_code,
                      allActivitiesLength: allActivities.length,
                      allKPIsLength: allKPIs.length,
                      // ✅ Show sample KPIs to see their structure
                      sampleKPIs: allKPIs.slice(0, 3).map(k => ({
                        project_code: k.project_code,
                        project_full_code: k.project_full_code,
                        'Project Code': (k as any)['Project Code'],
                        'Project Full Code': (k as any)['Project Full Code'],
                        activity_name: k.activity_name,
                        input_type: k.input_type
                      }))
                    })
                  }
                  
                  const analytics = calculateProjectAnalytics(project, allActivities, allKPIs)
                  
                  // ✅ DEBUG: Log for first project or P5096 to see what's happening
                  if (project === filteredProjects[0] || project.project_code === 'P5096') {
                    console.log(`🔍 [${project.project_code}] ProjectsList - Analytics calculated:`, {
                      projectCode: project.project_code,
                      projectSubCode: project.project_sub_code,
                      projectName: project.project_name,
                      allActivitiesLength: allActivities.length,
                      allKPIsLength: allKPIs.length,
                      analyticsResult: {
                        totalActivities: analytics.totalActivities,
                        totalKPIs: analytics.totalKPIs,
                        actualProgress: analytics.actualProgress,
                        totalValue: analytics.totalValue,
                        totalPlannedValue: analytics.totalPlannedValue,
                        totalEarnedValue: analytics.totalEarnedValue,
                        matchedActivitiesCount: analytics.activities?.length || 0,
                        matchedKPIsCount: analytics.kpis?.length || 0
                      },
                      // Show sample data to verify structure
                      sampleActivity: allActivities[0] ? {
                        project_code: allActivities[0].project_code,
                        project_full_code: allActivities[0].project_full_code,
                        rawProjectCode: (allActivities[0] as any).raw?.['Project Code'],
                        rawProjectFullCode: (allActivities[0] as any).raw?.['Project Full Code'],
                        'Project Code': (allActivities[0] as any)['Project Code'],
                        'Project Full Code': (allActivities[0] as any)['Project Full Code'],
                        activity_name: allActivities[0].activity_name
                      } : null,
                      sampleKPI: allKPIs[0] ? {
                        project_code: allKPIs[0].project_code,
                        project_full_code: allKPIs[0].project_full_code,
                        rawProjectCode: (allKPIs[0] as any).raw?.['Project Code'],
                        rawProjectFullCode: (allKPIs[0] as any).raw?.['Project Full Code'],
                        'Project Code': (allKPIs[0] as any)['Project Code'],
                        'Project Full Code': (allKPIs[0] as any)['Project Full Code'],
                        activity_name: allKPIs[0].activity_name,
                        input_type: allKPIs[0].input_type
                      } : null
                    })
                  }
                  
                  // ✅ DEBUG: Log analytics calculation (first project only to avoid spam)
                  if (project === filteredProjects[0]) {
                    console.log('🔍 ProjectsList - AFTER calculating analytics:', {
                      projectCode: project.project_code,
                      hasAnalytics: !!analytics,
                      allActivitiesLength: allActivities.length,
                      allKPIsLength: allKPIs.length,
                      // ✅ Show FULL analytics object to see all calculated values
                      analytics: analytics ? {
                        totalActivities: analytics.totalActivities,
                        totalKPIs: analytics.totalKPIs,
                        overallProgress: analytics.overallProgress,
                        actualProgress: analytics.actualProgress,
                        totalContractValue: analytics.totalContractValue,
                        totalValue: analytics.totalValue,
                        totalPlannedValue: analytics.totalPlannedValue,
                        totalEarnedValue: analytics.totalEarnedValue,
                        financialProgress: analytics.financialProgress,
                        weightedProgress: analytics.weightedProgress,
                        completedActivities: analytics.completedActivities,
                        onTrackActivities: analytics.onTrackActivities,
                        plannedKPIs: analytics.plannedKPIs,
                        actualKPIs: analytics.actualKPIs,
                        // ✅ Show matched activities and KPIs
                        matchedActivitiesCount: analytics.activities?.length || 0,
                        matchedKPIsCount: analytics.kpis?.length || 0
                      } : null
                    })
                  }
                  
                  // ✅ Pass analytics to ModernProjectCard - NO RECALCULATION INSIDE CARD
                  // ModernProjectCard will ONLY use propAnalytics (no recalculation)
                  // This is the correct pattern: calculate ONCE outside, display inside
                  return (
                    <ModernProjectCard
                      key={project.id}
                      project={project}
                      analytics={analytics} // ✅ Pre-calculated OUTSIDE card (calculated ONCE in ProjectsList)
                      allActivities={allActivities} // ✅ Pass for fallback only (should not be used if analytics provided)
                      allKPIs={allKPIs} // ✅ Pass for fallback only (should not be used if analytics provided)
                      onEdit={setEditingProject}
                      onDelete={handleDeleteProject}
                      onViewDetails={setViewingProject}
                      getStatusColor={getStatusColor}
                      getStatusText={getStatusText}
                    />
                  )
                })}
              </div>
            )
          ) : null}
        </CardContent>
        
        {/* Pagination */}
        {filteredTotalCount > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredTotalCount / itemsPerPage)}
            totalItems={filteredTotalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            loading={loading}
          />
        )}
      </Card>
      )}

      {showForm && (
        <IntelligentProjectForm
          project={null}
          onSubmit={handleCreateProject}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingProject && (
        <IntelligentProjectForm
          project={editingProject}
          onSubmit={(data: Partial<Project>) => handleUpdateProject(editingProject.id, data)}
          onCancel={() => setEditingProject(null)}
        />
      )}
      
      {viewingProject && (
        <ProjectDetailsPanel
          project={viewingProject}
          onClose={() => setViewingProject(null)}
        />
      )}
    </div>
  )
}

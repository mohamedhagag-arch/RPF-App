'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { withSafeLoading, createSafeLoadingSetter } from '@/lib/loadingStateManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { useAuth } from '@/app/providers'
import { hasPermission } from '@/lib/permissionsSystem'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getGridClasses, shouldLoadAnalytics, getViewModeIcon, getViewModeName } from '@/lib/viewModeOptimizer'
import { getCardGridClasses, shouldLoadCardAnalytics, getCardViewName, getCardViewDescription } from '@/lib/cardViewOptimizer'
import { Project, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapProjectToDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics } from '@/lib/projectAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { IntelligentProjectForm } from './IntelligentProjectForm'
import { ProjectCard } from './ProjectCard'
import { ProjectCardWithAnalytics } from './ProjectCardWithAnalytics'
import { ModernProjectCard } from './ModernProjectCard'
import { ProjectDetailsPanel } from './ProjectDetailsPanel'
import { AdvancedSorting, SortOption, FilterOption } from '@/components/ui/AdvancedSorting'
import { Pagination } from '@/components/ui/Pagination'
import { Plus, Search, Building, Calendar, DollarSign, Percent, Hash, CheckCircle, Clock, AlertCircle, Folder, BarChart3, Grid } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { SmartFilter } from '@/components/ui/SmartFilter'

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
  
  const [projects, setProjects] = useState<Project[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [allKPIs, setAllKPIs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'simple'>('cards') // Default to cards view
  
  // Smart Filter State
  const [selectedProjectCodes, setSelectedProjectCodes] = useState<string[]>([])
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  
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

  // Sort options for projects
  const sortOptions: SortOption[] = [
    { key: 'project_name', label: 'Project Name', icon: Folder, type: 'string' },
    { key: 'project_code', label: 'Project Code', icon: Hash, type: 'string' },
    { key: 'project_type', label: 'Project Type', icon: Building, type: 'string' },
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
      label: 'Project Type',
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
    }

    return filtered
  }

  // Fetch projects with pagination
  const fetchProjects = useCallback(async (page: number) => {
    try {
      startSmartLoading(setLoading)
      setError('')
      
      console.log(`📄 Fetching page ${page} (${itemsPerPage} items per page)`)
      
      // Calculate range for pagination
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      // Get total count
      const { count } = await supabase
        .from(TABLES.PROJECTS)
        .select('*', { count: 'exact', head: true })
      
      // Fetch paginated projects
      const { data: projectsData, error: projectsError } = await supabase
            .from(TABLES.PROJECTS)
            .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      // ✅ ALWAYS update state (React handles unmounted safely)

      if (projectsError) {
        console.error('❌ Error fetching projects:', projectsError)
        setError(projectsError.message)
        setProjects([])
      } else {
        console.log(`✅ Fetched ${projectsData?.length || 0} projects (page ${page})`)
        
        const mappedProjects = (projectsData || []).map(mapProjectFromDB)
        setProjects(mappedProjects)
        setTotalCount(count || 0)
        
        // Only load activities and KPIs if analytics are needed
        console.log('🔍 View mode:', viewMode, 'shouldLoadCardAnalytics:', shouldLoadCardAnalytics(viewMode))
        if (shouldLoadCardAnalytics(viewMode) && mappedProjects.length > 0) {
          console.log('📊 Loading activities and KPIs for enhanced cards...')
          
          // 🔧 PERFORMANCE: Add loading indicator
          setLoading(true)
          
          // Get project codes for current page
          const projectCodes = mappedProjects.map(p => p.project_code)
          
          // 🔧 FIX: Use the same approach as ProjectDetailsPanel
          const [activitiesResult, kpisResult] = await Promise.all([
            // For activities - try both Project Code and Project Full Code
            supabase
              .from(TABLES.BOQ_ACTIVITIES)
              .select('*')
              .or(projectCodes.map(code => `Project Code.eq.${code},Project Full Code.like.${code}%`).join(',')),
            // For KPIs - try Project Full Code first, then Project Code
            supabase
              .from(TABLES.KPI)
              .select('*')
              .or(projectCodes.map(code => `Project Full Code.eq.${code},Project Code.eq.${code},Project Full Code.like.${code}%`).join(','))
          ])
          
          console.log('🔍 Activities query result:', activitiesResult)
          console.log('🔍 KPIs query result:', kpisResult)
          
          // 🔍 DEBUG: Check for errors
          if (activitiesResult.error) {
            console.error('❌ Activities query error:', activitiesResult.error)
          }
          if (kpisResult.error) {
            console.error('❌ KPIs query error:', kpisResult.error)
          }
          
          const mappedActivities = (activitiesResult.data || []).map(mapBOQFromDB)
          const mappedKPIs = (kpisResult.data || []).map(mapKPIFromDB)
          
          setAllActivities(mappedActivities)
          setAllKPIs(mappedKPIs)
          
          console.log(`✅ Loaded ${mappedActivities.length} activities and ${mappedKPIs.length} KPIs`)
          console.log('🔍 Setting allActivities and allKPIs state...')
          
          // 🔧 PERFORMANCE: Stop loading indicator
          setLoading(false)
          
          // 🔍 DEBUG: Verify state was set
          setTimeout(() => {
            console.log('🔍 State verification (after 100ms):', {
              allActivitiesLength: allActivities.length,
              allKPIsLength: allKPIs.length
            })
          }, 100)
          console.log('🔍 Sample activities:', mappedActivities.slice(0, 2))
          console.log('🔍 Sample KPIs:', mappedKPIs.slice(0, 2))
          console.log('🔍 Project codes:', projectCodes)
          
          // 🔍 DEBUG: Check if we have data for the current projects
          projectCodes.forEach(code => {
            const projectActivities = mappedActivities.filter(a => 
              a.project_code === code || a.project_full_code?.startsWith(code)
            )
            const projectKPIs = mappedKPIs.filter(k => 
              k.project_code === code || k.project_full_code?.startsWith(code)
            )
            console.log(`🔍 Project ${code}: ${projectActivities.length} activities, ${projectKPIs.length} KPIs`)
          })
        }
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
  }, [itemsPerPage, viewMode]) // ✅ FIXED: Removed supabase to prevent infinite loop

  useEffect(() => {
    isMountedRef.current = true
    console.log('🟡 Projects: Component mounted')
    
    // Connection monitoring is handled by simpleConnectionManager
    
    // ✅ Initial load: Fetch projects, activities, and KPIs in parallel
    const fetchAllData = async () => {
      try {
        startSmartLoading(setLoading)
        console.log('🟡 Projects: Fetching all data in parallel...')
        
        // Fetch LIMITED data in parallel for better performance
        console.log('📊 Loading limited data (100 projects, 200 activities, 300 KPIs)...')
        const [projectsResult, activitiesResult, kpisResult] = await Promise.all([
          supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100), // ← تحديد 100 مشروع فقط
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .limit(200), // ← تحديد 200 نشاط فقط
          supabase
            .from(TABLES.KPI)
            .select('*')
            .limit(300) // ← تحديد 300 KPI فقط
        ])
        
        if (projectsResult.error) {
          console.error('❌ Projects Error:', projectsResult.error)
          setError(`Failed to load projects: ${projectsResult.error.message}`)
          return
        }
        
        if (activitiesResult.error) {
          console.error('❌ Activities Error:', activitiesResult.error)
        }
        
        if (kpisResult.error) {
          console.error('❌ KPIs Error:', kpisResult.error)
        }
        
        // Map all data
        const mappedProjects = (projectsResult.data || []).map(mapProjectFromDB)
        const mappedActivities = (activitiesResult.data || []).map(mapBOQFromDB)
        const mappedKPIs = (kpisResult.data || []).map(mapKPIFromDB)
        
        setProjects(mappedProjects)
        setAllActivities(mappedActivities)
        setAllKPIs(mappedKPIs)
        setTotalCount(mappedProjects.length)
        
        console.log('✅ Projects: Loaded', mappedProjects.length, 'projects')
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
      // Connection monitoring is handled globally
    }
  }, []) // Empty dependency - run ONCE only!
  
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
      
      setShowForm(false)
      // Reload current page
      fetchProjects(currentPage)
    } catch (error: any) {
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
    if (selectedProjectCodes.length > 0) {
      if (!selectedProjectCodes.includes(project.project_code)) return false
    }
    
    // Multi-Status filter (Smart Filter)
    if (selectedStatuses.length > 0) {
      const matchesStatus = selectedStatuses.some(status =>
        project.project_status?.toLowerCase() === status.toLowerCase()
      )
      if (!matchesStatus) return false
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'completed': return 'Completed'
      case 'on_hold': return 'On Hold'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  // Don't show full-page loading - show inline indicator instead
  const isInitialLoad = loading && projects.length === 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
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
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="flex items-center space-x-1 transition-all duration-200"
              title={`${getCardViewName('cards')} - ${getCardViewDescription('cards')}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Enhanced</span>
            </Button>
            <Button
              variant={viewMode === 'simple' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('simple')}
              className="flex items-center space-x-1 transition-all duration-200"
              title={`${getCardViewName('simple')} - ${getCardViewDescription('simple')}`}
            >
              <Folder className="h-4 w-4" />
              <span className="hidden sm:inline">Simple</span>
            </Button>
          </div>
          
          
          {guard.hasAccess('projects.create') && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Project</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Smart Filter */}
      <SmartFilter
        projects={projects.map(p => ({ 
          project_code: p.project_code, 
          project_name: p.project_name 
        }))}
        activities={[]} // No activities filter for projects page
        selectedProjects={selectedProjectCodes}
        selectedActivities={selectedDivisions} // Use divisions as "activities"
        selectedTypes={selectedTypes}
        selectedStatuses={selectedStatuses}
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
        onStatusesChange={(statuses) => {
          console.log(`🔍 Filter: Selected statuses:`, statuses)
          setSelectedStatuses(statuses)
          setCurrentPage(1)
          // ✅ No re-fetch! Filtering happens client-side via filteredProjects
        }}
        onClearAll={() => {
          console.log('🔄 Clearing all project filters...')
          setSelectedProjectCodes([])
          setSelectedDivisions([])
          setSelectedTypes([])
          setSelectedStatuses([])
          setCurrentPage(1)
        }}
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <Card className="card-modern">
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
                <p className="text-gray-500 dark:text-gray-400">No projects match your filters</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or search terms</p>
              </div>
            </div>
          ) : (
            // Card View
            <div className={`grid gap-6 ${getCardGridClasses(viewMode)}`}>
              {filteredProjects.map((project) => {
                // Calculate analytics for this project (using pre-loaded data)
                const analytics = shouldLoadCardAnalytics(viewMode) 
                  ? calculateProjectAnalytics(project, allActivities, allKPIs)
                  : null
                
                // تقليل التسجيل لتجنب البطء
                if (shouldLoadCardAnalytics(viewMode) && Math.random() < 0.1) {
                  console.log(`🔍 Analytics for ${project.project_code}:`, {
                    allActivitiesCount: allActivities.length,
                    allKPIsCount: allKPIs.length,
                    hasAnalytics: !!analytics
                  })
                }
                
                // 🔧 NEW: Always use ModernProjectCard for better UX
                return (
                  <ModernProjectCard
                    key={project.id}
                    project={project}
                    onEdit={setEditingProject}
                    onDelete={handleDeleteProject}
                    onViewDetails={setViewingProject}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                  />
                )
              })}
            </div>
          )}
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

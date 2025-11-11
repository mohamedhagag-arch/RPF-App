'use client'

/**
 * Enhanced Project Management Component
 * 
 * Features:
 * - Complete project management with CRUD operations
 * - Advanced filtering and sorting
 * - Real-time analytics and progress tracking
 * - Smart filtering with multiple criteria
 * - Card and Table view modes
 * - Import/Export/Print functionality
 * - Permission-based access control
 * - Optimized performance with memoization
 * 
 * All calculations and analytics are preserved from the original implementation
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getCardGridClasses } from '@/lib/cardViewOptimizer'
import { Project, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapProjectToDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics, ProjectAnalytics } from '@/lib/projectAnalytics'
import { calculateWorkValueStatus, calculateQuantityStatus } from '@/lib/workValueCalculator'
import { getProjectStatusColor, getProjectStatusText } from '@/lib/projectStatusManager'
// ✅ REMOVED: fetchProjectData - no longer needed, analytics are pre-calculated
import { updateProjectStatus } from '@/lib/projectStatusUpdater'
import { calculateProjectStatus, ProjectStatusData } from '@/lib/projectStatusCalculator'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Alert } from '@/components/ui/Alert'
import { IntelligentProjectForm } from './IntelligentProjectForm'
import { ModernProjectCard } from './ModernProjectCard'
import { ProjectDetailsPanel } from './ProjectDetailsPanel'
import { ProjectsTableWithCustomization } from './ProjectsTableWithCustomization'
import { Pagination } from '@/components/ui/Pagination'
import { Plus, Search, Building, Calendar, DollarSign, Hash, CheckCircle, Grid, MapPin, Lock, Sparkles } from 'lucide-react'
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

export function ProjectsList({ 
  globalSearchTerm = '', 
  globalFilters = { project: '', status: '', division: '', dateRange: '' } 
}: ProjectsListProps = {}) {
  // ==================== Hooks & Refs ====================
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const router = useRouter()
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true)
  const isLoadingRef = useRef(false) // ✅ Prevent multiple simultaneous loads
  const hasFetchedRef = useRef(false) // ✅ Track if initial fetch has been done
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('projects')
  
  // ==================== State Management ====================
  const [projects, setProjects] = useState<Project[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [allKPIs, setAllKPIs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm || '')
  
  // View mode state with localStorage persistence
  const [useCustomizedTable, setUseCustomizedTable] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('projects-view-mode')
      return saved === 'table'
    }
    return false
  })
  
  // Smart Filter State (same as KPI)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [valueRange, setValueRange] = useState<{ min?: number; max?: number }>({})
  const [quantityRange, setQuantityRange] = useState<{ min?: number; max?: number }>({})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  
  
  // ==================== Permission Checks ====================
  const hasPermission = guard.hasAccess('projects.view')
  const canUseCustomizedTable = hasPermission && useCustomizedTable

  // Save view preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('projects-view-mode', useCustomizedTable ? 'table' : 'cards')
    }
  }, [useCustomizedTable])

  // ==================== Permission Guard ====================
  if (!hasPermission) {
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


  // ==================== Helper Functions ====================
  /**
   * Build project_full_code from project_code and project_sub_code
   */
  const buildProjectFullCode = useCallback((project: Project): string => {
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (!projectSubCode) return projectCode
    
    // Check if sub_code already contains project_code
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      return projectSubCode
    }
    
    // Build full code
    if (projectSubCode.startsWith('-')) {
      return `${projectCode}${projectSubCode}`
    }
    return `${projectCode}-${projectSubCode}`
  }, [])

  /**
   * Sort projects by project code (descending by default)
   */
  const sortProjectsByCode = useCallback((a: Project, b: Project): number => {
        const aCode = (a.project_code || '').toString().trim()
        const bCode = (b.project_code || '').toString().trim()
        
        const aMatch = aCode.match(/(\d+)/)
        const bMatch = bCode.match(/(\d+)/)
        
        if (aMatch && bMatch) {
      return parseInt(bMatch[1], 10) - parseInt(aMatch[1], 10)
        }
        
        return bCode.localeCompare(aCode)
  }, [])

  // ==================== Data Fetching ====================
  
  /**
   * ✅ Update Responsible Divisions in projects based on BOQ Activities
   * This ensures Responsible Divisions always reflects all divisions found in BOQ Activities
   */
  const updateProjectsDivisionsFromBOQ = useCallback(async (projectsList: Project[], activitiesList: any[]) => {
    try {
      console.log('🔄 Updating Responsible Divisions from BOQ Activities...')
      
      // Helper function to match activity to project (improved matching)
      const matchesProject = (activity: any, project: Project): boolean => {
        if (!project?.project_code || !activity) return false
        
        const projectCode = (project.project_code || '').trim().toUpperCase()
        const projectSubCode = (project.project_sub_code || '').trim()
        const projectFullCode = (project.project_full_code || '').trim().toUpperCase() || 
                               (projectSubCode ? `${projectCode}-${projectSubCode}`.toUpperCase() : projectCode)
        
        // Get activity codes from multiple sources
        const rawActivity = (activity as any).raw || {}
        const activityProjectCode = (
          activity.project_code || 
          activity['Project Code'] || 
          rawActivity['Project Code'] || 
          ''
        ).toString().trim().toUpperCase()
        
        const activityProjectFullCode = (
          activity.project_full_code || 
          activity['Project Full Code'] || 
          rawActivity['Project Full Code'] || 
          ''
        ).toString().trim().toUpperCase()
        
        const activityProjectSubCode = (
          activity.project_sub_code || 
          activity['Project Sub Code'] || 
          rawActivity['Project Sub Code'] || 
          ''
        ).toString().trim()
        
        // Build activity full code if not available
        const activityFullCodeBuilt = activityProjectSubCode && !activityProjectSubCode.toUpperCase().startsWith(activityProjectCode)
          ? `${activityProjectCode}-${activityProjectSubCode}`.toUpperCase()
          : activityProjectSubCode ? activityProjectSubCode.toUpperCase() : activityProjectCode
        
        // Multiple matching strategies
        return activityProjectCode === projectCode ||
               activityProjectFullCode === projectCode ||
               activityProjectFullCode === projectFullCode ||
               activityFullCodeBuilt === projectCode ||
               activityFullCodeBuilt === projectFullCode ||
               (activityProjectSubCode && activityProjectSubCode.toUpperCase() === projectSubCode.toUpperCase()) ||
               (activityProjectFullCode && projectFullCode && activityProjectFullCode.includes(projectCode)) ||
               (activityProjectFullCode && projectFullCode && projectFullCode.includes(activityProjectCode))
      }
      
      let updatedCount = 0
      
      // For each project, collect all divisions from BOQ Activities
      for (const project of projectsList) {
        try {
          // Get all activities for this project
          const projectActivities = activitiesList.filter((activity: any) => matchesProject(activity, project))
          
          // Collect unique divisions from activities
          const divisionsFromBOQ = new Set<string>()
          projectActivities.forEach((activity: any) => {
            const activityDivision = activity.activity_division || 
                                   (activity as any).raw?.['Activity Division'] ||
                                   (activity as any).raw?.['activity_division'] ||
                                   ''
            if (activityDivision && activityDivision.trim() !== '') {
              divisionsFromBOQ.add(activityDivision.trim())
            }
          })
          
          // Get current divisions from project
          const currentDivisions = project.responsible_division 
            ? project.responsible_division.split(',').map(d => d.trim()).filter(d => d.length > 0)
            : []
          
          // Merge divisions (from project and BOQ)
          const allDivisionsSet = new Set<string>()
          currentDivisions.forEach(d => allDivisionsSet.add(d))
          divisionsFromBOQ.forEach(d => allDivisionsSet.add(d))
          
          const allDivisionsList = Array.from(allDivisionsSet).sort()
          const updatedDivisionsString = allDivisionsList.join(', ')
          
          // Only update if divisions changed
          if (updatedDivisionsString !== project.responsible_division) {
            console.log(`📝 Updating Responsible Divisions for ${project.project_code}:`, {
              current: project.responsible_division,
              fromBOQ: Array.from(divisionsFromBOQ),
              updated: updatedDivisionsString
            })
            
            // Update in database
            const { error: updateError } = await (supabase as any)
              .from(TABLES.PROJECTS)
              .update({ 'Responsible Division': updatedDivisionsString })
              .eq('id', project.id)
            
            if (updateError) {
              console.error(`❌ Error updating divisions for ${project.project_code}:`, updateError)
            } else {
              updatedCount++
              // Update local state
              setProjects(prev => prev.map(p => 
                p.id === project.id 
                  ? { ...p, responsible_division: updatedDivisionsString }
                  : p
              ))
            }
          }
        } catch (projectError: any) {
          console.warn(`⚠️ Error updating divisions for project ${project.project_code}:`, projectError)
          // Continue with next project
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Updated Responsible Divisions for ${updatedCount} projects from BOQ Activities`)
      } else {
        console.log('✅ All projects already have correct Responsible Divisions')
      }
    } catch (error: any) {
      console.error('❌ Error updating projects divisions from BOQ:', error)
      throw error
    }
  }, [supabase])
  
  /**
   * Fetch all data (projects, activities, KPIs) in parallel
   * ✅ FIXED: Added guard to prevent multiple simultaneous loads
   */
  const fetchAllData = useCallback(async () => {
    // ✅ Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⏸️ Data fetch already in progress, skipping...')
      return
    }

    try {
      isLoadingRef.current = true
      startSmartLoading(setLoading)
      setError('')
      // ✅ PERFORMANCE: Only log in development mode
      if (process.env.NODE_ENV === 'development') {
      console.log('📊 Loading all project data...')
      }
      
      // ✅ Helper function to fetch all records with pagination (Supabase default limit is 1000)
      const fetchAllRecords = async (table: string, orderBy?: string) => {
        let allData: any[] = []
        let offset = 0
        const chunkSize = 1000
        let hasMore = true
        
        while (hasMore) {
          let query = supabase
            .from(table)
            .select('*')
            .range(offset, offset + chunkSize - 1)
          
          if (orderBy) {
            query = query.order(orderBy, { ascending: false })
          }
          
          const { data, error } = await query
          
          if (error) {
            console.error(`❌ Error fetching ${table}:`, error)
            break
          }
          
          if (!data || data.length === 0) {
            hasMore = false
            break
          }
          
          allData = [...allData, ...data]
          // ✅ PERFORMANCE: Only log in development mode
          if (process.env.NODE_ENV === 'development') {
          console.log(`📥 Fetched ${table} chunk: ${data.length} records (total so far: ${allData.length})`)
          }
          
          if (data.length < chunkSize) {
            hasMore = false
          } else {
            offset += chunkSize
          }
        }
        
        // ✅ PERFORMANCE: Only log in development mode
        if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Total ${table} records fetched: ${allData.length}`)
        }
        return allData
      }
      
      // ✅ Fetch all data with pagination to overcome 1000-record limit
      const [projectsData, activitiesData, kpisData] = await Promise.all([
        fetchAllRecords(TABLES.PROJECTS, 'created_at'),
        fetchAllRecords(TABLES.BOQ_ACTIVITIES),
        fetchAllRecords(TABLES.KPI, 'created_at')
      ])
      
      // ✅ Data fetched successfully (no errors from fetchAllRecords)
      // Check if data arrays are valid
      if (!projectsData || !Array.isArray(projectsData)) {
        console.error('❌ Projects data is invalid')
        setError('Failed to load projects: Invalid data format')
        return
      }
        
        // Map all data
      const mappedProjects = (projectsData || []).map(mapProjectFromDB)
      const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      const mappedKPIs = (kpisData || []).map(mapKPIFromDB)

      // ✅ Update Responsible Divisions in projects based on BOQ Activities
      try {
        await updateProjectsDivisionsFromBOQ(mappedProjects, mappedActivities)
      } catch (divisionError) {
        console.warn('⚠️ Failed to update projects divisions from BOQ:', divisionError)
        // Don't throw - continue with data loading
      }

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setProjects(mappedProjects)
        setAllActivities(mappedActivities)
        setAllKPIs(mappedKPIs)
        setTotalCount(mappedProjects.length)
        
        // ✅ PERFORMANCE: Only log in development mode
        if (process.env.NODE_ENV === 'development') {
        console.log('✅ Data loaded:', {
          projects: mappedProjects.length,
          activities: mappedActivities.length,
          kpis: mappedKPIs.length
        })
        }
        
        // ✅ PERFORMANCE: Auto-update project statuses in background (non-blocking)
        // ✅ OPTIMIZED: Reduced from 10 to 5 projects to improve performance
        // This ensures statuses are calculated and saved to database automatically
        if (mappedProjects.length > 0 && mappedActivities.length > 0) {
          // Update statuses in background without blocking UI
          setTimeout(async () => {
            try {
              if (process.env.NODE_ENV === 'development') {
              console.log('🔄 Auto-updating project statuses based on activities...')
              }
              let updatedCount = 0
              // ✅ PERFORMANCE: Reduced from 10 to 5 projects to avoid overload
              for (const project of mappedProjects.slice(0, 5)) {
                try {
                  const update = await updateProjectStatus(project.id)
                  if (update) {
                    updatedCount++
                    // Refresh project data after status update
                    if (isMountedRef.current && !isLoadingRef.current) {
                      // Update the project in state with new status
                      setProjects(prev => prev.map(p => 
                        p.id === project.id 
                          ? { ...p, project_status: update.new_status as any }
                          : p
                      ))
                    }
                  }
                } catch (projectError: any) {
                  // ✅ Silently skip projects that fail to update (e.g., don't exist in DB)
                  // This prevents errors from blocking the entire update process
                  if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ Skipped updating project ${project.id}:`, projectError?.message || 'Unknown error')
                  }
                }
                // ✅ PERFORMANCE: Increased delay to reduce database load
                await new Promise(resolve => setTimeout(resolve, 500))
              }
              if (updatedCount > 0 && process.env.NODE_ENV === 'development') {
                console.log(`✅ Auto-updated ${updatedCount} project statuses`)
              }
            } catch (error) {
              console.error('❌ Error auto-updating project statuses:', error)
            }
          }, 2000) // ✅ PERFORMANCE: Increased delay from 1s to 2s to allow UI to render first
        }
      }
      } catch (error: any) {
        console.error('❌ Exception loading data:', error)
      if (isMountedRef.current) {
        setError(error.message || 'Failed to load data')
      }
      } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        stopSmartLoading(setLoading)
      }
    }
  }, [supabase, startSmartLoading, stopSmartLoading])

  // ==================== Event Handlers ====================

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleCreateProject = useCallback(async (projectData: Partial<Project>) => {
    try {
      console.log('🆕 handleCreateProject: Received projectData:', {
        project_duration: projectData.project_duration,
        project_start_date: projectData.project_start_date,
        project_completion_date: projectData.project_completion_date,
        hasProjectDuration: 'project_duration' in projectData
      })
      
      const dbData = mapProjectToDB(projectData)
      console.log('💾 handleCreateProject: Mapped dbData:', {
        'Project Duration': dbData['Project Duration'],
        hasProjectDuration: 'Project Duration' in dbData,
        allKeys: Object.keys(dbData).filter(k => k.toLowerCase().includes('duration') || k.toLowerCase().includes('date'))
      })
      
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .insert([dbData] as any)
        .select()
        .single()

      if (error) {
        console.error('❌ handleCreateProject: Database error:', error)
        throw error
      }
      
      console.log('✅ handleCreateProject: Saved to database, response:', {
        'Project Duration': data?.['Project Duration'],
        id: (data as any)?.id
      })
      
      const projectName = data?.['Project Name'] || projectData.project_name || 'Project'
      setSuccessMessage(`✅ Project "${projectName}" created successfully!`)
      setError('')
      
      // Optimistic update
      const newProject = mapProjectFromDB(data)
      setProjects(prev => {
        const updated = [newProject, ...prev]
        return updated.sort(sortProjectsByCode)
      })
      setTotalCount(prev => prev + 1)
      setShowForm(false)
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)

      // Reload data in background (only if not already loading)
      setTimeout(() => {
        if (isMountedRef.current && !isLoadingRef.current) {
          fetchAllData()
        }
      }, 500)
    } catch (error: any) {
      console.error('❌ Error creating project:', error)
      setError(error.message)
    }
  }, [supabase, sortProjectsByCode, fetchAllData])

  const handleUpdateProject = useCallback(async (id: string, projectData: Partial<Project>) => {
    try {
      console.log('🔄 handleUpdateProject: Received projectData:', {
        project_duration: projectData.project_duration,
        project_start_date: projectData.project_start_date,
        project_completion_date: projectData.project_completion_date,
        hasProjectDuration: 'project_duration' in projectData
      })
      
      const dbData = mapProjectToDB(projectData)
      console.log('💾 handleUpdateProject: Mapped dbData:', {
        'Project Duration': dbData['Project Duration'],
        hasProjectDuration: 'Project Duration' in dbData,
        allKeys: Object.keys(dbData).filter(k => k.toLowerCase().includes('duration') || k.toLowerCase().includes('date'))
      })
      
      const { data, error } = await (supabase as any)
        .from(TABLES.PROJECTS)
        .update(dbData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ handleUpdateProject: Database error:', error)
        throw error
      }
      
      console.log('✅ handleUpdateProject: Saved to database, response:', {
        'Project Duration': data?.['Project Duration'],
        id: data?.id
      })
      
      setEditingProject(null)
      // ✅ Only reload if not already loading
      if (!isLoadingRef.current) {
        await fetchAllData()
      }
    } catch (error: any) {
      console.error('❌ handleUpdateProject: Error:', error)
      setError(error.message)
    }
  }, [supabase, fetchAllData])

  const handleDeleteProject = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const { error } = await supabase
        .from(TABLES.PROJECTS)
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // ✅ Only reload if not already loading
      if (!isLoadingRef.current) {
        await fetchAllData()
      }
    } catch (error: any) {
      setError(error.message)
    }
  }, [supabase, fetchAllData])

  // ==================== Analytics Calculation ====================
  /**
   * ✅ PERFORMANCE: Pre-calculate analytics for all projects using loaded data
   * ✅ OPTIMIZED: Use Map-based lookup instead of filter for each project (O(n) instead of O(n*m))
   * This prevents each card from fetching data separately
   */
  const projectsAnalytics = useMemo(() => {
    const analyticsMap = new Map<string, ProjectAnalytics>()
    
    // ✅ PERFORMANCE: Build lookup maps once instead of filtering for each project
    // This reduces complexity from O(n*m) to O(n+m)
    const activitiesByProject = new Map<string, any[]>()
    const kpisByProject = new Map<string, any[]>()
        
    // Build activities lookup map
    allActivities.forEach(activity => {
      const activityProjectFullCode = (activity.project_full_code || '').toString().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim()
      const activityProjectSubCode = (activity.project_sub_code || '').toString().trim()
          
      // Add to map by project_full_code (primary key)
      if (activityProjectFullCode) {
        if (!activitiesByProject.has(activityProjectFullCode)) {
          activitiesByProject.set(activityProjectFullCode, [])
        }
        activitiesByProject.get(activityProjectFullCode)!.push(activity)
      }
      
      // Also add by built full code if different
          if (activityProjectCode && activityProjectSubCode) {
        let builtFullCode = activityProjectCode
            if (activityProjectSubCode.toUpperCase().startsWith(activityProjectCode.toUpperCase())) {
          builtFullCode = activityProjectSubCode
            } else if (activityProjectSubCode.startsWith('-')) {
          builtFullCode = `${activityProjectCode}${activityProjectSubCode}`
            } else {
          builtFullCode = `${activityProjectCode}-${activityProjectSubCode}`
            }
        if (builtFullCode !== activityProjectFullCode) {
          if (!activitiesByProject.has(builtFullCode)) {
            activitiesByProject.set(builtFullCode, [])
          }
          activitiesByProject.get(builtFullCode)!.push(activity)
            }
          }
          
      // Add by project_code only if no sub_code (fallback)
      if (!activityProjectSubCode && activityProjectCode) {
        if (!activitiesByProject.has(activityProjectCode)) {
          activitiesByProject.set(activityProjectCode, [])
        }
        activitiesByProject.get(activityProjectCode)!.push(activity)
      }
    })
    
    // Build KPIs lookup map
    allKPIs.forEach(kpi => {
      const kpiProjectFullCode = ((kpi.project_full_code || (kpi as any)['Project Full Code'] || '')).toString().trim()
      const kpiProjectCode = ((kpi as any).project_code || (kpi as any)['Project Code'] || '').toString().trim()
      const kpiProjectSubCode = ((kpi as any).project_sub_code || (kpi as any)['Project Sub Code'] || '').toString().trim()
          
      // Add to map by project_full_code (primary key)
      if (kpiProjectFullCode) {
        if (!kpisByProject.has(kpiProjectFullCode)) {
          kpisByProject.set(kpiProjectFullCode, [])
        }
        kpisByProject.get(kpiProjectFullCode)!.push(kpi)
      }
      
      // Also add by built full code if different
          if (kpiProjectCode && kpiProjectSubCode) {
        let builtFullCode = kpiProjectCode
            if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
          builtFullCode = kpiProjectSubCode
            } else if (kpiProjectSubCode.startsWith('-')) {
          builtFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
            } else {
          builtFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
            }
        if (builtFullCode !== kpiProjectFullCode) {
          if (!kpisByProject.has(builtFullCode)) {
            kpisByProject.set(builtFullCode, [])
          }
          kpisByProject.get(builtFullCode)!.push(kpi)
            }
          }
          
      // Add by project_code only if no sub_code (fallback)
      if (!kpiProjectSubCode && kpiProjectCode) {
        if (!kpisByProject.has(kpiProjectCode)) {
          kpisByProject.set(kpiProjectCode, [])
        }
        kpisByProject.get(kpiProjectCode)!.push(kpi)
      }
    })
    
    // ✅ PERFORMANCE: Now calculate analytics using Map lookup (O(1) instead of O(n))
    projects.forEach(project => {
      try {
        const projectFullCode = buildProjectFullCode(project)
        const projectCode = (project.project_code || '').trim()
        const projectSubCode = (project.project_sub_code || '').trim()
        
        // ✅ PERFORMANCE: Use Map lookup instead of filter
        const projectActivities = activitiesByProject.get(projectFullCode) || 
                                  (projectSubCode ? [] : activitiesByProject.get(projectCode) || [])
        const projectKPIs = kpisByProject.get(projectFullCode) || 
                           (projectSubCode ? [] : kpisByProject.get(projectCode) || [])
        
        // Calculate analytics for this project
        const analytics = calculateProjectAnalytics(project, projectActivities, projectKPIs)
        
        // ✅ PERFORMANCE: Pre-calculate workValueStatus and quantityStatus once (reused in table/cards)
        analytics.workValueStatus = calculateWorkValueStatus(project, projectActivities, projectKPIs)
        analytics.quantityStatus = calculateQuantityStatus(project, projectActivities, projectKPIs)
        
        analyticsMap.set(project.id, analytics)
      } catch (error) {
        // ✅ PERFORMANCE: Only log errors in development mode
        if (process.env.NODE_ENV === 'development') {
        console.error(`❌ Error calculating analytics for ${project.project_code}:`, error)
        }
      }
    })
    
    // ✅ PERFORMANCE: Only log in development mode
    if (process.env.NODE_ENV === 'development' && analyticsMap.size > 0) {
      console.log(`✅ Pre-calculated analytics for ${analyticsMap.size} projects`)
    }
    
    return analyticsMap
  }, [projects, allActivities, allKPIs, buildProjectFullCode])
  
  // ==================== Filtering & Sorting ====================
  /**
   * Get filtered and sorted projects
   */
  const getFilteredAndSortedProjects = useCallback((): Project[] => {
    let filtered = [...projects]

    // Default sorting: By project code descending
    filtered.sort(sortProjectsByCode)

    return filtered
  }, [projects, sortProjectsByCode])

  /**
   * Apply Smart Filter and search to projects
   */
  const allFilteredProjects = useMemo(() => {
    return getFilteredAndSortedProjects().filter(project => {
    // Search filter
    const matchesSearch = (project.project_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (project.project_code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    
    // Multi-Project filter (Smart Filter)
    if (selectedProjects.length > 0) {
      const projectFullCode = buildProjectFullCode(project)
      const matchesProject = selectedProjects.some(selectedProject =>
        projectFullCode === selectedProject ||
        projectFullCode.includes(selectedProject) ||
        selectedProject.includes(projectFullCode)
      )
      if (!matchesProject) return false
    }
    
    // Multi-Division filter (Smart Filter)
    if (selectedDivisions.length > 0) {
      const projectDivision = (project.responsible_division || '').toLowerCase().trim()
      const matchesDivision = selectedDivisions.some(division =>
        projectDivision === division.toLowerCase().trim() ||
        projectDivision.includes(division.toLowerCase().trim()) ||
        division.toLowerCase().trim().includes(projectDivision)
      )
      if (!matchesDivision) return false
    }
    
    // Project Type filter (Smart Filter)
    if (selectedTypes.length > 0) {
      const projectType = (project.project_type || '').toLowerCase().trim()
      const matchesType = selectedTypes.some(type =>
        projectType === type.toLowerCase().trim() ||
        projectType.includes(type.toLowerCase().trim()) ||
        type.toLowerCase().trim().includes(projectType)
      )
      if (!matchesType) return false
    }
    
    // Project Status filter (Smart Filter)
    // ✅ Use calculated status (same as table) for accurate filtering
    if (selectedStatuses.length > 0) {
      let projectStatus = (project.project_status || 'upcoming').toLowerCase().trim()
      
      // ✅ Calculate status automatically if we have activities or KPIs (same logic as table)
      try {
        const projectFullCode = buildProjectFullCode(project)
        const projectCode = (project.project_code || '').trim()
        const projectSubCode = (project.project_sub_code || '').trim()
        
        // ✅ Use strict matching by project_full_code ONLY (same as BOQ/KPI pages)
        const projectActivities = allActivities.filter(a => {
          // Build activity project_full_code from multiple sources
          const activityProjectFullCode = (a.project_full_code || '').toString().trim()
          const activityProjectCode = (a.project_code || '').toString().trim()
          const activityProjectSubCode = (a.project_sub_code || '').toString().trim()
          
          // Priority 1: Exact match on project_full_code
          if (activityProjectFullCode && activityProjectFullCode === projectFullCode) {
            return true
          }
          
          // Priority 2: Build activity full code and match
          if (activityProjectCode && activityProjectSubCode) {
            let activityFullCode = activityProjectCode
            if (activityProjectSubCode.toUpperCase().startsWith(activityProjectCode.toUpperCase())) {
              activityFullCode = activityProjectSubCode
            } else if (activityProjectSubCode.startsWith('-')) {
              activityFullCode = `${activityProjectCode}${activityProjectSubCode}`
            } else {
              activityFullCode = `${activityProjectCode}-${activityProjectSubCode}`
            }
            if (activityFullCode === projectFullCode) {
              return true
            }
          }
          
          // ❌ DO NOT match by project_code alone if project has sub_code (to avoid mixing projects)
          // Only allow if current project has no sub_code (old data fallback)
          if (!projectSubCode && !activityProjectFullCode && activityProjectCode === projectCode) {
            return true
          }
          
          return false
        })
        
        const projectKPIs = allKPIs.filter(k => {
          // Build KPI project_full_code from multiple sources
          const kpiProjectFullCode = ((k.project_full_code || (k as any)['Project Full Code'] || '')).toString().trim()
          const kpiProjectCode = ((k as any).project_code || (k as any)['Project Code'] || '').toString().trim()
          const kpiProjectSubCode = ((k as any).project_sub_code || (k as any)['Project Sub Code'] || '').toString().trim()
          
          // Priority 1: Exact match on project_full_code
          if (kpiProjectFullCode && kpiProjectFullCode === projectFullCode) {
            return true
          }
          
          // Priority 2: Build KPI full code and match
          if (kpiProjectCode && kpiProjectSubCode) {
            let kpiFullCode = kpiProjectCode
            if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
              kpiFullCode = kpiProjectSubCode
            } else if (kpiProjectSubCode.startsWith('-')) {
              kpiFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
            } else {
              kpiFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
            }
            if (kpiFullCode === projectFullCode) {
              return true
            }
          }
          
          // ❌ DO NOT match by project_code alone if project has sub_code (to avoid mixing projects)
          // Only allow if current project has no sub_code (old data fallback)
          if (!projectSubCode && !kpiProjectFullCode && kpiProjectCode === projectCode) {
            return true
          }
          
          return false
        })
        
        if (projectActivities.length > 0 || projectKPIs.length > 0) {
          const statusData: ProjectStatusData = {
            project_id: project.id,
            project_code: project.project_code || '',
            project_name: project.project_name || '',
            project_start_date: project.project_start_date || project.created_at || new Date().toISOString(),
            project_end_date: project.project_completion_date || new Date().toISOString(),
            current_date: new Date().toISOString(),
            activities: projectActivities.map((activity: any) => ({
              id: activity.id || activity.activity_id || '',
              activity_timing: activity.activity_timing || (activity as any).raw?.['Activity Timing'] || 'post-commencement',
              planned_units: activity.planned_units || activity.total_units || 0,
              actual_units: activity.actual_units || 0,
              planned_activity_start_date: activity.planned_start_date || activity.planned_activity_start_date || (activity as any).raw?.['Planned Start Date'] || '',
              deadline: activity.deadline || (activity as any).raw?.['Deadline'] || '',
              status: activity.status || activity.activity_completed ? 'completed' : (activity.activity_delayed ? 'delayed' : 'not_started')
            })),
            kpis: projectKPIs.map((kpi: any) => ({
              id: kpi.id || '',
              input_type: kpi.input_type || (kpi as any).raw?.['Input Type'] || 'Planned',
              quantity: kpi.quantity || kpi.Quantity || 0,
              target_date: kpi.target_date || kpi.activity_date || (kpi as any).raw?.['Target Date'] || '',
              actual_date: kpi.actual_date || (kpi as any).raw?.['Actual Date']
            }))
          }
          
          const statusResult = calculateProjectStatus(statusData)
          projectStatus = statusResult.status.toLowerCase().trim()
          
          // Debug log (only in development)
          if (process.env.NODE_ENV === 'development' && selectedStatuses.includes('completed')) {
            console.log(`🔍 [Filter] Project ${project.project_code}:`, {
              dbStatus: project.project_status,
              calculatedStatus: statusResult.status,
              activities: projectActivities.length,
              kpis: projectKPIs.length,
              selectedStatuses,
              matches: selectedStatuses.some(s => statusResult.status.toLowerCase().trim() === s.toLowerCase().trim())
            })
          }
        }
      } catch (error) {
        // Fallback to database status if calculation fails
        console.warn('Error calculating status for filter:', error)
      }
      
      // ✅ Improved matching: handle both exact match and case-insensitive
      const matchesStatus = selectedStatuses.some(status => {
        const normalizedStatus = status.toLowerCase().trim()
        const normalizedProjectStatus = projectStatus.toLowerCase().trim()
        return normalizedProjectStatus === normalizedStatus
      })
      
      if (!matchesStatus) return false
    }
    
    // Date range filter (Smart Filter) - based on project dates
    if (dateRange.from || dateRange.to) {
      const projectDate = project.project_start_date || project.created_at
      if (projectDate) {
        const projDate = new Date(projectDate)
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from)
          fromDate.setHours(0, 0, 0, 0)
          if (projDate < fromDate) return false
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          if (projDate > toDate) return false
        }
      }
    }
    
    // Contract Amount range filter (Smart Filter)
    if (valueRange.min !== undefined || valueRange.max !== undefined) {
      const contractAmount = project.contract_amount || 0
      if (valueRange.min !== undefined && contractAmount < valueRange.min) return false
      if (valueRange.max !== undefined && contractAmount > valueRange.max) return false
    }
    
    return true
  })
  }, [getFilteredAndSortedProjects, searchTerm, selectedProjects, selectedDivisions, selectedTypes, selectedStatuses, dateRange, valueRange, buildProjectFullCode, allActivities, allKPIs])
  
  // Apply pagination
  const filteredProjects = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
    return allFilteredProjects.slice(startIndex, endIndex)
  }, [allFilteredProjects, currentPage, itemsPerPage])
  
  const filteredTotalCount = allFilteredProjects.length

  // ==================== Import/Export ====================
  const handleImportProjects = useCallback(async (importedData: any[]) => {
    try {
      console.log(`📥 Importing ${importedData.length} projects...`)
      
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
      
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .insert(projectsToInsert as any)
        .select()
      
      if (error) throw error
      
      console.log(`✅ Successfully imported ${data?.length || 0} projects`)
      // ✅ Only reload if not already loading
      if (!isLoadingRef.current) {
        await fetchAllData()
      }
    } catch (error: any) {
      console.error('❌ Import failed:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }, [supabase, fetchAllData])

  const getExportData = useCallback(() => {
    return filteredProjects.map(project => ({
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
  }, [filteredProjects])

  const importTemplateColumns = useMemo(() => [
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
  ], [])

  // ==================== Effects ====================
  useEffect(() => {
    isMountedRef.current = true
    isLoadingRef.current = false
    console.log('🟡 Projects: Component mounted')

    // Listen for database updates
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName } = event.detail
      console.log(`🔔 Projects: Database updated event received for ${tableName}`)

      if (tableName === TABLES.PROJECTS || tableName === TABLES.BOQ_ACTIVITIES || tableName === TABLES.KPI) {
        console.log(`🔄 Projects: Reloading data due to ${tableName} update...`)
        // ✅ Only reload if not already loading
        if (!isLoadingRef.current) {
          fetchAllData()
        }
      }
    }

    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    
    // ✅ Initial fetch - only once on mount
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchAllData()
    }

    return () => {
      console.log('🔴 Projects: Cleanup - component unmounting')
      isMountedRef.current = false
      isLoadingRef.current = false
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
    }
    // ✅ FIXED: Remove fetchAllData from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Lazy load Activities and KPIs when switching to table view
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
            setAllActivities(activitiesRes.data.map(mapBOQFromDB))
          }

          if (kpisRes.data) {
            setAllKPIs(kpisRes.data.map(mapKPIFromDB))
          }
        } catch (error) {
          console.error('❌ Error loading analytics data:', error)
        }
      }
      loadAnalyticsData()
    }
  }, [canUseCustomizedTable, allActivities.length, allKPIs.length, supabase])

  // ==================== Render ====================
  // ✅ PERFORMANCE: Memoize status functions to prevent re-renders
  const getStatusColor = useCallback((status: string) => getProjectStatusColor(status), [])
  const getStatusText = useCallback((status: string) => getProjectStatusText(status), [])


  return (
    <div className="space-y-6 projects-container min-h-screen">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                Project Management
              </h2>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full animate-pulse">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Masters of Foundation Construction - Manage and track all projects with smart analytics
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <PermissionButton
              permission="projects.zones"
              onClick={() => router.push('/projects/zones')}
              className="group relative flex items-center justify-center gap-2 min-w-[170px] h-11 px-6 py-2.5 bg-gradient-to-r from-[#363b45] to-[#3d424a] dark:from-[#4a5059] dark:to-[#525862] hover:from-[#2d3138] hover:to-[#343842] dark:hover:from-[#3a3f47] dark:hover:to-[#41464f] text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#363b45]/30 hover:scale-[1.03] active:scale-[0.97] border-0 focus:outline-none focus:ring-2 focus:ring-[#363b45] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <MapPin className="h-4 w-4 flex-shrink-0 relative z-10" />
              <span className="whitespace-nowrap relative z-10">Manage Zones</span>
            </PermissionButton>
          
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

            <PermissionButton
              permission="projects.view"
              onClick={() => {
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
        
        {/* Data Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
      
      {/* Smart Filter - Always Expanded for Project Management */}
      <SmartFilter
        alwaysExpanded={true}
        projects={useMemo(() => projects.map(p => {
          // Build project_full_code correctly
          const projectCode = (p.project_code || '').trim()
          const projectSubCode = (p.project_sub_code || '').trim()
          
          let projectFullCode = projectCode
          if (projectSubCode) {
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
          
          return {
            project_code: projectCode,
            project_sub_code: projectSubCode,
            project_full_code: projectFullCode,
            project_name: p.project_name 
          }
        }), [projects])}
        activities={useMemo(() => allActivities.map(a => ({
          activity_name: a.activity_name,
          project_code: a.project_code,
          zone: a.zone_ref || a.zone_number || '',
          unit: a.unit || '',
          activity_division: a.activity_division || ''
        })), [allActivities])}
        kpis={useMemo(() => allKPIs.map(k => ({
          zone: (k as any).zone || (k as any).section || '',
          unit: (k as any).unit || '',
          activity_division: (k as any).activity_division || '',
          value: (k as any).value || 0,
          quantity: (k as any).quantity || 0
        })), [allKPIs])}
        selectedProjects={selectedProjects}
        selectedActivities={selectedActivities}
        selectedTypes={selectedTypes}
        selectedStatuses={selectedStatuses}
        selectedZones={selectedZones}
        selectedUnits={selectedUnits}
        selectedDivisions={selectedDivisions}
        dateRange={dateRange}
        valueRange={valueRange}
        quantityRange={quantityRange}
        onProjectsChange={(projectCodes) => {
          setSelectedProjects(projectCodes)
          setCurrentPage(1)
        }}
        onActivitiesChange={setSelectedActivities}
        onTypesChange={setSelectedTypes}
        onStatusesChange={(statuses) => {
          setSelectedStatuses(statuses)
          setCurrentPage(1)
        }}
        onZonesChange={setSelectedZones}
        onUnitsChange={setSelectedUnits}
        onDivisionsChange={setSelectedDivisions}
        onDateRangeChange={setDateRange}
        onValueRangeChange={setValueRange}
        onQuantityRangeChange={setQuantityRange}
        onClearAll={() => {
          setSelectedProjects([])
          setSelectedActivities([])
          setSelectedTypes([])
          setSelectedStatuses([])
          setSelectedZones([])
          setSelectedUnits([])
          setSelectedDivisions([])
          setDateRange({})
          setValueRange({})
          setQuantityRange({})
          setCurrentPage(1)
        }}
      />

      {/* Error & Success Messages */}
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

      {/* Main Content */}
      {guard.hasAccess('projects.view') && (
      <Card className="card-modern transition-opacity duration-300">
          <CardHeader>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
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
          ) : hasPermission ? (
            canUseCustomizedTable ? (
                  <ProjectsTableWithCustomization
                    projects={filteredProjects}
                    onEdit={setEditingProject}
                    onDelete={handleDeleteProject}
                    allKPIs={allKPIs}
                    allActivities={allActivities}
                    projectsAnalytics={projectsAnalytics} // ✅ Pass pre-calculated analytics for better performance
                  />
            ) : (
                <div className={`grid gap-6 ${getCardGridClasses('cards')} transition-all duration-300 ease-in-out`}>
                {filteredProjects.map((project) => {
                  // ✅ PERFORMANCE: Use pre-calculated analytics instead of fetching for each card
                  const analytics = projectsAnalytics.get(project.id) || null
                  
                  return (
                    <ModernProjectCard
                      key={project.id}
                      project={project}
                      analytics={analytics}
                      allActivities={allActivities}
                      allKPIs={allKPIs}
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

      {/* Modals */}
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

// ✅ REMOVED: ProjectCardWithDataFetcher is no longer needed
// Analytics are now pre-calculated in ProjectsList for better performance
// This eliminates N separate database calls (one per card) and replaces them with a single batch calculation

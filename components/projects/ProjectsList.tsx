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
  initialProjectCode?: string // ✅ Project code from URL query parameter
}

export function ProjectsList({ 
  globalSearchTerm = '', 
  globalFilters = { project: '', status: '', division: '', dateRange: '' },
  initialProjectCode = ''
}: ProjectsListProps = {}) {
  // ==================== Hooks & Refs ====================
  const { user: authUser, appUser } = useAuth()
  const guard = usePermissionGuard()
  const router = useRouter()
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true)
  const isLoadingRef = useRef(false) // ✅ Prevent multiple simultaneous loads
  const hasFetchedRef = useRef(false) // ✅ Track if initial fetch has been done
  const lastReloadTimeRef = useRef<number>(0) // ✅ Track last reload time to prevent rapid re-fetching
  const reloadDebounceTimerRef = useRef<NodeJS.Timeout | null>(null) // ✅ Debounce timer for database updates
  const loadAnalyticsForProjectsRef = useRef<((projects: Project[]) => Promise<void>) | null>(null) // ✅ Store latest loadAnalyticsForProjects function
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('projects')
  
  // ==================== State Management ====================
  const [projects, setProjects] = useState<Project[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [allKPIs, setAllKPIs] = useState<any[]>([])
  // ✅ ENHANCED: Load all project codes for SmartFilter (lightweight, only codes and names)
  const [allProjectsForFilter, setAllProjectsForFilter] = useState<Array<{project_code: string, project_sub_code: string, project_full_code: string, project_name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm || '')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(globalSearchTerm || '')
  // ✅ PERFORMANCE: Cache for loaded analytics data per project
  const [analyticsCache, setAnalyticsCache] = useState<Map<string, { activities: any[], kpis: any[] }>>(new Map())
  // ✅ FIX: Use ref instead of state to prevent infinite re-renders
  const analyticsCacheVersionRef = useRef(0)
  
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
  
  // Sorting state - for database-level sorting
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  
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
   * ✅ PERFORMANCE: Load activities and KPIs only for visible projects
   */
  const loadAnalyticsForProjects = useCallback(async (projectsToLoad: Project[]) => {
    if (projectsToLoad.length === 0) {
      // ✅ PERFORMANCE: Don't clear allActivities/allKPIs on empty - keep existing data for SmartFilter
      // Only clear cache for projects that are no longer visible
      setAnalyticsCache(prevCache => {
        const newCache = new Map(prevCache)
        // Clear cache entries for projects that are no longer in the current page
        // But keep data for SmartFilter to work properly
        return newCache
      })
      return
    }

    try {
      // Build project full codes for filtering using buildProjectFullCode
      const projectFullCodes = projectsToLoad.map(p => buildProjectFullCode(p))
      
      // ✅ Removed debug logging for P5066-R4 to reduce console noise
      
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('📊 Loading analytics for projects:', projectFullCodes.length)
      }
      
      // Fetch activities and KPIs for these projects only
      const [activitiesRes, kpisRes] = await Promise.all([
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
          .in('Project Full Code', projectFullCodes),
        supabase
          .from(TABLES.KPI)
          .select('*')
          .in('Project Full Code', projectFullCodes)
      ])
      
      if (activitiesRes.error) {
        console.error('❌ Error loading activities:', activitiesRes.error)
      }
      
      if (kpisRes.error) {
        console.error('❌ Error loading KPIs:', kpisRes.error)
      }
      
      // ✅ FALLBACK: If no KPIs found by Project Full Code, try by Project Code + Project Sub Code
      // This handles cases where Project Full Code might not be set correctly in database
      let kpisData = kpisRes.data || []
      
      // ✅ SPECIAL CASE: For projects like P5066-R4 where project_sub_code = "P5066-R4"
      // Also try fetching by Project Code and filter client-side
      const projectsWithSpecialSubCode = projectsToLoad.filter(p => {
        const code = (p.project_code || '').trim()
        const subCode = (p.project_sub_code || '').trim()
        return code && subCode && subCode.toUpperCase().startsWith(code.toUpperCase())
      })
      
      if (projectsWithSpecialSubCode.length > 0) {
        const specialProjectCodes = projectsWithSpecialSubCode.map(p => (p.project_code || '').trim()).filter(Boolean)
        const uniqueSpecialCodes = Array.from(new Set(specialProjectCodes))
        
        if (uniqueSpecialCodes.length > 0) {
          const kpisByCodeRes = await supabase
            .from(TABLES.KPI)
            .select('*')
            .in('Project Code', uniqueSpecialCodes)
          
          if (!kpisByCodeRes.error && kpisByCodeRes.data && kpisByCodeRes.data.length > 0) {
            // Merge with existing KPIs (avoid duplicates)
            const existingIds = new Set(kpisData.map((k: any) => k.id))
            const newKPIs = (kpisByCodeRes.data || []).filter((k: any) => !existingIds.has(k.id))
            if (newKPIs.length > 0) {
              console.log(`✅ Found ${newKPIs.length} additional KPIs by Project Code for special projects, will filter client-side`)
              kpisData = [...kpisData, ...newKPIs]
            }
          }
        }
      }
      
      // ✅ FALLBACK: If still no KPIs found, try by Project Code only (for all projects)
      if (kpisData.length === 0 && projectFullCodes.length > 0) {
        console.log('⚠️ No KPIs found by Project Full Code, trying Project Code only...')
        // Extract project codes
        const projectCodes = projectsToLoad.map(p => (p.project_code || '').trim()).filter(Boolean)
        const uniqueProjectCodes = Array.from(new Set(projectCodes))
        
        // Try fetching by Project Code only (for projects with sub_code)
        if (uniqueProjectCodes.length > 0) {
          const kpisByCodeRes = await supabase
            .from(TABLES.KPI)
            .select('*')
            .in('Project Code', uniqueProjectCodes)
          
          if (!kpisByCodeRes.error && kpisByCodeRes.data && kpisByCodeRes.data.length > 0) {
            console.log(`✅ Found ${kpisByCodeRes.data.length} KPIs by Project Code, will filter client-side`)
            kpisData = kpisByCodeRes.data
          }
        }
      }
      
      const mappedActivities = (activitiesRes.data || []).map(mapBOQFromDB)
      const mappedKPIs = kpisData.map(mapKPIFromDB)
      
      // ✅ Removed debug logging to reduce console noise
      
      // Update cache - use functional update to avoid dependency on analyticsCache
      // ✅ PERFORMANCE: Only update allActivities/allKPIs if they actually changed
      // This prevents unnecessary re-renders in SmartFilter and other components
      if (isMountedRef.current) {
        // ✅ PERFORMANCE: Use functional updates to merge with existing data instead of replacing
        // This allows SmartFilter to have access to all loaded activities/KPIs across pages
        setAllActivities(prev => {
          // Merge new activities with existing ones, avoiding duplicates
          const existingIds = new Set(prev.map(a => a.id))
          const newUnique = mappedActivities.filter(a => !existingIds.has(a.id))
          return [...prev, ...newUnique]
        })
        setAllKPIs(prev => {
          // Merge new KPIs with existing ones, avoiding duplicates
          const existingIds = new Set(prev.map(k => k.id))
          const newUnique = mappedKPIs.filter(k => !existingIds.has(k.id))
          return [...prev, ...newUnique]
        })
        
        // Update cache with new data for ALL projects
        setAnalyticsCache(prevCache => {
          const newCache = new Map(prevCache)
          
          // Process each project and ensure it has analytics data
          projectsToLoad.forEach(project => {
            const projectFullCode = buildProjectFullCode(project)
            const projectCode = (project.project_code || '').trim()
            const projectSubCode = (project.project_sub_code || '').trim()
            
            // Find activities for this project (multiple matching strategies)
            const projectActivities = mappedActivities.filter(a => {
              const activityFullCode = (a.project_full_code || '').toString().trim()
              const activityProjectCode = (a.project_code || '').toString().trim()
              const activityProjectSubCode = (a.project_sub_code || '').toString().trim()
              
              // Exact match on project_full_code
              if (activityFullCode && activityFullCode === projectFullCode) {
                return true
              }
              
              // Match by project_code if no sub_code
              if (!projectSubCode && !activityProjectSubCode && activityProjectCode === projectCode) {
                return true
              }
              
              // Build activity full code and match
              if (activityProjectCode && activityProjectSubCode) {
                let activityFullCodeBuilt = activityProjectCode
                if (activityProjectSubCode.toUpperCase().startsWith(activityProjectCode.toUpperCase())) {
                  activityFullCodeBuilt = activityProjectSubCode
                } else if (activityProjectSubCode.startsWith('-')) {
                  activityFullCodeBuilt = `${activityProjectCode}${activityProjectSubCode}`
                } else {
                  activityFullCodeBuilt = `${activityProjectCode}-${activityProjectSubCode}`
                }
                if (activityFullCodeBuilt === projectFullCode) {
                  return true
                }
              }
              
              return false
            })
            
            // Find KPIs for this project (multiple matching strategies)
            // ✅ Removed debug logging for P5066-R4 to reduce console noise
            
            const projectKPIs = mappedKPIs.filter(k => {
              const kpiFullCode = ((k.project_full_code || (k as any)['Project Full Code'] || '')).toString().trim()
              const kpiProjectCode = ((k as any).project_code || (k as any)['Project Code'] || '').toString().trim()
              const kpiProjectSubCode = ((k as any).project_sub_code || (k as any)['Project Sub Code'] || '').toString().trim()
              
              // ✅ PRIORITY 1: Exact match on project_full_code (case-insensitive)
              if (kpiFullCode && kpiFullCode.toUpperCase() === projectFullCode.toUpperCase()) {
                return true
              }
              
              // ✅ PRIORITY 2: Build KPI full code and match (case-insensitive)
              if (kpiProjectCode && kpiProjectSubCode) {
                let kpiFullCodeBuilt = kpiProjectCode
                if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
                  kpiFullCodeBuilt = kpiProjectSubCode
                } else if (kpiProjectSubCode.startsWith('-')) {
                  kpiFullCodeBuilt = `${kpiProjectCode}${kpiProjectSubCode}`
                } else {
                  kpiFullCodeBuilt = `${kpiProjectCode}-${kpiProjectSubCode}`
                }
                if (kpiFullCodeBuilt.toUpperCase() === projectFullCode.toUpperCase()) {
                  return true
                }
              }
              
              // ✅ PRIORITY 2.5: Special case for P5066-R4 - Match when KPI has Project Code = P5066 and Project Sub Code = P5066-R4
              // This handles the case where project_sub_code = "P5066-R4" (starts with project_code)
              if (projectCode === 'P5066' && projectSubCode && projectSubCode.toUpperCase().startsWith('P5066')) {
                // Project has sub_code that starts with project_code (e.g., "P5066-R4")
                if (kpiProjectCode.toUpperCase() === 'P5066' && kpiProjectSubCode && kpiProjectSubCode.toUpperCase() === projectSubCode.toUpperCase()) {
                  return true
                }
              }
              
              // ✅ PRIORITY 3: Match where KPI Project Full Code starts with our project_full_code (for sub-projects)
              // Only if project has sub_code (to avoid matching other projects with same project_code)
              if (projectSubCode && projectFullCode && kpiFullCode && kpiFullCode.toUpperCase().startsWith(projectFullCode.toUpperCase())) {
                return true
              }
              
              // ✅ PRIORITY 4: Match by project_code if no sub_code (old data fallback)
              if (!projectSubCode && !kpiProjectSubCode && kpiProjectCode.toUpperCase() === projectCode.toUpperCase()) {
                return true
              }
              
              return false
            })
            
            // Always set cache entry for each project (even if empty arrays)
            newCache.set(project.id, { activities: projectActivities, kpis: projectKPIs })
            
        // ✅ Removed per-project logging to reduce console noise
          })
          
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('✅ Analytics cache updated for all projects:', {
              totalProjects: projectsToLoad.length,
              cacheSize: newCache.size,
              totalActivities: mappedActivities.length,
              totalKPIs: mappedKPIs.length
            })
          }
          
          // ✅ FIX: Update ref instead of state to prevent infinite re-renders
          analyticsCacheVersionRef.current += 1
          
          return newCache
        })
      }
    } catch (error: any) {
      console.error('❌ Error loading analytics:', error)
    }
  }, [supabase, buildProjectFullCode])
  
  // ✅ FIX: Store latest function in ref to prevent re-fetch loops
  useEffect(() => {
    loadAnalyticsForProjectsRef.current = loadAnalyticsForProjects
  }, [loadAnalyticsForProjects])
  
  /**
   * ✅ ENHANCED: Load all project codes for SmartFilter (lightweight query)
   * This loads only essential fields: Project Code, Project Sub-Code, Project Name
   */
  const loadAllProjectsForFilter = useCallback(async () => {
    try {
      // ✅ FIX: Load only essential fields - Project Full Code may not exist in DB
      // Use same logic as mapProjectFromDB to build project_full_code
      const { data: projectsData, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('"Project Code", "Project Sub-Code", "Project Name"')
        .order('"Project Code"', { ascending: true })
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error loading projects for filter:', error)
        }
        return
      }
      
      if (projectsData && Array.isArray(projectsData)) {
        const mappedProjects = projectsData.map((row: any) => {
          // ✅ FIX: Use same logic as mapProjectFromDB to get project codes
          const projectCode = (row['Project Code'] || row['project_code'] || '').toString().trim()
          const projectSubCode = (row['Project Sub-Code'] || row['Project Sub Code'] || row['project_sub_code'] || '').toString().trim()
          
          // ✅ FIX: Build project_full_code using same logic as mapProjectFromDB
          let fullCode = ''
          if (projectCode) {
            if (projectSubCode) {
              // Check if sub_code starts with project_code (e.g., "P5066-R4" where sub_code = "P5066-R4")
              if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
                fullCode = projectSubCode
              } else if (projectSubCode.startsWith('-')) {
                fullCode = `${projectCode}${projectSubCode}`
              } else {
                fullCode = `${projectCode}-${projectSubCode}`
              }
            } else {
              fullCode = projectCode
            }
          }
          
          return {
            project_code: projectCode,
            project_sub_code: projectSubCode,
            project_full_code: fullCode,
            project_name: (row['Project Name'] || row['project_name'] || '').toString().trim()
          }
        }).filter(p => p.project_code) // ✅ Filter out empty project codes
        
        if (isMountedRef.current) {
          setAllProjectsForFilter(mappedProjects)
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Loaded ${mappedProjects.length} project codes for SmartFilter`, {
              sample: mappedProjects.slice(0, 3).map(p => ({
                code: p.project_code,
                subCode: p.project_sub_code,
                fullCode: p.project_full_code,
                name: p.project_name
              }))
            })
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Exception loading projects for filter:', error)
      }
    }
  }, [supabase])
  
  /**
   * ✅ PERFORMANCE: Fetch projects with pagination and filters (only visible projects)
   * This loads only the projects needed for the current page
   */
  // ✅ Track last request to prevent duplicate calls
  const lastRequestRef = useRef<string>('')
  const lastSearchRef = useRef<string>('') // ✅ Track last search term to prevent unnecessary reloads
  const lastPageRef = useRef<number>(1) // ✅ Track last page to prevent unnecessary reloads
  const lastFiltersRef = useRef<string>('') // ✅ Track last filter state to detect filter-only changes
  
  const fetchProjectsPage = useCallback(async (page: number = 1, search: string = '', filters: any = {}) => {
    // ✅ Prevent multiple simultaneous loads - but allow if it's a different page/search/filter/sort
    const requestKey = `${page}_${search}_${JSON.stringify(filters)}_${sortBy}_${sortDirection}`
    
    if (isLoadingRef.current && lastRequestRef.current === requestKey) {
      if (process.env.NODE_ENV === 'development') {
      console.log('⏸️ Data fetch already in progress for same request, skipping...', requestKey)
      }
      return
    }

    try {
      lastRequestRef.current = requestKey
      isLoadingRef.current = true
      startSmartLoading(setLoading)
      setError('')
      // ✅ FIX: Don't clear projects during search - keep existing data visible until new data loads
      // This prevents the "flash" of empty data when searching
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Loading projects page...', { page, search, filters, sortBy, sortDirection })
      }
      
      // Build query with filters
          let query = supabase
        .from(TABLES.PROJECTS)
        .select('*', { count: 'exact' })
      
      // ✅ FIX: Apply search filter FIRST - search has priority over Smart Filters
      // Apply search filter - use correct column names from database
      if (search && search.trim()) {
        query = query.or(`"Project Name".ilike.%${search.trim()}%,"Project Code".ilike.%${search.trim()}%`)
        // ✅ FIX: When searching, skip Smart Filter project selection to avoid conflicts
        // Search should return all matching projects, not just selected ones
      } else {
        // ✅ ENHANCED: Apply Smart Filter filters at database level for better performance
        // Multi-Project filter (Smart Filter) - apply at database level ONLY when NOT searching
        // ✅ FIX: Don't use "Project Full Code" column (doesn't exist in DB)
        // Match only by Project Code and Project Sub-Code
        if (selectedProjects.length > 0) {
        // Build OR condition for multiple projects
        // Match by Project Code and Project Sub-Code only (Project Full Code doesn't exist)
        const projectConditions: string[] = []
        selectedProjects.forEach(selectedProject => {
          const selectedUpper = selectedProject.toUpperCase().trim()
          // Extract project code and sub-code from selected project (e.g., "P5066-R4" -> code="P5066", subCode="R4")
          const parts = selectedUpper.split('-')
          const selectedCode = parts[0] || selectedUpper
          const selectedSubCode = parts.slice(1).join('-')
          
          // Match by Project Code (exact or partial)
          projectConditions.push(`"Project Code".ilike.%${selectedCode}%`)
          
          // Match by Project Sub-Code if exists
          if (selectedSubCode) {
            projectConditions.push(`"Project Sub-Code".ilike.%${selectedSubCode}%`)
            // Also match full code pattern (e.g., "P5066-R4" matches projects with code="P5066" and subCode="R4")
            projectConditions.push(`"Project Sub-Code".ilike.%${selectedUpper}%`)
          }
          
          // ✅ REMOVED: Don't use "Project Full Code" - column doesn't exist in database
          
          // Match by exact Project Code if selected project is just a code (e.g., "P5066")
          if (!selectedSubCode) {
            projectConditions.push(`"Project Code".eq.${selectedCode}`)
          }
        })
        if (projectConditions.length > 0) {
          query = query.or(projectConditions.join(','))
        }
        }
      }
      
      // Multi-Division filter (Smart Filter) - apply at database level (only when not searching)
      if (selectedDivisions.length > 0) {
        // Build OR condition for multiple divisions
        const divisionConditions = selectedDivisions.map(div => `"Responsible Division".ilike.%${div.trim()}%`).join(',')
        query = query.or(divisionConditions)
      } else if (filters.division && filters.division.trim()) {
        // Fallback to single division filter
        query = query.ilike('"Responsible Division"', `%${filters.division.trim()}%`)
      }
      
      // Multi-Type filter (Smart Filter) - apply at database level
      if (selectedTypes.length > 0) {
        const typeConditions = selectedTypes.map(type => `"Project Type".ilike.%${type.trim()}%`).join(',')
        query = query.or(typeConditions)
      }
      
      // Value Range filter (Smart Filter) - apply at database level
      if (valueRange.min !== undefined) {
        query = query.gte('"Contract Amount"', valueRange.min)
      }
      if (valueRange.max !== undefined) {
        query = query.lte('"Contract Amount"', valueRange.max)
      }
      
      // Apply date range filter
      // Use correct column name from database (could be "Start Date" or "Project Start Date")
      if (filters.dateRange?.from) {
        query = query.gte('"Start Date"', filters.dateRange.from)
      }
      if (filters.dateRange?.to) {
        query = query.lte('"Start Date"', filters.dateRange.to)
        }
        
      // ✅ Apply sorting from state (database-level sorting for all data)
      // Map column IDs to database column names
      const getDatabaseColumnName = (columnId: string): string => {
        const columnMap: Record<string, string> = {
          'project_code': '"Project Code"',
          'full_project_code': '"Project Code"', // Use Project Code as fallback
          'project_name': '"Project Name"',
          'project_status': '"Project Status"',
          'responsible_divisions': '"Responsible Division"',
          'scope_of_works': '"Project Type"',
          'plot_number': '"Plot Number"',
          'contract_amount': '"Contract Amount"',
          'created_at': 'created_at',
          'updated_at': 'updated_at'
        }
        return columnMap[columnId] || 'created_at'
      }
      
      const dbColumnName = getDatabaseColumnName(sortBy)
      query = query.order(dbColumnName, { ascending: sortDirection === 'asc' })
      
      // Apply pagination AFTER sorting
      const startIndex = (page - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage - 1
      query = query.range(startIndex, endIndex)
      
      const { data: projectsData, error: projectsError, count } = await query
      
      if (projectsError) {
        throw projectsError
      }
      
      if (!projectsData || !Array.isArray(projectsData)) {
        console.error('❌ Projects data is invalid')
        setError('Failed to load projects: Invalid data format')
        return
      }
        
      const mappedProjects = (projectsData || []).map(mapProjectFromDB)

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setProjects(mappedProjects)
        setTotalCount(count || 0)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Projects page loaded:', {
          projects: mappedProjects.length,
            totalCount: count || 0,
            page
        })
        }
        
        // ✅ Load analytics data for visible projects only
        // Wait for analytics to load before showing projects to ensure data is available
        try {
          // ✅ FIX: Use ref to get latest function without causing re-fetch loops
          if (loadAnalyticsForProjectsRef.current) {
            await loadAnalyticsForProjectsRef.current(mappedProjects)
          }
        } catch (analyticsError) {
          console.error('❌ Error loading analytics:', analyticsError)
          // Continue even if analytics fail - show projects without analytics
        }
      }
      } catch (error: any) {
      console.error('❌ Exception loading projects:', error)
      if (isMountedRef.current) {
        setError(error.message || 'Failed to load projects')
      }
      } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        stopSmartLoading(setLoading)
      }
    }
  }, [supabase, startSmartLoading, stopSmartLoading, itemsPerPage, sortBy, sortDirection])
  
  /**
   * ✅ LEGACY: Keep fetchAllData for backward compatibility (used in create/update/delete)
   * But make it lightweight - only fetch projects count and basic data
   */
  const fetchAllData = useCallback(async () => {
    // For create/update/delete operations, just refresh the current page
    const currentFilters = {
      status: selectedStatuses.length > 0 ? selectedStatuses[0] : '',
      division: selectedDivisions.length > 0 ? selectedDivisions[0] : '',
      dateRange: dateRange
    }
    await fetchProjectsPage(currentPage, debouncedSearchTerm, currentFilters)
  }, [fetchProjectsPage, currentPage, debouncedSearchTerm, selectedStatuses, selectedDivisions, dateRange])

  // ✅ Open project from URL query parameter
  useEffect(() => {
    if (!initialProjectCode || !projects.length || viewingProject) return

    // Find project by code (exact match or partial match)
    const projectCodeUpper = initialProjectCode.trim().toUpperCase()
    const foundProject = projects.find(project => {
      const code = (project.project_code || '').trim().toUpperCase()
      const fullCode = buildProjectFullCode(project).toUpperCase()
      return code === projectCodeUpper || fullCode === projectCodeUpper || code.includes(projectCodeUpper) || fullCode.includes(projectCodeUpper)
    })

    if (foundProject) {
      console.log('✅ Opening project from URL:', initialProjectCode, foundProject)
      setViewingProject(foundProject)
      // Remove query parameter from URL after opening
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('project')
        window.history.replaceState({}, '', url.toString())
      }
    } else {
      console.log('⚠️ Project not found in current list:', initialProjectCode)
    }
  }, [initialProjectCode, projects, viewingProject, buildProjectFullCode])

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
      
      // ✅ SET CREATED BY: Add user who created the project
      const createdByValue = appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      dbData['created_by'] = createdByValue
      console.log('✅ Setting created_by for project:', createdByValue)
      
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
      
      // ✅ SET UPDATED BY: Add user who updated the project
      const updatedByValue = appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      dbData['updated_by'] = updatedByValue
      console.log('✅ Setting updated_by for project:', updatedByValue)
      
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
  // ✅ FIX: Use cache size as dependency instead of Map object to prevent infinite re-renders
  const analyticsCacheSize = analyticsCache.size
  const analyticsCacheKeys = Array.from(analyticsCache.keys()).join(',')
  
  /**
   * ✅ PERFORMANCE: Calculate analytics only for visible projects using cached data
   * This only processes the projects that are currently loaded (visible on page)
   */
  const projectsAnalytics = useMemo(() => {
    const analyticsMap = new Map<string, ProjectAnalytics>()
    
    // ✅ PERFORMANCE: Only calculate analytics for loaded projects
    projects.forEach(project => {
      try {
        // Get cached activities and KPIs for this project
        const cached = analyticsCache.get(project.id)
        const projectActivities = cached?.activities || []
        const projectKPIs = cached?.kpis || []
        
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
    if (process.env.NODE_ENV === 'development' && analyticsMap.size > 0 && Math.random() < 0.1) {
      console.log(`✅ Calculated analytics for ${analyticsMap.size} visible projects`)
    }
    
    return analyticsMap
  }, [projects, analyticsCacheSize, analyticsCacheKeys])
  
  // ==================== Filtering & Sorting ====================
  /**
   * ✅ PERFORMANCE: Projects are already filtered by the database query
   * We only need to apply client-side Smart Filter filters that can't be done in database
   */
  const allFilteredProjects = useMemo(() => {
    // Projects are already filtered by search and basic filters from database
    // Apply only Smart Filter filters that require complex logic (multi-select, calculated status, etc.)
    // ✅ PERFORMANCE: Only filter visible projects (already loaded from database)
    return projects.filter(project => {
    
    // ✅ REMOVED: Multi-Project filter - now handled at database level
    // ✅ REMOVED: Multi-Division filter - now handled at database level
    // ✅ REMOVED: Project Type filter - now handled at database level
    
    // Project Status filter (Smart Filter)
    // ✅ Use calculated status (same as table) for accurate filtering
    if (selectedStatuses.length > 0) {
      // ✅ CRITICAL: Check manual statuses first (on-hold, cancelled) - these are set manually and don't change automatically
      const currentStatusFromDB = (project.project_status || 'upcoming').toLowerCase().trim()
      let projectStatus = currentStatusFromDB
      
      // ✅ If status is manual (on-hold, cancelled), use it directly without calculation
      if (currentStatusFromDB === 'on-hold' || currentStatusFromDB === 'cancelled') {
        // Use database status directly for manual statuses
        projectStatus = currentStatusFromDB
      } else {
        // ✅ Calculate status automatically if we have activities or KPIs (same logic as table)
        try {
          const projectFullCode = buildProjectFullCode(project)
          const projectCode = (project.project_code || '').trim()
          const projectSubCode = (project.project_sub_code || '').trim()
          
          // ✅ PERFORMANCE: Use cached data instead of filtering allActivities/allKPIs
          // This is much faster as data is already matched and cached per project
          const cached = analyticsCache.get(project.id)
          const projectActivities = cached?.activities || []
          const projectKPIs = cached?.kpis || []
          
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
                activity_date: kpi.activity_date || (kpi as any).raw?.['Activity Date'] || kpi.target_date || kpi.actual_date || ''
              }))
            }
            
            const statusResult = calculateProjectStatus(statusData)
            projectStatus = statusResult.status.toLowerCase().trim()
          }
        } catch (error) {
          // Fallback to database status if calculation fails
          console.warn('Error calculating status for filter:', error)
        }
      }
      
      // ✅ Improved matching: handle both exact match and case-insensitive
      const matchesStatus = selectedStatuses.some(status => {
        const normalizedStatus = status.toLowerCase().trim()
        const normalizedProjectStatus = projectStatus.toLowerCase().trim()
        return normalizedProjectStatus === normalizedStatus
      })
      
      if (!matchesStatus) return false
    }
    
    // ✅ REMOVED: Date range filter - now handled at database level
    // ✅ REMOVED: Contract Amount range filter - now handled at database level
    
    return true
  })
  }, [projects, selectedStatuses, buildProjectFullCode]) // ✅ REMOVED: selectedProjects, selectedDivisions, selectedTypes, valueRange - now handled at database level
  
  // ✅ PERFORMANCE: No need for client-side pagination - already done in database
  const filteredProjects = allFilteredProjects
  const filteredTotalCount = totalCount

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
  /**
   * ✅ PERFORMANCE: Load projects when page, search, or filters change
   */
  useEffect(() => {
    isMountedRef.current = true
    isLoadingRef.current = false
    
    if (process.env.NODE_ENV === 'development') {
    console.log('🟡 Projects: Component mounted')
    }

    // Listen for database updates
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName, timestamp } = event.detail
      
      // ✅ FIX: Debounce database updates to prevent rapid re-fetching
      const now = Date.now()
      const timeSinceLastReload = now - lastReloadTimeRef.current
      
      // Skip if reloaded in last 2 seconds (prevent rapid re-fetching)
      if (timeSinceLastReload < 2000) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏸️ Projects: Skipping reload (reloaded ${Math.round(timeSinceLastReload)}ms ago)`)
        }
        return
      }
      
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log(`🔔 Projects: Database updated event received for ${tableName}`)
      }

      if (tableName === TABLES.PROJECTS || tableName === TABLES.BOQ_ACTIVITIES || tableName === TABLES.KPI) {
        // ✅ ENHANCED: Reload all projects for filter when projects table is updated
        if (tableName === TABLES.PROJECTS) {
          // ✅ FIX: Use the function directly from scope
          loadAllProjectsForFilter()
        }
        
        // ✅ FIX: CRITICAL - Don't reload if user is currently searching (preserve search results)
        // Check BOTH searchTerm (current input) AND debouncedSearchTerm (confirmed search)
        // Also check lastSearchRef to catch cases where search was just performed
        // This prevents the second reload that clears search results
        const currentSearch = searchTerm || debouncedSearchTerm || lastSearchRef.current
        if (currentSearch && currentSearch.trim()) {
          // User is searching - COMPLETELY skip automatic reload to preserve search results
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏸️ Projects: COMPLETELY skipping database reload during search: "${currentSearch}"`)
          }
          return // Exit immediately - don't even set up the debounce timer
        }
        
        // ✅ FIX: Don't reload if user is on a different page (preserve pagination state)
        // Only reload if user is on page 1, otherwise skip to preserve user's position
        if (currentPage !== 1) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log(`⏸️ Projects: Skipping reload - user is on page ${currentPage}, not page 1`)
          }
          return // User is on a different page, skip reload to preserve position
        }
        
        // ✅ FIX: Don't reload if user has active filters (preserve filter state)
        const hasActiveFilters = selectedProjects.length > 0 || 
                                 selectedDivisions.length > 0 || 
                                 selectedStatuses.length > 0 || 
                                 selectedTypes.length > 0 ||
                                 (dateRange.from || dateRange.to) ||
                                 (valueRange.min !== undefined || valueRange.max !== undefined)
        if (hasActiveFilters) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log(`⏸️ Projects: Skipping reload - user has active filters`)
          }
          return // User has active filters, skip reload to preserve filter state
        }
        
        // ✅ FIX: Clear existing debounce timer
        if (reloadDebounceTimerRef.current) {
          clearTimeout(reloadDebounceTimerRef.current)
        }
        
        // ✅ FIX: Debounce reload by 500ms to batch multiple updates
        // ✅ FIX: Only reload if user is on page 1, not searching, and has no active filters
        reloadDebounceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && !isLoadingRef.current) {
            // ✅ FIX: CRITICAL - Double-check search state before reloading
            // This is the final check to prevent clearing search results
            // Check all possible search states including lastSearchRef
            const stillSearching = searchTerm || debouncedSearchTerm || lastSearchRef.current
            if (stillSearching && stillSearching.trim()) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`⏸️ Projects: Final check - still searching, skipping reload: "${stillSearching}"`)
              }
              return // User is still searching, skip reload completely
            }
            
            // ✅ FIX: Double-check page number
            if (currentPage !== 1) {
              return // User navigated to different page, skip reload
            }
            
            // ✅ FIX: Double-check filters
            const stillHasFilters = selectedProjects.length > 0 || 
                                   selectedDivisions.length > 0 || 
                                   selectedStatuses.length > 0 || 
                                   selectedTypes.length > 0 ||
                                   (dateRange.from || dateRange.to) ||
                                   (valueRange.min !== undefined || valueRange.max !== undefined)
            if (stillHasFilters) {
              return // User has active filters, skip reload
            }
            
            lastReloadTimeRef.current = Date.now()
            const currentFilters = {
              status: selectedStatuses.length > 0 ? selectedStatuses[0] : '',
              division: selectedDivisions.length > 0 ? selectedDivisions[0] : '',
              dateRange: dateRange
            }
            // ✅ FIX: IMPORTANT - Use empty string for search when reloading from database update
            // This ensures we don't accidentally use an old search term
            fetchProjectsPage(currentPage, '', currentFilters)
          }
        }, 500) // 500ms debounce
      }
    }

    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    
    // ✅ ENHANCED: Load all project codes for SmartFilter on mount
    loadAllProjectsForFilter()
    
    // ✅ Initial fetch - only once on mount
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      const initialFilters = {
        status: selectedStatuses.length > 0 ? selectedStatuses[0] : '',
        division: selectedDivisions.length > 0 ? selectedDivisions[0] : '',
        dateRange: dateRange
      }
      fetchProjectsPage(1, debouncedSearchTerm, initialFilters)
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
      console.log('🔴 Projects: Cleanup - component unmounting')
      }
      isMountedRef.current = false
      isLoadingRef.current = false
      if (reloadDebounceTimerRef.current) {
        clearTimeout(reloadDebounceTimerRef.current)
      }
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAllProjectsForFilter]) // ✅ FIX: Include loadAllProjectsForFilter in dependencies

  /**
   * ✅ Debounce search term to avoid too many API calls
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      // ✅ FIX: Only update if searchTerm actually changed
      if (searchTerm !== debouncedSearchTerm) {
        setDebouncedSearchTerm(searchTerm)
        // ✅ FIX: Reset to page 1 when search changes
        if (currentPage !== 1) {
          setCurrentPage(1)
        }
      }
    }, 300) // Wait 300ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm]) // ✅ FIX: Only depend on searchTerm to prevent infinite loops

  /**
   * ✅ PERFORMANCE: Reload projects when page or search changes
   * This effect handles search and pagination - it has priority over filters
   */
  useEffect(() => {
    // ✅ FIX: Don't fetch if user is typing (wait for debounce to complete)
    if (searchTerm !== debouncedSearchTerm && searchTerm.trim()) {
      return
    }
    
    const isSearching = debouncedSearchTerm && debouncedSearchTerm.trim()
    
    // Check if search term or page actually changed
    const searchChanged = lastSearchRef.current !== debouncedSearchTerm
    const pageChanged = lastPageRef.current !== currentPage
    
    if (!searchChanged && !pageChanged) {
      // Neither search nor page changed - skip this effect
      return
    }
    
    // Update refs - keep lastSearchRef even if debouncedSearchTerm is empty
    // This helps detect if user was just searching
    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
      lastSearchRef.current = debouncedSearchTerm
    }
    lastPageRef.current = currentPage
    
    const currentFilters = {
      status: selectedStatuses.length > 0 ? selectedStatuses[0] : '',
      division: selectedDivisions.length > 0 ? selectedDivisions[0] : '',
      dateRange: dateRange
    }
    
    const requestKey = `${currentPage}_${debouncedSearchTerm}_${JSON.stringify(currentFilters)}_${selectedProjects.join(',')}_${selectedDivisions.join(',')}_${selectedTypes.join(',')}_${valueRange.min}_${valueRange.max}_${sortBy}_${sortDirection}`
    
    if (!hasFetchedRef.current) {
      if (currentPage === 1 && !debouncedSearchTerm && selectedStatuses.length === 0 && selectedDivisions.length === 0 && !dateRange?.from && !dateRange?.to) {
        return
      }
      hasFetchedRef.current = true
    }
    
    if (isLoadingRef.current && lastRequestRef.current === requestKey) {
      return
    }
    
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🔄 Triggering fetch for search/page change:', { currentPage, debouncedSearchTerm, isSearching })
    }
    fetchProjectsPage(currentPage, debouncedSearchTerm, currentFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchTerm])
  
  /**
   * ✅ PERFORMANCE: Reload projects when filters or sorting change
   * This effect ONLY runs when NOT searching - search has priority
   */
  useEffect(() => {
    // ✅ FIX: Skip completely if user is searching - search has priority
    // Check both current search state AND lastSearchRef to catch recent searches
    const isSearching = (debouncedSearchTerm && debouncedSearchTerm.trim()) || (lastSearchRef.current && lastSearchRef.current.trim())
    if (isSearching) {
      // User is searching or just searched - ignore filter changes completely
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('⏸️ Skipping filter reload - user is searching or just searched')
      }
      return
    }
    
    // Build current filter state string for comparison
    const currentFilterState = `${selectedProjects.join(',')}_${selectedStatuses.join(',')}_${selectedDivisions.join(',')}_${selectedTypes.join(',')}_${valueRange.min}_${valueRange.max}_${dateRange?.from}_${dateRange?.to}_${sortBy}_${sortDirection}`
    
    // Check if filters actually changed
    if (lastFiltersRef.current === currentFilterState) {
      // Filters didn't change - skip
      return
    }
    
    // Update filter ref
    lastFiltersRef.current = currentFilterState
    
    const currentFilters = {
      status: selectedStatuses.length > 0 ? selectedStatuses[0] : '',
      division: selectedDivisions.length > 0 ? selectedDivisions[0] : '',
      dateRange: dateRange
    }
    
    const requestKey = `${currentPage}_${debouncedSearchTerm}_${JSON.stringify(currentFilters)}_${selectedProjects.join(',')}_${selectedDivisions.join(',')}_${selectedTypes.join(',')}_${valueRange.min}_${valueRange.max}_${sortBy}_${sortDirection}`
    
    if (isLoadingRef.current && lastRequestRef.current === requestKey) {
      return
    }
    
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🔄 Triggering fetch for filter/sort change:', { currentFilters, sortBy, sortDirection })
    }
    fetchProjectsPage(currentPage, debouncedSearchTerm, currentFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjects.join(','), selectedStatuses.join(','), selectedDivisions.join(','), selectedTypes.join(','), valueRange?.min, valueRange?.max, dateRange?.from, dateRange?.to, sortBy, sortDirection])
  
  /**
   * ✅ Handle sorting from table - triggers database-level sort
   */
  const handleTableSort = useCallback((columnId: string, direction: 'asc' | 'desc') => {
    setSortBy(columnId)
    setSortDirection(direction)
    setCurrentPage(1) // Reset to first page when sorting changes
  }, [])

  // ✅ REMOVED: Lazy loading is now handled by loadAnalyticsForProjects
  // Analytics are loaded only for visible projects

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
        projects={allProjectsForFilter} // ✅ ENHANCED: Use all projects for filter, not just loaded ones
        activities={useMemo(() => allActivities.map(a => ({
          activity_description: a.activity_description || a.activity_name || '',
          activity_name: a.activity_description || a.activity_name || '', // Backward compatibility
          project_code: a.project_code,
          zone: a.zone_number || '',
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
                    onSort={handleTableSort} // ✅ Pass database-level sorting callback
                    currentSortColumn={sortBy} // ✅ Pass current sort column
                    currentSortDirection={sortDirection} // ✅ Pass current sort direction
                    highlightedProjectId={viewingProject?.id} // ✅ Highlight project in table when viewing
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

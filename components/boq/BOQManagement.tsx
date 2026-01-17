'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { BOQActivity, Project, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapProjectFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateActivityRate, ActivityRate } from '@/lib/rateCalculator'
import { calculateActivityProgress, ActivityProgress } from '@/lib/progressCalculator'
import { calculateWorkValueStatus } from '@/lib/workValueCalculator'
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
import { BOQFilter } from './BOQFilter'
import { Plus, ClipboardList, CheckCircle, Clock, AlertCircle, Filter, X, Search, Lock, Building2, ChevronDown, BarChart3, Target, Coins, DollarSign } from 'lucide-react'
import { ExportButton } from '@/components/ui/ExportButton'
import { ImportButton } from '@/components/ui/ImportButton'
import { PrintButton } from '@/components/ui/PrintButton'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { syncBOQFromKPI } from '@/lib/boqKpiSync'
import { updateProjectStatus } from '@/lib/projectStatusUpdater'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'

interface ActivitiesManagementProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function ActivitiesManagement({ globalSearchTerm = '', globalFilters = { project: '', status: '', division: '', dateRange: '' } }: ActivitiesManagementProps = {}) {
  const guard = usePermissionGuard()
  const { user: authUser, appUser } = useAuth()
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [allActivitiesForFilter, setAllActivitiesForFilter] = useState<BOQActivity[]>([]) // ✅ All activities for filter dropdowns (without filters)
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
      if (guard.hasAccess('activities.view')) {
        setUseCustomizedTable(true)
      } else {
        setUseCustomizedTable(false)
      }
      setHasInitializedView(true)
    }
  }, [guard, hasInitializedView])
  
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
  
  // Legacy filters state (for backward compatibility with existing code)
  const [filters, setFilters] = useState<{
    search: string
    project: string[]
    division: string
    status: string
    zone: string | string[] // ✅ Support multiple zones
  }>({
    search: '',
    project: [],
    division: '',
    status: '',
    zone: ''
  })
  
  // Search term
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm || '')
  
  // Project search for dropdown
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  // Show/hide filters
  const [showFilters, setShowFilters] = useState(false)
  
  // Available zones for filter
  const [availableZones, setAvailableZones] = useState<string[]>([])
  
  // Legacy filter state (removed - using useMemo instead)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50) // 50 items per page for better performance
  
  // ✅ Server-side sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const isLoadingRef = useRef(false) // ✅ Prevent multiple simultaneous loads
  const hasFetchedRef = useRef(false) // ✅ Track if initial fetch has been done
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('activities') // ✅ Smart loading
  
  // ✅ Update Responsible Divisions in Project based on Activity Division
  // This function collects ALL divisions from ALL BOQ Activities for the project and updates the project
  const updateProjectResponsibleDivisions = async (projectCode: string, activityDivision: string) => {
    try {
      if (!activityDivision || !projectCode) {
        console.log('⚠️ Skipping project division update - missing data')
        return
      }
      
      console.log('🔄 Updating Responsible Divisions for project:', projectCode, 'with division:', activityDivision)
      
      // ✅ IMPORTANT: Get ALL activities for this project to collect ALL divisions
      const { data: allActivitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .or(`Project Code.eq.${projectCode},Project Full Code.eq.${projectCode}`)
      
      if (activitiesError) {
        console.warn('⚠️ Error fetching activities for division update:', activitiesError)
      }
      
      // Collect ALL unique divisions from ALL activities for this project
      const allDivisionsSet = new Set<string>()
      if (allActivitiesData && allActivitiesData.length > 0) {
        allActivitiesData.forEach((activity: any) => {
          const activityDiv = activity['Activity Division'] || activity.activity_division || ''
          if (activityDiv && activityDiv.trim() !== '') {
            allDivisionsSet.add(activityDiv.trim())
          }
        })
      }
      
      // Also add the current activity division
      if (activityDivision && activityDivision.trim() !== '') {
        allDivisionsSet.add(activityDivision.trim())
      }
      
      const allDivisionsList = Array.from(allDivisionsSet).sort()
      const updatedDivisionsString = allDivisionsList.join(', ')
      
      console.log('📝 Collected ALL divisions from BOQ Activities:', {
        projectCode,
        divisionsFromActivities: Array.from(allDivisionsSet),
        finalDivisions: allDivisionsList
      })
      
      // Find project by code (support multiple formats)
      const project = projects.find(p => {
        const pCode = (p.project_code || '').trim().toUpperCase()
        const pFullCode = (p.project_full_code || '').trim().toUpperCase()
        const pSubCode = (p.project_sub_code || '').trim()
        const projectFullCodeBuilt = pSubCode && !pSubCode.toUpperCase().startsWith(pCode.toUpperCase())
          ? `${pCode}-${pSubCode}`
          : pSubCode || pCode
        
        const searchCode = projectCode.trim().toUpperCase()
        
        return pCode === searchCode || 
               pFullCode === searchCode ||
               projectFullCodeBuilt.toUpperCase() === searchCode ||
               `${pCode}${pSubCode ? '-' + pSubCode : ''}`.toUpperCase() === searchCode
      })
      
      if (!project) {
        console.warn('⚠️ Project not found in local state, querying database:', projectCode)
        // Try to find by querying database
        const { data: projectData, error: findError } = await supabase
          .from(TABLES.PROJECTS)
          .select('*')
          .or(`Project Code.eq.${projectCode},Project Full Code.eq.${projectCode}`)
          .limit(1)
          .single()
        
        if (findError || !projectData) {
          console.error('❌ Could not find project in database:', projectCode, findError)
          return
        }
        
        // Use project from database
        const dbProject = mapProjectFromDB(projectData)
        
        // Only update if divisions changed
        if (updatedDivisionsString !== dbProject.responsible_division) {
          console.log('📝 Updating Responsible Divisions (from DB):', {
            projectCode,
            current: dbProject.responsible_division,
            updated: updatedDivisionsString
          })
          
          // Update project in database
          const { error: updateError } = await (supabase as any)
            .from(TABLES.PROJECTS)
            .update({ 'Responsible Division': updatedDivisionsString })
            .eq('id', dbProject.id)
          
          if (updateError) {
            console.error('❌ Error updating project responsible divisions:', updateError)
            throw updateError
          }
          
          console.log('✅ Project Responsible Divisions updated successfully (from DB):', updatedDivisionsString)
        } else {
          console.log('✅ Project already has correct divisions')
        }
        return
      }
      
      // Only update if divisions changed
      if (updatedDivisionsString !== project.responsible_division) {
        console.log('📝 Updating Responsible Divisions:', {
          projectCode,
          projectId: project.id,
          current: project.responsible_division,
          updated: updatedDivisionsString
        })
        
        // Update project in database using ID (more reliable than code)
        const { error: updateError } = await (supabase as any)
          .from(TABLES.PROJECTS)
          .update({ 'Responsible Division': updatedDivisionsString })
          .eq('id', project.id)
        
        if (updateError) {
          console.error('❌ Error updating project responsible divisions:', updateError)
          throw updateError
        }
        
        // Update local state
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p.project_code === projectCode || p.id === project.id
              ? { ...p, responsible_division: updatedDivisionsString }
              : p
          )
        )
        
        console.log('✅ Project Responsible Divisions updated successfully:', updatedDivisionsString)
      } else {
        console.log('✅ Project already has correct divisions')
      }
    } catch (error: any) {
      console.error('❌ Error updating project responsible divisions:', error)
      throw error
    }
  }
  
  // ✅ Load ALL activities (without filters) for filter dropdowns on mount
  useEffect(() => {
    const loadAllActivitiesForFilters = async () => {
      if (allActivitiesForFilter.length > 0) return // Already loaded
      
      try {
        console.log('📊 Loading all activities for filter dropdowns...')
        const { data: allActivitiesData, error: allActivitiesError } = await supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .limit(10000) // Limit to prevent huge queries
          .order('created_at', { ascending: false })
        
        if (!allActivitiesError && allActivitiesData) {
          const allMappedActivities = (allActivitiesData || []).map(mapBOQFromDB)
          setAllActivitiesForFilter(allMappedActivities)
          console.log(`✅ Loaded ${allMappedActivities.length} activities for filter dropdowns`)
        } else if (allActivitiesError) {
          console.warn('⚠️ Error loading all activities for filters:', allActivitiesError)
        }
      } catch (error) {
        console.warn('⚠️ Error loading all activities for filters:', error)
      }
    }
    
    loadAllActivitiesForFilters()
  }, []) // Run once on mount
  
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
  // ✅ FIX: Helper function to build project_full_code
  const getProjectFullCode = (project: Project): string => {
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (projectSubCode) {
      // Check if sub_code already starts with project_code (case-insensitive)
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        return projectSubCode
      } else {
        if (projectSubCode.startsWith('-')) {
          return `${projectCode}${projectSubCode}`
        } else {
          return `${projectCode}-${projectSubCode}`
        }
      }
    }
    return projectCode
  }
  
  const toggleProject = (projectFullCode: string) => {
    setFilters(prev => {
      const currentProjects = prev.project || []
      if (currentProjects.includes(projectFullCode)) {
        // Remove project
        return { ...prev, project: currentProjects.filter(p => p !== projectFullCode) }
      } else {
        // Add project
        return { ...prev, project: [...currentProjects, projectFullCode] }
      }
    })
  }
  
  // ✅ No need for auto-apply - filtering is done locally
  
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
  if (!guard.hasAccess('activities.view')) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Access Denied</h3>
              <p className="text-sm">You do not have permission to view Activities. Please contact your administrator.</p>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  // ✅ SIMPLIFIED: Build project_full_code helper (like ProjectsList)
  const buildProjectFullCode = useCallback((project: Project): string => {
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (!projectSubCode) return projectCode
    
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      return projectSubCode
    }
    
    return projectSubCode.startsWith('-') 
      ? `${projectCode}${projectSubCode}` 
      : `${projectCode}-${projectSubCode}`
  }, [])

  // ✅ SIMPLIFIED: Filter activities locally like ProjectsList
  const allFilteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Multi-Project filter (Smart Filter)
      // ✅ Use same matching logic as fetchData to handle activities without sub_code
      if (selectedProjects.length > 0) {
        const activityFullCode = (activity.project_full_code || '').toString().trim()
        const activityProjectCode = (activity.project_code || '').toString().trim()
        const activityProjectSubCode = (activity.project_sub_code || '').toString().trim()
        
        const matchesProject = selectedProjects.some(selectedProject => {
          const selectedFullCodeUpper = selectedProject.toUpperCase().trim()
          const activityFullCodeUpper = activityFullCode.toUpperCase().trim()
          const activityProjectCodeUpper = activityProjectCode.toUpperCase().trim()
          const activityProjectSubCodeUpper = activityProjectSubCode.toUpperCase().trim()
          
          // Priority 1: Exact match on project_full_code
          if (activityFullCodeUpper === selectedFullCodeUpper) {
            return true
          }
          
          // ✅ FIX: Extract selected project parts
          const selectedParts = selectedProject.split('-')
          const selectedCode = selectedParts[0]?.toUpperCase().trim()
          const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
          
          // ✅ FIX: Match by Project Code + Project Sub Code (handles inconsistent Project Full Code in DB)
          // If selected project is "P10002-01" and activity has Project Code = "P10002" and Project Sub Code = "P10002-01",
          // it should match even if Project Full Code in DB is "P10002" or "P10002-01"
          if (selectedCode && activityProjectCodeUpper === selectedCode) {
            if (selectedSubCode) {
              // Selected project has sub code (e.g., "P10002-01")
              // ✅ CRITICAL: Match if Project Code matches AND Project Sub Code matches
              // This handles cases where Project Full Code in DB is inconsistent (P10002 vs P10002-01)
              
              // ✅ SIMPLIFIED LOGIC: If Project Code matches, check if Project Sub Code matches
              // In DB, Project Sub Code might be stored as "P10002-01" (full) or "01" (partial)
              // We need to match both cases
              
              // Extract the actual sub code from activity (could be "P10002-01" or just "01")
              const activitySubCodeOnly = activityProjectSubCodeUpper.includes('-') 
                ? activityProjectSubCodeUpper.split('-').slice(1).join('-').toUpperCase()
                : activityProjectSubCodeUpper
              
              const selectedSubCodeOnly = selectedSubCode.includes('-')
                ? selectedSubCode.split('-').slice(1).join('-').toUpperCase()
                : selectedSubCode
              
              // ✅ CRITICAL: Match if:
              // 1. Activity Project Sub Code matches selected full code (e.g., "P10002-01" === "P10002-01")
              // 2. Activity Project Sub Code matches selected sub code (e.g., "P10002-01" === "01" or "01" === "01")
              // 3. Activity Project Sub Code ends with selected sub code (e.g., "P10002-01".endsWith("01"))
              // 4. Activity Project Full Code matches selected full code (e.g., "P10002-01")
              // 5. Activity Project Full Code matches selected code only (e.g., "P10002") - handles DB inconsistency
              
              // ✅ CRITICAL: Match if Project Sub Code matches
              // In DB, Project Sub Code might be stored as "P10002-01" (full) or "01" (partial)
              // We need to match both cases
              const subCodeMatches = 
                activityProjectSubCodeUpper === selectedFullCodeUpper || // "P10002-01" === "P10002-01" ✅
                activityProjectSubCodeUpper === selectedSubCode || // "01" === "01" (if stored as partial)
                activitySubCodeOnly === selectedSubCodeOnly || // "01" === "01"
                activityProjectSubCodeUpper.endsWith(selectedSubCode) || // "P10002-01".endsWith("01") ✅
                activityProjectSubCodeUpper.includes(selectedSubCode) || // "P10002-01".includes("01") ✅
                activityProjectSubCodeUpper.includes(selectedFullCodeUpper) || // "P10002-01".includes("P10002-01") ✅
                selectedFullCodeUpper.includes(activityProjectSubCodeUpper) // "P10002-01".includes("P10002-01") ✅
              
              // ✅ CRITICAL: Match if Project Full Code matches (handles DB inconsistency)
              const fullCodeMatches = 
                activityFullCodeUpper === selectedFullCodeUpper || // "P10002-01" === "P10002-01" ✅
                activityFullCodeUpper === selectedCode // "P10002" === "P10002" (handles DB inconsistency) ✅
              
              // ✅ CRITICAL: If Project Code matches AND (Sub Code matches OR Full Code matches), it's a match
              // This ensures that activities with Project Code = P10002 and Project Sub Code = P10002-01
              // will match even if Project Full Code in DB is "P10002" instead of "P10002-01"
              if (subCodeMatches || fullCodeMatches) {
                console.log('✅ Activity matched:', {
                  activity_description: activity.activity_description || '',
                  activity_project_code: activityProjectCodeUpper,
                  activity_project_sub_code: activityProjectSubCodeUpper,
                  activity_project_full_code: activityFullCodeUpper,
                  selected_project: selectedProject,
                  subCodeMatches,
                  fullCodeMatches
                })
                return true
              }
            } else {
              // Selected project has no sub code - match if activity has no sub code OR sub code matches project code
              if (!activityProjectSubCode || 
                  activityProjectSubCodeUpper === activityProjectCodeUpper ||
                  activityFullCodeUpper === selectedCode) {
                return true
              }
            }
          }
          
          // Priority 2: If selected project has sub_code (e.g., "P10001-01") and activity has no sub_code (e.g., "P10001"),
          // match by project_code only (activities might not have sub_code in DB)
          if (selectedSubCode && !activityProjectSubCode && activityProjectCodeUpper === selectedCode) {
            return true
          }
          
          // Priority 3: If both have sub_codes, build activity full code and match
          if (activityProjectCode && activityProjectSubCode) {
            let builtActivityFullCode = activityProjectCode
            if (activityProjectSubCodeUpper.startsWith(activityProjectCodeUpper)) {
              builtActivityFullCode = activityProjectSubCode
            } else if (activityProjectSubCode.startsWith('-')) {
              builtActivityFullCode = `${activityProjectCode}${activityProjectSubCode}`
            } else {
              builtActivityFullCode = `${activityProjectCode}-${activityProjectSubCode}`
            }
            
            if (builtActivityFullCode.toUpperCase() === selectedFullCodeUpper) {
              return true
            }
          }
          
          // ✅ FIX: Also match if Project Full Code in DB matches selected project code (handles inconsistent data)
          if (activityFullCodeUpper === selectedCode) {
            return true
          }
          
          return false
        })
        
        if (!matchesProject) {
          // ✅ DEBUG: Log why activity was filtered out (only for first few)
          if (activities.indexOf(activity) < 5) {
            // Re-extract values for logging
            const logActivityFullCode = (activity.project_full_code || '').toString().trim()
            const logActivityProjectCode = (activity.project_code || '').toString().trim()
            const logActivityProjectSubCode = (activity.project_sub_code || '').toString().trim()
            const logSelectedProject = selectedProjects[0] || ''
            const logSelectedParts = logSelectedProject.split('-')
            const logSelectedCode = logSelectedParts[0]?.toUpperCase().trim()
            const logSelectedSubCode = logSelectedParts.slice(1).join('-').toUpperCase().trim()
            
            console.log('❌ Activity filtered out:', {
              activity_description: activity.activity_description || '',
              activity_project_code: logActivityProjectCode,
              activity_project_sub_code: logActivityProjectSubCode,
              activity_project_full_code: logActivityFullCode,
              selected_projects: selectedProjects,
              selected_code: logSelectedCode,
              selected_sub_code: logSelectedSubCode,
              selected_full_code: logSelectedProject,
              reason: 'Project Code/Sub Code/Full Code mismatch'
            })
          }
          return false
        }
      }
      
      // Multi-Activity filter (Smart Filter)
      if (selectedActivities.length > 0) {
        const activityDescription = activity.activity_description || ''
        const matchesActivity = selectedActivities.some(activityName =>
          activityDescription === activityName ||
          activityDescription?.toLowerCase().includes(activityName.toLowerCase())
        )
        if (!matchesActivity) return false
      }
      
      // Division filter (Smart Filter)
      if (selectedDivisions.length > 0) {
        const activityDivision = (activity.activity_division || '').toLowerCase().trim()
        const matchesDivision = selectedDivisions.some(division =>
          activityDivision === division.toLowerCase().trim() ||
          activityDivision.includes(division.toLowerCase().trim()) ||
          division.toLowerCase().trim().includes(activityDivision)
        )
        if (!matchesDivision) return false
      }
      
      // Zone filter (Smart Filter)
      // ✅ FIX: Use same normalization logic as BOQFilter and BOQTableWithCustomization
      if (selectedZones.length > 0) {
        const rawActivity = (activity as any).raw || {}
        
        // ✅ Use EXACT same priority and normalization as BOQFilter
        let zoneValue = activity.zone_number || 
                       rawActivity['Zone Number'] ||
                       rawActivity['Zone #'] ||
                       '0'
        
        if (zoneValue && zoneValue.toString().trim()) {
          let zoneStr = zoneValue.toString().trim()
          
          // ✅ Apply same normalization as BOQFilter (remove project code prefix)
          const projectCode = activity.project_full_code || activity.project_code || ''
          if (projectCode) {
            const projectCodeUpper = projectCode.toString().toUpperCase().trim()
            const baseProjectCode = projectCodeUpper.split('-')[0].split(' ')[0]
            zoneStr = zoneStr
              .replace(new RegExp(`^${baseProjectCode}\\s*-\\s*`, 'i'), '')
              .replace(new RegExp(`^${baseProjectCode}\\s+`, 'i'), '')
              .replace(new RegExp(`^${baseProjectCode}-`, 'i'), '')
              .trim()
          }
          
          // ✅ Apply same cleanup as BOQFilter
          zoneStr = zoneStr.replace(/^\s*-\s*/, '').replace(/-\s*$/, '').trim()
          zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
          zoneValue = zoneStr || ''
        }
        
        const activityZone = (zoneValue || '').toString().toLowerCase().trim()
        // ✅ FIX: Use exact match only to prevent "Tower-Side-C" from matching "Tower"
        const matchesZone = selectedZones.some(zone => {
          const selectedZone = zone.toLowerCase().trim()
          // Exact match only - no partial matching to avoid false positives
          return activityZone === selectedZone
        })
        if (!matchesZone) return false
      }
      
      // Unit filter (Smart Filter)
      if (selectedUnits.length > 0) {
        const activityUnit = (activity.unit || '').toLowerCase().trim()
        if (!selectedUnits.some(unit => activityUnit === unit.toLowerCase().trim())) return false
      }
      
      // Date range filter (Smart Filter)
      if (dateRange.from || dateRange.to) {
        const activityDate = activity.planned_activity_start_date || activity.created_at
        if (activityDate) {
          const actDate = new Date(activityDate)
          if (dateRange.from) {
            const fromDate = new Date(dateRange.from)
            fromDate.setHours(0, 0, 0, 0)
            if (actDate < fromDate) return false
          }
          if (dateRange.to) {
            const toDate = new Date(dateRange.to)
            toDate.setHours(23, 59, 59, 999)
            if (actDate > toDate) return false
          }
        }
      }
      
      // Value range filter (Smart Filter)
      if (valueRange.min !== undefined || valueRange.max !== undefined) {
        const activityValue = activity.total_value || 0
        if (valueRange.min !== undefined && activityValue < valueRange.min) return false
        if (valueRange.max !== undefined && activityValue > valueRange.max) return false
      }
      
      // Quantity range filter (Smart Filter)
      if (quantityRange.min !== undefined || quantityRange.max !== undefined) {
        const activityQuantity = activity.total_units || 0
        if (quantityRange.min !== undefined && activityQuantity < quantityRange.min) return false
        if (quantityRange.max !== undefined && activityQuantity > quantityRange.max) return false
      }
      
      // Legacy search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const activityDescription = activity.activity_description || ''
        const matchesSearch = 
          activityDescription.toLowerCase().includes(searchLower) ||
          (activity.project_code || '').toLowerCase().includes(searchLower) ||
          (activity.project_full_name || '').toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }
      
      return true
    })
  }, [activities, selectedProjects, selectedActivities, selectedDivisions, selectedZones, selectedUnits, dateRange, valueRange, quantityRange, searchTerm])
  
  // ✅ Don't apply pagination here - it will be applied in getCurrentPageData()
  // This ensures all filtered activities are available for counting and other operations
  const filteredActivities = useMemo(() => {
    return allFilteredActivities
  }, [allFilteredActivities])

  const filteredTotalCount = allFilteredActivities.length

  // ✅ FIX: Activities for filter dropdowns (exclude activity, zone, unit, division filters to show all available options)
  // This ensures that when filters are applied, all options remain visible in the dropdowns
  const activitiesForFilters = useMemo(() => {
    return activities.filter(activity => {
      // Multi-Project filter (Smart Filter) - keep this filter
      if (selectedProjects.length > 0) {
        const activityFullCode = (activity.project_full_code || '').toString().trim()
        const activityProjectCode = (activity.project_code || '').toString().trim()
        const activityProjectSubCode = (activity.project_sub_code || '').toString().trim()
        
        const matchesProject = selectedProjects.some(selectedProject => {
          const selectedFullCodeUpper = selectedProject.toUpperCase().trim()
          const activityFullCodeUpper = activityFullCode.toUpperCase().trim()
          const activityProjectCodeUpper = activityProjectCode.toUpperCase().trim()
          const activityProjectSubCodeUpper = activityProjectSubCode.toUpperCase().trim()
          
          // Priority 1: Exact match on project_full_code
          if (activityFullCodeUpper === selectedFullCodeUpper) {
            return true
          }
          
          const selectedParts = selectedProject.split('-')
          const selectedCode = selectedParts[0]?.toUpperCase().trim()
          const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
          
          if (selectedCode && activityProjectCodeUpper === selectedCode) {
            if (selectedSubCode) {
              const activitySubCodeOnly = activityProjectSubCodeUpper.includes('-') 
                ? activityProjectSubCodeUpper.split('-').slice(1).join('-').toUpperCase()
                : activityProjectSubCodeUpper
              
              const selectedSubCodeOnly = selectedSubCode.includes('-')
                ? selectedSubCode.split('-').slice(1).join('-').toUpperCase()
                : selectedSubCode
              
              const subCodeMatches = 
                activityProjectSubCodeUpper === selectedFullCodeUpper ||
                activityProjectSubCodeUpper === selectedSubCode ||
                activitySubCodeOnly === selectedSubCodeOnly ||
                activityProjectSubCodeUpper.endsWith(selectedSubCode) ||
                activityProjectSubCodeUpper.includes(selectedSubCode) ||
                activityProjectSubCodeUpper.includes(selectedFullCodeUpper) ||
                selectedFullCodeUpper.includes(activityProjectSubCodeUpper)
              
              const fullCodeMatches = 
                activityFullCodeUpper === selectedFullCodeUpper ||
                activityFullCodeUpper === selectedCode
              
              if (subCodeMatches || fullCodeMatches) {
                return true
              }
            } else {
              if (!activityProjectSubCode || 
                  activityProjectSubCodeUpper === activityProjectCodeUpper ||
                  activityFullCodeUpper === selectedCode) {
                return true
              }
            }
          }
          
          if (selectedSubCode && !activityProjectSubCode && activityProjectCodeUpper === selectedCode) {
            return true
          }
          
          if (activityProjectCode && activityProjectSubCode) {
            let builtActivityFullCode = activityProjectCode
            if (activityProjectSubCodeUpper.startsWith(activityProjectCodeUpper)) {
              builtActivityFullCode = activityProjectSubCode
            } else if (activityProjectSubCode.startsWith('-')) {
              builtActivityFullCode = `${activityProjectCode}${activityProjectSubCode}`
            } else {
              builtActivityFullCode = `${activityProjectCode}-${activityProjectSubCode}`
            }
            
            if (builtActivityFullCode.toUpperCase() === selectedFullCodeUpper) {
              return true
            }
          }
          
          if (activityFullCodeUpper === selectedCode) {
            return true
          }
          
          return false
        })
        
        if (!matchesProject) {
          return false
        }
      }
      
      // ✅ EXCLUDE activity filter - we want to show all activities even when some are selected
      // ✅ EXCLUDE zone filter - we want to show all zones even when some are selected
      // ✅ EXCLUDE division filter - we want to show all divisions even when some are selected
      // ✅ EXCLUDE unit filter - we want to show all units even when some are selected
      // ✅ EXCLUDE date range, value range, quantity range, and search filters
      
      return true
    })
  }, [activities, selectedProjects]) // Only depend on projects, NOT activities, zones, units, or divisions

  // ✅ Handle filter changes (legacy - not used with SmartFilter)
  const handleFilterChange = (key: string, value: string | string[]) => {
    setFilters({ ...filters, [key]: value })
    setCurrentPage(1)
    // No need to fetch data - filtering is done locally
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
    setSearchTerm('')
    setCurrentPage(1)
    // No need to clear activities - filtering is done locally
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

  // ✅ Handle server-side sorting
  const handleSort = useCallback((columnId: string, direction: 'asc' | 'desc') => {
    setSortColumn(columnId)
    setSortDirection(direction)
    setCurrentPage(1) // Reset to first page when sorting changes
  }, [])
  
  // ✅ Map column ID to database column name for sorting
  const getSortColumnName = (columnId: string): string | null => {
    const columnMap: Record<string, string> = {
      'activity_details': 'Activity Description', // ✅ Updated to use merged column
      'scope': 'Activity Scope',
      'division': 'Activity Division',
      'activity_timing': 'Activity Timing',
      'quantities': 'Total Units',
      'activity_value': 'Total Value',
      'planned_dates': 'Activity Planned Start Date',
      'actual_dates': 'Activity Actual Start Date',
      'progress_summary': 'Activity Progress %',
      'work_value_status': 'Earned Value',
      'daily_productivity': 'Productivity Daily Rate',
      'activity_status': 'Activity Status',
      'use_virtual_material': 'Use Virtual Material'
    }
    return columnMap[columnId] || null
  }

  // ✅ Sort activities by column ID
  const sortActivities = useCallback((activities: any[], columnId: string | null, direction: 'asc' | 'desc'): any[] => {
    if (!columnId) return activities

    const sorted = [...activities].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (columnId) {
        case 'activity_details':
          aValue = (a.activity_description || '').toLowerCase()
          bValue = (b.activity_description || '').toLowerCase()
          break
        case 'scope':
          aValue = ((a as any).raw?.['Activity Scope'] || a.activity_scope || '').toLowerCase()
          bValue = ((b as any).raw?.['Activity Scope'] || b.activity_scope || '').toLowerCase()
          break
        case 'division':
          aValue = ((a as any).raw?.['Activity Division'] || a.activity_division || '').toLowerCase()
          bValue = ((b as any).raw?.['Activity Division'] || b.activity_division || '').toLowerCase()
          break
        case 'activity_timing':
          aValue = ((a as any).raw?.['Activity Timing'] || a.activity_timing || '').toLowerCase()
          bValue = ((b as any).raw?.['Activity Timing'] || b.activity_timing || '').toLowerCase()
          break
        case 'quantities':
          aValue = Number(a.total_units || a.planned_units || 0)
          bValue = Number(b.total_units || b.planned_units || 0)
          break
        case 'activity_value':
          aValue = Number(a.total_value || a.planned_value || 0)
          bValue = Number(b.total_value || b.planned_value || 0)
          break
        case 'planned_dates':
          aValue = a.planned_start_date || a.planned_activity_start_date || ''
          bValue = b.planned_start_date || b.planned_activity_start_date || ''
          break
        case 'actual_dates':
          aValue = a.actual_start_date || a.actual_activity_start_date || ''
          bValue = b.actual_start_date || b.actual_activity_start_date || ''
          break
        case 'progress_summary':
          aValue = Number(a.activity_progress_percentage || 0)
          bValue = Number(b.activity_progress_percentage || 0)
          break
        case 'work_value_status':
          aValue = Number(a.earned_value || 0)
          bValue = Number(b.earned_value || 0)
          break
        case 'daily_productivity':
          aValue = Number(a.productivity_daily_rate || 0)
          bValue = Number(b.productivity_daily_rate || 0)
          break
        case 'activity_status':
          aValue = (a.activity_status || a.status || '').toLowerCase()
          bValue = (b.activity_status || b.status || '').toLowerCase()
          break
        case 'use_virtual_material':
          aValue = (a.use_virtual_material || false) ? 1 : 0
          bValue = (b.use_virtual_material || false) ? 1 : 0
          break
        default:
          // Default sort by created_at
          aValue = a.created_at || ''
          bValue = b.created_at || ''
      }

      // Handle date comparison
      if (columnId === 'planned_dates' || columnId === 'actual_dates') {
        const aDate = aValue ? new Date(aValue).getTime() : 0
        const bDate = bValue ? new Date(bValue).getTime() : 0
        return direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      // Handle number comparison
      if (columnId === 'quantities' || columnId === 'activity_value' || 
          columnId === 'progress_summary' || columnId === 'work_value_status' || 
          columnId === 'daily_productivity' || columnId === 'use_virtual_material') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle string comparison
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [])

  // ✅ PERFORMANCE: Fetch BOQ page with pagination (only visible activities)
  const fetchBOQPage = useCallback(async (page: number = 1, filterProjects: string[] = [], search: string = '', sortCol: string | null = null, sortDir: 'asc' | 'desc' = 'asc') => {
    // ✅ Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⏸️ BOQ fetch already in progress, skipping...')
      return
    }
    
    if (!isMountedRef.current) return
    
    // ✅ Only fetch if filters are applied
    if (filterProjects.length === 0) {
      console.log('💡 No filters applied - not loading data')
      setActivities([])
      setTotalCount(0)
      isLoadingRef.current = false
      stopSmartLoading(setLoading)
      return
    }
    
    try {
      isLoadingRef.current = true
      startSmartLoading(setLoading)
      setError('')
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Loading BOQ page...', { page, filterProjects, search })
      }
      
      // ✅ Fetch projects first (always needed)
      const projectsRes = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectsRes.error) {
        console.error('❌ Projects Error:', projectsRes.error)
        setError(`Failed to load projects: ${projectsRes.error.message}`)
        isLoadingRef.current = false
        stopSmartLoading(setLoading)
        return
      }
      
      const mappedProjects = (projectsRes.data || []).map(mapProjectFromDB)
      setProjects(mappedProjects)
      
      // ✅ SIMPLIFIED: Fetch by Project Full Code only
      // ✅ CRITICAL: project_full_code is the ONLY identifier - any difference means separate project
      console.log('🔍 Filter by Project Full Code only:', filterProjects)
      
      // ✅ Helper function to fetch all records with pagination (Supabase default limit is 1000)
      const fetchAllRecords = async (table: string, filter: string) => {
        let allData: any[] = []
        let offset = 0
        const chunkSize = 1000
        let hasMore = true
        
        // ✅ Get sort column name for database
        const dbSortColumn = sortCol ? getSortColumnName(sortCol) : null
        
        while (hasMore) {
          let query = supabase
            .from(table)
            .select('*')
            .range(offset, offset + chunkSize - 1)
          
          if (filter && filter.trim()) {
            query = query.or(filter)
          }
          
          // ✅ Apply sorting if specified
          if (table === TABLES.BOQ_ACTIVITIES) {
            if (dbSortColumn) {
              query = query.order(dbSortColumn, { ascending: sortDir === 'asc' })
            } else {
              query = query.order('created_at', { ascending: false })
            }
          } else if (table === TABLES.KPI) {
            query = query.order('created_at', { ascending: false })
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
          console.log(`📥 Fetched ${table} chunk: ${data.length} records (total so far: ${allData.length})`)
          
          if (data.length < chunkSize) {
            hasMore = false
          } else {
            offset += chunkSize
          }
        }
        
        console.log(`✅ Total ${table} records fetched: ${allData.length}`)
        return allData
      }
      
      // ✅ FIX: Only fetch by Project Full Code - don't fetch by Project Code alone
      // This prevents fetching activities from other projects with the same base code
      // If Project Full Code is missing in DB, we'll build it from Project Code + Project Sub Code
      // ✅ Build proper OR filter for multiple projects
      const fullCodeFilter = filterProjects.length > 0
        ? filterProjects.map(code => `Project Full Code.eq.${code}`).join(',')
        : ''
      
      const activitiesByFullCode = fullCodeFilter
        ? await fetchAllRecords(TABLES.BOQ_ACTIVITIES, fullCodeFilter)
        : []
      
      // ✅ FALLBACK: If no results by Project Full Code, try by Project Code + Project Sub Code
      // But only for the specific projects we're looking for
      let activitiesByCode: any[] = []
      if (activitiesByFullCode.length === 0) {
        console.log('⚠️ No activities found by Project Full Code, trying Project Code + Project Sub Code...')
        // Build filter for Project Code + Project Sub Code combinations
        const codeSubCodeFilters = filterProjects.map(fullCode => {
          const parts = fullCode.split('-')
          if (parts.length >= 2) {
            const projectCode = parts[0]
            const projectSubCode = parts.slice(1).join('-') // Handle cases like "P9999-01-R1"
            return `Project Code.eq.${projectCode},Project Sub Code.eq.${projectSubCode}`
          }
          return null
        }).filter(f => f !== null)
        
        if (codeSubCodeFilters.length > 0) {
          activitiesByCode = await fetchAllRecords(
            TABLES.BOQ_ACTIVITIES,
            codeSubCodeFilters.join(',')
          )
        }
      }
      
      // ✅ Same logic for KPIs
      const kpisByFullCode = await fetchAllRecords(
        TABLES.KPI,
        filterProjects.map(code => `Project Full Code.eq.${code}`).join(',')
      )
      
      let kpisByCode: any[] = []
      if (kpisByFullCode.length === 0) {
        console.log('⚠️ No KPIs found by Project Full Code, trying Project Code + Project Sub Code...')
        const codeSubCodeFilters = filterProjects.map(fullCode => {
          const parts = fullCode.split('-')
          if (parts.length >= 2) {
            const projectCode = parts[0]
            const projectSubCode = parts.slice(1).join('-')
            return `Project Code.eq.${projectCode},Project Sub Code.eq.${projectSubCode}`
          }
          return null
        }).filter(f => f !== null)
        
        if (codeSubCodeFilters.length > 0) {
          kpisByCode = await fetchAllRecords(
            TABLES.KPI,
            codeSubCodeFilters.join(',')
          )
        }
      }
      
      // Create response objects to match expected format
      const activitiesResByFullCode = { data: activitiesByFullCode, error: null }
      const activitiesResByCode = { data: activitiesByCode, error: null }
      const kpisResByFullCode = { data: kpisByFullCode, error: null }
      const kpisResByCode = { data: kpisByCode, error: null }
      
      // ✅ Combine results and remove duplicates
      const allActivities: any[] = [
        ...(activitiesResByFullCode.data || []),
        ...(activitiesResByCode.data || [])
      ]
      const uniqueActivities = allActivities.filter((activity: any, index: number, self: any[]) => 
        index === self.findIndex((a: any) => a.id === activity.id)
      )
      
      const allKPIs: any[] = [
        ...(kpisResByFullCode.data || []),
        ...(kpisResByCode.data || [])
      ]
      const uniqueKPIs = allKPIs.filter((kpi: any, index: number, self: any[]) => 
        index === self.findIndex((k: any) => k.id === kpi.id)
      )
      
      // Use combined results
      const activitiesRes = { data: uniqueActivities, error: activitiesResByFullCode.error || activitiesResByCode.error }
      const kpisRes = { data: uniqueKPIs, error: kpisResByFullCode.error || kpisResByCode.error }
      
      // ✅ CRITICAL: Map data FIRST to build project_full_code correctly, THEN filter
      console.log(`📥 Fetched ${uniqueActivities.length} activities from database`)
      console.log('🔍 Filtering by projects:', filterProjects)
      
      // ✅ STEP 1: Map all activities to build project_full_code correctly
      const mappedActivitiesRaw = uniqueActivities.map(mapBOQFromDB)
      
      // ✅ DEBUG: Log sample activities after mapping
      if (mappedActivitiesRaw.length > 0) {
        console.log('📋 Sample activities after mapping (first 3):', mappedActivitiesRaw.slice(0, 3).map((a: any) => ({
          activityDescription: a.activity_description || '',
          projectFullCode: a.project_full_code,
          projectCode: a.project_code,
          projectSubCode: a.project_sub_code
        })))
      }
      
      // ✅ STEP 2: Filter by exact Project Full Code match using BUILT project_full_code
      let filteredActivitiesData = mappedActivitiesRaw.filter((activity: any, index: number) => {
        const activityFullCode = (activity.project_full_code || '').toString().trim()
        const activityProjectCode = (activity.project_code || '').toString().trim()
        const activityProjectSubCode = (activity.project_sub_code || '').toString().trim()
        
        // ✅ Match by exact Project Full Code OR by Project Code if activity has no sub_code
        const matches = filterProjects.some(selectedFullCode => {
          const selectedFullCodeUpper = selectedFullCode.toUpperCase().trim()
          const activityFullCodeUpper = activityFullCode.toUpperCase().trim()
          
          // Priority 1: Exact match on project_full_code
          if (activityFullCodeUpper === selectedFullCodeUpper) {
            if (index < 3) {
              console.log('🔍 Matching (exact):', {
                activityFullCode,
                selectedFullCode,
                match: true
              })
            }
            return true
          }
          
          // Priority 2: If selected project has sub_code (e.g., "P10001-01") and activity has no sub_code (e.g., "P10001"),
          // match by project_code only (activities might not have sub_code in DB)
          const selectedParts = selectedFullCode.split('-')
          const selectedCode = selectedParts[0]?.toUpperCase().trim()
          const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
          
          // If selected project has sub_code and activity has no sub_code, match by project_code
          if (selectedSubCode && !activityProjectSubCode && activityProjectCode.toUpperCase() === selectedCode) {
            if (index < 3) {
              console.log('🔍 Matching (code only - activity has no sub_code):', {
                activityFullCode,
                activityProjectCode,
                selectedFullCode,
                selectedCode,
                match: true
              })
            }
            return true
          }
          
          // Priority 3: If both have sub_codes, build activity full code and match
          if (activityProjectCode && activityProjectSubCode) {
            let builtActivityFullCode = activityProjectCode
            if (activityProjectSubCode.toUpperCase().startsWith(activityProjectCode.toUpperCase())) {
              builtActivityFullCode = activityProjectSubCode
            } else if (activityProjectSubCode.startsWith('-')) {
              builtActivityFullCode = `${activityProjectCode}${activityProjectSubCode}`
            } else {
              builtActivityFullCode = `${activityProjectCode}-${activityProjectSubCode}`
            }
            
            if (builtActivityFullCode.toUpperCase() === selectedFullCodeUpper) {
              if (index < 3) {
                console.log('🔍 Matching (built):', {
                  activityFullCode,
                  builtActivityFullCode,
                  selectedFullCode,
                  match: true
                })
              }
              return true
            }
          }
          
          if (index < 3) {
            console.log('🔍 Matching (no match):', {
              activityFullCode,
              activityProjectCode,
              activityProjectSubCode,
              selectedFullCode,
              match: false
            })
          }
          return false
        })
        
        return matches
      })
      
      console.log(`✅ Filtered activities: ${filteredActivitiesData.length} out of ${mappedActivitiesRaw.length} total`)
      if (filteredActivitiesData.length === 0 && mappedActivitiesRaw.length > 0) {
        console.warn('⚠️ No activities matched filters!', {
          sampleActivity: {
            activityDescription: mappedActivitiesRaw[0]?.activity_description || '',
            projectFullCode: mappedActivitiesRaw[0]?.project_full_code,
            projectCode: mappedActivitiesRaw[0]?.project_code,
            projectSubCode: mappedActivitiesRaw[0]?.project_sub_code
          },
          selectedProjects: filterProjects,
          allProjectFullCodes: mappedActivitiesRaw.slice(0, 5).map((a: any) => a.project_full_code)
        })
      }
      
      // ✅ DEBUG: Log filtered activities
      if (filteredActivitiesData.length > 0) {
        console.log('✅ Filtered activities (first 3):', filteredActivitiesData.slice(0, 3).map((a: any) => ({
          activityDescription: a.activity_description || '',
          projectFullCode: a.project_full_code
        })))
      }
      
      if (activitiesRes.error) {
        console.warn('⚠️ Activities Error:', activitiesRes.error)
      }
      
      if (kpisRes.error) {
        console.warn('⚠️ KPIs Error:', kpisRes.error)
      }
      
      // Use filtered and mapped activities
      const mappedActivities = filteredActivitiesData
      const mappedKPIs = (kpisRes.data || []).map(mapKPIFromDB)
      
      // ✅ Calculate rates and progress for activities
      const activitiesWithRates = mappedActivities.map(activity => {
        const rate = calculateActivityRate(activity)
        return { ...activity, rate }
      })
      
      const activitiesWithProgress = activitiesWithRates.map(activity => {
        const progress = calculateActivityProgress(activity, mappedKPIs)
        return { ...activity, activity_progress_percentage: progress.metrics.progress }
      })
      
      // ✅ Apply sorting to all merged data after processing
      const sortedActivities = sortActivities(activitiesWithProgress, sortCol, sortDir)
      
      // Update state
      if (isMountedRef.current) {
        setActivities(sortedActivities)
        setAllKPIs(mappedKPIs)
        setTotalCount(sortedActivities.length)
        
        console.log('✅ Data loaded:', {
          activities: sortedActivities.length,
          kpis: mappedKPIs.length
        })
      }
    } catch (error: any) {
      console.error('❌ BOQManagement: Error:', error)
      if (isMountedRef.current) {
        setError(error.message || 'Failed to load data')
      }
    } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        stopSmartLoading(setLoading)
      }
    }
  }, [supabase, startSmartLoading, stopSmartLoading, itemsPerPage, sortColumn, sortDirection, sortActivities])
  
  // ✅ LEGACY: Keep fetchData for backward compatibility (wraps fetchBOQPage)
  const fetchData = useCallback(async (filterProjects: string[] = []) => {
    await fetchBOQPage(currentPage, filterProjects, searchTerm)
  }, [fetchBOQPage, currentPage, searchTerm])

  // ✅ Fetch projects only on mount (lightweight)
  const fetchProjects = useCallback(async () => {
    if (!isMountedRef.current) return
    
    try {
      const projectsRes = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectsRes.error) {
        console.error('❌ Projects Error:', projectsRes.error)
        return
      }
      
      const mappedProjects = (projectsRes.data || []).map(mapProjectFromDB)
      if (isMountedRef.current) {
        setProjects(mappedProjects)
        console.log('✅ Projects loaded:', mappedProjects.length)
      }
    } catch (error: any) {
      console.error('❌ Error loading projects:', error)
    }
  }, [supabase])

  // ✅ DEPRECATED: Apply filters to database immediately (kept for backward compatibility)
  const applyFiltersToDatabase = async (filtersToApply: any) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      console.log('🔄 Applying filters to database:', filtersToApply)
      
      // ✅ Check if any filters are applied
      const hasZoneFilter = filtersToApply.zone && (Array.isArray(filtersToApply.zone) ? filtersToApply.zone.length > 0 : filtersToApply.zone !== '')
      if (!filtersToApply.search && (!filtersToApply.project || filtersToApply.project.length === 0) && !filtersToApply.division && !filtersToApply.status && !hasZoneFilter) {
        console.log('💡 No filters applied - showing empty state')
        setActivities([])
        // Removed - using useMemo instead([])
        setTotalCount(0)
        stopSmartLoading(setLoading)
        return
      }
      
      // ✅ Build query with filters
      let activitiesQuery = supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // ✅ FIX: Apply database-level filters with comprehensive project_full_code and project_sub_code matching
      // Same solution as Smart KPI Form - use project_full_code and project_sub_code optionally for additional verification
      if (filtersToApply.project && filtersToApply.project.length > 0) {
        const projectFullCodes = filtersToApply.project
        const projectCodes = filtersToApply.project.map((fullCode: string) => {
          // Extract project_code from project_full_code (format: "P5066-R1" -> "P5066")
          return fullCode.split('-')[0]
        })
        const uniqueProjectCodes = Array.from(new Set(projectCodes))
        
        // Extract project_sub_codes from project_full_codes (optional - for additional verification)
        const projectSubCodes = filtersToApply.project.map((fullCode: string) => {
          // Extract sub code from full code (format: "P10002-01" -> "01" or "P10002-01" -> "P10002-01")
          // ✅ FIX: In DB, Project Sub Code might be stored as "P10002-01" (full) or "01" (partial)
          const parts = fullCode.split('-')
          if (parts.length > 1) {
            // Return both the full sub code (P10002-01) and the partial (01)
            return parts.slice(1).join('-') // Handle cases like "P10002-01" -> "01"
          }
          return ''
        }).filter((code: string) => code !== '')
        
        // ✅ FIX: Also extract the full sub code (e.g., "P10002-01" from "P10002-01")
        const projectSubCodesFull = filtersToApply.project.map((fullCode: string) => {
          // For "P10002-01", the sub code in DB might be stored as "P10002-01" (full)
          return fullCode // Return the full code as potential sub code
        })
        
        console.log('🔍 Building project filter (applyFiltersToDatabase):', {
          projectFullCodes,
          uniqueProjectCodes,
          projectSubCodes,
          filterCount: projectFullCodes.length
        })
        
        // ✅ CRITICAL FIX: Each project with different Sub Code is a SEPARATE project
        // Must match BOTH Project Code AND Project Sub Code for accurate filtering
        // Use the same strategy as EnhancedSmartActualKPIForm: Match by Project Code + Sub Code with AND
        if (projectFullCodes.length === 1) {
          // Single project: Match the SPECIFIC project only
          const fullCode = projectFullCodes[0]
          const baseCode = uniqueProjectCodes[0]
          const subCode = projectSubCodes[0] || ''
          
          // ✅ FIX: Match activities that have EITHER:
          // 1. Project Full Code matching the selected project (P10002-01)
          // 2. Project Full Code matching just the base code (P10002) - handles DB inconsistency
          // 3. Project Code matching - but we need to ensure Project Sub Code also matches
          // This handles cases where Project Full Code in DB might be inconsistent
          const orConditions: string[] = []
          
          // Strategy 1: Match by Project Full Code (exact match for selected project)
          orConditions.push(`Project Full Code.eq.${fullCode}`)
          
          // Strategy 2: Match by Project Full Code = base code only (P10002)
          // This catches activities that have Project Full Code = P10002 instead of P10002-01
          orConditions.push(`Project Full Code.eq.${baseCode}`)
          
          // Strategy 3: Match by Project Code (will filter by Project Sub Code client-side)
          // This ensures we get all activities with Project Code = P10002
          // We'll filter by Project Sub Code on client-side to ensure accuracy
          orConditions.push(`Project Code.eq.${baseCode}`)
          
          // Strategy 4: Match by Project Sub Code (if sub code exists)
          // ✅ CRITICAL: In DB, Project Sub Code might be stored as "P10002-01" (full) or "01" (partial)
          if (subCode) {
            // Try matching by Project Sub Code = full code (P10002-01)
            orConditions.push(`Project Sub Code.eq.${fullCode}`)
            // Try matching by Project Sub Code = partial code (01)
            orConditions.push(`Project Sub Code.eq.${subCode}`)
            // Try Project Full Code variations
            orConditions.push(`Project Full Code.eq.${baseCode}-${subCode}`)
            orConditions.push(`Project Full Code.eq.${baseCode}${subCode}`)
          }
          
          // Use OR to match any of these conditions
          activitiesQuery = activitiesQuery.or(orConditions.join(','))
          
          console.log('🔍 Applied single project filter with multiple strategies:', {
            fullCode,
            baseCode,
            subCode,
            orConditions,
            note: 'Will filter by Project Sub Code on client-side for accuracy'
          })
          
          // ✅ Client-side filtering will ensure exact matching by Project Code + Project Sub Code
        } else if (projectFullCodes.length > 1) {
          // Multiple projects: Build complex OR condition
          // ✅ CRITICAL: Each project is separate - must match specific projects only
          // Since Supabase doesn't support AND in OR, we fetch activities that might match
          // Client-side filtering will ensure exact matching
          const orConditions: string[] = []
          
          // Strategy 1: Exact matches for all full codes (MOST IMPORTANT)
          for (const fullCode of projectFullCodes) {
            orConditions.push(`Project Full Code.eq.${fullCode}`)
          }
          
          // Strategy 2: Try variations of Project Full Code for each project
          for (let i = 0; i < projectFullCodes.length; i++) {
            const baseCode = projectCodes[i]
            const subCode = projectSubCodes[i] || ''
            
            if (subCode) {
              const variations = [
                `${baseCode}-${subCode}`,
                `${baseCode}${subCode}`,
                `${baseCode} ${subCode}`
              ]
              for (const variation of variations) {
                orConditions.push(`Project Full Code.eq.${variation}`)
              }
            }
          }
          
          // ✅ DO NOT use Project Code.eq alone - it brings ALL projects with same code
          // ✅ DO NOT use LIKE matches - they bring ALL projects with same code
          // Client-side filtering will ensure Project Code + Sub Code both match exactly
          
          activitiesQuery = activitiesQuery.or(orConditions.join(','))
        }
        
      console.log('✅ Applied project filter with exact matching (applyFiltersToDatabase) - client-side filtering ensures accuracy')
      }
      
      if (filtersToApply.division) {
        activitiesQuery = activitiesQuery.eq('Activity Division', filtersToApply.division)
        console.log('🔍 Applied division filter:', filtersToApply.division)
      }
      
      // ✅ Zone filter (supports multiple zones in Zone Number field)
      if (filtersToApply.zone) {
        const zones = Array.isArray(filtersToApply.zone) ? filtersToApply.zone : [filtersToApply.zone]
        if (zones.length > 0) {
          // ✅ FIX: Search in Zone Number field with flexible matching
          // Build OR condition to match zones
          const zoneConditions: string[] = []
          
          for (const zone of zones) {
            const zoneTrimmed = zone.trim()
            // Match in Zone Number - exact and partial matches
            zoneConditions.push(`Zone Number.eq.${zoneTrimmed}`)
            zoneConditions.push(`Zone Number.ilike.%${zoneTrimmed}%`)
            // Also try extracting number from zone (e.g., "1" from "Zone 1")
            const zoneNumberMatch = zoneTrimmed.match(/\d+/)
            if (zoneNumberMatch) {
              const zoneNumber = zoneNumberMatch[0]
              zoneConditions.push(`Zone Number.eq.${zoneNumber}`)
              zoneConditions.push(`Zone Number.ilike.%${zoneNumber}%`)
            }
          }
          
          if (zoneConditions.length > 0) {
            activitiesQuery = activitiesQuery.or(zoneConditions.join(','))
          }
          
          console.log('🔍 Applied zone filter (searching in Zone Number with flexible matching):', zones.length === 1 ? zones[0] : `${zones.length} zones`)
        }
      }
      
      // ✅ Note: Status filter not available in BOQ Rates table
      if (filtersToApply.status) {
        console.log('⚠️ Status filter not available in BOQ Rates table - skipping')
      }
      
      console.log('🔍 Final query filters:', {
        project: filtersToApply.project && filtersToApply.project.length > 0 ? filtersToApply.project.join(', ') : 'none',
        division: filtersToApply.division || 'none',
        zone: filtersToApply.zone ? (Array.isArray(filtersToApply.zone) ? filtersToApply.zone.join(', ') : filtersToApply.zone) : 'none',
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
        filtered = mappedActivities.filter((activity: BOQActivity) => {
          const activityDescription = activity.activity_description || ''
          return activityDescription.toLowerCase().includes(searchTerm) ||
                 activity.project_code?.toLowerCase().includes(searchTerm) ||
                 activity.project_full_name?.toLowerCase().includes(searchTerm)
        })
        console.log('🔍 Applied search filter:', { searchTerm, results: filtered.length })
      }
      
      setActivities(mappedActivities)
      // Removed - using useMemo instead(filtered)
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
      
      // ✅ FIX: Sync BOQ Planned Units from KPIs (background sync, don't block UI)
      // This ensures Planned Units in BOQ match the sum of Planned KPIs
      if (mappedActivities.length > 0 && allKPIs.length > 0) {
        console.log('🔄 Syncing BOQ Planned Units from KPIs (background)...')
        // Run sync in background without blocking UI
        Promise.all(
          mappedActivities.map(async (activity) => {
            try {
              // Build project_full_code for matching
              const projectCode = (activity.project_code || '').trim()
              const projectSubCode = (activity.project_sub_code || '').trim()
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
              
              // Sync BOQ from KPIs (updates both Planned and Actual Units)
              const activityDescription = activity.activity_description || ''
              await syncBOQFromKPI(projectFullCode || projectCode, activityDescription)
            } catch (error) {
              // Don't fail entire load if sync fails for one activity
              const activityDescription = activity.activity_description || ''
              console.warn(`⚠️ Failed to sync BOQ for ${activityDescription}:`, error)
            }
          })
        ).then(() => {
          console.log('✅ Background BOQ sync completed')
          // Optionally refresh data after sync
          // fetchData(currentPage, true)
        }).catch(error => {
          console.warn('⚠️ Some BOQ syncs failed:', error)
        })
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

  // ✅ DEPRECATED: Old fetchData function (removed - using new fetchData with filters)
  const _oldFetchData = async (page: number = 1, applyFilters: boolean = false) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      console.log(`📄 BOQManagement: Fetching activities (page ${page}, applyFilters: ${applyFilters})...`)
      
      // ✅ Smart loading: Only load data when filters are applied
      const hasZoneFilter = filters.zone && (Array.isArray(filters.zone) ? filters.zone.length > 0 : filters.zone !== '')
      if (!applyFilters && !filters.search && (!filters.project || filters.project.length === 0) && !filters.division && !filters.status && !hasZoneFilter) {
        console.log('💡 No filters applied - showing empty state')
        setActivities([])
        // Removed - using useMemo instead([])
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
        // ✅ FIX: Build comprehensive filter for project_full_code and project_sub_code matching
        // Same solution as Smart KPI Form - use project_full_code and project_sub_code optionally for additional verification
        const projectFullCodes = filters.project as string[]
        const projectCodes = (filters.project as string[]).map((fullCode: string) => {
          // Extract project_code from project_full_code (format: "P5066-R1" -> "P5066")
          return fullCode.split('-')[0]
        })
        const uniqueProjectCodes = Array.from(new Set(projectCodes))
        
        // Extract project_sub_codes from project_full_codes (optional - for additional verification)
        const projectSubCodes = (filters.project as string[]).map((fullCode: string) => {
          // Extract sub code from full code (format: "P5066-R1" -> "R1" or "P5066-R1" -> "R1")
          const parts = fullCode.split('-')
          if (parts.length > 1) {
            return parts.slice(1).join('-') // Handle cases like "P5066-R1-A"
          }
          return ''
        }).filter(code => code !== '')
        
        console.log('🔍 Building project filter:', {
          projectFullCodes,
          uniqueProjectCodes,
          projectSubCodes,
          filterCount: projectFullCodes.length
        })
        
        // ✅ CRITICAL FIX: Each project with different Sub Code is a SEPARATE project
        // Must match BOTH Project Code AND Project Sub Code for accurate filtering
        // Use the same strategy as EnhancedSmartActualKPIForm: Match by Project Code + Sub Code with AND
        if (projectFullCodes.length === 1) {
          // Single project: Match the SPECIFIC project only
          const fullCode = projectFullCodes[0]
          const baseCode = uniqueProjectCodes[0] as string
          const subCode = projectSubCodes[0] || ''
          
          // ✅ Strategy 1: Match by exact Project Code + Sub Code (MOST ACCURATE)
          // Each project with different Sub Code is a separate project - fetch ONLY its activities
          if (subCode) {
            // MUST match BOTH Project Code AND Project Sub Code (using .eq() chaining = AND condition)
            activitiesQuery = activitiesQuery
              .eq('Project Code', String(baseCode))
              .eq('Project Sub Code', String(subCode))
          } else {
            // No sub code: Match by Project Code only, but ensure no sub code exists
            activitiesQuery = activitiesQuery
              .eq('Project Code', String(baseCode))
              .or('Project Sub Code.is.null,Project Sub Code.eq.')
          }
          
          // ✅ DO NOT use Project Full Code variations - they might match other projects
          // ✅ DO NOT use LIKE matches - they bring ALL projects with same code
          // Client-side filtering will ensure Project Code + Sub Code both match exactly
        } else if (projectFullCodes.length > 1) {
          // Multiple projects: Build complex OR condition
          // ✅ CRITICAL: Each project is separate - must match specific projects only
          // Since Supabase doesn't support AND in OR, we fetch activities that might match
          // Client-side filtering will ensure exact matching
          const orConditions: string[] = []
          
          // Strategy 1: Exact matches for all full codes (MOST IMPORTANT)
          for (const fullCode of projectFullCodes) {
            orConditions.push(`Project Full Code.eq.${fullCode}`)
          }
          
          // Strategy 2: Try variations of Project Full Code for each project
          for (let i = 0; i < projectFullCodes.length; i++) {
            const baseCode = projectCodes[i]
            const subCode = projectSubCodes[i] || ''
            
            if (subCode) {
              const variations = [
                `${baseCode}-${subCode}`,
                `${baseCode}${subCode}`,
                `${baseCode} ${subCode}`
              ]
              for (const variation of variations) {
                orConditions.push(`Project Full Code.eq.${variation}`)
              }
            }
          }
          
          // ✅ DO NOT use Project Code.eq alone - it brings ALL projects with same code
          // ✅ DO NOT use LIKE matches - they bring ALL projects with same code
          // Client-side filtering will ensure Project Code + Sub Code both match exactly
          
          activitiesQuery = activitiesQuery.or(orConditions.join(','))
        }
        
      console.log('✅ Applied project filter with exact matching - client-side filtering ensures accuracy')
      }
      
      if (filters.division) {
        activitiesQuery = activitiesQuery.eq('Activity Division', filters.division)
        console.log('🔍 Applied division filter:', filters.division)
      }
      
      // ✅ Zone filter (supports multiple zones in Zone Number field)
      if (filters.zone) {
        const zones = Array.isArray(filters.zone) ? filters.zone : [filters.zone]
        if (zones.length > 0) {
          // ✅ FIX: Search in Zone Number field with flexible matching
          // Build OR condition to match zones
          const zoneConditions: string[] = []
          
          for (const zone of zones) {
            const zoneTrimmed = zone.trim()
            // Match in Zone Number - exact and partial matches
            zoneConditions.push(`Zone Number.eq.${zoneTrimmed}`)
            zoneConditions.push(`Zone Number.ilike.%${zoneTrimmed}%`)
            // Also try extracting number from zone (e.g., "1" from "Zone 1")
            const zoneNumberMatch = zoneTrimmed.match(/\d+/)
            if (zoneNumberMatch) {
              const zoneNumber = zoneNumberMatch[0]
              zoneConditions.push(`Zone Number.eq.${zoneNumber}`)
              zoneConditions.push(`Zone Number.ilike.%${zoneNumber}%`)
            }
          }
          
          if (zoneConditions.length > 0) {
            activitiesQuery = activitiesQuery.or(zoneConditions.join(','))
          }
          
          console.log('🔍 Applied zone filter (searching in Zone Number with flexible matching):', zones.length === 1 ? zones[0] : `${zones.length} zones`)
        }
      }
      
      // ✅ Note: Status filter not available in BOQ Rates table
      if (filters.status) {
        console.log('⚠️ Status filter not available in BOQ Rates table - skipping')
      }
      
      // ✅ Debug: Show final query
      console.log('🔍 Final query filters:', {
        project: filters.project && filters.project.length > 0 ? filters.project.join(', ') : 'none',
        division: filters.division || 'none',
        zone: filters.zone ? (Array.isArray(filters.zone) ? filters.zone.join(', ') : filters.zone) : 'none',
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
        filtered = mappedActivities.filter((activity: BOQActivity) => {
          const activityDescription = activity.activity_description || ''
          return activityDescription.toLowerCase().includes(searchTerm) ||
          activity.project_code?.toLowerCase().includes(searchTerm) ||
          activity.project_full_name?.toLowerCase().includes(searchTerm)
        })
        console.log('🔍 Applied search filter:', { searchTerm, results: filtered.length })
      }
      
      // Removed - using useMemo instead(filtered)
      
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
          name: a.activity_description || '',
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
            if (selectedProjects.length > 0) {
              fetchData(selectedProjects)
            }
          }
        }, 1000)
        return
      }
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // ✅ Initial mount effect - simplified like ProjectsList
  useEffect(() => {
    isMountedRef.current = true
    isLoadingRef.current = false
    hasFetchedRef.current = false
    // ✅ Ensure loading state is false on mount
    setLoading(false)
    console.log('🟡 BOQManagement: Component mounted')
    
    // Listen for database updates
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName } = event.detail
      console.log(`🔔 BOQ: Database updated event received for ${tableName}`)
      
      if (tableName === TABLES.BOQ_ACTIVITIES || tableName === TABLES.KPI) {
        console.log(`🔄 BOQ: Reloading data due to ${tableName} update...`)
        if (selectedProjects.length > 0) {
          fetchData(selectedProjects)
        }
      } else if (tableName === TABLES.PROJECTS) {
        fetchProjects()
      }
    }
    
    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    
    // ✅ PERFORMANCE: Defer fetchProjects to avoid blocking navigation
    // Use setTimeout to run after component is fully rendered
    const projectsTimeout = setTimeout(() => {
      if (isMountedRef.current) {
    fetchProjects()
      }
    }, 50) // Small delay to allow UI to render first
    
    return () => {
      clearTimeout(projectsTimeout)
      console.log('🔴 BOQManagement: Component unmounting')
      isMountedRef.current = false
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount
  
  // ✅ PERFORMANCE: Fetch data when filters or page change (with stable dependencies)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      return
    }
    
    if (isLoadingRef.current) return
    
    if (selectedProjects.length > 0) {
      fetchBOQPage(currentPage, selectedProjects, searchTerm, sortColumn, sortDirection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, selectedProjects.join(','), sortColumn, sortDirection])

  // ✅ Removed auto-apply filters - now filters are applied at database level
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // No need to fetch data - filtering is done locally
  }

  // ✅ Get current page data (filtered) - Apply pagination here
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allFilteredActivities.slice(startIndex, endIndex)
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
      
      // Map to database format
      const dbData: any = {
        'Project Code': activityData.project_code || '',
        'Project Sub Code': activityData.project_sub_code || '',
        'Project Full Code': activityData.project_full_code || activityData.project_code || '',
        'Activity Description': activityData.activity_description || activityData.activity_name || activityData.activity || '', // ✅ Merged column
        'Activity Division': activityData.activity_division || '', // ✅ FIX: Only use activity_division
        'Unit': activityData.unit || '',
        'Zone Number': activityData.zone_number || '0', // ✅ Zone Number (merged column)
        
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
        // ✅ Activity Timing, Has Value, Affects Timeline, and Use Virtual Material
        // Note: These columns must exist in the database (run add-activity-timing-column.sql first)
        'Activity Timing': activityData.activity_timing || 'post-commencement',
        'Has Value': activityData.has_value !== undefined ? (activityData.has_value ? 'TRUE' : 'FALSE') : 'TRUE',
        'Affects Timeline': activityData.affects_timeline !== undefined ? (activityData.affects_timeline ? 'TRUE' : 'FALSE') : 'FALSE',
        'Use Virtual Material': activityData.use_virtual_material !== undefined ? (activityData.use_virtual_material ? 'TRUE' : 'FALSE') : 'FALSE',
        // ✅ SET CREATED BY: Add user who created the BOQ activity
        'created_by': appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))
      console.log('✅ Setting created_by for BOQ activity:', dbData['created_by'])

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
      
      // ✅ Update Responsible Divisions in Project based on Activity Division
      if (activityData.activity_division && activityData.project_code) {
        try {
          await updateProjectResponsibleDivisions(activityData.project_code, activityData.activity_division)
        } catch (divisionError) {
          console.warn('⚠️ Failed to update project responsible divisions:', divisionError)
          // Don't throw - continue with activity creation
        }
      }
      
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
      if (selectedProjects.length > 0) {
        await fetchData(selectedProjects)
      }
      
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
      const dbData: any = {
        'Project Code': activityData.project_code || '',
        'Project Sub Code': activityData.project_sub_code || '',
        'Project Full Code': activityData.project_full_code || activityData.project_code || '',
        'Activity Description': activityData.activity_description || activityData.activity_name || activityData.activity || '', // ✅ Merged column
        'Activity Division': activityData.activity_division || '', // ✅ FIX: Only use activity_division
        'Unit': activityData.unit || '',
        'Zone Number': activityData.zone_number || '0', // ✅ Zone Number (merged column)
        
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
        // ✅ Activity Timing, Has Value, Affects Timeline, and Use Virtual Material
        // Note: These columns must exist in the database (run add-activity-timing-column.sql first)
        'Activity Timing': activityData.activity_timing || 'post-commencement',
        'Has Value': activityData.has_value !== undefined ? (activityData.has_value ? 'TRUE' : 'FALSE') : 'TRUE',
        'Affects Timeline': activityData.affects_timeline !== undefined ? (activityData.affects_timeline ? 'TRUE' : 'FALSE') : 'FALSE',
        'Use Virtual Material': activityData.use_virtual_material !== undefined ? (activityData.use_virtual_material ? 'TRUE' : 'FALSE') : 'FALSE',
        // ✅ SET UPDATED BY: Add user who updated the BOQ activity
        'updated_by': appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))
      console.log('✅ Setting updated_by for BOQ activity:', dbData['updated_by'])

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
      
      // ✅ Update Responsible Divisions in Project based on Activity Division
      if (activityData.activity_division && activityData.project_code) {
        try {
          await updateProjectResponsibleDivisions(activityData.project_code, activityData.activity_division)
        } catch (divisionError) {
          console.warn('⚠️ Failed to update project responsible divisions:', divisionError)
          // Don't throw - continue with activity update
        }
      }
      
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
      
      // ✅ Auto-update project status based on updated activity
      try {
        const projectCode = activityData.project_code || activityData.project_full_code
        if (projectCode) {
          // Find project by code
          const project = projects.find(p => 
            p.project_code === projectCode || 
            `${p.project_code}${p.project_sub_code ? '-' + p.project_sub_code : ''}` === projectCode
          )
          if (project) {
            console.log('🔄 Auto-updating project status after activity update...')
            const statusUpdate = await updateProjectStatus(project.id)
            if (statusUpdate) {
              console.log(`✅ Project status auto-updated: ${statusUpdate.old_status} → ${statusUpdate.new_status}`)
            }
          }
        }
      } catch (statusError) {
        console.warn('⚠️ Auto-update project status failed:', statusError)
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
    
      // ✅ Build project_full_code for accurate matching
      const projectCode = (activityToDelete.project_code || '').trim()
      const projectSubCode = (activityToDelete.project_sub_code || '').trim()
      let projectFullCode = activityToDelete.project_full_code || projectCode
      if (!projectFullCode || projectFullCode === projectCode) {
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
      }
      
    // ✅ Step 0: Check if activity has Actual KPIs - if yes, prevent deletion
    console.log('🔍 Checking for Actual KPIs before deletion...')
    let hasActualKPIs = false
    let actualKPIsCount = 0
    
    // Strategy 1: Check by Project Full Code + Activity Name
    let { data: actualKPIsByFullCode } = await supabase
      .from(TABLES.KPI)
      .select('id')
      .eq('Project Full Code', projectFullCode)
      .eq('Activity Description', activityToDelete.activity_description || '')
      .eq('Input Type', 'Actual')
    
    if (actualKPIsByFullCode && Array.isArray(actualKPIsByFullCode) && actualKPIsByFullCode.length > 0) {
      hasActualKPIs = true
      actualKPIsCount = actualKPIsByFullCode.length
      console.log(`⚠️ Found ${actualKPIsCount} Actual KPIs by Project Full Code`)
    } else {
      // Strategy 2: Check by Project Code + Project Sub Code + Activity Name
      if (projectSubCode) {
        let { data: actualKPIsByCodeAndSub } = await supabase
          .from(TABLES.KPI)
          .select('id')
          .eq('Project Code', projectCode)
          .eq('Project Sub Code', projectSubCode)
          .eq('Activity Description', activityToDelete.activity_description || '')
          .eq('Input Type', 'Actual')
        
        if (actualKPIsByCodeAndSub && Array.isArray(actualKPIsByCodeAndSub) && actualKPIsByCodeAndSub.length > 0) {
          hasActualKPIs = true
          actualKPIsCount = actualKPIsByCodeAndSub.length
          console.log(`⚠️ Found ${actualKPIsCount} Actual KPIs by Project Code + Sub Code`)
        } else {
          // Strategy 3: Check by Project Code only (fallback)
          let { data: actualKPIsByCode } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Actual')
          
          if (actualKPIsByCode && Array.isArray(actualKPIsByCode) && actualKPIsByCode.length > 0) {
            hasActualKPIs = true
            actualKPIsCount = actualKPIsByCode.length
            console.log(`⚠️ Found ${actualKPIsCount} Actual KPIs by Project Code only`)
          }
        }
      } else {
        // Strategy 3: Check by Project Code only (no sub_code)
        let { data: actualKPIsByCode } = await supabase
          .from(TABLES.KPI)
          .select('id')
          .eq('Project Code', projectCode)
          .eq('Activity Description', activityToDelete.activity_description || '')
          .eq('Input Type', 'Actual')
        
        if (actualKPIsByCode && Array.isArray(actualKPIsByCode) && actualKPIsByCode.length > 0) {
          hasActualKPIs = true
          actualKPIsCount = actualKPIsByCode.length
          console.log(`⚠️ Found ${actualKPIsCount} Actual KPIs by Project Code only`)
        }
      }
    }
    
    // ✅ If activity has Actual KPIs, prevent deletion
    if (hasActualKPIs) {
      const errorMessage = `Cannot delete this activity!\n\nThis activity has ${actualKPIsCount} Actual KPI(s).\n\nPlease delete all Actual KPIs first before deleting the activity.`
      setError(errorMessage)
      alert(errorMessage)
      console.log('❌ DELETE BLOCKED: Activity has Actual KPIs')
      return
    }
    
    if (!confirm(`Are you sure you want to delete this activity?\n\nThis will also delete all associated KPIs (Planned).`)) return

    try {
      console.log('========================================')
      console.log('🗑️ DELETE BOQ ACTIVITY STARTED')
      console.log('  - Activity ID:', id)
      console.log('  - Activity Name:', activityToDelete.activity_description || '')
      console.log('  - Project Full Code:', projectFullCode)
      console.log('  - No Actual KPIs found - deletion allowed')
      console.log('========================================')
      
      // Step 1: Delete associated Planned KPIs
      console.log('🗑️ Step 1: Deleting associated Planned KPIs...')
      
      console.log(`🔍 Searching for Planned KPIs to delete:`, {
        projectCode,
        projectSubCode,
        projectFullCode,
        activityName: activityToDelete.activity_description || ''
      })
      
      // ✅ Try multiple strategies to find and delete Planned KPIs
      let kpisToDelete: any[] = []
      
      // Strategy 1: Match by Project Full Code + Activity Name
      let { data: kpisByFullCode, error: error1 } = await supabase
        .from(TABLES.KPI)
        .select('id')
        .eq('Project Full Code', projectFullCode)
        .eq('Activity Name', activityToDelete.activity_description || '')
        .eq('Input Type', 'Planned')
      
      if (kpisByFullCode && Array.isArray(kpisByFullCode) && kpisByFullCode.length > 0) {
        kpisToDelete = kpisByFullCode
        console.log(`✅ Found ${kpisToDelete.length} KPIs by Project Full Code`)
      } else {
        // Strategy 2: Match by Project Code + Project Sub Code + Activity Name
        if (projectSubCode) {
          let { data: kpisByCodeAndSub, error: error2 } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Project Sub Code', projectSubCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Planned')
          
          if (kpisByCodeAndSub && Array.isArray(kpisByCodeAndSub) && kpisByCodeAndSub.length > 0) {
            kpisToDelete = kpisByCodeAndSub
            console.log(`✅ Found ${kpisToDelete.length} KPIs by Project Code + Sub Code`)
          } else {
            // Strategy 3: Match by Project Code only (fallback)
            let { data: kpisByCode, error: error3 } = await supabase
              .from(TABLES.KPI)
              .select('id')
              .eq('Project Code', projectCode)
              .eq('Activity Description', activityToDelete.activity_description || '')
              .eq('Input Type', 'Planned')
            
            if (kpisByCode && Array.isArray(kpisByCode) && kpisByCode.length > 0) {
              kpisToDelete = kpisByCode
              console.log(`✅ Found ${kpisToDelete.length} KPIs by Project Code only`)
            }
          }
        } else {
          // Strategy 3: Match by Project Code only (no sub_code)
          let { data: kpisByCode, error: error3 } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Planned')
          
          if (kpisByCode && Array.isArray(kpisByCode) && kpisByCode.length > 0) {
            kpisToDelete = kpisByCode
            console.log(`✅ Found ${kpisToDelete.length} KPIs by Project Code only`)
          }
        }
      }
      
      // Delete found KPIs
      if (kpisToDelete.length > 0) {
        const idsToDelete = kpisToDelete.map((kpi: any) => (kpi as any).id)
        const { error: deleteError, count: kpiCount } = await supabase
          .from(TABLES.KPI)
          .delete({ count: 'exact' })
          .in('id', idsToDelete)
        
        if (deleteError) {
          console.error('❌ Error deleting KPIs:', deleteError)
          throw new Error(`Failed to delete associated KPIs: ${deleteError.message}`)
        }
        
        console.log(`✅ Deleted ${kpiCount || idsToDelete.length} associated KPIs`)
      } else {
        console.log('ℹ️ No KPIs found to delete (may have been deleted already or never existed)')
      }
      
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
      console.log(`  - Deleted activity: ${activityToDelete.activity_description || ''}`)
      console.log(`  - Deleted ${kpisToDelete.length || 0} associated KPIs`)
      console.log('========================================')
      
      // Update local state
      setActivities(activities.filter(a => a.id !== id))
      
      // Show success message
      alert(`✅ Activity deleted successfully!\nDeleted ${kpisToDelete.length || 0} associated KPIs`)
      
    } catch (error: any) {
      console.error('❌ DELETE FAILED:', error)
      setError(error.message)
      alert(`Failed to delete activity: ${error.message}`)
    }
  }

  const handleBulkDeleteActivity = async (ids: string[]) => {
    if (ids.length === 0) return
    
    // ✅ Step 0: Check all activities for Actual KPIs before starting deletion
    console.log('🔍 Checking all activities for Actual KPIs before bulk deletion...')
    const activitiesWithActualKPIs: Array<{ id: string; name: string; count: number }> = []
    
    for (const id of ids) {
      const activityToDelete = activities.find(a => a.id === id)
      if (!activityToDelete) continue
      
      // ✅ Build project_full_code for accurate matching
      const projectCode = (activityToDelete.project_code || '').trim()
      const projectSubCode = (activityToDelete.project_sub_code || '').trim()
      let projectFullCode = activityToDelete.project_full_code || projectCode
      if (!projectFullCode || projectFullCode === projectCode) {
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
      }
      
      // Check for Actual KPIs
      let hasActualKPIs = false
      let actualKPIsCount = 0
      
      // Strategy 1: Check by Project Full Code + Activity Name
      let { data: actualKPIsByFullCode } = await supabase
        .from(TABLES.KPI)
        .select('id')
        .eq('Project Full Code', projectFullCode)
        .eq('Activity Name', activityToDelete.activity_description || '')
        .eq('Input Type', 'Actual')
      
      if (actualKPIsByFullCode && Array.isArray(actualKPIsByFullCode) && actualKPIsByFullCode.length > 0) {
        hasActualKPIs = true
        actualKPIsCount = actualKPIsByFullCode.length
      } else {
        // Strategy 2: Check by Project Code + Project Sub Code + Activity Name
        if (projectSubCode) {
          let { data: actualKPIsByCodeAndSub } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Project Sub Code', projectSubCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Actual')
          
          if (actualKPIsByCodeAndSub && Array.isArray(actualKPIsByCodeAndSub) && actualKPIsByCodeAndSub.length > 0) {
            hasActualKPIs = true
            actualKPIsCount = actualKPIsByCodeAndSub.length
          } else {
            // Strategy 3: Check by Project Code only (fallback)
            let { data: actualKPIsByCode } = await supabase
              .from(TABLES.KPI)
              .select('id')
              .eq('Project Code', projectCode)
              .eq('Activity Description', activityToDelete.activity_description || '')
              .eq('Input Type', 'Actual')
            
            if (actualKPIsByCode && Array.isArray(actualKPIsByCode) && actualKPIsByCode.length > 0) {
              hasActualKPIs = true
              actualKPIsCount = actualKPIsByCode.length
            }
          }
        } else {
          // Strategy 3: Check by Project Code only (no sub_code)
          let { data: actualKPIsByCode } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Actual')
          
          if (actualKPIsByCode && Array.isArray(actualKPIsByCode) && actualKPIsByCode.length > 0) {
            hasActualKPIs = true
            actualKPIsCount = actualKPIsByCode.length
          }
        }
      }
      
      if (hasActualKPIs) {
        activitiesWithActualKPIs.push({
          id: activityToDelete.id,
          name: activityToDelete.activity_description || '',
          count: actualKPIsCount
        })
      }
    }
    
    // ✅ If any activity has Actual KPIs, prevent bulk deletion
    if (activitiesWithActualKPIs.length > 0) {
      const activitiesList = activitiesWithActualKPIs.map(a => `- ${a.name} (${a.count} Actual KPI(s))`).join('\n')
      const errorMessage = `Cannot delete ${activitiesWithActualKPIs.length} activity/activities!\n\nThese activities have Actual KPIs:\n${activitiesList}\n\nPlease delete all Actual KPIs first before deleting the activities.`
      setError(errorMessage)
      alert(errorMessage)
      console.log('❌ BULK DELETE BLOCKED: Some activities have Actual KPIs')
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${ids.length} activity/activities?\n\nThis will also delete all associated KPIs (Planned).`)) return
    
    try {
      console.log('========================================')
      console.log('🗑️ BULK DELETE BOQ ACTIVITIES STARTED')
      console.log(`Deleting ${ids.length} activities`)
      console.log('  - No Actual KPIs found - deletion allowed')
      console.log('========================================')
      
      let totalKPIsDeleted = 0
      
      // Delete each activity and its KPIs
      for (const id of ids) {
        const activityToDelete = activities.find(a => a.id === id)
        if (!activityToDelete) continue
        
        // ✅ Build project_full_code for accurate matching
        const projectCode = (activityToDelete.project_code || '').trim()
        const projectSubCode = (activityToDelete.project_sub_code || '').trim()
        let projectFullCode = activityToDelete.project_full_code || projectCode
        if (!projectFullCode || projectFullCode === projectCode) {
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
        }
        
        // ✅ Try multiple strategies to find and delete Planned KPIs
        let kpisToDelete: any[] = []
        
        // Strategy 1: Match by Project Full Code + Activity Name
        let { data: kpisByFullCode } = await supabase
          .from(TABLES.KPI)
          .select('id')
          .eq('Project Full Code', projectFullCode)
          .eq('Activity Description', activityToDelete.activity_description || '')
          .eq('Input Type', 'Planned')
        
        if (kpisByFullCode && Array.isArray(kpisByFullCode) && kpisByFullCode.length > 0) {
          kpisToDelete = kpisByFullCode
        } else if (projectSubCode) {
          // Strategy 2: Match by Project Code + Project Sub Code + Activity Name
          let { data: kpisByCodeAndSub } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Project Sub Code', projectSubCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Planned')
          
          if (kpisByCodeAndSub && Array.isArray(kpisByCodeAndSub) && kpisByCodeAndSub.length > 0) {
            kpisToDelete = kpisByCodeAndSub
          } else {
            // Strategy 3: Match by Project Code only (fallback)
            let { data: kpisByCode } = await supabase
              .from(TABLES.KPI)
              .select('id')
              .eq('Project Code', projectCode)
              .eq('Activity Description', activityToDelete.activity_description || '')
              .eq('Input Type', 'Planned')
            
            if (kpisByCode && Array.isArray(kpisByCode) && kpisByCode.length > 0) {
              kpisToDelete = kpisByCode
            }
          }
        } else {
          // Strategy 3: Match by Project Code only (no sub_code)
          let { data: kpisByCode } = await supabase
            .from(TABLES.KPI)
            .select('id')
            .eq('Project Code', projectCode)
            .eq('Activity Description', activityToDelete.activity_description || '')
            .eq('Input Type', 'Planned')
          
          if (kpisByCode && Array.isArray(kpisByCode) && kpisByCode.length > 0) {
            kpisToDelete = kpisByCode
          }
        }
        
        // Delete found KPIs
        if (kpisToDelete.length > 0) {
          const idsToDelete = kpisToDelete.map((kpi: any) => (kpi as any).id)
          const { count: kpiCount } = await supabase
            .from(TABLES.KPI)
            .delete({ count: 'exact' })
            .in('id', idsToDelete)
          
          totalKPIsDeleted += (kpiCount || idsToDelete.length)
        }
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
      'Activity': activity.activity_description || '',
      'Activity Name': activity.activity_description || '',
      'Activity Division': activity.activity_division,
      'Unit': activity.unit,
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

  // ✅ SMART BOQ Summary Statistics - Calculated from KPIs (not BOQ activities)
  const boqSummaryStats = useMemo(() => {
    const totalRecords = filteredActivities.length
    
    // ============================================
    // Helper Functions
    // ============================================
    
    // Normalize zone (remove project code prefix)
    const normalizeZone = (zone: string, projectCode: string): string => {
      if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
      let normalized = zone.trim()
      const codeUpper = projectCode.toUpperCase()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      return normalized.toLowerCase()
    }
    
    // Helper: Extract zone from description (e.g., "P5066-12 | Zone 2")
    const extractZoneFromDescription = (description: string): string => {
      if (!description || description.trim() === '') return ''
      
      // Try to match patterns like "P5066-12 | Zone 2" or "Zone 2" or "Zone-2"
      const zonePatternMatch = description.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return `zone ${zonePatternMatch[1]}`.toLowerCase().trim()
      }
      
      // Try to match project code pattern with zone (e.g., "P5066-12")
      const projectCodeZoneMatch = description.match(/([A-Z]\d+)-(\d+)/i)
      if (projectCodeZoneMatch && projectCodeZoneMatch[2]) {
        return projectCodeZoneMatch[2].toLowerCase().trim()
      }
      
      return ''
    }
    
    // Extract zone from activity (IMPROVED: Extract from description if zone field is empty)
    const getActivityZone = (activity: BOQActivity): string => {
      const rawActivity = (activity as any).raw || {}
      let zoneValue = activity.zone_number || 
                     rawActivity['Zone Number'] ||
                     rawActivity['Zone #'] ||
                     '0'
      
      // ✅ NEW: If zone is empty, try to extract from activity description
      if (!zoneValue || zoneValue.trim() === '') {
        const activityDescription = activity.activity_description || 
                                   rawActivity['Activity'] ||
                                   rawActivity['Activity Name'] ||
                                   ''
        if (activityDescription) {
          const extractedZone = extractZoneFromDescription(activityDescription)
          if (extractedZone) {
            zoneValue = extractedZone
          }
        }
      }
      
      if (zoneValue && activity.project_code) {
        const projectCodeUpper = activity.project_code.toUpperCase().trim()
        let zoneStr = zoneValue.toString()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
        zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
        zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
        zoneValue = zoneStr || ''
      }
      
      return (zoneValue || '').toString().toLowerCase().trim()
    }
    
    // Extract zone from KPI (IMPROVED: Extract from description if zone field is empty)
    const getKPIZone = (kpi: any): string => {
      const rawKPI = (kpi as any).raw || {}
      // ✅ NOT from Section - Section is separate from Zone
      let zoneRaw = (
        kpi.zone || 
        rawKPI['Zone'] || 
        rawKPI['Zone Number'] || 
        ''
      ).toString().trim()
      
      // ✅ NEW: If zone is empty, try to extract from KPI description/activity name
      if (!zoneRaw || zoneRaw.trim() === '') {
        const kpiDescription = kpi.activity_description || 
                              kpi.activity_name || 
                              kpi.activity || 
                              rawKPI['Activity Description'] ||
                              rawKPI['Activity Name'] ||
                              rawKPI['Activity'] ||
                              ''
        if (kpiDescription) {
          const extractedZone = extractZoneFromDescription(kpiDescription)
          if (extractedZone) {
            zoneRaw = extractedZone
          }
        }
      }
      
      const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
      return normalizeZone(zoneRaw, projectCode)
    }
    
    // Extract zone number for exact matching (IMPROVED: More accurate extraction)
    const extractZoneNumber = (zone: string): string => {
      if (!zone || zone.trim() === '') return ''
      
      // Normalize zone text
      const normalizedZone = zone.toLowerCase().trim()
      
      // Try to match "zone X" or "zone-X" pattern first (most common)
      const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return zonePatternMatch[1]
      }
      
      // Try to match standalone number at the end (e.g., "Zone 2", "Area 2")
      const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
      if (endNumberMatch && endNumberMatch[1]) {
        return endNumberMatch[1]
      }
      
      // Fallback: extract first number (but prefer zone-specific patterns above)
      const numberMatch = normalizedZone.match(/\d+/)
      if (numberMatch) return numberMatch[0]
      
      return normalizedZone
    }
    
    // Get activity rate (from BOQ activity)
    // ✅ FIXED: Calculate rate using EXACT SAME LOGIC as KPI page and Work Value Status
    // Priority: 1) Total Value / Total Units (SAME AS TABLE), 2) Rate directly from activity
    const getActivityRate = (activity: BOQActivity, kpi: any): number => {
      const rawActivity = (activity as any).raw || {}
      
      // ✅ PRIORITY 1: Calculate Rate = Total Value / Total Units (SAME AS TABLE)
      const totalValueFromActivity = activity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
      
      const totalUnits = activity.total_units || 
                      activity.planned_units ||
                      parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                      0
      
      if (totalUnits > 0 && totalValueFromActivity > 0) {
        return totalValueFromActivity / totalUnits
      }
      
      // ✅ PRIORITY 2: Use rate directly from activity (fallback)
      if (activity.rate && activity.rate > 0) {
        return activity.rate
      }
      
      // ✅ PRIORITY 3: Try to get from raw data
      const rateFromRaw = parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
      if (rateFromRaw > 0) return rateFromRaw
      
      return 0
    }
    
    // Check if KPI matches activity (Project + Activity Name + Zone)
    // ✅ IMPROVED: Ultra strict Project Full Code matching to prevent "P5066-12" matching "P5066-2"
    const kpiMatchesActivity = (kpi: any, activity: BOQActivity): boolean => {
      const rawKPI = (kpi as any).raw || {}
      
      // 1. Project Code Matching (ULTRA STRICT)
      const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      
      // ✅ CRITICAL: If activity has Project Full Code with sub-code (e.g., "P5066-12"), 
      // KPI MUST have EXACT Project Full Code match (not just Project Code)
      // This prevents "P5066-12" from matching "P5066-2" or "P5066-11"
      let projectMatch = false
      
      if (activityProjectFullCode && activityProjectFullCode.includes('-')) {
        // Activity has sub-code (e.g., "P5066-12")
        // KPI MUST have EXACT Project Full Code match
        if (kpiProjectFullCode && kpiProjectFullCode === activityProjectFullCode) {
          projectMatch = true
        }
        // Do NOT allow partial matches (e.g., "P5066" matching "P5066-12")
        // This ensures strict matching
      } else {
        // Activity has no sub-code (e.g., "P5066")
        // Match by Project Code or Project Full Code
        projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
      }
      
      if (!projectMatch) return false
      
      // 2. Activity Name Matching (required)
      const kpiActivityName = (kpi.activity_description || kpi.activity_name || kpi['Activity Description'] || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Description'] || rawKPI['Activity Name'] || '').toLowerCase().trim()
      const activityName = (activity.activity_description || '').toLowerCase().trim()
      const activityMatch = kpiActivityName && activityName && (
        kpiActivityName === activityName || 
        kpiActivityName.includes(activityName) || 
        activityName.includes(kpiActivityName)
      )
      if (!activityMatch) return false
      
      // 3. Zone Matching (ULTRA STRICT: If activity has zone, KPI MUST have EXACT matching zone)
      const kpiZone = getKPIZone(kpi)
      const activityZone = getActivityZone(activity)
      
      // ✅ ULTRA STRICT: If activity has zone, KPI MUST have zone and they MUST match EXACTLY
      if (activityZone && activityZone.trim() !== '') {
        // Activity has zone - KPI MUST have zone (no exceptions)
        if (!kpiZone || kpiZone.trim() === '') {
          return false // KPI has no zone, reject it immediately
        }
        
        const activityZoneNum = extractZoneNumber(activityZone)
        const kpiZoneNum = extractZoneNumber(kpiZone)
        
        // ✅ CRITICAL: Zone numbers MUST match EXACTLY (primary check)
        if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
          return false // Zone numbers don't match, reject it
        }
        
        // ✅ SECONDARY CHECK: If zone numbers match, verify full zone text is compatible
        // This prevents "Zone 2" matching with "Zone 12" even if numbers partially match
        const normalizedActivityZone = activityZone.toLowerCase().trim()
        const normalizedKpiZone = kpiZone.toLowerCase().trim()
        
        if (activityZoneNum === kpiZoneNum) {
          // Check if zone number is standalone (not part of larger number)
          const activityZoneStandalone = normalizedActivityZone.match(new RegExp(`\\b${activityZoneNum}\\b`))
          const kpiZoneStandalone = normalizedKpiZone.match(new RegExp(`\\b${kpiZoneNum}\\b`))
          
          // If both have standalone zone numbers, accept
          // If one doesn't have standalone, be more careful
          if (!activityZoneStandalone || !kpiZoneStandalone) {
            // If zone numbers match but text is very different, reject
            if (normalizedActivityZone !== normalizedKpiZone && 
                !normalizedActivityZone.includes(normalizedKpiZone) && 
                !normalizedKpiZone.includes(normalizedActivityZone)) {
              return false
            }
          }
        }
      }
      // If activity has no zone, accept KPI (with or without zone)
      
      return true
    }
    
    // ✅ Check if KPI date is until yesterday - Use Activity Date (filtered by Input Type)
    // Priority: activity_date > raw['Activity Date'] > raw['Day'] > kpi.day
    const isKPIUntilYesterday = (kpi: any, inputType: 'planned' | 'actual'): boolean => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(23, 59, 59, 999)
      
      const rawKpi = (kpi as any).raw || {}
      // Use Activity Date (filtered by Input Type in queries)
      let kpiDateStr = kpi.activity_date ||
                      rawKpi['Activity Date'] ||
                      rawKpi['Day'] ||
                      kpi.day ||
                      ''
      
      // If no date, include it (treat as valid) - SAME AS workValueCalculator.ts
      if (!kpiDateStr) return true
      
      try {
        const kpiDate = parseDateString(kpiDateStr)
        if (!kpiDate) return true // Invalid date, include it
        return kpiDate <= yesterday
      } catch {
        return true // Error, include it
      }
    }
    
    // Helper: Parse date string (same as workValueCalculator.ts)
    const parseDateString = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr) return null
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        return date
      } catch {
        return null
      }
    }
    
    // ✅ FIXED: Calculate value from KPI - Use Planned/Actual Value directly from database
    // Priority: 1) Planned/Actual Value directly from KPI, 2) Value field as fallback
    const getKPIValue = (kpi: any, activity: BOQActivity): number => {
      const rawKPI = (kpi as any).raw || {}
      const inputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()

      // Get Quantity
      const quantity = parseFloat(String(kpi.quantity || rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
      
      // Get Rate from Activity (same logic as getActivityRate)
      const rawActivity = (activity as any).raw || {}
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
      } else if (activity.rate && activity.rate > 0) {
        rate = activity.rate
      } else {
        const rateFromRaw = parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
        if (rateFromRaw > 0) rate = rateFromRaw
      }
      
      // ✅ PRIORITY 1: ALWAYS calculate from Quantity × Rate if both are available
      // This is the most accurate method as it uses the actual rate from the BOQ Activity
      if (rate > 0 && quantity > 0) {
        const calculatedValue = quantity * rate
        if (calculatedValue > 0) {
          return calculatedValue
        }
      }
      
      // ✅ PRIORITY 2: If Rate is not available, try to use Value from KPI (but check if it's actually a quantity)
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V)
      if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
        const val = rawKPI['Value']
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try raw.value (from database with lowercase v)
      if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
        const val = rawKPI.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try k.value (direct property from ProcessedKPI)
      if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
        const val = kpi.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // ✅ CRITICAL CHECK: If Value equals Quantity, it means it's a quantity, not a financial value
      // In this case, we cannot use it - return 0 or try Planned/Actual Value
      if (kpiValue > 0 && quantity > 0 && Math.abs(kpiValue - quantity) < 0.01) {
        // Value equals quantity, so it's not a real financial value - skip to Planned/Actual Value
        kpiValue = 0
      }
      
      if (kpiValue > 0) {
        return kpiValue
      }
      
      // ✅ PRIORITY 3: Fallback to Planned/Actual Value if available
      if (inputType === 'planned') {
        const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
        if (plannedValue > 0) return plannedValue
      } else if (inputType === 'actual') {
        const actualValue = kpi.actual_value || parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, '')) || 0
        if (actualValue > 0) return actualValue
      }
      
      // ✅ PRIORITY 4: If still 0, try to get Rate from KPI raw data and calculate
      if (quantity > 0) {
        const rateFromKPI = parseFloat(String(rawKPI['Rate'] || kpi.rate || '0').replace(/,/g, '')) || 0
        if (rateFromKPI > 0) {
          const calculatedFromKPIRate = quantity * rateFromKPI
          if (calculatedFromKPIRate > 0) {
            return calculatedFromKPIRate
          }
        }
      }
      
      return 0
    }
    
    // ============================================
    // Calculate Statistics from KPIs
    // ============================================
    
    // Filter KPIs by filtered activities
    const plannedKPIs = allKPIs.filter((kpi: any) => {
      const inputType = (kpi.input_type || (kpi as any).raw?.['Input Type'] || '').toString().toLowerCase().trim()
      if (inputType !== 'planned') return false
      return filteredActivities.some(activity => kpiMatchesActivity(kpi, activity))
    })
    
    const actualKPIs = allKPIs.filter((kpi: any) => {
      const inputType = (kpi.input_type || (kpi as any).raw?.['Input Type'] || '').toString().toLowerCase().trim()
      if (inputType !== 'actual') return false
      return filteredActivities.some(activity => kpiMatchesActivity(kpi, activity))
    })
    
    // Planned Targets: Activities with planned KPIs
    const plannedActivities = filteredActivities.filter(activity => {
      return plannedKPIs.some(kpi => kpiMatchesActivity(kpi, activity))
    })
    const plannedCount = plannedActivities.length
    
    // Planned Quantity: Sum of quantities from Planned KPIs
    const totalPlannedQty = plannedKPIs.reduce((sum, kpi) => {
      const rawKPI = (kpi as any).raw || {}
      const quantity = parseFloat(String(kpi.quantity || rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
      return sum + quantity
    }, 0)
    
    // Actual Achieved: Activities with actual KPIs
    const actualActivities = filteredActivities.filter(activity => {
      return actualKPIs.some(kpi => kpiMatchesActivity(kpi, activity))
    })
    const actualCount = actualActivities.length
    
    // Actual Quantity: Sum of quantities from Actual KPIs
    const totalActualQty = actualKPIs.reduce((sum, kpi) => {
      const rawKPI = (kpi as any).raw || {}
      const quantity = parseFloat(String(kpi.quantity || rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
      return sum + quantity
    }, 0)
    
    // ✅ Planned Value: Sum of values from Planned KPIs until yesterday (matching activities)
    // ✅ SAME LOGIC AS BOQ PAGE - Calculate directly from Planned KPIs in BOQ
    const totalPlannedValue = plannedKPIs
      .filter((kpi: any) => isKPIUntilYesterday(kpi, 'planned'))
      .reduce((sum, kpi) => {
        // Find matching activity for this KPI
        const matchingActivity = filteredActivities.find(activity => kpiMatchesActivity(kpi, activity))
        if (!matchingActivity) return sum
        
        const value = getKPIValue(kpi, matchingActivity)
        return sum + value
    }, 0)
    
    // Actual Value: Sum of values from Actual KPIs until yesterday (matching activities)
    // ✅ EXACT SAME LOGIC AS QUANTITIES COLUMN - Filter until yesterday and use strict matching
    const totalActualValue = actualKPIs
      .filter((kpi: any) => isKPIUntilYesterday(kpi, 'actual'))
      .reduce((sum, kpi) => {
        // Find matching activity for this KPI
        const matchingActivity = filteredActivities.find(activity => kpiMatchesActivity(kpi, activity))
        if (!matchingActivity) return sum
        
        const value = getKPIValue(kpi, matchingActivity)
        return sum + value
      }, 0)
    
    // Achievement Rate: (Actual Value / Planned Value) * 100
    const valueAchievementRate = totalPlannedValue > 0 
      ? (totalActualValue / totalPlannedValue) * 100 
      : 0
    
    // Achievement Rate (by count): (Actual Count / Planned Count) * 100
    const achievementRate = plannedCount > 0 
      ? (actualCount / plannedCount) * 100 
      : 0
    
    // Achievement Rate (by value): Use valueAchievementRate as the main achievement rate
    const achievementRateByValue = valueAchievementRate
    
    // Total Value: Sum of total_value from ALL filtered activities
    // Total Value = مجموع total_value من جميع الأنشطة المفلترة
    // This represents the total contract value for all filtered activities
    const totalValue = filteredActivities.reduce((sum, activity) => {
      const rawActivity = (activity as any).raw || {}
      const activityTotalValue = activity.total_value || 
                               parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                               0
      
      // If total_value is not available, calculate from Rate × Total Units
      if (activityTotalValue === 0) {
        const rate = activity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
        const totalUnits = activity.total_units || 
                        activity.planned_units ||
                        parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                        0
        
        if (rate > 0 && totalUnits > 0) {
          return sum + (rate * totalUnits)
        }
      }
      
      return sum + activityTotalValue
    }, 0)
    
    // Actual Value / Total Value Rate: (Actual Value / Total Value) * 100
    const actualToTotalValueRate = totalValue > 0 
      ? (totalActualValue / totalValue) * 100 
      : 0
    
    // Total Quantity: Sum of total_units or planned_units from ALL filtered activities
    const totalQuantity = filteredActivities.reduce((sum, activity) => {
      const rawActivity = (activity as any).raw || {}
      const activityQuantity = activity.total_units || 
                              activity.planned_units ||
                              parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                              0
      return sum + activityQuantity
    }, 0)
    
    return {
      totalRecords,
      totalQuantity,
      plannedCount,
      totalPlannedQty,
      actualCount,
      totalActualQty,
      totalPlannedValue,
      totalActualValue,
      totalValue,
      valueAchievementRate,
      achievementRate,
      achievementRateByValue,
      actualToTotalValueRate
    }
  }, [filteredActivities, allKPIs, projects])

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
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Activities</h2>
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
          {guard.hasAccess('activities.create') && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowForm(true)} 
                className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Activity</span>
              </Button>
              <PermissionButton
                permission="activities.view"
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
        
        {/* BOQ Custom Filter */}
        <BOQFilter
        projects={projects.map(p => {
          // ✅ CRITICAL: Use project_full_code from project object directly
          const projectCode = (p.project_code || '').trim()
          const projectSubCode = (p.project_sub_code || '').trim()
          
          // ✅ BUILD: Build project_full_code if not available
          let projectFullCode = (p.project_full_code || '').trim()
          if (!projectFullCode && projectCode) {
            if (projectSubCode) {
              if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
                projectFullCode = projectSubCode.trim()
              } else {
                if (projectSubCode.startsWith('-')) {
                  projectFullCode = `${projectCode}${projectSubCode}`.trim()
                } else {
                  projectFullCode = `${projectCode}-${projectSubCode}`.trim()
                }
              }
            } else {
              projectFullCode = projectCode
            }
          }
          
          // ✅ DEBUG: Log for P9999 projects
          if (projectCode.includes('P9999') || projectCode.includes('9999')) {
            console.log('🔍 BOQManagement - Project mapping:', {
              projectCode,
              projectSubCode,
              projectFullCodeFromDB: p.project_full_code,
              builtProjectFullCode: projectFullCode
            })
          }
          
          return {
            project_code: projectCode,
            project_sub_code: projectSubCode,
            project_full_code: projectFullCode || projectCode,
            project_name: p.project_name 
          }
        })}
        activities={(() => {
          // ✅ FIX: Use activitiesForFilters (excludes zone filter) instead of filteredActivities
          // This ensures all zones remain visible in dropdown even when zone filter is applied
          const activitiesToUse = activitiesForFilters.length > 0 ? activitiesForFilters : activities
          // ✅ Don't deduplicate by activity_name - we need all activities to get all zones
          const mapped = activitiesToUse.map(a => {
            // ✅ Get raw data if available (for accessing original database fields)
            const rawActivity = (a as any).raw || {}
            
            return {
              activity_name: a.activity_description || '',
              project_full_code: a.project_full_code || a.project_code,
              project_code: a.project_code || '',
              zone: a.zone_number || rawActivity['Zone Number'] || rawActivity['Zone #'] || rawActivity['Zone'] || (a as any).zone || '0',
              zone_number: a.zone_number || rawActivity['Zone Number'] || rawActivity['Zone #'] || '',
              unit: a.unit || '',
              activity_division: a.activity_division || '',
              // ✅ CRITICAL: Include raw data for accessing original database fields (Zone Number)
              raw: rawActivity
            }
          })
          
          return mapped
        })()}
        selectedProjects={selectedProjects}
        selectedActivities={selectedActivities}
        selectedZones={selectedZones}
        selectedUnits={selectedUnits}
        selectedDivisions={selectedDivisions}
        dateRange={dateRange}
        valueRange={valueRange}
        quantityRange={quantityRange}
        searchTerm={searchTerm}
        onProjectsChange={(projectCodes) => {
          console.log('🔍 BOQManagement onProjectsChange:', {
            projectCodes,
            currentSelectedProjects: selectedProjects
          })
          setSelectedProjects(projectCodes)
          setCurrentPage(1)
          // ✅ Data will be fetched automatically by useEffect when selectedProjects changes
        }}
        onActivitiesChange={(activities) => {
          setSelectedActivities(activities)
          setCurrentPage(1)
        }}
        onZonesChange={(zones) => {
          setSelectedZones(zones)
          setCurrentPage(1)
          if (zones.length > 0) {
            handleFilterChange('zone', zones)
          } else {
            handleFilterChange('zone', '')
          }
        }}
        onUnitsChange={setSelectedUnits}
        onDivisionsChange={(divisions) => {
          setSelectedDivisions(divisions)
          setCurrentPage(1)
          if (divisions.length > 0) {
            handleFilterChange('division', divisions[0])
          } else {
            handleFilterChange('division', '')
          }
        }}
        onDateRangeChange={setDateRange}
        onValueRangeChange={setValueRange}
        onQuantityRangeChange={setQuantityRange}
        onSearchChange={(search) => {
          setSearchTerm(search)
          setCurrentPage(1)
        }}
        onClearAll={() => {
          setSelectedProjects([])
          setSelectedActivities([])
          setSelectedZones([])
          setSelectedUnits([])
          setSelectedDivisions([])
          setDateRange({})
          setValueRange({})
          setQuantityRange({})
          setSearchTerm('')
          clearFilters()
          // Clear data when filters are cleared
          setActivities([])
          setTotalCount(0)
        }}
      />
      
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Data Actions:</span>
          <PermissionGuard permission="activities.export">
            <ExportButton
              data={getExportData()}
              filename="Activities"
              formats={['csv', 'excel']}
              label="Export"
              variant="outline"
            />
          </PermissionGuard>
          
          <PermissionGuard permission="activities.print">
            <PrintButton
              label="Print"
              variant="outline"
              printTitle="Activities Report"
              printSettings={{
                fontSize: 'medium',
                compactMode: true
              }}
            />
          </PermissionGuard>
          
          <PermissionGuard permission="activities.import">
            <ImportButton
              onImport={handleImportBOQ}
              requiredColumns={['Project Code', 'Activity Name', 'Unit']}
              templateName="Activities"
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

      {/* ✅ BOQ Statistics - Show if Activities are loaded */}
      {filteredActivities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-5">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-300 mb-2">Total Records</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{boqSummaryStats.totalQuantity.toLocaleString()}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    {boqSummaryStats.totalRecords} activities
                  </p>
                </div>
                <BarChart3 className="h-12 w-12 text-purple-500 flex-shrink-0 ml-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">🎯 Planned Targets</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{boqSummaryStats.totalPlannedQty.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    {boqSummaryStats.plannedCount} activities
                  </p>
                </div>
                <Target className="h-12 w-12 text-blue-500 flex-shrink-0 ml-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-600 dark:text-green-300 mb-2">✓ Actual Achieved</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{boqSummaryStats.totalActualQty.toLocaleString()}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {boqSummaryStats.actualCount} activities
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500 flex-shrink-0 ml-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-300 flex-shrink-0" />
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Planned Value</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 break-words">
                    {(() => {
                      // Get currency from first selected project or default
                      const firstProject = selectedProjects.length > 0 
                        ? projects.find(p => selectedProjects.includes(p.project_code))
                        : projects[0]
                      const currencyCode = firstProject?.currency || 'AED'
                      return formatCurrencyByCodeSync(boqSummaryStats.totalPlannedValue, currencyCode)
                    })()}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-3">
                    From {boqSummaryStats.plannedCount.toLocaleString()} planned activities
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <Target className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-60" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300 mb-2">Actual Value</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 break-words">
                    {(() => {
                      // Get currency from first selected project or default
                      const firstProject = selectedProjects.length > 0 
                        ? projects.find(p => selectedProjects.includes(p.project_code))
                        : projects[0]
                      const currencyCode = firstProject?.currency || 'AED'
                      return formatCurrencyByCodeSync(boqSummaryStats.totalActualValue, currencyCode)
                    })()}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    {boqSummaryStats.valueAchievementRate.toFixed(1)}% of planned value
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-emerald-500 flex-shrink-0 ml-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-orange-200 dark:border-orange-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-300 mb-2">Achievement Rate</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                    {boqSummaryStats.achievementRateByValue.toFixed(1)}%
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 break-words">
                    {(() => {
                      // Get currency from first selected project or default
                      const firstProject = selectedProjects.length > 0 
                        ? projects.find(p => selectedProjects.includes(p.project_code))
                        : projects[0]
                      const currencyCode = firstProject?.currency || 'AED'
                      return `${formatCurrencyByCodeSync(boqSummaryStats.totalActualValue, currencyCode)} / ${formatCurrencyByCodeSync(boqSummaryStats.totalPlannedValue, currencyCode)}`
                    })()}
                  </p>
                  <p className="text-[11px] text-orange-500 dark:text-orange-300 mt-1">
                    {boqSummaryStats.actualCount.toLocaleString()} / {boqSummaryStats.plannedCount.toLocaleString()} activities
                  </p>
                </div>
                <div className="relative w-12 h-12 flex-shrink-0 ml-3">
                  <svg className="transform -rotate-90 w-12 h-12">
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-orange-200 dark:text-orange-950"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={`${boqSummaryStats.achievementRateByValue} 100`}
                      className="text-orange-500"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900 dark:to-cyan-800 border-cyan-200 dark:border-cyan-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cyan-600 dark:text-cyan-300 mb-2">Total Value</p>
                  <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 break-words">
                    {(() => {
                      // Get currency from first selected project or default
                      const firstProject = selectedProjects.length > 0 
                        ? projects.find(p => selectedProjects.includes(p.project_code))
                        : projects[0]
                      const currencyCode = firstProject?.currency || 'AED'
                      return formatCurrencyByCodeSync(boqSummaryStats.totalValue, currencyCode)
                    })()}
                  </p>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">
                    Across {boqSummaryStats.totalRecords.toLocaleString()} activities
                  </p>
                </div>
                <Building2 className="h-12 w-12 text-cyan-500 flex-shrink-0 ml-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900 dark:to-teal-800 border-teal-200 dark:border-teal-700">
            <CardContent className="p-7">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-teal-600 dark:text-teal-300 mb-2">Actual / Total Value</p>
                  <p className="text-3xl font-bold text-teal-900 dark:text-teal-100">
                    {boqSummaryStats.actualToTotalValueRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 break-words">
                    {(() => {
                      // Get currency from first selected project or default
                      const firstProject = selectedProjects.length > 0 
                        ? projects.find(p => selectedProjects.includes(p.project_code))
                        : projects[0]
                      const currencyCode = firstProject?.currency || 'AED'
                      return `${formatCurrencyByCodeSync(boqSummaryStats.totalActualValue, currencyCode)} / ${formatCurrencyByCodeSync(boqSummaryStats.totalValue, currencyCode)}`
                    })()}
                  </p>
                </div>
                <div className="relative w-12 h-12 flex-shrink-0 ml-3">
                  <svg className="transform -rotate-90 w-12 h-12">
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-teal-200 dark:text-teal-950"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={`${boqSummaryStats.actualToTotalValueRate} 100`}
                      className="text-teal-500"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ Removed all filters - Simple BOQ without filtering */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Activities
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
                      🔍 Apply Filters to View Activities
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 max-w-md mx-auto">
                      Use the filters above to search and view activities. 
                      This ensures fast loading by only fetching relevant data.
                    </p>
                  </div>
                  <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                    💡 Tip: Apply any filter (Search, Project, Division, or Status) to load activities!
                  </div>
                </div>
              </div>
            </div>
          ) : guard.hasAccess('activities.view') ? (
            guard.hasAccess('activities.view') && useCustomizedTable ? (
              <BOQTableWithCustomization
                activities={getCurrentPageData()}
                projects={projects}
                onEdit={setEditingActivity}
                onDelete={handleDeleteActivity}
                onBulkDelete={handleBulkDeleteActivity}
                allKPIs={allKPIs}
                onSort={handleSort} // ✅ Server-side sorting
                currentSortColumn={sortColumn} // ✅ Current sort column
                currentSortDirection={sortDirection} // ✅ Current sort direction
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
          allKPIs={allKPIs}
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

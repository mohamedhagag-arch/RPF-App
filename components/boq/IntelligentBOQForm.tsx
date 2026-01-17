'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, TABLES } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { 
  calculateWorkdays, 
  calculateEndDate,
  WorkdaysConfig,
  UAE_HOLIDAYS
} from '@/lib/workdaysCalculator'
import { 
  getSuggestedUnit,
  getAllUnits,
  ActivityTemplate,
  ACTIVITY_TEMPLATES
} from '@/lib/activityTemplates'
import {
  getAllActivities,
  getSuggestedActivities,
  incrementActivityUsage,
  Activity
} from '@/lib/activitiesManager'
import { 
  saveCustomActivity,
  getAllActivitiesByDivision
} from '@/lib/customActivities'
import {
  ProjectTypeActivity
} from '@/lib/projectTypeActivitiesManager'
import { 
  generateKPIsFromBOQ, 
  saveGeneratedKPIs,
  generateAndSaveKPIs,
  updateExistingKPIs
} from '@/lib/autoKPIGenerator'
import { getAllDivisions, Division as DivisionType } from '@/lib/divisionsManager'
import { getHolidaysInRange, type DatabaseHoliday } from '@/lib/holidaysManager'
import { Clock, CheckCircle2, Info, Sparkles, X, Calendar, TrendingUp, AlertCircle, Search, ChevronDown } from 'lucide-react'

interface IntelligentBOQFormProps {
  activity?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  projects?: Project[]
  allKPIs?: any[] // ✅ Add KPIs to use same logic as table
}

export function IntelligentBOQForm({ activity, onSubmit, onCancel, projects = [], allKPIs = [] }: IntelligentBOQFormProps) {
  const guard = usePermissionGuard()
  const { user: authUser, appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projectLoading, setProjectLoading] = useState(false)
  const [allProjects, setAllProjects] = useState<Project[]>(projects)
  
  // ✅ Project Search & Dropdown
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  
  // Form Fields
  // ✅ FIX: Use project_full_code first, then project_code as fallback
  const [projectCode, setProjectCode] = useState(activity?.project_full_code || activity?.project_code || '')
  const [project, setProject] = useState<Project | null>(null)
  const [activityName, setActivityName] = useState(activity?.activity_name || '')
  const [activitySuggestions, setActivitySuggestions] = useState<Activity[]>([])
  const [projectTypeActivities, setProjectTypeActivities] = useState<ProjectTypeActivity[]>([])
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [activitySelected, setActivitySelected] = useState(false)
  const [selectedActivitiesScopes, setSelectedActivitiesScopes] = useState<Set<string>>(new Set()) // Track all scopes from selected activities
  
  // Zone Management
  const [zoneNumber, setZoneNumber] = useState(activity?.zone_number || '0')
  const [availableZones, setAvailableZones] = useState<string[]>([])
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [zoneSuggestions, setZoneSuggestions] = useState<string[]>([])
  const [hasProjectZones, setHasProjectZones] = useState<boolean>(false) // ✅ Track if project has zones defined
  
  // ✅ Activity Filter States
  const [activityFilter, setActivityFilter] = useState<string>('all') // 'all', 'project_type', 'division', 'category'
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [availableScopes, setAvailableScopes] = useState<string[]>([]) // Available project scopes for filtering
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<string>('all') // Filter by specific scope
  const [allLoadedActivities, setAllLoadedActivities] = useState<Activity[]>([]) // Store all loaded activities
  const [unit, setUnit] = useState(activity?.unit || '')
  const [unitSuggestions] = useState<string[]>(getAllUnits())
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [plannedUnits, setPlannedUnits] = useState(activity?.planned_units?.toString() || '')
  const [plannedValue, setPlannedValue] = useState(activity?.planned_value?.toString() || '')
  const [startDate, setStartDate] = useState(() => {
    // Extract start date from multiple sources for initial state
    if (!activity) return ''
    const raw = (activity as any).raw || {}
    
    // Helper to get field from raw or activity
    const getField = (fieldName: string) => {
      return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || activity?.[fieldName] || ''
    }
    
    // ✅ PRIORITY 1: Extract from "Planned Dates" column (e.g., "04/01/2025 - 04/17/2025")
    let extractedStartDate = ''
    const plannedDatesValue = raw['Planned Dates'] || getField('Planned Dates') || ''
    if (plannedDatesValue && String(plannedDatesValue).trim() !== '' && String(plannedDatesValue).trim() !== 'N/A') {
      const plannedDatesStr = String(plannedDatesValue).trim()
      // Try different separators: " - ", " to ", "–", "—", " / "
      const dateParts = plannedDatesStr.split(/\s*[-–—to/]\s*/i).map(part => part.trim()).filter(part => part !== '')
      if (dateParts.length >= 1 && dateParts[0]) {
        extractedStartDate = dateParts[0]
      }
    }
    
    // ✅ PRIORITY 2: If not found in Planned Dates column, try direct fields
    if (!extractedStartDate || extractedStartDate.trim() === '' || extractedStartDate === 'N/A') {
      extractedStartDate = activity.planned_activity_start_date || 
                           activity.activity_planned_start_date ||
                           getField('Planned Activity Start Date') ||
                           getField('Planned Start Date') ||
                           getField('Activity Planned Start Date') ||
                           raw['Planned Activity Start Date'] ||
                           raw['Planned Start Date'] ||
                           raw['Activity Planned Start Date'] ||
                           raw['Start Date'] ||
                           raw['Activity Start Date'] ||
                           raw['Planned Start'] ||
                           raw['Start'] ||
                           ''
    }
    
    if (extractedStartDate && extractedStartDate.trim() !== '' && extractedStartDate !== 'N/A') {
      // Parse date avoiding timezone issues - extract directly from string
      const trimmed = extractedStartDate.trim()
      
      // ✅ PRIORITY 1: If already in YYYY-MM-DD format (with or without time), extract date part only
      const yyyyMMddMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
      if (yyyyMMddMatch) {
        const [, year, month, day] = yyyyMMddMatch
        return `${year}-${month}-${day}`
      }
      
      // ✅ PRIORITY 2: Try MM/DD/YYYY format (common in US) - extract directly
      const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch
        return `${year}-${String(parseInt(month, 10)).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
      }
      
      // ✅ FALLBACK: Try to extract date from ISO string or use Date object
      // Extract date part from ISO string to avoid timezone conversion
      const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch
        return `${year}-${month}-${day}`
      }
      
      // Last resort: Parse as Date
      try {
        const date = new Date(trimmed)
        if (!isNaN(date.getTime())) {
          // Try to extract from original string first
          const stringDateMatch = trimmed.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
          if (stringDateMatch) {
            const [, year, month, day] = stringDateMatch
            return `${year}-${String(parseInt(month, 10)).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
          }
          
          // Use Date object components (may have timezone issues)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
      } catch {
        // Invalid date
      }
    }
    
    // Priority 2: Calculate from End Date - Duration
    const extractedEndDate = activity.deadline || 
                            activity.activity_planned_completion_date ||
                            getField('Deadline') ||
                            getField('Planned Completion Date') ||
                            raw['Deadline'] ||
                            raw['Planned Completion Date'] ||
                            raw['End Date'] ||
                            ''
    
    const plannedDuration = activity.calendar_duration || 
                           parseFloat(String(getField('Calendar Duration') || '0')) ||
                           parseFloat(String(raw['Calendar Duration'] || '0')) ||
                           0
    
    if (extractedEndDate && extractedEndDate.trim() !== '' && extractedEndDate !== 'N/A' && plannedDuration > 0) {
      try {
        const endDate = new Date(extractedEndDate)
        if (!isNaN(endDate.getTime())) {
          const startDateObj = new Date(endDate)
          startDateObj.setDate(startDateObj.getDate() - plannedDuration)
          const year = startDateObj.getFullYear()
          const month = String(startDateObj.getMonth() + 1).padStart(2, '0')
          const day = String(startDateObj.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      } catch {
        // Invalid calculation
      }
    }
    
    return ''
  })
  
  const [endDate, setEndDate] = useState(() => {
    // Extract end date from multiple sources for initial state
    if (!activity) return ''
    const raw = (activity as any).raw || {}
    
    // Helper to get field from raw or activity
    const getField = (fieldName: string) => {
      return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || activity?.[fieldName] || ''
    }
    
    // ✅ PRIORITY 1: Extract from "Planned Dates" column (e.g., "04/01/2025 - 04/17/2025")
    let extractedEndDate = ''
    const plannedDatesValue = raw['Planned Dates'] || getField('Planned Dates') || ''
    if (plannedDatesValue && String(plannedDatesValue).trim() !== '' && String(plannedDatesValue).trim() !== 'N/A') {
      const plannedDatesStr = String(plannedDatesValue).trim()
      // Try different separators: " - ", " to ", "–", "—", " / "
      const dateParts = plannedDatesStr.split(/\s*[-–—to/]\s*/i).map(part => part.trim()).filter(part => part !== '')
      if (dateParts.length >= 2 && dateParts[1]) {
        extractedEndDate = dateParts[1]
      }
    }
    
    // ✅ PRIORITY 2: If not found in Planned Dates column, try direct fields
    if (!extractedEndDate || extractedEndDate.trim() === '' || extractedEndDate === 'N/A') {
      extractedEndDate = activity.deadline || 
                        activity.activity_planned_completion_date ||
                        getField('Deadline') ||
                        getField('Planned Completion Date') ||
                        raw['Deadline'] ||
                        raw['Planned Completion Date'] ||
                        raw['Activity Planned Completion Date'] ||
                        raw['End Date'] ||
                        raw['Activity End Date'] ||
                        raw['Planned End'] ||
                        raw['End'] ||
                        ''
    }
    
    if (extractedEndDate && extractedEndDate.trim() !== '' && extractedEndDate !== 'N/A') {
      // Parse date avoiding timezone issues - extract directly from string
      const trimmed = extractedEndDate.trim()
      
      // ✅ PRIORITY 1: If already in YYYY-MM-DD format (with or without time), extract date part only
      const yyyyMMddMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
      if (yyyyMMddMatch) {
        const [, year, month, day] = yyyyMMddMatch
        return `${year}-${month}-${day}`
      }
      
      // ✅ PRIORITY 2: Try MM/DD/YYYY format (common in US) - extract directly
      const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch
        return `${year}-${String(parseInt(month, 10)).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
      }
      
      // ✅ FALLBACK: Try to extract date from ISO string or use Date object
      const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch
        return `${year}-${month}-${day}`
      }
      
      // Last resort: Parse as Date
      try {
        const date = new Date(trimmed)
        if (!isNaN(date.getTime())) {
          // Try to extract from original string first
          const stringDateMatch = trimmed.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
          if (stringDateMatch) {
            const [, year, month, day] = stringDateMatch
            return `${year}-${String(parseInt(month, 10)).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
          }
          
          // Use Date object components (may have timezone issues)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
      } catch {
        // Invalid date
      }
    }
    return ''
  })
  const [duration, setDuration] = useState(0)
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const [customHolidays, setCustomHolidays] = useState<string[]>([])
  const [activityTiming, setActivityTiming] = useState<'pre-commencement' | 'post-commencement' | 'post-completion'>(activity?.activity_timing || 'post-commencement')
  const [hasValue, setHasValue] = useState(activity?.has_value ?? true) // Default to true for existing activities
  const [affectsTimeline, setAffectsTimeline] = useState(activity?.affects_timeline ?? false) // Default to false
  const [useVirtualMaterial, setUseVirtualMaterial] = useState(activity?.use_virtual_material ?? false) // ✅ Use Virtual Material checkbox
  const [activityDivision, setActivityDivision] = useState(activity?.activity_division || '') // ✅ Division field
  const [availableDivisions, setAvailableDivisions] = useState<DivisionType[]>([]) // ✅ Divisions from Divisions Management
  
  // KPI Generation
  const [autoGenerateKPIs, setAutoGenerateKPIs] = useState(true)
  const [kpiPreview, setKpiPreview] = useState<any>(null)
  const [showKPITable, setShowKPITable] = useState(false)
  const [kpiGenerationStatus, setKpiGenerationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [holidaysInRange, setHolidaysInRange] = useState<DatabaseHoliday[]>([]) // ✅ Store holidays in date range
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('boq-form')

  // ✅ Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProjectDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.project-dropdown-container')) {
          setShowProjectDropdown(false)
        }
      }
    }

    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showProjectDropdown])

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Check if click is not inside any container
      const activityContainer = target.closest('.activity-dropdown-container')
      const unitContainer = target.closest('.unit-dropdown-container')
      
      if (!activityContainer && !unitContainer) {
        console.log('🖱️ Clicked outside dropdowns, closing them')
        setShowActivityDropdown(false)
        setShowUnitDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('⌨️ Escape key pressed, closing dropdowns')
        setShowActivityDropdown(false)
        setShowUnitDropdown(false)
      }
    }

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown)
    
    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  // Workdays Configuration
  // ✅ Use database holidays from Holidays Management settings
  const workdaysConfig: WorkdaysConfig = {
    weekendDays: includeWeekends ? [] : [0], // Sunday = 0 (UAE weekend)
    holidays: UAE_HOLIDAYS, // Fallback holidays (will be overridden by database if useDatabaseHolidays is true)
    includeWeekends,
    useDatabaseHolidays: true // ✅ Use holidays from Holidays Management settings
  }
  
  // Load projects on mount
  useEffect(() => {
    if (allProjects.length === 0 && projects.length === 0) {
      loadAllProjects()
    } else if (projects.length > 0) {
      setAllProjects(projects)
    }
  }, [projects])
  
  // ✅ Load project when editing an activity (based on activity's project_full_code or project_code)
  useEffect(() => {
    if (activity && allProjects.length > 0) {
      const activityProjectFullCode = activity.project_full_code || ''
      const activityProjectCode = activity.project_code || ''
      
      // ✅ Skip if project is already correctly loaded
      if (project && (
        project.project_full_code?.toUpperCase() === activityProjectFullCode.toUpperCase() ||
        project.project_code?.toUpperCase() === activityProjectCode.toUpperCase()
      )) {
        return
      }
      
      console.log('🔄 Loading project for activity edit mode:', {
        activityProjectFullCode,
        activityProjectCode,
        currentProjectCode: projectCode,
        currentProject: project?.project_name
      })
      
      // ✅ Priority 1: Find by project_full_code (exact match)
      let foundProject = allProjects.find(p => 
        p.project_full_code?.toUpperCase() === activityProjectFullCode.toUpperCase() ||
        p.project_full_code?.toUpperCase() === activityProjectCode.toUpperCase()
      )
      
      // ✅ Priority 2: Find by project_code if not found
      if (!foundProject) {
        foundProject = allProjects.find(p => 
          p.project_code?.toUpperCase() === activityProjectCode.toUpperCase() ||
          (activityProjectFullCode && p.project_code?.toUpperCase() === activityProjectFullCode.toUpperCase())
        )
      }
      
      // ✅ Priority 3: Find by projectCode state if still not found
      if (!foundProject && projectCode) {
        foundProject = allProjects.find(p => 
          p.project_full_code?.toUpperCase() === projectCode.toUpperCase() ||
          p.project_code?.toUpperCase() === projectCode.toUpperCase()
        )
      }
      
      if (foundProject) {
        console.log('✅ Found project for activity:', {
          name: foundProject.project_name,
          code: foundProject.project_code,
          fullCode: foundProject.project_full_code
        })
        setProject(foundProject)
        // ✅ Ensure projectCode uses project_full_code if available
        const correctProjectCode = foundProject.project_full_code || foundProject.project_code
        if (correctProjectCode && correctProjectCode !== projectCode) {
          setProjectCode(correctProjectCode)
          console.log('✅ Updated projectCode to:', correctProjectCode)
        }
      } else {
        console.warn('⚠️ Project not found for activity:', {
          activityProjectFullCode,
          activityProjectCode,
          projectCode,
          availableProjects: allProjects.map(p => ({ 
            code: p.project_code, 
            fullCode: p.project_full_code,
            name: p.project_name 
          }))
        })
      }
    }
  }, [activity, allProjects])
  
  // ✅ Load divisions from Divisions Management
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        const divisions = await getAllDivisions()
        setAvailableDivisions(divisions)
        console.log('✅ Loaded divisions from Divisions Management:', divisions.length)
      } catch (error) {
        console.error('❌ Error loading divisions:', error)
      }
    }
    loadDivisions()
  }, [])

  // Load activities based on project scopes from project_type_activities table
  useEffect(() => {
    const loadActivitiesByProjectScopes = async () => {
      try {
        // If no project selected, don't load activities
        if (!project) {
          console.log('⚠️ No project selected, clearing activity suggestions')
          setActivitySuggestions([])
          return
        }

        // ✅ OPTIMIZED: Load ALL activities in a SINGLE query instead of multiple queries
        console.log('🔄 Loading ALL activities from ALL scopes (optimized single query)')
        
        const supabase = getSupabaseClient()
        const startTime = performance.now()
        
        // ✅ SINGLE QUERY: Get all activities at once (much faster than looping)
        const { data: allActivitiesData, error: activitiesError } = await executeQuery(async () =>
          supabase
            .from('project_type_activities')
            .select('*')
            .eq('is_active', true)
            .order('project_type', { ascending: true })
            .order('display_order', { ascending: true })
            .order('activity_name', { ascending: true })
        )
        
        if (activitiesError) throw activitiesError
        
        const loadTime = performance.now() - startTime
        console.log(`⚡ Loaded ${allActivitiesData?.length || 0} activities in ${loadTime.toFixed(2)}ms`)
        
        if (!allActivitiesData || allActivitiesData.length === 0) {
          console.log('⚠️ No activities found in any scope')
          setActivitySuggestions([])
          setAllLoadedActivities([])
          setAvailableScopes([])
          return
        }
        
        // Get unique scopes from the loaded data
        const uniqueScopes = new Set<string>()
        const allActivitiesMap = new Map<string, any>()
        
        // Process all activities in memory (much faster than multiple queries)
        allActivitiesData.forEach((pta: any) => {
          // Collect unique scopes
          if (pta.project_type) {
            uniqueScopes.add(pta.project_type)
          }
          
          // Map activities (deduplicate by name, keep first occurrence)
          const key = (pta.activity_name || '').toLowerCase().trim()
          if (key && !allActivitiesMap.has(key)) {
            allActivitiesMap.set(key, {
              id: pta.id,
              name: pta.activity_name,
              division: pta.project_type, // Store the scope this activity belongs to
              unit: pta.default_unit || '',
              category: pta.category || 'General',
              is_active: pta.is_active,
              usage_count: pta.usage_count || 0,
              created_at: pta.created_at,
              updated_at: pta.updated_at
            })
          }
        })
        
        const allScopes = Array.from(uniqueScopes).sort()
        setAvailableScopes(allScopes)
        console.log(`📊 Found ${allScopes.length} unique project scopes:`, allScopes)
        
        // ✅ Show project's current scopes if they exist
        if (project.project_type && project.project_type.trim() !== '') {
          const projectScopes = project.project_type.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          console.log(`📋 Project currently has scopes: ${projectScopes.join(', ')}`)
        }
        
        // Convert map to array and sort
        const activities = Array.from(allActivitiesMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
        
        console.log(`✅ Total unique activities loaded from ALL scopes: ${activities.length} (processed in ${(performance.now() - startTime).toFixed(2)}ms total)`)
        
        // Store all activities and update suggestions
        setAllLoadedActivities(activities)
        
        // Apply scope filter if one is selected
        if (selectedScopeFilter !== 'all') {
          const filtered = activities.filter(act => act.division === selectedScopeFilter)
          setActivitySuggestions(filtered)
          console.log(`🔍 Filtered to ${filtered.length} activities for scope "${selectedScopeFilter}"`)
        } else {
          setActivitySuggestions(activities)
        }
      } catch (error) {
        console.error('❌ Error loading all activities:', error)
        // Clear suggestions on error
        setActivitySuggestions([])
        setAllLoadedActivities([])
        setAvailableScopes([])
      }
    }
    
    loadActivitiesByProjectScopes()
  }, [project?.project_type, project?.project_code, selectedScopeFilter])

  // ✅ Load zones from project_zones table when project is selected (ONLY from database, no fallback)
  useEffect(() => {
    const loadProjectZones = async () => {
      if (!projectCode || !project) {
        // If no project selected, clear zones
        setAvailableZones([])
        setZoneSuggestions([])
        setHasProjectZones(false) // ✅ Reset zones status
        return
      }

      try {
        // ✅ FIX: Use project_full_code for database lookup (project_zones stores full code like "P8888-P")
        const projectCodeForLookup = project?.project_full_code || projectCode || project?.project_code || ''
        console.log('🔄 Loading zones for project:', {
          projectCodeForLookup,
          projectCode,
          projectFullCode: project?.project_full_code,
          projectBaseCode: project?.project_code
        })
        const supabase = getSupabaseClient()
        
        // Load zones from project_zones table - try both full code and base code
        let zonesData: any = null
        let zonesError: any = null
        
        // First try with project_full_code
        const { data: fullCodeData, error: fullCodeError } = await executeQuery(async () =>
          supabase
            .from('project_zones')
            .select('zones')
            .eq('project_code', projectCodeForLookup)
            .single()
        )
        
        if (fullCodeError && fullCodeError.code !== 'PGRST116') {
          // If error is not "no rows", try with base code as fallback
          if (project?.project_code && project.project_code !== projectCodeForLookup) {
            const { data: baseCodeData, error: baseCodeError } = await executeQuery(async () =>
              supabase
                .from('project_zones')
                .select('zones')
                .eq('project_code', project.project_code)
                .single()
            )
            if (!baseCodeError || baseCodeError.code === 'PGRST116') {
              zonesData = baseCodeData
              zonesError = baseCodeError
            } else {
              zonesError = fullCodeError
            }
          } else {
            zonesError = fullCodeError
          }
        } else {
          zonesData = fullCodeData
          zonesError = fullCodeError
        }
        
        if (zonesError && zonesError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw zonesError
        }
        
        if (zonesData && (zonesData as any).zones) {
          // Parse zones - support both semicolon-separated ("0; 1; 2") and comma-separated ("Zone A, Zone B")
          const zonesString = (zonesData as any).zones
          const zonesList = zonesString
            .split(/[;,]/) // Split by semicolon or comma
            .map((z: string) => z.trim())
            .filter((z: string) => z.length > 0)
            .sort()
          
          setAvailableZones(zonesList)
          setZoneSuggestions(zonesList)
          setHasProjectZones(zonesList.length > 0) // ✅ Mark that project has zones
          console.log(`✅ Loaded ${zonesList.length} zones from project:`, zonesList)
        } else {
          // No zones defined for this project - clear zones (no fallback)
          console.log('⚠️ No zones defined for project:', projectCode)
          setAvailableZones([])
          setZoneSuggestions([])
          setHasProjectZones(false) // ✅ Mark that project has NO zones
        }
      } catch (error) {
        console.error('❌ Error loading project zones:', error)
        // On error, clear zones (no fallback)
        setAvailableZones([])
        setZoneSuggestions([])
        setHasProjectZones(false) // ✅ Mark that project has NO zones on error
      }
    }
    
    loadProjectZones()
  }, [projectCode, project])
  
  // ✅ Handle project selection and load project details
  const handleProjectSelect = (selectedProject: Project) => {
    console.log('🎯 Project selected:', selectedProject.project_code)
    
    // ✅ Reset zones status when selecting new project
    setHasProjectZones(false)
    setAvailableZones([])
    setZoneSuggestions([])
    
    // ✅ FIX: Use project_full_code if available (e.g., "P4110-P"), otherwise use project_code
    // This ensures that when user selects "P4110-P", we use "P4110-P" and not just "P4110"
    const projectCodeToUse = selectedProject.project_full_code || selectedProject.project_code
    setProjectCode(projectCodeToUse)
    setProject(selectedProject)
    setShowProjectDropdown(false)
    setProjectSearch('')
    console.log('✅ Project loaded:', selectedProject.project_name)
    console.log('✅ Using project code:', projectCodeToUse, '(full_code:', selectedProject.project_full_code, ', code:', selectedProject.project_code, ')')
    
    // Activities will be loaded automatically by useEffect that watches project.project_type
    // Zones will be loaded automatically by useEffect that watches projectCode and project
  }

  const handleProjectChange = async (projectCodeValue: string) => {
    console.log('🎯 Project selected:', projectCodeValue)
    
    setProjectCode(projectCodeValue)
    
    if (projectCodeValue && allProjects.length > 0) {
      const selectedProject = allProjects.find(p => p.project_code === projectCodeValue)
      if (selectedProject) {
        setProject(selectedProject)
        console.log('✅ Project loaded:', selectedProject.project_name)
        
        // Activities will be loaded automatically by useEffect that watches project.project_type
      }
    }
  }
  
  // ✅ Filter projects based on search
  const filteredProjects = allProjects.filter((proj) => {
    if (!projectSearch.trim()) return true
    
    const searchLower = projectSearch.toLowerCase().trim()
    const projectCode = (proj.project_code || '').toLowerCase()
    const projectSubCode = (proj.project_sub_code || '').toLowerCase()
    const projectName = (proj.project_name || '').toLowerCase()
    
    // Build full project code for search
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
    
    return (
      projectCode.includes(searchLower) ||
      projectSubCode.includes(searchLower) ||
      projectFullCode.toLowerCase().includes(searchLower) ||
      projectName.includes(searchLower)
    )
  })

  // Auto-load project data when project code changes
  useEffect(() => {
    if (projectCode && allProjects.length > 0) {
      const selectedProject = allProjects.find(p => p.project_code === projectCode)
      if (selectedProject) {
        setProject(selectedProject)
        console.log('✅ Project loaded:', selectedProject.project_name)
        console.log('📁 Project scopes:', selectedProject.project_type || 'None')
        // ✅ Auto-detect Division from project
        if (selectedProject.responsible_division) {
          setActivityDivision(selectedProject.responsible_division)
          console.log('✅ Division auto-detected:', selectedProject.responsible_division)
        }
        // Activities will be loaded automatically by the useEffect that watches project.project_type
      }
    }
  }, [projectCode, allProjects])
  
  // Helper function to get activity field from raw object or direct field
  const getActivityField = (activity: any, fieldName: string): any => {
    const raw = activity?.raw || activity || {}
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || activity?.[fieldName] || ''
  }

  // Helper function to parse date to YYYY-MM-DD format (without timezone conversion)
  const parseDateToYYYYMMDD = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
    
    try {
      const trimmed = dateStr.trim()
      
      // ✅ PRIORITY 1: If already in YYYY-MM-DD format (with or without time), extract date part only
      // This handles: "2025-04-07", "2025-04-07T00:00:00Z", "2025-04-07T00:00:00.000Z", etc.
      const yyyyMMddMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
      if (yyyyMMddMatch) {
        const [, year, month, day] = yyyyMMddMatch
        // Validate the date
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          // Return the date as-is without timezone conversion
          return `${year}-${month}-${day}`
        }
      }
      
      // ✅ PRIORITY 2: Try MM/DD/YYYY format (common in US) - extract directly without Date object
      const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
        }
      }
      
      // ✅ PRIORITY 3: Try DD/MM/YYYY format - extract directly without Date object
      const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        // Check if it's likely DD/MM (day > 12) or MM/DD (month > 12)
        if (dayNum > 12 && monthNum <= 12) {
          // Likely DD/MM/YYYY
          return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
        } else if (monthNum > 12 && dayNum <= 12) {
          // Likely MM/DD/YYYY (already handled above)
          return null
        }
      }
      
      // ✅ FALLBACK: Only use Date object if we can't extract directly
      // When using Date, extract the date part from ISO string to avoid timezone issues
      if (trimmed.includes('T') || trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
        // It's an ISO date string - extract the date part before 'T' or use regex
        const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (isoDateMatch) {
          const [, year, month, day] = isoDateMatch
          return `${year}-${month}-${day}`
        }
      }
      
      // Last resort: Try parsing as Date but extract date components from string if possible
      const date = new Date(trimmed)
      if (!isNaN(date.getTime())) {
        // Try to extract from original string first to avoid timezone conversion
        const stringDateMatch = trimmed.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
        if (stringDateMatch) {
          const [, year, month, day] = stringDateMatch
          return `${year}-${String(parseInt(month, 10)).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
        }
        
        // If we can't extract from string, use Date object (but this may have timezone issues)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
      
      return null
    } catch {
      return null
    }
  }

  // ✅ Use the EXACT SAME function as the table to get planned start date
  const getPlannedStartDate = (activity: any): string => {
    const raw = (activity as any).raw || {}
    
    // Helper functions (same as table)
    const normalizeZone = (zone: string, projectCode: string): string => {
      if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
      let normalized = zone.trim()
      const codeUpper = projectCode.toUpperCase()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      return normalized.toLowerCase()
    }
    
    const getActivityZone = (activity: any): string => {
      const rawActivity = (activity as any).raw || {}
      let zoneValue = activity.zone_number || 
                     rawActivity['Zone Number'] ||
                     rawActivity['Zone #'] ||
                     '0'
      
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
    
    const getKPIZone = (kpi: any): string => {
      const rawKPI = (kpi as any).raw || {}
      // ✅ NOT from Section - Section is separate from Zone
      const zoneRaw = (
        kpi.zone || 
        rawKPI['Zone'] || 
        rawKPI['Zone Number'] || 
        ''
      ).toString().trim()
      const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
      return normalizeZone(zoneRaw, projectCode)
    }
    
    const extractZoneNumber = (zone: string): string => {
      if (!zone || zone.trim() === '') return ''
      const normalizedZone = zone.toLowerCase().trim()
      const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return zonePatternMatch[1]
      }
      const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
      if (endNumberMatch && endNumberMatch[1]) {
        return endNumberMatch[1]
      }
      const numberMatch = normalizedZone.match(/\d+/)
      if (numberMatch) return numberMatch[0]
      return normalizedZone
    }
    
    const parseDateToYYYYMMDDTable = (dateStr: string): string | null => {
      if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch {
        return null
      }
    }
    
    // PRIORITY 1: Get from first Planned KPI Date column (same as table)
    if (allKPIs && allKPIs.length > 0) {
      const activityName = (activity.activity_description || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      const matchingKPIs = allKPIs.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'planned') return false
        
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date; kpi: any }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          let kpiDateStr = ''
          if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDDTable(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj, kpi })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[0].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields (same as table)
    const directStart = activity.planned_activity_start_date || 
                       activity.activity_planned_start_date ||
                       getActivityField(activity, 'Planned Activity Start Date') ||
                       getActivityField(activity, 'Planned Start Date') ||
                       getActivityField(activity, 'Activity Planned Start Date') ||
                       raw['Planned Activity Start Date'] ||
                       raw['Planned Start Date'] ||
                       raw['Activity Planned Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    // Priority 3: Calculate from Completion Date - Duration (same as table)
    const plannedEnd = activity.deadline || 
                      activity.activity_planned_completion_date ||
                      getActivityField(activity, 'Deadline') ||
                      getActivityField(activity, 'Planned Completion Date') ||
                      getActivityField(activity, 'Activity Planned Completion Date') ||
                      raw['Deadline'] ||
                      raw['Planned Completion Date'] ||
                      raw['Activity Planned Completion Date'] ||
                      ''
    
    const plannedDuration = activity.calendar_duration || 
                           parseFloat(String(getActivityField(activity, 'Calendar Duration') || '0')) ||
                           parseFloat(String(raw['Calendar Duration'] || '0')) ||
                           0
    
    if (plannedEnd && plannedEnd.trim() !== '' && plannedEnd !== 'N/A' && plannedDuration > 0) {
      try {
        const endDate = new Date(plannedEnd)
        if (!isNaN(endDate.getTime())) {
          const startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - plannedDuration)
          return startDate.toISOString().split('T')[0]
        }
      } catch (e) {
        // Invalid date, continue
      }
    }
    
    return ''
  }

  // ✅ Load activity data when editing (priority: activity data > project defaults)
  useEffect(() => {
    if (activity && activity.id) {
      console.log('📝 Loading activity data for editing:', {
        id: activity.id,
        activity_division: activity.activity_division,
        zone_number: activity.zone_number
      })
      
      // ✅ Load Division from activity
      if (activity.activity_division) {
        setActivityDivision(activity.activity_division)
        console.log('✅ Division loaded from activity:', activity.activity_division)
      }
      
      // ✅ Load Zone Number from activity
      if (activity.zone_number) {
        setZoneNumber(activity.zone_number)
        console.log('✅ Zone Number loaded from activity:', activity.zone_number)
      } else {
        setZoneNumber('0')
      }

      // ✅ Use EXACT SAME function as table to get planned start date
      const extractedStartDate = getPlannedStartDate(activity)
      
      // ✅ For End Date: Use SAME fields as table
      const raw = (activity as any).raw || {}
      let extractedEndDate = activity.deadline || 
                            activity.activity_planned_completion_date ||
                            getActivityField(activity, 'Deadline') ||
                            getActivityField(activity, 'Planned Completion Date') ||
                            getActivityField(activity, 'Activity Planned Completion Date') ||
                            raw['Deadline'] ||
                            raw['Planned Completion Date'] ||
                            raw['Activity Planned Completion Date'] ||
                            ''
      
      console.log('📅 Extracted dates (using EXACT same logic as table):', {
        start: extractedStartDate,
        end: extractedEndDate
      })
      
      // Parse and format start date
      if (extractedStartDate && extractedStartDate.trim() !== '' && extractedStartDate !== 'N/A') {
        const parsedStartDate = parseDateToYYYYMMDD(extractedStartDate)
        if (parsedStartDate) {
          setStartDate(parsedStartDate)
          console.log('✅ Start Date loaded (same as table):', parsedStartDate, 'Source:', extractedStartDate)
        } else {
          console.warn('⚠️ Failed to parse start date:', extractedStartDate)
        }
      }
      
      // Parse and format end date
      if (extractedEndDate && extractedEndDate.trim() !== '' && extractedEndDate !== 'N/A') {
        const parsedEndDate = parseDateToYYYYMMDD(extractedEndDate)
        if (parsedEndDate) {
          setEndDate(parsedEndDate)
          console.log('✅ End Date loaded (same as table):', parsedEndDate, 'Source:', extractedEndDate)
        } else {
          console.warn('⚠️ Failed to parse end date:', extractedEndDate)
        }
      }
    }
  }, [
    activity?.id, 
    activity?.activity_division, 
    activity?.zone_number,
    activity?.planned_activity_start_date,
    activity?.activity_planned_start_date,
    activity?.deadline,
    activity?.activity_planned_completion_date,
    (activity as any)?.raw,
    allKPIs // ✅ Add allKPIs to dependencies
  ])

  // ✅ Auto-update Division when project changes (only if NOT editing existing activity)
  useEffect(() => {
    // ✅ Don't overwrite division if we're editing an existing activity with a division
    if (activity && activity.id && activity.activity_division) {
      console.log('⚠️ Skipping project division update - activity has existing division:', activity.activity_division)
      return
    }
    
    if (project?.responsible_division && availableDivisions.length > 0) {
      // Check if project's division exists in available divisions
      const divisionExists = availableDivisions.some(d => d.name === project.responsible_division)
      if (divisionExists) {
        setActivityDivision(project.responsible_division)
        console.log('✅ Division updated from project:', project.responsible_division)
      } else {
        // If division doesn't exist in Divisions Management, still set it but log a warning
        console.warn('⚠️ Project division not found in Divisions Management:', project.responsible_division)
        setActivityDivision(project.responsible_division)
      }
    }
  }, [project?.responsible_division, availableDivisions, activity?.id, activity?.activity_division])

  // Function to load activities based on project scope
  const loadActivitiesForProjectType = async (projectType?: string) => {
    if (!projectType) {
      console.log('⚠️ No project scope specified, using all activities')
      const allActivities = await getAllActivities()
      setActivitySuggestions(allActivities)
      return
    }

    try {
      console.log('🔍 Loading activities for project scope:', projectType)
      
      // ✅ استخدام النظام الجديد للأنشطة المقترحة
      const suggestedActivities = await getSuggestedActivities(projectType)
      
      console.log(`✅ Found ${suggestedActivities.length} activities for ${projectType}`)
      setActivitySuggestions(suggestedActivities)
      
    } catch (error) {
      console.error('❌ Error loading activities for project scope:', error)
      // Fallback to all activities
      const allActivities = await getAllActivities()
      setActivitySuggestions(allActivities)
    }
  }
  
  // Load activity suggestions based on division (fallback)
  useEffect(() => {
    if (project?.responsible_division && activitySuggestions.length === 0) {
      console.log('🔄 Loading activities by division as fallback:', project.responsible_division)
      const suggestions = getAllActivitiesByDivision(project.responsible_division, ACTIVITY_TEMPLATES)
      // Convert ActivityTemplate to Activity format
      const convertedSuggestions = suggestions.map(template => ({
        id: template.name,
        name: template.name,
        division: template.division,
        unit: template.defaultUnit,
        category: template.category,
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      setActivitySuggestions(convertedSuggestions)
      console.log(`✅ Loaded ${convertedSuggestions.length} activities by division`)
    }
  }, [project?.responsible_division, activitySuggestions.length])

  // ✅ Load categories from project_type_activities table
  useEffect(() => {
    const loadCategories = async () => {
      if (!project) return
      
      try {
        const supabase = getSupabaseClient()
        
        // ✅ NEW: Load categories from ALL scopes if project has no project_type
        let query = supabase
          .from('project_type_activities')
          .select('category, activity_name, project_type')
          .eq('is_active', true)
        
        // If project has specific scopes, filter by them
        if (project.project_type && project.project_type.trim() !== '') {
          const projectScopes = project.project_type
            .split(',')
            .map(scope => scope.trim())
            .filter(scope => scope.length > 0)
          
          if (projectScopes.length > 0) {
            query = query.in('project_type', projectScopes)
          }
        }
        // Otherwise, get all categories from all scopes
        
        const { data, error } = await executeQuery(async () => query)
        
        if (error) {
          console.error('❌ Error loading categories:', error)
          return
        }
        
        if (data && data.length > 0) {
          const categorySet = new Set<string>()
          const counts: Record<string, number> = {}
          
          data.forEach((item: any) => {
            if (item.category) {
              categorySet.add(item.category)
              counts[item.category] = (counts[item.category] || 0) + 1
            }
          })
          
          const categories = Array.from(categorySet).sort()
          setAvailableCategories(categories)
          setCategoryCounts(counts)
          console.log('📊 Available categories from project_type_activities:', categories)
          console.log('📊 Category counts:', counts)
        }
      } catch (error) {
        console.error('❌ Error loading categories:', error)
      }
    }
    
    loadCategories()
  }, [project?.project_type])

  // ✅ Filter activities based on selected filter, category, and scope
  const getFilteredActivities = () => {
    let filtered = activitySuggestions

    // Filter by scope if selected
    if (selectedScopeFilter !== 'all') {
      filtered = filtered.filter(act => act.division === selectedScopeFilter)
    }


    // Filter by search term
    if (activityName) {
      filtered = filtered.filter(act => 
        act.name.toLowerCase().includes(activityName.toLowerCase())
      )
    }

    return filtered
  }

  // Handle scope filter change
  const handleScopeFilterChange = (scope: string) => {
    setSelectedScopeFilter(scope)
    if (scope === 'all') {
      setActivitySuggestions(allLoadedActivities)
      console.log('🔍 Showing all activities from all scopes')
    } else {
      const filtered = allLoadedActivities.filter(act => act.division === scope)
      setActivitySuggestions(filtered)
      console.log(`🔍 Filtered to ${filtered.length} activities for scope "${scope}"`)
    }
  }
  
  // Auto-suggest unit when activity name changes
  useEffect(() => {
    if (activityName && !unit) {
      const suggestedUnit = getSuggestedUnit(activityName)
      if (suggestedUnit) {
        setUnit(suggestedUnit)
        console.log('💡 Auto-suggested unit:', suggestedUnit)
      }
    }
  }, [activityName])
  
  // Calculate duration when dates change
  useEffect(() => {
    const calculateDuration = async () => {
      if (startDate && endDate) {
        const workdays = await calculateWorkdays(startDate, endDate, workdaysConfig)
        setDuration(workdays)
        console.log(`📅 Duration calculated: ${workdays} working days`)
        
        // Auto-generate KPI preview if enabled
        if (autoGenerateKPIs && plannedUnits && parseFloat(plannedUnits) > 0) {
          generateKPIPreview()
        }
      }
    }
    
    calculateDuration()
  }, [startDate, endDate, includeWeekends, plannedUnits, autoGenerateKPIs])

  // ✅ Auto-generate KPI preview when activity is selected from suggestions or Activity Timing changes
  useEffect(() => {
    if (activityName && startDate && endDate && plannedUnits && parseFloat(plannedUnits) > 0 && autoGenerateKPIs) {
      console.log('🔄 Activity selected or Activity Timing changed, auto-generating KPI preview...')
      generateKPIPreview()
    }
  }, [activityName, startDate, endDate, plannedUnits, autoGenerateKPIs, activityTiming, hasValue, affectsTimeline, useVirtualMaterial])
  
  // Load custom holidays from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customHolidays')
      if (stored) {
        const holidays = JSON.parse(stored)
        setCustomHolidays(holidays.map((h: any) => h.date))
      }
    } catch (err) {
      console.error('Error loading custom holidays:', err)
    }
  }, [])
  
  async function loadAllProjects() {
    try {
      setProjectLoading(true)
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('project_code', { ascending: true })
      
      if (error) throw error
      
      if (data) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          project_code: item['Project Code'],
          project_sub_code: item['Project Sub-Code'],
          project_full_code: item['Project Code'],
          project_name: item['Project Name'],
          project_type: item['Project Type'],
          responsible_division: item['Responsible Division'],
          plot_number: item['Plot Number'],
          kpi_completed: item['KPI Completed'] === 'TRUE',
          project_status: item['Project Status']?.toLowerCase(),
          contract_amount: parseFloat(item['Contract Amount'] || '0'),
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by
        }))
        setAllProjects(mapped)
        console.log(`✅ Loaded ${mapped.length} projects`)
      }
    } catch (err: any) {
      console.error('❌ Error loading projects:', err)
      setError('Failed to load projects: ' + err.message)
    } finally {
      setProjectLoading(false)
    }
  }
  
  async function generateKPIPreview() {
    console.log('🔍 generateKPIPreview called with:', {
      startDate,
      endDate,
      plannedUnits,
      activityName,
      autoGenerateKPIs,
      activityTiming,
      hasValue,
      affectsTimeline
    })
    
    if (!startDate || !endDate || !plannedUnits || parseFloat(plannedUnits) <= 0 || !activityName) {
      console.log('⚠️ generateKPIPreview skipped - missing required data')
      setKpiPreview(null)
      setKpiGenerationStatus('idle')
      return
    }

    // ✅ Post-completion specific logic
    if (activityTiming === 'post-completion' && !hasValue && !affectsTimeline) {
      console.log('⚠️ Post-completion activity with no value and no timeline impact - skipping KPI preview')
      setKpiPreview(null)
      setKpiGenerationStatus('idle')
      return
    }
    
    try {
      setKpiGenerationStatus('loading')
      
      // ✅ FIX: Use correct project codes - project_code is base code, project_full_code is full code
      const baseProjectCode = project?.project_code || projectCode
      const fullProjectCode = project?.project_full_code || projectCode
      
      const tempActivity = {
        id: activity?.id || 'temp',
        project_code: baseProjectCode, // ✅ Base code (e.g., "P4110")
        project_full_code: fullProjectCode, // ✅ Full code (e.g., "P4110-P")
        project_sub_code: project?.project_sub_code || '',
        activity_name: activityName,
        activity_division: activityDivision || project?.responsible_division || '', // ✅ Division field
        unit: unit || 'No.',
        planned_units: parseFloat(plannedUnits),
        planned_value: parseFloat(plannedValue) || 0,
        planned_activity_start_date: startDate,
        deadline: endDate,
        // ✅ Zone Number - NOT from Division (Division is separate from Zone)
        zone_number: zoneNumber || '0', // ✅ Do NOT use responsible_division as Zone - they are separate
        project_full_name: project?.project_name || '',
        activity_timing: activityTiming,
        has_value: hasValue,
        affects_timeline: affectsTimeline,
        use_virtual_material: useVirtualMaterial
      }
      
      // ✅ OPTIMIZED: Load holidays in parallel with KPI generation for faster performance
      const [kpis, holidays] = await Promise.all([
        generateKPIsFromBOQ(tempActivity as any, workdaysConfig),
        getHolidaysInRange(startDate, endDate).catch((error) => {
          console.warn('⚠️ Failed to load holidays:', error)
          return []
        })
      ])
      
      const calculatedTotal = kpis.reduce((sum, kpi) => sum + kpi.quantity, 0)
      const plannedUnitsValue = parseFloat(plannedUnits)
      
      // ✅ Set holidays (already filtered to only include holidays in the date range)
      console.log(`📅 Found ${holidays.length} holidays in date range:`, holidays.map(h => `${h.name} (${h.date})`))
      setHolidaysInRange(holidays)
      
      // ✅ Calculate average per day with min/max values for display
      const avgPerDay = kpis.length > 0 ? calculatedTotal / kpis.length : 0
      const minAvgPerDay = Math.floor(avgPerDay) // ✅ Smallest whole number
      const maxAvgPerDay = Math.ceil(avgPerDay) // ✅ Largest whole number
      const hasDecimal = avgPerDay % 1 !== 0 // ✅ Check if has decimal part
      
      const summary = {
        totalQuantity: calculatedTotal,
        numberOfDays: kpis.length,
        averagePerDay: avgPerDay,
        minAveragePerDay: minAvgPerDay, // ✅ Smallest whole number
        maxAveragePerDay: maxAvgPerDay, // ✅ Largest whole number
        hasDecimalAverage: hasDecimal, // ✅ Whether average has decimal part
        startDate: kpis.length > 0 ? kpis[0].activity_date : '',
        endDate: kpis.length > 0 ? kpis[kpis.length - 1].activity_date : '',
        activityTiming: activityTiming,
        hasValue: hasValue,
        affectsTimeline: affectsTimeline,
        holidaysCount: holidays.length // ✅ Add holidays count to summary
      }
      
      // ✅ Verify total matches planned units
      if (calculatedTotal !== plannedUnitsValue) {
        console.warn(`⚠️ MISMATCH! Generated Total (${calculatedTotal}) ≠ Planned Units (${plannedUnitsValue})`)
      } else {
        console.log(`✅ VERIFIED: Total Quantity (${calculatedTotal}) === Planned Units (${plannedUnitsValue})`)
      }
      
      setKpiPreview({ kpis, summary })
      setKpiGenerationStatus('ready')
      
      console.log(`✅ Generated ${summary.numberOfDays} KPI records (Total: ${summary.totalQuantity} ${unit})`)
      
      // ✅ Post-completion specific logging
      if (activityTiming === 'post-completion') {
        console.log('🔧 Post-completion activity KPI generation:', {
          hasValue,
          affectsTimeline,
          kpiCount: kpis.length,
          totalQuantity: calculatedTotal
        })
      }
    } catch (err) {
      console.error('❌ Error generating KPI preview:', err)
      setKpiGenerationStatus('error')
      setKpiPreview(null)
    }
  }
  
  async function handleActivitySelect(selectedActivity: Activity) {
    console.log('✅ Activity selected:', selectedActivity.name)
    setActivityName(selectedActivity.name)
    setActivitySelected(true) // ✅ Mark activity as selected
    
    // ✅ NEW: Track the scope of this selected activity
    if (selectedActivity.division) {
      setSelectedActivitiesScopes(prev => {
        const newSet = new Set(prev)
        newSet.add(selectedActivity.division)
        console.log('📊 Tracked scopes so far:', Array.from(newSet))
        return newSet
      })
    }
    
    // ✅ Reset scope filter to "All Scopes" to show all activities after selection
    if (selectedScopeFilter !== 'all') {
      setSelectedScopeFilter('all')
      setActivitySuggestions(allLoadedActivities)
      console.log('🔄 Reset scope filter to "All Scopes" to show all activities')
    }
    
    // ملء الوحدة تلقائياً
    const suggestedUnit = getSuggestedUnit(selectedActivity.name)
    setUnit(suggestedUnit || selectedActivity.unit)
    
    // ✅ KEEP DROPDOWN OPEN - Don't close it to allow selecting more activities
    // setShowActivityDropdown(false) - REMOVED
    console.log('🔓 Activity dropdown remains open for multiple selections')
    console.log('🔧 Auto-filled unit:', suggestedUnit || selectedActivity.unit)
    
    // ✅ Auto-load project data based on activity (ONLY if no project is already selected)
    try {
      console.log('🔄 Auto-loading project data for activity:', selectedActivity.name)
      console.log('🔍 Current project selection:', { projectCode, projectName: project?.project_name })
      
      // ✅ ONLY auto-select project if no project is currently selected
      if (!projectCode || !project) {
        console.log('📋 No project selected, auto-selecting based on activity...')
        
        // Find projects that use this activity
        const projectsWithActivity = allProjects.filter(p => 
          p.project_type === selectedActivity.division || 
          p.responsible_division === selectedActivity.division
        )
        
        if (projectsWithActivity.length > 0) {
          // Auto-select the first matching project
          const autoProject = projectsWithActivity[0]
          setProjectCode(autoProject.project_code)
          setProject(autoProject)
          console.log('✅ Auto-selected project:', autoProject.project_name)
          console.log('📊 Project details:', {
            code: autoProject.project_code,
            name: autoProject.project_name,
            type: autoProject.project_type,
            division: autoProject.responsible_division
          })
        } else {
          console.log('⚠️ No matching projects found for activity division:', selectedActivity.division)
        }
      } else {
        console.log('✅ Project already selected, keeping current selection:', project.project_name)
        console.log('📊 Current project details:', {
          code: project.project_code,
          name: project.project_name,
          type: project.project_type,
          division: project.responsible_division
        })
      }
    } catch (error) {
      console.error('❌ Error auto-loading project data:', error)
    }
    
    // زيادة عداد الاستخدام
    try {
      // ✅ Pass project_type if available
      const projectType = project?.project_type || undefined
      await incrementActivityUsage(selectedActivity.name, projectType)
      console.log('📊 Activity usage incremented', projectType ? `for project type: ${projectType}` : '')
    } catch (error) {
      console.error('❌ Error incrementing activity usage:', error)
    }
    
    // إظهار رسالة نجاح
    setSuccess(`Activity "${selectedActivity.name}" selected with unit "${suggestedUnit || selectedActivity.unit}"`)
    
    // ✅ Auto-generate KPI preview if all required data is available
    if (startDate && endDate && plannedUnits && parseFloat(plannedUnits) > 0 && autoGenerateKPIs) {
      console.log('🔄 Auto-generating KPI preview after activity selection...')
      setTimeout(() => {
        generateKPIPreview()
      }, 100) // Small delay to ensure state is updated
    }
  }
  
  function handleUnitSelect(selectedUnit: string) {
    setUnit(selectedUnit)
    setShowUnitDropdown(false)
  }

  // Zone handlers
  function handleZoneSelect(selectedZone: string) {
    // ✅ Zone Number = selected zone name
    setZoneNumber(selectedZone || '0')
    setShowZoneDropdown(false)
    console.log('✅ Zone selected:', selectedZone)
  }

  function handleZoneNumberChange(value: string) {
    setZoneNumber(value || '0')
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('🔍 Form validation - checking required fields:', {
        projectCode,
        projectName: project?.project_name,
        activityName,
        unit,
        startDate,
        endDate,
        plannedUnits,
        autoGenerateKPIs,
        kpiPreview: kpiPreview ? `${kpiPreview.kpis?.length || 0} KPIs` : 'null'
      })
      
      // ✅ CRITICAL: Verify project selection is correct
      console.log('🎯 FINAL PROJECT VERIFICATION:', {
        selectedProjectCode: projectCode,
        selectedProjectName: project?.project_name,
        selectedProjectType: project?.project_type,
        selectedProjectDivision: project?.responsible_division,
        activityName: activityName
      })
      
      // Validate required fields
      if (!projectCode) throw new Error('Please select a project')
      
      // ✅ CRITICAL: Check if project has zones defined in Project Zones Management
      if (!hasProjectZones || availableZones.length === 0) {
        const projectFullCode = project?.project_full_code || project?.project_code || projectCode
        throw new Error(
          `Cannot create activity: Project "${projectFullCode}" does not have zones defined.\n\n` +
          `Please go to "Project Zones Management" and add zones for this project before creating activities.`
        )
      }
      
      if (!activityName) throw new Error('Please enter activity name')
      if (!unit) throw new Error('Please enter unit')
      if (!startDate) throw new Error('Please enter start date')
      if (!endDate) throw new Error('Please enter end date')
      
      // ✅ Additional validation for KPI generation
      if (autoGenerateKPIs && (!plannedUnits || parseFloat(plannedUnits) <= 0)) {
        throw new Error('Planned Units is required for KPI auto-generation. Please enter a value greater than 0.')
      }

      // ✅ Post-completion specific validation
      if (activityTiming === 'post-completion' && !hasValue && !affectsTimeline) {
        console.log('⚠️ Post-completion activity with no value and no timeline impact - KPI generation may be limited')
      }

      // ✅ NEW: Auto-detect Project Scope from selected activity
      let detectedScopes: string[] = []
      if (activitySelected) {
        // Find the activity in allLoadedActivities to get its scope
        const selectedActivityData = allLoadedActivities.find(
          act => act.name.toLowerCase() === activityName.toLowerCase()
        )
        
        if (selectedActivityData && selectedActivityData.division) {
          detectedScopes = [selectedActivityData.division]
          console.log('✅ Auto-detected scope from current activity:', detectedScopes)
        }
      }

      // ✅ NEW: Collect all scopes from tracked selected activities + current activity
      const allDetectedScopes = Array.from(selectedActivitiesScopes)
      if (detectedScopes.length > 0 && !allDetectedScopes.includes(detectedScopes[0])) {
        allDetectedScopes.push(detectedScopes[0])
      }
      
      console.log('📊 All detected scopes from activities:', allDetectedScopes)

      // ✅ NEW: Update project with ALL detected scopes (always update, not just if empty)
      if (project && allDetectedScopes.length > 0) {
        try {
          const supabase = getSupabaseClient()
          const existingScopes = project.project_type ? project.project_type.split(',').map(s => s.trim()).filter(s => s.length > 0) : []
          // Merge existing scopes with newly detected scopes
          const scopeSet = new Set([...existingScopes, ...allDetectedScopes])
          const allScopes = Array.from(scopeSet).filter(s => s.length > 0)
          const updatedScopes = allScopes.join(',')
          
          console.log('🔄 Updating project with all detected scopes:', {
            existing: existingScopes,
            detected: allDetectedScopes,
            final: allScopes
          })
          
          // ✅ FIX: Use project.project_code (base code) for database lookup, not projectCode (which may be full_code)
          const baseProjectCode = project?.project_code || projectCode
          const { error: updateError } = await (supabase as any)
            .from(TABLES.PROJECTS)
            .update({ 'Project Type': updatedScopes })
            .eq('Project Code', baseProjectCode)
          
          if (updateError) {
            console.error('⚠️ Failed to update project scopes:', updateError)
          } else {
            console.log('✅ Project updated with all scopes:', updatedScopes)
            // Update local project state
            setProject({ ...project, project_type: updatedScopes })
            // Update allProjects state
            setAllProjects(prev => prev.map(p => 
              p.project_code === projectCode 
                ? { ...p, project_type: updatedScopes }
                : p
            ))
            // Reload activities to include new scopes
            console.log('🔄 Reloading activities with updated scopes...')
          }
        } catch (updateError) {
          console.error('❌ Error updating project scopes:', updateError)
          // Don't throw - continue with activity submission
        }
      }
      
      // ✅ FIX: Build project_full_code correctly
      let projectFullCode = project?.project_full_code || project?.project_code || projectCode
      if (!projectFullCode && project?.project_sub_code) {
        const pCode = project?.project_code || projectCode
        const pSubCode = project.project_sub_code
        if (pSubCode.toUpperCase().startsWith(pCode.toUpperCase())) {
          projectFullCode = pSubCode
        } else {
          projectFullCode = pSubCode.startsWith('-') 
            ? `${pCode}${pSubCode}` 
            : `${pCode}-${pSubCode}`
        }
      }
      
      // ✅ FIX: Use project_full_code as project_code if project has sub_code
      // This ensures "P4110-P" is saved as project_code, not just "P4110"
      const finalProjectCode = projectFullCode || projectCode
      
      const activityData = {
        ...(activity?.id && { id: activity.id }), // Include ID if editing
        project_code: finalProjectCode, // ✅ Use project_full_code if available
        project_sub_code: project?.project_sub_code || '',
        project_full_code: projectFullCode, // ✅ Use properly built project_full_code
        activity_name: activityName,
        activity_division: activityDivision || project?.responsible_division || '',
        // ✅ Zone Number - NOT from Division (Division is separate from Zone)
        // ✅ Zone should come from zoneNumber input or zone selection, NOT from responsible_division
        zone_number: zoneNumber || '0', // ✅ Do NOT use responsible_division as Zone - they are separate
        unit,
        planned_units: parseFloat(plannedUnits) || 0,
        planned_value: parseFloat(plannedValue) || 0,
        planned_activity_start_date: startDate,
        deadline: endDate,
        calendar_duration: duration,
        // ✅ Activity Timing fields - CRITICAL for KPI generation
        activity_timing: activityTiming, // ✅ Ensure this is set from form state
        has_value: hasValue !== undefined ? hasValue : true, // ✅ Ensure default value
        affects_timeline: affectsTimeline !== undefined ? affectsTimeline : false, // ✅ Ensure default value
        use_virtual_material: useVirtualMaterial !== undefined ? useVirtualMaterial : false, // ✅ Use Virtual Material
        project_full_name: project?.project_name || '',
        project_status: project?.project_status || 'upcoming',
        total_units: 0,
        actual_units: 0,
        total_drilling_meters: 0
      }
      
      // ✅ DEBUG: Log activityData to verify all fields
      console.log('📋 activityData created:', {
        activity_name: activityData.activity_name,
        activity_timing: activityData.activity_timing,
        has_value: activityData.has_value,
        affects_timeline: activityData.affects_timeline,
        use_virtual_material: activityData.use_virtual_material,
        project_code: activityData.project_code,
        project_sub_code: activityData.project_sub_code,
        project_full_code: activityData.project_full_code,
        planned_units: activityData.planned_units,
        planned_activity_start_date: activityData.planned_activity_start_date,
        deadline: activityData.deadline
      })
      
      // ✅ DEBUG: Log activity data to ensure all fields are present
      console.log('📋 Activity data for KPI generation:', {
        activity_name: activityData.activity_name,
        project_code: activityData.project_code,
        project_sub_code: activityData.project_sub_code,
        project_full_code: activityData.project_full_code,
        planned_units: activityData.planned_units,
        planned_activity_start_date: activityData.planned_activity_start_date,
        deadline: activityData.deadline,
        activity_division: activityData.activity_division,
        zone_number: activityData.zone_number || '0',
        unit: activityData.unit,
        activity_timing: activityData.activity_timing,
        has_value: activityData.has_value,
        affects_timeline: activityData.affects_timeline,
        use_virtual_material: activityData.use_virtual_material
      })
      
      // Save custom activity if it's new
      const isCustomActivity = !ACTIVITY_TEMPLATES.find(
        t => t.name.toLowerCase() === activityName.toLowerCase()
      )
      
      if (isCustomActivity && activityName && unit && project?.responsible_division) {
        await saveCustomActivity(
          activityName, 
          project.responsible_division, 
          unit, 
          duration
        )
        console.log('💾 Saved custom activity:', activityName)
      }
      
      // Submit the activity
      await onSubmit(activityData)
      
      console.log('========================================')
      console.log('🔍 KPI Generation/Update Check:')
      console.log('  - Mode:', activity ? 'EDIT' : 'CREATE')
      console.log('  - autoGenerateKPIs:', autoGenerateKPIs)
      console.log('  - kpiPreview:', kpiPreview)
      console.log('  - kpiPreview.kpis count:', kpiPreview?.kpis?.length || 0)
      console.log('========================================')
      
      // Handle KPIs based on mode (Create vs Update)
      console.log('🔍 KPI Generation Check:', {
        autoGenerateKPIs,
        hasKpiPreview: !!kpiPreview,
        kpiCount: kpiPreview?.kpis?.length || 0,
        kpiPreviewData: kpiPreview ? 'Available' : 'Missing',
        activityTiming,
        hasValue,
        affectsTimeline
      })
      
      // ✅ Post-completion KPI logic
      const shouldSkipKPIGeneration = activityTiming === 'post-completion' && !hasValue && !affectsTimeline
      
      if (shouldSkipKPIGeneration) {
        console.log('⚠️ Post-completion activity with no value and no timeline impact - skipping KPI generation')
        
        // ✅ EDIT MODE: If editing and switching to post-completion, delete existing KPIs
        if (activity && autoGenerateKPIs) {
          console.log('🗑️ Activity changed to post-completion - deleting existing KPIs...')
          const { updateExistingKPIs } = await import('@/lib/autoKPIGenerator')
          // Pass empty activity data to trigger deletion of all KPIs
          const deleteResult = await updateExistingKPIs(activityData, activity.activity_description || '', workdaysConfig)
          
          if (deleteResult.success) {
            setSuccess(`✅ Activity updated! ${deleteResult.deletedCount || 0} KPIs removed (post-completion activity).`)
            console.log(`✅ KPI Deletion: Deleted=${deleteResult.deletedCount || 0} KPIs`)
          } else {
            setSuccess('✅ Activity updated successfully!')
          }
        } else {
          setSuccess(activity ? '✅ Post-completion activity updated successfully!' : '✅ Post-completion activity created successfully!')
        }
      } else if (autoGenerateKPIs || (activity && useVirtualMaterial !== activity.use_virtual_material)) {
        // ✅ ALWAYS update/create KPIs when:
        // 1. autoGenerateKPIs is enabled, OR
        // 2. use_virtual_material has changed (even if autoGenerateKPIs is disabled)
        if (activity) {
          // ✅ SPECIAL CASE: If only use_virtual_material changed (and autoGenerateKPIs is disabled),
          // we still need to update KPIs to refresh the Virtual Value column in KPI page
          const onlyVirtualMaterialChanged = !autoGenerateKPIs && useVirtualMaterial !== activity.use_virtual_material
          
          if (onlyVirtualMaterialChanged) {
            console.log('🔄 Only use_virtual_material changed - updating KPIs to refresh Virtual Value column...')
          }
          // ✅ EDIT MODE: Always update existing KPIs when any field changes
          console.log('🔄 UPDATING KPIs for existing activity (any change triggers update)...')
          console.log('📦 Activity to update:', {
            id: activity.id,
            old_activity_name: activity.activity_description || '', // ✅ OLD name
            new_activity_name: activityData.activity_name, // ✅ NEW name
            old_timing: activity.activity_timing,
            new_timing: activityData.activity_timing,
            project_full_code: activityData.project_full_code,
            planned_units: activityData.planned_units,
            start_date: activityData.planned_activity_start_date,
            end_date: activityData.deadline
          })
          
          // ✅ Always update KPIs - generate fresh KPIs based on current form data
          console.log('🔄 Generating fresh KPIs from updated activity data...')
          
          // ✅ FIX: Ensure activity_timing is set before generating KPIs
          if (!activityData.activity_timing) {
            console.warn('⚠️ Activity Timing is missing in activityData, using form value:', activityTiming)
            activityData.activity_timing = activityTiming || 'post-commencement'
          }
          
          // ✅ FIX: Ensure has_value and affects_timeline are set
          if (activityData.has_value === undefined) {
            activityData.has_value = hasValue !== undefined ? hasValue : true
          }
          if (activityData.affects_timeline === undefined) {
            activityData.affects_timeline = affectsTimeline !== undefined ? affectsTimeline : false
          }
          if (activityData.use_virtual_material === undefined) {
            activityData.use_virtual_material = useVirtualMaterial !== undefined ? useVirtualMaterial : false
          }
          
          console.log('📋 Activity data for KPI update:', {
            activity_name: activityData.activity_name,
            activity_timing: activityData.activity_timing,
            has_value: activityData.has_value,
            affects_timeline: activityData.affects_timeline,
            use_virtual_material: activityData.use_virtual_material
          })
          
          const { generateKPIsFromBOQ } = await import('@/lib/autoKPIGenerator')
          const freshKPIs = await generateKPIsFromBOQ(activityData, workdaysConfig)
          
          if (freshKPIs && freshKPIs.length > 0) {
            console.log(`✅ Generated ${freshKPIs.length} fresh KPIs from updated data`)
            // ✅ UPDATE MODE: Update existing KPIs with fresh data
            const updateResult = await updateExistingKPIs(activityData, activity.activity_description || '', workdaysConfig)
            
            if (updateResult.success) {
              setSuccess(`✅ Activity updated! ${updateResult.message}`)
              console.log(`✅ KPI Update: Updated=${updateResult.updatedCount}, Added=${updateResult.addedCount}, Deleted=${updateResult.deletedCount}`)
            } else {
              console.error('❌ KPI update failed:', updateResult.message)
              setSuccess('⚠️ Activity updated but KPI sync failed: ' + updateResult.message)
            }
          } else {
            console.warn('⚠️ No KPIs generated from updated data - may be invalid dates or no workdays')
            // Still try to update existing KPIs (they might need to be deleted if timing changed)
            const updateResult = await updateExistingKPIs(activityData, activity.activity_description || '', workdaysConfig)
            if (updateResult.success) {
              setSuccess(`✅ Activity updated! ${updateResult.message}`)
              
              // ✅ Trigger page refresh to update Virtual Value column in KPI page
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('boq-activity-updated', { 
                  detail: { 
                    activityId: activity.id,
                    activityName: activityData.activity_name,
                    projectFullCode: activityData.project_full_code,
                    useVirtualMaterial: activityData.use_virtual_material
                  } 
                }))
                console.log('📢 Dispatched boq-activity-updated event to refresh KPI page activities')
              }
            } else {
              setSuccess('✅ Activity updated successfully!')
            }
          }
        } else {
          // ✅ CREATE MODE: Create new KPIs
          console.log('🚀 CREATING new KPIs...')
          console.log('🔍 CREATE MODE - Initial state:', {
            hasKpiPreview: !!kpiPreview,
            kpiPreviewCount: kpiPreview?.kpis?.length || 0,
            activityTiming: activityTiming,
            activityData_timing: activityData.activity_timing,
            autoGenerateKPIs: autoGenerateKPIs,
            plannedUnits: activityData.planned_units,
            startDate: activityData.planned_activity_start_date,
            endDate: activityData.deadline
          })
          
          // Use preview if available, otherwise generate on the fly
          let kpisToSave = kpiPreview?.kpis || []
          
          console.log('🔍 After getting preview:', {
            kpisToSaveLength: kpisToSave.length,
            willGenerate: kpisToSave.length === 0
          })
          
          if (kpisToSave.length === 0) {
            console.log('🔄 No preview available, generating KPIs on the fly...')
            console.log('📋 Activity data BEFORE fixes:', {
              activity_name: activityData.activity_name,
              activity_timing: activityData.activity_timing,
              has_value: activityData.has_value,
              affects_timeline: activityData.affects_timeline,
              use_virtual_material: activityData.use_virtual_material,
              planned_units: activityData.planned_units,
              planned_activity_start_date: activityData.planned_activity_start_date,
              deadline: activityData.deadline,
              project_code: activityData.project_code,
              project_full_code: activityData.project_full_code
            })
            
            // ✅ FIX: Ensure activity_timing is set before generating KPIs
            if (!activityData.activity_timing) {
              console.warn('⚠️ Activity Timing is missing in activityData, using form value:', activityTiming)
              activityData.activity_timing = activityTiming || 'post-commencement'
            }
            
            // ✅ FIX: Ensure has_value and affects_timeline are set
            if (activityData.has_value === undefined) {
              activityData.has_value = hasValue !== undefined ? hasValue : true
            }
            if (activityData.affects_timeline === undefined) {
              activityData.affects_timeline = affectsTimeline !== undefined ? affectsTimeline : false
            }
            if (activityData.use_virtual_material === undefined) {
              activityData.use_virtual_material = useVirtualMaterial !== undefined ? useVirtualMaterial : false
            }
            
            // ✅ CRITICAL: Ensure all required fields are present
            if (!activityData.planned_activity_start_date || !activityData.deadline) {
              console.error('❌ CRITICAL ERROR: Missing dates!', {
                planned_activity_start_date: activityData.planned_activity_start_date,
                deadline: activityData.deadline,
                startDate: startDate,
                endDate: endDate
              })
            }
            
            if (!activityData.planned_units || activityData.planned_units <= 0) {
              console.error('❌ CRITICAL ERROR: Missing or invalid planned_units!', {
                planned_units: activityData.planned_units,
                plannedUnits: plannedUnits
              })
            }
            
            console.log('📋 Activity data AFTER fixes:', {
              activity_name: activityData.activity_name,
              activity_timing: activityData.activity_timing,
              has_value: activityData.has_value,
              affects_timeline: activityData.affects_timeline,
              use_virtual_material: activityData.use_virtual_material,
              planned_units: activityData.planned_units,
              planned_activity_start_date: activityData.planned_activity_start_date,
              deadline: activityData.deadline,
              project_code: activityData.project_code,
              project_full_code: activityData.project_full_code
            })
            
            console.log('🔧 Calling generateKPIsFromBOQ with:', {
              activity_name: activityData.activity_name,
              activity_timing: activityData.activity_timing,
              planned_units: activityData.planned_units,
              start_date: activityData.planned_activity_start_date,
              end_date: activityData.deadline
            })
            
            const { generateKPIsFromBOQ } = await import('@/lib/autoKPIGenerator')
            kpisToSave = await generateKPIsFromBOQ(activityData, workdaysConfig)
            
            console.log(`📊 Generated ${kpisToSave.length} KPIs (Activity Timing: ${activityData.activity_timing})`)
            
            // ✅ DEBUG: Log if no KPIs were generated for Pre Commencement
            if (kpisToSave.length === 0) {
              console.error('❌ ERROR: No KPIs generated!', {
                activity_name: activityData.activity_name,
                activity_timing: activityData.activity_timing,
                planned_units: activityData.planned_units,
                start_date: activityData.planned_activity_start_date,
                end_date: activityData.deadline,
                has_value: activityData.has_value,
                affects_timeline: activityData.affects_timeline,
                use_virtual_material: activityData.use_virtual_material,
                project_code: activityData.project_code,
                project_full_code: activityData.project_full_code
              })
              
              // ✅ Additional debugging for Pre Commencement
              if (activityData.activity_timing === 'pre-commencement') {
                console.error('❌ CRITICAL: Pre Commencement activity generated 0 KPIs!', {
                  activity_name: activityData.activity_name,
                  activity_timing: activityData.activity_timing,
                  planned_units: activityData.planned_units,
                  start_date: activityData.planned_activity_start_date,
                  end_date: activityData.deadline,
                  datesValid: activityData.planned_activity_start_date && activityData.deadline,
                  unitsValid: activityData.planned_units > 0
                })
              }
            } else {
              console.log('✅ SUCCESS: KPIs generated successfully!', {
                count: kpisToSave.length,
                activity_timing: activityData.activity_timing,
                firstKPI: kpisToSave[0] ? {
                  activity_timing: kpisToSave[0].activity_timing,
                  quantity: kpisToSave[0].quantity,
                  activity_date: kpisToSave[0].activity_date
                } : null
              })
            }
          } else {
            console.log('✅ Using preview KPIs:', {
              count: kpisToSave.length,
              activity_timing: kpisToSave[0]?.activity_timing || 'unknown'
            })
          }
          
          if (kpisToSave && kpisToSave.length > 0) {
            console.log(`📦 Saving ${kpisToSave.length} KPIs...`)
            console.log('📦 KPIs to save (sample):', JSON.stringify(kpisToSave.slice(0, 2), null, 2))
            
            // ✅ SET CREATED BY: Add user who created the KPIs
            const createdByValue = appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
            const result = await saveGeneratedKPIs(kpisToSave, true, createdByValue)
            console.log('✅ Setting created_by for generated KPIs:', createdByValue)
            
            // ✅ Show notification if default date was used
            if ((result as any).defaultDateUsed) {
              setError('⚠️ Warning: Some KPIs were created with default date (2025-12-31) because Activity Date was empty. Please verify activity dates.')
            }
            
            if (result.success) {
              const successMsg = (result as any).defaultDateUsed 
                ? `✅ Activity created with ${result.savedCount} KPI records! (Note: Some KPIs used default date)`
                : `✅ Activity created with ${result.savedCount} KPI records!`
              setSuccess(successMsg)
              console.log('✅ Created', result.savedCount, 'KPI records')
            } else {
              console.error('❌ KPI generation failed:', result.message)
              setSuccess('⚠️ Activity created but KPI generation failed: ' + result.message)
            }
          } else {
            console.warn('⚠️ No KPIs generated - may be invalid dates or no workdays')
            setSuccess('✅ Activity created successfully!')
          }
        }
      } else {
        console.warn('⚠️ Auto-generate KPIs is DISABLED - skipping KPI generation')
        setSuccess(activity ? '✅ Activity updated successfully!' : '✅ Activity created successfully!')
      }
      
      // ✅ Reset selected activities scopes after successful save
      setSelectedActivitiesScopes(new Set())
      
      // Close form after short delay to show success message
      setTimeout(() => {
        onCancel()
      }, 1500)
      
    } catch (err: any) {
      console.error('❌ Error submitting activity:', err)
      setError(err.message || 'An error occurred while saving the activity')
    } finally {
      setLoading(false)
    }
  }
  
  // ✅ CRITICAL: Form is only valid if project has zones defined
  const isFormValid = projectCode && 
                     activityName && 
                     unit && 
                     startDate && 
                     endDate && 
                     hasProjectZones && // ✅ Require zones to be defined
                     availableZones.length > 0 // ✅ Require at least one zone
  const canPreviewKPIs = isFormValid && plannedUnits && parseFloat(plannedUnits) > 0
  
  return (
    <>
      {/* Main Form Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <ModernCard className="w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activity ? '✏️ Edit BOQ Activity' : '✨ Smart BOQ Activity Creator'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Intelligent form with auto-suggestions and KPI generation
                  </p>
                </div>
              </div>
              <button 
                onClick={onCancel} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Alerts */}
          {error && (
            <Alert variant="error" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </Alert>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Project Selection */}
            <div className="relative project-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                disabled={loading || projectLoading}
                className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex items-center justify-between ${
                  loading || projectLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'
                }`}
              >
                <span className={project ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {projectLoading ? 'Loading projects...' : project ? (() => {
                    // ✅ Use project_full_code if available, otherwise build from project_code and project_sub_code
                    const projectFullCode = project.project_full_code || (() => {
                      const projectCode = (project.project_code || '').trim()
                      const projectSubCode = (project.project_sub_code || '').trim()
                      if (projectSubCode) {
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
                    })()
                    return `${projectFullCode} - ${project.project_name}`
                  })() : 'Select a project...'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showProjectDropdown && (
                <div 
                  className="absolute w-full z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
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
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map((proj) => {
                        // ✅ Build full project code (e.g., P5066-R1 instead of just P5066)
                        const projectCode = (proj.project_code || '').trim()
                        const projectSubCode = (proj.project_sub_code || '').trim()
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
                        
                        return (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => handleProjectSelect(proj)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                              projectCode === proj.project_code ? 'bg-blue-100 dark:bg-blue-900/30 font-medium' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {projectFullCode}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {proj.project_name}
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No projects found
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Hidden input for form validation */}
              <input
                type="hidden"
                value={projectCode}
                required
              />
              
              {/* ✅ Project Info Card - Show immediately after project selection */}
              {project && (
                <>
                  <ModernCard className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {project.project_name}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <ModernBadge variant="info" size="sm">
                            {project.responsible_division}
                          </ModernBadge>
                          <ModernBadge variant="purple" size="sm">
                            {project.project_type}
                          </ModernBadge>
                          {project.project_status && (
                            <ModernBadge 
                              variant={(project.project_status as string) === 'on-going' ? 'success' : 'gray'} 
                              size="sm"
                            >
                              {project.project_status}
                            </ModernBadge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          📊 Project activities will be loaded automatically
                        </div>
                      </div>
                    </div>
                  </ModernCard>
                  
                  {/* ✅ CRITICAL: Zone Validation Warning */}
                  {project && !hasProjectZones && (
                    <Alert variant="error" className="mt-3">
                      <AlertCircle className="h-5 w-5" />
                      <div className="ml-3">
                        <p className="font-semibold text-red-900 dark:text-red-200">
                          ⚠️ Project Zones Required
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                          This project does not have zones defined in Project Zones Management.
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                          <strong>You cannot create activities for this project until zones are added.</strong>
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                          Please go to <strong>"Project Zones Management"</strong> and add zones for project <strong>{project.project_full_code || project.project_code}</strong> before creating activities.
                        </p>
                      </div>
                    </Alert>
                  )}
                  
                  {/* ✅ Success: Zones Available */}
                  {project && hasProjectZones && availableZones.length > 0 && (
                    <Alert variant="success" className="mt-3">
                      <CheckCircle2 className="h-5 w-5" />
                      <div className="ml-3">
                        <p className="font-semibold text-green-900 dark:text-green-200">
                          ✅ Project Zones Available
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                          This project has {availableZones.length} zone{availableZones.length !== 1 ? 's' : ''} defined: {availableZones.slice(0, 3).join(', ')}{availableZones.length > 3 ? ` +${availableZones.length - 3} more` : ''}
                        </p>
                      </div>
                    </Alert>
                  )}
                </>
              )}
            </div>
            
            {/* Activity Name with Suggestions */}
            <div className="relative activity-dropdown-container">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {/* Only show project info and buttons after activity is selected */}
                  {activitySelected && project?.project_type && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      📁 {project.project_type}
                    </span>
                  )}
                  {activitySelected && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔘 Manual dropdown trigger clicked')
                        const newState = !showActivityDropdown
                        setShowActivityDropdown(newState)
                        console.log(newState ? '🔓 Activity dropdown opened manually' : '🔒 Activity dropdown closed manually')
                      }}
                      className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      disabled={loading}
                    >
                      {showActivityDropdown ? '🔼 Hide' : '🔽 Show'} All System Activities ({activitySuggestions.length})
                    </button>
                  )}
                </div>
              </div>
              <Input 
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value)
                  setShowActivityDropdown(true)
                  console.log('✏️ Activity name changed, showing filtered suggestions')
                }}
                onFocus={() => {
                  console.log('🎯 Activity name focused, showing suggestions for:', project?.project_type)
                  console.log('📊 Current state:', {
                    activitySuggestions: activitySuggestions.length,
                    showDropdown: showActivityDropdown,
                    projectType: project?.project_type
                  })
                  setShowActivityDropdown(true)
                  console.log('🔓 Activity dropdown opened')
                }}
                placeholder="Type activity name or select from suggestions..."
                required
                disabled={loading}
              />
              
              {/* Activity Suggestions Dropdown */}
              {showActivityDropdown && (
                activitySuggestions.length > 0 ? (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          💡 All activities from all scopes ({allLoadedActivities.length} total, {activitySuggestions.length} shown)
                        </p>
                        {project?.project_type && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Project scopes: <strong>{project.project_type}</strong>
                          </p>
                        )}
                        {selectedActivitiesScopes.size > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Selected scopes: <strong>{Array.from(selectedActivitiesScopes).join(', ')}</strong>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowActivityDropdown(false)}
                        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Close dropdown"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* ✅ Scope Filter - Optional filtering for easier browsing */}
                    {availableScopes.length > 0 && (
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Filter by Scope (optional):</label>
                          <select
                            value={selectedScopeFilter}
                            onChange={(e) => handleScopeFilterChange(e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                          >
                            <option value="all">All Scopes ({allLoadedActivities.length})</option>
                            {availableScopes.map(scope => {
                              const scopeCount = allLoadedActivities.filter(act => act.division === scope).length
                              return (
                                <option key={scope} value={scope}>
                                  {scope} ({scopeCount})
                                </option>
                              )
                            })}
                          </select>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            📊 {getFilteredActivities().length} shown
                          </span>
                        </div>
                      </div>
                    )}
                    
                  </div>
                  {getFilteredActivities()
                    .map((act, idx) => {
                      const isSelected = activityName.toLowerCase() === act.name.toLowerCase()
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleActivitySelect(act)}
                          className={`w-full px-4 py-2 text-left transition-colors flex items-center justify-between group ${
                            isSelected 
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500' 
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white font-medium">{act.name}</span>
                              {isSelected && (
                                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">Selected</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {act.division} • {act.category || 'General'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600">
                              {act.unit}
                            </span>
                            <span className="text-xs text-gray-400">
                              {act.usage_count} uses
                            </span>
                          </div>
                        </button>
                      )
                    })
                  }
                </div>
                ) : (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ⚠️ No activities found
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Loading activities... Please wait or try refreshing.
                      </p>
                        <button
                          type="button"
                          onClick={async () => {
                            console.log('🔄 Reloading activities manually')
                            try {
                              const activities = await getAllActivities()
                              setActivitySuggestions(activities)
                            } catch (error) {
                              console.error('Error reloading activities:', error)
                              // Fallback to templates
                              const fallbackActivities = ACTIVITY_TEMPLATES.map(template => ({
                                id: template.name,
                                name: template.name,
                                division: template.division,
                                unit: template.defaultUnit,
                                category: template.category,
                                is_active: true,
                                usage_count: 0,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                              }))
                              setActivitySuggestions(fallbackActivities)
                            }
                          }}
                        className="mt-2 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        🔄 Reload Activities
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
            
            {/* Unit with Suggestions */}
            <div className="relative unit-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <Input 
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value)
                  setShowUnitDropdown(true)
                }}
                onFocus={() => setShowUnitDropdown(true)}
                placeholder="e.g., Running Meter, Sq.M, No., etc."
                required
                disabled={loading}
              />
              
              {/* Unit Suggestions Dropdown */}
              {showUnitDropdown && unitSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      📏 Common units
                    </p>
                  </div>
                  {unitSuggestions
                    .filter(u => 
                      unit === '' || 
                      u.toLowerCase().includes(unit.toLowerCase())
                    )
                    .map((u, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUnitSelect(u)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-900 dark:text-white"
                      >
                        {u}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            
            {/* ✅ Division Field - Linked to Divisions Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  Division <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                value={activityDivision}
                onChange={(e) => setActivityDivision(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                disabled={loading}
              >
                <option value="">
                  {availableDivisions.length === 0 ? 'Loading divisions...' : 'Select Division...'}
                </option>
                {availableDivisions.map((division) => (
                  <option key={division.id || division.name} value={division.name}>
                    {division.name} {division.code ? `(${division.code})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 Division is automatically detected from the selected project. Select from Divisions Management or modify if needed.
              </p>
            </div>

            {/* Zone Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Zone Number - Dropdown for selecting zone */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🔢</span>
                    Zone Number <span className="text-red-500">*</span>
                  </span>
                </label>
                {projectCode ? (
                  availableZones.length > 0 ? (
                    <div className="relative">
                      <select
                        value={zoneNumber}
                        onChange={(e) => {
                          const selectedZone = e.target.value
                          if (selectedZone) {
                            setZoneNumber(selectedZone || '0')
                          } else {
                            setZoneNumber('0')
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                      >
                        <option value="">Select Zone...</option>
                        {availableZones.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Zones from Project Zones Management
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">No Zones Available</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                        No zones defined for this project.
                      </p>
                      <PermissionGuard permission="projects.zones">
                        <a 
                          href="/projects/zones" 
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                        >
                          Manage Zones →
                        </a>
                      </PermissionGuard>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Select a project to view zones
                    </p>
                  </div>
                )}
              </div>
              
            </div>

            {/* Zone Info Card */}
            {zoneNumber && zoneNumber !== '0' && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-lg">🏗️</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Zone Information
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div><span className="font-medium">Zone Number:</span> {zoneNumber}</div>
                      {projectCode && (
                        <div className="col-span-2"><span className="font-medium">Project:</span> {projectCode}</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 This zone will be used for tracking and analytics
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Activity Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Timing <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    activityTiming === 'pre-commencement' 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-orange-300'
                  }`}
                  onClick={() => setActivityTiming('pre-commencement')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      activityTiming === 'pre-commencement' 
                        ? 'border-orange-500 bg-orange-500' 
                        : 'border-gray-300'
                    }`}>
                      {activityTiming === 'pre-commencement' && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Pre-commencement</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Activities that must be completed before project start
                      </p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    activityTiming === 'post-commencement' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                  onClick={() => setActivityTiming('post-commencement')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      activityTiming === 'post-commencement' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {activityTiming === 'post-commencement' && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Post-commencement</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Activities that start with or after project start
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    activityTiming === 'post-completion' 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
                  }`}
                  onClick={() => setActivityTiming('post-completion')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      activityTiming === 'post-completion' 
                        ? 'border-red-500 bg-red-500' 
                        : 'border-gray-300'
                    }`}>
                      {activityTiming === 'post-completion' && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Post-completion</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Activities that occur after project completion
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {activityTiming === 'pre-commencement' && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        ⚠️ Pre-commencement Activity
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        This activity must be completed before the project start date. 
                        Make sure the end date is before the project commencement date.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ Use Virtual Material - Available for ALL Activity Types */}
              <div className="mt-3">
                <ModernCard className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="use-virtual-material" 
                        checked={useVirtualMaterial}
                        onChange={(e) => setUseVirtualMaterial(e.target.checked)}
                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 dark:focus:ring-teal-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        disabled={loading}
                      />
                      <label htmlFor="use-virtual-material" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        📦 Use Virtual Material
                      </label>
                    </div>
                    <ModernBadge variant={useVirtualMaterial ? "success" : "info"} size="sm">
                      {useVirtualMaterial ? "Enabled" : "Disabled"}
                    </ModernBadge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-7">
                    Check to auto-generate KPIs and use Virtual Material Value from project in KPI calculations
                  </p>
                </ModernCard>
              </div>

              {activityTiming === 'post-completion' && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          🔧 Post-completion Activity
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          This activity occurs after project completion. Usually involves dismantling, 
                          cleanup, or maintenance work. May not have monetary value and typically 
                          doesn't affect project timeline.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Post-completion Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ModernCard className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="has-value" 
                            checked={hasValue}
                            onChange={(e) => setHasValue(e.target.checked)}
                            className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 dark:focus:ring-amber-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={loading}
                          />
                          <label htmlFor="has-value" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            💰 Has Monetary Value
                          </label>
                        </div>
                        <ModernBadge variant={hasValue ? "success" : "warning"} size="sm">
                          {hasValue ? "Valued" : "No Value"}
                        </ModernBadge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-7">
                        Check if this activity has monetary value and should be included in project calculations
                      </p>
                    </ModernCard>

                    <ModernCard className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="affects-timeline" 
                            checked={affectsTimeline}
                            onChange={(e) => setAffectsTimeline(e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={loading}
                          />
                          <label htmlFor="affects-timeline" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            ⏰ Affects Project Timeline
                          </label>
                        </div>
                        <ModernBadge variant={affectsTimeline ? "warning" : "info"} size="sm">
                          {affectsTimeline ? "Timeline Impact" : "No Impact"}
                        </ModernBadge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-7">
                        Check if this activity affects the overall project timeline and should be tracked
                      </p>
                    </ModernCard>
                  </div>
                </div>
              )}
            </div>
            
            {/* Planned Units and Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Units {autoGenerateKPIs && <span className="text-red-500">*</span>}
                </label>
                <Input 
                  type="number" 
                  step="1"
                  min="0"
                  value={plannedUnits}
                  onChange={(e) => setPlannedUnits(e.target.value)}
                  placeholder={autoGenerateKPIs ? "Enter quantity (> 0 for KPIs)" : "0 (can update later)"}
                  disabled={loading}
                  className={autoGenerateKPIs && (!plannedUnits || parseFloat(plannedUnits) <= 0) ? 'border-2 border-amber-400' : ''}
                />
                {autoGenerateKPIs && (!plannedUnits || parseFloat(plannedUnits) <= 0) ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Required for KPI auto-generation! Enter a value greater than 0</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Can be 0 if you want to update it later (KPIs won't be generated)
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Value (Optional)
                </label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={plannedValue}
                  onChange={(e) => setPlannedValue(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💰 Total budget/cost
                </p>
              </div>
            </div>
            
            {/* Dates and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={loading}
                  min={startDate}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (Working Days)
                </label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={duration}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-700 cursor-not-allowed pr-10"
                    disabled
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  🗓️ Auto-calculated
                </p>
              </div>
            </div>
            
            {/* Compressed Project Option */}
            <ModernCard className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="include-weekends" 
                    checked={includeWeekends}
                    onChange={(e) => setIncludeWeekends(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    disabled={loading}
                  />
                  <label htmlFor="include-weekends" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    🚀 Compressed Project (Include Weekends)
                  </label>
                </div>
                <ModernBadge variant="warning" size="sm" icon={<Info className="h-3 w-3" />}>
                  Sunday = Weekend
                </ModernBadge>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-7">
                Enable this for urgent projects that work 7 days a week
              </p>
            </ModernCard>
            
            {/* KPI Auto-Generation Section */}
            <ModernCard className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3 mb-3">
                <input 
                  type="checkbox" 
                  id="auto-kpi" 
                  checked={autoGenerateKPIs}
                  onChange={(e) => setAutoGenerateKPIs(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  disabled={loading}
                />
                <div className="flex-1">
                  <label htmlFor="auto-kpi" className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Auto-Generate Daily KPI Records
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Automatically create planned KPI records distributed evenly across working days
                  </p>
                </div>
              </div>
              
              {/* KPI Preview Status */}
              {autoGenerateKPIs && !canPreviewKPIs && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">
                        ⚠️ Complete the form to generate KPIs:
                      </p>
                      <ul className="list-none space-y-1.5">
                        {!projectCode && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Select a project</span>
                          </li>
                        )}
                        {!activityName && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter activity name</span>
                          </li>
                        )}
                        {!unit && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter unit</span>
                          </li>
                        )}
                        {!startDate && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter start date</span>
                          </li>
                        )}
                        {!endDate && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter end date</span>
                          </li>
                        )}
                        {(!plannedUnits || parseFloat(plannedUnits) <= 0) && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-bold text-amber-700 dark:text-amber-300">Enter planned units (must be {'>'}  0)</span>
                          </li>
                        )}
                        {/* ✅ CRITICAL: Zone validation */}
                        {project && (!hasProjectZones || availableZones.length === 0) && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-bold text-red-700 dark:text-red-300">
                              Project must have zones defined in Project Zones Management
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* KPI Preview Ready */}
              {autoGenerateKPIs && kpiPreview && kpiPreview.summary.numberOfDays > 0 && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ✨ {kpiPreview.summary.numberOfDays} KPI records ready to be created
                      </p>
                    </div>
                    <ModernButton 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowKPITable(true)}
                      icon={<Calendar className="h-3 w-3" />}
                    >
                      View Details
                    </ModernButton>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Quantity</p>
                      <p className="text-lg font-bold text-green-600">
                        {kpiPreview.summary.totalQuantity}
                      </p>
                      <p className="text-xs text-gray-500">{unit || 'units'}</p>
                    </div>
                    
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Avg Per Day</p>
                      <p className="text-lg font-bold text-blue-600">
                        {kpiPreview.summary.hasDecimalAverage ? (
                          <span>{kpiPreview.summary.minAveragePerDay} - {kpiPreview.summary.maxAveragePerDay}</span>
                        ) : (
                          <span>{kpiPreview.summary.averagePerDay}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{unit || 'units'}/day</p>
                    </div>
                    
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Working Days</p>
                      <p className="text-lg font-bold text-purple-600">
                        {kpiPreview.summary.numberOfDays}
                      </p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>Note:</strong> All quantities are rounded to whole numbers. Total quantity = {kpiPreview.summary.totalQuantity} {unit} (exactly matches Planned Units)
                  </div>
                  
                  {/* ✅ Display Holidays Information */}
                  {holidaysInRange.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
                            📅 Holidays Excluded ({holidaysInRange.length}):
                          </p>
                          <div className="space-y-1">
                            {holidaysInRange.map((holiday, idx) => {
                              const holidayDate = new Date(holiday.date)
                              const formattedDate = holidayDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                              return (
                                <div key={holiday.id || idx} className="text-xs text-amber-700 dark:text-amber-400">
                                  <span className="font-medium">• {holiday.name}</span>
                                  <span className="text-amber-600 dark:text-amber-500 ml-2">
                                    ({formattedDate}{holiday.is_recurring ? ' - Recurring' : ''})
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* KPI Generation Error */}
              {autoGenerateKPIs && kpiGenerationStatus === 'error' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p className="font-medium">Failed to generate KPI preview</p>
                      <p className="mt-1">Please check your dates and try again</p>
                    </div>
                  </div>
                </div>
              )}
            </ModernCard>
            
            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ModernButton 
                type="submit" 
                variant="gradient" 
                loading={loading}
                disabled={!isFormValid}
                className="flex-1"
              >
                {activity ? '💾 Update Activity' : '✨ Create Activity'}
                {autoGenerateKPIs && kpiPreview && ` + ${kpiPreview.summary.numberOfDays} KPIs`}
              </ModernButton>
              
              <ModernButton 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </ModernButton>
            </div>
          </form>
        </ModernCard>
      </div>
      
      {/* KPI Preview Table Modal */}
      {showKPITable && kpiPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <ModernCard className="w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    📊 KPI Preview - {kpiPreview.summary.numberOfDays} Daily Records
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activityName} • Total: {kpiPreview.summary.totalQuantity} {unit}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowKPITable(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Quantity</p>
                <p className="text-2xl font-bold text-green-600">{kpiPreview.summary.totalQuantity}</p>
                <p className="text-xs text-gray-500">{unit}</p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Average Per Day</p>
                <p className="text-2xl font-bold text-blue-600">
                  {kpiPreview.summary.hasDecimalAverage ? (
                    <span>{kpiPreview.summary.minAveragePerDay} - {kpiPreview.summary.maxAveragePerDay}</span>
                  ) : (
                    <span>{kpiPreview.summary.averagePerDay}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{unit}/day</p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Working Days</p>
                <p className="text-2xl font-bold text-purple-600">{kpiPreview.summary.numberOfDays}</p>
                <p className="text-xs text-gray-500">days</p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Date Range</p>
                <p className="text-sm font-bold text-amber-600">
                  {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
                  to {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            {/* ✅ Display Holidays Information in Modal */}
            {holidaysInRange.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                      📅 Holidays Excluded from Working Days ({holidaysInRange.length}):
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {holidaysInRange.map((holiday, idx) => {
                        const holidayDate = new Date(holiday.date)
                        const formattedDate = holidayDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          weekday: 'short'
                        })
                        return (
                          <div key={holiday.id || idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-700">
                            <div className="flex-1">
                              <span className="font-medium text-amber-800 dark:text-amber-300">{holiday.name}</span>
                              <span className="text-xs text-amber-600 dark:text-amber-500 ml-2">
                                {formattedDate}
                                {holiday.is_recurring && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs">
                                    Recurring
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* KPI Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Day</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Unit</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Division</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {kpiPreview.kpis.map((kpi: any, index: number) => {
                    // Debug: Log KPI data structure
                    if (index === 0) {
                      console.log('🔍 KPI Data Structure:', kpi)
                      console.log('🔍 Available date fields:', {
                        target_date: kpi.target_date,
                        activity_date: kpi.activity_date,
                        'Target Date': kpi['Target Date'],
                        date: kpi.date
                      })
                    }
                    
                    // Fix date parsing - try multiple possible date fields
                    const dateValue = kpi.target_date || kpi.activity_date || kpi['Target Date'] || kpi.date
                    const date = new Date(dateValue)
                    const isValidDate = !isNaN(date.getTime())
                    
                    const dayName = isValidDate ? date.toLocaleDateString('en-US', { weekday: 'long' }) : 'Invalid Date'
                    const isWeekend = isValidDate ? date.getDay() === 0 : false
                    const isToday = isValidDate ? date.toDateString() === new Date().toDateString() : false
                    
                    return (
                      <tr 
                        key={index}
                        className={`
                          ${isWeekend && includeWeekends ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                          ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                          hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                        `}
                      >
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {isValidDate ? date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) : 'Invalid Date'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {dayName}
                          {isWeekend && <span className="ml-2 text-xs text-amber-600">⚠️ Weekend</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                          {kpi.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {kpi.unit}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {activityDivision || project?.responsible_division || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <ModernBadge variant="info" size="sm">
                            Planned
                          </ModernBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 text-lg">
                      {kpiPreview.summary.totalQuantity}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                      {unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                      {/* Division column in footer */}
                    </td>
                    <td className="px-4 py-3">
                      <ModernBadge variant="success" size="sm" icon={<CheckCircle2 className="h-3 w-3" />}>
                        Verified
                      </ModernBadge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Table Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                💡 All quantities are whole numbers. Total = {kpiPreview.summary.totalQuantity} {unit} (exactly matches Planned Units)
              </p>
              <ModernButton 
                type="button" 
                variant="primary" 
                onClick={() => setShowKPITable(false)}
              >
                Close Preview
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}
    </>
  )
}

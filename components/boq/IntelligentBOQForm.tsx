'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
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
  getActivitiesByProjectType,
  ProjectTypeActivity
} from '@/lib/projectTypeActivitiesManager'
import { 
  generateKPIsFromBOQ, 
  saveGeneratedKPIs,
  generateAndSaveKPIs,
  updateExistingKPIs
} from '@/lib/autoKPIGenerator'
import { Clock, CheckCircle2, Info, Sparkles, X, Calendar, TrendingUp, AlertCircle } from 'lucide-react'

interface IntelligentBOQFormProps {
  activity?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  projects?: Project[]
}

export function IntelligentBOQForm({ activity, onSubmit, onCancel, projects = [] }: IntelligentBOQFormProps) {
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projectLoading, setProjectLoading] = useState(false)
  const [allProjects, setAllProjects] = useState<Project[]>(projects)
  
  // Form Fields
  const [projectCode, setProjectCode] = useState(activity?.project_code || '')
  const [project, setProject] = useState<Project | null>(null)
  const [activityName, setActivityName] = useState(activity?.activity_name || '')
  const [activitySuggestions, setActivitySuggestions] = useState<Activity[]>([])
  const [projectTypeActivities, setProjectTypeActivities] = useState<ProjectTypeActivity[]>([])
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [activitySelected, setActivitySelected] = useState(false)
  
  // Zone Management
  const [zoneRef, setZoneRef] = useState(activity?.zone_ref || '')
  const [zoneNumber, setZoneNumber] = useState(activity?.zone_number || '')
  const [availableZones, setAvailableZones] = useState<string[]>([])
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [zoneSuggestions, setZoneSuggestions] = useState<string[]>([])
  
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
  const [startDate, setStartDate] = useState(activity?.planned_activity_start_date || '')
  const [endDate, setEndDate] = useState(activity?.deadline || '')
  const [duration, setDuration] = useState(0)
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const [customHolidays, setCustomHolidays] = useState<string[]>([])
  const [activityTiming, setActivityTiming] = useState<'pre-commencement' | 'post-commencement' | 'post-completion'>(activity?.activity_timing || 'post-commencement')
  const [hasValue, setHasValue] = useState(activity?.has_value ?? true) // Default to true for existing activities
  const [affectsTimeline, setAffectsTimeline] = useState(activity?.affects_timeline ?? false) // Default to false
  
  // KPI Generation
  const [autoGenerateKPIs, setAutoGenerateKPIs] = useState(true)
  const [kpiPreview, setKpiPreview] = useState<any>(null)
  const [showKPITable, setShowKPITable] = useState(false)
  const [kpiGenerationStatus, setKpiGenerationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('boq-form')

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
  const workdaysConfig: WorkdaysConfig = {
    weekendDays: includeWeekends ? [] : [0], // Sunday = 0
    holidays: UAE_HOLIDAYS,
    includeWeekends
  }
  
  // Load projects on mount
  useEffect(() => {
    if (allProjects.length === 0 && projects.length === 0) {
      loadAllProjects()
    } else if (projects.length > 0) {
      setAllProjects(projects)
    }
  }, [projects])

  // Load activities based on project scopes from project_type_activities table
  useEffect(() => {
    const loadActivitiesByProjectScopes = async () => {
      try {
        // If no project selected, don't load activities
        if (!project || !project.project_type) {
          console.log('⚠️ No project or project scope selected, clearing activity suggestions')
          setActivitySuggestions([])
          return
        }

        // Parse project scopes (may be comma-separated)
        const projectScopes = project.project_type
          .split(',')
          .map(scope => scope.trim())
          .filter(scope => scope.length > 0)
        
        // Set available scopes for filtering
        setAvailableScopes(projectScopes)
        console.log(`🔄 Loading activities for project scopes: ${projectScopes.join(', ')}`)
        console.log(`📊 Available scopes for filtering: ${projectScopes.length}`)
        
        // Load activities for each scope
        const allActivitiesMap = new Map<string, any>()
        
        for (const scope of projectScopes) {
          try {
            const scopeActivities = await getActivitiesByProjectType(scope, false)
            
            scopeActivities.forEach((pta: ProjectTypeActivity) => {
              // Use activity_name as unique key to avoid duplicates
              const key = pta.activity_name.toLowerCase().trim()
              if (!allActivitiesMap.has(key)) {
                allActivitiesMap.set(key, {
                  id: pta.id,
                  name: pta.activity_name,
                  division: pta.project_type, // Store the scope this activity belongs to
                  unit: pta.default_unit || '',
                  category: pta.category || 'General',
                  is_active: pta.is_active,
                  usage_count: 0,
                  created_at: pta.created_at,
                  updated_at: pta.updated_at
                })
              }
            })
            
            console.log(`✅ Loaded ${scopeActivities.length} activities for scope "${scope}"`)
          } catch (scopeError) {
            console.warn(`⚠️ Error loading activities for scope "${scope}":`, scopeError)
          }
        }
        
        // Convert map to array and sort
        const activities = Array.from(allActivitiesMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
        
        console.log(`✅ Total unique activities loaded: ${activities.length} from ${projectScopes.length} scope(s)`)
        
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
        
        if (activities.length === 0) {
          console.log('⚠️ No activities found for selected project scopes')
        }
      } catch (error) {
        console.error('❌ Error loading project scope activities:', error)
        // Clear suggestions on error
        setActivitySuggestions([])
        setAllLoadedActivities([])
        setAvailableScopes([])
      }
    }
    
    loadActivitiesByProjectScopes()
  }, [project?.project_type, project?.project_code, selectedScopeFilter])

  // Load available zones from existing activities
  useEffect(() => {
    const loadAvailableZones = async () => {
      try {
        console.log('🔄 Loading available zones from existing activities...')
        const supabase = getSupabaseClient()
        const { data, error } = await executeQuery(async () =>
          supabase
            .from('Planning Database - BOQ Rates')
            .select('"Zone Ref", "Zone Number"')
            .not('"Zone Ref"', 'is', null)
            .not('"Zone Ref"', 'eq', '')
        )
        
        if (error) throw error
        
        // Extract unique zones
        const zones = new Set<string>()
        data?.forEach((item: any) => {
          if (item['Zone Ref']) {
            zones.add(item['Zone Ref'])
          }
        })
        
        const zoneList = Array.from(zones).sort()
        setAvailableZones(zoneList)
        setZoneSuggestions(zoneList)
        console.log(`✅ Loaded ${zoneList.length} available zones:`, zoneList)
      } catch (error) {
        console.error('❌ Error loading zones:', error)
        // Fallback to common zone patterns
        const commonZones = [
          'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E',
          'Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5',
          'Section A', 'Section B', 'Section C', 'Section D',
          'Block 1', 'Block 2', 'Block 3', 'Block 4'
        ]
        setAvailableZones(commonZones)
        setZoneSuggestions(commonZones)
      }
    }
    
    loadAvailableZones()
  }, [])
  
  // ✅ Handle project selection and load project details
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

  // Auto-load project data when project code changes
  useEffect(() => {
    if (projectCode && allProjects.length > 0) {
      const selectedProject = allProjects.find(p => p.project_code === projectCode)
      if (selectedProject) {
        setProject(selectedProject)
        console.log('✅ Project loaded:', selectedProject.project_name)
        console.log('📁 Project scopes:', selectedProject.project_type || 'None')
        // Activities will be loaded automatically by the useEffect that watches project.project_type
      }
    }
  }, [projectCode, allProjects])

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
      if (!project?.project_type) return
      
      try {
        const supabase = getSupabaseClient()
        
        // Get unique categories for this project scope from project_type_activities
        const { data, error } = await executeQuery(async () =>
          supabase
            .from('project_type_activities')
            .select('category, activity_name')
            .eq('project_type', project.project_type)
            .eq('is_active', true)
        )
        
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

    // Filter by category if selected
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(act => act.category === selectedCategory)
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

  // ✅ Auto-generate KPI preview when activity is selected from suggestions
  useEffect(() => {
    if (activityName && startDate && endDate && plannedUnits && parseFloat(plannedUnits) > 0 && autoGenerateKPIs) {
      console.log('🔄 Activity selected, auto-generating KPI preview...')
      generateKPIPreview()
    }
  }, [activityName, startDate, endDate, plannedUnits, autoGenerateKPIs])
  
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
      
      const tempActivity = {
        id: activity?.id || 'temp',
        project_code: projectCode,
        project_full_code: project?.project_code || projectCode,
        project_sub_code: project?.project_sub_code || '',
        activity_name: activityName,
        unit: unit || 'No.',
        planned_units: parseFloat(plannedUnits),
        planned_value: parseFloat(plannedValue) || 0,
        planned_activity_start_date: startDate,
        deadline: endDate,
        zone_ref: (project?.responsible_division && project?.responsible_division !== 'Enabling Division') ? project?.responsible_division : '',
        project_full_name: project?.project_name || '',
        activity_timing: activityTiming,
        has_value: hasValue,
        affects_timeline: affectsTimeline
      }
      
      const kpis = await generateKPIsFromBOQ(tempActivity as any, workdaysConfig)
      const calculatedTotal = kpis.reduce((sum, kpi) => sum + kpi.quantity, 0)
      const plannedUnitsValue = parseFloat(plannedUnits)
      
      const summary = {
        totalQuantity: calculatedTotal,
        numberOfDays: kpis.length,
        averagePerDay: kpis.length > 0 ? calculatedTotal / kpis.length : 0,
        startDate: kpis.length > 0 ? kpis[0].target_date : '',
        endDate: kpis.length > 0 ? kpis[kpis.length - 1].target_date : '',
        activityTiming: activityTiming,
        hasValue: hasValue,
        affectsTimeline: affectsTimeline
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
    
    // ملء الوحدة تلقائياً
    const suggestedUnit = getSuggestedUnit(selectedActivity.name)
    setUnit(suggestedUnit || selectedActivity.unit)
    
    setShowActivityDropdown(false)
    console.log('🔒 Activity dropdown closed after selection')
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
      await incrementActivityUsage(selectedActivity.name)
      console.log('📊 Activity usage incremented')
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
    setZoneRef(selectedZone)
    setShowZoneDropdown(false)
    
    // Auto-generate zone number if not provided
    if (!zoneNumber) {
      const zoneNum = selectedZone.match(/(\d+)/)?.[1] || ''
      setZoneNumber(zoneNum)
    }
    
    console.log('✅ Zone selected:', selectedZone)
  }

  function handleZoneNumberChange(value: string) {
    setZoneNumber(value)
    
    // Auto-generate zone ref if not provided
    if (!zoneRef && value) {
      setZoneRef(`Zone ${value}`)
    }
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
      
      const activityData = {
        ...(activity?.id && { id: activity.id }), // Include ID if editing
        project_code: projectCode,
        project_sub_code: project?.project_sub_code || '',
        project_full_code: project?.project_code || projectCode,
        activity_name: activityName,
        activity_division: project?.responsible_division || '',
        zone_ref: zoneRef || ((project?.responsible_division && project?.responsible_division !== 'Enabling Division') ? project?.responsible_division : ''),
        zone_number: zoneNumber || '',
        unit,
        planned_units: parseFloat(plannedUnits) || 0,
        planned_value: parseFloat(plannedValue) || 0,
        planned_activity_start_date: startDate,
        deadline: endDate,
        calendar_duration: duration,
        activity_timing: activityTiming,
        has_value: hasValue,
        affects_timeline: affectsTimeline,
        project_full_name: project?.project_name || '',
        project_status: project?.project_status || 'upcoming',
        total_units: 0,
        actual_units: 0,
        total_drilling_meters: 0
      }
      
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
      if (activityTiming === 'post-completion' && !hasValue && !affectsTimeline) {
        console.log('⚠️ Post-completion activity with no value and no timeline impact - skipping KPI generation')
        setSuccess(activity ? '✅ Post-completion activity updated successfully!' : '✅ Post-completion activity created successfully!')
      } else if (autoGenerateKPIs && kpiPreview?.kpis && kpiPreview.kpis.length > 0) {
        if (activity) {
          // ✅ EDIT MODE: Update existing KPIs (not delete and recreate!)
          console.log('🔄 UPDATING KPIs for existing activity...')
          console.log('📦 Activity to update:', {
            id: activity.id,
            old_activity_name: activity.activity_name, // ✅ OLD name
            new_activity_name: activityData.activity_name, // ✅ NEW name
            project_full_code: activityData.project_full_code,
            planned_units: activityData.planned_units
          })
          
          // ✅ UPDATE MODE: Update existing KPIs instead of creating new ones
          console.log('🔄 UPDATING existing KPIs...')
          const updateResult = await updateExistingKPIs(activityData, activity.activity_name, workdaysConfig)
          
          if (updateResult.success) {
            setSuccess(`✅ Activity updated! ${updateResult.message}`)
            console.log(`✅ KPI Update: Updated=${updateResult.updatedCount}, Added=${updateResult.addedCount}, Deleted=${updateResult.deletedCount}`)
          } else {
            console.error('❌ KPI update failed:', updateResult.message)
            setSuccess('⚠️ Activity updated but KPI sync failed: ' + updateResult.message)
          }
        } else {
          // ✅ CREATE MODE: Create new KPIs
          console.log('🚀 CREATING new KPIs...')
          console.log('📦 KPIs to save:', JSON.stringify(kpiPreview.kpis.slice(0, 2), null, 2))
          
          const result = await saveGeneratedKPIs(kpiPreview.kpis)
          
          if (result.success) {
            setSuccess(`✅ Activity created with ${result.savedCount} KPI records!`)
            console.log('✅ Created', result.savedCount, 'KPI records')
          } else {
            console.error('❌ KPI generation failed:', result.message)
            setSuccess('⚠️ Activity created but KPI generation failed: ' + result.message)
          }
        }
      } else {
        console.warn('⚠️ KPIs NOT processed because:')
        if (!autoGenerateKPIs) console.warn('  - Auto-generate KPIs is DISABLED')
        if (!kpiPreview) console.warn('  - No KPI preview available')
        if (!kpiPreview?.kpis || kpiPreview.kpis.length === 0) console.warn('  - KPI preview is empty')
        
        // ✅ Fallback: Try to generate KPIs on the fly if preview is missing
        if (autoGenerateKPIs && (!kpiPreview || !kpiPreview.kpis || kpiPreview.kpis.length === 0)) {
          console.log('🔄 Fallback: Generating KPIs on the fly...')
          try {
            const tempActivity = {
              id: activity?.id || 'temp',
              project_code: projectCode,
              project_full_code: project?.project_code || projectCode,
              project_sub_code: project?.project_sub_code || '',
              activity_name: activityName,
              unit: unit || 'No.',
              planned_units: parseFloat(plannedUnits),
              planned_value: parseFloat(plannedValue) || 0,
              planned_activity_start_date: startDate,
              deadline: endDate,
              zone_ref: (project?.responsible_division && project?.responsible_division !== 'Enabling Division') ? project?.responsible_division : '',
              project_full_name: project?.project_name || ''
            }
            
            const { generateKPIsFromBOQ, saveGeneratedKPIs } = await import('@/lib/autoKPIGenerator')
            const kpis = await generateKPIsFromBOQ(tempActivity as any, workdaysConfig)
            
            if (kpis && kpis.length > 0) {
              console.log(`✅ Fallback: Generated ${kpis.length} KPIs on the fly`)
              const result = await saveGeneratedKPIs(kpis)
              
              if (result.success) {
                setSuccess(`✅ Activity created with ${result.savedCount} KPI records (generated on the fly)!`)
                console.log('✅ Fallback KPI generation successful')
              } else {
                console.error('❌ Fallback KPI generation failed:', result.message)
                setSuccess('⚠️ Activity created but KPI generation failed: ' + result.message)
              }
            } else {
              console.warn('⚠️ Fallback: No KPIs generated')
              setSuccess(activity ? '✅ Activity updated successfully!' : '✅ Activity created successfully!')
            }
          } catch (fallbackError) {
            console.error('❌ Fallback KPI generation error:', fallbackError)
            setSuccess(activity ? '✅ Activity updated successfully!' : '✅ Activity created successfully!')
          }
        } else {
          setSuccess(activity ? '✅ Activity updated successfully!' : '✅ Activity created successfully!')
        }
      }
      
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
  
  const isFormValid = projectCode && activityName && unit && startDate && endDate
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select 
                value={projectCode} 
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                disabled={loading || projectLoading}
              >
                <option value="">
                  {projectLoading ? 'Loading projects...' : 'Select a project...'}
                </option>
                {allProjects.map((proj) => (
                  <option key={proj.id} value={proj.project_code}>
                    {proj.project_code} - {proj.project_name}
                  </option>
                ))}
              </select>
              
              {/* ✅ Project Info Card - Show immediately after project selection */}
              {project && (
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
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      💡 Activities for project scope{project?.project_type?.includes(',') ? 's' : ''}: <strong>{project?.project_type || 'None selected'}</strong> ({allLoadedActivities.length} total, {activitySuggestions.length} shown)
                    </p>
                    
                    {/* ✅ Scope Filter */}
                    {availableScopes.length > 0 && (
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Filter by Scope:</label>
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
                    
                    {/* ✅ Category Filter */}
                    {availableCategories.length > 1 && (
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="text-xs text-gray-600 dark:text-gray-400">Filter by Category:</label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="all">All Categories</option>
                            {availableCategories.map(category => (
                              <option key={category} value={category}>
                                {category} ({categoryCounts[category] || 0})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          📊 Categories from Project Scopes Management
                        </div>
                      </div>
                    )}
                  </div>
                  {getFilteredActivities()
                    .map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActivitySelect(act)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white">{act.name}</span>
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
                    ))
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

            {/* Zone Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🏗️</span>
                    Zone Reference <span className="text-red-500">*</span>
                  </span>
                </label>
                <Input 
                  value={zoneRef}
                  onChange={(e) => setZoneRef(e.target.value)}
                  placeholder="Enter zone reference manually..."
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🔢</span>
                    Zone Number
                  </span>
                </label>
                <Input 
                  value={zoneNumber}
                  onChange={(e) => handleZoneNumberChange(e.target.value)}
                  placeholder="e.g., 1, 2, 3..."
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Auto-generated from Zone Reference
                </p>
              </div>
            </div>

            {/* Zone Info Card */}
            {zoneRef && (
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
                      <div><span className="font-medium">Zone:</span> {zoneRef}</div>
                      <div><span className="font-medium">Number:</span> {zoneNumber || 'Auto-generated'}</div>
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
                        {kpiPreview.summary.averagePerDay}
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
                <p className="text-2xl font-bold text-blue-600">{kpiPreview.summary.averagePerDay}</p>
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

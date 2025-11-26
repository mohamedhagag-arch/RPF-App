'use client'

import { useState, useEffect, useCallback } from 'react'
import { Project, BOQActivity } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { KPIDataMapper } from '@/lib/kpi-data-mapper'
import { X, Save, Sparkles, Target, Calendar, TrendingUp, Info, CheckCircle2, Hash, Building, Activity } from 'lucide-react'

interface SmartActualKPIFormProps {
  kpi?: any // Existing KPI for editing
  onSubmit: (data: any) => void
  onCancel: () => void
  projects?: Project[]
  activities?: BOQActivity[]
}

export function SmartActualKPIForm({ 
  kpi, 
  onSubmit, 
  onCancel, 
  projects = [],
  activities = []
}: SmartActualKPIFormProps) {
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Form fields - Fixed for Actual KPI only
  const [projectCode, setProjectCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [zone, setZone] = useState('')
  const [zoneNumber, setZoneNumber] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  
  // Track if form has been initialized from KPI data
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasUserChangedFields, setHasUserChangedFields] = useState(false)
  
  // Zone Management
  const [availableZones, setAvailableZones] = useState<string[]>([])
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [zoneSuggestions, setZoneSuggestions] = useState<string[]>([])
  
  // Smart form state
  const [selectedActivity, setSelectedActivity] = useState<BOQActivity | null>(null)
  const [dailyRate, setDailyRate] = useState<number>(0)
  const [isAutoCalculated, setIsAutoCalculated] = useState(false)
  

  // Load available zones
  useEffect(() => {
    const loadAvailableZones = async () => {
      try {
        console.log('🔄 Loading available zones for SmartActualKPIForm...')
        const { getSupabaseClient } = await import('@/lib/simpleConnectionManager')
        const supabase = getSupabaseClient()
        
        const { data, error } = await supabase
          .from('Planning Database - BOQ Rates')
          .select('"Zone Ref", "Zone Number"')
          .not('"Zone Ref"', 'is', null)
          .not('"Zone Ref"', 'eq', '')
        
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
        console.log(`✅ Loaded ${zoneList.length} available zones for SmartActualKPIForm`)
      } catch (error) {
        console.error('❌ Error loading zones for SmartActualKPIForm:', error)
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
  
  
  // Dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  
  // Selected project info
  const [project, setProject] = useState<Project | null>(null)
  
  // Available activities for selected project
  const [availableActivities, setAvailableActivities] = useState<BOQActivity[]>([])
  
  // Load data when editing
  useEffect(() => {
    if (kpi) {
      console.log('📝 SmartActualKPIForm: Loading KPI data for editing:', kpi)
      
      // Handle both old and new column names
      setProjectCode(kpi['Project Full Code'] || kpi.project_full_code || '')
      setActivityName(kpi['Activity Name'] || kpi.activity_name || '')
      setQuantity(kpi['Quantity']?.toString() || kpi.quantity?.toString() || '')
      setUnit(kpi['Unit'] || kpi.unit || '')
      
      // Handle date formatting
      const actualDateValue = kpi['Actual Date'] || kpi.actual_date || ''
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return ''
          return date.toISOString().split('T')[0]
        } catch {
          return ''
        }
      }
      
      setActualDate(formatDateForInput(actualDateValue))
      
      // Normalize zone: remove project code prefix (e.g., "P9997-1" -> "1")
      const rawZone = (kpi['Zone'] || kpi.zone || '').toString().trim()
      const projectCode = (kpi['Project Code'] || kpi.project_code || '').toString().trim()
      let normalizedZone = rawZone
      
      if (normalizedZone && projectCode) {
        const projectCodeUpper = projectCode.toUpperCase()
        // Remove patterns like "P9997-1", "P9997 - 1", "Zone P9997-1", etc.
        normalizedZone = normalizedZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        normalizedZone = normalizedZone.replace(new RegExp(`^Zone\\s+${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        normalizedZone = normalizedZone.replace(new RegExp(`^${projectCodeUpper}(\\s|-)+`, 'i'), '').trim()
        normalizedZone = normalizedZone.replace(/^\s*-\s*/, '').trim()
        // If zone starts with "Zone ", keep it but remove project code
        if (normalizedZone.toLowerCase().startsWith('zone ')) {
          normalizedZone = normalizedZone.replace(new RegExp(`^Zone\\s+${projectCodeUpper}\\s*-\\s*`, 'i'), 'Zone ').trim()
        }
      }
      
      setZone(normalizedZone || rawZone)
      setDay(kpi['Day'] || kpi.day || '')
      setDrilledMeters(kpi['Drilled Meters']?.toString() || kpi.drilled_meters?.toString() || '')
      
      console.log('✅ SmartActualKPIForm: KPI data loaded:', {
        projectCode: kpi['Project Full Code'] || kpi.project_full_code,
        activityName: kpi['Activity Name'] || kpi.activity_name,
        quantity: kpi['Quantity'] || kpi.quantity,
        unit: kpi['Unit'] || kpi.unit,
        actualDate: formatDateForInput(actualDateValue)
      })
      
      // Load project and activities for the loaded project
      const loadedProjectCode = kpi['Project Full Code'] || kpi.project_full_code
      if (loadedProjectCode && projects.length > 0) {
        const selectedProject = projects.find(p => p.project_code === loadedProjectCode)
        if (selectedProject) {
          setProject(selectedProject)
          console.log('✅ SmartActualKPIForm: Project loaded for editing:', selectedProject.project_name)
        }
        
        // Load activities for this project
        const projectActivities = activities.filter(a => a.project_code === loadedProjectCode)
        setAvailableActivities(projectActivities)
        console.log('✅ SmartActualKPIForm: Activities loaded for editing:', projectActivities.length)
      }
      
      // Mark as initialized after a short delay to prevent immediate auto-save
      setTimeout(() => {
        setIsInitialized(true)
      }, 500)
    } else {
      // Set current date for new Actual KPI
      const today = new Date().toISOString().split('T')[0]
      setActualDate(today)
      setIsInitialized(true)
    }
  }, [kpi, projects, activities])
  
  // Auto-load project data when project code changes
  useEffect(() => {
    const loadProjectActivities = async () => {
      if (!projectCode || projects.length === 0) return

      // ✅ Search by both project_full_code and project_code
      const selectedProject = projects.find(p => 
        p.project_full_code === projectCode || 
        p.project_code === projectCode
      )
      if (!selectedProject) return

      setProject(selectedProject)

      // Use comprehensive matching strategy to load ALL activities (old + new)
      try {
        console.log(`🔍 Auto-loading activities for project: ${projectCode}`)

        const { getSupabaseClient, executeQuery } = await import('@/lib/simpleConnectionManager')
        const { TABLES } = await import('@/lib/supabase')
        const { mapBOQFromDB } = await import('@/lib/dataMappers')
        const supabase = getSupabaseClient()

        // Multiple strategies to find all activities
        const { data: activitiesByCode } = await executeQuery(async () =>
          supabase.from(TABLES.BOQ_ACTIVITIES).select('*').eq('Project Code', projectCode)
        )
        const { data: activitiesByFullCode } = await executeQuery(async () =>
          supabase.from(TABLES.BOQ_ACTIVITIES).select('*').eq('Project Full Code', projectCode)
        )
        const { data: activitiesByFullCodeStart } = await executeQuery(async () =>
          supabase.from(TABLES.BOQ_ACTIVITIES).select('*').like('Project Full Code', `${projectCode}%`)
        )

        // Merge results
        const allActivitiesData = [
          ...(Array.isArray(activitiesByCode) ? activitiesByCode : []),
          ...(Array.isArray(activitiesByFullCode) ? activitiesByFullCode : []),
          ...(Array.isArray(activitiesByFullCodeStart) ? activitiesByFullCodeStart : [])
        ]

        // Remove duplicates
        const uniqueActivities = Array.from(
          new Map(allActivitiesData.map((item: any) => [item.id, item])).values()
        )

        // Map to application format
        const mappedActivities = uniqueActivities.map(mapBOQFromDB)
        setAvailableActivities(mappedActivities)

        console.log(`✅ Auto-loaded ${mappedActivities.length} activities for project ${projectCode}`)

      } catch (error: any) {
        console.error('❌ Error auto-loading activities:', error)
        // Fallback to props
        const projectActivities = activities.filter(a => 
          a.project_code === projectCode || 
          a.project_full_code === projectCode
        )
        setAvailableActivities(projectActivities)
      }
    }

    loadProjectActivities()
  }, [projectCode, projects, activities])
  
  // Smart auto-fill when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      console.log('🧠 Smart Form: Activity selected:', selectedActivity.activity_name)
      
      // Auto-fill unit
      if (selectedActivity.unit) {
        setUnit(selectedActivity.unit)
        console.log('✅ Smart Form: Unit auto-filled:', selectedActivity.unit)
      }
      
      
      // Auto-fill zone from BOQ data (only if it's a valid zone, not division)
      if (selectedActivity.zone_ref && selectedActivity.zone_ref !== 'Enabling Division') {
        setZone(selectedActivity.zone_ref)
        console.log('✅ Smart Form: Zone auto-filled from BOQ:', selectedActivity.zone_ref)
      }
      
      // Auto-fill daily rate and calculate quantity
      if (selectedActivity.productivity_daily_rate && selectedActivity.productivity_daily_rate > 0) {
        setDailyRate(selectedActivity.productivity_daily_rate)
        setQuantity(selectedActivity.productivity_daily_rate.toString())
        setIsAutoCalculated(true)
        console.log('✅ Smart Form: Daily rate auto-filled:', selectedActivity.productivity_daily_rate)
        console.log('🧮 Smart Form: Quantity auto-calculated for one day:', selectedActivity.productivity_daily_rate)
      } else {
        console.log('⚠️ Smart Form: No daily rate found for activity')
        setDailyRate(0)
        setIsAutoCalculated(false)
      }
    }
  }, [selectedActivity])
  
  
  const handleProjectSelect = async (selectedProject: Project) => {
    // ✅ Use project_full_code if available, otherwise use project_code
    const projectCodeToUse = selectedProject.project_full_code || selectedProject.project_code
    setProjectCode(projectCodeToUse)
    setProject(selectedProject)
    setShowProjectDropdown(false)
    setHasUserChangedFields(true)
    
    // Reset activity related fields when project changes
    setActivityName('')
    setSelectedActivity(null)
    setUnit('')
    setQuantity('')
    setDailyRate(0)
    setIsAutoCalculated(false)
    
    // Load activities for this project using comprehensive matching strategy
    // This ensures all old and new activities are loaded
    try {
      const projectCode = selectedProject.project_code
      const projectFullCode = selectedProject.project_full_code || projectCode

      console.log(`🔍 Fetching ALL activities for project: ${projectCode} (Full: ${projectFullCode})`)

      const { getSupabaseClient, executeQuery } = await import('@/lib/simpleConnectionManager')
      const { TABLES } = await import('@/lib/supabase')
      const { mapBOQFromDB } = await import('@/lib/dataMappers')
      const supabase = getSupabaseClient()

      // Strategy 1: Match by exact Project Code
      const { data: activitiesByCode, error: error1 } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Code', projectCode)
      )

      // Strategy 2: Match by exact Project Full Code
      const { data: activitiesByFullCodeExact, error: error2 } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Full Code', projectCode)
      )

      // Strategy 3: Match where Project Full Code starts with Project Code
      const { data: activitiesByFullCodeStart, error: error3 } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .like('Project Full Code', `${projectCode}%`)
      )

      // Strategy 4: Match where Project Code contains the project code (for old data)
      const { data: activitiesByCodeContains, error: error4 } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .ilike('Project Code', `%${projectCode}%`)
          .neq('Project Code', projectCode)
      )

      // Strategy 5: Match where Project Full Code contains the project code (for old data)
      const { data: activitiesByFullCodeContains, error: error5 } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .ilike('Project Full Code', `%${projectCode}%`)
          .neq('Project Full Code', projectCode)
      )

      // Merge ALL results
      const allActivitiesData = [
        ...(Array.isArray(activitiesByCode) ? activitiesByCode : []),
        ...(Array.isArray(activitiesByFullCodeExact) ? activitiesByFullCodeExact : []),
        ...(Array.isArray(activitiesByFullCodeStart) ? activitiesByFullCodeStart : []),
        ...(Array.isArray(activitiesByCodeContains) ? activitiesByCodeContains : []),
        ...(Array.isArray(activitiesByFullCodeContains) ? activitiesByFullCodeContains : [])
      ]

      // Remove duplicates based on id
      const uniqueActivitiesData = Array.from(
        new Map(allActivitiesData.map((item: any) => [item.id, item])).values()
      )

      // Additional client-side filtering to ensure all match the project
      const filteredActivities = uniqueActivitiesData.filter((item: any) => {
        const itemProjectCode = (item['Project Code'] || '').toString().trim()
        const itemProjectFullCode = (item['Project Full Code'] || '').toString().trim()

        // Direct matches
        if (itemProjectCode === projectCode) return true
        if (itemProjectFullCode === projectCode) return true
        if (itemProjectFullCode.startsWith(projectCode)) return true

        // For old database entries, check if project code appears anywhere
        if (itemProjectCode.includes(projectCode)) return true
        if (itemProjectFullCode.includes(projectCode)) return true

        return false
      })

      // Map to application format
      const mappedActivities = filteredActivities.map(mapBOQFromDB)
      setAvailableActivities(mappedActivities)

      console.log(`✅ Loaded ${mappedActivities.length} activities for project ${projectCode}`)
      console.log(`📊 Activities:`, mappedActivities.map(a => ({
        name: a.activity_name,
        project_code: a.project_code,
        project_full_code: a.project_full_code
      })))

      if (mappedActivities.length === 0) {
        console.warn(`⚠️ NO ACTIVITIES FOUND for project ${projectCode}!`)
      }

    } catch (error: any) {
      console.error('❌ Error fetching activities:', error)
      
      // Fallback: Try to use activities from props if available
      const projectActivities = activities.filter(a => 
        a.project_code === selectedProject.project_code || 
        a.project_full_code === selectedProject.project_code ||
        a.project_full_code?.startsWith(selectedProject.project_code)
      )
      setAvailableActivities(projectActivities)
      console.log(`✅ Fallback: Loaded ${projectActivities.length} activities from props`)
    }
  }
  
  const handleActivitySelect = (activityName: string) => {
    setActivityName(activityName)
    setShowActivityDropdown(false)
    setHasUserChangedFields(true)
    
    // Find and set the selected activity for smart auto-fill
    const activity = availableActivities.find(a => a.activity_name === activityName)
    if (activity) {
      setSelectedActivity(activity)
      console.log('🧠 Smart Form: Activity selected for auto-fill:', activity.activity_name)
    }
  }

  // Zone handlers
  function handleZoneSelect(selectedZone: string) {
    setZone(selectedZone)
    setShowZoneDropdown(false)
    setHasUserChangedFields(true)
    
    // Auto-generate zone number if not provided
    if (!zoneNumber) {
      const zoneNum = selectedZone.match(/(\d+)/)?.[1] || ''
      setZoneNumber(zoneNum)
    }
    
    console.log('✅ Zone selected:', selectedZone)
  }

  function handleZoneNumberChange(value: string) {
    setZoneNumber(value)
    setHasUserChangedFields(true)
    
    // Auto-generate zone ref if not provided
    if (!zone && value) {
      setZone(`Zone ${value}`)
    }
  }
  
  // Auto-save function with useCallback
  const autoSave = useCallback(async () => {
    // Only auto-save if form is initialized, KPI exists (editing mode), and user has changed fields
    if (!isInitialized || !kpi || !hasUserChangedFields) return
    
    // Basic validation for auto-save
    if (!projectCode || !activityName || !quantity || !unit || !actualDate) return
    
    try {
      const quantityValue = parseFloat(quantity)
      if (isNaN(quantityValue) || quantityValue < 0) return
      
      setAutoSaving(true)
      
      const kpiData = {
        // ✅ Use project_full_code for Project Full Code, and extract project_code for Project Code
        'Project Full Code': project?.project_full_code || projectCode,
        'Project Code': project?.project_code || (projectCode.includes('-') ? projectCode.split('-')[0] : projectCode),
        'Project Sub Code': project?.project_sub_code || '',
        'Activity Name': activityName,
        'Quantity': Math.round(quantityValue * 100) / 100,
        'Unit': unit,
        'Input Type': 'Actual',
        'Actual Date': actualDate,
        'Zone': zone,
        'Zone Number': zoneNumber,
        'Day': day,
        'Drilled Meters': drilledMeters ? parseFloat(drilledMeters) : null
      }
      
      console.log('💾 Auto-saving KPI:', kpiData)
      
      await onSubmit(kpiData)
      
      setLastSaved(new Date())
      console.log('✅ Auto-saved successfully')
    } catch (err: any) {
      console.error('❌ Error auto-saving KPI:', err)
      // Don't show error for auto-save, just log it
    } finally {
      setAutoSaving(false)
    }
  }, [isInitialized, kpi, hasUserChangedFields, projectCode, activityName, quantity, unit, actualDate, zone, zoneNumber, day, drilledMeters, project, onSubmit])
  
  // Auto-save effect with debounce
  useEffect(() => {
    if (!isInitialized || !kpi) return
    
    const timeoutId = setTimeout(() => {
      autoSave()
    }, 1000) // Debounce: save 1 second after last change
    
    return () => clearTimeout(timeoutId)
  }, [autoSave, isInitialized, kpi])
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validation - Only for Actual KPI
      if (!projectCode) throw new Error('Please select a project')
      if (!activityName) throw new Error('Please enter activity name')
      if (!quantity || quantity.trim() === '') throw new Error('Please enter a quantity')
      
      // Ensure quantity is a valid number (allow 0)
      const quantityValue = parseFloat(quantity)
      if (isNaN(quantityValue)) throw new Error('Please enter a valid number for quantity')
      if (quantityValue < 0) throw new Error('Quantity cannot be negative')
      if (!unit) throw new Error('Please enter a unit')
      if (!actualDate) throw new Error('Please enter actual date')
      
      const kpiData = {
        // ✅ Use project_full_code for Project Full Code, and extract project_code for Project Code
        'Project Full Code': project?.project_full_code || projectCode,
        'Project Code': project?.project_code || (projectCode.includes('-') ? projectCode.split('-')[0] : projectCode),
        'Project Sub Code': project?.project_sub_code || '',
        'Activity Name': activityName,
        'Quantity': Math.round(quantityValue * 100) / 100, // Round to 2 decimal places
        'Unit': unit,
        'Input Type': 'Actual', // Fixed to Actual only
        'Actual Date': actualDate,
        'Zone': zone,
        'Zone Number': zoneNumber,
        'Day': day,
        'Drilled Meters': drilledMeters ? parseFloat(drilledMeters) : null
      }
      
      console.log('📦 Submitting KPI:', kpiData)
      
      // Submit
      await onSubmit(kpiData)
      
      setSuccess(`✅ Actual KPI ${kpi ? 'updated' : 'created'} successfully!`)
      setLastSaved(new Date())
      
      // Only close form if it's a new KPI (not editing)
      // For editing, keep the form open so user can continue editing
      if (!kpi) {
        // Close form after short delay only for new KPIs
        setTimeout(() => {
          onCancel()
        }, 1500)
      }
      
    } catch (err: any) {
      console.error('❌ Error submitting KPI:', err)
      setError(err.message || 'An error occurred while saving the KPI')
    } finally {
      setLoading(false)
    }
  }
  
  const isFormValid = projectCode && activityName && quantity && unit
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Smart Actual KPI Form
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Intelligent form for site activities with auto-calculated quantities
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Auto-save indicator */}
          {kpi && isInitialized && (
            <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2">
                {autoSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Auto-saving...
                    </span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                      Auto-saved
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {lastSaved.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Changes will be saved automatically when you modify any field
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <Alert variant="success" className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </Alert>
          )}
          
          {error && (
            <Alert variant="error" className="mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {error}
            </Alert>
          )}

          {/* Smart Form Info */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Smart Auto-Fill Features
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This form automatically fills data based on your project and activity selection. 
                  Quantities are calculated using the daily rate from your activity data.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Building className="w-4 h-4 inline mr-2" />
                Project *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search and select project..."
                  value={projectCode}
                  onChange={(e) => {
                    setProjectCode(e.target.value)
                    setHasUserChangedFields(true)
                    setShowProjectDropdown(true)
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
                {showProjectDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {projects
                      .filter(project => {
                        const searchTerm = projectCode.toLowerCase()
                        const projectFullCode = (project.project_full_code || project.project_code || '').toLowerCase()
                        const projectCodeLower = (project.project_code || '').toLowerCase()
                        const projectName = (project.project_name || '').toLowerCase()
                        return projectFullCode.includes(searchTerm) ||
                               projectCodeLower.includes(searchTerm) ||
                               projectName.includes(searchTerm)
                      })
                      .slice(0, 10)
                      .map((project) => {
                        // ✅ Use project_full_code if available, otherwise use project_code
                        const displayCode = project.project_full_code || project.project_code
                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handleProjectSelect(project)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {displayCode}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {project.project_name}
                            </div>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Name */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Activity className="w-4 h-4 inline mr-2" />
                Activity Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter activity name..."
                  value={activityName}
                  onChange={(e) => {
                    setActivityName(e.target.value)
                    setHasUserChangedFields(true)
                    setShowActivityDropdown(true)
                  }}
                  onFocus={() => setShowActivityDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
                {showActivityDropdown && availableActivities.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {availableActivities
                      .filter(activity => 
                        activity.activity_name?.toLowerCase().includes(activityName.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((activity, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleActivitySelect(activity.activity_name || '')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {activity.activity_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {activity.project_code || 'No project code'}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Smart Quantity and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unit field is read-only and auto-filled from selected activity */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Hash className="w-4 h-4 inline mr-2" />
                  Daily Quantity *
                  {isAutoCalculated && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Auto-calculated
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Enter quantity..."
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value)
                      setHasUserChangedFields(true)
                      setIsAutoCalculated(false) // User is manually editing
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${
                      isAutoCalculated ? 'bg-green-50 border-green-300' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    step="0.01"
                    min="0"
                  />
                  {isAutoCalculated && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </div>
                {dailyRate > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Daily rate: {dailyRate} {unit} per day
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuantity(dailyRate.toString())
                        setIsAutoCalculated(true)
                      }}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                    >
                      Reset to daily rate
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit *
                  {unit && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Auto-filled from Activity
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Select an activity to auto-fill unit..."
                  value={unit}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-white ${
                    unit ? 'bg-blue-50 border-blue-300 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600 bg-gray-50 cursor-not-allowed'
                  }`}
                />
                {!unit && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Unit will be automatically filled when you select an activity
                  </p>
                )}
              </div>
            </div>
            
            {/* Date Field - Actual Only */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4 inline mr-2" />
                Activity Date *
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Today's date
                </span>
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => {
                  setActualDate(e.target.value)
                  setHasUserChangedFields(true)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white bg-green-50 border-green-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Record the actual completion date for this activity
              </p>
            </div>
            
            {/* Zone Field - Very Prominent */}
            <div className="space-y-2 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
              <label className="block text-lg font-bold text-gray-700 dark:text-gray-300">
                Zone (المنطقة) *
                <span className="ml-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full">
                  ZONE FIELD
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter zone name..."
                value={zone}
                onChange={(e) => {
                  setZone(e.target.value)
                  setHasUserChangedFields(true)
                }}
                className={`w-full px-4 py-3 text-lg border-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${
                  zone ? 'bg-blue-50 border-blue-300' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Specify the zone or area where this activity was performed
              </p>
            </div>
            
            {/* Day Number and Drilled Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Day Number
                </label>
                <input
                  type="number"
                  placeholder="Day number..."
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value)
                    setHasUserChangedFields(true)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  min="1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: Day number in the project
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drilled Meters
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Optional
                  </span>
                </label>
                <input
                  type="number"
                  placeholder="Enter drilled meters (optional)..."
                  value={drilledMeters}
                  onChange={(e) => {
                    setDrilledMeters(e.target.value)
                    setHasUserChangedFields(true)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Only for drilling activities - leave empty if not applicable
                </p>
              </div>
            </div>
            
            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Saving...' : 'Save Actual KPI Record'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </ModernCard>
    </div>
  )
}

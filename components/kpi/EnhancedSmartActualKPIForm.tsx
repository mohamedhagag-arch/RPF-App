'use client'

import { useState, useEffect } from 'react'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { mapBOQFromDB } from '@/lib/dataMappers'
import { ModernCard } from '@/components/ui/ModernCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { KPIDataMapper } from '@/lib/kpi-data-mapper'
import { KPIConsistencyManager } from '@/lib/kpi-data-consistency-fix'
import { enhancedKPIFetcher } from '@/lib/enhanced-kpi-fetcher'
import { EnhancedQuantitySummary } from '@/components/kpi/EnhancedQuantitySummary'
import { 
  X, 
  Save, 
  Sparkles, 
  Target, 
  Calendar, 
  TrendingUp, 
  Info, 
  CheckCircle2, 
  Hash, 
  Building, 
  Activity,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Zap,
  List,
  Eye,
  EyeOff,
  Edit
} from 'lucide-react'

interface EnhancedSmartActualKPIFormProps {
  kpi?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  projects?: Project[]
  activities?: BOQActivity[]
}

interface ActivityWithStatus extends BOQActivity {
  isCompleted: boolean
  hasWorkToday: boolean
  kpiData?: any
}

export function EnhancedSmartActualKPIForm({ 
  kpi, 
  onSubmit, 
  onCancel, 
  projects = [],
  activities = []
}: EnhancedSmartActualKPIFormProps) {
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Main workflow state
  const [currentStep, setCurrentStep] = useState<'project' | 'activities' | 'form'>('project')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectActivities, setProjectActivities] = useState<ActivityWithStatus[]>([])
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set())
  
  // Form fields for current activity
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  const [hasWorkToday, setHasWorkToday] = useState<boolean | null>(null)
  
  // Global date for all activities
  const [globalDate, setGlobalDate] = useState('')
  
  // Smart form state
  const [selectedActivity, setSelectedActivity] = useState<BOQActivity | null>(null)
  const [dailyRate, setDailyRate] = useState<number>(0)
  const [isAutoCalculated, setIsAutoCalculated] = useState(false)
  
  // Temporary storage for completed activities
  const [completedActivitiesData, setCompletedActivitiesData] = useState<Map<string, any>>(new Map())
  const [showPreview, setShowPreview] = useState(false)
  
  // Store actual quantities from database
  const [actualQuantities, setActualQuantities] = useState<Map<string, number>>(new Map())
  
  // Date editing state
  const [isEditingDate, setIsEditingDate] = useState(false)
  
  // Submit protection state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  // Dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  
  // Activity filtering
  const [activitySearchTerm, setActivitySearchTerm] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Zone selection for display
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set())
  
  // Initialize with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setActualDate(today)
    setGlobalDate(today) // Set global date as well
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProjectDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.project-dropdown-container')) {
          setShowProjectDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectDropdown])
  
  // Load project activities when project is selected
  // Fetch directly from database to ensure ALL activities (old + new) are loaded
  useEffect(() => {
    const loadProjectActivities = async () => {
      if (!selectedProject) return
      
      const projectCode = selectedProject.project_code
      const projectSubCode = selectedProject.project_sub_code || ''
      const projectFullCode = `${projectCode}${projectSubCode}`
      
      console.log(`🔍 Smart KPI Form: Fetching ALL activities for project: ${projectCode} (Full: ${projectFullCode})`)
      
      try {
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
        
        const projectActivities = mappedActivities.map(activity => ({
          ...activity,
          isCompleted: false,
          hasWorkToday: false
        }))
        
        setProjectActivities(projectActivities)
        setCurrentStep('activities')
        
        console.log(`📊 Smart KPI Form: Comprehensive fetch results:`, {
          byCode: activitiesByCode?.length || 0,
          byFullCodeExact: activitiesByFullCodeExact?.length || 0,
          byFullCodeStart: activitiesByFullCodeStart?.length || 0,
          byCodeContains: activitiesByCodeContains?.length || 0,
          byFullCodeContains: activitiesByFullCodeContains?.length || 0,
          totalBeforeDedup: allActivitiesData.length,
          uniqueAfterDedup: uniqueActivitiesData.length,
          finalAfterFilter: projectActivities.length
        })
        
        console.log(`✅ Smart KPI Form: Loaded ${projectActivities.length} activities for project ${projectCode}`)
        console.log(`📋 Activities:`, projectActivities.map(a => ({
          name: a.activity_name,
          project_code: a.project_code,
          project_full_code: a.project_full_code
        })))
        
        if (projectActivities.length === 0) {
          console.warn(`⚠️ NO ACTIVITIES FOUND for project ${projectCode} in Smart KPI Form!`)
        }
        
      } catch (error: any) {
        console.error('❌ Error fetching activities in Smart KPI Form:', error)
        
        // Fallback: Try to use activities from props if available
        if (activities.length > 0) {
          console.log('📋 Using fallback: activities from props')
          const projectActivities = activities
            .filter(a => {
              const aProjectCode = (a.project_code || '').toString().trim()
              const aProjectFullCode = (a.project_full_code || '').toString().trim()
              return aProjectCode === projectCode || 
                     aProjectFullCode === projectCode || 
                     aProjectFullCode.startsWith(projectCode) ||
                     aProjectCode.includes(projectCode) ||
                     aProjectFullCode.includes(projectCode)
            })
            .map(activity => ({
              ...activity,
              isCompleted: false,
              hasWorkToday: false
            }))
          
          setProjectActivities(projectActivities)
          setCurrentStep('activities')
          console.log(`✅ Fallback: Loaded ${projectActivities.length} activities from props`)
        }
      }
    }
    
    loadProjectActivities()
  }, [selectedProject])
  
  // Load actual quantities from BOQ activities
  useEffect(() => {
    if (projectActivities.length > 0) {
      console.log('🔄 Loading activities with actual quantities...')
      projectActivities.forEach(activity => {
        console.log(`📊 ${activity.activity_name}:`, {
          id: activity.id,
          planned_units: activity.planned_units,
          actual_units: activity.actual_units,
          unit: activity.unit
        })
      })
    }
  }, [projectActivities])

  // Auto-fill form when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      console.log('🧠 Smart Form: Activity selected:', selectedActivity.activity_name)
      
      // Auto-fill unit
      if (selectedActivity.unit) {
        setUnit(selectedActivity.unit)
      }
      
      
      // Auto-fill daily rate and calculate quantity
      if (selectedActivity.productivity_daily_rate && selectedActivity.productivity_daily_rate > 0) {
        setDailyRate(selectedActivity.productivity_daily_rate)
        setQuantity(selectedActivity.productivity_daily_rate.toString())
        setIsAutoCalculated(true)
      } else {
        setDailyRate(0)
        setQuantity('')
        setIsAutoCalculated(false)
      }
      
      // Auto-fill drilled meters if available
      if (selectedActivity.total_drilling_meters) {
        setDrilledMeters(selectedActivity.total_drilling_meters.toString())
      }
      
      // Use global date for all activities
      if (globalDate) {
        setActualDate(globalDate)
      }
      
      console.log('✅ Smart Form: Form auto-filled for activity')
    }
  }, [selectedActivity, globalDate])
  
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setShowProjectDropdown(false)
    setProjectSearchTerm('')
    console.log('✅ Project selected:', project.project_name)
  }

  const handleActivitySelect = (activity: BOQActivity) => {
    console.log('🔍 handleActivitySelect called with:', activity.activity_name)
    setSelectedActivity(activity)
    setCurrentStep('form')
    setCurrentActivityIndex(projectActivities.findIndex(a => a.id === activity.id))
    console.log('✅ Activity selected:', activity.activity_name, 'Current step set to:', 'form')
  }

  const handleEditCompletedActivity = (activity: BOQActivity) => {
    console.log('🔧 Editing completed activity:', activity.activity_name)
    setSelectedActivity(activity)
    setCurrentStep('form')
    setCurrentActivityIndex(projectActivities.findIndex(a => a.id === activity.id))
    // Remove from completed activities to allow re-editing
    setCompletedActivities(prev => {
      const newSet = new Set(Array.from(prev))
      newSet.delete(activity.id)
      return newSet
    })
  }

  const handleNextActivity = () => {
    const nextIndex = currentActivityIndex + 1
    if (nextIndex < projectActivities.length) {
      setCurrentActivityIndex(nextIndex)
      setSelectedActivity(projectActivities[nextIndex])
    }
  }

  const getCurrentActivity = () => {
    return projectActivities[currentActivityIndex]
  }

  const getProgressPercentage = () => {
    return Math.round((completedActivities.size / projectActivities.length) * 100)
  }

  const getRemainingActivities = () => {
    return projectActivities.filter(activity => !completedActivities.has(activity.id))
  }

  // Filter activities based on search and filters
  const getFilteredActivities = () => {
    let filtered = projectActivities

    // Search filter
    if (activitySearchTerm) {
      filtered = filtered.filter(activity =>
        activity.activity_name?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        activity.activity?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        activity.activity_division?.toLowerCase().includes(activitySearchTerm.toLowerCase())
      )
    }

    // Zone filter - use selectedZones (Set) to filter by zone_ref
    if (selectedZones.size > 0) {
      filtered = filtered.filter(activity => {
        // Get activity zone - prefer zone_ref, fallback to zone_number or project code
        let activityZone = (activity.zone_ref || '').toString().trim()
        if (!activityZone || activityZone === '0' || activityZone === 'Enabling Division') {
          activityZone = (activity.zone_number || '').toString().trim()
        }
        if (!activityZone || activityZone === '0') {
          // If no zone, create a default zone based on project code
          activityZone = selectedProject ? `${selectedProject.project_code} - 0` : '0'
        }
        
        // Check if activity's zone matches any of the selected zones
        const matches = Array.from(selectedZones).some(selectedZone => {
          const selectedZoneStr = selectedZone.toString().trim()
          
          // Exact match
          if (activityZone === selectedZoneStr) return true
          
          // Contains match (for old data formats like "P5095 - 0")
          if (activityZone.includes(selectedZoneStr)) return true
          if (selectedZoneStr.includes(activityZone)) return true
          
          // Special case: if selected zone is "P5095 - 0" and activity zone is "0", match if project code matches
          if (selectedZoneStr.includes(' - ') && (activityZone === '0' || !activityZone || activityZone === '')) {
            const projectCodeFromZone = selectedZoneStr.split(' - ')[0]
            if (activity.project_code === projectCodeFromZone) return true
          }
          
          // Special case: if activity zone is "P5095 - 0" format and selected is just the zone part
          if (activityZone.includes(' - ') && !selectedZoneStr.includes(' - ')) {
            const zonePart = activityZone.split(' - ')[1]
            if (zonePart === selectedZoneStr || selectedZoneStr === '0') return true
          }
          
          // Special case: if selected zone is "P5095 - 0" and activity has zone_ref matching the format
          if (selectedZoneStr.includes(' - ')) {
            const [projectFromSelected, zoneFromSelected] = selectedZoneStr.split(' - ')
            const activityZoneRef = (activity.zone_ref || '').toString().trim()
            const activityZoneNum = (activity.zone_number || '').toString().trim()
            
            // Match if activity zone_ref equals zone part and project matches
            if (activity.project_code === projectFromSelected) {
              if (activityZoneRef === zoneFromSelected) return true
              if (activityZoneNum === zoneFromSelected) return true
              if ((!activityZoneRef || activityZoneRef === '0') && zoneFromSelected === '0') return true
            }
          }
          
          return false
        })
        
        return matches
      })
      console.log(`🔍 Filtered activities by zones:`, {
        selectedZones: Array.from(selectedZones),
        beforeFilter: projectActivities.length,
        afterFilter: filtered.length,
        sampleActivities: filtered.slice(0, 3).map(a => ({
          name: a.activity_name,
          zone_ref: a.zone_ref,
          zone_number: a.zone_number,
          project_code: a.project_code
        }))
      })
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'completed') {
        filtered = filtered.filter(activity => completedActivities.has(activity.id))
      } else if (selectedStatus === 'pending') {
        filtered = filtered.filter(activity => !completedActivities.has(activity.id))
      } else if (selectedStatus === 'current') {
        filtered = filtered.filter(activity => projectActivities.findIndex(a => a.id === activity.id) === currentActivityIndex)
      }
    }

    return filtered
  }

  // Get unique zones from activities (filter out Enabling Division and empty values)
  const getUniqueZones = () => {
    if (!selectedProject) return []
    
    const zones = projectActivities
      .map(activity => {
        // Prefer zone_ref, fallback to zone_number if zone_ref is empty or "0"
        const zoneRef = (activity.zone_ref || '').toString().trim()
        const zoneNumber = (activity.zone_number || '').toString().trim()
        
        // If zone_ref exists and is valid, use it
        if (zoneRef && zoneRef !== '0' && zoneRef !== 'Enabling Division') {
          // If zone_ref doesn't include project code, add it for consistency
          if (!zoneRef.includes(selectedProject.project_code) && selectedProject.project_code) {
            return `${selectedProject.project_code} - ${zoneRef}`
          }
          return zoneRef
        }
        
        // If zone_number exists and is valid, combine with project code
        if (zoneNumber && zoneNumber !== '0') {
          return `${selectedProject.project_code} - ${zoneNumber}`
        }
        
        // If both are empty or "0", create default zone with project code
        if (selectedProject?.project_code) {
          return `${selectedProject.project_code} - 0`
        }
        
        return ''
      })
      .filter(zone => zone && zone !== 'Enabling Division' && zone !== '0' && zone !== '')
    
    // Remove duplicates and sort
    return Array.from(new Set(zones)).sort()
  }

  const handleWorkTodayQuestion = (activityId: string, hasWork: boolean) => {
    console.log('🔍 handleWorkTodayQuestion called:', { activityId, hasWork })
    
    // Update the activity status
    setProjectActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, hasWorkToday: hasWork }
          : activity
      )
    )

    if (hasWork) {
      console.log('✅ User said YES - showing form for activity:', activityId)
      // If user says yes, show the form for this activity
      const activity = projectActivities.find(a => a.id === activityId)
      if (activity) {
        console.log('📝 Found activity, calling handleActivitySelect:', activity.activity_name)
        handleActivitySelect(activity)
      } else {
        console.error('❌ Activity not found:', activityId)
      }
    } else {
      console.log('❌ User said NO - marking as completed without data:', activityId)
      // If user says no, mark as completed without data
      setCompletedActivities(prev => new Set([...Array.from(prev), activityId]))
      // Go back to activities list
      setCurrentStep('activities')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    setLoading(true)
    setError('')
    
    try {
      console.log('📝 Saving KPI data temporarily:', formData)
      
      // Use global date if available, otherwise use actualDate
      const finalDate = globalDate || actualDate
      
      // Prepare the final data with the correct date and structure
      // ✅ Only include columns that exist in the unified KPI table
      const finalFormData: any = {
        'Project Full Code': selectedProject?.project_code || formData.project_code,
        'Project Code': selectedProject?.project_code || formData.project_code,
        'Project Sub Code': selectedProject?.project_sub_code || '',
        'Activity Name': selectedActivity?.activity_name || formData.activity_name,
        'Quantity': formData.quantity?.toString() || '0',
        'Unit': formData.unit || selectedActivity?.unit || '',
        'Input Type': 'Actual',
        'Actual Date': finalDate,
        'Activity Date': finalDate,
        'Target Date': finalDate || '',
        'Drilled Meters': formData.drilled_meters?.toString() || '0',
        // ✅ Use 'Section' and 'Zone' instead of 'Zone Ref' and 'Zone Number'
        'Section': selectedActivity?.zone_ref || '',
        'Zone': selectedActivity?.zone_ref || selectedActivity?.zone_number || '',
        // ❌ Removed 'Zone Ref' - use 'Section' or 'Zone' instead
        // ❌ Removed 'Zone Number' - use 'Zone' instead
        // ❌ Removed 'Activity Division' - not a column in unified KPI table
        // ❌ Removed 'Project Full Name' - not a column in unified KPI table
        'Recorded By': formData.recorded_by || ''
      }
      
      // ✅ Calculate Value from Quantity × Rate if available
      if (selectedActivity) {
        let rate = 0
        if (selectedActivity.rate && selectedActivity.rate > 0) {
          rate = selectedActivity.rate
        } else if (selectedActivity.total_value && selectedActivity.total_units && selectedActivity.total_units > 0) {
          rate = selectedActivity.total_value / selectedActivity.total_units
        }
        
        if (rate > 0) {
          const quantity = parseFloat(formData.quantity || '0')
          const calculatedValue = quantity * rate
          finalFormData['Value'] = calculatedValue.toString()
          console.log(`💰 Calculated Value: ${quantity} × ${rate} = ${calculatedValue}`)
        }
      }
      
      console.log('📅 Using date for all activities:', finalDate)
      
      // Store data temporarily instead of submitting
      setCompletedActivitiesData(prev => {
        const newMap = new Map(prev)
        newMap.set(selectedActivity!.id, finalFormData)
        return newMap
      })
      
      // Mark activity as completed
      setCompletedActivities(prev => new Set([...Array.from(prev), selectedActivity!.id]))
      
      // Check if all activities are completed
      const isLastActivity = currentActivityIndex + 1 >= projectActivities.length
      if (isLastActivity) {
        setSuccess('🎉 All activities completed! Redirecting to preview...')
      } else {
        setSuccess('KPI data saved temporarily!')
      }
      
      // Auto-advance to next activity or show preview
      const nextIndex = currentActivityIndex + 1
      if (nextIndex < projectActivities.length) {
        handleNextActivity()
      } else {
        // All activities completed, show preview automatically
        setTimeout(() => {
          setShowPreview(true)
          setCurrentStep('activities')
        }, 1500) // Wait 1.5 seconds to show success message first
      }
      
    } catch (err) {
      console.error('❌ Error saving KPI data:', err)
      setError('Failed to save KPI data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Update global date
  const handleDateUpdate = (newDate: string) => {
    setGlobalDate(newDate)
    setActualDate(newDate)
    setIsEditingDate(false)
    setSuccess('Date updated successfully!')
  }

  // Submit all completed activities
  const handleSubmitAllActivities = async () => {
    // Prevent duplicate submissions
    if (isSubmitting || hasSubmitted) {
      setError('Please wait, submission is already in progress or completed.')
      return
    }
    
    setIsSubmitting(true)
    setLoading(true)
    setError('')
    
    // Show initial success message
    setSuccess('🚀 Starting to submit all activities to database...')
    
    try {
      console.log('📤 Submitting all activities to database:', Array.from(completedActivitiesData.values()))
      
      // Convert Map to Array and submit all data
      const allData = Array.from(completedActivitiesData.values())
      
      if (allData.length === 0) {
        setError('No activities to submit. Please complete some activities first.')
        return
      }
      
      // Submit all data at once
      for (let i = 0; i < allData.length; i++) {
        await onSubmit(allData[i])
        
        // Show progress message
        if (i < allData.length - 1) {
          setSuccess(`📤 Saving activity ${i + 1} of ${allData.length} to database...`)
        }
      }
      
      // Mark as submitted to prevent duplicate submissions
      setHasSubmitted(true)
      
      setSuccess('🎉 All KPI data successfully saved to database! All activities have been recorded and stored permanently.')
      
      // Close the form after showing success message
      setTimeout(() => {
        onCancel()
      }, 4000) // Increased timeout to show success message longer
      
    } catch (err) {
      console.error('❌ Error submitting all activities to database:', err)
      setError('Failed to save activities to database. Please try again.')
      setIsSubmitting(false) // Reset on error to allow retry
    } finally {
      setLoading(false)
    }
  }

  // Project Selection Step
  if (currentStep === 'project') {
    const filteredProjects = projects.filter(project => 
      project.project_name?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
      project.project_code?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
      (project as any).location?.toLowerCase().includes(projectSearchTerm.toLowerCase())
    )

    return (
      <div className="w-full max-w-4xl mx-auto">
        <ModernCard className="w-full">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Smart KPI Form
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a project to start recording KPI data
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Global Date Selection */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Set Date for All Activities
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose the date that will be applied to all activities in this session
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={globalDate}
                  onChange={(e) => setGlobalDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {globalDate ? new Date(globalDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'No date selected'}
                </div>
              </div>
            </div>

            {/* Project Selection */}
            <div className="space-y-4">
              <div className="relative project-dropdown-container">
                <Button
                  variant="outline"
                  className="w-full justify-between text-left"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                >
                  <span className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {selectedProject ? selectedProject.project_name : 'Select a project...'}
                  </span>
                  <span className="text-gray-400">▼</span>
                </Button>

                {showProjectDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="py-2">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {project.project_name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {project.project_code} • {(project as any).location || 'No location'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                          No projects found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModernCard>
      </div>
    )
  }
  
  // Activities Step - New Sidebar Design
  if (currentStep === 'activities') {
    const progressPercentage = getProgressPercentage()
    const remainingActivities = getRemainingActivities()
    
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Sidebar - Activities List */}
          <div className="w-1/3 min-w-80">
            <ModernCard className="w-full h-fit">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Activities
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {projectActivities.length} activities
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onCancel}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress: {completedActivities.size} / {projectActivities.length}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Global Date Display */}
                {globalDate && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    {isEditingDate ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Edit Work Date
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={globalDate}
                            onChange={(e) => setGlobalDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          />
                          <Button
                            onClick={() => handleDateUpdate(globalDate)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            onClick={() => setIsEditingDate(false)}
                            size="sm"
                            variant="outline"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/30 p-2 rounded-md transition-colors"
                        onClick={() => setIsEditingDate(true)}
                      >
                        <Calendar className="w-5 h-5 text-green-600" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Work Date
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(globalDate).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <Edit className="w-4 h-4 text-gray-400 ml-auto" />
                      </div>
                    )}
                  </div>
                )}

                {/* Search and Zone Display */}
                <div className="mb-6 space-y-3">
                  {/* Search */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Zone Display with Multi-Selection */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Zones:</span>
                      </div>
                      {selectedZones.size > 0 && (
                        <button
                          onClick={() => setSelectedZones(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueZones().length > 0 ? (
                        getUniqueZones().map(zone => {
                          const isSelected = selectedZones.has(zone)
                          return (
                            <button
                              key={zone}
                              onClick={() => {
                                const newSelectedZones = new Set(selectedZones)
                                if (isSelected) {
                                  newSelectedZones.delete(zone)
                                } else {
                                  newSelectedZones.add(zone)
                                }
                                setSelectedZones(newSelectedZones)
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700'
                              }`}
                            >
                              {zone}
                            </button>
                          )
                        })
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No zones available</span>
                      )}
                    </div>
                    {selectedZones.size > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Selected: {Array.from(selectedZones).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Clear Search */}
                  {activitySearchTerm && (
                    <button
                      onClick={() => setActivitySearchTerm('')}
                      className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {/* Activities List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getFilteredActivities().map((activity, index) => {
                    const isCompleted = completedActivities.has(activity.id)
                    const isCurrent = projectActivities.findIndex(a => a.id === activity.id) === currentActivityIndex
                    
                    return (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                            : isCurrent
                            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleActivitySelect(activity)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : isCurrent ? (
                                <Play className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-xs font-medium ${
                                isCompleted ? 'text-green-700' : 
                                isCurrent ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                {isCompleted ? 'Completed' : 
                                 isCurrent ? 'Current' : 'Pending'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                              {activity.activity_name}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {activity.activity}
                            </p>
                            {activity.zone_ref && activity.zone_ref !== 'Enabling Division' && (
                              <div className="flex items-center gap-3 text-xs">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                  Zone: {activity.zone_ref}
                                </span>
                              </div>
                            )}
                          </div>
                          {isCompleted && (
                            <div className="ml-2 flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCompletedActivity(activity)
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                title="Edit completed activity"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Quick Summary
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {completedActivities.size} completed, {remainingActivities.length} remaining
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ModernCard>
          </div>

          {/* Main Content - Activity Details */}
          <div className="flex-1">
            <ModernCard className="w-full">
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select an Activity
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Click on an activity from the sidebar to start recording KPI data
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {remainingActivities.length} activities remaining
                  </div>
                </div>
              </div>
            </ModernCard>
          </div>
        </div>
      </div>
    )
  }
  
  // Form Step - Enhanced with Work Today Question
  if (currentStep === 'form' && selectedActivity) {
    const currentActivity = getCurrentActivity()
    console.log('🔍 Form step - currentActivity:', currentActivity?.activity_name, 'selectedActivity:', selectedActivity?.activity_name)
    
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Sidebar - Activities List (Always Visible) */}
          <div className="w-1/3 min-w-80">
            <ModernCard className="w-full h-fit">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Activities
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {projectActivities.length} activities
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onCancel}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress: {completedActivities.size} / {projectActivities.length}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {Math.round((completedActivities.size / projectActivities.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((completedActivities.size / projectActivities.length) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Search and Zone Display */}
                <div className="mb-6 space-y-3">
                  {/* Search */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Zone Display with Multi-Selection */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Zones:</span>
                      </div>
                      {selectedZones.size > 0 && (
                        <button
                          onClick={() => setSelectedZones(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueZones().length > 0 ? (
                        getUniqueZones().map(zone => {
                          const isSelected = selectedZones.has(zone)
                          return (
                            <button
                              key={zone}
                              onClick={() => {
                                const newSelectedZones = new Set(selectedZones)
                                if (isSelected) {
                                  newSelectedZones.delete(zone)
                                } else {
                                  newSelectedZones.add(zone)
                                }
                                setSelectedZones(newSelectedZones)
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700'
                              }`}
                            >
                              {zone}
                            </button>
                          )
                        })
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No zones available</span>
                      )}
                    </div>
                    {selectedZones.size > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Selected: {Array.from(selectedZones).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Clear Search */}
                  {activitySearchTerm && (
                    <button
                      onClick={() => setActivitySearchTerm('')}
                      className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {/* Activities List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {projectActivities.map((activity, index) => {
                    const isCompleted = completedActivities.has(activity.id)
                    const isCurrent = index === currentActivityIndex
                    
                    return (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                            : isCurrent
                            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleActivitySelect(activity)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : isCurrent ? (
                                <Play className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-xs font-medium ${
                                isCompleted ? 'text-green-700' : 
                                isCurrent ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                {isCompleted ? 'Completed' : 
                                 isCurrent ? 'Current' : 'Pending'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                              {activity.activity_name}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {activity.activity}
                            </p>
                            {activity.zone_ref && activity.zone_ref !== 'Enabling Division' && (
                              <div className="flex items-center gap-3 text-xs">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                  Zone: {activity.zone_ref}
                                </span>
                              </div>
                            )}
                          </div>
                          {isCompleted && (
                            <div className="ml-2 flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCompletedActivity(activity)
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                title="Edit completed activity"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Quick Summary
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {completedActivities.size} completed, {projectActivities.filter(activity => !completedActivities.has(activity.id)).length} remaining
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit All Button - Show when all activities are completed */}
                {completedActivities.size === projectActivities.length && projectActivities.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        All Activities Completed!
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Review your data and submit all activities at once
                      </p>
                      <Button
                        onClick={handleSubmitAllActivities}
                        disabled={loading || isSubmitting || hasSubmitted}
                        className={`w-full text-white ${
                          hasSubmitted 
                            ? 'bg-gray-500 cursor-not-allowed' 
                            : isSubmitting 
                            ? 'bg-yellow-600 hover:bg-yellow-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {loading || isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {hasSubmitted ? 'Already Submitted' : 'Saving to Database...'}
                          </>
                        ) : hasSubmitted ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Successfully Saved to Database
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Submit All Activities to Database
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ModernCard>
          </div>

          {/* Main Content - Form or Preview */}
          <div className="flex-1">
            {completedActivities.size === projectActivities.length && projectActivities.length > 0 ? (
              // Preview Section
              <ModernCard className="w-full">
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Activities Preview
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Review all completed activities before submitting
                    </p>
                  </div>

                  {/* Summary Stats */}
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {completedActivities.size}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Activities Completed
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center">
                        <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {globalDate ? new Date(globalDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Work Date
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center">
                        <Target className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {Array.from(completedActivitiesData.values()).reduce((sum, data) => sum + (data.quantity || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Total Quantity
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Completed Activities Table */}
                  <div className="mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Activity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Drilled Meters
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Drilled
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {Array.from(completedActivitiesData.entries()).map(([activityId, data], index) => {
                              const activity = projectActivities.find(a => a.id === activityId)
                              return (
                                <tr key={activityId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center">
                                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {activity?.activity_name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {activity?.activity}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      <span className="font-medium">{data['Quantity'] || data.quantity || 0}</span>
                                      <span className="text-gray-500 dark:text-gray-400 ml-1">{data['Unit'] || data.unit || ''}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {data['Actual Date'] || data.actual_date ? new Date(data['Actual Date'] || data.actual_date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                      }) : 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {data['Drilled Meters'] || data.drilled_meters ? `${data['Drilled Meters'] || data.drilled_meters}m` : 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {data['Drilled Meters'] || data.drilled_meters ? `${data['Drilled Meters'] || data.drilled_meters}m` : 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(false)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Activities
                    </Button>
                    <Button
                      onClick={handleSubmitAllActivities}
                      disabled={loading || isSubmitting || hasSubmitted}
                      className={`text-white ${
                        hasSubmitted 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : isSubmitting 
                          ? 'bg-yellow-600 hover:bg-yellow-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {loading || isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          {hasSubmitted ? 'Already Submitted' : 'Saving to Database...'}
                        </>
                      ) : hasSubmitted ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Successfully Saved to Database
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Submit All Activities to Database
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ModernCard>
            ) : (
              // Select Activity Message or Form Section
              <ModernCard className="w-full">
                <div className="p-6">
                  {!selectedActivity && completedActivities.size < projectActivities.length ? (
                    // Select Activity Message - Only show when not all activities are completed
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Select an Activity
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Click on an activity from the sidebar to start recording KPI data
                      </p>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {projectActivities.filter(activity => !completedActivities.has(activity.id)).length} activities remaining
                      </div>
                    </div>
                  ) : !selectedActivity && completedActivities.size === projectActivities.length && projectActivities.length > 0 ? (
                    // All Activities Completed - Show Preview Message
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        All Activities Completed!
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        All activities have been completed. You can review and submit your data.
                      </p>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {completedActivities.size} activities completed
                      </div>
                    </div>
                  ) : selectedActivity ? (
                    // Form Section
                    <>
                      {/* Header */}
            <div className="mb-6">
              {/* Header with back button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Activity Details
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Project: {selectedProject?.project_code}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('activities')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>

              {/* Activity Information Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {currentActivity.activity_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {currentActivity.activity}
                    </p>
                    
                    {/* Activity Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Unit:</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {currentActivity.unit || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Division:</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {currentActivity.activity_division || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {currentActivity.zone_ref && currentActivity.zone_ref !== 'Enabling Division' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Zone:</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {currentActivity.zone_ref}
                            </span>
                          </div>
                        )}
                        {currentActivity.zone_number && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Zone #:</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {currentActivity.zone_number}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Active
                    </span>
                    {currentActivity.planned_units && (
                      <div className="text-right">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Planned:</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                          {currentActivity.planned_units} {currentActivity.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Global Date Display in Form */}
            {globalDate && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                {isEditingDate ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Edit Work Date
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={globalDate}
                        onChange={(e) => setGlobalDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                      <Button
                        onClick={() => handleDateUpdate(globalDate)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setIsEditingDate(false)}
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/30 p-2 rounded-md transition-colors"
                    onClick={() => setIsEditingDate(true)}
                  >
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Work Date
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(globalDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <Edit className="w-4 h-4 text-gray-400 ml-auto" />
                  </div>
                )}
              </div>
            )}

            {/* Work Today Question */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Did you work on this activity today?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {currentActivity.activity_name}
                  {currentActivity.zone_ref && currentActivity.zone_ref !== 'Enabling Division' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Zone: {currentActivity.zone_ref}
                    </span>
                  )}
                </p>
                
                {/* Edit Mode Notice */}
                {completedActivities.has(currentActivity.id) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Edit className="w-4 h-4" />
                      <span className="text-sm font-medium">Edit Mode: This activity was previously completed</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleWorkTodayQuestion(currentActivity.id, true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Yes, I worked on it
                  </Button>
                  <Button
                    onClick={() => handleWorkTodayQuestion(currentActivity.id, false)}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 px-8 py-3 text-lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    No, I didn't work on it
                  </Button>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter quantity"
                  />
                  
                  {/* Quantity Summary */}
                  {selectedActivity && selectedProject && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Quantity Summary
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          Live Data
                        </span>
                      </div>
                      <EnhancedQuantitySummary
                        selectedActivity={selectedActivity}
                        selectedProject={selectedProject}
                        newQuantity={parseFloat(quantity) || 0}
                        unit={unit || selectedActivity.unit || ''}
                        showDebug={false}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit
                    {unit && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Auto-filled from Activity
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={unit}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 cursor-not-allowed"
                    placeholder="Select an activity to auto-fill unit..."
                  />
                  {!unit && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Unit will be automatically filled when you select an activity
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Drilled Meters
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={drilledMeters}
                    onChange={(e) => setDrilledMeters(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter drilled meters (optional)"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only for drilling activities - leave empty if not applicable
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Features */}
            {isAutoCalculated && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Smart Auto-Fill
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Daily rate: {dailyRate} {unit} • Auto-calculated quantity: {quantity}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
                {success}
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('activities')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Activities
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleFormSubmit({
                    project_code: selectedProject?.project_code,
                    activity_id: selectedActivity.id,
                    quantity: parseFloat(quantity) || 0,
                    unit,
                    actual_date: actualDate,
                    drilled_meters: drilledMeters ? parseFloat(drilledMeters) : null,
                    recorded_by: 'Engineer'
                  })}
                  disabled={loading || !quantity || !unit}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Activity
                    </>
                  )}
                </Button>
              </div>
            </div>
                    </>
                  ) : null}
                </div>
              </ModernCard>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
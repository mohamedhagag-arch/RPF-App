'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB } from '@/lib/dataMappers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  ArrowLeft, 
  Save, 
  Target, 
  Calendar, 
  Building, 
  Activity, 
  Hash, 
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor
} from 'lucide-react'

export function AddKPIForm() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { user: authUser, appUser } = useAuth()
  const guard = usePermissionGuard()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Form fields - Fixed for Actual KPI only
  const [projectCode, setProjectCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [section, setSection] = useState('')
  const [zone, setZone] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  
  // Smart form state
  const [selectedActivity, setSelectedActivity] = useState<BOQActivity | null>(null)
  const [dailyRate, setDailyRate] = useState<number>(0)
  const [isAutoCalculated, setIsAutoCalculated] = useState(false)
  
  // Dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  
  // Selected project info
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [availableActivities, setAvailableActivities] = useState<BOQActivity[]>([])
  
  // Load projects and activities on mount
  useEffect(() => {
    loadData()
  }, [])
  
  // Auto-load activities when project changes
  useEffect(() => {
    if (projectCode && projects.length > 0) {
      // ✅ Search by both project_full_code and project_code
      const project = projects.find(p => 
        p.project_full_code === projectCode || 
        p.project_code === projectCode
      )
      if (project) {
        setSelectedProject(project)
        // ✅ Use project_full_code if available, otherwise use project_code
        const codeToUse = project.project_full_code || project.project_code
        loadActivitiesForProject(codeToUse)
      }
    }
  }, [projectCode, projects])
  
  // Smart auto-fill when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      console.log('🧠 Smart Form: Activity selected:', selectedActivity.activity_name)
      
      // Auto-fill unit
      if (selectedActivity.unit) {
        setUnit(selectedActivity.unit)
        console.log('✅ Smart Form: Unit auto-filled:', selectedActivity.unit)
      }
      
      // Auto-fill section
      if (selectedActivity.activity_division) {
        setSection(selectedActivity.activity_division)
        console.log('✅ Smart Form: Section auto-filled:', selectedActivity.activity_division)
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
  
  // Set current date for actual KPI
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setActualDate(today)
  }, [])
  
  const loadData = async () => {
    try {
      setLoadingData(true)
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectsError) throw projectsError
      
      const mappedProjects = (projectsData || []).map(mapProjectFromDB)
      setProjects(mappedProjects)
      
      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (activitiesError) throw activitiesError
      
      const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      setActivities(mappedActivities)
      
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError('Failed to load data. Please refresh the page.')
    } finally {
      setLoadingData(false)
    }
  }
  
  const loadActivitiesForProject = async (projectCode: string) => {
    try {
      const projectActivities = activities.filter(activity => 
        activity.project_code === projectCode || 
        activity.project_full_code === projectCode
      )
      setAvailableActivities(projectActivities)
    } catch (err) {
      console.error('Error loading activities:', err)
    }
  }
  
  const handleProjectSelect = (project: Project) => {
    // ✅ Use project_full_code if available, otherwise use project_code
    const projectCodeToUse = project.project_full_code || project.project_code
    setProjectCode(projectCodeToUse)
    setSelectedProject(project)
    setShowProjectDropdown(false)
  }
  
  const handleActivitySelect = (activityName: string) => {
    setActivityName(activityName)
    setShowActivityDropdown(false)
    
    // Find and set the selected activity for smart auto-fill
    const activity = availableActivities.find(a => a.activity_name === activityName)
    if (activity) {
      setSelectedActivity(activity)
      console.log('🧠 Smart Form: Activity selected for auto-fill:', activity.activity_name)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validation - Only for Actual KPI
      if (!projectCode) throw new Error('Please select a project')
      if (!activityName) throw new Error('Please enter activity name')
      if (!quantity || parseFloat(quantity) <= 0) throw new Error('Please enter a valid quantity')
      if (!unit) throw new Error('Please enter a unit')
      if (!actualDate) throw new Error('Please enter actual date')
      
      // ✅ Use project_full_code for Project Full Code, and extract project_code for Project Code
      const projectFullCode = selectedProject?.project_full_code || projectCode
      const projectCodeOnly = selectedProject?.project_code || (projectCode.includes('-') ? projectCode.split('-')[0] : projectCode)
      
      // ✅ Calculate Day from Activity Date if not provided (same format as Planned KPIs)
      let dayValue = day || ''
      if (!dayValue && actualDate) {
        try {
          const date = new Date(actualDate)
          if (!isNaN(date.getTime())) {
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
            dayValue = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekday}`
          }
        } catch (e) {
          console.warn('⚠️ Could not calculate Day from date:', actualDate)
        }
      }
      
      // ✅ Get Activity Division and Activity Timing from selected activity
      let activityDivision = ''
      let activityTiming = 'post-commencement'
      if (selectedActivity) {
        activityDivision = selectedActivity.activity_division || ''
        activityTiming = selectedActivity.activity_timing || 'post-commencement'
      }
      
      // ✅ Calculate Value from Quantity × Rate if available
      let calculatedValue = parseFloat(quantity)
      if (selectedActivity) {
        let rate = 0
        if (selectedActivity.rate && selectedActivity.rate > 0) {
          rate = selectedActivity.rate
        } else if (selectedActivity.total_value && selectedActivity.total_units && selectedActivity.total_units > 0) {
          rate = selectedActivity.total_value / selectedActivity.total_units
        }
        
        if (rate > 0) {
          calculatedValue = parseFloat(quantity) * rate
          console.log(`💰 Calculated Value: ${quantity} × ${rate} = ${calculatedValue}`)
        }
      }
      
      // ✅ MATCH Planned KPIs structure exactly (same columns, same format)
      const kpiData = {
        // Database column names (matching Planned KPIs)
        'Project Full Code': projectFullCode,
        'Project Code': projectCodeOnly,
        'Project Sub Code': selectedProject?.project_sub_code || '',
        'Activity Name': activityName,
        'Activity Division': activityDivision, // ✅ Activity Division field (same as Planned)
        'Activity Timing': activityTiming, // ✅ Activity Timing field (same as Planned)
        'Quantity': parseFloat(quantity).toString(),
        'Value': calculatedValue.toString(), // ✅ Include Value (same as Planned)
        'Unit': unit,
        'Input Type': 'Actual', // Fixed to Actual only
        'Activity Date': actualDate, // ✅ Map Actual Date to Activity Date (unified field)
        'Day': dayValue, // ✅ Calculate Day from Activity Date (same format as Planned)
        'Section': section || '', // ✅ Section field (same as Planned)
        // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
        'Zone': (() => {
          const projectFullCodeValue = projectFullCode
          const activityZone = zone || selectedActivity?.zone_ref || selectedActivity?.zone_number || ''
          if (activityZone && projectFullCodeValue) {
            // If zone already contains project code, use it as is
            if (activityZone.includes(projectFullCodeValue)) {
              return activityZone
            }
            // Otherwise, format as: full code + zone
            return `${projectFullCodeValue}-${activityZone}`
          }
          return activityZone || ''
        })(),
        'Zone Number': selectedActivity?.zone_number || '', // ✅ Zone Number field (same as Planned)
        'Drilled Meters': parseFloat(drilledMeters) || 0,
        // Legacy fields (for backward compatibility)
        project_full_code: projectFullCode,
        project_code: projectCodeOnly,
        project_sub_code: selectedProject?.project_sub_code || '',
        activity_name: activityName,
        quantity: parseFloat(quantity),
        unit,
        input_type: 'Actual',
        activity_date: actualDate, // ✅ Map to Activity Date (unified field)
        section,
        zone,
        day: dayValue,
        drilled_meters: parseFloat(drilledMeters) || 0,
        // Smart form metadata
        daily_rate: dailyRate,
        is_auto_calculated: isAutoCalculated,
        activity_id: selectedActivity?.id || null
      }
      
      console.log('📦 Submitting KPI:', kpiData)
      
      // Submit to database
      const { error: insertError } = await supabase
        .from(TABLES.KPI)
        .insert(kpiData as any)
      
      if (insertError) throw insertError
      
      setSuccess(`✅ Actual KPI record created successfully!`)
      
      // Reset form
      setTimeout(() => {
        setProjectCode('')
        setActivityName('')
        setQuantity('')
        setUnit('')
        setActualDate('')
        setSection('')
        setDay('')
        setDrilledMeters('')
        setSelectedProject(null)
        setSelectedActivity(null)
        setAvailableActivities([])
        setDailyRate(0)
        setIsAutoCalculated(false)
      }, 2000)
      
    } catch (err: any) {
      console.error('❌ Error submitting KPI:', err)
      setError(err.message || 'An error occurred while saving the KPI')
    } finally {
      setLoading(false)
    }
  }
  
  const isFormValid = projectCode && activityName && quantity && unit
  
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects and activities...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-green-600" />
              Site KPI Form - Actual Records
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Smart form for recording daily site activities with auto-calculated quantities
            </p>
          </div>
        </div>
        
        {/* Device indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Monitor className="w-4 h-4" />
          <span className="hidden sm:inline">Desktop</span>
          <Smartphone className="w-4 h-4 sm:hidden" />
          <span className="sm:hidden">Mobile</span>
        </div>
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success" className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert variant="error" className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </Alert>
      )}
      
      {/* Main Form */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Activity className="w-5 h-5 text-blue-600" />
            KPI Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Building className="w-4 h-4 inline mr-2" />
                Project *
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search and select project..."
                  value={projectCode}
                  onChange={(e) => {
                    setProjectCode(e.target.value)
                    setShowProjectDropdown(true)
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  className="w-full"
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
                <Input
                  type="text"
                  placeholder="Enter activity name..."
                  value={activityName}
                  onChange={(e) => {
                    setActivityName(e.target.value)
                    setShowActivityDropdown(true)
                  }}
                  onFocus={() => setShowActivityDropdown(true)}
                  className="w-full"
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
            
            {/* Smart Form Info */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    Smart Actual KPI Form
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This form automatically fills data based on your project and activity selection. 
                    Quantities are calculated using the daily rate from your activity data.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Smart Quantity and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Input
                    type="number"
                    placeholder="Enter quantity..."
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value)
                      setIsAutoCalculated(false) // User is manually editing
                    }}
                    className={`w-full ${isAutoCalculated ? 'bg-green-50 border-green-300' : ''}`}
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
                      Auto-filled
                    </span>
                  )}
                </label>
                <Input
                  type="text"
                  placeholder="e.g., m², m³, kg..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={`w-full ${unit ? 'bg-blue-50 border-blue-300' : ''}`}
                />
              </div>
            </div>
            
            {/* Date Field - Actual Only */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Activity Date *
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Today's date
                  </span>
                </label>
                <Input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="w-full bg-green-50 border-green-300"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Record the actual completion date for this activity
                </p>
              </div>
            </div>
            
            {/* Additional Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section
                  {section && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Auto-filled
                    </span>
                  )}
                </label>
                <Input
                  type="text"
                  placeholder="Section name..."
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className={`w-full ${section ? 'bg-blue-50 border-blue-300' : ''}`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zone
                </label>
                <Input
                  type="text"
                  placeholder="Zone name..."
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Day Number
                </label>
                <Input
                  type="number"
                  placeholder="Day number..."
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full"
                  min="1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: Day number in the project
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drilled Meters
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={drilledMeters}
                  onChange={(e) => setDrilledMeters(e.target.value)}
                  className="w-full"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: For drilling activities
                </p>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Saving...' : 'Save Actual KPI Record'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Project, BOQActivity } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
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
  
  // Form fields - Fixed for Actual KPI only
  const [projectCode, setProjectCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [section, setSection] = useState('')
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
      setSection(kpi['Section'] || kpi.section || '')
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
    } else {
      // Set current date for new Actual KPI
      const today = new Date().toISOString().split('T')[0]
      setActualDate(today)
    }
  }, [kpi, projects, activities])
  
  // Auto-load project data when project code changes
  useEffect(() => {
    if (projectCode && projects.length > 0) {
      const selectedProject = projects.find(p => p.project_code === projectCode)
      if (selectedProject) {
        setProject(selectedProject)
        // Filter activities for this project
        const projectActivities = activities.filter(a => a.project_code === projectCode)
        setAvailableActivities(projectActivities)
        console.log('✅ Loaded activities for project:', projectActivities.length)
      }
    }
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
  
  
  const handleProjectSelect = (selectedProject: Project) => {
    setProjectCode(selectedProject.project_code)
    setProject(selectedProject)
    setShowProjectDropdown(false)
    
    // Load activities for this project
    const projectActivities = activities.filter(a => a.project_code === selectedProject.project_code)
    setAvailableActivities(projectActivities)
    console.log('✅ Loaded activities for project:', projectActivities.length)
    
    // Reset activity related fields when project changes
    setActivityName('')
    setSelectedActivity(null)
    setUnit('')
    setSection('')
    setQuantity('')
    setDailyRate(0)
    setIsAutoCalculated(false)
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
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validation - Only for Actual KPI
      if (!projectCode) throw new Error('Please select a project')
      if (!activityName) throw new Error('Please enter activity name')
      if (!quantity || parseFloat(quantity) <= 0) throw new Error('Please enter a valid quantity')
      
      // Ensure quantity is a valid number
      const quantityValue = parseFloat(quantity)
      if (isNaN(quantityValue)) throw new Error('Please enter a valid number for quantity')
      if (!unit) throw new Error('Please enter a unit')
      if (!actualDate) throw new Error('Please enter actual date')
      
      const kpiData = {
        'Project Full Code': project?.project_code || projectCode,
        'Project Code': projectCode,
        'Project Sub Code': project?.project_sub_code || '',
        'Activity Name': activityName,
        'Quantity': Math.round(quantityValue * 100) / 100, // Round to 2 decimal places
        'Unit': unit,
        'Input Type': 'Actual', // Fixed to Actual only
        'Actual Date': actualDate,
        'Section': section,
        'Day': day,
        'Drilled Meters': parseFloat(drilledMeters) || 0
      }
      
      console.log('📦 Submitting KPI:', kpiData)
      
      // Submit
      await onSubmit(kpiData)
      
      setSuccess(`✅ Actual KPI ${kpi ? 'updated' : 'created'} successfully!`)
      
      // Close form after short delay
      setTimeout(() => {
        onCancel()
      }, 1500)
      
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
                    setShowProjectDropdown(true)
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
                {showProjectDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {projects
                      .filter(project => 
                        project.project_code?.toLowerCase().includes(projectCode.toLowerCase()) ||
                        project.project_name?.toLowerCase().includes(projectCode.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => handleProjectSelect(project)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {project.project_code}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {project.project_name}
                          </div>
                        </button>
                      ))}
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
                      Auto-filled
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g., m², m³, kg..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${
                    unit ? 'bg-blue-50 border-blue-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
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
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white bg-green-50 border-green-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Record the actual completion date for this activity
              </p>
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
                <input
                  type="text"
                  placeholder="Section name..."
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${
                    section ? 'bg-blue-50 border-blue-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Day Number
                </label>
                <input
                  type="number"
                  placeholder="Day number..."
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
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
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={drilledMeters}
                  onChange={(e) => setDrilledMeters(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: For drilling activities
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

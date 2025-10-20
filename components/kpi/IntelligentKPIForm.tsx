'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { X, Save, Sparkles, Target, Calendar, TrendingUp, Info, CheckCircle2 } from 'lucide-react'

interface IntelligentKPIFormProps {
  kpi?: any // Existing KPI for editing
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  projects?: Project[]
  activities?: BOQActivity[]
}

export function IntelligentKPIForm({ 
  kpi, 
  onSubmit, 
  onCancel, 
  projects = [],
  activities = []
}: IntelligentKPIFormProps) {
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form fields
  const [projectCode, setProjectCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const [inputType, setInputType] = useState<'Planned' | 'Actual'>('Planned')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [section, setSection] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  
  // Dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  
  // Selected project info
  const [project, setProject] = useState<Project | null>(null)
  
  // Available activities for selected project
  const [availableActivities, setAvailableActivities] = useState<BOQActivity[]>([])
  
  // Smart form state (like SmartActualKPIForm)
  const [selectedActivity, setSelectedActivity] = useState<BOQActivity | null>(null)
  const [dailyRate, setDailyRate] = useState<number>(0)
  const [isAutoCalculated, setIsAutoCalculated] = useState(false)
  
  // Load data when editing
  useEffect(() => {
    if (kpi) {
      console.log('📝 Loading KPI data for editing:', kpi)
      
      // Handle both old and new column names
      const editingProjectCode = kpi['Project Full Code'] || kpi.project_full_code || ''
      setProjectCode(editingProjectCode)
      setActivityName(kpi['Activity Name'] || kpi.activity_name || '')
      setInputType(kpi['Input Type'] || kpi.input_type || 'Planned')
      setQuantity(kpi['Quantity']?.toString() || kpi.quantity?.toString() || '')
      setUnit(kpi['Unit'] || kpi.unit || '')
      
      // Load project data if available
      if (editingProjectCode && projects.length > 0) {
        const selectedProject = projects.find(p => p.project_code === editingProjectCode)
        if (selectedProject) {
          setProject(selectedProject)
          console.log('✅ Project loaded for editing:', selectedProject.project_name)
        }
      }
      // Handle date formatting - Support all possible date field names
      const targetDateValue = kpi['Target Date'] || kpi.target_date || kpi['target_date'] || ''
      const actualDateValue = kpi['Actual Date'] || kpi.actual_date || kpi['actual_date'] || ''
      
      // Convert date to YYYY-MM-DD format for input[type="date"]
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return ''
        try {
          // Handle different date formats
          let date: Date
          
          // If it's already in YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = new Date(dateStr)
          }
          // If it's in DD/MM/YYYY or MM/DD/YYYY format
          else if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
            const parts = dateStr.split('/')
            // Try DD/MM/YYYY first, then MM/DD/YYYY
            if (parts[0].length === 2) {
              const year = parseInt(parts[2])
              const month = parseInt(parts[1]) - 1
              const day = parseInt(parts[0])
              date = new Date(year, month, day)
            } else {
              const year = parseInt(parts[2])
              const month = parseInt(parts[0]) - 1
              const day = parseInt(parts[1])
              date = new Date(year, month, day)
            }
          }
          // Default parsing
          else {
            date = new Date(dateStr)
          }
          
          if (isNaN(date.getTime())) {
            console.log('⚠️ Invalid date format:', dateStr)
            return ''
          }
          
          const formatted = date.toISOString().split('T')[0]
          console.log('📅 Date formatted:', dateStr, '->', formatted)
          return formatted
        } catch (error) {
          console.log('❌ Date formatting error:', error, 'for date:', dateStr)
          return ''
        }
      }
      
      setTargetDate(formatDateForInput(targetDateValue))
      setActualDate(formatDateForInput(actualDateValue))
      
      console.log('📅 Date fields loaded:', {
        targetDate: targetDateValue,
        actualDate: actualDateValue,
        formattedTargetDate: formatDateForInput(targetDateValue),
        formattedActualDate: formatDateForInput(actualDateValue),
        rawKpiData: {
          'Target Date': kpi['Target Date'],
          'Actual Date': kpi['Actual Date'],
          target_date: kpi.target_date,
          actual_date: kpi.actual_date
        },
        allKpiKeys: Object.keys(kpi)
      })
      
      // Debug: Check all possible date fields
      const allDateFields = Object.keys(kpi).filter(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('actual') ||
        key.toLowerCase().includes('target')
      )
      console.log('🔍 All date-related fields:', allDateFields)
      
      // Try to find the actual date in any possible field
      const possibleActualDateFields = [
        'Actual Date', 'actual_date', 'actualDate', 'Actual_Date',
        'Date', 'date', 'Activity Date', 'activity_date'
      ]
      
      let foundActualDate = ''
      for (const field of possibleActualDateFields) {
        if (kpi[field]) {
          foundActualDate = kpi[field]
          console.log(`✅ Found actual date in field '${field}':`, foundActualDate)
          break
        }
      }
      
      if (foundActualDate && foundActualDate !== actualDateValue) {
        console.log('🔄 Using found actual date:', foundActualDate)
        setActualDate(formatDateForInput(foundActualDate))
      }
      setSection(kpi['Section'] || kpi.section || '')
      setDay(kpi['Day'] || kpi.day || '')
      setDrilledMeters(kpi['Drilled Meters']?.toString() || kpi.drilled_meters?.toString() || '')
      
      console.log('✅ KPI data loaded:', {
        projectCode: kpi['Project Full Code'] || kpi.project_full_code,
        activityName: kpi['Activity Name'] || kpi.activity_name,
        inputType: kpi['Input Type'] || kpi.input_type,
        quantity: kpi['Quantity'] || kpi.quantity,
        unit: kpi['Unit'] || kpi.unit,
        targetDate: formatDateForInput(targetDateValue),
        actualDate: formatDateForInput(actualDateValue),
        section: kpi['Section'] || kpi.section,
        day: kpi['Day'] || kpi.day,
        drilledMeters: kpi['Drilled Meters'] || kpi.drilled_meters
      })
      
      // Load project and activities for the loaded project
      const loadedProjectCode = kpi['Project Full Code'] || kpi.project_full_code
      if (loadedProjectCode && projects.length > 0) {
        const selectedProject = projects.find(p => p.project_code === loadedProjectCode)
        if (selectedProject) {
          setProject(selectedProject)
          console.log('✅ Project loaded for editing:', selectedProject.project_name)
        }
        
        // Load activities for this project
        const projectActivities = activities.filter(a => a.project_code === loadedProjectCode)
        setAvailableActivities(projectActivities)
        console.log('✅ Activities loaded for editing:', projectActivities.length)
        
        // Smart auto-fill: Find and set the selected activity
        const loadedActivityName = kpi['Activity Name'] || kpi.activity_name
        if (loadedActivityName && projectActivities.length > 0) {
          const foundActivity = projectActivities.find(a => a.activity_name === loadedActivityName)
          if (foundActivity) {
            setSelectedActivity(foundActivity)
            console.log('🧠 Smart Form: Activity found for auto-fill:', foundActivity.activity_name)
            
            // Auto-fill smart data if it's an Actual KPI
            if (inputType === 'Actual' && foundActivity.productivity_daily_rate && foundActivity.productivity_daily_rate > 0) {
              setDailyRate(foundActivity.productivity_daily_rate)
              setIsAutoCalculated(true)
              console.log('✅ Smart Form: Daily rate auto-filled:', foundActivity.productivity_daily_rate)
            }
          }
        }
      }
    }
  }, [kpi, projects, activities])
  
  // Auto-load project data when project code changes
  useEffect(() => {
    if (projectCode && projects.length > 0) {
      const selectedProject = projects.find(
        p => p.project_code === projectCode
      )
      
      if (selectedProject) {
        setProject(selectedProject)
        console.log('✅ Project loaded:', selectedProject.project_name)
        
        // Filter activities for this project
        const projectActivities = activities.filter(
          a => a.project_code === projectCode || 
               a.project_full_code === projectCode
        )
        setAvailableActivities(projectActivities)
        console.log(`✅ Found ${projectActivities.length} activities for project`)
      }
    } else {
      setProject(null)
      setAvailableActivities([])
    }
  }, [projectCode, projects, activities])
  
  // Smart auto-fill when activity is selected
  useEffect(() => {
    if (activityName && availableActivities.length > 0) {
      const foundActivity = availableActivities.find(a => a.activity_name === activityName)
      
      if (foundActivity) {
        setSelectedActivity(foundActivity)
        console.log('🧠 Smart Form: Activity selected:', foundActivity.activity_name)
        
        // Auto-fill unit
        if (foundActivity.unit) {
          setUnit(foundActivity.unit)
          console.log('✅ Smart Form: Unit auto-filled:', foundActivity.unit)
        }
        
        // Auto-fill section
        if (foundActivity.activity_division) {
          setSection(foundActivity.activity_division)
          console.log('✅ Smart Form: Section auto-filled:', foundActivity.activity_division)
        }
        
        // Auto-fill daily rate and calculate quantity for Actual KPIs
        if (inputType === 'Actual' && foundActivity.productivity_daily_rate && foundActivity.productivity_daily_rate > 0) {
          setDailyRate(foundActivity.productivity_daily_rate)
          setQuantity(foundActivity.productivity_daily_rate.toString())
          setIsAutoCalculated(true)
          console.log('✅ Smart Form: Daily rate auto-filled:', foundActivity.productivity_daily_rate)
          console.log('🧮 Smart Form: Quantity auto-calculated for one day:', foundActivity.productivity_daily_rate)
        } else {
          console.log('⚠️ Smart Form: No daily rate found for activity')
          setDailyRate(0)
          setIsAutoCalculated(false)
        }
      }
    }
  }, [activityName, availableActivities, inputType])
  
  function handleProjectSelect(selectedProject: Project) {
    setProjectCode(selectedProject.project_code)
    setProject(selectedProject)
    setShowProjectDropdown(false)
    
    // Load activities for this project
    const projectActivities = activities.filter(a => a.project_code === selectedProject.project_code)
    setAvailableActivities(projectActivities)
    console.log('✅ Activities loaded for project:', projectActivities.length)
    
    // Reset activity related fields when project changes
    setActivityName('')
    setSelectedActivity(null)
    setUnit('')
    setSection('')
    setQuantity('')
    setDailyRate(0)
    setIsAutoCalculated(false)
  }
  
  function handleActivitySelect(activityName: string) {
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
      // Validation
      if (!projectCode) throw new Error('Please select a project')
      if (!activityName) throw new Error('Please enter activity name')
      if (!quantity || parseFloat(quantity) <= 0) throw new Error('Please enter a valid quantity')
      
      // Ensure quantity is a valid number
      const quantityValue = parseFloat(quantity)
      if (isNaN(quantityValue)) throw new Error('Please enter a valid number for quantity')
      if (!unit) throw new Error('Please enter a unit')
      if (inputType === 'Planned' && !targetDate) throw new Error('Please enter target date for Planned KPI')
      if (inputType === 'Actual' && !actualDate) throw new Error('Please enter actual date for Actual KPI')
      
      // Debug logging
      console.log('🔍 Debug - Project object:', project)
      console.log('🔍 Debug - Project Code:', projectCode)
      console.log('🔍 Debug - Project.project_code:', project?.project_code)
      console.log('🔍 Debug - Final Project Full Code:', project?.project_code || projectCode || '')
      
      // Ensure we have a valid project code
      if (!projectCode && !project?.project_code) {
        console.error('❌ No project code available!')
        console.error('Project Code:', projectCode)
        console.error('Project object:', project)
        throw new Error('Please select a project')
      }
      
      // Use projectCode as the primary source for Project Full Code
      const finalProjectCode = projectCode || project?.project_code || ''
      
      console.log('🔍 Final Project Code:', finalProjectCode)
      console.log('🔍 Project Code from state:', projectCode)
      console.log('🔍 Project Code from object:', project?.project_code)
      
      const kpiData = {
        'Project Full Code': finalProjectCode,
        'Project Code': finalProjectCode,
        'Project Sub Code': project?.project_sub_code || '',
        'Activity Name': activityName || '',
        'Quantity': Math.round(quantityValue * 100) / 100, // Round to 2 decimal places
        'Unit': unit || '',
        'Input Type': inputType || 'Planned',
        'Target Date': targetDate || '',
        'Actual Date': actualDate || '',
        'Section': section || '',
        'Day': day || '',
        'Drilled Meters': parseFloat(drilledMeters) || 0
      }
      
      // Validate essential fields
      if (!kpiData['Project Full Code']) {
        console.error('❌ Project Full Code is missing!')
        console.error('Project object:', project)
        console.error('Project Code:', projectCode)
        console.error('Project.project_code:', project?.project_code)
        throw new Error('Project Full Code is required')
      }
      if (!kpiData['Activity Name']) {
        throw new Error('Activity Name is required')
      }
      if (!kpiData['Quantity']) {
        throw new Error('Quantity is required')
      }
      
      console.log('📦 Submitting KPI:', kpiData)
      console.log('🔍 Project object:', project)
      console.log('🔍 Project Code:', projectCode)
      console.log('🔍 Project Full Code:', kpiData['Project Full Code'])
      console.log('🔍 Activity Name:', kpiData['Activity Name'])
      console.log('🔍 Quantity:', kpiData['Quantity'])
      
      // Submit
      await onSubmit(kpiData)
      
      setSuccess(`✅ KPI ${kpi ? 'updated' : 'created'} successfully!`)
      
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
      <ModernCard className="w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {kpi ? 'Edit KPI' : 'Create New KPI'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {kpi ? 'Update KPI details' : 'Add a new KPI record with smart auto-fill'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            {success}
          </Alert>
        )}

        {/* Smart Form Info */}
        {inputType === 'Actual' && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Smart KPI Form
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This form automatically fills data based on your project and activity selection. 
                  For Actual KPIs, quantities are calculated using the daily rate from your activity data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project Info Banner */}
        {project && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  {project.project_name}
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-blue-700 dark:text-blue-300">
                  <div><span className="font-medium">Code:</span> {project.project_code}</div>
                  <div><span className="font-medium">Division:</span> {project.responsible_division || 'N/A'}</div>
                  <div><span className="font-medium">Status:</span> {project.project_status || 'Active'}</div>
                  <div><span className="font-medium">Activities:</span> {availableActivities.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                KPI Type <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInputType('Planned')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  inputType === 'Planned'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Planned</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Target/Goal</div>
              </button>
              <button
                type="button"
                onClick={() => setInputType('Actual')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  inputType === 'Actual'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-200 dark:ring-green-800'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700'
                }`}
              >
                <div className="text-2xl mb-1">✅</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Actual</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Achievement</div>
              </button>
            </div>
          </div>

          {/* Project Selection with Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectCode}
                onChange={(e) => {
                  setProjectCode(e.target.value)
                  setShowProjectDropdown(true)
                }}
                onFocus={() => setShowProjectDropdown(true)}
                placeholder="Type or select project code..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              {showProjectDropdown && projects.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {projects
                    .filter(p => 
                      !projectCode || 
                      p.project_code?.toLowerCase().includes(projectCode.toLowerCase()) ||
                      p.project_name?.toLowerCase().includes(projectCode.toLowerCase())
                    )
                    .map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleProjectSelect(p)}
                        className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {p.project_code}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {p.project_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {p.responsible_division || 'N/A'}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Activity Selection with Dropdown */}
          {project && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => {
                    setActivityName(e.target.value)
                    setShowActivityDropdown(true)
                  }}
                  onFocus={() => setShowActivityDropdown(true)}
                  placeholder="Type or select activity name..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {showActivityDropdown && availableActivities.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {availableActivities
                      .filter(a => 
                        !activityName || 
                        a.activity_name?.toLowerCase().includes(activityName.toLowerCase())
                      )
                      .map((a, idx) => (
                        <div
                          key={`${a.id}-${idx}`}
                          onClick={() => handleActivitySelect(a.activity_name)}
                          className="px-4 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {a.activity_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {a.unit || 'No unit'} • {a.planned_units || 0} planned
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
                
                {project && availableActivities.length === 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-300">
                    <Info className="inline h-3 w-3 mr-1" />
                    No BOQ activities found for this project. You can enter a custom activity name.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Quantity <span className="text-red-500">*</span>
                  {isAutoCalculated && inputType === 'Actual' && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Auto-calculated
                    </span>
                  )}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value)
                    setIsAutoCalculated(false) // User is manually editing
                  }}
                  placeholder="Enter quantity..."
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isAutoCalculated && inputType === 'Actual' ? 'bg-green-50 border-green-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {isAutoCalculated && inputType === 'Actual' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>
              {dailyRate > 0 && inputType === 'Actual' && (
                <div className="flex items-center justify-between mt-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Unit <span className="text-red-500">*</span>
                  {unit && selectedActivity && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Auto-filled
                    </span>
                  )}
                </span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., m³, m, ton..."
                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  unit && selectedActivity ? 'bg-blue-50 border-blue-300' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {inputType === 'Planned' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Target Date <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
            
            {inputType === 'Actual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Actual Date <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="date"
                  value={actualDate}
                  onChange={(e) => {
                    console.log('📅 Actual date changed:', e.target.value)
                    setActualDate(e.target.value)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                {actualDate && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✅ Date loaded: {actualDate}
                  </p>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section (Optional)
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., Zone A, Area 1..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day (Optional)
              </label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="e.g., Monday, Day 1..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Drilled Meters (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={drilledMeters}
                onChange={(e) => setDrilledMeters(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preview Card */}
          {isFormValid && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    KPI Preview
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
                    <div><span className="font-medium">Type:</span> {inputType}</div>
                    <div><span className="font-medium">Project:</span> {projectCode}</div>
                    <div><span className="font-medium">Activity:</span> {activityName}</div>
                    <div><span className="font-medium">Quantity:</span> {quantity} {unit}</div>
                    {inputType === 'Planned' && targetDate && (
                      <div><span className="font-medium">Target:</span> {new Date(targetDate).toLocaleDateString()}</div>
                    )}
                    {inputType === 'Actual' && actualDate && (
                      <div><span className="font-medium">Actual:</span> {new Date(actualDate).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {kpi ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {kpi ? 'Update KPI' : 'Create KPI'}
                </>
              )}
            </Button>
          </div>
        </form>
      </ModernCard>
    </div>
  )
}



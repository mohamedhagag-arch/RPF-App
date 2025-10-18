'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { BOQActivity, Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'

interface BOQFormProps {
  activity: BOQActivity | null
  projects: Project[]
  onSubmit: (data: Partial<BOQActivity>) => void
  onCancel: () => void
}

export function BOQForm({ activity, projects, onSubmit, onCancel }: BOQFormProps) {
  const guard = usePermissionGuard()
  const [formData, setFormData] = useState({
    // ✅ Basic Information (User Input)
    project_id: '',
    project_code: '',
    project_sub_code: '',
    project_full_code: '',
    activity: '',
    activity_name: '',
    activity_division: '',
    unit: '',
    zone_ref: '',
    zone_number: '',
    
    // ✅ Quantities (User Input)
    total_units: 0,
    planned_units: 0,
    actual_units: 0,
    rate: 0,
    total_value: 0,
    
    // ✅ Dates (User Input)
    planned_activity_start_date: '',
    deadline: '',
    calendar_duration: 0,
    activity_planned_start_date: '',
    activity_planned_completion_date: '',
    lookahead_start_date: '',
    lookahead_activity_completion_date: '',
    
    // ✅ Project Info (User Input)
    project_full_name: '',
    project_status: '',
    
    // ✅ Calculated Fields (Auto-Generated)
    activity_progress_percentage: 0,
    activity_actual_status: '',
    activity_completed: false,
    activity_delayed: false,
    
    // ❌ Calculated Fields (Auto-Generated - Hidden from Form)
    // These will be calculated on submit
  })
  const [error, setError] = useState('')
  const [projectActivities, setProjectActivities] = useState<any[]>([])
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false)
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<any>(null)

  useEffect(() => {
    if (activity) {
      setFormData({
        // ✅ Basic Information
        project_id: activity.project_id,
        project_code: activity.project_code,
        project_sub_code: activity.project_sub_code || '',
        project_full_code: activity.project_full_code || '',
        activity: activity.activity,
        activity_name: activity.activity_name,
        activity_division: activity.activity_division || '',
        unit: activity.unit || '',
        zone_ref: activity.zone_ref || '',
        zone_number: activity.zone_number || '',
        
        // ✅ Quantities
        total_units: activity.total_units,
        planned_units: activity.planned_units,
        actual_units: activity.actual_units || 0,
        rate: activity.rate,
        total_value: activity.total_value,
        
        // ✅ Dates
        planned_activity_start_date: activity.planned_activity_start_date || '',
        deadline: activity.deadline || '',
        calendar_duration: activity.calendar_duration,
        activity_planned_start_date: activity.activity_planned_start_date || '',
        activity_planned_completion_date: activity.activity_planned_completion_date || '',
        lookahead_start_date: activity.lookahead_start_date || '',
        lookahead_activity_completion_date: activity.lookahead_activity_completion_date || '',
        
        // ✅ Project Info
        project_full_name: activity.project_full_name || '',
        project_status: activity.project_status || '',
        
        // ✅ Calculated Fields
        activity_progress_percentage: activity.activity_progress_percentage || 0,
        activity_actual_status: activity.activity_actual_status || '',
        activity_completed: activity.activity_completed || false,
        activity_delayed: activity.activity_delayed || false
      })
    }
  }, [activity])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.project_id || !formData.activity.trim() || !formData.activity_name.trim()) {
      setError('Please fill in all required fields')
      return
    }

    // Calculate derived values and handle empty date fields
    
    // Calculate progress percentage automatically: (actual / planned) * 100
    const calculatedProgressPercentage = formData.planned_units > 0 
      ? (formData.actual_units / formData.planned_units) * 100 
      : 0
    
    // Determine activity status based on progress
    const isCompleted = calculatedProgressPercentage >= 100
    const isOnTrack = calculatedProgressPercentage >= 80 && calculatedProgressPercentage < 100
    const isDelayed = calculatedProgressPercentage < 80
    
    const calculatedData = {
      ...formData,
      // Auto-calculate progress percentage based on actual vs planned units
      activity_progress_percentage: calculatedProgressPercentage,
      
      // Calculate differences and variances
      difference: formData.actual_units - formData.planned_units,
      variance_units: formData.total_units - formData.actual_units,
      
      // Calculate financial values
      total_value: formData.total_units * formData.rate,
      planned_value: formData.planned_units * formData.rate,
      earned_value: formData.actual_units * formData.rate,
      remaining_work_value: (formData.total_units - formData.actual_units) * formData.rate,
      variance_works_value: (formData.planned_units - formData.actual_units) * formData.rate,
      
      // Auto-update activity status flags
      activity_completed: isCompleted,
      activity_on_track: isOnTrack,
      activity_delayed: isDelayed,
      
      // Calculate delay percentage
      delay_percentage: formData.planned_units > 0 
        ? ((formData.planned_units - formData.actual_units) / formData.planned_units) * 100 
        : 0,
      
      // Convert empty date strings to undefined for database
      planned_activity_start_date: formData.planned_activity_start_date || undefined,
      deadline: formData.deadline || undefined,
      activity_planned_start_date: formData.activity_planned_start_date || undefined,
      activity_planned_completion_date: formData.activity_planned_completion_date || undefined,
      lookahead_start_date: formData.lookahead_start_date || undefined,
      lookahead_activity_completion_date: formData.lookahead_activity_completion_date || undefined,
    }

    onSubmit(calculatedData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      
      // Auto-calculate progress percentage when planned_units or actual_units change
      if (field === 'planned_units' || field === 'actual_units') {
        const plannedUnits = field === 'planned_units' ? value : prev.planned_units
        const actualUnits = field === 'actual_units' ? value : prev.actual_units
        
        updated.activity_progress_percentage = plannedUnits > 0 
          ? (actualUnits / plannedUnits) * 100 
          : 0
      }
      
      return updated
    })
  }

  const handleProjectChange = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setFormData(prev => ({
        ...prev,
        project_id: projectId,
        project_code: project.project_code,
        project_sub_code: project.project_sub_code || '',
        project_full_code: `${project.project_code}${project.project_sub_code ? '-' + project.project_sub_code : ''}`,
        project_full_name: project.project_name,
        project_status: project.project_status,
      }))

      // ✅ Load project details and activities automatically
      try {
        console.log('🔄 Loading project details and activities for:', project.project_name)
        
        // Load project activities from database
        const { getSupabaseClient } = await import('@/lib/simpleConnectionManager')
        const supabase = getSupabaseClient()
        
        // Get project activities
        const { data: activities, error: activitiesError } = await supabase
          .from('boq_activities')
          .select('*')
          .eq('project_code', project.project_code)
          .order('activity_name')
        
        if (activitiesError) {
          console.error('❌ Error loading activities:', activitiesError)
          return
        }
        
        console.log('📊 Loaded activities:', activities?.length || 0)
        
        // Store activities for suggestions
        setProjectActivities(activities || [])
        
        // ✅ Store project details for display
        setSelectedProjectDetails({
          project_name: project.project_name,
          project_code: project.project_code,
          project_status: project.project_status,
          project_type: project.project_type || 'General',
          activities_count: activities?.length || 0
        })
        
        // Auto-fill common project details
        if (activities && activities.length > 0) {
          // Get common activity division from existing activities
          const commonDivision = (activities as any[]).find((a: any) => a.activity_division)?.activity_division || ''
          
          // Get common unit from existing activities
          const commonUnit = (activities as any[]).find((a: any) => a.unit)?.unit || ''
          
          // Update form with common project details
          setFormData(prev => ({
            ...prev,
            activity_division: commonDivision,
            unit: commonUnit,
          }))
          
          console.log('✅ Auto-filled project details:', {
            commonDivision,
            commonUnit,
            activitiesCount: activities.length
          })
        }
        
      } catch (error) {
        console.error('❌ Error loading project details:', error)
      }
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.activity-suggestions-container')) {
        setShowActivitySuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {activity ? 'Edit Activity' : 'Add New Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {/* Project Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} ({project.project_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Code *
                </label>
                <Input
                  value={formData.activity}
                  onChange={(e) => handleChange('activity', e.target.value)}
                  placeholder="Enter activity code"
                  required
                />
              </div>
            </div>

            {/* ✅ Project Details Display */}
            {selectedProjectDetails && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{selectedProjectDetails.project_name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedProjectDetails.divisions.map((division: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                          {division}
                        </span>
                      ))}
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        {selectedProjectDetails.project_type}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {selectedProjectDetails.project_status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      📊 {selectedProjectDetails.activities_count} activities available
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name *
                </label>
                <Input
                  value={formData.activity_name}
                  onChange={(e) => {
                    handleChange('activity_name', e.target.value)
                    setShowActivitySuggestions(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowActivitySuggestions(true)}
                  placeholder="Type activity name or select from suggestions..."
                  required
                />
                
                {/* ✅ Activity Suggestions Dropdown */}
                {showActivitySuggestions && projectActivities.length > 0 && (
                  <div className="activity-suggestions-container absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 text-xs text-gray-500 border-b">
                      📋 Available activities for {selectedProjectDetails?.project_name} ({projectActivities.length})
                    </div>
                    {projectActivities
                      .filter(act => 
                        act.activity_name?.toLowerCase().includes(formData.activity_name.toLowerCase()) ||
                        act.activity?.toLowerCase().includes(formData.activity_name.toLowerCase())
                      )
                      .slice(0, 10) // Limit to 10 suggestions
                      .map((act, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            handleChange('activity_name', act.activity_name || '')
                            handleChange('activity', act.activity || '')
                            handleChange('activity_division', act.activity_division || '')
                            handleChange('unit', act.unit || '')
                            setShowActivitySuggestions(false)
                          }}
                        >
                          <div className="font-medium text-sm">{act.activity_name}</div>
                          <div className="text-xs text-gray-500">
                            Code: {act.activity} | Division: {act.activity_division} | Unit: {act.unit}
                          </div>
                        </div>
                      ))}
                    {projectActivities.filter(act => 
                      act.activity_name?.toLowerCase().includes(formData.activity_name.toLowerCase()) ||
                      act.activity?.toLowerCase().includes(formData.activity_name.toLowerCase())
                    ).length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        No matching activities found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Division
                </label>
                <Input
                  value={formData.activity_division}
                  onChange={(e) => handleChange('activity_division', e.target.value)}
                  placeholder="Enter activity division"
                />
              </div>
            </div>

            {/* Units and Quantities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <Input
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  placeholder="e.g.: meter, kg, piece"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Units
                </label>
                <Input
                  type="number"
                  value={formData.total_units}
                  onChange={(e) => handleChange('total_units', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Quantity
                </label>
                <Input
                  type="number"
                  value={formData.planned_units}
                  onChange={(e) => handleChange('planned_units', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Actual Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Quantity
                </label>
                <Input
                  type="number"
                  value={formData.actual_units}
                  onChange={(e) => handleChange('actual_units', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress % <span className="text-xs text-gray-500">(Auto-calculated)</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.activity_progress_percentage.toFixed(2)}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="0"
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                    formData.activity_progress_percentage >= 100 
                      ? 'text-green-600' 
                      : formData.activity_progress_percentage >= 80 
                        ? 'text-blue-600' 
                        : formData.activity_progress_percentage >= 50 
                          ? 'text-yellow-600' 
                          : 'text-gray-600'
                  }`}>
                    {formData.activity_progress_percentage >= 100 ? '✓ Complete' 
                      : formData.activity_progress_percentage >= 80 ? '↗ On Track' 
                      : formData.activity_progress_percentage >= 50 ? '⚠ In Progress' 
                      : '○ Starting'}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Calculated as: (Actual / Planned) × 100
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate
                </label>
                <Input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planned Start Date
                </label>
                <Input
                  type="date"
                  value={formData.planned_activity_start_date}
                  onChange={(e) => handleChange('planned_activity_start_date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Status
                </label>
                <select
                  value={formData.activity_actual_status}
                  onChange={(e) => handleChange('activity_actual_status', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Status</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>

              <div className="flex items-center space-x-4 ">
                <div className="flex items-center space-x-2 ">
                  <input
                    type="checkbox"
                    id="activity_completed"
                    checked={formData.activity_completed}
                    onChange={(e) => handleChange('activity_completed', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="activity_completed" className="text-sm font-medium text-gray-700">
                    Completed
                  </label>
                </div>

                <div className="flex items-center space-x-2 ">
                  <input
                    type="checkbox"
                    id="activity_delayed"
                    checked={formData.activity_delayed}
                    onChange={(e) => handleChange('activity_delayed', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="activity_delayed" className="text-sm font-medium text-gray-700">
                    Delayed
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3  pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button type="submit">
                {activity ? 'Save Changes' : 'Add Activity'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

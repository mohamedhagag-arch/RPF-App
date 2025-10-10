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
    project_id: '',
    project_code: '',
    project_sub_code: '',
    project_full_code: '',
    activity: '',
    activity_division: '',
    unit: '',
    zone_ref: '',
    zone_number: '',
    activity_name: '',
    total_units: 0,
    planned_units: 0,
    actual_units: 0,
    rate: 0,
    total_value: 0,
    planned_activity_start_date: '',
    deadline: '',
    calendar_duration: 0,
    activity_progress_percentage: 0,
    productivity_daily_rate: 0,
    total_drilling_meters: 0,
    drilled_meters_planned_progress: 0,
    drilled_meters_actual_progress: 0,
    remaining_meters: 0,
    activity_planned_status: '',
    activity_actual_status: '',
    reported_on_data_date: false,
    planned_value: 0,
    earned_value: 0,
    delay_percentage: 0,
    planned_progress_percentage: 0,
    activity_planned_start_date: '',
    activity_planned_completion_date: '',
    activity_delayed: false,
    activity_on_track: true,
    activity_completed: false,
    project_full_name: '',
    project_status: '',
    remaining_work_value: 0,
    variance_works_value: 0,
    lookahead_start_date: '',
    lookahead_activity_completion_date: '',
    remaining_lookahead_duration_for_activity_completion: 0,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (activity) {
      setFormData({
        project_id: activity.project_id,
        project_code: activity.project_code,
        project_sub_code: activity.project_sub_code || '',
        project_full_code: activity.project_full_code || '',
        activity: activity.activity,
        activity_division: activity.activity_division || '',
        unit: activity.unit || '',
        zone_ref: activity.zone_ref || '',
        zone_number: activity.zone_number || '',
        activity_name: activity.activity_name,
        total_units: activity.total_units,
        planned_units: activity.planned_units,
        actual_units: activity.actual_units,
        rate: activity.rate,
        total_value: activity.total_value,
        planned_activity_start_date: activity.planned_activity_start_date || '',
        deadline: activity.deadline || '',
        calendar_duration: activity.calendar_duration,
        activity_progress_percentage: activity.activity_progress_percentage,
        productivity_daily_rate: activity.productivity_daily_rate,
        total_drilling_meters: activity.total_drilling_meters,
        drilled_meters_planned_progress: activity.drilled_meters_planned_progress,
        drilled_meters_actual_progress: activity.drilled_meters_actual_progress,
        remaining_meters: activity.remaining_meters,
        activity_planned_status: activity.activity_planned_status || '',
        activity_actual_status: activity.activity_actual_status || '',
        reported_on_data_date: activity.reported_on_data_date,
        planned_value: activity.planned_value,
        earned_value: activity.earned_value,
        delay_percentage: activity.delay_percentage,
        planned_progress_percentage: activity.planned_progress_percentage,
        activity_planned_start_date: activity.activity_planned_start_date || '',
        activity_planned_completion_date: activity.activity_planned_completion_date || '',
        activity_delayed: activity.activity_delayed,
        activity_on_track: activity.activity_on_track,
        activity_completed: activity.activity_completed,
        project_full_name: activity.project_full_name || '',
        project_status: activity.project_status || '',
        remaining_work_value: activity.remaining_work_value,
        variance_works_value: activity.variance_works_value,
        lookahead_start_date: activity.lookahead_start_date || '',
        lookahead_activity_completion_date: activity.lookahead_activity_completion_date || '',
        remaining_lookahead_duration_for_activity_completion: activity.remaining_lookahead_duration_for_activity_completion,
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

  const handleProjectChange = (projectId: string) => {
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
    }
  }

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

            {/* Activity Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name *
                </label>
                <Input
                  value={formData.activity_name}
                  onChange={(e) => handleChange('activity_name', e.target.value)}
                  placeholder="Enter activity name"
                  required
                />
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
                  Total Quantity
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
                  Planned Quantity
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

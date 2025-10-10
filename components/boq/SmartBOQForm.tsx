'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { BOQActivity, Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Briefcase, Save, X, Sparkles, Calculator, TrendingUp } from 'lucide-react'

interface SmartBOQFormProps {
  activity: BOQActivity | null
  projects: Project[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function SmartBOQForm({ activity, projects, onSubmit, onCancel }: SmartBOQFormProps) {
  const guard = usePermissionGuard()
  const [formData, setFormData] = useState({
    project_code: '',
    activity_name: '',
    activity_division: '',
    unit: '',
    total_units: 0,
    planned_units: 0,
    actual_units: 0,
    rate: 0,
    planned_activity_start_date: '',
    deadline: '',
  })
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // Auto-load data when editing
  useEffect(() => {
    if (activity) {
      setIsEditing(true)
      setFormData({
        project_code: activity.project_code || '',
        activity_name: activity.activity_name || '',
        activity_division: activity.activity_division || '',
        unit: activity.unit || '',
        total_units: activity.total_units || 0,
        planned_units: activity.planned_units || 0,
        actual_units: activity.actual_units || 0,
        rate: activity.rate || 0,
        planned_activity_start_date: activity.planned_activity_start_date || '',
        deadline: activity.deadline || '',
      })
    } else {
      setIsEditing(false)
      setFormData({
        project_code: '',
        activity_name: '',
        activity_division: '',
        unit: '',
        total_units: 0,
        planned_units: 0,
        actual_units: 0,
        rate: 0,
        planned_activity_start_date: '',
        deadline: '',
      })
    }
  }, [activity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.project_code.trim()) {
      setError('Please select a project')
      return
    }

    if (!formData.activity_name.trim()) {
      setError('Please enter activity name')
      return
    }

    console.log('BOQ Form submitting:', formData)
    
    try {
      await onSubmit(formData)
      console.log('BOQ Form submitted successfully')
    } catch (err) {
      console.error('BOQ Form submit error:', err)
      setError('Failed to save. Please try again.')
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Calculate progress
  const progressPercentage = formData.planned_units > 0 
    ? (formData.actual_units / formData.planned_units) * 100 
    : 0

  const getProgressStatus = () => {
    if (progressPercentage >= 100) return { status: 'Completed', color: 'text-green-600', bg: 'bg-green-50' }
    if (progressPercentage >= 80) return { status: 'On Track', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (progressPercentage >= 50) return { status: 'In Progress', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { status: 'Starting', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const progressStatus = getProgressStatus()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isEditing 
                  ? 'bg-blue-100 dark:bg-blue-900' 
                  : 'bg-green-100 dark:bg-green-900'
              }`}>
                {isEditing ? (
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Briefcase className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-gray-900 dark:text-white">
                  {isEditing ? 'Edit BOQ Activity' : 'Create New Activity'}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {isEditing ? 'Update activity details and progress' : 'Add a new BOQ activity'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Current Values - Only when editing */}
          {isEditing && activity && (
            <div className="mb-4 p-4 rounded-lg border-l-4 bg-blue-50 dark:bg-blue-950 border-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  Current Activity:
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                  <div className="font-medium text-gray-900 dark:text-white mt-0.5">
                    {activity.activity_name}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Units:</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {activity.total_units?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                  <div className="font-medium text-gray-900 dark:text-white mt-0.5">
                    {activity.activity_progress_percentage?.toFixed(1) || 0}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.project_code}
                onChange={(e) => handleChange('project_code', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.project_code}>
                    {project.project_code} - {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Name & Division */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.activity_name}
                  onChange={(e) => handleChange('activity_name', e.target.value)}
                  placeholder="e.g., Excavation"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Division
                </label>
                <Input
                  type="text"
                  value={formData.activity_division}
                  onChange={(e) => handleChange('activity_division', e.target.value)}
                  placeholder="e.g., Civil"
                />
              </div>
            </div>

            {/* Units Row */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  placeholder="m³, m², ton"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Units
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_units}
                  onChange={(e) => handleChange('total_units', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Units <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.planned_units}
                  onChange={(e) => handleChange('planned_units', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actual Units
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.actual_units}
                  onChange={(e) => handleChange('actual_units', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Progress Indicator */}
            {formData.planned_units > 0 && (
              <div className={`p-3 rounded-lg ${progressStatus.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className={`text-sm font-semibold ${progressStatus.color}`}>
                    {progressPercentage.toFixed(1)}% - {progressStatus.status}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      progressPercentage >= 100 ? 'bg-green-500' :
                      progressPercentage >= 80 ? 'bg-blue-500' :
                      progressPercentage >= 50 ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Rate & Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rate (per unit)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.planned_activity_start_date}
                  onChange={(e) => handleChange('planned_activity_start_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deadline
                </label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className={`px-6 font-semibold ${
                  isEditing
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Activity
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Create Activity
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


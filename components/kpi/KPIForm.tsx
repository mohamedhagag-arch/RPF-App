'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { KPIRecord, Project, BOQActivity } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'

interface KPIFormProps {
  kpi: KPIRecord | null
  projects: Project[]
  activities: BOQActivity[]
  onSubmit: (data: Partial<KPIRecord>) => void
  onCancel: () => void
}

export function KPIForm({ kpi, projects, activities, onSubmit, onCancel }: KPIFormProps) {
  const guard = usePermissionGuard()
  const [formData, setFormData] = useState({
    project_id: '',
    activity_id: '',
    kpi_name: '',
    planned_value: 0,
    actual_value: 0,
    target_date: '',
    completion_date: '',
    status: 'on_track' as 'on_track' | 'delayed' | 'completed' | 'at_risk',
    zone: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [filteredActivities, setFilteredActivities] = useState<BOQActivity[]>([])

  useEffect(() => {
    if (kpi) {
      setFormData({
        project_id: kpi.project_id || '',
        activity_id: kpi.activity_id || '',
        kpi_name: kpi.kpi_name || '',
        planned_value: kpi.planned_value || 0,
        actual_value: kpi.actual_value || 0,
        target_date: kpi.activity_date || (kpi as any).target_date || '',
        completion_date: kpi.completion_date || '',
        status: kpi.status || 'on_track',
        zone: (kpi as any).zone_number || (kpi as any).zone || '',
        notes: kpi.notes || '',
      })
    }
  }, [kpi])

  useEffect(() => {
    if (formData.project_id) {
      const projectActivities = activities.filter(a => a.project_id === formData.project_id)
      setFilteredActivities(projectActivities)
    } else {
      setFilteredActivities([])
    }
  }, [formData.project_id, activities])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.project_id || !formData.activity_id || !formData.kpi_name.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (!formData.target_date) {
      setError('Please specify the target date')
      return
    }

    // Handle empty date fields - convert empty strings to null
    const submitData = {
      ...formData,
      completion_date: formData.completion_date || undefined,
    }

    onSubmit(submitData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProjectChange = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      activity_id: '', // Reset activity when project changes
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {kpi ? 'Edit KPI' : 'Add New KPI'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {/* Project Selection */}
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

            {/* Activity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity *
              </label>
              <select
                value={formData.activity_id}
                onChange={(e) => handleChange('activity_id', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                disabled={!formData.project_id}
              >
                <option value="">Select Activity</option>
                {filteredActivities.map(activity => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activity_description}
                  </option>
                ))}
              </select>
            </div>

            {/* KPI Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KPI Name *
              </label>
              <Input
                value={formData.kpi_name}
                onChange={(e) => handleChange('kpi_name', e.target.value)}
                placeholder="Enter KPI name"
                required
              />
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planned Value *
                </label>
                <Input
                  type="number"
                  value={formData.planned_value}
                  onChange={(e) => handleChange('planned_value', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Value
                </label>
                <Input
                  type="number"
                  value={formData.actual_value}
                  onChange={(e) => handleChange('actual_value', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date *
                </label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => handleChange('target_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Date
                </label>
                <Input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => handleChange('completion_date', e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="on_track">On Track</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="at_risk">At Risk</option>
              </select>
            </div>

            {/* Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone
              </label>
              <Input
                type="text"
                value={formData.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                placeholder="Zone name..."
                className="w-full"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Enter any additional notes"
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
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
                {kpi ? 'Save Changes' : 'Add KPI'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { ProcessedKPI } from '@/lib/kpiProcessor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Target, TrendingUp, Save, X, Sparkles } from 'lucide-react'
import { EnhancedQuantitySummary } from '@/components/kpi/EnhancedQuantitySummary'
import { BOQActivity, Project } from '@/lib/supabase'

interface SmartKPIFormProps {
  kpi: ProcessedKPI | null
  projects: Array<{ project_code: string; project_name: string; project_full_code?: string }>
  activities?: BOQActivity[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function SmartKPIForm({ kpi, projects, activities = [], onSubmit, onCancel }: SmartKPIFormProps) {
  const guard = usePermissionGuard()
  const [formData, setFormData] = useState({
    project_full_code: '',
    activity_description: '', // ✅ Use merged column
    section: '',
    zone: '',
    quantity: 0,
    input_type: 'Planned' as 'Planned' | 'Actual',
    drilled_meters: 0,
  })
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // ✅ Find selected project using Project Full Code matching
  const selectedProject = projects.find(p => {
    const pCode = (p.project_code || '').toString().trim().toUpperCase()
    const pFullCode = (p.project_full_code || p.project_code || '').toString().trim().toUpperCase()
    const formCode = (formData.project_full_code || '').toString().trim().toUpperCase()
    
    // Match by project_full_code first, then project_code
    return pFullCode === formCode || pCode === formCode
  }) as Project | undefined
  
  // ✅ Get actual project full code for Quantity Summary
  const actualProjectFullCode = selectedProject?.project_full_code || selectedProject?.project_code || formData.project_full_code
  
  // ✅ Find selected activity using Project Full Code matching
  const selectedActivity = activities.find(a => {
    const activityDesc = (a.activity_description || (a as any).activity_name || (a as any).activity || '').toLowerCase().trim()
    const formActivityDesc = (formData.activity_description || '').toLowerCase().trim()
    
    if (activityDesc !== formActivityDesc) return false
    
    const aProjectCode = (a.project_code || '').toString().trim().toUpperCase()
    const aProjectFullCode = (a.project_full_code || a.project_code || '').toString().trim().toUpperCase()
    const formCode = (formData.project_full_code || '').toString().trim().toUpperCase()
    
    // Match by project_full_code first, then project_code
    return aProjectFullCode === formCode || aProjectCode === formCode
  })
  
  // Auto-load data when editing
  useEffect(() => {
    if (kpi) {
      setIsEditing(true)
      setFormData({
        project_full_code: kpi.project_full_code || '',
        activity_description: kpi.activity_description || kpi.activity_name || (kpi as any).activity || '',
        section: kpi.section || '',
        zone: kpi.zone || (kpi as any).zone_number || '',
        quantity: kpi.quantity || 0,
        input_type: kpi.input_type || 'Planned',
        drilled_meters: kpi.drilled_meters || 0,
      })
    } else {
      setIsEditing(false)
      setFormData({
        project_full_code: '',
        activity_description: '',
        section: '',
        zone: '',
        quantity: 0,
        input_type: 'Planned',
        drilled_meters: 0,
      })
    }
  }, [kpi])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.project_full_code.trim()) {
      setError('Please select a project')
      return
    }

    if (!formData.activity_description.trim()) {
      setError('Please enter activity description')
      return
    }

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0')
      return
    }

    console.log('Form submitting:', formData)
    
    try {
      await onSubmit(formData)
      console.log('Form submitted successfully')
    } catch (err) {
      console.error('Form submit error:', err)
      setError('Failed to save. Please try again.')
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Calculate smart preview
  const getStatusPreview = () => {
    if (formData.quantity >= 500) return { status: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' }
    if (formData.quantity >= 100) return { status: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (formData.quantity >= 10) return { status: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { status: 'Low', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const statusPreview = getStatusPreview()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-gray-900 dark:text-white">
                  {isEditing ? 'Edit KPI Record' : 'Create New KPI'}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {isEditing ? 'Update existing record' : 'Add a new KPI record'}
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
          {isEditing && kpi && (
            <div className={`mb-4 p-4 rounded-lg border-l-4 ${
              kpi.input_type === 'Planned'
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-500'
                : 'bg-green-50 dark:bg-green-950 border-green-500'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-semibold ${
                  kpi.input_type === 'Planned' 
                    ? 'text-blue-900 dark:text-blue-200' 
                    : 'text-green-900 dark:text-green-200'
                }`}>
                  Current Values:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                  <div className="font-medium text-gray-900 dark:text-white mt-0.5">
                    {kpi.activity_description || kpi.activity_name || (kpi as any).activity || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <div className={`font-medium mt-0.5 ${
                    kpi.input_type === 'Planned' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {kpi.input_type === 'Planned' ? '🎯 Planned' : '✓ Actual'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {kpi.quantity.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <div className="font-medium text-gray-900 dark:text-white mt-0.5 capitalize">
                    {kpi.status}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection - Simple */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.input_type}
                onChange={(e) => handleChange('input_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="Planned">🎯 Planned (Target)</option>
                <option value="Actual">✓ Actual (Achievement)</option>
              </select>
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.project_full_code}
                onChange={(e) => handleChange('project_full_code', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Project...</option>
                {projects.map((project) => {
                  // ✅ Use Project Full Code if available, otherwise use Project Code
                  const projectCodeToUse = project.project_full_code || project.project_code
                  const displayCode = project.project_full_code || project.project_code
                  return (
                    <option key={projectCodeToUse} value={projectCodeToUse}>
                      {displayCode} - {project.project_name}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Activity Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Description <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.activity_description}
                onChange={(e) => handleChange('activity_description', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Activity Description...</option>
                {activities
                  .filter(a => {
                    const aProjectCode = (a.project_code || '').toString().trim().toUpperCase()
                    const aProjectFullCode = (a.project_full_code || a.project_code || '').toString().trim().toUpperCase()
                    const formCode = (formData.project_full_code || '').toString().trim().toUpperCase()
                    return formCode && (aProjectFullCode === formCode || aProjectCode === formCode)
                  })
                  .map((activity) => {
                    const activityDesc = activity.activity_description || (activity as any).activity_name || (activity as any).activity || ''
                    const raw = (activity as any).raw || {}
                    const displayText = activityDesc || 
                                      activity['Activity Description'] ||
                                      raw['Activity Description'] ||
                                      raw['Activity Name'] ||
                                      raw['Activity'] ||
                                      'No description'
                    return (
                      <option key={activity.id} value={displayText}>
                        {displayText}
                      </option>
                    )
                  })}
              </select>
            </div>

            {/* Section (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                type="text"
                value={formData.section}
                onChange={(e) => handleChange('section', e.target.value)}
                placeholder="e.g., -10m, Section A"
              />
            </div>

            {/* Zone (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zone <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                type="text"
                value={formData.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                placeholder="e.g., Zone 1, Area A"
              />
            </div>

            {/* Quantity and Drilled Meters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  required
                />
                
                {/* Quantity Summary */}
                {selectedActivity && selectedProject && formData.activity_description && formData.project_full_code && (
                  <div className="mt-3">
                    <EnhancedQuantitySummary
                      selectedActivity={selectedActivity}
                      selectedProject={selectedProject}
                      newQuantity={formData.input_type === 'Actual' ? formData.quantity : 0}
                      unit={selectedActivity.unit || ''}
                      showDebug={false}
                      zone={formData.zone || undefined} // ✅ Pass Zone filter
                      projectFullCode={actualProjectFullCode} // ✅ Pass Project Full Code
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Drilled Meters (Optional)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.drilled_meters}
                  onChange={(e) => handleChange('drilled_meters', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
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
                    Update KPI
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Create KPI
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

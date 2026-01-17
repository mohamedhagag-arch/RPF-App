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
    // ✅ New fields from the image
    activity_timing: 'post-commencement', // 'pre-commencement', 'post-commencement', or 'post-completion'
    has_value: true,
    affects_timeline: false,
    planned_value: 0,
    start_date: '',
    end_date: '',
    duration: 0,
    compressed_project: false,
    auto_generate_kpi: true,
  })
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<any>(null)
  const [projectActivities, setProjectActivities] = useState<any[]>([])
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false)
  
  // Auto-load data when editing
  useEffect(() => {
    if (activity) {
      setIsEditing(true)
      setFormData({
        project_code: activity.project_code || '',
        activity_name: activity.activity_description || '',
        activity_division: activity.activity_division || '',
        unit: activity.unit || '',
        total_units: activity.total_units || 0,
        planned_units: activity.planned_units || 0,
        actual_units: activity.actual_units || 0,
        rate: activity.rate || 0,
        planned_activity_start_date: activity.planned_activity_start_date || '',
        deadline: activity.deadline || '',
        // ✅ New fields with defaults
        activity_timing: 'post-commencement',
        has_value: true,
        affects_timeline: false,
        planned_value: 0,
        start_date: '',
        end_date: '',
        duration: 0,
        compressed_project: false,
        auto_generate_kpi: true,
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
        // ✅ New fields with defaults
        activity_timing: 'post-commencement',
        has_value: true,
        affects_timeline: false,
        planned_value: 0,
        start_date: '',
        end_date: '',
        duration: 0,
        compressed_project: false,
        auto_generate_kpi: true,
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

  // ✅ Handle project selection and load project details
  const handleProjectChange = async (projectCode: string) => {
    console.log('🎯 Project selected:', projectCode)
    
    const project = projects.find(p => p.project_code === projectCode)
    if (!project) {
      console.error('❌ Project not found:', projectCode)
      return
    }
    
    console.log('✅ Project found:', project.project_name)
    
    // Update form data immediately
    setFormData(prev => ({
      ...prev,
      project_code: projectCode,
    }))

    // ✅ Show project details immediately (without waiting for database)
    const immediateProjectDetails = {
      project_name: project.project_name,
      project_code: project.project_code,
      project_status: project.project_status,
      project_type: (project as any).project_type || 'General',
      divisions: (project as any).divisions || ['General Division'],
      activities_count: 0 // Will be updated after loading
    }
    
    console.log('📋 Setting immediate project details:', immediateProjectDetails)
    setSelectedProjectDetails(immediateProjectDetails)

    // ✅ Load project activities from database
    try {
      console.log('🔄 Loading project activities for:', project.project_name)
      
      // Try different import methods
      let supabase
      try {
        const { getSupabaseClient } = await import('@/lib/simpleConnectionManager')
        supabase = getSupabaseClient()
      } catch (importError) {
        console.log('⚠️ Fallback to direct import')
        const { supabase: fallbackSupabase } = await import('@/lib/supabase')
        supabase = fallbackSupabase
      }
      
      // Get project activities
      const { data: activities, error: activitiesError } = await supabase
        .from('Planning Database - BOQ Rates')
        .select('*')
        .eq('project_code', project.project_code)
        .order('activity_name')
      
      if (activitiesError) {
        console.error('❌ Error loading activities:', activitiesError)
        // Don't return, continue with empty activities
      }
      
      console.log('📊 Loaded activities:', activities?.length || 0)
      
      // Store activities for suggestions
      setProjectActivities(activities || [])
      
      // ✅ Update project details with activities data
      const uniqueDivisions = activities && activities.length > 0 ? 
        Array.from(new Set(activities.map((act: any) => act.activity_division).filter(Boolean))) : 
        ['General Division']
      
      const updatedProjectDetails = {
        project_name: project.project_name,
        project_code: project.project_code,
        project_status: project.project_status,
        project_type: (project as any).project_type || 'General',
        divisions: uniqueDivisions.length > 0 ? uniqueDivisions : ['General Division'],
        activities_count: activities?.length || 0
      }
      
      console.log('📋 Updated project details:', updatedProjectDetails)
      setSelectedProjectDetails(updatedProjectDetails)
      
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
      // Keep the immediate project details even if database fails
    }
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

  // ✅ Debug: Log state changes
  useEffect(() => {
    console.log('🔍 SmartBOQForm State Update:')
    console.log('  - selectedProjectDetails:', selectedProjectDetails)
    console.log('  - projectActivities:', projectActivities.length)
    console.log('  - showActivitySuggestions:', showActivitySuggestions)
    console.log('  - formData.project_code:', formData.project_code)
  }, [selectedProjectDetails, projectActivities, showActivitySuggestions, formData.project_code])

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
                    {activity.activity_description}
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
                onChange={(e) => handleProjectChange(e.target.value)}
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
                      {selectedProjectDetails.divisions && selectedProjectDetails.divisions.map((division: string, index: number) => (
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

            {/* Activity Name & Division */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
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
                      .filter(act => {
                        // ✅ Filter by project divisions only
                        const projectDivisions = selectedProjectDetails?.divisions || []
                        const isFromProjectDivision = projectDivisions.length > 0 ? 
                          projectDivisions.some((div: string) => 
                            act.activity_division?.toLowerCase().includes(div.toLowerCase()) ||
                            div.toLowerCase().includes(act.activity_division?.toLowerCase() || '')
                          ) : true // Show all if no divisions specified
                        
                        // Also filter by search term
                        const matchesSearch = formData.activity_name.length === 0 || 
                          act.activity_name?.toLowerCase().includes(formData.activity_name.toLowerCase()) ||
                          act.activity?.toLowerCase().includes(formData.activity_name.toLowerCase())
                        
                        return isFromProjectDivision && matchesSearch
                      })
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
                    {projectActivities.filter(act => {
                      const projectDivisions = selectedProjectDetails?.divisions || []
                      const isFromProjectDivision = projectDivisions.length > 0 ? 
                        projectDivisions.some((div: string) => 
                          act.activity_division?.toLowerCase().includes(div.toLowerCase()) ||
                          div.toLowerCase().includes(act.activity_division?.toLowerCase() || '')
                        ) : true
                      const matchesSearch = formData.activity_name.length === 0 || 
                        act.activity_name?.toLowerCase().includes(formData.activity_name.toLowerCase()) ||
                        act.activity?.toLowerCase().includes(formData.activity_name.toLowerCase())
                      return isFromProjectDivision && matchesSearch
                    }).length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        No matching activities found for this project's divisions
                      </div>
                    )}
                  </div>
                )}
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

            {/* ✅ Activity Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Activity Timing <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.activity_timing === 'pre-commencement' 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleChange('activity_timing', 'pre-commencement')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="activity_timing"
                      value="pre-commencement"
                      checked={formData.activity_timing === 'pre-commencement'}
                      onChange={() => handleChange('activity_timing', 'pre-commencement')}
                      className="w-4 h-4 text-orange-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Pre-commencement</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Activities that must be completed before project start
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.activity_timing === 'post-commencement' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleChange('activity_timing', 'post-commencement')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="activity_timing"
                      value="post-commencement"
                      checked={formData.activity_timing === 'post-commencement'}
                      onChange={() => handleChange('activity_timing', 'post-commencement')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Post-commencement</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Activities that start with or after project start
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.activity_timing === 'post-completion' 
                      ? 'border-red-500 bg-red-50 dark:bg-red-950' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleChange('activity_timing', 'post-completion')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="activity_timing"
                      value="post-completion"
                      checked={formData.activity_timing === 'post-completion'}
                      onChange={() => handleChange('activity_timing', 'post-completion')}
                      className="w-4 h-4 text-red-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Post-completion</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Activities that occur after project completion
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Planned Values */}
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="Enter quantity (> 0 for KPIs)"
                  required
                />
                <div className="flex items-center mt-1 text-yellow-600">
                  <span className="text-sm">▲ Required for KPI auto-generation! Enter a value greater than 0</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Value (Optional)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.planned_value}
                  onChange={(e) => handleChange('planned_value', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <div className="flex items-center mt-1 text-gray-500">
                  <span className="text-sm">💰 Total budget/cost</span>
                </div>
              </div>
            </div>

            {/* ✅ Dates and Duration */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  placeholder="mm/dd/yyyy"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  placeholder="mm/dd/yyyy"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (Working Days)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <div className="flex items-center mt-1 text-gray-500">
                  <span className="text-sm">🕐 Auto-calculated</span>
                </div>
              </div>
            </div>

            {/* ✅ Additional Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="compressed_project"
                  checked={formData.compressed_project}
                  onChange={(e) => handleChange('compressed_project', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="compressed_project" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Compressed Project (Include Weekends)
                </label>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 ml-7">
                Enable this for urgent projects that work 7 days a week
              </div>
              <div className="flex items-center ml-7 text-red-500">
                <span className="text-sm">🚫 Sunday = Weekend</span>
              </div>
            </div>

            {/* ✅ Auto-Generate KPI Records */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto_generate_kpi"
                  checked={formData.auto_generate_kpi}
                  onChange={(e) => handleChange('auto_generate_kpi', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_generate_kpi" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-Generate Daily KPI Records
                </label>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 ml-7">
                Automatically create planned KPI records distributed evenly across working days
              </div>
              <div className="flex items-center ml-7 text-yellow-600">
                <span className="text-sm">▲ Complete the form to generate KPIs:</span>
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


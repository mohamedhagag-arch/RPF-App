'use client'

import { useState, useEffect } from 'react'
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
  
  // Load data when editing
  useEffect(() => {
    if (kpi) {
      setProjectCode(kpi.project_full_code || '')
      setActivityName(kpi.activity_name || '')
      setInputType(kpi.input_type || 'Planned')
      setQuantity(kpi.quantity?.toString() || '')
      setUnit(kpi.unit || '')
      setTargetDate(kpi.target_date || kpi['Target Date'] || '')
      setActualDate(kpi.actual_date || kpi['Actual Date'] || '')
      setSection(kpi.section || '')
      setDay(kpi.day || '')
      setDrilledMeters(kpi.drilled_meters?.toString() || kpi['Drilled Meters']?.toString() || '')
    }
  }, [kpi])
  
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
  
  // Auto-fill unit when activity is selected
  useEffect(() => {
    if (activityName && availableActivities.length > 0) {
      const selectedActivity = availableActivities.find(
        a => a.activity_name === activityName
      )
      
      if (selectedActivity && selectedActivity.unit) {
        setUnit(selectedActivity.unit)
        console.log('✅ Unit auto-filled:', selectedActivity.unit)
      }
    }
  }, [activityName, availableActivities])
  
  function handleProjectSelect(selectedCode: string) {
    setProjectCode(selectedCode)
    setShowProjectDropdown(false)
    // Reset activity when project changes
    if (selectedCode !== projectCode) {
      setActivityName('')
      setUnit('')
    }
  }
  
  function handleActivitySelect(selectedActivity: string) {
    setActivityName(selectedActivity)
    setShowActivityDropdown(false)
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
      if (!unit) throw new Error('Please enter a unit')
      if (inputType === 'Planned' && !targetDate) throw new Error('Please enter target date for Planned KPI')
      if (inputType === 'Actual' && !actualDate) throw new Error('Please enter actual date for Actual KPI')
      
      const kpiData = {
        project_full_code: project?.project_code || projectCode,
        project_code: projectCode,
        project_sub_code: project?.project_sub_code || '',
        activity_name: activityName,
        quantity: parseFloat(quantity),
        unit,
        input_type: inputType,
        target_date: targetDate,
        actual_date: actualDate,
        activity_date: inputType === 'Actual' ? actualDate : targetDate,
        section,
        day,
        drilled_meters: parseFloat(drilledMeters) || 0,
        'Target Date': targetDate,
        'Actual Date': actualDate,
        'Drilled Meters': parseFloat(drilledMeters) || 0
      }
      
      console.log('📦 Submitting KPI:', kpiData)
      
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
                        onClick={() => handleProjectSelect(p.project_code)}
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
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., m³, m, ton..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) => setActualDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
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



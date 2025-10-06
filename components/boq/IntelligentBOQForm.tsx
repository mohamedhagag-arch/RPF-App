'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Project, TABLES } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { 
  calculateWorkdays, 
  calculateEndDate,
  WorkdaysConfig,
  UAE_HOLIDAYS
} from '@/lib/workdaysCalculator'
import { 
  getSuggestedUnit,
  getAllUnits,
  ActivityTemplate,
  ACTIVITY_TEMPLATES
} from '@/lib/activityTemplates'
import { 
  saveCustomActivity,
  getAllActivitiesByDivision
} from '@/lib/customActivities'
import { 
  generateKPIsFromBOQ, 
  saveGeneratedKPIs,
  updateKPIsFromBOQ,
  calculateKPISummary
} from '@/lib/autoKPIGenerator'
import { Clock, CheckCircle2, Info, Sparkles, X, Calendar, TrendingUp, AlertCircle } from 'lucide-react'

interface IntelligentBOQFormProps {
  activity?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  projects?: Project[]
}

export function IntelligentBOQForm({ activity, onSubmit, onCancel, projects = [] }: IntelligentBOQFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projectLoading, setProjectLoading] = useState(false)
  const [allProjects, setAllProjects] = useState<Project[]>(projects)
  
  // Form Fields
  const [projectCode, setProjectCode] = useState(activity?.project_code || '')
  const [project, setProject] = useState<Project | null>(null)
  const [activityName, setActivityName] = useState(activity?.activity_name || '')
  const [activitySuggestions, setActivitySuggestions] = useState<ActivityTemplate[]>([])
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [unit, setUnit] = useState(activity?.unit || '')
  const [unitSuggestions] = useState<string[]>(getAllUnits())
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [plannedUnits, setPlannedUnits] = useState(activity?.planned_units?.toString() || '')
  const [plannedValue, setPlannedValue] = useState(activity?.planned_value?.toString() || '')
  const [startDate, setStartDate] = useState(activity?.planned_activity_start_date || '')
  const [endDate, setEndDate] = useState(activity?.deadline || '')
  const [duration, setDuration] = useState(0)
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const [customHolidays, setCustomHolidays] = useState<string[]>([])
  
  // KPI Generation
  const [autoGenerateKPIs, setAutoGenerateKPIs] = useState(true)
  const [kpiPreview, setKpiPreview] = useState<any>(null)
  const [showKPITable, setShowKPITable] = useState(false)
  const [kpiGenerationStatus, setKpiGenerationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  
  const supabase = createClientComponentClient()
  
  // Workdays Configuration
  const workdaysConfig: WorkdaysConfig = {
    weekendDays: includeWeekends ? [] : [0], // Sunday = 0
    holidays: UAE_HOLIDAYS,
    includeWeekends
  }
  
  // Load projects on mount
  useEffect(() => {
    if (allProjects.length === 0 && projects.length === 0) {
      loadAllProjects()
    } else if (projects.length > 0) {
      setAllProjects(projects)
    }
  }, [projects])
  
  // Auto-load project data when project code changes
  useEffect(() => {
    if (projectCode && allProjects.length > 0) {
      const selectedProject = allProjects.find(p => p.project_code === projectCode)
      if (selectedProject) {
        setProject(selectedProject)
        console.log('✅ Project loaded:', selectedProject.project_name)
      }
    }
  }, [projectCode, allProjects])
  
  // Load activity suggestions based on division
  useEffect(() => {
    if (project?.responsible_division) {
      const suggestions = getAllActivitiesByDivision(project.responsible_division, ACTIVITY_TEMPLATES)
      setActivitySuggestions(suggestions)
      console.log(`📋 Loaded ${suggestions.length} activity suggestions for ${project.responsible_division}`)
    }
  }, [project])
  
  // Auto-suggest unit when activity name changes
  useEffect(() => {
    if (activityName && !unit) {
      const suggestedUnit = getSuggestedUnit(activityName)
      if (suggestedUnit) {
        setUnit(suggestedUnit)
        console.log('💡 Auto-suggested unit:', suggestedUnit)
      }
    }
  }, [activityName])
  
  // Calculate duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const workdays = calculateWorkdays(startDate, endDate, workdaysConfig)
      setDuration(workdays)
      console.log(`📅 Duration calculated: ${workdays} working days`)
      
      // Auto-generate KPI preview if enabled
      if (autoGenerateKPIs && plannedUnits && parseFloat(plannedUnits) > 0) {
        generateKPIPreview()
      }
    }
  }, [startDate, endDate, includeWeekends, plannedUnits, autoGenerateKPIs])
  
  // Load custom holidays from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customHolidays')
      if (stored) {
        const holidays = JSON.parse(stored)
        setCustomHolidays(holidays.map((h: any) => h.date))
      }
    } catch (err) {
      console.error('Error loading custom holidays:', err)
    }
  }, [])
  
  async function loadAllProjects() {
    try {
      setProjectLoading(true)
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('project_code', { ascending: true })
      
      if (error) throw error
      
      if (data) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          project_code: item['Project Code'],
          project_sub_code: item['Project Sub-Code'],
          project_full_code: item['Project Code'],
          project_name: item['Project Name'],
          project_type: item['Project Type'],
          responsible_division: item['Responsible Division'],
          plot_number: item['Plot Number'],
          kpi_completed: item['KPI Completed'] === 'TRUE',
          project_status: item['Project Status']?.toLowerCase(),
          contract_amount: parseFloat(item['Contract Amount'] || '0'),
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by
        }))
        setAllProjects(mapped)
        console.log(`✅ Loaded ${mapped.length} projects`)
      }
    } catch (err: any) {
      console.error('❌ Error loading projects:', err)
      setError('Failed to load projects: ' + err.message)
    } finally {
      setProjectLoading(false)
    }
  }
  
  async function generateKPIPreview() {
    if (!startDate || !endDate || !plannedUnits || parseFloat(plannedUnits) <= 0 || !activityName) {
      setKpiPreview(null)
      setKpiGenerationStatus('idle')
      return
    }
    
    try {
      setKpiGenerationStatus('loading')
      
      const tempActivity = {
        id: activity?.id || 'temp',
        project_code: projectCode,
        project_full_code: project?.project_code || projectCode,
        project_sub_code: project?.project_sub_code || '',
        activity_name: activityName,
        unit: unit || 'No.',
        planned_units: parseFloat(plannedUnits),
        planned_value: parseFloat(plannedValue) || 0,
        planned_activity_start_date: startDate,
        deadline: endDate,
        zone_ref: project?.responsible_division || '',
        project_full_name: project?.project_name || ''
      }
      
      const kpis = await generateKPIsFromBOQ(tempActivity as any, workdaysConfig)
      const summary = calculateKPISummary(kpis)
      
      setKpiPreview({ kpis, summary })
      setKpiGenerationStatus('ready')
      
      console.log(`✅ Generated ${summary.totalKPIs} KPI records (Total: ${summary.totalQuantity} ${unit})`)
    } catch (err) {
      console.error('❌ Error generating KPI preview:', err)
      setKpiGenerationStatus('error')
      setKpiPreview(null)
    }
  }
  
  function handleActivitySelect(selectedActivity: ActivityTemplate) {
    setActivityName(selectedActivity.name)
    setUnit(selectedActivity.defaultUnit)
    setShowActivityDropdown(false)
    console.log('✅ Selected activity:', selectedActivity.name)
  }
  
  function handleUnitSelect(selectedUnit: string) {
    setUnit(selectedUnit)
    setShowUnitDropdown(false)
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validate required fields
      if (!projectCode) throw new Error('Please select a project')
      if (!activityName) throw new Error('Please enter activity name')
      if (!unit) throw new Error('Please enter unit')
      if (!startDate) throw new Error('Please enter start date')
      if (!endDate) throw new Error('Please enter end date')
      
      const activityData = {
        ...(activity?.id && { id: activity.id }), // Include ID if editing
        project_code: projectCode,
        project_sub_code: project?.project_sub_code || '',
        project_full_code: project?.project_code || projectCode,
        activity_name: activityName,
        activity_division: project?.responsible_division || '',
        zone_ref: project?.responsible_division || '',
        unit,
        planned_units: parseFloat(plannedUnits) || 0,
        planned_value: parseFloat(plannedValue) || 0,
        planned_activity_start_date: startDate,
        deadline: endDate,
        calendar_duration: duration,
        project_full_name: project?.project_name || '',
        project_status: project?.project_status || 'active',
        total_units: 0,
        actual_units: 0,
        total_drilling_meters: 0
      }
      
      // Save custom activity if it's new
      const isCustomActivity = !ACTIVITY_TEMPLATES.find(
        t => t.name.toLowerCase() === activityName.toLowerCase()
      )
      
      if (isCustomActivity && activityName && unit && project?.responsible_division) {
        await saveCustomActivity(
          activityName, 
          project.responsible_division, 
          unit, 
          duration
        )
        console.log('💾 Saved custom activity:', activityName)
      }
      
      // Submit the activity
      await onSubmit(activityData)
      
      console.log('========================================')
      console.log('🔍 KPI Generation/Update Check:')
      console.log('  - Mode:', activity ? 'EDIT' : 'CREATE')
      console.log('  - autoGenerateKPIs:', autoGenerateKPIs)
      console.log('  - kpiPreview:', kpiPreview)
      console.log('  - kpiPreview.kpis count:', kpiPreview?.kpis?.length || 0)
      console.log('========================================')
      
      // Handle KPIs based on mode (Create vs Update)
      if (autoGenerateKPIs && kpiPreview?.kpis && kpiPreview.kpis.length > 0) {
        if (activity) {
          // ✅ EDIT MODE: Delete old KPIs and create new ones
          console.log('🔄 UPDATING KPIs for existing activity...')
          console.log('📦 Activity to update:', {
            id: activity.id,
            project_full_code: activityData.project_full_code,
            activity_name: activityData.activity_name,
            planned_units: activityData.planned_units
          })
          
          const updateResult = await updateKPIsFromBOQ(activityData, workdaysConfig, activity.activity_name)
          
          if (updateResult.success) {
            const parts = []
            if (updateResult.updated > 0) parts.push(`Updated ${updateResult.updated} KPIs`)
            if (updateResult.added > 0) parts.push(`Added ${updateResult.added} new KPIs`)
            if (updateResult.deleted > 0) parts.push(`Deleted ${updateResult.deleted} extra KPIs`)
            
            setSuccess(`✅ Activity updated! ${parts.join(', ')}`)
            console.log(`✅ Smart KPI Update: Updated=${updateResult.updated}, Added=${updateResult.added}, Deleted=${updateResult.deleted}`)
          } else {
            console.error('❌ KPI update failed:', updateResult.error)
            setSuccess('⚠️ Activity updated but KPI sync failed: ' + updateResult.error)
          }
        } else {
          // ✅ CREATE MODE: Create new KPIs
          console.log('🚀 CREATING new KPIs...')
          console.log('📦 KPIs to save:', JSON.stringify(kpiPreview.kpis.slice(0, 2), null, 2))
          
          const result = await saveGeneratedKPIs(kpiPreview.kpis)
          
          if (result.success) {
            setSuccess(`✅ Activity created with ${result.count} KPI records!`)
            console.log('✅ Created', result.count, 'KPI records')
          } else {
            console.error('❌ KPI generation failed:', result.error)
            setSuccess('⚠️ Activity created but KPI generation failed: ' + result.error)
          }
        }
      } else {
        console.warn('⚠️ KPIs NOT processed because:')
        if (!autoGenerateKPIs) console.warn('  - Auto-generate KPIs is DISABLED')
        if (!kpiPreview) console.warn('  - No KPI preview available')
        if (!kpiPreview?.kpis || kpiPreview.kpis.length === 0) console.warn('  - KPI preview is empty')
        setSuccess(activity ? '✅ Activity updated successfully!' : '✅ Activity created successfully!')
      }
      
      // Close form after short delay to show success message
      setTimeout(() => {
        onCancel()
      }, 1500)
      
    } catch (err: any) {
      console.error('❌ Error submitting activity:', err)
      setError(err.message || 'An error occurred while saving the activity')
    } finally {
      setLoading(false)
    }
  }
  
  const isFormValid = projectCode && activityName && unit && startDate && endDate
  const canPreviewKPIs = isFormValid && plannedUnits && parseFloat(plannedUnits) > 0
  
  return (
    <>
      {/* Main Form Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <ModernCard className="w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activity ? '✏️ Edit BOQ Activity' : '✨ Smart BOQ Activity Creator'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Intelligent form with auto-suggestions and KPI generation
                  </p>
                </div>
              </div>
              <button 
                onClick={onCancel} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Alerts */}
          {error && (
            <Alert variant="error" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </Alert>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select 
                value={projectCode} 
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                disabled={loading || projectLoading}
              >
                <option value="">
                  {projectLoading ? 'Loading projects...' : 'Select a project...'}
                </option>
                {allProjects.map((proj) => (
                  <option key={proj.id} value={proj.project_code}>
                    {proj.project_code} - {proj.project_name}
                  </option>
                ))}
              </select>
              
              {/* Project Info Card */}
              {project && (
                <ModernCard className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {project.project_name}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <ModernBadge variant="info" size="sm">
                          {project.responsible_division}
                        </ModernBadge>
                        <ModernBadge variant="purple" size="sm">
                          {project.project_type}
                        </ModernBadge>
                        {project.project_status && (
                          <ModernBadge 
                            variant={project.project_status === 'active' ? 'success' : 'gray'} 
                            size="sm"
                          >
                            {project.project_status}
                          </ModernBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </ModernCard>
              )}
            </div>
            
            {/* Activity Name with Suggestions */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <Input 
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value)
                  setShowActivityDropdown(true)
                }}
                onFocus={() => setShowActivityDropdown(true)}
                placeholder="Type activity name or select from suggestions..."
                required
                disabled={loading}
              />
              
              {/* Activity Suggestions Dropdown */}
              {showActivityDropdown && activitySuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      💡 Suggested activities for {project?.responsible_division || 'this division'}
                    </p>
                  </div>
                  {activitySuggestions
                    .filter(act => 
                      activityName === '' || 
                      act.name.toLowerCase().includes(activityName.toLowerCase())
                    )
                    .map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActivitySelect(act)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-gray-900 dark:text-white">{act.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600">
                          {act.defaultUnit}
                        </span>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            
            {/* Unit with Suggestions */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <Input 
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value)
                  setShowUnitDropdown(true)
                }}
                onFocus={() => setShowUnitDropdown(true)}
                placeholder="e.g., Running Meter, Sq.M, No., etc."
                required
                disabled={loading}
              />
              
              {/* Unit Suggestions Dropdown */}
              {showUnitDropdown && unitSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      📏 Common units
                    </p>
                  </div>
                  {unitSuggestions
                    .filter(u => 
                      unit === '' || 
                      u.toLowerCase().includes(unit.toLowerCase())
                    )
                    .map((u, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUnitSelect(u)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-900 dark:text-white"
                      >
                        {u}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            
            {/* Planned Units and Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Units {autoGenerateKPIs && <span className="text-red-500">*</span>}
                </label>
                <Input 
                  type="number" 
                  step="1"
                  min="0"
                  value={plannedUnits}
                  onChange={(e) => setPlannedUnits(e.target.value)}
                  placeholder={autoGenerateKPIs ? "Enter quantity (> 0 for KPIs)" : "0 (can update later)"}
                  disabled={loading}
                  className={autoGenerateKPIs && (!plannedUnits || parseFloat(plannedUnits) <= 0) ? 'border-2 border-amber-400' : ''}
                />
                {autoGenerateKPIs && (!plannedUnits || parseFloat(plannedUnits) <= 0) ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Required for KPI auto-generation! Enter a value greater than 0</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Can be 0 if you want to update it later (KPIs won't be generated)
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Value (Optional)
                </label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={plannedValue}
                  onChange={(e) => setPlannedValue(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💰 Total budget/cost
                </p>
              </div>
            </div>
            
            {/* Dates and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={loading}
                  min={startDate}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (Working Days)
                </label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={duration}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-700 cursor-not-allowed pr-10"
                    disabled
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  🗓️ Auto-calculated
                </p>
              </div>
            </div>
            
            {/* Compressed Project Option */}
            <ModernCard className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="include-weekends" 
                    checked={includeWeekends}
                    onChange={(e) => setIncludeWeekends(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    disabled={loading}
                  />
                  <label htmlFor="include-weekends" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    🚀 Compressed Project (Include Weekends)
                  </label>
                </div>
                <ModernBadge variant="warning" size="sm" icon={<Info className="h-3 w-3" />}>
                  Sunday = Weekend
                </ModernBadge>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-7">
                Enable this for urgent projects that work 7 days a week
              </p>
            </ModernCard>
            
            {/* KPI Auto-Generation Section */}
            <ModernCard className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3 mb-3">
                <input 
                  type="checkbox" 
                  id="auto-kpi" 
                  checked={autoGenerateKPIs}
                  onChange={(e) => setAutoGenerateKPIs(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  disabled={loading}
                />
                <div className="flex-1">
                  <label htmlFor="auto-kpi" className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Auto-Generate Daily KPI Records
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Automatically create planned KPI records distributed evenly across working days
                  </p>
                </div>
              </div>
              
              {/* KPI Preview Status */}
              {autoGenerateKPIs && !canPreviewKPIs && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">
                        ⚠️ Complete the form to generate KPIs:
                      </p>
                      <ul className="list-none space-y-1.5">
                        {!projectCode && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Select a project</span>
                          </li>
                        )}
                        {!activityName && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter activity name</span>
                          </li>
                        )}
                        {!unit && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter unit</span>
                          </li>
                        )}
                        {!startDate && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter start date</span>
                          </li>
                        )}
                        {!endDate && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-medium">Enter end date</span>
                          </li>
                        )}
                        {(!plannedUnits || parseFloat(plannedUnits) <= 0) && (
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            <span className="font-bold text-amber-700 dark:text-amber-300">Enter planned units (must be {'>'}  0)</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* KPI Preview Ready */}
              {autoGenerateKPIs && kpiPreview && kpiPreview.summary.numberOfDays > 0 && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ✨ {kpiPreview.summary.numberOfDays} KPI records ready to be created
                      </p>
                    </div>
                    <ModernButton 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowKPITable(true)}
                      icon={<Calendar className="h-3 w-3" />}
                    >
                      View Details
                    </ModernButton>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Quantity</p>
                      <p className="text-lg font-bold text-green-600">
                        {kpiPreview.summary.totalQuantity}
                      </p>
                      <p className="text-xs text-gray-500">{unit || 'units'}</p>
                    </div>
                    
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Avg Per Day</p>
                      <p className="text-lg font-bold text-blue-600">
                        {kpiPreview.summary.averagePerDay}
                      </p>
                      <p className="text-xs text-gray-500">{unit || 'units'}/day</p>
                    </div>
                    
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Working Days</p>
                      <p className="text-lg font-bold text-purple-600">
                        {kpiPreview.summary.numberOfDays}
                      </p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>Note:</strong> All quantities are rounded to whole numbers. Total quantity = {kpiPreview.summary.totalQuantity} {unit} (exactly matches Planned Units)
                  </div>
                </div>
              )}
              
              {/* KPI Generation Error */}
              {autoGenerateKPIs && kpiGenerationStatus === 'error' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p className="font-medium">Failed to generate KPI preview</p>
                      <p className="mt-1">Please check your dates and try again</p>
                    </div>
                  </div>
                </div>
              )}
            </ModernCard>
            
            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ModernButton 
                type="submit" 
                variant="gradient" 
                loading={loading}
                disabled={!isFormValid}
                className="flex-1"
              >
                {activity ? '💾 Update Activity' : '✨ Create Activity'}
                {autoGenerateKPIs && kpiPreview && ` + ${kpiPreview.summary.numberOfDays} KPIs`}
              </ModernButton>
              
              <ModernButton 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </ModernButton>
            </div>
          </form>
        </ModernCard>
      </div>
      
      {/* KPI Preview Table Modal */}
      {showKPITable && kpiPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <ModernCard className="w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    📊 KPI Preview - {kpiPreview.summary.numberOfDays} Daily Records
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activityName} • Total: {kpiPreview.summary.totalQuantity} {unit}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowKPITable(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Quantity</p>
                <p className="text-2xl font-bold text-green-600">{kpiPreview.summary.totalQuantity}</p>
                <p className="text-xs text-gray-500">{unit}</p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Average Per Day</p>
                <p className="text-2xl font-bold text-blue-600">{kpiPreview.summary.averagePerDay}</p>
                <p className="text-xs text-gray-500">{unit}/day</p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Working Days</p>
                <p className="text-2xl font-bold text-purple-600">{kpiPreview.summary.numberOfDays}</p>
                <p className="text-xs text-gray-500">days</p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Date Range</p>
                <p className="text-sm font-bold text-amber-600">
                  {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
                  to {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            {/* KPI Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Day</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Unit</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {kpiPreview.kpis.map((kpi: any, index: number) => {
                    const date = new Date(kpi['Target Date'])
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
                    const isWeekend = date.getDay() === 0
                    const isToday = date.toDateString() === new Date().toDateString()
                    
                    return (
                      <tr 
                        key={index}
                        className={`
                          ${isWeekend && includeWeekends ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                          ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                          hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                        `}
                      >
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {dayName}
                          {isWeekend && <span className="ml-2 text-xs text-amber-600">⚠️ Weekend</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                          {kpi.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {kpi.unit}
                        </td>
                        <td className="px-4 py-3">
                          <ModernBadge variant="info" size="sm">
                            Planned
                          </ModernBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 text-lg">
                      {kpiPreview.summary.totalQuantity}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                      {unit}
                    </td>
                    <td className="px-4 py-3">
                      <ModernBadge variant="success" size="sm" icon={<CheckCircle2 className="h-3 w-3" />}>
                        Verified
                      </ModernBadge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Table Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                💡 All quantities are whole numbers. Total = {kpiPreview.summary.totalQuantity} {unit} (exactly matches Planned Units)
              </p>
              <ModernButton 
                type="button" 
                variant="primary" 
                onClick={() => setShowKPITable(false)}
              >
                Close Preview
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import {
  PROJECT_TYPES,
  DIVISIONS,
  PROJECT_STATUSES,
  generateProjectSubCode,
  suggestProjectType,
  validateProjectCode,
  estimateProjectDuration,
  getTypicalContractRange
} from '@/lib/projectTemplates'
import {
  saveCustomProjectType,
  saveCustomDivision,
  getAllProjectTypes,
  getAllDivisions,
  updateProjectMetadata,
  getProjectMetadata
} from '@/lib/customProjectData'
import {
  Sparkles,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  X,
  Info,
  AlertCircle,
  TrendingUp,
  Briefcase,
  Hash,
  Clock
} from 'lucide-react'

interface IntelligentProjectFormProps {
  project?: Project | null
  onSubmit: (data: Partial<Project>) => Promise<void>
  onCancel: () => void
}

export function IntelligentProjectForm({ project, onSubmit, onCancel }: IntelligentProjectFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form Fields
  const [projectCode, setProjectCode] = useState('')
  const [projectSubCode, setProjectSubCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectType, setProjectType] = useState('')
  const [responsibleDivision, setResponsibleDivision] = useState('')
  const [plotNumber, setPlotNumber] = useState('')
  const [contractAmount, setContractAmount] = useState('')
  const [projectStatus, setProjectStatus] = useState<'active' | 'completed' | 'on_hold' | 'cancelled' | 'planning'>('active')
  const [kpiCompleted, setKpiCompleted] = useState(false)
  
  // Suggestions & Dropdowns
  const [projectTypeSuggestions, setProjectTypeSuggestions] = useState<string[]>([])
  const [divisionSuggestions, setDivisionSuggestions] = useState<string[]>(DIVISIONS)
  const [showProjectTypeDropdown, setShowProjectTypeDropdown] = useState(false)
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  
  // Smart Features
  const [estimatedDuration, setEstimatedDuration] = useState(0)
  const [typicalContractRange, setTypicalContractRange] = useState({ min: 0, max: 0, typical: 0 })
  const [codeValidation, setCodeValidation] = useState<{ valid: boolean; message?: string }>({ valid: true })
  const [autoSubCode, setAutoSubCode] = useState(true)
  
  // Load project data if editing
  useEffect(() => {
    if (project) {
      setProjectCode(project.project_code)
      setProjectSubCode(project.project_sub_code || '')
      setProjectName(project.project_name)
      setProjectType(project.project_type || '')
      setResponsibleDivision(project.responsible_division || '')
      setPlotNumber(project.plot_number || '')
      setContractAmount(project.contract_amount?.toString() || '')
      setProjectStatus(project.project_status)
      setKpiCompleted(project.kpi_completed)
      setAutoSubCode(false)
    } else {
      // Load metadata for suggestions
      const metadata = getProjectMetadata()
      if (metadata.suggestedNextCode) {
        setProjectCode(metadata.suggestedNextCode)
      }
    }
  }, [project])
  
  // Load custom data
  useEffect(() => {
    const customTypes = getAllProjectTypes()
    const allTypes = [...PROJECT_TYPES, ...customTypes]
    setProjectTypeSuggestions(allTypes)
    
    const customDivisions = getAllDivisions()
    const allDivisions = [...DIVISIONS, ...customDivisions]
    setDivisionSuggestions(allDivisions)
  }, [])
  
  // Auto-generate sub-code when project code changes
  useEffect(() => {
    if (autoSubCode && projectCode) {
      const subCode = generateProjectSubCode(projectCode, '01')
      setProjectSubCode(subCode)
    }
  }, [projectCode, autoSubCode])
  
  // Validate project code
  useEffect(() => {
    if (projectCode) {
      const validation = validateProjectCode(projectCode)
      setCodeValidation(validation)
    } else {
      setCodeValidation({ valid: true })
    }
  }, [projectCode])
  
  // Update suggestions when division changes
  useEffect(() => {
    if (responsibleDivision) {
      const suggestions = suggestProjectType(responsibleDivision)
      setProjectTypeSuggestions([...suggestions, ...getAllProjectTypes()])
    }
  }, [responsibleDivision])
  
  // Estimate duration when project type changes
  useEffect(() => {
    if (projectType) {
      const duration = estimateProjectDuration(projectType)
      setEstimatedDuration(duration)
      
      const range = getTypicalContractRange(projectType)
      setTypicalContractRange(range)
    }
  }, [projectType])
  
  function handleProjectTypeSelect(type: string) {
    setProjectType(type)
    setShowProjectTypeDropdown(false)
    
    // Save if it's a custom type
    const isCustom = !PROJECT_TYPES.includes(type)
    if (isCustom) {
      saveCustomProjectType(type)
    }
  }
  
  function handleDivisionSelect(division: string) {
    setResponsibleDivision(division)
    setShowDivisionDropdown(false)
    
    // Save if it's a custom division
    const isCustom = !DIVISIONS.includes(division)
    if (isCustom) {
      saveCustomDivision(division)
    }
  }
  
  function fillTypicalContractAmount() {
    if (typicalContractRange.typical > 0) {
      setContractAmount(typicalContractRange.typical.toString())
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validate required fields
      if (!projectCode.trim()) throw new Error('Project code is required')
      if (!projectName.trim()) throw new Error('Project name is required')
      
      // Validate project code format
      if (!codeValidation.valid) {
        throw new Error(codeValidation.message || 'Invalid project code')
      }
      
      const projectData: Partial<Project> = {
        project_code: projectCode.trim().toUpperCase(),
        project_sub_code: projectSubCode.trim() || undefined,
        project_name: projectName.trim(),
        project_type: projectType.trim() || undefined,
        responsible_division: responsibleDivision.trim() || undefined,
        plot_number: plotNumber.trim() || undefined,
        contract_amount: parseFloat(contractAmount) || 0,
        project_status: projectStatus as 'active' | 'completed' | 'on_hold' | 'cancelled',
        kpi_completed: kpiCompleted
      }
      
      // Save custom values
      if (projectType && !PROJECT_TYPES.includes(projectType)) {
        saveCustomProjectType(projectType)
      }
      
      if (responsibleDivision && !DIVISIONS.includes(responsibleDivision)) {
        saveCustomDivision(responsibleDivision)
      }
      
      // Update metadata
      if (!project) {
        updateProjectMetadata(projectData.project_code!)
      }
      
      await onSubmit(projectData)
      
      setSuccess(`✅ Project ${project ? 'updated' : 'created'} successfully!`)
      
      // Close form after short delay
      setTimeout(() => {
        onCancel()
      }, 1500)
      
    } catch (err: any) {
      console.error('❌ Error submitting project:', err)
      setError(err.message || 'An error occurred while saving the project')
    } finally {
      setLoading(false)
    }
  }
  
  const isFormValid = projectCode && projectName && codeValidation.valid
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <ModernCard className="w-full max-w-6xl max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project ? '✏️ Edit Project' : '✨ Smart Project Creator'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Intelligent form with auto-suggestions and validation
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
          {/* Project Code Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Hash className="inline h-4 w-4 mr-1" />
                Project Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                placeholder="e.g., P5074, PRJ-2024-001"
                required
                disabled={loading}
                className={!codeValidation.valid ? 'border-red-500' : ''}
              />
              {!codeValidation.valid && codeValidation.message && (
                <p className="text-xs text-red-600 mt-1">⚠️ {codeValidation.message}</p>
              )}
              {codeValidation.valid && projectCode && (
                <p className="text-xs text-green-600 mt-1">✅ Valid project code</p>
              )}
            </div>
            
            {/* Project Sub-Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Hash className="inline h-4 w-4 mr-1" />
                Project Sub-Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={projectSubCode}
                  onChange={(e) => {
                    setProjectSubCode(e.target.value.toUpperCase())
                    setAutoSubCode(false)
                  }}
                  placeholder="Auto-generated or custom"
                  disabled={loading}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setAutoSubCode(true)}
                  className="px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  title="Auto-generate sub-code"
                >
                  🔄 Auto
                </button>
              </div>
              {autoSubCode && (
                <p className="text-xs text-blue-600 mt-1">💡 Auto-generated from project code</p>
              )}
            </div>
          </div>
          
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="inline h-4 w-4 mr-1" />
              Project Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter full project name..."
              required
              disabled={loading}
            />
          </div>
          
          {/* Division & Project Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsible Division */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Responsible Division
              </label>
              <Input
                value={responsibleDivision}
                onChange={(e) => {
                  setResponsibleDivision(e.target.value)
                  setShowDivisionDropdown(true)
                }}
                onFocus={() => setShowDivisionDropdown(true)}
                placeholder="Type or select division..."
                disabled={loading}
              />
              
              {/* Division Dropdown */}
              {showDivisionDropdown && divisionSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      👥 Select or add division
                    </p>
                  </div>
                  {divisionSuggestions
                    .filter(d => 
                      responsibleDivision === '' || 
                      d.toLowerCase().includes(responsibleDivision.toLowerCase())
                    )
                    .map((division, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDivisionSelect(division)}
                        className="w-full px-4 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-gray-900 dark:text-white"
                      >
                        {division}
                      </button>
                    ))
                  }
                  {responsibleDivision && !divisionSuggestions.some(d => d.toLowerCase() === responsibleDivision.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleDivisionSelect(responsibleDivision)}
                      className="w-full px-4 py-2 text-left bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-300 border-t border-green-200 dark:border-green-800"
                    >
                      ➕ Add "{responsibleDivision}" as new division
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Project Type */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Project Type
              </label>
              <Input
                value={projectType}
                onChange={(e) => {
                  setProjectType(e.target.value)
                  setShowProjectTypeDropdown(true)
                }}
                onFocus={() => setShowProjectTypeDropdown(true)}
                placeholder="Type or select project type..."
                disabled={loading}
              />
              
              {/* Project Type Dropdown */}
              {showProjectTypeDropdown && projectTypeSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {responsibleDivision 
                        ? `💡 Suggested for ${responsibleDivision}` 
                        : '📁 Select or add project type'
                      }
                    </p>
                  </div>
                  {projectTypeSuggestions
                    .filter(type => 
                      projectType === '' || 
                      type.toLowerCase().includes(projectType.toLowerCase())
                    )
                    .map((type, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleProjectTypeSelect(type)}
                        className="w-full px-4 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-gray-900 dark:text-white"
                      >
                        {type}
                      </button>
                    ))
                  }
                  {projectType && !projectTypeSuggestions.some(t => t.toLowerCase() === projectType.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleProjectTypeSelect(projectType)}
                      className="w-full px-4 py-2 text-left bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-300 border-t border-green-200 dark:border-green-800"
                    >
                      ➕ Add "{projectType}" as new type
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Smart Insights */}
          {projectType && (
            <ModernCard className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">
                    📊 Smart Insights for {projectType}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Typical Duration: <strong>{Math.round(estimatedDuration / 30)} months</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Typical Budget: <strong>AED {(typicalContractRange.typical / 1_000_000).toFixed(1)}M</strong>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Range: AED {(typicalContractRange.min / 1_000_000).toFixed(1)}M - {(typicalContractRange.max / 1_000_000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </ModernCard>
          )}
          
          {/* Plot Number & Contract Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plot Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Plot Number
              </label>
              <Input
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                placeholder="Enter plot number..."
                disabled={loading}
              />
            </div>
            
            {/* Contract Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Contract Amount (AED)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                  className="flex-1"
                />
                {typicalContractRange.typical > 0 && (
                  <button
                    type="button"
                    onClick={fillTypicalContractAmount}
                    className="px-3 py-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors whitespace-nowrap"
                    title="Fill typical amount"
                  >
                    💡 Typical
                  </button>
                )}
              </div>
              {contractAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  💰 {(parseFloat(contractAmount) / 1_000_000).toFixed(2)} Million AED
                </p>
              )}
            </div>
          </div>
          
          {/* Status & KPI Completed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Project Status
              </label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                disabled={loading}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <ModernBadge
                  variant={PROJECT_STATUSES.find(s => s.value === projectStatus)?.color as any || 'gray'}
                  size="sm"
                >
                  {PROJECT_STATUSES.find(s => s.value === projectStatus)?.label}
                </ModernBadge>
              </div>
            </div>
            
            {/* KPI Completed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CheckCircle2 className="inline h-4 w-4 mr-1" />
                Project Completion
              </label>
              <ModernCard className={`p-4 cursor-pointer transition-all ${
                kpiCompleted 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="kpi-completed"
                    checked={kpiCompleted}
                    onChange={(e) => setKpiCompleted(e.target.checked)}
                    className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    disabled={loading}
                  />
                  <label htmlFor="kpi-completed" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    All KPIs Completed
                  </label>
                </div>
              </ModernCard>
            </div>
          </div>
          
          {/* Info Card */}
          <ModernCard className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">💡 Smart Features:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Auto-generates sub-code from project code</li>
                  <li>Suggests project types based on division</li>
                  <li>Provides typical duration and budget estimates</li>
                  <li>Saves custom divisions and project types for future use</li>
                  <li>Validates project code format automatically</li>
                </ul>
              </div>
            </div>
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
              {project ? '💾 Update Project' : '✨ Create Project'}
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
  )
}



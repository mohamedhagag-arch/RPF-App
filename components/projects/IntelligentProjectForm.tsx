'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
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
  validateProjectCode
} from '@/lib/projectTemplates'
import {
  updateProjectMetadata,
  getProjectMetadata
} from '@/lib/customProjectData'
import {
  getDivisionNames,
  incrementDivisionUsage,
  addDivision as addNewDivision
} from '@/lib/divisionsManager'
import {
  getProjectTypeNames,
  incrementProjectTypeUsage,
  addProjectType as addNewProjectType
} from '@/lib/projectTypesManager'
import {
  getAllCurrencies,
  getDefaultCurrency,
  getCurrencyForProject,
  convertCurrency,
  formatCurrency,
  incrementCurrencyUsage,
  Currency
} from '@/lib/currenciesManager'
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
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form Fields
  const [projectCode, setProjectCode] = useState('')
  const [projectSubCode, setProjectSubCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectTypes, setProjectTypes] = useState<string[]>([])
  const [responsibleDivisions, setResponsibleDivisions] = useState<string[]>([])
  const [plotNumber, setPlotNumber] = useState('')
  const [contractAmount, setContractAmount] = useState('')
  const [projectStatus, setProjectStatus] = useState<'upcoming' | 'site-preparation' | 'on-going' | 'completed' | 'completed-duration' | 'contract-duration' | 'on-hold' | 'cancelled'>('upcoming')
  const [kpiCompleted, setKpiCompleted] = useState(false)
  
  // Currency Management
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([])
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  
  // Suggestions & Dropdowns
  const [projectTypeSuggestions, setProjectTypeSuggestions] = useState<string[]>([])
  const [divisionSuggestions, setDivisionSuggestions] = useState<string[]>([])
  const [showProjectTypeDropdown, setShowProjectTypeDropdown] = useState(false)
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  
  // Project Type Input
  const [projectTypeInput, setProjectTypeInput] = useState('')
  
  // Division Input
  const [divisionInput, setDivisionInput] = useState('')
  const [showAddDivisionForm, setShowAddDivisionForm] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState('')
  
  // Smart Features
  const [codeValidation, setCodeValidation] = useState<{ valid: boolean; message?: string }>({ valid: true })
  const [autoSubCode, setAutoSubCode] = useState(true)
  
  // Load divisions from Supabase
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        console.log('🔄 Loading divisions from Supabase...')
        const divisions = await getDivisionNames()
        console.log('✅ Divisions loaded:', divisions)
        
        if (divisions && divisions.length > 0) {
          setDivisionSuggestions(divisions)
        } else {
          // If no divisions in Supabase, use default ones
          console.log('⚠️ No divisions in Supabase, using default divisions')
          setDivisionSuggestions(DIVISIONS)
        }
      } catch (error) {
        console.error('❌ Error loading divisions:', error)
        // Fallback to default divisions
        console.log('📋 Using fallback default divisions:', DIVISIONS)
        setDivisionSuggestions(DIVISIONS)
      }
    }
    loadDivisions()
  }, [])

  // Load currencies from Supabase
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        console.log('🔄 Loading currencies from Supabase...')
        const currencies = await getAllCurrencies()
        console.log('✅ Currencies loaded:', currencies)
        
        setAvailableCurrencies(currencies)
        
        // Set default currency
        const defaultCurrency = await getDefaultCurrency()
        setSelectedCurrency(defaultCurrency)
        console.log('💰 Default currency set:', defaultCurrency)
      } catch (error) {
        console.error('❌ Error loading currencies:', error)
      }
    }
    loadCurrencies()
  }, [])

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Check if click is not inside any containers
      const divisionContainer = target.closest('.division-dropdown-container')
      const projectTypeContainer = target.closest('.project-type-dropdown-container')
      const currencyContainer = target.closest('.currency-dropdown-container')
      
      if (!divisionContainer && !projectTypeContainer && !currencyContainer) {
        console.log('🖱️ Clicked outside dropdowns, closing them')
        setShowDivisionDropdown(false)
        setShowProjectTypeDropdown(false)
        setShowCurrencyDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('⌨️ Escape key pressed, closing dropdowns')
        setShowDivisionDropdown(false)
        setShowProjectTypeDropdown(false)
        setShowCurrencyDropdown(false)
      }
    }

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Load project data if editing
  useEffect(() => {
    if (project) {
      setProjectCode(project.project_code)
      setProjectSubCode(project.project_sub_code || '')
      setProjectName(project.project_name)
      setProjectTypes(project.project_type ? project.project_type.split(', ') : [])
      setResponsibleDivisions(project.responsible_division ? project.responsible_division.split(', ') : [])
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
  
  // Load project types from Supabase (optimized)
  useEffect(() => {
    const loadProjectTypes = async () => {
      try {
        console.log('🔄 Loading project types from Supabase...')
        const types = await getProjectTypeNames()
        console.log('✅ Project types loaded:', types)
        
        if (types && types.length > 0) {
          // Limit number of types loaded for performance
          const limitedTypes = types.slice(0, 50) // Limit to 50 types max
          setProjectTypeSuggestions(limitedTypes)
          console.log(`📊 Loaded ${limitedTypes.length} project types (limited for performance)`)
        } else {
          // إذا لم يكن هناك أنواع في Supabase، استخدم الافتراضية
          console.log('⚠️ No project types in Supabase, using default types')
          setProjectTypeSuggestions(PROJECT_TYPES.slice(0, 20)) // تحديد الأنواع الافتراضية أيضاً
        }
      } catch (error) {
        console.error('❌ Error loading project types:', error)
        // Fallback to default project types
        console.log('📋 Using fallback default project types:', PROJECT_TYPES)
        setProjectTypeSuggestions(PROJECT_TYPES.slice(0, 20)) // تحديد الأنواع الافتراضية
      }
    }
    loadProjectTypes()
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
  
  // Update suggestions when divisions change (optimized)
  useEffect(() => {
    if (responsibleDivisions.length > 0) {
      const allSuggestions: string[] = []
      responsibleDivisions.forEach(division => {
        const suggestions = suggestProjectType(division)
        allSuggestions.push(...suggestions)
      })
      // إزالة التكرارات وتحسين الأداء
      const uniqueSuggestions = Array.from(new Set(allSuggestions))
      setProjectTypeSuggestions(uniqueSuggestions)
    }
  }, [responsibleDivisions]) // إزالة projectTypeSuggestions من dependencies
  
  
  async function handleProjectTypeSelect(type: string) {
    console.log('✅ Project type selected:', type)
    
    // إضافة النوع إلى القائمة إذا لم يكن موجوداً
    if (!projectTypes.includes(type)) {
      setProjectTypes([...projectTypes, type])
      console.log('➕ Project type added to list:', type)
    }
    
    setProjectTypeInput('')
    setShowProjectTypeDropdown(false)
    console.log('🔒 Project type dropdown closed')
    
    // إذا كان نوع جديد، أضفه إلى Supabase
    const isExisting = projectTypeSuggestions.some(t => t.toLowerCase() === type.toLowerCase())
    if (!isExisting && type.trim()) {
      try {
        console.log('➕ Adding new project type to Supabase:', type)
        const result = await addNewProjectType({
          name: type.trim(),
          is_active: true
        })
        
        if (result.success) {
          // تحديث قائمة الأنواع
          const updatedTypes = await getProjectTypeNames()
          setProjectTypeSuggestions(updatedTypes)
          setSuccess(`Project type "${type}" added successfully!`)
          console.log('✅ New project type added successfully')
        }
      } catch (error) {
        console.error('Error adding project type:', error)
      }
    }
  }

  function handleRemoveProjectType(projectTypeToRemove: string) {
    console.log('🗑️ Removing project type:', projectTypeToRemove)
    setProjectTypes(projectTypes.filter(pt => pt !== projectTypeToRemove))
    console.log('✅ Project type removed from list')
  }
  
  async function handleDivisionSelect(division: string) {
    console.log('✅ Division selected:', division)
    
    // إضافة القسم إلى القائمة إذا لم يكن موجوداً
    if (!responsibleDivisions.includes(division)) {
      setResponsibleDivisions([...responsibleDivisions, division])
      console.log('➕ Division added to list:', division)
    }
    
    setDivisionInput('')
    setShowDivisionDropdown(false)
    console.log('🔒 Division dropdown closed')
    
    // إذا كان قسم جديد، أضفه إلى Supabase
    const isExisting = divisionSuggestions.some(d => d.toLowerCase() === division.toLowerCase())
    if (!isExisting && division.trim()) {
      try {
        console.log('➕ Adding new division to Supabase:', division)
        const result = await addNewDivision({
          name: division.trim(),
          is_active: true
        })
        
        if (result.success) {
          // تحديث قائمة الأقسام
          const updatedDivisions = await getDivisionNames()
          setDivisionSuggestions(updatedDivisions)
          setSuccess(`Division "${division}" added successfully!`)
          console.log('✅ New division added successfully')
        }
      } catch (error) {
        console.error('❌ Error adding division:', error)
      }
    }
  }

  function handleRemoveDivision(divisionToRemove: string) {
    console.log('🗑️ Removing division:', divisionToRemove)
    setResponsibleDivisions(responsibleDivisions.filter(d => d !== divisionToRemove))
    console.log('✅ Division removed from list')
  }

  async function handleCurrencyChange(newCurrency: Currency) {
    console.log('💰 Changing currency to:', newCurrency.code)
    
    // إذا كان هناك مبلغ محفوظ، قم بتحويله
    if (contractAmount && selectedCurrency) {
      const currentAmount = parseFloat(contractAmount)
      if (!isNaN(currentAmount)) {
        const convertedAmount = convertCurrency(currentAmount, selectedCurrency, newCurrency)
        setContractAmount(convertedAmount.toString())
        console.log(`💱 Converted ${currentAmount} ${selectedCurrency.code} to ${convertedAmount} ${newCurrency.code}`)
      }
    }
    
    setSelectedCurrency(newCurrency)
    setShowCurrencyDropdown(false)
    setSuccess(`Currency changed to ${newCurrency.name} (${newCurrency.code})`)
    console.log('✅ Currency changed successfully')
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
        project_type: projectTypes.join(', ') || undefined,
        responsible_division: responsibleDivisions.join(', ') || undefined,
        plot_number: plotNumber.trim() || undefined,
        contract_amount: parseFloat(contractAmount) || 0,
        project_status: projectStatus as 'upcoming' | 'site-preparation' | 'on-going' | 'completed' | 'completed-duration' | 'contract-duration' | 'on-hold' | 'cancelled',
        kpi_completed: kpiCompleted
      }
      
      // إضافة العملة كخاصية إضافية (سيتم حفظها لاحقاً عند إضافة العمود)
      const projectDataWithCurrency = {
        ...projectData,
        currency: selectedCurrency?.code || 'AED'
      }
      
      // زيادة عداد استخدام أنواع المشاريع
      for (const projectType of projectTypes) {
        await incrementProjectTypeUsage(projectType)
      }
      
      // زيادة عداد استخدام الأقسام
      for (const division of responsibleDivisions) {
        await incrementDivisionUsage(division)
      }
      
      // زيادة عداد استخدام العملة
      if (selectedCurrency) {
        await incrementCurrencyUsage(selectedCurrency.code)
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
            <div className="relative division-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Responsible Division {responsibleDivisions.length > 0 && `(${responsibleDivisions.length} selected)`}
              </label>
              
              <div className="relative">
                <div 
                  className="flex flex-wrap items-center gap-1 p-2 min-h-[42px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-text"
                  onClick={() => {
                    console.log('🖱️ Division container clicked, showing dropdown')
                    setShowDivisionDropdown(true)
                  }}
                >
                  {/* Selected Divisions */}
                  {responsibleDivisions.map((division, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full"
                    >
                      {division}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveDivision(division)
                        }}
                        className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  
                  {/* Input Field */}
                  <input
                    type="text"
                    value={divisionInput}
                    onChange={(e) => {
                      setDivisionInput(e.target.value)
                      setShowDivisionDropdown(true)
                      console.log('✏️ Division input changed, showing dropdown')
                    }}
                    onFocus={() => {
                      console.log('🎯 Division input focused, showing dropdown')
                      setShowDivisionDropdown(true)
                    }}
                    onClick={() => {
                      console.log('🖱️ Division input clicked, showing dropdown')
                      setShowDivisionDropdown(true)
                    }}
                    placeholder={responsibleDivisions.length === 0 ? "Type or select division..." : ""}
                    disabled={loading}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log('🔽 Toggle dropdown clicked')
                    setShowDivisionDropdown(!showDivisionDropdown)
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Division Dropdown */}
              {showDivisionDropdown && divisionSuggestions.length > 0 && (() => {
                console.log('📋 Showing division dropdown:', { showDivisionDropdown, divisionSuggestions })
                return true
              })() && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      👥 Select or add division
                    </p>
                  </div>
                  {divisionSuggestions
                    .filter(d => 
                      divisionInput === '' || 
                      d.toLowerCase().includes(divisionInput.toLowerCase())
                    )
                    .filter(d => !responsibleDivisions.includes(d)) // إخفاء الأقسام المختارة بالفعل
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
                  {divisionInput && !divisionSuggestions.some(d => d.toLowerCase() === divisionInput.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleDivisionSelect(divisionInput)}
                      className="w-full px-4 py-2 text-left bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-300 border-t border-green-200 dark:border-green-800"
                    >
                      ➕ Add "{divisionInput}" as new division
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Project Type */}
            <div className="relative project-type-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Project Type {projectTypes.length > 0 && `(${projectTypes.length} selected)`}
              </label>
              
              <div className="relative">
                <div 
                  className="flex flex-wrap items-center gap-1 p-2 min-h-[42px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-text"
                  onClick={() => {
                    console.log('🖱️ Project type container clicked, showing dropdown')
                    setShowProjectTypeDropdown(true)
                  }}
                >
                  {/* Selected Project Types */}
                  {projectTypes.map((type, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                    >
                      {type}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveProjectType(type)
                        }}
                        className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  
                  {/* Input Field */}
                  <input
                    type="text"
                    value={projectTypeInput}
                    onChange={(e) => {
                      const value = e.target.value
                      setProjectTypeInput(value)
                      // إظهار القائمة فقط إذا كان النص أكثر من حرفين أو فارغ
                      if (value.length >= 2 || value.length === 0) {
                        setShowProjectTypeDropdown(true)
                        console.log('✏️ Project type input changed, showing dropdown')
                      } else {
                        setShowProjectTypeDropdown(false)
                      }
                    }}
                    onFocus={() => {
                      console.log('🎯 Project type input focused, showing dropdown')
                      setShowProjectTypeDropdown(true)
                    }}
                    onClick={() => {
                      console.log('🖱️ Project type input clicked, showing dropdown')
                      setShowProjectTypeDropdown(true)
                    }}
                    placeholder={projectTypes.length === 0 ? "Type or select project type..." : ""}
                    disabled={loading}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log('🔽 Toggle project type dropdown clicked')
                    setShowProjectTypeDropdown(!showProjectTypeDropdown)
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Project Type Dropdown - Optimized */}
              {showProjectTypeDropdown && (() => {
                // تحسين الأداء: فلترة مسبقة مع تحسينات إضافية
                const inputLower = projectTypeInput.toLowerCase()
                const filteredSuggestions = projectTypeSuggestions
                  .filter(type => {
                    // فلترة سريعة
                    if (projectTypeInput === '') return true
                    if (inputLower.length < 2) return false
                    return type.toLowerCase().includes(inputLower)
                  })
                  .filter(type => !projectTypes.includes(type)) // إخفاء الأنواع المختارة بالفعل
                  .slice(0, 15) // تقليل عدد العناصر المعروضة إلى 15
                
                // إظهار القائمة فقط إذا كان هناك نتائج أو يمكن إضافة نوع جديد
                const canAddNew = projectTypeInput.length >= 2 && 
                  !projectTypeSuggestions.some(t => t.toLowerCase() === inputLower)
                
                return (filteredSuggestions.length > 0 || canAddNew) && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {responsibleDivisions.length > 0 
                          ? `💡 Suggested for ${responsibleDivisions.join(', ')} (${filteredSuggestions.length} types)` 
                          : `📁 Select or add project type (${filteredSuggestions.length} types)`
                        }
                      </p>
                    </div>
                    {filteredSuggestions.map((type, idx) => (
                      <button
                        key={`${type}-${idx}`} // مفتاح فريد أفضل
                        type="button"
                        onClick={() => handleProjectTypeSelect(type)}
                        className="w-full px-4 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-gray-900 dark:text-white"
                      >
                        {type}
                      </button>
                    ))}
                    {canAddNew && (
                      <button
                        type="button"
                        onClick={() => handleProjectTypeSelect(projectTypeInput)}
                        className="w-full px-4 py-2 text-left bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-300 border-t border-green-200 dark:border-green-800"
                      >
                        ➕ Add "{projectTypeInput}" as new type
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
          
          
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
            <div className="relative currency-dropdown-container">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Contract Amount ({selectedCurrency?.code || 'AED'})
                </label>
                <button
                  type="button"
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  disabled={loading}
                >
                  Change
                </button>
              </div>
              
              {/* Currency Dropdown */}
              {showCurrencyDropdown && availableCurrencies.length > 0 && (
                <div className="absolute z-30 w-48 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      💰 Select Currency
                    </p>
                  </div>
                  {availableCurrencies.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => handleCurrencyChange(currency)}
                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                        selectedCurrency?.code === currency.code 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-sm">{currency.symbol}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {currency.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
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
              </div>
              {contractAmount && selectedCurrency && (
                <p className="text-xs text-gray-500 mt-1">
                  💰 {formatCurrency(parseFloat(contractAmount), selectedCurrency)}
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



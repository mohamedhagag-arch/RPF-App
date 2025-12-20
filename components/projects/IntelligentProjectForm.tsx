'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, TABLES } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import {
  DIVISIONS,
  PROJECT_STATUSES,
  generateProjectSubCode,
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
  getProjectScopeNames,
  incrementProjectScopeUsage,
  addProjectScope as addNewProjectScope
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
  getAllCompanies,
  getCompaniesByType,
  addCompany,
  Company
} from '@/lib/companiesManager'
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
  Clock,
  Link,
  Download,
  Plus,
  Check,
  Percent,
  ChevronDown,
  ChevronUp,
  Loader2
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
  
  // Duplicate check state
  const [duplicateCheck, setDuplicateCheck] = useState<{
    checking: boolean
    isDuplicate: boolean
    message: string
  }>({
    checking: false,
    isDuplicate: false,
    message: ''
  })
  
  // Form Fields
  const [projectCode, setProjectCode] = useState('')
  const [projectSubCode, setProjectSubCode] = useState('')
  const [subCodeNumber, setSubCodeNumber] = useState('01') // Only the number part (e.g., "01", "02")
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectTypes, setProjectTypes] = useState<string[]>([])
  const [responsibleDivisions, setResponsibleDivisions] = useState<string[]>([])
  const [plotNumber, setPlotNumber] = useState('')
  const [contractAmount, setContractAmount] = useState('')
  const [projectStatus, setProjectStatus] = useState<'upcoming' | 'site-preparation' | 'on-going' | 'completed-duration' | 'contract-completed' | 'on-hold' | 'cancelled'>('upcoming')
  const [kpiCompleted, setKpiCompleted] = useState(false)
  
  // Additional Project Details
  const [clientName, setClientName] = useState('')
  const [consultantName, setConsultantName] = useState('')
  const [contractorName, setContractorName] = useState('')
  
  // Companies data for dropdowns
  const [clientCompanies, setClientCompanies] = useState<Company[]>([])
  const [consultantCompanies, setConsultantCompanies] = useState<Company[]>([])
  const [contractorCompanies, setContractorCompanies] = useState<Company[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [consultantSearch, setConsultantSearch] = useState('')
  const [contractorSearch, setContractorSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false)
  const [showContractorDropdown, setShowContractorDropdown] = useState(false)
  
  // Add new company modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [newCompanyType, setNewCompanyType] = useState<'Client' | 'Consultant' | 'Contractor' | 'First Party'>('Client')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [addingCompany, setAddingCompany] = useState(false)
  const [projectManagerEmail, setProjectManagerEmail] = useState('')
  const [areaManagerEmail, setAreaManagerEmail] = useState('')
  const [divisionHeadEmail, setDivisionHeadEmail] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [contractStatus, setContractStatus] = useState('')
  const [workmanshipOnly, setWorkmanshipOnly] = useState('')
  const [advancePaymentRequired, setAdvancePaymentRequired] = useState('')
  const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState('')
  const [virtualMaterialValue, setVirtualMaterialValue] = useState('')
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectCompletionDate, setProjectCompletionDate] = useState('')
  const [projectDuration, setProjectDuration] = useState<number | undefined>(undefined)
  const [showDateFields, setShowDateFields] = useState(false) // ✅ Toggle for Start/Completion dates
  const [dateProjectAwarded, setDateProjectAwarded] = useState('')
  const [retentionAfterCompletion, setRetentionAfterCompletion] = useState('')
  const [retentionAfter6Month, setRetentionAfter6Month] = useState('')
  const [retentionAfter12Month, setRetentionAfter12Month] = useState('')
  
  // Currency Management
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([])
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  
  // Suggestions & Dropdowns
  const [projectTypeSuggestions, setProjectTypeSuggestions] = useState<string[]>([])
  const [divisionSuggestions, setDivisionSuggestions] = useState<string[]>([])
  const [showProjectTypeDropdown, setShowProjectTypeDropdown] = useState(false)
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  
  // Project Scope Input
  const [projectTypeInput, setProjectTypeInput] = useState('')
  
  // Division Input
  const [divisionInput, setDivisionInput] = useState('')
  const [showAddDivisionForm, setShowAddDivisionForm] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState('')
  
  // Smart Features
  const [codeValidation, setCodeValidation] = useState<{ valid: boolean; message?: string }>({ valid: true })
  const [autoSubCode, setAutoSubCode] = useState(true)
  const [useSubCode, setUseSubCode] = useState(false) // ✅ Checkbox to enable/disable sub-code
  
  // Additional Details Visibility
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false)
  
  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<{ type: 'latitude' | 'longitude' | null; message: string }>({ type: null, message: '' })
  
  // Copy to clipboard with feedback
  const handleCopyCoordinate = async (value: string, type: 'latitude' | 'longitude') => {
    console.log('🔄 Copying coordinate:', { value, type })
    
    try {
      await navigator.clipboard.writeText(value)
      console.log('✅ Copy successful')
      setCopyFeedback({ type, message: 'تم النسخ بنجاح!' })
      
      // Clear feedback after 3 seconds (increased from 2)
      setTimeout(() => {
        console.log('🧹 Clearing feedback')
        setCopyFeedback({ type: null, message: '' })
      }, 3000)
    } catch (error) {
      console.error('❌ Failed to copy:', error)
      setCopyFeedback({ type, message: 'فشل في النسخ' })
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setCopyFeedback({ type: null, message: '' })
      }, 3000)
    }
  }

  // Extract coordinates from map URL
  const extractCoordinatesFromUrl = (url: string): { lat: string | null; lng: string | null } => {
    if (!url || !url.trim()) {
      return { lat: null, lng: null }
    }

    try {
      // Google Maps patterns:
      // https://www.google.com/maps?q=25.2048,55.2708
      // https://maps.google.com/?q=25.2048,55.2708
      // https://www.google.com/maps/@25.2048,55.2708,15z
      // https://www.google.com/maps/place/.../@25.2048,55.2708,15z
      
      // Pattern 1: ?q=lat,lng or ?q=lat,lng&...
      let match = url.match(/[?&]q=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/)
      if (match && match[1] && match[2]) {
        return { lat: match[1], lng: match[2] }
      }

      // Pattern 2: @lat,lng or @lat,lng,zoom
      match = url.match(/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/)
      if (match && match[1] && match[2]) {
        return { lat: match[1], lng: match[2] }
      }

      // OpenStreetMap pattern: #map=zoom/lat/lng
      match = url.match(/#map=\d+\/([+-]?\d+\.?\d*)\/([+-]?\d+\.?\d*)/)
      if (match && match[1] && match[2]) {
        return { lat: match[1], lng: match[2] }
      }

      // Bing Maps pattern: ...?cp=lat~lng
      match = url.match(/[?&]cp=([+-]?\d+\.?\d*)~([+-]?\d+\.?\d*)/)
      if (match && match[1] && match[2]) {
        return { lat: match[1], lng: match[2] }
      }

      return { lat: null, lng: null }
    } catch (error) {
      console.error('❌ Error extracting coordinates:', error)
      return { lat: null, lng: null }
    }
  }

  // Handle extract coordinates from URL
  const handleExtractFromUrl = () => {
    if (!mapUrl || !mapUrl.trim()) {
      setError('Please enter a map URL')
      return
    }

    const coords = extractCoordinatesFromUrl(mapUrl.trim())
    
    if (coords.lat && coords.lng) {
      setLatitude(coords.lat)
      setLongitude(coords.lng)
      setSuccess(`Coordinates extracted successfully: ${coords.lat}, ${coords.lng}`)
      console.log('✅ Extracted coordinates:', coords)
    } else {
      setError('Could not extract coordinates from this URL. Please check the format.')
      console.error('❌ Failed to extract coordinates from URL:', mapUrl)
    }
  }
  
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
      // ✅ DEBUG: Log all project data to see what's available
      console.log('🔍 IntelligentProjectForm: Loading project data:', {
        project_code: project.project_code,
        project_duration: project.project_duration,
        project_duration_type: typeof project.project_duration,
        allKeys: Object.keys(project),
        projectData: JSON.stringify(project, null, 2)
      })
      
      setProjectCode(project.project_code)
      setProjectSubCode(project.project_sub_code || '')
      
      // ✅ CRITICAL FIX: Check if project_sub_code is the same as project_code
      // If they are the same (e.g., both are "P480"), treat it as NO sub-code
      const projectCodeTrimmed = (project.project_code || '').trim().toUpperCase()
      const projectSubCodeTrimmed = (project.project_sub_code || '').trim().toUpperCase()
      const isSubCodeSameAsCode = projectSubCodeTrimmed === projectCodeTrimmed
      
      // ✅ Check if project has valid sub-code (not empty AND different from project_code)
      const hasSubCode = project.project_sub_code && 
                        project.project_sub_code.trim() && 
                        !isSubCodeSameAsCode
      
      setUseSubCode(!!hasSubCode)
      
      // Extract sub-code part from full sub-code if it exists and is valid
      if (hasSubCode) {
        const parts = project.project_sub_code.split('-')
        if (parts.length > 1) {
          // Get everything after the first '-' (in case sub-code contains '-')
          const subPart = parts.slice(1).join('-') // Join in case sub-code has multiple '-'
          setSubCodeNumber(subPart || '')
        } else {
          // If sub-code exists but doesn't have '-', it might be just the sub part
          // But only if it's different from project_code
          if (!isSubCodeSameAsCode) {
            setSubCodeNumber(project.project_sub_code.trim() || '')
          } else {
            setSubCodeNumber('')
          }
        }
      } else {
        // ✅ CRITICAL FIX: If project has NO sub-code (or sub-code equals project_code), 
        // keep subCodeNumber empty and disable checkbox
        setSubCodeNumber('')
        setUseSubCode(false) // ✅ Disable sub-code checkbox
        setProjectSubCode('') // ✅ Clear projectSubCode to ensure it's empty
      }
      setProjectName(project.project_name)
      setProjectDescription(project.project_description || '')
      setProjectTypes(project.project_type ? project.project_type.split(', ') : [])
      setResponsibleDivisions(project.responsible_division ? project.responsible_division.split(', ') : [])
      setPlotNumber(project.plot_number || '')
      setContractAmount(project.contract_amount?.toString() || '')
      // ✅ Convert old status values to new ones
      const oldStatus = project.project_status as string
      let newStatus: 'upcoming' | 'site-preparation' | 'on-going' | 'completed-duration' | 'contract-completed' | 'on-hold' | 'cancelled' = 'upcoming'
      
      if (oldStatus === 'completed' || oldStatus === 'contract-duration') {
        newStatus = 'contract-completed'
      } else if (oldStatus === 'upcoming' || oldStatus === 'site-preparation' || oldStatus === 'on-going' || oldStatus === 'completed-duration' || oldStatus === 'on-hold' || oldStatus === 'cancelled') {
        newStatus = oldStatus as typeof newStatus
      }
      
      setProjectStatus(newStatus)
      setKpiCompleted(project.kpi_completed)
      setAutoSubCode(false)
      
      // ✅ Update Responsible Divisions from BOQ Activities
      const updateDivisionsFromBOQ = async () => {
        try {
          const supabase = getSupabaseClient()
          const projectCode = project.project_code || ''
          const projectFullCode = project.project_full_code || 
                                (project.project_sub_code ? `${projectCode}-${project.project_sub_code}` : projectCode)
          
          // Get ALL activities for this project
          const { data: activitiesData, error: activitiesError } = await supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .or(`Project Code.eq.${projectCode},Project Full Code.eq.${projectCode},Project Full Code.eq.${projectFullCode}`)
          
          if (activitiesError) {
            console.warn('⚠️ Error fetching activities for division update:', activitiesError)
            return
          }
          
          // Collect ALL unique divisions from ALL activities
          const divisionsFromBOQ = new Set<string>()
          if (activitiesData && activitiesData.length > 0) {
            activitiesData.forEach((activity: any) => {
              const activityDiv = activity['Activity Division'] || activity.activity_division || ''
              if (activityDiv && activityDiv.trim() !== '') {
                divisionsFromBOQ.add(activityDiv.trim())
              }
            })
          }
          
          // Get current divisions from project
          const currentDivisions = project.responsible_division 
            ? project.responsible_division.split(',').map(d => d.trim()).filter(d => d.length > 0)
            : []
          
          // Merge divisions (from project and BOQ)
          const allDivisionsSet = new Set<string>()
          currentDivisions.forEach(d => allDivisionsSet.add(d))
          divisionsFromBOQ.forEach(d => allDivisionsSet.add(d))
          
          const allDivisionsList = Array.from(allDivisionsSet).sort()
          
          // Update state if divisions changed
          if (allDivisionsList.length > 0) {
            setResponsibleDivisions(allDivisionsList)
            console.log('✅ Updated Responsible Divisions from BOQ Activities:', allDivisionsList)
          }
        } catch (error) {
          console.warn('⚠️ Error updating divisions from BOQ:', error)
        }
      }
      
      updateDivisionsFromBOQ()
      
      // Load additional project details
      setClientName(project.client_name || '')
      setConsultantName(project.consultant_name || '')
      setContractorName(project.first_party_name || '')
      setProjectManagerEmail(project.project_manager_email || '')
      setAreaManagerEmail(project.area_manager_email || '')
      setDivisionHeadEmail(project.division_head_email || '')
      setLatitude(project.latitude || '')
      setLongitude(project.longitude || '')
      setContractStatus(project.contract_status || '')
      setWorkmanshipOnly(project.workmanship_only || '')
      setAdvancePaymentRequired(project.advance_payment_required || '')
      setAdvancePaymentPercentage(project.advance_payment_percentage?.toString() || '')
      // ✅ Set Virtual Material Value: if workmanship_only is "No", set to "0", otherwise use saved value or empty
      if (project.workmanship_only === 'No') {
        setVirtualMaterialValue('0')
      } else {
        setVirtualMaterialValue(project.virtual_material_value || '')
      }
      
      // Load project dates
      if (project.project_start_date) {
        // Convert date to YYYY-MM-DD format for input
        const startDate = new Date(project.project_start_date)
        if (!isNaN(startDate.getTime())) {
          setProjectStartDate(startDate.toISOString().split('T')[0])
        }
      }
      if (project.project_completion_date) {
        const completionDate = new Date(project.project_completion_date)
        if (!isNaN(completionDate.getTime())) {
          setProjectCompletionDate(completionDate.toISOString().split('T')[0])
        }
      }
      // ✅ Load project duration - handle all cases (number, string, null, undefined)
      // ✅ CRITICAL: Check multiple sources for project_duration (database column names)
      // Try multiple ways to get the duration value
      let finalDuration: number | undefined = undefined
      
      // Try 1: Direct property (project.project_duration)
      if (project.project_duration !== undefined && project.project_duration !== null) {
        const val = typeof project.project_duration === 'number' 
          ? project.project_duration 
          : parseInt(String(project.project_duration), 10)
        if (!isNaN(val) && val > 0) {
          finalDuration = val
          console.log('✅ IntelligentProjectForm: Found duration from project.project_duration =', finalDuration)
        }
      }
      
      // Try 2: Database column name with spaces (project['Project Duration'])
      if (finalDuration === undefined && (project as any)?.['Project Duration'] !== undefined && (project as any)?.['Project Duration'] !== null) {
        const val = typeof (project as any)?.['Project Duration'] === 'number'
          ? (project as any)?.['Project Duration']
          : parseInt(String((project as any)?.['Project Duration']), 10)
        if (!isNaN(val) && val > 0) {
          finalDuration = val
          console.log('✅ IntelligentProjectForm: Found duration from project["Project Duration"] =', finalDuration)
        }
      }
      
      // Try 3: Snake case (project['project_duration'])
      if (finalDuration === undefined && (project as any)?.['project_duration'] !== undefined && (project as any)?.['project_duration'] !== null) {
        const val = typeof (project as any)?.['project_duration'] === 'number'
          ? (project as any)?.['project_duration']
          : parseInt(String((project as any)?.['project_duration']), 10)
        if (!isNaN(val) && val > 0) {
          finalDuration = val
          console.log('✅ IntelligentProjectForm: Found duration from project["project_duration"] =', finalDuration)
        }
      }
      
      // ✅ DEBUG: Always log to help diagnose the issue
      console.log('🔍 IntelligentProjectForm: Checking project_duration for', project.project_code, {
        project_duration: project.project_duration,
        'Project Duration': (project as any)?.['Project Duration'],
        'project_duration (snake)': (project as any)?.['project_duration'],
        finalDuration,
        projectKeys: Object.keys(project),
        hasProjectDuration: 'project_duration' in project,
        hasProjectDurationDB: 'Project Duration' in (project as any)
      })
      
      if (finalDuration !== undefined && finalDuration > 0) {
        setProjectDuration(finalDuration)
        console.log('✅ IntelligentProjectForm: Successfully loaded project_duration =', finalDuration, 'from project:', project.project_code)
      } else {
        console.warn('⚠️ IntelligentProjectForm: project_duration is undefined, null, or invalid for project:', project.project_code, {
          project_duration: project.project_duration,
          'Project Duration': (project as any)?.['Project Duration'],
          finalDuration
        })
        setProjectDuration(undefined)
      }
      
      // Load project award date
      if (project.date_project_awarded) {
        const awardDate = new Date(project.date_project_awarded)
        if (!isNaN(awardDate.getTime())) {
          setDateProjectAwarded(awardDate.toISOString().split('T')[0])
        }
    } else {
        setDateProjectAwarded('')
      }
      
      // Load retention values
      if (project.retention_after_completion !== undefined && project.retention_after_completion !== null) {
        setRetentionAfterCompletion(project.retention_after_completion.toString())
      } else {
        setRetentionAfterCompletion('')
      }
      if (project.retention_after_6_month !== undefined && project.retention_after_6_month !== null) {
        setRetentionAfter6Month(project.retention_after_6_month.toString())
      } else {
        setRetentionAfter6Month('')
      }
      if (project.retention_after_12_month !== undefined && project.retention_after_12_month !== null) {
        setRetentionAfter12Month(project.retention_after_12_month.toString())
      } else {
        setRetentionAfter12Month('')
      }
    } else {
      // Reset form fields for new project
      setDateProjectAwarded('')
      setProjectStartDate('')
      setProjectCompletionDate('')
      setRetentionAfterCompletion('')
      setRetentionAfter6Month('')
      setRetentionAfter12Month('')
      setProjectDuration(undefined)
      setProjectStatus('upcoming') // ✅ Default value for new projects
      
      // ✅ Reset Virtual Material Value to 0 when resetting form
      setVirtualMaterialValue('0')
      
      // Load metadata for suggestions
      const metadata = getProjectMetadata()
      if (metadata.suggestedNextCode) {
        setProjectCode(metadata.suggestedNextCode)
      }
    }
  }, [project])
  
  // ✅ Link Workmanship Only with Virtual Material Value
  // When Workmanship Only = "No", automatically set Virtual Material Value = 0
  useEffect(() => {
    if (workmanshipOnly === 'No') {
      setVirtualMaterialValue('0')
    }
  }, [workmanshipOnly])
  
  // Load project scopes from Supabase (from Project Scope Management)
  useEffect(() => {
    const loadProjectScopes = async () => {
      try {
        console.log('🔄 Loading project scopes from Supabase...')
        const scopes = await getProjectScopeNames()
        console.log('✅ Project scopes loaded:', scopes)
        
        if (scopes && scopes.length > 0) {
          // Limit number of scopes loaded for performance
          const limitedScopes = scopes.slice(0, 100) // Limit to 100 scopes max
          setProjectTypeSuggestions(limitedScopes)
          console.log(`📊 Loaded ${limitedScopes.length} project scopes from Project Scope Management`)
        } else {
          console.log('⚠️ No project scopes found in Supabase')
          setProjectTypeSuggestions([]) // Empty array instead of fallback
        }
      } catch (error) {
        console.error('❌ Error loading project scopes:', error)
        setProjectTypeSuggestions([]) // Empty array on error
      }
    }
    loadProjectScopes()
  }, [])
  
  // ✅ Update full sub-code when project code or sub-code part changes
  // Format: {Project Code}-{Sub-Code} (e.g., P8889-01 or P8889-ABC)
  // ✅ CRITICAL: Only generate sub-code if useSubCode is enabled AND subCodeNumber is not empty
  // This prevents auto-generation for projects without sub-code
  useEffect(() => {
    if (projectCode && codeValidation.valid) {
      // ✅ Only generate sub-code if useSubCode checkbox is enabled
      if (useSubCode) {
        const trimmedCode = projectCode.trim().toUpperCase()
        const trimmedSubCode = subCodeNumber.trim()
        
        // ✅ Only generate sub-code if subCodeNumber is provided (not empty)
        if (trimmedSubCode) {
          const newSubCode = `${trimmedCode}-${trimmedSubCode}`
          
          // Only update if different to avoid unnecessary re-renders
          if (newSubCode !== projectSubCode) {
            setProjectSubCode(newSubCode)
          }
        } else {
          // ✅ If subCodeNumber is empty but useSubCode is enabled, clear projectSubCode
          if (projectSubCode) {
            setProjectSubCode('')
          }
        }
      } else {
        // ✅ If useSubCode is disabled, always clear projectSubCode
        if (projectSubCode) {
          setProjectSubCode('')
        }
        // Also clear subCodeNumber when checkbox is unchecked
        if (subCodeNumber) {
          setSubCodeNumber('')
        }
      }
    } else if (projectCode && !codeValidation.valid) {
      // If code is invalid, clear sub-code
      setProjectSubCode('')
      setSubCodeNumber('')
    }
  }, [projectCode, codeValidation.valid, subCodeNumber, useSubCode]) // Update when any of these change
  
  // Validate project code
  useEffect(() => {
    if (projectCode) {
      const validation = validateProjectCode(projectCode)
      setCodeValidation(validation)
    } else {
      setCodeValidation({ valid: true })
    }
  }, [projectCode])

  // Calculate duration automatically when dates change
  useEffect(() => {
    if (projectStartDate && projectCompletionDate) {
      const start = new Date(projectStartDate)
      const completion = new Date(projectCompletionDate)
      
      if (!isNaN(start.getTime()) && !isNaN(completion.getTime())) {
        // Calculate duration in days (including both start and end days)
        const diffTime = completion.getTime() - start.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        setProjectDuration(diffDays >= 0 ? diffDays : 0)
      } else {
        setProjectDuration(undefined)
      }
    } else if (projectStartDate && !projectCompletionDate) {
      // If only start date exists, calculate from start to today
      const start = new Date(projectStartDate)
      const today = new Date()
      if (!isNaN(start.getTime())) {
        const diffTime = today.getTime() - start.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        setProjectDuration(diffDays >= 0 ? diffDays : 0)
      } else {
        setProjectDuration(undefined)
      }
    } else {
      setProjectDuration(undefined)
    }
  }, [projectStartDate, projectCompletionDate])
  
  // Load companies from database
  const loadCompanies = async () => {
    try {
      const [clients, consultants, contractors, firstParties] = await Promise.all([
        getCompaniesByType('Client'),
        getCompaniesByType('Consultant'),
        getCompaniesByType('Contractor'),
        getCompaniesByType('First Party')
      ])
      setClientCompanies(clients)
      setConsultantCompanies(consultants)
      // Merge Contractor, First Party, and Client companies for First Party field
      setContractorCompanies([...contractors, ...firstParties, ...clients])
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  // Handle adding new company
  const handleAddNewCompany = async () => {
    if (!newCompanyName.trim()) {
      return
    }

    try {
      setAddingCompany(true)
      await addCompany({
        company_name: newCompanyName.trim(),
        company_type: newCompanyType
      })
      
      // Reload companies
      await loadCompanies()
      
      // Set the newly added company
      if (newCompanyType === 'Client') {
        setClientName(newCompanyName.trim())
        setShowClientDropdown(false)
      } else if (newCompanyType === 'Consultant') {
        setConsultantName(newCompanyName.trim())
        setShowConsultantDropdown(false)
      } else if (newCompanyType === 'Contractor' || newCompanyType === 'First Party') {
        setContractorName(newCompanyName.trim())
        setShowContractorDropdown(false)
      }
      
      // Reset modal
      setShowAddCompanyModal(false)
      setNewCompanyName('')
    } catch (error: any) {
      console.error('Error adding company:', error)
      alert(error.message || 'Failed to add company')
    } finally {
      setAddingCompany(false)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.company-dropdown-container')) {
        setShowClientDropdown(false)
        setShowConsultantDropdown(false)
        setShowContractorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Project scopes are loaded directly from Project Scope Management
  // No need to modify suggestions based on divisions
  
  
  async function handleProjectScopeSelect(scope: string) {
    console.log('✅ Project scope selected:', scope)
    
    // إضافة النطاق إلى القائمة إذا لم يكن موجوداً
    if (!projectTypes.includes(scope)) {
      setProjectTypes([...projectTypes, scope])
      console.log('➕ Project scope added to list:', scope)
    }
    
    setProjectTypeInput('')
    setShowProjectTypeDropdown(false)
    console.log('🔒 Project scope dropdown closed')
    
    // إذا كان نطاق جديد، أضفه إلى Supabase
    const isExisting = projectTypeSuggestions.some(s => s.toLowerCase() === scope.toLowerCase())
    if (!isExisting && scope.trim()) {
      try {
        console.log('➕ Adding new project scope to Supabase:', scope)
        const result = await addNewProjectScope({
          name: scope.trim(),
          is_active: true
        })
        
        if (result.success) {
          // تحديث قائمة النطاقات من Project Scope Management
          const updatedScopes = await getProjectScopeNames()
          setProjectTypeSuggestions(updatedScopes)
          setSuccess(`Project scope "${scope}" added successfully!`)
          console.log('✅ New project scope added successfully to Project Scope Management')
        }
      } catch (error) {
        console.error('Error adding project scope:', error)
      }
    }
  }

  function handleRemoveProjectScope(projectScopeToRemove: string) {
    console.log('🗑️ Removing project scope:', projectScopeToRemove)
    setProjectTypes(projectTypes.filter(ps => ps !== projectScopeToRemove))
    console.log('✅ Project scope removed from list')
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
      if (!workmanshipOnly.trim()) throw new Error('Workmanship Only is required')
      if (!advancePaymentRequired.trim()) throw new Error('Advance Payment Required is required')
      
      // ✅ Validate Virtual Material Value
      // If Workmanship Only = "No", Virtual Material Value should be 0 (handled automatically)
      // If Workmanship Only = "Yes", Virtual Material Value is required
      if (workmanshipOnly === 'Yes' && !virtualMaterialValue.trim()) {
        throw new Error('Virtual Material Value is required when Workmanship Only is Yes')
      }
      // If Workmanship Only = "No", ensure Virtual Material Value is 0
      if (workmanshipOnly === 'No' && virtualMaterialValue.trim() !== '0') {
        setVirtualMaterialValue('0') // Auto-correct to 0
      }
      
      // Validate Project Duration (Required)
      if (!projectDuration || projectDuration <= 0) {
        throw new Error('Project Duration is required and must be greater than 0')
      }
      
      // Validate project code format
      if (!codeValidation.valid) {
        throw new Error(codeValidation.message || 'Invalid project code')
      }
      
      // ✅ Check for duplicate project code + sub-code combination
      // Only check if this is a new project (not editing)
      if (!project) {
        const supabaseClient = getSupabaseClient()
        const trimmedCode = projectCode.trim().toUpperCase()
        // Extract sub-code part for duplicate check
        let trimmedSubCode: string | null = null
        if (projectSubCode) {
          const fullSubCode = projectSubCode.trim()
          // If it starts with project code and has a dash, extract the sub-code part
          if (fullSubCode.startsWith(trimmedCode + '-')) {
            // Get everything after "{Project Code}-"
            trimmedSubCode = fullSubCode.substring(trimmedCode.length + 1).trim() || null
          } else if (fullSubCode) {
            // If it doesn't match format, use as is
            trimmedSubCode = fullSubCode
          }
        }
        
        // Check if a project with the same code + sub-code combination exists
        // Database uses "Project Code" and "Project Sub-Code" column names
        try {
          // Fetch all projects with matching code
          const { data: allProjects, error: fetchError } = await supabaseClient
            .from(TABLES.PROJECTS)
            // @ts-ignore
            .select('id, "Project Code", "Project Sub-Code"')
          
          if (fetchError) {
            console.error('Error fetching projects for duplicate check:', fetchError)
            // Don't block creation if fetch fails
          } else if (allProjects && allProjects.length > 0) {
            // ✅ CRITICAL: Check for exact match of BOTH Code AND Sub-Code
            // A project is considered duplicate ONLY if BOTH Code AND Sub-Code match exactly
            const matchingProjects = allProjects.filter((p: any) => {
              const existingCode = (p['Project Code'] || '').toString().trim().toUpperCase()
              let existingSubCodePart: string | null = null
              
              // Extract sub-code part from existing project (same way we extract from input)
              const existingSubCodeFull = (p['Project Sub-Code'] || '').toString().trim() || null
              if (existingSubCodeFull) {
                if (existingSubCodeFull.startsWith(existingCode + '-')) {
                  // Get everything after "{Project Code}-"
                  existingSubCodePart = existingSubCodeFull.substring(existingCode.length + 1).trim() || null
                } else {
                  // If it doesn't match format, use as is
                  existingSubCodePart = existingSubCodeFull
                }
              }
              
              // Step 1: Check if Project Code matches
              if (existingCode !== trimmedCode) return false
              
              // Step 2: Check if Sub-Code matches exactly (case-sensitive comparison)
              // Case 1: Both have sub-codes - must match exactly
              if (trimmedSubCode && existingSubCodePart) {
                return existingSubCodePart === trimmedSubCode
              }
              // Case 2: Both are null/empty - they match (same project without sub-code)
              else if (!trimmedSubCode && !existingSubCodePart) {
                return true
              }
              // Case 3: One has sub-code, the other doesn't - they are DIFFERENT projects
              else {
                return false
              }
            })
            
            // ✅ If exact match found (Code + Sub-Code), it's a duplicate - BLOCK creation
            if (matchingProjects.length > 0) {
              const newSubCode = trimmedSubCode || '(no sub-code)'
              throw new Error(
                `⚠️ Project with code "${trimmedCode}" and sub-code "${newSubCode}" already exists! ` +
                `Each project must have a unique combination of Code + Sub-Code. ` +
                `Please use a different code or sub-code combination.`
              )
            }
          }
        } catch (duplicateErr: any) {
          // Re-throw if it's our custom error message
          if (duplicateErr.message && duplicateErr.message.includes('already exists')) {
            throw duplicateErr
          }
          // For other errors, log but don't block creation
          console.warn('Error checking for duplicate project, proceeding with creation:', duplicateErr)
        }
      }
      
      const projectData: Partial<Project> & { project_status?: string } = {
        project_code: projectCode.trim().toUpperCase(),
        // ✅ Only save sub-code if useSubCode checkbox is enabled AND sub-code is not empty
        project_sub_code: (useSubCode && projectSubCode.trim()) ? projectSubCode.trim() : undefined,
        project_name: projectName.trim(),
        project_description: projectDescription.trim() || undefined,
        project_type: projectTypes.join(', ') || undefined,
        responsible_division: responsibleDivisions.join(', ') || undefined,
        plot_number: plotNumber.trim() || undefined,
        contract_amount: parseFloat(contractAmount) || 0,
        project_status: projectStatus, // ✅ Stored as string in database, validated by type system
        kpi_completed: kpiCompleted,
        // Additional project details
        client_name: clientName.trim() || undefined,
        consultant_name: consultantName.trim() || undefined,
        first_party_name: contractorName.trim() || undefined,
        project_manager_email: projectManagerEmail.trim() || undefined,
        area_manager_email: areaManagerEmail.trim() || undefined,
        division_head_email: divisionHeadEmail.trim() || undefined,
        latitude: latitude.trim() || undefined,
        longitude: longitude.trim() || undefined,
        contract_status: contractStatus.trim() || undefined,
        workmanship_only: workmanshipOnly.trim() || undefined,
        advance_payment_required: advancePaymentRequired.trim() || undefined,
        advance_payment_percentage: advancePaymentPercentage.trim() ? parseFloat(advancePaymentPercentage.trim()) : undefined,
        // ✅ If Workmanship Only = "No", always save Virtual Material Value as 0
        virtual_material_value: workmanshipOnly === 'No' ? '0' : (virtualMaterialValue.trim() || undefined),
        project_start_date: projectStartDate.trim() || undefined,
        project_completion_date: projectCompletionDate.trim() || undefined,
        date_project_awarded: dateProjectAwarded.trim() || undefined,
        retention_after_completion: retentionAfterCompletion.trim() ? parseFloat(retentionAfterCompletion.trim()) : undefined,
        retention_after_6_month: retentionAfter6Month.trim() ? parseFloat(retentionAfter6Month.trim()) : undefined,
        retention_after_12_month: retentionAfter12Month.trim() ? parseFloat(retentionAfter12Month.trim()) : undefined
        // ✅ Note: project_duration will be calculated automatically by database trigger
        // But we can also send it if calculated in frontend for immediate display
      }
      
      // ✅ CRITICAL: Always set project_duration if user entered a value
      // This ensures the value is sent to database even if trigger tries to override it
      // IMPORTANT: Don't calculate from dates if user entered a value - user input takes priority
      if (projectDuration !== undefined && projectDuration !== null && projectDuration > 0) {
        // User entered a value - use it directly (don't let trigger override it)
        projectData.project_duration = projectDuration
        // ✅ CRITICAL: Also clear dates to prevent trigger from recalculating
        // But only if user explicitly wants to set duration without dates
        // Actually, let's keep dates but ensure duration is sent AFTER dates in the update
        console.log('✅ [PRIORITY 1] Saving project_duration from user input:', projectData.project_duration, '(will override trigger calculation)')
      } 
      // ✅ Priority 2: Calculate duration from dates ONLY if user didn't enter a value
      else if (!projectDuration || projectDuration <= 0) {
        if (projectStartDate && projectCompletionDate) {
          const start = new Date(projectStartDate)
          const completion = new Date(projectCompletionDate)
          if (!isNaN(start.getTime()) && !isNaN(completion.getTime())) {
            const diffTime = completion.getTime() - start.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
            projectData.project_duration = diffDays >= 0 ? diffDays : 0
            console.log('✅ [PRIORITY 2] Calculating project_duration from dates:', projectData.project_duration)
          }
        } else if (projectStartDate && !projectCompletionDate) {
          // Calculate from start to today
          const start = new Date(projectStartDate)
          const today = new Date()
          if (!isNaN(start.getTime())) {
            const diffTime = today.getTime() - start.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
            projectData.project_duration = diffDays >= 0 ? diffDays : 0
            console.log('✅ [PRIORITY 2] Calculating project_duration from start date to today:', projectData.project_duration)
          }
        }
      }
      
      // ✅ Debug: Log the final projectData to ensure project_duration is included
      console.log('📦 Final projectData before save:', {
        project_duration: projectData.project_duration,
        project_start_date: projectData.project_start_date,
        project_completion_date: projectData.project_completion_date,
        hasProjectDuration: 'project_duration' in projectData
      })
      
      // إضافة العملة كخاصية إضافية (سيتم حفظها لاحقاً عند إضافة العمود)
      const projectDataWithCurrency = {
        ...projectData,
        currency: selectedCurrency?.code || 'AED'
      }
      
      // زيادة عداد استخدام أنواع المشاريع
      for (const projectScope of projectTypes) {
        await incrementProjectScopeUsage(projectScope)
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
  
  // ✅ Real-time duplicate check when project code or sub-code changes
  useEffect(() => {
    // Only check for duplicates if:
    // 1. This is a new project (not editing)
    // 2. Project code is not empty
    // Note: We check even if codeValidation.valid is false, to show feedback when user types
    if (project || !projectCode.trim()) {
      setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
      return
    }

    // If code format is invalid, don't check for duplicates yet
    if (!codeValidation.valid) {
      setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
      return
    }

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(async () => {
      const trimmedCode = projectCode.trim().toUpperCase()
      // Extract sub-code part for duplicate check
      // projectSubCode format: {Project Code}-{Sub-Code}
      // We need to compare the FULL sub-code (including Project Code) with database values
      let trimmedSubCode: string | null = null
      if (projectSubCode) {
        const fullSubCode = projectSubCode.trim()
        // If it starts with project code and has a dash, extract the sub-code part
        if (fullSubCode.startsWith(trimmedCode + '-')) {
          // Get everything after "{Project Code}-"
          trimmedSubCode = fullSubCode.substring(trimmedCode.length + 1).trim() || null
        } else if (fullSubCode) {
          // If it doesn't match format, use as is
          trimmedSubCode = fullSubCode
        }
      }

      if (!trimmedCode) {
        setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
        return
      }

      setDuplicateCheck({ checking: true, isDuplicate: false, message: '' })

      try {
        const supabaseClient = getSupabaseClient()
        
        // Fetch all projects with matching code
        const { data: allProjects, error: fetchError } = await supabaseClient
          .from(TABLES.PROJECTS)
          // @ts-ignore
          .select('id, "Project Code", "Project Sub-Code"')
        
        if (fetchError) {
          console.error('Error checking for duplicate:', fetchError)
          setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
          return
        }

        if (allProjects && allProjects.length > 0) {
          // ✅ CRITICAL: Check for exact match of BOTH Code AND Sub-Code
          // A project is considered duplicate ONLY if BOTH Code AND Sub-Code match exactly
          const matchingProjects = allProjects.filter((p: any) => {
            const existingCode = (p['Project Code'] || '').toString().trim().toUpperCase()
            let existingSubCodePart: string | null = null
            
            // Extract sub-code part from existing project (same way we extract from input)
            const existingSubCodeFull = (p['Project Sub-Code'] || '').toString().trim() || null
            if (existingSubCodeFull) {
              if (existingSubCodeFull.startsWith(existingCode + '-')) {
                // Get everything after "{Project Code}-"
                existingSubCodePart = existingSubCodeFull.substring(existingCode.length + 1).trim() || null
              } else {
                // If it doesn't match format, use as is
                existingSubCodePart = existingSubCodeFull
              }
            }
            
            // Step 1: Check if Project Code matches
            if (existingCode !== trimmedCode) return false
            
            // Step 2: Check if Sub-Code matches exactly (case-sensitive comparison)
            // Case 1: Both have sub-codes - must match exactly
            if (trimmedSubCode && existingSubCodePart) {
              return existingSubCodePart === trimmedSubCode
            }
            // Case 2: Both are null/empty - they match (same project without sub-code)
            else if (!trimmedSubCode && !existingSubCodePart) {
              return true
            }
            // Case 3: One has sub-code, the other doesn't - they are DIFFERENT projects
            else {
              return false
            }
          })
          
          // ✅ If exact match found (Code + Sub-Code), it's a duplicate
          if (matchingProjects.length > 0) {
            const newSubCode = trimmedSubCode || '(no sub-code)'
            const existingProject = matchingProjects[0] as any
            const existingSubCode = (existingProject['Project Sub-Code'] || '').toString().trim() || '(no sub-code)'
            setDuplicateCheck({
              checking: false,
              isDuplicate: true,
              message: `⚠️ Project with code "${trimmedCode}" and sub-code "${newSubCode}" already exists! Each project must have a unique combination of Code + Sub-Code.`
            })
          } else {
            // ✅ Check if there are projects with same Code but different Sub-Code
            // This is ALLOWED (large projects split into smaller ones)
            const sameCodeProjects = allProjects.filter((p: any) => {
              const existingCode = (p['Project Code'] || '').toString().trim().toUpperCase()
              return existingCode === trimmedCode
            })
            
            if (sameCodeProjects.length > 0) {
              // Get list of existing sub-codes for this project code
              const existingSubCodes = sameCodeProjects
                .map((p: any) => (p['Project Sub-Code'] || '').toString().trim() || '(no sub-code)')
                .filter((sub: string) => sub !== '(no sub-code)')
              
              const subCodesList = existingSubCodes.length > 0 
                ? ` (Existing sub-codes: ${existingSubCodes.join(', ')})`
                : ''
              
              // Same code exists but with different sub-code - this is OK (large projects split into smaller ones)
              setDuplicateCheck({
                checking: false,
                isDuplicate: false,
                message: `ℹ️ Projects with code "${trimmedCode}" exist with different sub-codes.${subCodesList} This is allowed for large projects split into smaller ones.`
              })
            } else {
              // No projects with this code exist - it's available
              setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
            }
          }
        } else {
          // No projects in database - code is available
          setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
        }
      } catch (err: any) {
        console.error('Error checking for duplicate:', err)
        setDuplicateCheck({ checking: false, isDuplicate: false, message: '' })
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [projectCode, projectSubCode, codeValidation.valid, project])

  const isFormValid = projectCode && projectName && codeValidation.valid && !duplicateCheck.isDuplicate
  
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
        
        {/* Copy Feedback Toast */}
        {copyFeedback.type && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-lg p-3 max-w-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✅</span>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {copyFeedback.message}
                </p>
              </div>
            </div>
          </div>
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
                className={
                  !codeValidation.valid || duplicateCheck.isDuplicate 
                    ? 'border-red-500' 
                    : duplicateCheck.message && !duplicateCheck.isDuplicate
                    ? 'border-blue-500'
                    : ''
                }
              />
              {!codeValidation.valid && codeValidation.message && (
                <p className="text-xs text-red-600 mt-1">⚠️ {codeValidation.message}</p>
              )}
              {codeValidation.valid && projectCode && !duplicateCheck.checking && !duplicateCheck.isDuplicate && (
                <p className="text-xs text-green-600 mt-1">✅ Valid project code</p>
              )}
              {duplicateCheck.checking && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for duplicates...
                </p>
              )}
              {duplicateCheck.isDuplicate && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {duplicateCheck.message}
                </p>
              )}
              {!duplicateCheck.isDuplicate && duplicateCheck.message && !duplicateCheck.checking && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {duplicateCheck.message}
                </p>
              )}
            </div>
            
            {/* Project Sub-Code */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Hash className="inline h-4 w-4 mr-1" />
                  Project Sub-Code
                </label>
                {/* ✅ Checkbox to enable/disable sub-code */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSubCode}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setUseSubCode(checked)
                      if (!checked) {
                        // ✅ When unchecked, clear sub-code
                        setSubCodeNumber('')
                        setProjectSubCode('')
                        setAutoSubCode(false)
                      } else {
                        // ✅ When checked, set default to '01' if empty
                        if (!subCodeNumber.trim()) {
                          setSubCodeNumber('01')
                        }
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Use Sub-Code
                  </span>
                </label>
              </div>
              
              {/* ✅ Only show sub-code input when checkbox is enabled */}
              {useSubCode && (
                <div className="flex gap-2 items-center">
                  {/* ✅ Project Code Part (Read-only) */}
                  <div className="flex items-center gap-0">
                    <Input
                      value={projectCode && codeValidation.valid ? `${projectCode.trim().toUpperCase()}-` : ''}
                      readOnly
                      disabled={loading || !projectCode || !codeValidation.valid}
                      className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed font-mono min-w-[120px] border-r-0 rounded-r-none"
                      placeholder="Code-"
                    />
                    {/* ✅ Sub-Code Part (Editable) - Can be numbers or text */}
                    <Input
                      type="text"
                      value={subCodeNumber}
                      onChange={(e) => {
                        const inputValue = e.target.value.trim()
                        // Allow any text (numbers, letters, etc.) - no restrictions
                        setSubCodeNumber(inputValue)
                        setAutoSubCode(false)
                      }}
                      onBlur={(e) => {
                        // ✅ CRITICAL FIX: Don't auto-set '01' on blur
                        // This allows projects without sub-code to remain without sub-code
                        // Only validate that the value is trimmed, but don't force a default
                        const value = e.target.value.trim()
                        if (value !== subCodeNumber) {
                          setSubCodeNumber(value)
                        }
                      }}
                      placeholder="01 or text"
                      disabled={loading || !projectCode || !codeValidation.valid}
                      className={`font-mono min-w-[80px] text-center border-l-0 rounded-l-none ${
                        duplicateCheck.isDuplicate ? 'border-red-500' : ''
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSubCode(true)
                      setSubCodeNumber('01')
                    }}
                    className="px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    title="Reset to 01"
                    disabled={loading || !projectCode || !codeValidation.valid}
                  >
                    🔄 Reset
                  </button>
                </div>
              )}
              
              {!useSubCode && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ℹ️ This project does not use a sub-code
                </p>
              )}
              
              {useSubCode && autoSubCode && (
                <p className="text-xs text-blue-600 mt-1">💡 Auto-generated from project code</p>
              )}
              {/* ✅ Show duplicate check messages for Sub-Code as well */}
              {duplicateCheck.checking && projectCode && codeValidation.valid && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for duplicates...
                </p>
              )}
              {duplicateCheck.isDuplicate && projectCode && codeValidation.valid && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {duplicateCheck.message}
                </p>
              )}
              {!duplicateCheck.isDuplicate && duplicateCheck.message && !duplicateCheck.checking && projectCode && codeValidation.valid && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {duplicateCheck.message}
                </p>
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
          
          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Info className="inline h-4 w-4 mr-1" />
              Project Description
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Enter project description..."
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            />
          </div>
          
          {/* Responsible Division */}
          <div>
            <div className="relative division-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Responsible Division {responsibleDivisions.length > 0 && `(${responsibleDivisions.length} selected)`} <span className="text-red-500">*</span>
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
          </div>
          
          
          {/* Plot Number & Contract Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plot Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Plot Number <span className="text-red-500">*</span>
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
                  Contract Amount ({selectedCurrency?.code || 'AED'}) <span className="text-red-500">*</span>
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
          
          {/* Project Award Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Project Award Date
            </label>
            <Input
              type="date"
              value={dateProjectAwarded}
              onChange={(e) => setDateProjectAwarded(e.target.value)}
              disabled={loading}
              className="focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Date when the project contract was awarded
            </p>
          </div>
          
          {/* Project Duration & Date Fields Toggle */}
          <div className="space-y-4">
            {/* Project Duration - Always Visible and Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Project Duration (Days) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Enter the project duration in days. You can enter this without Start/Completion dates.
              </p>
              <Input
                type="number"
                value={projectDuration !== undefined && projectDuration !== null ? projectDuration : ''}
                onChange={(e) => {
                  const value = e.target.value
                  // ✅ CRITICAL: Parse as integer and ensure it's a valid number
                  const numValue = value.trim() === '' ? undefined : parseInt(value, 10)
                  if (numValue !== undefined && !isNaN(numValue) && numValue > 0) {
                    setProjectDuration(numValue)
                    console.log('📝 IntelligentProjectForm: User entered duration:', numValue)
                  } else if (value.trim() === '') {
                    setProjectDuration(undefined)
                  }
                }}
                onBlur={(e) => {
                  // ✅ Ensure value is preserved on blur
                  const value = e.target.value
                  const numValue = value.trim() === '' ? undefined : parseInt(value, 10)
                  if (numValue !== undefined && !isNaN(numValue) && numValue > 0) {
                    setProjectDuration(numValue)
                    console.log('💾 IntelligentProjectForm: Duration on blur:', numValue)
                  }
                }}
                disabled={loading}
                required
                placeholder="Enter project duration in days"
                min="1"
                step="1"
                className="focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Toggle Button for Start/Completion Dates */}
            <button
              type="button"
              onClick={() => setShowDateFields(!showDateFields)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {showDateFields ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Hide Start & Completion Dates</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Show Start & Completion Dates</span>
                </>
              )}
            </button>
            
            {/* Project Start Date & Completion Date - Hidden by Default */}
            {showDateFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Project Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Project Start Date
                  </label>
                  <Input
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    disabled={loading}
                    min={dateProjectAwarded || undefined}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Project Completion Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Project Completion Date
                  </label>
                  <Input
                    type="date"
                    value={projectCompletionDate}
                    onChange={(e) => setProjectCompletionDate(e.target.value)}
                    disabled={loading}
                    min={projectStartDate || dateProjectAwarded || undefined}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Retention Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              Retention Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Retention after Completion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Percent className="inline h-4 w-4 mr-1" />
                  Retention after Completion (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={retentionAfterCompletion}
                  onChange={(e) => setRetentionAfterCompletion(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., 5.00"
                  className="focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage retained after project completion
                </p>
              </div>
              
              {/* Retention after 6 Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Percent className="inline h-4 w-4 mr-1" />
                  Retention after 6 Month (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={retentionAfter6Month}
                  onChange={(e) => setRetentionAfter6Month(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., 3.00"
                  className="focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage retained after 6 months
                </p>
              </div>
              
              {/* Retention after 12 Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Percent className="inline h-4 w-4 mr-1" />
                  Retention after 12 Month (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={retentionAfter12Month}
                  onChange={(e) => setRetentionAfter12Month(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., 2.00"
                  className="focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage retained after 12 months
                </p>
              </div>
            </div>
          </div>
          
          {/* Workmanship Only & Virtual Material Value - Linked Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Workmanship Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Workmanship Only <span className="text-red-500">*</span>
              </label>
              <select
                value={workmanshipOnly}
                onChange={(e) => setWorkmanshipOnly(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              >
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            
            {/* Virtual Material Value - Always visible, but disabled when Workmanship Only = No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Virtual Material Value <span className="text-red-500">*</span>
              </label>
              <Input
                value={virtualMaterialValue}
                onChange={(e) => setVirtualMaterialValue(e.target.value)}
                placeholder={workmanshipOnly === 'No' ? "Automatically set to 0" : "Enter virtual material value..."}
                disabled={loading || workmanshipOnly === 'No'}
                required
                className={`focus:ring-orange-500 focus:border-orange-500 ${workmanshipOnly === 'No' ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                title={workmanshipOnly === 'No' ? 'Virtual Material Value is automatically set to 0 when Workmanship Only is No' : ''}
              />
              {workmanshipOnly === 'No' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Automatically set to 0 when Workmanship Only is "No"
                </p>
              )}
            </div>
          </div>
          
          {/* Advance Payment Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Advance Payment Required <span className="text-red-500">*</span>
            </label>
            <Input
              value={advancePaymentRequired}
              onChange={(e) => setAdvancePaymentRequired(e.target.value)}
              placeholder="e.g., Yes, No, 10%"
              disabled={loading}
              required
              className="focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          {/* Advance Payment Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Advance Payment Percentage
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={advancePaymentPercentage}
              onChange={(e) => setAdvancePaymentPercentage(e.target.value)}
              placeholder="e.g., 10.5"
              disabled={loading}
              className="focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">Enter percentage value (0-100)</p>
          </div>
          
          {/* Stakeholder Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Stakeholder Information <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Name */}
              <div className="relative company-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Client Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                <Input
                  value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value)
                      setClientSearch(e.target.value)
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search or enter client name..."
                  required
                  disabled={loading}
                />
                  {showClientDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const filtered = clientCompanies
                          .filter(c => !clientSearch || c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                        const hasExactMatch = clientSearch && filtered.some(c => c.company_name.toLowerCase() === clientSearch.toLowerCase().trim())
                        const showAddButton = clientSearch && clientSearch.trim().length > 0 && !hasExactMatch && filtered.length > 0
                        const showAddButtonNoResults = clientSearch && clientSearch.trim().length > 0 && filtered.length === 0
                        
                        return (
                          <>
                            {filtered.map((company) => (
                              <div
                                key={company.id}
                                onClick={() => {
                                  setClientName(company.company_name)
                                  setClientSearch('')
                                  setShowClientDropdown(false)
                                }}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                              >
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span>{company.company_name}</span>
                              </div>
                            ))}
                            {showAddButton && (
                              <div
                                onClick={() => {
                                  setNewCompanyType('Client')
                                  setNewCompanyName(clientSearch)
                                  setShowAddCompanyModal(true)
                                  setShowClientDropdown(false)
                                }}
                                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add "{clientSearch}" as Client</span>
                              </div>
                            )}
                            {showAddButtonNoResults && (
                              <div
                                onClick={() => {
                                  setNewCompanyType('Client')
                                  setNewCompanyName(clientSearch)
                                  setShowAddCompanyModal(true)
                                  setShowClientDropdown(false)
                                }}
                                className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add "{clientSearch}" as Client</span>
                              </div>
                            )}
                            {filtered.length === 0 && !showAddButton && !showAddButtonNoResults && (
                              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                Start typing to search...
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* First Party Name */}
              <div className="relative company-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="inline h-4 w-4 mr-1" />
                  First Party <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                <Input
                    value={contractorName}
                    onChange={(e) => {
                      setContractorName(e.target.value)
                      setContractorSearch(e.target.value)
                      setShowContractorDropdown(true)
                    }}
                    onFocus={() => setShowContractorDropdown(true)}
                    placeholder="Search or enter first party name..."
                  required
                  disabled={loading}
                />
                  {showContractorDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const filtered = contractorCompanies
                          .filter(c => !contractorSearch || c.company_name.toLowerCase().includes(contractorSearch.toLowerCase()))
                        const hasExactMatch = contractorSearch && filtered.some(c => c.company_name.toLowerCase() === contractorSearch.toLowerCase().trim())
                        const showAddButton = contractorSearch && contractorSearch.trim().length > 0 && !hasExactMatch && filtered.length > 0
                        const showAddButtonNoResults = contractorSearch && contractorSearch.trim().length > 0 && filtered.length === 0
                        
                        return (
                          <>
                            {filtered.map((company) => (
                              <div
                                key={company.id}
                                onClick={() => {
                                  setContractorName(company.company_name)
                                  setContractorSearch('')
                                  setShowContractorDropdown(false)
                                }}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <span>{company.company_name}</span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                                  {company.company_type}
                                </span>
                              </div>
                            ))}
                            {showAddButton && (
                              <div
                                onClick={() => {
                                  setNewCompanyType('First Party')
                                  setNewCompanyName(contractorSearch)
                                  setShowAddCompanyModal(true)
                                  setShowContractorDropdown(false)
                                }}
                                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add "{contractorSearch}" as First Party</span>
                              </div>
                            )}
                            {showAddButtonNoResults && (
                              <div
                                onClick={() => {
                                  setNewCompanyType('First Party')
                                  setNewCompanyName(contractorSearch)
                                  setShowAddCompanyModal(true)
                                  setShowContractorDropdown(false)
                                }}
                                className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add "{contractorSearch}" as First Party</span>
                              </div>
                            )}
                            {filtered.length === 0 && !showAddButton && !showAddButtonNoResults && (
                              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                Start typing to search...
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Consultant Name */}
              <div className="relative company-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Briefcase className="inline h-4 w-4 mr-1" />
                  Consultant <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                <Input
                  value={consultantName}
                    onChange={(e) => {
                      setConsultantName(e.target.value)
                      setConsultantSearch(e.target.value)
                      setShowConsultantDropdown(true)
                    }}
                    onFocus={() => setShowConsultantDropdown(true)}
                    placeholder="Search or enter consultant name..."
                  required
                  disabled={loading}
                />
                  {showConsultantDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const filtered = consultantCompanies
                          .filter(c => !consultantSearch || c.company_name.toLowerCase().includes(consultantSearch.toLowerCase()))
                        const hasExactMatch = consultantSearch && filtered.some(c => c.company_name.toLowerCase() === consultantSearch.toLowerCase().trim())
                        const showAddButton = consultantSearch && consultantSearch.trim().length > 0 && !hasExactMatch && filtered.length > 0
                        const showAddButtonNoResults = consultantSearch && consultantSearch.trim().length > 0 && filtered.length === 0
                        
                        return (
                          <>
                            {filtered.map((company) => (
                              <div
                                key={company.id}
                                onClick={() => {
                                  setConsultantName(company.company_name)
                                  setConsultantSearch('')
                                  setShowConsultantDropdown(false)
                                }}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                              >
                                <Briefcase className="h-4 w-4 text-gray-400" />
                                <span>{company.company_name}</span>
              </div>
                            ))}
                            {showAddButton && (
                              <div
                                onClick={() => {
                                  setNewCompanyType('Consultant')
                                  setNewCompanyName(consultantSearch)
                                  setShowAddCompanyModal(true)
                                  setShowConsultantDropdown(false)
                                }}
                                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add "{consultantSearch}" as Consultant</span>
                              </div>
                            )}
                            {showAddButtonNoResults && (
                              <div
                                onClick={() => {
                                  setNewCompanyType('Consultant')
                                  setNewCompanyName(consultantSearch)
                                  setShowAddCompanyModal(true)
                                  setShowConsultantDropdown(false)
                                }}
                                className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add "{consultantSearch}" as Consultant</span>
                              </div>
                            )}
                            {filtered.length === 0 && !showAddButton && !showAddButtonNoResults && (
                              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                Start typing to search...
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add New Company Modal */}
          {showAddCompanyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    Add New {newCompanyType}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddCompanyModal(false)
                      setNewCompanyName('')
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder={`Enter ${newCompanyType.toLowerCase()} name...`}
                      disabled={addingCompany}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !addingCompany && newCompanyName.trim()) {
                          handleAddNewCompany()
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Type
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-400">
                      {newCompanyType}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <ModernButton
                      onClick={handleAddNewCompany}
                      disabled={addingCompany || !newCompanyName.trim()}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      {addingCompany ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Add {newCompanyType}
                        </>
                      )}
                    </ModernButton>
                    <ModernButton
                      onClick={() => {
                        setShowAddCompanyModal(false)
                        setNewCompanyName('')
                      }}
                      variant="outline"
                      disabled={addingCompany}
                    >
                      Cancel
                    </ModernButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Location Information <span className="text-red-500">*</span>
            </h3>

            {/* Map URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Link className="inline h-4 w-4 mr-1" />
                Map URL (Optional - Extract coordinates automatically)
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://www.google.com/maps?q=25.2048,55.2708"
                  disabled={loading}
                  className="flex-1 focus:ring-purple-500 focus:border-purple-500"
                />
                <ModernButton
                  type="button"
                  onClick={handleExtractFromUrl}
                  disabled={loading || !mapUrl.trim()}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Extract
                </ModernButton>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Supports Google Maps, OpenStreetMap, and Bing Maps URLs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Latitude <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g., 25.2048"
                    required
                    disabled={loading}
                    className="focus:ring-purple-500 focus:border-purple-500 pr-10"
                  />
                  {latitude && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoordinate(latitude, 'latitude')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              
              {/* Longitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Longitude <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g., 55.2708"
                    required
                    disabled={loading}
                    className="focus:ring-purple-500 focus:border-purple-500 pr-10"
                  />
                  {longitude && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoordinate(longitude, 'longitude')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {(latitude || longitude) && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📍 Coordinates: {latitude && longitude ? `${latitude}, ${longitude}` : 'Incomplete coordinates'}
                  {latitude && longitude && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                        window.open(url, '_blank');
                      }}
                      className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 px-2 py-1 rounded transition-colors"
                    >
                      View on Map
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>
          
          {/* Additional Project Details Toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Additional Project Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stakeholders, Management Team, Location & Contract Details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  showAdditionalDetails
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={loading}
              >
                {showAdditionalDetails ? (
                  <>
                    <X className="h-4 w-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Show Details
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Additional Project Details */}
          {showAdditionalDetails && (
            <div className="space-y-6">
              {/* Project Scope - Optional */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Project Scope
                  <X className="h-4 w-4 text-red-500" />
                </h3>
                <div className="relative project-type-dropdown-container">
                  <div className="relative">
                    <div 
                      className="flex flex-wrap items-center gap-1 p-2 min-h-[42px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-text"
                      onClick={() => {
                        console.log('🖱️ Project scope container clicked, showing dropdown')
                        setShowProjectTypeDropdown(true)
                      }}
                    >
                      {/* Selected Project Scopes */}
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
                              handleRemoveProjectScope(type)
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
                          if (value.length >= 2 || value.length === 0) {
                            setShowProjectTypeDropdown(true)
                            console.log('✏️ Project scope input changed, showing dropdown')
                          } else {
                            setShowProjectTypeDropdown(false)
                          }
                        }}
                        onFocus={() => {
                          console.log('🎯 Project scope input focused, showing dropdown')
                          setShowProjectTypeDropdown(true)
                        }}
                        onClick={() => {
                          console.log('🖱️ Project scope input clicked, showing dropdown')
                          setShowProjectTypeDropdown(true)
                        }}
                        placeholder={projectTypes.length === 0 ? "Type or select project scope..." : ""}
                        disabled={loading}
                        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔽 Toggle project scope dropdown clicked')
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
                  
                  {/* Project Scope Dropdown */}
                  {showProjectTypeDropdown && (() => {
                    const inputLower = projectTypeInput.toLowerCase()
                    const filteredSuggestions = projectTypeSuggestions
                      .filter(type => {
                        if (projectTypeInput === '') return true
                        if (inputLower.length < 2) return false
                        return type.toLowerCase().includes(inputLower)
                      })
                      .filter(type => !projectTypes.includes(type))
                    
                    const canAddNew = projectTypeInput.length >= 2 && 
                      !projectTypeSuggestions.some(t => t.toLowerCase() === inputLower)
                    
                    const totalScopes = projectTypeSuggestions.length
                    const availableScopes = filteredSuggestions.length
                    
                    return (filteredSuggestions.length > 0 || canAddNew) && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            📁 Select or add project scope from Project Scope Management ({projectTypeInput === '' ? `${totalScopes} total, ${availableScopes} available` : `${availableScopes} matching`} scopes)
                          </p>
                        </div>
                        {filteredSuggestions.map((type, idx) => (
                          <button
                            key={`${type}-${idx}`}
                            type="button"
                            onClick={() => handleProjectScopeSelect(type)}
                            className="w-full px-4 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-gray-900 dark:text-white"
                          >
                            {type}
                          </button>
                        ))}
                        {canAddNew && (
                          <button
                            type="button"
                            onClick={() => handleProjectScopeSelect(projectTypeInput)}
                            className="w-full px-4 py-2 text-left bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-300 border-t border-green-200 dark:border-green-800"
                          >
                            ➕ Add "{projectTypeInput}" as new scope
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Project Completion - Optional */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CheckCircle2 className="inline h-4 w-4 mr-1" />
                  Project Completion
                  <X className="inline h-4 w-4 ml-1 text-red-500" />
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

            {/* Management Team */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Management Team
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Project Manager Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="inline h-4 w-4 mr-1" />
                    Project Manager Email
                    <X className="inline h-4 w-4 ml-1 text-red-500" />
                  </label>
                  <Input
                    type="email"
                    value={projectManagerEmail}
                    onChange={(e) => setProjectManagerEmail(e.target.value)}
                    placeholder="project.manager@company.com"
                    disabled={loading}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Area Manager Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="inline h-4 w-4 mr-1" />
                    Area Manager Email
                    <X className="inline h-4 w-4 ml-1 text-red-500" />
                  </label>
                  <Input
                    type="email"
                    value={areaManagerEmail}
                    onChange={(e) => setAreaManagerEmail(e.target.value)}
                    placeholder="area.manager@company.com"
                    disabled={loading}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Division Head Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="inline h-4 w-4 mr-1" />
                    Division Head Email
                    <X className="inline h-4 w-4 ml-1 text-red-500" />
                  </label>
                  <Input
                    type="email"
                    value={divisionHeadEmail}
                    onChange={(e) => setDivisionHeadEmail(e.target.value)}
                    placeholder="division.head@company.com"
                    disabled={loading}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Contract Details */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                Contract Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contract Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    Contract Status
                    <X className="inline h-4 w-4 ml-1 text-red-500" />
                  </label>
                  <Input
                    value={contractStatus}
                    onChange={(e) => setContractStatus(e.target.value)}
                    placeholder="e.g., Active, Pending, Completed"
                    disabled={loading}
                    className="focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
          )}
          
          {/* Info Card */}
          <ModernCard className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">💡 Smart Features:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Auto-generates sub-code from project code</li>
                  <li>Loads project scopes from Project Scope Management</li>
                  <li>Provides typical duration and budget estimates</li>
                  <li>Saves custom divisions and project scopes for future use</li>
                  <li>Validates project code format automatically</li>
                  <li>Email addresses are clickable for direct communication</li>
                  <li>Location coordinates open in Google Maps</li>
                  <li>All fields are interconnected and smart</li>
                </ul>
              </div>
            </div>
          </ModernCard>
          
          {/* Project Status - Auto-updated, shown at bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Project Status <span className="text-xs text-gray-500 dark:text-gray-400">(Auto-updated)</span>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Project status is automatically calculated based on project analytics. Default value: Upcoming
              </p>
            </div>
          </div>
          
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



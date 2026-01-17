'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { KPIDataMapper } from '@/lib/kpi-data-mapper'
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
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Form fields
  const [projectCode, setProjectCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const [inputType, setInputType] = useState<'Planned' | 'Actual'>('Planned')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [zone, setZone] = useState('')
  const [zoneNumber, setZoneNumber] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  
  // Track if form has been initialized from KPI data
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasUserChangedFields, setHasUserChangedFields] = useState(false)
  
  // Zone Management
  const [availableZones, setAvailableZones] = useState<string[]>([])
  // ✅ Removed showZoneDropdown and zoneSuggestions - using dropdown select instead
  
  // Dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  
  // Selected project info
  const [project, setProject] = useState<Project | null>(null)
  
  // Available activities for selected project
  const [availableActivities, setAvailableActivities] = useState<BOQActivity[]>([])
  
  // Smart form state (like SmartActualKPIForm)
  const [selectedActivity, setSelectedActivity] = useState<BOQActivity | null>(null)
  const [dailyRate, setDailyRate] = useState<number>(0)
  const [isAutoCalculated, setIsAutoCalculated] = useState(false)
  
  // Load data when editing
  useEffect(() => {
    if (kpi) {
      console.log('📝 Loading KPI data for editing:', kpi)
      
      // Handle both old and new column names
      const editingProjectCode = kpi['Project Full Code'] || kpi.project_full_code || ''
      setProjectCode(editingProjectCode)
      setActivityName(kpi['Activity Name'] || kpi.activity_name || '')
      setInputType(kpi['Input Type'] || kpi.input_type || 'Planned')
      setQuantity(kpi['Quantity']?.toString() || kpi.quantity?.toString() || '')
      setUnit(kpi['Unit'] || kpi.unit || '')
      
      // Load project data if available
      // ✅ FIX: Search by both project_full_code and project_code
      if (editingProjectCode && projects.length > 0) {
        const selectedProject = projects.find(p => 
          p.project_full_code === editingProjectCode || 
          p.project_code === editingProjectCode
        )
        if (selectedProject) {
          setProject(selectedProject)
          // ✅ CRITICAL: Clear zones when loading project to ensure fresh load
          setAvailableZones([])
          console.log('✅ Project loaded for editing:', {
            name: selectedProject.project_name,
            project_code: selectedProject.project_code,
            project_full_code: selectedProject.project_full_code,
            editingProjectCode
          })
        } else {
          console.warn('⚠️ Project not found for editingProjectCode:', editingProjectCode)
          // ✅ Clear zones if project not found
          setAvailableZones([])
        }
      }
      // Convert date to YYYY-MM-DD format for input[type="date"]
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return ''
        try {
          // Handle different date formats
          let date: Date
          
          // If it's already in YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = new Date(dateStr)
          }
          // If it's in DD/MM/YYYY or MM/DD/YYYY format
          else if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
            const parts = dateStr.split('/')
            // Try DD/MM/YYYY first, then MM/DD/YYYY
            if (parts[0].length === 2) {
              const year = parseInt(parts[2])
              const month = parseInt(parts[1]) - 1
              const day = parseInt(parts[0])
              date = new Date(year, month, day)
            } else {
              const year = parseInt(parts[2])
              const month = parseInt(parts[0]) - 1
              const day = parseInt(parts[1])
              date = new Date(year, month, day)
            }
          }
          // Default parsing
          else {
            date = new Date(dateStr)
          }
          
          if (isNaN(date.getTime())) {
            console.log('⚠️ Invalid date format:', dateStr)
            return ''
          }
          
          const formatted = date.toISOString().split('T')[0]
          console.log('📅 Date formatted:', dateStr, '->', formatted)
          return formatted
        } catch (error) {
          console.log('❌ Date formatting error:', error, 'for date:', dateStr)
          return ''
        }
      }
      
      // ✅ FIX: Get dates with EXACT SAME logic as Date column in table
      // EXACT COPY from KPITableWithCustomization.tsx date column
      const rawKPIDate = (kpi as any).raw || {}
      
      // Priority 1: Day column (if available and formatted)
      const dayValue = kpi.day || rawKPIDate['Day'] || ''
      
      // Priority 2: Activity Date (unified date field)
      const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
      
      // Use Activity Date (or Day if Activity Date not available)
      let dateToUse = activityDateValue || dayValue
      
      // Set Activity Date
      setActivityDate(formatDateForInput(dateToUse))
      
      // ✅ DEBUG: Log all possible date fields to find the correct one
      console.log('📅 [Date Detection] All date fields:', {
        inputType: kpi.input_type || kpi['Input Type'],
        // Direct KPI fields
        'kpi.activity_date': kpi.activity_date,
        'kpi.day': kpi.day,
        // Raw fields
        "rawKPIDate['Activity Date']": rawKPIDate['Activity Date'],
        "rawKPIDate['Day']": rawKPIDate['Day'],
        // All KPI keys
        allKpiKeys: Object.keys(kpi),
        allRawKeys: Object.keys(rawKPIDate),
        // Resolved values
        activityDateValue,
        dayValue,
        dateToUse,
        formattedDate: formatDateForInput(dateToUse)
      })
      // ✅ CRITICAL FIX: Extract zone value correctly and format it like Smart KPI Form
      // Zone may be stored as "P8888-01-1", "01-1", or just "1"
      // We need to extract the actual zone value (last part) then format as projectFullCode-zone
      const rawZone = (kpi['Zone'] || kpi.zone || '').toString().trim()
      const projectFullCode = (kpi['Project Full Code'] || kpi.project_full_code || '').toString().trim()
      const projectCode = (kpi['Project Code'] || kpi.project_code || '').toString().trim()
      
      let zoneValue = rawZone // This will be the base zone value (e.g., "1")
      
      if (rawZone) {
        // Strategy 1: If zone contains project full code, extract zone part after it
        if (projectFullCode && rawZone.includes(projectFullCode)) {
          // Remove project full code and any separators to get base zone value
          zoneValue = rawZone.replace(new RegExp(`^${projectFullCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*`, 'i'), '').trim()
        }
        // Strategy 2: If zone contains project code, extract zone part after it
        else if (projectCode && rawZone.includes(projectCode) && !rawZone.includes(projectFullCode)) {
          zoneValue = rawZone.replace(new RegExp(`^${projectCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*`, 'i'), '').trim()
        }
        
        // Strategy 3: Extract last part after last dash (e.g., "01-1" -> "1", "P8888-01-1" -> "1")
        const parts = zoneValue.split('-').filter((p: string) => p.trim() !== '')
        if (parts.length > 1) {
          // Take the last part as the actual zone value
          zoneValue = parts[parts.length - 1].trim()
        } else if (parts.length === 1) {
          zoneValue = parts[0].trim()
        }
        
        // Strategy 4: Remove any remaining project code patterns
        if (projectCode && zoneValue) {
          const projectCodeUpper = projectCode.toUpperCase()
          zoneValue = zoneValue.replace(new RegExp(`^${projectCodeUpper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*`, 'i'), '').trim()
          zoneValue = zoneValue.replace(new RegExp(`^${projectCodeUpper}(\\s|-)+`, 'i'), '').trim()
        }
        
        // Clean up any leading/trailing dashes or spaces
        zoneValue = zoneValue.replace(/^\s*-\s*/, '').trim()
        zoneValue = zoneValue.replace(/\s*-\s*$/, '').trim()
      }
      
      // ✅ Format zone like Smart KPI Form: projectFullCode-zone (e.g., "P8888-01-1")
      // But only if we have both projectFullCode and zoneValue
      let finalZone = zoneValue || rawZone
      if (projectFullCode && zoneValue && !zoneValue.includes(projectFullCode)) {
        // ✅ Format as: full code + space + dash + space + zone (same as Smart KPI Form)
        finalZone = `${projectFullCode} - ${zoneValue}`
      } else if (rawZone && projectFullCode && rawZone.includes(projectFullCode)) {
        // Zone already formatted, use as is
        finalZone = rawZone
      }
      
      console.log('🔍 Zone normalization:', {
        rawZone,
        projectFullCode,
        projectCode,
        zoneValue,
        finalZone
      })
      
      setZone(finalZone)
      
      // Normalize zone number similarly
      const rawZoneNumber = (kpi['Zone Number'] || kpi.zone_number || '').toString().trim()
      let normalizedZoneNumber = rawZoneNumber
      
      if (normalizedZoneNumber && projectCode) {
        const projectCodeUpper = projectCode.toUpperCase()
        normalizedZoneNumber = normalizedZoneNumber.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        normalizedZoneNumber = normalizedZoneNumber.replace(new RegExp(`^${projectCodeUpper}(\\s|-)+`, 'i'), '').trim()
        normalizedZoneNumber = normalizedZoneNumber.replace(/^\s*-\s*/, '').trim()
      }
      
      setZoneNumber(normalizedZoneNumber || rawZoneNumber)
      setDay(kpi['Day'] || kpi.day || '')
      setDrilledMeters(kpi['Drilled Meters']?.toString() || kpi.drilled_meters?.toString() || '')
      
      console.log('✅ KPI data loaded:', {
        projectCode: kpi['Project Full Code'] || kpi.project_full_code,
        activityName: kpi['Activity Name'] || kpi.activity_name,
        inputType: kpi['Input Type'] || kpi.input_type,
        quantity: kpi['Quantity'] || kpi.quantity,
        unit: kpi['Unit'] || kpi.unit,
        activityDate: formatDateForInput(dateToUse),
        zone: kpi['Zone'] || kpi.zone,
        zoneNumber: kpi['Zone Number'] || kpi.zone_number,
        day: kpi['Day'] || kpi.day,
        drilledMeters: kpi['Drilled Meters'] || kpi.drilled_meters
      })
      
      // Load project and activities for the loaded project
      const loadedProjectCode = kpi['Project Full Code'] || kpi.project_full_code
      if (loadedProjectCode && projects.length > 0) {
        const selectedProject = projects.find(p => p.project_code === loadedProjectCode)
        if (selectedProject) {
          setProject(selectedProject)
          console.log('✅ Project loaded for editing:', selectedProject.project_name)
        }
        
        // Load activities for this project
        const projectActivities = activities.filter(a => a.project_code === loadedProjectCode)
        setAvailableActivities(projectActivities)
        console.log('✅ Activities loaded for editing:', projectActivities.length)
        
        // Smart auto-fill: Find and set the selected activity
        const loadedActivityName = kpi['Activity Name'] || kpi.activity_name
        if (loadedActivityName && projectActivities.length > 0) {
          const foundActivity = projectActivities.find(a => a.activity_name === loadedActivityName)
          if (foundActivity) {
            setSelectedActivity(foundActivity)
            console.log('🧠 Smart Form: Activity found for auto-fill:', foundActivity.activity_name)
            
            // Auto-fill smart data if it's an Actual KPI
            if (inputType === 'Actual' && foundActivity.productivity_daily_rate && foundActivity.productivity_daily_rate > 0) {
              setDailyRate(foundActivity.productivity_daily_rate)
              setIsAutoCalculated(true)
              console.log('✅ Smart Form: Daily rate auto-filled:', foundActivity.productivity_daily_rate)
            }
          }
        }
      }
      
      // Mark as initialized after a short delay to prevent immediate auto-save
      setTimeout(() => {
        setIsInitialized(true)
      }, 500)
    } else {
      setIsInitialized(true)
    }
  }, [kpi, projects, activities])
  
  // Auto-load project data when project code changes
  useEffect(() => {
    if (projectCode && projects.length > 0) {
      // ✅ Search by both project_full_code and project_code
      const selectedProject = projects.find(
        p => p.project_full_code === projectCode || p.project_code === projectCode
      )
      
      if (selectedProject) {
        setProject(selectedProject)
        console.log('✅ Project loaded:', selectedProject.project_name)
        
        // Filter activities for this project - match by both project_code and project_full_code
        const projectActivities = activities.filter(
          a => a.project_code === selectedProject.project_code || 
               a.project_full_code === projectCode ||
               a.project_full_code === selectedProject.project_full_code
        )
        setAvailableActivities(projectActivities)
        console.log(`✅ Found ${projectActivities.length} activities for project`)
      }
    } else {
      setProject(null)
      setAvailableActivities([])
      // ✅ CRITICAL: Clear zones when project is cleared
      setAvailableZones([])
    }
  }, [projectCode, projects, activities])

  // ✅ Load available zones from project_zones table for selected project ONLY
  useEffect(() => {
    const loadProjectZones = async () => {
      // ✅ CRITICAL: Clear zones first to prevent showing old data
      setAvailableZones([])
      
      if (!projectCode || !project) {
        // If no project selected, clear zones
        console.log('⚠️ No project selected, clearing zones', { projectCode, project: project?.project_name })
        return
      }

      try {
        // ✅ CRITICAL: Use project.project_code (base code) for database lookup
        // project_zones table stores zones by project_code (base code), not project_full_code
        const baseProjectCode = project?.project_code || ''
        
        if (!baseProjectCode) {
          console.error('❌ No project_code found in project object:', {
            project: project?.project_name,
            project_code: project?.project_code,
            project_full_code: project?.project_full_code,
            projectCode
          })
          setAvailableZones([])
          return
        }
        
        console.log('🔄 Loading zones for project:', {
          baseProjectCode,
          projectFullCode: project?.project_full_code,
          projectCode: projectCode,
          projectName: project?.project_name
        })
        
        const { getSupabaseClient, executeQuery } = await import('@/lib/simpleConnectionManager')
        const supabase = getSupabaseClient()
        
        // ✅ Load zones from project_zones table - filter by project_code ONLY
        // ✅ CRITICAL: Use .eq() with exact match to ensure only zones for this project
        const { data: zonesData, error: zonesError } = await executeQuery(async () =>
          supabase
            .from('project_zones')
            .select('zones')
            .eq('project_code', baseProjectCode)
            .single()
        )
        
        if (zonesError && zonesError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('❌ Error loading zones from project_zones:', zonesError)
          throw zonesError
        }
        
        if (zonesData && (zonesData as any).zones) {
          // Parse comma-separated zones
          const rawZonesList = (zonesData as any).zones
            .split(',')
            .map((z: string) => z.trim())
            .filter((z: string) => z.length > 0)
          
          console.log(`📋 Raw zones from database for project "${baseProjectCode}":`, rawZonesList)
          
          // ✅ Format zones as: projectFullCode - zone (same as Smart KPI Form)
          // Example: zone "1" becomes "P8888-01 - 1" if projectFullCode is "P8888-01"
          const projectFullCode = project?.project_full_code || project?.project_code || baseProjectCode
          const formattedZonesList = rawZonesList.map((zone: string) => {
            // If zone already contains project code, use it as is
            if (zone.includes(projectFullCode)) {
              return zone
            }
            // ✅ Format as: full code + space + dash + space + zone (same as Smart KPI Form)
            return `${projectFullCode} - ${zone}`
          }).sort()
          
          setAvailableZones(formattedZonesList)
          console.log(`✅ Loaded ${formattedZonesList.length} zones from project "${baseProjectCode}" (formatted):`, formattedZonesList)
        } else {
          // No zones defined for this project
          console.log('⚠️ No zones defined for project:', baseProjectCode)
          setAvailableZones([])
        }
      } catch (error) {
        console.error('❌ Error loading project zones:', error)
        setAvailableZones([])
      }
    }
    
    loadProjectZones()
  }, [projectCode, project])
  
  // ✅ Match loaded zone with available zones after zones are loaded
  // Zones in availableZones are already formatted as projectFullCode-zone (same as Smart KPI Form)
  useEffect(() => {
    if (zone && availableZones.length > 0 && project && kpi) {
      const projectFullCode = project?.project_full_code || project?.project_code || ''
      
      // Try to find exact match first
      const exactMatch = availableZones.find(z => z.toLowerCase() === zone.toLowerCase())
      if (exactMatch && exactMatch !== zone) {
        console.log('✅ Zone matched exactly:', exactMatch, 'from', zone)
        setZone(exactMatch)
        return
      }
      
      // Try to format zone and match (e.g., if zone is "1" or "01-1", format as "P8888-01 - 1" and match)
      if (projectFullCode && !zone.includes(projectFullCode)) {
        // Extract base zone value (last part after dash or space-dash-space)
        const zoneParts = zone.split(/\s*-\s*/)
        const baseZoneValue = zoneParts[zoneParts.length - 1]?.trim() || zone
        // ✅ Format as: full code + space + dash + space + zone (same as Smart KPI Form)
        const formattedZone = `${projectFullCode} - ${baseZoneValue}`
        
        const formattedMatch = availableZones.find(z => z.toLowerCase() === formattedZone.toLowerCase())
        if (formattedMatch) {
          console.log('✅ Zone matched after formatting:', formattedMatch, 'from', zone, '(base value:', baseZoneValue, ')')
          setZone(formattedMatch)
          return
        }
      }
      
      // Try to find partial match (zone contains or is contained by available zone)
      const partialMatch = availableZones.find(z => {
        const zLower = z.toLowerCase()
        const zoneLower = zone.toLowerCase()
        return zLower.includes(zoneLower) || zoneLower.includes(zLower)
      })
      if (partialMatch && partialMatch !== zone) {
        console.log('✅ Zone matched partially:', partialMatch, 'from', zone)
        setZone(partialMatch)
        return
      }
      
      // Try to extract zone number and match (e.g., "01-1" -> "1", "P8888-01 - 1" -> "1")
      const zoneNumberMatch = zone.match(/(\d+)$/)
      if (zoneNumberMatch && projectFullCode) {
        const zoneNumber = zoneNumberMatch[1]
        // ✅ Format as: full code + space + dash + space + zone number (same as Smart KPI Form)
        const formattedZoneNumber = `${projectFullCode} - ${zoneNumber}`
        const numberMatch = availableZones.find(z => {
          return z.toLowerCase() === formattedZoneNumber.toLowerCase() || z.endsWith(` - ${zoneNumber}`)
        })
        if (numberMatch && numberMatch !== zone) {
          console.log('✅ Zone matched by number:', numberMatch, 'from', zone, '(extracted number:', zoneNumber, ')')
          setZone(numberMatch)
          return
        }
      }
      
      console.log('⚠️ Zone not found in available zones:', zone, 'Available:', availableZones)
    }
  }, [zone, availableZones, project, kpi])
  
  // Smart auto-fill when activity is selected
  useEffect(() => {
    if (activityName && availableActivities.length > 0) {
      const foundActivity = availableActivities.find(a => a.activity_name === activityName)
      
      if (foundActivity) {
        setSelectedActivity(foundActivity)
        console.log('🧠 Smart Form: Activity selected:', foundActivity.activity_name)
        
        // Auto-fill unit
        if (foundActivity.unit) {
          setUnit(foundActivity.unit)
          console.log('✅ Smart Form: Unit auto-filled:', foundActivity.unit)
        }
        
        
        // Auto-fill daily rate and calculate quantity for Actual KPIs
        if (inputType === 'Actual' && foundActivity.productivity_daily_rate && foundActivity.productivity_daily_rate > 0) {
          setDailyRate(foundActivity.productivity_daily_rate)
          setQuantity(foundActivity.productivity_daily_rate.toString())
          setIsAutoCalculated(true)
          console.log('✅ Smart Form: Daily rate auto-filled:', foundActivity.productivity_daily_rate)
          console.log('🧮 Smart Form: Quantity auto-calculated for one day:', foundActivity.productivity_daily_rate)
        } else {
          console.log('⚠️ Smart Form: No daily rate found for activity')
          setDailyRate(0)
          setIsAutoCalculated(false)
        }
      }
    }
  }, [activityName, availableActivities, inputType])
  
  function handleProjectSelect(selectedProject: Project) {
    // ✅ Use project_full_code if available, otherwise use project_code
    const projectCodeToUse = selectedProject.project_full_code || selectedProject.project_code
    setProjectCode(projectCodeToUse)
    setProject(selectedProject)
    setShowProjectDropdown(false)
    setHasUserChangedFields(true)
    
    // Load activities for this project - match by both project_code and project_full_code
    const projectActivities = activities.filter(a => 
      a.project_code === selectedProject.project_code ||
      a.project_full_code === projectCodeToUse ||
      a.project_full_code === selectedProject.project_full_code
    )
    setAvailableActivities(projectActivities)
    console.log('✅ Activities loaded for project:', projectActivities.length)
    
    // Reset activity related fields when project changes
    setActivityName('')
    setSelectedActivity(null)
    setUnit('')
    setQuantity('')
    setDailyRate(0)
    setIsAutoCalculated(false)
  }
  
  function handleActivitySelect(activityName: string) {
    setActivityName(activityName)
    setShowActivityDropdown(false)
    setHasUserChangedFields(true)
    
    // Find and set the selected activity for smart auto-fill
    const activity = availableActivities.find(a => a.activity_name === activityName)
    if (activity) {
      setSelectedActivity(activity)
      console.log('🧠 Smart Form: Activity selected for auto-fill:', activity.activity_name)
      
      // Auto-fill zone information from activity (only if it's a valid zone, not division)
      if (activity.zone_ref && activity.zone_ref !== 'Enabling Division') {
        setZone(activity.zone_ref)
        console.log('✅ Smart Form: Zone auto-filled from activity:', activity.zone_ref)
      }
      if (activity.zone_number) {
        setZoneNumber(activity.zone_number)
        console.log('✅ Smart Form: Zone number auto-filled from activity:', activity.zone_number)
      }
    }
  }

  // Zone handlers - Updated for dropdown select
  function handleZoneSelect(selectedZone: string) {
    setZone(selectedZone)
    setHasUserChangedFields(true)
    
    // Auto-generate zone number if not provided
    if (!zoneNumber) {
      const zoneNum = selectedZone.match(/(\d+)/)?.[1] || ''
      setZoneNumber(zoneNum)
    }
    
    console.log('✅ Zone selected:', selectedZone)
  }

  function handleZoneNumberChange(value: string) {
    setZoneNumber(value)
    setHasUserChangedFields(true)
    
    // Auto-generate zone ref if not provided
    if (!zone && value) {
      setZone(`Zone ${value}`)
    }
  }
  
  // Auto-save function with useCallback
  const autoSave = useCallback(async () => {
    // Only auto-save if form is initialized, KPI exists (editing mode), and user has changed fields
    if (!isInitialized || !kpi || !hasUserChangedFields) return
    
    // Basic validation for auto-save
    if (!projectCode || !activityName || !quantity || !unit) return
    if (!activityDate) return
    
    try {
      const quantityValue = parseFloat(quantity)
      if (isNaN(quantityValue) || quantityValue < 0) return
      
      setAutoSaving(true)
      
      // ✅ Use project_full_code for Project Full Code (e.g., "P8888-01")
      const finalProjectCode = projectCode || project?.project_full_code || project?.project_code || ''
      // ✅ Use project_code (base code) for Project Code (e.g., "P8888")
      const projectCodeOnly = project?.project_code || ''
      
      // ✅ Calculate Day from Activity Date if not provided (same format as Planned KPIs)
      let dayValue = day || ''
      if (!dayValue && activityDate) {
        try {
          const date = new Date(activityDate)
          if (!isNaN(date.getTime())) {
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
            dayValue = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekday}`
          }
        } catch (e) {
          console.warn('⚠️ Could not calculate Day from date:', activityDate)
        }
      }
      
      // ✅ Calculate Activity Date (unified date field)
      const activityDateValue = activityDate
      
      // ✅ Get Activity Division and Activity Timing from selected activity
      let activityDivision = ''
      let activityTiming = 'post-commencement'
      if (selectedActivity) {
        activityDivision = selectedActivity.activity_division || ''
        activityTiming = selectedActivity.activity_timing || 'post-commencement'
      }
      
      // ✅ Calculate Value from Quantity × Rate if available
      let calculatedValue = quantityValue
      if (selectedActivity) {
        let rate = 0
        if (selectedActivity.rate && selectedActivity.rate > 0) {
          rate = selectedActivity.rate
        } else if (selectedActivity.total_value && selectedActivity.total_units && selectedActivity.total_units > 0) {
          rate = selectedActivity.total_value / selectedActivity.total_units
        }
        
        if (rate > 0) {
          calculatedValue = quantityValue * rate
          console.log(`💰 Calculated Value: ${quantityValue} × ${rate} = ${calculatedValue}`)
        }
      }
      
      // ✅ MATCH Planned KPIs structure exactly (same columns, same format)
      const kpiData = {
        'Project Full Code': finalProjectCode, // ✅ Full code (e.g., "P8888-01")
        'Project Code': projectCodeOnly || finalProjectCode, // ✅ Base code (e.g., "P8888")
        'Project Sub Code': project?.project_sub_code || '',
        'Activity Name': activityName,
        'Activity Division': activityDivision, // ✅ Activity Division field (same as Planned)
        'Activity Timing': activityTiming, // ✅ Activity Timing field (same as Planned)
        'Quantity': Math.round(quantityValue * 100) / 100,
        'Value': calculatedValue.toString(), // ✅ Include Value (same as Planned)
        'Unit': unit,
        'Input Type': inputType || 'Planned',
        'Activity Date': activityDate || '', // ✅ Unified Activity Date (use with Input Type filter)
        'Day': dayValue, // ✅ Calculate Day from Activity Date (same format as Planned)
        'Section': '', // ✅ Section field (empty for manual entry, same as Planned auto-generated)
        // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
        'Zone': (() => {
          const projectFullCodeValue = finalProjectCode
          const activityZone = zone || selectedActivity?.zone_ref || selectedActivity?.zone_number || ''
          if (activityZone && projectFullCodeValue) {
            // If zone already contains project code, use it as is
            if (activityZone.includes(projectFullCodeValue)) {
              return activityZone
            }
            // ✅ Format as: full code + space + dash + space + zone (same as Smart KPI Form)
            return `${projectFullCodeValue} - ${activityZone}`
          }
          return activityZone || ''
        })(),
        'Zone Number': zoneNumber || selectedActivity?.zone_number || '', // ✅ Zone Number field (same as Planned)
        'Drilled Meters': parseFloat(drilledMeters) || 0
      }
      
      console.log('💾 Auto-saving KPI:', kpiData)
      
      await onSubmit(kpiData)
      
      setLastSaved(new Date())
      console.log('✅ Auto-saved successfully')
    } catch (err: any) {
      console.error('❌ Error auto-saving KPI:', err)
      // Don't show error for auto-save, just log it
    } finally {
      setAutoSaving(false)
    }
  }, [isInitialized, kpi, hasUserChangedFields, projectCode, activityName, quantity, unit, inputType, activityDate, zone, zoneNumber, day, drilledMeters, project, onSubmit])
  
  // Auto-save effect with debounce
  useEffect(() => {
    if (!isInitialized || !kpi) return
    
    const timeoutId = setTimeout(() => {
      autoSave()
    }, 1000) // Debounce: save 1 second after last change
    
    return () => clearTimeout(timeoutId)
  }, [autoSave, isInitialized, kpi])
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validation
      if (!projectCode) throw new Error('Please select a project')
      if (!activityName) throw new Error('Please enter activity name')
      if (!quantity || quantity.trim() === '') throw new Error('Please enter a quantity')
      
      // Ensure quantity is a valid number (allow 0)
      const quantityValue = parseFloat(quantity)
      if (isNaN(quantityValue)) throw new Error('Please enter a valid number for quantity')
      if (quantityValue < 0) throw new Error('Quantity cannot be negative')
      if (!unit) throw new Error('Please enter a unit')
      if (!activityDate) throw new Error('Please enter activity date')
      
      // Debug logging
      console.log('🔍 Debug - Project object:', project)
      console.log('🔍 Debug - Project Code:', projectCode)
      console.log('🔍 Debug - Project.project_code:', project?.project_code)
      console.log('🔍 Debug - Final Project Full Code:', project?.project_code || projectCode || '')
      
      // Ensure we have a valid project code
      if (!projectCode && !project?.project_code) {
        console.error('❌ No project code available!')
        console.error('Project Code:', projectCode)
        console.error('Project object:', project)
        throw new Error('Please select a project')
      }
      
      // ✅ Use project_full_code for Project Full Code (e.g., "P8888-01")
      const finalProjectCode = projectCode || project?.project_full_code || project?.project_code || ''
      // ✅ Use project_code (base code) for Project Code (e.g., "P8888")
      const projectCodeOnly = project?.project_code || ''
      
      console.log('🔍 Final Project Full Code:', finalProjectCode)
      console.log('🔍 Project Code (base):', projectCodeOnly)
      console.log('🔍 Project Code from state:', projectCode)
      console.log('🔍 Project object:', project)
      
      // ✅ Calculate Day from Activity Date if not provided (same format as Planned KPIs)
      let dayValue = day || ''
      if (!dayValue && activityDate) {
        try {
          const date = new Date(activityDate)
          if (!isNaN(date.getTime())) {
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
            dayValue = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekday}`
          }
        } catch (e) {
          console.warn('⚠️ Could not calculate Day from date:', activityDate)
        }
      }
      
      // ✅ Calculate Activity Date (unified date field)
      const activityDateValue = activityDate
      
      // ✅ Get Activity Division and Activity Timing from selected activity
      let activityDivision = ''
      let activityTiming = 'post-commencement'
      if (selectedActivity) {
        activityDivision = selectedActivity.activity_division || ''
        activityTiming = selectedActivity.activity_timing || 'post-commencement'
      }
      
      // ✅ Calculate Value from Quantity × Rate if available
      let calculatedValue = 0
      if (selectedActivity) {
        let rate = 0
        if (selectedActivity.rate && selectedActivity.rate > 0) {
          rate = selectedActivity.rate
        } else if (selectedActivity.total_value && selectedActivity.total_units && selectedActivity.total_units > 0) {
          rate = selectedActivity.total_value / selectedActivity.total_units
        }
        
        if (rate > 0) {
          calculatedValue = quantityValue * rate
          console.log(`💰 Calculated Value: ${quantityValue} × ${rate} = ${calculatedValue}`)
        } else {
          // ✅ If no rate, use quantity as Value (same as Planned KPIs fallback)
          calculatedValue = quantityValue
        }
      } else {
        // ✅ If no activity, use quantity as Value (same as Planned KPIs fallback)
        calculatedValue = quantityValue
      }
      
      // ✅ MATCH Planned KPIs structure exactly (same columns, same format)
      const kpiData = {
        'Project Full Code': finalProjectCode, // ✅ Full code (e.g., "P8888-01")
        'Project Code': projectCodeOnly || finalProjectCode, // ✅ Base code (e.g., "P8888")
        'Project Sub Code': project?.project_sub_code || '',
        'Activity Name': activityName || '',
        'Activity Division': activityDivision, // ✅ Activity Division field (same as Planned)
        'Activity Timing': activityTiming, // ✅ Activity Timing field (same as Planned)
        'Quantity': Math.round(quantityValue * 100) / 100, // Round to 2 decimal places
        'Value': calculatedValue.toString(), // ✅ Include Value (same as Planned)
        'Unit': unit || '',
        'Input Type': inputType || 'Planned',
        'Activity Date': activityDate || '', // ✅ Unified Activity Date (use with Input Type filter)
        'Day': dayValue, // ✅ Calculate Day from Activity Date (same format as Planned)
        'Section': '', // ✅ Section field (empty for manual entry, same as Planned auto-generated)
        // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
        'Zone': (() => {
          const projectFullCodeValue = finalProjectCode
          const activityZone = zone || selectedActivity?.zone_ref || selectedActivity?.zone_number || ''
          if (activityZone && projectFullCodeValue) {
            // If zone already contains project code, use it as is
            if (activityZone.includes(projectFullCodeValue)) {
              return activityZone
            }
            // ✅ Format as: full code + space + dash + space + zone (same as Smart KPI Form)
            return `${projectFullCodeValue} - ${activityZone}`
          }
          return activityZone || ''
        })(),
        'Zone Number': zoneNumber || selectedActivity?.zone_number || '', // ✅ Zone Number field (same as Planned)
        'Drilled Meters': parseFloat(drilledMeters) || 0
      }
      
      // Validate essential fields
      if (!kpiData['Project Full Code']) {
        console.error('❌ Project Full Code is missing!')
        console.error('Project object:', project)
        console.error('Project Code:', projectCode)
        console.error('Project.project_code:', project?.project_code)
        throw new Error('Project Full Code is required')
      }
      if (!kpiData['Activity Name']) {
        throw new Error('Activity Name is required')
      }
      if (!kpiData['Quantity']) {
        throw new Error('Quantity is required')
      }
      
      console.log('📦 Submitting KPI:', kpiData)
      console.log('🔍 Project object:', project)
      console.log('🔍 Project Code:', projectCode)
      console.log('🔍 Project Full Code:', kpiData['Project Full Code'])
      console.log('🔍 Activity Name:', kpiData['Activity Name'])
      console.log('🔍 Quantity:', kpiData['Quantity'])
      console.log('🔍 Input Type:', kpiData['Input Type'])
      console.log('🔍 Activity Date:', kpiData['Activity Date'])
      
      // Submit
      console.log('🚀 Calling onSubmit with data:', kpiData)
      await onSubmit(kpiData)
      console.log('✅ onSubmit completed successfully')
      
      setSuccess(`✅ KPI ${kpi ? 'updated' : 'created'} successfully!`)
      setLastSaved(new Date())
      
      // Only close form if it's a new KPI (not editing)
      // For editing, keep the form open so user can continue editing
      if (!kpi) {
        // Close form after short delay only for new KPIs
        setTimeout(() => {
          onCancel()
        }, 1500)
      }
      
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

        {/* Auto-save indicator */}
        {kpi && isInitialized && (
          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center gap-2">
              {autoSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Auto-saving...
                  </span>
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Auto-saved
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {lastSaved.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Changes will be saved automatically when you modify any field
                  </span>
                </>
              )}
            </div>
          </div>
        )}

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

        {/* Smart Form Info */}
        {inputType === 'Actual' && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Smart KPI Form
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This form automatically fills data based on your project and activity selection. 
                  For Actual KPIs, quantities are calculated using the daily rate from your activity data.
                </p>
              </div>
            </div>
          </div>
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
                  <div><span className="font-medium">Code:</span> {project.project_full_code || project.project_code}</div>
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
                onClick={() => {
                  setInputType('Planned')
                  setHasUserChangedFields(true)
                }}
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
                onClick={() => {
                  setInputType('Actual')
                  setHasUserChangedFields(true)
                }}
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
                  setHasUserChangedFields(true)
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
                    .filter(p => {
                      if (!projectCode) return true
                      const searchTerm = projectCode.toLowerCase()
                      const projectFullCode = (p.project_full_code || p.project_code || '').toLowerCase()
                      const projectCodeLower = (p.project_code || '').toLowerCase()
                      const projectName = (p.project_name || '').toLowerCase()
                      return projectFullCode.includes(searchTerm) ||
                             projectCodeLower.includes(searchTerm) ||
                             projectName.includes(searchTerm)
                    })
                    .map(p => {
                      // ✅ Use project_full_code if available, otherwise use project_code
                      const displayCode = p.project_full_code || p.project_code
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleProjectSelect(p)}
                          className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {displayCode}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {p.project_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {p.responsible_division || 'N/A'}
                          </div>
                        </div>
                      )
                    })
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
                    setHasUserChangedFields(true)
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
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Quantity <span className="text-red-500">*</span>
                  {isAutoCalculated && inputType === 'Actual' && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Auto-calculated
                    </span>
                  )}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value)
                    setIsAutoCalculated(false) // User is manually editing
                    setHasUserChangedFields(true)
                  }}
                  placeholder="Enter quantity..."
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isAutoCalculated && inputType === 'Actual' ? 'bg-green-50 border-green-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {isAutoCalculated && inputType === 'Actual' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>
              {dailyRate > 0 && inputType === 'Actual' && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Daily rate: {dailyRate} {unit} per day
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuantity(dailyRate.toString())
                      setIsAutoCalculated(true)
                    }}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                  >
                    Reset to daily rate
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Unit <span className="text-red-500">*</span>
                  {unit && selectedActivity && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Auto-filled
                    </span>
                  )}
                </span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value)
                  setHasUserChangedFields(true)
                }}
                placeholder="e.g., m³, m, ton..."
                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  unit && selectedActivity ? 'bg-blue-50 border-blue-300' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Activity Date <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => {
                  console.log('📅 Activity date changed:', e.target.value)
                  setActivityDate(e.target.value)
                  setHasUserChangedFields(true)
                }}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {activityDate && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✅ Date loaded: {activityDate}
                </p>
              )}
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <span className="text-lg">🏗️</span>
                  Zone (Optional)
                </span>
              </label>
              {project && availableZones.length > 0 ? (
                // ✅ Dropdown list for zones from project_zones table - REQUIRED selection from list only
                <select
                  value={zone}
                  onChange={(e) => {
                    handleZoneSelect(e.target.value)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a zone --</option>
                  {availableZones.map((z, idx) => (
                    <option key={idx} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              ) : project && availableZones.length === 0 ? (
                // No zones defined for this project
                <div className="w-full px-4 py-2.5 border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                  ⚠️ No zones defined for this project. Please add zones in Project Zones Management.
                </div>
              ) : (
                // Project not selected yet
                <div className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                  Please select a project first to load zones
                </div>
              )}
              {project && availableZones.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 {availableZones.length} zone{availableZones.length !== 1 ? 's' : ''} available for this project
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <span className="text-lg">🔢</span>
                  Zone Number (Optional)
                </span>
              </label>
              <input
                type="text"
                value={zoneNumber}
                onChange={(e) => handleZoneNumberChange(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Auto-generated from Zone Reference
              </p>
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
                onChange={(e) => {
                  setDay(e.target.value)
                  setHasUserChangedFields(true)
                }}
                placeholder="e.g., Monday, Day 1..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <span className="text-lg">🔧</span>
                  Drilling
                  <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                    Optional
                  </span>
                </span>
              </label>
              <input
                type="number"
                step="0.01"
                value={drilledMeters}
                onChange={(e) => {
                  setDrilledMeters(e.target.value)
                  setHasUserChangedFields(true)
                }}
                placeholder="Enter drilled meters (optional)..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only for drilling activities - leave empty if not applicable
              </p>
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
                    <div><span className="font-medium">Project:</span> {projectCode || project?.project_full_code || project?.project_code || ''}</div>
                    <div><span className="font-medium">Activity:</span> {activityName}</div>
                    <div><span className="font-medium">Quantity:</span> {quantity} {unit}</div>
                    {activityDate && (
                      <div><span className="font-medium">Activity Date:</span> {new Date(activityDate).toLocaleDateString()}</div>
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



'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from './Button'
import { X, Filter, ChevronDown, Search } from 'lucide-react'
import { PROJECT_STATUSES } from '@/lib/projectTemplates'

interface SmartFilterProps {
  // Projects data
  projects: Array<{ 
    project_code: string
    project_sub_code?: string
    project_full_code?: string
    project_name: string 
  }>
  
  // Activities data (for dynamic filtering)
  activities?: Array<{ activity_name: string; project_code?: string; project_full_code?: string; zone?: string; unit?: string; activity_division?: string }>
  
  // KPIs data (for extracting unique values for filters)
  kpis?: Array< { zone?: string; section?: string; unit?: string; activity_division?: string; activity_scope?: string; activity_timing?: string; value?: number; quantity?: number }>
  
  // Current filters
  selectedProjects: string[]
  selectedActivities: string[]
  selectedTypes: string[]
  selectedZones?: string[]
  selectedSections?: string[]
  selectedUnits?: string[]
  selectedDivisions?: string[]
  selectedScopes?: string[]
  selectedActivityTimings?: string[]
  selectedStatuses?: string[]
  dateRange?: { from?: string; to?: string }
  valueRange?: { min?: number; max?: number }
  quantityRange?: { min?: number; max?: number }
  
  // Callbacks
  onProjectsChange: (projects: string[]) => void
  onActivitiesChange: (activities: string[]) => void
  onTypesChange: (types: string[]) => void
  onZonesChange: (zones: string[]) => void
  onSectionsChange?: (sections: string[]) => void
  onUnitsChange: (units: string[]) => void
  onDivisionsChange: (divisions: string[]) => void
  onScopesChange?: (scopes: string[]) => void
  onActivityTimingsChange?: (timings: string[]) => void
  onStatusesChange: (statuses: string[]) => void
  onDateRangeChange: (range: { from?: string; to?: string }) => void
  onValueRangeChange: (range: { min?: number; max?: number }) => void
  onQuantityRangeChange: (range: { min?: number; max?: number }) => void
  onClearAll: () => void
  
  // Optional: Always show filters expanded (for Project Management)
  alwaysExpanded?: boolean
}

export function SmartFilter({
  projects,
  activities = [],
  kpis = [],
  selectedProjects,
  selectedActivities,
  selectedTypes,
  selectedZones,
  selectedSections = [],
  selectedUnits,
  selectedDivisions,
  selectedScopes = [],
  selectedActivityTimings = [],
  selectedStatuses = [],
  dateRange,
  valueRange,
  quantityRange,
  onProjectsChange,
  onActivitiesChange,
  onTypesChange,
  onZonesChange,
  onSectionsChange,
  onUnitsChange,
  onDivisionsChange,
  onScopesChange,
  onActivityTimingsChange,
  onStatusesChange,
  onDateRangeChange,
  onValueRangeChange,
  onQuantityRangeChange,
  onClearAll,
  alwaysExpanded = false
}: SmartFilterProps) {
  // Dropdowns are closed by default, even when alwaysExpanded (buttons are always visible)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [showSectionDropdown, setShowSectionDropdown] = useState(false)
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  const [showScopeDropdown, setShowScopeDropdown] = useState(false)
  const [showActivityTimingDropdown, setShowActivityTimingDropdown] = useState(false)
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  const [showValueRangeModal, setShowValueRangeModal] = useState(false)
  const [showQuantityRangeModal, setShowQuantityRangeModal] = useState(false)
  
  // 🔧 FIX: Add search states
  const [projectSearch, setProjectSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [zoneSearch, setZoneSearch] = useState('')
  const [sectionSearch, setSectionSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [divisionSearch, setDivisionSearch] = useState('')
  const [scopeSearch, setScopeSearch] = useState('')
  const [activityTimingSearch, setActivityTimingSearch] = useState('')
  
  // Date range inputs
  const [dateFromInput, setDateFromInput] = useState(dateRange?.from || '')
  const [dateToInput, setDateToInput] = useState(dateRange?.to || '')
  
  // Value range inputs
  const [valueMinInput, setValueMinInput] = useState(valueRange?.min?.toString() || '')
  const [valueMaxInput, setValueMaxInput] = useState(valueRange?.max?.toString() || '')
  
  // Quantity range inputs
  const [quantityMinInput, setQuantityMinInput] = useState(quantityRange?.min?.toString() || '')
  const [quantityMaxInput, setQuantityMaxInput] = useState(quantityRange?.max?.toString() || '')
  
  // 🔧 FIX: Add refs for click outside detection
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const activityDropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const zoneDropdownRef = useRef<HTMLDivElement>(null)
  const sectionDropdownRef = useRef<HTMLDivElement>(null)
  const unitDropdownRef = useRef<HTMLDivElement>(null)
  const divisionDropdownRef = useRef<HTMLDivElement>(null)
  const scopeDropdownRef = useRef<HTMLDivElement>(null)
  const activityTimingDropdownRef = useRef<HTMLDivElement>(null)
  const dateRangeModalRef = useRef<HTMLDivElement>(null)
  const valueRangeModalRef = useRef<HTMLDivElement>(null)
  const quantityRangeModalRef = useRef<HTMLDivElement>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
  
  // 🔧 FIX: Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Check each dropdown/modal and close if click is outside
      if (projectDropdownRef.current && showProjectDropdown && !projectDropdownRef.current.contains(target)) {
        setShowProjectDropdown(false)
      }
      if (activityDropdownRef.current && showActivityDropdown && !activityDropdownRef.current.contains(target)) {
        setShowActivityDropdown(false)
      }
      if (typeDropdownRef.current && showTypeDropdown && !typeDropdownRef.current.contains(target)) {
        setShowTypeDropdown(false)
      }
      if (statusDropdownRef.current && showStatusDropdown && !statusDropdownRef.current.contains(target)) {
        setShowStatusDropdown(false)
      }
      if (zoneDropdownRef.current && showZoneDropdown && !zoneDropdownRef.current.contains(target)) {
        setShowZoneDropdown(false)
      }
      if (sectionDropdownRef.current && showSectionDropdown && !sectionDropdownRef.current.contains(target)) {
        setShowSectionDropdown(false)
      }
      if (unitDropdownRef.current && showUnitDropdown && !unitDropdownRef.current.contains(target)) {
        setShowUnitDropdown(false)
      }
      if (divisionDropdownRef.current && showDivisionDropdown && !divisionDropdownRef.current.contains(target)) {
        setShowDivisionDropdown(false)
      }
      if (scopeDropdownRef.current && showScopeDropdown && !scopeDropdownRef.current.contains(target)) {
        setShowScopeDropdown(false)
      }
      if (activityTimingDropdownRef.current && showActivityTimingDropdown && !activityTimingDropdownRef.current.contains(target)) {
        setShowActivityTimingDropdown(false)
      }
      if (dateRangeModalRef.current && showDateRangeModal && !dateRangeModalRef.current.contains(target)) {
        setShowDateRangeModal(false)
      }
      if (valueRangeModalRef.current && showValueRangeModal && !valueRangeModalRef.current.contains(target)) {
        setShowValueRangeModal(false)
      }
      if (quantityRangeModalRef.current && showQuantityRangeModal && !quantityRangeModalRef.current.contains(target)) {
        setShowQuantityRangeModal(false)
      }
    }
    
    // Use both mousedown and click for better detection
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('click', handleClickOutside)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showProjectDropdown, showActivityDropdown, showTypeDropdown, showStatusDropdown, showZoneDropdown, showSectionDropdown, showUnitDropdown, showDivisionDropdown, showScopeDropdown, showActivityTimingDropdown, showDateRangeModal, showValueRangeModal, showQuantityRangeModal])
  
  // 🔧 FIX: Close dropdowns when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProjectDropdown(false)
        setShowActivityDropdown(false)
        setShowTypeDropdown(false)
        setShowStatusDropdown(false)
        setShowZoneDropdown(false)
        setShowSectionDropdown(false)
        setShowUnitDropdown(false)
        setShowDivisionDropdown(false)
        setShowScopeDropdown(false)
        setShowActivityTimingDropdown(false)
        setShowDateRangeModal(false)
        setShowValueRangeModal(false)
        setShowQuantityRangeModal(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])
  
  // ✅ ENHANCED INTELLIGENT PROJECT SEARCH: Handles ALL cases with advanced logic
  // - Search "5019" finds "P5019", "P05019", "5019", etc.
  // - Search "R4" finds projects with sub_code "R4", "R-4", "-R4", etc.
  // - Search "P5066-R4" finds exact match and variations
  // - Search by project name (partial or full)
  // - Fuzzy matching for typos
  // - Case-insensitive and flexible matching
  // - Handles all project formats: P5066, P5066-R4, P5066R4, P5066 R4, etc.
  const filteredProjects = projects.filter(project => {
    const searchTerm = projectSearch.toLowerCase().trim()
    if (!searchTerm) return true
    
    const projectCode = (project.project_code || '').toLowerCase().trim()
    const projectSubCode = (project.project_sub_code || '').toLowerCase().trim()
    const projectFullCode = (project.project_full_code || '').toLowerCase().trim()
    const projectName = (project.project_name || '').toLowerCase().trim()
    
    // ✅ ENHANCED: Extract numbers from project code (handles P5019, P05019, 5019, etc.)
    const projectCodeNumbers = projectCode.replace(/^p/i, '').replace(/[^0-9]/g, '')
    const searchTermNumbers = searchTerm.replace(/^p/i, '').replace(/[^0-9]/g, '')
    
    // ✅ ENHANCED Match 1: Direct code match with multiple variations
    const matchesCode = 
      projectCode === searchTerm || 
      projectCode.replace(/^p/i, '') === searchTerm ||
      projectCode.replace(/^p/i, '').replace(/^0+/, '') === searchTerm.replace(/^0+/, '') || // Handle leading zeros
      projectCodeNumbers === searchTermNumbers ||
      projectCode.includes(searchTerm) ||
      projectCode.replace(/^p/i, '').includes(searchTerm) ||
      searchTerm.includes(projectCode.replace(/^p/i, ''))
    
    // ✅ ENHANCED Match 2: Sub code match with variations (R4, R-4, -R4, etc.)
    const matchesSubCode = projectSubCode && (
      projectSubCode === searchTerm ||
      projectSubCode.replace(/^-/, '') === searchTerm.replace(/^-/, '') ||
      projectSubCode.replace(/^-/, '') === searchTerm ||
      projectSubCode.includes(searchTerm) ||
      searchTerm.includes(projectSubCode) ||
      projectSubCode.replace(/[^a-z0-9]/gi, '') === searchTerm.replace(/[^a-z0-9]/gi, '') // Alphanumeric only match
    )
    
    // ✅ ENHANCED Match 3: Full code match with all format variations
    const matchesFullCode = projectFullCode && (
      projectFullCode === searchTerm ||
      projectFullCode.replace(/[^a-z0-9]/gi, '') === searchTerm.replace(/[^a-z0-9]/gi, '') || // Alphanumeric only
      projectFullCode.includes(searchTerm) ||
      searchTerm.includes(projectFullCode) ||
      projectFullCode.replace(/-/g, '') === searchTerm.replace(/-/g, '') || // Without dashes
      projectFullCode.replace(/\s/g, '') === searchTerm.replace(/\s/g, '') // Without spaces
    )
    
    // ✅ ENHANCED Match 4: Project name match (partial words, fuzzy)
    const matchesName = projectName && (
      projectName === searchTerm ||
      projectName.includes(searchTerm) ||
      searchTerm.split(' ').every(word => projectName.includes(word)) || // All words match
      projectName.split(' ').some(word => word.startsWith(searchTerm)) // Any word starts with search
    )
    
    // ✅ ENHANCED Match 5: Combined formats with all variations
    const combinedFormats = [
      projectSubCode ? `${projectCode}-${projectSubCode}` : '',
      projectSubCode ? `${projectCode}${projectSubCode}` : '',
      projectSubCode ? `${projectCode} ${projectSubCode}` : '',
      projectSubCode ? `${projectCode.replace(/^p/i, '')}-${projectSubCode}` : '',
      projectSubCode ? `${projectCode.replace(/^p/i, '')}${projectSubCode}` : ''
    ].filter(Boolean)
    
    const matchesCombined = combinedFormats.some(format => {
      const formatLower = format.toLowerCase()
      return formatLower === searchTerm ||
             formatLower.includes(searchTerm) ||
             searchTerm.includes(formatLower) ||
             formatLower.replace(/[^a-z0-9]/gi, '') === searchTerm.replace(/[^a-z0-9]/gi, '')
    })
    
    // ✅ ENHANCED Match 6: Number-only search (e.g., "5066" matches "P5066", "P05066", etc.)
    const matchesNumbersOnly = searchTermNumbers && projectCodeNumbers && (
      projectCodeNumbers === searchTermNumbers ||
      projectCodeNumbers.includes(searchTermNumbers) ||
      searchTermNumbers.includes(projectCodeNumbers)
    )
    
    return matchesCode || matchesSubCode || matchesFullCode || matchesName || matchesCombined || matchesNumbersOnly
  })
  
  // ✅ SIMPLIFIED: Filter activities by Project Full Code ONLY
  // - project_full_code is the ONLY identifier - any difference means separate project
  const availableActivities = selectedProjects.length > 0 ? activities.filter(a => {
    const activityFullCode = ((a as any).project_full_code || '').toString().trim()
    
    return selectedProjects.some(selectedFullCode => {
      // ✅ ONLY match by exact Project Full Code - no other logic
      return activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
    })
  }).reduce((acc, curr) => {
    // Remove duplicates by activity name
    if (!acc.find(a => a.activity_name === curr.activity_name)) {
      acc.push(curr)
    }
    return acc
  }, [] as typeof activities).filter(activity =>
    // ✅ ENHANCED: Apply intelligent search filter (case-insensitive, partial match)
    !activitySearch || activity.activity_name.toLowerCase().includes(activitySearch.toLowerCase())
  ) : []
  
  // ✅ Helper function to normalize zone value (remove project code prefix)
  const normalizeZone = (zone: string, projectCodes: string[]): string => {
    if (!zone || zone.trim() === '') return ''
    
    let normalized = zone.trim()
    
    // Remove project code prefixes (e.g., "P5068 - 0" -> "0")
    for (const projectCode of projectCodes) {
      const codeUpper = projectCode.toUpperCase()
      // Remove patterns like "P5068 - 0", "P5068-0", "P5068 0"
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
    }
    
    return normalized || zone.trim() // Return original if normalization results in empty
  }
  
  // Get unique zones from KPIs and activities (only for selected projects)
  // ✅ FIX: Extract zones from multiple sources, normalize them, and remove duplicates
  const selectedProjectCodes = selectedProjects.map(p => {
    const parts = p.split('-')
    return parts[0] // Extract project code (e.g., "P5068" from "P5068-01")
  })
  
  const allZones = selectedProjects.length > 0 ? [
    // From KPIs: check zone, zone_ref, zone_number (NOT from Section - Section is separate)
    ...kpis.map(k => {
      // ✅ NOT from Section - Section is separate from Zone
      const kpiZone = ((k as any).zone_number || k.zone || '').toString().trim()
      return kpiZone
    }).filter(Boolean) as string[],
    // From activities: check zone (which should be zone_ref or zone_number from KPITracking)
    ...activities.filter(a => {
      const activityFullCode = ((a as any).project_full_code || '').toString().trim()
      return selectedProjects.some(selectedFullCode => 
        activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
      )
    }).map(a => {
      // Activities in KPI page pass zone as zone_ref || zone_number
      const activityZone = ((a as any).zone_number || a.zone || '').toString().trim()
      return activityZone
    }).filter(Boolean) as string[]
  ] : []
  
  // Normalize zones and create a map to track both normalized and original forms
  const zoneMap = new Map<string, string>() // normalized -> original (prefer shorter)
  
  allZones.forEach(zone => {
    if (!zone || zone.trim() === '') return
    
    // ✅ Exclude anything that looks like a division
    const zoneLower = zone.toLowerCase()
    if (zoneLower.includes('division')) return
    
    // Normalize zone
    const normalized = normalizeZone(zone, selectedProjectCodes)
    
    // Use normalized as key, but prefer shorter original value
    if (!zoneMap.has(normalized) || zone.length < zoneMap.get(normalized)!.length) {
      zoneMap.set(normalized, normalized) // Use normalized value for display
    }
  })
  
  // Also exclude if it matches any division
  const allDivisions = Array.from(new Set([
    ...kpis.map(k => k.activity_division).filter(Boolean) as string[],
    ...activities.map(a => a.activity_division).filter(Boolean) as string[]
  ])).map(d => d.toLowerCase())
  
  const uniqueZones = Array.from(zoneMap.values()).filter(zone => {
    const zoneLower = zone.toLowerCase()
    return !allDivisions.includes(zoneLower)
  })
  
  // Get unique units from KPIs (only for selected projects)
  const uniqueUnits = selectedProjects.length > 0 ? Array.from(new Set(
    kpis.map(k => k.unit).filter(Boolean) as string[]
  )).filter(unit => unit && unit.trim() !== '') : []
  
  // ✅ Get unique sections from KPIs (only for Actual KPIs and selected projects)
  const uniqueSections = selectedProjects.length > 0 ? Array.from(new Set(
    kpis
      .filter(k => {
        // Only include Actual KPIs (Section is only relevant for Actual KPIs)
        const inputType = (k as any).input_type || (k as any).inputType || ''
        return inputType === 'Actual' || inputType === 'actual'
      })
      .map(k => k.section).filter(Boolean) as string[]
  )).filter(section => section && section.trim() !== '' && section !== 'N/A') : []
  
  // Get unique divisions from KPIs and activities
  // ✅ Show all divisions even when no projects are selected
  const uniqueDivisions = Array.from(new Set([
    ...kpis.map(k => k.activity_division).filter(Boolean) as string[],
    ...(selectedProjects.length > 0 
      ? activities.filter(a => {
          const activityFullCode = ((a as any).project_full_code || '').toString().trim()
          return selectedProjects.some(selectedFullCode => 
            activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
          )
        }).map(a => a.activity_division).filter(Boolean) as string[]
      : activities.map(a => a.activity_division).filter(Boolean) as string[]
    )
  ])).filter(division => division && division.trim() !== '')
  
  // Get unique scopes from KPIs (only for selected projects)
  // ✅ Scope comes from activity_scope field in KPIs or from project_type_activities table
  const uniqueScopes = selectedProjects.length > 0 ? Array.from(new Set(
    kpis.map(k => k.activity_scope).filter(Boolean) as string[]
  )).filter(scope => scope && scope.trim() !== '' && scope !== 'N/A') : []
  
  // Get unique activity timings from KPIs (only for selected projects)
  const uniqueActivityTimings = selectedProjects.length > 0 ? Array.from(new Set(
    kpis.map(k => k.activity_timing).filter(Boolean) as string[]
  )).filter(timing => timing && timing.trim() !== '' && timing !== 'N/A') : []
  
  const types = ['Planned', 'Actual']
  
  // Filter zones, units, divisions, and scopes by search
  const filteredZones = uniqueZones.filter(zone =>
    zone.toLowerCase().includes(zoneSearch.toLowerCase())
  )
  
  const filteredUnits = uniqueUnits.filter(unit =>
    unit.toLowerCase().includes(unitSearch.toLowerCase())
  )
  
  const filteredSections = uniqueSections.filter(section =>
    section.toLowerCase().includes(sectionSearch.toLowerCase())
  )
  
  const filteredDivisions = uniqueDivisions.filter(division =>
    division.toLowerCase().includes(divisionSearch.toLowerCase())
  )
  
  const filteredScopes = uniqueScopes.filter(scope =>
    scope.toLowerCase().includes(scopeSearch.toLowerCase())
  )
  
  const filteredActivityTimings = uniqueActivityTimings.filter(timing =>
    timing.toLowerCase().includes(activityTimingSearch.toLowerCase())
  )
  
  const hasActiveFilters = (selectedProjects?.length || 0) > 0 || 
                           (selectedActivities?.length || 0) > 0 || 
                           (selectedTypes?.length || 0) > 0 || 
                           (selectedStatuses?.length || 0) > 0 ||
                           (selectedZones?.length || 0) > 0 ||
                           (selectedSections?.length || 0) > 0 ||
                           (selectedUnits?.length || 0) > 0 ||
                           (selectedDivisions?.length || 0) > 0 ||
                           (selectedScopes?.length || 0) > 0 ||
                           (selectedActivityTimings?.length || 0) > 0 ||
                           dateRange?.from || dateRange?.to ||
                           valueRange?.min !== undefined || valueRange?.max !== undefined ||
                           quantityRange?.min !== undefined || quantityRange?.max !== undefined
  
  // ✅ FIX: Use project_full_code as unique identifier instead of project_code
  const toggleProject = (projectFullCode: string) => {
    if (selectedProjects.includes(projectFullCode)) {
      onProjectsChange(selectedProjects.filter(p => p !== projectFullCode))
    } else {
      onProjectsChange([...selectedProjects, projectFullCode])
    }
  }
  
  // ✅ SIMPLIFIED: Use project_full_code from database or build from project_code + project_sub_code
  // - project_full_code is the ONLY identifier - any difference means separate project
  const getProjectFullCode = (project: { project_full_code?: string; project_code: string; project_sub_code?: string }): string => {
    // ✅ CRITICAL: Use project_full_code from database if available
    // Check all possible field names
    const projectFullCode = (
      project.project_full_code || 
      (project as any)['Project Full Code'] ||
      ''
    ).toString().trim()
    
    if (projectFullCode) {
      return projectFullCode
    }
    
    // ✅ BUILD: If project_full_code is missing, build it from project_code + project_sub_code
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (projectSubCode) {
      // Check if sub_code already starts with project_code (case-insensitive)
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        // Sub_code already contains project_code (e.g., "P9999-R1" or "P9999R1")
        return projectSubCode.trim()
      } else {
        // Build full code: project_code + project_sub_code
        if (projectSubCode.startsWith('-')) {
          return `${projectCode}${projectSubCode}`.trim()
        } else {
          return `${projectCode}-${projectSubCode}`.trim()
        }
      }
    }
    
    // Fallback: use project_code only if no sub_code
    return projectCode
  }
  
  // ✅ SIMPLIFIED: Display code is the same as project_full_code
  const getProjectDisplayCode = (project: { project_code: string; project_sub_code?: string; project_full_code?: string }): string => {
    // ✅ CRITICAL: Always use project_full_code for display
    return getProjectFullCode(project)
  }
  
  // Calculate filtered project codes for Select All functionality
  // ✅ Moved here after getProjectFullCode is defined
  const filteredProjectFullCodes = useMemo(() => {
    return filteredProjects.map(p => getProjectFullCode(p))
  }, [filteredProjects])
  
  const allFilteredProjectsSelected = filteredProjectFullCodes.length > 0 && 
    filteredProjectFullCodes.every(code => selectedProjects.includes(code))
  const someFilteredProjectsSelected = filteredProjectFullCodes.some(code => selectedProjects.includes(code))
  
  // Set indeterminate state for Select All checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someFilteredProjectsSelected && !allFilteredProjectsSelected
    }
  }, [someFilteredProjectsSelected, allFilteredProjectsSelected])
  
  const toggleActivity = (activityName: string) => {
    if (selectedActivities.includes(activityName)) {
      onActivitiesChange(selectedActivities.filter(a => a !== activityName))
    } else {
      onActivitiesChange([...selectedActivities, activityName])
    }
  }
  
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }
  
  const toggleZone = (zone: string) => {
    const zones = selectedZones || []
    if (zones.includes(zone)) {
      onZonesChange(zones.filter(z => z !== zone))
    } else {
      onZonesChange([...zones, zone])
    }
  }
  
  const toggleUnit = (unit: string) => {
    const units = selectedUnits || []
    if (units.includes(unit)) {
      onUnitsChange(units.filter(u => u !== unit))
    } else {
      onUnitsChange([...units, unit])
    }
  }
  
  const toggleSection = (section: string) => {
    if (!onSectionsChange) return
    const sections = selectedSections || []
    if (sections.includes(section)) {
      onSectionsChange(sections.filter(s => s !== section))
    } else {
      onSectionsChange([...sections, section])
    }
  }
  
  const toggleDivision = (division: string) => {
    const divisions = selectedDivisions || []
    if (divisions.includes(division)) {
      onDivisionsChange(divisions.filter(d => d !== division))
    } else {
      onDivisionsChange([...divisions, division])
    }
  }
  
  const toggleScope = (scope: string) => {
    if (!onScopesChange) return
    const scopes = selectedScopes || []
    if (scopes.includes(scope)) {
      onScopesChange(scopes.filter(s => s !== scope))
    } else {
      onScopesChange([...scopes, scope])
    }
  }
  
  const toggleActivityTiming = (timing: string) => {
    if (!onActivityTimingsChange) return
    const timings = selectedActivityTimings || []
    if (timings.includes(timing)) {
      onActivityTimingsChange(timings.filter(t => t !== timing))
    } else {
      onActivityTimingsChange([...timings, timing])
    }
  }
  
  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter(s => s !== status))
    } else {
      onStatusesChange([...selectedStatuses, status])
    }
  }
  
  const handleDateRangeApply = () => {
    onDateRangeChange({
      from: dateFromInput || undefined,
      to: dateToInput || undefined
    })
    setShowDateRangeModal(false)
  }
  
  const handleValueRangeApply = () => {
    onValueRangeChange({
      min: valueMinInput ? parseFloat(valueMinInput) : undefined,
      max: valueMaxInput ? parseFloat(valueMaxInput) : undefined
    })
    setShowValueRangeModal(false)
  }
  
  const handleQuantityRangeApply = () => {
    onQuantityRangeChange({
      min: quantityMinInput ? parseFloat(quantityMinInput) : undefined,
      max: quantityMaxInput ? parseFloat(quantityMaxInput) : undefined
    })
    setShowQuantityRangeModal(false)
  }
  
  // 🔧 FIX: Add functions to close all dropdowns
  const closeAllDropdowns = () => {
    setShowProjectDropdown(false)
    setShowActivityDropdown(false)
    setShowTypeDropdown(false)
  }
  
  // 🔧 FIX: Add functions to handle dropdown toggle with better UX
  const toggleProjectDropdown = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.stopPropagation()
    setShowProjectDropdown(!showProjectDropdown)
    // Close other dropdowns when opening this one
    if (!showProjectDropdown) {
      setShowActivityDropdown(false)
      setShowTypeDropdown(false)
      setShowStatusDropdown(false)
      setShowZoneDropdown(false)
      setShowUnitDropdown(false)
      setShowDivisionDropdown(false)
      setShowDateRangeModal(false)
      setShowValueRangeModal(false)
      setShowQuantityRangeModal(false)
    }
  }
  
  const toggleActivityDropdown = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.stopPropagation()
    setShowActivityDropdown(!showActivityDropdown)
    // Close other dropdowns when opening this one
    if (!showActivityDropdown) {
      setShowProjectDropdown(false)
      setShowTypeDropdown(false)
      setShowStatusDropdown(false)
      setShowZoneDropdown(false)
      setShowUnitDropdown(false)
      setShowDivisionDropdown(false)
      setShowDateRangeModal(false)
      setShowValueRangeModal(false)
      setShowQuantityRangeModal(false)
    }
  }
  
  const toggleTypeDropdown = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.stopPropagation()
    setShowTypeDropdown(!showTypeDropdown)
    // Close other dropdowns when opening this one
    if (!showTypeDropdown) {
      setShowProjectDropdown(false)
      setShowActivityDropdown(false)
      setShowStatusDropdown(false)
      setShowZoneDropdown(false)
      setShowUnitDropdown(false)
      setShowDivisionDropdown(false)
      setShowDateRangeModal(false)
      setShowValueRangeModal(false)
      setShowQuantityRangeModal(false)
    }
  }
  
  const toggleStatusDropdown = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.stopPropagation()
    setShowStatusDropdown(!showStatusDropdown)
    // Close other dropdowns when opening this one
    if (!showStatusDropdown) {
      setShowProjectDropdown(false)
      setShowActivityDropdown(false)
      setShowTypeDropdown(false)
      setShowZoneDropdown(false)
      setShowUnitDropdown(false)
      setShowDivisionDropdown(false)
      setShowDateRangeModal(false)
      setShowValueRangeModal(false)
      setShowQuantityRangeModal(false)
    }
  }
  
  return (
    <div className="space-y-3">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Smart Filters
          </span>
          {hasActiveFilters && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
              Active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-700"
          >
            <X className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      
      {/* Filter Buttons - Always display in a single row */}
      <div className="flex flex-wrap gap-2">
        {/* Projects Filter */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={(e) => toggleProjectDropdown(e)}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              selectedProjects.length > 0
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showProjectDropdown ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
          >
            <span>Projects</span>
            {selectedProjects.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold">
                {selectedProjects.length}
              </span>
            )}
            {!alwaysExpanded && (
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180' : ''}`} />
            )}
          </button>
          
            {showProjectDropdown && (
            <div 
              className="absolute w-80 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredProjects.length > 0 ? (
                  <>
                    {/* Select All Option */}
                    <label
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                    >
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        checked={allFilteredProjectsSelected}
                        onChange={() => {
                          if (allFilteredProjectsSelected) {
                            // Deselect all filtered projects
                            const newSelected = selectedProjects.filter(p => !filteredProjectFullCodes.includes(p))
                            onProjectsChange(newSelected)
                          } else {
                            // Select all filtered projects (merge with existing selections)
                            const newSelected = Array.from(new Set([...selectedProjects, ...filteredProjectFullCodes]))
                            onProjectsChange(newSelected)
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {allFilteredProjectsSelected ? 'Deselect All' : 'Select All'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {filteredProjectFullCodes.length} {filteredProjectFullCodes.length === 1 ? 'project' : 'projects'}
                        </div>
                      </div>
                    </label>
                    {filteredProjects.map((project, idx) => {
                    const projectFullCode = getProjectFullCode(project)
                    const displayCode = getProjectDisplayCode(project)
                    
                    // ✅ DEBUG: Log project_full_code for diagnosis
                    if (idx < 3) {
                      console.log('🔍 SmartFilter Project:', {
                        project_code: project.project_code,
                        project_sub_code: project.project_sub_code,
                        project_full_code: project.project_full_code,
                        displayCode,
                        projectFullCode
                      })
                    }
                    
                    return (
                    <label
                        key={`project-${projectFullCode}-${idx}`}
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                          checked={selectedProjects.includes(projectFullCode)}
                          onChange={() => toggleProject(projectFullCode)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {displayCode}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {project.project_name}
                        </div>
                      </div>
                    </label>
                    )
                  })}
                  </>
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No projects found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Activities Filter */}
        <div className="relative" ref={activityDropdownRef}>
            <button
              onClick={(e) => toggleActivityDropdown(e)}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                selectedActivities.length > 0
                  ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showActivityDropdown ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
            >
              <span>Activities</span>
              {selectedActivities.length > 0 && (
                <span className="px-1.5 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                  {selectedActivities.length}
                </span>
              )}
              {!alwaysExpanded && (
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showActivityDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {showActivityDropdown && (
              <div 
                className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {availableActivities.length > 0 ? (
                    availableActivities.map((activity, idx) => (
                      <label
                        key={`${activity.activity_name}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedActivities.includes(activity.activity_name)}
                          onChange={() => toggleActivity(activity.activity_name)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {activity.activity_name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {activitySearch ? 'No activities found' : 'No activities found for selected projects'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        
        {/* Type Filter */}
        <div className="relative" ref={typeDropdownRef}>
          <button
            onClick={(e) => toggleTypeDropdown(e)}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              selectedTypes.length > 0
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showTypeDropdown ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
          >
            <span>Type</span>
            {selectedTypes.length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                {selectedTypes.length}
              </span>
            )}
            {!alwaysExpanded && (
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTypeDropdown ? 'rotate-180' : ''}`} />
            )}
          </button>
          
          {showTypeDropdown && (
            <div 
              className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                {types.map(type => (
                  <label
                    key={type}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          </div>
        
        {/* Status Filter */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            onClick={(e) => toggleStatusDropdown(e)}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              selectedStatuses.length > 0
                ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showStatusDropdown ? 'ring-2 ring-rose-500 ring-opacity-50' : ''}`}
          >
            <span>Status</span>
            {selectedStatuses.length > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-xs font-bold">
                {selectedStatuses.length}
              </span>
            )}
            {!alwaysExpanded && (
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} />
            )}
          </button>
          
          {showStatusDropdown && (
            <div 
              className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                {PROJECT_STATUSES.map(status => (
                  <label
                    key={status.value}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Zone Filter */}
        {uniqueZones.length > 0 && (
          <div className="relative" ref={zoneDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowZoneDropdown(!showZoneDropdown)
                if (!showZoneDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
                  setShowStatusDropdown(false)
                  setShowSectionDropdown(false)
                  setShowUnitDropdown(false)
                  setShowDivisionDropdown(false)
                  setShowDateRangeModal(false)
                  setShowValueRangeModal(false)
                  setShowQuantityRangeModal(false)
                }
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                (selectedZones?.length || 0) > 0
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showZoneDropdown ? 'ring-2 ring-cyan-500 ring-opacity-50' : ''}`}
            >
              <span>Zone</span>
              {(selectedZones?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-cyan-500 text-white rounded-full text-xs font-bold">
                  {selectedZones?.length || 0}
                </span>
              )}
              {!alwaysExpanded && (
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showZoneDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {showZoneDropdown && (
              <div 
                className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search zones..."
                      value={zoneSearch}
                      onChange={(e) => setZoneSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredZones.length > 0 ? (
                    filteredZones.map((zone, idx) => (
                      <label
                        key={`zone-${zone}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedZones || []).includes(zone)}
                          onChange={() => toggleZone(zone)}
                          className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {zone}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No zones found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Section Filter - Only for Actual KPIs */}
        {uniqueSections.length > 0 && onSectionsChange && (
          <div className="relative" ref={sectionDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSectionDropdown(!showSectionDropdown)
                if (!showSectionDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
                  setShowStatusDropdown(false)
                  setShowZoneDropdown(false)
                  setShowUnitDropdown(false)
                  setShowDivisionDropdown(false)
                  setShowScopeDropdown(false)
                  setShowActivityTimingDropdown(false)
                  setShowDateRangeModal(false)
                  setShowValueRangeModal(false)
                  setShowQuantityRangeModal(false)
                }
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                (selectedSections?.length || 0) > 0
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showSectionDropdown ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
            >
              <span>Section</span>
              {(selectedSections?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                  {selectedSections?.length || 0}
                </span>
              )}
              {!alwaysExpanded && (
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showSectionDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {showSectionDropdown && (
              <div 
                className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sections..."
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredSections.length > 0 ? (
                    filteredSections.map((section, idx) => (
                      <label
                        key={`section-${section}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedSections || []).includes(section)}
                          onChange={() => toggleSection(section)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {section}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No sections found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Unit Filter */}
        {uniqueUnits.length > 0 && (
          <div className="relative" ref={unitDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowUnitDropdown(!showUnitDropdown)
                if (!showUnitDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
                  setShowStatusDropdown(false)
                  setShowZoneDropdown(false)
                  setShowDivisionDropdown(false)
                  setShowDateRangeModal(false)
                  setShowValueRangeModal(false)
                  setShowQuantityRangeModal(false)
                }
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                (selectedUnits?.length || 0) > 0
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showUnitDropdown ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''}`}
            >
              <span>Unit</span>
              {(selectedUnits?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-xs font-bold">
                  {selectedUnits?.length || 0}
                </span>
              )}
              {!alwaysExpanded && (
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUnitDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {showUnitDropdown && (
              <div 
                className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search units..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((unit, idx) => (
                      <label
                        key={`unit-${unit}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedUnits || []).includes(unit)}
                          onChange={() => toggleUnit(unit)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {unit}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No units found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Division Filter */}
        {/* ✅ Always show Activity Division filter, even when no projects are selected */}
        <div className="relative" ref={divisionDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDivisionDropdown(!showDivisionDropdown)
                if (!showDivisionDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
                  setShowStatusDropdown(false)
                  setShowZoneDropdown(false)
                  setShowUnitDropdown(false)
                  setShowDateRangeModal(false)
                  setShowValueRangeModal(false)
                  setShowQuantityRangeModal(false)
                }
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                (selectedDivisions?.length || 0) > 0
                  ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showDivisionDropdown ? 'ring-2 ring-teal-500 ring-opacity-50' : ''}`}
            >
              <span>Activity Division</span>
              {(selectedDivisions?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-teal-500 text-white rounded-full text-xs font-bold">
                  {selectedDivisions?.length || 0}
                </span>
              )}
              {!alwaysExpanded && (
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDivisionDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {showDivisionDropdown && (
              <div 
                className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search activity divisions..."
                      value={divisionSearch}
                      onChange={(e) => setDivisionSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredDivisions.length > 0 ? (
                    filteredDivisions.map((division, idx) => (
                      <label
                        key={`division-${division}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedDivisions || []).includes(division)}
                          onChange={() => toggleDivision(division)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {division}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No activity divisions found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        
        {/* Scope Filter */}
        {uniqueScopes.length > 0 && onScopesChange && (
          <div className="relative" ref={scopeDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowScopeDropdown(!showScopeDropdown)
                if (!showScopeDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
                  setShowStatusDropdown(false)
                  setShowZoneDropdown(false)
                  setShowUnitDropdown(false)
                  setShowDivisionDropdown(false)
                  setShowDateRangeModal(false)
                  setShowValueRangeModal(false)
                  setShowQuantityRangeModal(false)
                }
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                (selectedScopes?.length || 0) > 0
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showScopeDropdown ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
            >
              <span>Scope</span>
              {(selectedScopes?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                  {selectedScopes?.length || 0}
                </span>
              )}
              {!alwaysExpanded && (
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showScopeDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {showScopeDropdown && (
              <div 
                className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search scopes..."
                      value={scopeSearch}
                      onChange={(e) => setScopeSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredScopes.length > 0 ? (
                    filteredScopes.map((scope, idx) => (
                      <label
                        key={`scope-${scope}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedScopes || []).includes(scope)}
                          onChange={() => toggleScope(scope)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {scope}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No scopes found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Activity Timing Filter */}
        {uniqueActivityTimings.length > 0 && onActivityTimingsChange && (
          <div className="relative" ref={activityTimingDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowActivityTimingDropdown(!showActivityTimingDropdown)
                if (!showActivityTimingDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
                  setShowStatusDropdown(false)
                  setShowZoneDropdown(false)
                  setShowUnitDropdown(false)
                  setShowDivisionDropdown(false)
                  setShowScopeDropdown(false)
                  setShowDateRangeModal(false)
                  setShowValueRangeModal(false)
                  setShowQuantityRangeModal(false)
                }
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                (selectedActivityTimings?.length || 0) > 0
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              } ${showActivityTimingDropdown ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''}`}
            >
              <span>Activity Timing</span>
              {(selectedActivityTimings?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-xs font-bold">
                  {selectedActivityTimings.length}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showActivityTimingDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showActivityTimingDropdown && (
              <div 
                className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search timing..."
                      value={activityTimingSearch}
                      onChange={(e) => setActivityTimingSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-64">
                  {filteredActivityTimings.length > 0 ? (
                    filteredActivityTimings.map((timing) => {
                      const isSelected = selectedActivityTimings?.includes(timing) || false
                      const formattedTiming = timing
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')
                      
                      return (
                        <label
                          key={timing}
                          className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleActivityTiming(timing)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {formattedTiming}
                          </span>
                        </label>
                      )
                    })
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No activity timings found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Date Range Filter */}
        <div className="relative" ref={dateRangeModalRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDateRangeModal(!showDateRangeModal)
              if (!showDateRangeModal) {
                setShowProjectDropdown(false)
                setShowActivityDropdown(false)
                setShowTypeDropdown(false)
                setShowStatusDropdown(false)
                setShowZoneDropdown(false)
                setShowUnitDropdown(false)
                setShowDivisionDropdown(false)
                setShowValueRangeModal(false)
                setShowQuantityRangeModal(false)
              }
            }}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              dateRange?.from || dateRange?.to
                ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showDateRangeModal ? 'ring-2 ring-pink-500 ring-opacity-50' : ''}`}
          >
            <span>Date Range</span>
            {(dateRange?.from || dateRange?.to) && (
              <span className="px-1.5 py-0.5 bg-pink-500 text-white rounded-full text-xs font-bold">
                ✓
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDateRangeModal ? 'rotate-180' : ''}`} />
          </button>
          
          {showDateRangeModal && (
            <div 
              className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFromInput}
                    onChange={(e) => setDateFromInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateToInput}
                    onChange={(e) => setDateToInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleDateRangeApply}
                    className="flex-1"
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDateFromInput('')
                      setDateToInput('')
                      onDateRangeChange({})
                      setShowDateRangeModal(false)
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Value Range Filter */}
        <div className="relative" ref={valueRangeModalRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowValueRangeModal(!showValueRangeModal)
              if (!showValueRangeModal) {
                setShowProjectDropdown(false)
                setShowActivityDropdown(false)
                setShowTypeDropdown(false)
                setShowStatusDropdown(false)
                setShowZoneDropdown(false)
                setShowUnitDropdown(false)
                setShowDivisionDropdown(false)
                setShowDateRangeModal(false)
                setShowQuantityRangeModal(false)
              }
            }}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              valueRange?.min !== undefined || valueRange?.max !== undefined
                ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showValueRangeModal ? 'ring-2 ring-yellow-500 ring-opacity-50' : ''}`}
          >
            <span>Value Range</span>
            {(valueRange?.min !== undefined || valueRange?.max !== undefined) && (
              <span className="px-1.5 py-0.5 bg-yellow-500 text-white rounded-full text-xs font-bold">
                ✓
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showValueRangeModal ? 'rotate-180' : ''}`} />
          </button>
          
          {showValueRangeModal && (
            <div 
              className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min Value</label>
                  <input
                    type="number"
                    value={valueMinInput}
                    onChange={(e) => setValueMinInput(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Value</label>
                  <input
                    type="number"
                    value={valueMaxInput}
                    onChange={(e) => setValueMaxInput(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleValueRangeApply}
                    className="flex-1"
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setValueMinInput('')
                      setValueMaxInput('')
                      onValueRangeChange({})
                      setShowValueRangeModal(false)
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Quantity Range Filter */}
        <div className="relative" ref={quantityRangeModalRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowQuantityRangeModal(!showQuantityRangeModal)
              if (!showQuantityRangeModal) {
                setShowProjectDropdown(false)
                setShowActivityDropdown(false)
                setShowTypeDropdown(false)
                setShowStatusDropdown(false)
                setShowZoneDropdown(false)
                setShowUnitDropdown(false)
                setShowDivisionDropdown(false)
                setShowDateRangeModal(false)
                setShowValueRangeModal(false)
              }
            }}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              quantityRange?.min !== undefined || quantityRange?.max !== undefined
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showQuantityRangeModal ? 'ring-2 ring-amber-500 ring-opacity-50' : ''}`}
          >
            <span>Quantity Range</span>
            {(quantityRange?.min !== undefined || quantityRange?.max !== undefined) && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold">
                ✓
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showQuantityRangeModal ? 'rotate-180' : ''}`} />
          </button>
          
          {showQuantityRangeModal && (
            <div 
              className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    value={quantityMinInput}
                    onChange={(e) => setQuantityMinInput(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Quantity</label>
                  <input
                    type="number"
                    value={quantityMaxInput}
                    onChange={(e) => setQuantityMaxInput(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleQuantityRangeApply}
                    className="flex-1"
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQuantityMinInput('')
                      setQuantityMaxInput('')
                      onQuantityRangeChange({})
                      setShowQuantityRangeModal(false)
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {selectedProjects.map(projectFullCode => {
            // ✅ FIX: Find project by full_code, not just code
            const project = projects.find(p => {
              const fullCode = getProjectFullCode(p)
              return fullCode === projectFullCode
            })
            const displayCode = project ? getProjectDisplayCode(project) : projectFullCode
            const displayName = project ? project.project_name : ''
            return (
              <div
                key={projectFullCode}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md text-xs"
              >
                <span className="font-medium">{displayCode}</span>
                {displayName && (
                  <span className="text-blue-600 dark:text-blue-400">- {displayName}</span>
                )}
                <button
                  onClick={() => toggleProject(projectFullCode)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
          {selectedActivities.map(activity => (
            <div
              key={activity}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-md text-xs"
            >
              <span className="font-medium">{activity}</span>
              <button
                onClick={() => toggleActivity(activity)}
                className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedTypes.map(type => (
            <div
              key={type}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md text-xs"
            >
              <span className="font-medium">{type}</span>
              <button
                onClick={() => toggleType(type)}
                className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedStatuses.map(status => {
            const statusInfo = PROJECT_STATUSES.find(s => s.value === status)
            return (
              <div
                key={status}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-md text-xs"
              >
                <span className="font-medium">{statusInfo?.label || status}</span>
                <button
                  onClick={() => toggleStatus(status)}
                  className="hover:bg-rose-200 dark:hover:bg-rose-800 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
          {(selectedZones || []).map(zone => (
            <div
              key={zone}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-md text-xs"
            >
              <span className="font-medium">Zone: {zone}</span>
              <button
                onClick={() => toggleZone(zone)}
                className="hover:bg-cyan-200 dark:hover:bg-cyan-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(selectedUnits || []).map(unit => (
            <div
              key={unit}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md text-xs"
            >
              <span className="font-medium">Unit: {unit}</span>
              <button
                onClick={() => toggleUnit(unit)}
                className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(selectedDivisions || []).map(division => (
            <div
              key={division}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-md text-xs"
            >
              <span className="font-medium">Division: {division}</span>
              <button
                onClick={() => toggleDivision(division)}
                className="hover:bg-teal-200 dark:hover:bg-teal-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(selectedActivityTimings || []).map(timing => {
            const formattedTiming = timing
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return (
              <div
                key={timing}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md text-xs"
              >
                <span className="font-medium">Activity Timing: {formattedTiming}</span>
                <button
                  onClick={() => toggleActivityTiming(timing)}
                  className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
          {(selectedScopes || []).map(scope => (
            <div
              key={scope}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md text-xs"
            >
              <span className="font-medium">Scope: {scope}</span>
              <button
                onClick={() => toggleScope(scope)}
                className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(dateRange?.from || dateRange?.to) && (
            <div className="inline-flex items-center space-x-1 px-2 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 rounded-md text-xs">
              <span className="font-medium">
                Date: {dateRange?.from || '...'} to {dateRange?.to || '...'}
              </span>
              <button
                onClick={() => {
                  setDateFromInput('')
                  setDateToInput('')
                  onDateRangeChange({})
                }}
                className="hover:bg-pink-200 dark:hover:bg-pink-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {(valueRange?.min !== undefined || valueRange?.max !== undefined) && (
            <div className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded-md text-xs">
              <span className="font-medium">
                Value: {valueRange?.min !== undefined ? valueRange.min.toLocaleString() : '...'} - {valueRange?.max !== undefined ? valueRange.max.toLocaleString() : '...'}
              </span>
              <button
                onClick={() => {
                  setValueMinInput('')
                  setValueMaxInput('')
                  onValueRangeChange({})
                }}
                className="hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {(quantityRange?.min !== undefined || quantityRange?.max !== undefined) && (
            <div className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md text-xs">
              <span className="font-medium">
                Quantity: {quantityRange?.min !== undefined ? quantityRange.min.toLocaleString() : '...'} - {quantityRange?.max !== undefined ? quantityRange.max.toLocaleString() : '...'}
              </span>
              <button
                onClick={() => {
                  setQuantityMinInput('')
                  setQuantityMaxInput('')
                  onQuantityRangeChange({})
                }}
                className="hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


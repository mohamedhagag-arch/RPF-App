'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from './Button'
import { X, Filter, ChevronDown, Search } from 'lucide-react'

interface SmartFilterProps {
  // Projects data
  projects: Array<{ 
    project_code: string
    project_sub_code?: string
    project_full_code?: string
    project_name: string 
  }>
  
  // Activities data (for dynamic filtering)
  activities?: Array<{ activity_name: string; project_code: string; zone?: string; unit?: string; activity_division?: string }>
  
  // KPIs data (for extracting unique values for filters)
  kpis?: Array<{ zone?: string; unit?: string; activity_division?: string; value?: number; quantity?: number }>
  
  // Current filters
  selectedProjects: string[]
  selectedActivities: string[]
  selectedTypes: string[]
  selectedZones?: string[]
  selectedUnits?: string[]
  selectedDivisions?: string[]
  dateRange?: { from?: string; to?: string }
  valueRange?: { min?: number; max?: number }
  quantityRange?: { min?: number; max?: number }
  
  // Callbacks
  onProjectsChange: (projects: string[]) => void
  onActivitiesChange: (activities: string[]) => void
  onTypesChange: (types: string[]) => void
  onZonesChange: (zones: string[]) => void
  onUnitsChange: (units: string[]) => void
  onDivisionsChange: (divisions: string[]) => void
  onDateRangeChange: (range: { from?: string; to?: string }) => void
  onValueRangeChange: (range: { min?: number; max?: number }) => void
  onQuantityRangeChange: (range: { min?: number; max?: number }) => void
  onClearAll: () => void
}

export function SmartFilter({
  projects,
  activities = [],
  kpis = [],
  selectedProjects,
  selectedActivities,
  selectedTypes,
  selectedZones,
  selectedUnits,
  selectedDivisions,
  dateRange,
  valueRange,
  quantityRange,
  onProjectsChange,
  onActivitiesChange,
  onTypesChange,
  onZonesChange,
  onUnitsChange,
  onDivisionsChange,
  onDateRangeChange,
  onValueRangeChange,
  onQuantityRangeChange,
  onClearAll
}: SmartFilterProps) {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  const [showValueRangeModal, setShowValueRangeModal] = useState(false)
  const [showQuantityRangeModal, setShowQuantityRangeModal] = useState(false)
  
  // 🔧 FIX: Add search states
  const [projectSearch, setProjectSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [zoneSearch, setZoneSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [divisionSearch, setDivisionSearch] = useState('')
  
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
  const zoneDropdownRef = useRef<HTMLDivElement>(null)
  const unitDropdownRef = useRef<HTMLDivElement>(null)
  const divisionDropdownRef = useRef<HTMLDivElement>(null)
  const dateRangeModalRef = useRef<HTMLDivElement>(null)
  const valueRangeModalRef = useRef<HTMLDivElement>(null)
  const quantityRangeModalRef = useRef<HTMLDivElement>(null)
  
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
      if (zoneDropdownRef.current && showZoneDropdown && !zoneDropdownRef.current.contains(target)) {
        setShowZoneDropdown(false)
      }
      if (unitDropdownRef.current && showUnitDropdown && !unitDropdownRef.current.contains(target)) {
        setShowUnitDropdown(false)
      }
      if (divisionDropdownRef.current && showDivisionDropdown && !divisionDropdownRef.current.contains(target)) {
        setShowDivisionDropdown(false)
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
  }, [showProjectDropdown, showActivityDropdown, showTypeDropdown, showZoneDropdown, showUnitDropdown, showDivisionDropdown, showDateRangeModal, showValueRangeModal, showQuantityRangeModal])
  
  // 🔧 FIX: Close dropdowns when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])
  
  // 🔧 FIX: Get filtered projects based on search (including sub_code and full_code)
  const filteredProjects = projects.filter(project => {
    const searchTerm = projectSearch.toLowerCase()
    const projectCode = project.project_code?.toLowerCase() || ''
    const projectSubCode = project.project_sub_code?.toLowerCase() || ''
    const projectFullCode = project.project_full_code?.toLowerCase() || ''
    const projectName = project.project_name?.toLowerCase() || ''
    
    return projectCode.includes(searchTerm) ||
           projectSubCode.includes(searchTerm) ||
           projectFullCode.includes(searchTerm) ||
           projectName.includes(searchTerm) ||
           `${projectCode} ${projectSubCode}`.includes(searchTerm)
  })
  
  // 🔧 FIX: Get unique activities for selected projects with search (only if projects selected)
  // ✅ FIX: Match activities using project_full_code instead of project_code
  const availableActivities = selectedProjects.length > 0 ? activities.filter(a => {
    // Check if activity's project_code matches any selected project_full_code
    // Since activities might only have project_code, we need to match it with selected projects
    // Selected projects now contain project_full_code, so we check if activity's project_code
    // is part of any selected project_full_code
    return selectedProjects.some(selectedFullCode => {
      // Extract project_code from project_full_code (format: "P5066-1" -> "P5066")
      const selectedCode = selectedFullCode.split('-')[0]
      return a.project_code === selectedCode || selectedFullCode === a.project_code
    })
  }).reduce((acc, curr) => {
    if (!acc.find(a => a.activity_name === curr.activity_name)) {
      acc.push(curr)
    }
    return acc
  }, [] as typeof activities).filter(activity =>
    activity.activity_name.toLowerCase().includes(activitySearch.toLowerCase())
  ) : []
  
  // Get unique zones from KPIs and activities (only for selected projects)
  const uniqueZones = selectedProjects.length > 0 ? Array.from(new Set([
    ...kpis.map(k => k.zone).filter(Boolean) as string[],
    ...activities.filter(a => selectedProjects.includes(a.project_code)).map(a => a.zone).filter(Boolean) as string[]
  ])).filter(zone => zone && zone.trim() !== '') : []
  
  // Get unique units from KPIs (only for selected projects)
  const uniqueUnits = selectedProjects.length > 0 ? Array.from(new Set(
    kpis.map(k => k.unit).filter(Boolean) as string[]
  )).filter(unit => unit && unit.trim() !== '') : []
  
  // Get unique divisions from KPIs and activities (only for selected projects)
  const uniqueDivisions = selectedProjects.length > 0 ? Array.from(new Set([
    ...kpis.map(k => k.activity_division).filter(Boolean) as string[],
    ...activities.filter(a => selectedProjects.includes(a.project_code)).map(a => a.activity_division).filter(Boolean) as string[]
  ])).filter(division => division && division.trim() !== '') : []
  
  const types = ['Planned', 'Actual']
  // Filter zones, units, and divisions by search
  const filteredZones = uniqueZones.filter(zone =>
    zone.toLowerCase().includes(zoneSearch.toLowerCase())
  )
  
  const filteredUnits = uniqueUnits.filter(unit =>
    unit.toLowerCase().includes(unitSearch.toLowerCase())
  )
  
  const filteredDivisions = uniqueDivisions.filter(division =>
    division.toLowerCase().includes(divisionSearch.toLowerCase())
  )
  
  const hasActiveFilters = (selectedProjects?.length || 0) > 0 || 
                           (selectedActivities?.length || 0) > 0 || 
                           (selectedTypes?.length || 0) > 0 || 
                           (selectedZones?.length || 0) > 0 ||
                           (selectedUnits?.length || 0) > 0 ||
                           (selectedDivisions?.length || 0) > 0 ||
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
  
  // Helper function to get project full code (fallback to project_code if not available)
  // ✅ FIX: Avoid duplication if project_sub_code already contains project_code
  const getProjectFullCode = (project: { project_full_code?: string; project_code: string; project_sub_code?: string }): string => {
    if (project.project_full_code) {
      return project.project_full_code
    }
    
    // Build full code from code + sub_code if available
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (projectSubCode) {
      // Check if sub_code already starts with project_code (case-insensitive)
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        // project_sub_code already contains project_code (e.g., "P5066-R1")
        return projectSubCode
      } else {
        // project_sub_code is just the suffix (e.g., "R1" or "-R1")
        if (projectSubCode.startsWith('-')) {
          return `${projectCode}${projectSubCode}`
        } else {
          return `${projectCode}-${projectSubCode}`
        }
      }
    }
    return projectCode
  }
  
  // Helper function to get display code (shows code + sub_code if available)
  // ✅ FIX: Avoid duplication if project_sub_code already contains project_code
  const getProjectDisplayCode = (project: { project_code: string; project_sub_code?: string; project_full_code?: string }): string => {
    // If project_full_code is provided, use it (it's already correctly formatted)
    if (project.project_full_code) {
      return project.project_full_code
    }
    
    // Otherwise, build it from code and sub_code
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    if (projectSubCode) {
      // Check if sub_code already starts with project_code (case-insensitive)
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        // project_sub_code already contains project_code (e.g., "P5066-R1")
        return projectSubCode
      } else {
        // project_sub_code is just the suffix (e.g., "R1" or "-R1")
        if (projectSubCode.startsWith('-')) {
          return `${projectCode}${projectSubCode}`
        } else {
          return `${projectCode}-${projectSubCode}`
        }
      }
    }
    return projectCode
  }
  
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
  
  const toggleDivision = (division: string) => {
    const divisions = selectedDivisions || []
    if (divisions.includes(division)) {
      onDivisionsChange(divisions.filter(d => d !== division))
    } else {
      onDivisionsChange([...divisions, division])
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
      
      {/* Filter Buttons */}
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
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180' : ''}`} />
          </button>
          
            {showProjectDropdown && (
            <div 
              className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
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
                  filteredProjects.map((project, idx) => {
                    const projectFullCode = getProjectFullCode(project)
                    const displayCode = getProjectDisplayCode(project)
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
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No projects found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Activities Filter - Only show if projects selected */}
        {selectedProjects.length > 0 && (
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
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showActivityDropdown ? 'rotate-180' : ''}`} />
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
        )}
        
        {/* Type Filter - Only show if projects selected */}
        {selectedProjects.length > 0 && (
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
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTypeDropdown ? 'rotate-180' : ''}`} />
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
        )}
        
        {/* Zone Filter - Only show if projects selected and zones available */}
        {selectedProjects.length > 0 && uniqueZones.length > 0 && (
          <div className="relative" ref={zoneDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowZoneDropdown(!showZoneDropdown)
                if (!showZoneDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
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
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showZoneDropdown ? 'rotate-180' : ''}`} />
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
        
        {/* Unit Filter - Only show if projects selected and units available */}
        {selectedProjects.length > 0 && uniqueUnits.length > 0 && (
          <div className="relative" ref={unitDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowUnitDropdown(!showUnitDropdown)
                if (!showUnitDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
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
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUnitDropdown ? 'rotate-180' : ''}`} />
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
        
        {/* Division Filter - Only show if projects selected and divisions available */}
        {selectedProjects.length > 0 && uniqueDivisions.length > 0 && (
          <div className="relative" ref={divisionDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDivisionDropdown(!showDivisionDropdown)
                if (!showDivisionDropdown) {
                  setShowProjectDropdown(false)
                  setShowActivityDropdown(false)
                  setShowTypeDropdown(false)
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
              <span>Division</span>
              {(selectedDivisions?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-teal-500 text-white rounded-full text-xs font-bold">
                  {selectedDivisions?.length || 0}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDivisionDropdown ? 'rotate-180' : ''}`} />
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
                      placeholder="Search divisions..."
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
                      No divisions found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Date Range Filter - Only show if projects selected */}
        {selectedProjects.length > 0 && (
        <div className="relative" ref={dateRangeModalRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDateRangeModal(!showDateRangeModal)
              if (!showDateRangeModal) {
                setShowProjectDropdown(false)
                setShowActivityDropdown(false)
                setShowTypeDropdown(false)
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
        )}
        
        {/* Value Range Filter - Only show if projects selected */}
        {selectedProjects.length > 0 && (
        <div className="relative" ref={valueRangeModalRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowValueRangeModal(!showValueRangeModal)
              if (!showValueRangeModal) {
                setShowProjectDropdown(false)
                setShowActivityDropdown(false)
                setShowTypeDropdown(false)
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
        )}
        
        {/* Quantity Range Filter - Only show if projects selected */}
        {selectedProjects.length > 0 && (
        <div className="relative" ref={quantityRangeModalRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowQuantityRangeModal(!showQuantityRangeModal)
              if (!showQuantityRangeModal) {
                setShowProjectDropdown(false)
                setShowActivityDropdown(false)
                setShowTypeDropdown(false)
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
        )}
      </div>
      
      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {selectedProjects.map(projectCode => {
            const project = projects.find(p => p.project_code === projectCode)
            return (
              <div
                key={projectCode}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md text-xs"
              >
                <span className="font-medium">{projectCode}</span>
                <button
                  onClick={() => toggleProject(projectCode)}
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


'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Filter, ChevronDown, Search, Calendar, DollarSign, Package } from 'lucide-react'
import { Input } from '@/components/ui/Input'

interface BOQFilterProps {
  // Projects data
  projects: Array<{ 
    project_code: string
    project_sub_code?: string
    project_full_code?: string
    project_name: string 
  }>
  
  // Activities data
  activities: Array<{ 
    activity_name: string
    project_full_code?: string
    zone?: string
    unit?: string
    activity_division?: string 
  }>
  
  // Current filters
  selectedProjects: string[]
  selectedActivities: string[]
  selectedZones: string[]
  selectedUnits: string[]
  selectedDivisions: string[]
  dateRange?: { from?: string; to?: string }
  valueRange?: { min?: number; max?: number }
  quantityRange?: { min?: number; max?: number }
  searchTerm: string
  
  // Callbacks
  onProjectsChange: (projects: string[]) => void
  onActivitiesChange: (activities: string[]) => void
  onZonesChange: (zones: string[]) => void
  onUnitsChange: (units: string[]) => void
  onDivisionsChange: (divisions: string[]) => void
  onDateRangeChange: (range: { from?: string; to?: string }) => void
  onValueRangeChange: (range: { min?: number; max?: number }) => void
  onQuantityRangeChange: (range: { min?: number; max?: number }) => void
  onSearchChange: (search: string) => void
  onClearAll: () => void
}

export function BOQFilter({
  projects,
  activities = [],
  selectedProjects,
  selectedActivities,
  selectedZones,
  selectedUnits,
  selectedDivisions,
  dateRange,
  valueRange,
  quantityRange,
  searchTerm,
  onProjectsChange,
  onActivitiesChange,
  onZonesChange,
  onUnitsChange,
  onDivisionsChange,
  onDateRangeChange,
  onValueRangeChange,
  onQuantityRangeChange,
  onSearchChange,
  onClearAll
}: BOQFilterProps) {
  // Dropdown states
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [showZoneDropdown, setShowZoneDropdown] = useState(false)
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false)
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  const [showValueRangeModal, setShowValueRangeModal] = useState(false)
  const [showQuantityRangeModal, setShowQuantityRangeModal] = useState(false)
  
  // Search states
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
  
  // Refs for click outside
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const activityDropdownRef = useRef<HTMLDivElement>(null)
  const zoneDropdownRef = useRef<HTMLDivElement>(null)
  const unitDropdownRef = useRef<HTMLDivElement>(null)
  const divisionDropdownRef = useRef<HTMLDivElement>(null)
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(event.target as Node)) {
        setShowActivityDropdown(false)
      }
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setShowZoneDropdown(false)
      }
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
        setShowUnitDropdown(false)
      }
      if (divisionDropdownRef.current && !divisionDropdownRef.current.contains(event.target as Node)) {
        setShowDivisionDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Build project_full_code helper
  const getProjectFullCode = (project: { project_full_code?: string; project_code: string; project_sub_code?: string }): string => {
    const projectFullCode = (project.project_full_code || '').toString().trim()
    if (projectFullCode) {
      // ✅ DEBUG: Log when using project_full_code from database
      if (project.project_code?.includes('P9999') || project.project_code?.includes('9999')) {
        console.log('🔍 BOQFilter getProjectFullCode - Using from DB:', {
          projectCode: project.project_code,
          projectSubCode: project.project_sub_code,
          projectFullCodeFromDB: projectFullCode
        })
      }
      return projectFullCode
    }
    
    const projectCode = (project.project_code || '').trim()
    const projectSubCode = (project.project_sub_code || '').trim()
    
    let builtFullCode = projectCode
    if (projectSubCode) {
      if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
        builtFullCode = projectSubCode.trim()
      } else {
        if (projectSubCode.startsWith('-')) {
          builtFullCode = `${projectCode}${projectSubCode}`.trim()
        } else {
          builtFullCode = `${projectCode}-${projectSubCode}`.trim()
        }
      }
    }
    
    // ✅ DEBUG: Log when building project_full_code
    if (projectCode.includes('P9999') || projectCode.includes('9999')) {
      console.log('🔧 BOQFilter getProjectFullCode - Building:', {
        projectCode,
        projectSubCode,
        builtFullCode
      })
    }
    
    return builtFullCode
  }
  
  // Filter projects by search
  const filteredProjects = projects.filter(project => {
    const searchTerm = projectSearch.toLowerCase().trim()
    if (!searchTerm) return true
    
    const projectCode = (project.project_code || '').toLowerCase().trim()
    const projectSubCode = (project.project_sub_code || '').toLowerCase().trim()
    const projectFullCode = (project.project_full_code || '').toLowerCase().trim()
    const projectName = (project.project_name || '').toLowerCase().trim()
    
    return projectCode.includes(searchTerm) ||
           projectSubCode.includes(searchTerm) ||
           projectFullCode.includes(searchTerm) ||
           projectName.includes(searchTerm)
  })
  
  // Filter activities by selected projects and search, then remove duplicates
  const availableActivities = selectedProjects.length > 0 ? (() => {
    // First filter by selected projects
    const filteredByProject = activities.filter(a => {
      const activityFullCode = ((a as any).project_full_code || '').toString().trim()
      return selectedProjects.some(selectedFullCode => 
        activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
      )
    })
    
    // Remove duplicates by activity_name (keep unique activities)
    const uniqueActivities = Array.from(
      new Map(
        filteredByProject.map(activity => [activity.activity_name, activity])
      ).values()
    )
    
    // Then filter by search term
    return uniqueActivities.filter(activity =>
      !activitySearch || activity.activity_name.toLowerCase().includes(activitySearch.toLowerCase())
    )
  })() : []
  
  // Get unique zones, units, divisions from filtered activities
  const uniqueZones = Array.from(new Set(
    activities
      .filter(a => {
        const activityFullCode = ((a as any).project_full_code || '').toString().trim()
        return selectedProjects.length === 0 || selectedProjects.some(selectedFullCode => 
          activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
        )
      })
      .map(a => a.zone)
      .filter(Boolean) as string[]
  )).filter(zone => zone && zone.trim() !== '')
  
  const uniqueUnits = Array.from(new Set(
    activities
      .filter(a => {
        const activityFullCode = ((a as any).project_full_code || '').toString().trim()
        return selectedProjects.length === 0 || selectedProjects.some(selectedFullCode => 
          activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
        )
      })
      .map(a => a.unit)
      .filter(Boolean) as string[]
  )).filter(unit => unit && unit.trim() !== '')
  
  const uniqueDivisions = Array.from(new Set(
    activities
      .filter(a => {
        const activityFullCode = ((a as any).project_full_code || '').toString().trim()
        return selectedProjects.length === 0 || selectedProjects.some(selectedFullCode => 
          activityFullCode.toUpperCase() === selectedFullCode.toUpperCase()
        )
      })
      .map(a => a.activity_division)
      .filter(Boolean) as string[]
  )).filter(division => division && division.trim() !== '')
  
  const filteredZones = uniqueZones.filter(zone =>
    zone.toLowerCase().includes(zoneSearch.toLowerCase())
  )
  
  const filteredUnits = uniqueUnits.filter(unit =>
    unit.toLowerCase().includes(unitSearch.toLowerCase())
  )
  
  const filteredDivisions = uniqueDivisions.filter(division =>
    division.toLowerCase().includes(divisionSearch.toLowerCase())
  )
  
  // Toggle functions
  const toggleProject = (projectFullCode: string) => {
    // ✅ DEBUG: Log project selection
    console.log('🔍 BOQFilter toggleProject:', {
      projectFullCode,
      currentlySelected: selectedProjects,
      willBeSelected: selectedProjects.includes(projectFullCode) 
        ? selectedProjects.filter(p => p !== projectFullCode)
        : [...selectedProjects, projectFullCode]
    })
    
    if (selectedProjects.includes(projectFullCode)) {
      onProjectsChange(selectedProjects.filter(p => p !== projectFullCode))
    } else {
      onProjectsChange([...selectedProjects, projectFullCode])
    }
  }
  
  const toggleActivity = (activityName: string) => {
    if (selectedActivities.includes(activityName)) {
      onActivitiesChange(selectedActivities.filter(a => a !== activityName))
    } else {
      onActivitiesChange([...selectedActivities, activityName])
    }
  }
  
  const toggleZone = (zone: string) => {
    if (selectedZones.includes(zone)) {
      onZonesChange(selectedZones.filter(z => z !== zone))
    } else {
      onZonesChange([...selectedZones, zone])
    }
  }
  
  const toggleUnit = (unit: string) => {
    if (selectedUnits.includes(unit)) {
      onUnitsChange(selectedUnits.filter(u => u !== unit))
    } else {
      onUnitsChange([...selectedUnits, unit])
    }
  }
  
  const toggleDivision = (division: string) => {
    if (selectedDivisions.includes(division)) {
      onDivisionsChange(selectedDivisions.filter(d => d !== division))
    } else {
      onDivisionsChange([...selectedDivisions, division])
    }
  }
  
  // Apply range filters
  const applyDateRange = () => {
    onDateRangeChange({
      from: dateFromInput || undefined,
      to: dateToInput || undefined
    })
    setShowDateRangeModal(false)
  }
  
  const applyValueRange = () => {
    onValueRangeChange({
      min: valueMinInput ? parseFloat(valueMinInput) : undefined,
      max: valueMaxInput ? parseFloat(valueMaxInput) : undefined
    })
    setShowValueRangeModal(false)
  }
  
  const applyQuantityRange = () => {
    onQuantityRangeChange({
      min: quantityMinInput ? parseFloat(quantityMinInput) : undefined,
      max: quantityMaxInput ? parseFloat(quantityMaxInput) : undefined
    })
    setShowQuantityRangeModal(false)
  }
  
  const hasActiveFilters = selectedProjects.length > 0 ||
                           selectedActivities.length > 0 ||
                           selectedZones.length > 0 ||
                           selectedUnits.length > 0 ||
                           selectedDivisions.length > 0 ||
                           dateRange?.from || dateRange?.to ||
                           valueRange?.min !== undefined || valueRange?.max !== undefined ||
                           quantityRange?.min !== undefined || quantityRange?.max !== undefined ||
                           searchTerm.trim() !== ''
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">BOQ Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Projects Filter */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
              selectedProjects.length > 0
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span>Projects</span>
            {selectedProjects.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold">
                {selectedProjects.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showProjectDropdown && (
            <div className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project, idx) => {
                    const projectFullCode = getProjectFullCode(project)
                    return (
                      <label
                        key={`project-${projectFullCode}-${idx}`}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(projectFullCode)}
                          onChange={() => toggleProject(projectFullCode)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {projectFullCode}
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
        
        {/* Activities Filter */}
        <div className="relative" ref={activityDropdownRef}>
          <button
            onClick={() => setShowActivityDropdown(!showActivityDropdown)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
              selectedActivities.length > 0
                ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span>Activities</span>
            {selectedActivities.length > 0 && (
              <span className="px-1.5 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                {selectedActivities.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showActivityDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showActivityDropdown && (
            <div className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search activities..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {availableActivities.length > 0 ? (
                  availableActivities.map((activity, idx) => (
                    <label
                      key={`activity-${activity.activity_name}-${idx}`}
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedActivities.includes(activity.activity_name)}
                        onChange={() => toggleActivity(activity.activity_name)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {activity.activity_name}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    {selectedProjects.length === 0 ? 'Select projects first' : 'No activities found'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Zones Filter */}
        <div className="relative" ref={zoneDropdownRef}>
          <button
            onClick={() => setShowZoneDropdown(!showZoneDropdown)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
              selectedZones.length > 0
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span>Zones</span>
            {selectedZones.length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                {selectedZones.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showZoneDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showZoneDropdown && (
            <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search zones..."
                    value={zoneSearch}
                    onChange={(e) => setZoneSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredZones.length > 0 ? (
                  filteredZones.map((zone, idx) => (
                    <label
                      key={`zone-${zone}-${idx}`}
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedZones.includes(zone)}
                        onChange={() => toggleZone(zone)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{zone}</span>
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
        
        {/* Units Filter */}
        <div className="relative" ref={unitDropdownRef}>
          <button
            onClick={() => setShowUnitDropdown(!showUnitDropdown)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
              selectedUnits.length > 0
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span>Units</span>
            {selectedUnits.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                {selectedUnits.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showUnitDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showUnitDropdown && (
            <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search units..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredUnits.length > 0 ? (
                  filteredUnits.map((unit, idx) => (
                    <label
                      key={`unit-${unit}-${idx}`}
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUnits.includes(unit)}
                        onChange={() => toggleUnit(unit)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{unit}</span>
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
        
        {/* Divisions Filter */}
        <div className="relative" ref={divisionDropdownRef}>
          <button
            onClick={() => setShowDivisionDropdown(!showDivisionDropdown)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
              selectedDivisions.length > 0
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span>Divisions</span>
            {selectedDivisions.length > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-xs font-bold">
                {selectedDivisions.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDivisionDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showDivisionDropdown && (
            <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search divisions..."
                    value={divisionSearch}
                    onChange={(e) => setDivisionSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredDivisions.length > 0 ? (
                  filteredDivisions.map((division, idx) => (
                    <label
                      key={`division-${division}-${idx}`}
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDivisions.includes(division)}
                        onChange={() => toggleDivision(division)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{division}</span>
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
        
        {/* Date Range Filter */}
        <button
          onClick={() => setShowDateRangeModal(!showDateRangeModal)}
          className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
            dateRange?.from || dateRange?.to
              ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Date Range</span>
          {(dateRange?.from || dateRange?.to) && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-white rounded-full text-xs font-bold">
              ✓
            </span>
          )}
        </button>
        
        {/* Value Range Filter */}
        <button
          onClick={() => setShowValueRangeModal(!showValueRangeModal)}
          className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
            valueRange?.min !== undefined || valueRange?.max !== undefined
              ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Value Range</span>
          {(valueRange?.min !== undefined || valueRange?.max !== undefined) && (
            <span className="px-1.5 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
              ✓
            </span>
          )}
        </button>
        
        {/* Quantity Range Filter */}
        <button
          onClick={() => setShowQuantityRangeModal(!showQuantityRangeModal)}
          className={`px-3 py-2 text-sm border rounded-lg flex items-center space-x-2 transition-all ${
            quantityRange?.min !== undefined || quantityRange?.max !== undefined
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Quantity Range</span>
          {(quantityRange?.min !== undefined || quantityRange?.max !== undefined) && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold">
              ✓
            </span>
          )}
        </button>
      </div>
      
      {/* Date Range Modal */}
      {showDateRangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDateRangeModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Date Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">From</label>
                <Input
                  type="date"
                  value={dateFromInput}
                  onChange={(e) => setDateFromInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <Input
                  type="date"
                  value={dateToInput}
                  onChange={(e) => setDateToInput(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={applyDateRange} className="flex-1">Apply</Button>
              <Button variant="outline" onClick={() => setShowDateRangeModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Value Range Modal */}
      {showValueRangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowValueRangeModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Value Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Value</label>
                <Input
                  type="number"
                  value={valueMinInput}
                  onChange={(e) => setValueMinInput(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Value</label>
                <Input
                  type="number"
                  value={valueMaxInput}
                  onChange={(e) => setValueMaxInput(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={applyValueRange} className="flex-1">Apply</Button>
              <Button variant="outline" onClick={() => setShowValueRangeModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Quantity Range Modal */}
      {showQuantityRangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowQuantityRangeModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Quantity Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Quantity</label>
                <Input
                  type="number"
                  value={quantityMinInput}
                  onChange={(e) => setQuantityMinInput(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Quantity</label>
                <Input
                  type="number"
                  value={quantityMaxInput}
                  onChange={(e) => setQuantityMaxInput(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={applyQuantityRange} className="flex-1">Apply</Button>
              <Button variant="outline" onClick={() => setShowQuantityRangeModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



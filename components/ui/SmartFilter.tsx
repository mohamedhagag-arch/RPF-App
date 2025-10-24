'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from './Button'
import { X, Filter, ChevronDown, Search } from 'lucide-react'

interface SmartFilterProps {
  // Projects data
  projects: Array<{ project_code: string; project_name: string }>
  
  // Activities data (for dynamic filtering)
  activities?: Array<{ activity_name: string; project_code: string }>
  
  // Current filters
  selectedProjects: string[]
  selectedActivities: string[]
  selectedTypes: string[]
  selectedStatuses: string[]
  
  // Callbacks
  onProjectsChange: (projects: string[]) => void
  onActivitiesChange: (activities: string[]) => void
  onTypesChange: (types: string[]) => void
  onStatusesChange: (statuses: string[]) => void
  onClearAll: () => void
}

export function SmartFilter({
  projects,
  activities = [],
  selectedProjects,
  selectedActivities,
  selectedTypes,
  selectedStatuses,
  onProjectsChange,
  onActivitiesChange,
  onTypesChange,
  onStatusesChange,
  onClearAll
}: SmartFilterProps) {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  
  // 🔧 FIX: Add search states
  const [projectSearch, setProjectSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  
  // 🔧 FIX: Add refs for click outside detection
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const activityDropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  
  // 🔧 FIX: Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(event.target as Node)) {
        setShowActivityDropdown(false)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // 🔧 FIX: Close dropdowns when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProjectDropdown(false)
        setShowActivityDropdown(false)
        setShowTypeDropdown(false)
        setShowStatusDropdown(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])
  
  // 🔧 FIX: Get filtered projects based on search
  const filteredProjects = projects.filter(project =>
    project.project_code.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.project_name.toLowerCase().includes(projectSearch.toLowerCase())
  )
  
  // 🔧 FIX: Get unique activities for selected projects with search
  const availableActivities = activities.filter(a => 
    selectedProjects.length === 0 || selectedProjects.includes(a.project_code)
  ).reduce((acc, curr) => {
    if (!acc.find(a => a.activity_name === curr.activity_name)) {
      acc.push(curr)
    }
    return acc
  }, [] as typeof activities).filter(activity =>
    activity.activity_name.toLowerCase().includes(activitySearch.toLowerCase())
  )
  
  const types = ['Planned', 'Actual']
  const statuses = ['Active', 'Completed', 'Delayed', 'Not Started']
  
  const hasActiveFilters = selectedProjects.length > 0 || 
                           selectedActivities.length > 0 || 
                           selectedTypes.length > 0 || 
                           selectedStatuses.length > 0
  
  const toggleProject = (projectCode: string) => {
    if (selectedProjects.includes(projectCode)) {
      onProjectsChange(selectedProjects.filter(p => p !== projectCode))
    } else {
      onProjectsChange([...selectedProjects, projectCode])
    }
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
  
  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter(s => s !== status))
    } else {
      onStatusesChange([...selectedStatuses, status])
    }
  }
  
  // 🔧 FIX: Add functions to close all dropdowns
  const closeAllDropdowns = () => {
    setShowProjectDropdown(false)
    setShowActivityDropdown(false)
    setShowTypeDropdown(false)
    setShowStatusDropdown(false)
  }
  
  // 🔧 FIX: Add functions to handle dropdown toggle with better UX
  const toggleProjectDropdown = () => {
    setShowProjectDropdown(!showProjectDropdown)
    // Close other dropdowns when opening this one
    if (!showProjectDropdown) {
      setShowActivityDropdown(false)
      setShowTypeDropdown(false)
      setShowStatusDropdown(false)
    }
  }
  
  const toggleActivityDropdown = () => {
    setShowActivityDropdown(!showActivityDropdown)
    // Close other dropdowns when opening this one
    if (!showActivityDropdown) {
      setShowProjectDropdown(false)
      setShowTypeDropdown(false)
      setShowStatusDropdown(false)
    }
  }
  
  const toggleTypeDropdown = () => {
    setShowTypeDropdown(!showTypeDropdown)
    // Close other dropdowns when opening this one
    if (!showTypeDropdown) {
      setShowProjectDropdown(false)
      setShowActivityDropdown(false)
      setShowStatusDropdown(false)
    }
  }
  
  const toggleStatusDropdown = () => {
    setShowStatusDropdown(!showStatusDropdown)
    // Close other dropdowns when opening this one
    if (!showStatusDropdown) {
      setShowProjectDropdown(false)
      setShowActivityDropdown(false)
      setShowTypeDropdown(false)
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
            onClick={toggleProjectDropdown}
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
            <div className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
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
                  filteredProjects.map((project, idx) => (
                    <label
                      key={`project-${project.project_code}-${idx}`}
                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.project_code)}
                        onChange={() => toggleProject(project.project_code)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {project.project_code}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {project.project_name}
                        </div>
                      </div>
                    </label>
                  ))
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
              onClick={toggleActivityDropdown}
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
              <div className="absolute z-50 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
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
        
        {/* Type Filter */}
        <div className="relative" ref={typeDropdownRef}>
          <button
            onClick={toggleTypeDropdown}
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
            <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
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
            onClick={toggleStatusDropdown}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              selectedStatuses.length > 0
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            } ${showStatusDropdown ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`}
          >
            <span>Status</span>
            {selectedStatuses.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                {selectedStatuses.length}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showStatusDropdown && (
            <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
              <div className="p-2">
                {statuses.map(status => (
                  <label
                    key={status}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
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
          {selectedStatuses.map(status => (
            <div
              key={status}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-md text-xs"
            >
              <span className="font-medium">{status}</span>
              <button
                onClick={() => toggleStatus(status)}
                className="hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


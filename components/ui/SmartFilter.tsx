'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'
import { X, Filter, ChevronDown } from 'lucide-react'

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
  
  // Get unique activities for selected projects
  const availableActivities = activities.filter(a => 
    selectedProjects.length === 0 || selectedProjects.includes(a.project_code)
  ).reduce((acc, curr) => {
    if (!acc.find(a => a.activity_name === curr.activity_name)) {
      acc.push(curr)
    }
    return acc
  }, [] as typeof activities)
  
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
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-colors ${
              selectedProjects.length > 0
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>Projects</span>
            {selectedProjects.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold">
                {selectedProjects.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showProjectDropdown && (
            <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="p-1">
                {projects.map((project, idx) => (
                  <label
                    key={`project-${project.project_code}-${idx}`}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
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
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Activities Filter - Only show if projects selected */}
        {selectedProjects.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowActivityDropdown(!showActivityDropdown)}
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-colors ${
                selectedActivities.length > 0
                  ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span>Activities</span>
              {selectedActivities.length > 0 && (
                <span className="px-1.5 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                  {selectedActivities.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showActivityDropdown && (
              <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Search activities..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="p-1">
                  {availableActivities.length > 0 ? (
                    availableActivities.map((activity, idx) => (
                      <label
                        key={`${activity.activity_name}-${idx}`}
                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedActivities.includes(activity.activity_name)}
                          onChange={() => toggleActivity(activity.activity_name)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {activity.activity_name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No activities found for selected projects
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Type Filter */}
        <div className="relative">
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-colors ${
              selectedTypes.length > 0
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>Type</span>
            {selectedTypes.length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                {selectedTypes.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showTypeDropdown && (
            <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <div className="p-1">
                {types.map(type => (
                  <label
                    key={type}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
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
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={`px-3 py-1.5 text-sm border rounded-lg flex items-center space-x-2 transition-colors ${
              selectedStatuses.length > 0
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>Status</span>
            {selectedStatuses.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                {selectedStatuses.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showStatusDropdown && (
            <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <div className="p-1">
                {statuses.map(status => (
                  <label
                    key={status}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
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


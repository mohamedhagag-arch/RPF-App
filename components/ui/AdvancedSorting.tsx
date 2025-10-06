'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter,
  X,
  ChevronDown,
  Search,
  Building,
  Calendar,
  DollarSign,
  Percent,
  Hash,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

export interface SortOption {
  key: string
  label: string
  icon?: any
  type: 'string' | 'number' | 'date' | 'boolean'
  direction?: 'asc' | 'desc'
}

export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'text' | 'date' | 'number' | 'boolean'
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface AdvancedSortingProps {
  sortOptions: SortOption[]
  filterOptions: FilterOption[]
  onSortChange: (sortKey: string, direction: 'asc' | 'desc') => void
  onFilterChange: (filters: Record<string, any>) => void
  onProjectCodeFilter: (projectCode: string) => void
  projects: Array<{ project_code: string; project_name: string }>
  currentSort?: { key: string; direction: 'asc' | 'desc' }
  currentFilters?: Record<string, any>
  currentProjectCode?: string
}

export function AdvancedSorting({
  sortOptions,
  filterOptions,
  onSortChange,
  onFilterChange,
  onProjectCodeFilter,
  projects,
  currentSort,
  currentFilters = {},
  currentProjectCode = ''
}: AdvancedSortingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(currentFilters)
  const [localProjectCode, setLocalProjectCode] = useState(currentProjectCode)
  const [searchTerm, setSearchTerm] = useState('')

  const getSortIcon = (option: SortOption) => {
    if (currentSort?.key === option.key) {
      return currentSort.direction === 'asc' ? ArrowUp : ArrowDown
    }
    return ArrowUpDown
  }

  const getSortLabel = (option: SortOption) => {
    if (currentSort?.key === option.key) {
      return `${option.label} (${currentSort.direction === 'asc' ? 'Asc' : 'Desc'})`
    }
    return option.label
  }

  const handleSort = (option: SortOption) => {
    const newDirection = currentSort?.key === option.key && currentSort.direction === 'asc' ? 'desc' : 'asc'
    onSortChange(option.key, newDirection)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFilterChange(localFilters)
    onProjectCodeFilter(localProjectCode)
    setIsOpen(false)
  }

  const clearFilters = () => {
    setLocalFilters({})
    setLocalProjectCode('')
    onFilterChange({})
    onProjectCodeFilter('')
    setIsOpen(false)
  }

  const filteredProjects = projects.filter(project =>
    (project.project_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getFilterIcon = (type: string) => {
    switch (type) {
      case 'select': return CheckCircle
      case 'text': return Search
      case 'date': return Calendar
      case 'number': return Hash
      case 'boolean': return CheckCircle
      default: return Filter
    }
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Advanced Sort & Filter
        <ChevronDown className="h-4 w-4" />
        {(currentSort || Object.keys(currentFilters).length > 0 || currentProjectCode) && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"></div>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Sort & Filter</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Project Code Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Filter by Project Code
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search project code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {searchTerm && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
                    {filteredProjects.slice(0, 10).map((project) => (
                      <button
                        key={project.project_code}
                        onClick={() => setLocalProjectCode(project.project_code)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          localProjectCode === project.project_code ? 'bg-blue-100 dark:bg-blue-900' : ''
                        }`}
                      >
                        <div className="font-medium">{project.project_code}</div>
                        <div className="text-sm text-gray-500">{project.project_name}</div>
                      </button>
                    ))}
                  </div>
                )}
                {localProjectCode && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <span className="text-sm font-medium">{localProjectCode}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocalProjectCode('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Sorting Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Data</label>
                <div className="grid grid-cols-2 gap-2">
                  {sortOptions.map((option) => {
                    const Icon = option.icon || getSortIcon(option)
                    return (
                      <Button
                        key={option.key}
                        variant={currentSort?.key === option.key ? "primary" : "outline"}
                        size="sm"
                        onClick={() => handleSort(option)}
                        className="flex items-center gap-2 justify-start"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{getSortLabel(option)}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Filter Options */}
              {filterOptions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter Data</label>
                  <div className="space-y-3">
                    {filterOptions.map((filter) => {
                      const FilterIcon = getFilterIcon(filter.type)
                      return (
                        <div key={filter.key} className="space-y-1">
                          <label className="text-xs font-medium flex items-center gap-1">
                            <FilterIcon className="h-3 w-3" />
                            {filter.label}
                          </label>
                          {filter.type === 'select' && filter.options ? (
                            <select
                              value={localFilters[filter.key] || ''}
                              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">All Values</option>
                              {filter.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : filter.type === 'text' ? (
                            <input
                              type="text"
                              placeholder={filter.placeholder || `Search in ${filter.label}`}
                              value={localFilters[filter.key] || ''}
                              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          ) : filter.type === 'number' ? (
                            <input
                              type="number"
                              placeholder={filter.placeholder || `${filter.label} value`}
                              value={localFilters[filter.key] || ''}
                              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          ) : filter.type === 'boolean' ? (
                            <select
                              value={localFilters[filter.key] || ''}
                              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">All Values</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={applyFilters} className="flex-1">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

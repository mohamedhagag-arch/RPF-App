'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Filter, X, Search, SlidersHorizontal } from 'lucide-react'

interface UnifiedFilterProps {
  onFilterChange: (filters: FilterState) => void
  projects?: Array<{ project_code: string; project_name: string }>
  showProjectFilter?: boolean
  showStatusFilter?: boolean
  showDateFilter?: boolean
  showSearchFilter?: boolean
  customFilters?: Array<{
    key: string
    label: string
    type: 'text' | 'select' | 'number' | 'date'
    options?: Array<{ value: string; label: string }>
  }>
}

export interface FilterState {
  search?: string
  project?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: any
}

export function UnifiedFilter({
  onFilterChange,
  projects = [],
  showProjectFilter = true,
  showStatusFilter = true,
  showDateFilter = false,
  showSearchFilter = true,
  customFilters = []
}: UnifiedFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Count active filters
    const count = Object.values(newFilters).filter(v => v && v !== '').length
    setActiveFiltersCount(count)
    
    onFilterChange(newFilters)
  }

  const clearAllFilters = () => {
    setFilters({})
    setActiveFiltersCount(0)
    onFilterChange({})
  }

  const hasActiveFilters = activeFiltersCount > 0

  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null)

  return (
    <div className="relative">
      {/* Main Filter Button */}
      <Button
        ref={setButtonRef}
        variant={hasActiveFilters ? 'primary' : 'outline'}
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        Filters
        {hasActiveFilters && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-white text-blue-600 rounded-full font-semibold">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Filter Content - Fixed positioning */}
          <div 
            className="fixed w-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 max-h-[calc(100vh-100px)] flex flex-col"
            style={{
              top: buttonRef ? `${buttonRef.getBoundingClientRect().bottom + 8}px` : '100px',
              right: '24px'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Filters & Search
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Options - Scrollable */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Search Filter */}
              {showSearchFilter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by name, code..."
                      value={filters.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Project Filter */}
              {showProjectFilter && projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project
                  </label>
                  <select
                    value={filters.project || ''}
                    onChange={(e) => handleFilterChange('project', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project, index) => (
                      <option 
                        key={`${project.project_code}-${index}`}
                        value={project.project_code}
                      >
                        {project.project_code} - {project.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              {showStatusFilter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="on_track">On Track</option>
                    <option value="delayed">Delayed</option>
                    <option value="at_risk">At Risk</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
              )}

              {/* Date Range Filter */}
              {showDateFilter && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        placeholder="From"
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Filters */}
              {customFilters.map((filter) => (
                <div key={filter.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {filter.label}
                  </label>
                  {filter.type === 'select' && filter.options ? (
                    <select
                      value={filters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : filter.type === 'number' ? (
                    <Input
                      type="number"
                      value={filters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      placeholder={filter.label}
                    />
                  ) : filter.type === 'date' ? (
                    <Input
                      type="date"
                      value={filters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={filters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      placeholder={filter.label}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Clear All
              </button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="primary"
                size="sm"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

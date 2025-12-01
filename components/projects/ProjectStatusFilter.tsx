'use client'

import { useState } from 'react'
import { getProjectStatusFilterOptions } from '@/lib/projectStatusManager'
import { ModernButton } from '@/components/ui/ModernButton'
import { ProjectStatusBadge } from '@/components/ui/ProjectStatusBadge'
import { Filter, X } from 'lucide-react'

interface ProjectStatusFilterProps {
  selectedStatuses: string[]
  onStatusChange: (statuses: string[]) => void
  className?: string
}

export function ProjectStatusFilter({ 
  selectedStatuses, 
  onStatusChange,
  className = '' 
}: ProjectStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const statusOptions = getProjectStatusFilterOptions()

  const handleStatusToggle = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
  }

  const handleClearAll = () => {
    onStatusChange([])
  }

  const handleSelectAll = () => {
    onStatusChange(statusOptions.map(option => option.value))
  }

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <ModernButton
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Status Filter
        {selectedStatuses.length > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {selectedStatuses.length}
          </span>
        )}
      </ModernButton>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Filter by Status
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Status Options */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(option.value)}
                    onChange={() => handleStatusToggle(option.value)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <ProjectStatusBadge 
                    status={option.value} 
                    size="sm"
                    className="flex-1"
                  />
                </label>
              ))}
            </div>

            {/* Selected Statuses */}
            {selectedStatuses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Selected ({selectedStatuses.length})
                  </span>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedStatuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusToggle(status)}
                      className="cursor-pointer hover:opacity-75"
                    >
                      <ProjectStatusBadge
                        status={status}
                        size="sm"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

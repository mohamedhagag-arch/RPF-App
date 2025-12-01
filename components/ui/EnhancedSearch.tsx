'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import { Card } from './Card'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Calendar,
  Building,
  Target,
  ClipboardList,
  FolderOpen,
  BarChart3
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'project' | 'activity' | 'kpi'
  title: string
  subtitle: string
  status?: string
  projectCode?: string
  icon: any
}

interface EnhancedSearchProps {
  onSearch: (term: string, filters: SearchFilters) => void
  onResultSelect: (result: SearchResult) => void
  placeholder?: string
  className?: string
}

interface SearchFilters {
  type: string[]
  status: string[]
  division: string[]
  dateRange: {
    start: string
    end: string
  }
  project: string
}

export function EnhancedSearch({ 
  onSearch, 
  onResultSelect, 
  placeholder = "Search projects, activities, and KPIs...",
  className = ""
}: EnhancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: [],
    status: [],
    division: [],
    dateRange: { start: '', end: '' },
    project: ''
  })
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch()
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters])

  const performSearch = async () => {
    setLoading(true)
    try {
      // Simulate API call - in real implementation, this would call your backend
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'project',
          title: 'P311 - Future Art - Al Murar',
          subtitle: 'Construction Project',
          status: 'active',
          projectCode: 'P311',
          icon: FolderOpen
        },
        {
          id: '2',
          type: 'activity',
          title: 'Excavation to Final Pit',
          subtitle: 'P311 - Enabling Works',
          status: 'completed',
          projectCode: 'P311',
          icon: ClipboardList
        },
        {
          id: '3',
          type: 'kpi',
          title: 'Progress Tracking',
          subtitle: 'P311 - Excavation',
          status: 'on_track',
          projectCode: 'P311',
          icon: BarChart3
        }
      ]

      // Filter results based on search term and filters
      let filteredResults = mockResults.filter(result => 
        result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.projectCode?.toLowerCase().includes(searchTerm.toLowerCase())
      )

      // Apply type filter
      if (filters.type.length > 0) {
        filteredResults = filteredResults.filter(result => 
          filters.type.includes(result.type)
        )
      }

      // Apply status filter
      if (filters.status.length > 0) {
        filteredResults = filteredResults.filter(result => 
          result.status && filters.status.includes(result.status)
        )
      }

      setResults(filteredResults)
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    onSearch(searchTerm, filters)
    setShowResults(false)
  }

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result)
    setShowResults(false)
    setSearchTerm('')
  }

  const clearFilters = () => {
    setFilters({
      type: [],
      status: [],
      division: [],
      dateRange: { start: '', end: '' },
      project: ''
    })
  }

  const toggleFilter = (category: keyof SearchFilters, value: string) => {
    if (category === 'dateRange' || category === 'project') return

    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }))
  }

  const getStatusColor = (status?: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50',
      completed: 'text-blue-600 bg-blue-50',
      on_track: 'text-green-600 bg-green-50',
      delayed: 'text-red-600 bg-red-50',
      on_hold: 'text-yellow-600 bg-yellow-50'
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      project: FolderOpen,
      activity: ClipboardList,
      kpi: BarChart3
    }
    return icons[type as keyof typeof icons] || Search
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-4"
            onFocus={() => {
              if (results.length > 0) setShowResults(true)
            }}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                setSearchTerm('')
                setResults([])
                setShowResults(false)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`${showFilters ? 'bg-primary-50 text-primary-700' : ''}`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
        
        <Button onClick={handleSearch} disabled={!searchTerm}>
          Search
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Advanced Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="flex space-x-2">
                {[
                  { value: 'project', label: 'Projects', icon: FolderOpen },
                  { value: 'activity', label: 'Activities', icon: ClipboardList },
                  { value: 'kpi', label: 'KPIs', icon: BarChart3 }
                ].map((type) => {
                  const Icon = type.icon
                  return (
                    <Button
                      key={type.value}
                      variant={filters.type.includes(type.value) ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => toggleFilter('type', type.value)}
                      className="flex items-center space-x-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex space-x-2">
                {[
                  { value: 'active', label: 'Active', color: 'green' },
                  { value: 'completed', label: 'Completed', color: 'blue' },
                  { value: 'on_track', label: 'On Track', color: 'green' },
                  { value: 'delayed', label: 'Delayed', color: 'red' },
                  { value: 'on_hold', label: 'On Hold', color: 'yellow' }
                ].map((status) => (
                  <Button
                    key={status.value}
                    variant={filters.status.includes(status.value) ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter('status', status.value)}
                    className={`${filters.status.includes(status.value) ? '' : `border-${status.color}-300 text-${status.color}-700`}`}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  placeholder="End Date"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-40 max-h-96 overflow-y-auto">
          <div className="p-2">
            {loading ? (
              <div className="p-4 text-center">
                <div className="loading-spinner mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result) => {
                  const Icon = getTypeIcon(result.type)
                  return (
                    <Button
                      key={result.id}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{result.title}</div>
                          <div className="text-sm text-gray-600">{result.subtitle}</div>
                        </div>
                        {result.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                            {result.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="p-4 text-center text-gray-600">
                No results found for "{searchTerm}"
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  )
}

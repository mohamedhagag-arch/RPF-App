'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Search, 
  X, 
  Filter, 
  SortAsc, 
  SortDesc,
  FolderOpen,
  ClipboardList,
  BarChart3,
  Calendar,
  Building,
  Hash,
  DollarSign,
  Percent,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'project' | 'activity' | 'kpi'
  title: string
  subtitle: string
  description: string
  status?: string
  progress?: number
  date?: string
  icon: any
  color: string
  data: any
}

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void
  onClose?: () => void
  isOpen?: boolean
}

export function GlobalSearch({ onResultClick, onClose, isOpen = false }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'projects' | 'activities' | 'kpis'>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('search')

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        performSearch()
      }, 300)

      return () => clearTimeout(timeoutId)
    } else {
      setResults([])
    }
  }, [searchTerm, selectedCategory, sortBy, sortOrder])

  const performSearch = async () => {
    try {
      setLoading(true)
      setError('')
      
      const searchResults: SearchResult[] = []

      // Search projects
      if (selectedCategory === 'all' || selectedCategory === 'projects') {
        const { data: projects } = await supabase
          .from('Planning Database - ProjectsList')
          .select('*')
          .or(`project_name.ilike.%${searchTerm}%,project_code.ilike.%${searchTerm}%,project_type.ilike.%${searchTerm}%,responsible_division.ilike.%${searchTerm}%`)
          .limit(10)

        if (projects) {
          projects.forEach((project: any) => {
            searchResults.push({
              id: project.id,
              type: 'project',
              title: project.project_name,
              subtitle: project.project_code,
              description: `${project.project_type} • ${project.responsible_division || 'No Division'}`,
              status: project.project_status,
              date: project.created_at,
              icon: FolderOpen,
              color: getProjectStatusColor(project.project_status),
              data: project
            })
          })
        }
      }

      // Search activities
      if (selectedCategory === 'all' || selectedCategory === 'activities') {
        const { data: activities } = await supabase
          .from('Planning Database - BOQ Rates')
          .select('*')
          .or(`activity_name.ilike.%${searchTerm}%,activity.ilike.%${searchTerm}%,activity_division.ilike.%${searchTerm}%,project_code.ilike.%${searchTerm}%`)
          .limit(10)

        if (activities) {
          activities.forEach((activity: any) => {
            searchResults.push({
              id: activity.id,
              type: 'activity',
              title: activity.activity_name,
              subtitle: `${activity.project_code} • ${activity.activity}`,
              description: `${activity.activity_division || 'No Division'} • ${activity.unit || 'No Unit'}`,
              status: activity.activity_actual_status,
              progress: activity.activity_progress_percentage,
              date: activity.updated_at,
              icon: ClipboardList,
              color: getActivityStatusColor(activity.activity_actual_status),
              data: activity
            })
          })
        }
      }

      // Search KPIs
      if (selectedCategory === 'all' || selectedCategory === 'kpis') {
        const { data: kpis } = await supabase
          .from('Planning Database - KPI')
          .select('*')
          .or(`kpi_name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
          .limit(10)

        if (kpis) {
          kpis.forEach((kpi: any) => {
            searchResults.push({
              id: kpi.id,
              type: 'kpi',
              title: kpi.kpi_name,
              subtitle: `Target: ${kpi.target_date}`,
              description: `Planned: ${kpi.planned_value} • Actual: ${kpi.actual_value}`,
              status: kpi.status,
              date: kpi.created_at,
              icon: BarChart3,
              color: getKPIStatusColor(kpi.status),
              data: kpi
            })
          })
        }
      }

      // Sort results
      const sortedResults = sortResults(searchResults)
      setResults(sortedResults)
    } catch (error: any) {
      setError('Search failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const sortResults = (results: SearchResult[]) => {
    return [...results].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title)
          break
        case 'date':
          comparison = new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
          break
        case 'relevance':
        default:
          // Simple relevance based on title match
          const aRelevance = (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
          const bRelevance = (b.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
          comparison = bRelevance - aRelevance
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'completed': return 'text-blue-600 bg-blue-50'
      case 'on_hold': return 'text-yellow-600 bg-yellow-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'delayed': return 'text-red-600 bg-red-50'
      case 'not_started': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getKPIStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-50'
      case 'delayed': return 'text-red-600 bg-red-50'
      case 'completed': return 'text-blue-600 bg-blue-50'
      case 'at_risk': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string, type: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'on_track':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'delayed':
      case 'at_risk':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Global Search</span>
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search projects, activities, KPIs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="projects">Projects</option>
                <option value="activities">Activities</option>
                <option value="kpis">KPIs</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="relevance">Relevance</option>
                <option value="name">Name</option>
                <option value="date">Date</option>
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center space-x-1"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              <span className="text-sm">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Results */}
          {!loading && searchTerm.length >= 2 && (
            <div className="max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result) => {
                    const Icon = result.icon
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${result.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {result.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${result.color}`}>
                                {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                              </span>
                              {result.status && getStatusIcon(result.status, result.type)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {result.subtitle}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {result.description}
                            </p>
                            {result.progress !== undefined && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Progress</span>
                                  <span>{result.progress.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-primary-600 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(result.progress, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            {result.date && (
                              <p className="text-xs text-gray-400 mt-2 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(result.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search Tips */}
          {searchTerm.length < 2 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Searching</h3>
              <p className="text-gray-600 mb-4">
                Type at least 2 characters to search across all projects, activities, and KPIs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-500">
                  <FolderOpen className="h-4 w-4" />
                  <span>Projects</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <ClipboardList className="h-4 w-4" />
                  <span>Activities</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <BarChart3 className="h-4 w-4" />
                  <span>KPIs</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


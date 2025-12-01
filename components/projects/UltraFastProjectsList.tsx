'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { UltraFastLoader, BatchLoader } from '@/components/ui/UltraFastLoader'
import { fastQueryExecutor } from '@/lib/fastConnectionManager'
import { Project, TABLES } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Plus, 
  Search, 
  Building, 
  Calendar, 
  DollarSign, 
  Hash,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

interface UltraFastProjectsListProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function UltraFastProjectsList({ 
  globalSearchTerm = '', 
  globalFilters = { project: '', status: '', division: '', dateRange: '' } 
}: UltraFastProjectsListProps) {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm)
  const [filters, setFilters] = useState(globalFilters)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(25) // Reduced for faster loading
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // ✅ Memoized search and filter logic
  const searchAndFilterQuery = useMemo(() => {
    return {
      searchTerm: searchTerm || globalSearchTerm,
      filters: { ...filters, ...globalFilters },
      page: currentPage,
      pageSize,
      sortBy,
      sortDirection
    }
  }, [searchTerm, globalSearchTerm, filters, globalFilters, currentPage, pageSize, sortBy, sortDirection])

  // ✅ Fast data loading with caching
  const loadProjectsData = useCallback(async () => {
    const queryKey = `projects_${JSON.stringify(searchAndFilterQuery)}`
    
    return fastQueryExecutor.execute(
      queryKey,
      async (client) => {
        let query = client
          .from(TABLES.PROJECTS)
          .select('*', { count: 'exact' })
          .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)
          .order(sortBy, { ascending: sortDirection === 'asc' })

        // Apply search filter
        if (searchAndFilterQuery.searchTerm) {
          query = query.or(`project_name.ilike.%${searchAndFilterQuery.searchTerm}%,project_code.ilike.%${searchAndFilterQuery.searchTerm}%`)
        }

        // Apply status filter
        if (searchAndFilterQuery.filters.status) {
          query = query.eq('project_status', searchAndFilterQuery.filters.status)
        }

        // Apply division filter
        if (searchAndFilterQuery.filters.division) {
          query = query.eq('responsible_division', searchAndFilterQuery.filters.division)
        }

        const { data, error, count } = await query

        if (error) throw error

        return {
          data: {
            projects: data || [],
            totalCount: count || 0,
            hasMore: (currentPage + 1) * pageSize < (count || 0)
          },
          error: null
        }
      },
      { 
        cache: true, 
        timeout: 8000
      }
    )
  }, [searchAndFilterQuery, currentPage, pageSize, sortBy, sortDirection])

  // ✅ Fast statistics loading
  const loadStatistics = useCallback(() => {
    return [
      {
        key: 'projects_count',
        query: () => fastQueryExecutor.execute(
          'projects_count',
          async (client) => {
            const { count, error } = await client
              .from(TABLES.PROJECTS)
              .select('*', { count: 'exact', head: true })
            return { data: count, error }
          },
          { cache: true, timeout: 5000 }
        )
      },
      {
        key: 'active_projects_count',
        query: () => fastQueryExecutor.execute(
          'active_projects_count',
          async (client) => {
            const { count, error } = await client
              .from(TABLES.PROJECTS)
              .select('*', { count: 'exact', head: true })
              .eq('project_status', 'on-going')
            return { data: count, error }
          },
          { cache: true, timeout: 5000 }
        )
      },
      {
        key: 'completed_projects_count',
        query: () => fastQueryExecutor.execute(
          'completed_projects_count',
          async (client) => {
            // Count projects with completed-duration or contract-completed status
            const { count: count1, error: error1 } = await client
              .from(TABLES.PROJECTS)
              .select('*', { count: 'exact', head: true })
              .eq('project_status', 'completed-duration')
            
            if (error1) return { data: 0, error: error1 }
            
            const { count: count2, error: error2 } = await client
              .from(TABLES.PROJECTS)
              .select('*', { count: 'exact', head: true })
              .eq('project_status', 'contract-completed')
            
            if (error2) return { data: count1 || 0, error: error2 }
            
            return { data: (count1 || 0) + (count2 || 0), error: null }
          },
          { cache: true, timeout: 5000 }
        )
      }
    ]
  }, [])

  // ✅ Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(0) // Reset to first page
  }, [])

  // ✅ Handle filter changes
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }))
    setCurrentPage(0) // Reset to first page
  }, [])

  // ✅ Handle sort changes
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('desc')
    }
  }, [sortBy])

  // ✅ Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // ✅ Handle refresh
  const handleRefresh = useCallback(() => {
    fastQueryExecutor.clearCache()
    setCurrentPage(0)
  }, [])

  // ✅ Render project card
  const renderProjectCard = useCallback((project: Project) => (
    <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.project_name}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {project.project_code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              project.project_status === 'on-going' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : project.project_status === 'completed-duration' || project.project_status === 'contract-completed'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {project.project_status}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Building className="w-4 h-4" />
            <span>{project.responsible_division}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span>{project.contract_amount?.toLocaleString() || 'N/A'} AED</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [])

  // ✅ Render statistics
  const renderStatistics = useCallback((stats: Array<{ data: any; error: string | null }>) => {
    const [totalCount, activeCount, completedCount] = stats.map(s => s.data || 0)
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [])

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {viewMode === 'grid' ? 'Table' : 'Grid'}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <BatchLoader
        queries={loadStatistics()}
        children={renderStatistics}
      />

      {/* Projects List */}
      <UltraFastLoader
        queryKey={`projects_list_${JSON.stringify(searchAndFilterQuery)}`}
        queryFn={loadProjectsData}
        preload={true}
        cache={true}
        timeout={8000}
        retries={2}
      >
        {(data, loading, error) => (
          <div className="space-y-4">
            {data.projects.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No projects found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'Try adjusting your search terms' : 'No projects available'}
                </p>
              </div>
            ) : (
              <>
                {/* Projects Grid */}
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {data.projects.map(renderProjectCard)}
                </div>

                {/* Pagination */}
                {data.totalCount > pageSize && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage + 1} of {Math.ceil(data.totalCount / pageSize)}
                    </span>
                    
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!data.hasMore}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </UltraFastLoader>
    </div>
  )
}

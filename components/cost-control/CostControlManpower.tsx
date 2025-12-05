'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { UserCheck, Download, RefreshCw, Search, X, CheckCircle, AlertCircle, Filter, SlidersHorizontal, Calendar, DollarSign, Clock, Database, ArrowRight } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useRouter } from 'next/navigation'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface ManpowerRecord {
  id?: string
  date?: string
  project_code?: string
  labour_code?: string
  designation?: string
  start?: string
  finish?: string
  overtime?: string
  total_hours?: number
  cost?: number
}

export default function CostControlManpower() {
  const [data, setData] = useState<ManpowerRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projectCodeSearch, setProjectCodeSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState({
    date: '',
    labourCode: '',
    designation: '',
    startDate: '',
    endDate: '',
    minHours: '',
    maxHours: '',
    minCost: '',
    maxCost: '',
    overtime: ''
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  const supabase = getSupabaseClient()
  const router = useRouter()

  const searchByProjectCode = async () => {
    if (!projectCodeSearch.trim()) {
      setError('Please enter a Project Code to search')
      return
    }

    try {
      setLoading(true)
      setError('')
      setHasSearched(true)
      
      const tableName = 'CCD - MANPOWER'
      let allRecords: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: records, error: fetchError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .ilike('PROJECT CODE', `%${projectCodeSearch.trim()}%`)
          .order('PROJECT CODE', { ascending: true })
          .range(from, from + pageSize - 1)
        
        if (fetchError) {
          if (fetchError.code === '42P01' || fetchError.message.includes('does not exist')) {
            setData([])
            setError('MANPOWER table not found. Data will be available after database setup from Database Manager.')
            return
          } else {
            throw fetchError
          }
        }
        
        if (records && records.length > 0) {
          allRecords = [...allRecords, ...records]
          from += pageSize
          hasMore = records.length === pageSize
        } else {
          hasMore = false
        }
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      setData(allRecords || [])
      if (allRecords && allRecords.length === 0) {
        setError(`No records found for Project Code: ${projectCodeSearch}`)
      } else if (allRecords && allRecords.length > 0) {
        console.log(`✅ Loaded ${allRecords.length} records for Project Code: ${projectCodeSearch}`)
      }
    } catch (err: any) {
      console.error('Error loading MANPOWER data:', err)
      setError(err.message || 'Failed to load MANPOWER data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchByProjectCode()
  }

  const clearSearch = () => {
    setProjectCodeSearch('')
    setData([])
    setError('')
    setHasSearched(false)
    setSearchTerm('')
    clearAllFilters()
  }

  const filteredData = data.filter((record) => {
    const rawRecord = (record as any).raw || record
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        (rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || '').toString().toLowerCase().includes(searchLower) ||
        (rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '').toString().toLowerCase().includes(searchLower) ||
        (rawRecord['Designation'] || rawRecord['designation'] || record.designation || '').toString().toLowerCase().includes(searchLower) ||
        (rawRecord['START'] || rawRecord['start'] || record.start || '').toString().toLowerCase().includes(searchLower) ||
        (rawRecord['FINISH'] || rawRecord['finish'] || record.finish || '').toString().toLowerCase().includes(searchLower) ||
        (rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || '').toString().toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }
    
    if (filters.date) {
      const date = (rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || '').toString().toLowerCase()
      if (!date.includes(filters.date.toLowerCase())) return false
    }
    
    if (filters.labourCode) {
      const labourCode = (rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '').toString().toLowerCase()
      if (!labourCode.includes(filters.labourCode.toLowerCase())) return false
    }
    
    if (filters.designation) {
      const designation = (rawRecord['Designation'] || rawRecord['designation'] || record.designation || '').toString().toLowerCase()
      if (!designation.includes(filters.designation.toLowerCase())) return false
    }
    
    if (filters.startDate || filters.endDate) {
      const recordDate = rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || ''
      const startDate = rawRecord['START'] || rawRecord['start'] || record.start || ''
      const finishDate = rawRecord['FINISH'] || rawRecord['finish'] || record.finish || ''
      
      if (filters.startDate && recordDate && recordDate < filters.startDate) return false
      if (filters.endDate && recordDate && recordDate > filters.endDate) return false
      if (filters.startDate && startDate && startDate < filters.startDate) return false
      if (filters.endDate && finishDate && finishDate > filters.endDate) return false
    }
    
    if (filters.minHours || filters.maxHours) {
      const totalHours = parseFloat(String(
        rawRecord['Total Hours'] || 
        rawRecord['total_hours'] || 
        rawRecord['TotalHours'] ||
        record.total_hours || 
        0
      )) || 0
      
      if (filters.minHours && totalHours < parseFloat(filters.minHours)) return false
      if (filters.maxHours && totalHours > parseFloat(filters.maxHours)) return false
    }
    
    if (filters.minCost || filters.maxCost) {
      const cost = parseFloat(String(
        rawRecord['Cost'] || 
        rawRecord['cost'] || 
        record.cost || 
        0
      )) || 0
      
      if (filters.minCost && cost < parseFloat(filters.minCost)) return false
      if (filters.maxCost && cost > parseFloat(filters.maxCost)) return false
    }
    
    if (filters.overtime) {
      const overtime = (rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || '').toString().toLowerCase()
      if (filters.overtime === 'yes' && (!overtime || overtime === 'no' || overtime === '')) return false
      if (filters.overtime === 'no' && (overtime && overtime !== 'no' && overtime !== '')) return false
    }
    
    return true
  })
  
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length + (searchTerm ? 1 : 0)
  
  const clearAllFilters = () => {
    setFilters({
      date: '',
      labourCode: '',
      designation: '',
      startDate: '',
      endDate: '',
      minHours: '',
      maxHours: '',
      minCost: '',
      maxCost: '',
      overtime: ''
    })
    setSearchTerm('')
    setCurrentPage(1)
  }
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)
  
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, projectCodeSearch])

  const totals = filteredData.reduce((acc, record) => {
    const rawRecord = (record as any).raw || record
    
    const totalHours = parseFloat(String(
      rawRecord['Total Hours'] || 
      rawRecord['total_hours'] || 
      rawRecord['TotalHours'] ||
      record.total_hours || 
      0
    )) || 0
    
    const cost = parseFloat(String(
      rawRecord['Cost'] || 
      rawRecord['cost'] || 
      record.cost || 
      0
    )) || 0
    
    acc.totalHours += totalHours
    acc.totalCost += cost
    return acc
  }, { totalHours: 0, totalCost: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <UserCheck className="h-6 w-6 text-blue-500" />
            MANPOWER
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track manpower costs across all projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.length > 0 && (
            <Button
              variant="outline"
              onClick={clearSearch}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Search
            </Button>
          )}
          <PermissionButton
            permission="cost_control.database.manage"
            variant="primary"
            onClick={() => router.push('/cost-control?tab=database')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Database className="h-4 w-4 mr-2" />
            Database Manager
            <ArrowRight className="h-4 w-4 ml-2" />
          </PermissionButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Manpower records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Hours worked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {totals.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total manpower cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Code Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search by Project Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter Project Code (e.g., P4110-P, P4110)"
                  value={projectCodeSearch}
                  onChange={(e) => setProjectCodeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !projectCodeSearch.trim()}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter a Project Code to load MANPOWER data for that project. Data will only be loaded when you search.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filters & Search
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="🔍 Quick search in all fields (Date, Labour Code, Designation, Dates, Project Code, etc.)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {showAdvancedFilters && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Date
                      </label>
                      <input
                        type="text"
                        placeholder="Filter by Date (e.g., 12/1/2024)"
                        value={filters.date}
                        onChange={(e) => {
                          setFilters({ ...filters, date: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <UserCheck className="h-4 w-4 inline mr-1" />
                        Labour Code
                      </label>
                      <input
                        type="text"
                        placeholder="Filter by Labour Code"
                        value={filters.labourCode}
                        onChange={(e) => {
                          setFilters({ ...filters, labourCode: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <UserCheck className="h-4 w-4 inline mr-1" />
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="Filter by Designation"
                        value={filters.designation}
                        onChange={(e) => {
                          setFilters({ ...filters, designation: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Overtime
                      </label>
                      <select
                        value={filters.overtime}
                        onChange={(e) => {
                          setFilters({ ...filters, overtime: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All</option>
                        <option value="yes">Has Overtime</option>
                        <option value="no">No Overtime</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Start Date (From)
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => {
                          setFilters({ ...filters, startDate: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        End Date (To)
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => {
                          setFilters({ ...filters, endDate: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Min Hours
                      </label>
                      <input
                        type="number"
                        placeholder="Minimum hours"
                        value={filters.minHours}
                        onChange={(e) => {
                          setFilters({ ...filters, minHours: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Max Hours
                      </label>
                      <input
                        type="number"
                        placeholder="Maximum hours"
                        value={filters.maxHours}
                        onChange={(e) => {
                          setFilters({ ...filters, maxHours: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Min Cost (AED)
                      </label>
                      <input
                        type="number"
                        placeholder="Minimum cost"
                        value={filters.minCost}
                        onChange={(e) => {
                          setFilters({ ...filters, minCost: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Max Cost (AED)
                      </label>
                      <input
                        type="number"
                        placeholder="Maximum cost"
                        value={filters.maxCost}
                        onChange={(e) => {
                          setFilters({ ...filters, maxCost: e.target.value })
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {activeFiltersCount > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📊 Showing <strong>{filteredData.length.toLocaleString()}</strong> of <strong>{data.length.toLocaleString()}</strong> records
                        {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success/Error Alerts */}
      {success && (
        <Alert variant="success">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{success}</span>
          </div>
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold">Error:</span>
            <span>{error}</span>
          </div>
        </Alert>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>MANPOWER Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="ml-4 text-gray-600 dark:text-gray-400">
                Loading MANPOWER data for project: <strong>{projectCodeSearch}</strong>
              </p>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                Search for a Project Code to load MANPOWER data
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Enter a Project Code in the search box above to load and view MANPOWER records for that project.
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {data.length === 0 
                  ? `No MANPOWER records found for Project Code: ${projectCodeSearch}`
                  : 'No records match your filter criteria.'}
              </p>
              {data.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Try searching with a different Project Code or check if the data has been imported in Database Manager.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Project Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Labour Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Finish</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Overtime</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((record, index) => {
                    const rawRecord = (record as any).raw || record
                    const date = rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || '-'
                    const projectCode = rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || '-'
                    const labourCode = rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '-'
                    const designation = rawRecord['Designation'] || rawRecord['designation'] || record.designation || '-'
                    const start = rawRecord['START'] || rawRecord['start'] || record.start || '-'
                    const finish = rawRecord['FINISH'] || rawRecord['finish'] || record.finish || '-'
                    const overtime = rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || '-'
                    const totalHours = rawRecord['Total Hours'] || rawRecord['total_hours'] || rawRecord['TotalHours'] || record.total_hours || 0
                    const cost = rawRecord['Cost'] || rawRecord['cost'] || record.cost || 0
                    
                    return (
                      <tr key={record.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{date}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{projectCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{labourCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{designation}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{start}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{finish}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{overtime}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          {totalHours ? parseFloat(String(totalHours)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {cost ? `AED ${parseFloat(String(cost)).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {filteredData.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">Totals:</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                        {totals.totalHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                        AED {totals.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              
              {filteredData.length > itemsPerPage && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                      <option value={200}>200 per page</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</Button>
                    <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

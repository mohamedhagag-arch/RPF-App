'use client'

import { useState, Suspense, lazy } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { PrintButton } from '@/components/ui/PrintButton'
import { useReportsData } from '@/hooks/useReportsData'
import type { ReportType } from './types'
import { OverviewTab, ProjectsTab, KPIsTab, FinancialTab, PerformanceTab, ActivitiesTab } from './tabs'

// ✅ PERFORMANCE: Lazy load report components to reduce initial bundle size
const LookaheadTab = lazy(() => import('./tabs/LookaheadTab').then(module => ({ default: module.LookaheadTab })))
const MonthlyWorkRevenueTab = lazy(() => import('./tabs/MonthlyWorkRevenueTab').then(module => ({ default: module.MonthlyWorkRevenueTab })))
const KPICChartTab = lazy(() => import('./tabs/KPICChartTab').then(module => ({ default: module.KPICChartTab })))
const DelayedActivitiesTab = lazy(() => import('./tabs/DelayedActivitiesTab').then(module => ({ default: module.DelayedActivitiesTab })))
const ActivityPeriodicalProgressTab = lazy(() => import('./tabs/ActivityPeriodicalProgressTab').then(module => ({ default: module.ActivityPeriodicalProgressTab })))
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  Archive,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  Eye,
  CalendarDays,
  CalendarRange,
  FastForward,
  TrendingDown,
  Users,
  Building2,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronDown
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface ReportStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalActivities: number
  completedActivities: number
  delayedActivities: number
  totalKPIs: number
  plannedKPIs: number
  actualKPIs: number
  totalValue: number
  earnedValue: number
  plannedValue: number
  variance: number
  overallProgress: number
}

export function ModernReportsManager() {
  const [activeReport, setActiveReport] = useState<ReportType>('overview')
  
  // ✅ Use centralized hook for all data management
  const {
    projects,
    loading,
    error,
    isFromCache,
    stats,
    filteredData,
    allAnalytics,
    isComputingAnalytics,
    formatCurrency,
    formatNumber,
    formatPercentage,
    divisions,
    selectedDivision,
    setSelectedDivision,
    selectedProjects,
    setSelectedProjects,
    dateRange,
    setDateRange,
    showProjectDropdown,
    setShowProjectDropdown,
    projectSearch,
    setProjectSearch,
    projectDropdownRef,
    refreshData
  } = useReportsData()


  // All data management is now in useReportsData hook

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
  return (
      <Alert variant="error" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
        <Button onClick={() => refreshData(true)} size="sm" variant="outline" className="ml-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive project performance insights
              {isFromCache && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400" title="Data loaded from cache">
                  (Cached)
                </span>
              )}
          </p>
        </div>
          <div className="flex items-center gap-2">
          <Button onClick={() => refreshData(true)} variant="outline" size="sm" title="Refresh data from server (bypass cache)">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
            <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
        </div>
      </div>

        {/* Filters */}
        <Card className="no-print">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value)
                    // Clear project selection when division changes
                    if (e.target.value !== selectedDivision) {
                      setSelectedProjects([])
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Divisions</option>
                  {divisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              <div className="relative" ref={projectDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project
                </label>
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-between ${
                    selectedProjects.length > 0
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-gray-300 dark:border-gray-600'
                  } hover:border-gray-400 dark:hover:border-gray-500`}
                >
                  <span className="text-sm truncate">
                    {selectedProjects.length === 0
                      ? 'All Projects'
                      : selectedProjects.length === 1
                      ? (() => {
                          const project = projects.find(p => 
                            (p.project_full_code && selectedProjects.includes(p.project_full_code)) || 
                            selectedProjects.includes(p.id)
                          )
                          return project 
                            ? `${project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`} - ${project.project_name}`
                            : '1 project selected'
                        })()
                      : `${selectedProjects.length} projects selected`
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showProjectDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
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
                      {selectedProjects.length > 0 && (
                        <button
                          onClick={() => setSelectedProjects([])}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {(() => {
                        const availableProjects = selectedDivision 
                    ? projects.filter(p => p.responsible_division === selectedDivision)
                    : projects
                        
                        const filteredProjects = projectSearch
                          ? availableProjects.filter(p => {
                              const searchLower = projectSearch.toLowerCase()
                              const projectCode = (p.project_full_code || `${p.project_code}${p.project_sub_code ? `-${p.project_sub_code}` : ''}`).toLowerCase()
                              const projectName = (p.project_name || '').toLowerCase()
                              return projectCode.includes(searchLower) || projectName.includes(searchLower)
                            })
                          : availableProjects
                        
                        return filteredProjects.length > 0 ? (
                          filteredProjects.map((project) => {
                            const projectFullCode = project.project_full_code || project.id
                            const displayCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
                            const isSelected = selectedProjects.includes(projectFullCode)
                            
                            return (
                              <label
                                key={project.id}
                                className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedProjects(selectedProjects.filter(p => p !== projectFullCode))
                                    } else {
                                      setSelectedProjects([...selectedProjects, projectFullCode])
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {displayCode}
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
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSelectedDivision('')
                    setSelectedProjects([])
                    setDateRange({ start: '', end: '' })
                    setProjectSearch('')
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(stats.totalProjects)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.activeProjects} active, {stats.completedProjects} completed
                </p>
              </div>
                <Building2 className="h-12 w-12 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">BOQ Activities</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(stats.totalActivities)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.completedActivities} completed, {stats.delayedActivities} delayed
                </p>
              </div>
                <Target className="h-12 w-12 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">KPI Records</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(stats.totalKPIs)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.plannedKPIs} planned, {stats.actualKPIs} actual
                </p>
              </div>
                <BarChart3 className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Overall Progress</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatPercentage(stats.overallProgress)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Based on earned value
                </p>
              </div>
                <TrendingUp className="h-12 w-12 text-orange-500 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total contract value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Earned Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.earnedValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatPercentage((stats.totalValue > 0 ? stats.earnedValue / stats.totalValue : 0) * 100)} of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Planned Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.plannedValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatPercentage((stats.totalValue > 0 ? stats.plannedValue / stats.totalValue : 0) * 100)} of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Remaining Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalValue - stats.earnedValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatPercentage((stats.totalValue > 0 ? ((stats.totalValue - stats.earnedValue) / stats.totalValue) * 100 : 0))} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {stats.variance >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
                Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.variance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Earned - Planned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'projects', label: 'Projects', icon: Building2 },
            { id: 'activities', label: 'Activities', icon: Target },
            { id: 'kpis', label: 'KPIs', icon: TrendingUp },
            { id: 'kpi-chart', label: 'KPI Chart', icon: BarChart3 },
            { id: 'financial', label: 'Financial', icon: DollarSign },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'lookahead', label: 'LookAhead', icon: FastForward },
            { id: 'monthly-revenue', label: 'Monthly Revenue', icon: CalendarDays },
            { id: 'delayed-activities', label: 'Delayed Activities', icon: AlertTriangle },
            { id: 'activity-periodical-progress', label: 'Activity Periodical Progress', icon: CalendarRange },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeReport === tab.id ? 'primary' : 'outline'}
              onClick={() => {
                // ✅ PERFORMANCE: Don't use transition for tab switching - show immediately
                setActiveReport(tab.id as ReportType)
              }}
              size="sm"
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Print Button Section */}
      <div className="flex items-center justify-end mb-4 gap-2 print-hide">
        <PrintButton
          label="Print Report"
          variant="primary"
          printTitle={(() => {
            const tabLabels: Record<string, string> = {
              'overview': 'Overview Report',
              'projects': 'Projects Report',
              'activities': 'Activities Report',
              'kpis': 'KPIs Report',
              'kpi-chart': 'KPI Chart Report',
              'financial': 'Financial Report',
              'performance': 'Performance Report',
              'lookahead': 'LookAhead Report',
              'monthly-revenue': 'Monthly Revenue Report',
              'delayed-activities': 'Delayed Activities Report',
              'activity-periodical-progress': 'Activity Periodical Progress Report',
            }
            return tabLabels[activeReport] || 'Report'
          })()}
          showSettings={true}
        />
      </div>

      {/* Report Content */}
      <div className="report-section">
        {/* ✅ PERFORMANCE: Only show loading if data is actually loading, not when switching tabs */}
        {/* ✅ FIX: Show content immediately if we have cached analytics or computed analytics, even if computing */}
        {(isComputingAnalytics && allAnalytics.length === 0) && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {isComputingAnalytics ? 'Processing analytics...' : 'Loading report...'}
            </span>
          </div>
        )}
        {(allAnalytics.length > 0 || !loading) && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading report...</span>
            </div>
          }>
            {activeReport === 'overview' && (
              <OverviewTab stats={stats} filteredData={filteredData} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
            )}
            {activeReport === 'projects' && (
              <ProjectsTab 
                projects={filteredData.filteredProjects} 
                activities={filteredData.filteredActivities} 
                kpis={filteredData.filteredKPIs} 
                allAnalytics={allAnalytics}
                formatCurrency={formatCurrency} 
              />
            )}
            {activeReport === 'activities' && (
              <ActivitiesTab activities={filteredData.filteredActivities} kpis={filteredData.filteredKPIs} formatCurrency={formatCurrency} />
            )}
            {activeReport === 'kpis' && (
              <KPIsTab kpis={filteredData.filteredKPIs} formatCurrency={formatCurrency} />
            )}
            {activeReport === 'financial' && (
              <FinancialTab 
                stats={stats} 
                filteredData={filteredData} 
                allAnalytics={allAnalytics}
                formatCurrency={formatCurrency} 
              />
            )}
            {activeReport === 'performance' && (
              <PerformanceTab 
                filteredData={filteredData} 
                allAnalytics={allAnalytics}
                formatCurrency={formatCurrency} 
                formatPercentage={formatPercentage} 
              />
            )}
                   {activeReport === 'lookahead' && (
                     <LookaheadTab activities={filteredData.filteredActivities} projects={filteredData.filteredProjects} formatCurrency={formatCurrency} />
                   )}
                   {activeReport === 'monthly-revenue' && (
                     <MonthlyWorkRevenueTab
                       activities={filteredData.filteredActivities}
                       projects={filteredData.filteredProjects}
                       kpis={filteredData.filteredKPIs}
                       allAnalytics={allAnalytics}
                       formatCurrency={formatCurrency}
                     />
                   )}
                   {activeReport === 'kpi-chart' && (
                     <KPICChartTab
                       activities={filteredData.filteredActivities}
                       projects={filteredData.filteredProjects}
                       kpis={filteredData.filteredKPIs}
                       formatCurrency={formatCurrency}
                     />
                   )}
                   {activeReport === 'delayed-activities' && (
                     <DelayedActivitiesTab
                       activities={filteredData.filteredActivities}
                       projects={filteredData.filteredProjects}
                       formatCurrency={formatCurrency}
                     />
                   )}
                   {activeReport === 'activity-periodical-progress' && (
                     <ActivityPeriodicalProgressTab
                       activities={filteredData.filteredActivities}
                       projects={filteredData.filteredProjects}
                       kpis={filteredData.filteredKPIs}
                       formatCurrency={formatCurrency}
                     />
                   )}
          </Suspense>
        )}
      </div>
    </div>
  )
}

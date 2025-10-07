'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  FileText, 
  Download, 
  BarChart3, 
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Printer,
  Share2,
  Archive,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface ReportsManagerProps {
  userRole?: string
}

interface ReportData {
  projects: any[]
  activities: any[]
  kpis: any[]
  summary: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalActivities: number
    completedActivities: number
    totalKPIs: number
    onTrackKPIs: number
    delayedKPIs: number
  }
}

export function ReportsManager({ userRole = 'viewer' }: ReportsManagerProps) {
  const [reports, setReports] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('reports') // ✅ Smart loading
  const [activeReport, setActiveReport] = useState<'summary' | 'projects' | 'activities' | 'kpis' | 'financial'>('summary')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [selectedProject, setSelectedProject] = useState('')
  const [projects, setProjects] = useState<any[]>([])

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchProjects()
    generateReport()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('project_name')
      
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const generateReport = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')

      // Fetch all data
      const [projectsResult, activitiesResult, kpisResult] = await Promise.all([
        (supabase as any).from('projects').select('*'),
        (supabase as any).from('boq_activities').select('*'),
        (supabase as any).from('kpi_records').select('*')
      ])

      const projectsData = projectsResult.data || []
      const activitiesData = activitiesResult.data || []
      const kpisData = kpisResult.data || []

      // Filter by date range if specified
      let filteredProjects = projectsData
      let filteredActivities = activitiesData
      let filteredKPIs = kpisData

      if (dateRange.start) {
        filteredProjects = projectsData.filter((p: any) => new Date(p.created_at) >= new Date(dateRange.start))
        filteredActivities = activitiesData.filter((a: any) => new Date(a.created_at) >= new Date(dateRange.start))
        filteredKPIs = kpisData.filter((k: any) => new Date(k.created_at) >= new Date(dateRange.start))
      }

      if (dateRange.end) {
        filteredProjects = filteredProjects.filter((p: any) => new Date(p.created_at) <= new Date(dateRange.end))
        filteredActivities = filteredActivities.filter((a: any) => new Date(a.created_at) <= new Date(dateRange.end))
        filteredKPIs = filteredKPIs.filter((k: any) => new Date(k.created_at) <= new Date(dateRange.end))
      }

      // Filter by project if specified
      if (selectedProject) {
        filteredActivities = filteredActivities.filter((a: any) => a.project_id === selectedProject)
        filteredKPIs = filteredKPIs.filter((k: any) => k.project_id === selectedProject)
      }

      // Calculate summary
      const summary = {
        totalProjects: filteredProjects.length,
        activeProjects: filteredProjects.filter((p: any) => p.project_status === 'active').length,
        completedProjects: filteredProjects.filter((p: any) => p.project_status === 'completed').length,
        totalActivities: filteredActivities.length,
        completedActivities: filteredActivities.filter((a: any) => a.activity_completed).length,
        totalKPIs: filteredKPIs.length,
        onTrackKPIs: filteredKPIs.filter((k: any) => k.status === 'on_track').length,
        delayedKPIs: filteredKPIs.filter((k: any) => k.status === 'delayed').length
      }

      setReports({
        projects: filteredProjects,
        activities: filteredActivities,
        kpis: filteredKPIs,
        summary
      })
    } catch (error: any) {
      setError('Failed to generate report: ' + error.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!reports) return

    try {
      startSmartLoading(setLoading)

      let exportData = ''
      let fileName = ''
      let mimeType = ''

      switch (format) {
        case 'csv':
          exportData = generateCSVReport()
          fileName = `project-report-${new Date().toISOString().split('T')[0]}.csv`
          mimeType = 'text/csv'
          break
        case 'excel':
          exportData = generateExcelReport()
          fileName = `project-report-${new Date().toISOString().split('T')[0]}.xlsx`
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'pdf':
          // For PDF, we'll generate HTML that can be printed as PDF
          exportData = generateHTMLReport()
          fileName = `project-report-${new Date().toISOString().split('T')[0]}.html`
          mimeType = 'text/html'
          break
      }

      const blob = new Blob([exportData], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      setError('Export failed: ' + error.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const generateCSVReport = () => {
    if (!reports) return ''

    let csv = 'Report Type,ID,Name,Status,Progress,Created\n'

    // Add projects
    reports.projects.forEach(project => {
      csv += `Project,${project.id},"${project.project_name}",${project.project_status},${project.kpi_completed ? '100' : '0'},${project.created_at}\n`
    })

    // Add activities
    reports.activities.forEach(activity => {
      csv += `Activity,${activity.id},"${activity.activity_name}",${activity.activity_actual_status},${activity.activity_progress_percentage},${activity.created_at}\n`
    })

    // Add KPIs
    reports.kpis.forEach(kpi => {
      const progress = kpi.planned_value > 0 ? (kpi.actual_value / kpi.planned_value * 100).toFixed(1) : '0'
      csv += `KPI,${kpi.id},"${kpi.kpi_name}",${kpi.status},${progress},${kpi.created_at}\n`
    })

    return csv
  }

  const generateExcelReport = () => {
    // Simple Excel-compatible format
    return generateCSVReport()
  }

  const generateHTMLReport = () => {
    if (!reports) return ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Project Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .status-active { color: green; }
          .status-completed { color: blue; }
          .status-delayed { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Project Management Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <h3>${reports.summary.totalProjects}</h3>
            <p>Total Projects</p>
          </div>
          <div class="summary-card">
            <h3>${reports.summary.activeProjects}</h3>
            <p>Active Projects</p>
          </div>
          <div class="summary-card">
            <h3>${reports.summary.completedActivities}</h3>
            <p>Completed Activities</p>
          </div>
          <div class="summary-card">
            <h3>${reports.summary.onTrackKPIs}</h3>
            <p>On Track KPIs</p>
          </div>
        </div>

        <h2>Projects</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Status</th>
              <th>Type</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${reports.projects.map(project => `
              <tr>
                <td>${project.project_name}</td>
                <td>${project.project_code}</td>
                <td class="status-${project.project_status}">${project.project_status}</td>
                <td>${project.project_type || 'N/A'}</td>
                <td>${new Date(project.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Activities</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Project</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            ${reports.activities.map(activity => `
              <tr>
                <td>${activity.activity_name}</td>
                <td>${activity.project_code}</td>
                <td class="status-${activity.activity_actual_status}">${activity.activity_actual_status}</td>
                <td>${activity.activity_progress_percentage}%</td>
                <td>${new Date(activity.updated_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
  }

  const renderReportContent = () => {
    if (!reports) return null

    switch (activeReport) {
      case 'summary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{reports.summary.totalProjects}</p>
                  </div>
                  <Archive className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-green-600">{reports.summary.activeProjects}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Activities</p>
                    <p className="text-2xl font-bold text-blue-600">{reports.summary.completedActivities}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">On Track KPIs</p>
                    <p className="text-2xl font-bold text-green-600">{reports.summary.onTrackKPIs}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'projects':
        return (
          <div className="space-y-4">
            {reports.projects.map(project => (
              <Card key={project.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{project.project_name}</h4>
                      <p className="text-sm text-gray-600">{project.project_code}</p>
                      <p className="text-xs text-gray-500">{project.project_type}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.project_status === 'active' ? 'bg-green-100 text-green-800' :
                        project.project_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.project_status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 'activities':
        return (
          <div className="space-y-4">
            {reports.activities.map(activity => (
              <Card key={activity.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{activity.activity_name}</h4>
                      <p className="text-sm text-gray-600">{activity.project_code}</p>
                      <p className="text-xs text-gray-500">{activity.activity_division}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${Math.min(activity.activity_progress_percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {activity.activity_progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium mt-1 inline-block ${
                        activity.activity_completed ? 'bg-green-100 text-green-800' :
                        activity.activity_delayed ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.activity_actual_status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 'kpis':
        return (
          <div className="space-y-4">
            {reports.kpis.map(kpi => {
              const progress = kpi.planned_value > 0 ? (kpi.actual_value / kpi.planned_value * 100) : 0
              return (
                <Card key={kpi.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{kpi.kpi_name}</h4>
                        <p className="text-sm text-gray-600">Target: {kpi.target_date}</p>
                        <p className="text-xs text-gray-500">
                          Planned: {kpi.planned_value} | Actual: {kpi.actual_value}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                progress >= 100 ? 'bg-green-600' :
                                progress >= 80 ? 'bg-blue-600' :
                                progress >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium mt-1 inline-block ${
                          kpi.status === 'on_track' ? 'bg-green-100 text-green-800' :
                          kpi.status === 'delayed' ? 'bg-red-100 text-red-800' :
                          kpi.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {kpi.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )

      case 'financial':
        const totalContractValue = reports.projects.reduce((sum, p) => sum + (p.contract_amount || 0), 0)
        const completedValue = reports.activities
          .filter(a => a.activity_completed)
          .reduce((sum, a) => sum + (a.total_value || 0), 0)
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Total Contract Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      AED {(totalContractValue || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Completed Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      AED {(completedValue || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Remaining Value</p>
                    <p className="text-2xl font-bold text-blue-600">
                      AED {((totalContractValue || 0) - (completedValue || 0)).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-primary-600 h-4 rounded-full"
                  style={{ width: `${totalContractValue > 0 ? (completedValue / totalContractValue * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                Completion Rate: {totalContractValue > 0 ? ((completedValue / totalContractValue) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have permission to access reports. This feature is only available to managers and administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Generate and export project reports</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={generateReport} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={generateReport} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'projects', label: 'Projects', icon: Archive },
          { id: 'activities', label: 'Activities', icon: Target },
          { id: 'kpis', label: 'KPIs', icon: TrendingUp },
          { id: 'financial', label: 'Financial', icon: PieChart }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                activeReport === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              onClick={() => exportReport('pdf')}
              disabled={loading || !reports}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={() => exportReport('excel')}
              disabled={loading || !reports}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              onClick={() => exportReport('csv')}
              disabled={loading || !reports}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Report Content */}
      {!loading && reports && (
        <Card>
          <CardContent className="p-6">
            {renderReportContent()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}


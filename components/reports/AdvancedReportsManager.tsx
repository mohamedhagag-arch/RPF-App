'use client'

import { useState, useEffect } from 'react'
import { usePlanningBOQActivities } from '@/lib/usePlanning'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateLookaheadReport,
  generateProjectSummary,
  getRemainingWorkBreakdown,
  getWeekNumber,
  formatReportForExport,
  type WorkReport,
  type LookaheadReport,
  type ProjectSummary
} from '@/lib/reportingSystem'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  FileText,
  BarChart3
} from 'lucide-react'

type ReportType = 'daily' | 'weekly' | 'monthly' | 'lookahead' | 'summary'

export function AdvancedReportsManager() {
  const { activities, loading } = usePlanningBOQActivities()
  const [selectedReport, setSelectedReport] = useState<ReportType>('daily')
  const [dailyReport, setDailyReport] = useState<WorkReport | null>(null)
  const [weeklyReport, setWeeklyReport] = useState<WorkReport | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<WorkReport | null>(null)
  const [lookaheadReport, setLookaheadReport] = useState<LookaheadReport | null>(null)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)

  useEffect(() => {
    if (activities.length > 0) {
      generateReports()
    }
  }, [activities])

  const generateReports = () => {
    if (activities.length === 0) return

    setDailyReport(generateDailyReport(activities))
    setWeeklyReport(generateWeeklyReport(activities))
    setMonthlyReport(generateMonthlyReport(activities))
    setLookaheadReport(generateLookaheadReport(activities))
    setSummary(generateProjectSummary(activities))
  }

  const exportReport = (report: WorkReport) => {
    const formatted = formatReportForExport(report)
    const json = JSON.stringify(formatted, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.period}-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Advanced Reports & Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Daily, Weekly, Monthly reports with Lookahead planning
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedReport === 'daily' ? 'primary' : 'outline'}
          onClick={() => setSelectedReport('daily')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Daily
        </Button>
        <Button
          variant={selectedReport === 'weekly' ? 'primary' : 'outline'}
          onClick={() => setSelectedReport('weekly')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Weekly
        </Button>
        <Button
          variant={selectedReport === 'monthly' ? 'primary' : 'outline'}
          onClick={() => setSelectedReport('monthly')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Monthly
        </Button>
        <Button
          variant={selectedReport === 'lookahead' ? 'primary' : 'outline'}
          onClick={() => setSelectedReport('lookahead')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Lookahead
        </Button>
        <Button
          variant={selectedReport === 'summary' ? 'primary' : 'outline'}
          onClick={() => setSelectedReport('summary')}
        >
          <FileText className="w-4 h-4 mr-2" />
          Summary
        </Button>
      </div>

      {/* Project Summary Overview */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold">{summary.byPeriod.today}</div>
                <div className="text-sm text-gray-600">Today's Work</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold">{summary.byPeriod.thisWeek}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <div className="text-2xl font-bold">{summary.byPeriod.thisMonth}</div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                <div className="text-2xl font-bold">{summary.progress.percentage.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Overall Progress</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Report */}
      {selectedReport === 'daily' && dailyReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Daily Report - {dailyReport.startDate.toLocaleDateString()}</CardTitle>
              <Button onClick={() => exportReport(dailyReport)} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReportSummary report={dailyReport} />
            <ReportActivitiesList activities={dailyReport.activities} />
          </CardContent>
        </Card>
      )}

      {/* Weekly Report */}
      {selectedReport === 'weekly' && weeklyReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Weekly Report - Week {getWeekNumber(weeklyReport.startDate)} ({weeklyReport.startDate.toLocaleDateString()} - {weeklyReport.endDate.toLocaleDateString()})
              </CardTitle>
              <Button onClick={() => exportReport(weeklyReport)} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReportSummary report={weeklyReport} />
            <ReportActivitiesList activities={weeklyReport.activities} />
          </CardContent>
        </Card>
      )}

      {/* Monthly Report */}
      {selectedReport === 'monthly' && monthlyReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Monthly Report - {monthlyReport.startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <Button onClick={() => exportReport(monthlyReport)} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReportSummary report={monthlyReport} />
            <ReportActivitiesList activities={monthlyReport.activities} />
          </CardContent>
        </Card>
      )}

      {/* Lookahead Report */}
      {selectedReport === 'lookahead' && lookaheadReport && (
        <div className="space-y-4">
          {/* Current Week */}
          <Card>
            <CardHeader>
              <CardTitle>Current Week - Week {lookaheadReport.currentWeek.weekNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {lookaheadReport.currentWeek.plannedActivities.length}
                  </div>
                  <div className="text-sm text-gray-600">Planned</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {lookaheadReport.currentWeek.completedActivities.length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-600">
                    {lookaheadReport.currentWeek.inProgressActivities.length}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
              <ReportActivitiesList activities={lookaheadReport.currentWeek.plannedActivities} />
            </CardContent>
          </Card>

          {/* Next Week */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Next Week - Week {lookaheadReport.nextWeek.weekNumber}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-purple-50 rounded">
                <div className="text-lg font-semibold text-purple-900">
                  Estimated Workload: {lookaheadReport.nextWeek.estimatedWorkload} units
                </div>
                <div className="text-sm text-purple-700">
                  {lookaheadReport.nextWeek.plannedActivities.length} activities scheduled
                </div>
              </div>
              <ReportActivitiesList activities={lookaheadReport.nextWeek.plannedActivities} />
            </CardContent>
          </Card>

          {/* Critical Path */}
          {lookaheadReport.upcoming.criticalPath.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Path - Requires Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportActivitiesList activities={lookaheadReport.upcoming.criticalPath} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Report */}
      {selectedReport === 'summary' && summary && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Total Work</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Planned:</span>
                      <span className="font-semibold">{summary.totalWork.planned}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual:</span>
                      <span className="font-semibold text-green-600">{summary.totalWork.actual}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-semibold text-orange-600">{summary.totalWork.remaining}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Progress Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Percentage:</span>
                      <span className="font-semibold">{summary.progress.percentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-semibold ${
                        summary.progress.status === 'on_track' ? 'text-blue-600' :
                        summary.progress.status === 'ahead' ? 'text-green-600' :
                        summary.progress.status === 'at_risk' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {summary.progress.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Work by Period</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Today:</span>
                      <span className="font-semibold">{summary.byPeriod.today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">This Week:</span>
                      <span className="font-semibold">{summary.byPeriod.thisWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">This Month:</span>
                      <span className="font-semibold">{summary.byPeriod.thisMonth}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Remaining Work Breakdown</h4>
                <div className="space-y-2">
                  {(() => {
                    const remaining = getRemainingWorkBreakdown(activities)
                    return (
                      <>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Not Started:</span>
                          <span className="font-semibold">{remaining.byStatus.notStarted}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>In Progress:</span>
                          <span className="font-semibold">{remaining.byStatus.inProgress}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Delayed:</span>
                          <span className="font-semibold text-red-600">{remaining.byStatus.delayed}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Helper Components
function ReportSummary({ report }: { report: WorkReport }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-lg font-bold">{report.totalPlanned}</div>
        <div className="text-xs text-gray-600">Planned</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-lg font-bold text-green-600">{report.totalActual}</div>
        <div className="text-xs text-gray-600">Actual</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-lg font-bold text-blue-600">{report.progressPercentage.toFixed(1)}%</div>
        <div className="text-xs text-gray-600">Progress</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-lg font-bold text-green-600">{report.completedActivities}</div>
        <div className="text-xs text-gray-600">Completed</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-lg font-bold text-yellow-600">{report.ongoingActivities}</div>
        <div className="text-xs text-gray-600">Ongoing</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-lg font-bold text-red-600">{report.delayedActivities}</div>
        <div className="text-xs text-gray-600">Delayed</div>
      </div>
    </div>
  )
}

function ReportActivitiesList({ activities }: { activities: any[] }) {
  if (activities.length === 0) {
    return <div className="text-center py-8 text-gray-500">No activities in this period</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {activities.slice(0, 10).map((activity) => (
            <tr key={activity.id}>
              <td className="px-4 py-3 text-sm">{activity.activity_name}</td>
              <td className="px-4 py-3 text-sm">{activity.project_code}</td>
              <td className="px-4 py-3 text-sm">{activity.planned_units}</td>
              <td className="px-4 py-3 text-sm">{activity.actual_units}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(activity.activity_progress_percentage, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{activity.activity_progress_percentage.toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  activity.activity_completed ? 'bg-green-100 text-green-800' :
                  activity.activity_delayed ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {activity.activity_completed ? 'Completed' :
                   activity.activity_delayed ? 'Delayed' : 'In Progress'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {activities.length > 10 && (
        <div className="text-center py-3 text-sm text-gray-500">
          Showing 10 of {activities.length} activities
        </div>
      )}
    </div>
  )
}


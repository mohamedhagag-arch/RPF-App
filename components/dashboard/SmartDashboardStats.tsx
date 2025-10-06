'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  FolderOpen, 
  ClipboardList, 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface DashboardStats {
  totalProjects: number
  totalActivities: number
  totalKPIs: number
  averageProgress: number
  totalUsers: number
  totalContractValue: number
  completedActivities: number
  delayedActivities: number
  onHoldProjects: number
  recentActivities: any[]
  topPerformingProjects: any[]
}

interface SmartDashboardStatsProps {
  stats: DashboardStats
}

export function SmartDashboardStats({ stats }: SmartDashboardStatsProps) {
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600 dark:text-green-400'
    if (progress >= 60) return 'text-blue-600 dark:text-blue-400'
    if (progress >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getProgressIcon = (progress: number) => {
    if (progress >= 80) return <CheckCircle className="h-4 w-4" />
    if (progress >= 60) return <TrendingUp className="h-4 w-4" />
    if (progress >= 40) return <Clock className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Projects */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProjects}</div>
          <p className="text-xs text-muted-foreground">
            Active projects in system
          </p>
        </CardContent>
      </Card>

      {/* Total Activities */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActivities}</div>
          <p className="text-xs text-muted-foreground">
            BOQ activities tracked
          </p>
        </CardContent>
      </Card>

      {/* Average Progress */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
          <div className={`${getProgressColor(stats.averageProgress)}`}>
            {getProgressIcon(stats.averageProgress)}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getProgressColor(stats.averageProgress)}`}>
            {stats.averageProgress.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Across all projects
          </p>
        </CardContent>
      </Card>

      {/* Total KPIs */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalKPIs}</div>
          <p className="text-xs text-muted-foreground">
            Performance indicators
          </p>
        </CardContent>
      </Card>

      {/* Contract Value */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(stats.totalContractValue / 1000000).toFixed(1)}M
          </div>
          <p className="text-xs text-muted-foreground">
            Total project value
          </p>
        </CardContent>
      </Card>

      {/* Completed Activities */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.completedActivities}
          </div>
          <p className="text-xs text-muted-foreground">
            Activities finished
          </p>
        </CardContent>
      </Card>

      {/* Delayed Activities */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delayed</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {stats.delayedActivities}
          </div>
          <p className="text-xs text-muted-foreground">
            Behind schedule
          </p>
        </CardContent>
      </Card>

      {/* On Hold Projects */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">On Hold</CardTitle>
          <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {stats.onHoldProjects}
          </div>
          <p className="text-xs text-muted-foreground">
            Projects paused
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

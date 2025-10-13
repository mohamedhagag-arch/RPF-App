'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Zap,
  DollarSign
} from 'lucide-react'

interface SmartStatsProps {
  stats: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalActivities: number
    completedActivities: number
    delayedActivities: number
    onTrackActivities: number
    averageProgress: number
    totalContractValue: number
    completedValue: number
  }
}

export function SmartDashboardStats({ stats }: SmartStatsProps) {
  // Calculate smart metrics
  const completionRate = stats.totalProjects > 0 
    ? (stats.completedProjects / stats.totalProjects) * 100 
    : 0
  
  const activityCompletionRate = stats.totalActivities > 0
    ? (stats.completedActivities / stats.totalActivities) * 100
    : 0
  
  const delayRate = stats.totalActivities > 0
    ? (stats.delayedActivities / stats.totalActivities) * 100
    : 0
  
  const financialProgress = stats.totalContractValue > 0
    ? (stats.completedValue / stats.totalContractValue) * 100
    : 0

  const performanceScore = Math.round(
    (activityCompletionRate * 0.4) + 
    (stats.averageProgress * 0.3) + 
    ((100 - delayRate) * 0.3)
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overall Performance Score */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
                Performance Score
              </p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                {performanceScore}%
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {performanceScore >= 80 ? 'Excellent' : 
                 performanceScore >= 60 ? 'Good' : 
                 performanceScore >= 40 ? 'Fair' : 'Needs Attention'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              performanceScore >= 80 ? 'bg-green-500' :
              performanceScore >= 60 ? 'bg-blue-500' :
              performanceScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {performanceScore >= 70 ? <Zap className="w-6 h-6 text-white" /> : 
               performanceScore >= 40 ? <Activity className="w-6 h-6 text-white" /> :
               <AlertTriangle className="w-6 h-6 text-white" />}
            </div>
          </div>
          
          {/* Mini Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-blue-200 dark:bg-blue-950 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  performanceScore >= 80 ? 'bg-green-600' :
                  performanceScore >= 60 ? 'bg-blue-600' :
                  performanceScore >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${performanceScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Status */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Projects
            </p>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalProjects}
              </span>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900 rounded">
                <div className="font-semibold text-green-700 dark:text-green-300">
                  {stats.activeProjects}
                </div>
                <div className="text-green-600 dark:text-green-400">Active</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900 rounded">
                <div className="font-semibold text-blue-700 dark:text-blue-300">
                  {stats.completedProjects}
                </div>
                <div className="text-blue-600 dark:text-blue-400">Done</div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  {stats.totalProjects - stats.activeProjects - stats.completedProjects}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Other</div>
              </div>
            </div>
            
            {/* Completion Rate */}
            <div className="pt-2 border-t dark:border-gray-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Completion</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {completionRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Progress */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Activities
            </p>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalActivities}
              </span>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            
            <div className="space-y-2">
              {/* Completed */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.completedActivities}
                  </span>
                  <span className="text-gray-500">
                    ({activityCompletionRate.toFixed(0)}%)
                  </span>
                </div>
              </div>
              
              {/* On Track */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">On Track</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {stats.onTrackActivities}
                </span>
              </div>
              
              {/* Delayed */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Delayed</span>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {stats.delayedActivities}
                </span>
              </div>
            </div>
            
            {/* Average Progress */}
            <div className="pt-2 border-t dark:border-gray-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Avg Progress</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {stats.averageProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.averageProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-800 border-green-200 dark:border-green-700 hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-300">
              Financial
            </p>
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">Total Value</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                AED {(stats.totalContractValue || 0).toLocaleString()}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-green-950 rounded">
                <div className="text-green-700 dark:text-green-400">Completed</div>
                <div className="font-semibold text-green-900 dark:text-green-200 mt-1">
                  {(stats.completedValue || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-green-950 rounded">
                <div className="text-green-700 dark:text-green-400">Remaining</div>
                <div className="font-semibold text-green-900 dark:text-green-200 mt-1">
                  {((stats.totalContractValue || 0) - (stats.completedValue || 0)).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Financial Progress */}
            <div className="pt-2 border-t border-green-300 dark:border-green-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-600 dark:text-green-400">Progress</span>
                <span className="font-semibold text-green-900 dark:text-green-100">
                  {financialProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-green-200 dark:bg-green-950 rounded-full h-2">
                <div 
                  className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(financialProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


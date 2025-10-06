'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertTriangle, TrendingDown, Clock, Target } from 'lucide-react'

interface SmartAlertsProps {
  stats: {
    delayedActivities: number
    totalActivities: number
    averageProgress: number
    onHoldProjects: number
  }
  recentActivities: Array<{
    id: string
    project_code: string
    activity_name: string
    status: string
    progress?: number
  }>
}

export function SmartAlerts({ stats, recentActivities }: SmartAlertsProps) {
  const alerts = []

  // Critical: High delay rate
  const delayRate = stats.totalActivities > 0 
    ? (stats.delayedActivities / stats.totalActivities) * 100 
    : 0
  
  if (delayRate > 30) {
    alerts.push({
      type: 'critical',
      icon: AlertTriangle,
      title: 'High Delay Rate',
      message: `${stats.delayedActivities} activities (${delayRate.toFixed(1)}%) are delayed`,
      color: 'red'
    })
  }

  // Warning: Low average progress
  if (stats.averageProgress < 50 && stats.totalActivities > 0) {
    alerts.push({
      type: 'warning',
      icon: TrendingDown,
      title: 'Low Average Progress',
      message: `Average progress is ${stats.averageProgress.toFixed(1)}% - needs attention`,
      color: 'yellow'
    })
  }

  // Info: Projects on hold
  if (stats.onHoldProjects > 0) {
    alerts.push({
      type: 'info',
      icon: Clock,
      title: 'Projects On Hold',
      message: `${stats.onHoldProjects} projects are currently on hold`,
      color: 'orange'
    })
  }

  // Recent delayed activities
  const recentDelayed = recentActivities.filter(a => a.status === 'delayed').slice(0, 3)
  if (recentDelayed.length > 0) {
    alerts.push({
      type: 'warning',
      icon: Target,
      title: 'Recently Delayed',
      message: `${recentDelayed.length} activities recently became delayed`,
      color: 'amber'
    })
  }

  if (alerts.length === 0) {
    return (
      <Card className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-full">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                All Systems Healthy
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                No critical alerts at this time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const bgColors = {
          red: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700',
          yellow: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700',
          orange: 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-700',
          amber: 'bg-amber-50 dark:bg-amber-900 border-amber-200 dark:border-amber-700'
        }
        
        const iconColors = {
          red: 'bg-red-500',
          yellow: 'bg-yellow-500',
          orange: 'bg-orange-500',
          amber: 'bg-amber-500'
        }
        
        const textColors = {
          red: 'text-red-900 dark:text-red-100',
          yellow: 'text-yellow-900 dark:text-yellow-100',
          orange: 'text-orange-900 dark:text-orange-100',
          amber: 'text-amber-900 dark:text-amber-100'
        }
        
        const AlertIcon = alert.icon

        return (
          <Card key={index} className={bgColors[alert.color as keyof typeof bgColors]}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${iconColors[alert.color as keyof typeof iconColors]} rounded-full flex-shrink-0`}>
                  <AlertIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${textColors[alert.color as keyof typeof textColors]}`}>
                    {alert.title}
                  </p>
                  <p className={`text-sm mt-1 ${textColors[alert.color as keyof typeof textColors]} opacity-80`}>
                    {alert.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


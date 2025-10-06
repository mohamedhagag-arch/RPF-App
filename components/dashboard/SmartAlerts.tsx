'use client'

import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react'

interface AlertStats {
  delayedActivities: number
  totalActivities: number
  averageProgress: number
  onHoldProjects: number
}

interface SmartAlertsProps {
  stats: AlertStats
  recentActivities?: any[]
}

export function SmartAlerts({ stats, recentActivities }: SmartAlertsProps) {
  const alerts = []

  // Delayed Activities Alert
  if (stats.delayedActivities > 0) {
    const delayPercentage = (stats.delayedActivities / stats.totalActivities) * 100
    alerts.push({
      type: 'warning',
      title: 'Delayed Activities',
      description: `${stats.delayedActivities} activities are behind schedule (${delayPercentage.toFixed(1)}% of total)`,
      icon: <AlertTriangle className="h-4 w-4" />,
      priority: delayPercentage > 20 ? 'high' : 'medium'
    })
  }

  // Low Progress Alert
  if (stats.averageProgress < 30) {
    alerts.push({
      type: 'error',
      title: 'Low Overall Progress',
      description: `Average progress is only ${stats.averageProgress.toFixed(1)}%. Consider reviewing project timelines.`,
      icon: <TrendingDown className="h-4 w-4" />,
      priority: 'high'
    })
  }

  // On Hold Projects Alert
  if (stats.onHoldProjects > 0) {
    alerts.push({
      type: 'info',
      title: 'Projects On Hold',
      description: `${stats.onHoldProjects} project(s) are currently on hold and may need attention.`,
      icon: <Clock className="h-4 w-4" />,
      priority: 'medium'
    })
  }

  // Good Progress Alert
  if (stats.averageProgress > 80) {
    alerts.push({
      type: 'success',
      title: 'Excellent Progress',
      description: `Great work! Average progress is ${stats.averageProgress.toFixed(1)}%. Keep it up!`,
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 'low'
    })
  }

  // No alerts case
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'All Systems Normal',
      description: 'No critical issues detected. All projects are running smoothly.',
      icon: <CheckCircle className="h-4 w-4" />,
      priority: 'low'
    })
  }

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive'
      case 'warning': return 'default'
      case 'success': return 'default'
      case 'info': return 'default'
      default: return 'default'
    }
  }

  const getAlertClassName = (type: string, priority: string) => {
    const baseClass = 'border-l-4'
    switch (type) {
      case 'error':
        return `${baseClass} border-red-500 bg-red-50 dark:bg-red-900/20`
      case 'warning':
        return `${baseClass} border-orange-500 bg-orange-50 dark:bg-orange-900/20`
      case 'success':
        return `${baseClass} border-green-500 bg-green-50 dark:bg-green-900/20`
      case 'info':
        return `${baseClass} border-blue-500 bg-blue-50 dark:bg-blue-900/20`
      default:
        return `${baseClass} border-gray-500 bg-gray-50 dark:bg-gray-900/20`
    }
  }

  // Sort alerts by priority
  const sortedAlerts = alerts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedAlerts.map((alert, index) => (
            <Alert 
              key={index}
              className={getAlertClassName(alert.type, alert.priority)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {alert.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">
                    {alert.title}
                  </h4>
                  <p className="mt-1 text-sm">
                    {alert.description}
                  </p>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

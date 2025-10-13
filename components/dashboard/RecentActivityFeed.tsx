'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Clock, CheckCircle, AlertCircle, Activity as ActivityIcon } from 'lucide-react'

interface RecentActivity {
  id: string
  project_code: string
  activity_name: string
  status: string
  progress?: number
  updated_at: string
}

interface RecentActivityFeedProps {
  activities: RecentActivity[]
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'delayed': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'on_track': return <ActivityIcon className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
      case 'delayed': return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
      case 'on_track': return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'delayed': return 'Delayed'
      case 'on_track': return 'On Track'
      case 'pending': return 'Pending'
      default: return status
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Clock className="w-5 h-5 text-blue-500" />
          Recent Activity Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No recent activities
            </p>
          ) : (
            activities.map((activity) => (
              <div 
                key={activity.id}
                className={`p-3 rounded-lg border ${getStatusColor(activity.status)} transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(activity.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.activity_name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {activity.project_code}
                      </p>
                      
                      {/* Progress bar if available */}
                      {activity.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-semibold">{activity.progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${
                                activity.progress >= 100 ? 'bg-green-600' :
                                activity.progress >= 80 ? 'bg-blue-600' :
                                activity.progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(activity.progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'completed' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' :
                      activity.status === 'delayed' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300' :
                      activity.status === 'on_track' ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {getStatusText(activity.status)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimeAgo(activity.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}


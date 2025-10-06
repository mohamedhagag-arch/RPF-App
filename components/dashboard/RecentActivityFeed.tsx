'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Clock, User, FileText, BarChart3, Settings, AlertCircle } from 'lucide-react'

interface Activity {
  id: string
  project_code: string
  activity_name: string
  status: string
  updated_at: string
  user_name?: string
  type?: string
  description?: string
}

interface RecentActivityFeedProps {
  activities: Activity[]
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const getActivityIcon = (type?: string, status?: string) => {
    switch (type?.toLowerCase()) {
      case 'project': return <FileText className="h-4 w-4" />
      case 'kpi': return <BarChart3 className="h-4 w-4" />
      case 'boq': return <FileText className="h-4 w-4" />
      case 'settings': return <Settings className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'in progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'updated': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'created': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'deleted': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString()
  }

  const recentActivities = activities
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.activity_name || 'Activity Update'}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(activity.status || 'updated')}`}
                    >
                      {activity.status || 'Updated'}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {activity.project_code} • {activity.description || 'Activity was updated'}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(activity.updated_at)}
                    </span>
                    {activity.user_name && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.user_name}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No recent activities</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Activities will appear here as they happen</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

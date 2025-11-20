'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  FileText,
  Eye,
  Trash2,
  Edit,
  Check,
  X,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

interface ActivityRecord {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  action_type: string
  entity_type: string | null
  entity_id: string | null
  page_path: string | null
  page_title: string | null
  description: string | null
  metadata: any
  current_page: string | null
  is_active: boolean | null
  user_agent: string | null
  session_id: string | null
  created_at: string
}

export default function ActivityLogPage() {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(false)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
    end: new Date().toISOString().split('T')[0],
  })
  
  // Calculate 7 days ago for validation
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const itemsPerPage = 50

  const isAdmin = appUser?.role === 'admin'
  const searchParams = useSearchParams()

  useEffect(() => {
    if (isAdmin) {
      // Check if there's a user filter from URL
      const userFromUrl = searchParams?.get('user')
      if (userFromUrl && userFromUrl !== filterUser) {
        setFilterUser(userFromUrl)
      }
      
      loadActivities()
      loadActiveUsers()
    }
  }, [isAdmin, page, filterAction, filterEntity, filterUser, dateRange, filterActiveOnly, searchParams])

  const loadActiveUsers = async () => {
    try {
      const response = await fetch('/api/users/activity?type=online')
      const data = await response.json()
      if (data.success) {
        setActiveUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading active users:', error)
    }
  }

  const loadActivities = async () => {
    if (!isAdmin) return

    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      
      // Always filter to last 7 days
      const sevenDaysAgoDate = sevenDaysAgo.toISOString()
      
      let query = (supabase as any)
        .from('user_activities')
        .select('*', { count: 'exact' })
        .gte('created_at', sevenDaysAgoDate) // Only show last 7 days
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)

      // Apply filters
      if (filterAction !== 'all') {
        query = query.eq('action_type', filterAction)
      }
      if (filterEntity !== 'all') {
        query = query.eq('entity_type', filterEntity)
      }
      if (filterUser !== 'all') {
        query = query.eq('user_email', filterUser)
      }
      
      // Apply date range (already limited to 7 days by the initial filter)
      if (dateRange.start) {
        const selectedDate = new Date(dateRange.start)
        // Ensure date is not older than 7 days
        const actualStartDate = selectedDate < sevenDaysAgo ? sevenDaysAgo : selectedDate
        query = query.gte('created_at', actualStartDate.toISOString().split('T')[0])
      }
      
      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`)
      }
      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%,page_title.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%`)
      }
      if (filterActiveOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error, count } = await query

      if (error) throw error

      setActivities(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view': return <Eye className="h-4 w-4" />
      case 'create': return <FileText className="h-4 w-4" />
      case 'update': return <Edit className="h-4 w-4" />
      case 'delete': return <Trash2 className="h-4 w-4" />
      case 'approve': return <Check className="h-4 w-4" />
      case 'reject': return <X className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'view': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      case 'create': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'update': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'delete': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'approve': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'reject': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const exportActivities = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // Only export last 7 days
      const sevenDaysAgoDate = sevenDaysAgo.toISOString()
      
      let query = (supabase as any)
        .from('user_activities')
        .select('*')
        .gte('created_at', sevenDaysAgoDate) // Only export last 7 days
        .order('created_at', { ascending: false })
        .limit(10000) // Limit export

      if (filterAction !== 'all') query = query.eq('action_type', filterAction)
      if (filterEntity !== 'all') query = query.eq('entity_type', filterEntity)
      if (filterUser !== 'all') query = query.eq('user_email', filterUser)
      
      // Apply date range within 7 days limit
      const maxStartDate = sevenDaysAgo.toISOString().split('T')[0]
      const actualStartDate = dateRange.start && new Date(dateRange.start) < sevenDaysAgo 
        ? maxStartDate 
        : (dateRange.start || maxStartDate)
      query = query.gte('created_at', actualStartDate)
      
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`)

      const { data, error } = await query
      if (error) throw error

      // Convert to CSV
      const headers = ['Date', 'User', 'Action', 'Entity', 'Page', 'Description']
      const rows = (data || []).map((activity: ActivityRecord) => [
        format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss'),
        activity.user_email || activity.user_name || 'Unknown',
        activity.action_type,
        activity.entity_type || 'N/A',
        activity.page_title || activity.page_path || 'N/A',
        activity.description || 'N/A',
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting activities:', error)
      alert('Failed to export activities')
    }
  }

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(activities.map(a => a.action_type))).sort()
  const uniqueEntities = Array.from(new Set(activities.map(a => a.entity_type).filter(Boolean))).sort()
  const uniqueUsers = Array.from(new Set(activities.map(a => a.user_email).filter(Boolean))).sort()

  if (!isAdmin) {
    return (
      <PermissionPage permission="activity_log.view">
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                You don't have permission to view activity logs.
              </p>
            </CardContent>
          </Card>
        </div>
      </PermissionPage>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Activity Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all user activities across the application
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadActivities} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportActivities} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="activeOnly"
              checked={filterActiveOnly}
              onChange={(e) => { setFilterActiveOnly(e.target.checked); setPage(1) }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="activeOnly" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Show only active users' activities
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadActivities()}
                  placeholder="Search activities..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Action Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entity Type
              </label>
              <select
                value={filterEntity}
                onChange={(e) => { setFilterEntity(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Entities</option>
                {uniqueEntities.map(entity => (
                  <option key={entity || ''} value={entity || ''}>{entity || 'N/A'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User
              </label>
              <select
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user || ''} value={user || ''}>{user || 'Unknown'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date (Max: 7 days ago)
              </label>
              <Input
                type="date"
                min={sevenDaysAgo.toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                value={dateRange.start || ''}
                onChange={(e) => {
                  const selectedDate = e.target.value
                  const selected = new Date(selectedDate)
                  // Enforce 7-day limit
                  if (selected < sevenDaysAgo) {
                    setDateRange({ ...dateRange, start: sevenDaysAgo.toISOString().split('T')[0] })
                  } else {
                    setDateRange({ ...dateRange, start: selectedDate })
                  }
                  setPage(1)
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Activities are kept for 7 days only
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setPage(1) }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Activities ({totalCount.toLocaleString()})
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                Last 7 days only
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No activities found
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getActionColor(activity.action_type)}`}>
                          {getActionIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {activity.user_name || activity.user_email || 'Unknown User'}
                            </span>
                            {activeUsers.some(u => u.email === activity.user_email) && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                Online
                              </span>
                            )}
                            <span className="text-gray-500 dark:text-gray-400">•</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action_type)}`}>
                              {activity.action_type}
                            </span>
                            {activity.entity_type && (
                              <>
                                <span className="text-gray-500 dark:text-gray-400">•</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {activity.entity_type}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {activity.description || activity.page_title || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            {activity.page_title && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {activity.page_title}
                              </span>
                            )}
                            {activity.page_path && activity.page_path !== activity.page_title && (
                              <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                                <span className="truncate max-w-xs">{activity.page_path}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm:ss')}
                            </span>
                            {activity.metadata?.query_params && (
                              <span className="text-gray-400 dark:text-gray-500">
                                {activity.metadata.query_params}
                              </span>
                            )}
                          </div>
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">
                                View Details
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                                {JSON.stringify(activity.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, totalCount)} of {totalCount} activities
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * itemsPerPage >= totalCount}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


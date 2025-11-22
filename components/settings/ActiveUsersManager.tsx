'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Users, Wifi, WifiOff, Clock, RefreshCw, History } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface ActiveUser {
  user_id: string
  email: string
  full_name: string
  role: string
  last_seen: string
  is_online: boolean
  visit_count?: number
}

export function ActiveUsersManager() {
  const [onlineUsers, setOnlineUsers] = useState<ActiveUser[]>([])
  const [todayUsers, setTodayUsers] = useState<ActiveUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'online' | 'today'>('online')
  const router = useRouter()

  const handleViewHistory = (userEmail: string) => {
    router.push(`/activity-log?user=${encodeURIComponent(userEmail)}`)
  }

  // Fetch users
  const fetchUsers = useCallback(async (type: 'online' | 'today') => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/users/activity?type=${type}`)
      const data = await response.json()

      if (data.success) {
        if (type === 'online') {
          setOnlineUsers(data.users || [])
        } else {
          setTodayUsers(data.users || [])
        }
      } else {
        console.error('Error fetching users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchUsers('online')
    fetchUsers('today')
  }, [fetchUsers])

  // Auto-refresh every 10 seconds (real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers(activeTab)
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [activeTab, fetchUsers])
  
  // Also refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUsers(activeTab)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeTab, fetchUsers])

  // Send heartbeat to keep user online
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const sessionId = sessionStorage.getItem('session_id') || 
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('session_id', sessionId)

        const response = await fetch('/api/users/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_online: true,
            session_id: sessionId,
            user_agent: navigator.userAgent
          })
        })
        
        // Silently handle heartbeat responses - errors are non-critical
        if (!response.ok && response.status !== 401) {
          // Only log non-401 errors in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Heartbeat response not OK:', response.status)
          }
        }
      } catch (error) {
        // Silently handle heartbeat errors - they're not critical
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Heartbeat error (non-critical):', error)
        }
      }
    }

    // Send heartbeat immediately
    sendHeartbeat()

    // Send heartbeat every 30 seconds (real-time)
    const heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds
    
    // Also send heartbeat when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendHeartbeat()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Send heartbeat when window gains focus
    const handleFocus = () => {
      sendHeartbeat()
    }
    
    window.addEventListener('focus', handleFocus)

    // Mark as offline when page unloads
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/users/activity', JSON.stringify({
        is_online: false
      }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const formatLastSeen = (lastSeen: string) => {
    try {
      const date = new Date(lastSeen)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'text-red-600 dark:text-red-400'
      case 'manager':
        return 'text-blue-600 dark:text-blue-400'
      case 'viewer':
        return 'text-gray-600 dark:text-gray-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle>Active Users</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchUsers(activeTab)
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'online'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Currently Online ({onlineUsers.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'today'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Visited Today ({todayUsers.length})
              </div>
            </button>
          </div>

          {/* Online Users List */}
          {activeTab === 'online' && (
            <div className="space-y-2">
              {onlineUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <WifiOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No users currently online</p>
                </div>
              ) : (
                onlineUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role || 'viewer'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatLastSeen(user.last_seen)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(user.email)}
                        className="flex items-center gap-1"
                        title="View User Activity History"
                      >
                        <History className="h-3 w-3" />
                        History
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Today Users List */}
          {activeTab === 'today' && (
            <div className="space-y-2">
              {todayUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No users visited today</p>
                </div>
              ) : (
                todayUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        {user.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                          {user.visit_count && user.visit_count > 1 && (
                            <span className="ml-2">({user.visit_count} visits)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role || 'viewer'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatLastSeen(user.last_seen)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(user.email)}
                        className="flex items-center gap-1"
                        title="View User Activity History"
                      >
                        <History className="h-3 w-3" />
                        History
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


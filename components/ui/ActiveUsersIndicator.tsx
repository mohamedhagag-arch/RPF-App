'use client'

import { useState, useEffect } from 'react'
import { Users, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface OnlineUser {
  user_id: string
  email: string
  full_name: string
  role: string
  last_seen: string
  is_online: boolean
}

export function ActiveUsersIndicator() {
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await fetch('/api/users/activity?type=online')
        const data = await response.json()

        if (data.success) {
          setOnlineCount(data.count || 0)
          setOnlineUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching online users:', error)
      } finally {
        setLoading(false)
      }
    }

    // Send heartbeat first, then fetch
    const sendHeartbeat = async () => {
      try {
        const sessionId = sessionStorage.getItem('session_id') || 
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('session_id', sessionId)

        await fetch('/api/users/activity', {
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
      } catch (error) {
        console.error('Error sending heartbeat:', error)
      }
    }

    // Send heartbeat immediately, then fetch
    sendHeartbeat().then(() => {
      fetchOnlineUsers()
    })

    // Send heartbeat every 30 seconds and refresh count every 15 seconds (real-time)
    const heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds
    const fetchInterval = setInterval(fetchOnlineUsers, 15000) // 15 seconds

    // Mark as offline when page unloads
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/users/activity', JSON.stringify({
        is_online: false
      }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(fetchInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleClick = () => {
    if (onlineUsers.length > 0) {
      setIsOpen(!isOpen)
    } else {
      router.push('/settings?tab=active-users')
    }
  }
  
  const formatLastSeen = (lastSeen: string) => {
    try {
      const date = new Date(lastSeen)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'Just now'
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
      <div className="relative">
        <button
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative px-4 py-2.5 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600 flex items-center gap-2"
          title="Loading active users..."
          aria-label="Active users"
        >
          <Users className="h-5 w-5 text-gray-500 dark:text-gray-400 animate-pulse" />
        </button>
      </div>
    )
  }

  const hasUsers = onlineCount > 0

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!isOpen) setIsHovered(false)
        }}
        className={`
          relative px-4 py-2.5 rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg flex items-center gap-2
          ${hasUsers 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 border border-green-200 dark:border-green-800/50' 
            : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-gray-200 dark:border-gray-600'
          }
          ${isHovered || isOpen ? 'scale-105' : 'scale-100'}
        `}
        title={`${onlineCount} user${onlineCount !== 1 ? 's' : ''} currently online`}
        aria-label={`${onlineCount} users online`}
      >
        <div className="relative">
          {hasUsers ? (
            <Wifi className="h-5 w-5 text-green-600 dark:text-green-400 transition-transform duration-300" />
          ) : (
            <WifiOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
          
          {/* Pulsing ring effect for active users */}
          {hasUsers && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-8 h-8 rounded-full bg-green-400/30 dark:bg-green-500/20 animate-ping"></div>
              <div className="absolute w-6 h-6 rounded-full bg-green-400/20 dark:bg-green-500/10"></div>
            </div>
          )}
        </div>

        {/* Badge with count */}
        {hasUsers && (
          <span className="h-6 w-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 transform transition-transform duration-200">
            {onlineCount > 99 ? '99+' : onlineCount}
          </span>
        )}

        {/* Active indicator dot */}
        {hasUsers && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm">
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
          </div>
        )}
      </button>

      {/* Dropdown with user list */}
      {isOpen && hasUsers && (
        <div 
          className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false)
            setIsOpen(false)
          }}
        >
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />
                Online Users ({onlineCount})
              </h3>
              <button
                onClick={() => router.push('/settings?tab=active-users')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </button>
            </div>
          </div>
          
          <div className="p-2 space-y-1">
            {onlineUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => router.push('/settings?tab=active-users')}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800">
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.full_name || user.email}
                    </p>
                    <span className={`text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role || 'viewer'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Active {formatLastSeen(user.last_seen)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Tooltip (when dropdown is closed) */}
      {isHovered && !isOpen && (
        <div className="absolute top-full right-0 mt-3 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs font-medium rounded-lg shadow-xl opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-700 dark:border-gray-600">
          <div className="flex items-center gap-2">
            {hasUsers ? (
              <>
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{onlineCount} user{onlineCount !== 1 ? 's' : ''} online</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                <span>No users online</span>
              </>
            )}
          </div>
          <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
        </div>
      )}
    </div>
  )
}


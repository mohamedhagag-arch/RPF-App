'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers'
import { kpiNotificationService, KPINotification } from '@/lib/kpiNotificationService'
import { Bell, Check, X, Clock, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'

interface KPINotificationsDropdownProps {
  onClose?: () => void
}

export function KPINotificationsDropdown({ onClose }: KPINotificationsDropdownProps) {
  const { appUser } = useAuth()
  const [notifications, setNotifications] = useState<KPINotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (appUser?.id) {
      loadNotifications()
      // Refresh notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [appUser?.id])

  const loadNotifications = async () => {
    if (!appUser?.id) {
      console.log('⚠️ No user ID available for loading notifications')
      return
    }

    try {
      setLoading(true)
      setError('')
      console.log(`📥 Loading notifications for user: ${appUser.id} (${appUser.email || appUser.full_name})`)
      const unreadNotifications = await kpiNotificationService.getUnreadNotifications(appUser.id)
      console.log(`📬 Loaded ${unreadNotifications.length} unread notifications`)
      setNotifications(unreadNotifications)
      
      // Always check for pending KPIs when dropdown opens (to catch new ones)
      try {
        console.log('🔄 Checking for pending KPIs that need notifications...')
        await kpiNotificationService.notifyPendingKPIs()
        // Reload after checking
        const updatedNotifications = await kpiNotificationService.getUnreadNotifications(appUser.id)
        setNotifications(updatedNotifications)
        if (updatedNotifications.length > unreadNotifications.length) {
          console.log(`✅ Found ${updatedNotifications.length - unreadNotifications.length} new notification(s)`)
        }
      } catch (err: any) {
        console.error('Error checking pending KPIs:', err)
        // Show error in UI if table doesn't exist
        if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
          setError('Notifications table not found. Please run Database/kpi-notifications-table.sql')
        }
      }
    } catch (err: any) {
      console.error('Error loading notifications:', err)
      // Check if table doesn't exist
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setError('Notifications table not found. Please run Database/kpi-notifications-table.sql')
      } else {
        setError('Failed to load notifications')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    try {
      const success = await kpiNotificationService.markAsRead(notificationId)
      if (success) {
        // Remove from list
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Reload to get updated count
        await loadNotifications()
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const promises = notifications.map(n => 
        n.id ? kpiNotificationService.markAsRead(n.id) : Promise.resolve(false)
      )
      await Promise.all(promises)
      setNotifications([])
      await loadNotifications()
    } catch (err: any) {
      console.error('Error marking all as read:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'kpi_created':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'kpi_approved':
        return <Check className="h-4 w-4 text-green-500" />
      case 'kpi_rejected':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'kpi_created':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'kpi_approved':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'kpi_rejected':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Loading notifications...
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            KPI Notifications
          </h3>
          {notifications.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {error && (
          <div className="p-4 text-center text-red-500 text-sm">
            {error}
          </div>
        )}

        {notifications.length === 0 && !loading && (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No new notifications
            </p>
          </div>
        )}

        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${getNotificationColor(notification.notification_type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getNotificationIcon(notification.notification_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    {notification.metadata && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                        {notification.metadata.project_code && (
                          <div>Project: {notification.metadata.project_code}</div>
                        )}
                        {notification.metadata.activity_name && (
                          <div>Activity: {notification.metadata.activity_name}</div>
                        )}
                        {notification.metadata.quantity && (
                          <div>Quantity: {notification.metadata.quantity}</div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="h-3 w-3" />
                      {notification.created_at && (
                        <span>
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => notification.id && handleMarkAsRead(notification.id, e)}
                    className="h-6 w-6 p-0 flex-shrink-0"
                    title="Mark as read"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  )
}


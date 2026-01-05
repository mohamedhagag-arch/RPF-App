'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Shield, User, Bell, Sparkles } from 'lucide-react'
import { urgentMessagesService } from '@/lib/urgentMessagesService'
import { UrgentMessageChatWindow } from './UrgentMessageChatWindow'
import { UrgentMessagesAdminPanel } from './UrgentMessagesAdminPanel'
import { useAuth } from '@/app/providers'

interface UnreadMessageInfo {
  sender_name: string
  sender_id: string
  conversation_id: string
  conversation_subject: string
  message_count: number
  last_message_at: string
}

export function UrgentMessageFloatingButton() {
  const { appUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessagesInfo, setUnreadMessagesInfo] = useState<UnreadMessageInfo[]>([])
  const [showTooltip, setShowTooltip] = useState(false)
  const isAdmin = appUser?.role === 'admin'

  useEffect(() => {
    // Load initial unread count and info
    loadUnreadData()

    // Subscribe to unread count changes
    const subscription = urgentMessagesService.subscribeToUnreadCount((count) => {
      console.log('Unread count changed via subscription:', { count, isAdmin })
      setUnreadCount(count)
      // Reload unread messages info when count changes
      loadUnreadMessagesInfo()
    })

    // Also subscribe to new messages for real-time updates
    const messagesSubscription = urgentMessagesService.subscribeToAllUnreadMessages((message) => {
      console.log('New unread message received:', { message, isAdmin })
      // Reload unread data when new message arrives
      loadUnreadData()
    })

    // Periodic refresh (every 5 seconds) to ensure count is up to date for both admin and users
    const refreshInterval = setInterval(() => {
      loadUnreadData()
    }, 5000)

    return () => {
      subscription.unsubscribe()
      messagesSubscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [isAdmin])

  const loadUnreadData = async () => {
    await Promise.all([
      loadUnreadCount(),
      loadUnreadMessagesInfo()
    ])
  }

  const loadUnreadCount = async () => {
    try {
      const count = await urgentMessagesService.getUnreadCount()
      console.log('Unread count loaded:', { count, isAdmin })
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const loadUnreadMessagesInfo = async () => {
    try {
      const info = await urgentMessagesService.getUnreadMessagesInfo()
      console.log('Unread messages info loaded:', { count: info.length, info, isAdmin })
      setUnreadMessagesInfo(info)
    } catch (error) {
      console.error('Error loading unread messages info:', error)
    }
  }

  return (
    <>
      {/* Floating Button with Tooltip */}
      <div 
        className="fixed bottom-6 right-6 z-[9998]"
        onMouseEnter={() => unreadCount > 0 && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-16 h-16 bg-gradient-to-br ${
            isAdmin 
              ? 'from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700' 
              : 'from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700'
          } text-white rounded-full shadow-2xl hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group overflow-visible`}
          aria-label={isAdmin ? "Admin Messages Panel / لوحة تحكم الرسائل" : "Urgent Message / رسالة عاجلة"}
          title={isAdmin ? "Admin Messages Panel / لوحة تحكم الرسائل" : "Urgent Message / رسالة عاجلة"}
        >
          {/* Animated Glow Effect */}
          {unreadCount > 0 && !isOpen && (
            <div className={`absolute inset-0 rounded-full animate-ping ${
              isAdmin 
                ? 'bg-purple-400 opacity-75' 
                : 'bg-violet-400 opacity-75'
            }`} style={{ animationDuration: '2s' }} />
          )}
          
          {/* Outer Ring Pulse */}
          {unreadCount > 0 && !isOpen && (
            <div className={`absolute inset-0 rounded-full ${
              isAdmin 
                ? 'bg-purple-500/30' 
                : 'bg-violet-500/30'
            } animate-pulse`} style={{ 
              transform: 'scale(1.2)',
              animationDuration: '1.5s'
            }} />
          )}

          {/* Main Button Content */}
          <div className="relative z-10 flex items-center justify-center">
            {isOpen ? (
              <X className="h-7 w-7 transition-all duration-300 group-hover:rotate-90" />
            ) : (
              <>
                {isAdmin ? (
                  <Shield className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <MessageCircle className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                )}
                
                {/* Sparkle Effect for New Messages */}
                {unreadCount > 0 && (
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
                )}
              </>
            )}
          </div>

          {/* Unread Count Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className={`absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow-lg border-2 border-white dark:border-gray-800 animate-bounce ${
              unreadCount > 9 ? 'text-[10px]' : 'text-xs'
            }`} style={{ animationDuration: '1s' }}>
              {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* Ripple Effect on Click */}
          <span className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-150 opacity-0 group-active:opacity-100 transition-all duration-500" />
        </button>

        {/* Enhanced Tooltip showing unread messages info */}
        {showTooltip && unreadCount > 0 && (
          <div className="absolute bottom-full right-0 mb-3 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-4 z-[9999] animate-in fade-in slide-in-from-bottom-2">
            {/* Tooltip Arrow */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-gray-800 border-r-2 border-b-2 border-gray-200 dark:border-gray-700 transform rotate-45" />
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${
                isAdmin 
                  ? 'from-purple-500 to-indigo-600' 
                  : 'from-violet-500 to-purple-600'
              }`}>
                {isAdmin ? (
                  <Shield className="h-5 w-5 text-white" />
                ) : (
                  <Bell className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {unreadCount} {unreadCount === 1 ? 'New Message / رسالة جديدة' : 'New Messages / رسائل جديدة'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Click to view / انقر للعرض
                </p>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500 scrollbar-track-transparent">
              {unreadMessagesInfo.length > 0 ? (
                <>
                  {unreadMessagesInfo.slice(0, 5).map((info, index) => (
                    <div
                      key={`${info.sender_id}-${info.conversation_id}-${index}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/20 dark:hover:to-purple-900/20 transition-all cursor-pointer border border-transparent hover:border-violet-200 dark:hover:border-violet-800 group"
                      onClick={() => setIsOpen(true)}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-110 transition-transform ${
                        isAdmin 
                          ? 'from-purple-500 to-indigo-600' 
                          : 'from-violet-500 to-purple-600'
                      }`}>
                        {info.sender_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {info.sender_name}
                          </p>
                          {info.message_count > 1 && (
                            <span className="ml-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0 shadow-sm">
                              {info.message_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1.5 font-medium">
                          {info.conversation_subject}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isAdmin 
                              ? 'bg-purple-500' 
                              : 'bg-violet-500'
                          } animate-pulse`} />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(info.last_message_at).toLocaleString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {unreadMessagesInfo.length > 5 && (
                    <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        +{unreadMessagesInfo.length - 5} {unreadMessagesInfo.length - 5 === 1 ? 'more / المزيد' : 'more / المزيد'}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-3"></div>
                  <p className="text-sm">Loading messages info... / جاري تحميل معلومات الرسائل...</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsOpen(true)}
                className={`w-full px-4 py-2.5 bg-gradient-to-r text-white text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                  isAdmin
                    ? 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    : 'from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'
                }`}
              >
                {isAdmin ? 'Open Admin Panel / فتح لوحة التحكم' : 'Open Messages / فتح الرسائل'}
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Chat Window / Admin Panel */}
      {isOpen && (
        isAdmin ? (
          <UrgentMessagesAdminPanel
            onClose={() => setIsOpen(false)}
            onUnreadCountChange={(count) => {
              setUnreadCount(count)
              // Reload unread messages info when count changes
              loadUnreadMessagesInfo()
            }}
          />
        ) : (
          <UrgentMessageChatWindow
            onClose={() => setIsOpen(false)}
            onUnreadCountChange={(count) => {
              setUnreadCount(count)
              // Reload unread messages info when count changes
              loadUnreadMessagesInfo()
            }}
          />
        )
      )}
    </>
  )
}


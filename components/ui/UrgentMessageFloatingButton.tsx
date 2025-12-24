'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { urgentMessagesService } from '@/lib/urgentMessagesService'
import { UrgentMessageChatWindow } from './UrgentMessageChatWindow'

export function UrgentMessageFloatingButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load initial unread count
    loadUnreadCount()

    // Subscribe to unread count changes
    const subscription = urgentMessagesService.subscribeToUnreadCount((count) => {
      setUnreadCount(count)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const count = await urgentMessagesService.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
        aria-label="Urgent Message / رسالة عاجلة"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <UrgentMessageChatWindow
          onClose={() => setIsOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </>
  )
}


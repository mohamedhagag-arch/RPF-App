'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, AlertCircle, Clock, User, Shield } from 'lucide-react'
import { urgentMessagesService, UrgentConversation, UrgentMessage } from '@/lib/urgentMessagesService'
import { useAuth } from '@/app/providers'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UrgentMessageChatWindowProps {
  onClose: () => void
  onUnreadCountChange: (count: number) => void
}

export function UrgentMessageChatWindow({ onClose, onUnreadCountChange }: UrgentMessageChatWindowProps) {
  const { appUser } = useAuth()
  const [conversations, setConversations] = useState<UrgentConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<UrgentConversation | null>(null)
  const [messages, setMessages] = useState<UrgentMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAdmin = appUser?.role === 'admin'

  const subscriptionRef = useRef<any>(null)
  const isLoadingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      loadConversations()
    }
    
    return () => {
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (selectedConversation && !isLoadingRef.current) {
      isLoadingRef.current = true
      
      // Cleanup previous subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      
      loadMessages(selectedConversation.id).then(() => {
        markAsRead(selectedConversation.id)
        isLoadingRef.current = false
      })
    }
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async (skipAutoSelect = false) => {
    try {
      setLoading(true)
      const data = await urgentMessagesService.getUserConversations()
      setConversations(data)
      
      // Auto-select first conversation if available and no conversation is selected
      // Only do this on initial load, not on refreshes
      if (data.length > 0 && !selectedConversation && !skipAutoSelect && hasInitializedRef.current) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          setSelectedConversation(data[0])
        }, 100)
      }

      // Update unread count
      const unreadCount = await urgentMessagesService.getUnreadCount()
      onUnreadCountChange(unreadCount)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string): Promise<void> => {
    try {
      const { conversation, messages: conversationMessages } = await urgentMessagesService.getConversation(conversationId)
      setMessages(conversationMessages)
      
      // Only update selected conversation if it's different to avoid re-renders
      if (selectedConversation?.id !== conversation.id) {
        setSelectedConversation(conversation)
      }

      // Cleanup previous subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }

      // Subscribe to new messages
      const supabase = createClientComponentClient()
      subscriptionRef.current = urgentMessagesService.subscribeToMessages(conversationId, async (newMessage) => {
        // Get current user to check if message is from them
        const { data: { user } } = await supabase.auth.getUser()
        
        // Only process messages from other users (not from current user to avoid duplicates)
        if (newMessage.sender_id !== user?.id) {
          setMessages((prev) => {
            // Check if message already exists to prevent duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
          markAsRead(conversationId)
          // Debounce conversation refresh and skip auto-select
          setTimeout(() => {
            loadConversations(true)
          }, 500)
        } else {
          // If message is from current user, just update unread count without reloading
          setTimeout(() => {
            urgentMessagesService.getUnreadCount().then(count => {
              onUnreadCountChange(count)
            })
          }, 200)
        }
      })
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await urgentMessagesService.markMessagesAsRead(conversationId)
      // Debounce conversation refresh to prevent infinite loops and skip auto-select
      setTimeout(() => {
        loadConversations(true)
      }, 300)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const createConversation = async () => {
    if (!subject.trim()) {
      alert('Please enter a subject / يرجى إدخال موضوع')
      return
    }

    try {
      setIsCreating(true)
      const newConversation = await urgentMessagesService.createConversation(subject, priority)
      setConversations([newConversation, ...conversations])
      setSelectedConversation(newConversation)
      setMessages([]) // Clear messages for new conversation
      setSubject('')
      setPriority('normal')
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert('Error creating conversation / خطأ في إنشاء المحادثة')
      setIsCreating(false)
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    try {
      setSending(true)
      const newMessage = await urgentMessagesService.sendMessage(selectedConversation.id, messageText)
      
      // Add message to local state immediately (optimistic update)
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        if (prev.some(m => m.id === newMessage.id)) {
          return prev
        }
        return [...prev, newMessage]
      })
      
      setMessageText('')
      
      // Only update unread count, don't reload conversations to avoid re-rendering
      setTimeout(() => {
        urgentMessagesService.getUnreadCount().then(count => {
          onUnreadCountChange(count)
        })
      }, 200)
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message / خطأ في إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today / اليوم'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday / أمس'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-bold text-lg">Urgent Message / رسالة عاجلة</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : !selectedConversation ? (
        /* Create New Conversation */
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject / الموضوع
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject / أدخل الموضوع"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority / الأولوية
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="low">Low / منخفضة</option>
                <option value="normal">Normal / عادية</option>
                <option value="high">High / عالية</option>
                <option value="urgent">Urgent / عاجلة</option>
              </select>
            </div>
            <button
              onClick={createConversation}
              disabled={isCreating || !subject.trim()}
              className="w-full px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating... / جاري الإنشاء...' : 'Start Conversation / بدء المحادثة'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Conversations List */}
          {conversations.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-2 max-h-40 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">
                {isAdmin ? 'All Conversations / جميع المحادثات' : 'My Conversations / محادثاتي'}
              </div>
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      loadMessages(conv.id)
                    }}
                    className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate font-medium">{conv.subject || 'No Subject'}</span>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {isAdmin && conv.user && (
                      <div className="text-xs opacity-70 truncate">
                        From: {conv.user.full_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        conv.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        conv.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        conv.status === 'resolved' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {conv.status}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        conv.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        conv.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                        conv.priority === 'normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {conv.priority}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Conversation Button (for users) */}
          {!isAdmin && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-2">
              <button
                onClick={() => {
                  setSelectedConversation(null)
                  setSubject('')
                  setPriority('normal')
                }}
                className="w-full px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all text-sm font-medium"
              >
                + New Conversation / محادثة جديدة
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
            {messages.map((message, index) => {
              const isOwnMessage = message.sender_id === appUser?.id
              const showDate = index === 0 || 
                new Date(message.created_at).toDateString() !== 
                new Date(messages[index - 1].created_at).toDateString()

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 my-4">
                      {formatDate(message.created_at)}
                    </div>
                  )}
                  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isOwnMessage ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        <span className="text-xs font-semibold">
                          {message.sender?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type your message / اكتب رسالتك..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !messageText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


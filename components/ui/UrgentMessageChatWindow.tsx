'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, AlertCircle, Clock, User, Shield, Search, Trash2, Volume2, VolumeX, MessageSquare, Copy, Check } from 'lucide-react'
import { urgentMessagesService, UrgentConversation, UrgentMessage } from '@/lib/urgentMessagesService'
import { useAuth } from '@/app/providers'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { showMessageNotification, playMessageSound, requestNotificationPermission } from '@/lib/urgentMessagesNotifications'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isAdmin = appUser?.role === 'admin'

  const subscriptionRef = useRef<any>(null)
  const isLoadingRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const shouldAutoScrollRef = useRef(true)

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      loadConversations()
      requestNotificationPermission()
    }
    
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (selectedConversation && !isLoadingRef.current) {
      isLoadingRef.current = true
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      
      loadMessages(selectedConversation.id).then(async () => {
        const unreadCount = await urgentMessagesService.getUnreadCount()
        onUnreadCountChange(unreadCount)
        isLoadingRef.current = false
      })
    }
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id])

  useEffect(() => {
    if (shouldAutoScrollRef.current && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages])

  // Handle scroll to detect if user scrolled up (disable auto-scroll)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      shouldAutoScrollRef.current = isNearBottom
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [selectedConversation])

  const loadConversations = async (skipAutoSelect: boolean = false) => {
    try {
      setLoading(true)
      const data = await urgentMessagesService.getUserConversations()
      setConversations(data)
      
      if (data.length > 0 && !selectedConversation && !skipAutoSelect && hasInitializedRef.current) {
        setTimeout(() => {
          setSelectedConversation(data[0])
        }, 100)
      }

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
      
      if (selectedConversation?.id !== conversation.id) {
        setSelectedConversation(conversation)
      }

      await markAsRead(conversationId)
      
      setTimeout(async () => {
        const unreadCount = await urgentMessagesService.getUnreadCount()
        onUnreadCountChange(unreadCount)
      }, 200)

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }

      const supabase = createClientComponentClient()
      subscriptionRef.current = urgentMessagesService.subscribeToMessages(conversationId, async (newMessage) => {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (newMessage.sender_id !== user?.id) {
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
          
          if (soundEnabled) {
            playMessageSound()
          }
          
          if (notificationsEnabled && document.hidden) {
            showMessageNotification(
              newMessage.sender?.full_name || 'Unknown',
              newMessage.message_text,
              selectedConversation?.subject || undefined
            )
          }
          
          shouldAutoScrollRef.current = true
          
          markAsRead(conversationId)
          setTimeout(() => {
            loadConversations(true)
          }, 500)
        } else {
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
      const unreadCount = await urgentMessagesService.getUnreadCount()
      onUnreadCountChange(unreadCount)
      
      setTimeout(async () => {
        const updatedCount = await urgentMessagesService.getUnreadCount()
        onUnreadCountChange(updatedCount)
      }, 100)
      
      setTimeout(() => {
        loadConversations(true)
      }, 300)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const createConversation = async () => {
    if (isAdmin) {
      alert('Admins cannot create new conversations. Please reply to existing conversations. / الأدمن لا يمكنه إنشاء محادثات جديدة. يرجى الرد على المحادثات الموجودة.')
      return
    }

    if (!subject.trim()) {
      alert('Please enter a subject / يرجى إدخال موضوع')
      return
    }

    try {
      setIsCreating(true)
      const newConversation = await urgentMessagesService.createConversation(subject, priority)
      setConversations([newConversation, ...conversations])
      setSelectedConversation(newConversation)
      setMessages([])
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
      
      setMessages((prev) => {
        if (prev.some(m => m.id === newMessage.id)) {
          return prev
        }
        return [...prev, newMessage]
      })
      
      setMessageText('')
      shouldAutoScrollRef.current = true
      
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

  const copyMessage = async (messageText: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopiedMessageId(messageId)
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (error) {
      console.error('Error copying message:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = messageText
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedMessageId(messageId)
        setTimeout(() => {
          setCopiedMessageId(null)
        }, 2000)
      } catch (err) {
        console.error('Fallback copy failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="fixed bottom-24 right-6 w-[800px] h-[700px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-bold text-lg">Urgent Message / رسالة عاجلة</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title={soundEnabled ? 'Disable Sound / تعطيل الصوت' : 'Enable Sound / تفعيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Close / إغلاق (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Conversations List */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex flex-col overflow-hidden">
            {!isAdmin && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setSelectedConversation(null)
                    setSubject('')
                    setPriority('normal')
                  }}
                  className="w-full px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                >
                  + New Conversation / محادثة جديدة
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">
                    {isAdmin ? 'No conversations / لا توجد محادثات' : 'No conversations yet / لا توجد محادثات بعد'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv)
                        loadMessages(conv.id)
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedConversation?.id === conv.id
                          ? 'bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500 shadow-md'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {conv.subject || 'No Subject / بدون موضوع'}
                            </span>
                            {conv.unread_count && conv.unread_count > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          {isAdmin && conv.user && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{conv.user.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          conv.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          conv.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          conv.status === 'resolved' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {conv.status}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          conv.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          conv.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                          conv.priority === 'normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {conv.priority}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTime(conv.last_message_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedConversation ? (
              !isAdmin ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="w-full max-w-md space-y-6">
                    <div className="text-center mb-6">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-violet-500" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Start New Conversation / بدء محادثة جديدة
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create a new urgent message to contact administrators / أنشئ رسالة عاجلة جديدة للتواصل مع الإدارة
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Subject / الموضوع <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Enter subject / أدخل الموضوع"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && subject.trim()) {
                              createConversation()
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Priority / الأولوية
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as any)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                        className="w-full px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isCreating ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Creating... / جاري الإنشاء...
                          </span>
                        ) : (
                          'Start Conversation / بدء المحادثة'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Select a conversation / اختر محادثة</p>
                    <p className="text-sm">Choose a conversation from the sidebar to reply / اختر محادثة من الشريط الجانبي للرد</p>
                  </div>
                </div>
              )
            ) : (
              <>
                {/* Conversation Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                        {selectedConversation.subject || 'No Subject / بدون موضوع'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            selectedConversation.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            selectedConversation.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            selectedConversation.status === 'resolved' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {selectedConversation.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            selectedConversation.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            selectedConversation.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                            selectedConversation.priority === 'normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {selectedConversation.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  {messages.length > 0 && (
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search messages... / البحث في الرسائل..."
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50"
                >
                  {(searchQuery 
                    ? messages.filter(m => 
                        m.message_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : messages
                  ).map((message, index) => {
                    const isOwnMessage = message.sender_id === appUser?.id
                    const showDate = index === 0 || 
                      new Date(message.created_at).toDateString() !== 
                      new Date((searchQuery ? messages.filter(m => 
                        m.message_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      ) : messages)[index - 1]?.created_at || message.created_at).toDateString()

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="text-center text-xs text-gray-500 dark:text-gray-400 my-4">
                            {formatDate(message.created_at)}
                          </div>
                        )}
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-lg p-3 transition-all duration-200 hover:shadow-md ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                isOwnMessage
                                  ? 'bg-white/20 text-white'
                                  : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                              }`}>
                                {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isOwnMessage ? (
                              <User className="h-3 w-3 flex-shrink-0" />
                            ) : (
                              <Shield className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="text-xs font-semibold truncate">
                              {message.sender?.full_name || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-xs opacity-70">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        {/* Copy Button */}
                        <button
                          onClick={() => copyMessage(message.message_text, message.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            copiedMessageId === message.id
                              ? 'bg-green-500 text-white'
                              : isOwnMessage
                              ? 'bg-white/20 hover:bg-white/30 text-white'
                              : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300'
                          }`}
                          title={copiedMessageId === message.id ? 'Copied! / تم النسخ!' : 'Copy message / نسخ الرسالة'}
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (messageText.trim() && !sending) {
                            sendMessage()
                          }
                        }
                      }}
                      placeholder="Type your message... (Enter to send, ESC to close) / اكتب رسالتك... (Enter للإرسال، ESC للإغلاق)"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !messageText.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Send / إرسال</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Press Enter to send, Shift+Enter for new line / اضغط Enter للإرسال، Shift+Enter للسطر الجديد
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

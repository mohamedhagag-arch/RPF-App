'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Filter, 
  Search, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Circle,
  TrendingUp,
  BarChart3,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Volume2,
  VolumeX,
  Copy,
  Check
} from 'lucide-react'
import { urgentMessagesService, UrgentConversation, UrgentMessage } from '@/lib/urgentMessagesService'
import { useAuth } from '@/app/providers'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { showMessageNotification, playMessageSound, requestNotificationPermission } from '@/lib/urgentMessagesNotifications'

interface UrgentMessagesAdminPanelProps {
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

export function UrgentMessagesAdminPanel({ onClose, onUnreadCountChange }: UrgentMessagesAdminPanelProps) {
  const { appUser } = useAuth()
  const [conversations, setConversations] = useState<UrgentConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<UrgentConversation | null>(null)
  const [messages, setMessages] = useState<UrgentMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'normal' | 'high' | 'urgent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)
  const isLoadingRef = useRef(false)
  const shouldAutoScrollRef = useRef(true)

  useEffect(() => {
    if (appUser?.role !== 'admin') {
      onClose()
      return
    }
    
    loadConversations()
    loadStats()
    requestNotificationPermission()
    
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
  }, [statusFilter, priorityFilter, sortBy, sortOrder])

  useEffect(() => {
    if (selectedConversation && !isLoadingRef.current) {
      isLoadingRef.current = true
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      
      loadMessages(selectedConversation.id).then(async () => {
        await markAsRead(selectedConversation.id)
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

  const loadStats = async () => {
    try {
      const statsData = await urgentMessagesService.getConversationStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await urgentMessagesService.getUserConversations()
      setConversations(data)
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0])
      }
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
          
          // Play sound and show notification for new messages
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
          
          // Auto-scroll to bottom for new messages
          shouldAutoScrollRef.current = true
          
          markAsRead(conversationId)
          setTimeout(() => {
            loadConversations()
            loadStats()
          }, 500)
        } else {
          setTimeout(() => {
            loadStats()
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
      // Update unread count immediately
      const unreadCount = await urgentMessagesService.getUnreadCount()
      onUnreadCountChange?.(unreadCount)
      setTimeout(() => {
        loadConversations()
        loadStats()
      }, 300)
    } catch (error) {
      console.error('Error marking as read:', error)
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
      
      setTimeout(() => {
        loadConversations()
        loadStats()
      }, 200)
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message / خطأ في إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (conversationId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      await urgentMessagesService.updateConversationStatus(conversationId, status)
      await loadConversations()
      await loadStats()
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation({ ...selectedConversation, status })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status / خطأ في تحديث الحالة')
    }
  }

  const updatePriority = async (conversationId: string, priority: 'low' | 'normal' | 'high' | 'urgent') => {
    try {
      await urgentMessagesService.updateConversationPriority(conversationId, priority)
      await loadConversations()
      await loadStats()
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation({ ...selectedConversation, priority })
      }
    } catch (error) {
      console.error('Error updating priority:', error)
      alert('Error updating priority / خطأ في تحديث الأولوية')
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

  const getFilteredAndSortedConversations = () => {
    let filtered = [...conversations]

    // Apply filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(c => c.priority === priorityFilter)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.subject?.toLowerCase().includes(query) ||
        c.user?.full_name?.toLowerCase().includes(query) ||
        c.user?.email?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'date') {
        comparison = new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime()
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
        comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0)
      } else if (sortBy === 'status') {
        const statusOrder = { open: 1, in_progress: 2, resolved: 3, closed: 4 }
        comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Circle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'resolved': return <CheckCircle className="h-4 w-4 text-purple-500" />
      case 'closed': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'normal': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
      case 'low': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  const filteredConversations = getFilteredAndSortedConversations()

  if (appUser?.role !== 'admin') {
    return null
  }

  return (
    <div className="fixed inset-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6" />
          <div>
            <h2 className="font-bold text-xl">Urgent Messages Admin Panel / لوحة تحكم الرسائل العاجلة</h2>
            <p className="text-sm opacity-90">Manage all user conversations / إدارة جميع محادثات المستخدمين</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={soundEnabled ? 'Disable Sound / تعطيل الصوت' : 'Enable Sound / تفعيل الصوت'}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Close / إغلاق (ESC)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total / الإجمالي</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Circle className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Open / مفتوحة</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.open}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">In Progress / قيد المعالجة</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Urgent / عاجلة</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">High / عالية</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations / البحث في المحادثات..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="all">All Status / جميع الحالات</option>
            <option value="open">Open / مفتوحة</option>
            <option value="in_progress">In Progress / قيد المعالجة</option>
            <option value="resolved">Resolved / محلولة</option>
            <option value="closed">Closed / مغلقة</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="all">All Priority / جميع الأولويات</option>
            <option value="urgent">Urgent / عاجلة</option>
            <option value="high">High / عالية</option>
            <option value="normal">Normal / عادية</option>
            <option value="low">Low / منخفضة</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="date">Sort by Date / ترتيب حسب التاريخ</option>
            <option value="priority">Sort by Priority / ترتيب حسب الأولوية</option>
            <option value="status">Sort by Status / ترتيب حسب الحالة</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending / تصاعدي' : 'Descending / تنازلي'}
          >
            {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found / لم يتم العثور على محادثات</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredConversations.map((conv) => (
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
                        {getStatusIcon(conv.status)}
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {conv.subject || 'No Subject / بدون موضوع'}
                        </span>
                      </div>
                      {conv.user && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{conv.user.full_name}</span>
                        </div>
                      )}
                    </div>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(conv.priority)}`}>
                      {conv.priority}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(conv.last_message_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                      {selectedConversation.subject || 'No Subject / بدون موضوع'}
                    </h3>
                    {selectedConversation.user && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{selectedConversation.user.full_name}</span>
                        <span className="text-gray-400">•</span>
                        <span>{selectedConversation.user.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status and Priority Controls */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status / الحالة:</span>
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => updateStatus(selectedConversation.id, e.target.value as any)}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="open">Open / مفتوحة</option>
                      <option value="in_progress">In Progress / قيد المعالجة</option>
                      <option value="resolved">Resolved / محلولة</option>
                      <option value="closed">Closed / مغلقة</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Priority / الأولوية:</span>
                    <select
                      value={selectedConversation.priority}
                      onChange={(e) => updatePriority(selectedConversation.id, e.target.value as any)}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="low">Low / منخفضة</option>
                      <option value="normal">Normal / عادية</option>
                      <option value="high">High / عالية</option>
                      <option value="urgent">Urgent / عاجلة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Message Search */}
              {selectedConversation && messages.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      placeholder="Search messages... / البحث في الرسائل..."
                      className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {(messageSearchQuery
                  ? messages.filter(m => 
                      m.message_text.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
                      m.sender?.full_name?.toLowerCase().includes(messageSearchQuery.toLowerCase())
                    )
                  : messages
                ).map((message) => {
                  const isAdminMessage = message.sender?.role === 'admin'
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 transition-all duration-200 hover:shadow-md ${
                          isAdminMessage
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {/* Avatar */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isAdminMessage
                              ? 'bg-white/20 text-white'
                              : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                          }`}>
                            {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold opacity-90 truncate">
                                {message.sender?.full_name || 'Unknown / غير معروف'}
                              </span>
                              {isAdminMessage && <Shield className="h-3 w-3 flex-shrink-0" />}
                            </div>
                            <div className="text-xs opacity-70 mt-0.5">
                              {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                            </div>
                          </div>
                          {/* Copy Button */}
                          <button
                            onClick={() => copyMessage(message.message_text, message.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              copiedMessageId === message.id
                                ? 'bg-green-500 text-white'
                                : isAdminMessage
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
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
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
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
                    placeholder="Type your reply... (Enter to send, ESC to close) / اكتب ردك... (Enter للإرسال، ESC للإغلاق)"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
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
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation / اختر محادثة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


/**
 * Urgent Messages Service
 * خدمة الرسائل العاجلة
 * 
 * Handles all operations related to urgent messages between users and admins
 * يتعامل مع جميع العمليات المتعلقة بالرسائل العاجلة بين المستخدمين والأدمن
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface UrgentConversation {
  id: string
  user_id: string
  admin_id: string | null
  subject: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  last_message_at: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    full_name: string
    email: string
  }
  admin?: {
    id: string
    full_name: string
    email: string
  }
  unread_count?: number
}

export interface UrgentMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_text: string
  is_read: boolean
  read_at: string | null
  created_at: string
  sender?: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

class UrgentMessagesService {
  private supabase = createClientComponentClient()

  /**
   * Get all conversations for the current user
   * الحصول على جميع المحادثات للمستخدم الحالي
   */
  async getUserConversations(): Promise<UrgentConversation[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!appUser) throw new Error('User not found')

      let query = this.supabase
        .from('urgent_conversations')
        .select(`
          *,
          user:users!urgent_conversations_user_id_fkey(id, full_name, email),
          admin:users!urgent_conversations_admin_id_fkey(id, full_name, email)
        `)
        .order('last_message_at', { ascending: false })

      if (appUser.role === 'admin') {
        // Admins see all conversations
        const { data, error } = await query
        if (error) throw error

        // Get unread counts for each conversation
        const conversationsWithCounts = await Promise.all(
          (data || []).map(async (conv) => {
            const unreadCount = await this.getConversationUnreadCount(conv.id, user.id)
            return { ...conv, unread_count: unreadCount }
          })
        )

        return conversationsWithCounts as UrgentConversation[]
      } else {
        // Users see only their own conversations
        const { data, error } = await query.eq('user_id', user.id)
        if (error) throw error

        // Get unread counts for each conversation
        const conversationsWithCounts = await Promise.all(
          (data || []).map(async (conv) => {
            const unreadCount = await this.getConversationUnreadCount(conv.id, user.id)
            return { ...conv, unread_count: unreadCount }
          })
        )

        return conversationsWithCounts as UrgentConversation[]
      }
    } catch (error) {
      console.error('Error fetching user conversations:', error)
      throw error
    }
  }

  /**
   * Get a single conversation with messages
   * الحصول على محادثة واحدة مع رسائلها
   */
  async getConversation(conversationId: string): Promise<{
    conversation: UrgentConversation
    messages: UrgentMessage[]
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get conversation
      const { data: conversation, error: convError } = await this.supabase
        .from('urgent_conversations')
        .select(`
          *,
          user:users!urgent_conversations_user_id_fkey(id, full_name, email),
          admin:users!urgent_conversations_admin_id_fkey(id, full_name, email)
        `)
        .eq('id', conversationId)
        .single()

      if (convError) throw convError
      if (!conversation) throw new Error('Conversation not found')

      // Get messages
      const { data: messages, error: messagesError } = await this.supabase
        .from('urgent_messages')
        .select(`
          *,
          sender:users!urgent_messages_sender_id_fkey(id, full_name, email, role)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      return {
        conversation: conversation as UrgentConversation,
        messages: (messages || []) as UrgentMessage[]
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
      throw error
    }
  }

  /**
   * Create a new conversation
   * إنشاء محادثة جديدة
   */
  async createConversation(subject: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<UrgentConversation> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('urgent_conversations')
        .insert({
          user_id: user.id,
          subject,
          priority,
          status: 'open'
        })
        .select(`
          *,
          user:users!urgent_conversations_user_id_fkey(id, full_name, email),
          admin:users!urgent_conversations_admin_id_fkey(id, full_name, email)
        `)
        .single()

      if (error) throw error
      return data as UrgentConversation
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  /**
   * Send a message in a conversation
   * إرسال رسالة في محادثة
   */
  async sendMessage(conversationId: string, messageText: string): Promise<UrgentMessage> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('urgent_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_text: messageText
        })
        .select(`
          *,
          sender:users!urgent_messages_sender_id_fkey(id, full_name, email, role)
        `)
        .single()

      if (error) throw error

      // Update conversation status if admin is replying
      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (appUser?.role === 'admin') {
        await this.supabase
          .from('urgent_conversations')
          .update({
            admin_id: user.id,
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId)
      }

      return data as UrgentMessage
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  /**
   * Mark messages as read
   * تحديد الرسائل كمقروءة
   */
  async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user role
      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('Marking messages as read for conversation:', conversationId, 'user:', user.id, 'role:', appUser?.role)
      
      // First, get the conversation to check ownership
      const { data: conversation } = await this.supabase
        .from('urgent_conversations')
        .select('user_id, admin_id')
        .eq('id', conversationId)
        .single()

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Build the update query
      let updateQuery = this.supabase
        .from('urgent_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)

      // For users, only update messages in their own conversations
      if (appUser?.role !== 'admin') {
        if (conversation.user_id !== user.id) {
          console.log('User does not own this conversation, cannot mark as read')
          return
        }
      }

      const { data, error } = await updateQuery.select()

      if (error) {
        console.error('Error updating messages directly:', error)
        // Try using RPC function as fallback
        console.log('Trying RPC function as fallback...')
        const { data: rpcResult, error: rpcError } = await this.supabase.rpc('mark_messages_as_read', {
          p_conversation_id: conversationId,
          p_user_id: user.id
        })
        if (rpcError) {
          console.error('RPC fallback also failed:', rpcError)
          // Last resort: try to update without RLS check (may fail but worth trying)
          throw error
        } else {
          console.log('Marked messages as read via RPC:', rpcResult, 'messages')
        }
      } else {
        console.log('Marked messages as read:', data?.length || 0, 'messages')
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }
  }

  /**
   * Get unread message count for current user
   * الحصول على عدد الرسائل غير المقروءة للمستخدم الحالي
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('No user found for getUnreadCount')
        return 0
      }

      // Get user role first
      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!appUser) {
        console.log('App user not found for getUnreadCount')
        return 0
      }

      // Use RPC function
      const { data, error } = await this.supabase
        .rpc('get_unread_messages_count', { user_uuid: user.id })

      if (error) {
        console.error('Error calling get_unread_messages_count RPC:', error)
        // Fallback: manual count
        if (appUser.role === 'admin') {
          const { count } = await this.supabase
            .from('urgent_messages')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false)
            .neq('sender_id', user.id)
          return count || 0
        } else {
          const { count } = await this.supabase
            .from('urgent_messages')
            .select('*, conversation:urgent_conversations!inner(user_id)', { count: 'exact', head: true })
            .eq('is_read', false)
            .neq('sender_id', user.id)
            .eq('conversation.user_id', user.id)
          return count || 0
        }
      }

      console.log('Unread count from RPC:', { count: data, role: appUser.role, userId: user.id })
      return data || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Get unread messages with sender information
   * الحصول على الرسائل غير المقروءة مع معلومات المرسل
   */
  async getUnreadMessagesInfo(): Promise<Array<{
    sender_name: string
    sender_id: string
    conversation_id: string
    conversation_subject: string
    message_count: number
    last_message_at: string
  }>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return []

      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!appUser) return []

      let query = this.supabase
        .from('urgent_messages')
        .select(`
          id,
          sender_id,
          conversation_id,
          created_at,
          sender:users!urgent_messages_sender_id_fkey(id, full_name, email),
          conversation:urgent_conversations!urgent_messages_conversation_id_fkey(id, subject, user_id)
        `)
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })

      if (appUser.role === 'admin') {
        // Admins see all unread messages
        const { data, error } = await query
        if (error) {
          console.error('Error fetching unread messages for admin:', error)
          throw error
        }

        console.log('Admin unread messages raw data:', { count: data?.length, data })

        // Group by sender and conversation
        const grouped = new Map<string, {
          sender_name: string
          sender_id: string
          conversation_id: string
          conversation_subject: string
          message_count: number
          last_message_at: string
        }>()

        data?.forEach((msg: any) => {
          const key = `${msg.sender_id}-${msg.conversation_id}`
          const existing = grouped.get(key)
          
          if (existing) {
            existing.message_count++
            if (new Date(msg.created_at) > new Date(existing.last_message_at)) {
              existing.last_message_at = msg.created_at
            }
          } else {
            grouped.set(key, {
              sender_name: msg.sender?.full_name || 'Unknown / غير معروف',
              sender_id: msg.sender_id,
              conversation_id: msg.conversation_id,
              conversation_subject: msg.conversation?.subject || 'No Subject / بدون موضوع',
              message_count: 1,
              last_message_at: msg.created_at
            })
          }
        })

        const result = Array.from(grouped.values())
        console.log('Admin unread messages grouped:', { count: result.length, result })
        return result
      } else {
        // Users see only unread messages in their conversations
        const { data, error } = await query
        if (error) throw error

        // Filter to only user's conversations
        const userMessages = data?.filter((msg: any) => 
          msg.conversation?.user_id === user.id
        ) || []

        // Group by sender and conversation
        const grouped = new Map<string, {
          sender_name: string
          sender_id: string
          conversation_id: string
          conversation_subject: string
          message_count: number
          last_message_at: string
        }>()

        userMessages.forEach((msg: any) => {
          const key = `${msg.sender_id}-${msg.conversation_id}`
          const existing = grouped.get(key)
          
          if (existing) {
            existing.message_count++
            if (new Date(msg.created_at) > new Date(existing.last_message_at)) {
              existing.last_message_at = msg.created_at
            }
          } else {
            grouped.set(key, {
              sender_name: msg.sender?.full_name || 'Unknown / غير معروف',
              sender_id: msg.sender_id,
              conversation_id: msg.conversation_id,
              conversation_subject: msg.conversation?.subject || 'No Subject / بدون موضوع',
              message_count: 1,
              last_message_at: msg.created_at
            })
          }
        })

        return Array.from(grouped.values())
      }
    } catch (error) {
      console.error('Error getting unread messages info:', error)
      return []
    }
  }

  /**
   * Get unread count for a specific conversation
   * الحصول على عدد الرسائل غير المقروءة لمحادثة محددة
   */
  async getConversationUnreadCount(conversationId: string, userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('urgent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return data?.length || 0
    } catch (error) {
      console.error('Error getting conversation unread count:', error)
      return 0
    }
  }

  /**
   * Update conversation status
   * تحديث حالة المحادثة
   */
  async updateConversationStatus(
    conversationId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (appUser?.role !== 'admin') {
        throw new Error('Only admins can update conversation status')
      }

      const { error } = await this.supabase
        .from('urgent_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating conversation status:', error)
      throw error
    }
  }

  /**
   * Update conversation priority
   * تحديث أولوية المحادثة
   */
  async updateConversationPriority(
    conversationId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (appUser?.role !== 'admin') {
        throw new Error('Only admins can update conversation priority')
      }

      const { error } = await this.supabase
        .from('urgent_conversations')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating conversation priority:', error)
      throw error
    }
  }

  /**
   * Get conversation statistics for admin
   * الحصول على إحصائيات المحادثات للأدمن
   */
  async getConversationStats(): Promise<{
    total: number
    open: number
    in_progress: number
    resolved: number
    closed: number
    urgent: number
    high: number
    normal: number
    low: number
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (appUser?.role !== 'admin') {
        throw new Error('Only admins can view statistics')
      }

      const { data, error } = await this.supabase
        .from('urgent_conversations')
        .select('status, priority')

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        open: data?.filter(c => c.status === 'open').length || 0,
        in_progress: data?.filter(c => c.status === 'in_progress').length || 0,
        resolved: data?.filter(c => c.status === 'resolved').length || 0,
        closed: data?.filter(c => c.status === 'closed').length || 0,
        urgent: data?.filter(c => c.priority === 'urgent').length || 0,
        high: data?.filter(c => c.priority === 'high').length || 0,
        normal: data?.filter(c => c.priority === 'normal').length || 0,
        low: data?.filter(c => c.priority === 'low').length || 0,
      }

      return stats
    } catch (error) {
      console.error('Error getting conversation stats:', error)
      throw error
    }
  }

  /**
   * Subscribe to new messages in a conversation
   * الاشتراك في الرسائل الجديدة في محادثة
   */
  subscribeToMessages(conversationId: string, callback: (message: UrgentMessage) => void) {
    return this.supabase
      .channel(`urgent_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'urgent_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const { data: message } = await this.supabase
            .from('urgent_messages')
            .select(`
              *,
              sender:users!urgent_messages_sender_id_fkey(id, full_name, email, role)
            `)
            .eq('id', payload.new.id)
            .single()

          if (message) {
            callback(message as UrgentMessage)
          }
        }
      )
      .subscribe()
  }

  /**
   * Subscribe to unread count changes
   * الاشتراك في تغييرات عدد الرسائل غير المقروءة
   */
  subscribeToUnreadCount(callback: (count: number) => void) {
    const channel = this.supabase
      .channel('urgent_messages_unread_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'urgent_messages'
        },
        async (payload) => {
          console.log('Unread messages table changed:', payload)
          const count = await this.getUnreadCount()
          console.log('Updated unread count:', count)
          callback(count)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'urgent_conversations'
        },
        async (payload) => {
          console.log('Conversations table changed:', payload)
          const count = await this.getUnreadCount()
          console.log('Updated unread count after conversation change:', count)
          callback(count)
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })
    
    return channel
  }

  /**
   * Subscribe to all unread messages for real-time updates
   * الاشتراك في جميع الرسائل غير المقروءة للتحديثات الفورية
   */
  subscribeToAllUnreadMessages(callback: (message: UrgentMessage) => void) {
    return this.supabase
      .channel('urgent_messages_all_unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'urgent_messages',
          filter: 'is_read=eq.false'
        },
        async (payload) => {
          const { data: { user } } = await this.supabase.auth.getUser()
          if (!user) return

          // Get the message with sender info
          const { data: message } = await this.supabase
            .from('urgent_messages')
            .select(`
              *,
              sender:users!urgent_messages_sender_id_fkey(id, full_name, email, role)
            `)
            .eq('id', payload.new.id)
            .single()

          if (message && message.sender_id !== user.id) {
            // Check if user should see this message
            const { data: appUser } = await this.supabase
              .from('users')
              .select('role')
              .eq('id', user.id)
              .single()

            if (appUser?.role === 'admin') {
              // Admin sees all messages
              callback(message as UrgentMessage)
            } else {
              // Users see only messages in their conversations
              const { data: conversation } = await this.supabase
                .from('urgent_conversations')
                .select('user_id')
                .eq('id', message.conversation_id)
                .single()

              if (conversation?.user_id === user.id) {
                callback(message as UrgentMessage)
              }
            }
          }
        }
      )
      .subscribe()
  }

  /**
   * Get all active users for message targeting
   * الحصول على جميع المستخدمين النشطين لاستهداف الرسائل
   */
  async getAllUsers(): Promise<Array<{
    id: string
    email: string
    full_name: string
    role: string
    division: string | null
    is_active: boolean
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, full_name, role, division, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error
      return (data || []) as Array<{
        id: string
        email: string
        full_name: string
        role: string
        division: string | null
        is_active: boolean
      }>
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  /**
   * Get unique divisions/departments from users
   * الحصول على الأقسام الفريدة من المستخدمين
   */
  async getDivisions(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('division')
        .eq('is_active', true)
        .not('division', 'is', null)

      if (error) throw error

      const divisions = new Set<string>()
      data?.forEach((user: any) => {
        if (user.division) {
          divisions.add(user.division)
        }
      })

      return Array.from(divisions).sort()
    } catch (error) {
      console.error('Error fetching divisions:', error)
      throw error
    }
  }

  /**
   * Get unique roles from users
   * الحصول على الأدوار الفريدة من المستخدمين
   */
  async getRoles(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('role')
        .eq('is_active', true)

      if (error) throw error

      const roles = new Set<string>()
      data?.forEach((user: any) => {
        if (user.role) {
          roles.add(user.role)
        }
      })

      return Array.from(roles).sort()
    } catch (error) {
      console.error('Error fetching roles:', error)
      throw error
    }
  }

  /**
   * Send message to multiple users (creates conversations for each user)
   * إرسال رسالة لعدة مستخدمين (ينشئ محادثة لكل مستخدم)
   */
  async sendMessageToUsers(
    userIds: string[],
    subject: string,
    messageText: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{
    success: number
    failed: number
    errors: Array<{ userId: string; error: string }>
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: appUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (appUser?.role !== 'admin') {
        throw new Error('Only admins can send messages to multiple users')
      }

      if (userIds.length === 0) {
        throw new Error('No users selected')
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ userId: string; error: string }>
      }

      // Create conversation and send message for each user
      for (const userId of userIds) {
        try {
          // Check if user exists and is active
          const { data: targetUser } = await this.supabase
            .from('users')
            .select('id, is_active')
            .eq('id', userId)
            .single()

          if (!targetUser || !targetUser.is_active) {
            results.failed++
            results.errors.push({
              userId,
              error: 'User not found or inactive'
            })
            continue
          }

          // Create conversation for this user
          const { data: conversation, error: convError } = await this.supabase
            .from('urgent_conversations')
            .insert({
              user_id: userId,
              admin_id: user.id,
              subject,
              priority,
              status: 'in_progress'
            })
            .select()
            .single()

          if (convError) {
            // Check if conversation already exists
            const { data: existingConv } = await this.supabase
              .from('urgent_conversations')
              .select('id')
              .eq('user_id', userId)
              .eq('admin_id', user.id)
              .eq('subject', subject)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (existingConv) {
              // Use existing conversation
              const { error: msgError } = await this.supabase
                .from('urgent_messages')
                .insert({
                  conversation_id: existingConv.id,
                  sender_id: user.id,
                  message_text: messageText
                })

              if (msgError) {
                results.failed++
                results.errors.push({
                  userId,
                  error: msgError.message
                })
                continue
              }

              // Update conversation
              await this.supabase
                .from('urgent_conversations')
                .update({
                  last_message_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  status: 'in_progress'
                })
                .eq('id', existingConv.id)

              results.success++
            } else {
              results.failed++
              results.errors.push({
                userId,
                error: convError.message
              })
            }
          } else if (conversation) {
            // Send message in the new conversation
            const { error: msgError } = await this.supabase
              .from('urgent_messages')
              .insert({
                conversation_id: conversation.id,
                sender_id: user.id,
                message_text: messageText
              })

            if (msgError) {
              results.failed++
              results.errors.push({
                userId,
                error: msgError.message
              })
            } else {
              results.success++
            }
          }
        } catch (error: any) {
          results.failed++
          results.errors.push({
            userId,
            error: error.message || 'Unknown error'
          })
        }
      }

      return results
    } catch (error) {
      console.error('Error sending messages to users:', error)
      throw error
    }
  }
}

export const urgentMessagesService = new UrgentMessagesService()


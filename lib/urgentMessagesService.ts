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

      await this.supabase
        .from('urgent_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)
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
      if (!user) return 0

      const { data, error } = await this.supabase
        .rpc('get_unread_messages_count', { user_uuid: user.id })

      if (error) throw error
      return data || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
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
    return this.supabase
      .channel('urgent_messages_unread_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'urgent_messages'
        },
        async () => {
          const count = await this.getUnreadCount()
          callback(count)
        }
      )
      .subscribe()
  }
}

export const urgentMessagesService = new UrgentMessagesService()


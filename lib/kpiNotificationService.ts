/**
 * KPI Notification Service
 * خدمة إشعارات KPI - إرسال إشعارات عند إنشاء أو تحديث KPIs
 */

import { getSupabaseClient } from './simpleConnectionManager'

export interface KPINotification {
  id?: string
  kpi_id?: string
  recipient_id: string
  notification_type: 'kpi_created' | 'kpi_approved' | 'kpi_rejected'
  title: string
  message: string
  is_read?: boolean
  read_at?: string
  created_by?: string
  created_at?: string
  metadata?: Record<string, any>
}

export interface KPINotificationSettings {
  id?: string
  user_id: string
  department?: string
  role?: string
  can_receive_notifications: boolean
  can_approve_kpis: boolean
  notification_methods: string[]
  created_at?: string
  updated_at?: string
}

class KPINotificationService {
  private supabase = getSupabaseClient()

  /**
   * Get users who should receive KPI notifications
   * الحصول على المستخدمين الذين يجب أن يحصلوا على إشعارات KPI
   */
  async getNotificationRecipients(department?: string): Promise<string[]> {
    try {
      // Get users from Planning department or all users based on settings
      const { data: settings, error } = await this.supabase
        .from('kpi_notification_settings')
        .select('user_id, department, role, can_receive_notifications')
        .eq('can_receive_notifications', true)

      if (error) {
        console.error('Error fetching notification settings:', error)
        return []
      }

      if (!settings || settings.length === 0) {
        // Fallback: Get all users from Planning department or with planner role
        const { data: users, error: usersError } = await this.supabase
          .from('user_profiles_complete')
          .select('id, department_name_en, role')
          .or(`department_name_en.ilike.%Planning%,role.eq.planner,role.eq.manager`)

        if (usersError) {
          console.error('Error fetching users for notifications:', usersError)
          return []
        }

        return (users || []).map((u: any) => u.id)
      }

      // Filter based on settings
      const recipientIds = settings
        .filter((s: any) => {
          // If department filter is specified, match it
          if (department && s.department) {
            return s.department.toLowerCase().includes('planning')
          }
          // If no department filter, include all enabled users
          return true
        })
        .map((s: any) => s.user_id)

      return recipientIds
    } catch (error) {
      console.error('Error getting notification recipients:', error)
      return []
    }
  }

  /**
   * Get users who can approve KPIs
   * الحصول على المستخدمين الذين يمكنهم الموافقة على KPIs
   */
  async getApprovers(): Promise<string[]> {
    try {
      const { data: settings, error } = await this.supabase
        .from('kpi_notification_settings')
        .select('user_id, can_approve_kpis')
        .eq('can_approve_kpis', true)

      if (error) {
        console.error('Error fetching approvers:', error)
        return []
      }

      if (!settings || settings.length === 0) {
        // Fallback: Get users with planner role or admin
        const { data: users, error: usersError } = await this.supabase
          .from('user_profiles_complete')
          .select('id, role')
          .in('role', ['planner', 'manager', 'admin'])

        if (usersError) {
          console.error('Error fetching approvers:', usersError)
          return []
        }

        return (users || []).map((u: any) => u.id)
      }

      return settings.map((s: any) => s.user_id)
    } catch (error) {
      console.error('Error getting approvers:', error)
      return []
    }
  }

  /**
   * Send notification when KPI is created
   * إرسال إشعار عند إنشاء KPI جديد
   */
  async notifyKPICreated(
    kpiData: {
      id: string
      project_code?: string
      project_full_code?: string
      activity_name?: string
      quantity?: number | string
      input_type?: string
    },
    createdBy: string
  ): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients('Planning')

      if (recipients.length === 0) {
        console.log('⚠️ No recipients found for KPI notification')
        return
      }

      const title = `New KPI Created - ${kpiData.activity_name || 'Activity'}`
      const message = `A new ${kpiData.input_type || 'Actual'} KPI has been created for project ${kpiData.project_code || kpiData.project_full_code || 'N/A'}`

      const notifications: KPINotification[] = recipients.map(recipientId => ({
        kpi_id: kpiData.id,
        recipient_id: recipientId,
        notification_type: 'kpi_created',
        title,
        message,
        created_by: createdBy,
        metadata: {
          project_code: kpiData.project_code || kpiData.project_full_code,
          activity_name: kpiData.activity_name,
          quantity: kpiData.quantity,
          input_type: kpiData.input_type
        }
      }))

      const { error } = await (this.supabase
        .from('kpi_notifications') as any)
        .insert(notifications)

      if (error) {
        console.error('Error sending KPI notifications:', error)
        // Try to create table if it doesn't exist
        console.log('⚠️ KPI notifications table might not exist. Please run the SQL migration.')
      } else {
        console.log(`✅ Sent ${notifications.length} KPI notifications`)
      }
    } catch (error) {
      console.error('Error in notifyKPICreated:', error)
    }
  }

  /**
   * Get unread notifications for a user
   * الحصول على الإشعارات غير المقروءة للمستخدم
   */
  async getUnreadNotifications(userId: string): Promise<KPINotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('kpi_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return (data || []) as KPINotification[]
    } catch (error) {
      console.error('Error in getUnreadNotifications:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   * تحديد الإشعار كمقروء
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await (this.supabase
        .from('kpi_notifications') as any)
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in markAsRead:', error)
      return false
    }
  }

  /**
   * Get notification count for a user
   * الحصول على عدد الإشعارات للمستخدم
   */
  async getNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('kpi_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Error getting notification count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getNotificationCount:', error)
      return 0
    }
  }
}

export const kpiNotificationService = new KPINotificationService()


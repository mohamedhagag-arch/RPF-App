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
        // Fallback to Planning users if settings table has issues
        return await this.getFallbackRecipients(department)
      }

      if (!settings || settings.length === 0) {
        console.log('⚠️ No notification settings found, using fallback (Planning users)')
        return await this.getFallbackRecipients(department)
      }

      // Filter based on settings
      let recipientIds = settings
        .filter((s: any) => {
          // If department filter is specified, match it
          if (department && s.department) {
            return s.department.toLowerCase().includes('planning')
          }
          // If no department filter, include all enabled users
          return true
        })
        .map((s: any) => s.user_id)

      console.log(`📋 Notification recipients from settings: ${recipientIds.length} users`)

      // Auto-add current user if they are admin/manager/planner and not in list
      try {
        const { data: currentUser } = await this.supabase.auth.getUser()
        if (currentUser?.user?.id) {
          const currentUserId = currentUser.user.id
          
          // Check if current user is in recipients
          if (!recipientIds.includes(currentUserId)) {
            // Check if current user is admin/manager/planner
            const { data: userProfile } = await this.supabase
              .from('user_profiles_complete')
              .select('id, role, department_name_en')
              .eq('id', currentUserId)
              .single()

            const profile = userProfile as any
            if (profile && ['admin', 'manager', 'planner'].includes(profile.role)) {
              console.log(`👤 Auto-adding current user (${profile.role}) to notification recipients`)
              
              // Try to add to settings
              const { error: insertError } = await (this.supabase
                .from('kpi_notification_settings') as any)
                .insert({
                  user_id: currentUserId,
                  department: profile.department_name_en || null,
                  role: profile.role,
                  can_receive_notifications: true,
                  can_approve_kpis: ['admin', 'manager', 'planner'].includes(profile.role),
                  notification_methods: ['in_app']
                })
                .select()

              if (insertError) {
                // If insert fails (maybe due to conflict), just add to recipients list for this session
                if (!insertError.message.includes('duplicate') && !insertError.message.includes('unique')) {
                  console.error('Error auto-adding user to settings:', insertError)
                }
              } else {
                console.log('✅ Successfully added current user to notification settings')
              }
              
              // Add to recipients list for this session
              recipientIds.push(currentUserId)
              console.log(`📋 Updated recipients: ${recipientIds.length} users (added current user)`)
            }
          }
        }
      } catch (authError) {
        // Ignore auth errors - user might not be logged in
        console.log('Could not check current user for auto-add:', authError)
      }

      return recipientIds
    } catch (error) {
      console.error('Error getting notification recipients:', error)
      return await this.getFallbackRecipients(department)
    }
  }

  /**
   * Fallback: Get all users from Planning department or with planner/manager/admin roles
   * بديل: الحصول على جميع المستخدمين من Planning أو مع أدوار planner/manager/admin
   */
  private async getFallbackRecipients(department?: string): Promise<string[]> {
    try {
      const { data: users, error: usersError } = await this.supabase
        .from('user_profiles_complete')
        .select('id, department_name_en, role, email')
        .or(`department_name_en.ilike.%Planning%,role.eq.planner,role.eq.manager,role.eq.admin`)

      if (usersError) {
        console.error('Error fetching fallback users for notifications:', usersError)
        return []
      }

      const userIds = (users || []).map((u: any) => u.id)
      console.log(`📋 Fallback recipients (Planning/Manager/Admin): ${userIds.length} users`)
      if (users && users.length > 0) {
        console.log('📋 Fallback recipients:', users.map((u: any) => ({ id: u.id, email: u.email, role: u.role })))
      }
      return userIds
    } catch (error) {
      console.error('Error in getFallbackRecipients:', error)
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
      console.log(`🔍 Fetching unread notifications for user: ${userId}`)
      
      const { data, error } = await this.supabase
        .from('kpi_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('❌ Error fetching notifications:', error)
        return []
      }

      console.log(`📬 Found ${data?.length || 0} unread notifications for user ${userId}`)
      
      // Debug: Show sample notification if any
      if (data && data.length > 0) {
        const sample = data[0] as any
        console.log('📋 Sample notification:', {
          id: sample.id,
          title: sample.title,
          recipient_id: sample.recipient_id,
          is_read: sample.is_read,
          created_at: sample.created_at
        })
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
        // If table doesn't exist, return 0
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ kpi_notifications table does not exist. Please run Database/kpi-notifications-table.sql')
        }
        return 0
      }

      // Debug: Also check total notifications (read + unread) for this user
      const { count: totalCount } = await this.supabase
        .from('kpi_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)

      console.log(`📊 Notification stats for user ${userId}: ${count || 0} unread, ${totalCount || 0} total`)

      return count || 0
    } catch (error) {
      console.error('Error in getNotificationCount:', error)
      return 0
    }
  }

  /**
   * Get all notifications for a user (read and unread)
   * الحصول على جميع الإشعارات للمستخدم (مقروءة وغير مقروءة)
   */
  async getAllNotifications(userId: string): Promise<KPINotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('kpi_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching all notifications:', error)
        return []
      }

      return (data || []) as KPINotification[]
    } catch (error) {
      console.error('Error in getAllNotifications:', error)
      return []
    }
  }

  /**
   * Notify about pending KPIs that need approval
   * إرسال إشعارات للـ KPIs المعلقة التي تحتاج للموافقة
   */
  async notifyPendingKPIs(): Promise<void> {
    try {
      console.log('🔍 Starting notifyPendingKPIs...')
      
      // First, check if kpi_notifications table exists
      const { error: tableCheckError } = await this.supabase
        .from('kpi_notifications')
        .select('id')
        .limit(1)

      if (tableCheckError) {
        if (tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist')) {
          console.error('❌ kpi_notifications table does not exist! Please run Database/kpi-notifications-table.sql')
          return
        }
      }

      // Get all Actual KPIs that need approval
      console.log('📋 Fetching pending KPIs from Planning Database - KPI...')
      const { data: pendingKPIs, error: kpiError } = await this.supabase
        .from('Planning Database - KPI')
        .select('id, "Project Code", "Project Full Code", "Activity Name", "Quantity", "Input Type", "Approval Status", created_at')
        .eq('Input Type', 'Actual')
        .or('Approval Status.is.null,Approval Status.eq.,Approval Status.neq.approved')

      if (kpiError) {
        console.error('❌ Error fetching pending KPIs:', kpiError)
        console.error('Error details:', {
          code: kpiError.code,
          message: kpiError.message,
          details: kpiError.details,
          hint: kpiError.hint
        })
        return
      }

      console.log(`📊 Found ${pendingKPIs?.length || 0} pending KPIs`)

      if (!pendingKPIs || pendingKPIs.length === 0) {
        console.log('ℹ️ No pending KPIs found')
        return
      }

      // Get recipients
      console.log('👥 Getting notification recipients...')
      const recipients = await this.getNotificationRecipients('Planning')
      console.log(`👥 Found ${recipients.length} recipients:`, recipients)

      if (recipients.length === 0) {
        console.warn('⚠️ No recipients found for pending KPI notifications')
        console.warn('💡 Tip: Go to Settings > KPI Notification Settings to add users')
        console.warn('💡 Or run: Database/add-current-user-to-notifications.sql')
        return
      }

      // Debug: Check if current user (if available) is in recipients
      try {
        const { data: currentUser } = await this.supabase.auth.getUser()
        if (currentUser?.user?.id) {
          const isCurrentUserInRecipients = recipients.includes(currentUser.user.id)
          console.log(`👤 Current user ${currentUser.user.id} ${isCurrentUserInRecipients ? 'IS' : 'IS NOT'} in recipients list`)
          if (!isCurrentUserInRecipients) {
            console.warn(`⚠️ Current user is not in recipients! Add them via Settings or SQL script.`)
          }
        }
      } catch (err) {
        // Ignore auth errors
      }

      // Create notifications for each pending KPI
      console.log('📝 Creating notifications for pending KPIs...')
      const notifications: KPINotification[] = []
      let skippedCount = 0
      
      for (const kpi of (pendingKPIs || []) as any[]) {
        if (!kpi || !kpi.id) {
          skippedCount++
          continue
        }

        // Check if notification already exists for this KPI AND for current recipients
        // We need to check for each recipient separately
        const notificationsForThisKPI: KPINotification[] = []
        
        for (const recipientId of recipients) {
          const { data: existingNotifications, error: checkError } = await this.supabase
            .from('kpi_notifications')
            .select('id, recipient_id, is_read')
            .eq('kpi_id', kpi.id)
            .eq('recipient_id', recipientId)
            .eq('notification_type', 'kpi_created')
            .limit(1)

          if (checkError) {
            console.error(`Error checking existing notification for KPI ${kpi.id} and recipient ${recipientId}:`, checkError)
            continue
          }

          // Only create notification if it doesn't exist for this recipient
          if (!existingNotifications || existingNotifications.length === 0) {
            const title = `KPI Needs Approval - ${kpi['Activity Name'] || 'Activity'}`
            const message = `A ${kpi['Input Type'] || 'Actual'} KPI for project ${kpi['Project Code'] || kpi['Project Full Code'] || 'N/A'} needs your approval`

            notificationsForThisKPI.push({
              kpi_id: kpi.id,
              recipient_id: recipientId,
              notification_type: 'kpi_created',
              title,
              message,
              metadata: {
                project_code: kpi['Project Code'] || kpi['Project Full Code'],
                activity_name: kpi['Activity Name'],
                quantity: kpi['Quantity'],
                input_type: kpi['Input Type'],
                approval_status: kpi['Approval Status'] || 'pending'
              }
            })
          } else {
            // Notification exists for this recipient
            const existing = existingNotifications[0] as any
            console.log(`ℹ️ Notification already exists for KPI ${kpi.id} and recipient ${recipientId} (is_read: ${existing.is_read})`)
            skippedCount++
          }
        }
        
        // Add all notifications for this KPI
        notifications.push(...notificationsForThisKPI)
      }

      console.log(`📊 Summary: ${notifications.length} new notifications to create, ${skippedCount} KPIs already have notifications`)

      // If we added current user to recipients, create notifications for them for existing pending KPIs
      try {
        const { data: currentUser } = await this.supabase.auth.getUser()
        if (currentUser?.user?.id) {
          const currentUserId = currentUser.user.id
          const isCurrentUserInRecipients = recipients.includes(currentUserId)
          
          if (isCurrentUserInRecipients) {
            // Check if current user has notifications for these pending KPIs
            const notificationsForCurrentUser: KPINotification[] = []
            
            for (const kpi of (pendingKPIs || []) as any[]) {
              if (!kpi || !kpi.id) continue
              
              // Check if notification exists for current user
              const { data: existingForCurrentUser } = await this.supabase
                .from('kpi_notifications')
                .select('id')
                .eq('kpi_id', kpi.id)
                .eq('recipient_id', currentUserId)
                .eq('notification_type', 'kpi_created')
                .limit(1)

              if (!existingForCurrentUser || existingForCurrentUser.length === 0) {
                // Create notification for current user
                const title = `KPI Needs Approval - ${kpi['Activity Name'] || 'Activity'}`
                const message = `A ${kpi['Input Type'] || 'Actual'} KPI for project ${kpi['Project Code'] || kpi['Project Full Code'] || 'N/A'} needs your approval`

                notificationsForCurrentUser.push({
                  kpi_id: kpi.id,
                  recipient_id: currentUserId,
                  notification_type: 'kpi_created',
                  title,
                  message,
                  metadata: {
                    project_code: kpi['Project Code'] || kpi['Project Full Code'],
                    activity_name: kpi['Activity Name'],
                    quantity: kpi['Quantity'],
                    input_type: kpi['Input Type'],
                    approval_status: kpi['Approval Status'] || 'pending'
                  }
                })
              }
            }

            if (notificationsForCurrentUser.length > 0) {
              console.log(`👤 Creating ${notificationsForCurrentUser.length} notifications for current user`)
              const { error: currentUserError } = await (this.supabase
                .from('kpi_notifications') as any)
                .insert(notificationsForCurrentUser)

              if (currentUserError) {
                console.error('Error creating notifications for current user:', currentUserError)
              } else {
                console.log(`✅ Created ${notificationsForCurrentUser.length} notifications for current user`)
                // Add to main notifications array
                notifications.push(...notificationsForCurrentUser)
              }
            }
          }
        }
      } catch (err) {
        // Ignore errors
        console.log('Could not create notifications for current user:', err)
      }

      if (notifications.length > 0) {
        // Insert in batches of 100
        const batchSize = 100
        let totalInserted = 0
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize)
          const { error } = await (this.supabase
            .from('kpi_notifications') as any)
            .insert(batch)

          if (error) {
            console.error(`❌ Error inserting notification batch ${Math.floor(i / batchSize) + 1}:`, error)
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            })
          } else {
            totalInserted += batch.length
            console.log(`✅ Created ${batch.length} notifications (Total: ${totalInserted}/${notifications.length})`)
          }
        }
        console.log(`✅ Successfully created ${totalInserted} notifications for pending KPIs`)
      } else {
        console.log('ℹ️ All pending KPIs already have notifications')
      }
    } catch (error) {
      console.error('Error in notifyPendingKPIs:', error)
    }
  }
}

export const kpiNotificationService = new KPINotificationService()


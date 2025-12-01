'use client'

import { supabase } from './supabase'
import { ColumnConfig } from '@/components/ui/ColumnCustomizer'

export interface SavedView {
  id: string
  user_id: string
  table_name: string
  view_name: string
  columns: ColumnConfig[]
  is_default: boolean
  created_at: string
  updated_at: string
}

/**
 * Manager for Saved Views in Supabase
 */
class SavedViewsManager {
  /**
   * Get current user ID with retry mechanism
   */
  private async getCurrentUserId(retries: number = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // First try to get from session (faster)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (!sessionError && session?.user) {
          console.log('✅ SavedViewsManager: User ID found from session:', session.user.id)
          return session.user.id
        }

        // Wait a bit before retrying if session is not available
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 300 * attempt))
        }

        // Fallback to getUser() if session is not available
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!error && user) {
          console.log('✅ SavedViewsManager: User ID found from getUser():', user.id)
          return user.id
        }

        // If we get here, try refreshing the session
        if (attempt < retries) {
          console.log(`🔄 SavedViewsManager: Attempt ${attempt} failed, refreshing session...`)
          await supabase.auth.refreshSession()
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Error getting current user (attempt ${attempt}/${retries}):`, error)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    console.warn('⚠️ SavedViewsManager: No authenticated user found after all retries')
    return null
  }

  /**
   * Load all saved views for a table
   */
  async loadSavedViews(tableName: string): Promise<SavedView[]> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        console.warn('No user ID, returning empty array')
        return []
      }

      const { data, error } = await (supabase
        .from('saved_views') as any)
        .select('*')
        .eq('user_id', userId)
        .eq('table_name', tableName)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading saved views:', error)
        return []
      }

      return ((data || []) as any[]).map((view: any) => ({
        ...view,
        columns: Array.isArray(view.columns) ? view.columns : []
      }))
    } catch (error) {
      console.error('Error loading saved views:', error)
      return []
    }
  }

  /**
   * Get default view for a table
   */
  async getDefaultView(tableName: string): Promise<SavedView | null> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) return null

      const { data, error } = await (supabase
        .from('saved_views') as any)
        .select('*')
        .eq('user_id', userId)
        .eq('table_name', tableName)
        .eq('is_default', true)
        .single()

      if (error) {
        // No default view found, try to get first view
        const { data: firstView } = await (supabase
          .from('saved_views') as any)
          .select('*')
          .eq('user_id', userId)
          .eq('table_name', tableName)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        return firstView ? {
          ...firstView,
          columns: Array.isArray(firstView.columns) ? firstView.columns : []
        } : null
      }

      return (data as any) ? {
        ...(data as any),
        columns: Array.isArray((data as any).columns) ? (data as any).columns : []
      } : null
    } catch (error) {
      console.error('Error getting default view:', error)
      return null
    }
  }

  /**
   * Save a new view
   */
  async saveView(
    tableName: string,
    viewName: string,
    columns: ColumnConfig[],
    isDefault: boolean = false
  ): Promise<SavedView | null> {
    try {
      console.log('💾 SavedViewsManager: Attempting to save view:', { tableName, viewName, isDefault })
      
      const userId = await this.getCurrentUserId()
      if (!userId) {
        console.error('❌ SavedViewsManager: No user ID, cannot save view. User may not be authenticated.')
        // Return null but don't throw - let the UI handle it gracefully
        return null
      }

      console.log('✅ SavedViewsManager: User ID found:', userId)
      
      // Verify session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session || session.user.id !== userId) {
        console.error('❌ SavedViewsManager: Session verification failed:', {
          sessionError: sessionError?.message,
          hasSession: !!session,
          sessionUserId: session?.user?.id,
          expectedUserId: userId
        })
        return null
      }
      
      console.log('✅ SavedViewsManager: Session verified, user ID matches:', userId)

      // If this is default, unset other defaults first
      if (isDefault) {
        await this.unsetDefaultViews(tableName)
      }

      const insertData = {
        user_id: userId,
        table_name: tableName,
        view_name: viewName,
        columns: columns,
        is_default: isDefault
      }

      console.log('💾 SavedViewsManager: Attempting database insert...')
      console.log('💾 SavedViewsManager: Insert data:', JSON.stringify(insertData, null, 2))
      
      // First, verify we can access the table with a simple query
      console.log('🔍 SavedViewsManager: Verifying table access...')
      const { error: testError } = await (supabase
        .from('saved_views') as any)
        .select('id')
        .limit(0)
      
      if (testError) {
        console.error('❌ SavedViewsManager: Cannot access saved_views table:', {
          message: testError.message,
          code: testError.code,
          hint: testError.hint
        })
        
        if (testError.code === 'PGRST116' || testError.message?.includes('does not exist')) {
          console.error('❌ SavedViewsManager: Table "saved_views" does not exist!')
          console.error('   ACTION REQUIRED: Run Database/create-saved-views-table.sql in Supabase SQL Editor')
        }
        
        return null
      }
      
      console.log('✅ SavedViewsManager: Table access verified')
      
      // Insert into saved_views table (must be in public schema)
      const { data, error } = await (supabase
        .from('saved_views') as any)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('❌ SavedViewsManager: Database insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        })
        
        // Check for specific error codes and provide helpful messages
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.error('❌ SavedViewsManager: Table does not exist!')
          console.error('   Solution: Run the SQL script Database/create-saved-views-table.sql in Supabase SQL Editor')
        } else if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          console.error('❌ SavedViewsManager: Permission denied!')
          console.error('   Solution: Check RLS policies. Run Database/verify-saved-views-table.sql to verify table setup')
        } else if (error.code === '23505' || error.message?.includes('unique constraint')) {
          console.error('❌ SavedViewsManager: View name already exists for this table.')
          console.error('   Solution: Choose a different view name')
        } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          console.error('❌ SavedViewsManager: Authentication issue!')
          console.error('   Solution: Please refresh the page and try again')
        }
        
        // Return null to let UI handle it gracefully
        return null
      }

      console.log('✅ SavedViewsManager: View saved successfully:', data)

      return {
        ...data,
        columns: Array.isArray(data.columns) ? data.columns : []
      }
    } catch (error: any) {
      console.error('❌ SavedViewsManager: Exception saving view:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      return null
    }
  }

  /**
   * Update an existing view
   */
  async updateView(
    viewId: string,
    updates: {
      view_name?: string
      columns?: ColumnConfig[]
      is_default?: boolean
    }
  ): Promise<SavedView | null> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        console.error('No user ID, cannot update view')
        return null
      }

      // If setting as default, unset other defaults
      if (updates.is_default) {
        // Get table name first
        const { data: view } = await (supabase
          .from('saved_views') as any)
          .select('table_name')
          .eq('id', viewId)
          .single()

        if (view) {
          await this.unsetDefaultViews((view as any).table_name, viewId)
        }
      }

      const { data, error } = await (supabase
        .from('saved_views') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating view:', error)
        return null
      }

      return {
        ...(data as any),
        columns: Array.isArray((data as any).columns) ? (data as any).columns : []
      }
    } catch (error) {
      console.error('Error updating view:', error)
      return null
    }
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        console.error('No user ID, cannot delete view')
        return false
      }

      const { error } = await (supabase
        .from('saved_views') as any)
        .delete()
        .eq('id', viewId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting view:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting view:', error)
      return false
    }
  }

  /**
   * Set a view as default (unset others)
   */
  async setDefaultView(viewId: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        console.error('No user ID, cannot set default view')
        return false
      }

      // Get table name first
      const { data: view } = await (supabase
        .from('saved_views') as any)
        .select('table_name')
        .eq('id', viewId)
        .eq('user_id', userId)
        .single()

      if (!view) {
        console.error('View not found')
        return false
      }

      // Unset other defaults
      await this.unsetDefaultViews((view as any).table_name, viewId)

      // Set this one as default
      const { error } = await (supabase
        .from('saved_views') as any)
        .update({ is_default: true })
        .eq('id', viewId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error setting default view:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error setting default view:', error)
      return false
    }
  }

  /**
   * Unset all default views for a table (except one)
   */
  private async unsetDefaultViews(tableName: string, exceptViewId?: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) return

      const query = (supabase
        .from('saved_views') as any)
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('table_name', tableName)
        .eq('is_default', true)

      if (exceptViewId) {
        query.neq('id', exceptViewId)
      }

      await query
    } catch (error) {
      console.error('Error unsetting default views:', error)
    }
  }

  /**
   * Duplicate a view
   */
  async duplicateView(viewId: string, newName?: string): Promise<SavedView | null> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) {
        console.error('No user ID, cannot duplicate view')
        return null
      }

      // Get the original view
      const { data: originalView, error: fetchError } = await (supabase
        .from('saved_views') as any)
        .select('*')
        .eq('id', viewId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !originalView) {
        console.error('Error fetching view to duplicate:', fetchError)
        return null
      }

      const original = originalView as any
      // Create new view
      const viewName = newName || `${original.view_name} (Copy)`
      return await this.saveView(
        original.table_name,
        viewName,
        Array.isArray(original.columns) ? original.columns : [],
        false // Don't make duplicate default
      )
    } catch (error) {
      console.error('Error duplicating view:', error)
      return null
    }
  }
}

// Export singleton instance
export const savedViewsManager = new SavedViewsManager()


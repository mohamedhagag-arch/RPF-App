'use client'

import { useState, useEffect } from 'react'
import { KPIRecord } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { X, User, Calendar, CheckCircle, Clock, AlertCircle, FileText, Edit, Plus, Trash2, History, Building, Activity, Target, DollarSign, Package, MapPin, Layers, Globe, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'

interface KPIHistoryModalProps {
  kpi: KPIRecord | null
  isOpen: boolean
  onClose: () => void
}

interface HistoryEntry {
  type: 'created' | 'updated' | 'approved' | 'rejected' | 'note'
  user: string
  date: string
  details?: string
  field?: string
  oldValue?: string
  newValue?: string
}

interface UserInfo {
  name: string
  email: string
  role?: string
  division?: string
}

export function KPIHistoryModal({ kpi, isOpen, onClose }: KPIHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Map<string, UserInfo>>(new Map())

  useEffect(() => {
    if (isOpen && kpi) {
      loadHistory()
    } else {
      setHistory([])
      setUserInfo(new Map())
    }
  }, [isOpen, kpi])

  const loadHistory = async () => {
    if (!kpi) return

    setLoading(true)
    try {
      // ✅ STEP 1: Log the KPI object we received
      console.log('🔍 [KPI History] Starting history load for KPI:', {
        kpiId: kpi.id,
        kpiObject: kpi,
        rawData: (kpi as any).raw,
        hasRaw: !!(kpi as any).raw
      })
      
      // ✅ STEP 1.5: Fetch latest KPI data directly from database to ensure we have the most up-to-date information
      let latestKPI = kpi
      try {
        const supabase = getSupabaseClient()
        const { data: freshKPI, error: fetchError } = await supabase
          .from('Planning Database - KPI')
          .select('*')
          .eq('id', kpi.id)
          .single()
        
        if (!fetchError && freshKPI) {
          console.log('✅ [KPI History] Fetched fresh KPI from database:', {
            approvalStatus: freshKPI['Approval Status'],
            approvedBy: freshKPI['Approved By'],
            approvalDate: freshKPI['Approval Date'],
            notes: freshKPI['Notes']
          })
          
          // Map the fresh data using mapKPIFromDB
          const { mapKPIFromDB } = await import('@/lib/dataMappers')
          latestKPI = mapKPIFromDB(freshKPI)
          console.log('✅ [KPI History] Mapped fresh KPI:', {
            approvalStatus: (latestKPI as any).approval_status,
            approvedBy: (latestKPI as any).approved_by,
            approvalDate: (latestKPI as any).approval_date,
            rawApprovalStatus: (latestKPI as any).raw?.['Approval Status'],
            rawApprovedBy: (latestKPI as any).raw?.['Approved By'],
            rawApprovalDate: (latestKPI as any).raw?.['Approval Date']
          })
        } else {
          console.log('⚠️ [KPI History] Could not fetch fresh KPI, using provided KPI:', fetchError)
        }
      } catch (fetchErr) {
        console.log('⚠️ [KPI History] Error fetching fresh KPI, using provided KPI:', fetchErr)
      }
      
      const entries: HistoryEntry[] = []
      const raw = (latestKPI as any).raw || (kpi as any).raw || {}
      
      // ✅ STEP 2: Log all approval-related fields from all sources
      console.log('🔍 [KPI History] All approval sources:', {
        rawApprovalStatus: raw['Approval Status'],
        rawApprovedBy: raw['Approved By'],
        rawApprovalDate: raw['Approval Date'],
        kpiApprovalStatus: (kpi as any).approval_status,
        kpiApprovedBy: (kpi as any).approved_by,
        kpiApprovalDate: (kpi as any).approval_date,
        kpiApprovalStatusAlt: (kpi as any)['Approval Status'],
        kpiApprovedByAlt: (kpi as any)['Approved By'],
        kpiApprovalDateAlt: (kpi as any)['Approval Date'],
        notes: kpi.notes || raw['Notes'] || ''
      })

      // Use latestKPI for all operations to ensure we have the most recent data
      const currentKPI = latestKPI || kpi
      
      // 1. Creation Info
      if (currentKPI.created_at) {
        const createdBy = currentKPI.created_by || raw.created_by || 'System'
        entries.push({
          type: 'created',
          user: createdBy,
          date: currentKPI.created_at,
          details: `KPI was created with initial values: Quantity: ${currentKPI.quantity || 'N/A'} ${currentKPI.unit || ''}, Value: ${currentKPI.value ? `$${parseFloat(String(currentKPI.value)).toLocaleString()}` : 'N/A'}`
        })
      }

      // 2. Last Update Info
      if (currentKPI.updated_at && currentKPI.updated_at !== currentKPI.created_at && currentKPI.created_at) {
        const updatedBy = raw.updated_by || currentKPI.created_by || 'System'
        const timeDiff = new Date(currentKPI.updated_at).getTime() - new Date(currentKPI.created_at).getTime()
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        entries.push({
          type: 'updated',
          user: updatedBy,
          date: currentKPI.updated_at,
          details: daysDiff > 0 ? `KPI was last updated ${daysDiff} day(s) after creation` : 'KPI was last updated'
        })
      }

      // 3. Approval Info - ✅ Read from multiple sources for maximum accuracy
      // Priority: 1) raw data (most accurate), 2) mapped kpi data, 3) Notes field
      let approvalStatus = raw['Approval Status'] || (currentKPI as any).approval_status || (currentKPI as any)['Approval Status'] || null
      let approvedBy = raw['Approved By'] || (currentKPI as any).approved_by || (currentKPI as any)['Approved By'] || null
      let approvalDate = raw['Approval Date'] || (currentKPI as any).approval_date || (currentKPI as any)['Approval Date'] || null

      // ✅ Also check Notes field if approval columns are empty
      const notes = currentKPI.notes || raw['Notes'] || ''
      if (notes && notes.includes('APPROVED:') && (!approvalStatus || !approvedBy || !approvalDate)) {
        const parts = notes.split(':')
        if (parts.length >= 6) {
          if (!approvalStatus) {
            approvalStatus = parts[1] || null
          }
          if (!approvedBy) {
            approvedBy = parts[3] || null
          }
          if (!approvalDate) {
            approvalDate = parts[5] || null
          }
        }
      }

      // ✅ STEP 3: Log final approval info after all processing
      console.log('🔍 [KPI History] Approval Info (Final After Processing):', {
        approvalStatus,
        approvedBy,
        approvalDate,
        notesContainsApproval: notes.includes('APPROVED:'),
        willCreateApprovalEntry: !!approvalStatus
      })

      if (approvalStatus) {
        if (approvalStatus.toLowerCase() === 'approved') {
          entries.push({
            type: 'approved',
            user: approvedBy || 'Unknown',
            date: approvalDate || currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
            details: approvedBy && approvedBy !== 'Unknown' ? `KPI was approved by ${approvedBy}` : 'KPI was approved'
          })
        } else if (approvalStatus.toLowerCase() === 'rejected') {
          entries.push({
            type: 'rejected',
            user: approvedBy || 'Unknown',
            date: approvalDate || currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
            details: approvedBy ? `KPI was rejected by ${approvedBy}` : 'KPI was rejected'
          })
        } else if (approvalStatus.toLowerCase() === 'pending') {
          entries.push({
            type: 'note',
            user: 'System',
            date: currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
            details: 'KPI is pending approval'
          })
        }
      }

      // 4. Parse Notes field for approval history (format: "APPROVED:approved:by:user@email.com:date:2025-01-01")
      // ✅ IMPORTANT: Only parse Notes if Approval Status is not already set (to avoid duplicates)
      // Note: 'notes' variable is already defined above, so we use it here
      if (notes && !approvalStatus) {
        // Check if Notes contains approval info
        if (notes.includes('APPROVED:')) {
          const parts = notes.split(':')
          if (parts.length >= 6) {
            const status = parts[1] || 'approved'
            const by = parts[3] || 'Unknown'
            const date = parts[5] || currentKPI.updated_at || currentKPI.created_at || new Date().toISOString()

            if (status.toLowerCase() === 'approved') {
              entries.push({
                type: 'approved',
                user: by || 'Unknown',
                date: date || currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
                details: `KPI was approved (recorded in Notes field)`
              })
            } else if (status.toLowerCase() === 'rejected') {
              entries.push({
                type: 'rejected',
                user: by || 'Unknown',
                date: date || currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
                details: `KPI was rejected (recorded in Notes field)`
              })
            }
          }
        } else if (notes.trim().length > 0 && !notes.includes('APPROVED:')) {
          // Regular note (only if it's not empty and not approval info)
          entries.push({
            type: 'note',
            user: currentKPI.recorded_by || raw['Recorded By'] || 'Unknown',
            date: currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
            details: `Note: ${notes}`
          })
        }
      } else if (notes && notes.trim().length > 0 && !notes.includes('APPROVED:') && approvalStatus) {
        // If approval status exists but Notes has additional info, add it as a note
        entries.push({
          type: 'note',
          user: currentKPI.recorded_by || raw['Recorded By'] || 'Unknown',
          date: currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
          details: `Note: ${notes}`
        })
      }

      // 5. Recorded By Info (only if different from approved_by and not already in notes)
      const recordedBy = currentKPI.recorded_by || raw['Recorded By'] || ''
      if (recordedBy && recordedBy !== approvedBy && !notes.includes(recordedBy)) {
        entries.push({
          type: 'note',
          user: recordedBy,
          date: currentKPI.updated_at || currentKPI.created_at || new Date().toISOString(),
          details: `KPI was recorded by ${recordedBy}`
        })
      }

      // Sort by date (newest first)
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setHistory(entries)

      // Load user info for all users mentioned
      const userIds = new Set<string>()
      entries.forEach(entry => {
        if (entry.user && entry.user !== 'System' && entry.user !== 'Unknown') {
          userIds.add(entry.user)
        }
      })

      if (userIds.size > 0) {
        await loadUserInfo(Array.from(userIds))
      }
    } catch (error) {
      console.error('Error loading KPI history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserInfo = async (userIds: string[]) => {
    try {
      console.log('🔍 [KPI History] Loading user info for:', userIds)
      const supabase = getSupabaseClient()
      const userMap = new Map<string, UserInfo>()

      // Try to get user info from auth.users or public.users
      for (const userId of userIds) {
        if (!userId || userId === 'System' || userId === 'Unknown') {
          continue // Skip system/unknown users
        }
        
        // Check if it's an email
        if (userId.includes('@')) {
          // Try to find user by email in users table
          try {
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('id, email, full_name, role, division')
              .eq('email', userId)
              .single()

            if (!emailError && userByEmail && typeof userByEmail === 'object') {
              const userData = userByEmail as { id: string; email?: string; full_name?: string; role?: string; division?: string }
              userMap.set(userId, {
                name: userData.full_name || userData.email?.split('@')[0] || userId,
                email: userData.email || userId,
                role: userData.role,
                division: userData.division
              })
              console.log(`✅ [KPI History] Found user by email ${userId}:`, userMap.get(userId))
            } else {
              // If not found, use email as name (at least show the email)
              userMap.set(userId, { name: userId.split('@')[0], email: userId })
              console.log(`⚠️ [KPI History] User not found by email ${userId}, using email as name`)
            }
          } catch (e: any) {
            // If not found, use email as name
            userMap.set(userId, { name: userId.split('@')[0], email: userId })
            console.log(`⚠️ [KPI History] Error fetching user by email ${userId}:`, e.message)
          }
        } else {
          // Try to get from users table by ID
          try {
            const { data, error: idError } = await supabase
              .from('users')
              .select('id, email, full_name, role, division')
              .eq('id', userId)
              .single()

            if (!idError && data && typeof data === 'object' && 'email' in data) {
              const userData = data as { id: string; email?: string; full_name?: string; role?: string; division?: string }
              userMap.set(userId, {
                name: userData.full_name || userData.email?.split('@')[0] || userId,
                email: userData.email || userId,
                role: userData.role,
                division: userData.division
              })
              console.log(`✅ [KPI History] Found user by ID ${userId}:`, userMap.get(userId))
            } else {
              // If it looks like an email but doesn't have @, try searching by email
              if (idError && userId.includes('.')) {
                try {
                  const { data: emailData } = await supabase
                    .from('users')
                    .select('id, email, full_name, role, division')
                    .eq('email', userId)
                    .single()
                  
                  if (emailData) {
                    const userData = emailData as { id: string; email?: string; full_name?: string; role?: string; division?: string }
                    userMap.set(userId, {
                      name: userData.full_name || userData.email?.split('@')[0] || userId,
                      email: userData.email || userId,
                      role: userData.role,
                      division: userData.division
                    })
                    console.log(`✅ [KPI History] Found user by email search ${userId}:`, userMap.get(userId))
                  } else {
                    userMap.set(userId, { name: userId, email: userId })
                  }
                } catch (e2) {
                  userMap.set(userId, { name: userId, email: userId })
                }
              } else {
                userMap.set(userId, { name: userId, email: userId })
                console.log(`⚠️ [KPI History] User not found by ID ${userId}, using ID as name`)
              }
            }
          } catch (e: any) {
            // Try to get from auth.users via RPC or admin API (if available)
            // For now, just use the ID
            userMap.set(userId, { name: userId, email: userId })
            console.log(`⚠️ [KPI History] Error fetching user by ID ${userId}:`, e.message)
          }
        }
      }

      console.log('✅ [KPI History] User info loaded:', Array.from(userMap.entries()))
      setUserInfo(userMap)
    } catch (error: any) {
      console.error('❌ [KPI History] Error loading user info:', error)
    }
  }

  const getUserDisplay = (userId: string | undefined): string => {
    if (!userId || userId === 'System' || userId === 'Unknown') {
      return userId || 'Unknown'
    }
    
    const info = userInfo.get(userId)
    if (info) {
      // If we have full name, show it with role
      if (info.name && info.name !== info.email && info.name !== userId) {
        const display = `${info.name}${info.role ? ` (${info.role})` : ''}`
        // Only add email if it's different from the name and different from userId
        if (info.email && info.email !== info.name && info.email !== userId) {
          return `${display} - ${info.email}`
        }
        return display
      }
      // If we have email, show it
      if (info.email && info.email !== userId) {
        return info.email
      }
      // Fallback to name or userId
      return info.name || info.email || userId
    }
    
    // If it's an email, return it (at least show something useful)
    if (userId.includes('@')) {
      return userId
    }
    
    // Last resort: return the userId (better than "Unknown")
    return userId
  }

  const getIcon = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'created':
        return <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'updated':
        return <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'note':
        return <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      default:
        return <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getTypeLabel = (type: HistoryEntry['type']): string => {
    switch (type) {
      case 'created':
        return 'Created'
      case 'updated':
        return 'Updated'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'note':
        return 'Note'
      default:
        return 'Event'
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date)
    } catch {
      return dateString
    }
  }

  const formatDateShort = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date)
    } catch {
      return dateString
    }
  }

  if (!isOpen || !kpi) return null

  const raw = (kpi as any).raw || {}
  
  // Get all KPI details
  const projectFullCode = kpi.project_full_code || kpi.project_code || 'N/A'
  const projectSubCode = kpi.project_sub_code || raw['Project Sub Code'] || ''
  const activityName = kpi.activity_name || 'N/A'
  const inputType = kpi.input_type || raw['Input Type'] || 'N/A'
  const date = kpi.actual_date || kpi.target_date || kpi.activity_date || raw['Activity Date'] || raw['Target Date'] || raw['Actual Date'] || 'N/A'
  const quantity = kpi.quantity || raw['Quantity'] || 'N/A'
  const unit = kpi.unit || raw['Unit'] || ''
  const value = kpi.value || raw['Value'] || null
  const virtualValue = raw['Virtual Material Value'] || (kpi as any).virtual_value || null
  const zone = kpi.zone || raw['Zone'] || raw['Section'] || 'N/A'
  const division = (kpi as any).activity_division || raw['Activity Division'] || 'N/A'
  const scope = raw['Activity Scope'] || (kpi as any).activity_scope || 'N/A'
  const timing = kpi.activity_timing || raw['Activity Timing'] || 'N/A'
  const recordedBy = kpi.recorded_by || raw['Recorded By'] || 'N/A'
  const approvalStatus = (kpi as any).approval_status || raw['Approval Status'] || 'N/A'
  const approvedBy = (kpi as any).approved_by || raw['Approved By'] || 'N/A'
  const approvalDate = (kpi as any).approval_date || raw['Approval Date'] || 'N/A'
  const notes = kpi.notes || raw['Notes'] || ''

  // Get currency code (try to get from project or use default)
  const currencyCode = 'USD' // Default, can be enhanced to get from project

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                KPI Complete History & Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive information and activity timeline
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Complete Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Basic Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Building className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Project:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {projectFullCode}{projectSubCode && projectSubCode !== projectFullCode ? ` (${projectSubCode})` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {activityName}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Input Type:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      inputType === 'Planned' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {inputType}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {date !== 'N/A' ? formatDateShort(date) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantities & Values */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                Quantities & Values
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {quantity} {unit}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Value:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {value ? formatCurrencyByCodeSync(parseFloat(String(value)), currencyCode) : 'N/A'}
                    </span>
                  </div>
                </div>
                {virtualValue && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-gray-600 dark:text-gray-400">Virtual Value:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatCurrencyByCodeSync(parseFloat(String(virtualValue)), currencyCode)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Details */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-purple-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Activity Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Zone:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {zone}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Division:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {division}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Scope:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {scope}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Timing:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {timing}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval & Recording */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-orange-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                Approval & Recording
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400">Approval Status:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      approvalStatus === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : approvalStatus === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : approvalStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {approvalStatus}
                    </span>
                  </div>
                </div>
                {approvedBy !== 'N/A' && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-gray-600 dark:text-gray-400">Approved By:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {getUserDisplay(approvedBy)}
                      </span>
                    </div>
                  </div>
                )}
                {approvalDate !== 'N/A' && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-gray-600 dark:text-gray-400">Approval Date:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatDateShort(approvalDate)}
                      </span>
                    </div>
                  </div>
                )}
                {recordedBy !== 'N/A' && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-gray-600 dark:text-gray-400">Recorded By:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {getUserDisplay(recordedBy)}
                      </span>
                    </div>
                  </div>
                )}
                {notes && notes.trim() && !notes.includes('APPROVED:') && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {notes}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Complete History Timeline
            </h3>
            {loading ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <div>Loading complete history...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <div>No history available for this KPI</div>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-4 bg-white dark:bg-gray-800 border-l-4 border-gray-300 dark:border-gray-600 rounded-lg hover:shadow-lg transition-all duration-200"
                    style={{
                      borderLeftColor: 
                        entry.type === 'created' ? '#10b981' :
                        entry.type === 'updated' ? '#3b82f6' :
                        entry.type === 'approved' ? '#10b981' :
                        entry.type === 'rejected' ? '#ef4444' :
                        '#6b7280'
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-base">
                          {getTypeLabel(entry.type)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{getUserDisplay(entry.user)}</span>
                        {(() => {
                          const info = userInfo.get(entry.user)
                          if (info?.role || info?.division) {
                            return (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {info.role && `• ${info.role}`}
                                {info.division && ` • ${info.division}`}
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                      {entry.details && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                          {entry.details}
                        </div>
                      )}
                      {entry.field && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          <span className="font-medium">Field:</span> {entry.field}
                          {entry.oldValue && entry.newValue && (
                            <span className="ml-2">
                              <span className="line-through text-red-600 dark:text-red-400">{entry.oldValue}</span>
                              {' → '}
                              <span className="text-green-600 dark:text-green-400 font-medium">{entry.newValue}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {history.length > 0 && (
              <span>Total {history.length} event{history.length !== 1 ? 's' : ''} recorded</span>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

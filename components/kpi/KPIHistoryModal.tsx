'use client'

import { useState, useEffect } from 'react'
import { KPIRecord } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { X, User, Calendar, CheckCircle, Clock, AlertCircle, FileText, Edit, Plus, Trash2, History, Building, Activity, Target, DollarSign, Package, MapPin, Layers, Globe, TrendingUp, Mail, Phone, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'

interface KPIHistoryModalProps {
  kpi: KPIRecord | null
  isOpen: boolean
  onClose: () => void
}

interface FieldChange {
  field: string
  oldValue: string
  newValue: string
}

interface HistoryEntry {
  type: 'created' | 'updated' | 'approved' | 'rejected' | 'note'
  user: string
  date: string
  details?: string
  field?: string
  oldValue?: string
  newValue?: string
  changedFields?: FieldChange[] // ✅ All changed fields with old and new values
}

interface UserInfo {
  name: string
  email: string
  phone_1?: string
  phone_2?: string
  role?: string
  division?: string
}

export function KPIHistoryModal({ kpi, isOpen, onClose }: KPIHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Map<string, UserInfo>>(new Map())
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set()) // ✅ Track which entries are expanded

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
      const supabase = getSupabaseClient()
      const entries: HistoryEntry[] = []
      
      // ✅ STEP 1: Try to load from audit log first (most detailed history)
      try {
        const { data: auditLogs, error: auditError } = await supabase
          .from('kpi_audit_log')
          .select('*')
          .eq('kpi_id', kpi.id)
          .order('changed_at', { ascending: false })
        
        if (!auditError && auditLogs && auditLogs.length > 0) {
          console.log(`✅ Found ${auditLogs.length} audit log entries`)
          
          for (const log of auditLogs) {
            const logAny = log as any
            let eventType: HistoryEntry['type'] = 'updated'
            
            if (logAny.action === 'INSERT') {
              eventType = 'created'
            } else if (logAny.action === 'APPROVE') {
              eventType = 'approved'
            } else if (logAny.action === 'REJECT') {
              eventType = 'rejected'
            } else if (logAny.action === 'UPDATE') {
              eventType = 'updated'
            }
            
            // Extract field changes with old and new values
            const changedFields: Array<{field: string, oldValue: string, newValue: string}> = []
            if (logAny.old_values && logAny.new_values) {
              const oldVals = logAny.old_values as any
              const newVals = logAny.new_values as any
              
              // Check ALL fields to show what changed and what didn't
              const allFields = Object.keys({ ...oldVals, ...newVals })
              
              // Key fields to prioritize (user-visible fields)
              const keyFields = [
                'Project Code', 'Project Full Code', 'Activity Name', 
                'Quantity', 'Value', 'Input Type', 'Approval Status',
                'Zone', 'Unit', 'Target Date', 'Actual Date', 'Section',
                'Activity Division', 'Activity Scope', 'Activity Timing',
                'Notes', 'Recorded By', 'Approved By', 'Approval Date'
              ]
              
              // Combine key fields with all fields, removing duplicates
              const fieldsToCheck = Array.from(new Set([...keyFields, ...allFields]))
              
              for (const field of fieldsToCheck) {
                // Skip system/internal fields
                if (field === 'id' || field === 'created_at' || field === 'updated_at' || 
                    field === 'created_by' || field === 'updated_by') {
                  continue
                }
                
                const oldVal = oldVals[field]
                const newVal = newVals[field]
                
                // Check if value changed (including null/undefined/empty changes)
                const oldValStr = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim()
                const newValStr = newVal === null || newVal === undefined ? '' : String(newVal).trim()
                
                // Only add if values are actually different
                if (oldValStr !== newValStr) {
                  changedFields.push({
                    field,
                    oldValue: oldValStr || 'Empty',
                    newValue: newValStr || 'Empty'
                  })
                }
              }
            }
            
            // Build details
            let details = ''
            if (eventType === 'created') {
              details = 'KPI was created'
            } else if (changedFields.length > 0) {
              if (changedFields.length === 1) {
                details = `Changed: ${changedFields[0].field}`
              } else {
                details = `Changed ${changedFields.length} fields: ${changedFields.map(f => f.field).join(', ')}`
              }
            } else {
              details = 'KPI was updated'
            }
            
            // For single field change, show old → new (for backward compatibility)
            const singleChange = changedFields.length === 1 ? changedFields[0] : null
            
            entries.push({
              type: eventType,
              user: logAny.changed_by || 'System',
              date: logAny.changed_at,
              details,
              field: singleChange?.field,
              oldValue: singleChange?.oldValue,
              newValue: singleChange?.newValue,
              changedFields: changedFields.length > 0 ? changedFields : undefined // ✅ All changed fields
            })
          }
        }
      } catch (auditErr) {
        console.log('⚠️ Could not load audit log, using basic history:', auditErr)
      }
      
      // ✅ STEP 2: If no audit log, use basic history from KPI record
      if (entries.length === 0) {
        const raw = (kpi as any).raw || {}
        
        // 1. Creation Info
        if (kpi.created_at) {
          const createdBy = kpi.created_by || raw.created_by || 'System'
          entries.push({
            type: 'created',
            user: createdBy,
            date: kpi.created_at,
            details: 'KPI was created'
          })
        }

        // 2. Last Update Info
        if (kpi.updated_at && kpi.updated_at !== kpi.created_at) {
          const updatedBy = raw.updated_by || kpi.created_by || 'System'
          entries.push({
            type: 'updated',
            user: updatedBy,
            date: kpi.updated_at,
            details: 'KPI was updated'
          })
        }

        // 3. Approval Info
        const approvalStatus = raw['Approval Status'] || (kpi as any).approval_status || null
        const approvedBy = raw['Approved By'] || (kpi as any).approved_by || null
        const approvalDate = raw['Approval Date'] || (kpi as any).approval_date || null

        if (approvalStatus) {
          if (approvalStatus.toLowerCase() === 'approved') {
            entries.push({
              type: 'approved',
              user: approvedBy || 'Unknown',
              date: approvalDate || kpi.updated_at || kpi.created_at || new Date().toISOString(),
              details: 'KPI was approved'
            })
          } else if (approvalStatus.toLowerCase() === 'rejected') {
            entries.push({
              type: 'rejected',
              user: approvedBy || 'Unknown',
              date: approvalDate || kpi.updated_at || kpi.created_at || new Date().toISOString(),
              details: 'KPI was rejected'
            })
          }
        }
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
              .select('id, email, full_name, phone_1, phone_2, role, division')
              .eq('email', userId)
              .single()

            if (!emailError && userByEmail && typeof userByEmail === 'object') {
              const userData = userByEmail as { id: string; email?: string; full_name?: string; phone_1?: string; phone_2?: string; role?: string; division?: string }
              userMap.set(userId, {
                name: userData.full_name || userData.email?.split('@')[0] || userId,
                email: userData.email || userId,
                phone_1: userData.phone_1,
                phone_2: userData.phone_2,
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
              .select('id, email, full_name, phone_1, phone_2, role, division')
              .eq('id', userId)
              .single()

            if (!idError && data && typeof data === 'object' && 'email' in data) {
              const userData = data as { id: string; email?: string; full_name?: string; phone_1?: string; phone_2?: string; role?: string; division?: string }
              userMap.set(userId, {
                name: userData.full_name || userData.email?.split('@')[0] || userId,
                email: userData.email || userId,
                phone_1: userData.phone_1,
                phone_2: userData.phone_2,
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
                    .select('id, email, full_name, phone_1, phone_2, role, division')
                    .eq('email', userId)
                    .single()
                  
                  if (emailData) {
                    const userData = emailData as { id: string; email?: string; full_name?: string; phone_1?: string; phone_2?: string; role?: string; division?: string }
                    userMap.set(userId, {
                      name: userData.full_name || userData.email?.split('@')[0] || userId,
                      email: userData.email || userId,
                      phone_1: userData.phone_1,
                      phone_2: userData.phone_2,
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
          {/* ✅ Simplified KPI Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Info */}
            <div className="p-4 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Project:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{projectFullCode}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{activityName}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    inputType === 'Planned' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {inputType}
                  </span>
                </div>
              </div>
            </div>

            {/* Quantities */}
            <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quantities</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{quantity} {unit}</div>
                </div>
                {value && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Value:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatCurrencyByCodeSync(parseFloat(String(value)), currencyCode)}
                    </div>
                  </div>
                )}
                {zone !== 'N/A' && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Zone:</span>
                    <div className="font-medium text-gray-900 dark:text-white">{zone}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="p-4 bg-orange-50 dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Approval:</span>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
                {recordedBy !== 'N/A' && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Recorded By:</span>
                    <div className="font-medium text-gray-900 dark:text-white text-xs">
                      {getUserDisplay(recordedBy)}
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
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {entry.details}
                        </div>
                      )}
                      
                      {/* ✅ Show all changed fields with expand/collapse button */}
                      {((entry.changedFields && entry.changedFields.length > 0) || (entry.field && entry.oldValue && entry.newValue)) && (
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedEntries)
                              if (newExpanded.has(index)) {
                                newExpanded.delete(index)
                              } else {
                                newExpanded.add(index)
                              }
                              setExpandedEntries(newExpanded)
                            }}
                            className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full text-left py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            {expandedEntries.has(index) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <Edit className="w-3 h-3" />
                            <span>
                              {entry.changedFields 
                                ? `View Changes (${entry.changedFields.length} field${entry.changedFields.length !== 1 ? 's' : ''})`
                                : 'View Change Details'}
                            </span>
                          </button>
                          
                          {expandedEntries.has(index) && (
                            <div className="mt-2 space-y-2 pl-6">
                              {entry.changedFields && entry.changedFields.length > 0 ? (
                                entry.changedFields.map((change, idx) => (
                                  <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      {change.field}:
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="line-through text-red-600 dark:text-red-400 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">
                                        {change.oldValue || 'Empty'}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded">
                                        {change.newValue || 'Empty'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : entry.field && entry.oldValue && entry.newValue ? (
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {entry.field}:
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="line-through text-red-600 dark:text-red-400 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">
                                      {entry.oldValue}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded">
                                      {entry.newValue}
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* ✅ Contact Info */}
                      {(() => {
                        const info = userInfo.get(entry.user)
                        if (info && (info.email || info.phone_1 || info.phone_2)) {
                          return (
                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-full mb-1">
                                Contact Information:
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {info.email && (
                                  <a 
                                    href={`mailto:${info.email}`}
                                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>{info.email}</span>
                                  </a>
                                )}
                                {info.phone_1 && (
                                  <div className="flex items-center gap-1">
                                    <a 
                                      href={`tel:${info.phone_1}`}
                                      className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{info.phone_1}</span>
                                    </a>
                                    <a 
                                      href={`https://wa.me/${info.phone_1.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline px-1 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                      title={`WhatsApp: ${info.phone_1}`}
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                                {info.phone_2 && (
                                  <div className="flex items-center gap-1">
                                    <a 
                                      href={`tel:${info.phone_2}`}
                                      className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{info.phone_2}</span>
                                    </a>
                                    <a 
                                      href={`https://wa.me/${info.phone_2.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline px-1 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                      title={`WhatsApp: ${info.phone_2}`}
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
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

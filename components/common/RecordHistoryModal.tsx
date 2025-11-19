'use client'

import { useState, useEffect } from 'react'
import { X, User, Calendar, Edit, Plus, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

interface UserInfo {
  full_name?: string
  email?: string
  role?: string
  division?: string
}

interface HistoryEvent {
  type: 'created' | 'updated' | 'approved' | 'rejected'
  timestamp: string
  user: string
  userInfo?: UserInfo
  changes?: Record<string, { old: any; new: any }>
  notes?: string
}

interface RecordHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  recordType: 'kpi' | 'boq' | 'project'
  recordId: string
  recordData?: any
  title?: string
}

export function RecordHistoryModal({
  isOpen,
  onClose,
  recordType,
  recordId,
  recordData,
  title
}: RecordHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [userInfoCache, setUserInfoCache] = useState<Map<string, UserInfo>>(new Map())
  const [currentRecord, setCurrentRecord] = useState<any>(null)

  // Load user info from users table
  const loadUserInfo = async (userIdentifier: string): Promise<UserInfo | null> => {
    if (!userIdentifier || userIdentifier === 'System' || userIdentifier === 'N/A') {
      return null
    }

    // Check cache first
    if (userInfoCache.has(userIdentifier)) {
      return userInfoCache.get(userIdentifier) || null
    }

    try {
      const supabase = getSupabaseClient()
      
          // Try to find by email first
          let userData: any = null
          if (userIdentifier.includes('@')) {
            const { data } = await supabase
              .from('users')
              .select('full_name, email, role, division')
              .eq('email', userIdentifier)
              .single()
            
            if (data) {
              userData = data
            }
          }
          
          // If not found by email, try by ID
          if (!userData) {
            const { data } = await supabase
              .from('users')
              .select('full_name, email, role, division')
              .eq('id', userIdentifier)
              .single()
            
            if (data) {
              userData = data
            }
          }

          if (userData) {
            const info: UserInfo = {
              full_name: userData.full_name,
              email: userData.email,
              role: userData.role,
              division: userData.division
            }
        setUserInfoCache(prev => new Map(prev).set(userIdentifier, info))
        return info
      }
    } catch (error) {
      console.error('Error loading user info:', error)
    }

    return null
  }

  // Get user display name
  const getUserDisplay = (userIdentifier: string, userInfo?: UserInfo): string => {
    if (!userIdentifier || userIdentifier === 'System' || userIdentifier === 'N/A') {
      return 'System'
    }

    if (userInfo?.full_name) {
      const parts = [userInfo.full_name]
      if (userInfo.role) parts.push(`(${userInfo.role})`)
      return parts.join(' ')
    }

    return userIdentifier
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  // Load record history
  useEffect(() => {
    if (!isOpen || !recordId) return

    const loadHistory = async () => {
      setLoading(true)
      try {
        const supabase = getSupabaseClient()
        
        // Determine table name based on record type
        let tableName = ''
        switch (recordType) {
          case 'kpi':
            tableName = 'Planning Database - KPI'
            break
          case 'boq':
            tableName = 'Planning Database - BOQ Rates'
            break
          case 'project':
            tableName = 'Planning Database - ProjectsList'
            break
        }

        // Fetch current record
        const { data: record, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', recordId)
          .single()

        if (error) {
          console.error('Error fetching record:', error)
          setLoading(false)
          return
        }

        setCurrentRecord(record as any)

        // Build history events
        const events: HistoryEvent[] = []
        const recordAny = record as any

        // ✅ STEP 1: Try to load from audit log tables first (complete history)
        let auditLogEvents: HistoryEvent[] = []
        try {
          let auditTableName = ''
          let recordIdColumn = ''
          switch (recordType) {
            case 'kpi':
              auditTableName = 'kpi_audit_log'
              recordIdColumn = 'kpi_id'
              break
            case 'boq':
              auditTableName = 'boq_audit_log'
              recordIdColumn = 'boq_id'
              break
            case 'project':
              auditTableName = 'projects_audit_log'
              recordIdColumn = 'project_id'
              break
          }

          if (auditTableName) {
            const { data: auditLogs, error: auditError } = await supabase
              .from(auditTableName)
              .select('*')
              .eq(recordIdColumn, recordId)
              .order('changed_at', { ascending: true })

            if (!auditError && auditLogs && auditLogs.length > 0) {
              console.log(`✅ Found ${auditLogs.length} audit log entries for ${recordType} ${recordId}`)
              
              for (const log of auditLogs) {
                const logAny = log as any
                const changedByInfo = await loadUserInfo(logAny.changed_by)
                
                let eventType: 'created' | 'updated' | 'approved' | 'rejected' = 'updated'
                if (logAny.action === 'INSERT') {
                  eventType = 'created'
                } else if (logAny.action === 'APPROVE') {
                  eventType = 'approved'
                } else if (logAny.action === 'REJECT') {
                  eventType = 'rejected'
                } else if (logAny.action === 'UPDATE') {
                  eventType = 'updated'
                }

                // Extract changes summary if available
                let changesSummary = ''
                if (logAny.old_values && logAny.new_values) {
                  const oldVals = logAny.old_values as any
                  const newVals = logAny.new_values as any
                  const changedFields: string[] = []
                  
                  // Compare key fields based on record type
                  let keyFields: string[] = []
                  if (recordType === 'kpi') {
                    keyFields = ['Project Code', 'Activity Name', 'Quantity', 'Value', 'Input Type', 'Approval Status']
                  } else if (recordType === 'boq') {
                    keyFields = ['Project Code', 'Activity', 'Planned Units', 'Total Value', 'Activity Status']
                  } else if (recordType === 'project') {
                    keyFields = ['Project Code', 'Project Name', 'Project Status', 'Contract Amount']
                  }
                  
                  for (const field of keyFields) {
                    if (oldVals[field] !== undefined && newVals[field] !== undefined && 
                        String(oldVals[field]) !== String(newVals[field])) {
                      changedFields.push(`${field}: ${oldVals[field]} → ${newVals[field]}`)
                    }
                  }
                  
                  if (changedFields.length > 0) {
                    changesSummary = `Changed: ${changedFields.slice(0, 5).join(', ')}${changedFields.length > 5 ? '...' : ''}`
                  }
                }

                auditLogEvents.push({
                  type: eventType,
                  timestamp: logAny.changed_at,
                  user: logAny.changed_by,
                  userInfo: changedByInfo || undefined,
                  changes: logAny.old_values && logAny.new_values ? {
                    old: logAny.old_values,
                    new: logAny.new_values
                  } : undefined,
                  notes: changesSummary || logAny.changes_summary
                })
              }
            } else {
              console.log(`⚠️ No audit log entries found, using basic history`)
            }
          }
        } catch (auditErr) {
          console.error('Error loading audit log:', auditErr)
        }

        // ✅ STEP 2: If audit log exists, use it; otherwise use basic history
        if (auditLogEvents.length > 0) {
          events.push(...auditLogEvents)
          console.log(`✅ Using ${auditLogEvents.length} audit log events`)
        } else {
          // Fallback to basic history (created_by, updated_by)
          // 1. Created event
          if (recordAny.created_by) {
            const createdByInfo = await loadUserInfo(recordAny.created_by)
            events.push({
              type: 'created',
              timestamp: recordAny.created_at || new Date().toISOString(),
              user: recordAny.created_by,
              userInfo: createdByInfo || undefined
            })
          } else if (recordAny.created_at) {
            events.push({
              type: 'created',
              timestamp: recordAny.created_at,
              user: 'System'
            })
          }

          // 2. Updated events (from updated_by and updated_at)
          if (recordAny.updated_by && recordAny.updated_at) {
            const updatedByInfo = await loadUserInfo(recordAny.updated_by)
            events.push({
              type: 'updated',
              timestamp: recordAny.updated_at,
              user: recordAny.updated_by,
              userInfo: updatedByInfo || undefined
            })
          }

          // 3. Approval events (for KPI)
          if (recordType === 'kpi') {
            if (recordAny['Approval Status'] === 'approved' && recordAny['Approved By']) {
              const approvedByInfo = await loadUserInfo(recordAny['Approved By'])
              events.push({
                type: 'approved',
                timestamp: recordAny['Approval Date'] || recordAny.updated_at || recordAny.created_at,
                user: recordAny['Approved By'],
                userInfo: approvedByInfo || undefined
              })
            } else if (recordAny['Approval Status'] === 'rejected' && recordAny['Approved By']) {
              const rejectedByInfo = await loadUserInfo(recordAny['Approved By'])
              events.push({
                type: 'rejected',
                timestamp: recordAny['Approval Date'] || recordAny.updated_at || recordAny.created_at,
                user: recordAny['Approved By'],
                userInfo: rejectedByInfo || undefined
              })
            }
          }
          console.log(`⚠️ Using basic history (${events.length} events) - Audit log not available`)
        }

        // Sort events by timestamp
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        console.log(`✅ Loaded ${events.length} total history events for ${recordType} ${recordId}`)
        setHistory(events)
      } catch (error) {
        console.error('Error loading history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [isOpen, recordId, recordType, userInfoCache])

  if (!isOpen) return null

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Plus className="h-4 w-4 text-blue-500" />
      case 'updated':
        return <Edit className="h-4 w-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'updated':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'rejected':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'created':
        return 'Created'
      case 'updated':
        return 'Updated'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Event'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title || `${recordType.toUpperCase()} Complete History`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive information and activity timeline
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No history available</p>
            </div>
          ) : (
            <>
              {/* Current Record Info */}
              {currentRecord && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Current Record</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Created By:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {(currentRecord as any).created_by || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Last Updated By:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {(currentRecord as any).updated_by || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Created At:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDate((currentRecord as any).created_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDate((currentRecord as any).updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Complete History Timeline
                </h3>
                <div className="space-y-4">
                  {history.map((event, index) => (
                    <div
                      key={index}
                      className={`border-l-4 pl-4 py-3 rounded-r-lg ${getEventColor(event.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getEventIcon(event.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getEventLabel(event.type)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <User className="h-4 w-4" />
                            <span>{getUserDisplay(event.user, event.userInfo)}</span>
                            {event.userInfo?.email && event.userInfo.email !== event.user && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • {event.userInfo.email}
                              </span>
                            )}
                          </div>
                          {event.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {event.notes}
                            </p>
                          )}
                          {event.changes && event.changes.old && event.changes.new && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                                View Detailed Changes
                              </summary>
                              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs space-y-1 max-h-60 overflow-y-auto">
                                {Object.keys(event.changes.new).slice(0, 20).map((key) => {
                                  const oldVals = event.changes?.old as any
                                  const newVals = event.changes?.new as any
                                  const oldVal = oldVals?.[key]
                                  const newVal = newVals?.[key]
                                  if (oldVal !== undefined && newVal !== undefined && String(oldVal) !== String(newVal)) {
                                    return (
                                      <div key={key} className="flex gap-2 py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">{key}:</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <span className="text-red-600 dark:text-red-400 line-through text-[10px]">{String(oldVal).substring(0, 50)}</span>
                                          <span className="text-gray-400">→</span>
                                          <span className="text-green-600 dark:text-green-400 text-[10px]">{String(newVal).substring(0, 50)}</span>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })}
                                {Object.keys(event.changes.new).length > 20 && (
                                  <p className="text-gray-500 dark:text-gray-400 text-center pt-2">
                                    ... and {Object.keys(event.changes.new).length - 20} more changes
                                  </p>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Total {history.length} event{history.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { X, Clock, Plus, Minus } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'

interface VariationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  variationId: string
  getBOQItemDescription?: (boqItemId: string) => string
}

interface HistoryEntry {
  id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by: string
  changed_at: string
  old_values: any
  new_values: any
}

interface FieldChange {
  field: string
  oldValue: any
  newValue: any
}

interface UserInfo {
  name: string
  email?: string
}

export function VariationHistoryModal({ 
  isOpen, 
  onClose, 
  variationId,
  getBOQItemDescription 
}: VariationHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [userInfoCache, setUserInfoCache] = useState<Map<string, UserInfo>>(new Map())

  useEffect(() => {
    if (isOpen && variationId) {
      fetchHistory()
    } else {
      setHistory([])
      setError('')
      setExpandedEntries(new Set())
    }
  }, [isOpen, variationId])

  // Set first entry (most recent) as expanded by default
  useEffect(() => {
    if (history.length > 0 && expandedEntries.size === 0) {
      setExpandedEntries(new Set([history[0].id]))
    }
  }, [history])

  const loadUserInfo = async (userIdentifier: string): Promise<UserInfo | null> => {
    if (!userIdentifier || userIdentifier === 'System' || userIdentifier === 'Unknown') {
      return null
    }

    // Check cache first
    if (userInfoCache.has(userIdentifier)) {
      return userInfoCache.get(userIdentifier) || null
    }

    try {
      const supabase = getSupabaseClient()
      let userData: any = null

      // Try to find by email first
      if (userIdentifier.includes('@')) {
        const { data } = await supabase
          .from('users')
          .select('full_name, email')
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
          .select('full_name, email')
          .eq('id', userIdentifier)
          .single()
        
        if (data) {
          userData = data
        }
      }

      if (userData) {
        const info: UserInfo = {
          name: userData.full_name || userData.email?.split('@')[0] || userIdentifier,
          email: userData.email || userIdentifier
        }
        setUserInfoCache(prev => new Map(prev).set(userIdentifier, info))
        return info
      } else {
        // If not found, use identifier as name
        const info: UserInfo = {
          name: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
          email: userIdentifier.includes('@') ? userIdentifier : undefined
        }
        setUserInfoCache(prev => new Map(prev).set(userIdentifier, info))
        return info
      }
    } catch (error) {
      console.error('Error loading user info:', error)
      // Return fallback info
      const info: UserInfo = {
        name: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
        email: userIdentifier.includes('@') ? userIdentifier : undefined
      }
      setUserInfoCache(prev => new Map(prev).set(userIdentifier, info))
      return info
    }
  }

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError('')
      const supabase = getSupabaseClient()
      
      const { data, error: fetchError } = await supabase
        .from('contract_variations_history')
        .select('*')
        .eq('variation_id', variationId)
        .order('changed_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      const historyData = data || []
      setHistory(historyData)
      
      // Load user info for all unique users in history
      const uniqueUsers = new Set<string>()
      historyData.forEach((entry: HistoryEntry) => {
        if (entry.changed_by && entry.changed_by !== 'System') {
          uniqueUsers.add(entry.changed_by)
        }
      })
      
      // Load user info for all users
      await Promise.all(Array.from(uniqueUsers).map(userId => loadUserInfo(userId)))
    } catch (err: any) {
      console.error('Error fetching history:', err)
      setError(err.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const getFieldDisplayName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      'Auto Generated Unique Reference Number': 'Reference Number',
      'Project Full Code': 'Project Full Code',
      'Project Name': 'Project Name',
      'Variation Ref no.': 'Variation Ref No.',
      'Item Description': 'BOQ Item',
      'Quantity Changes': 'Quantity Changes',
      'Variation Amount': 'Variation Amount',
      'Date of Submission': 'Date of Submission',
      'Variation Status': 'Status',
      'Date of Approval': 'Date of Approval',
      'Remarks': 'Remarks',
    }
    return fieldMap[field] || field
  }

  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return '-'
    
    // Format currency fields
    if (field.includes('Amount') || field === 'Variation Amount') {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value))
      if (!isNaN(numValue)) {
        return formatCurrencyByCodeSync(numValue, 'AED')
      }
    }
    
    // Format numeric fields
    if (field === 'Quantity Changes') {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value))
      if (!isNaN(numValue)) {
        return numValue.toFixed(2)
      }
    }
    
    // Format boolean
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    // Format date
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString()
    }
    
    // Handle BOQ Item UUID - show description if function provided
    if (field === 'Item Description' && getBOQItemDescription && typeof value === 'string') {
      const description = getBOQItemDescription(value)
      if (description && description !== value) {
        return `${description} (${value.substring(0, 8)}...)`
      }
    }
    
    return String(value)
  }

  const getChanges = (entry: HistoryEntry): FieldChange[] => {
    const changes: FieldChange[] = []
    
    if (entry.action === 'INSERT' && entry.new_values) {
      // For INSERT, show all fields as new
      Object.keys(entry.new_values).forEach(key => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'created_by' && key !== 'updated_by') {
          changes.push({
            field: key,
            oldValue: null,
            newValue: entry.new_values[key]
          })
        }
      })
    } else if (entry.action === 'UPDATE' && entry.old_values && entry.new_values) {
      // For UPDATE, show only changed fields
      Object.keys(entry.new_values).forEach(key => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'created_by' && key !== 'updated_by') {
          const oldVal = entry.old_values[key]
          const newVal = entry.new_values[key]
          
          // Compare values (handle different types)
          const oldStr = String(oldVal ?? '')
          const newStr = String(newVal ?? '')
          
          if (oldStr !== newStr) {
            changes.push({
              field: key,
              oldValue: oldVal,
              newValue: newVal
            })
          }
        }
      })
    } else if (entry.action === 'DELETE' && entry.old_values) {
      // For DELETE, show all fields as removed
      Object.keys(entry.old_values).forEach(key => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'created_by' && key !== 'updated_by') {
          changes.push({
            field: key,
            oldValue: entry.old_values[key],
            newValue: null
          })
        }
      })
    }
    
    return changes
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const toggleEntry = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedEntries(new Set(history.map(entry => entry.id)))
  }

  const collapseAll = () => {
    setExpandedEntries(new Set())
  }

  const getSummary = (entry: HistoryEntry): string => {
    const changes = getChanges(entry)
    if (changes.length === 0) return 'No changes'
    
    // Get key field names for summary
    const keyFields = changes.slice(0, 3).map(change => getFieldDisplayName(change.field))
    const remaining = changes.length - 3
    
    if (remaining > 0) {
      return `${keyFields.join(', ')}, and ${remaining} more field${remaining > 1 ? 's' : ''}`
    }
    return keyFields.join(', ')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <CardTitle>Change History</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 1 && (
                <>
                  <Button variant="ghost" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No history found for this variation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => {
                const changes = getChanges(entry)
                const isExpanded = expandedEntries.has(entry.id)
                const summary = getSummary(entry)
                
                return (
                  <div
                    key={entry.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    {/* Header - Clickable */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => toggleEntry(entry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEntry(entry.id)
                            }}
                            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                          <div className="flex items-center gap-2 flex-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(entry.action)}`}>
                              {entry.action}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              by {(() => {
                                const userInfo = userInfoCache.get(entry.changed_by)
                                return userInfo?.name || entry.changed_by || 'System'
                              })()}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-500">
                              {new Date(entry.changed_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {!isExpanded && changes.length > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic ml-2">
                            {summary}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && changes.length > 0 && (
                      <div className="px-4 pb-4 pt-0 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide pt-3">
                          Changed Fields ({changes.length})
                        </div>
                        <div className="space-y-2">
                          {changes.map((change, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm"
                            >
                              <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                {getFieldDisplayName(change.field)}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Old Value</div>
                                  <div className="text-gray-700 dark:text-gray-300">
                                    {change.oldValue === null ? (
                                      <span className="text-gray-400 italic">-</span>
                                    ) : (
                                      formatValue(change.oldValue, change.field)
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Value</div>
                                  <div className="text-gray-700 dark:text-gray-300">
                                    {change.newValue === null ? (
                                      <span className="text-gray-400 italic">-</span>
                                    ) : (
                                      formatValue(change.newValue, change.field)
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>

        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}

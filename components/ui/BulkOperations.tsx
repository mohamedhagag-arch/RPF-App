'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Alert } from './Alert'
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit, 
  Download, 
  Upload,
  Copy,
  Archive,
  Tag,
  Calendar,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building
} from 'lucide-react'

interface BulkOperation {
  id: string
  type: 'project' | 'activity' | 'kpi'
  title: string
  status: string
  projectCode?: string
  selected?: boolean
}

interface BulkOperationsProps {
  items: BulkOperation[]
  onSelectionChange: (selectedIds: string[]) => void
  onBulkAction: (action: string, selectedIds: string[]) => void
  type: 'project' | 'activity' | 'kpi'
  className?: string
}

export function BulkOperations({ 
  items, 
  onSelectionChange, 
  onBulkAction, 
  type,
  className = "" 
}: BulkOperationsProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showActions, setShowActions] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([])
      onSelectionChange([])
    } else {
      const allIds = items.map(item => item.id)
      setSelectedItems(allIds)
      onSelectionChange(allIds)
    }
  }

  const handleSelectItem = (itemId: string) => {
    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId]
    
    setSelectedItems(newSelection)
    onSelectionChange(newSelection)
  }

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return

    setActionLoading(action)
    try {
      await onBulkAction(action, selectedItems)
      setSelectedItems([])
      onSelectionChange([])
      setShowActions(false)
    } catch (error) {
      console.error('Bulk action error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getAvailableActions = () => {
    const baseActions = [
      {
        id: 'export',
        label: 'Export Selected',
        icon: Download,
        color: 'blue',
        description: 'Export selected items to Excel/CSV'
      },
      {
        id: 'copy',
        label: 'Copy Selected',
        icon: Copy,
        color: 'green',
        description: 'Copy selected items'
      }
    ]

    const statusActions = [
      {
        id: 'mark_completed',
        label: 'Mark as Completed',
        icon: CheckCircle,
        color: 'green',
        description: 'Mark selected items as completed'
      },
      {
        id: 'mark_delayed',
        label: 'Mark as Delayed',
        icon: AlertTriangle,
        color: 'red',
        description: 'Mark selected items as delayed'
      },
      {
        id: 'mark_on_track',
        label: 'Mark as On Track',
        icon: Clock,
        color: 'blue',
        description: 'Mark selected items as on track'
      }
    ]

    const managementActions = [
      {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        color: 'yellow',
        description: 'Archive selected items'
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        color: 'red',
        description: 'Delete selected items (irreversible)'
      }
    ]

    const typeSpecificActions = {
      project: [
        {
          id: 'assign_division',
          label: 'Assign Division',
          icon: Building,
          color: 'purple',
          description: 'Assign selected projects to a division'
        },
        {
          id: 'update_status',
          label: 'Update Status',
          icon: Settings,
          color: 'indigo',
          description: 'Update status of selected projects'
        }
      ],
      activity: [
        {
          id: 'assign_engineer',
          label: 'Assign Engineer',
          icon: Users,
          color: 'purple',
          description: 'Assign selected activities to an engineer'
        },
        {
          id: 'update_dates',
          label: 'Update Dates',
          icon: Calendar,
          color: 'indigo',
          description: 'Update dates for selected activities'
        }
      ],
      kpi: [
        {
          id: 'update_targets',
          label: 'Update Targets',
          icon: Tag,
          color: 'purple',
          description: 'Update targets for selected KPIs'
        },
        {
          id: 'generate_report',
          label: 'Generate Report',
          icon: Download,
          color: 'indigo',
          description: 'Generate report for selected KPIs'
        }
      ]
    }

    return [
      ...baseActions,
      ...statusActions,
      ...managementActions,
      ...(typeSpecificActions[type] || [])
    ]
  }

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
      green: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300',
      red: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300',
      yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
      purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300',
      indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50',
      completed: 'text-blue-600 bg-blue-50',
      on_track: 'text-green-600 bg-green-50',
      delayed: 'text-red-600 bg-red-50',
      on_hold: 'text-yellow-600 bg-yellow-50'
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selection Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center space-x-2"
              >
                {selectedItems.length === items.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>
                  {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                </span>
              </Button>
              
              <span className="text-sm text-gray-600">
                {selectedItems.length} of {items.length} selected
              </span>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                >
                  Bulk Actions ({selectedItems.length})
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedItems([])
                    onSelectionChange([])
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Panel */}
      {showActions && selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Bulk Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getAvailableActions().map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className={`h-auto p-4 flex flex-col items-start space-y-2 ${getColorClasses(action.color)}`}
                    onClick={() => handleBulkAction(action.id)}
                    disabled={actionLoading === action.id}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{action.label}</span>
                    </div>
                    <p className="text-xs opacity-75 text-left">{action.description}</p>
                    {actionLoading === action.id && (
                      <div className="loading-spinner h-3 w-3"></div>
                    )}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectItem(item.id)}
                  className="p-1"
                >
                  {selectedItems.includes(item.id) ? (
                    <CheckSquare className="h-4 w-4 text-primary-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      {item.projectCode && (
                        <p className="text-sm text-gray-600">{item.projectCode}</p>
                      )}
                    </div>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedItems.length > 0 && (
        <Alert variant="default">
          <div className="flex items-center justify-between">
            <span>
              {selectedItems.length} {type}(s) selected
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('export')}
                disabled={actionLoading === 'export'}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('mark_completed')}
                disabled={actionLoading === 'mark_completed'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          </div>
        </Alert>
      )}
    </div>
  )
}

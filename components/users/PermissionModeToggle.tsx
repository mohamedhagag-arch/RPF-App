'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Crown, Settings, AlertTriangle, Info } from 'lucide-react'

interface PermissionModeToggleProps {
  currentMode: 'role' | 'custom'
  userRole: string
  onToggle: (mode: 'role' | 'custom') => void
  disabled?: boolean
}

export function PermissionModeToggle({ 
  currentMode, 
  userRole, 
  onToggle, 
  disabled = false 
}: PermissionModeToggleProps) {
  const [showWarning, setShowWarning] = useState(false)

  const handleToggle = () => {
    if (currentMode === 'role') {
      // التبديل من نظام الأدوار إلى الصلاحيات المخصصة
      setShowWarning(true)
    } else {
      // التبديل من الصلاحيات المخصصة إلى نظام الأدوار
      onToggle('role')
    }
  }

  const confirmToggle = () => {
    onToggle('custom')
    setShowWarning(false)
  }

  if (disabled) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
        <Crown className="h-4 w-4" />
        <span className="text-sm">Role-based (System Default)</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Current Mode Display */}
      <div className="flex items-center space-x-2">
        {currentMode === 'role' ? (
          <>
            <Crown className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Role-based Permissions
            </span>
          </>
        ) : (
          <>
            <Settings className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Custom Permissions
            </span>
          </>
        )}
      </div>

      {/* Toggle Button */}
      {!showWarning && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="flex items-center space-x-2"
        >
          {currentMode === 'role' ? (
            <>
              <Settings className="h-3 w-3" />
              <span>Switch to Custom Permissions</span>
            </>
          ) : (
            <>
              <Crown className="h-3 w-3" />
              <span>Switch to Role-based</span>
            </>
          )}
        </Button>
      )}

      {/* Warning Dialog */}
      {showWarning && (
        <div className="space-y-3">
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <h4 className="font-medium">Switch to Custom Permissions?</h4>
              <p className="text-sm mt-1">
                This will allow you to customize individual permissions for this user. 
                The role-based permissions will be used as a starting point.
              </p>
            </div>
          </Alert>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWarning(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmToggle}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Settings className="h-3 w-3 mr-1" />
              Switch to Custom
            </Button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {currentMode === 'role' ? (
          <div className="flex items-start space-x-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Permissions are automatically managed based on the user's role ({userRole}). 
              Changes to the role will update permissions automatically.
            </span>
          </div>
        ) : (
          <div className="flex items-start space-x-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Permissions are manually configured. Role changes won't affect permissions 
              unless you switch back to role-based mode.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { PermissionGuard } from '@/components/common/PermissionGuard'

interface PermissionMenuItemProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  category?: string
  action?: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
  role?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
}

/**
 * Menu item component that automatically checks permissions
 * مكون عنصر قائمة يفحص الصلاحيات تلقائياً
 */
export function PermissionMenuItem({
  permission,
  permissions,
  requireAll = false,
  category,
  action,
  role,
  fallback = null,
  children,
  className = '',
  onClick,
  active = false,
  disabled = false
}: PermissionMenuItemProps) {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      category={category}
      action={action}
      role={role}
      fallback={fallback}
    >
      <div
        className={`cursor-pointer px-4 py-2 rounded-lg transition-colors ${
          active 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </div>
    </PermissionGuard>
  )
}

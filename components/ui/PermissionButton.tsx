'use client'

import React from 'react'
import { Button } from './Button'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface PermissionButtonProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  category?: string
  action?: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
  role?: string
  fallback?: React.ReactNode
  disabledWhenNoPermission?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
  children: React.ReactNode
  [key: string]: any
}

/**
 * Button component that automatically checks permissions
 * مكون زر يفحص الصلاحيات تلقائياً
 */
export function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  category,
  action,
  role,
  fallback = null,
  disabledWhenNoPermission = false,
  disabled = false,
  ...props
}: PermissionButtonProps) {
  const guard = usePermissionGuard()
  
  let hasAccess = false
  
  // Check single permission
  if (permission) {
    hasAccess = guard.hasAccess(permission)
  }
  // Check multiple permissions
  else if (permissions) {
    hasAccess = requireAll 
      ? guard.hasAllAccess(permissions)
      : guard.hasAnyAccess(permissions)
  }
  // Check category + action
  else if (category && action) {
    hasAccess = guard.canDo(category, action)
  }
  // Check role
  else if (role) {
    hasAccess = guard.hasRole(role)
  }

  // If no access and fallback is provided, show fallback
  if (!hasAccess && fallback) {
    return <>{fallback}</>
  }

  // If no access and no fallback, don't render button
  if (!hasAccess) {
    return null
  }

  return (
    <Button
      disabled={disabled || (disabledWhenNoPermission && !hasAccess)}
      {...props}
    />
  )
}

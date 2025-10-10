'use client'

import React from 'react'
import { PermissionGuard } from '@/components/common/PermissionGuard'

interface PermissionSectionProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  category?: string
  action?: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
  role?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Section component that automatically checks permissions
 * مكون قسم يفحص الصلاحيات تلقائياً
 */
export function PermissionSection({
  permission,
  permissions,
  requireAll = false,
  category,
  action,
  role,
  fallback = null,
  children,
  className
}: PermissionSectionProps) {
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
      <div className={className}>
        {children}
      </div>
    </PermissionGuard>
  )
}

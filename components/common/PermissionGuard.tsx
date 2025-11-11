'use client'

import React from 'react'
import { usePermissionGuard, PermissionGuardProps, checkPermissionFromProps } from '@/lib/permissionGuard'

/**
 * Permission Guard Component
 * مكون حراسة الصلاحيات
 */
export function PermissionGuard({ 
  permission, 
  permissions, 
  requireAll = false,
  category,
  action,
  role,
  fallback = null,
  children 
}: PermissionGuardProps) {
  const guard = usePermissionGuard()
  
  const hasPermission = checkPermissionFromProps(guard, {
    permission,
    permissions,
    requireAll,
    category,
    action,
    role,
    children,
    fallback
  })

  // ✅ PERFORMANCE: Only log in development mode and very rarely (0.1%)
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
  console.log('🔍 Permission Guard Component: Access result:', hasPermission ? '✅ Granted' : '❌ Denied')
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * Higher-Order Component for Permission Protection
 * مكون عالي المستوى لحماية الصلاحيات
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission?: string,
  fallback?: React.ReactNode
) {
  return function ProtectedComponent(props: P) {
    const guard = usePermissionGuard()
    
    if (permission && !guard.hasAccess(permission)) {
      return <>{fallback}</>
    }
    
    return <Component {...props} />
  }
}


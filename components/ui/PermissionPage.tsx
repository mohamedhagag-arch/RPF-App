'use client'

import React from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { LoadingSpinner } from './LoadingSpinner'
import { Alert } from './Alert'
import { Lock, Shield, AlertTriangle } from 'lucide-react'

interface PermissionPageProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  category?: string
  action?: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
  role?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  showAccessDenied?: boolean
  accessDeniedTitle?: string
  accessDeniedMessage?: string
}

/**
 * Page component that automatically checks permissions
 * مكون صفحة يفحص الصلاحيات تلقائياً
 */
export function PermissionPage({
  permission,
  permissions,
  requireAll = false,
  category,
  action,
  role,
  fallback,
  children,
  showAccessDenied = true,
  accessDeniedTitle = 'Access Denied',
  accessDeniedMessage = 'You do not have permission to access this page.'
}: PermissionPageProps) {
  const guard = usePermissionGuard()
  const { loading } = useAuth()
  
  // ✅ Wait for authentication to load before checking permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }
  
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

  // If no access, show access denied or fallback
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full mx-auto">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/40 mb-6">
                <Lock className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {accessDeniedTitle}
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {accessDeniedMessage}
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>Contact your administrator for access</span>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Current role: {guard.user?.role || 'Unknown'}</span>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  return <>{children}</>
}

/**
 * Hook to check if current page should be accessible
 * Hook للتحقق من إمكانية الوصول للصفحة الحالية
 */
export function usePageAccess(permission?: string, permissions?: string[], requireAll = false): boolean {
  const guard = usePermissionGuard()
  
  if (permission) {
    return guard.hasAccess(permission)
  }
  
  if (permissions) {
    return requireAll 
      ? guard.hasAllAccess(permissions)
      : guard.hasAnyAccess(permissions)
  }
  
  return true
}

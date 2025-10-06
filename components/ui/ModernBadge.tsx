'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModernBadgeProps {
  children: ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  dot?: boolean
  pulse?: boolean
  className?: string
}

export function ModernBadge({
  children,
  variant = 'info',
  size = 'md',
  icon,
  dot = false,
  pulse = false,
  className
}: ModernBadgeProps) {
  const variants = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const dotColors = {
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dotColors[variant]
            )} />
          )}
          <span className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            dotColors[variant]
          )} />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}



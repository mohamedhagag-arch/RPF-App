'use client'

import { getProjectStatusColor, getProjectStatusText, getProjectStatusIcon } from '@/lib/projectStatusManager'
import { ModernBadge } from './ModernBadge'

interface ProjectStatusBadgeProps {
  status: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProjectStatusBadge({ 
  status, 
  showIcon = true, 
  size = 'md',
  className = '' 
}: ProjectStatusBadgeProps) {
  const statusText = getProjectStatusText(status)
  const statusIcon = getProjectStatusIcon(status)
  const statusColor = getProjectStatusColor(status)
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${statusColor} ${sizeClasses[size]} ${className}`}>
      {showIcon && <span>{statusIcon}</span>}
      <span>{statusText}</span>
    </span>
  )
}

// Export individual functions for backward compatibility
export { getProjectStatusColor, getProjectStatusText, getProjectStatusIcon }

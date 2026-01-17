'use client'

import { useState } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Button } from '@/components/ui/Button'
import { Edit, Target, CheckCircle, Calendar, Activity, Sparkles } from 'lucide-react'
import { ProcessedKPI } from '@/lib/kpiProcessor'

interface KPIEditButtonProps {
  kpi: ProcessedKPI
  onEdit: (kpi: ProcessedKPI) => void
  className?: string
}

export function KPIEditButton({ kpi, onEdit, className = '' }: KPIEditButtonProps) {
  const guard = usePermissionGuard()
  const [isHovered, setIsHovered] = useState(false)
  
  if (!guard.hasAccess('kpi.edit')) {
    return null
  }

  const isPlanned = kpi.input_type === 'Planned'
  const isActual = kpi.input_type === 'Actual'
  
  const getButtonStyle = () => {
    if (isPlanned) {
      return {
        base: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700',
        icon: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400'
      }
    } else {
      return {
        base: 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-700',
        icon: 'text-green-600 dark:text-green-400',
        text: 'text-green-600 dark:text-green-400'
      }
    }
  }

  const getIcon = () => {
    if (isPlanned) {
      return <Target className="h-4 w-4" />
    } else {
      return <CheckCircle className="h-4 w-4" />
    }
  }

  const getButtonText = () => {
    if (isPlanned) {
      return 'Edit Target'
    } else {
      return 'Edit Actual'
    }
  }

  const getTooltipText = () => {
    if (isPlanned) {
      return 'Edit planned KPI target'
    } else {
      return 'Edit actual KPI achievement'
    }
  }

  const style = getButtonStyle()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onEdit(kpi)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center space-x-1.5 transition-all duration-200 ${style.base} ${className}`}
      title={getTooltipText()}
    >
      <span className={style.icon}>
        {getIcon()}
      </span>
      <span className={`text-xs font-medium ${style.text}`}>
        {getButtonText()}
      </span>
      {isHovered && (
        <Sparkles className="h-3 w-3 animate-pulse" />
      )}
    </Button>
  )
}

// Enhanced version with more detailed information
export function EnhancedKPIEditButton({ kpi, onEdit, className = '' }: KPIEditButtonProps) {
  const guard = usePermissionGuard()
  const [isHovered, setIsHovered] = useState(false)
  
  if (!guard.hasAccess('kpi.edit')) {
    return null
  }

  const isPlanned = kpi.input_type === 'Planned'
  const isActual = kpi.input_type === 'Actual'
  
  const getButtonStyle = () => {
    if (isPlanned) {
      return {
        base: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700',
        icon: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
      }
    } else {
      return {
        base: 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-700',
        icon: 'text-green-600 dark:text-green-400',
        text: 'text-green-600 dark:text-green-400',
        badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      }
    }
  }

  const getIcon = () => {
    if (isPlanned) {
      return <Target className="h-4 w-4" />
    } else {
      return <CheckCircle className="h-4 w-4" />
    }
  }

  const getButtonText = () => {
    if (isPlanned) {
      return 'Edit Target'
    } else {
      return 'Edit Actual'
    }
  }

  const getTooltipText = () => {
    if (isPlanned) {
      return `Edit planned KPI target: ${(kpi as any).activity_description || (kpi as any).activity_name || 'KPI'}`
    } else {
      return `Edit actual KPI achievement: ${(kpi as any).activity_description || (kpi as any).activity_name || 'KPI'}`
    }
  }

  const style = getButtonStyle()

  return (
    <div className="flex flex-col space-y-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(kpi)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center space-x-1.5 transition-all duration-200 ${style.base} ${className}`}
        title={getTooltipText()}
      >
        <span className={style.icon}>
          {getIcon()}
        </span>
        <span className={`text-xs font-medium ${style.text}`}>
          {getButtonText()}
        </span>
        {isHovered && (
          <Sparkles className="h-3 w-3 animate-pulse" />
        )}
      </Button>
      
      {/* Additional Info Badge */}
      <div className={`text-xs px-2 py-0.5 rounded-full ${style.badge} text-center`}>
        {kpi.quantity.toLocaleString()} {kpi.unit || 'units'}
      </div>
    </div>
  )
}

// Compact version for table cells
export function CompactKPIEditButton({ kpi, onEdit, className = '' }: KPIEditButtonProps) {
  const guard = usePermissionGuard()
  
  if (!guard.hasAccess('kpi.edit')) {
    return null
  }

  const isPlanned = kpi.input_type === 'Planned'
  
  const getButtonStyle = () => {
    if (isPlanned) {
      return 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700'
    } else {
      return 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-700'
    }
  }

  const getIcon = () => {
    if (isPlanned) {
      return <Target className="h-4 w-4" />
    } else {
      return <CheckCircle className="h-4 w-4" />
    }
  }

  const style = getButtonStyle()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onEdit(kpi)}
      className={`flex items-center space-x-1 transition-all duration-200 ${style} ${className}`}
      title={`Edit ${kpi.input_type} KPI`}
    >
      <span>
        {getIcon()}
      </span>
    </Button>
  )
}

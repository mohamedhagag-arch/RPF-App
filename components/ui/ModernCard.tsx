'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModernCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
  glassEffect?: boolean
  onClick?: () => void
}

export function ModernCard({ 
  children, 
  className = '', 
  hover = false,
  gradient = false,
  glassEffect = false,
  onClick 
}: ModernCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl p-6 transition-all duration-300',
        hover && 'card-hover cursor-pointer',
        gradient && 'bg-gradient-to-br from-primary-500 to-primary-600 text-white',
        glassEffect && 'glass-effect',
        !gradient && !glassEffect && 'bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  className?: string
}

export function StatCard({ title, value, icon, trend, color = 'blue', className = '' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  }

  return (
    <ModernCard hover className={cn('relative overflow-hidden', className)}>
      {/* Background Gradient */}
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10',
        `bg-gradient-to-br ${colorClasses[color]}`
      )} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'p-3 rounded-xl bg-gradient-to-br shadow-lg',
            colorClasses[color]
          )}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          
          {trend && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
              trend.isPositive 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </ModernCard>
  )
}

interface ProgressCardProps {
  title: string
  value: number
  max: number
  color?: 'blue' | 'green' | 'purple' | 'orange'
  icon?: ReactNode
  subtitle?: string
}

export function ProgressCard({ title, value, max, color = 'blue', icon, subtitle }: ProgressCardProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  }

  return (
    <ModernCard hover className="animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {icon && <div className="text-gray-700 dark:text-gray-300">{icon}</div>}
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
        <span>{value.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </ModernCard>
  )
}



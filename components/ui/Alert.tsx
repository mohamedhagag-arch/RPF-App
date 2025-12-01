import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'relative w-full rounded-lg border p-4',
          {
            'border-gray-200 bg-gray-50 text-gray-900': variant === 'default',
            'border-green-200 bg-green-50 text-green-900': variant === 'success',
            'border-yellow-200 bg-yellow-50 text-yellow-900': variant === 'warning',
            'border-red-200 bg-red-50 text-red-900': variant === 'error',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Alert.displayName = 'Alert'

import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('flex flex-col space-y-1.5 p-6', className)}
        {...props}
      />
    )
  }
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLParagraphElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={clsx('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
      />
    )
  }
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={clsx('text-sm text-gray-500 dark:text-gray-400', className)}
        {...props}
      />
    )
  }
)

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('p-6 pt-0', className)}
        {...props}
      />
    )
  }
)

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('flex items-center p-6 pt-0', className)}
        {...props}
      />
    )
  }
)

CardFooter.displayName = 'CardFooter'

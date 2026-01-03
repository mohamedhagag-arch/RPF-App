'use client'

import { memo } from 'react'

// ✅ PERFORMANCE: Memoized table row component to prevent unnecessary re-renders
export const MemoizedTableRow = memo(function MemoizedTableRow({ 
  children, 
  className = '',
  ...props 
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  )
})


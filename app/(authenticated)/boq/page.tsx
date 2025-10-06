'use client'

import { BOQManagement } from '@/components/boq/BOQManagement'

export default function BOQPage() {
  return (
    <div className="p-6">
      <BOQManagement globalSearchTerm="" globalFilters={{}} />
    </div>
  )
}


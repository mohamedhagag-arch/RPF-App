'use client'

import { ImportExportManager } from '@/components/import-export/ImportExportManager'
import { useAuth } from '@/app/providers'

export default function ImportExportPage() {
  const { appUser } = useAuth()
  
  return (
    <div className="p-6">
      <ImportExportManager userRole={appUser?.role} />
    </div>
  )
}



'use client'

import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { ContractVariationsManagement } from '@/components/commercial/ContractVariationsManagement'

export default function VariationsPage() {
  return (
    <PermissionPage 
      permission="commercial.variations.view"
      accessDeniedTitle="Variations Access Required"
      accessDeniedMessage="You need permission to view Variations. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Variations" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Contract Variations
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage variations and change orders for commercial projects
            </p>
          </div>

          {/* Variations Management Component */}
          <ContractVariationsManagement />
        </div>
      </div>
    </PermissionPage>
  )
}


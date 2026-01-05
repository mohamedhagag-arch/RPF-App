'use client'

import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { CommercialBOQItemsManagement } from '@/components/commercial/CommercialBOQItemsManagement'

export default function CommercialBOQItemsPage() {
  return (
    <PermissionPage 
      permission="commercial.boq_items.view"
      accessDeniedTitle="Commercial BOQ Items Access Required"
      accessDeniedMessage="You need permission to view Commercial BOQ Items. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Commercial BOQ Items" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Commercial BOQ Items
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage Bill of Quantities items for commercial projects
            </p>
          </div>

          {/* BOQ Items Management Component */}
          <CommercialBOQItemsManagement />
        </div>
      </div>
    </PermissionPage>
  )
}


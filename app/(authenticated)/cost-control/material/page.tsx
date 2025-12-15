'use client'

import { Package } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import MaterialList from '@/components/cost-control/MaterialList'

export default function MaterialPage() {
  return (
    <PermissionPage 
      permission="cost_control.material.view"
      accessDeniedTitle="Material Access Required"
      accessDeniedMessage="You need permission to view materials. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Material" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-500" />
            Material
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage materials and inventory
          </p>
        </div>

        {/* Content */}
        <MaterialList />
      </div>
    </PermissionPage>
  )
}


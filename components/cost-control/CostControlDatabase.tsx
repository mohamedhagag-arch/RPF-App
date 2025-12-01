'use client'

import { useState, useEffect } from 'react'
import { DatabaseManagement } from '@/components/settings/DatabaseManagement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Database, Info } from 'lucide-react'

export default function CostControlDatabase() {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Cost Control Database Manager
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This Database Manager is specifically configured for Cost Control tables. 
                You can import, export, and manage all Cost Control related data tables here.
              </p>
              <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Available Tables:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>👷 MANPOWER (CCD - MANPOWER)</li>
                  <li>More tables will be added as needed</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Management Component */}
      <DatabaseManagement />
    </div>
  )
}

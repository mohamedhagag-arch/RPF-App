'use client'

import { memo, useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { ProcessedKPI } from '@/lib/kpiProcessor'

interface KPIsTabProps {
  kpis: ProcessedKPI[]
  formatCurrency: (amount: number, currencyCode?: string) => string
}

export const KPIsTab = memo(function KPIsTab({ kpis, formatCurrency }: KPIsTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])
  
  const plannedKPIs = useMemo(() => {
    return kpis.filter((k: ProcessedKPI) => k.input_type === 'Planned')
  }, [kpis])
  
  const actualKPIs = useMemo(() => {
    return kpis.filter((k: ProcessedKPI) => k.input_type === 'Actual')
  }, [kpis])
  
  const plannedTotalQuantity = useMemo(() => {
    return plannedKPIs.reduce((sum: number, k: ProcessedKPI) => sum + (k.quantity || 0), 0)
  }, [plannedKPIs])
  
  const actualTotalQuantity = useMemo(() => {
    return actualKPIs.reduce((sum: number, k: ProcessedKPI) => sum + (k.quantity || 0), 0)
  }, [actualKPIs])
  
  const displayedKPIs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return kpis.slice(startIndex, endIndex)
  }, [kpis, currentPage, itemsPerPage])
  
  const totalPages = Math.ceil(kpis.length / itemsPerPage)
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Planned KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{plannedKPIs.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total planned quantity: {plannedTotalQuantity.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actual KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{actualKPIs.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total actual quantity: {actualTotalQuantity.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>KPI Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">Activity</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">Type</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-gray-100 dark:bg-gray-800">Quantity</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-gray-100 dark:bg-gray-800">Date</th>
                </tr>
              </thead>
              <tbody>
                {displayedKPIs.map((kpi: ProcessedKPI) => {
                  // ✅ FIX: Get activity name and project code from multiple sources
                  const activityName = kpi.activity_name || 
                                      (kpi as any).activity || 
                                      (kpi as any).kpi_name || 
                                      (kpi as any).raw?.['Activity Name'] ||
                                      (kpi as any).raw?.['Activity'] ||
                                      'N/A'
                  
                  const projectCode = kpi.project_full_code || 
                                     (kpi as any).project_code ||
                                     (kpi as any)['Project Full Code'] ||
                                     (kpi as any).raw?.['Project Full Code'] ||
                                     (kpi as any).raw?.['Project Code'] ||
                                     'N/A'
                  
                  return (
                  <tr key={kpi.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {activityName}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {projectCode}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        kpi.input_type === 'Planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {kpi.input_type}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {kpi.quantity || 0} {kpi.unit || ''}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {kpi.activity_date ? new Date(kpi.activity_date).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {kpis.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={kpis.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
})



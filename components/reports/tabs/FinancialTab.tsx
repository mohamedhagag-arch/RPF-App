'use client'

import { memo, useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import type { ReportStats, FilteredData } from '../types'

interface FinancialTabProps {
  stats: ReportStats
  filteredData: FilteredData
  allAnalytics?: any[]
  formatCurrency: (amount: number, currencyCode?: string) => string
}

export const FinancialTab = memo(function FinancialTab({ stats, filteredData, allAnalytics: providedAnalytics, formatCurrency }: FinancialTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])
  
  const { filteredProjects } = filteredData
  
  const allAnalytics = useMemo(() => {
    if (providedAnalytics && providedAnalytics.length > 0) {
      return providedAnalytics
    }
    return getAllProjectsAnalytics(filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs)
  }, [providedAnalytics, filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs])
  
  const paginatedAnalytics = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allAnalytics.slice(startIndex, endIndex)
  }, [allAnalytics, currentPage, itemsPerPage])
  
  const totalPages = Math.ceil(allAnalytics.length / itemsPerPage)

  const totals = useMemo(() => {
    return {
      totalContractValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalContractValue || 0), 0),
      totalEarnedValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0),
      totalPlannedValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalPlannedValue || 0), 0),
      totalRemainingValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalRemainingValue || 0), 0)
    }
  }, [allAnalytics])
  
  const { totalContractValue, totalEarnedValue, totalPlannedValue, totalRemainingValue } = totals
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalContractValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Earned Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnedValue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalContractValue > 0 ? ((totalEarnedValue / totalContractValue) * 100).toFixed(1) : 0}% of contract
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Planned Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPlannedValue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalContractValue > 0 ? ((totalPlannedValue / totalContractValue) * 100).toFixed(1) : 0}% of contract
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remaining Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemainingValue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalContractValue > 0 ? ((totalRemainingValue / totalContractValue) * 100).toFixed(1) : 0}% of contract
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Summary by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Contract Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Earned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Planned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Variance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAnalytics.map((analytics: any) => {
                  const project = analytics.project
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatCurrency(analytics.totalContractValue || 0, project.currency)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatCurrency(analytics.totalEarnedValue || 0, project.currency)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatCurrency(analytics.totalPlannedValue || 0, project.currency)}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right ${analytics.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(analytics.variance || 0, project.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {allAnalytics.length > 0 && (
                <tfoot className="sticky bottom-0 z-10">
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">Total:</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                      {formatCurrency(
                        allAnalytics.reduce((sum: number, a: any) => sum + (a.totalContractValue || 0), 0),
                        allAnalytics[0]?.project?.currency || 'AED'
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                      {formatCurrency(
                        allAnalytics.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0),
                        allAnalytics[0]?.project?.currency || 'AED'
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                      {formatCurrency(
                        allAnalytics.reduce((sum: number, a: any) => sum + (a.totalPlannedValue || 0), 0),
                        allAnalytics[0]?.project?.currency || 'AED'
                      )}
                    </td>
                    <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800 ${
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(
                        allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0),
                        allAnalytics[0]?.project?.currency || 'AED'
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {allAnalytics.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={allAnalytics.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
})



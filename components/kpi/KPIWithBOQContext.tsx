'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getKPIContext } from '@/lib/boqKpiSync'
import { Briefcase, TrendingUp, Target, BarChart3 } from 'lucide-react'

interface KPIWithBOQContextProps {
  projectCode: string
  activityName: string
}

export function KPIWithBOQContext({ projectCode, activityName }: KPIWithBOQContextProps) {
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContext()
  }, [projectCode, activityName])

  const loadContext = async () => {
    setLoading(true)
    const data = await getKPIContext(projectCode, activityName)
    setContext(data)
    setLoading(false)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading context...</div>
  }

  if (!context || !context.boq) {
    return null
  }

  const { boq, summary } = context

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-blue-600" />
          BOQ Activity Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* BOQ Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">BOQ Activity</div>
          <div className="font-semibold text-gray-900 dark:text-white mb-2">
            {boq.activity_name}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">BOQ Planned:</span>
              <div className="font-bold text-blue-600">
                {summary.boqPlanned.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-gray-500">BOQ Actual:</span>
              <div className="font-bold text-green-600">
                {summary.boqActual.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">KPI Summary</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">KPI Planned Total:</span>
              <div className="font-bold text-blue-600">
                {summary.kpiPlannedTotal.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                {context.kpiPlanned.length} records
              </div>
            </div>
            <div>
              <span className="text-gray-500">KPI Actual Total:</span>
              <div className="font-bold text-green-600">
                {summary.kpiActualTotal.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                {context.kpiActual.length} records
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {summary.progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                summary.progress >= 100 ? 'bg-green-500' :
                summary.progress >= 80 ? 'bg-blue-500' :
                summary.progress >= 50 ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}
              style={{ width: `${Math.min(summary.progress, 100)}%` }}
            />
          </div>
          
          {/* Variance */}
          <div className="mt-2 text-xs">
            <span className="text-gray-500">Variance: </span>
            <span className={`font-semibold ${
              summary.variance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {summary.variance > 0 ? '+' : ''}{summary.variance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Sync Notice */}
        <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2 text-xs text-purple-800 dark:text-purple-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            <span className="font-medium">Auto-Sync Active</span>
          </div>
          <div className="mt-1 text-purple-700 dark:text-purple-300">
            KPI Actual updates BOQ Actual automatically
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


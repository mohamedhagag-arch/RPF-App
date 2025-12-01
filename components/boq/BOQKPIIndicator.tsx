'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { RefreshCw, Link2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { syncBOQFromKPI } from '@/lib/boqKpiSync'

interface BOQKPIIndicatorProps {
  projectCode: string
  activityName: string
  boqActual: number
  onSynced?: () => void
}

export function BOQKPIIndicator({ 
  projectCode, 
  activityName, 
  boqActual,
  onSynced 
}: BOQKPIIndicatorProps) {
  const guard = usePermissionGuard()
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const result = await syncBOQFromKPI(projectCode, activityName)
      if (result.success) {
        setLastSync(new Date().toLocaleTimeString())
        if (onSynced) onSynced()
      }
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1 text-green-600">
        <Link2 className="w-3 h-3" />
        <span className="font-medium">Synced with KPI</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualSync}
        disabled={syncing}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync Now'}
      </Button>
      {lastSync && (
        <span className="text-gray-500">
          Last: {lastSync}
        </span>
      )}
    </div>
  )
}


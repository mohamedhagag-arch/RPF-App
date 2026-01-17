'use client'

import { useState, useEffect } from 'react'
import { settingsManager } from '@/lib/settingsManager'

interface MaintenanceData {
  enabled: boolean
  message?: string
  estimatedTime?: string
}

export function useMaintenanceMode() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData>({
    enabled: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const enabledRaw = await settingsManager.getSystemSetting('maintenance_mode_enabled')
        const message = await settingsManager.getSystemSetting('maintenance_message')
        const estimatedTime = await settingsManager.getSystemSetting('maintenance_estimated_time')

        // Handle different JSONB formats for boolean value
        let enabled = false
        if (enabledRaw !== null && enabledRaw !== undefined) {
          if (typeof enabledRaw === 'boolean') {
            enabled = enabledRaw
          } else if (typeof enabledRaw === 'string') {
            enabled = enabledRaw === 'true' || enabledRaw === 'True' || enabledRaw === 'TRUE'
          } else if (typeof enabledRaw === 'object') {
            // Handle JSONB object formats
            if ('bool' in enabledRaw) {
              enabled = enabledRaw.bool === true
            } else if ('value' in enabledRaw) {
              enabled = enabledRaw.value === true || enabledRaw.value === 'true'
            } else if ('boolean' in enabledRaw) {
              enabled = enabledRaw.boolean === true
            } else if (Object.keys(enabledRaw).length === 1) {
              const firstValue = Object.values(enabledRaw)[0]
              enabled = firstValue === true || firstValue === 'true' || firstValue === 'True'
            }
          }
        }

        setMaintenanceData({
          enabled,
          message: message || undefined,
          estimatedTime: estimatedTime || undefined
        })
      } catch (error) {
        console.error('Error checking maintenance mode:', error)
        setMaintenanceData({ enabled: false })
      } finally {
        setLoading(false)
      }
    }

    checkMaintenanceMode()

    // Check every 30 seconds for updates
    const interval = setInterval(checkMaintenanceMode, 30000)
    return () => clearInterval(interval)
  }, [])

  return { ...maintenanceData, loading }
}

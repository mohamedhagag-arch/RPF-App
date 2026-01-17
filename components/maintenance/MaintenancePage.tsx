'use client'

import { useEffect, useState } from 'react'
import { settingsManager } from '@/lib/settingsManager'
import { Wrench, Clock, AlertCircle, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface MaintenancePageProps {
  message?: string
  estimatedTime?: string
  showProgress?: boolean
}

export function MaintenancePage({ 
  message, 
  estimatedTime,
  showProgress = true 
}: MaintenancePageProps) {
  const [maintenanceData, setMaintenanceData] = useState({
    message: message || 'We are performing maintenance on the site',
    estimatedTime: estimatedTime || '30 minutes',
    startTime: new Date().toISOString()
  })
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load maintenance settings
    const loadMaintenanceSettings = async () => {
      try {
        const maintenanceMessage = await settingsManager.getSystemSetting('maintenance_message')
        const maintenanceTime = await settingsManager.getSystemSetting('maintenance_estimated_time')
        
        if (maintenanceMessage) {
          setMaintenanceData(prev => ({
            ...prev,
            message: maintenanceMessage
          }))
        }
        
        if (maintenanceTime) {
          setMaintenanceData(prev => ({
            ...prev,
            estimatedTime: maintenanceTime
          }))
        }
      } catch (error) {
        console.error('Error loading maintenance settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMaintenanceSettings()
  }, [])

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Simulated progress (optional)
  useEffect(() => {
    if (!showProgress) return
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev
        return prev + Math.random() * 2
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [showProgress])

  // Auto refresh check
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const enabledRaw = await settingsManager.getSystemSetting('maintenance_mode_enabled')
        
        // Handle different JSONB formats for boolean value
        let isEnabled = false
        if (enabledRaw !== null && enabledRaw !== undefined) {
          if (typeof enabledRaw === 'boolean') {
            isEnabled = enabledRaw
          } else if (typeof enabledRaw === 'string') {
            isEnabled = enabledRaw === 'true' || enabledRaw === 'True' || enabledRaw === 'TRUE'
          } else if (typeof enabledRaw === 'object') {
            // Handle JSONB object formats
            if ('bool' in enabledRaw) {
              isEnabled = enabledRaw.bool === true
            } else if ('value' in enabledRaw) {
              isEnabled = enabledRaw.value === true || enabledRaw.value === 'true'
            } else if ('boolean' in enabledRaw) {
              isEnabled = enabledRaw.boolean === true
            } else if (Object.keys(enabledRaw).length === 1) {
              const firstValue = Object.values(enabledRaw)[0]
              isEnabled = firstValue === true || firstValue === 'true' || firstValue === 'True'
            }
          }
        }
        
        if (!isEnabled) {
          // Maintenance disabled, reload page
          window.location.reload()
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error)
      }
    }

    const interval = setInterval(checkMaintenanceStatus, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12 relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-full shadow-2xl">
                  <Wrench className="h-16 w-16 text-white animate-spin-slow" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
              Site Under Maintenance
            </h1>

            {/* Message */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-200 leading-relaxed">
                  {maintenanceData.message}
                  <span className="inline-block">{dots}</span>
                </p>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center justify-center space-x-2 mb-8">
              <Clock className="h-5 w-5 text-blue-400" />
              <span className="text-gray-300 text-lg">
                Estimated Time: <span className="font-semibold text-white">{maintenanceData.estimatedTime}</span>
              </span>
            </div>

            {/* Progress Bar */}
            {showProgress && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">In Progress</span>
                  <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Servers</p>
                <p className="text-white font-semibold">Online</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-400">Database</p>
                <p className="text-white font-semibold">Updating</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                <RefreshCw className="h-8 w-8 text-purple-400 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-400">Services</p>
                <p className="text-white font-semibold">Updating</p>
              </div>
            </div>

            {/* Auto Refresh Notice */}
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="h-4 w-4 text-blue-300 animate-spin" />
                <p className="text-sm text-blue-200">
                  The page will automatically refresh when maintenance is complete
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} AlRabat RPF. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { QrCode, X, CheckCircle, AlertCircle, Camera, CameraOff } from 'lucide-react'
import { supabase, TABLES, AttendanceEmployee } from '@/lib/supabase'

interface QRCodeScannerProps {
  onScanSuccess: (employee: AttendanceEmployee) => void
  onClose?: () => void
  checkType?: 'Check-In' | 'Check-Out'
}

export function QRCodeScanner({ 
  onScanSuccess, 
  onClose,
  checkType = 'Check-In'
}: QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cameraId, setCameraId] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const lastScannedRef = useRef<{ qrCode: string; timestamp: number } | null>(null)

  useEffect(() => {
    // Request camera permission first, then get available cameras
    const initializeCameras = async () => {
      try {
        // Request camera permission by getting a media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // Prefer back camera on mobile
        })
        
        // Stop the stream immediately (we just needed permission)
        stream.getTracks().forEach(track => track.stop())
        
        // Now enumerate devices (will have proper labels and IDs)
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === 'videoinput')
        
        setAvailableCameras(cameras)
        if (cameras.length > 0) {
          // Prefer back camera (environment facing) if available
          const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
          )
          setCameraId(backCamera?.deviceId || cameras[0].deviceId)
        } else {
          setError('No cameras found. Please ensure your camera is connected and permissions are granted.')
        }
      } catch (err: any) {
        console.error('Error initializing cameras:', err)
        const errorMessage = err?.message || err?.toString() || 'Unknown error'
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access and refresh the page.')
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera and refresh the page.')
        } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
          setError('Camera is already in use by another application. Please close other apps using the camera.')
        } else {
          setError(`Failed to access camera: ${errorMessage}`)
        }
      }
    }

    initializeCameras()

    return () => {
      stopScanning()
    }
  }, [])

  const startScanning = async () => {
    try {
      setError('')
      setSuccess('')
      
      if (!cameraId && availableCameras.length === 0) {
        setError('No camera available. Please check your camera permissions.')
        return
      }

      // If no cameraId is set but cameras are available, use the first one
      const selectedCameraId = cameraId || (availableCameras.length > 0 ? availableCameras[0].deviceId : null)
      
      if (!selectedCameraId) {
        setError('No camera selected')
        return
      }

      // Set scanning state first to render the element
      setScanning(true)
      
      // Wait for the DOM to update and element to be rendered
      await new Promise(resolve => setTimeout(resolve, 100))

      // Ensure the DOM element exists before creating scanner
      const qrReaderElement = document.getElementById('qr-reader')
      if (!qrReaderElement) {
        setScanning(false)
        setError('QR scanner element not found. Please refresh the page.')
        console.error('Element with id="qr-reader" not found in DOM')
        return
      }

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      // Try to start with specific camera ID first
      try {
        await scanner.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: 'environment' // Prefer back camera
            }
          },
          (decodedText) => {
            handleQRCodeScanned(decodedText)
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent during scanning)
          }
        )
        setError('') // Clear any previous errors
        console.log('✅ Camera started successfully')
      } catch (deviceError: any) {
        // If device ID fails, try with facingMode
        console.log('Device ID failed, trying with facingMode...', deviceError)
        try {
          // Try to stop any partial initialization
          try {
            await scanner.stop()
          } catch (stopError) {
            // Ignore stop errors
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        try {
          await scanner.start(
            { facingMode: 'environment' }, // Prefer back camera
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleQRCodeScanned(decodedText)
            },
            (errorMessage) => {
              // Ignore scanning errors
            }
          )
          setScanning(true)
          setError('') // Clear any previous errors
        } catch (facingModeError: any) {
          // If both methods fail, throw the original error
          throw deviceError
        }
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera.')
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setError('Camera is already in use by another application. Please close other apps using the camera.')
      } else if (err?.message?.includes('No MultiFormat Readers')) {
        setError('QR code scanner initialization failed. Please refresh the page and try again.')
      } else {
        setError(`Failed to start camera: ${errorMessage}`)
      }
    }
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear()
          scannerRef.current = null
          setScanning(false)
        })
        .catch((err) => {
          console.error('Error stopping scanner:', err)
        })
    }
  }

  const handleQRCodeScanned = async (qrCode: string) => {
    try {
      setError('')
      setSuccess('')

      if (!qrCode || qrCode.trim() === '') {
        setError('Invalid QR code: Empty code')
        return
      }

      // Prevent duplicate scans of the same QR code within 5 seconds
      const now = Date.now()
      const lastScanned = lastScannedRef.current
      
      if (lastScanned && lastScanned.qrCode === qrCode) {
        const timeSinceLastScan = now - lastScanned.timestamp
        if (timeSinceLastScan < 5000) { // 5 seconds cooldown
          console.log('⚠️ Duplicate scan prevented - same QR code scanned too soon')
          return // Ignore duplicate scan
        }
      }

      // Update last scanned QR code and timestamp
      lastScannedRef.current = { qrCode, timestamp: now }

      let employee: AttendanceEmployee | null = null

      // Try to parse as JSON (new format with employee data)
      try {
        const qrData = JSON.parse(qrCode)
        
        // Check if it's the new format (has id and employee_code)
        if (qrData.id && qrData.employee_code) {
          console.log('✅ QR Code contains employee data (new format)')
          
          // Verify employee exists and is active in database
          const { data: dbEmployee, error: verifyError } = await supabase
            .from(TABLES.ATTENDANCE_EMPLOYEES)
            // @ts-ignore
            .select('*')
            .eq('id', qrData.id)
            .eq('status', 'Active')
            .single()

          if (verifyError || !dbEmployee) {
            setError('Employee not found or inactive in database')
            return
          }

          // Use data from database (most up-to-date)
          employee = {
            ...(dbEmployee as any),
            qr_code: qrCode // Store the QR code JSON
          } as AttendanceEmployee
        } else {
          throw new Error('Invalid QR code format')
        }
      } catch (jsonError) {
        // Not JSON, try old format (EMP-XXX) or direct employee_code lookup
        console.log('⚠️ QR Code is not JSON, trying old format...')
        
        // Try to find by qr_code field (old format)
        const { data: employees, error: fetchError } = await supabase
          .from(TABLES.ATTENDANCE_EMPLOYEES)
          // @ts-ignore
          .select('*')
          .or(`qr_code.eq.${qrCode},employee_code.eq.${qrCode}`)
          .eq('status', 'Active')
          .limit(1)

        if (fetchError) throw fetchError

        if (!employees || employees.length === 0) {
          setError('Employee not found for this QR code')
          return
        }

        employee = employees[0] as AttendanceEmployee
      }

      if (!employee) {
        setError('Failed to process QR code')
        return
      }

      setSuccess(`✅ Scanned: ${employee.name} (${employee.employee_code})`)
      
      // Call success callback immediately (don't stop scanning for continuous mode)
      onScanSuccess(employee)
      
      // Clear success message after 2 seconds to prepare for next scan
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 2000)

      // Don't stop scanning - keep it open for continuous scanning
      // The scanner will continue to scan the next QR code automatically

    } catch (err: any) {
      setError('Failed to process QR code: ' + err.message)
      console.error('Error processing QR code:', err)
      // Clear error after 2 seconds to prepare for next scan
      setTimeout(() => {
        setError('')
      }, 2000)
    }
  }

  const handleManualInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const qrCode = formData.get('qrCode') as string

    if (qrCode) {
      await handleQRCodeScanned(qrCode.trim())
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan QR Code for {checkType}
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopScanning()
                onClose()
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="w-4 h-4" />
            {success}
          </Alert>
        )}

        {/* Camera Selection */}
        {availableCameras.length > 1 && !scanning && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Camera:</label>
            <select
              value={cameraId || ''}
              onChange={(e) => setCameraId(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={scanning}
            >
              {availableCameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* QR Code Scanner */}
        <div className="space-y-4">
          {!scanning ? (
            <div className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 transition-all hover:border-indigo-400 dark:hover:border-indigo-500">
              <div className="relative mb-5 md:mb-6">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl"></div>
                <Camera className="w-18 h-18 md:w-20 md:h-20 text-indigo-500 dark:text-indigo-400 relative z-10" />
              </div>
              <h3 className="text-lg md:text-lg font-semibold text-gray-900 dark:text-white mb-2">Ready to Scan</h3>
              <p className="text-sm md:text-sm text-gray-600 dark:text-gray-400 mb-5 md:mb-6 text-center max-w-sm px-2">
                Click the button below to start scanning QR codes. The camera will stay open for continuous scanning.
              </p>
              <Button 
                onClick={startScanning} 
                disabled={!cameraId}
                className="px-6 md:px-6 py-3 md:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base md:text-base font-medium"
              >
                <Camera className="w-5 h-5 md:w-5 md:h-5 mr-2" />
                Start Scanner
              </Button>
              {!cameraId && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">No camera available</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 md:p-3 shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm md:text-sm font-medium text-green-800 dark:text-green-200 text-center">
                    <strong className="hidden md:inline">Continuous Scan Mode Active:</strong>
                    <strong className="md:hidden">Scan Mode:</strong> Point camera at QR Code
                  </p>
                </div>
              </div>
              <div className="relative">
                <div
                  id="qr-reader"
                  className="w-full rounded-xl overflow-hidden border-2 border-indigo-300 dark:border-indigo-700 shadow-lg"
                  style={{ minHeight: '280px', maxHeight: '450px', backgroundColor: '#000' }}
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
                  Live
                </div>
              </div>
              <Button 
                onClick={stopScanning} 
                variant="outline" 
                className="w-full border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600 transition-all text-base md:text-base py-3 md:py-2.5 font-medium"
              >
                <CameraOff className="w-5 h-5 mr-2" />
                Stop Scanner
              </Button>
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">Or enter QR code manually:</p>
          <form onSubmit={handleManualInput} className="flex gap-2">
            <input
              type="text"
              name="qrCode"
              placeholder="EMP-XXXXXXXX"
              className="flex-1 p-2 border rounded"
              pattern="EMP-[A-Z0-9]{8}"
              required
            />
            <Button type="submit">Submit</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}


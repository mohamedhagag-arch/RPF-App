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
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access and refresh the page.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera and refresh the page.')
        } else {
          setError('Failed to access camera: ' + err.message)
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
          },
          (decodedText) => {
            handleQRCodeScanned(decodedText)
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent during scanning)
          }
        )
        setScanning(true)
      } catch (deviceError: any) {
        // If device ID fails, try with facingMode
        console.log('Device ID failed, trying with facingMode...', deviceError)
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
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera.')
      } else {
        setError('Failed to start camera: ' + err.message)
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

      setSuccess(`Employee found: ${employee.name} (${employee.employee_code})`)
      
      // Stop scanning
      stopScanning()

      // Call success callback
      setTimeout(() => {
        onScanSuccess(employee!)
        if (onClose) onClose()
      }, 1000)

    } catch (err: any) {
      setError('Failed to process QR code: ' + err.message)
      console.error('Error processing QR code:', err)
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
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <Camera className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Click to start scanning QR code</p>
              <Button onClick={startScanning} disabled={!cameraId}>
                <Camera className="w-4 h-4 mr-2" />
                Start Scanner
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                id="qr-reader"
                className="w-full rounded-lg overflow-hidden border-2 border-gray-300"
                style={{ minHeight: '300px' }}
              />
              <Button onClick={stopScanning} variant="outline" className="w-full">
                <CameraOff className="w-4 h-4 mr-2" />
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


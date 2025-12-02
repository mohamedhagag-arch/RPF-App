'use client'

import React, { useState } from 'react'
import { Download, Copy, Check, QrCode, Hash, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useQRSettings } from '@/hooks/useQRSettings'
import { QRRenderer } from './QRRenderer'

interface QRCodeDisplayProps {
  qrCode: string
  employeeName: string
  employeeCode: string
  size?: number
  compact?: boolean // For modal display
}

export function QRCodeDisplay({ 
  qrCode, 
  employeeName, 
  employeeCode,
  size,
  compact = false
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const { settings, loading } = useQRSettings()
  
  // Use settings size if provided, otherwise use prop or default
  const qrSize = size || settings.size

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async () => {
    try {
      console.log('🔄 Starting download...')
      
      // Find the container first
      const container = document.getElementById(`qr-container-${qrCode}`)
      if (!container) {
        console.error('❌ Container not found:', `qr-container-${qrCode}`)
        alert('QR Code container not found. Please try again.')
        return
      }

      // Find SVG element inside container
      const svg = container.querySelector('svg#qr-code-svg') as SVGElement || 
                  container.querySelector('svg') as SVGElement
      
      if (!svg) {
        console.error('❌ SVG not found in container')
        // Try to find it globally
        const globalSvg = document.querySelector('svg#qr-code-svg') as SVGElement
        if (!globalSvg) {
          alert('QR Code SVG not found. Please try again.')
          return
        }
        console.log('✅ Found SVG globally')
        await downloadSVGAsPNG(globalSvg)
        return
      }

      console.log('✅ Found SVG in container')
      await downloadSVGAsPNG(svg)
      
    } catch (error) {
      console.error('❌ Download error:', error)
      alert(`Error downloading QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const downloadViaBlobUrl = (
    url: string, 
    fileName: string, 
    svgUrl: string, 
    resolve: () => void, 
    reject: (error: Error) => void
  ) => {
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.style.display = 'none'
      link.setAttribute('download', fileName)
      
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
        URL.revokeObjectURL(url)
        URL.revokeObjectURL(svgUrl)
        resolve()
      }, 500)
    } catch (error) {
      console.error('❌ Blob URL download failed:', error)
      reject(error instanceof Error ? error : new Error('Download failed'))
      URL.revokeObjectURL(url)
      URL.revokeObjectURL(svgUrl)
    }
  }

  const downloadSVGAsPNG = async (svg: SVGElement) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Clone the SVG
        const clonedSvg = svg.cloneNode(true) as SVGElement
        
        // Get dimensions
        const viewBox = svg.getAttribute('viewBox') || `0 0 ${qrSize} ${qrSize}`
        const viewBoxValues = viewBox.split(/\s+/).map(v => parseFloat(v))
        const svgWidth = viewBoxValues[2] || qrSize
        const svgHeight = viewBoxValues[3] || qrSize
        
        console.log('📐 SVG dimensions:', { viewBox, svgWidth, svgHeight })
        
        // Set attributes
        clonedSvg.setAttribute('width', String(svgWidth))
        clonedSvg.setAttribute('height', String(svgHeight))
        clonedSvg.setAttribute('viewBox', viewBox)
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

        // Copy gradient definitions
        const gradientDefs = document.getElementById('qr-gradient-defs')
        if (gradientDefs && settings.useGradient) {
          const clonedDefs = gradientDefs.cloneNode(true) as SVGElement
          const gradient = clonedDefs.querySelector('linearGradient')
          if (gradient) {
            const oldId = gradient.id || 'qr-gradient'
            const newId = `qr-gradient-dl-${Date.now()}`
            gradient.id = newId
            // Update references
            clonedSvg.querySelectorAll('*').forEach(el => {
              const fill = el.getAttribute('fill')
              if (fill && fill.includes(oldId)) {
                el.setAttribute('fill', fill.replace(oldId, newId))
              }
            })
          }
          clonedSvg.insertBefore(clonedDefs, clonedSvg.firstChild)
        }

        // Serialize SVG
        const serializer = new XMLSerializer()
        let svgData = serializer.serializeToString(clonedSvg)
        
        // Fix any image references
        svgData = svgData.replace(/xlink:href/g, 'href')
        
        console.log('📝 SVG serialized, length:', svgData.length)

        // Create blob and URL
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)

        // Create canvas
        const scale = 4
        const padding = 50
        const canvas = document.createElement('canvas')
        canvas.width = (svgWidth + padding) * scale
        canvas.height = (svgHeight + padding) * scale
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          URL.revokeObjectURL(svgUrl)
          return
        }

        // Fill background
        ctx.fillStyle = settings.backgroundColor || '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Load and draw image
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          try {
            console.log('🖼️ Image loaded, drawing to canvas...')
            const paddingPx = (padding * scale) / 2
            ctx.drawImage(img, paddingPx, paddingPx, svgWidth * scale, svgHeight * scale)
            
            console.log('✅ Image drawn, converting to blob...')
            
            // Convert to blob and download
            canvas.toBlob(async (blob) => {
              if (blob) {
                console.log('📦 Blob created, size:', blob.size, 'bytes')
                const url = URL.createObjectURL(blob)
                const fileName = `QR-${employeeCode}-${employeeName.replace(/\s+/g, '-')}.png`
                
                // Method 1: Try using fetch API (works better in some browsers)
                try {
                  console.log('🖱️ Attempting download via fetch API...')
                  
                  // Use fetch to create a new blob URL (sometimes more reliable)
                  const response = await fetch(url)
                  const blobData = await response.blob()
                  const downloadUrl = URL.createObjectURL(blobData)
                  
                  // Create link element
                  const link = document.createElement('a')
                  link.href = downloadUrl
                  link.download = fileName
                  
                  // Set all possible attributes
                  link.setAttribute('download', fileName)
                  link.setAttribute('type', 'image/png')
                  
                  // Make it visible briefly (some browsers need this)
                  link.style.cssText = 'position: absolute; top: 0; left: 0; width: 1px; height: 1px; opacity: 0;'
                  
                  // Append to body
                  document.body.appendChild(link)
                  
                  // Small delay to ensure DOM is ready
                  await new Promise(resolve => setTimeout(resolve, 10))
                  
                  // Trigger download
                  link.click()
                  
                  console.log('✅ Download triggered, file:', fileName)
                  console.log('💾 Check your downloads folder for:', fileName)
                  
                  // Cleanup after delay
                  setTimeout(() => {
                    try {
                      if (document.body.contains(link)) {
                        document.body.removeChild(link)
                      }
                    } catch (e) {
                      console.warn('Cleanup warning:', e)
                    }
                    URL.revokeObjectURL(downloadUrl)
                    URL.revokeObjectURL(url)
                    URL.revokeObjectURL(svgUrl)
                    console.log('🧹 Cleanup completed')
                    resolve()
                  }, 2000)
                  
                } catch (fetchError) {
                  console.warn('⚠️ Fetch method failed, trying direct blob URL...', fetchError)
                  
                  // Method 2: Direct blob URL (fallback)
                  try {
                    const link = document.createElement('a')
                    link.href = url
                    link.download = fileName
                    link.setAttribute('download', fileName)
                    link.style.cssText = 'position: fixed; top: -9999px; left: -9999px;'
                    
                    document.body.appendChild(link)
                    
                    // Try click
                    link.click()
                    
                    // Also try dispatchEvent
                    const event = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      view: window
                    })
                    link.dispatchEvent(event)
                    
                    console.log('✅ Direct blob URL download attempted')
                    
                    setTimeout(() => {
                      if (document.body.contains(link)) {
                        document.body.removeChild(link)
                      }
                      URL.revokeObjectURL(url)
                      URL.revokeObjectURL(svgUrl)
                      resolve()
                    }, 1000)
                  } catch (directError) {
                    console.error('❌ Direct blob URL also failed:', directError)
                    // Last resort: try opening in new window
                    try {
                      const newWindow = window.open(url, '_blank')
                      if (newWindow) {
                        console.log('✅ Opened in new window as last resort')
                        setTimeout(() => {
                          URL.revokeObjectURL(url)
                          URL.revokeObjectURL(svgUrl)
                          resolve()
                        }, 1000)
                      } else {
                        // Final fallback: show alert
                        const dataUrl = canvas.toDataURL('image/png')
                        console.log('📋 Data URL generated (length:', dataUrl.length, ')')
                        alert(`Download blocked by browser.\n\nPlease:\n1. Check browser download settings\n2. Allow downloads for this site\n3. Or right-click the QR code and select "Save image as..."\n\nFile name: ${fileName}`)
                        URL.revokeObjectURL(url)
                        URL.revokeObjectURL(svgUrl)
                        resolve()
                      }
                    } catch (finalError) {
                      console.error('❌ All download methods failed:', finalError)
                      reject(finalError instanceof Error ? finalError : new Error('Download failed'))
                      URL.revokeObjectURL(url)
                      URL.revokeObjectURL(svgUrl)
                    }
                  }
                }
              } else {
                console.error('❌ Failed to generate blob')
                reject(new Error('Failed to generate blob'))
                URL.revokeObjectURL(svgUrl)
              }
            }, 'image/png', 1.0)
          } catch (error) {
            console.error('❌ Error drawing image:', error)
            reject(error)
            URL.revokeObjectURL(svgUrl)
          }
        }
        
        img.onerror = (error) => {
          console.error('❌ Image load error:', error)
          reject(new Error('Failed to load SVG as image'))
          URL.revokeObjectURL(svgUrl)
        }
        
        console.log('🔄 Loading SVG as image...')
        img.src = svgUrl
      } catch (error) {
        reject(error)
      }
    })
  }

  if (!qrCode) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No QR Code available</p>
        </div>
      </div>
    )
  }

  if (compact) {
    // Compact version for modal
    return (
      <div className="space-y-6">
        {/* Employee Info Header */}
        <div className="text-center space-y-2 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {employeeName.charAt(0).toUpperCase()}
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900">{employeeName}</h3>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Hash className="w-4 h-4" />
              {employeeCode}
            </span>
          </div>
        </div>

        {/* QR Code Display */}
        <div 
          id={`qr-container-${qrCode}`}
          className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-100"
        >
          {settings.textEnabled && settings.textPosition === 'top' && (
            <p 
              className="mb-4 font-semibold text-center"
              style={{ 
                fontSize: `${settings.textSize}px`,
                color: settings.textColor
              }}
            >
              {settings.textContent || employeeName}
            </p>
          )}
          
          {/* Hidden SVG for Gradient Definitions */}
          <svg width="0" height="0" className="absolute opacity-0 pointer-events-none">
            <defs id="qr-gradient-defs">
              <linearGradient 
                id="qr-gradient" 
                x1={settings.gradientDirection === '0' ? '0%' : settings.gradientDirection === '45' ? '0%' : settings.gradientDirection === '90' ? '0%' : '0%'}
                y1={settings.gradientDirection === '0' ? '0%' : settings.gradientDirection === '45' ? '100%' : settings.gradientDirection === '90' ? '100%' : '0%'}
                x2={settings.gradientDirection === '0' ? '100%' : settings.gradientDirection === '45' ? '100%' : settings.gradientDirection === '90' ? '0%' : '100%'}
                y2={settings.gradientDirection === '0' ? '0%' : settings.gradientDirection === '45' ? '0%' : settings.gradientDirection === '90' ? '0%' : '100%'}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={settings.gradientStart} />
                <stop offset="100%" stopColor={settings.gradientEnd} />
              </linearGradient>
            </defs>
          </svg>
          
          <div 
            className="relative inline-block"
            style={{
              padding: `${settings.marginSize * 4}px`,
              backgroundColor: settings.backgroundColor
            }}
          >
            <div style={{ width: qrSize, height: qrSize }}>
              <QRRenderer 
                qrCode={qrCode} 
                settings={settings}
                gradientId={settings.useGradient ? 'qr-gradient' : undefined}
              />
            </div>
          </div>

          {settings.textEnabled && settings.textPosition === 'bottom' && (
            <p 
              className="mt-4 font-semibold text-center"
              style={{ 
                fontSize: `${settings.textSize}px`,
                color: settings.textColor
              }}
            >
              {settings.textContent || employeeName}
            </p>
          )}

          {settings.frame === 'badge' && settings.frameText && (
            <div className="mt-4 w-full">
              <div 
                className="py-3 px-6 rounded-lg text-center shadow-md"
                style={{ 
                  backgroundColor: settings.frameColor || '#1e293b',
                  color: 'white'
                }}
              >
                <p className="font-bold text-lg tracking-wider">{settings.frameText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1 h-11 font-semibold border-2 hover:bg-gray-50"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Info Badge */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-indigo-900 mb-1">Permanent QR Code</p>
            <p className="text-gray-600">This QR code is unique and permanent for this employee. It will remain the same even if employee data changes.</p>
          </div>
        </div>

        {/* QR Code Value */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">QR Code Value</span>
            <span className="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded border">{qrCode}</span>
          </div>
        </div>
      </div>
    )
  }

  // Full version (default)
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Employee QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          id={`qr-container-${qrCode}`}
          className="flex flex-col items-center justify-center p-4 bg-white rounded-lg"
          style={{
            border: settings.borderEnabled 
              ? `${settings.borderWidth}px solid ${settings.borderColor}`
              : '2px dashed #E5E7EB',
            borderRadius: `${settings.borderRadius}px`
          }}
        >
          {settings.textEnabled && settings.textPosition === 'top' && (
            <p 
              className="mb-4 font-semibold text-center"
              style={{ 
                fontSize: `${settings.textSize}px`,
                color: settings.textColor
              }}
            >
              {settings.textContent || employeeName}
            </p>
          )}
          
          {/* Hidden SVG for Gradient Definitions */}
          <svg width="0" height="0" className="absolute opacity-0 pointer-events-none">
            <defs id="qr-gradient-defs">
              <linearGradient 
                id="qr-gradient" 
                x1={settings.gradientDirection === '0' ? '0%' : settings.gradientDirection === '45' ? '0%' : settings.gradientDirection === '90' ? '0%' : '0%'}
                y1={settings.gradientDirection === '0' ? '0%' : settings.gradientDirection === '45' ? '100%' : settings.gradientDirection === '90' ? '100%' : '0%'}
                x2={settings.gradientDirection === '0' ? '100%' : settings.gradientDirection === '45' ? '100%' : settings.gradientDirection === '90' ? '0%' : '100%'}
                y2={settings.gradientDirection === '0' ? '0%' : settings.gradientDirection === '45' ? '0%' : settings.gradientDirection === '90' ? '0%' : '100%'}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={settings.gradientStart} />
                <stop offset="100%" stopColor={settings.gradientEnd} />
              </linearGradient>
            </defs>
          </svg>
          
          <div 
            className="relative inline-block"
            style={{
              padding: `${settings.marginSize * 4}px`,
              backgroundColor: settings.backgroundColor
            }}
          >
            <div style={{ width: qrSize, height: qrSize }}>
              <QRRenderer 
                qrCode={qrCode} 
                settings={settings}
                gradientId={settings.useGradient ? 'qr-gradient' : undefined}
              />
            </div>
          </div>

          {settings.textEnabled && settings.textPosition === 'bottom' && (
            <p 
              className="mt-4 font-semibold text-center"
              style={{ 
                fontSize: `${settings.textSize}px`,
                color: settings.textColor
              }}
            >
              {settings.textContent || employeeName}
            </p>
          )}

          {!settings.textEnabled && (
            <div className="text-center space-y-1 mt-4">
              <p className="font-semibold text-lg">{employeeName}</p>
              <p className="text-sm text-gray-500">{employeeCode}</p>
              <p className="text-xs text-gray-400 font-mono mt-2">{qrCode}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded">
          <p>This QR code is permanent and unique to this employee.</p>
          <p>It will remain the same even if employee data changes.</p>
        </div>
      </CardContent>
    </Card>
  )
}

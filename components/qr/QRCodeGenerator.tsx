'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { settingsManager } from '@/lib/settingsManager'
import {
  QrCode,
  Download,
  Share2,
  Copy,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  FileText,
  Camera,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface UserData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_1?: string
  phone_2?: string
  department_name_en?: string
  job_title_en?: string
  about?: string
  profile_picture_url?: string
}

interface QRCodeGeneratorProps {
  userData: UserData
  size?: number
  showControls?: boolean
  showVCardInfo?: boolean
}

export function QRCodeGenerator({ 
  userData, 
  size = 200, 
  showControls = true,
  showVCardInfo = true 
}: QRCodeGeneratorProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [companyLogo, setCompanyLogo] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('Al Rabat Foundation')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawDefaultLogo = (ctx: CanvasRenderingContext2D, logoX: number, logoY: number, logoSize: number) => {
    // Draw gradient circle for logo
    const gradient = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize)
    gradient.addColorStop(0, '#3b82f6')
    gradient.addColorStop(1, '#8b5cf6')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw "AR" text in center
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${logoSize * 0.45}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AR', logoX + logoSize/2, logoY + logoSize/2)
  }

  const generateVCard = (user: UserData): string => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${user.first_name} ${user.last_name}`,
      `N:${user.last_name};${user.first_name};;;`,
      `ORG:${companyName}`,
      `EMAIL:${user.email}`,
    ]

    if (user.phone_1) {
      vcard.push(`TEL:${user.phone_1}`)
    }

    if (user.phone_2) {
      vcard.push(`TEL:${user.phone_2}`)
    }

    if (user.job_title_en) {
      vcard.push(`TITLE:${user.job_title_en}`)
    }

    if (user.department_name_en) {
      vcard.push(`ORG:${user.department_name_en}`)
    }

    if (user.about) {
      vcard.push(`NOTE:${user.about}`)
    }

    if (user.profile_picture_url) {
      vcard.push(`PHOTO:${user.profile_picture_url}`)
    }

    vcard.push('END:VCARD')
    
    return vcard.join('\n')
  }

  const generateQRCode = async () => {
    try {
      setLoading(true)
      setError('')

      const vcardData = generateVCard(userData)
      
      // Generate QR code with higher quality settings
      const options = {
        width: size * 2, // Double resolution for better quality
        margin: 4,
        color: {
          dark: '#000000', // أسود نقي
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M' as const, // Medium level for good balance
        rendererOpts: {
          quality: 1,
          // Enable high DPI rendering
          scale: 2
        }
      }

      // Generate base QR code
      let qrDataURL = await QRCode.toDataURL(vcardData, options)
      
      // Add logo in center by drawing on canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Set high DPI for crisp rendering
        const devicePixelRatio = window.devicePixelRatio || 1
        canvas.width = size * devicePixelRatio
        canvas.height = size * devicePixelRatio
        canvas.style.width = size + 'px'
        canvas.style.height = size + 'px'
        ctx.scale(devicePixelRatio, devicePixelRatio)
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        const img = new Image()
        img.onload = () => {
          
          // Draw QR code
          ctx.drawImage(img, 0, 0, size, size)
          
          // Calculate logo size (about 20% of QR code)
          const logoSize = size * 0.22
          const logoX = (size - logoSize) / 2
          const logoY = (size - logoSize) / 2
          
          // Draw white rounded rectangle background for logo
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          const radius = logoSize * 0.2
          ctx.roundRect(logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, radius)
          ctx.fill()
          
          // If company logo exists, use it; otherwise use default AR logo
          console.log('QR Code generation - companyLogo:', companyLogo)
          if (companyLogo) {
            console.log('Using company logo:', companyLogo)
            const logoImg = new Image()
            // Don't set crossOrigin for base64 images
            logoImg.onload = () => {
              console.log('Company logo loaded successfully')
              // Draw logo image with padding to show full logo
              const padding = logoSize * 0.1 // 10% padding
              const logoDrawSize = logoSize - (padding * 2)
              const logoDrawX = logoX + padding
              const logoDrawY = logoY + padding
              
              ctx.save()
              ctx.beginPath()
              ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, 2 * Math.PI)
              ctx.clip()
              
              // Draw white background for logo
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(logoX, logoY, logoSize, logoSize)
              
              // Draw logo with aspect ratio preservation
              const aspectRatio = logoImg.width / logoImg.height
              let drawWidth = logoDrawSize
              let drawHeight = logoDrawSize
              let finalX = logoDrawX
              let finalY = logoDrawY
              
              if (aspectRatio > 1) {
                // Logo is wider than tall
                drawHeight = logoDrawSize / aspectRatio
                finalY += (logoDrawSize - drawHeight) / 2
              } else {
                // Logo is taller than wide
                drawWidth = logoDrawSize * aspectRatio
                finalX += (logoDrawSize - drawWidth) / 2
              }
              
              ctx.drawImage(logoImg, finalX, finalY, drawWidth, drawHeight)
              ctx.restore()
              
              setQrCodeDataURL(canvas.toDataURL())
            }
            logoImg.onerror = (error) => {
              console.log('Company logo failed to load:', error)
              console.log('Logo URL that failed:', companyLogo)
              // If logo fails to load, use default AR
              drawDefaultLogo(ctx, logoX, logoY, logoSize)
              setQrCodeDataURL(canvas.toDataURL())
            }
            logoImg.src = companyLogo
          } else {
            console.log('No company logo, using default AR')
            // Draw default AR logo
            drawDefaultLogo(ctx, logoX, logoY, logoSize)
            setQrCodeDataURL(canvas.toDataURL())
          }
        }
        
        img.src = qrDataURL
      } else {
        setQrCodeDataURL(qrDataURL)
      }
      
    } catch (err: any) {
      console.error('Error generating QR code:', err)
      setError('Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanySettings()
  }, [])

  useEffect(() => {
    if (userData) {
      generateQRCode()
    }
  }, [userData, size, companyLogo, companyName])

  const loadCompanySettings = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // Load company logo and name from company_settings
      // Use logo_url field (the correct field name)
      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('logo_url, company_name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      
      if (settings && !error) {
        console.log('Company settings loaded:', settings)
        
        // Use logo_url field (the correct field name)
        const logoUrl = (settings as any).logo_url
        console.log('Logo URL found:', logoUrl)
        console.log('Full settings object:', JSON.stringify(settings, null, 2))
        
        if (logoUrl) {
          setCompanyLogo(logoUrl)
          console.log('Company logo set to:', logoUrl)
        } else {
          console.log('No logo URL found in settings')
        }
        
        if ((settings as any).company_name) {
          setCompanyName((settings as any).company_name)
          console.log('Company name set to:', (settings as any).company_name)
        }
      } else {
        console.log('No company settings found or error:', error)
      }
    } catch (err) {
      console.error('Error loading company settings:', err)
      // Use default values if settings not found
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return

    const link = document.createElement('a')
    link.download = `${userData.first_name}_${userData.last_name}_QRCode.png`
    link.href = qrCodeDataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccess('QR Code downloaded successfully!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const copyQRCodeToClipboard = async () => {
    if (!qrCodeDataURL) return

    try {
      const response = await fetch(qrCodeDataURL)
      const blob = await response.blob()
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      
      setSuccess('QR Code copied to clipboard!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to copy QR code')
    }
  }

  const shareQRCode = async () => {
    if (!qrCodeDataURL) return

    try {
      if (navigator.share) {
        const response = await fetch(qrCodeDataURL)
        const blob = await response.blob()
        const file = new File([blob], `${userData.first_name}_QRCode.png`, { type: 'image/png' })
        
        await navigator.share({
          title: `${userData.first_name} ${userData.last_name} - Contact QR Code`,
          text: `Scan this QR code to add ${userData.first_name} ${userData.last_name} to your contacts`,
          files: [file]
        })
      } else {
        // Fallback to download
        downloadQRCode()
      }
    } catch (err) {
      console.error('Error sharing QR code:', err)
    }
  }

  const copyVCardText = () => {
    const vcardText = generateVCard(userData)
    navigator.clipboard.writeText(vcardText)
    setSuccess('vCard copied to clipboard!')
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="space-y-4">
      {/* QR Code Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Contact QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <Alert variant="error">
              <XCircle className="h-4 w-4" />
              {error}
            </Alert>
          ) : qrCodeDataURL ? (
            <div className="space-y-4">
              <div className="inline-block p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700">
                {/* Company Logo & Header */}
                <div className="text-center mb-8">
                  {companyLogo ? (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-xl bg-white border-4 border-white ring-2 ring-gray-100">
                      <img 
                        src={companyLogo} 
                        alt={companyName}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl border-4 border-white ring-2 ring-gray-100">
                      AR
                    </div>
                  )}
                  <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {companyName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Contact Card
                  </div>
                </div>
                
                {/* QR Code with enhanced styling */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-indigo-900/10 rounded-3xl blur-sm"></div>
                  <div className="relative p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-inner border border-gray-100 dark:border-gray-700">
                    <div className="relative">
                      <img
                        src={qrCodeDataURL}
                        alt={`QR Code for ${userData.first_name} ${userData.last_name}`}
                        className="mx-auto rounded-2xl shadow-lg"
                        style={{ 
                          imageRendering: '-webkit-optimize-contrast',
                          filter: 'contrast(1.1) brightness(1.02)'
                        }}
                      />
                      {/* Decorative elements */}
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-60"></div>
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full opacity-60"></div>
                      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full opacity-60"></div>
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-60"></div>
                    </div>
                  </div>
                </div>
                
                {/* User info footer */}
                <div className="text-center bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {userData.first_name} {userData.last_name}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {userData.job_title_en || 'Team Member'}
                  </div>
                  {userData.department_name_en && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {userData.department_name_en}
                    </div>
                  )}
                </div>
              </div>
              
              {showControls && (
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <Button
                    onClick={downloadQRCode}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-2 transform hover:scale-105"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    onClick={copyQRCodeToClipboard}
                    variant="outline"
                    size="sm"
                    className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 hover:text-purple-700 rounded-full transition-all duration-300 px-8 py-2 transform hover:scale-105"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  
                  <Button
                    onClick={shareQRCode}
                    variant="outline"
                    size="sm"
                    className="border-2 border-green-200 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 hover:text-green-700 rounded-full transition-all duration-300 px-8 py-2 transform hover:scale-105"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-gray-500">
              <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No QR code generated</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* vCard Information */}
      {showVCardInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              vCard Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-medium">{userData.first_name} {userData.last_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium">{userData.email}</p>
                  </div>
                </div>
                
                {userData.phone_1 && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Primary Phone</p>
                      <p className="font-medium">{userData.phone_1}</p>
                    </div>
                  </div>
                )}
                
                {userData.phone_2 && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Secondary Phone</p>
                      <p className="font-medium">{userData.phone_2}</p>
                    </div>
                  </div>
                )}
                
                {userData.job_title_en && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Job Title</p>
                      <p className="font-medium">{userData.job_title_en}</p>
                    </div>
                  </div>
                )}
                
                {userData.department_name_en && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                      <p className="font-medium">{userData.department_name_en}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {userData.about && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">About</p>
                    <p className="font-medium text-sm">{userData.about}</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={copyVCardText}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy vCard Text
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert variant="error">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
    </div>
  )
}

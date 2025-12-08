'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  CreditCard, Download, Settings, Eye, EyeOff, FileText, 
  Image as ImageIcon, Palette, Type, Layout, Save, X, Check
} from 'lucide-react'
import { AttendanceEmployee } from '@/lib/supabase'
import { IDCardPreview } from './IDCardPreview'
import { IDCardDesigner } from './IDCardDesigner'
import { useQRSettings } from '@/hooks/useQRSettings'
import { QRRenderer } from './QRRenderer'

export interface IDCardDesign {
  // Card dimensions
  width: number // mm
  height: number // mm
  borderRadius: number // mm
  
  // Front side
  front: {
    backgroundColor: string
    backgroundImage?: string
    backgroundOpacity: number
    logo?: {
      enabled: boolean
      url?: string
      position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'
      size: number // percentage
      opacity: number
    }
    photo?: {
      enabled: boolean
      position: 'left' | 'right' | 'center'
      size: number // percentage
      shape: 'square' | 'circle' | 'rounded'
      borderWidth: number
      borderColor: string
    }
    employeeName: {
      enabled: boolean
      fontSize: number
      fontWeight: 'normal' | 'bold'
      color: string
      position: { x: number; y: number } // percentage
      alignment: 'left' | 'center' | 'right'
    }
    employeeCode: {
      enabled: boolean
      fontSize: number
      fontWeight: 'normal' | 'bold'
      color: string
      position: { x: number; y: number } // percentage
      alignment: 'left' | 'center' | 'right'
      label?: string // e.g., "ID:", "Code:"
    }
    jobTitle: {
      enabled: boolean
      fontSize: number
      fontWeight: 'normal' | 'bold'
      color: string
      position: { x: number; y: number } // percentage
      alignment: 'left' | 'center' | 'right'
    }
    department: {
      enabled: boolean
      fontSize: number
      fontWeight: 'normal' | 'bold'
      color: string
      position: { x: number; y: number } // percentage
      alignment: 'left' | 'center' | 'right'
    }
    qrCode: {
      enabled: boolean
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
      size: number // percentage
      margin: number // percentage
    }
    additionalFields: Array<{
      label: string
      value: string
      fontSize: number
      fontWeight: 'normal' | 'bold'
      color: string
      position: { x: number; y: number }
      alignment: 'left' | 'center' | 'right'
    }>
  }
  
  // Back side
  back: {
    backgroundColor: string
    backgroundImage?: string
    backgroundOpacity: number
    logo?: {
      enabled: boolean
      url?: string
      position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'
      size: number
      opacity: number
    }
    companyInfo?: {
      enabled: boolean
      name: string
      address: string
      phone: string
      email: string
      website: string
      fontSize: number
      color: string
      position: { x: number; y: number }
      alignment: 'left' | 'center' | 'right'
    }
    terms?: {
      enabled: boolean
      text: string
      fontSize: number
      color: string
      position: { x: number; y: number }
      alignment: 'left' | 'center' | 'right'
    }
    barcode?: {
      enabled: boolean
      position: 'top' | 'bottom'
      height: number
    }
  }
}

const DEFAULT_DESIGN: IDCardDesign = {
  width: 85.6, // Standard ID card width in mm
  height: 53.98, // Standard ID card height in mm
  borderRadius: 4,
  front: {
    backgroundColor: '#FFFFFF',
    backgroundOpacity: 1,
    logo: {
      enabled: false, // Logo disabled in default design
      position: 'top-center',
      size: 18,
      opacity: 1
    },
    photo: {
      enabled: true,
      position: 'left',
      size: 32, // Photo size matching the image
      shape: 'rounded',
      borderWidth: 4, // Thicker blue border as shown
      borderColor: '#1e40af' // Dark blue border
    },
    employeeName: {
      enabled: true,
      fontSize: 16, // Larger, more prominent
      fontWeight: 'bold',
      color: '#1e293b', // Dark gray
      position: { x: 38, y: 25 }, // Positioned to the right of photo, aligned left
      alignment: 'left'
    },
    employeeCode: {
      enabled: true,
      fontSize: 10,
      fontWeight: 'normal',
      color: '#64748b',
      position: { x: 38, y: 40 },
      alignment: 'left',
      label: 'ID:'
    },
    jobTitle: {
      enabled: true,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#475569',
      position: { x: 38, y: 52 },
      alignment: 'left'
    },
    department: {
      enabled: true,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#475569',
      position: { x: 38, y: 64 },
      alignment: 'left'
    },
    qrCode: {
      enabled: true,
      position: 'top-right', // QR code on the right side
      size: 30, // Larger QR code
      margin: 3
    },
    additionalFields: []
  },
  back: {
    backgroundColor: '#f8fafc', // Light blue-gray instead of gray
    backgroundOpacity: 1,
    logo: {
      enabled: true,
      position: 'top-center',
      size: 25,
      opacity: 1
    },
    companyInfo: {
      enabled: true,
      name: 'AlRabat RPF',
      address: '',
      phone: '',
      email: '',
      website: '',
      fontSize: 9,
      color: '#1e293b',
      position: { x: 50, y: 50 },
      alignment: 'center'
    },
    terms: {
      enabled: true,
      text: 'This card is the property of the company and must be returned upon termination.',
      fontSize: 7,
      color: '#64748b',
      position: { x: 50, y: 85 },
      alignment: 'center'
    }
  }
}

interface IDCardGeneratorProps {
  employee: AttendanceEmployee
  onClose?: () => void
}

export function IDCardGenerator({ employee, onClose }: IDCardGeneratorProps) {
  const [design, setDesign] = useState<IDCardDesign>(DEFAULT_DESIGN)
  const [showDesigner, setShowDesigner] = useState(false)
  const [showBack, setShowBack] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [companySettings, setCompanySettings] = useState<{ name: string; slogan: string; logoUrl?: string } | null>(null)
  const { settings: qrSettings } = useQRSettings()

  // Load company settings
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        const { getCachedCompanySettings } = await import('@/lib/companySettings')
        const settings = await getCachedCompanySettings()
      setCompanySettings({
        name: settings.company_name,
        slogan: settings.company_slogan,
        logoUrl: settings.company_logo_url
      })
      
      // Update design with company logo if available
      if (settings.company_logo_url && !design.front.logo?.url) {
        setDesign(prev => ({
          ...prev,
          front: {
            ...prev.front,
            logo: {
              ...prev.front.logo,
              enabled: true,
              url: settings.company_logo_url
            } as any
          },
          back: {
            ...prev.back,
            logo: {
              ...prev.back.logo,
              enabled: true,
              url: settings.company_logo_url
            } as any,
            companyInfo: {
              ...prev.back.companyInfo,
              enabled: true,
              name: settings.company_name,
              address: '',
              phone: '',
              email: '',
              website: '',
              fontSize: prev.back.companyInfo?.fontSize || 9,
              color: prev.back.companyInfo?.color || '#1e293b',
              position: prev.back.companyInfo?.position || { x: 50, y: 50 },
              alignment: prev.back.companyInfo?.alignment || 'center'
            } as any
          }
        }))
      }
      } catch (error) {
        console.error('Failed to load company settings:', error)
      }
    }
    loadCompanySettings()
  }, [])

  // Load saved design from localStorage - this ensures all employees use the same design
  useEffect(() => {
    const savedDesign = localStorage.getItem('idCardDesign')
    if (savedDesign) {
      try {
        const parsed = JSON.parse(savedDesign)
        // Merge with default to ensure all fields exist
        setDesign({
          ...DEFAULT_DESIGN,
          ...parsed,
          front: {
            ...DEFAULT_DESIGN.front,
            ...parsed.front
          },
          back: {
            ...DEFAULT_DESIGN.back,
            ...parsed.back
          }
        })
      } catch (e) {
        console.error('Failed to load saved design:', e)
        setDesign(DEFAULT_DESIGN)
      }
    } else {
      // Use default design for all employees
      setDesign(DEFAULT_DESIGN)
    }
  }, [])

  // Save design to localStorage - this will be the default for all employees
  const saveDesign = () => {
    localStorage.setItem('idCardDesign', JSON.stringify(design))
    setShowDesigner(false)
    // Show success message
    alert('تم حفظ التصميم! سيتم تطبيق هذا التصميم على جميع الموظفين.')
  }

  // Generate QR code for employee - UNIFIED FORMAT (same as EmployeesManagement)
  // This ensures the QR code format is consistent everywhere for proper scanning
  const generateQRCode = (): string => {
    // Validate required fields
    if (!employee || !employee.id || !employee.employee_code) {
      console.error('❌ Invalid employee data for QR code generation:', {
        hasEmployee: !!employee,
        hasId: !!employee?.id,
        hasEmployeeCode: !!employee?.employee_code
      })
      throw new Error('Invalid employee data: missing required fields (id, employee_code)')
    }

    // Use the EXACT same format as EmployeesManagement.generateQRCode
    // This format is recognized by QRCodeScanner for automatic login
    // Order matters: id and employee_code MUST be first for quick parsing
    const qrData: {
      id: string
      employee_code: string
      name: string
      job_title: string | null
      department: string | null
      phone_number: string | null
      email: string | null
    } = {
      // Employee identification (required for scanning) - MUST be first
      id: String(employee.id).trim(), // Ensure it's a string
      employee_code: String(employee.employee_code).trim(), // Ensure it's a string
      name: String(employee.name || '').trim(),
      
      // Employee details (optional, but included for consistency)
      job_title: employee.job_title ? String(employee.job_title).trim() : null,
      department: employee.department ? String(employee.department).trim() : null,
      phone_number: employee.phone_number ? String(employee.phone_number).trim() : null,
      email: employee.email ? String(employee.email).trim() : null
    }
    
    // Validate critical fields after conversion
    if (!qrData.id || !qrData.employee_code) {
      console.error('❌ QR code generation failed: empty id or employee_code after conversion')
      throw new Error('QR code generation failed: empty id or employee_code')
    }
    
    // Return as JSON string (same format everywhere) - no spaces for consistency
    // This format is parsed by QRCodeScanner.handleQRCodeScanned()
    const jsonString = JSON.stringify(qrData, null, 0) // null, 0 = no spaces, consistent order
    
    // Validate the generated JSON can be parsed back
    try {
      const parsed = JSON.parse(jsonString)
      if (!parsed.id || !parsed.employee_code) {
        throw new Error('Generated QR code missing required fields')
      }
    } catch (validationError) {
      console.error('❌ Generated QR code validation failed:', validationError)
      throw new Error('Generated QR code is invalid')
    }
    
    return jsonString
  }

  // Export as PDF
  const exportAsPDF = async () => {
    setIsGenerating(true)
    try {
      // Dynamic import for pdfmake
      const pdfMakeModule = await import('pdfmake/build/pdfmake')
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
      
      const pdfMake = pdfMakeModule.default || pdfMakeModule
      const pdfFonts = pdfFontsModule.default || pdfFontsModule
      
      if (pdfMake && pdfFonts) {
        // @ts-ignore - pdfmake types
        pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs
      }

      // Generate QR code image
      const QRCode = await import('qrcode')
      const qrCodeData = generateQRCode()
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
        width: 200,
        margin: 1,
        color: {
          dark: qrSettings.foregroundColor || '#000000',
          light: qrSettings.backgroundColor || '#FFFFFF'
        }
      })

      // Create PDF document
      const docDefinition: any = {
        pageSize: { width: design.width, height: design.height },
        pageMargins: 0,
        content: []
      }

      // Add front side content
      const frontContent: any[] = []

      // Background rectangle
      frontContent.push({
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: design.width,
            h: design.height,
            r: design.borderRadius,
            color: design.front.backgroundColor
          }
        ]
      })

      // Add logo if enabled
      if (design.front.logo?.enabled && design.front.logo?.url) {
        try {
          const logoSize = (design.width * design.front.logo.size) / 100
          const margin = (design.width * 5) / 100
          let logoX = 0
          let logoY = margin
          
          switch (design.front.logo.position) {
            case 'top-left':
              logoX = margin
              break
            case 'top-center':
              logoX = (design.width - logoSize) / 2
              break
            case 'top-right':
              logoX = design.width - logoSize - margin
              break
            default:
              logoX = (design.width - logoSize) / 2
          }
          
          frontContent.push({
            image: design.front.logo.url,
            width: logoSize,
            height: logoSize,
            absolutePosition: { x: logoX, y: logoY },
            opacity: design.front.logo.opacity
          })
        } catch (e) {
          console.error('Error loading logo:', e)
        }
      }

      // Calculate text position based on photo enabled state (same logic as preview)
      const getTextX = (positionX: number) => {
        return design.front.photo?.enabled 
          ? (design.width * positionX) / 100
          : (design.width * 5) / 100 // Start from left if no photo
      }

      // Add employee photo if enabled
      if (design.front.photo?.enabled) {
        const photoSize = (design.width * design.front.photo.size) / 100
        const margin = (design.width * 5) / 100
        const photoX = margin
        const photoY = (design.height - photoSize) / 2
        
        // Draw photo placeholder with gradient background
        frontContent.push({
          canvas: [
            {
              type: 'rect',
              x: photoX,
              y: photoY,
              w: photoSize,
              h: photoSize,
              r: design.front.photo.shape === 'rounded' ? 3 : 0,
              color: design.front.photo.borderColor,
              lineWidth: design.front.photo.borderWidth
            }
          ]
        })
        
        // Add initial letter inside photo
        const initial = employee.name?.charAt(0)?.toUpperCase() || '?'
        frontContent.push({
          text: initial,
          fontSize: photoSize * 0.4,
          bold: true,
          color: '#ffffff',
          absolutePosition: {
            x: photoX + photoSize / 2 - (photoSize * 0.2),
            y: photoY + photoSize / 2 - (photoSize * 0.15)
          }
        })
      }

      // Add employee name
      if (design.front.employeeName.enabled) {
        frontContent.push({
          text: employee.name || '',
          fontSize: design.front.employeeName.fontSize,
          bold: design.front.employeeName.fontWeight === 'bold',
          color: design.front.employeeName.color,
          absolutePosition: {
            x: getTextX(design.front.employeeName.position.x),
            y: (design.height * design.front.employeeName.position.y) / 100
          }
        })
      }

      // Add employee code
      if (design.front.employeeCode.enabled) {
        const codeText = design.front.employeeCode.label 
          ? `${design.front.employeeCode.label} ${employee.employee_code || ''}`
          : employee.employee_code || ''
        frontContent.push({
          text: codeText,
          fontSize: design.front.employeeCode.fontSize,
          bold: design.front.employeeCode.fontWeight === 'bold',
          color: design.front.employeeCode.color,
          absolutePosition: {
            x: getTextX(design.front.employeeCode.position.x),
            y: (design.height * design.front.employeeCode.position.y) / 100
          }
        })
      }

      // Add job title
      if (design.front.jobTitle.enabled && employee.job_title) {
        frontContent.push({
          text: employee.job_title,
          fontSize: design.front.jobTitle.fontSize,
          bold: design.front.jobTitle.fontWeight === 'bold',
          color: design.front.jobTitle.color,
          absolutePosition: {
            x: getTextX(design.front.jobTitle.position.x),
            y: (design.height * design.front.jobTitle.position.y) / 100
          }
        })
      }

      // Add department
      if (design.front.department.enabled && employee.department) {
        frontContent.push({
          text: employee.department,
          fontSize: design.front.department.fontSize,
          bold: design.front.department.fontWeight === 'bold',
          color: design.front.department.color,
          absolutePosition: {
            x: getTextX(design.front.department.position.x),
            y: (design.height * design.front.department.position.y) / 100
          }
        })
      }

      // Add QR code
      if (design.front.qrCode.enabled) {
        const qrSize = (design.width * design.front.qrCode.size) / 100
        const marginPx = (design.width * design.front.qrCode.margin) / 100
        let qrX = 0
        let qrY = 0
        
        switch (design.front.qrCode.position) {
          case 'top-left':
            qrX = marginPx
            qrY = marginPx
            break
          case 'top-right':
            qrX = design.width - qrSize - marginPx
            qrY = marginPx
            break
          case 'bottom-left':
            qrX = marginPx
            qrY = design.height - qrSize - marginPx
            break
          case 'bottom-right':
            qrX = design.width - qrSize - marginPx
            qrY = design.height - qrSize - marginPx
            break
          case 'center':
            qrX = (design.width - qrSize) / 2
            qrY = (design.height - qrSize) / 2
            break
        }

        frontContent.push({
          image: qrCodeDataUrl,
          width: qrSize,
          height: qrSize,
          absolutePosition: { x: qrX, y: qrY }
        })
      }

      // Set content
      docDefinition.content = frontContent

      // Generate PDF
      // @ts-ignore - pdfmake types
      const pdfDoc = pdfMake.createPdf(docDefinition)
      pdfDoc.download(`${employee.name || 'ID_Card'}_${employee.employee_code || 'ID'}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Export as Image
  const exportAsImage = async () => {
    setIsGenerating(true)
    try {
      // This will be implemented using html2canvas or canvas
      alert('Image export will be available soon!')
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to generate image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              ID Card Generator - {employee.name || employee.employee_code}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBack(!showBack)}
              >
                {showBack ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showBack ? 'Show Front' : 'Show Back'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDesigner(!showDesigner)}
              >
                <Settings className="w-4 h-4" />
                Design
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAsPDF}
                disabled={isGenerating}
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAsImage}
                disabled={isGenerating}
              >
                <ImageIcon className="w-4 h-4" />
                Export Image
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-6">
          {showDesigner ? (
            <IDCardDesigner
              design={design}
              onDesignChange={setDesign}
              onSave={saveDesign}
              onCancel={() => setShowDesigner(false)}
            />
          ) : (
            <div className="flex gap-6">
              {/* Preview */}
              <div className="flex-1">
                <IDCardPreview
                  employee={employee}
                  design={design}
                  showBack={showBack}
                  qrCode={generateQRCode()}
                  qrSettings={qrSettings}
                />
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
                <LoadingSpinner />
                <p className="text-sm text-gray-600">Generating ID Card...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


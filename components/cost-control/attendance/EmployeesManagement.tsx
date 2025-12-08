'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Users, Plus, Edit, Trash2, Search, X, CheckCircle, AlertCircle, 
  Building, Phone, Mail, UserCheck, Filter, QrCode, Download, 
  FileText, FileSpreadsheet, CheckSquare, Square, RefreshCw
} from 'lucide-react'
import { supabase, TABLES, AttendanceEmployee } from '@/lib/supabase'
import { QRCodeDisplay } from './QRCodeDisplay'
import { useQRSettings } from '@/hooks/useQRSettings'
import { QRRenderer } from './QRRenderer'

export function EmployeesManagement() {
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<AttendanceEmployee | null>(null)
  const [viewingQRCode, setViewingQRCode] = useState<AttendanceEmployee | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const { settings: qrSettings } = useQRSettings()
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    job_title: '',
    department: '',
    phone_number: '',
    email: '',
    status: 'Active' as 'Active' | 'Inactive'
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setEmployees(data || [])
    } catch (err: any) {
      setError('Failed to load employees: ' + err.message)
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = (employee: AttendanceEmployee): string => {
    // Validate required fields
    if (!employee || !employee.id || !employee.employee_code) {
      console.error('❌ Invalid employee data for QR code generation:', {
        hasEmployee: !!employee,
        hasId: !!employee?.id,
        hasEmployeeCode: !!employee?.employee_code
      })
      throw new Error('Invalid employee data: missing required fields (id, employee_code)')
    }

    // Create JSON object with essential employee data only
    // IMPORTANT: Use consistent order and format for reliable scanning
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
      // Employee identification (REQUIRED for scanning) - MUST be first
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
    
    // Convert to JSON string with NO spaces and consistent formatting
    // Use replacer to ensure consistent order and handle null values properly
    const jsonString = JSON.stringify(qrData, null, 0) // null, 0 = no spaces, consistent order
    
    // Validate the generated JSON can be parsed back
    try {
      const parsed = JSON.parse(jsonString)
      if (!parsed.id || !parsed.employee_code) {
        throw new Error('Generated QR code missing required fields')
      }
      console.log('✅ QR code generated successfully:', {
        id: parsed.id,
        employee_code: parsed.employee_code,
        length: jsonString.length
      })
    } catch (validationError) {
      console.error('❌ Generated QR code validation failed:', validationError)
      throw new Error('Generated QR code is invalid')
    }
    
    return jsonString
  }

  const ensureQRCode = async (employee: AttendanceEmployee): Promise<string> => {
    // If employee already has QR code, check if it's the new format (JSON)
    if (employee.qr_code) {
      try {
        // Try to parse as JSON to check if it's new format
        const parsed = JSON.parse(employee.qr_code)
        if (parsed.id === employee.id && parsed.employee_code === employee.employee_code) {
          // It's new format, but check if data is up to date
          const currentData = generateQRCode(employee)
          if (employee.qr_code !== currentData) {
            // Data changed, update QR code
            console.log('🔄 Employee data changed, updating QR code...')
            return await updateQRCode(employee, currentData)
          }
          return employee.qr_code
        }
        // Old format or different employee, convert to new format
        console.log('🔄 Converting QR code format to new format...')
        const newQRCode = generateQRCode(employee)
        return await updateQRCode(employee, newQRCode)
      } catch (e) {
        // Not JSON, it's old format (EMP-XXX), convert to new format
        console.log('🔄 Converting old QR code format to new format...')
        const newQRCode = generateQRCode(employee)
        return await updateQRCode(employee, newQRCode)
      }
    }

    // Generate new QR code with essential employee data
    const qrCode = generateQRCode(employee)
    return await updateQRCode(employee, qrCode)
  }

  const updateQRCode = async (employee: AttendanceEmployee, qrCode: string): Promise<string> => {
    // Update employee with QR code
    try {
      const { error } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        // @ts-ignore
        .update({ qr_code: qrCode })
        .eq('id', employee.id)

      if (error) {
        console.error('Error updating QR code:', error)
        return qrCode // Return generated code even if update fails
      }

      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === employee.id ? { ...emp, qr_code: qrCode } : emp
      ))

      return qrCode
    } catch (err) {
      console.error('Error updating QR code:', err)
      return qrCode
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      setSuccess('')

      if (editingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from(TABLES.ATTENDANCE_EMPLOYEES)
          // @ts-ignore - Attendance tables not in Supabase types yet
          .update(formData)
          .eq('id', editingEmployee.id)

        if (updateError) throw updateError
        setSuccess('Employee updated successfully!')
      } else {
        // Add new employee
        const { error: insertError } = await supabase
          .from(TABLES.ATTENDANCE_EMPLOYEES)
          // @ts-ignore - Attendance tables not in Supabase types yet
          .insert([formData])

        if (insertError) throw insertError
        setSuccess('Employee added successfully!')
      }

      setShowAddForm(false)
      setEditingEmployee(null)
      setFormData({
        employee_code: '',
        name: '',
        job_title: '',
        department: '',
        phone_number: '',
        email: '',
        status: 'Active'
      })
      fetchEmployees()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save employee: ' + err.message)
      console.error('Error saving employee:', err)
    }
  }

  const handleEdit = (employee: AttendanceEmployee) => {
    setEditingEmployee(employee)
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name,
      job_title: employee.job_title || '',
      department: employee.department || '',
      phone_number: employee.phone_number || '',
      email: employee.email || '',
      status: employee.status
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      setError('')
      const { error: deleteError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setSuccess('Employee deleted successfully!')
      fetchEmployees()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete employee: ' + err.message)
      console.error('Error deleting employee:', err)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Selection handlers
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)))
    }
  }

  const getSelectedEmployees = (): AttendanceEmployee[] => {
    return filteredEmployees.filter(emp => selectedEmployees.has(emp.id))
  }

  // Fast QR code rendering using Canvas API directly - EXACTLY matching QRRenderer logic
  const renderQRCodeToImage = async (qrCode: string, size: number = 120): Promise<string> => {
    try {
      const QRCode = await import('qrcode')
      
      // Generate QR code matrix - EXACTLY like QRRenderer
      // IMPORTANT: Use 'H' (High) error correction when logo is enabled for better scanning reliability
      // This ensures QR code can be scanned even with logo covering data modules
      const errorLevel = qrSettings.logoEnabled && qrSettings.logoUrl 
        ? 'H' // Force High error correction when logo is present
        : (qrSettings.errorCorrectionLevel || 'H') // Default to High for best reliability
      
      const qr = QRCode.create(qrCode, {
        errorCorrectionLevel: errorLevel as any,
        maskPattern: undefined
      })
      const matrix = qr.modules
      const matrixSize = matrix.size
      
      // Calculate dimensions - EXACTLY like QRRenderer
      const cellSize = 10 // Fixed like QRRenderer
      const quietZone = qrSettings.marginSize > 0 ? 4 : 0 // Fixed like QRRenderer
      const qrSize = (matrixSize + quietZone * 2) * cellSize
      
      // Frame adjustments - EXACTLY like QRRenderer
      let viewBoxSize = qrSize
      let offsetX = quietZone * cellSize
      let offsetY = quietZone * cellSize
      
      if (qrSettings.frame === 'border') {
        viewBoxSize += 100
        offsetX += 50
        offsetY += 50
      } else if (qrSettings.frame === 'badge') {
        viewBoxSize += 140
        offsetX += 70
        offsetY += 20
      } else if (qrSettings.frame === 'phone') {
        viewBoxSize += 100
        offsetX += 50
        offsetY += 80
      }
      
      // Scale to target size
      const scale = size / viewBoxSize
      const canvasSize = size
      
      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = canvasSize
      canvas.height = canvasSize
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      // Scale context to match QRRenderer dimensions
      ctx.scale(scale, scale)
      
      // Fill background
      ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
      ctx.fillRect(0, 0, viewBoxSize, viewBoxSize)
      
      // Helper function to draw rounded rectangle
      const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
        ctx.beginPath()
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + width - radius, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
        ctx.lineTo(x + width, y + height - radius)
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
        ctx.lineTo(x + radius, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.closePath()
      }
      
      // Draw background image if enabled - EXACTLY like QRRenderer
      if (qrSettings.bgImage) {
        try {
          const bgImg = new Image()
          bgImg.crossOrigin = 'anonymous'
          await new Promise((resolve, reject) => {
            bgImg.onload = resolve
            bgImg.onerror = reject
            bgImg.src = qrSettings.bgImage!
          })
          ctx.globalAlpha = qrSettings.bgOpacity || 0.2
          ctx.drawImage(bgImg, 0, 0, viewBoxSize, viewBoxSize)
          ctx.globalAlpha = 1
        } catch (bgError) {
          console.warn('Could not load background image:', bgError)
        }
      }
      
      // Draw frame - EXACTLY like QRRenderer
      if (qrSettings.frame === 'border') {
        ctx.strokeStyle = qrSettings.frameColor || qrSettings.foregroundColor || '#000000'
        ctx.lineWidth = 10
        drawRoundedRect(5, 5, viewBoxSize - 10, viewBoxSize - 10, 20)
        ctx.stroke()
      } else if (qrSettings.frame === 'badge') {
        // Badge frame - EXACTLY like QRRenderer
        ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
        drawRoundedRect(0, 0, viewBoxSize, viewBoxSize, 30)
        ctx.fill()
        ctx.fillStyle = qrSettings.frameColor || qrSettings.foregroundColor || '#000000'
        ctx.beginPath()
        ctx.moveTo(0, viewBoxSize - 100)
        ctx.lineTo(viewBoxSize, viewBoxSize - 100)
        ctx.lineTo(viewBoxSize, viewBoxSize - 70)
        ctx.quadraticCurveTo(viewBoxSize - 30, viewBoxSize - 70, viewBoxSize - 30, viewBoxSize - 40)
        ctx.lineTo(30, viewBoxSize - 40)
        ctx.quadraticCurveTo(30, viewBoxSize - 70, 0, viewBoxSize - 70)
        ctx.closePath()
        ctx.fill()
        if (qrSettings.frameText) {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 40px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(qrSettings.frameText, viewBoxSize / 2, viewBoxSize - 40)
        }
      } else if (qrSettings.frame === 'phone') {
        // Phone frame - EXACTLY like QRRenderer
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 15
        drawRoundedRect(10, 10, viewBoxSize - 20, viewBoxSize - 20, 40)
        ctx.stroke()
        ctx.fillStyle = '#334155'
        ctx.beginPath()
        ctx.moveTo(viewBoxSize / 2 - 60, 10)
        ctx.lineTo(viewBoxSize / 2 + 60, 10)
        ctx.lineTo(viewBoxSize / 2 + 60, 40)
        ctx.quadraticCurveTo(viewBoxSize / 2 + 50, 40, viewBoxSize / 2 + 50, 50)
        ctx.lineTo(viewBoxSize / 2 - 50, 50)
        ctx.quadraticCurveTo(viewBoxSize / 2 - 50, 40, viewBoxSize / 2 - 60, 40)
        ctx.closePath()
        ctx.fill()
      }
      
      // Helper to check if module is part of finder pattern
      const isFinderPattern = (r: number, c: number) => {
        return (r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7)
      }
      
      // Calculate logo area - EXACTLY like QRRenderer
      let logoArea: { startX: number; startY: number; endX: number; endY: number } | null = null
      if (qrSettings.logoEnabled && qrSettings.logoUrl) {
        const actualQrSize = matrixSize * cellSize
        const logoPxSize = (actualQrSize * qrSettings.logoSize) / 100
        const logoPadding = qrSettings.logoPadding || 12 // Increased default padding for better scanning
        const logoWithPadding = logoPxSize + (logoPadding * 2)
        const qrCenterX = offsetX + actualQrSize / 2
        const qrCenterY = offsetY + actualQrSize / 2
        logoArea = {
          startX: qrCenterX - logoWithPadding / 2,
          startY: qrCenterY - logoWithPadding / 2,
          endX: qrCenterX + logoWithPadding / 2,
          endY: qrCenterY + logoWithPadding / 2
        }
      }
      
      // Prepare colors
      const mainColor = qrSettings.foregroundColor || '#000000'
      const eyeColorTL = qrSettings.eyeColorTL || qrSettings.eyeColor || mainColor
      const eyeColorTR = qrSettings.eyeColorTR || qrSettings.eyeColor || mainColor
      const eyeColorBL = qrSettings.eyeColorBL || qrSettings.eyeColor || mainColor
      
      // Create gradient if enabled
      let fillStyle: string | CanvasGradient = mainColor
      if (qrSettings.useGradient) {
        let gradient: CanvasGradient
        if (qrSettings.gradientType === 'radial') {
          gradient = ctx.createRadialGradient(viewBoxSize / 2, viewBoxSize / 2, 0, viewBoxSize / 2, viewBoxSize / 2, viewBoxSize / 2)
        } else {
          // Linear gradient with direction
          const direction = parseInt(qrSettings.gradientDirection || '45')
          const rad = (direction * Math.PI) / 180
          const x1 = viewBoxSize / 2 - (viewBoxSize / 2) * Math.cos(rad)
          const y1 = viewBoxSize / 2 - (viewBoxSize / 2) * Math.sin(rad)
          const x2 = viewBoxSize / 2 + (viewBoxSize / 2) * Math.cos(rad)
          const y2 = viewBoxSize / 2 + (viewBoxSize / 2) * Math.sin(rad)
          gradient = ctx.createLinearGradient(x1, y1, x2, y2)
        }
        gradient.addColorStop(0, qrSettings.gradientStart || mainColor)
        gradient.addColorStop(1, qrSettings.gradientEnd || mainColor)
        fillStyle = gradient
      }
      
      // Draw data modules first (background) - EXACTLY like QRRenderer
      ctx.fillStyle = fillStyle
      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (matrix.get(r, c) && !isFinderPattern(r, c)) {
            const x = offsetX + c * cellSize
            const y = offsetY + r * cellSize
            
            // Skip if in logo area - EXACTLY like QRRenderer
            if (logoArea) {
              const moduleEndX = x + cellSize
              const moduleEndY = y + cellSize
              if (
                x < logoArea.endX &&
                moduleEndX > logoArea.startX &&
                y < logoArea.endY &&
                moduleEndY > logoArea.startY
              ) {
                continue
              }
            }
            
            // Draw module based on dot style - EXACTLY like QRRenderer
            if (qrSettings.dotStyle === 'dots') {
              ctx.beginPath()
              ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.35, 0, 2 * Math.PI)
              ctx.fill()
            } else if (qrSettings.dotStyle === 'rounded') {
              const radius = cellSize / 4
              ctx.beginPath()
              ctx.moveTo(x + radius, y)
              ctx.lineTo(x + cellSize - radius, y)
              ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + radius)
              ctx.lineTo(x + cellSize, y + cellSize - radius)
              ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - radius, y + cellSize)
              ctx.lineTo(x + radius, y + cellSize)
              ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - radius)
              ctx.lineTo(x, y + radius)
              ctx.quadraticCurveTo(x, y, x + radius, y)
              ctx.closePath()
              ctx.fill()
            } else if (qrSettings.dotStyle === 'extra-rounded') {
              ctx.beginPath()
              ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2, 0, 2 * Math.PI)
              ctx.fill()
            } else if (qrSettings.dotStyle === 'diamond' || qrSettings.dotStyle === 'classy') {
              ctx.beginPath()
              ctx.moveTo(x + cellSize / 2, y)
              ctx.lineTo(x + cellSize, y + cellSize / 2)
              ctx.lineTo(x + cellSize / 2, y + cellSize)
              ctx.lineTo(x, y + cellSize / 2)
              ctx.closePath()
              ctx.fill()
            } else if (qrSettings.dotStyle === 'star') {
              const cx = x + cellSize / 2
              const cy = y + cellSize / 2
              const rOut = cellSize / 2
              const rIn = cellSize / 5
              ctx.beginPath()
              for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
                const xOut = cx + rOut * Math.cos(angle)
                const yOut = cy + rOut * Math.sin(angle)
                if (i === 0) ctx.moveTo(xOut, yOut)
                else ctx.lineTo(xOut, yOut)
                const angleIn = ((i + 0.5) * 4 * Math.PI) / 5 - Math.PI / 2
                const xIn = cx + rIn * Math.cos(angleIn)
                const yIn = cy + rIn * Math.sin(angleIn)
                ctx.lineTo(xIn, yIn)
              }
              ctx.closePath()
              ctx.fill()
            } else if (qrSettings.dotStyle === 'cross') {
              const th = cellSize / 3
              ctx.beginPath()
              ctx.moveTo(x + cellSize / 2 - th / 2, y)
              ctx.lineTo(x + cellSize / 2 + th / 2, y)
              ctx.lineTo(x + cellSize / 2 + th / 2, y + cellSize / 2 - th / 2)
              ctx.lineTo(x + cellSize, y + cellSize / 2 - th / 2)
              ctx.lineTo(x + cellSize, y + cellSize / 2 + th / 2)
              ctx.lineTo(x + cellSize / 2 + th / 2, y + cellSize / 2 + th / 2)
              ctx.lineTo(x + cellSize / 2 + th / 2, y + cellSize)
              ctx.lineTo(x + cellSize / 2 - th / 2, y + cellSize)
              ctx.lineTo(x + cellSize / 2 - th / 2, y + cellSize / 2 + th / 2)
              ctx.lineTo(x, y + cellSize / 2 + th / 2)
              ctx.lineTo(x, y + cellSize / 2 - th / 2)
              ctx.lineTo(x + cellSize / 2 - th / 2, y + cellSize / 2 - th / 2)
              ctx.closePath()
              ctx.fill()
            } else if (qrSettings.dotStyle === 'heart') {
              const cx = x + cellSize / 2
              const cy = y + cellSize / 2
              const size = cellSize / 2
              ctx.beginPath()
              ctx.moveTo(cx, cy + size * 0.3)
              ctx.bezierCurveTo(cx, cy, cx - size * 0.5, cy - size * 0.5, cx - size * 0.5, cy)
              ctx.bezierCurveTo(cx - size * 0.5, cy + size * 0.2, cx, cy + size * 0.5, cx, cy + size * 0.7)
              ctx.bezierCurveTo(cx, cy + size * 0.5, cx + size * 0.5, cy + size * 0.2, cx + size * 0.5, cy)
              ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.5, cx, cy, cx, cy + size * 0.3)
              ctx.closePath()
              ctx.fill()
            } else {
              // Square (default)
              ctx.fillRect(x, y, cellSize, cellSize)
            }
          }
        }
      }
      
      // Draw Finder Patterns (Eyes) on top to avoid overlap - EXACTLY like QRRenderer
      const corners = [
        { r: 0, c: 0, color: eyeColorTL },
        { r: 0, c: matrixSize - 7, color: eyeColorTR },
        { r: matrixSize - 7, c: 0, color: eyeColorBL }
      ]
      
      corners.forEach(corner => {
        const eyeX = offsetX + corner.c * cellSize
        const eyeY = offsetY + corner.r * cellSize
        const eyeSize = 7 * cellSize
        
        // Draw white background first to clear any overlapping data modules
        ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
        ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize)
        
        // Outer frame (7x7) - EXACTLY like QRRenderer
        ctx.fillStyle = corner.color
        if (qrSettings.eyeFrame === 'circle') {
          ctx.beginPath()
          ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, eyeSize / 2, 0, 2 * Math.PI)
          ctx.fill()
          ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
          ctx.beginPath()
          ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, eyeSize / 2 - cellSize, 0, 2 * Math.PI)
          ctx.fill()
        } else if (qrSettings.eyeFrame === 'leaf') {
          const r = 3 * cellSize
          ctx.beginPath()
          ctx.moveTo(eyeX + r, eyeY)
          ctx.lineTo(eyeX + eyeSize, eyeY)
          ctx.lineTo(eyeX + eyeSize, eyeY + eyeSize)
          ctx.lineTo(eyeX, eyeY + eyeSize)
          ctx.quadraticCurveTo(eyeX, eyeY + eyeSize - r, eyeX + r, eyeY)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
          ctx.fillRect(eyeX + cellSize, eyeY + cellSize, eyeSize - (cellSize * 2), eyeSize - (cellSize * 2))
        } else if (qrSettings.eyeFrame === 'rounded') {
          const radius = cellSize * 2
          ctx.beginPath()
          ctx.moveTo(eyeX + radius, eyeY)
          ctx.lineTo(eyeX + eyeSize - radius, eyeY)
          ctx.quadraticCurveTo(eyeX + eyeSize, eyeY, eyeX + eyeSize, eyeY + radius)
          ctx.lineTo(eyeX + eyeSize, eyeY + eyeSize - radius)
          ctx.quadraticCurveTo(eyeX + eyeSize, eyeY + eyeSize, eyeX + eyeSize - radius, eyeY + eyeSize)
          ctx.lineTo(eyeX + radius, eyeY + eyeSize)
          ctx.quadraticCurveTo(eyeX, eyeY + eyeSize, eyeX, eyeY + eyeSize - radius)
          ctx.lineTo(eyeX, eyeY + radius)
          ctx.quadraticCurveTo(eyeX, eyeY, eyeX + radius, eyeY)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
          const innerX = eyeX + cellSize
          const innerY = eyeY + cellSize
          const innerSize = eyeSize - (cellSize * 2)
          ctx.beginPath()
          ctx.moveTo(innerX + radius, innerY)
          ctx.lineTo(innerX + innerSize - radius, innerY)
          ctx.quadraticCurveTo(innerX + innerSize, innerY, innerX + innerSize, innerY + radius)
          ctx.lineTo(innerX + innerSize, innerY + innerSize - radius)
          ctx.quadraticCurveTo(innerX + innerSize, innerY + innerSize, innerX + innerSize - radius, innerY + innerSize)
          ctx.lineTo(innerX + radius, innerY + innerSize)
          ctx.quadraticCurveTo(innerX, innerY + innerSize, innerX, innerY + innerSize - radius)
          ctx.lineTo(innerX, innerY + radius)
          ctx.quadraticCurveTo(innerX, innerY, innerX + radius, innerY)
          ctx.closePath()
          ctx.fill()
        } else {
          // Square
          ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize)
          ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
          ctx.fillRect(eyeX + cellSize, eyeY + cellSize, eyeSize - (cellSize * 2), eyeSize - (cellSize * 2))
        }
        
        // Inner center (3x3) - EXACTLY like QRRenderer
        const centerX = eyeX + 2 * cellSize
        const centerY = eyeY + 2 * cellSize
        const centerSize = 3 * cellSize
        ctx.fillStyle = corner.color
        if (qrSettings.eyeStyle === 'circle') {
          ctx.beginPath()
          ctx.arc(centerX + centerSize / 2, centerY + centerSize / 2, centerSize / 2, 0, 2 * Math.PI)
          ctx.fill()
        } else {
          ctx.fillRect(centerX, centerY, centerSize, centerSize)
        }
      })
      
      // Draw logo if enabled - EXACTLY like QRRenderer with aspect ratio preservation
      if (logoArea && qrSettings.logoEnabled && qrSettings.logoUrl) {
        try {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve
            logoImg.onerror = reject
            logoImg.src = qrSettings.logoUrl
          })
          
          // White background for logo - EXACTLY like QRRenderer
          const logoX = logoArea.startX
          const logoY = logoArea.startY
          const logoWithPadding = logoArea.endX - logoArea.startX
          ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
          drawRoundedRect(logoX, logoY, logoWithPadding, logoWithPadding, 4)
          ctx.fill()
          
          // Draw logo with aspect ratio preservation - EXACTLY like QRRenderer (preserveAspectRatio="xMidYMid meet")
          const actualQrSize = matrixSize * cellSize
          const logoPxSize = (actualQrSize * qrSettings.logoSize) / 100
          const logoPadding = qrSettings.logoPadding || 12 // Increased default padding for better scanning
          const availableWidth = logoPxSize
          const availableHeight = logoPxSize
          
          // Calculate aspect ratio and maintain it (like SVG preserveAspectRatio="xMidYMid meet")
          const logoAspectRatio = logoImg.width / logoImg.height
          const availableAspectRatio = availableWidth / availableHeight
          
          let drawWidth = availableWidth
          let drawHeight = availableHeight
          let drawX = logoX + logoPadding
          let drawY = logoY + logoPadding
          
          if (logoAspectRatio > availableAspectRatio) {
            // Logo is wider - fit to width, center vertically
            drawHeight = availableWidth / logoAspectRatio
            drawY = logoY + logoPadding + (availableHeight - drawHeight) / 2
          } else {
            // Logo is taller - fit to height, center horizontally
            drawWidth = availableHeight * logoAspectRatio
            drawX = logoX + logoPadding + (availableWidth - drawWidth) / 2
          }
          
          ctx.globalAlpha = qrSettings.logoOpacity || 1
          ctx.drawImage(logoImg, drawX, drawY, drawWidth, drawHeight)
          ctx.globalAlpha = 1
        } catch (logoError) {
          console.warn('Could not load logo:', logoError)
        }
      }
      
      // Reset scale before converting to data URL
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      
      return canvas.toDataURL('image/png', 0.95)
      } catch (err: any) {
        console.error('Error rendering QR code to image:', err)
      // Fallback: simple QR code
      try {
        const QRCode = await import('qrcode')
        return await QRCode.toDataURL(qrCode, {
          width: size,
          margin: qrSettings.marginSize || 1,
          color: {
            dark: qrSettings.foregroundColor || '#000000',
            light: qrSettings.backgroundColor || '#FFFFFF'
          }
        })
      } catch (fallbackError) {
        // Ultimate fallback
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = qrSettings.backgroundColor || '#FFFFFF'
          ctx.fillRect(0, 0, size, size)
        }
        return canvas.toDataURL('image/png')
      }
    }
  }

  // Fast Arabic text rendering using Canvas API directly
  const renderArabicTextAsImage = async (text: string, fontSize: number = 12, isBold: boolean = false): Promise<string | null> => {
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    if (!hasArabic) return null

    try {
      // Create canvas with high DPI for crisp text
      const scale = 4 // High scale for quality
      const padding = 20
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      // Set canvas size with scale
      const baseFontSize = fontSize * 2.5
      canvas.width = 800 * scale + padding * 2
      canvas.height = 100 * scale + padding * 2
      canvas.style.width = `${800 + padding * 2}px`
      canvas.style.height = `${100 + padding * 2}px`
      
      // Scale context
      ctx.scale(scale, scale)
      
      // Configure text rendering
      ctx.fillStyle = '#000000'
      ctx.font = `${isBold ? '700' : '400'} ${baseFontSize}px "Cairo", "Arial", "Tahoma", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.direction = 'rtl'
      
      // Enable text rendering optimizations
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Fill background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale)
      
      // Draw text
      ctx.fillStyle = '#000000'
      const x = (canvas.width / scale) / 2
      const y = (canvas.height / scale) / 2
      ctx.fillText(text, x, y)
      
      return canvas.toDataURL('image/png', 1.0)
    } catch (err) {
      console.error('Error rendering Arabic text:', err)
      return null
    }
  }

  // Export QR Codes to PDF using pdfmake (with Arabic text as images)
  const exportQRCodesToPDF = async () => {
    const selected = getSelectedEmployees()
    if (selected.length === 0) {
      setError('Please select at least one employee')
      return
    }

    setIsExporting(true)
    setError('')
    setSuccess('')

    try {
      // Dynamically import pdfmake
      // @ts-ignore - pdfmake types may not be available
      const pdfMake = await import('pdfmake/build/pdfmake')
      // @ts-ignore - pdfmake types may not be available
      const pdfFonts = await import('pdfmake/build/vfs_fonts')
      
      // Set up pdfmake fonts
      // @ts-ignore
      if (pdfMake.default && pdfFonts.default) {
        // @ts-ignore
        pdfMake.default.vfs = pdfFonts.default.pdfMake?.vfs || pdfFonts.default
      }
      
      // Define document content
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
        },
        content: []
      }

      // Process each employee
      for (let i = 0; i < selected.length; i++) {
        const employee = selected[i]
        
        // Add new page for each employee (except first)
        if (i > 0) {
          docDefinition.content.push({ text: '', pageBreak: 'before' })
        }

        // Ensure QR code exists
        const qrCode = await ensureQRCode(employee)
        
        // Generate QR code with custom settings
        const qrDataUrl = await renderQRCodeToImage(qrCode, 400)

        // Employee page content
        const employeeContent: any[] = [
          // Title
          {
            text: 'Employee QR Code',
            fontSize: 18,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          // QR Code Image
          {
            image: qrDataUrl,
            width: 150,
            height: 150,
            alignment: 'center',
            margin: [0, 0, 0, 20]
          }
        ]

        // Employee Name - render as image if Arabic
        const nameImage = await renderArabicTextAsImage(employee.name, 16, true)
        if (nameImage) {
          employeeContent.push({
            image: nameImage,
            width: 180,
            height: 35,
            alignment: 'center',
            margin: [0, 0, 0, 15]
          })
        } else {
          employeeContent.push({
            text: employee.name,
            fontSize: 14,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 10]
          })
        }

        // Employee Code
        const codeText = `Code: ${employee.employee_code}`
        const codeImage = await renderArabicTextAsImage(codeText, 14, false)
        if (codeImage) {
          employeeContent.push({
            image: codeImage,
            width: 160,
            height: 28,
            alignment: 'center',
            margin: [0, 0, 0, 12]
          })
        } else {
          employeeContent.push({
            text: codeText,
            fontSize: 12,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          })
        }

        // Department
        if (employee.department) {
          const deptText = `Department: ${employee.department}`
          const deptImage = await renderArabicTextAsImage(deptText, 14, false)
          if (deptImage) {
            employeeContent.push({
              image: deptImage,
              width: 180,
              height: 28,
              alignment: 'center',
              margin: [0, 0, 0, 12]
            })
          } else {
            employeeContent.push({
              text: deptText,
              fontSize: 12,
              alignment: 'center',
              margin: [0, 0, 0, 8]
            })
          }
        }

        // Job Title
        if (employee.job_title) {
          const jobText = `Job Title: ${employee.job_title}`
          const jobImage = await renderArabicTextAsImage(jobText, 14, false)
          if (jobImage) {
            employeeContent.push({
              image: jobImage,
              width: 180,
              height: 28,
              alignment: 'center',
              margin: [0, 0, 0, 12]
            })
          } else {
            employeeContent.push({
              text: jobText,
              fontSize: 12,
              alignment: 'center',
              margin: [0, 0, 0, 8]
            })
          }
        }

        // QR Code Value at bottom
        const qrCodePreview = qrCode.length > 50 ? qrCode.substring(0, 50) + '...' : qrCode
        employeeContent.push({
          text: `QR Code: ${qrCodePreview}`,
          fontSize: 8,
          italics: true,
          alignment: 'center',
          margin: [0, 40, 0, 0]
        })

        docDefinition.content.push(...employeeContent)
      }

      // Create and download PDF
      // @ts-ignore
      const pdfDocGenerator = pdfMake.default.createPdf(docDefinition)
      const fileName = `Employee_QR_Codes_${new Date().toISOString().split('T')[0]}.pdf`
      pdfDocGenerator.download(fileName)
      
      setSuccess(`Successfully exported ${selected.length} QR code(s) to PDF`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to export PDF: ' + err.message)
      console.error('Error exporting PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Export QR Codes to Excel with Images
  const exportQRCodesToExcel = async (includeImages: boolean = true) => {
    const selected = getSelectedEmployees()
    if (selected.length === 0) {
      setError('Please select at least one employee')
      return
    }

    setIsExporting(true)
    setExportProgress({ current: 0, total: selected.length })
    setError('')
    setSuccess('')

    try {
      // Dynamically import ExcelJS with proper error handling
      // Use dynamic import with explicit path to avoid chunk loading issues
      let ExcelJS: any
      try {
        const exceljsModule = await import('exceljs')
        // ExcelJS can be exported as default or as named export
        ExcelJS = exceljsModule.default || exceljsModule
        // If still not found, try accessing Workbook directly
        if (!ExcelJS || (!ExcelJS.Workbook && !exceljsModule.Workbook)) {
          // Last resort: try to get it from the module
          ExcelJS = exceljsModule
        }
      } catch (importError: any) {
        console.error('Failed to import ExcelJS:', importError)
        setError(`Failed to load Excel library: ${importError.message}. Please refresh the page and try again.`)
        setIsExporting(false)
        return
      }
      
      // Verify ExcelJS is loaded correctly
      const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook
      if (!Workbook) {
        console.error('ExcelJS structure:', ExcelJS)
        setError('ExcelJS library structure is invalid. Please refresh the page and try again.')
        setIsExporting(false)
        return
      }
      
      // Create workbook using the correct constructor
      const workbook = new Workbook()
      const worksheet = workbook.addWorksheet('Employee QR Codes')

      // Set column headers
      worksheet.columns = [
        { header: 'Employee Code', key: 'employee_code', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Job Title', key: 'job_title', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'QR Code Value', key: 'qr_code', width: 50 },
        { header: 'QR Code Image', key: 'qr_image', width: 20 }
      ]

      // Style header row
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }

      // Helper function to convert base64 to Uint8Array (optimized)
      const base64ToUint8Array = (base64: string): Uint8Array => {
        const base64Data = base64.replace(/^data:image\/png;base64,/, '')
        const binaryString = atob(base64Data)
        return Uint8Array.from(binaryString, char => char.charCodeAt(0))
      }

      // Process employees in parallel batches for maximum speed
      const BATCH_SIZE = includeImages ? 15 : 100 // Optimized batch size for balance between speed and responsiveness
      
      // Helper to yield control to browser
      const yieldToBrowser = () => new Promise(resolve => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => resolve(void 0), { timeout: 5 })
        } else {
          setTimeout(resolve, 5)
        }
      })
      
      // Process employees in batches
      for (let batchStart = 0; batchStart < selected.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, selected.length)
        const batch = selected.slice(batchStart, batchEnd)
        
        // Process all employees in this batch in parallel (with yield between items for responsiveness)
        const batchResults = await Promise.all(
          batch.map(async (employee, batchIndex) => {
            // Yield to browser less frequently for faster processing
            if (batchIndex > 0 && batchIndex % 5 === 0) {
              await yieldToBrowser()
            }
            const globalIndex = batchStart + batchIndex
            const rowNumber = globalIndex + 2 // Start from row 2 (after header)
            
            try {
        // Ensure QR code exists
        const qrCode = await ensureQRCode(employee)
        
              // Generate QR code image in parallel if needed
              let qrDataUrl: string | null = null
              if (includeImages) {
                qrDataUrl = await renderQRCodeToImage(qrCode, 400) // High quality size for Excel
              }
              
              // Update progress immediately after processing each employee
              setExportProgress({ current: globalIndex + 1, total: selected.length })
              
              return {
                employee,
                qrCode,
                qrDataUrl,
                rowNumber,
                success: true
              }
            } catch (error) {
              console.error(`Error processing employee ${employee.employee_code}:`, error)
              // Update progress even on error
              setExportProgress({ current: globalIndex + 1, total: selected.length })
              return {
                employee,
                qrCode: '',
                qrDataUrl: null,
                rowNumber,
                success: false
              }
            }
          })
        )
        
        // Add all rows from this batch to the worksheet
        for (const result of batchResults) {
          if (!result.success) continue
          
          const { employee, qrCode, qrDataUrl, rowNumber } = result

        // Add row data
        const row = worksheet.addRow({
          employee_code: employee.employee_code,
          name: employee.name,
          department: employee.department || '',
          job_title: employee.job_title || '',
          email: employee.email || '',
          phone: employee.phone_number || '',
          status: employee.status,
          qr_code: qrCode
        })

          // Add images if available
          if (includeImages && qrDataUrl) {
            // Convert base64 to Uint8Array (optimized)
            const bytes = base64ToUint8Array(qrDataUrl)

        // Set row height for QR code image (same size as PDF export: 150x150)
        row.height = 150

        // Add QR code image to the last column
        const imageId = workbook.addImage({
              buffer: bytes as any,
          extension: 'png'
        })

        // Get the column index for QR Code Image (column I = 9)
        const qrImageCol = worksheet.getColumn('qr_image')
        const qrImageColIndex = qrImageCol.number

        // Add image to worksheet (same size as PDF export: 150x150)
        worksheet.addImage(imageId, {
          tl: { col: qrImageColIndex - 1, row: rowNumber - 1 },
          ext: { width: 150, height: 150 }
        })
          } else {
            // Set smaller row height when no images
            row.height = 30
          }

        // Center align all cells
        row.eachCell((cell: any) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })

        // Left align text columns (not QR code column)
        row.getCell('employee_code').alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('department').alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('job_title').alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('email').alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('phone').alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' }
        row.getCell('qr_code').alignment = { vertical: 'middle', horizontal: 'left' }
        }
        
        // Yield to browser between batches to keep UI responsive
        if (batchEnd < selected.length) {
          await yieldToBrowser()
        }
      }

      // Save Excel file
      const fileName = `Employee_QR_Codes_${new Date().toISOString().split('T')[0]}.xlsx`
      const buffer = await workbook.xlsx.writeBuffer()
      
      // Create blob and download
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setSuccess(`Successfully exported ${selected.length} employee(s) to Excel${includeImages ? ' with QR code images' : ''}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to export Excel: ' + err.message)
      console.error('Error exporting Excel:', err)
    } finally {
      setIsExporting(false)
      setExportProgress({ current: 0, total: 0 })
    }
  }

  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)))

  if (loading && employees.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-green-500" />
            Employees Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage employee records for attendance tracking
          </p>
        </div>
        <Button onClick={() => {
          setShowAddForm(true)
          setEditingEmployee(null)
          setFormData({
            employee_code: '',
            name: '',
            job_title: '',
            department: '',
            phone_number: '',
            email: '',
            status: 'Active'
          })
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Export Progress Indicator - High Precision & Real-time */}
      {isExporting && exportProgress.total > 0 && (
        <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Exporting... {exportProgress.current} / {exportProgress.total} employees
              </span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {((exportProgress.current / exportProgress.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-3 rounded-full transition-all duration-150 ease-linear shadow-sm"
                style={{ width: `${Math.min(100, (exportProgress.current / exportProgress.total) * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 text-center">
              {exportProgress.current === exportProgress.total 
                ? 'Finalizing export...' 
                : `Processing employee ${exportProgress.current}...`}
            </div>
          </div>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(emp => emp.status === 'Active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {employees.filter(emp => emp.status === 'Inactive').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{departments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingEmployee(null)
                  setFormData({
                    employee_code: '',
                    name: '',
                    job_title: '',
                    department: '',
                    phone_number: '',
                    email: '',
                    status: 'Active'
                  })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Code *</label>
                  <Input
                    value={formData.employee_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                    required
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Software Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="IT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingEmployee(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters & Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter</CardTitle>
            {selectedEmployees.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedEmployees.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportQRCodesToPDF}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
                <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                    onClick={() => exportQRCodesToExcel(true)}
                  disabled={isExporting}
                  className="gap-2"
                    title="Export with QR code images (slower)"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                    Export Excel (with images)
                </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportQRCodesToExcel(false)}
                    disabled={isExporting}
                    className="gap-2"
                    title="Export without QR code images (faster)"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel (fast)
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, code, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Employees List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-2"
              >
                {selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0 ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleEmployeeSelection(employee.id)}
                      className="flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title={selectedEmployees.has(employee.id) ? 'Deselect' : 'Select'}
                    >
                      {selectedEmployees.has(employee.id) ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      employee.status === 'Active' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Users className={`h-6 w-6 ${
                        employee.status === 'Active' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.employee_code}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {employee.job_title && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {employee.job_title}
                          </span>
                        )}
                        {employee.department && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {employee.department}
                          </span>
                        )}
                        {employee.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {employee.phone_number}
                          </span>
                        )}
                        {employee.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {employee.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      employee.status === 'Active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {employee.status}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Ensure QR code exists before showing
                        const qrCode = await ensureQRCode(employee)
                        setViewingQRCode({ ...employee, qr_code: qrCode })
                      }}
                      title="View QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No employees found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {viewingQRCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Employee QR Code</h3>
                  <p className="text-xs text-indigo-100">Scan to verify employee identity</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingQRCode(null)}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <QRCodeDisplay
                qrCode={viewingQRCode.qr_code || ''}
                employeeName={viewingQRCode.name}
                employeeCode={viewingQRCode.employee_code}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


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
  FileText, FileSpreadsheet, CheckSquare, Square, RefreshCw, Briefcase
} from 'lucide-react'
import { supabase, TABLES, AttendanceEmployee, HRManpower } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
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
  const [isImportingFromHR, setIsImportingFromHR] = useState(false)
  const { settings: qrSettings } = useQRSettings()
  const supabaseClient = getSupabaseClient()
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
    // Create JSON object with essential employee data only
    const qrData = {
      // Employee identification
      id: employee.id,
      employee_code: employee.employee_code,
      name: employee.name,
      
      // Employee details
      job_title: employee.job_title || null,
      department: employee.department || null,
      phone_number: employee.phone_number || null,
      email: employee.email || null
    }
    
    // Convert to JSON string
    return JSON.stringify(qrData)
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

  const handleImportFromHRManpower = async () => {
    if (!confirm('This will import all employees from HR Manpower. Existing employees with the same employee_code will be updated. Continue?')) {
      return
    }

    setIsImportingFromHR(true)
    setError('')
    setSuccess('')

    try {
      // Fetch all employees from HR Manpower
      const { data: hrEmployees, error: hrError } = await (supabaseClient
        .from(TABLES.HR_MANPOWER) as any)
        .select('*')
        .eq('status', 'Active') // Only import active employees

      if (hrError) throw hrError

      if (!hrEmployees || hrEmployees.length === 0) {
        setError('No active employees found in HR Manpower')
        setIsImportingFromHR(false)
        return
      }

      // Convert HR Manpower data to Attendance Employee format
      const employeesToImport: Partial<AttendanceEmployee>[] = hrEmployees.map((hrEmp: HRManpower) => ({
        employee_code: hrEmp.employee_code,
        name: hrEmp.employee_name,
        job_title: hrEmp.designation,
        department: hrEmp.department || null,
        phone_number: hrEmp.phone_number || null,
        email: hrEmp.email || null,
        status: hrEmp.status === 'On Leave' ? 'Inactive' : (hrEmp.status as 'Active' | 'Inactive')
      }))

      // Use upsert to insert or update employees based on employee_code
      const { data: importedData, error: importError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        // @ts-ignore
        .upsert(employeesToImport, {
          onConflict: 'employee_code',
          ignoreDuplicates: false
        })
        .select()

      if (importError) throw importError

      setSuccess(`Successfully imported ${importedData?.length || 0} employee(s) from HR Manpower`)
      await fetchEmployees()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError('Failed to import from HR Manpower: ' + err.message)
      console.error('Error importing from HR Manpower:', err)
    } finally {
      setIsImportingFromHR(false)
    }
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

  const handleBulkDelete = async () => {
    const selected = getSelectedEmployees()
    if (selected.length === 0) {
      setError('Please select at least one employee to delete')
      return
    }

    const confirmMessage = `Are you sure you want to delete ${selected.length} employee(s)? This action cannot be undone.`
    if (!confirm(confirmMessage)) return

    try {
      setError('')
      setSuccess('')
      
      // Delete all selected employees
      const idsToDelete = selected.map(emp => emp.id)
      const { error: deleteError } = await supabase
        .from(TABLES.ATTENDANCE_EMPLOYEES)
        .delete()
        .in('id', idsToDelete)

      if (deleteError) throw deleteError
      
      setSuccess(`Successfully deleted ${selected.length} employee(s)`)
      setSelectedEmployees(new Set()) // Clear selection
      await fetchEmployees()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete employees: ' + err.message)
      console.error('Error deleting employees:', err)
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

  // Helper function to render QR code with settings to PNG
  const renderQRCodeToImage = async (qrCode: string, size: number = 400): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const html2canvas = (await import('html2canvas')).default
        const React = await import('react')
        const { createRoot } = await import('react-dom/client')
        
        // Create a temporary container
        const tempDiv = document.createElement('div')
        tempDiv.id = `qr-export-${Date.now()}`
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '0'
        tempDiv.style.width = `${size}px`
        tempDiv.style.height = `${size}px`
        tempDiv.style.backgroundColor = qrSettings.backgroundColor || '#FFFFFF'
        tempDiv.style.padding = `${(qrSettings.marginSize || 0) * 4}px`
        tempDiv.style.display = 'flex'
        tempDiv.style.alignItems = 'center'
        tempDiv.style.justifyContent = 'center'
        document.body.appendChild(tempDiv)

        // Render QRRenderer into the temp div
        const qrElement = React.createElement(QRRenderer, {
          qrCode,
          settings: qrSettings,
          gradientId: qrSettings.useGradient ? `qr-gradient-export-${Date.now()}` : undefined
        })

        const root = createRoot(tempDiv)
        root.render(qrElement)

        // Wait for rendering and images to load
        await new Promise(resolve => setTimeout(resolve, 800))

        // Convert to canvas
        const canvas = await html2canvas(tempDiv, {
          backgroundColor: qrSettings.backgroundColor || '#FFFFFF',
          scale: 2,
          useCORS: true,
          logging: false,
          width: size,
          height: size,
          allowTaint: true
        })

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0)
        
        // Cleanup
        root.unmount()
        document.body.removeChild(tempDiv)

        resolve(dataUrl)
      } catch (err: any) {
        console.error('Error rendering QR code to image:', err)
        reject(err)
      }
    })
  }

  // Helper function to render Arabic text as image for PDF with better quality
  const renderArabicTextAsImage = async (text: string, fontSize: number = 12, isBold: boolean = false): Promise<string | null> => {
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    if (!hasArabic) return null

    try {
      const html2canvas = (await import('html2canvas')).default
      
      // Create a more robust container for Arabic text
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'fixed' // Use fixed instead of absolute for better rendering
      tempDiv.style.left = '0'
      tempDiv.style.top = '0'
      tempDiv.style.width = '800px' // Fixed width for consistent rendering
      tempDiv.style.height = '100px'
      tempDiv.style.fontSize = `${fontSize * 2.5}px` // Larger font for better quality
      tempDiv.style.fontWeight = isBold ? '700' : '400'
      tempDiv.style.fontFamily = '"Cairo", "Arial", "Tahoma", sans-serif' // Multiple fallbacks
      tempDiv.style.color = '#000000'
      tempDiv.style.backgroundColor = '#FFFFFF'
      tempDiv.style.padding = '15px 20px'
      tempDiv.style.direction = 'rtl'
      tempDiv.style.textAlign = 'center'
      tempDiv.style.whiteSpace = 'nowrap'
      tempDiv.style.lineHeight = '1.5'
      tempDiv.style.letterSpacing = '0px' // Remove letter spacing for Arabic
      tempDiv.style.display = 'flex'
      tempDiv.style.alignItems = 'center'
      tempDiv.style.justifyContent = 'center'
      tempDiv.style.overflow = 'hidden'
      // @ts-ignore - CSS vendor prefixes
      tempDiv.style.webkitFontSmoothing = 'antialiased'
      // @ts-ignore - CSS vendor prefixes
      tempDiv.style.mozOsxFontSmoothing = 'grayscale'
      tempDiv.style.textRendering = 'optimizeLegibility'
      
      // Use innerHTML to ensure proper text rendering
      tempDiv.innerHTML = `<span style="display: inline-block; direction: rtl; unicode-bidi: bidi-override;">${text}</span>`
      
      document.body.appendChild(tempDiv)

      // Wait longer for font to load and render
      await new Promise(r => setTimeout(r, 500))
      
      // Force layout recalculation
      tempDiv.offsetHeight
      
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#FFFFFF',
        scale: 5, // Very high scale for crisp text
        useCORS: true,
        logging: false,
        width: tempDiv.offsetWidth,
        height: tempDiv.offsetHeight,
        windowWidth: tempDiv.offsetWidth,
        windowHeight: tempDiv.offsetHeight,
        allowTaint: false,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Ensure font is loaded in cloned document
          const clonedDiv = clonedDoc.querySelector('div')
          if (clonedDiv) {
            clonedDiv.style.fontFamily = '"Cairo", "Arial", "Tahoma", sans-serif'
          }
        }
      })
      
      const dataUrl = canvas.toDataURL('image/png', 1.0) // Maximum quality
      document.body.removeChild(tempDiv)
      return dataUrl
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
  const exportQRCodesToExcel = async () => {
    const selected = getSelectedEmployees()
    if (selected.length === 0) {
      setError('Please select at least one employee')
      return
    }

    setIsExporting(true)
    setError('')
    setSuccess('')

    try {
      // Dynamically import ExcelJS
      const ExcelJS = await import('exceljs')
      
      // Create workbook
      const workbook = new ExcelJS.Workbook()
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

      // Process each employee
      for (let i = 0; i < selected.length; i++) {
        const employee = selected[i]
        const rowNumber = i + 2 // Start from row 2 (after header)
        
        // Ensure QR code exists
        const qrCode = await ensureQRCode(employee)
        
        // Generate QR code with custom settings
        const qrDataUrl = await renderQRCodeToImage(qrCode, 200)

        // Convert base64 to Uint8Array (browser compatible)
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j)
        }

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

        // Set row height for QR code image
        row.height = 150

        // Add QR code image to the last column
        const imageId = workbook.addImage({
          buffer: bytes.buffer,
          extension: 'png'
        })

        // Get the column index for QR Code Image (column I = 9)
        const qrImageCol = worksheet.getColumn('qr_image')
        const qrImageColIndex = qrImageCol.number

        // Add image to worksheet
        worksheet.addImage(imageId, {
          tl: { col: qrImageColIndex - 1, row: rowNumber - 1 },
          ext: { width: 150, height: 150 }
        })

        // Center align all cells
        row.eachCell((cell) => {
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
      
      setSuccess(`Successfully exported ${selected.length} QR code(s) to Excel with images`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to export Excel: ' + err.message)
      console.error('Error exporting Excel:', err)
    } finally {
      setIsExporting(false)
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleImportFromHRManpower}
            disabled={isImportingFromHR}
            className="flex items-center gap-2"
          >
            {isImportingFromHR ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4" />
                Import from HR Manpower
              </>
            )}
          </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportQRCodesToExcel}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
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


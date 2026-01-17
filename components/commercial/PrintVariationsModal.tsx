'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, FileText, CheckSquare, Square, Printer } from 'lucide-react'
import { ContractVariation } from '@/lib/supabase'
import { getCachedCompanySettings } from '@/lib/companySettings'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { useAuth } from '@/app/providers'

interface PrintVariationsModalProps {
  isOpen: boolean
  onClose: () => void
  variations: ContractVariation[]
  filters?: {
    search?: string
    project?: Set<string>
    status?: Set<string>
    variationRefNo?: Set<string>
    createdBy?: Set<string>
    updatedBy?: Set<string>
    forceIncludeInBOQCalculation?: boolean
    dateSubmissionRange?: { min?: string; max?: string }
    dateApprovalRange?: { min?: string; max?: string }
    variationAmountRange?: { min?: number; max?: number }
  }
  getBOQItemDescription?: (boqItemId: string) => string
}

interface ColumnOption {
  key: string
  label: string
  selected: boolean
  isTotalable?: boolean // Columns that can have totals
}

// Define all available columns (same as export modal, but with combined project column)
const allColumns: ColumnOption[] = [
  { key: 'auto_generated_unique_reference_number', label: 'Reference Number', selected: false },
  { key: 'project', label: 'Project', selected: false }, // Combined column
  { key: 'project_full_code', label: 'Project Full Code', selected: false }, // Keep for internal use
  { key: 'project_name', label: 'Project Name', selected: false }, // Keep for internal use
  { key: 'variation_ref_no', label: 'Variation Ref No.', selected: true },
  { key: 'item_description', label: 'BOQ Item', selected: true },
  { key: 'quantity_changes', label: 'Quantity Changes', selected: true },
  { key: 'variation_amount', label: 'Variation Amount', selected: true, isTotalable: true },
  { key: 'date_of_submission', label: 'Date of Submission', selected: false },
  { key: 'variation_status', label: 'Status', selected: true },
  { key: 'force_include_in_boq_calculation', label: 'FORCE Include in BOQ Calculation', selected: false },
  { key: 'date_of_approval', label: 'Date of Approval', selected: false },
  { key: 'remarks', label: 'Remarks', selected: false },
  { key: 'created_at', label: 'Created At', selected: false },
  { key: 'updated_at', label: 'Updated At', selected: false },
]

// Helper function to format date as "Jan 04, 25"
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString || dateString.trim() === '') return '-'
  try {
    let date: Date
    if (dateString.includes('T')) {
      date = new Date(dateString)
    } else {
      const parts = dateString.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        date = new Date(year, month, day)
      } else {
        date = new Date(dateString)
      }
    }
    
    if (isNaN(date.getTime())) return dateString
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = String(date.getDate()).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    
    return `${month} ${day}, ${year}`
  } catch {
    return dateString
  }
}

export function PrintVariationsModal({ isOpen, onClose, variations, filters, getBOQItemDescription }: PrintVariationsModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [companySettings, setCompanySettings] = useState<{ company_name: string; company_logo_url?: string } | null>(null)
  const { appUser } = useAuth()

  // Initialize selected columns on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default selected: variation_ref_no, item_description, quantity_changes, variation_amount, variation_status
      const defaultSelected = new Set([
        'variation_ref_no',
        'item_description',
        'quantity_changes',
        'variation_amount',
        'variation_status'
      ])
      setSelectedColumns(defaultSelected)
      loadCompanySettings()
    }
  }, [isOpen])

  const loadCompanySettings = async () => {
    try {
      const settings = await getCachedCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      console.error('Error loading company settings:', error)
      setCompanySettings({ company_name: 'AlRabat RPF' })
    }
  }

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      // If selecting 'project', ensure project_full_code and project_name are not selected
      if (key === 'project') {
        newSet.delete('project_full_code')
        newSet.delete('project_name')
      }
      // If selecting project_full_code or project_name, remove 'project'
      if (key === 'project_full_code' || key === 'project_name') {
        newSet.delete('project')
      }
      return newSet
    })
  }

  const selectAll = () => {
    const allKeys = allColumns
      .filter(col => col.key !== 'project_full_code' && col.key !== 'project_name') // Exclude individual project columns
      .map(col => col.key)
    setSelectedColumns(new Set(allKeys))
  }

  const deselectAll = () => {
    setSelectedColumns(new Set())
  }

  // Get unique project codes and names from variations
  const getProjectInfo = () => {
    const projectSet = new Set<string>()
    variations.forEach(variation => {
      if (variation.project_full_code && variation.project_name) {
        projectSet.add(`${variation.project_full_code} - ${variation.project_name}`)
      }
    })
    return Array.from(projectSet).sort()
  }

  // Get filter criteria summary
  const getFilterSummary = (): string[] => {
    const summary: string[] = []
    if (filters?.search) {
      summary.push(`Search: "${filters.search}"`)
    }
    if (filters?.project && filters.project.size > 0) {
      summary.push(`Projects: ${filters.project.size} selected`)
    }
    if (filters?.status && filters.status.size > 0) {
      summary.push(`Status: ${Array.from(filters.status).join(', ')}`)
    }
    if (filters?.variationRefNo && filters.variationRefNo.size > 0) {
      summary.push(`Variation Ref No.: ${filters.variationRefNo.size} selected`)
    }
    if (filters?.createdBy && filters.createdBy.size > 0) {
      summary.push(`Created By: ${filters.createdBy.size} selected`)
    }
    if (filters?.updatedBy && filters.updatedBy.size > 0) {
      summary.push(`Updated By: ${filters.updatedBy.size} selected`)
    }
    if (filters?.forceIncludeInBOQCalculation !== undefined) {
      summary.push(`Force Include: ${filters.forceIncludeInBOQCalculation ? 'Yes' : 'No'}`)
    }
    if (filters?.dateSubmissionRange) {
      const min = filters.dateSubmissionRange.min || ''
      const max = filters.dateSubmissionRange.max || ''
      if (min || max) {
        summary.push(`Submission Date: ${min} - ${max}`)
      }
    }
    if (filters?.dateApprovalRange) {
      const min = filters.dateApprovalRange.min || ''
      const max = filters.dateApprovalRange.max || ''
      if (min || max) {
        summary.push(`Approval Date: ${min} - ${max}`)
      }
    }
    if (filters?.variationAmountRange) {
      const min = filters.variationAmountRange.min !== undefined ? formatCurrencyByCodeSync(filters.variationAmountRange.min) : ''
      const max = filters.variationAmountRange.max !== undefined ? formatCurrencyByCodeSync(filters.variationAmountRange.max) : ''
      if (min || max) {
        summary.push(`Variation Amount Range: ${min} - ${max}`)
      }
    }
    return summary
  }

  // Calculate totals for totalable columns
  const calculateTotals = () => {
    const totals: Record<string, number> = {}
    const selectedTotalableColumns = allColumns.filter(
      col => selectedColumns.has(col.key) && col.isTotalable
    )
    
    selectedTotalableColumns.forEach(col => {
      totals[col.key] = variations.reduce((sum, variation) => {
        const value = variation[col.key as keyof ContractVariation] as number
        return sum + (typeof value === 'number' ? value : 0)
      }, 0)
    })
    
    return totals
  }

  // Extract Google Drive file ID from URL
  const extractGoogleDriveFileId = (url: string): string | null => {
    if (!url) return null
    
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\n?#]+)/)
    if (fileMatch) {
      return fileMatch[1]
    }
    
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&\n?#]+)/)
    if (openMatch) {
      return openMatch[1]
    }
    
    const folderMatch = url.match(/drive\.google\.com\/drive\/(?:folders|files)\/([^\/\n?#]+)/)
    if (folderMatch) {
      return folderMatch[1]
    }
    
    return null
  }

  // Convert Google Drive URL to direct download link
  const getGoogleDriveDownloadUrl = (url: string): string => {
    const fileId = extractGoogleDriveFileId(url)
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
    }
    return url
  }

  // Load font file and convert to base64
  const loadFontFile = async (fontPath: string): Promise<string | null> => {
    try {
      let downloadUrl = fontPath
      if (fontPath.includes('drive.google.com')) {
        downloadUrl = getGoogleDriveDownloadUrl(fontPath)
      }
      
      let response = await fetch(downloadUrl)
      
      if (fontPath.includes('drive.google.com')) {
        const fileId = extractGoogleDriveFileId(fontPath)
        if (fileId) {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('text/html')) {
            const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
            response = await fetch(directUrl)
            
            const altContentType = response.headers.get('content-type')
            if (altContentType && altContentType.includes('text/html')) {
              try {
                const html = await response.text()
                const downloadMatch = html.match(/href="([^"]*uc[^"]*export=download[^"]*)"/)
                if (downloadMatch && downloadMatch[1]) {
                  const actualDownloadUrl = downloadMatch[1].replace(/&amp;/g, '&')
                  response = await fetch(actualDownloadUrl)
                }
              } catch (parseError) {
                console.warn('Could not parse Google Drive redirect page:', parseError)
              }
            }
          }
        }
      }
      
      if (!response.ok) {
        console.warn(`Font file not found: ${fontPath}`)
        return null
      }
      
      const blob = await response.blob()
      
      if (blob.type && !blob.type.includes('font') && !blob.type.includes('octet-stream') && blob.type !== 'application/x-font-ttf') {
        if (blob.type.includes('text/html')) {
          console.warn(`Google Drive file appears to be HTML (may need authentication): ${fontPath}`)
          return null
        }
      }
      
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.warn(`Error loading font file ${fontPath}:`, error)
      return null
    }
  }

  // Generate PDF report
  const generatePDF = async () => {
    try {
      setGenerating(true)

      // Dynamic import for pdfmake
      const pdfMakeModule = await import('pdfmake/build/pdfmake')
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
      
      const pdfMake = pdfMakeModule.default || pdfMakeModule
      const pdfFonts = pdfFontsModule.default || pdfFontsModule
      
      if (pdfMake && pdfFonts) {
        // @ts-ignore - pdfmake types
        pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs
      }

      // Load Jeko fonts
      const jekoRegularUrl = process.env.NEXT_PUBLIC_JEKO_REGULAR_URL || '/fonts/Jeko-Regular.ttf'
      const jekoBoldUrl = process.env.NEXT_PUBLIC_JEKO_BOLD_URL || '/fonts/Jeko-Bold.ttf'
      const jekoItalicUrl = process.env.NEXT_PUBLIC_JEKO_ITALIC_URL || '/fonts/Jeko-Italic.ttf'
      const jekoBoldItalicUrl = process.env.NEXT_PUBLIC_JEKO_BOLD_ITALIC_URL || '/fonts/Jeko-BoldItalic.ttf'
      
      const jekoRegular = await loadFontFile(jekoRegularUrl)
      const jekoBold = await loadFontFile(jekoBoldUrl)
      const jekoItalic = await loadFontFile(jekoItalicUrl)
      const jekoBoldItalic = await loadFontFile(jekoBoldItalicUrl)

      // Register Jeko fonts with pdfmake if available
      const hasJekoFont = jekoRegular !== null
      if (hasJekoFont) {
        if (!pdfMake.vfs) {
          pdfMake.vfs = {}
        }
        
        if (jekoRegular) {
          pdfMake.vfs['Jeko-Regular.ttf'] = jekoRegular
        }
        if (jekoBold) {
          pdfMake.vfs['Jeko-Bold.ttf'] = jekoBold
        }
        if (jekoItalic) {
          pdfMake.vfs['Jeko-Italic.ttf'] = jekoItalic
        }
        if (jekoBoldItalic) {
          pdfMake.vfs['Jeko-BoldItalic.ttf'] = jekoBoldItalic
        }

        // @ts-ignore - pdfmake font registration
        pdfMake.fonts = {
          ...pdfMake.fonts,
          Jeko: {
            normal: jekoRegular ? 'Jeko-Regular.ttf' : 'Roboto',
            bold: jekoBold ? 'Jeko-Bold.ttf' : 'Roboto',
            italics: jekoItalic ? 'Jeko-Italic.ttf' : 'Roboto',
            bolditalics: jekoBoldItalic ? 'Jeko-BoldItalic.ttf' : 'Roboto'
          }
        }
      }
      
      const defaultFont = hasJekoFont ? 'Jeko' : 'Roboto'

      const projectInfo = getProjectInfo()
      const projectCodes = projectInfo.map(p => p.split(' - ')[0]).join(', ')
      const reportTitle = `Contract Variations - ${projectCodes}`
      const reportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Prepare table data - handle combined project column
      const selectedCols = allColumns.filter(col => {
        if (col.key === 'project_full_code' || col.key === 'project_name') {
          // Only include if 'project' is not selected
          return !selectedColumns.has('project') && selectedColumns.has(col.key)
        }
        return selectedColumns.has(col.key)
      })

      // If 'project' is selected, add it as a special column
      const hasProjectColumn = selectedColumns.has('project')
      const tableHeaders = hasProjectColumn
        ? ['Project', ...selectedCols.map(col => col.label)]
        : selectedCols.map(col => col.label)

      const tableBody: any[][] = variations.map(variation => {
        const row: any[] = []
        
        // Handle combined project column
        if (hasProjectColumn) {
          const projectValue = variation.project_full_code && variation.project_name
            ? `${variation.project_full_code} - ${variation.project_name}`
            : variation.project_full_code || variation.project_name || ''
          row.push(projectValue)
        }
        
        // Add other selected columns
        selectedCols.forEach(col => {
          let value = variation[col.key as keyof ContractVariation]
          
          if (col.key === 'item_description' && getBOQItemDescription && typeof value === 'string') {
            // Use getBOQItemDescription if available
            value = getBOQItemDescription(value) || value
          }
          
          if (typeof value === 'number') {
            if (col.key === 'variation_amount' || col.key === 'quantity_changes') {
              if (col.key === 'variation_amount') {
                row.push(formatCurrencyByCodeSync(value))
              } else {
                row.push(value.toString())
              }
            } else {
              row.push(value.toString())
            }
          } else if (typeof value === 'boolean') {
            row.push(value ? 'Yes' : 'No')
          } else if (col.key === 'date_of_submission' || col.key === 'date_of_approval') {
            row.push(formatDate(value as string))
          } else if (value === null || value === undefined) {
            row.push('')
          } else {
            row.push(String(value))
          }
        })
        
        return row
      })

      // Calculate totals
      const totals = calculateTotals()
      if (Object.keys(totals).length > 0) {
        const totalsRow: any[] = []
        
        // Add empty cell for project column if present
        if (hasProjectColumn) {
          totalsRow.push('')
        }
        
        selectedCols.forEach(col => {
          if (totals[col.key] !== undefined) {
            totalsRow.push(formatCurrencyByCodeSync(totals[col.key]))
          } else if (col.key === 'item_description') {
            totalsRow.push('TOTAL')
          } else {
            totalsRow.push('')
          }
        })
        tableBody.push(totalsRow)
      }

      // Calculate column widths
      const tableWidth = 450
      const columnWidth = 485
      const itemDescriptionColIndex = tableHeaders.findIndex(h => h === 'BOQ Item' || h === 'item_description')
      const hasItemDescription = itemDescriptionColIndex !== -1
      
      const itemDescriptionWidth = hasItemDescription ? tableWidth * 0.30 : 0
      const remainingWidth = tableWidth - itemDescriptionWidth
      const otherColumnsCount = tableHeaders.length - (hasItemDescription ? 1 : 0)
      
      let columnWidths: number[]
      if (otherColumnsCount === 0) {
        columnWidths = [itemDescriptionWidth]
      } else {
        const numericColumns = ['quantity_changes', 'variation_amount']
        // Calculate total weight for non-item-description columns
        let totalWeight = 0
        tableHeaders.forEach((header, index) => {
          if (index !== itemDescriptionColIndex) {
            // Find the corresponding column
            let col
            if (hasProjectColumn && index === 0) {
              // First column is the combined project column
              col = { key: 'project' }
            } else {
              const colIndex = hasProjectColumn ? index - 1 : index
              col = selectedCols[colIndex] || allColumns.find(c => c.label === header)
            }
            totalWeight += (col && numericColumns.includes(col.key) ? 1.2 : 1.0)
          }
        })
        
        columnWidths = tableHeaders.map((header, index) => {
          if (index === itemDescriptionColIndex) {
            return itemDescriptionWidth
          }
          // Find the corresponding column
          let col
          if (hasProjectColumn && index === 0) {
            col = { key: 'project' }
          } else {
            const colIndex = hasProjectColumn ? index - 1 : index
            col = selectedCols[colIndex] || allColumns.find(c => c.label === header)
          }
          const weight = col && numericColumns.includes(col.key) ? 1.2 : 1.0
          return (remainingWidth * weight) / totalWeight
        })
      }
      
      const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0)
      if (Math.abs(totalWidth - tableWidth) > 0.01) {
        const scaleFactor = tableWidth / totalWidth
        columnWidths = columnWidths.map(width => width * scaleFactor)
      }
      
      let tableFontSize = 9
      if (tableHeaders.length > 8) {
        tableFontSize = 7
      } else if (tableHeaders.length > 6) {
        tableFontSize = 8
      }

      // Load company logo if available
      let logoData: string | null = null
      if (companySettings?.company_logo_url) {
        try {
          const response = await fetch(companySettings.company_logo_url)
          const blob = await response.blob()
          const reader = new FileReader()
          logoData = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          console.warn('Could not load company logo:', error)
        }
      }

      const filterSummary = getFilterSummary()

      // Get user name for footer
      const userName = appUser?.first_name && appUser?.last_name
        ? `${appUser.first_name} ${appUser.last_name}`
        : appUser?.full_name || appUser?.email || 'User'

      // Create PDF document definition
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 120, 40, 80],
        defaultStyle: {
          font: defaultFont,
          fontSize: 10
        },
        header: function(currentPage: number, pageCount: number) {
          return {
            margin: [40, 20, 40, 0],
            columns: [
              logoData ? {
                image: logoData,
                width: 100,
                alignment: 'left'
              } : { text: '', width: 100 },
              {
                text: reportTitle,
                fontSize: 14,
                bold: true,
                alignment: 'center',
                width: '*',
                font: defaultFont
              }
            ]
          }
        },
        footer: function(currentPage: number, pageCount: number) {
          return {
            margin: [40, 10, 40, 20],
            columns: [
              {
                stack: [
                  {
                    text: `Generated on: ${reportDate}`,
                    fontSize: 9,
                    color: '#666666',
                    margin: [0, 0, 0, 3],
                    font: defaultFont
                  },
                  {
                    text: `Printed by: ${userName}`,
                    fontSize: 9,
                    color: '#666666',
                    font: defaultFont
                  }
                ]
              },
              {
                text: `Page ${currentPage} of ${pageCount}`,
                fontSize: 9,
                alignment: 'right',
                color: '#666666',
                font: defaultFont
              }
            ]
          }
        },
        content: [
          {
            text: 'Report Information',
            fontSize: 12,
            bold: true,
            margin: [0, 0, 0, 10],
            font: defaultFont
          },
          {
            columns: [
              {
                text: [
                  { text: 'Report Date: ', bold: true, font: defaultFont },
                  { text: reportDate, font: defaultFont }
                ],
                fontSize: 10,
                margin: [0, 0, 0, 5],
                font: defaultFont
              },
              {
                text: [
                  { text: 'Total Variations: ', bold: true, font: defaultFont },
                  { text: variations.length.toString(), font: defaultFont }
                ],
                fontSize: 10,
                alignment: 'right',
                margin: [0, 0, 0, 5],
                font: defaultFont
              }
            ],
            margin: [0, 0, 0, 10]
          },
          projectInfo.length > 0 ? {
            text: [
              { text: 'Projects Included: ', bold: true, font: defaultFont },
              { text: projectInfo.join(', '), font: defaultFont }
            ],
            fontSize: 10,
            margin: [0, 0, 0, 10],
            font: defaultFont
          } : null,
          filterSummary.length > 0 ? {
            text: [
              { text: 'Filter Criteria: ', bold: true, font: defaultFont },
              { text: filterSummary.join(' | '), font: defaultFont }
            ],
            fontSize: 10,
            margin: [0, 0, 0, 10],
            font: defaultFont
          } : null,
          {
            text: 'Table of Variations',
            fontSize: 12,
            bold: true,
            margin: [0, 20, 0, 10],
            font: defaultFont
          },
          {
            columns: [
              {
                width: columnWidth,
                margin: [0, 0, 0, 0],
                table: {
                  headerRows: 1,
                  widths: columnWidths,
                  body: [
                    tableHeaders.map(header => ({
                      text: header,
                      bold: true,
                      fillColor: '#E5E7EB',
                      fontSize: tableFontSize,
                      noWrap: false,
                      font: defaultFont
                    })),
                    ...tableBody.map((row, index) => {
                      const isTotalRow = index === tableBody.length - 1 && Object.keys(totals).length > 0
                      return row.map((cell, cellIndex) => {
                        const header = tableHeaders[cellIndex]
                        const isItemDescription = header === 'BOQ Item' || header === 'item_description'
                        return {
                          text: cell,
                          fontSize: isTotalRow ? tableFontSize + 0.5 : tableFontSize,
                          bold: isTotalRow,
                          fillColor: isTotalRow ? '#F3F4F6' : undefined,
                          noWrap: false,
                          maxHeight: isItemDescription ? 60 : 30,
                          font: defaultFont
                        }
                      })
                    })
                  ]
                },
                layout: {
                  hLineWidth: function(i: number, node: any) {
                    return i === 0 || i === node.table.body.length ? 1 : 0.5
                  },
                  vLineWidth: function() {
                    return 0.5
                  },
                  hLineColor: function() {
                    return '#CCCCCC'
                  },
                  vLineColor: function() {
                    return '#CCCCCC'
                  },
                  paddingLeft: function() {
                    return 4
                  },
                  paddingRight: function() {
                    return 4
                  },
                  paddingTop: function() {
                    return 3
                  },
                  paddingBottom: function() {
                    return 3
                  }
                },
                dontBreakRows: true
              }
            ],
            margin: [0, 0, 0, 20]
          }
        ].filter(item => item !== null)
      }

      // Generate and download PDF
      // @ts-ignore
      pdfMake.createPdf(docDefinition).download(`Contract_Variations_Report_${new Date().toISOString().split('T')[0]}.pdf`)

      onClose()
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert('An error occurred while generating PDF: ' + (error.message || 'Unknown error'))
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = async () => {
    if (selectedColumns.size === 0) {
      alert('Please select at least one column to print')
      return
    }

    if (variations.length === 0) {
      alert('No variations to print')
      return
    }

    await generatePDF()
  }

  if (!isOpen) return null

  // Filter columns for display (exclude project_full_code and project_name from UI)
  const displayColumns = allColumns.filter(col => 
    col.key !== 'project_full_code' && col.key !== 'project_name'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Print Contract Variations Report</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Column Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Columns ({selectedColumns.size} selected)
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {displayColumns.map(column => (
                    <button
                      key={column.key}
                      onClick={() => toggleColumn(column.key)}
                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                    >
                      {selectedColumns.has(column.key) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {column.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Printing:</strong> {variations.length} variation(s)
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Report will include company header, project information, and formatted table with totals
              </p>
            </div>
          </div>
        </CardContent>

        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={generating || selectedColumns.size === 0 || variations.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Print'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

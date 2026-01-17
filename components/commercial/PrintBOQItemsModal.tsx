'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, FileText, CheckSquare, Square, Printer } from 'lucide-react'
import { CommercialBOQItem } from '@/lib/supabase'
import { getCachedCompanySettings } from '@/lib/companySettings'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { useAuth } from '@/app/providers'

interface PrintBOQItemsModalProps {
  isOpen: boolean
  onClose: () => void
  items: CommercialBOQItem[]
  filters?: {
    search?: string
    project?: Set<string>
    itemDescription?: Set<string>
    unit?: Set<string>
    remeasurable?: Set<string>
    quantityRange?: { min?: number; max?: number }
    rateRange?: { min?: number; max?: number }
    totalValueRange?: { min?: number; max?: number }
  }
}

interface ColumnOption {
  key: string
  label: string
  selected: boolean
  isTotalable?: boolean // Columns that can have totals
}

// Define all available columns (same as export modal)
const allColumns: ColumnOption[] = [
  { key: 'auto_generated_unique_reference_number', label: 'Ref Number', selected: true },
  { key: 'external_ref_no', label: 'External Ref no.', selected: true },
  { key: 'project_full_code', label: 'Project Full Code', selected: false },
  { key: 'project_name', label: 'Project Name', selected: false },
  { key: 'item_description', label: 'Item Description', selected: true },
  { key: 'unit', label: 'Unit', selected: true },
  { key: 'quantity', label: 'Quantity', selected: true },
  { key: 'rate', label: 'Rate', selected: true },
  { key: 'total_value', label: 'Total Value', selected: true, isTotalable: true },
  { key: 'remeasurable', label: 'Remeasurable', selected: true },
  { key: 'planning_assigned_amount', label: 'Planning Assigned Amount', selected: false },
  { key: 'units_variation', label: 'Units Variation', selected: false },
  { key: 'variations_amount', label: 'Variations Amount', selected: false, isTotalable: true },
  { key: 'total_units', label: 'Total Units', selected: false },
  { key: 'total_including_variations', label: 'Total Including Variations', selected: false, isTotalable: true },
  { key: 'created_at', label: 'Created At', selected: false },
  { key: 'updated_at', label: 'Updated At', selected: false },
]

export function PrintBOQItemsModal({ isOpen, onClose, items, filters }: PrintBOQItemsModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [companySettings, setCompanySettings] = useState<{ company_name: string; company_logo_url?: string } | null>(null)
  const { appUser } = useAuth()

  // Initialize selected columns on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultSelected = new Set(
        allColumns.filter(col => col.selected).map(col => col.key)
      )
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
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedColumns(new Set(allColumns.map(col => col.key)))
  }

  const deselectAll = () => {
    setSelectedColumns(new Set())
  }

  // Get unique project codes and names from items
  const getProjectInfo = () => {
    const projectSet = new Set<string>()
    items.forEach(item => {
      if (item.project_full_code && item.project_name) {
        projectSet.add(`${item.project_full_code} - ${item.project_name}`)
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
    if (filters?.itemDescription && filters.itemDescription.size > 0) {
      summary.push(`Item Descriptions: ${filters.itemDescription.size} selected`)
    }
    if (filters?.unit && filters.unit.size > 0) {
      summary.push(`Units: ${filters.unit.size} selected`)
    }
    if (filters?.remeasurable && filters.remeasurable.size > 0) {
      summary.push(`Remeasurable: ${Array.from(filters.remeasurable).join(', ')}`)
    }
    if (filters?.quantityRange && (filters.quantityRange.min !== undefined || filters.quantityRange.max !== undefined)) {
      const min = filters.quantityRange.min ?? ''
      const max = filters.quantityRange.max ?? ''
      summary.push(`Quantity Range: ${min} - ${max}`)
    }
    if (filters?.rateRange && (filters.rateRange.min !== undefined || filters.rateRange.max !== undefined)) {
      const min = filters.rateRange.min ?? ''
      const max = filters.rateRange.max ?? ''
      summary.push(`Rate Range: ${min} - ${max}`)
    }
    if (filters?.totalValueRange && (filters.totalValueRange.min !== undefined || filters.totalValueRange.max !== undefined)) {
      const min = filters.totalValueRange.min ?? ''
      const max = filters.totalValueRange.max ?? ''
      summary.push(`Total Value Range: ${min} - ${max}`)
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
      totals[col.key] = items.reduce((sum, item) => {
        const value = item[col.key as keyof CommercialBOQItem] as number
        return sum + (typeof value === 'number' ? value : 0)
      }, 0)
    })
    
    return totals
  }

  // Extract Google Drive file ID from URL
  const extractGoogleDriveFileId = (url: string): string | null => {
    if (!url) return null
    
    // Google Drive file URL: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\n?#]+)/)
    if (fileMatch) {
      return fileMatch[1]
    }
    
    // Google Drive preview URL: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&\n?#]+)/)
    if (openMatch) {
      return openMatch[1]
    }
    
    // Google Drive folder/file URL: https://drive.google.com/drive/folders/FILE_ID or /files/FILE_ID
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
      // Use uc?export=download for direct download
      // Add confirm=t to bypass virus scan warning for large files
      return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
    }
    return url // Return original URL if not a Google Drive link
  }

  // Load font file and convert to base64
  // Supports both local paths (/fonts/...) and Google Drive URLs
  const loadFontFile = async (fontPath: string): Promise<string | null> => {
    try {
      // Check if it's a Google Drive URL
      let downloadUrl = fontPath
      if (fontPath.includes('drive.google.com')) {
        downloadUrl = getGoogleDriveDownloadUrl(fontPath)
      }
      
      let response = await fetch(downloadUrl)
      
      // Handle Google Drive redirects and virus scan warnings
      if (fontPath.includes('drive.google.com')) {
        const fileId = extractGoogleDriveFileId(fontPath)
        if (fileId) {
          // Check if response is HTML (virus scan warning page)
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('text/html')) {
            // Try alternative direct download method
            const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
            response = await fetch(directUrl)
            
            // If still HTML, try with confirm parameter
            const altContentType = response.headers.get('content-type')
            if (altContentType && altContentType.includes('text/html')) {
              // Parse HTML to find the actual download link (for virus scan warning)
              try {
                const html = await response.text()
                // Look for download link in the HTML
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
      
      // Verify it's actually a font file (TTF)
      if (blob.type && !blob.type.includes('font') && !blob.type.includes('octet-stream') && blob.type !== 'application/x-font-ttf') {
        // If it's still HTML, the download failed
        if (blob.type.includes('text/html')) {
          console.warn(`Google Drive file appears to be HTML (may need authentication): ${fontPath}`)
          return null
        }
      }
      
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          // Convert to base64 data URL format that pdfmake expects
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
      // Support both local paths and Google Drive URLs
      // Priority: Environment variables > Google Drive URLs > Local paths
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
        // Add font files to VFS (Virtual File System)
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

        // Register font family
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
      
      // Determine which font to use (Jeko if available, otherwise default)
      const defaultFont = hasJekoFont ? 'Jeko' : 'Roboto'

      const projectInfo = getProjectInfo()
      const projectCodes = projectInfo.map(p => p.split(' - ')[0]).join(', ')
      const reportTitle = `Bill of Quantity - ${projectCodes}`
      const reportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Prepare table data
      const selectedCols = allColumns.filter(col => selectedColumns.has(col.key))
      const tableHeaders = selectedCols.map(col => col.label)
      const tableBody: any[][] = items.map(item => {
        return selectedCols.map(col => {
          const value = item[col.key as keyof CommercialBOQItem]
          if (typeof value === 'number') {
            // Format currency values
            if (['rate', 'total_value', 'planning_assigned_amount', 'variations_amount', 'total_including_variations'].includes(col.key)) {
              return formatCurrencyByCodeSync(value)
            }
            return value.toString()
          } else if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No'
          } else if (value === null || value === undefined) {
            return ''
          }
          return String(value)
        })
      })

      // Calculate totals
      const totals = calculateTotals()
      if (Object.keys(totals).length > 0) {
        const totalsRow: any[] = selectedCols.map(col => {
          if (totals[col.key] !== undefined) {
            return formatCurrencyByCodeSync(totals[col.key])
          }
          return col.key === 'item_description' ? 'TOTAL' : ''
        })
        tableBody.push(totalsRow)
      }

      // Calculate column widths
      // A4 portrait: 595 points width, minus left/right margins (40*2 = 80) = 515 points available
      // Table should be 450 points width, contained in a 485 points column, with 0pt spacing from border
      const borderPadding = 0 // No spacing from border
      const tableWidth = 450 // Table itself is 450 points
      const columnWidth = 485 // Column container is 485 points
      const itemDescriptionColIndex = selectedCols.findIndex(col => col.key === 'item_description')
      const hasItemDescription = itemDescriptionColIndex !== -1
      
      // Fixed width for Item Description (30% of table width)
      const itemDescriptionWidth = hasItemDescription ? tableWidth * 0.30 : 0
      const remainingWidth = tableWidth - itemDescriptionWidth
      const otherColumnsCount = selectedCols.length - (hasItemDescription ? 1 : 0)
      
      let columnWidths: number[]
      if (otherColumnsCount === 0) {
        // Only item description column
        columnWidths = [itemDescriptionWidth]
      } else {
        // Calculate widths for other columns (equal distribution of remaining width)
        // Give slightly more to numeric/currency columns that need more space
        const numericColumns = ['quantity', 'rate', 'total_value', 'planning_assigned_amount', 'variations_amount', 'total_including_variations', 'units_variation', 'total_units']
        const totalWeight = selectedCols.reduce((sum, col) => {
          if (col.key === 'item_description') return sum
          return sum + (numericColumns.includes(col.key) ? 1.2 : 1.0)
        }, 0)
        
        columnWidths = selectedCols.map((col) => {
          if (col.key === 'item_description') {
            return itemDescriptionWidth
          }
          const weight = numericColumns.includes(col.key) ? 1.2 : 1.0
          return (remainingWidth * weight) / totalWeight
        })
      }
      
      // Ensure total width exactly equals table width (450 points, no overflow)
      const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0)
      if (Math.abs(totalWidth - tableWidth) > 0.01) {
        // Scale to fit exactly within table width
        const scaleFactor = tableWidth / totalWidth
        columnWidths = columnWidths.map(width => width * scaleFactor)
      }
      
      // Determine font size based on number of columns
      // More columns = smaller font to fit everything, but keep uniform
      let tableFontSize = 9
      if (selectedCols.length > 8) {
        tableFontSize = 7
      } else if (selectedCols.length > 6) {
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
          // Report metadata
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
                  { text: 'Total Items: ', bold: true, font: defaultFont },
                  { text: items.length.toString(), font: defaultFont }
                ],
                fontSize: 10,
                alignment: 'right',
                margin: [0, 0, 0, 5],
                font: defaultFont
              }
            ],
            margin: [0, 0, 0, 10]
          },
          // Project information
          projectInfo.length > 0 ? {
            text: [
              { text: 'Projects Included: ', bold: true, font: defaultFont },
              { text: projectInfo.join(', '), font: defaultFont }
            ],
            fontSize: 10,
            margin: [0, 0, 0, 10],
            font: defaultFont
          } : null,
          // Filter criteria
          filterSummary.length > 0 ? {
            text: [
              { text: 'Filter Criteria: ', bold: true, font: defaultFont },
              { text: filterSummary.join(' | '), font: defaultFont }
            ],
            fontSize: 10,
            margin: [0, 0, 0, 10],
            font: defaultFont
          } : null,
          // Table of contents placeholder (simplified)
          {
            text: 'Table of Items',
            fontSize: 12,
            bold: true,
            margin: [0, 20, 0, 10],
            font: defaultFont
          },
          // Data table - wrapped in fixed-width column (485pt) with table limited to 450pt
          {
            columns: [
              {
                width: columnWidth, // 485 points total column width
                margin: [0, 0, 0, 0], // No margin from border
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
                        const col = selectedCols[cellIndex]
                        const isItemDescription = col?.key === 'item_description'
                        return {
                          text: cell,
                          fontSize: isTotalRow ? tableFontSize + 0.5 : tableFontSize,
                          bold: isTotalRow,
                          fillColor: isTotalRow ? '#F3F4F6' : undefined,
                          noWrap: false, // Enable text wrapping
                          // Allow more lines for item description
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
                // Keep table rows together to avoid empty pages
                dontBreakRows: true
              }
            ],
            margin: [0, 0, 0, 20]
          }
        ].filter(item => item !== null)
      }

      // Generate and download PDF
      // @ts-ignore
      pdfMake.createPdf(docDefinition).download(`BOQ_Items_Report_${new Date().toISOString().split('T')[0]}.pdf`)

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

    if (items.length === 0) {
      alert('No items to print')
      return
    }

    await generatePDF()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Print BOQ Items Report</CardTitle>
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
                  {allColumns.map(column => (
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
                <strong>Printing:</strong> {items.length} item(s)
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
            disabled={generating || selectedColumns.size === 0 || items.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Print'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

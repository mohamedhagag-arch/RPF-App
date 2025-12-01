'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Printer, Settings } from 'lucide-react'
import { PrintSettingsModal, PrintSettings } from './PrintSettingsModal'

interface PrintButtonProps {
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  disabled?: boolean
  printTitle?: string
  showSettings?: boolean
  printSettings?: PrintSettings
}

export function PrintButton({
  label = 'Print',
  variant = 'outline',
  className = '',
  disabled = false,
  printTitle = 'Report',
  showSettings = true,
  printSettings: defaultSettings = {}
}: PrintButtonProps) {
  const [printing, setPrinting] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [currentSettings, setCurrentSettings] = useState<PrintSettings>(defaultSettings)

  const handlePrint = async (settings?: PrintSettings) => {
    try {
      setPrinting(true)
      
      // Use provided settings or current settings
      const printSettings = settings || currentSettings
      
      // Calculate font size
      let fontSize = '10pt'
      if (printSettings.fontSize === 'small') fontSize = '8pt'
      else if (printSettings.fontSize === 'medium') fontSize = '10pt'
      else if (printSettings.fontSize === 'large') fontSize = '12pt'
      else if (printSettings.fontSize === 'custom' && printSettings.customFontSize) {
        fontSize = printSettings.customFontSize
      }
      
      // Calculate margins
      let marginValue = '1.5cm'
      if (printSettings.margins === 'small') marginValue = '0.5cm'
      else if (printSettings.margins === 'medium') marginValue = '1.5cm'
      else if (printSettings.margins === 'large') marginValue = '2.5cm'
      else if (printSettings.margins === 'custom' && printSettings.customMargins) {
        const { top = '1.5cm', right = '1.5cm', bottom = '1.5cm', left = '1.5cm' } = printSettings.customMargins
        marginValue = `${top} ${right} ${bottom} ${left}`
      }
      
      // Final settings
      const finalSettings = {
        orientation: printSettings.orientation || 'landscape',
        pageSize: printSettings.pageSize || 'A4',
        fontSize,
        marginValue,
        compactMode: printSettings.compactMode ?? true,
        showPageNumbers: printSettings.showPageNumbers ?? true,
        showDate: printSettings.showDate ?? true,
        showHeader: printSettings.showHeader ?? true,
        showFooter: printSettings.showFooter ?? true,
        showSignatures: printSettings.showSignatures ?? false,
        includeImages: printSettings.includeImages ?? false,
        includeCharts: printSettings.includeCharts ?? false,
        colorMode: printSettings.colorMode || 'color',
        pageBreak: printSettings.pageBreak || 'auto'
      }
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to print this report')
        return
      }

      // Get only tables from the page content
      const getPrintableContent = () => {
        const containers = [
          '.printable-content',
          '.reports-container', 
          '.projects-container',
          '.boq-container',
          '.kpi-container'
        ]
        
        let container = null
        for (const selector of containers) {
          container = document.querySelector(selector)
          if (container) break
        }
        
        if (!container) {
          container = document.body
        }
        
        // Extract only tables and their headers
        const tables = container.querySelectorAll('table')
        let content = ''
        
        tables.forEach(table => {
          // Get table title from previous heading or parent container
          const titleElement = table.closest('div')?.querySelector('h2, h3, h4') ||
                              table.previousElementSibling?.querySelector('h2, h3, h4')
          
          if (titleElement) {
            content += `<h3 style="font-size: 16px; margin: 20px 0 10px 0; font-weight: bold;">${titleElement.textContent}</h3>`
          }
          
          content += table.outerHTML
        })
        
        return content || container.innerHTML
      }
      
      const currentPageContent = getPrintableContent()
      const pageTitle = document.title || printTitle
      
      // Create simple print-friendly HTML
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${pageTitle}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: ${finalSettings.fontSize};
                margin: 0;
                padding: 20px;
                color: ${finalSettings.colorMode === 'black-white' ? '#000' : finalSettings.colorMode === 'grayscale' ? '#333' : '#333'};
              }
              
              ${finalSettings.showHeader ? `
              .print-header {
                display: block !important;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #000;
              }
              
              .print-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                text-align: center;
              }
              
              .print-meta {
                font-size: 10px;
                text-align: center;
                color: #666;
                margin-bottom: 10px;
              }
              ` : '.print-header { display: none !important; }'}
              
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: ${finalSettings.fontSize};
                margin-bottom: ${finalSettings.compactMode ? '10px' : '20px'};
                page-break-inside: ${finalSettings.pageBreak === 'avoid' ? 'avoid' : 'auto'};
              }
              
              th, td {
                border: 1px solid #000;
                padding: ${finalSettings.compactMode ? '3px 4px' : '4px 6px'};
                text-align: left;
                font-size: ${finalSettings.fontSize};
              }
              
              th {
                background-color: ${finalSettings.colorMode === 'black-white' ? '#fff' : '#f0f0f0'};
                font-weight: bold;
              }
              
              tbody tr:nth-child(even) {
                background-color: ${finalSettings.colorMode === 'black-white' ? '#fff' : '#fafafa'};
              }
              
              /* Reset all styles for clean print */
              * {
                margin: 0 !important;
                padding: 0 !important;
                ${finalSettings.colorMode === 'black-white' ? 'background: white !important; color: #000 !important;' : ''}
                ${finalSettings.colorMode === 'grayscale' ? 'background: white !important; color: #333 !important;' : ''}
                line-height: ${finalSettings.compactMode ? '1.2' : '1.4'} !important;
              }
              
              /* Show only title and tables */
              .print-title {
                display: block !important;
                margin-bottom: ${finalSettings.compactMode ? '10px' : '20px'} !important;
                font-size: 18px !important;
                font-weight: bold !important;
                text-align: center !important;
              }
              
              h3 {
                display: block !important;
                font-size: 16px !important;
                margin: ${finalSettings.compactMode ? '10px 0 5px 0' : '20px 0 10px 0'} !important;
                font-weight: bold !important;
              }
              
              table {
                display: table !important;
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: ${finalSettings.compactMode ? '10px' : '20px'} !important;
              }
              
              th, td {
                display: table-cell !important;
                border: 1px solid #000 !important;
                padding: ${finalSettings.compactMode ? '3px 4px' : '4px 6px'} !important;
                text-align: left !important;
              }
              
              th {
                background-color: ${finalSettings.colorMode === 'black-white' ? '#fff' : '#f0f0f0'} !important;
                font-weight: bold !important;
              }
              
              ${!finalSettings.includeImages ? 'img { display: none !important; }' : ''}
              ${!finalSettings.includeCharts ? 'canvas, svg.chart { display: none !important; }' : ''}
              
              /* Hide everything else */
              body > *:not(.print-header):not(.print-title):not(.print-content):not(.print-footer),
              .print-content > *:not(table):not(h3) {
                display: none !important;
              }
              
              ${finalSettings.showFooter ? `
              .print-footer {
                display: block !important;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 10px;
                border-top: 1px solid #000;
                background: white;
                font-size: 8px;
                text-align: center;
              }
              ` : '.print-footer { display: none !important; }'}
              
              @media print {
                @page {
                  margin: ${finalSettings.marginValue};
                  size: ${finalSettings.pageSize} ${finalSettings.orientation};
                }
              }
            </style>
          </head>
          <body>
            ${finalSettings.showHeader ? `
            <div class="print-header">
              <div class="print-title">${pageTitle}</div>
              ${finalSettings.showDate ? `<div class="print-meta">Generated on ${new Date().toLocaleString()}</div>` : ''}
            </div>
            ` : ''}
            <div class="print-content">
              ${currentPageContent}
            </div>
            ${finalSettings.showFooter ? `
            <div class="print-footer">
              ${finalSettings.showDate ? `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` : ''}
            </div>
            ` : ''}
            
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `
      
      // Write content to print window
      printWindow.document.write(printHTML)
      printWindow.document.close()
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
      
    } catch (error) {
      console.error('❌ Print error:', error)
      alert('An error occurred while printing')
    } finally {
      setPrinting(false)
    }
  }

  const handleQuickPrint = () => {
    if (showSettings) {
      setShowSettingsModal(true)
    } else {
      handlePrint()
    }
  }

  const handleSettingsApply = (settings: PrintSettings) => {
    setCurrentSettings(settings)
    handlePrint(settings)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          onClick={handleQuickPrint}
          disabled={disabled || printing}
          className={className}
        >
          <Printer className="w-4 h-4 mr-2" />
          {printing ? 'Printing...' : label}
        </Button>
        
        {showSettings && (
          <Button
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            disabled={disabled || printing}
            className="px-3"
            title="Print Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {showSettings && (
        <PrintSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onApply={handleSettingsApply}
          defaultSettings={currentSettings}
        />
      )}
    </>
  )
}

/**
 * Quick Print Button (simple version)
 */
export function QuickPrintButton({
  label = 'Print Report',
  className = ''
}: {
  label?: string
  className?: string
}) {
  return (
    <PrintButton
      label={label}
      variant="outline"
      className={className}
    />
  )
}

/**
 * Simple Print Button (basic version)
 */
export function SimplePrintButton({
  label = 'Print',
  title = 'Report',
  className = ''
}: {
  label?: string
  title?: string
  className?: string
}) {
  return (
    <PrintButton
      label={label}
      variant="outline"
      printTitle={title}
      printSettings={{
        fontSize: 'medium',
        compactMode: true
      }}
      className={className}
    />
  )
}


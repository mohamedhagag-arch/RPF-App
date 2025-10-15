'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Printer } from 'lucide-react'

interface PrintButtonProps {
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  disabled?: boolean
  printTitle?: string
  printSettings?: {
    orientation?: 'portrait' | 'landscape'
    pageSize?: 'A4' | 'A3' | 'Letter'
    margins?: string
    fontSize?: string
    showPageNumbers?: boolean
    showDate?: boolean
    compactMode?: boolean
    showProgressBars?: boolean
    maxRowsPerPage?: number
  }
}

export function PrintButton({
  label = 'Print',
  variant = 'outline',
  className = '',
  disabled = false,
  printTitle = 'Report',
  printSettings = {}
}: PrintButtonProps) {
  const [printing, setPrinting] = useState(false)

  const handlePrint = async () => {
    try {
      setPrinting(true)
      
      // Simple default settings
      const settings = {
        orientation: 'landscape',
        pageSize: 'A4',
        fontSize: '11px',
        compactMode: true,
        ...printSettings
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
                font-size: ${settings.fontSize};
                margin: 0;
                padding: 20px;
                color: #333;
              }
              
              .print-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                text-align: center;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: ${settings.compactMode ? '10px' : '11px'};
                margin-bottom: 20px;
              }
              
              th, td {
                border: 1px solid #000;
                padding: 4px 6px;
                text-align: left;
              }
              
              th {
                background-color: #f0f0f0;
                font-weight: bold;
              }
              
              /* Reset all styles for clean print */
              * {
                margin: 0 !important;
                padding: 0 !important;
                background: none !important;
                color: #000 !important;
                font-size: ${settings.compactMode ? '10px' : '11px'} !important;
                line-height: 1.2 !important;
              }
              
              /* Show only title and tables */
              .print-title {
                display: block !important;
                margin-bottom: 20px !important;
                font-size: 18px !important;
                font-weight: bold !important;
                text-align: center !important;
              }
              
              h3 {
                display: block !important;
                font-size: 16px !important;
                margin: 20px 0 10px 0 !important;
                font-weight: bold !important;
              }
              
              table {
                display: table !important;
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: 20px !important;
              }
              
              th, td {
                display: table-cell !important;
                border: 1px solid #000 !important;
                padding: 4px 6px !important;
                text-align: left !important;
              }
              
              th {
                background-color: #f0f0f0 !important;
                font-weight: bold !important;
              }
              
              /* Hide everything else */
              body > *:not(.print-title):not(.print-content),
              .print-content > *:not(table):not(h3) {
                display: none !important;
              }
              
              @media print {
                @page {
                  margin: 0.5in;
                  size: ${settings.pageSize} ${settings.orientation};
                }
              }
            </style>
          </head>
          <body>
            <div class="print-title">${pageTitle}</div>
            <div class="print-content">
              ${currentPageContent}
            </div>
            
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

  return (
    <Button
      variant={variant}
      onClick={handlePrint}
      disabled={disabled || printing}
      className={className}
    >
      <Printer className="w-4 h-4 mr-2" />
      {printing ? 'Printing...' : label}
    </Button>
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
        fontSize: '11px',
        compactMode: true
      }}
      className={className}
    />
  )
}

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
        signatures: printSettings.signatures || [],
        signatureLayout: printSettings.signatureLayout || 'horizontal',
        customHeaderText: printSettings.customHeaderText || '',
        customFooterText: printSettings.customFooterText || '',
        companyName: printSettings.companyName || '',
        includeImages: printSettings.includeImages ?? false,
        includeCharts: printSettings.includeCharts ?? false,
        chartSize: printSettings.chartSize || 'medium',
        chartQuality: printSettings.chartQuality || 'normal',
        chartBackground: printSettings.chartBackground || 'white',
        chartShowLegend: printSettings.chartShowLegend ?? true,
        chartShowGrid: printSettings.chartShowGrid ?? true,
        colorMode: printSettings.colorMode || 'color',
        pageBreak: printSettings.pageBreak || 'auto'
      }
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to print this report')
        return
      }

      // Convert SVG/Canvas charts to images
      const convertChartToImage = async (chartElement: HTMLElement, svgElement?: SVGElement | null): Promise<string> => {
        return new Promise((resolve) => {
          try {
            // Use provided SVG or try to find SVG first (Recharts uses SVG)
            const svg = svgElement || chartElement.querySelector('svg')
            if (svg) {
              console.log('🖼️ Converting SVG to image, SVG found:', !!svg)
              // Clone the SVG
              const clonedSvg = svg.cloneNode(true) as SVGElement
              
              // Get original dimensions
              const rect = svg.getBoundingClientRect()
              const width = svg.getAttribute('width') || rect.width.toString() || '800'
              const height = svg.getAttribute('height') || rect.height.toString() || '400'
              
              // Get viewBox if exists
              const viewBox = svg.getAttribute('viewBox')
              
              // Ensure SVG has proper dimensions
              if (width && width !== '0') {
                clonedSvg.setAttribute('width', width.toString())
              } else {
                clonedSvg.setAttribute('width', '800')
              }
              
              if (height && height !== '0') {
                clonedSvg.setAttribute('height', height.toString())
              } else {
                clonedSvg.setAttribute('height', '400')
              }
              
              if (viewBox) {
                clonedSvg.setAttribute('viewBox', viewBox)
              } else {
                const w = parseFloat(width.toString()) || 800
                const h = parseFloat(height.toString()) || 400
                clonedSvg.setAttribute('viewBox', `0 0 ${w} ${h}`)
              }
              
              console.log('📐 SVG dimensions:', { width, height, viewBox: clonedSvg.getAttribute('viewBox') })
              
              // Set background if needed
              if (finalSettings.chartBackground === 'white') {
                const existingBg = clonedSvg.querySelector('rect[fill="white"]')
                if (!existingBg) {
                  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                  rect.setAttribute('width', '100%')
                  rect.setAttribute('height', '100%')
                  rect.setAttribute('fill', 'white')
                  rect.setAttribute('x', '0')
                  rect.setAttribute('y', '0')
                  clonedSvg.insertBefore(rect, clonedSvg.firstChild)
                }
              }
              
              // Hide legend if needed
              if (!finalSettings.chartShowLegend) {
                const legends = clonedSvg.querySelectorAll('[class*="legend"], [class*="Legend"], .recharts-legend-wrapper')
                legends.forEach(legend => {
                  (legend as HTMLElement).setAttribute('style', 'display: none !important')
                })
              }
              
              // Hide grid if needed
              if (!finalSettings.chartShowGrid) {
                const grids = clonedSvg.querySelectorAll('[class*="grid"], [class*="Grid"], .recharts-cartesian-grid, line[stroke="#ccc"], line[stroke="#e5e7eb"], line[stroke="#ddd"]')
                grids.forEach(grid => {
                  (grid as HTMLElement).setAttribute('style', 'display: none !important')
                })
              }
              
              // Serialize SVG
              const svgData = new XMLSerializer().serializeToString(clonedSvg)
              console.log('📄 SVG data length:', svgData.length)
              
              // Create data URL - use encodeURIComponent for better compatibility
              const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
              const url = URL.createObjectURL(svgBlob)
              
              // Convert to PNG using canvas for better quality
              const img = new Image()
              
              img.onload = () => {
                try {
                  console.log('🖼️ Image loaded, dimensions:', img.width, 'x', img.height)
                  
                  const canvas = document.createElement('canvas')
                  const scale = finalSettings.chartQuality === 'high' ? 2 : 1.5
                  const canvasWidth = Math.max(img.width || 800, 800) * scale
                  const canvasHeight = Math.max(img.height || 400, 400) * scale
                  
                  canvas.width = canvasWidth
                  canvas.height = canvasHeight
                  
                  const ctx = canvas.getContext('2d')
                  if (ctx) {
                    // Set white background
                    if (finalSettings.chartBackground === 'white') {
                      ctx.fillStyle = 'white'
                      ctx.fillRect(0, 0, canvas.width, canvas.height)
                    }
                    
                    ctx.scale(scale, scale)
                    ctx.drawImage(img, 0, 0)
                    const dataUrl = canvas.toDataURL('image/png', 1.0)
                    URL.revokeObjectURL(url)
                    console.log('✅ Chart image generated successfully')
                    resolve(dataUrl)
                  } else {
                    console.warn('⚠️ Canvas context not available, using SVG data URL')
                    // Fallback: use SVG data URL directly
                    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
                    URL.revokeObjectURL(url)
                    resolve(svgDataUrl)
                  }
                } catch (error) {
                  console.error('❌ Error converting SVG to image:', error)
                  // Fallback: use SVG data URL directly
                  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
                  URL.revokeObjectURL(url)
                  resolve(svgDataUrl)
                }
              }
              
              img.onerror = (error) => {
                console.error('❌ Error loading SVG image:', error)
                // Fallback: use SVG data URL directly
                const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
                URL.revokeObjectURL(url)
                resolve(svgDataUrl)
              }
              
              img.src = url
              return
            }
            
            // Try Canvas
            const canvas = chartElement.querySelector('canvas')
            if (canvas) {
              try {
                const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png', finalSettings.chartQuality === 'high' ? 1.0 : 0.9)
                resolve(dataUrl)
                return
              } catch (error) {
                console.error('Error converting canvas to image:', error)
              }
            }
            
            resolve('')
          } catch (error) {
            console.error('Error in convertChartToImage:', error)
            resolve('')
          }
        })
      }

      // Get printable content from the current report tab
      const getPrintableContent = async () => {
        // Try to find the report section first
        const reportSection = document.querySelector('.report-section')
        if (reportSection) {
          // Extract tables, cards, charts, and important content
          let content = ''
          
          // Group charts and tables by finding their relationship in DOM
          interface ChartTableGroup {
            title: string | null
            chart: { element: HTMLElement; svg: SVGElement | null } | null
            table: HTMLTableElement | null
            order: number
          }
          
          const groups: ChartTableGroup[] = []
          const processedTables = new Set<HTMLTableElement>()
          const processedCharts = new Set<SVGElement>()
          
          // Find all cards/containers that might have both chart and table
          const cards = reportSection.querySelectorAll('.card, [class*="Card"]')
          
          cards.forEach((card) => {
            const cardElement = card as HTMLElement
            const titleElement = cardElement.querySelector('h2, h3, h4, .card-title, [class*="title"], [class*="Title"]')
            const titleText = titleElement?.textContent?.trim() || null
            
            // Find table in this card
            const table = cardElement.querySelector('table') as HTMLTableElement | null
            
            // Find chart in this card
            let chartSvg: SVGElement | null = null
            if (finalSettings.includeCharts) {
              const svg = cardElement.querySelector('svg')
              if (svg) {
                const hasRecharts = svg.querySelector('.recharts-layer, .recharts-surface, .recharts-cartesian-axis') !== null
                const inRechartsContainer = svg.closest('[class*="recharts"]') !== null
                if (hasRecharts || inRechartsContainer) {
                  chartSvg = svg as SVGElement
                }
              }
            }
            
            // If card has either table or chart, create a group
            if (table || chartSvg) {
              if ((!table || !processedTables.has(table)) && (!chartSvg || !processedCharts.has(chartSvg))) {
                groups.push({
                  title: titleText,
                  chart: chartSvg ? { element: cardElement, svg: chartSvg } : null,
                  table: table,
                  order: groups.length
                })
                
                if (table) processedTables.add(table)
                if (chartSvg) processedCharts.add(chartSvg)
                console.log('✅ Created group:', titleText || 'Untitled', { hasChart: !!chartSvg, hasTable: !!table })
              }
            }
          })
          
          // Also find standalone tables (not in cards with charts)
          const allTables = reportSection.querySelectorAll('table')
          allTables.forEach((table) => {
            if (!processedTables.has(table as HTMLTableElement)) {
              const container = table.closest('.card, [class*="Card"]') as HTMLElement || 
                              table.parentElement as HTMLElement
              const titleElement = container?.querySelector('h2, h3, h4, .card-title, [class*="title"]') ||
                                  table.previousElementSibling?.querySelector('h2, h3, h4')
              const titleText = titleElement?.textContent?.trim() || null
              
              groups.push({
                title: titleText,
                chart: null,
                table: table as HTMLTableElement,
                order: groups.length
              })
              processedTables.add(table as HTMLTableElement)
              console.log('✅ Added standalone table:', titleText || 'Untitled')
            }
          })
          
          // Also find standalone charts (not in cards with tables)
          if (finalSettings.includeCharts) {
            const allSvgs = reportSection.querySelectorAll('svg')
            allSvgs.forEach((svg) => {
              if (!processedCharts.has(svg as SVGElement)) {
                const hasRecharts = svg.querySelector('.recharts-layer, .recharts-surface, .recharts-cartesian-axis') !== null
                const inRechartsContainer = svg.closest('[class*="recharts"]') !== null
                
                if (hasRecharts || inRechartsContainer) {
                  const card = svg.closest('.card, [class*="Card"]') as HTMLElement
                  const container = card || svg.parentElement as HTMLElement
                  const titleElement = card?.querySelector('h2, h3, h4, .card-title, [class*="title"]') ||
                                      container?.previousElementSibling?.querySelector('h2, h3, h4')
                  const titleText = titleElement?.textContent?.trim() || null
                  
                  groups.push({
                    title: titleText,
                    chart: { element: container, svg: svg as SVGElement },
                    table: null,
                    order: groups.length
                  })
                  processedCharts.add(svg as SVGElement)
                  console.log('✅ Added standalone chart:', titleText || 'Untitled')
                }
              }
            })
          }
          
          console.log('📈 Total groups found:', groups.length)
          
          // Process all groups: chart first, then table (together on same page)
          groups.forEach((group, groupIndex) => {
            // Add page break before each group (except the first one)
            if (groupIndex > 0) {
              content += `<div class="page-break-before"></div>`
            }
            
            // Start group container (chart + table together)
            content += `<div class="print-group-page">`
            
            // Add title if available
            if (group.title) {
              content += `<h3 style="font-size: 16px; margin: 20px 0 10px 0; font-weight: bold; page-break-after: avoid;">${group.title}</h3>`
            }
            
            // Add chart first if available
            if (group.chart && group.chart.svg) {
              console.log('🖼️ Processing chart for group:', group.title || 'Untitled')
              
              // Calculate chart size
              let chartWidth = '100%'
              let chartHeight = 'auto'
              if (finalSettings.chartSize === 'small') {
                chartWidth = '60%'
                chartHeight = '300px'
              } else if (finalSettings.chartSize === 'medium') {
                chartWidth = '80%'
                chartHeight = '400px'
              } else if (finalSettings.chartSize === 'large') {
                chartWidth = '100%'
                chartHeight = '500px'
              } else if (finalSettings.chartSize === 'full-width') {
                chartWidth = '100%'
                chartHeight = '600px'
              }
              
              // Use SVG directly
              const svgClone = group.chart.svg.cloneNode(true) as SVGElement
              
              // Apply settings to SVG
              if (!finalSettings.chartShowLegend) {
                const legends = svgClone.querySelectorAll('.recharts-legend-wrapper, [class*="legend"]')
                legends.forEach(legend => legend.remove())
              }
              
              if (!finalSettings.chartShowGrid) {
                const grids = svgClone.querySelectorAll('.recharts-cartesian-grid, [class*="grid"]')
                grids.forEach(grid => grid.remove())
              }
              
              // Get original dimensions
              const rect = group.chart.svg.getBoundingClientRect()
              const originalWidth = group.chart.svg.getAttribute('width') || rect.width.toString() || '800'
              const originalHeight = group.chart.svg.getAttribute('height') || rect.height.toString() || '400'
              const viewBox = group.chart.svg.getAttribute('viewBox') || `0 0 ${originalWidth} ${originalHeight}`
              
              // Set dimensions
              svgClone.setAttribute('width', originalWidth)
              svgClone.setAttribute('height', originalHeight)
              svgClone.setAttribute('viewBox', viewBox)
              svgClone.setAttribute('style', `max-width: ${chartWidth}; width: ${chartWidth}; height: ${chartHeight}; display: block !important; visibility: visible !important; margin: 0 auto;`)
              
              const svgHtml = new XMLSerializer().serializeToString(svgClone)
              content += `<div style="margin: 20px 0 10px 0; page-break-inside: avoid; text-align: center; width: 100%; display: block !important; background: ${finalSettings.chartBackground === 'white' ? 'white' : 'transparent'}; padding: 10px;">
                ${svgHtml}
              </div>`
            }
            
            // Add table after chart if available (on same page)
            if (group.table) {
              // Clone table for printing
              const tableClone = group.table.cloneNode(true) as HTMLTableElement
              // Remove non-printable elements from table
              const noPrintInTable = tableClone.querySelectorAll('.no-print, button, .print-hide, [data-print="hide"]')
              noPrintInTable.forEach(el => el.remove())
              
              content += `<div style="page-break-inside: avoid; margin-top: 10px;">${tableClone.outerHTML}</div>`
            }
            
            // Close group container
            content += `</div>`
          })
          
          // Get cards and other content if no groups found
          if (groups.length === 0) {
            const allTables = reportSection.querySelectorAll('table')
            const allChartsInSection = finalSettings.includeCharts ? reportSection.querySelectorAll('svg') : []
            if (allTables.length === 0 && allChartsInSection.length === 0) {
              const cards = reportSection.querySelectorAll('.card, [class*="Card"]')
              cards.forEach(card => {
                // Skip cards that contain charts if charts are enabled
                if (finalSettings.includeCharts) {
                  const hasChart = card.querySelector('svg, canvas, [class*="recharts"]')
                  if (hasChart) return
                }
                
                const cardTitle = card.querySelector('h2, h3, h4, .card-title, [class*="title"], [class*="Title"]')
                if (cardTitle) {
                  content += `<h3 style="font-size: 16px; margin: 20px 0 10px 0; font-weight: bold;">${cardTitle.textContent}</h3>`
                }
                
                const cardClone = card.cloneNode(true) as HTMLElement
                const noPrintInCard = cardClone.querySelectorAll('.no-print, button, .print-hide, [data-print="hide"]')
                noPrintInCard.forEach(el => el.remove())
                content += cardClone.innerHTML
              })
            }
          }
          
          return content || reportSection.innerHTML
        }
        
        // Fallback: try common containers
        const containers = [
          '.printable-content',
          '.reports-container', 
          '.projects-container',
          '.boq-container',
          '.kpi-container',
          '[class*="report"]',
          '[class*="Report"]'
        ]
        
        for (const selector of containers) {
          const container = document.querySelector(selector)
          if (container) {
            const clone = container.cloneNode(true) as HTMLElement
            const noPrintElements = clone.querySelectorAll('.no-print, button, .print-hide')
            noPrintElements.forEach(el => el.remove())
            return clone.innerHTML
          }
        }
        
        // Last resort: get body content
        return document.body.innerHTML
      }
      
      // Generate signatures HTML
      const generateSignaturesHTML = () => {
        if (!finalSettings.showSignatures || !finalSettings.signatures || finalSettings.signatures.length === 0) {
          return ''
        }
        
        const isHorizontal = finalSettings.signatureLayout === 'horizontal'
        const signatureStyle = isHorizontal 
          ? 'display: inline-block; width: 30%; margin: 20px 1.5%; vertical-align: top;'
          : 'display: block; width: 100%; margin: 20px 0;'
        
        let signaturesHTML = '<div style="margin-top: 40px; page-break-inside: avoid; border-top: 1px solid #ccc; padding-top: 20px;">'
        
        finalSettings.signatures.forEach((sig, index) => {
          signaturesHTML += `
            <div style="${signatureStyle}">
              <div style="margin-bottom: 60px; min-height: 80px;">
                <div style="border-bottom: 1px solid #000; width: 100%; margin-bottom: 5px; padding-bottom: 2px;"></div>
                <div style="font-size: ${finalSettings.fontSize}; font-weight: bold; margin-top: 5px;">
                  ${sig.name || '_________________'}
                </div>
                <div style="font-size: ${(parseFloat(finalSettings.fontSize) || 10) - 2}pt; color: #666; margin-top: 3px;">
                  ${sig.title || ''}
                </div>
                ${sig.position ? `<div style="font-size: ${(parseFloat(finalSettings.fontSize) || 10) - 2}pt; color: #666; margin-top: 2px;">${sig.position}</div>` : ''}
              </div>
            </div>
          `
        })
        
        signaturesHTML += '</div>'
        return signaturesHTML
      }
      
      const currentPageContent = await getPrintableContent()
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
              
              /* Page break containers */
              .print-content > div[style*="page-break"] {
                page-break-before: always !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                min-height: 100vh !important;
              }
              
              .print-content > div[style*="page-break"]:first-child {
                page-break-before: auto !important;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: ${finalSettings.fontSize};
                margin-bottom: ${finalSettings.compactMode ? '10px' : '20px'};
                page-break-inside: avoid !important;
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
              
              ${!finalSettings.includeImages ? 'img:not([data-chart-image]) { display: none !important; }' : ''}
              ${!finalSettings.includeCharts ? 'svg:not([data-chart-image]), canvas:not([data-chart-image]), [class*="recharts"]:not([data-chart-image]) { display: none !important; }' : ''}
              
              /* Chart images styling */
              img[data-chart-image] {
                max-width: 100% !important;
                height: auto !important;
                page-break-inside: avoid !important;
                margin: 20px 0 !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              
              /* SVG charts styling */
              .print-content svg {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                max-width: 100% !important;
                height: auto !important;
                page-break-inside: avoid !important;
                margin: 20px auto !important;
              }
              
              /* Ensure each group (chart + table) is on its own page */
              .print-group-page {
                page-break-inside: avoid !important;
                page-break-after: always !important;
                min-height: 100vh;
                display: block !important;
              }
              
              .print-group-page:last-child {
                page-break-after: auto !important;
              }
              
              /* Keep chart and table together in same group */
              .print-group-page > div {
                page-break-inside: avoid !important;
              }
              
              .print-group-page svg,
              .print-group-page table {
                page-break-inside: avoid !important;
              }
              
              .page-break-before {
                page-break-before: always !important;
              }
              
              /* Show content elements */
              .print-content {
                display: block !important;
              }
              
              .print-content table {
                display: table !important;
              }
              
              .print-content h3 {
                display: block !important;
              }
              
              .print-content img[data-chart-image] {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                max-width: 100% !important;
                height: auto !important;
              }
              
              /* Hide non-printable elements */
              .no-print, button, .print-hide, [data-print="hide"] {
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
              
              .signatures-section {
                margin-top: 40px;
                page-break-inside: avoid;
                border-top: 1px solid #ccc;
                padding-top: 20px;
              }
              
              /* Page break classes */
              .page-break-before {
                page-break-before: always !important;
                display: block !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              
              .print-group-page {
                page-break-inside: avoid !important;
                page-break-after: always !important;
                min-height: 100vh;
                display: block !important;
              }
              
              .print-group-page:last-child {
                page-break-after: auto !important;
              }
              
              /* Keep chart and table together in same group */
              .print-group-page > div {
                page-break-inside: avoid !important;
              }
              
              .print-group-page svg,
              .print-group-page table {
                page-break-inside: avoid !important;
              }
              
              @media print {
                @page {
                  margin: ${finalSettings.marginValue};
                  size: ${finalSettings.pageSize} ${finalSettings.orientation};
                }
                
                /* Force page breaks */
                .page-break-before {
                  page-break-before: always !important;
                }
                
                .print-group-page {
                  page-break-after: always !important;
                  page-break-inside: avoid !important;
                }
                
                .print-group-page:last-child {
                  page-break-after: auto !important;
                }
                
                /* Ensure tables and charts don't break across pages */
                table {
                  page-break-inside: avoid !important;
                }
                
                img[data-chart-image],
                svg {
                  page-break-inside: avoid !important;
                }
              }
              
              ${finalSettings.showPageNumbers ? `
              @media print {
                @page {
                  @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 8pt;
                    color: #666;
                  }
                }
              }
              ` : ''}
            </style>
          </head>
          <body>
            ${finalSettings.showHeader ? `
            <div class="print-header">
              ${finalSettings.companyName ? `<div style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 5px;">${finalSettings.companyName}</div>` : ''}
              <div class="print-title">${finalSettings.customHeaderText || pageTitle}</div>
              ${finalSettings.showDate ? `<div class="print-meta">Generated on ${new Date().toLocaleString()}</div>` : ''}
            </div>
            ` : ''}
            <div class="print-content">
              ${currentPageContent}
              ${generateSignaturesHTML()}
            </div>
            ${finalSettings.showFooter ? `
            <div class="print-footer">
              ${finalSettings.customFooterText ? `<div style="margin-bottom: 5px;">${finalSettings.customFooterText}</div>` : ''}
              ${finalSettings.showDate ? `<div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>` : ''}
              ${finalSettings.showPageNumbers ? '<div style="margin-top: 5px;">Page <span class="page-number"></span></div>' : ''}
            </div>
            ` : ''}
            
            <script>
              window.onload = function() {
                // Add page numbers if enabled
                ${finalSettings.showPageNumbers ? `
                if (window.matchMedia) {
                  const mediaQueryList = window.matchMedia('print');
                  mediaQueryList.addListener(function(mql) {
                    if (mql.matches) {
                      const pageNumbers = document.querySelectorAll('.page-number');
                      pageNumbers.forEach((el, index) => {
                        el.textContent = (index + 1).toString();
                      });
                    }
                  });
                }
                ` : ''}
                
                setTimeout(function() {
                  window.print();
                }, 300);
                
                window.onafterprint = function() {
                  setTimeout(function() {
                    window.close();
                  }, 100);
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



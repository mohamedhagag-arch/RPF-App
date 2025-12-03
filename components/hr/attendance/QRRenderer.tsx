'use client'

import React, { useMemo } from 'react'
import qrcode from 'qrcode'
import { QRSettings } from '@/hooks/useQRSettings'

interface Props {
  qrCode: string
  settings: QRSettings
  gradientId?: string
}

export const QRRenderer: React.FC<Props> = ({ qrCode, settings, gradientId }) => {
  // Generate Matrix
  const matrix = useMemo(() => {
    try {
      const qr = qrcode.create(qrCode, { 
        errorCorrectionLevel: settings.errorCorrectionLevel as any,
        maskPattern: undefined
      })
      return qr.modules
    } catch (e) {
      console.error("QR Generation Error", e)
      return null
    }
  }, [qrCode, settings.errorCorrectionLevel])

  if (!matrix) return null

  const size = matrix.size
  const cellSize = 10
  const quietZone = settings.marginSize > 0 ? 4 : 0
  const qrSize = (size + quietZone * 2) * cellSize
  
  // Frame Logic
  let viewBoxSize = qrSize
  let offsetX = quietZone * cellSize
  let offsetY = quietZone * cellSize
  
  // Adjust viewbox for Frames
  if (settings.frame === 'border') {
    viewBoxSize += 100
    offsetX += 50
    offsetY += 50
  } else if (settings.frame === 'badge') {
    viewBoxSize += 140
    offsetX += 70
    offsetY += 20
  } else if (settings.frame === 'phone') {
    viewBoxSize += 100
    offsetX += 50
    offsetY += 80
  }

  // Paths
  const paths: string[] = []
  
  // Eye Paths separate by corner
  const eyePathsTL: string[] = []
  const eyePathsTR: string[] = []
  const eyePathsBL: string[] = []
  
  const eyeCenterPathsTL: string[] = []
  const eyeCenterPathsTR: string[] = []
  const eyeCenterPathsBL: string[] = []

  // Helper to check if a module is part of a finder pattern (7x7 corners)
  const isFinderPattern = (r: number, c: number) => {
    const isTopLeft = r < 7 && c < 7
    const isTopRight = r < 7 && c >= size - 7
    const isBottomLeft = r >= size - 7 && c < 7
    return isTopLeft || isTopRight || isBottomLeft
  }

  // Calculate logo area to exclude from data modules
  let logoExcludeArea = null
  if (settings.logoEnabled && settings.logoUrl) {
    // Calculate actual QR data size (without quiet zone)
    const actualQrSize = size * cellSize
    const logoPxSize = (actualQrSize * settings.logoSize) / 100
    const logoPadding = settings.logoPadding || 8
    const logoWithPadding = logoPxSize + (logoPadding * 2)
    // Calculate center of QR code data (not including quiet zone)
    const qrCenterX = offsetX + actualQrSize / 2
    const qrCenterY = offsetY + actualQrSize / 2
    const logoStartX = qrCenterX - logoWithPadding / 2
    const logoStartY = qrCenterY - logoWithPadding / 2
    const logoEndX = logoStartX + logoWithPadding
    const logoEndY = logoStartY + logoWithPadding
    
    logoExcludeArea = {
      startX: logoStartX,
      startY: logoStartY,
      endX: logoEndX,
      endY: logoEndY
    }
  }

  // Generate Module Paths
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix.get(r, c)) {
        if (isFinderPattern(r, c)) continue

        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        
        // Skip modules that overlap with logo area
        if (logoExcludeArea) {
          const moduleEndX = x + cellSize
          const moduleEndY = y + cellSize
          if (
            x < logoExcludeArea.endX &&
            moduleEndX > logoExcludeArea.startX &&
            y < logoExcludeArea.endY &&
            moduleEndY > logoExcludeArea.startY
          ) {
            continue // Skip this module as it's in the logo area
          }
        }
        
        let d = ''
        
        switch (settings.dotStyle) {
          case 'dots':
            const rDot = cellSize * 0.35
            d = `M ${x + cellSize/2}, ${y + cellSize/2} m -${rDot}, 0 a ${rDot},${rDot} 0 1,0 ${rDot * 2},0 a ${rDot},${rDot} 0 1,0 -${rDot * 2},0`
            break
          case 'rounded':
            d = `M ${x + 2} ${y} h ${cellSize - 4} q 2 0 2 2 v ${cellSize - 4} q 0 2 -2 2 h -${cellSize - 4} q -2 0 -2 -2 v -${cellSize - 4} q 0 -2 2 -2`
            break
          case 'extra-rounded':
            d = `M ${x + cellSize/2}, ${y + cellSize/2} m -${cellSize/2}, 0 a ${cellSize/2},${cellSize/2} 0 1,0 ${cellSize},0 a ${cellSize/2},${cellSize/2} 0 1,0 -${cellSize},0`
            break
          case 'classy':
            d = `M ${x + cellSize/2} ${y} L ${x + cellSize} ${y + cellSize/2} L ${x + cellSize/2} ${y + cellSize} L ${x} ${y + cellSize/2} Z`
            break
          case 'diamond':
            d = `M ${x + cellSize/2} ${y} L ${x + cellSize} ${y + cellSize/2} L ${x + cellSize/2} ${y + cellSize} L ${x} ${y + cellSize/2} Z`
            break
          case 'star':
            const cx = x + cellSize/2
            const cy = y + cellSize/2
            const rOut = cellSize/2
            const rIn = cellSize/5
            d = `M ${cx} ${cy - rOut} 
                 Q ${cx + rIn/2} ${cy - rIn/2} ${cx + rOut} ${cy} 
                 Q ${cx + rIn/2} ${cy + rIn/2} ${cx} ${cy + rOut} 
                 Q ${cx - rIn/2} ${cy + rIn/2} ${cx - rOut} ${cy} 
                 Q ${cx - rIn/2} ${cy - rIn/2} ${cx} ${cy - rOut} Z`
            break
          case 'cross':
            const th = cellSize/3
            d = `M ${x + cellSize/2 - th/2} ${y} h ${th} v ${cellSize/2 - th/2} h ${cellSize/2 - th/2} v ${th} h -${cellSize/2 - th/2} v ${cellSize/2 - th/2} h -${th} v -${cellSize/2 - th/2} h -${cellSize/2 - th/2} v -${th} h ${cellSize/2 - th/2} Z`
            break
          case 'heart':
            d = `M ${x + cellSize/2} ${y + cellSize} 
                 L ${x} ${y + cellSize/2} 
                 A ${cellSize/4} ${cellSize/4} 0 0 1 ${x + cellSize/2} ${y + cellSize/4} 
                 A ${cellSize/4} ${cellSize/4} 0 0 1 ${x + cellSize} ${y + cellSize/2} Z`
            break
          case 'square':
          default:
            d = `M ${x} ${y} h ${cellSize} v ${cellSize} h -${cellSize} Z`
            break
        }
        paths.push(d)
      }
    }
  }

  // Generate Finder Patterns (Eyes)
  const corners = [
    { r: 0, c: 0, id: 'TL' },
    { r: 0, c: size - 7, id: 'TR' },
    { r: size - 7, c: 0, id: 'BL' }
  ]

  corners.forEach(corner => {
    const cx = offsetX + corner.c * cellSize
    const cy = offsetY + corner.r * cellSize
    const outerSize = 7 * cellSize
    
    // Outer Frame
    let outerD = ''
    
    if (settings.eyeFrame === 'circle') {
      const r = outerSize / 2
      const lineW = cellSize
      outerD = `M ${cx + r} ${cy} 
                 a ${r} ${r} 0 1 0 0 ${outerSize} 
                 a ${r} ${r} 0 1 0 0 -${outerSize} 
                 M ${cx + r} ${cy + lineW} 
                 a ${r - lineW} ${r - lineW} 0 1 1 0 ${outerSize - 2 * lineW} 
                 a ${r - lineW} ${r - lineW} 0 1 1 0 -${outerSize - 2 * lineW}`
    } else if (settings.eyeFrame === 'rounded') {
      const rOut = 2.5 * cellSize
      const rIn = 1 * cellSize
      
      outerD = `
         M ${cx + rOut} ${cy} 
         h ${outerSize - 2*rOut} 
         a ${rOut} ${rOut} 0 0 1 ${rOut} ${rOut} 
         v ${outerSize - 2*rOut} 
         a ${rOut} ${rOut} 0 0 1 -${rOut} ${rOut} 
         h -${outerSize - 2*rOut} 
         a ${rOut} ${rOut} 0 0 1 -${rOut} -${rOut} 
         v -${outerSize - 2*rOut} 
         a ${rOut} ${rOut} 0 0 1 ${rOut} -${rOut} 
         Z
         M ${cx + cellSize + rIn} ${cy + cellSize} 
         h ${outerSize - 2*cellSize - 2*rIn} 
         a ${rIn} ${rIn} 0 0 1 ${rIn} ${rIn} 
         v ${outerSize - 2*cellSize - 2*rIn} 
         a ${rIn} ${rIn} 0 0 1 -${rIn} ${rIn} 
         h -${outerSize - 2*cellSize - 2*rIn} 
         a ${rIn} ${rIn} 0 0 1 -${rIn} -${rIn} 
         v -${outerSize - 2*cellSize - 2*rIn} 
         a ${rIn} ${rIn} 0 0 1 ${rIn} -${rIn} 
         Z
      `
    } else if (settings.eyeFrame === 'leaf') {
      const r = 3 * cellSize
      outerD = `
         M ${cx + r} ${cy}
         h ${outerSize - r}
         v ${outerSize}
         h -${outerSize - r}
         a ${r} ${r} 0 0 1 -${r} -${r}
         v -${outerSize - r}
         a ${r} ${r} 0 0 1 ${r} -${r}
         Z
         M ${cx + cellSize} ${cy + cellSize}
         v ${outerSize - 2*cellSize}
         h ${outerSize - 2*cellSize}
         v -${outerSize - 2*cellSize}
         Z
      `
    } else {
      // Square
      outerD = `M ${cx} ${cy} h ${outerSize} v ${outerSize} h -${outerSize} Z 
                M ${cx + cellSize} ${cy + cellSize} v ${outerSize - 2*cellSize} h ${outerSize - 2*cellSize} v -${outerSize - 2*cellSize} Z`
    }
    
    // Inner Center (3x3)
    const midX = cx + 2 * cellSize
    const midY = cy + 2 * cellSize
    const midSize = 3 * cellSize
    let centerD = ''

    if (settings.eyeStyle === 'circle') {
      const r = midSize / 2
      centerD = `M ${midX + r} ${midY + r} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`
    } else {
      centerD = `M ${midX} ${midY} h ${midSize} v ${midSize} h -${midSize} Z`
    }

    if (corner.id === 'TL') {
      eyePathsTL.push(outerD)
      eyeCenterPathsTL.push(centerD)
    } else if (corner.id === 'TR') {
      eyePathsTR.push(outerD)
      eyeCenterPathsTR.push(centerD)
    } else {
      eyePathsBL.push(outerD)
      eyeCenterPathsBL.push(centerD)
    }
  })

  // Logo Logic
  let logoImg = null
  if (settings.logoEnabled && settings.logoUrl) {
    // Calculate actual QR data size (without quiet zone)
    const actualQrSize = size * cellSize
    const logoPxSize = (actualQrSize * settings.logoSize) / 100
    const logoPadding = settings.logoPadding || 8 // Padding around logo
    const logoWithPadding = logoPxSize + (logoPadding * 2)
    // Calculate center of QR code data (not including quiet zone)
    const qrCenterX = offsetX + actualQrSize / 2
    const qrCenterY = offsetY + actualQrSize / 2
    // Position logo centered
    const logoX = qrCenterX - logoWithPadding / 2
    const logoY = qrCenterY - logoWithPadding / 2
    
    logoImg = (
      <g>
        {/* White background for logo to prevent overlap */}
        <rect
          x={logoX}
          y={logoY}
          width={logoWithPadding}
          height={logoWithPadding}
          fill={settings.backgroundColor}
          rx="4"
          ry="4"
        />
        {/* Logo image */}
        <image
          href={settings.logoUrl}
          x={logoX + logoPadding}
          y={logoY + logoPadding}
          width={logoPxSize}
          height={logoPxSize}
          preserveAspectRatio="xMidYMid meet"
          opacity={settings.logoOpacity}
        />
      </g>
    )
  }

  // Background Image Logic
  let bgImg = null
  if (settings.bgImage) {
    bgImg = (
      <image
        href={settings.bgImage}
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
        preserveAspectRatio="xMidYMid slice"
        opacity={settings.bgOpacity}
      />
    )
  }

  // Colors
  const mainFill = settings.useGradient && gradientId ? `url(#${gradientId})` : settings.foregroundColor
  
  // Resolve Individual Eye Colors
  const eyeFillTL = settings.eyeColorTL || settings.eyeColor || mainFill
  const eyeFillTR = settings.eyeColorTR || settings.eyeColor || mainFill
  const eyeFillBL = settings.eyeColorBL || settings.eyeColor || mainFill

  // Frame Rendering
  let frameElement = null
  if (settings.frame === 'border') {
    frameElement = (
      <rect 
        x={5} y={5} 
        width={viewBoxSize - 10} height={viewBoxSize - 10} 
        rx="20" ry="20"
        fill="none" 
        stroke={settings.frameColor || settings.foregroundColor} 
        strokeWidth="10" 
      />
    )
  } else if (settings.frame === 'badge') {
    frameElement = (
      <g>
        <rect 
          x={0} y={0} 
          width={viewBoxSize} height={viewBoxSize} 
          rx="30" ry="30"
          fill={settings.backgroundColor} 
        />
        <path 
           d={`M 0 ${viewBoxSize - 100} h ${viewBoxSize} v 70 a 30 30 0 0 1 -30 30 h -${viewBoxSize - 60} a 30 30 0 0 1 -30 -30 Z`} 
           fill={settings.frameColor || settings.foregroundColor}
        />
        <text 
          x={viewBoxSize/2} 
          y={viewBoxSize - 40} 
          textAnchor="middle" 
          fill="white" 
          fontSize="40" 
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {settings.frameText || "SCAN ME"}
        </text>
      </g>
    )
  } else if (settings.frame === 'phone') {
    frameElement = (
      <g>
        <rect x={10} y={10} width={viewBoxSize-20} height={viewBoxSize-20} rx="40" ry="40" fill="none" stroke="#334155" strokeWidth="15" />
        <path d={`M ${viewBoxSize/2 - 60} 10 h 120 v 30 a 10 10 0 0 1 -10 10 h -100 a 10 10 0 0 1 -10 -10 Z`} fill="#334155" />
      </g>
    )
  }

  return (
    <svg 
      id="qr-code-svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
      width="100%" 
      height="100%" 
      style={{ maxWidth: '100%', maxHeight: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Color */}
      {settings.frame !== 'badge' && (
        <rect width="100%" height="100%" fill={settings.backgroundColor} />
      )}
      
      {/* Background Image */}
      {bgImg}

      {frameElement}
      
      {/* Data Modules */}
      <path d={paths.join(' ')} fill={mainFill} />
      
      {/* Eyes TL */}
      <path d={eyePathsTL.join(' ')} fill={eyeFillTL} fillRule="evenodd" />
      <path d={eyeCenterPathsTL.join(' ')} fill={eyeFillTL} />

      {/* Eyes TR */}
      <path d={eyePathsTR.join(' ')} fill={eyeFillTR} fillRule="evenodd" />
      <path d={eyeCenterPathsTR.join(' ')} fill={eyeFillTR} />

      {/* Eyes BL */}
      <path d={eyePathsBL.join(' ')} fill={eyeFillBL} fillRule="evenodd" />
      <path d={eyeCenterPathsBL.join(' ')} fill={eyeFillBL} />
      
      {logoImg}
    </svg>
  )
}


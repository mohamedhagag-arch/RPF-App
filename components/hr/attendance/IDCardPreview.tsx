'use client'

import React from 'react'
import { AttendanceEmployee } from '@/lib/supabase'
import { IDCardDesign } from './IDCardGenerator'
import { QRSettings } from '@/hooks/useQRSettings'
import { QRRenderer } from './QRRenderer'

interface IDCardPreviewProps {
  employee: AttendanceEmployee
  design: IDCardDesign
  showBack: boolean
  qrCode: string
  qrSettings: QRSettings
}

export function IDCardPreview({ employee, design, showBack, qrCode, qrSettings }: IDCardPreviewProps) {
  // Convert mm to pixels (assuming 96 DPI: 1mm = 3.779527559 pixels)
  const mmToPx = (mm: number) => mm * 3.779527559

  const cardWidth = mmToPx(design.width)
  const cardHeight = mmToPx(design.height)

  const side = showBack ? design.back : design.front

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative shadow-xl"
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          borderRadius: `${mmToPx(design.borderRadius)}px`,
          backgroundColor: side.backgroundColor,
          backgroundImage: side.backgroundImage ? `url(${side.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: side.backgroundOpacity,
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {showBack ? (
          <BackSide design={design} />
        ) : (
          <FrontSide
            employee={employee}
            design={design}
            qrCode={qrCode}
            qrSettings={qrSettings}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            mmToPx={mmToPx}
          />
        )}
      </div>
      <p className="text-sm text-gray-500">
        {showBack ? 'Back Side' : 'Front Side'} - {design.width}mm × {design.height}mm
      </p>
    </div>
  )
}

function FrontSide({
  employee,
  design,
  qrCode,
  qrSettings,
  cardWidth,
  cardHeight,
  mmToPx
}: {
  employee: AttendanceEmployee
  design: IDCardDesign
  qrCode: string
  qrSettings: QRSettings
  cardWidth: number
  cardHeight: number
  mmToPx: (mm: number) => number
}) {
  const front = design.front

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ borderRadius: `${mmToPx(design.borderRadius)}px` }}>
      {/* Logo */}
      {front.logo?.enabled && front.logo?.url && (
        <div
          className="absolute"
          style={{
            width: `${(cardWidth * front.logo.size) / 100}px`,
            height: `${(cardWidth * front.logo.size) / 100}px`,
            opacity: front.logo.opacity,
            ...getLogoPosition(front.logo.position, cardWidth, cardHeight, front.logo.size)
          }}
        >
          <img
            src={front.logo.url}
            alt="Logo"
            className="w-full h-full object-contain"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
      )}

      {/* Employee Photo */}
      {front.photo?.enabled && (
        <div
          className="absolute shadow-lg"
          style={{
            width: `${(cardWidth * front.photo.size) / 100}px`,
            height: `${(cardWidth * front.photo.size) / 100}px`,
            borderWidth: `${mmToPx(front.photo.borderWidth)}px`,
            borderStyle: 'solid',
            borderColor: front.photo.borderColor,
            borderRadius: front.photo.shape === 'circle' ? '50%' : front.photo.shape === 'rounded' ? '10px' : '0',
            ...getPhotoPosition(front.photo.position, cardWidth, cardHeight, front.photo.size),
            background: 'linear-gradient(135deg, #a78bfa 0%, #fbcfe8 100%)', // Purple to pink gradient
            padding: `${mmToPx(front.photo.borderWidth)}px`,
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="w-full h-full bg-gradient-to-br from-purple-200 via-pink-100 to-purple-50 flex items-center justify-center text-gray-700 font-bold" 
            style={{ 
              borderRadius: front.photo.shape === 'circle' ? '50%' : front.photo.shape === 'rounded' ? '6px' : '0',
              fontSize: `${(cardWidth * front.photo.size) / 100 * 0.4}px`
            }}
          >
            {employee.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Employee Name */}
      {front.employeeName.enabled && (
        <div
          className="absolute"
          style={{
            left: front.photo?.enabled 
              ? `${(cardWidth * front.employeeName.position.x) / 100}px`
              : `${(cardWidth * 5) / 100}px`, // Start from left if no photo
            top: `${(cardHeight * front.employeeName.position.y) / 100}px`,
            fontSize: `${mmToPx(front.employeeName.fontSize)}px`,
            fontWeight: front.employeeName.fontWeight,
            color: front.employeeName.color,
            textAlign: 'left',
            width: 'auto',
            whiteSpace: 'nowrap',
            letterSpacing: '0.5px',
            lineHeight: '1.2'
          }}
        >
          {employee.name || 'Employee Name'}
        </div>
      )}

      {/* Employee Code */}
      {front.employeeCode.enabled && (
        <div
          className="absolute"
          style={{
            left: front.photo?.enabled 
              ? `${(cardWidth * front.employeeCode.position.x) / 100}px`
              : `${(cardWidth * 5) / 100}px`, // Start from left if no photo
            top: `${(cardHeight * front.employeeCode.position.y) / 100}px`,
            fontSize: `${mmToPx(front.employeeCode.fontSize)}px`,
            fontWeight: front.employeeCode.fontWeight,
            color: front.employeeCode.color,
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          {front.employeeCode.label ? `${front.employeeCode.label} ` : ''}
          {employee.employee_code || 'N/A'}
        </div>
      )}

      {/* Job Title */}
      {front.jobTitle.enabled && employee.job_title && (
        <div
          className="absolute"
          style={{
            left: front.photo?.enabled 
              ? `${(cardWidth * front.jobTitle.position.x) / 100}px`
              : `${(cardWidth * 5) / 100}px`, // Start from left if no photo
            top: `${(cardHeight * front.jobTitle.position.y) / 100}px`,
            fontSize: `${mmToPx(front.jobTitle.fontSize)}px`,
            fontWeight: front.jobTitle.fontWeight,
            color: front.jobTitle.color,
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          {employee.job_title}
        </div>
      )}

      {/* Department */}
      {front.department.enabled && employee.department && (
        <div
          className="absolute"
          style={{
            left: front.photo?.enabled 
              ? `${(cardWidth * front.department.position.x) / 100}px`
              : `${(cardWidth * 5) / 100}px`, // Start from left if no photo
            top: `${(cardHeight * front.department.position.y) / 100}px`,
            fontSize: `${mmToPx(front.department.fontSize)}px`,
            fontWeight: front.department.fontWeight,
            color: front.department.color,
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          {employee.department}
        </div>
      )}

      {/* QR Code */}
      {front.qrCode.enabled && (
        <div
          className="absolute"
          style={{
            ...getQRCodePosition(front.qrCode.position, cardWidth, cardHeight, front.qrCode.size, front.qrCode.margin),
            backgroundColor: '#FFFFFF',
            padding: '4px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ width: `${(cardWidth * front.qrCode.size) / 100}px`, height: `${(cardWidth * front.qrCode.size) / 100}px` }}>
            <QRRenderer qrCode={qrCode} settings={qrSettings} />
          </div>
        </div>
      )}

      {/* Additional Fields */}
      {front.additionalFields.map((field, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: field.alignment === 'center' ? '50%' : `${(cardWidth * field.position.x) / 100}px`,
            top: `${(cardHeight * field.position.y) / 100}px`,
            fontSize: `${mmToPx(field.fontSize)}px`,
            fontWeight: field.fontWeight,
            color: field.color,
            textAlign: field.alignment,
            transform: field.alignment === 'center' ? 'translateX(-50%)' : 'none'
          }}
        >
          {field.label}: {field.value}
        </div>
      ))}
    </div>
  )
}

function BackSide({ design }: { design: IDCardDesign }) {
  const back = design.back

  return (
    <div className="w-full h-full p-4 flex flex-col items-center justify-center relative">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 10px)'
      }} />

      {/* Logo */}
      {back.logo?.enabled && back.logo?.url && (
        <div className="mb-6 relative z-10" style={{ opacity: back.logo.opacity }}>
          <img src={back.logo.url} alt="Logo" className="max-w-[120px] max-h-[120px] object-contain drop-shadow-md" />
        </div>
      )}

      {/* Company Info */}
      {back.companyInfo?.enabled && (
        <div className="text-center space-y-3 relative z-10" style={{ fontSize: `${back.companyInfo.fontSize}px`, color: back.companyInfo.color }}>
          {back.companyInfo.name && (
            <div className="font-bold text-lg mb-2" style={{ color: '#1e40af' }}>
              {back.companyInfo.name}
            </div>
          )}
          {back.companyInfo.address && (
            <div className="text-sm">{back.companyInfo.address}</div>
          )}
          <div className="flex flex-col gap-1 text-xs mt-3">
            {back.companyInfo.phone && <div>📞 {back.companyInfo.phone}</div>}
            {back.companyInfo.email && <div>✉️ {back.companyInfo.email}</div>}
            {back.companyInfo.website && <div>🌐 {back.companyInfo.website}</div>}
          </div>
        </div>
      )}

      {/* Terms */}
      {back.terms?.enabled && back.terms.text && (
        <div className="mt-6 text-center px-4 relative z-10 border-t pt-4" style={{ 
          fontSize: `${back.terms.fontSize}px`, 
          color: back.terms.color,
          borderColor: '#e2e8f0'
        }}>
          {back.terms.text}
        </div>
      )}
    </div>
  )
}

// Helper functions for positioning
function getLogoPosition(
  position: string,
  cardWidth: number,
  cardHeight: number,
  size: number
): React.CSSProperties {
  const logoSize = (cardWidth * size) / 100
  const margin = 5

  switch (position) {
    case 'top-left':
      return { top: `${margin}px`, left: `${margin}px` }
    case 'top-center':
      return { top: `${margin}px`, left: '50%', transform: 'translateX(-50%)' }
    case 'top-right':
      return { top: `${margin}px`, right: `${margin}px` }
    case 'center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    case 'bottom-left':
      return { bottom: `${margin}px`, left: `${margin}px` }
    case 'bottom-center':
      return { bottom: `${margin}px`, left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-right':
      return { bottom: `${margin}px`, right: `${margin}px` }
    default:
      return { top: `${margin}px`, left: `${margin}px` }
  }
}

function getPhotoPosition(
  position: string,
  cardWidth: number,
  cardHeight: number,
  size: number
): React.CSSProperties {
  const photoSize = (cardWidth * size) / 100
  const margin = 5

  switch (position) {
    case 'left':
      return { left: `${margin}px`, top: '50%', transform: 'translateY(-50%)' }
    case 'right':
      return { right: `${margin}px`, top: '50%', transform: 'translateY(-50%)' }
    case 'center':
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    default:
      return { left: `${margin}px`, top: '50%', transform: 'translateY(-50%)' }
  }
}

function getQRCodePosition(
  position: string,
  cardWidth: number,
  cardHeight: number,
  size: number,
  margin: number
): React.CSSProperties {
  const qrSize = (cardWidth * size) / 100
  const marginPx = (cardWidth * margin) / 100

  switch (position) {
    case 'top-left':
      return { top: `${marginPx}px`, left: `${marginPx}px` }
    case 'top-right':
      return { top: `${marginPx}px`, right: `${marginPx}px` }
    case 'bottom-left':
      return { bottom: `${marginPx}px`, left: `${marginPx}px` }
    case 'bottom-right':
      return { bottom: `${marginPx}px`, right: `${marginPx}px` }
    case 'center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    default:
      return { bottom: `${marginPx}px`, right: `${marginPx}px` }
  }
}


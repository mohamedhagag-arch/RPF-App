'use client'

import { useState, useEffect } from 'react'
import { supabase, TABLES } from '@/lib/supabase'

export type DotStyle = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'diamond' | 'star' | 'cross' | 'heart'
export type CornerFrameStyle = 'square' | 'circle' | 'rounded' | 'leaf'
export type CornerDotStyle = 'square' | 'circle'
export type FrameStyle = 'none' | 'border' | 'phone' | 'badge'

export interface QRSettings {
  // Size & Spacing
  size: number
  marginSize: number
  
  // Colors
  foregroundColor: string
  backgroundColor: string
  
  // Advanced Visuals
  useGradient: boolean
  gradientType: 'linear' | 'radial'
  gradientStart: string
  gradientEnd: string
  gradientDirection: '0' | '45' | '90' | '135'
  
  // Background Image
  bgImage: string | null
  bgOpacity: number
  
  // Error Correction
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  
  // Shapes & Styles
  dotStyle: DotStyle
  eyeFrame: CornerFrameStyle
  eyeStyle: CornerDotStyle
  eyeColor: string | null
  eyeColorTL: string | null
  eyeColorTR: string | null
  eyeColorBL: string | null
  
  // Frames
  frame: FrameStyle
  frameText: string
  frameColor: string
  
  // Logo
  logoEnabled: boolean
  logoUrl: string
  logoSize: number
  logoOpacity: number
  logoPadding: number
  
  // Text
  textEnabled: boolean
  textContent: string
  textPosition: 'top' | 'bottom'
  textSize: number
  textColor: string
  
  // Border (Legacy - for backward compatibility)
  borderEnabled: boolean
  borderWidth: number
  borderColor: string
  borderRadius: number
}

export const defaultQRSettings: QRSettings = {
  size: 200,
  marginSize: 4,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  useGradient: false,
  gradientType: 'linear',
  gradientStart: '#4f46e5',
  gradientEnd: '#ec4899',
  gradientDirection: '45',
  bgImage: null,
  bgOpacity: 0.2,
  errorCorrectionLevel: 'H',
  dotStyle: 'square',
  eyeFrame: 'square',
  eyeStyle: 'square',
  eyeColor: null,
  eyeColorTL: null,
  eyeColorTR: null,
  eyeColorBL: null,
  frame: 'none',
  frameText: 'SCAN ME',
  frameColor: '#000000',
  logoEnabled: false,
  logoUrl: '',
  logoSize: 20,
  logoOpacity: 1,
  logoPadding: 0,
  textEnabled: true,
  textContent: 'Employee QR Code',
  textPosition: 'bottom',
  textSize: 14,
  textColor: '#000000',
  borderEnabled: true,
  borderWidth: 2,
  borderColor: '#E5E7EB',
  borderRadius: 8
}

export function useQRSettings() {
  const [settings, setSettings] = useState<QRSettings>(defaultQRSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from(TABLES.ATTENDANCE_SETTINGS)
        .select('*')
        .like('key', 'qr_%')

      if (error) {
        console.error('Error loading QR settings:', error)
        return
      }

      const loadedSettings = { ...defaultQRSettings }
      
      if (data) {
        data.forEach((item: any) => {
          const key = item.key.replace('qr_', '') as keyof QRSettings
          const value = item.value
          
          if (key === 'size' || key === 'marginSize' || key === 'logoSize' || 
              key === 'logoOpacity' || key === 'logoPadding' || key === 'textSize' || 
              key === 'borderWidth' || key === 'borderRadius' || key === 'bgOpacity') {
            (loadedSettings as any)[key] = parseFloat(value) || (defaultQRSettings as any)[key]
          } else if (key === 'logoEnabled' || key === 'textEnabled' || key === 'borderEnabled' || 
                     key === 'useGradient') {
            (loadedSettings as any)[key] = value === 'true'
          } else if (key === 'bgImage' || key === 'logoUrl' || key === 'eyeColor' || 
                     key === 'eyeColorTL' || key === 'eyeColorTR' || key === 'eyeColorBL') {
            (loadedSettings as any)[key] = value === 'null' || value === '' ? null : value
          } else {
            (loadedSettings as any)[key] = value
          }
        })
      }

      setSettings(loadedSettings)
    } catch (err) {
      console.error('Error loading QR settings:', err)
    } finally {
      setLoading(false)
    }
  }

  return { settings, loading, reload: loadSettings }
}

